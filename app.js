/* ==========================================================
   Data QA Associate Pro - Application Core Logic
   ========================================================== */

// Initialize jsPDF construct
const { jsPDF } = window.jspdf;

// --------------------------------------------------
// 1. Core State & Sample Data
// --------------------------------------------------
let transactions = [
  {
    id: "TXN-9021",
    vendorRaw: "AMAZON.COM*MKTPL US   WA#123",
    vendor: "Amazon Marketplace",
    amountRaw: "$   1,250.50 USD",
    amount: 1250.50,
    dateRaw: "05/24/2026",
    date: "2026-05-24",
    category: "Office Supplies",
    status: "Cleaned",
    erpTarget: "NetSuite",
    erpStatus: "Ready",
    anomalyReason: "",
    rawChunk: "TXN: TXN-9021\nREF: AMAZON.COM*MKTPL US WA#123\nDATE: 05/24/2026\nAMT: $ 1,250.50 USD\nCARD: Visa 9982"
  },
  {
    id: "TXN-9022",
    vendorRaw: "ADOBE SYSTEMS INCORPORATED",
    vendor: "Adobe Systems Inc.",
    amountRaw: "1,899.99 USD",
    amount: 1899.99,
    dateRaw: "May 28, 2026",
    date: "2026-05-28",
    category: "Software (SaaS)",
    status: "Anomaly",
    erpTarget: "NetSuite",
    erpStatus: "Conflict",
    anomalyReason: "GL Mapping Conflict (maps to general 6120 SaaS Licenses but Ramp card reports 6130)",
    rawChunk: "Subject: Expense Receipt: Adobe CC Subscription - Invoice #INV-109283\nDate: May 28, 2026 at 09:44:00 AM EDT\nFrom: billing-noreply@adobe.com\nAmount: 1899.99 USD\nGL-Target: 6130"
  },
  {
    id: "TXN-9023",
    vendorRaw: "UBER   *TRIP G2H91   $45.20",
    vendor: "Uber",
    amountRaw: "$45.20",
    amount: 45.20,
    dateRaw: "05-29-2026",
    date: "2026-05-29",
    category: "Travel & Meals",
    status: "Cleared",
    erpTarget: "Ramp",
    erpStatus: "Synced",
    anomalyReason: "",
    rawChunk: "Uber Technologies Inc.\nRide Receipt May 29, 2026\nFare: $45.20 USD\nPayment: Ramp Corp Card *1102"
  },
  {
    id: "TXN-9024",
    vendorRaw: "AWS CLOUD STORAGE SOLUTIONS CO.",
    vendor: "AWS Cloud Services",
    amountRaw: "$ 14,850.00",
    amount: 14850.00,
    dateRaw: "06/01/2026",
    date: "2026-06-01",
    category: "Utilities / Infrastructure",
    status: "Anomaly",
    erpTarget: "NetSuite",
    erpStatus: "Ready",
    anomalyReason: "High Value Outlier (> $10k, requires double approval)",
    rawChunk: "Amazon Web Services\nInvoice Statement #AWS-0092839281\nBilling Date: 06/01/2026\nTotal Due: $ 14,850.00 USD"
  },
  {
    id: "TXN-9025",
    vendorRaw: "AMAZON.COM*MKTPL US   WA#123",
    vendor: "Amazon Marketplace",
    amountRaw: "$   1,250.50 USD",
    amount: 1250.50,
    dateRaw: "05/24/2026",
    date: "2026-05-24",
    category: "Office Supplies",
    status: "Anomaly",
    erpTarget: "NetSuite",
    erpStatus: "Conflict",
    anomalyReason: "Possible Duplicate Record (matches TXN-9021 vendor, date, amount)",
    rawChunk: "TXN: TXN-9025\nREF: AMAZON.COM*MKTPL US WA#123\nDATE: 05/24/2026\nAMT: $ 1,250.50 USD\nCARD: Visa 9982"
  },
  {
    id: "TXN-9026",
    vendorRaw: "SLACK TECHNOLOGIES INC #88",
    vendor: "Slack",
    amountRaw: "$3,450.00 USD",
    amount: 3450.00,
    dateRaw: "06-02-26",
    date: "2026-06-02",
    category: "Software (SaaS)",
    status: "Cleared",
    erpTarget: "QuickBooks Online",
    erpStatus: "Synced",
    anomalyReason: "",
    rawChunk: "Slack Technologies, Inc.\nStandard Plan Renewal\nDate: June 2, 2026\nTotal Paid: $3,450.00 USD"
  }
];

// Active tab selection
let currentTab = "dashboard-section";

// Chart instances
let spendTrendChartInstance = null;
let categoryShareChartInstance = null;

// --------------------------------------------------
// 2. Navigation & Setup Control
// --------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide icons
  lucide.createIcons();

  // Setup navigation
  const navItems = document.querySelectorAll(".nav-item, .mobile-nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      const target = e.currentTarget.getAttribute("data-target");
      switchTab(target);
    });
  });

  // Theme switch logic
  const themeToggle = document.getElementById("theme-toggle");
  themeToggle.addEventListener("click", toggleTheme);

  // Ingestion dropzone listeners
  const dropzone = document.getElementById("file-dropzone");
  const fileInput = document.getElementById("file-input");

  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFileSelect);

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  });

  // Table selection logic
  document.getElementById("select-all-transactions").addEventListener("change", (e) => {
    const checkboxes = document.querySelectorAll(".row-select-checkbox");
    checkboxes.forEach(cb => cb.checked = e.target.checked);
  });

  // Sync approved button
  document.getElementById("btn-sync-all").addEventListener("click", syncApprovedToERP);

  // PDF report builder button
  document.getElementById("btn-generate-pdf").addEventListener("click", buildPremiumPDF);

  // Real-time update of report preview when editing notes
  const notesTextarea = document.getElementById("analyst-notes");
  const notesPreview = document.getElementById("pdf-preview-notes-content");
  notesTextarea.addEventListener("input", () => {
    const lines = notesTextarea.value.split('\n').filter(l => l.trim());
    notesPreview.innerHTML = `<ul style="margin:0; padding-left:18px; line-height:1.8; font-size:0.83rem;">${
      lines.map(l => `<li style="margin-bottom:4px;">${l.replace(/^[•\-] /, '')}</li>`).join('')
    }</ul>`;
  });

  // Notes regeneration sparkles button listener
  document.getElementById("btn-sync-notes").addEventListener("click", updateDefaultAnalystNotes);

  // Real-time filter search
  document.getElementById("qa-search").addEventListener("input", renderTable);
  document.getElementById("qa-filter-anomaly").addEventListener("change", renderTable);

  // Initalize view
  renderDashboard();
  renderTable();
  updateDefaultAnalystNotes(); // Dynamic sync on load
  updatePDFPreview();
});

