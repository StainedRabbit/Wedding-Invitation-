# Feature Specification: Wedding RSVP

**Feature Branch**: None. Spec Kit tracks this feature by its directory.

**Created**: 2026-11-21

**Status**: Ready for planning

**Input**: Replace the Our Next Chapter RSVP preview with saved responses and guest uploads on the invitation website. Use Django's built-in admin to create personalized invitations and their private links, review guest messages and uploads, and report on all RSVPs. Preserve the invitation's visual style and mobile reading experience.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - RSVP from the general invitation (Priority: P1)

A guest opens the general invitation, enters their name, and accepts or declines. They see a confirmation after their response is saved. The couple can find it in the admin.

**Why this priority**: Every guest needs a reliable way to reply, including guests who receive the general link.

**Independent Test**: Open the general link on a phone, submit a reply, close the book, and verify the saved response in the admin.

**Acceptance Scenarios**:

1. **Given** the general invitation link, **when** a guest opens the RSVP chapter, **then** they can enter their name and accept or decline without an account.
2. **Given** a valid name and attendance choice, **when** a guest submits, **then** the guest sees a saved confirmation and the admin shows the name, choice, and general invitation source.
3. **Given** a blank name or missing attendance choice, **when** a guest submits, **then** the form identifies the missing field, keeps the other input, and saves no response.
4. **Given** a guest navigating with a keyboard or assistive technology, **when** they fill and submit the form, **then** labels and controls are usable, field errors are associated with their fields, and the result is announced.

---

### User Story 2 - Create and respond to a personalized invitation (Priority: P1)

The couple enters the guest's name, optional personal message, and plus-one permission in Django admin. Saving the invitation creates a unique link the couple can copy and share. The guest opens that link on the invitation website to see their name and the couple's message and respond.

**Why this priority**: Personalized invitations let the couple welcome specific guests and count only the additional seats they offered.

**Independent Test**: Create two invitations, one with a plus-one and one without. Open each link independently, respond, and verify the records and attendance counts.

**Acceptance Scenarios**:

1. **Given** an authorized user in Django admin, **when** they save a new invitation with a guest name, optional message, and plus-one setting, **then** Django admin provides a unique, copyable link that opens that guest's personalized invitation on the website.
2. **Given** an invitation allowing a plus-one, **when** the named guest accepts and chooses to bring someone, **then** the form requires that person's name and the response counts two attendees.
3. **Given** a guest who declines, accepts without a plus-one, or was offered no plus-one, **when** they submit, **then** no plus-one is recorded. The response counts zero attendees for a decline and one for an acceptance.
4. **Given** a link that is invalid or has been disabled or replaced, **when** someone opens it, **then** they see an unavailable message suggesting they contact the couple, with no personal details and no automatic submission through the general invitation.
5. **Given** a personalized RSVP has been saved, **when** the guest revisits its RSVP chapter, **then** they see that a reply was received and are directed to contact the couple for changes. The link reveals no saved reply, guest message, or uploads, and a second submission cannot change the saved response or its attachments.

---

### User Story 3 - Send a message, photos, or videos (Priority: P2)

A guest on either invitation uses the website's RSVP form to send an optional message to the couple and upload photos, videos, or a mix of both, regardless of attendance choice. The couple can see the uploaded files in Django admin under that guest's saved response.

**Why this priority**: Guests who attend or decline can share something personal with the couple.

**Independent Test**: Submit a general decline and a personalized acceptance with a message and supported files. Verify that authorized admins can retrieve each item with its response.

**Acceptance Scenarios**:

1. **Given** either invitation type and a valid attendance response, **when** a guest submits a message and several supported photos and videos through the website's RSVP form, **then** authorized staff can see the message and attachment list and open or download the files from that response in Django admin.
2. **Given** an unsupported file, **when** the guest selects or submits it, **then** the form identifies the problem and allows the guest to remove or replace the file without retyping their response.
3. **Given** an interrupted upload or failed save, **when** the guest returns to the form, **then** it retains the entered text and choices while the form is open, explains what happened or if the outcome could not be confirmed, and lets them retry or remove the attachments and submit the response alone.
4. **Given** either invitation on a phone, **when** the guest fills in the message, manages attachments, and sees an error or confirmation, **then** those controls and states fit inside the existing RSVP chapter and use its established visual treatment. The saved confirmation uses the existing thank-you layout and seal.
5. **Given** a selection of up to 15 photos and 3 videos, **when** the guest submits supported files, **then** the selection is accepted. A selection exceeding either count is rejected with a clear message and without saving a response.

---

