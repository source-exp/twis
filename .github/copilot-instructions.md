# twis repository context

## Project

twis is a small React + Vite social-feed prototype with a deliberately compact Windows XP/Winamp-inspired interface.

## Development

- Run `npm run dev` for local development.
- Run `npm run build` to create the production bundle in `dist/`.
- The Docker image uses the production build and serves it with nginx.

## Architecture

- `src/main.jsx` contains the UI and client-side event handlers.
- `src/db.js` contains the localStorage browser database.
- `src/auth.js` contains Web Crypto PBKDF2 hashing and validation.
- `src/styles.css` contains the visual system. Preserve the sharp XP chrome, blue palette, and readable contrast.

## Important boundaries

This is a browser-only prototype, not a production authentication system. Do not describe localStorage sessions or hashes as server security. Production authentication and authorization must move to a backend with secure cookies, server-side validation, rate limiting, and a real password-hashing strategy.

Keep changes focused and run the build after changes.
