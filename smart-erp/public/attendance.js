// attendance.js - Human Resource: Attendance & Daily Roll Call (frmAttendance)
// Modernized for Tamba ERP Industrial Enterprise Suite

(function () {
  let activeYear = new Date().getFullYear();
  let activeMonthId = new Date().getMonth() + 1;
  let activeMonthName = "";
  let daysInMonth = 30;
  let monthsList = [];
  let holidaysStr = "";
  let staffList = [];
  let isModified = false;

  const section = document.getElementById("attendance");
  const yearInput = document.getElementById("att-year");
  const monthLabel = document.getElementById("att-month-label");
  const monthListEl = document.getElementById("att-month-list");
  const holidayListEl = document.getElementById("att-holiday-list");
  const dayNamesEl = document.getElementById("att-day-names");
  const gridHeader = document.getElementById("att-grid-header");
  const gridBody = document.getElementById("att-grid-body");
  const emptyStateEl = document.getElementById("att-empty-state");
  const flexGridEl = document.getElementById("att-flexgrid");
  const btnMarkAll = document.getElementById("att-btn-mark-all");
  const btnSave = document.getElementById("att-btn-save");
  const btnPrinter = document.getElementById("att-btn-printer");
  const btnClose = document.getElementById("att-btn-close");
  const btnCloseTop = document.getElementById("att-btn-close-top");

  const ALLOWED_ATT_CHARS = ["P", "L", "M", "A", "N", "H", " "];

  async function loadAttendanceData(year, monthId) {
    try {
      const res = await fetch(`/api/attendance?year=${year}&monthId=${monthId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to load attendance data");
        return;
      }
      const data = await res.json();
      activeYear = data.year;
      activeMonthId = data.monthId;
      activeMonthName = data.monthName || "";
      daysInMonth = data.daysInMonth;
      monthsList = data.months || [];
      holidaysStr = data.holidays || "".padEnd(daysInMonth, "0");
      staffList = data.staff || [];
      isModified = false;

      if (yearInput) yearInput.value = activeYear;
      if (monthLabel) monthLabel.textContent = (activeMonthName || "MONTH").toUpperCase();

      renderMonthList();
      renderHolidays();
      renderGrid();
    } catch (e) {
      console.error("Attendance fetch error:", e);
      alert("Error loading attendance: " + e.message);
    }
  }

  function renderMonthList() {
    if (!monthListEl) return;
    monthListEl.innerHTML = "";
    monthsList.forEach((m) => {
      const li = document.createElement("li");
      li.textContent = m.monthname;
      li.className = "att-month-item";
      if (Number(m.monthid) === Number(activeMonthId)) {
        li.classList.add("active");
      }
      li.addEventListener("click", () => {
        if (Number(m.monthid) !== Number(activeMonthId)) {
          if (isModified && !confirm("Discard unsaved changes?")) {
            return;
          }
          activeMonthId = Number(m.monthid);
          loadAttendanceData(activeYear, activeMonthId);
        }
      });
      monthListEl.appendChild(li);
    });
  }

  function renderHolidays() {
    if (!holidayListEl || !dayNamesEl) return;

    dayNamesEl.innerHTML = "";
    for (let d = 1; d <= 7; d++) {
      const dt = new Date(activeYear, activeMonthId - 1, d);
      const dayName = dt.toLocaleDateString("en-US", { weekday: "short" })[0];
      const div = document.createElement("div");
      div.className = "att-day-name-cell";
      div.textContent = dayName;
      dayNamesEl.appendChild(div);
    }

    holidayListEl.innerHTML = "";
    for (let d = 1; d <= daysInMonth; d++) {
      const isChecked = holidaysStr[d - 1] === "1";
      const label = document.createElement("label");
      label.className = "att-holiday-chk-label";

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = isChecked;
      chk.dataset.day = d;

      chk.addEventListener("change", (e) => {
        isModified = true;
        const dayIdx = Number(e.target.dataset.day) - 1;
        const checked = e.target.checked;
        const arr = holidaysStr.split("");
        arr[dayIdx] = checked ? "1" : "0";
        holidaysStr = arr.join("");

        staffList.forEach((st) => {
          let lArr = (st.ldetail || "").padEnd(daysInMonth, " ").split("");
          if (checked) {
            lArr[dayIdx] = "H";
          } else {
            if (lArr[dayIdx] === "H") lArr[dayIdx] = " ";
          }
          st.ldetail = lArr.join("");
        });

        renderGrid();
      });

      label.appendChild(chk);
      label.appendChild(document.createTextNode(String(d)));
      holidayListEl.appendChild(label);
    }
  }

  function renderGrid() {
    if (!gridHeader || !gridBody) return;

    // Build Header
    gridHeader.innerHTML = `
      <th class="att-col-sl">Sl</th>
      <th class="att-col-id">Staff ID</th>
      <th class="att-col-name">Employee Name</th>
    `;
    for (let d = 1; d <= daysInMonth; d++) {
      const isH = holidaysStr[d - 1] === "1";
      const th = document.createElement("th");
      th.className = "att-col-day" + (isH ? " holiday" : "");
      th.textContent = d;
      gridHeader.appendChild(th);
    }

    // Handle Empty State
    gridBody.innerHTML = "";
    if (staffList.length === 0) {
      if (emptyStateEl) emptyStateEl.hidden = false;
      if (flexGridEl) flexGridEl.hidden = true;
      if (btnMarkAll) btnMarkAll.disabled = true;
      return;
    }

    if (emptyStateEl) emptyStateEl.hidden = true;
    if (flexGridEl) flexGridEl.hidden = false;
    if (btnMarkAll) btnMarkAll.disabled = false;

    staffList.forEach((st, sIdx) => {
      const ldetailArr = (st.ldetail || "").padEnd(daysInMonth, " ").split("");
      const otdetailArr = (st.otdetail || "").split(",").map((v) => Number(v) || 0);
      while (otdetailArr.length < daysInMonth) otdetailArr.push(0);

      // Row 1: Attendance marks
      const trAtt = document.createElement("tr");
      trAtt.className = "att-row-status";

      const tdSl = document.createElement("td");
      tdSl.className = "att-td-sl";
      tdSl.textContent = sIdx + 1;
      trAtt.appendChild(tdSl);

      const tdId = document.createElement("td");
      tdId.className = "att-td-id";
      tdId.textContent = st.staffId;
      trAtt.appendChild(tdId);

      const tdName = document.createElement("td");
      tdName.className = "att-td-name";
      tdName.textContent = st.staffName;
      trAtt.appendChild(tdName);

      for (let d = 1; d <= daysInMonth; d++) {
        const td = document.createElement("td");
        td.className = "att-td-cell";
        const isH = holidaysStr[d - 1] === "1";
        if (isH) td.classList.add("holiday");

        const inp = document.createElement("input");
        inp.type = "text";
        inp.maxLength = 1;
        const curChar = ldetailArr[d - 1] === " " ? "" : ldetailArr[d - 1];
        inp.value = curChar;
        inp.className = "att-input-code";
        if (curChar) inp.classList.add("code-" + curChar.toLowerCase());

        inp.addEventListener("focus", () => inp.select());

        inp.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" || e.key === "Delete") {
            inp.value = "";
            inp.className = "att-input-code";
            ldetailArr[d - 1] = " ";
            st.ldetail = ldetailArr.join("");
            isModified = true;
          } else if (e.key === "ArrowRight") {
            const next = td.nextElementSibling?.querySelector("input");
            if (next) next.focus();
          } else if (e.key === "ArrowLeft") {
            const prev = td.previousElementSibling?.querySelector("input");
            if (prev) prev.focus();
          }
        });

        inp.addEventListener("input", (e) => {
          let val = (e.target.value || "").toUpperCase();
          if (!ALLOWED_ATT_CHARS.includes(val)) {
            val = "";
          }
          inp.value = val;
          inp.className = "att-input-code" + (val ? " code-" + val.toLowerCase() : "");
          ldetailArr[d - 1] = val || " ";
          st.ldetail = ldetailArr.join("");
          isModified = true;

          // Auto-advance to next day cell
          if (val && td.nextElementSibling) {
            const nextInp = td.nextElementSibling.querySelector("input");
            if (nextInp) nextInp.focus();
          }
        });

        td.appendChild(inp);
        trAtt.appendChild(td);
      }
      gridBody.appendChild(trAtt);

      // Row 2: Overtime hours (OT hrs)
      const trOt = document.createElement("tr");
      trOt.className = "att-row-ot";

      const tdOtBlank1 = document.createElement("td");
      tdOtBlank1.className = "att-td-ot-blank";
      trOt.appendChild(tdOtBlank1);

      const tdOtBlank2 = document.createElement("td");
      tdOtBlank2.className = "att-td-ot-blank";
      trOt.appendChild(tdOtBlank2);

      const tdOtLabel = document.createElement("td");
      tdOtLabel.className = "att-td-ot-label";
      tdOtLabel.textContent = "OT hrs";
      trOt.appendChild(tdOtLabel);

      for (let d = 1; d <= daysInMonth; d++) {
        const td = document.createElement("td");
        td.className = "att-td-ot-cell";

        const inp = document.createElement("input");
        inp.type = "text";
        inp.value = otdetailArr[d - 1] > 0 ? otdetailArr[d - 1] : "";
        inp.className = "att-input-ot";
        inp.placeholder = "0";

        inp.addEventListener("focus", () => inp.select());

        inp.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" || e.key === "Delete") {
            inp.value = "";
            otdetailArr[d - 1] = 0;
            st.otdetail = otdetailArr.join(",");
            isModified = true;
          } else if (e.key === "ArrowRight") {
            const next = td.nextElementSibling?.querySelector("input");
            if (next) next.focus();
          } else if (e.key === "ArrowLeft") {
            const prev = td.previousElementSibling?.querySelector("input");
            if (prev) prev.focus();
          }
        });

        inp.addEventListener("change", (e) => {
          let num = parseFloat(e.target.value);
          if (isNaN(num) || num <= 0) {
            num = 0;
            inp.value = "";
          } else {
            inp.value = num;
          }
          otdetailArr[d - 1] = num;
          st.otdetail = otdetailArr.join(",");
          isModified = true;
        });

        td.appendChild(inp);
        trOt.appendChild(td);
      }
      gridBody.appendChild(trOt);
    });
  }

  function markAllPresent() {
    if (staffList.length === 0) return;
    staffList.forEach((st) => {
      let lArr = (st.ldetail || "").padEnd(daysInMonth, " ").split("");
      for (let d = 0; d < daysInMonth; d++) {
        if (holidaysStr[d] === "1") {
          lArr[d] = "H";
        } else {
          lArr[d] = "P";
        }
      }
      st.ldetail = lArr.join("");
    });
    isModified = true;
    renderGrid();
  }

  async function saveAttendance() {
    if (staffList.length === 0) {
      alert("No staff records available. Please add employees in Staff Master first.");
      return;
    }

    const payload = {
      year: activeYear,
      monthId: activeMonthId,
      holidays: holidaysStr,
      records: staffList.map((st) => ({
        staffId: st.staffId,
        ldetail: (st.ldetail || "").padEnd(daysInMonth, " ").slice(0, daysInMonth),
        otdetail: (st.otdetail || new Array(daysInMonth).fill("0").join(","))
      }))
    };

    try {
      const res = await fetch("/api/attendance/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save attendance.");
        return;
      }
      alert(data.message || "Attendance saved successfully.");
      isModified = false;
      loadAttendanceData(activeYear, activeMonthId);
    } catch (e) {
      console.error("Save error:", e);
      alert("Error saving attendance: " + e.message);
    }
  }

  function printAttendance() {
    if (isModified) {
      if (confirm("Do you want to save changes before printing?")) {
        saveAttendance().then(() => {
          openPrintWindow();
        });
        return;
      }
    }
    openPrintWindow();
  }

  function openPrintWindow() {
    window.open(`/api/print?type=attendance&year=${activeYear}&monthId=${activeMonthId}`, "_blank");
  }

  function openAttendance() {
    if (!section) return;
    section.hidden = false;
    section.focus?.();
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    loadAttendanceData(curYear, curMonth);
  }

  function closeAttendance() {
    if (!section) return;
    if (isModified && !confirm("Discard unsaved changes?")) {
      return;
    }
    section.hidden = true;
  }

  // Event Listeners
  if (yearInput) {
    yearInput.addEventListener("change", () => {
      const yr = Number(yearInput.value);
      if (yr >= 1990 && yr <= 2099) {
        activeYear = yr;
        loadAttendanceData(activeYear, activeMonthId);
      }
    });
  }

  if (btnMarkAll) btnMarkAll.addEventListener("click", markAllPresent);
  if (btnSave) btnSave.addEventListener("click", saveAttendance);
  if (btnPrinter) btnPrinter.addEventListener("click", printAttendance);
  if (btnClose) btnClose.addEventListener("click", closeAttendance);
  if (btnCloseTop) btnCloseTop.addEventListener("click", closeAttendance);

  // Global window exposure
  window.openAttendance = openAttendance;
  window.closeAttendance = closeAttendance;
})();
