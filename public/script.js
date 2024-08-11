// VARIABLE DECLARATIONS AND INITIALIZATION

const calendar = document.querySelector(".calendar"),
  date = document.querySelector(".date"),
  daysContainer = document.querySelector(".days"),
  prev = document.querySelector(".prev"),
  next = document.querySelector(".next"),
  todayBtn = document.querySelector(".today-btn"),
  monthDropdown = document.getElementById("month"),
  yearDropdown = document.getElementById("year"), 
  nameInput = document.getElementById("name"),
  employeeNumberInput = document.getElementById("employeeNumber"),
  clientInput = document.getElementById("client"),
  workingHoursInput = document.getElementById("workingHours"),
  locationInput = document.getElementById("location");
  const downloadBtn = document.querySelector('.down-btn');

let today = new Date();
let month = today.getMonth();
let year = today.getFullYear();
let eid; // Employee ID

// Read query parameters from the URL
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const token = urlParams.get("token");
eid = urlParams.get("eid");

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// FETCH USER DATA AND INITIALIZE CALENDAR

window.onload = async function () {
  if (eid!= null) {
    await fetchUserData(eid); // Wait for user data to be fetched
    initCalendar();
  } else {
    window.location = 'http://localhost:3000/login.html';
  }
};

// FUNCTIONS FOR API CALLS

async function fetchUserData(id) {
  try {
    const response = await fetch(`http://localhost:3000/users/${id}`);
    console.log(response);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const userData = await response.json();
    if (userData.length > 0) {
      const user = userData[0];
      nameInput.value = user.ename || "";
      employeeNumberInput.value = user.eid || "";
      clientInput.value = user.client || "";
      workingHoursInput.value = user.working_hours || "";
      locationInput.value = user.location || "";
      eid = user.eid;
    }
  } catch (error) {
    console.error("There has been a problem with your fetch operation:", error);
  }
}

// UTILITY FUNCTIONS

function initCalendar() {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const prevLastDay = new Date(year, month, 0);
  const prevDays = prevLastDay.getDate();
  const lastDate = lastDay.getDate();
  const day = firstDay.getDay();
  const nextDays = 7 - lastDay.getDay() - 1;

  date.innerHTML = months[month] + " " + year;

  let days = "";

  for (let x = day; x > 0; x--) {
    days += `<div class="day prev-date"></div>`;
  }

  for (let i = 1; i <= lastDate; i++) {
    let className = "day";
    let hours = 0;
    if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      className += " today active";
      hours = 9; // default hours for current day
    }
    days += `<div class="${className}"><span class="date-display">${i}</span><hr><div class="date-i">
            <select id="day-input-${i}" class="day-input" placeholder="Shift">
            <option value="First Shift">First Shift</option>
            <option value="Second Shift">Second Shift</option>
            <option value="Night Shift">Night Shift</option>
            <option value="General Shift">General Shift</option>
            <option value="Weekly Holiday">Weekly Holiday</option>
            <option value="General Holiday">General Holiday</option>
            <option value="Leave Taken">Leave Taken</option>
            <option value="Weekend Shift">Weekend Shift</option>
          </select>
        </div><hr><input type="text" id="day-notes-${i}" class="remarks" placeholder="Notes"></div>`;
  }

  for (let j = 1; j <= nextDays; j++) {
    days += `<div class="day next-date"></div>`;
  }
  daysContainer.innerHTML = days;
}

// EVENT HANDLERS

todayBtn.addEventListener("click", () => {
  today = new Date();
  month = today.getMonth();
  year = today.getFullYear();
  updateDropdowns();
  initCalendar();
});

prev.addEventListener("click", prevMonth);
next.addEventListener("click", nextMonth);

function prevMonth() {
  month--;
  if (month < 0) {
    month = 11;
    year--;
  }
  updateDropdowns();
  initCalendar();
}

function nextMonth() {
  month++;
  if (month > 11) {
    month = 0;
    year++;
  }
  updateDropdowns();
  initCalendar();
}

function updateDropdowns() {
  monthDropdown.value = month;
  yearDropdown.value = year;
}

// Populate year dropdown
populateYearDropdown(2000, 2030);

function populateYearDropdown(startYear, endYear) {
  for (let year = startYear; year <= endYear; year++) {
    const option = document.createElement("option");
    option.value = year;
    option.text = year;
    yearDropdown.appendChild(option);
  }
  yearDropdown.value = today.getFullYear();
  monthDropdown.value = today.getMonth();
}

// Jump function to handle dropdown changes
function jump() {
  month = parseInt(monthDropdown.value);
  year = parseInt(yearDropdown.value);
  initCalendar();
}

monthDropdown.addEventListener("change", jump);
yearDropdown.addEventListener("change", jump);



document.addEventListener("DOMContentLoaded", function() {
  // Event delegation to handle dynamic elements
  daysContainer.addEventListener("change", async (event) => {
    const target = event.target;
    if (target.classList.contains("day-input") || target.classList.contains("remarks")) {
      const day = target.closest(".day");
      const dayIndex = [...daysContainer.children].indexOf(day) + 1;

      const shift = document.getElementById(`day-input-${dayIndex}`).value;
      const notes = document.getElementById(`day-notes-${dayIndex}`).value;

      await saveDayData(dayIndex, shift, notes);
    }
  });

  // Save button event listener
  document.querySelector(".save-btn").addEventListener("click", saveAllData);
});

async function saveDayData(day, shift, notes) {
  const data = {
    day: day,
    shift: shift,
    notes: notes,
    eid: eid,
    month: month + 1,
    year: year
  };

  try {
    const response = await fetch(`http://localhost:3000/save-day-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const result = await response.json();
    console.log(result);
  } catch (error) {
    console.error('There has been a problem with your fetch operation:', error);
  }
}

async function saveAllData() {
  const allData = [];

  for (let i = 1; i <= 31; i++) {
    const shift = document.getElementById(`day-input-${i}`)?.value || '';
    const notes = document.getElementById(`day-notes-${i}`)?.value || '';

    if (shift || notes) {
      allData.push({
        day: i,
        shift: shift,
        notes: notes,
        eid: eid,
        month: month + 1,
        year: year
      });
    }
  }

  try {
    const response = await fetch(`http://localhost:3000/save-all-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(allData)
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const result = await response.json();
    console.log(result);
  } catch (error) {
    console.error('There has been a problem with your fetch operation:', error);
  }
}




  // Attach click event listener to the download button
// Attach click event listener to the download button
downloadBtn.addEventListener('click', async () => {
  // Replace '123' with the actual 'eid' value you want to download the Excel file for
  //eid = eid;
  const month1 = month + 1;

  // Prompt the user for the filename
  const userFilename = prompt("Enter the filename for the downloaded Excel file (without extension):", `Modified_Timesheet_${eid}`);
  if (!userFilename) {
    alert('Filename is required.');
    return; // Exit if the user cancels the prompt or leaves the filename empty
  }

  // Event listener for download button
downloadBtn.addEventListener("click", async () => {
  try {
    const response = await fetch(`http://localhost:3000/updateExcel/${eid}/${year}/${month + 1}`);
    if (!response.ok) {
      throw new Error('Failed to download Excel file');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Updated_Timesheet_${month + 1}_${year}_eid_${eid}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (error) {
    console.error('Error downloading Excel file:', error);
    alert('Error downloading Excel file');
  }
});

  
});