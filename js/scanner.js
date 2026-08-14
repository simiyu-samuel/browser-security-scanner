const $=s=>document.querySelector(s);
const startBtn=$("#startBtn"), dash=$("#dashboard"), resultsSection=$("#resultsSection");
const results=$("#results"), terminal=$("#terminal"), env=$("#environment");
const checks=[];

function log(msg,type="info"){const t=new Date().toLocaleTimeString();terminal.insertAdjacentHTML("beforeend",`<div class="log ${type}"><span class="time">[${t}]</span> ${msg}</div>`);terminal.scrollTop=terminal.scrollHeight}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function add(name,desc,status,detail){checks.push({name,desc,status,detail});renderChecks()}

async function permission(name){
  try{
    if(!navigator.permissions) return "unsupported";
    const p=await navigator.permissions.query({name});
    return p.state;
  }catch{return "unsupported"}
}

function renderChecks(){
  results.innerHTML=checks.map(c=>`<div class="check"><div><h3>${c.name}</h3><p>${c.desc}</p></div><span class="badge ${c.status==='PASS'?'pass':c.status==='WARNING'?'warn':'info'}">${c.status}</span></div>`).join("");
  const total=checks.length, pass=checks.filter(x=>x.status==="PASS").length, warn=checks.filter(x=>x.status==="WARNING").length;
  $("#total").textContent=total;$("#passed").textContent=pass;$("#warnings").textContent=warn;$("#notes").textContent=total-pass-warn;
  $("#progressText").textContent=Math.min(100,Math.round(total/10*100))+"%";
}

async function run(){
  startBtn.disabled=true;startBtn.textContent="SCANNING...";
  dash.classList.remove("hidden");resultsSection.classList.remove("hidden");$("#details").classList.remove("hidden");
  log("Booting SENTINEL engine","infotext"); await sleep(350);
  log("No database connection configured","ok"); await sleep(250);
  log("No browser-history API requested","ok"); await sleep(250);

  log("Checking secure context...");
  add("HTTPS / Secure Context","Browser security APIs should run in a secure context.",window.isSecureContext?"PASS":"WARNING",window.isSecureContext?"Secure context detected.":"Use HTTPS for the deployed scanner.");
  await sleep(350);

  log("Checking cookie access boundary...");
  add("Cookie Access Boundary","Page JavaScript cannot directly read HttpOnly cookies.", "PASS","HttpOnly cookies are inaccessible to page scripts.");
  await sleep(300);

  log("Checking local storage...");
  let storage="PASS";try{localStorage.setItem("__sentinel","1");localStorage.removeItem("__sentinel")}catch{storage="WARNING"}
  add("Web Storage","Checks whether localStorage is available to this origin.",storage,"No stored values are collected.");
  await sleep(300);

  log("Querying supported permission states...");
  for(const [name,label] of [["notifications","Notifications"],["geolocation","Geolocation"],["camera","Camera"],["microphone","Microphone"]]){
    const state=await permission(name);
    add(`${label} Permission`,`${state==="unsupported"?"Browser did not expose this permission state.":"Current permission state: "+state}.`,state==="denied"||state==="granted"||state==="prompt"?"PASS":"INFO","No permission is requested by this scan.");
    await sleep(220);
  }

  log("Inspecting browser capabilities...");
  add("JavaScript Engine","JavaScript is enabled because this audit is running.", "PASS","Required for client-side checks.");
  await sleep(250);

  log("Collecting non-sensitive environment metadata...");
  env.innerHTML=[
    ["Browser",navigator.userAgent],
    ["Platform",navigator.platform||"Unavailable"],
    ["Language",navigator.language||"Unavailable"],
    ["Screen",`${screen.width} × ${screen.height}`],
    ["Viewport",`${innerWidth} × ${innerHeight}`],
    ["Online",navigator.onLine?"Online":"Offline"],
    ["Secure Context",window.isSecureContext?"Yes":"No"],
    ["Cookies Enabled",navigator.cookieEnabled?"Yes":"No"]
  ].map(x=>`<div><b>${x[0]}</b><span>${escapeHtml(x[1])}</span></div>`).join("");

  const score=Math.max(0,100-checks.filter(x=>x.status==="WARNING").length*12);
  $("#score").textContent=score;
  $("#risk").textContent=score>=85?"LOW":score>=65?"MODERATE":"HIGH";
  $("#risk").style.color=score>=85?"var(--green)":score>=65?"var(--yellow)":"var(--red)";
  $("#summary").textContent=`${checks.length} checks completed. No private browser history was accessed.`;
  log("Audit complete.","ok");
  startBtn.textContent="SCAN COMPLETE";
}

function escapeHtml(v){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
startBtn.addEventListener("click",run);