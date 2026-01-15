import { db } from "../firebase/firebase.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.2.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  // Configuratie: Tijden en Validatie
  const MIN_UUR = 8;
  const MIN_MINUUT = 30;
  const MAX_UUR = 21;
  const MAX_MINUUT = 30; 
  const STEP_MINUUT = 30;
  const MIN_FORM_TIME = 3; 

  // States: Hier worden de geselecteerde gegevens opgeslagen
  let studio = "";
  let datum = "";
  let startTijd = "";
  let eindTijd = "";
  let name = "";
  let email = "";
  let bookedRanges = []; // Bevat de reeds gereserveerde tijden uit de database
  let formLoadedAt = Date.now();

  // DOM elementen
  const form = document.getElementById("reservationForm");
  const studioSelect = document.getElementById("studio");
  const datumInput = document.getElementById("datum");
  const startSelect = document.getElementById("startTijd");
  const eindSelect = document.getElementById("eindTijd");
  const durationFeedback = document.getElementById("durationFeedback");
  const naamInput = form.querySelector('input[name="name"]');
  const emailInput = form.querySelector('input[name="email"]');
  const honeypotInput = form.querySelector('input[name="company"]'); // Onzichtbaar veld voor bots
  const globalLoader = document.getElementById("globalLoader");
  const reserveerBtn = document.getElementById("reserveerBtn");

  // Toon/verberg de laad animatie en zet de knop aan/uit
  function setLoading(isLoading) {
    globalLoader.classList.toggle("hidden", !isLoading);
    reserveerBtn.disabled = isLoading;
  }

  // Stop de loader en toon een alert
  function stopLoadingAndAlert(message) {
    setLoading(false);
    alert(message);
  }

  // Standaard datum instellen op vandaag en verleden uitschakelen
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]; // Formaat: YYYY-MM-DD
  datumInput.min = todayStr;
  datumInput.value = todayStr;
  datum = todayStr;

  // Event listeners: Input verwerkingen
  naamInput.addEventListener("input", e => name = e.target.value.trim());
  emailInput.addEventListener("input", e => email = e.target.value.trim());

  studioSelect.addEventListener("change", e => {
    studio = e.target.value;
    refreshTimes(); // Haal nieuwe tijden op voor deze studio
  });

  datumInput.addEventListener("change", e => {
    datum = e.target.value;
    refreshTimes(); // Haal nieuwe tijden op voor deze datum
  });

  startSelect.addEventListener("change", e => {
    startTijd = e.target.value;
    eindTijd = ""; 
    populateEndTimes(); // Werk eindtijden bij op basis van nieuwe starttijd
    updateDurationText();
  });

  eindSelect.addEventListener("change", e => {
    eindTijd = e.target.value;
    updateDurationText();
  });

  // Bereken het verschil tussen twee tijdstippen in minuten
  function calculateDuration(start, end) {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  }

  // Genereer alle mogelijke tijdslots (08:30, 09:00, etc.)
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

  // Controleer of twee tijdsblokken over elkaar heen vallen
  function rangesOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
  }

  // Haal alle bestaande boekingen op voor de gekozen studio en dag
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

  // Vul de starttijd dropdown en deactiveer bezette tijden
  function populateStartTimes() {
    const allTimes = generateTimes();
    const startOptions = allTimes.filter(t => t.str < "21:30");
    
    startSelect.innerHTML = `<option value="">Selecteer start tijd</option>`;

    const now = new Date();
    const isToday = datum === todayStr;

    startOptions.forEach((t) => {
      let disabled = false;
      let label = t.str;

      // Als het vandaag is, deactiveer tijden in het verleden
      if (isToday) {
        const [h, m] = t.str.split(':').map(Number);
        const timeDate = new Date();
        timeDate.setHours(h, m, 0, 0);
        if (timeDate <= now) disabled = true;
      }

      // Deactiveer tijden die al in een geboekte range vallen
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

  // Vul de eindtijd dropdown op basis van de gekozen starttijd
  function populateEndTimes() {
    if (!startTijd) {
        eindSelect.innerHTML = `<option value="">Selecteer eind tijd</option>`;
        return;
    }

    const allTimes = generateTimes();
    const startIndex = allTimes.findIndex(t => t.str === startTijd) + 1;
    eindSelect.innerHTML = `<option value="">Selecteer eind tijd</option>`;

    // Zoek de eerstvolgende boeking op die dag om de eindtijd te limiteren
    const nextBooking = bookedRanges
      .filter(r => r.startTijd > startTijd)
      .sort((a, b) => a.startTijd.localeCompare(b.startTijd))[0];

    const maxEndTime = nextBooking ? nextBooking.startTijd : "21:30";

    allTimes.slice(startIndex).forEach(t => {
      if (t.str > maxEndTime) return; // Je kunt niet voorbij de volgende boeking reserveren

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

  // Haal data op en ververs beide dropdowns
  async function refreshTimes() {
    await fetchBookedTimes();
    populateStartTimes();
    startTijd = "";
    eindTijd = "";
    eindSelect.innerHTML = "";
    updateDurationText();
  }

  // Submit
  form.addEventListener("submit", async e => {
    e.preventDefault();

    // Bot beveiliging 1: Honeypot (als 'company' is ingevuld, is het een bot)
    if (honeypotInput && honeypotInput.value.trim() !== "") return;
    
    // Bot beveiliging 2: Te snelle submit
    const timeSpent = (Date.now() - formLoadedAt) / 1000;
    if (timeSpent < MIN_FORM_TIME) return;

    // Basis velden controle
    if (!studio || !datum || !startTijd || !eindTijd || !name || !email) {
      stopLoadingAndAlert("Beantwoord alle inputs alstublieft.");
      return;
    }

    setLoading(true);

    try {
      // Laatste check: zijn de tijden nog steeds vrij? (Double check)
      await fetchBookedTimes();
      const conflict = bookedRanges.some(r =>
        rangesOverlap(startTijd, eindTijd, r.startTijd, r.eindTijd)
      );

      if (conflict) {
        stopLoadingAndAlert("Deze tijd overlapt met een bestaande reservatie.");
        return;
      }

      // Verzend de data naar de Firebase Cloud Function
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

      // Succes! Reset het formulier
      alert("Reservatie gelukt! Er is een bevestigingsmail gestuurd.");
      form.reset();
      refreshTimes();
    } catch (err) {
      stopLoadingAndAlert("Server fout. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  });

  // Eerste keer laden van de tijden bij het openen van de pagina
  refreshTimes();
});