import uuid
import io
import tempfile
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, TestCase
from django.test import override_settings
from django.urls import reverse
from django.utils.datastructures import MultiValueDict
from PIL import Image

from .models import Invitation, RsvpResponse, SubmissionReceipt
from .views import submit


class ReportTests(TestCase):
    def test_report_counts_guests_and_plus_one(self):
        invitation = Invitation.objects.create(guest_name="Alex", allows_plus_one=True)
        receipt = SubmissionReceipt.objects.create(id=uuid.uuid4(), invitation=invitation)
        RsvpResponse.objects.create(
            receipt=receipt, invitation=invitation, guest_name="Alex",
            attendance="accepted", plus_one_name="Sam",
        )
        Invitation.objects.create(guest_name="Taylor")
        self.client.force_login(get_user_model().objects.create_superuser(
            username="admin", password="test-password-927"
        ))
        response = self.client.get(reverse("admin:rsvp_report"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Expected attendance: 2")
        self.assertContains(response, "Taylor")
        filtered = self.client.get(reverse("admin:rsvp_report"), {"status": "awaiting_reply"})
        self.assertContains(filtered, "Expected attendance: 0")
        self.assertNotContains(filtered, "Alex")

    def test_anonymous_cannot_access_report(self):
        response = self.client.get(reverse("admin:rsvp_report"))
        self.assertEqual(response.status_code, 302)


class GuestRsvpTests(TestCase):
    def test_per_file_size_limits(self):
        for filename, maximum in (("photo.png", 25 * 1024 * 1024), ("video.mp4", 250 * 1024 * 1024)):
            for size, expected in ((maximum, 201), (maximum + 1, 400)):
                with self.subTest(filename=filename, size=size):
                    upload = SimpleUploadedFile(filename, b"x")
                    upload.size = size
                    request = RequestFactory().post("/api/rsvp/responses/", {
                        "guest_name": "Guest", "attendance": "declined",
                    }, HTTP_X_RSVP_SUBMISSION_KEY=str(uuid.uuid4()))
                    request.POST
                    request._files = MultiValueDict({"attachments": [upload]})
                    with patch("rsvp.views.stage_file", return_value={
                        "storage_key": uuid.uuid4().hex, "original_name": filename,
                        "media_type": "image/png", "byte_count": size,
                    }):
                        result = submit(request)
                    self.assertEqual(result.status_code, expected)
                    if expected == 400:
                        self.assertJSONEqual(result.content, {"code": "file_too_large"})

    def test_media_count_limits_enforced_for_both_invitation_types(self):
        invitation = Invitation.objects.create(guest_name="Guest")
        cases = [
            (None, 16, 0), (None, 0, 4),
            (invitation, 16, 0), (invitation, 0, 4),
        ]
        for invite, photos, videos in cases:
            with self.subTest(personalized=bool(invite), photos=photos, videos=videos):
                headers = {"HTTP_X_RSVP_SUBMISSION_KEY": str(uuid.uuid4())}
                if invite:
                    headers["HTTP_X_INVITATION_TOKEN"] = invite.token
                files = [SimpleUploadedFile(f"photo{i}.png", b"test") for i in range(photos)]
                files += [SimpleUploadedFile(f"video{i}.mp4", b"test") for i in range(videos)]
                with patch("rsvp.views.stage_file") as stage:
                    result = self.client.post("/api/rsvp/responses/", {
                        "guest_name": "Guest", "attendance": "declined", "attachments": files,
                    }, **headers)
                self.assertEqual(result.status_code, 400)
                self.assertEqual(result.json()["code"], "too_many_files")
                stage.assert_not_called()
                self.assertFalse(RsvpResponse.objects.exists())

    def test_mixed_selection_at_limit_is_accepted(self):
        uploads = [SimpleUploadedFile(f"photo{i}.png", b"x") for i in range(15)]
        uploads += [SimpleUploadedFile(f"video{i}.mp4", b"x") for i in range(3)]
        def validated(upload):
            return {"storage_key": uuid.uuid4().hex, "original_name": upload.name,
                    "media_type": "image/png" if upload.name.endswith(".png") else "video/mp4",
                    "byte_count": 1}
        with patch("rsvp.views.stage_file", side_effect=validated):
            result = self.client.post("/api/rsvp/responses/", {
                "guest_name": "Guest", "attendance": "declined", "attachments": uploads,
            }, HTTP_X_RSVP_SUBMISSION_KEY=str(uuid.uuid4()))
        self.assertEqual(result.status_code, 201)
        self.assertEqual(RsvpResponse.objects.get().uploads.count(), 18)

    def test_photo_is_private_and_retry_does_not_duplicate_it(self):
        with tempfile.TemporaryDirectory() as directory, override_settings(RSVP_PRIVATE_ROOT=Path(directory)):
            image = io.BytesIO()
            Image.new("RGB", (2, 2), "red").save(image, "PNG")
            content = image.getvalue()
            headers = {"HTTP_X_RSVP_SUBMISSION_KEY": str(uuid.uuid4())}
            def submission():
                return self.client.post("/api/rsvp/responses/", {
                    "guest_name": "Guest", "attendance": "accepted",
                    "attachments": SimpleUploadedFile("photo.png", content, content_type="image/png"),
                }, **headers)
            self.assertEqual(submission().status_code, 201)
            self.assertEqual(submission().json()["code"], "already_saved")
            upload = RsvpResponse.objects.get().uploads.get()
            self.assertEqual(len(list(Path(directory).iterdir())), 1)
            url = reverse("admin:rsvp_upload_download", args=[upload.pk])
            self.assertEqual(self.client.get(url).status_code, 302)
            self.client.force_login(get_user_model().objects.create_superuser(
                username="owner", password="test-password-927"
            ))
            download = self.client.get(url)
            self.assertEqual(download.status_code, 200)
            self.assertEqual(b"".join(download.streaming_content), content)
            change = self.client.get(reverse("admin:rsvp_rsvpresponse_change", args=[upload.response_id]))
            self.assertContains(change, upload.original_name)
            delete_url = reverse("admin:rsvp_upload_delete", args=[upload.pk])
            self.assertEqual(self.client.get(delete_url).status_code, 405)
            with self.captureOnCommitCallbacks(execute=True):
                self.assertEqual(self.client.post(delete_url).status_code, 302)
            self.assertFalse(Path(directory, upload.storage_key).exists())
            self.assertEqual(self.client.get(url).status_code, 404)

    def test_plus_one_default_and_optional_response(self):
        invitation = Invitation.objects.create(guest_name="Guest")
        self.assertTrue(invitation.allows_plus_one)
        headers = {"HTTP_X_INVITATION_TOKEN": invitation.token, "HTTP_X_RSVP_SUBMISSION_KEY": str(uuid.uuid4())}
        self.assertTrue(self.client.get("/api/rsvp/context/", **headers).json()["allowsPlusOne"])
        missing = self.client.post("/api/rsvp/responses/", {"attendance": "accepted", "plus_one_attending": "true"}, **headers)
        self.assertEqual(missing.status_code, 400)
        response = self.client.post("/api/rsvp/responses/", {"attendance": "accepted", "plus_one_attending": "false"}, **headers)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(RsvpResponse.objects.get(invitation=invitation).plus_one_name, "")

    def test_disabled_plus_one_rejects_extra_guest(self):
        invitation = Invitation.objects.create(guest_name="Guest", allows_plus_one=False)
        headers = {"HTTP_X_INVITATION_TOKEN": invitation.token, "HTTP_X_RSVP_SUBMISSION_KEY": str(uuid.uuid4())}
        response = self.client.post("/api/rsvp/responses/", {"attendance": "accepted", "plus_one_name": "Extra"}, **headers)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(RsvpResponse.objects.filter(invitation=invitation).exists())

    def test_personalized_name_and_retry(self):
        invitation = Invitation.objects.create(guest_name="Alex", allows_plus_one=True)
        headers = {"HTTP_X_INVITATION_TOKEN": invitation.token, "HTTP_X_RSVP_SUBMISSION_KEY": str(uuid.uuid4())}
        context = self.client.get("/api/rsvp/context/", **headers)
        self.assertEqual(context.json()["guestName"], "Alex")
        data = {"attendance": "accepted", "plus_one_attending": "true", "plus_one_name": "Sam", "guest_name": "Ignored"}
        self.assertEqual(self.client.post("/api/rsvp/responses/", data, **headers).status_code, 201)
        self.assertEqual(self.client.post("/api/rsvp/responses/", data, **headers).json()["code"], "already_saved")
        response = RsvpResponse.objects.get()
        self.assertEqual((response.guest_name, response.plus_one_name), ("Alex", "Sam"))
        self.assertEqual(self.client.get("/api/rsvp/context/", **headers).json()["state"], "received")

    def test_general_and_invalid_link(self):
        headers = {"HTTP_X_RSVP_SUBMISSION_KEY": str(uuid.uuid4())}
        response = self.client.post("/api/rsvp/responses/", {"guest_name": "Lee", "attendance": "declined"}, **headers)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.client.get("/api/rsvp/context/", HTTP_X_INVITATION_TOKEN="invalid").status_code, 404)
