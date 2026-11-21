# Research: Wedding RSVP

## Web app and hosting

**Decision**: Keep React and Vite for the invitation and use Django's existing backend for the RSVP API and built-in admin. Proxy `/api/` through Vite in development. Use one HTTPS origin in production, with Nginx serving the Vite build and collected admin static files and proxying `/api/` and `/admin/` to Django. Plan for one Linux host with persistent storage. Keep the existing Windows and trusted LAN development workflow.

**Rationale**: One browser origin simplifies Django's cookie and CSRF flow and keeps the existing invitation entry point. The repository has no hosting configuration. Treat the Linux host as a deployment assumption, and verify host storage and upload behavior before sharing real links. [Vite proxy](https://vite.dev/config/server-options.html#server-proxy), [Django CSRF](https://docs.djangoproject.com/en/5.2/howto/csrf/), [Django deployment checklist](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/).

**Alternatives considered**: Hosting the frontend and API on separate origins adds cookie and CORS setup. Rendering the entire guest experience in Django would replace the working React book.

## Personalized links and retries

**Decision**: Send a random 32-byte invitation token in the URL fragment and pass it to Django in an API header. Use Django CSRF protection for writes. Give each draft an opaque random submission key. Persist the pending general key for the life of the browser tab, including reloads, and scope it to the general flow. Treat personalized submissions as create-once, with the unique invitation relationship and submission receipts enforcing duplicate protection.

**Rationale**: The initial request and access-log URL lack the fragment, and the site can operate without a new router. Django can distinguish a replay from a replacement attempt without exposing the earlier response. For trusted plain HTTP LAN testing, generate client entropy with `crypto.getRandomValues()`. [RFC 3986 fragments](https://www.rfc-editor.org/rfc/rfc3986#section-3.5), [Django CSRF](https://docs.djangoproject.com/en/5.2/howto/csrf/), [Web Crypto getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues).

**Alternatives considered**: Token URLs using paths or query strings put the token in request URLs. Matching general submissions by name would merge distinct guests. Guest accounts add a sign-in step outside the approved scope.

## Record consistency

**Decision**: Use SQLite on a persistent local disk for local development and the assumed single-host deployment. Use unique constraints for receipts and invitation-to-response relationships, and short `IMMEDIATE` write transactions for submission and admin changes. Prepare media before opening those transactions.

**Rationale**: The service is for one wedding. Serializing small metadata changes makes a final invitation and receipt recheck reliable without installing a separate database service. Reassess when deploying multiple app instances or if wedding traffic testing reveals SQLite lock contention. [Django SQLite transaction behavior](https://docs.djangoproject.com/en/5.2/ref/databases/#transactions-behavior), [Django atomic transactions](https://docs.djangoproject.com/en/5.2/topics/db/transactions/).

**Alternatives considered**: PostgreSQL and row locks are appropriate for concurrent multi-instance deployments. SQLite ignores `select_for_update()`, so this plan uses its transaction mode explicitly.

## Private media and large transfers

**Decision**: Upload repeated multipart fields with browser upload progress. Spool incoming files to disk using Django's temporary file handler. Disable the default multipart file-count cap and retain the bounds on non-file form metadata. Validate photo types with Pillow and pillow-heif, and MP4/MOV using FFprobe against the local staged file. Serve originals through authorized Django admin downloads with generated internal filenames and storage outside all public roots.

**Rationale**: The RSVP feature permits up to 15 photos and 3 videos with a 25 MiB limit per photo and 250 MiB per video. Disk-backed uploads avoid holding large files in memory. File contents and container information are more reliable than browser-supplied MIME and filenames. Completed private files become visible only when the response and attachment rows commit together. The host still has finite disk space, concurrency and time budgets. Check proxy buffering, request handling and temporary disk capacity, and show a safe retry or submit-without-files path when infrastructure interrupts a transfer. [Django upload handlers](https://docs.djangoproject.com/en/5.2/topics/http/file-uploads/#upload-handlers), [Django file-count setting](https://docs.djangoproject.com/en/5.2/ref/settings/#data-upload-max-number-files), [Pillow HEIF plugin](https://pillow-heif.readthedocs.io/en/latest/pillow-plugin.html), [FFprobe](https://ffmpeg.org/ffprobe.html), [FFmpeg MOV and MP4 demuxer](https://ffmpeg.org/ffmpeg-formats.html#mov_002fmp4_002f3gp), [Nginx request-body setting](https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size), [XMLHttpRequest upload progress](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload).

**Alternatives considered**: Public media URLs would bypass the admin permission boundary. Object storage with multipart uploads is an option for a future deployment that needs resumability or multiple instances. It would add an upload session protocol and a separate storage service to this first release.

## Admin report and guest design

**Decision**: Put the report and private downloads behind Django admin and check RSVP model permissions in addition to staff login. Compute report totals from the same filtered rows used for the table, before pagination. Extend the existing React reader and RSVP chapter, including the existing thank-you seal and reduced-motion handling.

**Rationale**: Existing admin access stays the operator entry point, and the report stays consistent with the saved responses. The guest can use the established book navigation and form controls even when the reply form takes more vertical space. [Django custom admin views](https://docs.djangoproject.com/en/5.2/ref/contrib/admin/#django.contrib.admin.ModelAdmin.get_urls), [Django FileResponse](https://docs.djangoproject.com/en/5.2/ref/request-response/#fileresponse-objects).

**Alternatives considered**: A separate custom admin portal would duplicate authentication and navigation. A new RSVP route and layout would change the user's approved design.
