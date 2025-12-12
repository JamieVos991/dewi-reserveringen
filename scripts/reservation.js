// scripts/reservation.js

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
  
    // Fake booked times for demo (you can fetch from backend if needed)
    async function fetchBookedTimes() {
      if (!studio || !date) return;
      bookedRanges = [];
      // You could fetch from your backend if you want to show already booked slots
      // For now, we'll leave it empty
    }
  
    function populateStartTimes() {
      const allTimes = generateTimes();
      startSelect.innerHTML = `<option value="">Kies start tijd</option>`;
  
      const now = new Date();
  
      allTimes.forEach(t => {
        let disabled = false;
        let text = t.str;
  
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
      endSelect.innerHTML = `<option value="">Kies eind tijd</option>`;
  
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
        // ✅ Get reCAPTCHA token
        const token = await grecaptcha.execute("6LeucygsAAAAAEnA0gXp5opn6fsHpiEC7EZR6Vnr", { action: "reservation" });
        console.log("Generated token:", token); // browser console
  
        // ✅ Send to backend
        const res = await fetch("/api/reserve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recaptchaToken: token,
            email: form.email.value,
            name: form.name.value,
            studio,
            date,
            startTime,
            endTime,
          }),
        });
  
        const data = await res.json();
  
        if (data.success) {
          alert("Reservation successful!");
          form.reset();
          await refreshTimes();
        } else {
          alert(`Reservation failed: ${data.message}`);
        }
      } catch (err) {
        console.error(err);
        alert("Error submitting reservation. Check console.");
      }
    });
  
    refreshTimes();
  });
  