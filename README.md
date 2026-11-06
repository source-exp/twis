# twis

A small Twitter/X-inspired social feed built with React and Vite, styled like a compact Winamp/Windows XP desktop. It runs as a self-contained demo with a browser-backed local database.

## Features

- Registration and sign-in screens with session persistence
- PBKDF2/SHA-256 password hashing through the Web Crypto API
- User-created posts and profiles
- Create posts up to 280 characters, like, follow, and delete your own posts
- Profile editing with post, follower, and following stats
- Explore search and trending topics
- Persistent bookmarks plus demo messages and alerts views
- Winamp/Windows XP-inspired window chrome, toolbar, buttons, and status bar

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).
In development, the seeded Maya account is logged in automatically. Production builds always show the sign-in screen.

To create a production build:

```bash
npm run build
npm run preview
```

## Demo security boundary

This project has no server: `src/db.js` is a localStorage database and the active session is stored in the browser. Passwords are never stored as plaintext; new passwords are salted and hashed with PBKDF2 before storage, and React escapes rendered post content. This is appropriate for a local prototype only. For production, move users, sessions, posts, authorization, rate limiting, CSRF protection, and password hashing to a server (prefer Argon2id or bcrypt), use secure HttpOnly cookies, and validate every request server-side.

Register a new account to use the app.

## File structure

```text
twis/
├── index.html              # HTML entry point
├── Dockerfile              # Multi-stage production image
├── nginx.conf              # SPA fallback and static asset caching
├── package.json            # Scripts and dependencies
├── vite.config.js          # Vite + React configuration
├── README.md
└── src/
    ├── auth.js              # Password hashing and registration validation
    ├── db.js                # Seeded localStorage database and data operations
    ├── main.jsx             # Auth flow, app UI, and event handlers
    └── styles.css           # XP/Winamp-inspired responsive styles
```

## Docker deployment

Build and run the production image:

```bash
docker build -t twis .
docker run --rm -p 8080:80 twis
```

Open `http://localhost:8080`. For the requested local test workflow, use `npm run dev`; Docker verifies the production deployment path.

## Production deployment

The app is a static Vite build and is ready to deploy to Vercel:

```bash
npx vercel
```

Use the repository root as the project directory, keep the default build command (`npm run build`), and set the output directory to `dist`. The included `vercel.json` routes client-side navigation back to `index.html`. For a CI deployment, connect the repository in the Vercel dashboard and enable automatic deployments from the production branch.

The same `dist/` output can be served by any static host. Run `npm run build` locally and upload `dist`, or configure the host to use `npm run build` with `dist` as its publish directory.

## Next steps

For a production app, replace `src/db.js` with an API and real database, add server-side authorization and rate limits, and add real replies, media uploads, and email verification.
