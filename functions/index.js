const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

// Firebase initialiseren
admin.initializeApp();
const db = admin.firestore();

// Reserveer functie
exports.reserve = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send({
      success: false,
      message: "Method Not Allowed",
    });
  }

  const recaptchaToken = req.body.recaptchaToken;
  const email = req.body.email;
  const name = req.body.name;
  const studio = req.body.studio;
  const date = req.body.date;
  const startTime = req.body.startTime;
  const endTime = req.body.endTime;

  if (!recaptchaToken) {
    return res.status(400).send({
      success: false,
      message: "No reCAPTCHA token provided",
    });
  }

  try {
    // reCAPTCHA verifiëren
    const googleRes = await fetch(
      "https://www.google.com/recaptcha/api/siteverify" +
        "?secret=6LeucygsAAAAAC5G97lilkpwB_6_jA_-b0dGpqHc" +
        `&response=${recaptchaToken}`,
      { method: "POST" }
    );

    const data = await googleRes.json();

    console.log("Token:", recaptchaToken);
    console.log("Verification response:", data);

    if (!data.success || data.score < 0.5) {
      return res.status(400).send({
        success: false,
        message: "reCAPTCHA verification failed",
      });
    }

    // Opslaan in Firestore
    await db.collection("reservations").add({
      email,
      name,
      studio,
      date,
      startTime,
      endTime,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.send({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).send({
      success: false,
      message: "Server error",
    });
  }
});
