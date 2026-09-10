# Daily Reset — App A

App A turns a short brain dump plus current energy and mood into a realistic daily plan. It separates flexible work from fixed commitments, preserves non-action notes in Inbox, and offers user-approved next steps from a focused long-term Vision.

## Local development

Requirements: Node.js and pnpm.

1. Run `pnpm install --frozen-lockfile`.
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`.
3. Run `pnpm run dev`.
4. Open `http://localhost:3000/?app=a`.

Before deployment, run:

```sh
pnpm run lint
pnpm run build
```

## Firebase App Hosting preflight

Before the first production deployment:

1. Create the `GEMINI_API_KEY` secret in the Firebase/Google Cloud project used by App Hosting. Never expose it as a `VITE_` variable.
2. Deploy `firestore.rules` to the same Firebase project.
3. Enable Google as a Firebase Authentication provider.
4. Add the final App Hosting domain to Firebase Authentication **Authorized domains**.
5. Confirm App Hosting uses `apphosting.yaml`. The platform supplies `PORT`; the server binds it on `0.0.0.0`.

`APP_A_AI_DAILY_LIMIT` is a server-wide daily safety limit. Each signed-in user is also limited to 15 App A AI requests per rolling 10-minute window.

## Production smoke test

After deployment, test with a real signed-in account at desktop and mobile widths:

- create and save a Daily Reset plan;
- confirm energy and mood are required and included in planning;
- add a fixed commitment and confirm flexible capacity does not reject it;
- add an Inbox task to Today and clarify a non-action note;
- create two Visions, choose one focus, and confirm Today prioritizes it;
- confirm another Vision appears only occasionally as a closed optional suggestion;
- complete a Vision-derived task and verify progression without duplicates;
- run each reset session with sound on/off, pause, resume, restart, and stop;
- reload and confirm Today, Inbox, Vision, and Progress remain synchronized.

A successful build is not production approval by itself. Secrets, Auth domains, Firestore rules, and signed-in flows require verification in the deployed environment.
