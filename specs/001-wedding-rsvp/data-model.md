# Data Model: Wedding RSVP

The Django `rsvp` app owns the following records. All timestamps use Django's timezone-aware dates.

| Entity | Fields and relationships | Rules |
| --- | --- | --- |
| `Invitation` | ID, `guest_name`, `personal_message`, `allows_plus_one`, `is_active`, unique `token`, creation and update timestamps | Name is required after trimming. Message is optional plain text. Generate the URL-safe token from 32 random bytes. Only admin can create, edit, copy, disable or replace a link. Replacement rotates the token and activates the link. Existing responses stay linked by ID. |
| `SubmissionReceipt` | Random UUID primary key supplied by the guest, nullable invitation relationship, creation timestamp | Create only in the same transaction as a successful RSVP. A null invitation means general. The key is globally unique and verified against its owning flow and invitation before treating it as a replay. Keep a minimal receipt after deletion of a duplicate so retrying it cannot bring it back. It contains no guest text or media. |
| `RsvpResponse` | ID, one-to-one receipt, nullable unique invitation relationship, `guest_name`, `attendance` (`accepted` or `declined`), optional `plus_one_name`, optional `guest_message`, creation and update timestamps | Null invitation means general. Guest name comes from the form for general responses and from the invitation for personalized submissions. The personalized report displays the current invitation name. Receipt and response must refer to the same invitation or both be general. A populated plus-one name means a confirmed plus-one. |
| `GuestUpload` | ID, parent response, unique generated storage key, original display filename, validated media type, byte count | Files are private originals. Storage paths contain generated IDs only. Each file belongs to one response, and removing the response removes its upload records. |

## Validation and transitions

- General responses require a nonblank name and an attendance decision. Separate submissions remain separate even if names match. For personalized forms, Django derives the guest name and eligibility from the active invitation.
- A plus-one name requires a personalized invitation that permits the extra guest and an accepted reply. A guest marks whether the plus-one attends and supplies the name only for yes. Declining or choosing no clears prior plus-one input. The database also rejects plus-one names on declines or general replies.
- A new invitation starts active and awaiting reply. A successful submission moves it to received. Only the designated administrator can update a received response. Changing a reply to declined clears its plus-one. Django admin rejects removal of plus-one permission while a confirmed plus-one is recorded. The administrator can first remove the plus-one from the response.
- Revocation and replacement update link availability and preserve attendance. An old or inactive token cannot fetch context or submit, including a replay. Disable invitations to retire them. An invitation with a saved response is protected from deletion.
- Insert the receipt, response, and all attachment rows in one transaction after the originals are ready in private storage. Recheck invitation status, token, eligibility, and the receipt inside the transaction. Recover conflicts through the saved receipt or invitation state. After removal, a general receipt remains closed with no response.
- Remove upload records and confirmed duplicate general responses using Django admin. Schedule private file deletion after the database commit, leaving any failed cleanup files invisible to both guests and admins. Operational cleanup can remove unreferenced files while uploads are stopped.

## Report projection

The admin report derives rows from the current records. There is one row per general response and one per personalized invitation, with or without a response. No report table or duplicated totals are stored. A disabled invitation remains in the report, and an invitation without a response is awaiting reply. Attendance equals the accepted guest count plus the confirmed plus-one count. Filter before counting and paginating.
