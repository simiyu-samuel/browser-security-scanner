const $ = (selector) => document.querySelector(selector);

const startBtn = $("#startBtn");
const rescanBtn = $("#rescanBtn");
const scanArea = $("#scanArea");
const results = $("#results");
const emptyResults = $("#emptyResults");
const terminal = $("#terminal");
const environment = $("#environment");
const liveStatus = $("#liveStatus");
const statusChip = $(".status-chip");

const state = {
  checks: [],
  filter: "all",
  category: "all",
  running: false,
  serverAudit: null,
  environment: {}
};

const permissionChecks = [
  ["notifications", "Notifications"],
  ["geolocation", "Geolocation"],
  ["camera", "Camera"],
  ["microphone", "Microphone"]
];

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));
}

function log(message, type = "infotext") {
  const line = document.createElement("div");
  line.className = `log ${type}`;
  const time = document.createElement("span");
  time.className = "time";
  time.textContent = `[${new Date().toLocaleTimeString()}]`;
  line.append(time, ` ${message}`);
  terminal.append(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function setProgress(completed, total) {
  const percent = total ? Math.round((completed / total) * 100) : 0;
  $("#progressText").textContent = `${percent}%`;
  $("#progressBar").style.width = `${percent}%`;
}

function statusClass(status) {
  return status === "PASS" ? "pass" : status === "WARNING" ? "warn" : "info";
}

function renderChecks() {
  const visible = state.checks.filter((check) => {
    const statusMatch = state.filter === "all" || check.status === state.filter;
    const categoryMatch = state.category === "all" || check.category === state.category;
    return statusMatch && categoryMatch;
  });

  results.innerHTML = visible.map((check) => `
    <article class="check">
      <div>
        <div class="check-meta"><span class="category">${escapeHtml(check.category)}</span></div>
        <h3>${escapeHtml(check.name)}</h3>
        <p>${escapeHtml(check.description)}</p>
        <p class="check-detail">${escapeHtml(check.detail)}</p>
      </div>
      <span class="badge ${statusClass(check.status)}">${escapeHtml(check.status)}</span>
    </article>
  `).join("");

  emptyResults.classList.toggle("hidden", visible.length > 0);
  $("#resultsCount").textContent = `${visible.length} ${visible.length === 1 ? "result" : "results"}`;

  const total = state.checks.length;
  const passed = state.checks.filter((check) => check.status === "PASS").length;
  const warnings = state.checks.filter((check) => check.status === "WARNING").length;
  $("#total").textContent = total;
  $("#passed").textContent = passed;
  $("#warnings").textContent = warnings;
  $("#notes").textContent = total - passed - warnings;
}

function addCheck(name, description, status, detail, category) {
  state.checks.push({ name, description, status, detail, category });
  renderChecks();
}

function setLiveStatus(text, scanning = false) {
  liveStatus.textContent = text;
  statusChip.classList.toggle("scanning", scanning);
}

async function queryPermission(name) {
  try {
    if (!navigator.permissions) return "unsupported";
    const permission = await navigator.permissions.query({ name });
    return permission.state;
  } catch {
    return "unsupported";
  }
}

function probeStorage(storage, key) {
  try {
    storage.setItem(key, "ok");
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

async function inspectDeployment() {
  try {
    const response = await fetch("/api/security", {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    const headerNames = {
      "content-security-policy": "Content-Security-Policy",
      "strict-transport-security": "Strict-Transport-Security",
      "x-content-type-options": "X-Content-Type-Options",
      "x-frame-options": "X-Frame-Options",
      "referrer-policy": "Referrer-Policy",
      "permissions-policy": "Permissions-Policy",
      "cross-origin-opener-policy": "Cross-Origin-Opener-Policy",
      "cross-origin-embedder-policy": "Cross-Origin-Embedder-Policy",
      "cross-origin-resource-policy": "Cross-Origin-Resource-Policy"
    };
    const headers = Object.entries(headerNames).map(([key, label]) => ({
      key,
      label,
      value: response.headers.get(key) || "",
      present: Boolean(response.headers.get(key))
    }));
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    state.serverAudit = { response, headers, payload };
    return state.serverAudit;
  } catch {
    state.serverAudit = null;
    return null;
  }
}

function buildEnvironment() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return {
    Browser: navigator.userAgent,
    Platform: navigator.platform || "Unavailable",
    Language: navigator.language || "Unavailable",
    Origin: location.origin,
    Screen: `${window.screen.width} × ${window.screen.height}`,
    Viewport: `${window.innerWidth} × ${window.innerHeight}`,
    "Max touch points": navigator.maxTouchPoints ?? 0,
    "Logical CPU cores": navigator.hardwareConcurrency || "Unavailable",
    "Device memory": navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "Unavailable",
    "Color scheme": window.matchMedia("(prefers-color-scheme: light)").matches ? "Light" : "Dark / no preference",
    "Network type": connection?.effectiveType || "Unavailable",
    Online: navigator.onLine ? "Online" : "Offline",
    "Secure context": window.isSecureContext ? "Yes" : "No",
    "Cookies enabled": navigator.cookieEnabled ? "Yes" : "No",
    "Do Not Track": navigator.doNotTrack === "1" ? "Enabled" : "Not enabled / unavailable",
    "Global Privacy Control": navigator.globalPrivacyControl ? "Enabled" : "Not enabled / unavailable",
    "Automation signal": navigator.webdriver ? "Exposed" : "Not exposed"
  };
}

function renderEnvironment() {
  environment.innerHTML = Object.entries(state.environment).map(([label, value]) => `
    <div><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></div>
  `).join("");
}

function calculateScore() {
  const warnings = state.checks.filter((check) => check.status === "WARNING").length;
  return Math.max(0, 100 - warnings * 15);
}

function updateScore() {
  const score = calculateScore();
  const risk = score >= 85 ? "LOW" : score >= 65 ? "MODERATE" : "HIGH";
  const riskElement = $("#risk");
  $("#score").textContent = score;
  riskElement.textContent = risk;
  riskElement.className = risk.toLowerCase();
  $("#summary").textContent = `${state.checks.length} checks completed. Warnings reflect deployment conditions, not personal privacy choices.`;
}

function reportText() {
  const score = calculateScore();
  const risk = score >= 85 ? "LOW" : score >= 65 ? "MODERATE" : "HIGH";
  const lines = [
    "SENTINEL // BROWSER SECURITY AUDITOR",
    `Score: ${score}/100 (${risk})`,
    `Generated: ${new Date().toISOString()}`,
    "",
    ...state.checks.map((check) => `[${check.status}] ${check.name}: ${check.detail}`)
  ];
  return lines.join("\n");
}

function reportJson() {
  return JSON.stringify({
    scanner: "SENTINEL",
    version: "2.1",
    generatedAt: new Date().toISOString(),
    score: calculateScore(),
    checks: state.checks,
    environment: state.environment,
    privacy: "Generated locally. No history, passwords, bookmarks, files, or permission prompts were used."
  }, null, 2);
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(reportText());
    log("Summary copied to clipboard.", "ok");
    $("#copyBtn").textContent = "COPIED";
    window.setTimeout(() => { $("#copyBtn").textContent = "COPY SUMMARY"; }, 1800);
  } catch {
    log("Clipboard access is unavailable. Use Download JSON instead.", "warntext");
  }
}

function downloadReport() {
  const blob = new Blob([reportJson()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sentinel-audit-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  log("JSON report generated locally.", "ok");
}

async function run() {
  if (state.running) return;
  state.running = true;
  state.checks = [];
  state.serverAudit = null;
  state.environment = {};
  terminal.replaceChildren();
  results.replaceChildren();
  emptyResults.classList.add("hidden");
  scanArea.classList.remove("hidden");
  startBtn.disabled = true;
  rescanBtn.disabled = true;
  startBtn.textContent = "SCANNING...";
  setLiveStatus("SCANNING", true);
  setProgress(0, 1);
  scanArea.scrollIntoView({ behavior: "smooth", block: "start" });

  log("Booting SENTINEL engine", "infotext");
  await sleep(180);
  log("No database connection configured", "ok");
  log("No browser-history API requested", "ok");

  const jobs = [
    ["Origin & transport", "HTTPS / Secure Context", "Browser security APIs should run in a secure context.", () => ({
      status: window.isSecureContext ? "PASS" : "WARNING",
      detail: window.isSecureContext ? "Secure context detected." : "Use HTTPS for browser security APIs."
    })],
    ["Origin & transport", "Transport Security", "Checks whether this page is served over HTTPS or a trusted local origin.", () => {
      const trustedLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
      const secure = location.protocol === "https:" || trustedLocalhost;
      return { status: secure ? "PASS" : "WARNING", detail: secure ? "HTTPS or trusted localhost detected." : "This page is using an insecure transport." };
    }],
    ["Headers & isolation", "Deployment Security Headers", "Verifies security headers returned by the same-origin API endpoint.", async () => {
      const audit = await inspectDeployment();
      if (!audit) return { status: "WARNING", detail: "Could not reach /api/security. Deploy the API with this project." };
      const present = audit.headers.filter((header) => header.present);
      const missing = audit.headers.filter((header) => !header.present).map((header) => header.label);
      return {
        status: missing.length ? "WARNING" : "PASS",
        detail: missing.length ? `${present.length}/${audit.headers.length} present. Missing: ${missing.join(", ")}.` : "All nine configured response security headers were observed."
      };
    }],
    ["Headers & isolation", "Content Security Policy", "Evaluates whether the response CSP has restrictive baseline directives.", () => {
      const csp = state.serverAudit?.headers.find((header) => header.key === "content-security-policy")?.value || "";
      const required = ["default-src", "script-src", "style-src", "connect-src", "frame-ancestors", "base-uri", "form-action"];
      const missing = required.filter((directive) => !new RegExp(`(^|;)\\s*${directive}\\b`, "i").test(csp));
      const unsafe = /'unsafe-inline'|'unsafe-eval'/.test(csp);
      if (!csp) return { status: "WARNING", detail: "No Content-Security-Policy response header was observed." };
      if (missing.length || unsafe) return { status: "WARNING", detail: `${missing.length ? `Missing: ${missing.join(", ")}. ` : ""}${unsafe ? "Avoid unsafe-inline and unsafe-eval where possible." : ""}` };
      return { status: "PASS", detail: "CSP includes baseline allowlisting and anti-embedding directives." };
    }],
    ["Headers & isolation", "Transport and Referrer Policy", "Checks HSTS and referrer minimization on the deployment response.", () => {
      const headers = state.serverAudit?.headers || [];
      const hsts = headers.find((header) => header.key === "strict-transport-security")?.value || "";
      const referrer = headers.find((header) => header.key === "referrer-policy")?.value || "";
      const hstsOkay = /max-age=\s*\d{6,}/i.test(hsts);
      const referrerOkay = /no-referrer|same-origin|strict-origin/i.test(referrer);
      return { status: hstsOkay && referrerOkay ? "PASS" : "WARNING", detail: `${hstsOkay ? "HSTS is present" : "HSTS is missing or too short"}; ${referrerOkay ? "referrer disclosure is restricted" : "referrer policy is missing or permissive"}.` };
    }],
    ["Headers & isolation", "Permissions Policy", "Checks whether sensitive hardware and topic surfaces are explicitly restricted.", () => {
      const policy = state.serverAudit?.headers.find((header) => header.key === "permissions-policy")?.value || "";
      const restricted = ["camera=()", "microphone=()", "geolocation=()", "browsing-topics=()"].filter((rule) => policy.includes(rule));
      return { status: restricted.length === 4 ? "PASS" : "WARNING", detail: `${restricted.length}/4 sensitive feature groups are explicitly disabled by Permissions-Policy.` };
    }],
    ["Headers & isolation", "Cross-Origin Isolation", "Checks COOP, COEP, CORP, and the browser’s resulting isolation state.", () => {
      const headers = state.serverAudit?.headers || [];
      const value = (key) => headers.find((header) => header.key === key)?.value || "";
      const configured = value("cross-origin-opener-policy") === "same-origin" && value("cross-origin-embedder-policy") === "require-corp" && value("cross-origin-resource-policy") === "same-origin";
      const isolated = Boolean(window.crossOriginIsolated);
      return { status: configured && isolated ? "PASS" : "WARNING", detail: configured && isolated ? "COOP, COEP, CORP, and browser isolation are active." : "Cross-origin isolation is incomplete; verify COOP=same-origin, COEP=require-corp, and CORP=same-origin." };
    }],
    ["Headers & isolation", "Serverless Endpoint", "Checks that the privacy-preserving deployment metadata endpoint is responding.", () => {
      const audit = state.serverAudit;
      const valid = Boolean(audit?.response.ok && audit.payload?.scanner === "SENTINEL");
      return { status: valid ? "PASS" : "WARNING", detail: valid ? "SENTINEL API responded without collecting visitor data." : "The expected JSON response was not available." };
    }],
    ["Storage & state", "Web Storage", "Tests temporary localStorage and sessionStorage access, then removes the probe values.", () => {
      const local = probeStorage(window.localStorage, "__sentinel_local_probe");
      const session = probeStorage(window.sessionStorage, "__sentinel_session_probe");
      return { status: local && session ? "PASS" : "WARNING", detail: local && session ? "Both storage surfaces are available; no values were retained." : "One or more storage surfaces are blocked in this context." };
    }],
    ["Storage & state", "IndexedDB Surface", "Reports whether this origin can use IndexedDB; no databases are opened or enumerated.", () => ({
      status: window.indexedDB ? "PASS" : "INFO",
      detail: window.indexedDB ? "IndexedDB is available; SENTINEL did not open or inspect any database." : "IndexedDB is unavailable in this context."
    })],
    ["Storage & state", "Cache Storage Surface", "Reports whether the Cache API exists; no caches are opened or read.", () => ({
      status: window.caches ? "INFO" : "INFO",
      detail: window.caches ? "Cache Storage is available; SENTINEL did not enumerate cached responses." : "Cache Storage is unavailable in this context."
    })],
    ["Storage & state", "Storage Quota Surface", "Checks whether the browser exposes quota estimates without inspecting stored records.", async () => {
      try {
        const estimate = await navigator.storage?.estimate?.();
        return { status: estimate ? "INFO" : "INFO", detail: estimate ? "Quota estimates are exposed; stored keys and values were not inspected." : "Storage quota estimates are unavailable." };
      } catch {
        return { status: "INFO", detail: "Storage quota estimates are restricted in this context." };
      }
    }],
    ["Storage & state", "Cookie Access Boundary", "Confirms the browser reports cookie support; page scripts still cannot read HttpOnly cookies.", () => ({
      status: navigator.cookieEnabled ? "PASS" : "INFO",
      detail: navigator.cookieEnabled ? "Cookies are enabled. HttpOnly values remain inaccessible to page scripts." : "Cookies are disabled, which can improve tracking resistance."
    })],
    ["Storage & state", "Third-Party Storage Boundary", "Reports whether the Storage Access API exists without requesting unpartitioned third-party storage.", () => ({
      status: "INFO",
      detail: document.hasStorageAccess ? "Storage Access API is available; SENTINEL did not request third-party cookie access." : "Storage Access API is unavailable; same-origin storage remains origin-scoped."
    })],
    ["Permissions & hardware", "Web Crypto", "Checks for the browser’s native cryptography API without generating or transmitting secrets.", () => ({
      status: window.isSecureContext && Boolean(window.crypto?.subtle) ? "PASS" : "INFO",
      detail: window.crypto?.subtle ? "Web Crypto is available in this context." : "Web Crypto is unavailable or restricted to secure contexts."
    })],
    ["Permissions & hardware", "Credential Management Surface", "Reports whether the browser exposes credential mediation without reading saved credentials.", () => ({
      status: "INFO",
      detail: navigator.credentials ? "Credential Management is available; no credential get or create operation was attempted." : "Credential Management is unavailable."
    })],
    ["Permissions & hardware", "Local File Boundary", "Reports whether a user-mediated file picker exists without opening it or reading files.", () => ({
      status: "INFO",
      detail: window.showOpenFilePicker ? "File System Access is available only through a user gesture; SENTINEL did not open it." : "File System Access picker is unavailable."
    })],
    ["Permissions & hardware", "WebAuthn Surface", "Reports whether platform authentication APIs exist without creating or reading credentials.", () => ({
      status: "INFO",
      detail: window.PublicKeyCredential ? "WebAuthn is available; no authenticator prompt was triggered." : "WebAuthn is unavailable in this browser context."
    })],
    ["Permissions & hardware", "Media Capture Surface", "Reports camera and microphone API exposure without calling getUserMedia.", () => ({
      status: "INFO",
      detail: navigator.mediaDevices?.getUserMedia ? "Media capture API is available; no camera or microphone stream was requested." : "Media capture is unavailable or restricted."
    })],
    ["Permissions & hardware", "WebRTC Surface", "Reports peer connection support without creating a peer, ICE gathering, or network probe.", () => ({
      status: "INFO",
      detail: window.RTCPeerConnection ? "WebRTC is available; SENTINEL did not create a connection or inspect network candidates." : "WebRTC is unavailable."
    })],
    ["Permissions & hardware", "Permissions API", "Checks whether permission states can be queried without requesting access.", () => ({
      status: navigator.permissions ? "PASS" : "INFO",
      detail: navigator.permissions ? "Permission states are queryable without prompting." : "This browser does not expose the Permissions API."
    })],
    ...permissionChecks.map(([name, label]) => [
      "Permissions & hardware",
      `${label} Permission`,
      `Reads the current ${label.toLowerCase()} permission state without requesting access.`,
      async () => {
        const stateValue = await queryPermission(name);
        return { status: "INFO", detail: stateValue === "unsupported" ? "Permission state is not exposed by this browser." : `Current state: ${stateValue}. No permission was requested.` };
      }
    ]),
    ["Permissions & hardware", "Service Worker Surface", "Reports whether this origin can register service workers; none are registered by SENTINEL.", () => ({
      status: "INFO",
      detail: navigator.serviceWorker ? "Service worker API is available; this scanner has not registered one." : "Service worker API is unavailable."
    })],
    ["Privacy signals", "Do Not Track Signal", "Reads the browser’s privacy preference signal without changing it.", () => ({
      status: navigator.doNotTrack === "1" ? "PASS" : "INFO",
      detail: navigator.doNotTrack === "1" ? "Do Not Track is enabled." : "No enabled Do Not Track signal was exposed."
    })],
    ["Privacy signals", "Global Privacy Control", "Reads the browser’s Global Privacy Control signal without changing it.", () => ({
      status: navigator.globalPrivacyControl ? "PASS" : "INFO",
      detail: navigator.globalPrivacyControl ? "Global Privacy Control is enabled." : "No enabled Global Privacy Control signal was exposed."
    })],
    ["Privacy signals", "Automation Signal", "Reports whether the browser exposes the standard WebDriver automation flag.", () => ({
      status: "INFO",
      detail: navigator.webdriver ? "WebDriver automation is exposed to this page." : "WebDriver automation flag is not exposed."
    })],
    ["Privacy signals", "Clipboard Surface", "Reports clipboard API exposure without reading or writing clipboard contents.", () => ({
      status: "INFO",
      detail: navigator.clipboard ? "Async Clipboard API is available; SENTINEL did not inspect clipboard data." : "Async Clipboard API is unavailable."
    })],
    ["Privacy signals", "Referrer Surface", "Reports whether this document received a referrer value without exposing its contents in the report.", () => ({
      status: "INFO",
      detail: document.referrer ? "A referrer value is present; the report intentionally does not include it." : "No referrer value was exposed to this document."
    })],
    ["Privacy signals", "Network State", "Reports whether the browser currently considers the device online.", () => ({
      status: navigator.onLine ? "PASS" : "INFO",
      detail: navigator.onLine ? "Browser reports an online connection." : "Browser reports offline; local checks still completed."
    })],
    ["Protected surfaces", "Browser History Boundary", "Confirms that page code has no browser-history database API; history.length is only a session hint.", () => ({
      status: "INFO",
      detail: "Browser history entries are protected by the browser; SENTINEL did not access or infer visited URLs."
    })],
    ["Protected surfaces", "Saved Password Boundary", "Confirms that saved passwords are not readable by ordinary page JavaScript.", () => ({
      status: "INFO",
      detail: "Saved passwords require browser-managed credential flows; SENTINEL did not request or read credentials."
    })],
    ["Protected surfaces", "Bookmarks Boundary", "Confirms that ordinary web pages have no bookmarks API.", () => ({
      status: "INFO",
      detail: "Bookmarks are browser-owned data and are not exposed to this page."
    })],
    ["Protected surfaces", "Cross-Origin Data Boundary", "Confirms the page is governed by the browser’s same-origin boundary.", () => ({
      status: location.origin && window.top === window.self ? "PASS" : "INFO",
      detail: window.top === window.self ? "Top-level context detected; cross-origin storage remains origin-scoped." : "This page is embedded; cross-origin access is still browser-controlled."
    })],
    ["Protected surfaces", "Opener Boundary", "Reports whether this page has an opener reference without dereferencing another page.", () => ({
      status: "INFO",
      detail: window.opener ? "An opener reference exists; COOP can isolate it when deployed." : "No opener reference is exposed to this page."
    })]
  ];

  for (let index = 0; index < jobs.length; index += 1) {
    const [category, name, description, execute] = jobs[index];
    log(`Checking ${name.toLowerCase()}...`);
    try {
      const result = await execute();
      addCheck(name, description, result.status, result.detail, category);
      log(`${name}: ${result.status}`, result.status === "WARNING" ? "warntext" : result.status === "PASS" ? "ok" : "infotext");
    } catch {
      addCheck(name, description, "WARNING", "The check could not complete in this browser context.", category);
      log(`${name}: check failed`, "warntext");
    }
    setProgress(index + 1, jobs.length);
    await sleep(100);
  }

  state.environment = buildEnvironment();
  renderEnvironment();
  updateScore();
  log("Audit complete. No private browser data was accessed.", "ok");
  setLiveStatus("AUDIT COMPLETE");
  startBtn.disabled = false;
  startBtn.textContent = "RUN SCAN AGAIN";
  rescanBtn.disabled = false;
  state.running = false;
}

function setFilter(filter) {
  state.filter = filter;
  document.querySelectorAll(".filter-button").forEach((button) => {
    const active = button.dataset.filter === filter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderChecks();
}

function setCategory(category) {
  state.category = category;
  renderChecks();
}

$("#learnMore").addEventListener("click", () => {
  $("#howItWorks").classList.remove("hidden");
  $("#howItWorks").scrollIntoView({ behavior: "smooth", block: "center" });
});

$("#closeHow").addEventListener("click", () => $("#howItWorks").classList.add("hidden"));
document.querySelectorAll(".filter-button").forEach((button) => button.addEventListener("click", () => setFilter(button.dataset.filter)));
$("#categoryFilter").addEventListener("change", (event) => setCategory(event.target.value));
$("#copyBtn").addEventListener("click", copyReport);
$("#downloadBtn").addEventListener("click", downloadReport);
startBtn.addEventListener("click", run);
rescanBtn.addEventListener("click", run);

window.addEventListener("resize", () => {
  if (!state.running && Object.keys(state.environment).length) {
    state.environment.Viewport = `${window.innerWidth} × ${window.innerHeight}`;
    renderEnvironment();
  }
});
