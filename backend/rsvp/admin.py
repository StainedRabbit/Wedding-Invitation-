from django.conf import settings
from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.core.paginator import Paginator
from django.db import transaction
from django.http import FileResponse, Http404, HttpResponseNotAllowed
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.html import format_html

from .media import remove_file
from .models import GuestUpload, Invitation, RsvpResponse, invitation_token


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ("guest_name", "allows_plus_one", "is_active", "invitation_link")
    list_filter = ("is_active", "allows_plus_one")
    search_fields = ("guest_name",)
    readonly_fields = ("invitation_link",)
    exclude = ("token",)
    actions = ("replace_links", "disable_links")
    change_list_template = "admin/rsvp/invitation/change_list.html"

    def get_urls(self):
        return [path("report/", self.admin_site.admin_view(self.report), name="rsvp_report")] + super().get_urls()

    def report(self, request):
        if not request.user.has_perm("rsvp.view_invitation") or not request.user.has_perm("rsvp.view_rsvpresponse"):
            raise PermissionDenied
        rows = []
        for invitation in Invitation.objects.select_related("rsvpresponse"):
            response = getattr(invitation, "rsvpresponse", None)
            rows.append((invitation.guest_name, "personalized", response.attendance if response else "awaiting_reply",
                         response.plus_one_name if response else "", response))
        for response in RsvpResponse.objects.filter(invitation__isnull=True):
            rows.append((response.guest_name, "general", response.attendance, "", response))
        invitation_type = request.GET.get("type", "")
        status = request.GET.get("status", "")
        rows = [row for row in rows if (not invitation_type or row[1] == invitation_type) and
                (not status or row[2] == status)]
        rows.sort(key=lambda row: (row[0].casefold(), row[1], row[4].pk if row[4] else 0))
        totals = {key: sum(row[2] == key for row in rows) for key in ("accepted", "declined", "awaiting_reply")}
        totals["attendance"] = sum(1 + bool(row[3]) for row in rows if row[2] == "accepted")
        page = Paginator(rows, 50).get_page(request.GET.get("page"))
        return TemplateResponse(request, "admin/rsvp/report.html", {
            **self.admin_site.each_context(request), "title": "RSVP report",
            "rows": page, "page": page, "totals": totals, "selected_type": invitation_type, "selected_status": status,
        })

    @admin.display(description="Invitation link")
    def invitation_link(self, obj):
        if not obj.pk:
            return "Save the invitation to create a link."
        link = f"{settings.RSVP_INVITATION_ORIGIN}/#invite={obj.token}"
        return format_html('<a href="{}">{}</a>', link, link)

    @admin.action(description="Replace selected invitation links")
    def replace_links(self, request, queryset):
        for invitation in queryset:
            invitation.token = invitation_token()
            invitation.is_active = True
            invitation.save(update_fields=("token", "is_active", "updated_at"))
        self.message_user(request, "Invitation links replaced.", messages.SUCCESS)

    @admin.action(description="Disable selected invitation links")
    def disable_links(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, "Invitation links disabled.", messages.SUCCESS)


@admin.register(RsvpResponse)
class RsvpResponseAdmin(admin.ModelAdmin):
    list_display = ("guest_name", "attendance", "plus_one_name", "invitation", "created_at")
    list_filter = ("attendance",)
    search_fields = ("guest_name", "plus_one_name")
    readonly_fields = ("receipt", "invitation", "created_at", "updated_at")

    def get_urls(self):
        return [
            path("uploads/<int:upload_id>/download/", self.admin_site.admin_view(self.download), name="rsvp_upload_download"),
            path("uploads/<int:upload_id>/delete/", self.admin_site.admin_view(self.delete_upload), name="rsvp_upload_delete"),
        ] + super().get_urls()

    def delete_upload(self, request, upload_id):
        if request.method != "POST":
            return HttpResponseNotAllowed(["POST"])
        if not request.user.has_perm("rsvp.change_rsvpresponse") or not request.user.has_perm("rsvp.delete_guestupload"):
            raise PermissionDenied
        upload = GuestUpload.objects.filter(pk=upload_id).first()
        if not upload:
            raise Http404
        response_id, storage_key = upload.response_id, upload.storage_key
        upload.delete()
        transaction.on_commit(lambda: remove_file(storage_key))
        return redirect("admin:rsvp_rsvpresponse_change", response_id)

    def download(self, request, upload_id):
        if not request.user.has_perm("rsvp.view_rsvpresponse") or not request.user.has_perm("rsvp.view_guestupload"):
            raise PermissionDenied
        upload = GuestUpload.objects.filter(pk=upload_id).first()
        if not upload:
            raise Http404
        try:
            file = (settings.RSVP_PRIVATE_ROOT / upload.storage_key).open("rb")
        except FileNotFoundError:
            raise Http404
        response = FileResponse(file, as_attachment=True, filename=upload.original_name)
        response["Cache-Control"] = "no-store"
        return response

    @admin.display(description="Uploaded files")
    def uploaded_files(self, obj):
        from django.utils.html import format_html_join
        if not obj.pk:
            return "No files"
        return format_html_join("", '<p><a href="{}">{}</a></p>', (
            (reverse("admin:rsvp_upload_download", args=[item.pk]), item.original_name)
            for item in obj.uploads.all()
        )) or "No files"

    readonly_fields = ("receipt", "invitation", "created_at", "updated_at", "uploaded_files")
    change_form_template = "admin/rsvp/response_change.html"

    def delete_model(self, request, obj):
        keys = list(obj.uploads.values_list("storage_key", flat=True))
        super().delete_model(request, obj)
        transaction.on_commit(lambda: [remove_file(key) for key in keys])

    def delete_queryset(self, request, queryset):
        keys = list(GuestUpload.objects.filter(response__in=queryset).values_list("storage_key", flat=True))
        super().delete_queryset(request, queryset)
        transaction.on_commit(lambda: [remove_file(key) for key in keys])

    def has_add_permission(self, request):
        return False