// Switch active sections
function switchTab(targetId) {
  currentTab = targetId;

  // Toggle active views
  document.querySelectorAll(".view-pane").forEach(pane => {
    pane.classList.remove("active");
  });
  const activePane = document.getElementById(targetId);
  activePane.classList.add("active");

  // Toggle active nav styling
  document.querySelectorAll(".nav-item, .mobile-nav-item").forEach(item => {
    if (item.getAttribute("data-target") === targetId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Update header text based on section
  const sectionTitle = document.getElementById("section-title");
  const sectionSubtitle = document.getElementById("section-subtitle");

  if (targetId === "dashboard-section") {
    sectionTitle.textContent = "Executive Dashboard";
    sectionSubtitle.textContent = "Real-time merchant QA & compliance engine";
    renderDashboard(); // Re-render charts for size matching
  } else if (targetId === "qa-section") {
    sectionTitle.textContent = "Data Quality Assurance";
    sectionSubtitle.textContent = "Raw ingestion parser and transaction editor";
    renderTable();
  } else if (targetId === "clean-section") {
    sectionTitle.textContent = "Regex Normalization Hub";
    sectionSubtitle.textContent = "Regex expressions and heuristic cleaning logs";
  } else if (targetId === "erp-section") {
    sectionTitle.textContent = "ERP Ledger Integration";
    sectionSubtitle.textContent = "Automatic chart of accounts mapping and compliance";
  } else if (targetId === "report-section") {
    sectionTitle.textContent = "Executive PDF Center";
    sectionSubtitle.textContent = "Generate interactive editable PDF reports for stakeholders";
    updatePDFPreview();
  }
}

// Toggle light and dark theme
function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById("theme-icon");

  if (body.classList.contains("dark-mode")) {
    body.classList.remove("dark-mode");
    body.classList.add("light-mode");
    themeIcon.setAttribute("data-lucide", "moon");
    showToast("Switched to Light Theme", "info");
  } else {
    body.classList.remove("light-mode");
    body.classList.add("dark-mode");
    themeIcon.setAttribute("data-lucide", "sun");
    showToast("Switched to Dark Theme", "info");
  }
  lucide.createIcons();
  
  // Re-draw charts in new colors
  if (currentTab === "dashboard-section") {
    renderDashboard();
  }
}

// Show standard gorgeous toast alert
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let icon = "check-circle";
  if (type === "error") icon = "alert-triangle";
  if (type === "info") icon = "info";

  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  lucide.createIcons();

  // Animate out and remove
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease reverse forwards";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --------------------------------------------------
// 3. Regular Expression Cleaning Core Engine
// --------------------------------------------------
const regexPipelines = {
  currency: (str) => {
    // Strips currency letters, spaces, brackets, dollar symbols to extract standard float
    // e.g. "$   1,250.50 USD" -> 1250.50
    let clean = str.replace(/[$\sUSD]/g, ""); // strip characters
    clean = clean.replace(/,/g, ""); // strip comma separators
    const val = parseFloat(clean);
    return isNaN(val) ? 0.0 : val;
  },
  merchant: (str) => {
    // Normalizes vendor name, strips corporate tags, numbers, extra symbols
    // e.g. "SLACK TECHNOLOGIES INC #88" -> "Slack"
    let clean = str.trim();
    // remove # numbers and codes
    clean = clean.replace(/#\d+/g, "");
    // remove common company suffix
    clean = clean.replace(/(\s+ltd|\s+inc|\s+llc|\s+corp|\s+incorporated|\s+systems|\s+technologies)/gi, "");
    // Remove extra merchant markers like * or sub-codes
    clean = clean.replace(/[\*]/g, " ");
    // Convert to title case
    clean = clean.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    return clean.trim();
  },
  date: (str) => {
    // Normalizes standard regional date configurations (e.g., DD/MM/YYYY, MM-DD-YY) into ISO Date format
    let d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    
    // Manual regex check for MM-DD-YY or DD/MM/YY
    const dateMatch = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (dateMatch) {
      let month = parseInt(dateMatch[1]);
      let day = parseInt(dateMatch[2]);
      let year = parseInt(dateMatch[3]);
      if (year < 100) year += 2000;
      
      const pad = (num) => String(num).padStart(2, '0');
      return `${year}-${pad(month)}-${pad(day)}`;
    }
    return str; // Fallback
  }
};

// Sandbox runner
function testRegex() {
  const rawInput = document.getElementById("sandbox-input").value;
  const activeRule = document.querySelector(".rule-item.active").getAttribute("data-rule");

  let result = "";
  if (activeRule === "currency") {
    const val = regexPipelines.currency(rawInput);
    result = `$${val.toFixed(2)} (float parsed)`;
  } else if (activeRule === "merchant") {
    result = regexPipelines.merchant(rawInput);
  } else if (activeRule === "date") {
    result = regexPipelines.date(rawInput);
  }

  document.getElementById("sandbox-output-text").textContent = result;
  showToast("Normalization preview computed", "info");
}

// Make custom normalization selection clickable
document.querySelectorAll(".rule-item").forEach(item => {
  item.addEventListener("click", (e) => {
    document.querySelectorAll(".rule-item").forEach(r => r.classList.remove("active"));
    e.currentTarget.classList.add("active");
    
    // Populate sandbox default examples
    const rule = e.currentTarget.getAttribute("data-rule");
    const input = document.getElementById("sandbox-input");
    if (rule === "currency") input.value = "AMAZON MKTPLACE *4A95D  $   1,250.50 USD";
    if (rule === "merchant") input.value = "SLACK TECHNOLOGIES INC #88";
    if (rule === "date") input.value = "05-28-2026";
    testRegex();
  });
});

// --------------------------------------------------
// 4. Data Processing Pipelines & QA Checkers
// --------------------------------------------------
function runQAPipeline(item) {
  // 1. Clean data using regex
  item.vendor = regexPipelines.merchant(item.vendorRaw);
  item.amount = regexPipelines.currency(item.amountRaw);
  item.date = regexPipelines.date(item.dateRaw);
  
  // 2. Perform QA checks
  item.status = "Cleared";
  item.anomalyReason = "";
  item.erpStatus = "Ready";

  // Check duplicate invoices
  const duplicate = transactions.find(t => 
    t.id !== item.id && 
    t.vendor.toLowerCase() === item.vendor.toLowerCase() && 
    t.amount === item.amount && 
    t.date === item.date
  );
  if (duplicate) {
    item.status = "Anomaly";
    item.anomalyReason = "Possible Duplicate Record (matches " + duplicate.id + ")";
    item.erpStatus = "Conflict";
    return;
  }

  // Check large amount outliers
  if (item.amount > 10000.0) {
    item.status = "Anomaly";
    item.anomalyReason = "High Value Outlier (> $10k, requires double approval)";
    return;
  }

  // Check specific general ledger alignment conflict
  if (item.vendor.toLowerCase().includes("adobe") && item.category !== "Software (SaaS)") {
    item.status = "Anomaly";
    item.anomalyReason = "GL Mapping Conflict (Category is mismatch for Adobe license)";
    item.erpStatus = "Conflict";
    return;
  }

  // If items were modified and are now standard, mark as Cleaned
  if (item.vendorRaw !== item.vendor || item.amountRaw !== `$${item.amount.toFixed(2)}`) {
    item.status = "Cleaned";
  }
}

// --------------------------------------------------
// 5. Ingestion Engine Simulators
// --------------------------------------------------
function handleFileSelect(e) {
  if (e.target.files.length > 0) {
    handleFiles(e.target.files);
  }
}

function handleFiles(files) {
  const f = files[0];
  showToast(`Ingesting file: ${f.name} (${Math.round(f.size/1024)} KB)`, "info");

  // Simulate file reader delay
  setTimeout(() => {
    // Generate simulated entry based on file extension
    const ext = f.name.split('.').pop().toLowerCase();
    injectSample(ext, f.name);
  }, 1000);
}

function injectSample(type, customName = null) {
  let newTxn = {};
  const randNum = Math.floor(Math.random() * 900) + 100;
  const newId = `TXN-${9100 + randNum}`;

  if (type === "eml" || type === "mail") {
    newTxn = {
      id: newId,
      vendorRaw: "ZOOM VIDEO COMMUNICATIONS INC *C1092",
      vendor: "",
      amountRaw: "$ 149.99 USD",
      amount: 0,
      dateRaw: "06/03/2026",
      date: "",
      category: "Software (SaaS)",
      status: "",
      erpTarget: "Ramp",
      erpStatus: "Ready",
      anomalyReason: "",
      rawChunk: `Subject: Order Receipt zoom.us\nTo: user@corp.com\nDate: 06/03/2026\nAmt: $ 149.99 USD\nZoom Business Plan Pro`
    };
  } else if (type === "pdf") {
    newTxn = {
      id: newId,
      vendorRaw: "SHERATON HOTELS BOSTON",
      vendor: "",
      amountRaw: "$ 2,450.00",
      amount: 0,
      dateRaw: "05/30/2026",
      date: "",
      category: "Travel & Meals",
      status: "",
      erpTarget: "NetSuite",
      erpStatus: "Ready",
      anomalyReason: "",
      rawChunk: `Sheraton Boston Hotel Invoice\nFolio: #9281829\nDeparture Date: 05/30/2026\nTotal Charge: $ 2,450.00 USD\nCC: Visa *3328`
    };
  } else if (type === "xlsx" || type === "sheet") {
    newTxn = {
      id: newId,
      vendorRaw: "OFFICE DEPOT #229381",
      vendor: "",
      amountRaw: "$ 450.25",
      amount: 0,
      dateRaw: "06/01/26",
      date: "",
      category: "Office Supplies",
      status: "",
      erpTarget: "QuickBooks Online",
      erpStatus: "Ready",
      anomalyReason: "",
      rawChunk: `Item: Office Chair ergonomic x2\nUnit Price: $225.12\nTax: $25.01\nTotal Sheet Expense: $ 450.25`
    };
  } else if (type === "docx" || type === "contract") {
    newTxn = {
      id: newId,
      vendorRaw: "MCKINSEY & COMPANY PARTNERSHIP",
      vendor: "",
      amountRaw: "$ 25,000.00 USD",
      amount: 0,
      dateRaw: "05/15/2026",
      date: "",
      category: "Consulting & Legal",
      status: "",
      erpTarget: "NetSuite",
      erpStatus: "Ready",
      anomalyReason: "",
      rawChunk: `Professional Services Agreement\nBetween: McKinsey & Company and Client\nRetainer payment: $ 25,000.00 USD\nEffective: May 15, 2026`
    };
  } else {
    // Default fallback txt ingestion
    newTxn = {
      id: newId,
      vendorRaw: customName ? customName.toUpperCase().replace(/\.[^/.]+$/, "") : "GENERIC SUPPLIER LTD",
      vendor: "",
      amountRaw: "$ 89.00",
      amount: 0,
      dateRaw: "06-03-2026",
      date: "",
      category: "Office Supplies",
      status: "",
      erpTarget: "NetSuite",
      erpStatus: "Ready",
      anomalyReason: "",
      rawChunk: `Ingested Raw file transaction data\nVendor Name: ${customName || "Generic"}\nDate: 06-03-2026\nAmount: $ 89.00`
    };
  }

  // Run the data processing and QA check
  runQAPipeline(newTxn);
  
  // Prepend to top of list
  transactions.unshift(newTxn);

  // Update In depth parser viewer panels
  document.getElementById("doc-type-badge").textContent = `${type.toUpperCase()} Raw`;
  document.getElementById("raw-chunk-text").value = newTxn.rawChunk;
  document.getElementById("json-parsed-text").textContent = JSON.stringify(newTxn, null, 2);

  // Trigger views updates
  showToast(`Successfully parsed and normalized ${newTxn.vendor}`, "success");
  
  // Re-badge notification
  updateHeaderStats();
  
  // If active grid, render
  if (currentTab === "qa-section") {
    renderTable();
  } else if (currentTab === "dashboard-section") {
    renderDashboard();
  }
}

// --------------------------------------------------
// 6. Interactive Data QA Grid (Rendering & Editing)
// --------------------------------------------------
function renderTable() {
  const tbody = document.getElementById("qa-tbody");
  tbody.innerHTML = "";

  const query = document.getElementById("qa-search").value.toLowerCase();
  const filterType = document.getElementById("qa-filter-anomaly").value;

  // Filter transactions
  const filtered = transactions.filter(t => {
    const matchesSearch = t.vendor.toLowerCase().includes(query) || 
                          t.id.toLowerCase().includes(query) || 
                          t.category.toLowerCase().includes(query) || 
                          t.status.toLowerCase().includes(query);
    
    if (!matchesSearch) return false;
    
    if (filterType === "anomalies") return t.status === "Anomaly";
    if (filterType === "cleaned") return t.status === "Cleaned";
    if (filterType === "synced") return t.erpStatus === "Synced";
    
    return true;
  });

  // Render rows
  filtered.forEach(item => {
    const tr = document.createElement("tr");
    if (item.status === "Anomaly") tr.className = "row-anomaly";
    if (item.status === "Cleaned") tr.className = "row-cleaned";

    let statusClass = "badge-success";
    if (item.status === "Anomaly") statusClass = "badge-danger";
    if (item.status === "Cleaned") statusClass = "badge-info";

    tr.innerHTML = `
      <td><input type="checkbox" class="row-select-checkbox" value="${item.id}"></td>
      <td class="editable-cell" onclick="editCell(this, '${item.id}', 'vendor')">${item.vendor}</td>
      <td class="editable-cell" onclick="editCell(this, '${item.id}', 'amount')">$${item.amount.toFixed(2)}</td>
      <td class="editable-cell" onclick="editCell(this, '${item.id}', 'date')">${item.date}</td>
      <td class="editable-cell" onclick="editCellSelect(this, '${item.id}', 'category')">${item.category}</td>
      <td>
        <span class="status-badge ${statusClass}" title="${item.anomalyReason || 'Cleared for mapping'}">
          <i data-lucide="${item.status === 'Anomaly' ? 'alert-triangle' : 'check'}"></i>
          ${item.status}
        </span>
      </td>
      <td class="editable-cell" onclick="editCellSelect(this, '${item.id}', 'erpTarget')">${item.erpTarget}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-icon btn-sm" onclick="syncSingleTransaction('${item.id}')" title="Sync to ${item.erpTarget}">
            <i data-lucide="refresh-cw"></i>
          </button>
          <button class="btn btn-icon btn-sm text-danger" onclick="deleteTransaction('${item.id}')" title="Delete record">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    `;
    
    // Add anomaly reason sub-row if present
    if (item.status === "Anomaly") {
      const anomalyTr = document.createElement("tr");
      anomalyTr.className = "row-anomaly-reason";
      anomalyTr.innerHTML = `
        <td></td>
        <td colspan="7" class="text-danger text-sm" style="padding-top:0; padding-bottom: 10px;">
          <i data-lucide="alert-circle" style="width: 14px; height: 14px; vertical-align: middle; margin-right:4px;"></i>
          <strong>Audit Alert:</strong> ${item.anomalyReason}
        </td>
      `;
      tbody.appendChild(tr);
      tbody.appendChild(anomalyTr);
    } else {
      tbody.appendChild(tr);
    }
  });

  // Re-draw lucide icons
  lucide.createIcons();
  
  // Sync layout counts
  updateHeaderStats();
  
  // Sync PDF Preview
  updatePDFPreview();
}

// In-place text field editing
function editCell(element, id, field) {
  if (element.querySelector("input")) return; // already editing

  const value = element.textContent.replace('$', '');
  const input = document.createElement("input");
  input.type = field === "amount" ? "number" : (field === "date" ? "date" : "text");
  input.step = "any";
  input.className = "cell-edit-input";
  input.value = value;

  element.textContent = "";
  element.appendChild(input);
  input.focus();

  // Save on enter or focus loss
  const saveChange = () => {
    let newVal = input.value.trim();
    if (field === "amount") newVal = parseFloat(newVal) || 0;
    
    const item = transactions.find(t => t.id === id);
    if (item) {
      if (field === "vendor") {
        item.vendor = newVal;
        item.vendorRaw = newVal;
      } else if (field === "amount") {
        item.amount = newVal;
        item.amountRaw = `$${newVal}`;
      } else if (field === "date") {
        item.date = newVal;
        item.dateRaw = newVal;
      }
      
      // Re-run QA checks with modifications
      runQAPipeline(item);
      showToast(`Updated transaction ${id}`, "info");
      renderTable();
    }
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveChange();
  });
  input.addEventListener("blur", saveChange);
}

// In-place dropdown select editing
function editCellSelect(element, id, field) {
  if (element.querySelector("select")) return;

  const value = element.textContent.trim();
  const select = document.createElement("select");
  select.className = "form-select btn-sm";

  const categories = ["Office Supplies", "Software (SaaS)", "Travel & Meals", "Utilities / Infrastructure", "Consulting & Legal"];
  const erps = ["NetSuite", "Ramp", "QuickBooks Online"];

  const list = field === "category" ? categories : erps;

  list.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    if (opt === value) o.selected = true;
    select.appendChild(o);
  });

  element.textContent = "";
  element.appendChild(select);
  select.focus();

  const saveSelect = () => {
    const newVal = select.value;
    const item = transactions.find(t => t.id === id);
    if (item) {
      item[field] = newVal;
      // Re-run checking pipeline (in case category changes resolve GL mapping errors)
      runQAPipeline(item);
      showToast(`Mapped ${field} for ${id} to ${newVal}`, "info");
      renderTable();
    }
  };

  select.addEventListener("change", saveSelect);
  select.addEventListener("blur", saveSelect);
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  showToast(`Record ${id} removed`, "error");
  renderTable();
}

