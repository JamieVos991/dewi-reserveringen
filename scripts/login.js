import { auth } from "../firebase/firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.2.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const errorMsg = document.getElementById("errorMsg");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.textContent = ""; 
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "./dashboard.html";
    } catch (error) {
      console.error("Login error:", error);
      errorMsg.textContent = "Incorrect email or password. Please try again.";
    }
  });
});
