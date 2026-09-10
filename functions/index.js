const { onRequest } = require("firebase-functions/v2/https");

const MODEL_API_URL = "https://binaire.app/hf-models-api.json";

exports.models = onRequest(
  { cors: true, region: "us-central1" },
  (request, response) => {
    fetch(MODEL_API_URL)
      .then((result) => {
        if (!result.ok)
          throw new Error(`Upstream model API returned ${result.status}`);
        return result.text();
      })
      .then((body) => {
        response.set("Cache-Control", "public, max-age=300, s-maxage=900");
        response.type("application/json").status(200).send(body);
      })
      .catch((error) => {
        console.error("Model proxy failed", error);
        response.status(502).json({ error: "Model API unavailable" });
      });
  },
);