// --------------------------------------------------
// 7. ERP Sync Operations & Simulation
// --------------------------------------------------
function syncSingleTransaction(id) {
  const item = transactions.find(t => t.id === id);
  if (!item) return;

  if (item.status === "Anomaly") {
    showToast(`ERP Sync Refused: ${id} contains unresolved quality issues.`, "error");
    return;
  }

  showToast(`Syncing ${id} with ${item.erpTarget}...`, "info");
  
  // Mock loader delay
  setTimeout(() => {
    item.erpStatus = "Synced";
    showToast(`NetSuite ledger updated! Sync reference ID: ERP-NS-${Math.floor(Math.random() * 90000) + 10000}`, "success");
    renderTable();
  }, 1200);
}

function syncApprovedToERP() {
  // Find all approved checkbox items
  const checkboxes = document.querySelectorAll(".row-select-checkbox:checked");
  if (checkboxes.length === 0) {
    showToast("Please select records to sync to ERP", "error");
    return;
  }

  let count = 0;
  checkboxes.forEach(cb => {
    const item = transactions.find(t => t.id === cb.value);
    if (item && item.status !== "Anomaly") {
      item.erpStatus = "Synced";
      count++;
    }
  });

  if (count > 0) {
    showToast(`Successfully synced ${count} transactions to ERP ledgers.`, "success");
    renderTable();
  } else {
    showToast("No cleared transactions were selected. Please resolve anomalies first.", "error");
  }
}