### User Story 4 - Manage invitations and responses (Priority: P2)

The couple reviews attendance, guest messages, and uploaded files from one admin area. They can correct a response on a guest's behalf and disable or replace a link if it was shared unintentionally.

**Why this priority**: The couple needs a reliable guest list and control over access to each personalized invitation.

**Independent Test**: Open a saved response in Django admin, correct it, download and remove test media, and replace a personalized link.

**Acceptance Scenarios**:

1. **Given** a saved response, **when** authorized staff open it in Django admin, **then** they can see the guest's name, invitation type, attendance status, and any attending plus-one, guest message, or files.
2. **Given** an existing response, **when** an authorized admin corrects attendance or a plus-one name, or removes a file, **then** the change is reflected in the guest list, headcount, or file availability as applicable.
3. **Given** a replacement link, **when** the old and new links are opened, **then** only the new link loads the personalized invitation. Any response already saved remains available in the admin.
4. **Given** someone without admin permission, **when** they try to view the response list or retrieve an uploaded file, **then** they cannot access it, including through a copied file link.
5. **Given** staff have confirmed a general response is a duplicate, **when** they remove it in the admin, **then** the headcount excludes it and its attachments are no longer available.

---

### User Story 5 - See all RSVPs in one report (Priority: P2)

The couple opens the RSVP report in Django admin to see every general response and the reply status of every personalized invitation, including who's still to reply. The report shows the expected number of people attending.

**Why this priority**: The couple needs a headcount for wedding planning and a list of personalized guests to follow up with.

**Independent Test**: Create a general acceptance and decline, a personalized acceptance with a plus-one, a personalized decline, and an unanswered personalized invitation. Open the report and verify the five rows, status totals, and three-person headcount.

**Acceptance Scenarios**:

1. **Given** responses from both invitation types and an unanswered personalized invitation, **when** authorized staff open the report, **then** the report shows each guest's name, invitation type, response status, and any attending plus-one. The unanswered invitation shows “Awaiting reply.”
2. **Given** the report includes acceptances, declines, and invitations awaiting reply, **when** staff view or filter it by invitation type or status, **then** the summary shows the matching counts for each status and the expected headcount. Each acceptance counts one guest plus their confirmed plus-one, if any. Declines and invitations awaiting reply count zero toward the headcount.
3. **Given** a new RSVP, a corrected reply, or a removed duplicate, **when** staff reopen the report, **then** its rows and totals reflect the current records.
4. **Given** a report row with a saved response, **when** staff open it, **then** they can review that guest's message and any uploads on the response record. Visitors without admin permission cannot view the report.

### Edge Cases

