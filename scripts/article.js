// DOM elementen
const naamInput = document.querySelector('input[name="name"]');
const emailInput = document.querySelector('input[name="email"]');
const studioSelect = document.getElementById('studio');
const datumInput = document.getElementById('datum');
const startTijdSelect = document.getElementById('startTijd');
const eindTijdSelect = document.getElementById('eindTijd');

// De drie stappen in de zijbalk die actief willen maken
const asideArticles = document.querySelectorAll('aside article');
const form = document.getElementById('reservationForm');

// Functie die de status van de zijbalk bijwerkt op basis van de ingevulde velden.
function updateAsideState() {
    
  // Stap 1: Contactgegevens controleren
  // De naam mag niet leeg zijn en de e-mail moet een geldig formaat hebben
  const step1Valid =
    naamInput.value.trim().length > 0 &&
    emailInput.checkValidity();

  // Stap 2: Studio en Datum controleren
  // Beide moeten geselecteerd zijn volgens de HTML validatie 
  const step2Valid =
    studioSelect.checkValidity() &&
    datumInput.checkValidity();

  // Tijd disabled:
  // Als stap 2 (studio/datum) nog niet klaar is, mag je de tijden nog niet kiezen
  startTijdSelect.disabled = !step2Valid;
  eindTijdSelect.disabled = !step2Valid;

  // Stap 3: Tijdselectie controleren
  // De dropdowns moeten enabled zijn en er moet een waarde gekozen zijn
  const step3Valid =
    !startTijdSelect.disabled &&
    !eindTijdSelect.disabled &&
    startTijdSelect.value !== "" &&
    eindTijdSelect.value !== "";

  // UI update:
  // Voeg de class 'actief' toe aan het juiste aside item als de stap goed is
  // Gebruik toggle met een boolean: true = toevoegen, false = verwijderen
  asideArticles[0].classList.toggle('actief', step1Valid);
  asideArticles[1].classList.toggle('actief', step2Valid);
  asideArticles[2].classList.toggle('actief', step3Valid);
}

// Loop door alle relevante elementen en voeg listeners toe voor 'input' en 'change'
[
  naamInput,
  emailInput,
  studioSelect,
  datumInput,
  startTijdSelect,
  eindTijdSelect,
].forEach((el) => {

  // Input reageert direct bij typen, Change reageert bij selectie wijziging
  el.addEventListener('input', updateAsideState);
  el.addEventListener('change', updateAsideState);
});

// Zodra de pagina geladen is, zorgen we voor een schone start
window.addEventListener('DOMContentLoaded', () => {
  datumInput.value = ''; // Reset de datum naar leeg voor de browser cache
  updateAsideState();    // Zet de aside direct in de juiste (inactieve) stand
});

// Wanneer het formulier succesvol wordt verstuurd
form.addEventListener('submit', (e) => {
  form.reset();     
  datumInput.value = ''; 
  updateAsideState(); // Alle 'actief' classes weer verwijderen
});