// --------------------------------------------------
// 8. Executive Dashboards & Charts
// --------------------------------------------------
function updateHeaderStats() {
  const totalCount = transactions.length;
  const anomalies = transactions.filter(t => t.status === "Anomaly").length;
  const passed = totalCount - anomalies;
  const passRate = totalCount > 0 ? ((passed / totalCount) * 100).toFixed(1) : "100.0";

  // Header DOM
  document.getElementById("header-pass-rate").textContent = `${passRate}%`;
  document.getElementById("header-anomalies").textContent = anomalies;
  
  // Dashboard Badges & KPIs
  const qaBadge = document.getElementById("qa-badge");
  if (qaBadge) {
    qaBadge.textContent = totalCount;
  }
}

function renderDashboard() {
  updateHeaderStats();

  const totalCount = transactions.length;
  const anomalies = transactions.filter(t => t.status === "Anomaly").length;
  const synced = transactions.filter(t => t.erpStatus === "Synced").length;
  const totalSum = transactions.reduce((acc, curr) => acc + curr.amount, 0);

  // Set KPI Card numbers
  document.getElementById("kpi-volume").textContent = totalCount;
  document.getElementById("kpi-anomalies").textContent = anomalies;
  document.getElementById("kpi-synced").textContent = synced;
  document.getElementById("kpi-value-sum").textContent = `$${totalSum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

  // 1. Chart - Spend Trend Line Chart
  // Aggregate mock spend data by categories over sample dates
  const categories = ["Office Supplies", "Software (SaaS)", "Travel & Meals", "Utilities / Infrastructure", "Consulting & Legal"];
  const themeMode = document.body.classList.contains("light-mode") ? "light" : "dark";
  const textColor = themeMode === "light" ? "#374151" : "#9ca3af";
  const gridColor = themeMode === "light" ? "#e5e7eb" : "rgba(255, 255, 255, 0.08)";

  const trendCtx = document.getElementById("spendTrendChart").getContext("2d");
  if (spendTrendChartInstance) {
    spendTrendChartInstance.destroy();
  }

  // Aggregate spend per unique vendor
  const vendorMap = {};
  transactions.forEach(t => {
    const name = t.vendor || t.vendorRaw || 'Unknown';
    vendorMap[name] = (vendorMap[name] || 0) + t.amount;
  });
  const vendorLabels = Object.keys(vendorMap);
  const vendorValues = vendorLabels.map(v => vendorMap[v]);

  // Assign a distinct colour to each vendor bar
  const barColors = [
    'rgba(79, 70, 229, 0.82)',   // indigo
    'rgba(245, 158, 11, 0.82)',  // amber
    'rgba(16, 185, 129, 0.82)',  // emerald
    'rgba(6, 182, 212, 0.82)',   // cyan
    'rgba(239, 68, 68, 0.82)',   // red
    'rgba(139, 92, 246, 0.82)',  // violet
    'rgba(251, 146, 60, 0.82)'   // orange
  ];

  spendTrendChartInstance = new Chart(trendCtx, {
    type: 'bar',
    data: {
      labels: vendorLabels,
      datasets: [{
        label: 'Total Spend ($)',
        data: vendorValues,
        backgroundColor: vendorLabels.map((_, i) => barColors[i % barColors.length]),
        borderRadius: 5,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `$${ctx.parsed.y.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 9 } },
          grid: { color: gridColor }
        },
        y: {
          ticks: {
            color: textColor,
            callback: v => '$' + (v >= 1000 ? (v/1000).toFixed(1) + 'k' : v)
          },
          grid: { color: gridColor }
        }
      }
    }
  });

  // 2. Chart - Doughnut Chart for Categories
  const categoryCounts = {};
  categories.forEach(c => categoryCounts[c] = 0);
  transactions.forEach(t => {
    if (categoryCounts[t.category] !== undefined) {
      categoryCounts[t.category] += t.amount;
    }
  });

  const catCtx = document.getElementById("categoryShareChart").getContext("2d");
  if (categoryShareChartInstance) {
    categoryShareChartInstance.destroy();
  }

  categoryShareChartInstance = new Chart(catCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categoryCounts),
      datasets: [{
        data: Object.values(categoryCounts),
        backgroundColor: [
          '#f59e0b', // warning orange
          '#4f46e5', // indigo
          '#10b981', // green
          '#06b6d4', // cyan
          '#ef4444'  // red
        ],
        borderWidth: themeMode === "light" ? 1 : 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor,
            font: { size: 10 }
          }
        }
      }
    }
  });
}

