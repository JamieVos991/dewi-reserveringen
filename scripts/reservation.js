import { db } from "../firebase/firebase.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.2.0/firebase-firestore.js";

// Wacht tot de volledige HTML is geladen voordat we JS uitvoeren
document.addEventListener("DOMContentLoaded", () => {

  // Openingstijden en interval (30 minuten)
  const MIN_UUR = 8;
  const MIN_MINUUT = 30;
  const MAX_UUR = 21;
  const MAX_MINUUT = 30;
  const STEP_MINUUT = 30;

  // Deze variabelen houden de huidige formulierstatus bij
  let studio = "";
  let datum = "";
  let startTijd = "";
  let eindTijd = "";
  let name = "";
  let email = "";

  // Alle reeds geboekte tijdsblokken voor de gekozen studio + datum
  let bookedRanges = [];

  const form = document.getElementById("reservationForm");
  const studioSelect = document.getElementById("studio");
  const datumInput = document.getElementById("datum");
  const startSelect = document.getElementById("startTijd");
  const eindSelect = document.getElementById("eindTijd");
  const naamInput = form.querySelector('input[name="name"]');
  const emailInput = form.querySelector('input[name="email"]');

  // Zet minimale datum op vandaag
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  datumInput.min = todayStr;
  datumInput.value = todayStr;
  datum = todayStr;

  // Sla invoer direct op in JS state
  naamInput.addEventListener("input", e => name = e.target.value.trim());
  emailInput.addEventListener("input", e => email = e.target.value.trim());

  // Bij wijziging van studio of datum: opnieuw beschikbare tijden ophalen
  studioSelect.addEventListener("change", e => {
    studio = e.target.value;
    refreshTimes();
  });

  datumInput.addEventListener("change", e => {
    datum = e.target.value;
    refreshTimes();
  });

  // Starttijd geselecteerd → eindtijden opnieuw berekenen
  startSelect.addEventListener("change", e => {
    startTijd = e.target.value;
    populateEndTimes();
  });

  // Eindtijd geselecteerd → opslaan in state
  eindSelect.addEventListener("change", e => {
    eindTijd = e.target.value;
  });


  // Genereert alle mogelijke tijdstippen binnen openingstijden
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

  // Controleert of twee tijden overlappen
  function rangesOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
  }


  // Haalt alle bestaande reservaties op voor studio + datum
  async function fetchBookedTimes() {
    if (!studio || !datum) return;

    bookedRanges = [];

    const q = query(
      collection(db, "reservations"),
      where("studio", "==", studio),
      where("datum", "==", datum)
    );

    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
      const data = doc.data();
      bookedRanges.push({
        startTijd: data.startTijd,
        eindTijd: data.eindTijd
      });
    });
  }

  // Vult de starttijd select met geldige opties
  function populateStartTimes() {
    const allTimes = generateTimes();
    startSelect.innerHTML = `<option value="">Selecteer een start tijd</option>`;

    const now = new Date();
    const selectedDate = new Date(datum + "T00:00");

    allTimes.forEach((t, index) => {
      if (index === allTimes.length - 1) return;

      let disabled = false;
      let text = t.str;

      // Verleden tijden op vandaag uitschakelen
      if (
        now.toDateString() === selectedDate.toDateString() &&
        (t.hour < now.getHours() ||
          (t.hour === now.getHours() && t.minute <= now.getMinutes()))
      ) {
        disabled = true;
      }

      // Reeds geboekte tijden uitschakelen
      bookedRanges.forEach(range => {
        if (t.str >= range.startTijd && t.str < range.eindTijd) {
          disabled = true;
          text += " – Geboekt";
        }
      });

      const option = document.createElement("option");
      option.value = t.str;
      option.textContent = text;
      option.disabled = disabled;
      startSelect.appendChild(option);
    });
  }

  // Vult eindtijden op basis van gekozen starttijd
  function populateEndTimes() {
    if (!startTijd) return;

    const allTimes = generateTimes();
    const startIndex = allTimes.findIndex(t => t.str === startTijd) + 1;
    eindSelect.innerHTML = `<option value="">Selecteer een eind tijd</option>`;

    // Zoek eerstvolgende boeking (indien aanwezig)
    const nextBooking = bookedRanges
      .filter(r => r.startTijd > startTijd)
      .sort((a, b) => a.startTijd.localeCompare(b.startTijd))[0];

    const maxEndTime = nextBooking ? nextBooking.startTijd : null;

    let firstValid = null;

    allTimes.slice(startIndex).forEach(t => {
      if (maxEndTime && t.str > maxEndTime) return;

      const option = document.createElement("option");
      option.value = t.str;
      option.textContent = t.str;
      eindSelect.appendChild(option);

      if (!firstValid) firstValid = t.str;
    });

    // Automatisch eerste geldige eindtijd selecteren
    if (firstValid) {
      eindSelect.value = firstValid;
      eindTijd = firstValid;
    }
  }

  // Ververst tijden bij wijziging van studio of datum
  async function refreshTimes() {
    await fetchBookedTimes();
    populateStartTimes();
    startTijd = "";
    eindTijd = "";
    eindSelect.innerHTML = "";
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();

    // Frontend validatie
    if (!studio || !datum || !startTijd || !eindTijd || !name || !email) {
      alert("Beantwoord alle inputs alstublieft.");
      return;
    }

    // Extra conflict check voor verzenden
    await fetchBookedTimes();

    const conflict = bookedRanges.some(r =>
      rangesOverlap(startTijd, eindTijd, r.startTijd, r.eindTijd)
    );

    if (conflict) {
      alert("Deze tijd overlapt met een al bestaande reservatie.");
      return;
    }

    try {
      // Verstuur reservatie naar Cloud Function
      const response = await fetch(
        "https://us-central1-strakplan-e0953.cloudfunctions.net/reserve",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            studio,
            datum,
            startTijd,
            eindTijd
          })
        }
      );

      const data = await response.json();
      if (!data.success) {
        alert("Reservatie is gefaald.");
        return;
      }

      alert("Reservatie is gelukt! Er is een bevestigingsmail gestuurd.");

      // Form resetten na succesvolle reservatie
      form.reset();
      name = "";
      email = "";
      studio = "";
      datum = todayStr;
      startTijd = "";
      eindTijd = "";
      refreshTimes();

    } catch (err) {
      console.error(err);
      alert("Server fout. Probeer opnieuw.");
    }
  });

  // Eerste keer laden
  refreshTimes();
});