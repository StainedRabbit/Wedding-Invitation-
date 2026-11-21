import secrets
import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


def invitation_token():
    return secrets.token_urlsafe(32)


class Invitation(models.Model):
    guest_name = models.CharField(max_length=200)
    personal_message = models.TextField(blank=True)
    allows_plus_one = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    token = models.CharField(max_length=64, unique=True, default=invitation_token)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        self.guest_name = self.guest_name.strip()
        if not self.guest_name:
            raise ValidationError({"guest_name": "Enter a guest name."})
        if self.pk and not self.allows_plus_one and RsvpResponse.objects.filter(
            invitation=self
        ).exclude(plus_one_name="").exists():
            raise ValidationError(
                {"allows_plus_one": "Remove the recorded plus-one from the response first."}
            )

    def __str__(self):
        return self.guest_name


class SubmissionReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invitation = models.ForeignKey(
        Invitation, null=True, blank=True, on_delete=models.PROTECT
    )
    created_at = models.DateTimeField(auto_now_add=True)


class RsvpResponse(models.Model):
    receipt = models.OneToOneField(SubmissionReceipt, on_delete=models.PROTECT)
    invitation = models.OneToOneField(
        Invitation, null=True, blank=True, on_delete=models.PROTECT
    )
    guest_name = models.CharField(max_length=200)
    attendance = models.CharField(
        max_length=8, choices=[("accepted", "Accepted"), ("declined", "Declined")]
    )
    plus_one_name = models.CharField(max_length=200, blank=True)
    guest_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(plus_one_name="") | Q(attendance="accepted", invitation__isnull=False),
                name="plus_one_requires_personal_acceptance",
            )
        ]

    def clean(self):
        self.guest_name = self.guest_name.strip()
        self.plus_one_name = self.plus_one_name.strip()
        if not self.guest_name:
            raise ValidationError({"guest_name": "Enter a guest name."})
        if self.receipt_id and self.receipt.invitation_id != self.invitation_id:
            raise ValidationError("The receipt and response must use the same invitation.")
        if self.plus_one_name and (
            self.attendance != "accepted"
            or not self.invitation_id
            or not self.invitation.allows_plus_one
        ):
            raise ValidationError({"plus_one_name": "This invitation does not allow a plus-one."})

    def __str__(self):
        return self.guest_name


class GuestUpload(models.Model):
    response = models.ForeignKey(RsvpResponse, related_name="uploads", on_delete=models.CASCADE)
    storage_key = models.CharField(max_length=255, unique=True)
    original_name = models.CharField(max_length=255)
    media_type = models.CharField(max_length=100)
    byte_count = models.PositiveBigIntegerField()