- **Accidental retries**: A double tap or retry of the same submission after an unconfirmed result must not create a second RSVP or duplicate attachments. A failure known to have occurred before saving must leave no partial response or attachments visible to the couple.
- **Two guests with the same name**: Separate general submissions are kept separate. Names alone never grant access to a prior response or overwrite it.
- **Sending a second reply**: A personalized invitation keeps its first successfully saved response. The couple handles later changes in Django admin. An accidental retry can confirm the original save without recording another response or attachment.
- **Plus-one becomes ineligible**: If the guest changes their answer to decline or the couple removes permission before submission, plus-one details cannot be saved. Removing permission after an RSVP does not silently change the recorded headcount. The admin must resolve an existing attending plus-one when removing permission.
- **Personalized link is shared**: Anyone with an active link can see the intended guest's name and invitation note. The couple can disable or replace it. A link grants no access to other invitations, uploads, or the admin.
- **Optional content**: Guests can submit only the attendance response, including after removing failed attachments. The form lists supported formats before the guest selects files.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The standard invitation link MUST open the general experience. The RSVP MUST require a nonblank guest name and an explicit accept or decline choice, with no guest login.
- **FR-002**: Authorized staff MUST be able to create and edit a personalized invitation in Django admin with a guest name, an optional message from the couple, and permission for up to one additional guest. Creating the invitation MUST generate a unique, hard-to-guess link that staff can copy from Django admin.
- **FR-003**: A valid personalized link MUST open the existing invitation experience with the intended guest's name and any note. Its RSVP MUST be tied to that invitation and use the assigned name.
- **FR-004**: The RSVP MUST accept a plus-one only when the named guest accepts and the invitation permits it. The plus-one's name is required if they will attend. General invitations allow one attendee per response.
- **FR-005**: The invitation website's RSVP form MUST let guests on both invitation types send an optional message and upload up to 15 photos at 25 MiB each and 3 videos at 250 MiB each with either attendance choice. The form MUST state the counts, sizes, and supported formats in advance and reject unsupported or oversized files and selections exceeding either count.
- **FR-006**: The RSVP MUST confirm success only after the attendance response and all attachments included in that submission are saved together. A known failure MUST show how to recover and MUST leave no partial result visible in the admin. An unconfirmed outcome MUST allow a safe retry.
- **FR-007**: Django admin MUST show each saved response's invitation type, attendance status, attending plus-one name, guest message, and uploaded files. Authorized staff MUST be able to open or download the files, correct responses, remove confirmed duplicate general responses, and remove guest messages or files.
- **FR-008**: The admin MUST restrict access to saved responses, guest messages, and uploads to authorized staff. The guest experience MUST explain that messages and uploads are shared privately with the couple. An active private invitation link reveals only the name and note for that invitation in the invitation view.
- **FR-009**: Authorized staff MUST be able to disable or replace a personalized link without losing its saved response. Unavailable links MUST reveal no guest details and give the visitor a way forward by suggesting they contact the couple.
- **FR-010**: A personalized invitation MUST have at most one saved RSVP for attendance reporting. After the initial save, only an authorized administrator acting for the couple MUST be able to edit it, through Django admin. On return, the guest's RSVP chapter MUST acknowledge the saved reply and direct the guest to contact the couple for changes. The personalized link MUST NOT reveal the contents of the saved response or allow another submission to alter it.
- **FR-011**: Retrying the same submission MUST NOT create another response or duplicate its attachments. Separate general submissions MUST NOT be merged based on name.
- **FR-012**: Both guest flows MUST extend the existing RSVP chapter in the invitation book. The name, personal message, plus-one fields, guest message, attachment controls, and feedback MUST use the invitation's existing visual patterns for typography, colors, spacing, fields, and buttons where applicable. The saved confirmation MUST use the existing thank-you layout and seal. The RSVP MUST fit a phone screen without horizontal scrolling and support keyboard operation, labeled controls, and accessible error and success feedback. Book navigation and reduced-motion choices MUST remain available.
- **FR-013**: Django admin MUST provide an RSVP report for authorized staff with one row per general response and one row per personalized invitation. Each row MUST show the guest name, invitation type, status, and any attending plus-one, and open its saved response when available. Staff MUST be able to filter by invitation type and status. The report MUST show current counts for accepted, declined, and awaiting reply, and the total expected attendance including confirmed plus-ones, for the records shown.

### Key Entities *(include if feature involves data)*

- **Personalized invitation**: One named guest, optional note from the couple, plus-one permission, link availability, and its current response if received.
- **RSVP response**: General or personalized source, guest name, accept or decline choice, attending plus-one name if applicable, optional message to the couple, and zero or more uploaded files.
- **Guest upload**: A photo or video associated with one response and available only to authorized staff.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least four of five first-time guests in a phone usability check can complete either invitation's RSVP within 90 seconds of opening the RSVP form, excluding time spent choosing or uploading files.
- **SC-002**: Every case in an attendance test covering a general acceptance and decline, a personalized acceptance with and without a plus-one, and a personalized decline produces the expected headcount in the admin.
- **SC-003**: Every test submission that receives a success confirmation remains visible after the guest closes the invitation, including its message and all accepted files. Retrying an unconfirmed submission results in the same headcount and attachment count as one successful submission.
- **SC-004**: Every negative access test for an invalid, disabled, or replaced invitation link reveals zero guest details. Every test of an uploaded file by an unauthorized visitor denies access.
- **SC-005**: A keyboard user can complete both RSVP flows at a phone-sized width, correct a missing field, and perceive the final result without horizontal scrolling. A side-by-side review with the existing RSVP chapter confirms that new controls and feedback follow the existing typography, palette, spacing, and button and field styles.
- **SC-006**: With two accepted RSVPs, one confirmed plus-one, two declined RSVPs, and one unanswered personalized invitation, the report shows five rows and an expected headcount of three. Filtering to invitations awaiting reply shows one row and an expected headcount of zero.

## Assumptions

- The couple uses Django's built-in admin and shares private invitation links through their preferred channel. Sending links automatically and a guest account system are outside this feature.
- General guests can contact the couple to correct a saved response. The general form does not look up a response or infer identity from a name. Staff use the admin to reconcile separate submissions that turn out to be duplicates.
- Guest messages and uploads are private to authorized admins. There is no shared gallery in this feature.
- The proposed formats are JPEG, PNG, and HEIC for photos and MP4 and MOV for videos. The admin can download the original files. In-page video playback is outside this feature.
