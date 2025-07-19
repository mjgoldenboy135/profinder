const functions = require("firebase-functions");

const apiKey = functions.config().maps.key;

exports.testApiKey = functions.https.onRequest((req, res) => {
  res.send(`Google Maps API Key: ${apiKey}`);
});

