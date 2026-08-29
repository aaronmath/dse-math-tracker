const YEARS = Array.from({ length: 15 }, (_, i) => 2012 + i);
const STATE_CLASS = ["", "s1", "s2", "s3"];
const STATE_LABEL = ["未做", "唔識", "一般", "已掌握"];
const TAGS = [
  ["calc", "運算錯誤"], ["careless", "粗心與漏字"], ["concept", "概念不清"],
  ["format", "格式錯誤"], ["formula", "背錯公式"], ["misread", "審題錯誤"],
  ["time", "時間不足"], ["method", "方法錯誤"]
];
const LV_COLS = ["U", "1", "2", "3", "4", "5", "5*", "5**"];
const CUT_COLS = ["5**", "5*", "5", "4", "3", "2"];
const PREF_KEY = "dse-math-tracker-prefs";
const TIMER = {
  p1: { name: "必修卷一", normal: 2 * 3600 + 15 * 60, extra: 2 * 3600 + 48 * 60 + 45 },
  p2: { name: "必修卷二", normal: 1 * 3600 + 15 * 60, extra: 1 * 3600 + 33 * 60 + 45 },
  m1: { name: "M1", normal: 2 * 3600 + 30 * 60, extra: 3 * 3600 + 7 * 60 + 30 },
  m2: { name: "M2", normal: 2 * 3600 + 30 * 60, extra: 3 * 3600 + 7 * 60 + 30 }
};

function range(a, b) { return Array.from({ length: b - a + 1 }, (_, i) => a + i); }
function p1Missing(year) { return year === 2016 ? [] : [20]; }
function p1Secs(year) {
  return year === 2016
    ? [{ name: "甲一", qs: range(1, 9) }, { name: "甲二", qs: range(10, 14) }, { name: "乙部", qs: range(15, 20) }]
    : [{ name: "甲一", qs: range(1, 9) }, { name: "甲二", qs: range(10, 14) }, { name: "乙部", qs: range(15, 19) }];
}
function m1Secs(year) {
  if (year <= 2014 || year === 2026) return [{ name: "甲部", qs: range(1, 9) }, { name: "乙部", qs: range(10, 13) }];
  return [{ name: "甲部", qs: range(1, 8) }, { name: "乙部", qs: range(9, 12) }];
}
function m2Secs(year) {
  if (year <= 2013) return [{ name: "甲部", qs: range(1, 10) }, { name: "乙部", qs: range(11, 14) }];
  if (year === 2014 || year === 2024 || year === 2025) return [{ name: "甲部", qs: range(1, 9) }, { name: "乙部", qs: range(10, 13) }];
  return [{ name: "甲部", qs: range(1, 8) }, { name: "乙部", qs: range(9, 12) }];
}
const PAPERS = {
  p1: { name: "必修數學卷一", full: 105, sectionsFor: p1Secs, missing: p1Missing },
  p2: { name: "必修數學卷二", full: 45, sectionsFor: () => [{ name: "甲部", qs: range(1, 30) }, { name: "乙部", qs: range(31, 45) }], missing: () => [] },
  m1: { name: "M1", full: 100, sectionsFor: m1Secs, missing: () => [] },
  m2: { name: "M2", full: 100, sectionsFor: m2Secs, missing: () => [] }
};

const storeKey = "dse-math-tracker-v2";
let db = loadDb();
let currentProfile = db.currentProfile;
let currentPaper = "p1";
let currentView = "tracker";
let batch = false;
let selected = new Set();
let noteTarget = null;
let longTimer = null;
let longFired = false;
let showHit = true;
let yearHitOff = {};
let cellFilter = "all";
let prefs = loadPrefs();
let mcYearFilled = { dse: false, ce: false };
let itemYearFilled = false;
let timerExtra = false;
let timerLocked = false;
let timerRun = { paper: "p1", extra: false, start: 0, pause: 0, paused: false, ended: false, tick: null, warned15: false, warned5: false };
let undoSnap = null;
let mcPick = null;
let mcHideAns = false;
let mcUnseen = false;
let radarAxis = "";
const AXES = [
  { id: "a-alg", name: "甲　數與代數", part: "甲", topics: ["指數","主項變換","因式分解","代數分式","不等式","百分數","恆等式","聯立方程","函數","二次方程","數列","率與比","二次函數圖像","多項式","變分"] },
  { id: "a-meas", name: "甲　度量圖形", part: "甲", topics: ["量度與誤差","面積與體積","扇形","直線圖形：角度","直線圖形：長度與面積","多邊形","對稱","面積比","三角函數","三角學（甲部）","圓的性質"] },
  { id: "a-coord", name: "甲　坐標幾何", part: "甲", topics: ["直線方程","圓方程","軌跡","極坐標","坐標幾何：點"] },
  { id: "a-stat", name: "甲　統計與概率", part: "甲", topics: ["概率","統計"] },
  { id: "b-alg", name: "乙　數與代數", part: "乙", topics: ["複數","進制","指數與對數","H.C.F./L.C.F.","線性規劃","續方程","數列","二次方程"] },
  { id: "b-shape", name: "乙　圖形與幾何", part: "乙", topics: ["三角學（乙部）","三角函數","立體三角","圓的性質"] },
  { id: "b-coord", name: "乙　坐標幾何", part: "乙", topics: ["圖像變換","圖像軸的變換","圓方程","三角形的心"] },
  { id: "b-stat", name: "乙　統計與概率", part: "乙", topics: ["排列組合","概率","統計"] }
];
function axisOf(part, topic) {
  return AXES.find(a => a.part === part && a.topics.includes(topic)) || null;
}
function pushUndo() {
  const pr = prof();
  undoSnap = { id: currentProfile, cells: JSON.parse(JSON.stringify(pr.cells)), scores: JSON.parse(JSON.stringify(pr.scores)) };
}
function doUndo() {
  if (!undoSnap || !db.profiles[undoSnap.id]) return;
  db.profiles[undoSnap.id].cells = undoSnap.cells;
  db.profiles[undoSnap.id].scores = undoSnap.scores;
  undoSnap = null;
  save();
  if (currentView === "tracker") renderTracker();
  else if (currentView === "weak") renderWeak();
  else if (currentView === "mc") renderMc();
  else if (currentView === "grades") renderGrades();
}


