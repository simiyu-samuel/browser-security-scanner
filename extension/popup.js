const scanButton = document.querySelector("#scanButton");
const exportButton = document.querySelector("#exportButton");
const clearButton = document.querySelector("#clearButton");
const state = document.querySelector("#state");
const summary = document.querySelector("#summary");
const results = document.querySelector("#results");
let latestReport = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function flatten(value, prefix = "") {
  const rows = [];
  if (!value || typeof value !== "object") return rows;
  for (const [key, nested] of Object.entries(value)) {
    const label = prefix ? `${prefix}.${key}` : key;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) rows.push(...flatten(nested, label));
    else rows.push([label, Array.isArray(nested) ? nested.length : nested]);
  }
  return rows;
}

function renderReport(report) {
  const rows = flatten(report.browserData).concat(flatten(report.privacySettings)).concat(flatten(report.system));
  results.innerHTML = rows.map(([label, value]) => `
    <article class="result"><div class="result-head"><h2>${escapeHtml(label)}</h2><span class="status ${typeof value === "number" ? "pass" : ""}">${escapeHtml(value)}</span></div></article>
  `).join("");
  summary.classList.remove("hidden");
  results.classList.remove("hidden");
  document.querySelector("#checkCount").textContent = rows.length;
  document.querySelector("#networkCount").textContent = report.networkRequests;
  document.querySelector("#destructiveCount").textContent = report.destructiveActions;
  exportButton.disabled = false;
  clearButton.disabled = false;
}

async function runAudit() {
  scanButton.disabled = true;
  state.textContent = "Collecting local browser metadata...";
  try {
    latestReport = await chrome.runtime.sendMessage({ type: "RUN_LOCAL_AUDIT" });
    if (latestReport?.error) throw new Error(latestReport.error);
    renderReport(latestReport);
    state.textContent = "Audit complete. No network request was made.";
  } catch (error) {
    state.textContent = `Audit failed: ${error.message}`;
  } finally {
    scanButton.disabled = false;
  }
}

function exportReport() {
  if (!latestReport) return;
  const blob = new Blob([JSON.stringify(latestReport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sentinel-local-audit-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function clearReport() {
  latestReport = null;
  summary.classList.add("hidden");
  results.classList.add("hidden");
  results.replaceChildren();
  exportButton.disabled = true;
  clearButton.disabled = true;
  state.textContent = "Ready.";
}

function renderPreview() {
  document.body.classList.add("preview-mode");
  latestReport = {
    networkRequests: 0,
    destructiveActions: 0,
    browserData: {
      history: { sampledEntries: 184, uniqueOrigins: 27, possiblyTruncated: false },
      bookmarks: { folders: 12, links: 96, uniqueOrigins: 31 },
      cookies: { total: 42, secure: 39, httpOnly: 28, partitioned: 8 },
      tabs: { open: 9, incognito: 1 },
      downloads: { sampled: 23, states: { complete: 21, interrupted: 2 } },
      extensions: { installed: 8, enabled: 7, disabled: 1 },
      recentlyClosed: { sessions: 3 }
    },
    privacySettings: {
      thirdPartyCookies: { value: { value: false } },
      passwordSaving: { value: { value: true } },
      contentSettings: { javascript: { value: { setting: "allow" } } }
    },
    system: {
      platform: { value: { os: "linux", arch: "x86-64" } },
      nativeHost: { value: { supported: true, os: "Linux", browserProcesses: { chrome: 1 }, networkRequests: 0 } }
    }
  };
  renderReport(latestReport);
  state.textContent = "Preview complete. No network request was made.";
}

scanButton.addEventListener("click", runAudit);
exportButton.addEventListener("click", exportReport);
clearButton.addEventListener("click", clearReport);

if (new URLSearchParams(window.location.search).has("preview")) renderPreview();
