# Implementation Plan: Wedding RSVP

**Branch**: None (feature ID `001-wedding-rsvp`) | **Date**: 2026-11-21 | **Spec**: [Wedding RSVP](spec.md)

**Input**: Feature specification in `specs/001-wedding-rsvp/spec.md`.

## Summary

Replace the RSVP preview with an invitation-aware React form and a Django service that saves attendance, optional messages, and private media. Use Django's built-in admin for personalized links, correction of saved replies, downloads, and a consolidated report. Keep the existing book, chapter flow, and RSVP styles.

## Technical Context

**Language/Version**: Python 3.13, TypeScript 6, Node.js 24.

**Primary Dependencies**: Existing Django 5.2.16, React 19 and Vite 8. Add Pillow, pillow-heif and an FFprobe executable for media validation.

**Storage**: PostgreSQL for this project's local database, with short transactions and row locks for personalized invitation submission. SQLite remains available as a development fallback. Store uploads on persistent private disk and spool incoming data to a provisioned temporary directory.

**Testing**: Django test runner, frontend type check and production build, desktop and phone browser acceptance, and a host-level upload smoke test.

**Target Platform**: Windows PowerShell for development, mobile and desktop browsers for guests, assumed single Linux host for production. Use a same-origin HTTPS setup with Nginx and Gunicorn.

**Project Type**: Existing web application with a React frontend, Django API, and staff interface.

**Performance Goals**: Preserve responsive book navigation on phones, stream uploaded bytes to disk, and keep file validation and writes outside the database transaction. Show separate uploading and saving feedback.

**Constraints**: At most 15 photos of 25 MiB each and 3 videos of 250 MiB each per RSVP. Only the designated admin edits saved personalized RSVPs. Guest media stays private. Use the existing invitation and RSVP styles.

**Scale/Scope**: One wedding, one application host, two guest flows, and one admin report. The prototype has no saved replies to import. Apply new Django and RSVP migrations before serving the updated frontend.

## Constitution Check

**Before research**: No project principles are ratified in the current constitution template. Use the approved feature specification and existing application structure as the design baseline.

**After design**: No constitution conflicts found. The design keeps the current frontend and Django admin, introduces one Django app, and covers upload privacy, safe retries, and the approved design through the contracts and validation guide.

## Project Structure

### Documentation (this feature)

```text
specs/001-wedding-rsvp/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── guest-and-admin.md
└── quickstart.md
```

### Source Code (repository root)

```text
backend/
├── config/                 # Django settings, routes and WSGI entry point
└── rsvp/                   # Models, forms, submission and media services, admin, migrations and tests
frontend/
├── src/                    # Existing book, Reader, RSVP and shared CSS, plus RSVP API/state
└── vite.config.ts          # Same-origin guest API proxy for development
```

**Structure Decision**: Keep the existing frontend and backend directories. Put RSVP rules and reporting in one Django app. Pass guest context and RSVP state from the React app to the existing invitation and RSVP chapters.

## Implementation Design

1. **Django foundation and admin**. Enable Django admin, auth, content types, sessions, templates, CSRF middleware, and static files. Add the `rsvp` models and migrations in the [data model](data-model.md). Build copyable links from a configured public invitation origin, not from a request host. Expose disable and replace as authenticated admin operations. Use the couple's admin account for changes. Derive the report from personalized invites and general responses, sorting and filtering the same rows used for status counts and headcount. Use explicit view permissions for the report and download routes.
2. **Submission and recovery**. Use the [guest and admin contracts](contracts/guest-and-admin.md) for context, multipart submission, and downloads. Use Django's disk-backed file handler and disable the stock count cap. Validate and fully write originals under a new server-generated private directory per request, including concurrent requests with the same submission key. Open a short transaction and recheck link status, eligibility, and idempotency before publishing the rows. Clean up only the current request's files on a failed or losing attempt. Use deletion after commit for removals. Cover recovery from a process crash with an offline inventory and cleanup of files with no committed attachment row. Return a successful receipt only after commit.
3. **Media validation and access**. Accept JPEG and PNG via Pillow and HEIC via pillow-heif. For MP4/MOV, use a local-only, time-bounded FFprobe process without shell execution or external track references. Check a supported MP4 or QuickTime container and a real video stream. Use the detected format, including container brands where present, rather than the shared demuxer name alone. Store no guest files under public routes. Use Django `FileResponse` for authorized downloads with attachment disposition and sanitized display names.
4. **Invitation and RSVP experience**. Read the invitation fragment in the existing app. Resolve context before showing personalized data. Place the assigned name and optional note in the Invitation chapter and keep RSVP within its current chapter and back action. Reuse the paper layout, fonts, field and button styles, focus treatment, and thank-you seal. Add the conditional plus-one controls, message, attachment list with remove actions, and accessible progress/errors in that visual language. Keep the live draft and current upload above the chapter and book lifecycle so a page turn or closing the cover does not drop the retry state. Clear a draft when switching invitation context and ignore any stale result from the previous context. Keep gestures, text editing, and reduced-motion behavior working on phones.
5. **Rollout**. Develop with Vite proxying `/api/` to Django and the local admin on Django's port. For the assumed deployment, serve the Vite build and Django admin static files on one HTTPS origin. Use a persistent DB and private storage, a dedicated upload temp directory, and an upload route configured without an Nginx body-size cap. Keep proxy spooling on to shield Django workers from slow clients and provision disk for proxy spool, Django temp files, and saved originals. Bound simultaneous uploads at the edge and enforce the per-RSVP count limits. Verify timeouts, capacity, and private access before distributing links. Back up SQLite and private media together and monitor disk and upload errors without logging personal data. See [Nginx request-body settings](https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size), [Nginx request buffering](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_request_buffering), and [Gunicorn settings](https://gunicorn.org/reference/settings/).

## Verification

- Exercise general and personalized accept/decline, plus-one enforcement, stale or replaced links, and an admin correction. Assert that a guest cannot overwrite a saved personalized response.
- Cover duplicate and concurrent submissions, lost acknowledgement, invalid file, failed private write, removal after commit, and access denial to files and reports without RSVP permissions. Use an on-disk SQLite test database for threaded transaction cases.
- Check the five-row report example and filtered totals from the specification. Run the browser and host checks in the [quickstart](quickstart.md), including mobile scrolling, keyboard and reduced-motion interaction, the approved visual baseline, and large/many-file uploads.
