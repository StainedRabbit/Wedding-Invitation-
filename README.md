# Our Next Chapter

A mobile-first wedding invitation for Angelyn B. Sayno and Kevin-Ezer F. Tanierla. RSVP responses are stored by Django. Photo and video uploads are stored separately in a private local directory.

## Run the invitation

From the workspace root in PowerShell, with Node.js 24 and npm installed:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev -- --host 0.0.0.0 --port 5173
```

Open the Local address printed by Vite. On a phone connected to the same trusted Wi-Fi, open the Network address for the computer’s Wi-Fi adapter. If Vite lists several addresses, match one with the Wi-Fi IPv4 address in `ipconfig`. If Windows Firewall prompts, select the trusted Private network. Use Ctrl+C in the server terminal to stop sharing.

To check types and create the standalone frontend bundle, run `npm.cmd run build` from `frontend`. The output is in `frontend/dist`.

## Run Django separately

Use the `wedding` virtual environment as the main Python environment. From the workspace root in another PowerShell terminal, activate it and install the project dependencies:

```powershell
& "$env:USERPROFILE\Envs\wedding\Scripts\Activate.ps1"
python -m pip install -r backend\requirements.txt
```

Then run Django from the backend directory:

```powershell
cd backend
python manage.py migrate
python manage.py runserver
```

In each new terminal, activate `wedding` and change to the `backend` directory. Run `deactivate` when finished.

The root URL returns a plain-text development status. To create an administrator account, stop the server and run `py manage.py createsuperuser` from `backend`. Start the server again and open http://localhost:8000/admin/.

This computer uses the PostgreSQL database `our_next_chapter` on localhost. Its dedicated login is configured in `backend/.postgres-credentials.json`, and `backend/.use-postgres` selects it. Both files are ignored by Git; keep the credentials file private and back it up securely. PostgreSQL must be running when Django starts.

On another computer, set `RSVP_DATABASE=postgres` and configure `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGHOST`, and `PGPORT`, or supply a PostgreSQL password file. Without the local marker or PostgreSQL setting, the project uses SQLite. The previous local SQLite file remains at `backend/db.sqlite3` as a backup of the data before the switch; changes made after the switch are stored in PostgreSQL.

## Railway deployment

The root Dockerfile builds the frontend and serves it with Django. The Railway web service requires a PostgreSQL service with `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGHOST`, and `PGPORT` supplied as service variables, a unique `DJANGO_SECRET_KEY`, and a Railway public domain. Attach a persistent volume to the web service before starting it; guest uploads are stored under that volume. The container runs Django migrations on startup and listens on Railway's `PORT`. Configure backups for both PostgreSQL and the upload volume.

The Railway package excludes local database files, credentials, and uploads. It does not copy existing local records automatically. Transfer and verify any records and uploaded files separately before using a production service.

## Implementation

- `frontend/src/Book.tsx` assembles the cover and decodes mounted images before replacing the initial composite.
- `frontend/src/portrait.json` records the production layers’ trimmed geometry from `Assets/asset-manifest.csv`. `art.tsx` registers them on one portrait canvas.
- `frontend/src/motion.css` controls the ribbon release and cover turn. `reader.css` lays out the pages and animates the invitation unfolding and zooming into view.
- `frontend/src/main.tsx` manages the cover and opening fallback. `Reader.tsx` contains the invitation chapters, sample content, and navigation. `Rsvp.tsx` contains the inline preview form.
- `frontend/public/art` contains the optimized artwork used by the app. The original pack and its review material are in `Assets`.
- `review` contains phone-size screenshots from the running frontend.

Clicking the book cover plays the opening animation. With reduced motion enabled, choose **Open with animation** to play the opening and page turns for this reading session, or **Open without animation** to open and change pages immediately. A failed motion image or a wait longer than 1.6 seconds after activation also opens the page directly. The animation uses the supplied flat ribbon cutouts and reconstructed inner board.

The invitation fills the screen when the book opens. Scroll, swipe vertically, click a page edge, or press the left and right arrow keys to turn pages. Going back from the invitation closes the book. The invitation’s chapter buttons jump directly to Our Story, Wedding Details, or RSVP.
