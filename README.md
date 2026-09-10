# Freznel AI Model Selection Utility

React and TypeScript model browser for the Binaire AI assessment. It loads the hosted model dataset, lets users search and compare models, and supports filtering, sorting, Firebase authentication, animations, and cached offline use.

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. To create a production build:

```bash
npm run build
npm run preview
```

The production proxy is implemented in `functions/index.js`. Install its dependencies before deployment:

```bash
cd functions
npm install
cd ..
```

## Environment setup

Copy `.env.example` to `.env` and add the Firebase Web App configuration from Firebase Console > Project settings > Your apps:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

In Firebase Authentication, enable both **Email/Password** and **Google** providers. Add `localhost`, `127.0.0.1`, and the deployed hostname under Authentication > Settings > Authorized domains. Restart Vite after changing `.env`.

Do not commit `.env`. The repository ignores it; `.env.example` contains placeholders only.

## API and CORS

The source dataset is:

`https://binaire.app/hf-models-api.json`

The browser requests `/api/models`. During local development, [vite.config.ts](vite.config.ts) proxies that path to the Binaire endpoint because the endpoint does not provide browser CORS headers. For production, [firebase.json](firebase.json) rewrites `/api/models` to the `models` Firebase Function in [functions/index.js](functions/index.js). The function fetches the upstream data server-side, adds CORS and cache headers, and returns a 502 response if the upstream is unavailable.

## Implemented functionality

| Requirement                                        | Status                               | Implementation                                                                                                                                                          |
| -------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API model listing                                  | Complete                             | `ModelRepository` fetches and normalizes the Binaire `{ models: [...] }` payload and array payloads.                                                                    |
| Model name search                                  | Complete                             | Case-insensitive substring search across display name and model ID.                                                                                                     |
| Model family search                                | Complete                             | Case-insensitive substring search across the family field.                                                                                                              |
| Debouncing                                         | Complete                             | Search waits 380 ms before refreshing.                                                                                                                                  |
| Throttling                                         | Complete                             | Refreshes are limited to one request per 500 ms after debounce.                                                                                                         |
| Pipeline, family, architecture, and weight filters | Complete                             | Spectrum picker controls are driven by values in the loaded dataset.                                                                                                    |
| Safetensor range                                   | Complete                             | Numeric minimum and maximum controls; unknown `TBD` counts remain visible.                                                                                              |
| Model name sorting                                 | Complete                             | A-Z and Z-A.                                                                                                                                                            |
| Safetensor sorting                                 | Complete                             | Low-high and high-low; `TBD` values sort after numeric counts.                                                                                                          |
| Model selection                                    | Complete                             | Models can be selected and removed from selection.                                                                                                                      |
| Model comparison                                   | Complete                             | Selected models render in a comparison panel.                                                                                                                           |
| Firebase authentication                            | Complete                             | Firebase email/password sign-up, email/password sign-in, Google sign-in, and sign-out. No fake demo account is created.                                                 |
| Animations                                         | Complete                             | Model-card entrance transitions, filter-panel transitions, loading pulse, hover states, and comparison-panel entrance animation.                                        |
| Online/offline status                              | Complete                             | Browser connectivity events update the status indicator.                                                                                                                |
| Cached model data                                  | Complete after first successful sync | LocalStorage and a service worker preserve the last complete dataset for offline use. First-run offline use shows bundled fallback records until an online sync occurs. |
| Promise-based background fetch                     | Complete                             | Fetching uses Promise chains and `AbortController`, not `async`/`await`.                                                                                                |
| Adobe Spectrum                                     | Complete for interactive controls    | Spectrum Provider, Dialog, Button, TextField, SearchField, NumberField, ProgressCircle, and Picker are used.                                                            |

## Architecture

- `ModelRepository` owns API requests, normalization, aborting stale requests, cache reads, and cache writes.
- `ModelCatalog` owns search, filter, and sorting rules.
- `AuthService` owns Firebase initialization, authentication methods, and Firebase error messages.
- React state in `App` coordinates the UI and browser online/offline events.

The implementation uses classes for the functional domain logic as requested.

## Fetching and large JSON safety

The fetch flow uses Promise chains:

1. Wait for the debounce and throttle window.
2. Abort the previous request when a newer request begins.
3. Validate the HTTP response.
4. Parse the complete JSON response.
5. Normalize all records.
6. Serialize the complete normalized dataset.
7. Write it to a temporary cache key before replacing the last complete cache.

If fetching, parsing, normalization, or caching fails, the previous valid cache is retained and the UI falls back to bundled sample models when necessary. For substantially larger datasets, the next production improvement would be a Web Worker with streaming parsing and paginated API responses; the current assessment dataset is small enough for complete-response parsing.

## Offline behavior

The service worker caches the application shell and successful `/api/models` responses. For full cached API access, open the app once while online and allow the initial model request to complete. If the app has never been loaded online, it can only show the bundled fallback records while offline.

## Firebase deployment

Firebase authentication is configured through the Web App environment variables. Firebase Hosting and the model proxy are configured in [firebase.json](firebase.json). Select the correct Firebase project, build the frontend, install function dependencies, and deploy:

```bash
firebase login
firebase use binaire-freznelai
npm run build
cd functions
npm install
cd ..
firebase deploy --only functions,hosting
```

The Functions deployment may require the Firebase Blaze billing plan. The Hosting rewrite sends `/api/models` to the deployed `models` function, so the production frontend does not call the CORS-blocked Binaire endpoint directly.

## Validation

```bash
npm run build
```

The build runs TypeScript checking and the Vite production build. Adobe Spectrum currently produces a bundle-size warning above 500 kB; it does not fail the build.
