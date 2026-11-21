# Contracts: Wedding RSVP

## Guest website

- `/` opens the standard invitation. `/#invite=<token>` opens the same book with the personalized name and optional note in the Invitation chapter. The RSVP chapter uses the assigned name and shows the eligible plus-one controls. An explicit invalid, replaced, or disabled link shows a contact-the-couple message in the book without offering a general submission. A connection problem has a retry state distinct from an unavailable link.
- Render guest names and messages as text. Context and responses carrying private data use `Cache-Control: no-store`. Set the invitation page's referrer policy to `no-referrer`, and omit tokens, submission keys, and personal data from request logging. Do not use the saved guest reply to populate the public form.

### Get context

`GET /api/rsvp/context/` uses optional `X-Invitation-Token` and optional `X-RSVP-Submission-Key`. The token is sent whenever the URL identifies a personalized invite. The submission key is sent when checking a pending general attempt.

| Result | Status | Body |
| --- | --- | --- |
| General | 200 | `{ kind: "general", state, csrfToken }` |
| Personalized | 200 | `{ kind: "personalized", state, guestName, personalMessage, allowsPlusOne, csrfToken }` |
| Unavailable invite | 404 | `{ code: "invite_unavailable" }` |

Django sets the CSRF cookie and returns a masked token for subsequent requests. General state is `received` for that attempt's saved receipt, `closed` for a discarded receipt, and `ready` otherwise. Personalized state is `received` if the invitation has a response and `ready` otherwise. No context response includes saved attendance, the message to the couple, or attachments.

### Submit RSVP

`POST /api/rsvp/responses/` accepts same-origin `multipart/form-data`. Send `X-CSRFToken`, a random UUID in `X-RSVP-Submission-Key`, and `X-Invitation-Token` for personalized submissions. Omit the token header for a general reply. An invalid supplied token never changes the request to a general one.

| Form field | Required | Value |
| --- | --- | --- |
| `guest_name` | General only | Nonblank text. Omit for personalized. Django uses the assigned name. |
| `attendance` | Both flows | `accepted` or `declined`. |
| `plus_one_attending` | Eligible personalized acceptance only | `true` or `false`; omit when ineligible. |
| `plus_one_name` | Confirmed plus-one only | Nonblank text. |
| `guest_message` | Optional | Plain text. |
| `attachments` | Optional | Repeated file fields, up to 15 JPEG, PNG, or HEIC photos of 25 MiB each and 3 MP4 or MOV videos of 250 MiB each. |

| Result | Status | Client handling |
| --- | --- | --- |
| New commit | 201 `{ code: "saved" }` | Show the existing thank-you treatment and seal and clear the pending draft. |
| Replay of currently saved receipt | 200 `{ code: "already_saved" }` | Acknowledge the earlier save. No edits or extra files are applied. |
| Input or file validation | 400 `{ code: "invalid_input", fields: { … }, files: [{ index, code }] }` | Keep the draft. Focus the first actionable error. File indices use submitted attachment order. |
| Too many photos or videos | 400 `{ code: "too_many_files" }` | Explain the 15-photo and 3-video limits and let the guest remove files. |
| Oversized file | 400 `{ code: "file_too_large" }` | Explain the 25 MiB photo and 250 MiB video limits and let the guest remove files. |
| CSRF failure | 403 | Reload context to refresh credentials and offer a retry with the same key. |
| Invalid or inactive invitation | 404 `{ code: "invite_unavailable" }` | Show unavailable state without personal details. |
| Other response already present, stale eligibility, or closed receipt | 409 with `already_received`, `invitation_changed`, or `submission_closed` | Respectively show the received view, reload context while retaining applicable draft fields, or direct the guest to the couple. Cross-flow reuse of a receipt also returns a generic `submission_closed`. |
| Busy service, failed transfer, or unexpected server error | 5xx, network failure, or proxy rejection such as 413 | Keep input, explain an unconfirmed outcome where applicable, check context before retrying with the same key, and offer to remove files. Handle non-JSON proxy errors. |

Use upload progress while bytes are sending, followed by a saving status until Django confirms. A retry keeps its submission key even if the guest removes attachments after a failure. The first successful submission for that key wins. Rechecking context after an ambiguous general outcome can confirm the earlier save without sending the files again. Keep the pending general key in session storage when available and in memory otherwise. Store no names, tokens, messages or files there. Refresh can restore the pending outcome check. Files must be reselected if the browser has discarded them.

## Django admin

- `/admin/` is the operator entry point. Provide invitation creation, editing, copying, disabling, and replacing, plus read and change controls for saved responses. Use the couple's admin account for response changes. Upload lists show original names, type, and size, with private downloads under the response.
- `GET /admin/rsvp/report/` requires staff access and view permission for invitations and responses. Optional `type=general|personalized` and `status=accepted|declined|awaiting_reply` filters apply to both rows and totals. Show name, invitation type, reply status, and confirmed plus-one name, with rows that open the saved response when present. Sort by guest name, then type and record ID. Show totals for the full filtered set, with pagination after filtering.
- `GET /admin/rsvp/uploads/<id>/download/` requires staff access and permission to view responses and uploads. Return the private original as an attachment with a safe filename and a no-store response. Pending files, removed files, and missing files are unavailable. A guest link or copied download URL grants no permission.
