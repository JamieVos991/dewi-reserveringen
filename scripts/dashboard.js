// Firebase auth en database instanties importeren
import { auth, db } from "../firebase/firebase.js";

// Firebase authentication functies importeren
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.2.0/firebase-auth.js";

// Firestore functies importeren
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.2.0/firebase-firestore.js";

// HTML elementen ophalen
const container = document.getElementById("reservationsContainer");
const logoutBtn = document.getElementById("logoutBtn");

// Controleren of er een gebruiker is ingelogd
onAuthStateChanged(auth, user => {
  // Als er geen gebruiker is, doorsturen naar login pagina
  if (!user) return location.href = "../pages/login.html";

  // Als gebruiker wel is ingelogd, reserveringen laden
  loadReservations();
});

// Logout knop
logoutBtn.addEventListener("click", async () => {
  // Gebruiker uitloggen
  await signOut(auth);

  // Terug naar login pagina
  location.href = "../pages/login.html";
});

// Functie om reserveringen uit Firestore te halen en te tonen
async function loadReservations() {
  // Query maken: haal alle reserveringen op, gesorteerd op datum
  const q = query(
    collection(db, "reservations"),
    orderBy("datum", "asc")
  );

  // Query uitvoeren
  const snap = await getDocs(q);

  // Als er geen reserveringen zijn
  if (snap.empty) {
    container.innerHTML = "<p>Geen info.</p>";
    return;
  }

  // HTML tabel genereren met reserveringen
  container.innerHTML = `
        ${snap.docs.map(d => {
          // Data van één reservering ophalen
          const r = d.data();

          // table row voor elke reservering teruggeven
          return `
    <article>
            <section>
              <p>${r.email}</p>
               <button data-id="${d.id}" class="deleteBtn">
                  Verwijder
                </button>
              </section>
              <section>
                <p>
                  ${r.name}
                </p>
                <p>
                   ${r.studio}
                </p>
              </section>
              <section>
                <p>
                  ${r.startTijd}
                  -
                  ${r.eindTijd}
                </p>
                <p>${r.datum}</p>
              </section>
            </section>
        </article>

          `;
        }).join("")}
  `;

  // Click handler voor de hele container 
  container.onclick = async e => {
    // Alleen reageren als er op een delete knop is geklikt
    if (!e.target.classList.contains("deleteBtn")) return;

    // Bevestiging vragen
    if (!confirm("Weet je zeker?")) return;

    // Reservering verwijderen uit Firestore
    await deleteDoc(
      doc(db, "reservations", e.target.dataset.id)
    );

    // Lijst opnieuw laden na verwijderen
    loadReservations();
  };
}
