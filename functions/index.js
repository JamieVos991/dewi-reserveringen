const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

const gmailUser = defineSecret("GMAIL_USER");
const gmailPass = defineSecret("GMAIL_PASS");

exports.reserve = onRequest(
  {
    secrets: [gmailUser, gmailPass] 
  },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).send({ success: false, message: "Method Not Allowed" });
      }

      const body = req.body;

      if (!body || Object.keys(body).length === 0) {
        return res.status(400).send({ success: false, message: "Empty request body" });
      }

      const { email, name, studio, datum, startTijd, eindTijd } = body;

      if (!email || !name || !studio || !datum || !startTijd || !eindTijd) {
        return res.status(400).send({ success: false, message: "Missing required fields" });
      }

      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
          }
        });

        await db.collection("reservations").add({
          email,
          name,
          studio,
          datum,
          startTijd,
          eindTijd,
          gemaaktOp: admin.firestore.FieldValue.serverTimestamp(),
        });

       await transporter.sendMail({
  from: `"Studio Reserveringen" <${process.env.GMAIL_USER}>`,
  to: email,
  subject: "Reservatie bevestigd ✅",
  html: `
    <h2>Reservatie bevestigd</h2>
    <p>Hi ${name},</p>
    <p>Wij hebben jouw reservatie binnen gekregen:</p>
    <ul>
      <li><strong>Studio:</strong> ${studio}</li>
      <li><strong>Datum:</strong> ${datum}</li>
      <li><strong>Tijd:</strong> ${startTijd} – ${eindTijd}</li>
    </ul>
    <p>Tot snel!</p>
    <img src="cid:artquake-img" alt="Artquake" style="max-width: 50%; height: auto;">
  `,
  attachments: [
    {
      filename: "artquake-img.png",
      path: "./artquake-img.png", // of volledige server path
      cid: "artquake-img"
    }
  ]
});


        return res.status(200).send({ success: true });
      } catch (err) {
        console.error("Error in de functie:", err);
        return res.status(500).send({ success: false, message: "Server error" });
      }
    });
  }
);
