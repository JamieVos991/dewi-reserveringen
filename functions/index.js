const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: true });

// Initialiseer Firebase Admin om toegang te krijgen tot Firestore
admin.initializeApp();
const db = admin.firestore();

// Definieer de geheimen voor Gmail (in te stellen via Firebase CLI)
const gmailUser = defineSecret("GMAIL_USER");
const gmailPass = defineSecret("GMAIL_PASS");

/**
 * FUNCTIE 1: De reservering opslaan en bevestigingsmail sturen
 */
exports.reserve = onRequest(
  {
    secrets: [gmailUser, gmailPass] 
  },
  async (req, res) => {
    cors(req, res, async () => {
      // Alleen POST verzoeken toestaan
      if (req.method !== "POST") {
        return res.status(405).send({ success: false, message: "Method Not Allowed" });
      }

      const { email, name, studio, datum, startTijd, eindTijd } = req.body;

      // Check of alle verplichte velden aanwezig zijn
      if (!email || !name || !studio || !datum || !startTijd || !eindTijd) {
        return res.status(400).send({ success: false, message: "Missing required fields" });
      }

      try {
        // Configuratie van de e-mail service
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: gmailUser.value(), // Gebruik de geheime waarde
            pass: gmailPass.value()
          }
        });

        // STAP 1: Sla de reservering op in Firestore
        // We slaan de referentie op in 'docRef' zodat we het unieke ID kunnen ophalen
        const docRef = await db.collection("reservations").add({
          email,
          name,
          studio,
          datum,
          startTijd,
          eindTijd,
          gemaaktOp: admin.firestore.FieldValue.serverTimestamp(),
        });

        // STAP 2: Genereer de unieke annuleer-link met het document-ID
        const cancelUrl = `https://us-central1-strakplan-e0953.cloudfunctions.net/cancelReservation?id=${docRef.id}`;

        // STAP 3: Verstuur de e-mail met de link
        await transporter.sendMail({
          from: `"Studio Reserveringen" <${gmailUser.value()}>`,
          to: email,
          subject: "Reservatie bevestigd ✅",
          html: `
            <div style="font-family: sans-serif; line-height: 1.6;">
              <h2>Reservatie bevestigd</h2>
              <p>Hi ${name},</p>
              <p>Wij hebben jouw reservatie voor <strong>${studio}</strong> ontvangen op <strong>${datum}</strong>.</p>
              <p>Tijdstip: ${startTijd} – ${eindTijd}</p>
              <hr>
              <p style="font-size: 0.9em; color: #666;">
                Wil je deze reservering annuleren? Klik op de onderstaande knop:
              </p>
              <a href="${cancelUrl}" style="color: #e74c3c;">
                Reservering annuleren
              </a>
              <br><br>
              <img src="cid:logo" alt="Artquake" style="max-width: 200px; height: auto;">
            </div>
          `,
          attachments: [{
            filename: "./Logo.png",
            path: "./Logo.png", // Zorg dat dit bestand in je functions map staat!
            cid: "logo"
          }]
        });

        return res.status(200).send({ success: true });
      } catch (err) {
        console.error("Fout bij reserveren:", err);
        return res.status(500).send({ success: false, message: "Server error" });
      }
    });
  }
);

/**
 * FUNCTIE 2: Reservering verwijderen via de e-mail link
 */
exports.cancelReservation = onRequest(async (req, res) => {
  cors(req, res, async () => {
    // Haal het ID uit de URL: ?id=XYZ123
    const reservationId = req.query.id;

    if (!reservationId) {
      return res.status(400).send("Geen reserverings-ID opgegeven.");
    }

    try {
      const docRef = db.collection("reservations").doc(reservationId);
      const doc = await docRef.get();

      // Controleer of de reservering überhaupt wel bestaat
      if (!doc.exists) {
        return res.status(404).send("Deze reservering is al geannuleerd of bestaat niet.");
      }

      // Verwijder het document uit de database
      await docRef.delete();

      // Toon een bevestiging in de browser van de gebruiker
      return res.send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 100px 20px;">
            <div style="max-width: 500px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; border-radius: 10px;">
              <h1 style="color: #2ecc71;">✓ Geannuleerd</h1>
              <p>Je reservering is succesvol verwijderd uit ons systeem.</p>
              <p>Je kunt dit venster nu sluiten.</p>
              <a href="https://jamievos991.github.io/dewi-reserveringen" style="color: #3498db; text-decoration: none;">Terug naar de website</a>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      console.error("Fout bij annuleren:", err);
      return res.status(500).send("Er is iets misgegaan bij het verwerken van de annulering.");
    }
  });
});