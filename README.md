# Freznel AI Model Index

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and add the Firebase Web App values from the Firebase console. Enable Google sign-in in Firebase Authentication and add `localhost` plus your deployed hostname under Authentication > Settings > Authorized domains. The UI does not create fake users when Firebase is missing or invalid; model search and cached sample data remain available.

The app requests models through the same-origin `/api/models` path. Vite proxies that path to the supplied Binaire assessment dataset at `https://binaire.app/hf-models-api.json` during local development, avoiding the dataset's browser CORS restriction. For production, deploy an equivalent server-side proxy or Firebase Function at `/api/models`; do not point the browser directly at the Binaire URL. Set `VITE_MODELS_API_URL` only when the deployment provides another CORS-enabled endpoint. The repository accepts both this `{ models: [...] }` format and the native Hugging Face array format.

## Implementation notes

- `ModelRepository` and `AuthService` encapsulate API/auth behavior with classes. `ModelCatalog` owns filtering and sorting rules.
- Search uses a 380ms debounce and `AbortController`, so stale API requests do not replace newer results.
- Fetching uses promise chains rather than `async`/`await`. Successful responses are stored in `localStorage` and cached by the service worker; failures fall back to the last complete cache or bundled sample records.
- Firebase email/password and Google sign-in/sign-up are exposed through the auth dialog. There is no fake demo account when Firebase is not configured.
- For a large JSON endpoint, the repository should receive paginated results (the API request is limited to 100). A response is parsed and cached only after `response.json()` completes successfully, so a failed or interrupted response never replaces the last complete cache. For very large files, the same contract can be moved to a streaming worker with a temporary cache key and an atomic final rename.
