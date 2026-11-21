# Validation Quickstart: Wedding RSVP

Run this guide once the RSVP implementation is in place. The commands use the project's existing Windows PowerShell setup. Use sample invitations and media.

## Run locally

1. Have Node.js 24, the project's Python 3.13 virtual environment, and FFprobe on PATH. Verify FFprobe with `ffprobe -version`. If the virtual environment is missing, follow the [project README](../../README.md) first.
2. In PowerShell at the repository root, prepare Django and start the server:

   ```powershell
   $env:RSVP_INVITATION_ORIGIN = 'http://localhost:5173'
   .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
   .\.venv\Scripts\python.exe backend\manage.py migrate
   .\.venv\Scripts\python.exe backend\manage.py createsuperuser
   .\.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000
   ```

3. In a second PowerShell window:

   ```powershell
   Set-Location frontend
   npm.cmd ci
   npm.cmd run dev -- --host 0.0.0.0 --port 5173
   ```

4. Open the invitation at `http://localhost:5173/` and the admin at `http://localhost:8000/admin/`. For a phone on trusted Wi-Fi, set `RSVP_INVITATION_ORIGIN` to the Vite LAN origin and add the LAN hostname or IP to `RSVP_ALLOWED_HOSTS` before starting Django. Open newly copied links on the phone; Django can remain bound to loopback behind Vite.

## Exercise the guest and admin flows

| Scenario | Expected result |
| --- | --- |
| Send a general acceptance and a general decline. Use the same name for both. | Both save as separate responses. The confirmation uses the existing seal. |
| Create three personalized invitations in admin. Accept one with a named plus-one, decline another, and leave one unanswered. | The name and personal note appear only on the intended link. The report shows two accepted, two declined, one awaiting reply and a headcount of three. Filtering to awaiting reply shows one row and a headcount of zero. |
| Open a link without a plus-one, decline a link with plus-one permission, and try removing permission after a named plus-one is recorded. | The guest can save no ineligible plus-one. Admin directs the couple to resolve a recorded plus-one before removing permission. |
| Open an already answered link and try a second submission. Correct its attendance in admin and open the report again. | The guest sees only that a reply was received and how to contact the couple. The admin correction updates totals. |
| Disable or replace an invitation link. Open the old link, then open the replacement. | The old link reveals no private details. Only the active link works. Any saved response is preserved. |
| Add a note, mixed photos and videos in supported formats, and a file in an unsupported format. Attempt to submit, then remove the rejected file and resubmit. | The form identifies the unsupported file and preserves the draft. After the valid submission, staff can find and download all supported originals. A copied download URL does not work for a guest or a staff account lacking the view permissions. |
| Interrupt a transfer and retry with the same draft. Simulate a lost response after commit and retry again. | A failed transfer leaves no partial reply. An unknown outcome can be checked and retried without new attendance entries or attachments. The guest can remove files and submit the reply alone when the earlier attempt did not commit. |
| Compare general and personalized RSVP screens against the existing chapter at a narrow phone width. Try keyboard navigation, reduced motion, text editing, and scrolling the attachment list. | Existing typography, field and button styles, paper, seal, and book navigation carry through. The guest can finish without sideways scrolling and can perceive validation and status feedback. |

## Run automated checks

From the repository root, run `.\.venv\Scripts\python.exe backend\manage.py test rsvp` and `.\.venv\Scripts\python.exe backend\manage.py check`. From `frontend`, run `npm.cmd run build`.

## Verify on the intended host

Before sharing real links, run Django's deployment check with the production settings. Verify that HTTPS serves the invitation, API and admin on the same origin. Test photos at 25 MiB and videos at 250 MiB and a mixed reply with 15 photos and 3 videos. Verify that larger individual files are rejected. Verify that a 16th photo or fourth video is rejected. Try a second submission during an active transfer, check that an admin request is still responsive, and verify that neither upload directory is publicly addressable. Check the free space available for proxy spool files, Django temporary files, and persistent originals. Confirm that the database and media are durable and included in the same backup procedure.
