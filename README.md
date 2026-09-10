# Freznel AI Model Index

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and add the Firebase Web App values from the Firebase console. Enable Google sign-in in Firebase Authentication. Without Firebase values, the UI remains usable with a local demo sign-in and cached sample data so the search and offline flows can be reviewed.

The default model endpoint is the supplied Binaire assessment dataset at `https://binaire.app/hf-models-api.json`. Set `VITE_MODELS_API_URL` to another hosted endpoint when needed. The repository accepts both this `{ models: [...] }` format and the native Hugging Face array format.

## Implementation notes

- `ModelRepository` and `AuthService` encapsulate API/auth behavior with classes. `ModelCatalog` owns filtering and sorting rules.
- Search uses a 380ms debounce and `AbortController`, so stale API requests do not replace newer results.
- Fetching uses promise chains rather than `async`/`await`. Successful responses are stored in `localStorage`; failures fall back to the last complete cache or bundled sample records.
- For a large JSON endpoint, the repository should receive paginated results (the API request is limited to 100). A response is parsed and cached only after `response.json()` completes successfully, so a failed or interrupted response never replaces the last complete cache. For very large files, the same contract can be moved to a streaming worker with a temporary cache key and an atomic final rename.
