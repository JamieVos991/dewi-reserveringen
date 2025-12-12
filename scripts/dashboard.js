import { auth, db } from "../firebase/firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.2.0/firebase-auth.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.2.0/firebase-firestore.js";

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

    if (snapshot.empty) {
      document.body.insertAdjacentHTML("beforeend", "<p>No reservations yet.</p>");
      return;
    }

    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";

    table.innerHTML = `
      <thead>
        <tr>
          <th style="border:1px solid #ccc;padding:5px">Email</th>
          <th style="border:1px solid #ccc;padding:5px">Name</th>
          <th style="border:1px solid #ccc;padding:5px">Studio</th>
          <th style="border:1px solid #ccc;padding:5px">Date</th>
          <th style="border:1px solid #ccc;padding:5px">Start Time</th>
          <th style="border:1px solid #ccc;padding:5px">End Time</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    snapshot.forEach(doc => {
      const data = doc.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="border:1px solid #ccc;padding:5px">${data.email}</td>
        <td style="border:1px solid #ccc;padding:5px">${data.name}</td>
        <td style="border:1px solid #ccc;padding:5px">${data.studio}</td>
        <td style="border:1px solid #ccc;padding:5px">${data.date}</td>
        <td style="border:1px solid #ccc;padding:5px">${data.startTime}</td>
        <td style="border:1px solid #ccc;padding:5px">${data.endTime}</td>
      `;
      tbody.appendChild(row);
    });

    document.body.appendChild(table);

  } catch (err) {
    console.error("Error loading reservations:", err);
    document.body.insertAdjacentHTML("beforeend", "<p>Failed to load reservations.</p>");
  }
}
