(() => {
  const panel = document.querySelector("#item");
  const categoryList = document.querySelector("#item-categories");
  const changeBox = document.querySelector("#item-change");
  const changeList = document.querySelector("#item-change-list");
  const codeBox = document.querySelector("#item-code");
  const drgBox = document.querySelector("#item-drg");
  const nameBox = document.querySelector("#item-name");
  const detailBox = document.querySelector("#item-detail");
  const desnBox = document.querySelector("#item-desn");
  const rateBox = document.querySelector("#item-rate");
  const rolBox = document.querySelector("#item-rol");
  const rackBox = document.querySelector("#item-rack");
  const tariffBox = document.querySelector("#item-tariff");
  const tariffList = document.querySelector("#item-tariffs");
  const gstRateBox = document.querySelector("#item-gstrate");
  const cycleBox = document.querySelector("#item-cycle");
  const inactiveBox = document.querySelector("#item-inactive");
  const showHiddenBox = document.querySelector("#item-show-hidden");
  const measureBox = document.querySelector("#item-measure");
  const purchaseBox = document.querySelector("#item-purchase");
  const convertBox = document.querySelector("#item-convert");
  const equateRow = document.querySelector("#item-equate");
  const stockLabel = document.querySelector("#item-stock-label");
  const purchaseLabel = document.querySelector("#item-purchase-label");
  const nameList = document.querySelector("#item-names");
  const countLabel = document.querySelector("#item-count");
  const moreButton = document.querySelector("#item-more");
  const assignButton = document.querySelector("#item-assign");
  const newButton = document.querySelector("#item-new");
  const saveButton = document.querySelector("#item-save");
  const modifyButton = document.querySelector("#item-modify");
  const deleteButton = document.querySelector("#item-delete");
  const status = document.querySelector("#item-status");
  const measurePanel = document.querySelector("#measure");
  const measureCode = document.querySelector("#measure-code");
  const measureName = document.querySelector("#measure-name");
  const measureNames = document.querySelector("#measure-names");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const info = document.querySelector("#info");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");

  let items = [];
  let categories = [];
  let measures = [];
  let nextId = 1;
  let mode = "view";
  let rightLevel = null;
  let title = "";
  let place = -1;
  let currentCategory = null;
  let f6 = 0;
  let openedEmpty = false;

  function showInfo(message) {
    infoTitle.textContent = title || "Tamba ERP";
    infoText.textContent = message;
    info.hidden = false;
    document.querySelector("#info-ok").focus();
  }

  function askYesNo(message) {
    return new Promise((resolve) => {
      askTitle.textContent = title || "Tamba ERP";
      askText.textContent = message;
      ask.hidden = false;
      const yes = document.querySelector("#ask-yes");
      const no = document.querySelector("#ask-no");
      function finish(answer) {
        ask.hidden = true;
        yes.removeEventListener("click", onYes);
        no.removeEventListener("click", onNo);
        resolve(answer);
      }
      function onYes() { finish(true); }
      function onNo() { finish(false); }
      yes.addEventListener("click", onYes);
      no.addEventListener("click", onNo);
      no.focus();
    });
  }

  function byte() {
    return rightLevel == null ? null : (Number(rightLevel) & 255);
  }

  function applyViewButtons() {
    saveButton.disabled = true;
    newButton.disabled = false;
    deleteButton.disabled = false;
    modifyButton.disabled = false;
    const level = byte();
    if (level === 7) deleteButton.disabled = true;
    else if (level === 3) {
      deleteButton.disabled = true;
      modifyButton.disabled = true;
    } else if (level === 1 || level === 0) {
      newButton.disabled = true;
      deleteButton.disabled = true;
      modifyButton.disabled = true;
    }
  }

  function applyNewButtons() {
    saveButton.disabled = false;
    newButton.disabled = true;
    deleteButton.disabled = true;
    modifyButton.disabled = true;
    const level = byte();
    if (level === 1 || level === 0) saveButton.disabled = true;
  }

  function fillSelect(list, rows, valueKey, textKey) {
    const selected = list.value;
    list.replaceChildren();
    for (const row of rows) {
      const option = document.createElement("option");
      option.value = String(row[valueKey]);
      option.textContent = row[textKey];
      list.append(option);
    }
    if (selected) list.value = selected;
  }

  function inCategory() {
    return items
      .filter((row) => row.categoryId === currentCategory)
      .sort((a, b) => a.id - b.id);
  }

  function visibleRows() {
    return inCategory()
      .filter((row) => (showHiddenBox.checked ? row.hide : !row.hide))
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { sensitivity: "base" }));
  }

  function renderNames() {
    const rows = visibleRows();
    fillSelect(nameList, rows, "id", "code");
    countLabel.textContent = String(rows.length);
  }

  function renderMeasures() {
    const stock = measureBox.value;
    const purchase = purchaseBox.value;
    measureBox.replaceChildren();
    purchaseBox.replaceChildren();
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "";
    measureBox.append(blank);
    purchaseBox.append(blank.cloneNode(true));
    for (const row of measures) {
      const option = document.createElement("option");
      option.value = row.code;
      option.textContent = row.code;
      measureBox.append(option);
      purchaseBox.append(option.cloneNode(true));
    }
    measureBox.value = stock;
    purchaseBox.value = purchase;
    fillSelect(measureNames, measures, "code", "code");
  }

  let conversionKey = "";

  function sameUnits() {
    const measure = measureBox.value.trim();
    const purchase = purchaseBox.value.trim();
    return measure && purchase && measure.toUpperCase() === purchase.toUpperCase();
  }

  function updateLabels(fromUser) {
    const measure = measureBox.value.trim();
    const purchase = purchaseBox.value.trim();
    const key = measure.toUpperCase() + "\n" + purchase.toUpperCase();
    purchaseLabel.textContent = purchase ? "1 " + purchase + " =" : "1 =";
    stockLabel.textContent = measure;
    if (sameUnits()) {
      convertBox.value = "1";
      convertBox.readOnly = true;
    } else {
      convertBox.readOnly = false;
      if (fromUser && key !== conversionKey) convertBox.value = "";
    }
    conversionKey = key;
    equateRow.hidden = false;
  }

  function showItem(row) {
    mode = "edit";
    f6 = 0;
    changeBox.hidden = true;
    categoryList.disabled = false;
    currentCategory = row.categoryId;
    categoryList.value = String(row.categoryId);
    codeBox.value = row.code;
    drgBox.value = row.drg || "";
    nameBox.value = row.name;
    detailBox.value = row.detail || "";
    desnBox.value = row.desn || "";
    rateBox.value = row.rate == null ? "" : String(row.rate);
    rolBox.value = row.rol;
    rackBox.value = row.rack;
    tariffBox.value = row.hsnCode || row.tariff || "8482";
    if (gstRateBox) gstRateBox.value = row.gstRate != null ? String(row.gstRate) : "18";
    cycleBox.value = row.cycle == null ? "" : String(row.cycle);
    inactiveBox.checked = row.hide;
    measureBox.value = row.measure;
    purchaseBox.value = row.purchase;
    convertBox.value = row.convert == null ? "" : String(row.convert);
    updateLabels();
    place = inCategory().findIndex((item) => item.id === row.id);
    renderNames();
    nameList.value = String(row.id);
    moreButton.hidden = false;
    assignButton.hidden = false;
    applyViewButtons();
  }

  function showPlace(index) {
    const rows = inCategory();
    if (!rows.length) return;
    showItem(rows[index]);
  }

  function clearFields() {
    codeBox.value = "";
    drgBox.value = "";
    nameBox.value = "";
    detailBox.value = "";
    desnBox.value = "";
    rateBox.value = "";
    rolBox.value = "";
    rackBox.value = "";
  }

  function startNew() {
    mode = "new";
    place = -1;
    f6 = 0;
    changeBox.hidden = true;
    categoryList.disabled = false;
    clearFields();
    tariffBox.value = "8482";
    if (gstRateBox) gstRateBox.value = "18";
    moreButton.hidden = true;
    assignButton.hidden = true;
    renderNames();
    nameList.selectedIndex = -1;
    convertBox.value = "";
    conversionKey = "";
    updateLabels(false);
    applyNewButtons();
    codeBox.focus();
  }

  function blankOpen() {
    mode = "view";
    place = -1;
    clearFields();
    renderNames();
    moreButton.hidden = true;
    assignButton.hidden = true;
    applyViewButtons();
  }

  async function refreshMeasures() {
    const response = await fetch("/api/item");
    const data = await response.json();
    if (!response.ok) return;
    measures = data.measures || [];
    const stock = measureBox.value;
    const purchase = purchaseBox.value;
    renderMeasures();
    measureBox.value = stock;
    purchaseBox.value = purchase;
    updateLabels();
    measurePanel.hidden = false;
  }

  async function loadItem(after) {
    const response = await fetch("/api/item");
    const data = await response.json();
    if (!response.ok) {
      status.textContent = data.error || "";
      return;
    }
    title = data.title || "";
    rightLevel = data.right;
    nextId = data.nextId || 1;
    categories = data.categories || [];
    measures = data.measures || [];
    items = data.items || [];
    fillSelect(categoryList, categories, "id", "name");
    fillSelect(changeList, categories, "id", "name");
    renderMeasures();
    tariffList.replaceChildren();
    for (const tariff of data.tariffs || []) {
      const option = document.createElement("option");
      option.value = tariff;
      tariffList.append(option);
    }
    if (after === "open") {
      panel.hidden = false;
      openedEmpty = items.length === 0;
      if (items.length) {
        currentCategory = data.focusCategoryId;
        categoryList.value = String(currentCategory);
        blankOpen();
      } else {
        currentCategory = categories.length ? categories[0].id : null;
        if (currentCategory != null) categoryList.value = String(currentCategory);
        blankOpen();
        showInfo("No Records to Display!");
      }
      return;
    }
    if (typeof after === "number") {
      const row = items.find((item) => item.id === after);
      if (row) showItem(row);
      else if (inCategory().length) showItem(inCategory()[inCategory().length - 1]);
      else startNew();
      return;
    }
    if (inCategory().length) showItem(inCategory()[inCategory().length - 1]);
    else startNew();
  }

  function payload() {
    return {
      mode,
      id: nextId && mode === "new" ? nextId : Number(items.find((row) => row.code === codeBox.value.trim())?.id || 0),
      code: codeBox.value,
      drg: drgBox.value,
      name: nameBox.value,
      detail: detailBox.value,
      desn: desnBox.value,
      categoryId: Number(categoryList.value),
      measure: measureBox.value,
      purchase: purchaseBox.value,
      convert: convertBox.value,
      rate: rateBox.value,
      rol: rolBox.value,
      rack: rackBox.value,
      tariff: tariffBox.value,
      hsnCode: tariffBox.value || "8482",
      gstRate: gstRateBox ? Number(gstRateBox.value) : 18,
      cycle: cycleBox.value,
      hide: inactiveBox.checked
    };
  }

  async function saveItem() {
    const body = payload();
    if (mode === "edit") {
      const current = inCategory()[place];
      if (current) body.id = current.id;
    }
    const first = await fetch("/api/item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const preview = await first.json();
    if (!first.ok || preview.ok === false) {
      if (preview.message) showInfo(preview.message);
      return;
    }
    if (!preview.ready) return;
    const question = mode === "edit" ? "Are You Sure To Modify ?" : "Are You Sure To Save ?";
    if (!await askYesNo(question)) return;
    const second = await fetch("/api/item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ confirmed: true }, body))
    });
    const saved = await second.json();
    if (saved.message) showInfo(saved.message);
    if (saved.ok && saved.id) await loadItem(saved.id);
  }

  async function deleteItem() {
    const current = inCategory()[place];
    const body = { id: current ? current.id : 0 };
    const first = await fetch("/api/item/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const preview = await first.json();
    if (!first.ok || preview.ok === false) {
      if (preview.message) showInfo(preview.message);
      return;
    }
    if (!preview.ready) return;
    if (!await askYesNo("Are You Sure To Delete ?")) return;
    const second = await fetch("/api/item/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ confirmed: true }, body))
    });
    const data = await second.json();
    if (data.message) showInfo(data.message);
    if (data.ok) await loadItem("stay");
  }

  async function confirmCategory() {
    const categoryId = Number(changeList.value);
    const code = codeBox.value.trim();
    if (!categoryId || !code) {
      showInfo("Category Change Unsuccessful!!!");
      return;
    }
    const response = await fetch("/api/item/category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, code })
    });
    const data = await response.json();
    if (data.message) showInfo(data.message);
    f6 = 0;
    changeBox.hidden = true;
    categoryList.disabled = false;
    if (data.ok) {
      currentCategory = categoryId;
      const current = items.find((row) => row.code === code);
      await loadItem(current ? current.id : "stay");
    }
  }

  function markTyped() {
    newButton.disabled = true;
    deleteButton.disabled = true;
  }

  categoryList.addEventListener("click", () => {
    const id = Number(categoryList.value);
    if (!id) return;
    currentCategory = id;
    const rows = inCategory();
    if (!rows.length) {
      renderNames();
      showInfo("No Records in this CATEGORY to Display!");
      startNew();
      return;
    }
    showItem(rows[rows.length - 1]);
  });
  nameList.addEventListener("click", () => {
    const row = items.find((item) => String(item.id) === nameList.value);
    if (row) showItem(row);
  });
  showHiddenBox.addEventListener("change", renderNames);
  measureBox.addEventListener("change", () => updateLabels(true));
  purchaseBox.addEventListener("change", () => {
    if (!measureBox.value && purchaseBox.value) {
      showInfo("You have to select the 'Unit of Measurement (for Stock Purpose)'...");
      measureBox.focus();
    }
    updateLabels(true);
  });
  codeBox.addEventListener("input", markTyped);
  drgBox.addEventListener("input", markTyped);
  nameBox.addEventListener("input", markTyped);
  detailBox.addEventListener("input", markTyped);
  desnBox.addEventListener("input", markTyped);
  newButton.addEventListener("click", startNew);
  saveButton.addEventListener("click", saveItem);
  modifyButton.addEventListener("click", () => {
    mode = "edit";
    saveItem();
  });
  deleteButton.addEventListener("click", deleteItem);
  document.querySelector("#item-first").addEventListener("click", () => showPlace(0));
  document.querySelector("#item-last").addEventListener("click", () => showPlace(inCategory().length - 1));
  document.querySelector("#item-next").addEventListener("click", () => {
    const rows = inCategory();
    if (!rows.length || place < 0) return;
    showPlace(place + 1 >= rows.length ? 0 : place + 1);
  });
  document.querySelector("#item-prev").addEventListener("click", () => {
    const rows = inCategory();
    if (!rows.length || place < 0) return;
    showPlace(place - 1 < 0 ? rows.length - 1 : place - 1);
  });
  document.querySelector("#item-upload").addEventListener("click", () => {
    status.textContent = "Form: frmUpload. This screen is not built yet.";
  });
  // --- More Details (Component Master: frmCompMaster) ---
  const moreModal = document.querySelector("#item-more-modal");
  const compCloseBtn = document.querySelector("#item-more-close-btn");
  const compCancelBtn = document.querySelector("#comp-cancel-btn");
  const compSaveBtn = document.querySelector("#comp-save-btn");
  const compItemCode = document.querySelector("#comp-item-code");
  const compItemName = document.querySelector("#comp-item-name");
  const compItemDrg = document.querySelector("#comp-item-drg");
  const compRmId = document.querySelector("#comp-rm-id");
  const compGeometry = document.querySelector("#comp-geometry");
  const compGrade = document.querySelector("#comp-grade");
  const compDia = document.querySelector("#comp-dia");
  const compCutLength = document.querySelector("#comp-cut-length");
  const compWeight = document.querySelector("#comp-weight");
  const compFinWeight = document.querySelector("#comp-fin-weight");
  const compScrapDisplay = document.querySelector("#comp-scrap-weight-display");
  const compScrapPctDisplay = document.querySelector("#comp-scrap-pct-display");
  const compCycleTime = document.querySelector("#comp-cycle-time");
  const compMachineType = document.querySelector("#comp-machine-type");
  const compDrgRevNo = document.querySelector("#comp-drg-rev-no");
  const compDrgRevDate = document.querySelector("#comp-drg-rev-date");
  const compOpDesc = document.querySelector("#comp-op-desc");
  const compToolingNotes = document.querySelector("#comp-tooling-notes");
  const compRemarks = document.querySelector("#comp-remarks");
  const compStatus = document.querySelector("#comp-status");

  function calcCompScrap() {
    const gross = parseFloat(compWeight.value) || 0;
    const fin = parseFloat(compFinWeight.value) || 0;
    const scrap = Math.max(0, gross - fin);
    if (compScrapDisplay) compScrapDisplay.textContent = scrap > 0 ? `${scrap.toFixed(4)} Kg` : "0.0000 Kg";
    const pct = gross > 0 ? ((scrap / gross) * 100).toFixed(1) : "0.0";
    if (compScrapPctDisplay) compScrapPctDisplay.textContent = `Scrap Rate: ${pct}%`;
  }
  if (compWeight) compWeight.addEventListener("input", calcCompScrap);
  if (compFinWeight) compFinWeight.addEventListener("input", calcCompScrap);

  async function openMoreModal() {
    const rows = inCategory();
    const current = rows[place];
    if (!current) {
      showInfo("Please select an item first to view more details.");
      return;
    }
    if (compStatus) {
      compStatus.textContent = "Loading component specifications...";
      compStatus.style.color = "var(--text-muted)";
    }
    if (moreModal) moreModal.hidden = false;

    if (compItemCode) compItemCode.textContent = current.code || "-";
    if (compItemName) compItemName.textContent = current.name || "-";
    if (compItemDrg) compItemDrg.textContent = current.drg || "-";

    try {
      const res = await fetch(`/api/item/more-details?itemId=${current.id}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (compStatus) {
          compStatus.textContent = data.error || "Failed to load details.";
          compStatus.style.color = "#ef4444";
        }
        return;
      }
      if (compRmId) {
        compRmId.innerHTML = '<option value="">-- Select Raw Material (Rod / Bar / Hex) --</option>';
        for (const rm of data.rawMaterials || []) {
          const opt = document.createElement("option");
          opt.value = rm.id;
          opt.textContent = `${rm.code} - ${rm.name} (${rm.unit || 'Kg'})`;
          compRmId.appendChild(opt);
        }
      }

      const det = data.details || {};
      if (compRmId) compRmId.value = det.rmId ? String(det.rmId) : "";
      if (compGeometry) compGeometry.value = det.geometry || "Round Bar";
      if (compGrade) compGrade.value = det.grade || "";
      if (compDia) compDia.value = det.diaThickness != null ? det.diaThickness : "";
      if (compCutLength) compCutLength.value = det.cutLength != null ? det.cutLength : "";
      if (compWeight) compWeight.value = det.weight != null ? det.weight : "";
      if (compFinWeight) compFinWeight.value = det.finishedWeight != null ? det.finishedWeight : "";
      if (compCycleTime) compCycleTime.value = det.cycleTime != null ? det.cycleTime : (current.cycle != null ? current.cycle : "");
      if (compMachineType) compMachineType.value = det.machineType || "";
      if (compDrgRevNo) compDrgRevNo.value = det.drgRevNo || "";
      if (compDrgRevDate) compDrgRevDate.value = det.drgRevDate || "";
      if (compOpDesc) compOpDesc.value = det.operationDesc || "";
      if (compToolingNotes) compToolingNotes.value = det.toolingNotes || "";
      if (compRemarks) compRemarks.value = det.remarks || "";

      calcCompScrap();
      if (compStatus) {
        compStatus.textContent = det.rmId || det.weight ? "Loaded technical specifications." : "No existing specifications found. You can enter and save new details.";
        compStatus.style.color = "var(--text-muted)";
      }
    } catch (err) {
      if (compStatus) {
        compStatus.textContent = "Network error loading details: " + err.message;
        compStatus.style.color = "#ef4444";
      }
    }
  }

  function closeMoreModal() {
    if (moreModal) moreModal.hidden = true;
  }
  if (compCloseBtn) compCloseBtn.addEventListener("click", closeMoreModal);
  if (compCancelBtn) compCancelBtn.addEventListener("click", closeMoreModal);

  if (compSaveBtn) {
    compSaveBtn.addEventListener("click", async () => {
      const rows = inCategory();
      const current = rows[place];
      if (!current) return;

      compSaveBtn.disabled = true;
      if (compStatus) {
        compStatus.textContent = "Saving specifications...";
        compStatus.style.color = "var(--text-muted)";
      }

      const gross = parseFloat(compWeight.value) || 0;
      const fin = parseFloat(compFinWeight.value) || 0;
      const scrap = Math.max(0, gross - fin);

      const body = {
        itemId: current.id,
        rmId: compRmId && compRmId.value ? Number(compRmId.value) : null,
        geometry: compGeometry ? compGeometry.value : "Round Bar",
        grade: compGrade ? compGrade.value.trim() : "",
        diaThickness: compDia && compDia.value ? parseFloat(compDia.value) : null,
        cutLength: compCutLength && compCutLength.value ? parseFloat(compCutLength.value) : null,
        weight: compWeight && compWeight.value ? parseFloat(compWeight.value) : null,
        finishedWeight: compFinWeight && compFinWeight.value ? parseFloat(compFinWeight.value) : null,
        scrapWeight: scrap > 0 ? scrap : null,
        cycleTime: compCycleTime && compCycleTime.value ? parseFloat(compCycleTime.value) : null,
        machineType: compMachineType ? compMachineType.value.trim() : "",
        drgRevNo: compDrgRevNo ? compDrgRevNo.value.trim() : "",
        drgRevDate: compDrgRevDate && compDrgRevDate.value ? compDrgRevDate.value : null,
        operationDesc: compOpDesc ? compOpDesc.value.trim() : "",
        toolingNotes: compToolingNotes ? compToolingNotes.value.trim() : "",
        remarks: compRemarks ? compRemarks.value.trim() : ""
      };

      try {
        const res = await fetch("/api/item/more-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const result = await res.json();
        if (res.ok && result.ok) {
          if (compStatus) {
            compStatus.textContent = "✓ Specifications saved successfully!";
            compStatus.style.color = "#10b981";
          }
          if (body.cycleTime != null && cycleBox) {
            cycleBox.value = String(body.cycleTime);
            current.cycle = body.cycleTime;
          }
          setTimeout(() => {
            closeMoreModal();
          }, 800);
        } else {
          if (compStatus) {
            compStatus.textContent = result.error || result.message || "Failed to save.";
            compStatus.style.color = "#ef4444";
          }
        }
      } catch (err) {
        if (compStatus) {
          compStatus.textContent = "Error: " + err.message;
          compStatus.style.color = "#ef4444";
        }
      } finally {
        compSaveBtn.disabled = false;
      }
    });
  }

  moreButton.addEventListener("click", openMoreModal);

  // --- Assign To... (Party Cross-Reference: frmItemAssign) ---
  const assignModal = document.querySelector("#item-assign-modal");
  const assignCloseBtn = document.querySelector("#item-assign-close-btn");
  const assignCancelBtn = document.querySelector("#assign-close-btn");
  const assignItemCode = document.querySelector("#assign-item-code");
  const assignItemName = document.querySelector("#assign-item-name");
  const assignItemDrg = document.querySelector("#assign-item-drg");
  const assignTabCust = document.querySelector("#assign-tab-cust");
  const assignTabVend = document.querySelector("#assign-tab-vend");
  const assignTabSupp = document.querySelector("#assign-tab-supp");
  const assignCntCust = document.querySelector("#assign-cnt-cust");
  const assignCntVend = document.querySelector("#assign-cnt-vend");
  const assignCntSupp = document.querySelector("#assign-cnt-supp");
  const assignFormLegend = document.querySelector("#assign-form-legend");
  const assignPartyLabel = document.querySelector("#assign-party-label");
  const assignPartySelect = document.querySelector("#assign-party-select");
  const assignPartyCode = document.querySelector("#assign-party-code");
  const assignPartyDesc = document.querySelector("#assign-party-desc");
  const assignPartyRate = document.querySelector("#assign-party-rate");
  const assignSubmitBtn = document.querySelector("#assign-submit-btn");
  const assignTableBody = document.querySelector("#assign-table-body");
  const assignStatus = document.querySelector("#assign-status");

  let currentClassId = 1; // 1: Customer, 2: Vendor, 3: Supplier
  let partyLists = { customers: [], vendors: [], suppliers: [], assignments: [] };

  function renderAssignClass() {
    [assignTabCust, assignTabVend, assignTabSupp].forEach((btn, idx) => {
      if (!btn) return;
      const cls = idx + 1;
      if (cls === currentClassId) {
        btn.classList.add("active");
        btn.style.background = "var(--primary, #007aff)";
        btn.style.color = "#fff";
        btn.style.borderColor = "var(--primary, #007aff)";
      } else {
        btn.classList.remove("active");
        btn.style.background = "var(--bg-card)";
        btn.style.color = "var(--text-main)";
        btn.style.borderColor = "var(--border-color)";
      }
    });

    if (assignFormLegend && assignPartyLabel && assignSubmitBtn) {
      if (currentClassId === 1) {
        assignFormLegend.textContent = "+ Assign New Customer";
        assignPartyLabel.textContent = "Select Customer";
        assignSubmitBtn.textContent = "+ Assign Customer";
      } else if (currentClassId === 2) {
        assignFormLegend.textContent = "+ Assign New Vendor / Subcontractor";
        assignPartyLabel.textContent = "Select Vendor";
        assignSubmitBtn.textContent = "+ Assign Vendor";
      } else {
        assignFormLegend.textContent = "+ Assign New Supplier";
        assignPartyLabel.textContent = "Select Supplier";
        assignSubmitBtn.textContent = "+ Assign Supplier";
      }
    }

    if (assignPartySelect) {
      const parties = currentClassId === 1 ? partyLists.customers : (currentClassId === 2 ? partyLists.vendors : partyLists.suppliers);
      assignPartySelect.innerHTML = `<option value="">-- Choose ${currentClassId === 1 ? 'Customer' : (currentClassId === 2 ? 'Vendor' : 'Supplier')} --</option>`;
      for (const p of parties) {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        assignPartySelect.appendChild(opt);
      }
    }

    if (assignPartyCode) assignPartyCode.value = "";
    if (assignPartyDesc) assignPartyDesc.value = "";
    if (assignPartyRate) assignPartyRate.value = "";

    if (!assignTableBody) return;
    const list = partyLists.assignments.filter((a) => a.classId === currentClassId);
    if (!list.length) {
      assignTableBody.innerHTML = `<tr><td colspan="6" style="padding:24px; text-align:center; color:var(--text-muted);">No ${currentClassId === 1 ? 'customers' : (currentClassId === 2 ? 'vendors' : 'suppliers')} assigned yet. Select a party above to assign.</td></tr>`;
      return;
    }

    assignTableBody.innerHTML = list.map((a) => `
      <tr style="border-bottom:1px solid var(--border-color); background:var(--bg-surface);">
        <td style="padding:8px 12px; font-weight:600; color:var(--text-muted);">${a.className}</td>
        <td style="padding:8px 12px; font-weight:600; color:var(--text-main);">${a.partyName}</td>
        <td style="padding:8px 12px; font-family:monospace; color:var(--primary, #007aff);">${a.partyItemCode || '-'}</td>
        <td style="padding:8px 12px; color:var(--text-muted);">${a.partyItemDesc || '-'}</td>
        <td style="padding:8px 12px; text-align:right; font-weight:600; color:var(--text-main);">${a.partyRate != null ? '₹ ' + a.partyRate.toFixed(2) : '-'}</td>
        <td style="padding:8px 12px; text-align:center;">
          <button type="button" class="btn-unassign" data-party="${a.partyId}" data-class="${a.classId}" data-name="${a.partyName}" style="background:#ef4444; color:#fff; border:none; padding:3px 10px; border-radius:4px; font-size:11px; cursor:pointer;">Unassign</button>
        </td>
      </tr>
    `).join("");

    assignTableBody.querySelectorAll(".btn-unassign").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const partyId = Number(btn.getAttribute("data-party"));
        const classId = Number(btn.getAttribute("data-class"));
        const partyName = btn.getAttribute("data-name");
        if (!confirm(`Are you sure you want to remove assignment for ${partyName}?`)) return;

        const rows = inCategory();
        const current = rows[place];
        if (!current) return;

        try {
          const res = await fetch("/api/item/unassign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId: current.id, partyId, classId })
          });
          const result = await res.json();
          if (res.ok && result.ok) {
            if (assignStatus) {
              assignStatus.textContent = "✓ Assignment removed.";
              assignStatus.style.color = "#10b981";
            }
            await loadAssignments(current.id);
          } else {
            if (assignStatus) {
              assignStatus.textContent = result.error || "Failed to remove assignment.";
              assignStatus.style.color = "#ef4444";
            }
          }
        } catch (err) {
          if (assignStatus) {
            assignStatus.textContent = "Error: " + err.message;
            assignStatus.style.color = "#ef4444";
          }
        }
      });
    });
  }

  if (assignTabCust) assignTabCust.addEventListener("click", () => { currentClassId = 1; renderAssignClass(); });
  if (assignTabVend) assignTabVend.addEventListener("click", () => { currentClassId = 2; renderAssignClass(); });
  if (assignTabSupp) assignTabSupp.addEventListener("click", () => { currentClassId = 3; renderAssignClass(); });

  async function loadAssignments(itemId) {
    try {
      const res = await fetch(`/api/item/assignments?itemId=${itemId}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (assignStatus) {
          assignStatus.textContent = data.error || "Failed to load assignments.";
          assignStatus.style.color = "#ef4444";
        }
        return;
      }
      partyLists.customers = data.customers || [];
      partyLists.vendors = data.vendors || [];
      partyLists.suppliers = data.suppliers || [];
      partyLists.assignments = data.assignments || [];

      if (assignCntCust) assignCntCust.textContent = partyLists.assignments.filter((a) => a.classId === 1).length;
      if (assignCntVend) assignCntVend.textContent = partyLists.assignments.filter((a) => a.classId === 2).length;
      if (assignCntSupp) assignCntSupp.textContent = partyLists.assignments.filter((a) => a.classId === 3).length;

      renderAssignClass();
    } catch (err) {
      if (assignStatus) {
        assignStatus.textContent = "Error: " + err.message;
        assignStatus.style.color = "#ef4444";
      }
    }
  }

  async function openAssignModal() {
    const rows = inCategory();
    const current = rows[place];
    if (!current) {
      showInfo("Please select an item first to manage assignments.");
      return;
    }
    if (assignStatus) assignStatus.textContent = "";
    if (assignModal) assignModal.hidden = false;

    if (assignItemCode) assignItemCode.textContent = current.code || "-";
    if (assignItemName) assignItemName.textContent = current.name || "-";
    if (assignItemDrg) assignItemDrg.textContent = current.drg || "-";

    await loadAssignments(current.id);
  }

  function closeAssignModal() {
    if (assignModal) assignModal.hidden = true;
  }
  if (assignCloseBtn) assignCloseBtn.addEventListener("click", closeAssignModal);
  if (assignCancelBtn) assignCancelBtn.addEventListener("click", closeAssignModal);

  if (assignSubmitBtn) {
    assignSubmitBtn.addEventListener("click", async () => {
      const rows = inCategory();
      const current = rows[place];
      if (!current) return;

      const partyId = Number(assignPartySelect.value);
      if (!partyId) {
        if (assignStatus) {
          assignStatus.textContent = "Please select a party to assign.";
          assignStatus.style.color = "#ef4444";
        }
        assignPartySelect.focus();
        return;
      }

      assignSubmitBtn.disabled = true;
      if (assignStatus) {
        assignStatus.textContent = "Assigning party...";
        assignStatus.style.color = "var(--text-muted)";
      }

      const body = {
        itemId: current.id,
        partyId,
        classId: currentClassId,
        partyItemCode: assignPartyCode ? assignPartyCode.value.trim() : "",
        partyItemDesc: assignPartyDesc ? assignPartyDesc.value.trim() : "",
        partyRate: assignPartyRate && assignPartyRate.value ? parseFloat(assignPartyRate.value) : null
      };

      try {
        const res = await fetch("/api/item/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const result = await res.json();
        if (res.ok && result.ok) {
          if (assignStatus) {
            assignStatus.textContent = "✓ Party assigned successfully!";
            assignStatus.style.color = "#10b981";
          }
          await loadAssignments(current.id);
        } else {
          if (assignStatus) {
            assignStatus.textContent = result.error || result.message || "Failed to assign.";
            assignStatus.style.color = "#ef4444";
          }
        }
      } catch (err) {
        if (assignStatus) {
          assignStatus.textContent = "Error: " + err.message;
          assignStatus.style.color = "#ef4444";
        }
      } finally {
        assignSubmitBtn.disabled = false;
      }
    });
  }

  assignButton.addEventListener("click", openAssignModal);
  document.querySelector("#item-add-units").addEventListener("click", () => {
    measurePanel.hidden = false;
    measureCode.value = "";
    measureName.value = "";
    measureCode.focus();
  });
  document.querySelector("#measure-close").addEventListener("click", () => {
    measurePanel.hidden = true;
  });
  document.querySelector("#measure-save").addEventListener("click", async () => {
    const body = { code: measureCode.value, name: measureName.value };
    const first = await fetch("/api/measure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const preview = await first.json();
    if (!first.ok || preview.ok === false) {
      if (preview.message) showInfo(preview.message);
      return;
    }
    if (!await askYesNo("Are You Sure To Save")) return;
    const second = await fetch("/api/measure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ confirmed: true }, body))
    });
    const data = await second.json();
    if (data.message) showInfo(data.message);
    if (data.ok) {
      measureCode.value = "";
      measureName.value = "";
      await refreshMeasures();
    }
  });
  document.querySelector("#measure-delete").addEventListener("click", async () => {
    const body = { code: measureNames.value || measureCode.value };
    const first = await fetch("/api/measure/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const preview = await first.json();
    if (!first.ok || preview.ok === false) {
      if (preview.message) showInfo(preview.message);
      return;
    }
    if (!await askYesNo("Are You Sure To Delete ?")) return;
    const second = await fetch("/api/measure/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ confirmed: true }, body))
    });
    const data = await second.json();
    if (data.message) showInfo(data.message);
    if (data.ok) await refreshMeasures();
  });
  measureNames.addEventListener("click", () => {
    const row = measures.find((item) => item.code === measureNames.value);
    if (!row) return;
    measureCode.value = row.code;
    measureName.value = row.name;
  });
  document.querySelector("#item-close").addEventListener("click", closeItem);
  panel.addEventListener("keydown", (event) => {
    if (event.key === "F1") {
      event.preventDefault();
      status.textContent = "Help file: MasInvItem.htm. That page is not in this copy.";
      return;
    }
    if (event.key !== "F6") return;
    event.preventDefault();
    if (modifyButton.disabled) return;
    if (f6 === 0) {
      categoryList.disabled = true;
      changeBox.hidden = false;
      changeList.value = categoryList.value;
      f6 = 1;
      showInfo("After changing the Category Press F6 Key to Confirm");
      return;
    }
    confirmCategory();
  });

  function closeItem() {
    panel.hidden = true;
    measurePanel.hidden = true;
    if (window.closeBom) window.closeBom();
    if (window.closeStore) window.closeStore();
    if (window.closeProcess) window.closeProcess();
    if (window.closeExpense) window.closeExpense();
    if (window.closeIncome) window.closeIncome();
    if (window.closeBanks) window.closeBanks();
    if (window.closeCurrency) window.closeCurrency();
    if (window.closeCurrToday) window.closeCurrToday();
    if (window.closeCost) window.closeCost();
  }

  window.openItem = function openItem() {
    document.querySelector("#notice").hidden = true;
    document.querySelector("#popup").hidden = true;
    if (window.closeCompany) window.closeCompany();
    if (window.closeUsers) window.closeUsers();
    if (window.closeUserRights) window.closeUserRights();
    if (window.closeUserStatus) window.closeUserStatus();
    if (window.closeStaff) window.closeStaff();
    if (window.closeShift) window.closeShift();
    if (window.closeHeadings) window.closeHeadings();
    if (window.closeMachine) window.closeMachine();
    if (window.closeCustomer) window.closeCustomer();
    if (window.closeSupplier) window.closeSupplier();
    if (window.closeVendor) window.closeVendor();
    if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
    status.textContent = "";
    measurePanel.hidden = true;
    loadItem("open");
  };
  window.closeItem = closeItem;
})();
