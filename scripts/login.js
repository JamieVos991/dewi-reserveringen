// Firebase auth import
import { auth } from "../firebase/firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.2.0/firebase-auth.js";


// Wacht tot de pagina geladen is
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const errorMsg = document.getElementById("errorMsg");

  // Login formulier submit
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Reset foutmelding
    errorMsg.textContent = "";

    // Input waarden ophalen
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      // Inloggen met Firebase
      await signInWithEmailAndPassword(auth, email, password);

      // Goed = dashboard
      window.location.href = "./dashboard.html";

    } catch (error) {
      // Fout bij inloggen
      console.error("Login error:", error);
      errorMsg.textContent = "Niet de goede credentials. Probeer opnieuw.";
    }
  });
});
