import { auth } from "../firebase/firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.2.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  // DOM elementen
  const loginForm = document.getElementById("loginForm");
  const errorMsg = document.getElementById("errorMsg");
  const passwordInput = document.getElementById("password");
  const togglePassword = document.getElementById("togglePassword");

  // SVG iconen (Oogje open / Oogje dicht)
  const eyeIcon = `
    <path fill-rule="evenodd" clip-rule="evenodd"
      d="M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12ZM14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12Z"
      fill="currentColor" />
    <path fill-rule="evenodd" clip-rule="evenodd"
      d="M12 3C17.5915 3 22.2898 6.82432 23.6219 12C22.2898 17.1757 17.5915 21 12 21C6.40848 21 1.71018 17.1757 0.378052 12C1.71018 6.82432 6.40848 3 12 3ZM12 19C7.52443 19 3.73132 16.0581 2.45723 12C3.73132 7.94186 7.52443 5 12 5C16.4756 5 20.2687 7.94186 21.5428 12C20.2687 16.0581 16.4756 19 12 19Z"
      fill="currentColor" />
  `;

  const eyeOffIcon = `
    <path d="M3 3L21 21" stroke="currentColor" stroke-width="2"/>
    <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.59"
          stroke="currentColor" stroke-width="2"/>
    <path d="M2.46 12C3.73 7.94 7.52 5 12 5c1.18 0 2.32.19 3.38.54"
          stroke="currentColor" stroke-width="2"/>
    <path d="M21.54 12C20.27 16.06 16.48 19 12 19c-1.18 0-2.32-.19-3.38-.54"
          stroke="currentColor" stroke-width="2"/>
  `;

  // Luister naar mouse-click event
  togglePassword.addEventListener("click", toggle);
  
  // Luister naar toetsenbord (Enter/Spatie) voor toegankelijkheid
  togglePassword.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") toggle();
  });

  function toggle() {
    // Check of het veld nu op 'password' staat
    const isHidden = passwordInput.type === "password";

    // Wissel het type tussen 'text' (zichtbaar) en 'password' (bolletjes)
    passwordInput.type = isHidden ? "text" : "password";
    
    // Wissel het icoontje in de button
    togglePassword.innerHTML = isHidden ? eyeOffIcon : eyeIcon;
    
    // Update de aria-label voor screenreaders
    togglePassword.setAttribute(
      "aria-label",
      isHidden ? "Verberg wachtwoord" : "Laat het wachtwoord zien"
    );
  }

  loginForm.addEventListener("submit", async (e) => {
    // Voorkom dat de pagina herlaadt bij het versturen
    e.preventDefault();

    // Reset de foutmelding
    errorMsg.textContent = "";

    // Haal de values op uit de inputvelden
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      // Verstuur de inloggegevens naar Firebase
      await signInWithEmailAndPassword(auth, email, password);

      // Als het inloggen lukt, stuur de gebruiker door naar het dashboard
      window.location.href = "./dashboard.html";

    } catch (error) {
      // Bij een fout (verkeerd wachtwoord, gebruiker bestaat niet, etc.)
      alert("Niet de goede credentials. Probeer opnieuw.");
    }
  });
});