function loadPrefs() {
  const d = { showM1: false, showM2: false, mcMarkOn: false, timerSound: false, weakBands: { hi: true, mid: false, lo: false }, hkRef: true };
  try { return Object.assign(d, JSON.parse(localStorage.getItem(PREF_KEY) || "{}")); }
  catch { return d; }
}
function savePrefs() { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }
function blankProfile(name) { return { name, cells: {}, scores: {}, updatedAt: Date.now() }; }
function loadDb() {
  try {
    const v2 = localStorage.getItem(storeKey);
    if (v2) return JSON.parse(v2);
    const v1 = localStorage.getItem("dse-math-tracker-v1");
    if (v1) {
      const old = JSON.parse(v1);
      for (const p of Object.values(old.profiles || {})) p.scores = p.scores || {};
      return old;
    }
  } catch {}
  return { currentProfile: "自己", profiles: { "自己": blankProfile("自己") } };
}
function save() {
  db.currentProfile = currentProfile;
  if (db.profiles[currentProfile]) db.profiles[currentProfile].updatedAt = Date.now();
  localStorage.setItem(storeKey, JSON.stringify(db));
}
function prof() { return db.profiles[currentProfile]; }
function cellKey(paper, year, q) { return paper + ":" + year + ":" + q; }
function getCell(paper, year, q) { return prof().cells[cellKey(paper, year, q)] || { s: 0, note: "", tags: [] }; }
function setCell(paper, year, q, patch) {
  const k = cellKey(paper, year, q);
  prof().cells[k] = Object.assign({ s: 0, note: "", tags: [] }, getCell(paper, year, q), patch);
  save();
}
function scoreKey(paper, year) { return paper + ":" + year; }
function getScore(paper, year) {
  const v = prof().scores[scoreKey(paper, year)];
  return v == null || v === "" ? "" : v;
}
function clampScore(val, max) {
  if (val === "" || val == null) return "";
  const n = parseInt(String(val), 10);
  if (Number.isNaN(n)) return "";
  return Math.max(0, Math.min(max, n));
}
function paperMax(paper) { return PAPERS[paper] ? PAPERS[paper].full : 100; }
function setScore(paper, year, val) {
  const v = clampScore(val, paperMax(paper));
  if (v === "") delete prof().scores[scoreKey(paper, year)];
  else prof().scores[scoreKey(paper, year)] = v;
  save();
  return v;
}
function hasYearScore(paper, year) {
  const v = getScore(paper, year);
  return v !== "" && v != null;
}
function yearsDesc() { return YEARS.slice().reverse(); }
function allQs(paperId, year) {
  return PAPERS[paperId].sectionsFor(year).flatMap(s => s.qs).filter(q => !PAPERS[paperId].missing(year).includes(q));
}
function p2Row(series, year, q) {
  const list = (window.P2_DATA && P2_DATA[series] && P2_DATA[series][String(year)]) || [];
  return list.find(x => x.q === q) || null;
}
function p2Hit(year, q) {
  const row = p2Row("dse", year, q);
  return row && row.pct != null ? row.pct : null;
}
function topicOf(year, q) {
  const hit = (window.P2_TOPICS && P2_TOPICS.items || []).find(x => x.y === year && x.q === q);
  return hit ? hit.topic : "";
}
function bandOf(pct) {
  if (pct == null) return "";
  if (pct >= 60) return "hi";
  if (pct <= 40) return "lo";
  return "mid";
}
function bandClass(pct) {
  const b = bandOf(pct);
  return b ? "band-" + b : "";
}
function bandLabel(pct) {
  const b = bandOf(pct);
  return b === "hi" ? "簡易" : b === "mid" ? "中等" : b === "lo" ? "困難" : "";
}
function qLead(label) {
  const m = String(label).match(/^(\d+)/);
  return m ? +m[1] : 0;
}
function hasNote(c) { return !!(c.note && c.note.length) || !!(c.tags && c.tags.length); }
function matchFilter(c) {
  if (cellFilter === "all") return true;
  if (cellFilter === "note") return hasNote(c);
  return String(c.s) === cellFilter;
}
function tagName(id) { return (TAGS.find(t => t[0] === id) || [id, id])[1]; }
function esc(s) {
  return String(s)
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;")
    .replace(/'/g, "&#39;");
}
function fmt1(n) { return (Math.round(n * 10) / 10).toFixed(1); }
function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function renderProfiles() {
  document.getElementById("profile").innerHTML = Object.keys(db.profiles).map(n =>
    `<option ${n === currentProfile ? "selected" : ""}>${esc(n)}</option>`
  ).join("");
}
function renderPaperSelect() {
  document.getElementById("paper").innerHTML = Object.entries(PAPERS).map(([id, p]) =>
    `<option value="${id}" ${id === currentPaper ? "selected" : ""}>${p.name}</option>`
  ).join("");
  const hb = document.getElementById("hitBtn");
  hb.hidden = currentPaper !== "p2";
  hb.style.display = "";
  if (!hb.hidden) hb.textContent = showHit ? "隱藏命中率" : "顯示命中率";
}
function renderYearJump() {
  const el = document.getElementById("yearJump");
  el.innerHTML = yearsDesc().map(y => {
    const entered = hasYearScore(currentPaper, y);
    return `<button type="button" class="year-pill${entered ? " entered" : ""}" data-jump-year="${y}">${y}</button>`;
  }).join("");
}
function scrollToYear(y) {
  const el = document.querySelector(`.year-block[data-year="${y}"]`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
function renderStats() {
  let total = 0, counts = [0, 0, 0, 0];
  for (const y of YEARS) {
    for (const q of allQs(currentPaper, y)) { total++; counts[getCell(currentPaper, y, q).s]++; }
  }
  const done = total - counts[0];
  const pct = total ? Math.round(done * 100 / total) : 0;
  document.getElementById("stats").innerHTML = `
    <div class="stat"><b>${pct}%</b><span>已標記</span></div>
    <div class="stat"><b>${counts[3]}</b><span>已掌握</span></div>
    <div class="stat"><b>${counts[2]}</b><span>一般</span></div>
    <div class="stat"><b>${counts[1]}</b><span>唔識</span></div>
    <div class="stat"><b>${counts[0]}</b><span>未做</span></div>`;
}
function cellHtml(y, q) {
  const c = getCell(currentPaper, y, q);
  const sel = selected.has(y + ":" + q) ? "sel" : "";
  const dim = matchFilter(c) ? "" : "dim";
  const hit = currentPaper === "p2" && showHit && !yearHitOff[y] ? p2Hit(y, q) : null;
  const b = bandOf(hit);
  const hitHtml = hit != null ? `<span class="hit ${b}">${String(Math.round(hit)).padStart(2, "0")}</span>` : "";
  const qn = currentPaper === "p2"
    ? `<span class="qn" data-jump="${y}:${q}">${q}</span>`
    : `<span class="qn" style="cursor:default;text-decoration:none;color:var(--muted)">${q}</span>`;
  return `<div class="qcell ${dim}">${qn}
    <div class="cell ${STATE_CLASS[c.s] || ""} ${sel}" data-y="${y}" data-q="${q}">${hitHtml}</div>
    <button class="pencil ${hasNote(c) ? "filled" : ""}" data-note="${y}:${q}" title="筆記">✎</button>
  </div>`;
}
function renderGrid() {
  const paper = PAPERS[currentPaper];
  let html = "";
  for (const y of YEARS.slice().reverse()) {
    const secs = paper.sectionsFor(y);
    const secHtml = secs.map((sec, i) => {
      const cells = sec.qs.map(q => paper.missing(y).includes(q)
        ? `<div class="qcell"><span class="qn" style="cursor:default;text-decoration:none;color:var(--muted)">${q}</span><div class="cell missing"></div></div>`
        : cellHtml(y, q)).join("");
      return `${i ? '<div class="split"></div>' : ""}
        <div class="sec-wrap"><span class="sec-lab">${sec.name} ${sec.qs[0]}–${sec.qs[sec.qs.length - 1]}</span>
        <div class="sec">${cells}</div></div>`;
    }).join("");
    const sc = getScore(currentPaper, y);
    const hitBtn = currentPaper === "p2"
      ? `<button class="ghost" data-toggle-hit="${y}">${yearHitOff[y] ? "顯示命中率" : "隱藏命中率"}</button>` : "";
    html += `<div class="year-block" data-year="${y}">
      <div class="year-head">
        <b>${y}</b>
        <div class="score-box">分數 / ${paper.full}
          <input type="number" min="0" max="${paper.full}" step="1" inputmode="numeric" data-score="${y}" value="${sc}">
        </div>
        <button class="ghost" data-pick="year">選呢年</button>
        ${secs.map(sec => `<button class="ghost" data-pick="sec" data-from="${sec.qs[0]}" data-to="${sec.qs[sec.qs.length - 1]}">選${sec.name}</button>`).join("")}
        ${hitBtn}
      </div>
      <div class="qrow">${secHtml}</div>
    </div>`;
  }
  document.getElementById("grid").innerHTML = html;
}
function renderSummary() {
  const tagCount = {}; TAGS.forEach(([id]) => tagCount[id] = 0);
  let aWeak = 0, bWeak = 0, notes = 0;
  const counts = [0, 0, 0, 0];
  for (const y of YEARS) {
    const secs = PAPERS[currentPaper].sectionsFor(y);
    secs.forEach((sec, idx) => {
      sec.qs.forEach(q => {
        if (PAPERS[currentPaper].missing(y).includes(q)) return;
        const c = getCell(currentPaper, y, q);
        counts[c.s]++;
        if (c.s === 1 || c.s === 2) { if (idx === 0) aWeak++; else bWeak++; }
        if (hasNote(c)) notes++;
        (c.tags || []).forEach(t => { if (tagCount[t] != null) tagCount[t]++; });
      });
    });
  }
  const top = TAGS.map(([id, name]) => [name, tagCount[id]]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const tagLine = top.length ? "錯因：" + top.map(x => x[0] + " " + x[1]).join(" · ") : "尚未標記錯因";
  document.getElementById("summary").innerHTML =
    `已掌握 ${counts[3]} · 一般 ${counts[2]} · 唔識 ${counts[1]} · 未做 ${counts[0]}<br>` +
    `甲部未穩 ${aWeak} · 其餘未穩 ${bWeak}<br>${tagLine}<br>有筆記／標籤：${notes} 題`;
}
function renderTracker() {
  renderProfiles();
  renderPaperSelect();
  renderYearJump();
  renderStats();
  renderGrid();
  renderSummary();
  document.getElementById("batchBar").hidden = false;
  document.getElementById("trackerTheme").hidden = false;
  document.getElementById("batchBtn").textContent = batch ? "退出批量" : "批量選擇";
  document.getElementById("selCount").textContent = "已選 " + selected.size + " 格";
}

function isEasy(it) { return it.pct != null && it.pct >= 60; }
function bandOk(pct) {
  const b = bandOf(pct);
  if (!b) return false;
  const bands = prefs.weakBands || { hi: true, mid: false, lo: false };
  return !!bands[b];
}
function weakItems() {
  const out = [];
  for (const y of YEARS) {
    for (const q of allQs("p2", y)) {
      const c = getCell("p2", y, q);
      if (!(c.s === 1 || c.s === 2)) continue;
      const pct = p2Hit(y, q);
      const it = { y, q, s: c.s, topic: topicOf(y, q) || "未分類", tags: c.tags || [], note: c.note || "", part: q <= 30 ? "甲" : "乙", pct };
      if (!bandOk(pct)) continue;
      out.push(it);
    }
  }
  out.sort((a, b) => a.s - b.s || b.y - a.y || a.q - b.q);
  return out;
}
function itemRowHtml(it) {
  const lab = bandLabel(it.pct);
  const pct = it.pct == null ? "—" : it.pct + "%";
  const sh = lab ? `<span class="should ${bandOf(it.pct)}">${lab}</span>` : "";
  return `<tr data-jump="${it.y}:${it.q}" class="clickable"><td>${it.y}</td><td>Q${it.q}</td><td>${it.part}</td><td>${esc(it.topic)}</td><td class="${bandClass(it.pct)}">${pct}</td><td>${sh}</td><td>${(it.tags || []).map(tagName).join("、")}</td></tr>`;
}
function paintWeakChips() {
  const bands = prefs.weakBands || { hi: true, mid: false, lo: false };
  document.querySelectorAll("#weakChips .chip").forEach(btn => {
    btn.classList.toggle("on", !!bands[btn.dataset.band]);
  });
}

function markedP2Count() {
  let n = 0;
  for (const y of YEARS) for (const q of allQs("p2", y)) if (getCell("p2", y, q).s) n++;
  return n;
}
function topicAbility(part, topic) {
  const items = (P2_TOPICS.items || []).filter(x => x.part === part && x.topic === topic);
  let sum = 0, n = 0;
  items.forEach(x => {
    const c = getCell("p2", x.y, x.q);
    if (!c.s) return;
    sum += c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0;
    n++;
  });
  if (!n) return { n: 0, L: null };
  return { n, L: sum / n };
}
function abilityBand(L) {
  if (L == null) return "";
  if (L >= 0.6) return "hi";
  if (L <= 0.4) return "lo";
  return "mid";
}
function axisScore(axis) {
  const items = (P2_TOPICS.items || []).filter(x => x.part === axis.part && axis.topics.includes(x.topic));
  let sum = 0, n = 0, hk = [], qs = [];
  items.forEach(x => {
    const c = getCell("p2", x.y, x.q);
    if (!c.s) return;
    const w = c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0;
    sum += w; n++;
    const pct = p2Hit(x.y, x.q);
    if (pct != null) hk.push(pct / 100);
    qs.push(x);
  });
  if (n < 4) return { n, L: null, hk: null };
  const hkL = hk.length ? hk.reduce((a, b) => a + b, 0) / hk.length : null;
  return { n, L: sum / n, hk: hkL };
}
function radarPolyRated(vals, cx, cy, r) {
  const pts = [];
  vals.forEach((v, i) => {
    if (v == null) return;
    const ang = -Math.PI / 2 + i * 2 * Math.PI / vals.length;
    pts.push((cx + r * v * Math.cos(ang)).toFixed(1) + "," + (cy + r * v * Math.sin(ang)).toFixed(1));
  });
  return pts;
}
function renderRadar() {
  const cx = 170, cy = 170, r = 112;
  const scores = AXES.map(axisScore);
  const N = AXES.length;
  let rings = "";
  [0.25, 0.5, 0.75, 1].forEach(k => {
    const pts = radarPolyRated(Array(N).fill(k), cx, cy, r).join(" ");
    rings += `<polygon points="${pts}" fill="none" stroke="#e4ddd2" stroke-width="1"/>`;
  });
  [[0.4, "#e0b8b0", "1.5"], [0.6, "#b7d0b3", "1.5"]].forEach(([k, col, w]) => {
    const pts = radarPolyRated(Array(N).fill(k), cx, cy, r).join(" ");
    rings += `<polygon points="${pts}" fill="none" stroke="${col}" stroke-width="${w}"/>`;
  });
  let spokes = "", labels = "";
  AXES.forEach((a, i) => {
    const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
    const x2 = cx + r * Math.cos(ang), y2 = cy + r * Math.sin(ang);
    spokes += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#e4ddd2"/>`;
    const lx = cx + (r + 22) * Math.cos(ang), ly = cy + (r + 22) * Math.sin(ang);
    const short = a.name.replace("　", " ");
    labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="10" fill="${radarAxis === a.id ? "#3d6e8c" : "#1c1915"}" data-axis="${a.id}" style="cursor:pointer">${esc(short)}</text>`;
  });
  const L = scores.map(s => s.L);
  const H = scores.map(s => s.hk);
  let stu = "", hk = "";
  const ratedL = radarPolyRated(L, cx, cy, r);
  if (ratedL.length >= 3) {
    stu = `<polygon points="${ratedL.join(" ")}" fill="rgba(61,110,140,.28)" stroke="#3d6e8c" stroke-width="2"/>`;
  } else {
    L.forEach((v, i) => {
      if (v == null) return;
      const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
      stu += `<circle cx="${(cx + r * v * Math.cos(ang)).toFixed(1)}" cy="${(cy + r * v * Math.sin(ang)).toFixed(1)}" r="4" fill="#3d6e8c"/>`;
    });
  }
  L.forEach((v, i) => {
    if (v != null) return;
    const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
    const ox = (cx + r * Math.cos(ang)).toFixed(1), oy = (cy + r * Math.sin(ang)).toFixed(1);
    stu += `<circle cx="${ox}" cy="${oy}" r="4" class="miss"/>`;
  });
  if (prefs.hkRef) {
    const ratedH = radarPolyRated(H, cx, cy, r);
    if (ratedH.length >= 3) {
      hk = `<polygon points="${ratedH.join(" ")}" fill="none" stroke="#8a8178" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    }
  }
  const empty = markedP2Count() === 0;
  document.getElementById("radarBox").innerHTML = empty
    ? `<p class="hint">去進度標記卷二先出圖。</p>`
    : `<svg viewBox="0 0 340 340">${rings}${spokes}${hk}${stu}${labels}
      <text x="170" y="328" text-anchor="middle" font-size="11" fill="#6b645b">實色＝你嘅標記平均　虛線＝全港命中率</text></svg>`;
  document.getElementById("axisLegend").innerHTML = AXES.map((a, i) => {
    const sc = scores[i];
    const stuLab = sc.L == null ? "未評" : Math.round(sc.L * 100) + "%";
    const hkLab = sc.hk == null ? "—" : Math.round(sc.hk * 100) + "%";
    const chips = a.topics.map(t => {
      const ab = topicAbility(a.part, t);
      const bc = abilityBand(ab.L);
      return `<button type="button" class="tchip${bc ? " " + bc : ""}" data-jump-topic="${esc(t)}">${esc(t)}</button>`;
    }).join("");
    return `<div class="axis-row${radarAxis === a.id ? " on" : ""}" data-axis="${a.id}"><b>${esc(a.name)}　學生 ${stuLab}　全港 ${hkLab}${sc.n ? " · " + sc.n + " 題" : ""}</b>${chips}</div>`;
  }).join("");
}
function renderWeak() {
  paintWeakChips();
  const hkBtn = document.getElementById("hkRefBtn");
  hkBtn.textContent = prefs.hkRef ? "全港參照　開" : "全港參照　關";
  renderRadar();
  const items0 = weakItems();
  const box = document.getElementById("weakBox");
  if (markedP2Count() === 0) {
    box.innerHTML = `<p class="hint">去進度標記卷二先出圖同功課。</p>`;
    return;
  }
  let items = items0;
  if (radarAxis) {
    const ax = AXES.find(a => a.id === radarAxis);
    if (ax) items = items.filter(it => it.part === ax.part && ax.topics.includes(it.topic));
  }
  const arrange = document.getElementById("weakArrange").value;
  if (!items.length) {
    box.innerHTML = `<p class="hint">呢個學生未有符合色掣嘅弱項。</p>`;
    return;
  }
  items = sortWeakList(items, arrange);
  const head = `<thead><tr><th>年</th><th>題</th><th>部</th><th>課題</th><th>命中率</th><th></th><th>錯因</th></tr></thead>`;
  if (arrange === "year") {
    const years = [...new Set(items.map(x => x.y))].sort((a, b) => b - a);
    let html = "";
    years.forEach(y => {
      const list = items.filter(x => x.y === y);
      html += `<h3 class="sec-title">${y}（${list.length}）</h3><div style="overflow:auto"><table class="data-table">${head}<tbody>${list.map(itemRowHtml).join("")}</tbody></table></div>`;
    });
    box.innerHTML = html;
    return;
  }
  const counts = {};
  items.forEach(it => { counts[it.topic] = (counts[it.topic] || 0) + 1; });
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, 8);
  const rest = ranked.slice(8).reduce((n, x) => n + x[1], 0);
  const max = top[0] ? top[0][1] : 1;
  const bars = top.map(([t, n]) =>
    `<div class="bar-row" data-weak-topic="${esc(t)}"><span>${esc(t)}</span><div class="bar-track"><i style="width:${Math.round(n * 100 / max)}%"></i></div><b>${n}</b></div>`
  ).join("") + (rest ? `<div class="sub">其他課題 ${rest} 題</div>` : "");
  const focus = box.dataset.topic || "";
  const list = (focus ? items.filter(x => x.topic === focus) : items).slice(0, 120);
  box.innerHTML = `${bars}${focus ? `<p class="hint">而家睇：${esc(focus)}　<button class="ghost" id="weakClear">顯示全部</button></p>` : ""}
    <div style="overflow:auto"><table class="data-table">${head}<tbody>${list.map(itemRowHtml).join("")}</tbody></table></div>`;
}

function classify(starts, pct) {
  const s = starts.slice().sort((a, b) => a[1] - b[1]);
  let idx = 0;
  for (let i = 0; i < s.length; i++) if (pct + 1e-9 >= s[i][1]) idx = i;
  const cur = s[idx];
  const next = s[idx + 1];
  const prev = s[idx - 1];
  let near = null;
  if (next && Math.abs(pct - next[1]) < 1) near = [cur[0], next[0]];
  if (idx > 0 && Math.abs(pct - cur[1]) < 1 && pct < cur[1]) near = [prev[0], cur[0]];
  return { level: cur[0], near };
}
function fmtLv(lv) { return lv === "U" ? "U" : lv; }
function corePct(year, p1, p2) {
  const c = window.CUTOFFS.core[String(year)];
  if (!c || p1 === "" || p2 === "" || p1 == null || p2 == null) return null;
  const w = (Number(p1) / c.p1full) * c.p1w + (Number(p2) / c.p2full) * c.p2w;
  return w / c.total * 100;
}
function estimateShort(kind, year, pct) {
  const pack = window.CUTOFFS[kind][String(year)];
  if (!pack || pack.incomplete) return "資料未齊";
  const r = classify(pack.starts, pct);
  return fmtLv(r.level);
}
function nextGap(starts, pct) {
  const s = starts.filter(x => LV_COLS.includes(x[0])).sort((a, b) => a[1] - b[1]);
  for (const [lv, v] of s) {
    if (v > pct) {
      const d = v - pct;
      if (d > 0 && d <= 2) return { lv, n: Math.ceil(d) };
      return null;
    }
  }
  return null;
}
function levelProgress(starts, pct) {
  const s = starts.slice().sort((a, b) => a[1] - b[1]);
  if (!s.length) return 0;
  let idx = 0;
  for (let i = 0; i < s.length; i++) if (pct + 1e-9 >= s[i][1]) idx = i;
  const floor = s[idx][1];
  const last = s[idx][0] === "5**" || idx === s.length - 1;
  const ceil = last ? 100 : s[idx + 1][1];
  const span = Math.max(0.01, ceil - floor);
  return Math.max(0, Math.min(100, (pct - floor) / span * 100));
}
function lvCellHtml(lvText, starts, pct, ready) {
  if (!ready || pct == null) return `<td class="lv">${lvText}</td>`;
  const p = Math.round(levelProgress(starts, pct));
  return `<td class="lv"><div class="lv-cell"><span>${lvText}</span><div class="lv-bar" title="${p}%"><i style="width:${p}%"></i></div></div></td>`;
}
function renderGrades() {
  document.getElementById("showM1").checked = !!prefs.showM1;
  document.getElementById("showM2").checked = !!prefs.showM2;
  const showM1 = prefs.showM1, showM2 = prefs.showM2;
  let head = `<tr><th>年份</th><th>卷一 /105</th><th>卷二 /45</th><th>綜合％</th><th>估計等級</th>`;
  if (showM1) head += `<th>M1 /100</th><th>M1 等級</th>`;
  if (showM2) head += `<th>M2 /100</th><th>M2 等級</th>`;
  head += `</tr>`;
  let rows = head;
  for (const y of YEARS.slice().reverse()) {
    const p1 = getScore("p1", y), p2 = getScore("p2", y);
    const m1 = getScore("m1", y), m2 = getScore("m2", y);
    const cp = corePct(y, p1, p2);
    const ready = p1 !== "" && p2 !== "";
    const pack = window.CUTOFFS.core[String(y)];
    const coreCell = ready ? Math.round(cp) + "%" : "-";
    let coreLv = "-";
    if (ready) {
      coreLv = pack.incomplete ? "資料未齊" : estimateShort("core", y, cp);
    }
    rows += `<tr>
      <td class="clickable" data-go-year="${y}">${y}</td>
      <td><input type="number" min="0" max="105" step="1" inputmode="numeric" data-gs="p1:${y}" value="${p1}"></td>
      <td><input type="number" min="0" max="45" step="1" inputmode="numeric" data-gs="p2:${y}" value="${p2}"></td>
      <td>${coreCell}</td>
      ${ready && pack && !pack.incomplete ? lvCellHtml(coreLv, pack.starts, cp, true) : `<td class="lv">${coreLv}</td>`}`;
    if (showM1) {
      const packM1 = window.CUTOFFS.m1[String(y)];
      let lv = m1 === "" ? "-" : (packM1.incomplete ? "資料未齊" : estimateShort("m1", y, Number(m1)));
      const m1Ready = m1 !== "" && packM1 && !packM1.incomplete;
      rows += `<td><input type="number" min="0" max="100" step="1" inputmode="numeric" data-gs="m1:${y}" value="${m1}"></td>${m1Ready ? lvCellHtml(lv, packM1.starts, Number(m1), true) : `<td>${lv}</td>`}`;
    }
    if (showM2) {
      const packM2 = window.CUTOFFS.m2[String(y)];
      let lv = m2 === "" ? "-" : (packM2.incomplete ? "資料未齊" : estimateShort("m2", y, Number(m2)));
      const m2Ready = m2 !== "" && packM2 && !packM2.incomplete;
      rows += `<td><input type="number" min="0" max="100" step="1" inputmode="numeric" data-gs="m2:${y}" value="${m2}"></td>${m2Ready ? lvCellHtml(lv, packM2.starts, Number(m2), true) : `<td>${lv}</td>`}`;
    }
    rows += `</tr>`;
  }
  document.getElementById("gradeTable").innerHTML = rows;
}

function startMap(pack) {
  const m = {};
  (pack.starts || []).forEach(([lv, v]) => { m[String(lv)] = v; });
  return m;
}
function cutDisplay(kind, pack, lv) {
  const m = startMap(pack || {});
  if (m[lv] == null) return "-";
  if (kind === "core" && pack && pack.total) return String(Math.round(m[lv] / 100 * pack.total));
  return String(Math.round(m[lv]));
}
function cutoffTable(kind) {
  let html = `<table class="data-table cut-table"><thead><tr><th class="c0">年份</th>${CUT_COLS.map(l => `<th>${l}</th>`).join("")}</tr></thead><tbody>`;
  for (const y of YEARS.slice().reverse()) {
    const pack = window.CUTOFFS[kind][String(y)];
    html += `<tr><td class="c0">${y}</td>`;
    html += CUT_COLS.map(l => `<td>${cutDisplay(kind, pack, l)}</td>`).join("") + `</tr>`;
  }
  return html + `</tbody></table>`;
}
function renderCutoffs() {
  document.getElementById("cutCore").innerHTML = cutoffTable("core");
  document.getElementById("cutM1").innerHTML = cutoffTable("m1");
  document.getElementById("cutM2").innerHTML = cutoffTable("m2");
}

function seriesYears(series) {
  const keys = Object.keys((window.P2_DATA && P2_DATA[series]) || {});
  const nums = keys.filter(k => /^\d+$/.test(k)).sort((a, b) => +b - +a);
  const rest = keys.filter(k => !/^\d+$/.test(k));
  return nums.concat(rest);
}
function fillMcYears(series) {
  const ySel = document.getElementById("mcYear");
  if (ySel.dataset.series === series && ySel.options.length) return;
  ySel.innerHTML = seriesYears(series).map(y => `<option value="${y}">${y}</option>`).join("");
  ySel.dataset.series = series;
}
function fillMcTopics() {
  const tSel = document.getElementById("mcTopic");
  if (tSel.dataset.ready) return;
  const freq = window.P2_TOPICS.freq || [];
  const a = freq.filter(f => f.part === "甲");
  const b = freq.filter(f => f.part === "乙");
  tSel.innerHTML = `<option value="">全部課題</option>
    <optgroup label="甲">${a.map(f => `<option value="${esc(f.topic)}">${esc(f.topic)}</option>`).join("")}</optgroup>
    <optgroup label="乙">${b.map(f => `<option value="${esc(f.topic)}">${esc(f.topic)}</option>`).join("")}</optgroup>`;
  tSel.dataset.ready = "1";
}
function fillMcQ() {
  const series = document.getElementById("mcSeries").value;
  const year = document.getElementById("mcYear").value;
  const qSel = document.getElementById("mcQ");
  const prev = qSel.value;
  const rows = (P2_DATA[series] && P2_DATA[series][String(year)]) || [];
  qSel.innerHTML = `<option value="all">全年</option>` + rows.map(r => `<option value="${r.q}">Q${r.q}</option>`).join("");
  qSel.value = [...qSel.options].some(o => o.value === prev) ? prev : "all";
}
function mcCard(year, rec, extra, picked, series) {
  const b = bandOf(rec.pct);
  const t = series === "ce" ? "" : topicOf(+year || year, rec.q);
  const pct = rec.pct == null ? "—" : rec.pct + "%";
  const part = series === "ce" ? "" : (rec.q <= 30 ? " · 甲" : " · 乙");
  const on = picked === rec.q ? " pick" : "";
  return `<div class="qcard ${b}${on}" data-q="${rec.q}" data-y="${year}"><small>${extra || ""}Q${rec.q}${part}</small><b>${rec.ans || "?"}</b><small>${pct}</small>${t ? `<small>${esc(t)}</small>` : ""}</div>`;
}
function focusHtml(series, year, rec, hide) {
  if (!rec) return "";
  const t = series === "dse" ? (topicOf(+year, rec.q) || "未分類") : "";
  const part = series === "ce" ? "" : (rec.q <= 30 ? "甲部" : "乙部");
  const pctLine = rec.pct == null ? "未有命中率" : `全港命中率 ${rec.pct}%`;
  const bar = rec.pct == null ? "" : `<div class="focus-bar"><i style="width:${rec.pct}%"></i></div>`;
  const markOn = series === "dse" && /^\d+$/.test(String(year));
  const st = markOn ? getCell("p2", +year, rec.q).s : 0;
  const fade = k => st !== 0 && st !== k ? " fade" : "";
  const marks = markOn ? `<div class="mark-row">
      <span class="sub">學生：${esc(currentProfile)}</span>
      <button type="button" class="ok${fade(3)}" data-mark="3">已掌握</button>
      <button type="button" class="warn${fade(2)}" data-mark="2">一般</button>
      <button type="button" class="danger${fade(1)}" data-mark="1">唔識</button>
      <button type="button" class="ghost${st !== 0 ? "" : " fade"}" data-mark="0">未做</button>
    </div>` : "";
  return `<section class="focus-card sticky-focus" data-fy="${year}" data-fq="${rec.q}">
    <div class="meta">${series === "dse" ? "DSE 必修卷二" : "CE Maths"}　${year}　Q${rec.q}${part ? "　" + part : ""}${t ? "　·　課題：" + esc(t) : ""}</div>
    <div class="ans">${hide ? "？" : (rec.ans || "?")}</div>
    <div class="meta">${pctLine}</div>${bar}${marks}
  </section>`;
}
function renderMcYear() {
  const series = document.getElementById("mcSeries").value;
  const year = document.getElementById("mcYear").value;
  const topic = document.getElementById("mcTopic").value;
  const hide = mcHideAns;
  const qv = document.getElementById("mcQ").value;
  const picked = qv === "all" ? null : Number(qv);
  let rows = (P2_DATA[series] && P2_DATA[series][String(year)]) || [];
  if (series === "dse" && topic) rows = rows.filter(r => topicOf(+year, r.q) === topic);
  const focus = picked ? ((P2_DATA[series] && P2_DATA[series][String(year)]) || []).find(r => r.q === picked) : null;
  const isCE = series === "ce";
  const a = isCE ? rows : rows.filter(r => r.q <= 30);
  const b = isCE ? [] : rows.filter(r => r.q >= 31);
  const easy = rows.filter(r => r.pct != null && r.pct >= 60);
  const mid = rows.filter(r => r.pct != null && r.pct >= 41 && r.pct <= 59);
  const hard = rows.filter(r => r.pct != null && r.pct <= 40);
  const block = (title, list) => `<h3 class="sec-title">${title}（${list.length}）</h3><div class="qgrid">${list.map(r => mcCard(year, r, "", picked, series)).join("") || "<p class='hint'>無</p>"}</div>`;
  document.getElementById("mcResult").innerHTML = `<div class="${hide ? "hide-ans" : ""}">
    ${focusHtml(series, year, focus, hide)}
    <div class="sec-title">${year}　${rows.length} 題</div>
    ${isCE ? block("題目", a) : block("甲部 Q1–30", a) + block("乙部 Q31–45", b)}
    ${block("命中率 ≥ 60%", easy)}
    ${block("命中率 41%–59%", mid)}
    ${block("命中率 ≤ 40%", hard)}
  </div>`;
}
function statusOf(year, q) { return getCell("p2", +year, q).s; }
function sortMcRecs(recs, desc) {
  return recs.slice().sort((a, b) => {
    const ya = +a.year, yb = +b.year;
    if (ya !== yb) return desc ? yb - ya : ya - yb;
    const qa = a.rec && a.rec.q != null ? a.rec.q : 0;
    const qb = b.rec && b.rec.q != null ? b.rec.q : 0;
    if (qa !== qb) return qa - qb;
    return statusOf(a.year, qa) - statusOf(b.year, qb);
  });
}
function renderMcTopic() {
  const topic = document.getElementById("mcTopic").value;
  const hide = mcHideAns;
  const desc = document.getElementById("mcOrder").value !== "asc";
  const unseen = mcUnseen;
  if (!topic) {
    document.getElementById("mcResult").innerHTML = `<p class="hint">揀一個課題，列出 2012–2026 所有該題。撳小卡開大卡。</p>`;
    return;
  }
  let list = P2_TOPICS.items.filter(x => x.topic === topic);
  if (unseen) list = list.filter(x => statusOf(x.y, x.q) === 0);
  const recs = sortMcRecs(list.map(x => {
    const rec = p2Row("dse", x.y, x.q) || { q: x.q, ans: "", pct: null };
    return { year: x.y, rec, part: x.part };
  }), desc);
  const a = recs.filter(x => x.part === "甲");
  const b = recs.filter(x => x.part === "乙");
  const easy = recs.filter(x => x.rec.pct != null && x.rec.pct >= 60);
  const mid = recs.filter(x => x.rec.pct != null && x.rec.pct >= 41 && x.rec.pct <= 59);
  const hard = recs.filter(x => x.rec.pct != null && x.rec.pct <= 40);
  const picked = mcPick && String(mcPick.topic) === topic ? mcPick : null;
  const focusRec = picked ? (p2Row("dse", picked.y, picked.q) || { q: picked.q, ans: "", pct: null }) : null;
  const card = x => mcCard(x.year, x.rec, x.year + "　", picked && picked.y === x.year && picked.q === x.rec.q ? x.rec.q : null, "dse");
  const block = (title, arr) => `<h3 class="sec-title">${title}（${arr.length}）</h3><div class="qgrid">${arr.map(card).join("") || "<p class='hint'>無</p>"}</div>`;
  document.getElementById("mcResult").innerHTML = `<div class="${hide ? "hide-ans" : ""}">
    ${focusHtml("dse", picked ? picked.y : recs[0] && recs[0].year, focusRec, hide)}
    <div class="sec-title">${esc(topic)}</div>
    ${block("甲部", a)}${block("乙部", b)}
    ${block("命中率 ≥ 60%", easy)}${block("命中率 41%–59%", mid)}${block("命中率 ≤ 40%", hard)}
  </div>`;
}
function renderMcFreq() {
  const years = (P2_TOPICS.years || []).slice().reverse();
  const yIdx = (P2_TOPICS.years || []).map((_, i) => i).reverse();
  const head = `<thead><tr><th class="sticky-col">部分</th><th class="sticky-col" style="left:52px">課題</th>${years.map(y => `<th>${String(y).slice(2)}</th>`).join("")}<th>合計</th></tr></thead>`;
  const body = `<tbody>` + P2_TOPICS.freq.map(r =>
    `<tr><td class="sticky-col">${r.part}</td><td class="sticky-col" style="left:52px">${esc(r.topic)}</td>${yIdx.map(i => `<td>${r.years[i] || ""}</td>`).join("")}<td>${r.total}</td></tr>`
  ).join("") + `</tbody>`;
  document.getElementById("mcFreq").innerHTML = `<div style="overflow:auto"><table class="data-table">${head}${body}</table></div>`;
}
function paintMcToggles() {
  const hideBtn = document.getElementById("mcHideAnsBtn");
  hideBtn.textContent = mcHideAns ? "顯示答案" : "隱藏答案";
  hideBtn.classList.toggle("on-toggle", mcHideAns);
  const unBtn = document.getElementById("mcUnseenBtn");
  unBtn.textContent = mcUnseen ? "顯示全部" : "只睇未做";
  unBtn.classList.toggle("on-toggle", mcUnseen);
}
function renderMc() {
  const series = document.getElementById("mcSeries").value;
  const mode = document.getElementById("mcMode").value;
  const isCE = series === "ce";
  document.getElementById("mcModeLab").hidden = isCE;
  document.getElementById("mcTopicLab").hidden = isCE;
  if (isCE) document.getElementById("mcMode").value = "year";
  document.getElementById("mcYearLab").hidden = !isCE && document.getElementById("mcMode").value === "topic";
  document.getElementById("mcQLab").hidden = !isCE && document.getElementById("mcMode").value === "topic";
  document.getElementById("mcOrderLab").hidden = isCE || document.getElementById("mcMode").value !== "topic";
  document.getElementById("mcUnseenBtn").hidden = isCE || document.getElementById("mcMode").value !== "topic";
  paintMcToggles();
  document.getElementById("mcFreqBox").hidden = isCE;
  const now = document.getElementById("mcNowTopic");
  if (now) {
    const topicMode = !isCE && document.getElementById("mcMode").value === "topic";
    const topic = document.getElementById("mcTopic").value;
    now.textContent = topicMode && topic ? ("課題：" + topic) : "";
  }
  fillMcYears(series);
  fillMcTopics();
  if (document.getElementById("mcMode").value !== "topic") fillMcQ();
  if (!isCE && document.getElementById("mcMode").value === "topic") renderMcTopic();
  else renderMcYear();
  if (!isCE) renderMcFreq();
}

function p2Mean(year, from, to) {
  const rows = ((P2_DATA.dse && P2_DATA.dse[String(year)]) || []).filter(r => r.q >= from && r.q <= to);
  const known = rows.filter(r => r.pct != null);
  if (!known.length) return null;
  return known.reduce((s, r) => s + r.pct / 100, 0);
}
function sectionMean(paper, year, key) {
  if (paper === "p2") {
    if (key === "A") return p2Mean(year, 1, 30);
    if (key === "B") return p2Mean(year, 31, 45);
    if (key === "T") return p2Mean(year, 1, 45);
    return null;
  }
  const pack = ITEM_STATS[paper] && ITEM_STATS[paper][String(year)];
  if (!pack || !pack.sec || pack.sec[key] == null || pack.sec[key].mean == null) return null;
  return pack.sec[key].mean;
}
function sectionFull(paper, key) {
  if (paper === "p1") return key === "T" ? 105 : 35;
  if (paper === "p2") return key === "T" ? 45 : key === "A" ? 30 : 15;
  return key === "T" ? 100 : 50;
}
function renderItemMulti() {
  const paper = document.getElementById("itemPaper").value;
  const keys = paper === "p1"
    ? [["A1", "甲一"], ["A2", "甲二"], ["B", "乙"], ["T", "全卷"]]
    : paper === "p2"
      ? [["A", "甲"], ["B", "乙"], ["T", "全卷"]]
      : [["A", "甲"], ["B", "乙"], ["T", "全卷"]];
  let html = `<table class="data-table"><thead><tr><th class="sticky-col">分部</th>${YEARS.slice().reverse().map(y => `<th>${y}</th>`).join("")}</tr></thead><tbody>`;
  keys.forEach(([k, lab]) => {
    const full = sectionFull(paper, k);
    html += `<tr><th class="sticky-col">${lab}（${full}）</th>`;
    YEARS.slice().reverse().forEach(y => {
      const mean = sectionMean(paper, y, k);
      const pct = mean == null ? null : mean / full * 100;
      html += `<td class="${bandClass(pct)} clickable" data-jump-year="${y}" data-jump-sec="${lab}">${mean == null ? "-" : fmt1(mean)}</td>`;
    });
    html += `</tr>`;
  });
  document.getElementById("itemMulti").innerHTML = html + `</tbody></table>`;
}
function topicYearAvg(year, topic) {
  const qs = (P2_TOPICS.items || []).filter(x => x.y === year && x.topic === topic);
  const pcts = qs.map(x => p2Hit(year, x.q)).filter(p => p != null);
  if (!pcts.length) return null;
  return pcts.reduce((a, b) => a + b, 0) / pcts.length;
}
function renderItemYear(focusSec) {
  const paper = document.getElementById("itemPaper").value;
  const year = +document.getElementById("itemYear").value;
  document.getElementById("itemYearHead").textContent = paper === "p2" ? "單年課題（平均命中率）" : "單年分題（卷序）";
  if (paper === "p2") {
    const rows = (P2_TOPICS.freq || []).map(f => {
      const avg = topicYearAvg(year, f.topic);
      return { part: f.part, topic: f.topic, avg };
    }).filter(r => r.avg != null);
    const buckets = { hi: [], mid: [], lo: [] };
    rows.forEach(r => { buckets[bandOf(r.avg)].push(r); });
    const block = (title, key) => {
      const list = buckets[key];
      return `<h3 class="sec-title">${title}（${list.length}）</h3>` +
        (list.length ? `<table class="data-table"><thead><tr><th>部</th><th>課題</th><th>平均命中率</th></tr></thead><tbody>${list.map(r => `<tr class="${bandClass(r.avg)}"><td>${r.part}</td><td>${esc(r.topic)}</td><td>${Math.round(r.avg)}%</td></tr>`).join("")}</tbody></table>` : `<p class="hint">無</p>`);
    };
    document.getElementById("itemYearView").innerHTML = rows.length
      ? block("≥ 60% 課題", "hi") + block("41%–59% 課題", "mid") + block("≤ 40% 課題", "lo") +
        `<p class="hint"><button class="ghost" id="jumpMcYear">去 MC 查 ${year}</button></p>`
      : `<p class="hint">${year} 未有命中率。</p>`;
    return;
  }
  const pack = ITEM_STATS[paper] && ITEM_STATS[paper][String(year)];
  if (!pack) {
    document.getElementById("itemYearView").innerHTML = `<p class="hint">${year} 未有分題數據。</p>`;
    return;
  }
  const groups = {};
  pack.parts.forEach(p => {
    const n = qLead(p.q);
    let g;
    if (paper === "p1") {
      const secs = p1Secs(year);
      g = secs[0].qs.includes(n) ? "甲一" : secs[1].qs.includes(n) ? "甲二" : "乙";
    } else {
      const secs = paper === "m1" ? m1Secs(year) : m2Secs(year);
      g = secs[0].qs.includes(n) ? "甲" : "乙";
    }
    (groups[g] = groups[g] || []).push(p);
  });
  const order = paper === "p1" ? ["甲一", "甲二", "乙"] : ["甲", "乙"];
  let html = "";
  order.forEach(g => {
    const list = groups[g] || [];
    html += `<div class="year-block" id="item-sec-${g}"><div class="year-head"><b>${g}</b></div>
      <table class="data-table"><thead><tr><th>題</th><th>滿分</th><th>平均分</th></tr></thead><tbody>`;
    list.forEach(p => {
      html += `<tr class="${bandClass(p.pct)}"><td>${esc(p.q)}</td><td>${p.full}</td><td>${p.mean == null ? "-" : fmt1(p.mean)}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  });
  document.getElementById("itemYearView").innerHTML = html;
  if (focusSec) {
    const el = document.getElementById("item-sec-" + focusSec);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
function renderItems() {
  const ySel = document.getElementById("itemYear");
  if (!itemYearFilled) {
    ySel.innerHTML = YEARS.slice().reverse().map(y => `<option value="${y}">${y}</option>`).join("");
    ySel.value = "2025";
    itemYearFilled = true;
  }
  renderItemMulti();
  renderItemYear();
}

function sortWeakList(items, arrange) {
  const rows = items.slice();
  if (arrange === "year") return rows.sort((a, b) => b.y - a.y || a.part.localeCompare(b.part) || a.q - b.q);
  return rows.sort((a, b) => a.s - b.s || b.y - a.y || a.part.localeCompare(b.part) || a.q - b.q);
}
function visibleWeakItems() {
  let items = weakItems();
  if (radarAxis) {
    const ax = AXES.find(a => a.id === radarAxis);
    if (ax) items = items.filter(it => it.part === ax.part && ax.topics.includes(it.topic));
  }
  const arrange = document.getElementById("weakArrange").value;
  const box = document.getElementById("weakBox");
  const focus = arrange === "topic" && box ? (box.dataset.topic || "") : "";
  if (focus) items = items.filter(x => x.topic === focus);
  return sortWeakList(items, arrange);
}
function hwRows() {
  return visibleWeakItems();
}
function compressQs(qs) {
  qs = [...new Set(qs)].sort((a, b) => a - b);
  if (!qs.length) return "";
  const out = [];
  let a = qs[0], b = qs[0];
  for (let i = 1; i <= qs.length; i++) {
    if (i < qs.length && qs[i] === b + 1) { b = qs[i]; continue; }
    out.push(a === b ? String(a) : a + "–" + b);
    if (i < qs.length) { a = b = qs[i]; }
  }
  return "Q" + out.join(",");
}
function yearPartLines(rows) {
  const groups = {};
  rows.forEach(r => {
    const k = r.y + " " + r.part;
    (groups[k] = groups[k] || { y: r.y, part: r.part, qs: [] }).qs.push(r.q);
  });
  return Object.keys(groups).sort((A, B) => {
    const ga = groups[A], gb = groups[B];
    return gb.y - ga.y || ga.part.localeCompare(gb.part);
  }).map(k => {
    const g = groups[k];
    return g.y + "　" + g.part + " " + compressQs(g.qs);
  });
}
function hwText() {
  const arrange = document.getElementById("weakArrange").value;
  const rows = hwRows();
  if (!rows.length) return "（沒有符合嘅題）";
  if (arrange !== "topic") {
    return currentProfile + "　卷二\n" + yearPartLines(rows).join("\n");
  }
  const counts = {};
  rows.forEach(r => { counts[r.topic] = (counts[r.topic] || 0) + 1; });
  const topics = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  const blocks = topics.map(t => {
    const list = rows.filter(r => r.topic === t);
    return t + "（" + list.length + "）\n" + yearPartLines(list).join("\n");
  });
  return currentProfile + "　卷二　按課題\n" + blocks.join("\n\n");
}
function copyHw() {
  const t = hwText();
  const btn = document.getElementById("copyHw");
  const done = () => {
    const old = btn.textContent;
    btn.textContent = "已複製";
    btn.disabled = true;
    setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 2000);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(done, () => { window.prompt("複製以下內容", t); done(); });
  } else { window.prompt("複製以下內容", t); done(); }
}
function csvHw() {
  const rows = hwRows();
  const head = "學生,卷,年,題,部分,課題,難度,命中率,錯因,筆記";
  const body = rows.map(r => [currentProfile, "必修卷二", r.y, r.q, r.part, r.topic, bandLabel(r.pct), r.pct == null ? "" : r.pct, r.tags.map(tagName).join("、"), r.note]
    .map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const blob = new Blob(["\ufeff" + head + "\n" + body.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "功課-" + currentProfile + ".csv";
  a.click();
}

function jumpMcTopic(topic) {
  document.getElementById("mcSeries").value = "dse";
  document.getElementById("mcMode").value = "topic";
  fillMcTopics();
  document.getElementById("mcTopic").value = topic;
  mcPick = null;
  showView("mc");
}
function jumpMc(year, q) {
  document.getElementById("mcSeries").value = "dse";
  document.getElementById("mcMode").value = "year";
  fillMcYears("dse");
  document.getElementById("mcYear").value = String(year);
  fillMcQ();
  document.getElementById("mcQ").value = String(q);
  showView("mc");
}

function timerDuration() {
  const p = document.getElementById("timerPaper").value;
  return timerExtra ? TIMER[p].extra : TIMER[p].normal;
}
function timerRemain() {
  const dur = timerDuration();
  if (!timerRun.start) return dur;
  const now = Date.now();
  const used = timerRun.paused ? timerRun.pause - timerRun.start : now - timerRun.start;
  return Math.max(0, dur - used / 1000);
}
function paintTimer() {
  const p = document.getElementById("timerPaper").value;
  const rem = timerRemain();
  const dur = timerDuration();
  const used = dur - rem;
  document.getElementById("timerClock").textContent = fmtTime(rem);
  document.getElementById("timerElapsed").textContent = "已用 " + fmtTime(used);
  document.getElementById("timerNow").textContent = `而家：${TIMER[p].name}　${timerExtra ? "加時" : "不加時"}　${fmtTime(dur)}`;
  document.getElementById("timerExtra").textContent = timerExtra ? "加時" : "不加時";
  document.getElementById("timerExtra").disabled = timerLocked;
  document.getElementById("timerPaper").disabled = timerLocked;
  let msg = "";
  if (timerRun.start && rem <= 0) { msg = "時間到"; timerRun.ended = true; }
  else if (timerRun.start && rem <= 5 * 60) msg = "最後 5 分鐘";
  else if (timerRun.start && rem <= 15 * 60) msg = "最後 15 分鐘";
  document.getElementById("timerAlerts").textContent = msg;
}
function timerTick() {
  const rem = timerRemain();
  if (timerRun.start && !timerRun.paused && rem <= 15 * 60 && !timerRun.warned15) timerRun.warned15 = true;
  if (timerRun.start && !timerRun.paused && rem <= 5 * 60 && !timerRun.warned5) timerRun.warned5 = true;
  if (timerRun.start && !timerRun.paused && rem <= 0 && !timerRun.ended) {
    timerRun.ended = true;
    if (document.getElementById("timerSound").checked) {
      const a = document.getElementById("endSound");
      try { a.currentTime = 0; a.play(); } catch {}
    }
    clearInterval(timerRun.tick);
  }
  paintTimer();
}
function renderTimer() { paintTimer(); }

function showView(id) {
  currentView = id;
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("on", v.id === "view-" + id));
  document.querySelectorAll(".tabs .tab").forEach(t => t.classList.toggle("on", t.dataset.view === id));
  const people = id === "tracker" || id === "weak" || id === "grades" || id === "mc";
  document.getElementById("peopleBar").style.display = people ? "flex" : "none";
  document.getElementById("trackerTheme").hidden = id !== "tracker";
  document.getElementById("mcBar").hidden = id !== "mc";
  window.scrollTo(0, 0);
  if (id === "tracker") renderTracker();
  if (id === "weak") { renderProfiles(); renderWeak(); }
  if (id === "grades") { renderProfiles(); renderGrades(); }
  if (id === "mc") { renderProfiles(); renderMc(); }
  if (id === "items") renderItems();
  if (id === "cutoffs") renderCutoffs();
  if (id === "timer") renderTimer();
  location.hash = id;
}
function openNote(y, q) {
  noteTarget = { y, q };
  const c = getCell(currentPaper, y, q);
  document.getElementById("noteTitle").textContent = PAPERS[currentPaper].name + " " + y + " Q" + q;
  document.getElementById("noteText").value = c.note || "";
  document.getElementById("tagBox").innerHTML = TAGS.map(([id, name]) =>
    `<label><input type="checkbox" value="${id}" ${(c.tags || []).includes(id) ? "checked" : ""}><span>${name}</span></label>`
  ).join("");
  document.getElementById("noteDlg").showModal();
}

document.getElementById("tabs").addEventListener("click", e => {
  const btn = e.target.closest(".tab");
  if (btn) showView(btn.dataset.view);
});
document.getElementById("profile").onchange = e => {
  currentProfile = e.target.value; save();
  if (currentView === "tracker") renderTracker();
  if (currentView === "grades") renderGrades();
  if (currentView === "weak") renderWeak();
  if (currentView === "mc") renderMc();
};
document.getElementById("addProfile").onclick = () => {
  const name = document.getElementById("newProfile").value.trim();
  if (!name) return;
  if (!db.profiles[name]) db.profiles[name] = blankProfile(name);
  currentProfile = name;
  document.getElementById("newProfile").value = "";
  save(); renderProfiles();
  if (currentView === "tracker") renderTracker();
};
document.getElementById("renameProfile").onclick = () => {
  const name = prompt("新名稱", currentProfile);
  if (!name || name === currentProfile) return;
  if (db.profiles[name]) { alert("已有呢個名稱"); return; }
  db.profiles[name] = db.profiles[currentProfile];
  db.profiles[name].name = name;
  delete db.profiles[currentProfile];
  currentProfile = name; save(); renderProfiles();
};
document.getElementById("delProfile").onclick = () => {
  if (Object.keys(db.profiles).length < 2) { alert("至少留一個學生"); return; }
  if (!confirm("刪除「" + currentProfile + "」？此操作不可還原。")) return;
  delete db.profiles[currentProfile];
  currentProfile = Object.keys(db.profiles)[0];
  save();
  if (currentView === "tracker") renderTracker(); else renderProfiles();
};
document.getElementById("paper").onchange = e => { currentPaper = e.target.value; selected.clear(); renderTracker(); };
document.getElementById("batchBtn").onclick = () => { batch = !batch; selected.clear(); renderTracker(); };
document.getElementById("hitBtn").onclick = () => { showHit = !showHit; renderTracker(); };
document.getElementById("undoBtn").onclick = doUndo;
document.getElementById("hkRefBtn").onclick = () => { prefs.hkRef = !prefs.hkRef; savePrefs(); renderWeak(); };
document.getElementById("cellFilter").onchange = e => { cellFilter = e.target.value; renderTracker(); };
document.getElementById("clearSel").onclick = () => { selected.clear(); renderTracker(); };
document.getElementById("copyHw").onclick = copyHw;
document.getElementById("csvHw").onclick = csvHw;
document.getElementById("batchBar").addEventListener("click", e => {
  const btn = e.target.closest("[data-apply]");
  if (!btn) return;
  const s = +btn.dataset.apply;
  if (!selected.size) return;
  pushUndo();
  selected.forEach(k => {
    const [y, q] = k.split(":").map(Number);
    setCell(currentPaper, y, q, { s });
  });
  selected.clear();
  renderTracker();
});
document.getElementById("weakArrange").addEventListener("change", renderWeak);
document.getElementById("weakChips").addEventListener("click", e => {
  const btn = e.target.closest("[data-band]");
  if (!btn) return;
  const bands = Object.assign({ hi: true, mid: false, lo: false }, prefs.weakBands || {});
  const key = btn.dataset.band;
  if (bands[key]) {
    const others = ["hi", "mid", "lo"].filter(k => k !== key && bands[k]);
    if (!others.length) return;
    bands[key] = false;
  } else bands[key] = true;
  prefs.weakBands = bands;
  savePrefs();
  renderWeak();
});
document.getElementById("axisLegend").addEventListener("click", e => {
  const chip = e.target.closest("[data-jump-topic]");
  if (chip) { jumpMcTopic(chip.dataset.jumpTopic); return; }
  const row = e.target.closest("[data-axis]");
  if (row) { radarAxis = radarAxis === row.dataset.axis ? "" : row.dataset.axis; renderWeak(); }
});
document.getElementById("radarBox").addEventListener("click", e => {
  const t = e.target.closest("[data-axis]");
  if (!t) return;
  radarAxis = radarAxis === t.dataset.axis ? "" : t.dataset.axis;
  renderWeak();
});
document.getElementById("weakBox").addEventListener("click", e => {
  if (e.target.id === "weakClear") { document.getElementById("weakBox").dataset.topic = ""; renderWeak(); return; }
  const row = e.target.closest("[data-weak-topic]");
  if (row) { document.getElementById("weakBox").dataset.topic = row.dataset.weakTopic; renderWeak(); return; }
  const jump = e.target.closest("[data-jump]");
  if (jump) {
    const [y, q] = jump.dataset.jump.split(":");
    jumpMc(y, q);
  }
});

document.getElementById("grid").addEventListener("click", e => {
  const jump = e.target.closest("[data-jump]");
  if (jump) {
    const [y, q] = jump.dataset.jump.split(":");
    jumpMc(y, q);
    return;
  }
  const hitBtn = e.target.closest("[data-toggle-hit]");
  if (hitBtn) { yearHitOff[+hitBtn.dataset.toggleHit] = !yearHitOff[+hitBtn.dataset.toggleHit]; renderTracker(); return; }
  const pick = e.target.closest("[data-pick]");
  if (pick) {
    batch = true;
    const block = pick.closest(".year-block");
    const y = +block.dataset.year;
    const qs = pick.dataset.pick === "year"
      ? allQs(currentPaper, y)
      : range(+pick.dataset.from, +pick.dataset.to).filter(q => !PAPERS[currentPaper].missing(y).includes(q));
    qs.forEach(q => selected.add(y + ":" + q));
    renderTracker();
    return;
  }
  if (e.target.classList.contains("pencil")) {
    const [y, q] = e.target.dataset.note.split(":").map(Number);
    openNote(y, q); return;
  }
  const cell = e.target.closest(".cell");
  if (!cell || cell.classList.contains("missing") || longFired) { longFired = false; return; }
  const y = +cell.dataset.y, q = +cell.dataset.q;
  const key = y + ":" + q;
  if (batch) {
    if (selected.has(key)) selected.delete(key); else selected.add(key);
    renderTracker();
    return;
  }
  pushUndo();
  const cur = getCell(currentPaper, y, q).s;
  const next = { 0: 3, 3: 2, 2: 1, 1: 0 }[cur] ?? 3;
  setCell(currentPaper, y, q, { s: next });
  renderTracker();
});
document.getElementById("grid").addEventListener("pointerdown", e => {
  const cell = e.target.closest(".cell");
  if (!cell || cell.classList.contains("missing") || batch) return;
  longFired = false;
  longTimer = setTimeout(() => { longFired = true; openNote(+cell.dataset.y, +cell.dataset.q); }, 550);
});
["pointerup", "pointercancel", "pointerleave"].forEach(ev => {
  document.getElementById("grid").addEventListener(ev, () => { clearTimeout(longTimer); });
});
document.getElementById("grid").addEventListener("contextmenu", e => {
  const cell = e.target.closest(".cell");
  if (!cell || cell.classList.contains("missing")) return;
  e.preventDefault();
  openNote(+cell.dataset.y, +cell.dataset.q);
});
document.getElementById("grid").addEventListener("change", e => {
  if (!e.target.dataset.score) return;
  const y = +e.target.dataset.score;
  pushUndo();
  const v = setScore(currentPaper, y, e.target.value);
  e.target.value = v;
  renderYearJump();
});
document.getElementById("grid").addEventListener("keydown", e => {
  if (e.key !== "Enter" || !e.target.dataset.score) return;
  e.preventDefault();
  const y = +e.target.dataset.score;
  const v = setScore(currentPaper, y, e.target.value);
  e.target.value = v;
  renderYearJump();
  const ys = yearsDesc();
  const idx = ys.indexOf(y);
  if (idx < 0 || idx >= ys.length - 1) return;
  const next = document.querySelector(`[data-score="${ys[idx + 1]}"]`);
  if (next) { next.focus(); next.select(); }
});
document.getElementById("yearJump").addEventListener("click", e => {
  const btn = e.target.closest("[data-jump-year]");
  if (!btn) return;
  scrollToYear(+btn.dataset.jumpYear);
});
document.getElementById("tagBox").addEventListener("change", () => {
  const boxes = [...document.querySelectorAll("#tagBox input:checked")];
  if (boxes.length > 3) { boxes[boxes.length - 1].checked = false; alert("每題最多 3 個錯因標籤"); }
});
document.getElementById("noteCancel").onclick = () => document.getElementById("noteDlg").close();
document.getElementById("noteSave").onclick = () => {
  const tags = [...document.querySelectorAll("#tagBox input:checked")].map(x => x.value).slice(0, 3);
  pushUndo();
  setCell(currentPaper, noteTarget.y, noteTarget.q, { note: document.getElementById("noteText").value.trim(), tags });
  document.getElementById("noteDlg").close();
  renderTracker();
};
document.getElementById("gradeTable").addEventListener("change", e => {
  const gs = e.target.dataset.gs;
  if (!gs) return;
  const [paper, year] = gs.split(":");
  pushUndo();
  const v = setScore(paper, +year, e.target.value);
  e.target.value = v;
  renderGrades();
});
document.getElementById("gradeTable").addEventListener("keydown", e => {
  if (e.key !== "Enter" || !e.target.dataset.gs) return;
  e.preventDefault();
  const [paper, year] = e.target.dataset.gs.split(":");
  const v = setScore(paper, +year, e.target.value);
  e.target.value = v;
  const ys = yearsDesc();
  const idx = ys.indexOf(+year);
  if (idx >= 0 && idx < ys.length - 1) {
    const next = document.querySelector(`[data-gs="${paper}:${ys[idx + 1]}"]`);
    if (next) { next.focus(); next.select(); return; }
  }
  renderGrades();
});
document.getElementById("gradeTable").addEventListener("click", e => {
  const td = e.target.closest("[data-go-year]");
  if (!td) return;
  showView("tracker");
  setTimeout(() => scrollToYear(+td.dataset.goYear), 40);
});
document.getElementById("showM1").onchange = e => { prefs.showM1 = e.target.checked; savePrefs(); renderGrades(); };
document.getElementById("showM2").onchange = e => { prefs.showM2 = e.target.checked; savePrefs(); renderGrades(); };

document.getElementById("mcSeries").addEventListener("change", () => {
  mcYearFilled[document.getElementById("mcSeries").value] = false;
  fillMcYears(document.getElementById("mcSeries").value);
  renderMc();
});
["mcMode", "mcYear", "mcQ", "mcTopic", "mcOrder"].forEach(id => {
  document.getElementById(id).addEventListener("change", renderMc);
});
document.getElementById("mcHideAnsBtn").onclick = () => { mcHideAns = !mcHideAns; renderMc(); };
document.getElementById("mcUnseenBtn").onclick = () => { mcUnseen = !mcUnseen; renderMc(); };
document.getElementById("mcReset").onclick = () => {
  document.getElementById("mcSeries").value = "dse";
  document.getElementById("mcMode").value = "year";
  fillMcYears("dse");
  document.getElementById("mcYear").selectedIndex = 0;
  document.getElementById("mcTopic").value = "";
  document.getElementById("mcOrder").value = "desc";
  fillMcQ();
  document.getElementById("mcQ").value = "all";
  mcUnseen = false;
  mcHideAns = false;
  mcPick = null;
  renderMc();
};
document.getElementById("mcResult").addEventListener("click", e => {
  const mark = e.target.closest("[data-mark]");
  if (mark) {
    const card = e.target.closest(".focus-card");
    if (!card) return;
    pushUndo();
    setCell("p2", +card.dataset.fy, +card.dataset.fq, { s: +mark.dataset.mark });
    renderMc();
    return;
  }
  const card = e.target.closest(".qcard[data-q]");
  if (!card) return;
  if (document.getElementById("mcMode").value === "topic") {
    mcPick = { y: +card.dataset.y, q: +card.dataset.q, topic: document.getElementById("mcTopic").value };
    renderMc();
    return;
  }
  document.getElementById("mcQ").value = card.dataset.q;
  renderMc();
});

document.getElementById("itemPaper").addEventListener("change", renderItems);
document.getElementById("itemYear").addEventListener("change", () => renderItemYear());
document.getElementById("itemMulti").addEventListener("click", e => {
  const td = e.target.closest("[data-jump-year]");
  if (!td) return;
  document.getElementById("itemYear").value = td.dataset.jumpYear;
  const paper = document.getElementById("itemPaper").value;
  if (paper === "p2") {
    jumpMc(td.dataset.jumpYear, 1);
    document.getElementById("mcQ").value = "all";
    renderMc();
    return;
  }
  renderItemYear(td.dataset.jumpSec);
});
document.getElementById("itemYearView").addEventListener("click", e => {
  if (e.target.id === "jumpMcYear") {
    jumpMc(document.getElementById("itemYear").value, 1);
    document.getElementById("mcQ").value = "all";
    renderMc();
  }
});

document.getElementById("timerPaper").onchange = () => { if (!timerLocked) paintTimer(); };
document.getElementById("timerExtra").onclick = () => {
  if (timerLocked) return;
  timerExtra = !timerExtra;
  paintTimer();
};
document.getElementById("timerSound").onchange = e => { prefs.timerSound = e.target.checked; savePrefs(); };
document.getElementById("timerStart").onclick = () => {
  if (timerRun.ended) return;
  if (!timerRun.start) {
    timerRun.start = Date.now();
    timerRun.paused = false;
    timerRun.ended = false;
    timerRun.warned15 = false;
    timerRun.warned5 = false;
    timerLocked = true;
  } else if (timerRun.paused) {
    const pauseLen = Date.now() - timerRun.pause;
    timerRun.start += pauseLen;
    timerRun.paused = false;
  }
  clearInterval(timerRun.tick);
  timerRun.tick = setInterval(timerTick, 250);
  paintTimer();
};
document.getElementById("timerPause").onclick = () => {
  if (!timerRun.start || timerRun.ended || timerRun.paused) return;
  timerRun.paused = true;
  timerRun.pause = Date.now();
  clearInterval(timerRun.tick);
  paintTimer();
};
document.getElementById("timerReset").onclick = () => {
  clearInterval(timerRun.tick);
  timerRun = { paper: document.getElementById("timerPaper").value, extra: timerExtra, start: 0, pause: 0, paused: false, ended: false, tick: null, warned15: false, warned5: false };
  timerLocked = false;
  paintTimer();
};
document.addEventListener("visibilitychange", () => { if (timerRun.start && !timerRun.paused) timerTick(); });

document.getElementById("exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "dse-math-tracker-" + currentProfile + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
document.getElementById("importBtn").onclick = () => {
  const inp = document.getElementById("importFile");
  inp.value = "";
  inp.click();
};
document.getElementById("importFile").onchange = e => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result || "").replace(/^\uFEFF/, "");
      const incoming = JSON.parse(text);
      const src = incoming.profiles && typeof incoming.profiles === "object"
        ? incoming.profiles
        : (incoming.cells ? { [incoming.name || incoming.currentProfile || file.name.replace(/\.json$/i, "")]: incoming } : null);
      if (!src || !Object.keys(src).length) throw new Error("格式唔啱（要有 profiles）");
      for (const [name, p] of Object.entries(src)) {
        if (!p || typeof p !== "object") continue;
        db.profiles[name] = {
          name,
          cells: p.cells && typeof p.cells === "object" ? p.cells : {},
          scores: p.scores && typeof p.scores === "object" ? p.scores : {},
          updatedAt: p.updatedAt || Date.now()
        };
      }
      const pick = incoming.currentProfile && db.profiles[incoming.currentProfile]
        ? incoming.currentProfile
        : (Object.keys(src).find(n => db.profiles[n]) || currentProfile);
      currentProfile = pick;
      save();
      renderProfiles();
      if (currentView === "tracker") renderTracker();
      else if (currentView === "weak") renderWeak();
      else if (currentView === "mc") renderMc();
      else if (currentView === "grades") renderGrades();
      else renderTracker();
    } catch (err) { alert("匯入失敗：" + err.message); }
  };
  reader.readAsText(file);
};

document.getElementById("timerSound").checked = !!prefs.timerSound;
if (!prefs.weakBands) prefs.weakBands = { hi: true, mid: false, lo: false };
const toTop = document.getElementById("toTop");
const paintToTop = () => { toTop.hidden = window.scrollY < 200; };
window.addEventListener("scroll", paintToTop, { passive: true });
toTop.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
paintToTop();
const hash = location.hash.replace("#", "");
if (["tracker", "weak", "grades", "mc", "items", "cutoffs", "timer"].includes(hash)) showView(hash);
else showView("tracker");
