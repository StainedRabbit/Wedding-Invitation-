# Our Next Chapter

A mobile-first wedding invitation for Angelyn B. Sayno and Kevin-Ezer F. Tanierla. The React frontend runs on its own. RSVP entries exist only in component memory and are discarded when the book closes.

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

From the workspace root in another PowerShell terminal, with Python 3.13 and `mkvirtualenv` installed, create the environment once:

```powershell
$env:WORKON_HOME = (Get-Location).Path
mkvirtualenv -r "$PWD\backend\requirements.txt" .venv
```

In PowerShell, activate the environment and run Django from the backend directory:

```powershell
.\.venv\Scripts\Activate.ps1
cd backend
py manage.py migrate
py manage.py runserver
```

Repeat the activation and `cd backend` in each new terminal. Run `deactivate` when finished.

The root URL returns a plain-text development status. To create the administrator account, stop the server and run `py manage.py createsuperuser` from `backend`. Start the server again and open http://localhost:8000/admin/. The SQLite database is stored locally in `backend/db.sqlite3`. RSVP management is planned and has not yet been implemented.

## Implementation

- `frontend/src/Book.tsx` assembles the cover and decodes mounted images before replacing the initial composite.
- `frontend/src/portrait.json` records the production layers’ trimmed geometry from `Assets/asset-manifest.csv`. `art.tsx` registers them on one portrait canvas.
- `frontend/src/motion.css` controls the ribbon release and cover turn. `reader.css` lays out the pages and animates the invitation unfolding and zooming into view.
- `frontend/src/main.tsx` manages the cover and opening fallback. `Reader.tsx` contains the four chapters, sample content, and navigation. `Rsvp.tsx` contains the inline preview form.
- `frontend/public/art` contains the optimized artwork used by the app. The original pack and its review material are in `Assets`.
- `review` contains phone-size screenshots from the running frontend.

Clicking the book cover plays the opening animation. With reduced motion enabled, choose **Open with animation** to play the opening and page turns for this reading session, or **Open without animation** to open and change pages immediately. A failed motion image or a wait longer than 1.6 seconds after activation also opens the page directly. The animation uses the supplied flat ribbon cutouts and reconstructed inner board.

The invitation fills the screen when the book opens. Scroll, swipe vertically, click a page edge, or press the left and right arrow keys to turn pages. Going back from the invitation closes the book. The invitation’s chapter buttons jump directly to Our Story, Wedding Details, or RSVP.
