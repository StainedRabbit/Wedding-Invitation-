import uuid
from pathlib import Path

from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .media import InvalidMedia, remove_file, stage_file
from .models import GuestUpload, Invitation, RsvpResponse, SubmissionReceipt


def invitation_for(request):
    token = request.headers.get("X-Invitation-Token")
    if token is None:
        return None, False
    invitation = Invitation.objects.filter(token=token, is_active=True).first()
    return invitation, invitation is None


@never_cache
@ensure_csrf_cookie
@require_GET
def context(request):
    invitation, invalid = invitation_for(request)
    if invalid:
        return JsonResponse({"code": "invite_unavailable"}, status=404)
    data = {"kind": "personalized" if invitation else "general", "state": "ready", "csrfToken": get_token(request)}
    if invitation:
        data.update(guestName=invitation.guest_name, personalMessage=invitation.personal_message,
                    allowsPlusOne=invitation.allows_plus_one,
                    state="received" if RsvpResponse.objects.filter(invitation=invitation).exists() else "ready")
    else:
        try:
            key = uuid.UUID(request.headers.get("X-RSVP-Submission-Key", ""))
            receipt = SubmissionReceipt.objects.filter(pk=key, invitation=None).first()
            if receipt:
                data["state"] = "received" if RsvpResponse.objects.filter(receipt=receipt).exists() else "closed"
        except ValueError:
            pass
    return JsonResponse(data)


@never_cache
@require_POST
def submit(request):
    invitation, invalid = invitation_for(request)
    if invalid:
        return JsonResponse({"code": "invite_unavailable"}, status=404)
    try:
        key = uuid.UUID(request.headers.get("X-RSVP-Submission-Key", ""))
    except ValueError:
        return JsonResponse({"code": "invalid_input"}, status=400)
    attendance = request.POST.get("attendance", "")
    name = invitation.guest_name if invitation else request.POST.get("guest_name", "").strip()
    plus = request.POST.get("plus_one_name", "").strip()
    attending = request.POST.get("plus_one_attending")
    if not name or len(name) > 200 or attendance not in ("accepted", "declined"):
        return JsonResponse({"code": "invalid_input"}, status=400)
    if invitation and invitation.allows_plus_one and attendance == "accepted":
        if attending not in ("true", "false") or (attending == "true" and not plus):
            return JsonResponse({"code": "invalid_input"}, status=400)
        plus = plus if attending == "true" else ""
    elif plus:
        return JsonResponse({"code": "invalid_input"}, status=400)
    uploads = request.FILES.getlist("attachments")
    photo_extensions = {".jpg", ".jpeg", ".png", ".heic"}
    video_extensions = {".mp4", ".mov"}
    suffixes = [Path(upload.name).suffix.lower() for upload in uploads]
    if any(suffix not in photo_extensions | video_extensions for suffix in suffixes):
        return JsonResponse({"code": "invalid_file"}, status=400)
    if any(
        upload.size > (25 * 1024 * 1024 if suffix in photo_extensions else 250 * 1024 * 1024)
        for upload, suffix in zip(uploads, suffixes)
    ):
        return JsonResponse({"code": "file_too_large"}, status=400)
    if sum(suffix in photo_extensions for suffix in suffixes) > 15 or sum(
        suffix in video_extensions for suffix in suffixes
    ) > 3:
        return JsonResponse({"code": "too_many_files"}, status=400)
    staged = []
    committed = False
    try:
        for upload in uploads:
            staged.append(stage_file(upload))
        with transaction.atomic():
            if invitation:
                invitation = Invitation.objects.filter(pk=invitation.pk, token=request.headers.get("X-Invitation-Token"), is_active=True).first()
                if not invitation:
                    return JsonResponse({"code": "invite_unavailable"}, status=404)
                if plus and not invitation.allows_plus_one:
                    return JsonResponse({"code": "invitation_changed"}, status=409)
            receipt = SubmissionReceipt.objects.filter(pk=key).first()
            if receipt:
                if receipt.invitation_id != (invitation.pk if invitation else None):
                    return JsonResponse({"code": "submission_closed"}, status=409)
                if RsvpResponse.objects.filter(receipt=receipt).exists():
                    return JsonResponse({"code": "already_saved"})
                return JsonResponse({"code": "submission_closed"}, status=409)
            if invitation and RsvpResponse.objects.filter(invitation=invitation).exists():
                return JsonResponse({"code": "already_received"}, status=409)
            receipt = SubmissionReceipt.objects.create(id=key, invitation=invitation)
            response = RsvpResponse.objects.create(receipt=receipt, invitation=invitation, guest_name=name,
                                                   attendance=attendance, plus_one_name=plus,
                                                   guest_message=request.POST.get("guest_message", ""))
            GuestUpload.objects.bulk_create([GuestUpload(response=response, **item) for item in staged])
        committed = True
    except InvalidMedia:
        return JsonResponse({"code": "invalid_file"}, status=400)
    except IntegrityError:
        return JsonResponse({"code": "retry"}, status=409)
    finally:
        if not committed:
            for item in staged:
                remove_file(item["storage_key"])
    return JsonResponse({"code": "saved"}, status=201)
