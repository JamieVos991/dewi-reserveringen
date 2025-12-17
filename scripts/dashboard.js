// Firebase imports (auth + database)
import { auth, db } from "../firebase/firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.2.0/firebase-auth.js";
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.2.0/firebase-firestore.js";


// Wacht tot de pagina geladen is
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");

  // Check of gebruiker is ingelogd
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "../pages/login.html";
    } else {
      loadReservations();
    }
  });

  // Logout functionaliteit
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "../pages/login.html";
  });
});


// Laadt alle reserveringen uit Firestore
async function loadReservations() {
  try {
    const q = query(
      collection(db, "reservations"),
      orderBy("date", "asc")
    );

    const snapshot = await getDocs(q);
    const container = document.getElementById("reservationsContainer");

    // Alleen de container leegmaken
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = "<p>Geen info.</p>";
      return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Email</th>
          <th>Naam</th>
          <th>Studio</th>
          <th>Datum</th>
          <th>Start</th>
          <th>Eind</th>
          <th>Actie</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${data.email}</td>
        <td>${data.name}</td>
        <td>${data.studio}</td>
        <td>${data.date}</td>
        <td>${data.startTime}</td>
        <td>${data.endTime}</td>
        <td>
          <button class="deleteBtn" data-id="${docSnap.id}">
            Verwijder
          </button>
        </td>
      `;

      tbody.appendChild(row);
    });

    container.appendChild(table);

    document.querySelectorAll(".deleteBtn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;

        if (!confirm("Weet je zeker dat je deze reservering wilt verwijderen?")) return;

        await deleteDoc(doc(db, "reservations", id));
        loadReservations();
      });
    });

  } catch (error) {
    console.error("Error met reserveringen laden:", error);
  }
}

