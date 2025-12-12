import { auth, db } from "../firebase/firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.2.0/firebase-auth.js";
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.2.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn = document.getElementById("logoutBtn");

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "../pages/login.html";
    } else {
      console.log("User logged in:", user.email);
      await loadReservations(); 
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "../pages/login.html";
  });
});

async function loadReservations() {
  try {
    const q = query(collection(db, "reservations"), orderBy("date", "asc"));
    const snapshot = await getDocs(q);

    document.body.innerHTML = ""; // Clear previous table

    if (snapshot.empty) {
      document.body.insertAdjacentHTML("beforeend", "<p>geen info.</p>");
      return;
    }

    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";

    table.innerHTML = `
      <thead>
        <tr>
          <th style="border:1px solid #ccc;padding:5px">Email</th>
          <th style="border:1px solid #ccc;padding:5px">Naam</th>
          <th style="border:1px solid #ccc;padding:5px">Studio</th>
          <th style="border:1px solid #ccc;padding:5px">Datum</th>
          <th style="border:1px solid #ccc;padding:5px">Start tijd</th>
          <th style="border:1px solid #ccc;padding:5px">Eind tijd</th>
          <th style="border:1px solid #ccc;padding:5px">Actie</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const row = document.createElement("tr");

      row.innerHTML = `
        <td style="border:1px solid #ccc;padding:5px">${data.email}</td>
        <td style="border:1px solid #ccc;padding:5px">${data.name}</td>
        <td style="border:1px solid #ccc;padding:5px">${data.studio}</td>
        <td style="border:1px solid #ccc;padding:5px">${data.date}</td>
        <td style="border:1px solid #ccc;padding:5px">${data.startTime}</td>
        <td style="border:1px solid #ccc;padding:5px">${data.endTime}</td>
        <td style="border:1px solid #ccc;padding:5px">
          <button data-id="${docSnap.id}" class="deleteBtn" style="padding:4px 8px;cursor:pointer">
            Delete
          </button>
        </td>
      `;

      tbody.appendChild(row);
    });

    document.body.appendChild(table);

    // Add delete button listeners
    document.querySelectorAll(".deleteBtn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");

        if (!confirm("Weet je zeker dat je deze reservering wilt verwijderen?")) return;

        await deleteDoc(doc(db, "reservations", id));
        alert("Reservering verwijderd!");
        loadReservations(); // reload table
      });
    });

  } catch (err) {
    console.error("Error loading reservations:", err);
    document.body.insertAdjacentHTML("beforeend", "<p>Failed to load reservations.</p>");
  }
}
