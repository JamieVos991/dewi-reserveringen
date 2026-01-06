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

// HTML elementen
const container = document.getElementById("reservationsContainer");
const logoutBtn = document.getElementById("logoutBtn");
const studioFilter = document.getElementById("studioFilter");

// Pagination config
const ITEMS_PER_PAGE = 10;
let currentPage = 1;

// Data opslag
let allReservations = [];
let filteredReservations = [];

/* =========================
   AUTH CHECK
========================= */
onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "../pages/login.html";
    return;
  }
  loadReservations();
});

/* =========================
   LOGOUT
========================= */
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  location.href = "../pages/login.html";
});

/* =========================
   LOAD RESERVATIONS
========================= */
async function loadReservations() {
  const q = query(
    collection(db, "reservations"),
    orderBy("datum", "asc")
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    container.innerHTML = "<p>Geen info.</p>";
    return;
  }

  allReservations = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  filteredReservations = allReservations;
  currentPage = 1;

  populateStudioFilter(allReservations);
  render();
}

/* =========================
   MAIN RENDER
========================= */
function render() {
  renderReservations();
  renderPagination();
}

/* =========================
   RENDER RESERVATIONS
========================= */
function renderReservations() {
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = filteredReservations.slice(start, end);

  if (!pageItems.length) {
    container.innerHTML = "<p>Geen resultaten.</p>";
    return;
  }

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
          <path fill-rule="evenodd" clip-rule="evenodd"
            d="M17 5V4C17 2.89543 16.1046 2 15 2H9C7.89543 2 7 2.89543 7 4V5H4C3.44772 5 3 5.44772 3 6C3 6.55228 3.44772 7 4 7H5V18C5 19.6569 6.34315 21 8 21H16C17.6569 21 19 19.6569 19 18V7H20C20.5523 7 21 6.55228 21 6C21 5.44772 20.5523 5 20 5H17Z"
            fill="currentColor" />
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

/* =========================
   PAGINATION
========================= */
function renderPagination() {
  let pagination = document.getElementById("pagination");

  if (!pagination) {
    pagination = document.createElement("div");
    pagination.id = "pagination";
    container.after(pagination);
  }

  const totalPages = Math.ceil(filteredReservations.length / ITEMS_PER_PAGE);

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

  pagination.onclick = e => {
    if (!e.target.dataset.page) return;

    if (e.target.dataset.page === "prev") currentPage--;
    else if (e.target.dataset.page === "next") currentPage++;
    else currentPage = Number(e.target.dataset.page);

    render();
  };
}

/* =========================
   STUDIO FILTER
========================= */
function populateStudioFilter(reservations) {
  const studios = [...new Set(reservations.map(r => r.studio))];

  studioFilter.innerHTML = `
    <option value="all">Alle studio’s</option>
    ${studios.map(s => `<option value="${s}">${s}</option>`).join("")}
  `;
}

studioFilter.addEventListener("change", () => {
  const value = studioFilter.value;

  filteredReservations =
    value === "all"
      ? allReservations
      : allReservations.filter(r => r.studio === value);

  currentPage = 1;
  render();
});


container.addEventListener("click", async e => {
  const btn = e.target.closest(".deleteBtn");
  if (!btn) return;

  if (!confirm("Weet je zeker?")) return;

  await deleteDoc(doc(db, "reservations", btn.dataset.id));

  await loadReservations();
});
