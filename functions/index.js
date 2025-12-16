const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Firebase initialiseren
admin.initializeApp();
const db = admin.firestore();

// Configureer mailer (Gmail example)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "Jamievos100@gmail.com",        // je Gmail
    pass: "zvyt xryg bpgi rcdr"           // Gmail App Password
  }
});

// Reserveer functie
exports.reserve = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send({ success: false, message: "Method Not Allowed" });
  }

  const { email, name, studio, date, startTime, endTime } = req.body;

  if (!email || !name || !studio || !date || !startTime || !endTime) {
    return res.status(400).send({ success: false, message: "Missing required fields" });
  }

  try {
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

    // Verstuur bevestigingsmail naar gebruiker
    try {
      const info = await transporter.sendMail({
        from: `"Studio Reservations" <Jamievos100@gmail.com>`,
        to: email,
        subject: "Your reservation is confirmed ✅",
        html: `
          <h2>Reservation confirmed</h2>
          <p>Hi ${name},</p>
          <p>Your reservation has been confirmed:</p>
          <ul>
            <li><strong>Studio:</strong> ${studio}</li>
            <li><strong>Date:</strong> ${date}</li>
            <li><strong>Time:</strong> ${startTime} – ${endTime}</li>
          </ul>
          <p>See you soon!</p>
        `
      });
      console.log("Mail sent:", info.messageId);
    } catch(mailErr) {
      console.error("Mail error:", mailErr);
    }

    return res.send({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ success: false, message: "Server error" });
  }
});
