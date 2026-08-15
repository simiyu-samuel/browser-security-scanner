const NATIVE_HOST = "com.sentinel.local_auditor";
const HISTORY_LIMIT = 10000;

function failure(error) {
  return { supported: false, error: error instanceof Error ? error.message : String(error) };
}

async function safe(task) {
  try {
    return { supported: true, value: await task() };
  } catch (error) {
    return failure(error);
  }
}

function summarizeUrls(urls) {
  const schemes = {};
  const origins = new Set();
  for (const rawUrl of urls) {
    try {
      const url = new URL(rawUrl);
      schemes[url.protocol] = (schemes[url.protocol] || 0) + 1;
      origins.add(url.origin);
    } catch {
      schemes.invalid = (schemes.invalid || 0) + 1;
    }
  }
  return { total: urls.length, uniqueOrigins: origins.size, schemes };
}

function summarizeHistory(entries) {
  const transitions = {};
  const urls = [];
  let oldestVisit = null;
  let newestVisit = null;
  for (const entry of entries) {
    if (entry.url) urls.push(entry.url);
    const transition = entry.lastVisitTime ? "visited" : "unknown";
    transitions[transition] = (transitions[transition] || 0) + 1;
    if (entry.lastVisitTime) {
      oldestVisit = oldestVisit === null ? entry.lastVisitTime : Math.min(oldestVisit, entry.lastVisitTime);
      newestVisit = newestVisit === null ? entry.lastVisitTime : Math.max(newestVisit, entry.lastVisitTime);
    }
  }
  return {
    sampledEntries: entries.length,
    sampleLimit: HISTORY_LIMIT,
    possiblyTruncated: entries.length >= HISTORY_LIMIT,
    timeRange: { oldestVisit, newestVisit },
    transitions,
    ...summarizeUrls(urls)
  };
}

