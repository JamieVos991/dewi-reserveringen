import { db } from "../firebase/firebase.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.2.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const MIN_HOUR = 8,
    MIN_MINUTE = 30,
    MAX_HOUR = 21,
    STEP_MINUTES = 30;

  let studio = "",
    date = "",
    startTime = "",
    endTime = "",
    bookedRanges = [];

  const studioSelect = document.getElementById("studio");
  const dateInput = document.getElementById("date");
  const startSelect = document.getElementById("startTime");
  const endSelect = document.getElementById("endTime");
  const form = document.getElementById("reservationForm");

  // Set today as minimum date
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  dateInput.min = todayStr;
  dateInput.value = todayStr;
  date = dateInput.value;

  // Generate all possible times
  function generateTimes() {
    const times = [];
    for (let h = MIN_HOUR; h <= MAX_HOUR; h++) {
      for (let m = 0; m < 60; m += STEP_MINUTES) {
        if (h === MIN_HOUR && m < MIN_MINUTE) continue;
        times.push({ hour: h, minute: m, str: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` });
      }
    }
    return times;
  }

  async function fetchBookedTimes() {
    if (!studio || !date) return;
    bookedRanges = [];
    const q = query(collection(db, "reservations"), where("studio", "==", studio), where("date", "==", date));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
      const data = doc.data();
      bookedRanges.push({ startTime: data.startTime, endTime: data.endTime });
    });
  }

  function populateStartTimes() {
    const allTimes = generateTimes();
    startSelect.innerHTML = `<option value="">Select start time</option>`;

    const now = new Date();

    allTimes.forEach(t => {
      let disabled = false;
      let text = t.str;

      // 1️⃣ Disable past times only if selected date is today
      const selectedDate = new Date(date + "T00:00");
      if (
        now.getFullYear() === selectedDate.getFullYear() &&
        now.getMonth() === selectedDate.getMonth() &&
        now.getDate() === selectedDate.getDate()
      ) {
        if (t.hour < now.getHours() || (t.hour === now.getHours() && t.minute <= now.getMinutes())) {
          disabled = true;
        }
      }

      // 2️⃣ Disable booked times
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
    endSelect.innerHTML = `<option value="">Select end time</option>`;

    allTimes.slice(startIndex).forEach(t => {
      let disabled = false;
      let text = t.str;

      bookedRanges.forEach(range => {
        if (t.str > range.startTime && t.str <= range.endTime) {
          disabled = true;
          text += " – geboekt";
        }
      });

      const option = document.createElement("option");
      option.value = t.str;
      option.textContent = text;
      option.disabled = disabled;
      endSelect.appendChild(option);
    });
  }

  async function refreshTimes() {
    await fetchBookedTimes();
    populateStartTimes();
    endSelect.innerHTML = "";
    startTime = "";
    endTime = "";
  }

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

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!studio || !date || !startTime || !endTime) {
      alert("Please fill out all fields.");
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
        createdAt: serverTimestamp(),
      });
      alert("Reservation successful!");
      await refreshTimes();
      form.reset();
    } catch (err) {
      console.error(err);
      alert("Failed to save reservation. Check console.");
    }
  });

  refreshTimes();
});
