import { db } from "../firebase/firebase.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.2.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  /* ================== CONFIG ================== */
  const MIN_UUR = 8;
  const MIN_MINUUT = 30;
  const MAX_UUR = 21;
  const MAX_MINUUT = 30;
  const STEP_MINUUT = 30;

  /* ================== STATE ================== */
  let studio = "";
  let datum = "";
  let startTijd = "";
  let eindTijd = "";
  let name = "";
  let email = "";
  let bookedRanges = [];

  /* ================== DOM ================== */
  const form = document.getElementById("reservationForm");
  const studioSelect = document.getElementById("studio");
  const datumInput = document.getElementById("datum");
  const startSelect = document.getElementById("startTijd");
  const eindSelect = document.getElementById("eindTijd");
  const naamInput = form.querySelector('input[name="name"]');
  const emailInput = form.querySelector('input[name="email"]');
  const globalLoader = document.getElementById("globalLoader");


  /* ================== HELPER ================== */
  function setLoading(isLoading) {
    globalLoader.classList.toggle("hidden", !isLoading);
    reserveerBtn.disabled = isLoading;
  }
  

  /* ================== INIT DATUM ================== */
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  datumInput.min = todayStr;
  datumInput.value = todayStr;
  datum = todayStr;

  naamInput.addEventListener("input", e => name = e.target.value.trim());
  emailInput.addEventListener("input", e => email = e.target.value.trim());

  studioSelect.addEventListener("change", e => {
    studio = e.target.value;
    refreshTimes();
  });

  datumInput.addEventListener("change", e => {
    datum = e.target.value;
    refreshTimes();
  });

  startSelect.addEventListener("change", e => {
    startTijd = e.target.value;
    populateEndTimes();
  });

  eindSelect.addEventListener("change", e => {
    eindTijd = e.target.value;
  });

  /* ================== TIME LOGIC ================== */
  function generateTimes() {
    const times = [];
    for (let h = MIN_UUR; h <= MAX_UUR; h++) {
      for (let m = 0; m < 60; m += STEP_MINUUT) {
        if (h === MIN_UUR && m < MIN_MINUUT) continue;
        if (h === MAX_UUR && m > MAX_MINUUT) continue;
        times.push({
          hour: h,
          minute: m,
          str: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        });
      }
    }
    return times;
  }

  function rangesOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
  }

  async function fetchBookedTimes() {
    if (!studio || !datum) return;
    bookedRanges = [];

    const q = query(
      collection(db, "reservations"),
      where("studio", "==", studio),
      where("datum", "==", datum)
    );

    const snapshot = await getDocs(q);
    snapshot.forEach(doc => bookedRanges.push(doc.data()));
  }

  function populateStartTimes() {
    const allTimes = generateTimes();
    startSelect.innerHTML = `<option value="">Selecteer start tijd</option>`;
  
    const now = new Date();
    const isToday =
      datum === new Date().toISOString().split("T")[0];
  
    allTimes.forEach((t, i) => {
      if (i === allTimes.length - 1) return;
  
      let disabled = false;
      let label = t.str;
  
      // 🔒 Block past times if date === today
      if (isToday) {
        const timeDate = new Date(`${datum}T${t.str}`);
        if (timeDate <= now) {
          disabled = true;
        }
      }

      bookedRanges.forEach(r => {
        if (t.str >= r.startTijd && t.str < r.eindTijd) {
          disabled = true;
          label += " – Geboekt";
        }
      });
  
      const option = document.createElement("option");
      option.value = t.str;
      option.textContent = label;
      option.disabled = disabled;
      startSelect.appendChild(option);
    });
  }
  

  function populateEndTimes() {
    if (!startTijd) return;
  
    const allTimes = generateTimes();
    const startIndex = allTimes.findIndex(t => t.str === startTijd) + 1;
    eindSelect.innerHTML = `<option value="">Selecteer eind tijd</option>`;
  
    // find the first booking that starts AFTER the chosen start time
    const nextBooking = bookedRanges
      .filter(r => r.startTijd > startTijd)
      .sort((a, b) => a.startTijd.localeCompare(b.startTijd))[0];
  
    const maxEndTime = nextBooking ? nextBooking.startTijd : null;
  
    allTimes.slice(startIndex).forEach(t => {
      if (maxEndTime && t.str > maxEndTime) return;
  
      const option = document.createElement("option");
      option.value = t.str;
      option.textContent = t.str;
      eindSelect.appendChild(option);
    });
  }fp
  

  async function refreshTimes() {
    await fetchBookedTimes();
    populateStartTimes();
    startTijd = "";
    eindTijd = "";
    eindSelect.innerHTML = "";
  }

  /* ================== SUBMIT ================== */
  form.addEventListener("submit", async e => {
    e.preventDefault();
  
    if (!studio || !datum || !startTijd || !eindTijd || !name || !email) {
      stopLoadingAndAlert("Beantwoord alle inputs alstublieft.");
      return;
    }
  
    setLoading(true);
  
    try {
      await fetchBookedTimes();
  
      const conflict = bookedRanges.some(r =>
        rangesOverlap(startTijd, eindTijd, r.startTijd, r.eindTijd)
      );
  
      if (conflict) {
        stopLoadingAndAlert("Deze tijd overlapt met een bestaande reservatie.");
        return;
      }
  
      const response = await fetch(
        "https://us-central1-strakplan-e0953.cloudfunctions.net/reserve",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, studio, datum, startTijd, eindTijd })
        }
      );
  
      const data = await response.json();
  
      if (!data.success) {
        stopLoadingAndAlert("Reservatie mislukt.");
        return;
      }
  
      stopLoadingAndAlert(
        "Reservatie gelukt! Er is een bevestigingsmail gestuurd."
      );
  
      form.reset();
      refreshTimes();
  
    } catch (err) {
      console.error(err);
      stopLoadingAndAlert("Server fout. Probeer opnieuw.");
    } finally {
      setLoading(false);
      alert( "Reservatie gelukt! Er is een bevestigingsmail gestuurd.")
    }
  });
  

  refreshTimes();
});
