import { db } from "../firebase/firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.2.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const MIN_HOUR = 8;
  const MIN_MINUTE = 30;
  const MAX_HOUR = 21;
  const STEP_MINUTES = 30;

  let studio = "";
  let date = "";
  let startTime = "";
  let endTime = "";
  let bookedRanges = [];

  const studioSelect = document.getElementById("studio");
  const dateInput = document.getElementById("date");
  const startSelect = document.getElementById("startTime");
  const endSelect = document.getElementById("endTime");
  const form = document.getElementById("reservationForm");

  /* -------------------- DATE SETUP -------------------- */

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  dateInput.min = todayStr;
  dateInput.value = todayStr;
  date = todayStr;

  /* -------------------- HELPERS -------------------- */

  function generateTimes() {
    const times = [];
    for (let h = MIN_HOUR; h <= MAX_HOUR; h++) {
      for (let m = 0; m < 60; m += STEP_MINUTES) {
        if (h === MIN_HOUR && m < MIN_MINUTE) continue;
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

  /* -------------------- FIRESTORE -------------------- */

  async function fetchBookedTimes() {
    if (!studio || !date) return;

    bookedRanges = [];

    const q = query(
      collection(db, "reservations"),
      where("studio", "==", studio),
      where("date", "==", date)
    );

    const snapshot = await getDocs(q);

    snapshot.forEach(doc => {
      const data = doc.data();
      bookedRanges.push({
        startTime: data.startTime,
        endTime: data.endTime
      });
    });
  }

  /* -------------------- UI POPULATION -------------------- */

  function populateStartTimes() {
    const allTimes = generateTimes();
    startSelect.innerHTML = `<option value="">Selecteer een start tijd</option>`;

    const now = new Date();
    const selectedDate = new Date(date + "T00:00");

    allTimes.forEach(t => {
      let disabled = false;
      let text = t.str;

      // Disable past times (today only)
      if (
        now.toDateString() === selectedDate.toDateString() &&
        (t.hour < now.getHours() ||
          (t.hour === now.getHours() && t.minute <= now.getMinutes()))
      ) {
        disabled = true;
      }

      // Disable booked ranges
      bookedRanges.forEach(range => {
        if (t.str >= range.startTime && t.str < range.endTime) {
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

  function populateEndTimes() {
    if (!startTime) return;
  
    const allTimes = generateTimes();
    const startIndex = allTimes.findIndex(t => t.str === startTime) + 1;
  
    endSelect.innerHTML = `<option value="">Selecteer een eind tijd</option>`;
  
    // Find the first booking that starts AFTER the selected start
    const nextBooking = bookedRanges
      .filter(range => range.startTime > startTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  
    const maxEndTime = nextBooking ? nextBooking.startTime : null;
  
    allTimes.slice(startIndex).forEach(t => {
      // Stop when we reach the next booking
      if (maxEndTime && t.str > maxEndTime) return;
  
      const option = document.createElement("option");
      option.value = t.str;
      option.textContent = t.str;
      endSelect.appendChild(option);
    });
  }
  
  async function refreshTimes() {
    await fetchBookedTimes();
    populateStartTimes();
    startTime = "";
    endTime = "";
    endSelect.innerHTML = "";
  }

  /* -------------------- EVENTS -------------------- */

  studioSelect.addEventListener("change", () => {
    studio = studioSelect.value;
    refreshTimes();
  });

  dateInput.addEventListener("change", () => {
    date = dateInput.value;
    refreshTimes();
  });

  startSelect.addEventListener("change", e => {
    startTime = e.target.value;
    populateEndTimes();
    endTime = "";
  });

  endSelect.addEventListener("change", e => {
    endTime = e.target.value;
  });

  /* -------------------- SUBMIT (SAFE) -------------------- */

  form.addEventListener("submit", async e => {
    e.preventDefault();

    if (!studio || !date || !startTime || !endTime) {
      alert("Please fill out all fields.");
      return;
    }

    // 🔒 ALWAYS re-check before saving
    await fetchBookedTimes();

    const conflict = bookedRanges.some(range =>
      rangesOverlap(startTime, endTime, range.startTime, range.endTime)
    );

    if (conflict) {
      alert("This time overlaps with an existing reservation.");
      return;
    }

    try {
      await addDoc(collection(db, "reservations"), {
        email: form.email.value,
        name: form.name.value,
        studio,
        date,
        startTime,
        endTime,
        createdAt: serverTimestamp()
      });

      alert("Reservation successful!");
      await refreshTimes();
      form.reset();
    } catch (err) {
      console.error(err);
      alert("Failed to save reservation.");
    }
  });

  refreshTimes();
});
