# Tasks: Wedding RSVP

## Setup and foundation

- [ ] T001 Configure RSVP app, private media storage and local development in backend/config/settings.py and backend/requirements.txt.
- [ ] T002 Implement Invitation.guest_name, Invitation.personal_message, Invitation.allows_plus_one, Invitation.is_active and Invitation.token from data-model.md, plus SubmissionReceipt.invitation, RsvpResponse.receipt, RsvpResponse.invitation, RsvpResponse.guest_name, RsvpResponse.attendance, RsvpResponse.plus_one_name, RsvpResponse.guest_message and GuestUpload fields in backend/rsvp/models.py and migrations.

## User Story 1 - General RSVP

Independent test: submit a general response and find it in admin after reopening.

- [ ] T003 [US1] Implement CSRF context, validated general submission and idempotent receipts in backend/rsvp/views.py and backend/config/urls.py.
- [ ] T004 [US1] Connect the existing frontend/src/Rsvp.tsx form to the API and preserve draft and retry state in frontend/src/main.tsx.

## User Story 2 - Personalized invitations

Independent test: create two invitations with different plus-one settings and verify each unique link and response.

- [ ] T005 [US2] Create invitation admin controls, token rotation, and plus-one validation in backend/rsvp/admin.py and backend/rsvp/models.py.
- [ ] T006 [US2] Implement personalized context and one-response submission in backend/rsvp/views.py.
- [ ] T007 [US2] Display personalized content and eligible plus-one fields in frontend/src/Reader.tsx and frontend/src/Rsvp.tsx.

## User Story 3 - Guest media

Independent test: send a guest message with mixed files and retrieve them privately in admin.

- [ ] T008 [US3] Validate supported media, stage files privately and clean failed uploads in backend/rsvp/media.py and backend/rsvp/views.py.
- [ ] T009 [US3] Add private permission-checked downloads and upload management in backend/rsvp/admin.py.
- [ ] T010 [US3] Add accessible file selection, progress, retry and error states using existing styles in frontend/src/Rsvp.tsx and frontend/src/style.css.

## User Story 4 - Admin management

Independent test: correct a response, delete a duplicate and replace a personalized link.

- [ ] T011 [US4] Implement response correction, deletion cleanup and invitation management in backend/rsvp/admin.py.

## User Story 5 - RSVP report

Independent test: check the five-row example and three-person headcount in the specification.

- [ ] T012 [US5] Implement the filtered report with response and plus-one totals in backend/rsvp/admin.py and backend/rsvp/templates/admin/rsvp/report.html.

## Validation

- [ ] T013 Test guest submission, privacy, retries, concurrent writes, report totals and admin behavior in backend/rsvp/tests.py.
- [ ] T014 Run backend tests, frontend build and browser accessibility and visual checks using specs/001-wedding-rsvp/quickstart.md; document local startup in README.md.

Dependencies: T001–T002 precede all stories. General and personalized submissions precede media integration and reporting. Validation follows implementation. Independent backend and frontend work may proceed in parallel when their shared API contract is stable.

Implementation strategy: finish general RSVP first, then personalized invitations, private media, management, and reporting. Each story has an independent test above.
