// Selecteer de inputs en de cirkels
const naamInput = document.querySelector('input[name="name"]');
const emailInput = document.querySelector('input[name="email"]');
const studioSelect = document.getElementById('studio');
const datumInput = document.getElementById('datum');
const startTijdSelect = document.getElementById('startTijd');
const eindTijdSelect = document.getElementById('eindTijd');
const asideArticles = document.querySelectorAll('aside article');
const form = document.getElementById('reservationForm');

// Functie die de cirkels activeert op basis van ingevulde inputs
function updateAsideState() {
    
  // Stap 1: naam + email
  const step1Valid =
    naamInput.value.trim().length > 0 &&
    emailInput.checkValidity();

  // Stap 2: studio + datum
  const step2Valid =
    studioSelect.checkValidity() &&
    datumInput.checkValidity();

  // Enable start/eind tijd alleen als studio + datum ingevuld zijn
  startTijdSelect.disabled = !step2Valid;
  eindTijdSelect.disabled = !step2Valid;

  // Step 3: start + eind tijd (alleen geldig als niet disabled en beide ingevuld)
  const step3Valid =
    !startTijdSelect.disabled &&
    !eindTijdSelect.disabled &&
    startTijdSelect.value !== "" &&
    eindTijdSelect.value !== "";

  // Toggle de active class op de cirkels
  asideArticles[0].classList.toggle('actief', step1Valid);
  asideArticles[1].classList.toggle('actief', step2Valid);
  asideArticles[2].classList.toggle('actief', step3Valid);
}

// Eventlisteners om de cirkels bij te werken bij input of select wijziging
[
  naamInput,
  emailInput,
  studioSelect,
  datumInput,
  startTijdSelect,
  eindTijdSelect,
].forEach((el) => {
  el.addEventListener('input', updateAsideState);
  el.addEventListener('change', updateAsideState);
});

// Zorg dat alles correct staat bij het laden van de pagina
window.addEventListener('DOMContentLoaded', () => {
  datumInput.value = ''; // Lege datum bij laden
  updateAsideState();
});

// Reset formulier en cirkels bij submit
form.addEventListener('submit', (e) => {
  form.reset();     
  datumInput.value = ''; 
  updateAsideState();     
});