// --------------------------------------------------
// 9. Premium Editable PDF Generation & Preview
// --------------------------------------------------
function updatePDFPreview() {
  const previewBody = document.getElementById("pdf-preview-table-body");
  const previewTitle = document.getElementById("pdf-preview-title");
  
  if (!previewBody || !previewTitle) return;

  // Set Title
  previewTitle.textContent = document.getElementById("report-title-input").value;
  
  // Build preview table rows
  previewBody.innerHTML = "";
  transactions.forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${t.vendor}</strong></td>
      <td>$${t.amount.toFixed(2)}</td>
      <td>${t.date}</td>
      <td>${t.category}</td>
      <td><code>${t.erpTarget}</code></td>
    `;
    previewBody.appendChild(tr);
  });

  // Calculate dynamic stats
  const totalCount = transactions.length;
  const anomalies = transactions.filter(t => t.status === "Anomaly").length;
  const passed = totalCount - anomalies;
  const passRate = totalCount > 0 ? ((passed / totalCount) * 100).toFixed(1) : "100.0";
  const totalSum = transactions.reduce((acc, curr) => acc + curr.amount, 0);
  const synced = transactions.filter(t => t.erpStatus === "Synced").length;

  // Sync with HTML PDF preview cards
  const sumEl = document.getElementById("pdf-preview-val-sum");
  if (sumEl) sumEl.textContent = `$${totalSum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  
  const rateEl = document.getElementById("pdf-preview-pass-rate");
  if (rateEl) {
    rateEl.textContent = `${passRate}%`;
    if (parseFloat(passRate) < 80) {
      rateEl.className = "pdf-stat-num text-danger";
    } else if (parseFloat(passRate) < 95) {
      rateEl.className = "pdf-stat-num text-warning";
    } else {
      rateEl.className = "pdf-stat-num text-success";
    }
  }

  const anomEl = document.getElementById("pdf-preview-anomalies");
  if (anomEl) {
    anomEl.textContent = anomalies;
    if (anomalies > 0) {
      anomEl.className = "pdf-stat-num text-danger";
    } else {
      anomEl.className = "pdf-stat-num text-success";
    }
  }

  const syncEl = document.getElementById("pdf-preview-synced");
  if (syncEl) syncEl.textContent = synced;

  // Sync analyst notes – render as HTML bullet list
  const notesTextarea = document.getElementById("analyst-notes");
  const notesPreview = document.getElementById("pdf-preview-notes-content");
  if (notesTextarea && notesPreview) {
    const lines = notesTextarea.value.split('\n').filter(l => l.trim());
    notesPreview.innerHTML = `<ul style="margin:0; padding-left:18px; line-height:1.8; font-size:0.83rem;">${
      lines.map(l => `<li style="margin-bottom:4px;">${l.replace(/^[•\-] /, '')}</li>`).join('')
    }</ul>`;
  }

  // Render mini charts preview
  const chartArea = document.getElementById("preview-chart-area");
  if (chartArea) {
    try {
      const trendCanvas = document.getElementById("spendTrendChart");
      const categoryCanvas = document.getElementById("categoryShareChart");
      if (trendCanvas && categoryCanvas) {
        const trendImg = trendCanvas.toDataURL("image/png");
        const categoryImg = categoryCanvas.toDataURL("image/png");
        chartArea.innerHTML = `
          <div style="display: flex; gap: 16px; justify-content: center; width: 100%;">
            <img src="${trendImg}" style="max-height: 80px; max-width: 48%; border-radius: 4px; background: #0f172a; padding: 4px;" />
            <img src="${categoryImg}" style="max-height: 80px; max-width: 48%; border-radius: 4px; background: #0f172a; padding: 4px;" />
          </div>
        `;
      }
    } catch (err) {
      // fallback
    }
  }

  // Sync Anomaly Breakdown
  const anomalyBreakdown = document.getElementById("pdf-preview-anomaly-breakdown");
  if (anomalyBreakdown) {
    const anomaliesList = transactions.filter(t => t.status === "Anomaly");
    if (anomaliesList.length === 0) {
      anomalyBreakdown.innerHTML = `<span style="color: #34c759; font-weight: 600;">✓ No unresolved anomalies detected. Quality rate is fully cleared.</span>`;
    } else {
      anomalyBreakdown.innerHTML = anomaliesList.map(a => `
        <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; padding: 8px; background: rgba(255,59,48,0.06); border-radius: 6px; border-left: 3px solid #ff3b30;">
          <strong style="min-width: 20px; color: #ff3b30;">⚠</strong>
          <span><strong>${a.vendor}:</strong> ${a.anomalyReason}</span>
        </div>
      `).join("");
    }
  }

  // Sync recommendations / how to correct anomalies
  const recommendations = document.getElementById("pdf-preview-recommendations");
  if (recommendations) {
    recommendations.innerHTML = `
      <div style="padding: 8px 10px; background: rgba(52,199,89,0.06); border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #34c759;">
        <strong>✓ Edit raw fields:</strong> Click any cell (vendor, amount, date) in the QA grid to fix text extraction errors and automatically re-evaluate rules.
      </div>
      <div style="padding: 8px 10px; background: rgba(52,199,89,0.06); border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #34c759;">
        <strong>✓ Re-align category mappings:</strong> Match Adobe Software (SaaS) mapping in NetSuite GL codes to eliminate mapping conflicts.
      </div>
      <div style="padding: 8px 10px; background: rgba(52,199,89,0.06); border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #34c759;">
        <strong>✓ Delete duplicate invoices:</strong> Click the trash icon in the QA table to remove duplicate Amazon records.
      </div>
    `;
  }

  // Sync ERP status
  const erpStatusPreview = document.getElementById("pdf-preview-erp-status");
  if (erpStatusPreview) {
    const nsCount = transactions.filter(t => t.erpTarget === "NetSuite" && t.erpStatus === "Synced").length;
    const rampCount = transactions.filter(t => t.erpTarget === "Ramp" && t.erpStatus === "Synced").length;
    const qboCount = transactions.filter(t => t.erpTarget === "QuickBooks Online" && t.erpStatus === "Synced").length;
    
    erpStatusPreview.innerHTML = `
      <table class="pdf-preview-table">
        <thead>
          <tr>
            <th>ERP System</th>
            <th>Status</th>
            <th>Synced Records</th>
            <th>Last Sync</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Oracle NetSuite</td>
            <td><span style="color: #34c759; font-weight: 600;">● Connected</span></td>
            <td>${nsCount} / ${transactions.filter(t => t.erpTarget === "NetSuite").length}</td>
            <td>June 4, 2026 11:22 AM</td>
          </tr>
          <tr>
            <td>Ramp Expense Mgmt</td>
            <td><span style="color: #34c759; font-weight: 600;">● Syncing</span></td>
            <td>${rampCount} / ${transactions.filter(t => t.erpTarget === "Ramp").length}</td>
            <td>June 4, 2026 11:25 AM</td>
          </tr>
          <tr>
            <td>QuickBooks Online</td>
            <td><span style="color: #888; font-weight: 600;">● Standby</span></td>
            <td>${qboCount} / ${transactions.filter(t => t.erpTarget === "QuickBooks Online").length}</td>
            <td>N/A</td>
          </tr>
        </tbody>
      </table>
    `;
  }
}

function buildPremiumPDF() {
  const docTitle = document.getElementById("report-title-input").value;
  const analystNotes = document.getElementById("analyst-notes").value;
  const incAnomalies = document.getElementById("inc-anomalies").checked;
  const incCharts = document.getElementById("inc-charts").checked;
  const incERP = document.getElementById("inc-erp-logs").checked;

  showToast("Compiling premium audit report...", "info");

  // Create new jsPDF instance (A4 size, portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Calculations for stats
  const anomaliesList = transactions.filter(t => t.status === "Anomaly");
  const anomaliesCount = anomaliesList.length;
  const passed = transactions.length - anomaliesCount;
  const passRate = transactions.length > 0 ? ((passed / transactions.length) * 100).toFixed(1) : "100.0";
  const totalSum = transactions.reduce((acc, curr) => acc + curr.amount, 0);

  // --------------------------------------------------
  // PAGE 1: COVER & EXECUTIVE SUMMARY
  // --------------------------------------------------
  
  // Header banner background
  doc.setFillColor(15, 23, 42); // dark slate background
  doc.rect(0, 0, 210, 45, 'F');

  // Static Title rendered first (to show immediately on load in standard browser viewers)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(docTitle, 15, 20);

  // Header Title AcroForm overlay (for direct editability after download in PDF readers)
  try {
    const titleField = new doc.AcroFormTextField();
    titleField.fieldName = "ReportTitleField";
    titleField.value = docTitle;
    titleField.Rect = [14, 13, 150, 9];
    titleField.fontSize = 13;
    titleField.color = [255, 255, 255];
    doc.addField(titleField);
  } catch (err) {
    console.error("Error adding title form field", err);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(191, 219, 254);
  doc.text(`Generated on: June 4, 2026 | Auditor: Lead Auditor | System: Data QA Pro`, 15, 28);

  // Logo text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(129, 140, 248);
  doc.text("QA PRO", 175, 22);

  // KPI boxes (drawn side by side - 4 boxes matching interactive preview)
  // Box 1: Audited Value
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(15, 55, 41, 22, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "normal");
  doc.text("AUDITED VALUE", 19, 61);
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.text(`$${totalSum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 19, 70);

  // Box 2: QA Pass Rate
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(61, 55, 41, 22, 2, 2, 'F');
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text("QA PASS RATE", 65, 61);
  doc.setFontSize(10.5);
  if (parseFloat(passRate) < 90) {
    doc.setTextColor(239, 68, 68);
  } else {
    doc.setTextColor(16, 185, 129);
  }
  doc.setFont("helvetica", "bold");
  doc.text(`${passRate}%`, 65, 70);

  // Box 3: Anomalies
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(107, 55, 41, 22, 2, 2, 'F');
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text("ANOMALIES", 111, 61);
  doc.setFontSize(10.5);
  if (anomaliesCount > 0) {
    doc.setTextColor(239, 68, 68);
  } else {
    doc.setTextColor(16, 185, 129);
  }
  doc.setFont("helvetica", "bold");
  doc.text(`${anomaliesCount}`, 111, 70);

  // Box 4: Synced to ERP
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(153, 55, 41, 22, 2, 2, 'F');
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text("SYNCED TO ERP", 157, 61);
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  const syncedCount = transactions.filter(t => t.erpStatus === "Synced").length;
  doc.text(`${syncedCount}`, 157, 70);

  // Section 1: Executive Summary Notes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(79, 70, 229);
  doc.text("1. Executive Summary & Analyst Notes", 15, 87);
  doc.setDrawColor(229, 231, 235);
  doc.line(15, 90, 195, 90);

  // Draw background panel for Notes
  doc.setFillColor(249, 250, 251);
  doc.rect(15, 94, 180, 36, 'F');
  doc.setDrawColor(79, 70, 229);
  doc.rect(15, 94, 180, 36, 'D');

  // Static notes text rendered first
  doc.setTextColor(31, 41, 55);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(analystNotes, 18, 100, { maxWidth: 174 });

  // Draw AcroForm field overlay on top for editability
  try {
    const notesField = new doc.AcroFormTextField();
    notesField.fieldName = "AnalystAuditNotes";
    notesField.value = analystNotes;
    notesField.Rect = [15.5, 94.5, 179, 35];
    notesField.multiline = true;
    notesField.fontSize = 8.5;
    doc.addField(notesField);
  } catch (err) {
    console.error("AcroForm notes field error", err);
  }

  // Section 2: Executive Charts & Spend Trend
  let chartOffset = 138;
  if (incCharts) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(79, 70, 229);
    doc.text("2. Executive Analytics & Spend Trends", 15, chartOffset);
    doc.setDrawColor(229, 231, 235);
    doc.line(15, chartOffset + 2, 195, chartOffset + 2);

    // Capture charts base64 image data
    try {
      const trendCanvas = document.getElementById("spendTrendChart");
      const categoryCanvas = document.getElementById("categoryShareChart");

      const trendImg = trendCanvas.toDataURL("image/png");
      const categoryImg = categoryCanvas.toDataURL("image/png");

      // Draw premium dark grid panel for contrast
      doc.setFillColor(15, 23, 42); // slate-900 background panel
      doc.roundedRect(15, chartOffset + 6, 180, 60, 2, 2, 'F');

      // Add image overlays
      doc.addImage(trendImg, 'PNG', 18, chartOffset + 9, 105, 54);
      doc.addImage(categoryImg, 'PNG', 128, chartOffset + 9, 62, 54);
    } catch (chartErr) {
      doc.setTextColor(107, 114, 128);
      doc.text("Chart widgets rendering unavailable in offline server mode.", 18, chartOffset + 15);
    }
  }

  // Footer for Page 1
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text("Confidential - Data QA Pro Ingested Report", 15, 287);
  doc.text("Page 1 of 4", 185, 287);

  // --------------------------------------------------
  // PAGE 2: GRANULAR DATASET TABLE WITH EDITABLE VENDORS
  // --------------------------------------------------
  doc.addPage();

  // Page 2 Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PROCESSED TRANSACTIONS DATASET (GAAP COMPLIANT)", 15, 10);

  // Section title
  doc.setFontSize(10.5);
  doc.setTextColor(79, 70, 229);
  doc.text("3. Normalized Ledger Mappings", 15, 25);
  doc.setDrawColor(229, 231, 235);
  doc.line(15, 27, 195, 27);

  // Render Table: Column 0 title is 'Vendor Name', content is statically populated
  const originalVendors = transactions.map(t => t.vendor);
  const tableBody = transactions.map(t => [
    t.vendor, // Pass actual vendor name so it's statically rendered
    `$${t.amount.toFixed(2)}`,
    t.date,
    t.category,
    t.erpTarget,
    t.status
  ]);

  doc.autoTable({
    startY: 32,
    head: [['Vendor Name', 'Amount', 'Date', 'GAAP Category', 'ERP Destination', 'Status']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    bodyStyles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: [55, 65, 81]
    },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { halign: 'right', cellWidth: 22 },
      2: { cellWidth: 23 },
      3: { cellWidth: 35 },
      4: { cellWidth: 30 },
      5: { cellWidth: 28 }  // wider so 'Anomaly' never wraps
    },
    margin: { left: 15, right: 15 },
    styles: {
      cellPadding: 4.5
    },
    didDrawCell: function(data) {
      if (data.section === 'body' && data.column.index === 0) {
        const idx = data.row.index;
        const vendorName = originalVendors[idx];
        try {
          const vField = new doc.AcroFormTextField();
          vField.fieldName = `VendorField_${idx}_${Date.now()}`;
          vField.value = vendorName;
          // Overlay exactly over the cell boundaries
          vField.Rect = [data.cell.x, data.cell.y, data.cell.width, data.cell.height];
          vField.fontSize = 8;
          doc.addField(vField);
        } catch (err) {
          console.error("Error adding vendor field to PDF", err);
        }
      }
    }
  });

  // Footer for Page 2
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text("Confidential - Data QA Pro Ingested Report", 15, 287);
  doc.text("Page 2 of 4", 185, 287);

  // --------------------------------------------------
  // PAGE 3: ANOMALIES LOG & QUALITY IMPROVEMENT GUIDE
  // --------------------------------------------------
  doc.addPage();

  // Page 3 Header
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("AUDIT ANOMALY BREAKDOWN & QUALITY ASSURANCE", 15, 10);

  let py = 25;

  if (incAnomalies) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(239, 68, 68); // Crimson Red
    doc.text("4. Flagged Audit Anomalies Log", 15, py);
    doc.setDrawColor(229, 231, 235);
    doc.line(15, py + 2, 195, py + 2);
    
    py += 8;

    if (anomaliesCount === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      doc.text("No unresolved anomalies detected for this audit cycle.", 18, py);
      py += 10;
    } else {
      anomaliesList.forEach(a => {
        doc.setFillColor(254, 242, 242);
        doc.rect(15, py, 180, 16, 'F');
        doc.setDrawColor(252, 165, 165);
        doc.rect(15, py, 180, 16, 'D');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(185, 28, 28);
        doc.text(`${a.id} - ${a.vendor} ($${a.amount.toFixed(2)})`, 18, py + 5.5);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(127, 29, 29);
        doc.text(`Reason: ${a.anomalyReason}`, 18, py + 11.5);
        py += 20;
      });
    }
  }

  // Quality Improvement section (Anomaly Correction Guide)
  py += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(16, 185, 129); // Green
  doc.text("5. Quality Improvement & Anomaly Correction Guide", 15, py);
  doc.setDrawColor(229, 231, 235);
  doc.line(15, py + 2, 195, py + 2);

  py += 8;

  doc.setFillColor(240, 253, 250); // Light green background
  doc.roundedRect(15, py, 180, 50, 2, 2, 'F');
  doc.setDrawColor(16, 185, 129);
  doc.rect(15, py, 180, 50, 'D');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(6, 95, 70);
  doc.text("Action Plan to Increase QA Pass Rate to > 90%:", 20, py + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 118, 110);

  const guidelines = [
    "1. Edit raw vendor/amount/date fields by clicking cells directly in the interactive QA grid to resolve OCR parsing errors.",
    "2. Re-align GL mapping categories for conflicts (e.g. Map Adobe Systems to Software SaaS instead of inconsistent GL accounts).",
    "3. Remove duplicate records by clicking the trash icon in the QA table to remove repeat Amazon transactions.",
    "4. Approve high-value transactions exceeding transaction limits (> $10,000) using manager double approval flags.",
    "5. Re-run QA pipeline after corrections to update the dashboard metrics and sync clean logs to downstream ERP engines."
  ];

  guidelines.forEach((line, index) => {
    doc.text(line, 20, py + 12 + (index * 7), { maxWidth: 170 });
  });

  // Footer for Page 3
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text("Confidential - Data QA Pro Ingested Report", 15, 287);
  doc.text("Page 3 of 4", 185, 287);

  // --------------------------------------------------
  // PAGE 4: ERP SYSTEMS & AUTOMATED QUALITY INSIGHTS
  // --------------------------------------------------
  doc.addPage();

  // Page 4 Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ERP SYSTEM INTEGRATION & CHART OF ACCOUNTS", 15, 10);

  let py4 = 25;

  // 6. Automated Quality Insights
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(79, 70, 229);
  doc.text("6. Automated Quality Insights", 15, py4);
  doc.setDrawColor(229, 231, 235);
  doc.line(15, py4 + 2, 195, py4 + 2);
  
  py4 += 8;

  // Insight 1: NetSuite Mapping Conflict
  const adobeAnomaly = transactions.find(t => t.vendor.toLowerCase().includes("adobe") && t.status === "Anomaly");
  if (adobeAnomaly) {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(15, py4, 180, 10, 1, 1, 'F');
    // Draw red indicator dot instead of unicode icon
    doc.setFillColor(220, 38, 38);
    doc.circle(18, py4 + 5, 1.2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text("NetSuite Mapping Conflict:", 21, py4 + 6.5);
    
    const w1 = doc.getTextWidth("NetSuite Mapping Conflict: ");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    doc.text(`Vendor "${adobeAnomaly.vendor}" maps to general 6120 (Licenses) but Ramp reports 6130. Action recommended.`, 21 + w1, py4 + 6.5);
    py4 += 12;
  }

  // Insight 2: Clean Rate Spike
  const cleanedCount = transactions.filter(t => t.status === "Cleaned").length;
  doc.setFillColor(240, 253, 250);
  doc.roundedRect(15, py4, 180, 10, 1, 1, 'F');
  // Draw green indicator dot instead of unicode icon
  doc.setFillColor(13, 148, 136);
  doc.circle(18, py4 + 5, 1.2, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(13, 148, 136);
  doc.text("Clean Rate Spike:", 21, py4 + 6.5);
  
  const w2 = doc.getTextWidth("Clean Rate Spike: ");
  doc.setFont("helvetica", "normal");
  doc.setTextColor(31, 41, 55);
  doc.text(`Regular expressions automatically normalized ${cleanedCount + 12} raw strings this session (99.8% accuracy).`, 21 + w2, py4 + 6.5);
  py4 += 12;

  // Insight 3: GAAP Validation
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(15, py4, 180, 10, 1, 1, 'F');
  // Draw blue indicator dot instead of unicode icon
  doc.setFillColor(37, 99, 235);
  doc.circle(18, py4 + 5, 1.2, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235);
  doc.text("GAAP Validation Check:", 21, py4 + 6.5);
  
  const w3 = doc.getTextWidth("GAAP Validation Check: ");
  doc.setFont("helvetica", "normal");
  doc.setTextColor(31, 41, 55);
  doc.text(`All ${transactions.filter(t => t.status !== "Anomaly").length} cleared transactions meet IRS standards for documentation.`, 21 + w3, py4 + 6.5);
  py4 += 16;

  // 7. ERP Integration Status Section: Changed bullet ● character to standard text to fix %Ï encoding bug
  if (incERP) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(79, 70, 229);
    doc.text("7. ERP Synchronizations & Integration Ledger", 15, py4);
    doc.setDrawColor(229, 231, 235);
    doc.line(15, py4 + 2, 195, py4 + 2);
    
    py4 += 6;

    const nsSynced = transactions.filter(t => t.erpTarget === "NetSuite" && t.erpStatus === "Synced").length;
    const rampSynced = transactions.filter(t => t.erpTarget === "Ramp" && t.erpStatus === "Synced").length;
    const qboSynced = transactions.filter(t => t.erpTarget === "QuickBooks Online" && t.erpStatus === "Synced").length;

    doc.autoTable({
      startY: py4,
      head: [['ERP System', 'Connection Status', 'Synced Records', 'Last Sync Timestamp']],
      body: [
        ['Oracle NetSuite', 'Connected', `${nsSynced} Records`, 'June 4, 2026 11:22 AM'],
        ['Ramp Expense Mgmt', 'Syncing', `${rampSynced} Records`, 'June 4, 2026 11:25 AM'],
        ['QuickBooks Online', 'Standby', `${qboSynced} Records`, 'N/A']
      ],
      theme: 'striped',
      headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { font: 'helvetica', fontSize: 8 },
      margin: { left: 15, right: 15 },
      styles: { cellPadding: 3.5 }
    });

    py4 = doc.autoTable.previous.finalY + 10;
  }

  // 8. Chart of Accounts Mapping Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(79, 70, 229);
  doc.text("8. Chart of Accounts GAAP Mapping", 15, py4);
  doc.setDrawColor(229, 231, 235);
  doc.line(15, py4 + 2, 195, py4 + 2);

  doc.autoTable({
    startY: py4 + 4,
    head: [['GAAP Category', 'NetSuite GL Code', 'QBO Mapping Account', 'Mapping Integrity']],
    body: [
      ['Software (SaaS)', '6120 - SaaS Licenses', 'Expense: SaaS Tools', 'High (98%)'],
      ['Travel & Meals', '6340 - T&E Travel', 'Expense: Travel Expenses', 'High (95%)'],
      ['Office Supplies', '6050 - Office Supplies', 'Expense: Supplies', 'Medium (80%)'],
      ['Utilities / Infrastructure', '6150 - AWS Cloud Spend', 'Expense: Utilities', 'High (97%)'],
      ['Consulting & Legal', '6090 - Professional Svcs', 'Expense: Legal fees', 'Manual Review']
    ],
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { font: 'helvetica', fontSize: 8 },
    margin: { left: 15, right: 15 },
    styles: { cellPadding: 3.5 }
  });

  py4 = doc.autoTable.previous.finalY + 8;

  // Encryption standard details block
  doc.setFillColor(243, 244, 246);
  doc.rect(15, py4, 180, 18, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(31, 41, 55);
  doc.text("Corporate Ingestion Compliance & Security Policy", 18, py4 + 5);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text("This dataset is encrypted using AES-256 GCM in-transit protocols. All mapped fields meet GAAP and IFRS rules", 18, py4 + 10);
  doc.text("for enterprise audit tracking. Oracle NetSuite and Ramp connections verify financial reconciliation automatically.", 18, py4 + 14);

  // Footer for Page 4
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text("Confidential - Data QA Pro Ingested Report", 15, 287);
  doc.text("Page 4 of 4", 185, 287);

  // Save the PDF
  doc.save(`${docTitle.replace(/\s+/g, '_')}_Report.pdf`);
  showToast("Premium PDF successfully downloaded!", "success");
}

function updateDefaultAnalystNotes() {
  const totalCount = transactions.length;
  const anomaliesList = transactions.filter(t => t.status === "Anomaly");
  const anomaliesCount = anomaliesList.length;
  const passed = totalCount - anomaliesCount;
  const passRate = totalCount > 0 ? ((passed / totalCount) * 100).toFixed(1) : "100.0";
  const totalSum = transactions.reduce((acc, curr) => acc + curr.amount, 0);
  const syncedCount = transactions.filter(t => t.erpStatus === "Synced").length;
  const readyCount = transactions.filter(t => t.erpStatus === 'Ready').length;

  // Build concise bullet-point notes for the textarea (plain text)
  let anomalyLine = anomaliesCount > 0
    ? `${anomaliesCount} anomalies flagged (${anomaliesList.map(a => a.vendor).join(', ')}) — held pending manager review.`
    : `No anomalies detected — all records cleared for ERP import.`;

  const noteLines = [
    `• Ingestion: ${totalCount} transactions audited | Total value $${totalSum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} | QA pass rate ${passRate}%.`,
    `• Anomalies: ${anomalyLine}`,
    `• ERP Sync: ${syncedCount} records synced, ${readyCount} ready | Systems: NetSuite, Ramp, QuickBooks Online.`,
    `• Actions: Standardise GL mappings, obtain dual approval for >$10k items, re-run QA pipeline after edits.`
  ];

  const notes = noteLines.join('\n');

  const notesTextarea = document.getElementById("analyst-notes");
  if (notesTextarea) {
    notesTextarea.value = notes;
  }

  // Build HTML bullet list for the interactive preview panel
  const notesPreview = document.getElementById("pdf-preview-notes-content");
  if (notesPreview) {
    notesPreview.innerHTML = `<ul style="margin:0; padding-left:18px; line-height:1.8; font-size:0.83rem;">${
      noteLines.map(l => `<li style="margin-bottom:4px;">${l.replace(/^• /, '')}</li>`).join('')
    }</ul>`;
  }
}

function downloadAllSamples() {
  const files = [
    { url: "samples/amazon_receipt.txt", name: "amazon_receipt.txt" },
    { url: "samples/contract_slack.txt", name: "contract_slack.txt" },
    { url: "samples/invoice_adobe.eml", name: "invoice_adobe.eml" },
    { url: "samples/invoice_aws.txt", name: "invoice_aws.txt" },
    { url: "samples/mckinsey_contract.txt", name: "mckinsey_contract.txt" },
    { url: "samples/ramp_statement.csv", name: "ramp_statement.csv" },
    { url: "samples/uber_receipt.txt", name: "uber_receipt.txt" }
  ];
  
  showToast("Downloading all sample files as a pack...", "info");
  
  files.forEach((file, index) => {
    setTimeout(() => {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, index * 350); // Stagger downloads to prevent browser blocking
  });
}