function summarizeBookmarks(nodes) {
  let folders = 0;
  let links = 0;
  const urls = [];
  function walk(items) {
    for (const node of items || []) {
      if (node.url) {
        links += 1;
        urls.push(node.url);
      } else {
        folders += 1;
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return { folders, links, ...summarizeUrls(urls) };
}

function summarizeCookies(cookies) {
  const sameSite = {};
  let secure = 0;
  let httpOnly = 0;
  let session = 0;
  let partitioned = 0;
  for (const cookie of cookies) {
    if (cookie.secure) secure += 1;
    if (cookie.httpOnly) httpOnly += 1;
    if (cookie.session) session += 1;
    if (cookie.partitionKey) partitioned += 1;
    sameSite[cookie.sameSite || "unspecified"] = (sameSite[cookie.sameSite || "unspecified"] || 0) + 1;
  }
  return { total: cookies.length, secure, httpOnly, session, partitioned, sameSite };
}

function summarizeDownloads(downloads) {
  const states = {};
  const danger = {};
  for (const download of downloads) {
    states[download.state || "unknown"] = (states[download.state || "unknown"] || 0) + 1;
    if (download.danger) danger[download.danger] = (danger[download.danger] || 0) + 1;
  }
  return { sampled: downloads.length, states, dangerSignals: danger };
}

function summarizeExtensions(items) {
  const types = {};
  let enabled = 0;
  let disabled = 0;
  let permissionCount = 0;
  for (const item of items) {
    types[item.type || "unknown"] = (types[item.type || "unknown"] || 0) + 1;
    if (item.enabled) enabled += 1;
    else disabled += 1;
    permissionCount += (item.permissions || []).length + (item.hostPermissions || []).length;
  }
  return { installed: items.length, enabled, disabled, types, declaredPermissionCount: permissionCount };
}

async function readSetting(getter) {
  if (typeof getter !== "function") return { supported: false };
  return safe(() => getter({ incognito: false }));
}

async function readContentSetting(name) {
  const setting = chrome.contentSettings?.[name];
  if (!setting?.get) return { supported: false };
  return safe(() => setting.get({ primaryUrl: "https://example.invalid/", incognito: false }));
}

async function collectBrowserData() {
  const [history, bookmarks, cookies, tabs, downloads, sessions, extensions, permissionSet] = await Promise.all([
    safe(() => chrome.history.search({ text: "", startTime: 0, maxResults: HISTORY_LIMIT })),
    safe(() => chrome.bookmarks.getTree()),
    safe(() => chrome.cookies.getAll({})),
    safe(() => chrome.tabs.query({})),
    safe(() => chrome.downloads.search({ limit: 5000 })),
    safe(() => chrome.sessions.getRecentlyClosed({ maxResults: 100 })),
    safe(() => chrome.management.getAll()),
    safe(() => chrome.permissions.getAll())
  ]);

  return {
    history: history.supported ? summarizeHistory(history.value) : history,
    bookmarks: bookmarks.supported ? summarizeBookmarks(bookmarks.value) : bookmarks,
    cookies: cookies.supported ? summarizeCookies(cookies.value) : cookies,
    tabs: tabs.supported ? {
      open: tabs.value.length,
      incognito: tabs.value.filter((tab) => tab.incognito).length,
      urls: summarizeUrls(tabs.value.map((tab) => tab.url).filter(Boolean))
    } : tabs,
    downloads: downloads.supported ? summarizeDownloads(downloads.value) : downloads,
    recentlyClosed: sessions.supported ? { sessions: sessions.value.length } : sessions,
    extensions: extensions.supported ? summarizeExtensions(extensions.value) : extensions,
    extensionPermissions: permissionSet.supported ? {
      permissions: permissionSet.value.permissions || [],
      origins: (permissionSet.value.origins || []).length
    } : permissionSet
  };
}

async function collectPrivacySettings() {
  const [thirdPartyCookies, passwordSaving, autofillAddress, autofillCards, cookies, javascript, notifications, geolocation, media] = await Promise.all([
    readSetting(chrome.privacy?.websites?.thirdPartyCookiesAllowed?.get?.bind(chrome.privacy.websites.thirdPartyCookiesAllowed)),
    readSetting(chrome.privacy?.services?.passwordSavingEnabled?.get?.bind(chrome.privacy.services.passwordSavingEnabled)),
    readSetting(chrome.privacy?.services?.autofillAddressEnabled?.get?.bind(chrome.privacy.services.autofillAddressEnabled)),
    readSetting(chrome.privacy?.services?.autofillCreditCardEnabled?.get?.bind(chrome.privacy.services.autofillCreditCardEnabled)),
    readContentSetting("cookies"),
    readContentSetting("javascript"),
    readContentSetting("notifications"),
    readContentSetting("geolocation"),
    readContentSetting("mediaStream")
  ]);
  return { thirdPartyCookies, passwordSaving, autofillAddress, autofillCards, contentSettings: { cookies, javascript, notifications, geolocation, media } };
}

async function collectSystemData() {
  const [platform, cpu, memory, storage, nativeHost] = await Promise.all([
    safe(() => chrome.runtime.getPlatformInfo()),
    safe(() => chrome.system?.cpu?.getInfo?.()),
    safe(() => chrome.system?.memory?.getInfo?.()),
    safe(() => chrome.system?.storage?.getInfo?.()),
    safe(() => chrome.runtime.sendNativeMessage(NATIVE_HOST, { action: "system_inventory" }))
  ]);

  const cpuSummary = cpu.supported ? { model: cpu.value.model, processors: cpu.value.numOfProcessors, arch: cpu.value.archName } : cpu;
  const memorySummary = memory.supported ? { capacity: memory.value.capacity } : memory;
  const storageSummary = storage.supported ? { devices: storage.value.map((item) => ({ type: item.type, capacity: item.capacity })) } : storage;
  return { platform, cpu: cpuSummary, memory: memorySummary, storage: storageSummary, nativeHost };
}

async function runLocalAudit() {
  const [browserData, privacySettings, system] = await Promise.all([
    collectBrowserData(),
    collectPrivacySettings(),
    collectSystemData()
  ]);

  return {
    scanner: "SENTINEL LOCAL EXTENSION",
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    localOnly: true,
    networkRequests: 0,
    destructiveActions: 0,
    browser: {
      userAgent: self.navigator?.userAgent || "Unavailable",
      manifestVersion: chrome.runtime.getManifest().manifest_version
    },
    browserData,
    privacySettings,
    system
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "RUN_LOCAL_AUDIT") return false;
  runLocalAudit().then(sendResponse).catch((error) => sendResponse({ error: error instanceof Error ? error.message : String(error), localOnly: true }));
  return true;
});
