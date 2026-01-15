import { auth, db } from "../firebase/firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.2.0/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.2.0/firebase-firestore.js";

// UI elementen
const container = document.getElementById("reservationsContainer");
const logoutBtn = document.getElementById("logoutBtn");
const studioFilter = document.getElementById("studioFilter");

// Pagination 
const ITEMS_PER_PAGE = 10; // Aantal reserveringen per pagina
let currentPage = 1;

// States
let allReservations = [];      // De volledige lijst uit de database
let filteredReservations = []; // De lijst na de filter

// Deze listener kijkt of er een gebruiker is ingelogd
onAuthStateChanged(auth, user => {
  if (!user) {
    // Geen gebruiker? Stuur ze direct terug naar de login pagina
    location.href = "../pages/login.html";
    return;
  }
  // Wel een gebruiker? Start met het laden van de reserveringen
  loadReservations();
});

// Uitloggen
logoutBtn.addEventListener("click", async () => {
  await signOut(auth); // Meld af bij Firebase
  location.href = "../pages/login.html"; // Terug naar login
});

// Data laden
async function loadReservations() {
  // Bouw de query: haal alles uit 'reservations' gesorteerd op datum
  const q = query(
    collection(db, "reservations"),
    orderBy("datum", "asc")
  );

  const snap = await getDocs(q);

  // Als er geen reserveringen zijn, toon een melding
  if (snap.empty) {
    container.innerHTML = "<p>Geen info.</p>";
    return;
  }

  // Zet de Firestore documenten om naar een normale Javascript Array
  allReservations = snap.docs.map(d => ({
    id: d.id, // We bewaren de ID voor de delete function
    ...d.data()
  }));

  filteredReservations = allReservations;
  currentPage = 1;

  // Vul de filter dropdown met de beschikbare studio's uit de data
  populateStudioFilter(allReservations);
  render();
}

// Rendering
function render() {
  renderReservations();
  renderPagination();
}

// Toon de lijst met reserveringen voor de huidige pagina
function renderReservations() {
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  
  // Pak alleen de items voor de huidige pagina (bijv. 10 t/m 20)
  const pageItems = filteredReservations.slice(start, end);

  if (!pageItems.length) {
    container.innerHTML = "<p>Geen resultaten.</p>";
    return;
  }

  // Genereer HTML voor elk item
  container.innerHTML = pageItems.map(r => `
    <article>
      <section>
        <p>${r.email}</p>

        <svg
          data-id="${r.id}"
          class="deleteBtn"
          width="24"
          height="24"
          viewBox="0 0 24 24"
        >
          <path d="M17 5V4C17 2.89543 16.1046 2 15 2H9C7.89543 2 7 2.89543 7 4V5H4C3.44772 5 3 5.44772 3 6C3 6.55228 3.44772 7 4 7H5V18C5 19.6569 6.34315 21 8 21H16C17.6569 21 19 19.6569 19 18V7H20C20.5523 7 21 6.55228 21 6C21 5.44772 20.5523 5 20 5H17Z" fill="currentColor" />
          <path d="M9 9H11V17H9V9Z" fill="currentColor" />
          <path d="M13 9H15V17H13V9Z" fill="currentColor" />
        </svg>
      </section>

      <section>
        <p>${r.name}</p>
        <p>${r.studio}</p>
      </section>

      <section>
        <p>${r.startTijd} - ${r.eindTijd}</p>
        <p>${r.datum}</p>
      </section>
    </article>
  `).join("");
}

// Maak de paginerings buttons
function renderPagination() {
  let pagination = document.getElementById("pagination");

  // Maak de container aan als deze nog niet bestaat
  if (!pagination) {
    pagination = document.createElement("div");
    pagination.id = "pagination";
    container.after(pagination);
  }

  const totalPages = Math.ceil(filteredReservations.length / ITEMS_PER_PAGE);

  // Verberg paginering als er maar 1 pagina is
  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = `
    <button ${currentPage === 1 ? "disabled" : ""} data-page="prev">‹</button>

    ${Array.from({ length: totalPages }, (_, i) => `
      <button
        class="${currentPage === i + 1 ? "active" : ""}"
        data-page="${i + 1}"
      >
        ${i + 1}
      </button>
    `).join("")}

    <button ${currentPage === totalPages ? "disabled" : ""} data-page="next">›</button>
  `;

  // Event delegation voor de knoppen
  pagination.onclick = e => {
    if (!e.target.dataset.page) return;

    if (e.target.dataset.page === "prev") currentPage--;
    else if (e.target.dataset.page === "next") currentPage++;
    else currentPage = Number(e.target.dataset.page);

    render();
  };
}

// Zoek unieke studio namen op om de dropdown te vullen
function populateStudioFilter(reservations) {
  const studios = [...new Set(reservations.map(r => r.studio))];

  studioFilter.innerHTML = `
    <option value="all">Alle studio’s</option>
    ${studios.map(s => `<option value="${s}">${s}</option>`).join("")}
  `;
}

// Luister naar de filter
studioFilter.addEventListener("change", () => {
  const value = studioFilter.value;

  // Filter de data array op basis van de studio keuze
  filteredReservations =
    value === "all"
      ? allReservations
      : allReservations.filter(r => r.studio === value);

  currentPage = 1; // Reset naar pagina 1 na filteren
  render();
});

// Gebruik Event Delegation op de container voor de verwijder knoppen
container.addEventListener("click", async e => {
  const btn = e.target.closest(".deleteBtn");
  if (!btn) return;

  // Altijd bevestiging vragen voor verwijderen
  if (!confirm("Weet je zeker dat je deze reservering wilt verwijderen?")) return;

  try {
    // Verwijder het document uit Firestore via de ID
    await deleteDoc(doc(db, "reservations", btn.dataset.id));
    
    // Ververs de lijst na verwijderen
    await loadReservations();
  } catch (error) {
    alert("Kon niet verwijderen. Controleer je rechten.");
  }
});