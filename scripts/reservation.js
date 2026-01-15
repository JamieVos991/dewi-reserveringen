import { db } from "../firebase/firebase.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.2.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  const MIN_UUR = 8;
  const MIN_MINUUT = 30;
  const MAX_UUR = 21;
  const MAX_MINUUT = 30; // Absolute sluitingstijd
  const STEP_MINUUT = 30;
  const MIN_FORM_TIME = 3; 

  let studio = "";
  let datum = "";
  let startTijd = "";
  let eindTijd = "";
  let name = "";
  let email = "";
  let bookedRanges = [];
  let formLoadedAt = Date.now();

  const form = document.getElementById("reservationForm");
  const studioSelect = document.getElementById("studio");
  const datumInput = document.getElementById("datum");
  const startSelect = document.getElementById("startTijd");
  const eindSelect = document.getElementById("eindTijd");
  const durationFeedback = document.getElementById("durationFeedback");
  const naamInput = form.querySelector('input[name="name"]');
  const emailInput = form.querySelector('input[name="email"]');
  const honeypotInput = form.querySelector('input[name="company"]');
  const globalLoader = document.getElementById("globalLoader");
  const reserveerBtn = document.getElementById("reserveerBtn");

  function setLoading(isLoading) {
    globalLoader.classList.toggle("hidden", !isLoading);
    reserveerBtn.disabled = isLoading;
  }

  function stopLoadingAndAlert(message) {
    setLoading(false);
    alert(message);
  }

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
    eindTijd = ""; 
    populateEndTimes();
    updateDurationText();
  });

  eindSelect.addEventListener("change", e => {
    eindTijd = e.target.value;
    updateDurationText();
  });

  function calculateDuration(start, end) {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  }

  function updateDurationText() {
    if (startTijd && eindTijd) {
      const diff = calculateDuration(startTijd, eindTijd);
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      
      let text = "Je reserveert de studio voor ";
      if (hours > 0) text += `${hours} ${hours === 1 ? 'uur' : 'uur'} `;
      if (mins > 0) text += `${hours > 0 ? 'en ' : ''}${mins} minuten`;
      
      durationFeedback.textContent = text + ".";
    } else {
      durationFeedback.textContent = "";
    }
  }

  // Genereert alle mogelijke tijdstippen van 08:30 tot 21:30
  function generateTimes() {
    const times = [];
    for (let h = MIN_UUR; h <= MAX_UUR; h++) {
      for (let m = 0; m < 60; m += STEP_MINUUT) {
        if (h === MIN_UUR && m < MIN_MINUUT) continue;
        if (h === MAX_UUR && m > MAX_MINUUT) continue;
        times.push({
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
    // Voor de STARTTIJD halen we de allerlaatste optie (21:30) weg, 
    // want je kunt niet om 21:30 beginnen als je om 21:30 weg moet.
    const startOptions = allTimes.filter(t => t.str < "21:30");
    
    startSelect.innerHTML = `<option value="">Selecteer start tijd</option>`;

    const now = new Date();
    const isToday = datum === todayStr;

    startOptions.forEach((t) => {
      let disabled = false;
      let label = t.str;

      if (isToday) {
        const [h, m] = t.str.split(':').map(Number);
        const timeDate = new Date();
        timeDate.setHours(h, m, 0, 0);
        if (timeDate <= now) disabled = true;
      }

      bookedRanges.forEach(r => {
        // Blokkeer als de tijd in een bestaande boeking valt
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
    if (!startTijd) {
        eindSelect.innerHTML = `<option value="">Selecteer eind tijd</option>`;
        return;
    }

    const allTimes = generateTimes();
    // De eindtijd moet altijd later zijn dan de starttijd
    const startIndex = allTimes.findIndex(t => t.str === startTijd) + 1;
    eindSelect.innerHTML = `<option value="">Selecteer eind tijd</option>`;

    // Zoek de eerstvolgende boeking na de gekozen starttijd
    const nextBooking = bookedRanges
      .filter(r => r.startTijd > startTijd)
      .sort((a, b) => a.startTijd.localeCompare(b.startTijd))[0];

    const maxEndTime = nextBooking ? nextBooking.startTijd : "21:30";

    allTimes.slice(startIndex).forEach(t => {
      // De eindtijd mag niet verder gaan dan de volgende boeking OF de sluitingstijd
      if (t.str > maxEndTime) return;

      const diff = calculateDuration(startTijd, t.str);
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      const durationLabel = hours > 0 ? `${hours}u ${mins}m` : `${mins} min`;

      const option = document.createElement("option");
      option.value = t.str;
      option.textContent = `${t.str} (${durationLabel})`;
      eindSelect.appendChild(option);
    });
  }

  async function refreshTimes() {
    await fetchBookedTimes();
    populateStartTimes();
    startTijd = "";
    eindTijd = "";
    eindSelect.innerHTML = "";
    updateDurationText();
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();

    if (honeypotInput && honeypotInput.value.trim() !== "") return;
    const timeSpent = (Date.now() - formLoadedAt) / 1000;
    if (timeSpent < MIN_FORM_TIME) return;

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
          body: JSON.stringify({
            name, email, studio, datum, startTijd, eindTijd, timeSpent,
            honeypot: honeypotInput?.value || ""
          })
        }
      );

      const data = await response.json();
      if (!data.success) {
        stopLoadingAndAlert("Reservatie mislukt.");
        return;
      }

      alert("Reservatie gelukt! Er is een bevestigingsmail gestuurd.");
      form.reset();
      refreshTimes();
    } catch (err) {
      console.error(err);
      stopLoadingAndAlert("Server fout. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  });

  refreshTimes();
});