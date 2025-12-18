const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: true }); // allow all origins

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Configure Nodemailer (Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "Jamievos100@gmail.com", // your Gmail
    pass: "zvyt xryg bpgi rcdr"    // Gmail App Password
  }
});

// HTTPS Cloud Function with CORS and JSON parsing
exports.reserve = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send({ success: false, message: "Method Not Allowed" });
    }

    let body;
    try {
      body = req.body;
      if (!body || Object.keys(body).length === 0) {
        return res.status(400).send({ success: false, message: "Empty or invalid JSON body" });
      }
    } catch (err) {
      return res.status(400).send({ success: false, message: "Invalid JSON" });
    }

    
    const { email, name, studio, datum, startTijd, eindTijd } = body;

    if (!email || !name || !studio || !datum || !startTijd || !eindTijd) {
      return res.status(400).send({ success: false, message: "Missing required fields" });
    }

    try {
      // Save reservation in Firestore
      await db.collection("reservations").add({
        email,
        name,
        studio,
        datum,
        startTijd,
        eindTijd,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Send confirmation email
      const info = await transporter.sendMail({
        from: `"Studio Reservatie" <Jamievos100@gmail.com>`,
        to: email,
        subject: "Jouw reservatie is geboekt ✅",
        html: `
          <h2>Wij hebben jouw reservatie binnen gekregen.</h2>
          <p>Hi ${name},</p>
          <p>Wij hebben jouw reservatie binnen gekregen.:</p>
          <ul>
            <li><strong>Studio:</strong> ${studio}</li>
            <li><strong>Datum:</strong> ${datum}</li>
            <li><strong>Tijd:</strong> ${startTijd} – ${eindTijd}</li>
          </ul>
          <p>Tot snel!</p>
        `
      });


      return res.status(200).send({ success: true });

    } catch (err) {
      return res.status(500).send({ success: false, message: "Server error" });
    }
  });
});
