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
const CUT_COLORS = { "5**": "#1c1915", "5*": "#3d6e8c", "5": "#2f5d50", "4": "#6a8f3d", "3": "#c4a35a", "2": "#a35a4a", stu: "#3d6e8c" };
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
let showHit = false;
let yearHitOff = {};
let cellFilter = "all";
let topicFilter = "";
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
  { id: "a-meas", name: "甲　度量圖形", part: "甲", topics: ["量度與誤差","面積與體積","扇形","直線圖形：角度","直線圖形：長度與面積","多邊形","對稱","面積比","三角函數","三角學（甲部）","圓的性質","全等與相似三角形"] },
  { id: "a-coord", name: "甲　坐標幾何", part: "甲", topics: ["直線方程","圓方程","軌跡","極坐標","坐標幾何：點"] },
  { id: "a-stat", name: "甲　統計與概率", part: "甲", topics: ["概率","統計"] },
  { id: "b-alg", name: "乙　數與代數", part: "乙", topics: ["進制","複數","指數與對數","H.C.F./L.C.M.","線性規劃","續方程","數列","二次方程"] },
  { id: "b-shape", name: "乙　圖形與幾何", part: "乙", topics: ["三角學（乙部）","三角函數","立體三角","圓的性質"] },
  { id: "b-coord", name: "乙　坐標幾何", part: "乙", topics: ["圖像變換","圖像軸的變換","圓方程","三角形的心"] },
  { id: "b-stat", name: "乙　統計與概率", part: "乙", topics: ["排列組合","概率","統計"] }
];
const TOPIC_ORDER = {
  "甲": ["指數","主項變換","因式分解","代數分式","不等式","百分數","恆等式","量度與誤差","聯立方程","函數","二次方程","數列","率與比","二次函數圖像","多項式","極坐標","變分","面積與體積","扇形","直線圖形：角度","直線圖形：長度與面積","多邊形","對稱","面積比","全等與相似三角形","三角函數","三角學（甲部）","坐標幾何：點","圓的性質","直線方程","圓方程","軌跡","概率","統計"],
  "乙": ["進制","複數","H.C.F./L.C.M.","圖像變換","二次方程","續方程","指數與對數","圖像軸的變換","線性規劃","三角學（乙部）","三角函數","立體三角","數列","圓的性質","圓方程","三角形的心","排列組合","概率","統計"]
};
function topicRank(part, topic) {
  const list = TOPIC_ORDER[part] || [];
  const i = list.indexOf(topic);
  return i < 0 ? 1000 : i;
}
function sortTopicRows(rows) {
  return rows.slice().sort((a, b) => {
    const pa = a.part === "乙" ? 1 : 0, pb = b.part === "乙" ? 1 : 0;
    if (pa !== pb) return pa - pb;
    return topicRank(a.part, a.topic) - topicRank(b.part, b.topic);
  });
}
function axisOf(part, topic) {
  return AXES.find(a => a.part === part && a.topics.includes(topic)) || null;
}
const OLD_TOPICS = new Set(["極坐標", "對稱"]);
const HEX_QS = new Set(["2012:33", "2013:33", "2016:33", "2017:32", "2020:31", "2021:32", "2022:34", "2024:32", "2025:31"]);
const PARTIAL_SYLL = new Set([
  "p2:2012:45", "p2:2013:31", "p2:2014:11", "p2:2015:45", "p2:2016:31", "p2:2018:14", "p2:2020:14", "p2:2025:32",
  "p1:2013:6", "p1:2016:7", "p1:2021:7", "p1:2024:7"
]);
function isHexQ(y, q) { return HEX_QS.has(y + ":" + q); }
function syllKind(paper, y, q) {
  if (paper === "p2") {
    if (OLD_TOPICS.has(topicOf(y, q))) return "old";
    if (isHexQ(y, q)) return "old";
  }
  if (paper === "p1") {
    const tops = qTopics("p1", y, q);
    if (tops.some(t => OLD_TOPICS.has(t))) return "old";
  }
  return PARTIAL_SYLL.has(paper + ":" + y + ":" + q) ? "part" : "";
}
function syllOn() { return !!prefs.includeOld; }
function skipOldTopic(topic) { return !syllOn() && OLD_TOPICS.has(topic); }
function skipOldQ(y, q, topic) {
  if (isHexQ(y, q)) return !syllOn();
  return skipOldTopic(topic);
}
function pushUndo() {
  const pr = prof();
  undoSnap = {
    id: currentProfile,
    cells: JSON.parse(JSON.stringify(pr.cells)),
    scores: JSON.parse(JSON.stringify(pr.scores)),
    dates: JSON.parse(JSON.stringify(pr.dates || {})),
    times: JSON.parse(JSON.stringify(pr.times || {}))
  };
}
function doUndo() {
  if (!undoSnap || !db.profiles[undoSnap.id]) return;
  db.profiles[undoSnap.id].cells = undoSnap.cells;
  db.profiles[undoSnap.id].scores = undoSnap.scores;
  db.profiles[undoSnap.id].dates = undoSnap.dates || {};
  db.profiles[undoSnap.id].times = undoSnap.times || {};
  undoSnap = null;
  save();
  if (currentView === "tracker") renderTracker();
  else if (currentView === "weak") renderWeak();
  else if (currentView === "mc") renderMc();
  else if (currentView === "grades") renderGrades();
  else if (currentView === "timer") renderTimer();
}


function loadPrefs() {
  const d = { showCore: true, showM1: false, showM2: false, mcMarkOn: false, timerSound: false, weakBands: { hi: true, mid: true, lo: true }, weakStats: { 2: true, 1: true }, itemP1Topics: false, weakPaper: "p1", hkRef: true, includeOld: false, mcIncludeOld: true, cutKind: "core", cutStu: true, cutLv: { "5**": true, "5*": true, "5": true, "4": true, "3": true, "2": true } };
  try { return Object.assign(d, JSON.parse(localStorage.getItem(PREF_KEY) || "{}")); }
  catch { return d; }
}
function savePrefs() { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }
function blankProfile(name) { return { name, cells: {}, scores: {}, dates: {}, times: {}, updatedAt: Date.now() }; }
function loadDb() {
  try {
    const v2 = localStorage.getItem(storeKey);
    if (v2) return migrateDb(JSON.parse(v2));
    const v1 = localStorage.getItem("dse-math-tracker-v1");
    if (v1) {
      const old = JSON.parse(v1);
      for (const p of Object.values(old.profiles || {})) p.scores = p.scores || {};
      return migrateDb(old);
    }
  } catch {}
  return { currentProfile: "自己", profiles: { "自己": blankProfile("自己") } };
}
function migrateDb(data) {
  data.profiles = data.profiles || {};
  Object.values(data.profiles).forEach(p => {
    if (!p || typeof p !== "object") return;
    p.scores = p.scores || {};
    p.dates = p.dates || {};
    p.times = p.times || {};
  });
  return data;
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
function getDate(paper, year) {
  return (prof().dates || {})[scoreKey(paper, year)] || "";
}
function setDate(paper, year, iso) {
  prof().dates = prof().dates || {};
  const v = String(iso || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) delete prof().dates[scoreKey(paper, year)];
  else prof().dates[scoreKey(paper, year)] = v;
  save();
  return getDate(paper, year);
}
function getTimeSec(paper, year) {
  const v = (prof().times || {})[scoreKey(paper, year)];
  return v == null || v === "" ? "" : +v;
}
function setTimeSec(paper, year, sec) {
  prof().times = prof().times || {};
  const n = Math.max(0, Math.round(+sec || 0));
  if (!n) delete prof().times[scoreKey(paper, year)];
  else prof().times[scoreKey(paper, year)] = n;
  save();
  return getTimeSec(paper, year);
}
function fmtHm(sec) {
  const m = Math.round(Math.max(0, +sec || 0) / 60);
  return Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0");
}
function todayIso() {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function yearPaperDone(paper, y) {
  const qs = allQs(paper, y);
  return qs.length > 0 && qs.every(q => getCell(paper, y, q).s);
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
function p1Items() { return (window.P1_TOPICS && P1_TOPICS.items) || []; }
function p1PartOfSec(sec) { return sec === "乙" || sec === "乙部" ? "乙" : "甲"; }
function p1Subs(y, q) { return p1Items().filter(x => x.y === y && x.q === q); }
function p1MainTopic(y, q) {
  const subs = p1Subs(y, q);
  if (!subs.length) return "";
  const by = {};
  subs.forEach(s => { by[s.topic] = (by[s.topic] || 0) + (s.marks || 0); });
  return Object.entries(by).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}
function p1TopicLine(y, q) {
  const names = [], seen = new Set();
  p1Subs(y, q).forEach(s => {
    [s.topic, s.sub1, s.sub2].forEach(t => {
      if (t && !seen.has(t)) { seen.add(t); names.push(t); }
    });
  });
  return names.join("／");
}
function p1TopicForSub(year, sub) {
  const key = normQLabel(sub);
  const hit = p1Items().find(x => x.y === year && normQLabel(x.sub) === key);
  if (!hit) return "";
  return [hit.topic, hit.sub1, hit.sub2].filter(Boolean).join("／");
}
function p1HitPct(y, q) {
  const subs = p1Subs(y, q);
  let hk = 0, m = 0;
  for (const s of subs) {
    if (s.hk == null || s.hk === "" || !s.marks) return null;
    hk += s.hk;
    m += s.marks;
  }
  if (!m) return null;
  return Math.round(hk / m * 100);
}
function qTopics(paper, y, q) {
  if (paper === "p2") {
    const t = topicOf(y, q);
    return t ? [t] : [];
  }
  if (paper === "p1") {
    const names = [], seen = new Set();
    p1Subs(y, q).forEach(s => {
      [s.topic, s.sub1, s.sub2].forEach(t => {
        if (t && !seen.has(t)) { seen.add(t); names.push(t); }
      });
    });
    return names;
  }
  return [];
}
function weakPaperId() {
  const el = document.getElementById("weakPaper");
  const v = (el && el.value) || prefs.weakPaper || "p1";
  return v === "p1" || v === "p2" ? v : "p1";
}
function paperLabel(id) { return (PAPERS[id] && PAPERS[id].name) || id; }
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
function normQLabel(s) {
  const t = String(s == null ? "" : s).trim();
  const m = t.match(/^(\d+)(?:\.0+)?(.*)$/);
  return m ? m[1] + m[2] : t;
}
function hasNote(c) { return !!(c.note && c.note.length) || !!(c.tags && c.tags.length); }
function matchTopic(y, q) {
  if (!topicFilter) return true;
  if (currentPaper === "p2") return topicOf(y, q) === topicFilter;
  if (currentPaper === "p1") return qTopics("p1", y, q).includes(topicFilter);
  return true;
}
function visQs(y, qs) {
  const miss = PAPERS[currentPaper].missing(y);
  return qs.filter(q => !miss.includes(q) && matchTopic(y, q));
}
function matchFilter(c) {
  if (cellFilter === "all") return true;
  if (cellFilter === "note") return hasNote(c);
  if (String(cellFilter).startsWith("tag:")) return (c.tags || []).includes(cellFilter.slice(4));
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
  if (!hb.hidden) {
    hb.textContent = showHit ? "隱藏命中率" : "顯示命中率";
    hb.classList.toggle("on-toggle", !!showHit);
  }
}
function renderYearJump() {
  const el = document.getElementById("yearJump");
  el.innerHTML = yearsDesc().filter(y => visQs(y, allQs(currentPaper, y)).length).map(y => {
    const entered = hasYearScore(currentPaper, y);
    const done = yearPaperDone(currentPaper, y);
    return `<button type="button" class="year-pill${entered ? " entered" : ""}${done ? " complete" : ""}" data-jump-year="${y}" title="${done ? "格已填齊" : "尚有未做"}${entered ? " · 已填分數" : ""}">${y}</button>`;
  }).join("");
}
function scrollToYear(y) {
  const el = document.querySelector(`.year-block[data-year="${y}"]`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
function tagStats() {
  const n = {};
  TAGS.forEach(([id]) => { n[id] = 0; });
  for (const y of YEARS) {
    for (const q of visQs(y, allQs(currentPaper, y))) {
      (getCell(currentPaper, y, q).tags || []).forEach(t => { if (n[t] != null) n[t]++; });
    }
  }
  return TAGS.map(([id, name]) => [id, name, n[id]]).filter(x => x[2]).sort((a, b) => b[2] - a[2]);
}
function ringSvg(pct) {
  const p = Math.max(0, Math.min(100, pct));
  const r = 16, c = 2 * Math.PI * r, dash = c * p / 100;
  return `<svg class="ring" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="${r}" fill="none" stroke="#eee8dc" stroke-width="4"/>
    <circle cx="20" cy="20" r="${r}" fill="none" stroke="#2f5d50" stroke-width="4" stroke-linecap="round" stroke-dasharray="${dash.toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 20 20)"/>
    <text x="20" y="24" text-anchor="middle" font-size="10" font-family="JetBrains Mono, monospace" fill="#1c1915">${p}%</text>
  </svg>`;
}
function yearStatusCounts(y) {
  const c = [0, 0, 0, 0];
  for (const q of visQs(y, allQs(currentPaper, y))) {
    c[getCell(currentPaper, y, q).s]++;
  }
  return c;
}
function yearStackHtml(y) {
  const c = yearStatusCounts(y);
  return `<span class="ystack" title="已掌握 ${c[3]} · 一般 ${c[2]} · 唔識 ${c[1]} · 未做 ${c[0]}">${[3, 2, 1, 0].map(s => `<i class="ys${s}" style="flex:${c[s]}"></i>`).join("")}</span>`;
}
function paintYearStack(y) {
  const el = document.querySelector(`.year-block[data-year="${y}"] .ystack`);
  if (!el) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = yearStackHtml(y);
  el.replaceWith(wrap.firstElementChild);
}
function paintCellEl(cell, y, q) {
  const c = getCell(currentPaper, y, q);
  const sk = syllKind(currentPaper, y, q);
  cell.classList.remove("s1", "s2", "s3", "sel", "syll-old", "syll-part");
  if (STATE_CLASS[c.s]) cell.classList.add(STATE_CLASS[c.s]);
  if (selected.has(y + ":" + q)) cell.classList.add("sel");
  if (sk === "old") cell.classList.add("syll-old");
  if (sk === "part") cell.classList.add("syll-part");
  const qcell = cell.closest(".qcell");
  if (qcell) qcell.classList.toggle("dim", !matchFilter(c));
}
function renderStats() {
  let total = 0, counts = [0, 0, 0, 0];
  for (const y of YEARS) {
    for (const q of visQs(y, allQs(currentPaper, y))) { total++; counts[getCell(currentPaper, y, q).s]++; }
  }
  const done = total - counts[0];
  const pct = total ? Math.round(done * 100 / total) : 0;
  const filled = counts[1] + counts[2] + counts[3];
  const mix = filled
    ? `<div class="ystack ystack-lg" title="已掌握 ${counts[3]} · 一般 ${counts[2]} · 唔識 ${counts[1]}">${[3, 2, 1].map(s => `<i class="ys${s}" style="flex:${counts[s]}"></i>`).join("")}</div>
       <span>已填 ${filled}　掌握 ${counts[3]} · 一般 ${counts[2]} · 唔識 ${counts[1]}</span>`
    : `<b>—</b><span>已填 0</span>`;
  const top = tagStats().slice(0, 3);
  const onTag = String(cellFilter).startsWith("tag:") ? cellFilter.slice(4) : "";
  const maxT = top[0] ? top[0][2] : 1;
  const bars = top.map(([id, name, n]) =>
    `<button type="button" class="mini-bar${onTag === id ? " on" : ""}" data-tag="${id}"><span>${esc(name)}</span><i><b style="width:${Math.round(n * 100 / maxT)}%"></b></i><em>${n}</em></button>`
  ).join("");
  const hero = top[0];
  document.getElementById("stats").innerHTML = `
    <div class="stat ring-stat">${ringSvg(pct)}<span>已標記　${done}/${total}</span></div>
    <div class="stat mix-stat">${mix}</div>
    <div class="stat"><b>${counts[0]}</b><span>未做</span></div>
    <div class="stat tag-stat${hero && onTag === hero[0] ? " on" : ""}">${hero ? `<b>${esc(hero[1])}</b><span>最常錯　${hero[2]}</span><div class="mini-bars">${bars}</div>` : `<b>—</b><span>最常錯</span>`}</div>`;
}
function cellHtml(y, q) {
  const c = getCell(currentPaper, y, q);
  const sel = selected.has(y + ":" + q) ? "sel" : "";
  const dim = matchFilter(c) ? "" : "dim";
  const hit = currentPaper === "p2" && showHit && !yearHitOff[y] ? p2Hit(y, q) : null;
  const b = bandOf(hit);
  const hitHtml = hit != null ? `<span class="hit ${b}">${String(Math.round(hit)).padStart(2, "0")}</span>` : "";
  const qn = `<span class="qn" style="cursor:default;text-decoration:none;color:var(--muted)">${q}</span>`;
  const sk = syllKind(currentPaper, y, q);
  const syllCls = sk === "old" ? " syll-old" : sk === "part" ? " syll-part" : "";
  const syllTitle = sk === "old" ? "舊課程" : sk === "part" ? "部分舊課程" : "";
  return `<div class="qcell ${dim}">${qn}
    <div class="cell ${STATE_CLASS[c.s] || ""} ${sel}${syllCls}" data-y="${y}" data-q="${q}" ${syllTitle ? `title="${syllTitle}"` : ""}>${hitHtml}</div>
    <button class="pencil ${hasNote(c) ? "filled" : ""}" data-note="${y}:${q}" title="筆記">✎</button>
  </div>`;
}
function captureQrowScroll() {
  const m = {};
  document.querySelectorAll("#grid .year-block").forEach(b => {
    const row = b.querySelector(".qrow");
    if (row) m[b.dataset.year] = row.scrollLeft;
  });
  return m;
}
function restoreQrowScroll(m) {
  if (!m) return;
  document.querySelectorAll("#grid .year-block").forEach(b => {
    const row = b.querySelector(".qrow");
    if (row && m[b.dataset.year]) row.scrollLeft = m[b.dataset.year];
  });
}
function renderGrid() {
  const paper = PAPERS[currentPaper];
  const keep = captureQrowScroll();
  let html = "";
  for (const y of YEARS.slice().reverse()) {
    const secs = paper.sectionsFor(y).map(sec => ({ name: sec.name, qs: visQs(y, sec.qs) })).filter(sec => sec.qs.length);
    if (!secs.length) continue;
    const secHtml = secs.map((sec, i) => {
      const cells = sec.qs.map(q => cellHtml(y, q)).join("");
      return `${i ? '<div class="split"></div>' : ""}
        <div class="sec-wrap"><span class="sec-lab">${sec.name} ${sec.qs[0]}${sec.qs.length > 1 ? "–" + sec.qs[sec.qs.length - 1] : ""}</span>
        <div class="sec">${cells}</div></div>`;
    }).join("");
    const sc = getScore(currentPaper, y);
    const dt = getDate(currentPaper, y);
    const used = getTimeSec(currentPaper, y);
    const hitBtn = currentPaper === "p2"
      ? `<button class="ghost" data-toggle-hit="${y}">${yearHitOff[y] ? "顯示命中率" : "隱藏命中率"}</button>` : "";
    const yQs = visQs(y, allQs(currentPaper, y));
    const yOn = yQs.length && yQs.every(q => selected.has(y + ":" + q));
    const pickLab = (on, name) => (on ? "取消" : "選") + name;
    html += `<div class="year-block" data-year="${y}">
      <div class="year-head">
        <b>${y}</b>
        ${yearStackHtml(y)}
        <div class="score-box">分數 / ${paper.full}
          <input type="number" min="0" max="${paper.full}" step="1" inputmode="numeric" data-score="${y}" value="${sc}">
        </div>
        <div class="score-box">操卷日
          <input type="date" data-date="${y}" value="${dt}">
          <button type="button" class="ghost" data-date-today="${y}">今日</button>
        </div>
        ${used !== "" ? `<span class="used-time">用時 ${fmtHm(used)}</span>` : ""}
        <button class="ghost${yOn ? " on-toggle" : ""}" data-pick="year">${pickLab(yOn, "呢年")}</button>
        ${secs.map(sec => {
          const on = sec.qs.length && sec.qs.every(q => selected.has(y + ":" + q));
          return `<button class="ghost${on ? " on-toggle" : ""}" data-pick="sec" data-from="${sec.qs[0]}" data-to="${sec.qs[sec.qs.length - 1]}">${pickLab(on, sec.name)}</button>`;
        }).join("")}
        ${hitBtn}
      </div>
      <div class="qrow">${secHtml}</div>
    </div>`;
  }
  document.getElementById("grid").innerHTML = html || `<p class="hint">呢個課題喺可見年份冇題。</p>`;
  restoreQrowScroll(keep);
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
  document.getElementById("summary").innerHTML =
    `甲部未穩 ${aWeak} · 其餘未穩 ${bWeak} · 有筆記／標籤 ${notes} 題`;
}
function fillTopicFilter() {
  const lab = document.getElementById("topicFilterLab");
  const sel = document.getElementById("topicFilter");
  if (!lab || !sel) return;
  const show = currentPaper === "p1" || currentPaper === "p2";
  lab.hidden = !show;
  if (!show) { topicFilter = ""; return; }
  const freq = sortTopicRows(
    currentPaper === "p1"
      ? ((window.P1_TOPICS && P1_TOPICS.freq) || [])
      : ((window.P2_TOPICS && P2_TOPICS.freq) || [])
  );
  const a = freq.filter(f => f.part === "甲");
  const b = freq.filter(f => f.part === "乙");
  const labT = f => esc(f.topic) + (OLD_TOPICS.has(f.topic) ? "（舊課程）" : "");
  const keep = topicFilter;
  sel.innerHTML = `<option value="">全部課題</option>
    <optgroup label="甲">${a.map(f => `<option value="${esc(f.topic)}">${labT(f)}</option>`).join("")}</optgroup>
    <optgroup label="乙">${b.map(f => `<option value="${esc(f.topic)}">${labT(f)}</option>`).join("")}</optgroup>`;
  if ([...sel.options].some(o => o.value === keep)) sel.value = keep;
  else { sel.value = ""; topicFilter = ""; }
}
function renderTracker() {
  renderProfiles();
  renderPaperSelect();
  fillTopicFilter();
  renderYearJump();
  renderStats();
  renderGrid();
  renderSummary();
  document.getElementById("batchBar").hidden = false;
  document.getElementById("trackerTheme").hidden = false;
  document.getElementById("trackerTheme").classList.toggle("is-batch", !!batch);
  document.getElementById("batchApply").hidden = !batch;
  document.getElementById("clearSel").hidden = !batch;
  document.getElementById("batchBtn").textContent = batch ? "退出批量" : "批量選擇";
  document.getElementById("selCount").textContent = "已選 " + selected.size + " 格";
}

function isEasy(it) { return it.pct != null && it.pct >= 60; }
function bandOk(pct) {
  const b = bandOf(pct);
  if (!b) return false;
  const bands = prefs.weakBands || { hi: true, mid: true, lo: true };
  return !!bands[b];
}
function statOk(s) {
  const st = prefs.weakStats || { 2: true, 1: true };
  return !!st[s];
}
function weakItems() {
  const out = [];
  const paper = weakPaperId();
  if (paper === "p1") {
    for (const y of YEARS) {
      for (const q of allQs("p1", y)) {
        const c = getCell("p1", y, q);
        if (!(c.s === 1 || c.s === 2) || !statOk(c.s)) continue;
        const topic = p1MainTopic(y, q) || "未分類";
        if (skipOldTopic(topic)) continue;
        const subs = p1Subs(y, q);
        const sec = (subs[0] && subs[0].sec) || (q <= 9 ? "甲一" : q <= 14 ? "甲二" : "乙");
        const pct = p1HitPct(y, q);
        if (!bandOk(pct)) continue;
        out.push({ paper, y, q, s: c.s, topic, topics: p1TopicLine(y, q), tags: c.tags || [], note: c.note || "", part: sec, axisPart: p1PartOfSec(sec), pct });
      }
    }
  } else {
    for (const y of YEARS) {
      for (const q of allQs("p2", y)) {
        const c = getCell("p2", y, q);
        if (!(c.s === 1 || c.s === 2) || !statOk(c.s)) continue;
        const pct = p2Hit(y, q);
        const topic = topicOf(y, q) || "未分類";
        const it = { paper: "p2", y, q, s: c.s, topic, topics: topic, tags: c.tags || [], note: c.note || "", part: q <= 30 ? "甲" : "乙", axisPart: q <= 30 ? "甲" : "乙", pct };
        if (isHexQ(y, q)) continue;
        if (skipOldTopic(it.topic)) continue;
        if (!bandOk(pct)) continue;
        out.push(it);
      }
    }
  }
  out.sort((a, b) => a.s - b.s || b.y - a.y || a.q - b.q);
  return out;
}
function itemRowHtml(it) {
  const lab = bandLabel(it.pct);
  const pct = it.pct == null ? "—" : it.pct + "%";
  const sh = lab ? `<span class="should ${bandOf(it.pct)}">${lab}</span>` : "";
  const sk = syllKind(it.paper || "p2", it.y, it.q);
  const topic = it.topics || it.topic;
  return `<tr data-jump="${it.y}:${it.q}" data-jump-paper="${it.paper || "p2"}" class="clickable"><td>${it.y}</td><td>Q${it.q}</td><td>${it.part}</td><td>${esc(topic)}${sk === "part" ? "　<span class='sub'>部分舊課程</span>" : sk === "old" ? "　<span class='sub'>舊課程</span>" : ""}</td><td class="${bandClass(it.pct)}">${pct}</td><td>${sh}</td><td>${(it.tags || []).map(tagName).join("、")}</td></tr>`;
}
function paintWeakChips() {
  const bands = prefs.weakBands || { hi: true, mid: true, lo: true };
  document.querySelectorAll("#weakChips .chip").forEach(btn => {
    btn.classList.toggle("on", !!bands[btn.dataset.band]);
  });
  const st = prefs.weakStats || { 2: true, 1: true };
  document.querySelectorAll("#weakStatChips .chip").forEach(btn => {
    btn.classList.toggle("on", !!st[btn.dataset.stat]);
  });
}

function markedPaperCount(paper) {
  let n = 0;
  for (const y of YEARS) for (const q of allQs(paper, y)) if (getCell(paper, y, q).s) n++;
  return n;
}
function markedP2Count() { return markedPaperCount("p2"); }
function topicAbility(part, topic) {
  const paper = weakPaperId();
  if (paper === "p1") {
    const items = p1Items().filter(x => p1PartOfSec(x.sec) === part && x.topic === topic);
    let sum = 0, w = 0;
    items.forEach(x => {
      const c = getCell("p1", x.y, x.q);
      if (!c.s) return;
      const m = x.marks || 0;
      sum += (c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0) * m;
      w += m;
    });
    if (!w) return { n: 0, L: null };
    return { n: items.length, L: sum / w };
  }
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
  const paper = weakPaperId();
  if (paper === "p1") {
    const items = p1Items().filter(x => p1PartOfSec(x.sec) === axis.part && axis.topics.includes(x.topic) && !skipOldQ(x.y, x.q, x.topic));
    let sum = 0, wsum = 0, hkSum = 0, hkW = 0;
    const seenQ = new Set();
    items.forEach(x => {
      const c = getCell("p1", x.y, x.q);
      if (!c.s) return;
      const w = c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0;
      const m = x.marks || 0;
      sum += w * m;
      wsum += m;
      seenQ.add(x.y + ":" + x.q);
      if (x.hk != null && x.hk !== "" && m) { hkSum += x.hk; hkW += m; }
    });
    if (seenQ.size < 4) return { n: seenQ.size, L: null, hk: null };
    return { n: seenQ.size, L: wsum ? sum / wsum : null, hk: hkW ? hkSum / hkW : null };
  }
  const items = (P2_TOPICS.items || []).filter(x => x.part === axis.part && axis.topics.includes(x.topic) && !skipOldQ(x.y, x.q, x.topic));
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
function radarSpokes(vals, cx, cy, r, stroke, dash) {
  let s = "";
  vals.forEach((v, i) => {
    if (v == null) return;
    const ang = -Math.PI / 2 + i * 2 * Math.PI / vals.length;
    const x = (cx + r * v * Math.cos(ang)).toFixed(1), y = (cy + r * v * Math.sin(ang)).toFixed(1);
    s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${stroke}" stroke-width="2.2"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
    s += `<circle cx="${x}" cy="${y}" r="4.5" fill="${stroke}"/>`;
  });
  return s;
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
  if (ratedL.length >= 4) {
    stu = `<polygon class="radar-stu" points="${ratedL.join(" ")}" fill="rgba(61,110,140,.28)" stroke="#3d6e8c" stroke-width="2"/>`;
  } else {
    stu = radarSpokes(L, cx, cy, r, "#3d6e8c");
  }
  L.forEach((v, i) => {
    if (v != null) return;
    const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
    const ox = (cx + r * Math.cos(ang)).toFixed(1), oy = (cy + r * Math.sin(ang)).toFixed(1);
    stu += `<circle cx="${ox}" cy="${oy}" r="4" class="miss"/>`;
  });
  if (prefs.hkRef) {
    const ratedH = radarPolyRated(H, cx, cy, r);
    if (ratedH.length >= 4) {
      hk = `<polygon points="${ratedH.join(" ")}" fill="none" stroke="#8a8178" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    } else {
      hk = radarSpokes(H, cx, cy, r, "#8a8178", "5 4").replace(/fill="#8a8178"/g, 'fill="none" stroke="#8a8178"');
    }
  }
  const empty = markedPaperCount(weakPaperId()) === 0;
  const emptyHint = `去進度標記${paperLabel(weakPaperId())}先出圖。`;
  document.getElementById("radarBox").innerHTML = empty
    ? `<p class="hint">${emptyHint}</p>`
    : `<svg viewBox="0 0 340 340">${rings}${spokes}${hk}${stu}${labels}
      <text x="170" y="318" text-anchor="middle" font-size="11" fill="#6b645b">實色＝你嘅標記平均　虛線＝全港命中率</text>
      <text x="170" y="332" text-anchor="middle" font-size="11" fill="#6b645b">紅線＝40%　綠線＝60%　卷一按分數加權</text></svg>`;
  document.getElementById("axisLegend").innerHTML = AXES.map((a, i) => {
    const sc = scores[i];
    const stuLab = sc.L == null ? "未評" : Math.round(sc.L * 100) + "%";
    const hkLab = sc.hk == null ? "—" : Math.round(sc.hk * 100) + "%";
    const chips = a.topics.filter(t => !skipOldTopic(t)).map(t => {
      const ab = topicAbility(a.part, t);
      const bc = abilityBand(ab.L);
      return `<button type="button" class="tchip${bc ? " " + bc : ""}" data-jump-topic="${esc(t)}">${esc(t)}</button>`;
    }).join("");
    return `<div class="axis-row${radarAxis === a.id ? " on" : ""}" data-axis="${a.id}"><b>${esc(a.name)}　${esc(currentProfile)} ${stuLab}　全港 ${hkLab}${sc.n ? " · " + sc.n + " 題" : ""}</b>${chips}</div>`;
  }).join("");
}
const PEP = {
  mix: [
    "幾何呢邊穩陣，指數嗰邊先補，唔使全面開火。",
    "高過全港嗰幾軸可以收貨；凹入去嗰條先係今日工。",
    "不是全面崩，係有幾題課題未補。摘錄已經排好。",
    "強項唔使再刷，弱項刷完條雷達會靚好多。"
  ],
  weak: [
    "而家睇得出洞喺邊，總好過盲目操。",
    "未過紅線唔等於唔得，係未重做。由最上兩題開始。",
    "標咗唔識已經係進度。下一步係拎返兩條出嚟做。",
    "一次清唔晒好正常，揀一軸打穿先。"
  ],
  strong: [
    "綠線內外都齊，剩低嗰軸先值得加時。",
    "穩定分已經有，唔好喺識嘅題度加鐘。",
    "呢個水平可以收，弱軸補完就係增益。"
  ],
  unrated: [
    "空圈唔好當弱，再標幾格，圖先有口齒。",
    "資料未夠，唔好嚇自己。卷一再點十題。",
    "雷達而家係草稿，標齊先好意思講強弱。"
  ],
  even: [
    "同全港差唔多，即係改凹位先有分差。",
    "平均唔等於穩，睇下邊條軸最短。"
  ],
  forming: [
    "圖開始有形。唔使完美，有方向就得。",
    "今日呢幾格已經夠做判斷。"
  ]
};
function pickPep(kind) {
  const list = PEP[kind] || PEP.even;
  prefs.pepTick = (prefs.pepTick || 0) + 1;
  savePrefs();
  return list[(prefs.pepTick - 1) % list.length];
}
function axisBuckets() {
  const scores = AXES.map(axisScore);
  const strong = [], weak = [], unrated = [];
  scores.forEach((sc, i) => {
    const name = AXES[i].name.replace("　", " ");
    if (sc.L == null) { unrated.push(name); return; }
    const vsHk = sc.hk != null ? sc.L - sc.hk : 0;
    const hi = sc.L >= 0.6 || vsHk > 0.03;
    const lo = sc.L <= 0.4 || vsHk < -0.03;
    const lab = Math.round(sc.L * 100) + "%" + (sc.hk != null ? "（全港 " + Math.round(sc.hk * 100) + "%）" : "");
    if (lo && !hi) weak.push(name + "　" + lab);
    else if (hi) strong.push(name + "　" + lab);
  });
  return { strong, weak, unrated, rated: 8 - unrated.length };
}
function pepKind(b) {
  if (b.unrated.length >= 5) return "unrated";
  if (b.strong.length && b.weak.length) return "mix";
  if (b.weak.length >= 3 && !b.strong.length) return "weak";
  if (b.strong.length >= 3 && !b.weak.length) return "strong";
  if (b.rated && b.rated <= 4) return "forming";
  return "even";
}
function openSumDlg() {
  if (markedPaperCount(weakPaperId()) === 0) {
    alert("去進度標記" + paperLabel(weakPaperId()) + "先出摘要。");
    return;
  }
  const b = axisBuckets();
  document.getElementById("sumDlgWho").textContent = currentProfile;
  document.getElementById("sumDlgPaper").textContent = paperLabel(weakPaperId());
  const fill = (id, arr, empty) => {
    document.getElementById(id).innerHTML = arr.length ? arr.map(x => `<li>${esc(x)}</li>`).join("") : `<li>${empty}</li>`;
  };
  fill("sumStrong", b.strong, "未有明顯強軸");
  fill("sumWeak", b.weak, "未有明顯弱軸");
  document.getElementById("sumPep").textContent = pickPep(pepKind(b));
  document.getElementById("sumDlg").showModal();
}
function renderWeak() {
  paintWeakChips();
  const wp = document.getElementById("weakPaper");
  if (wp && prefs.weakPaper && [...wp.options].some(o => o.value === prefs.weakPaper && !o.disabled)) wp.value = prefs.weakPaper;
  const hkBtn = document.getElementById("hkRefBtn");
  hkBtn.textContent = prefs.hkRef ? "全港參照　開" : "全港參照　關";
  hkBtn.classList.toggle("on-toggle", !!prefs.hkRef);
  const oldBtn = document.getElementById("oldSyllBtn");
  if (oldBtn) {
    oldBtn.textContent = prefs.includeOld ? "含舊課程　開" : "含舊課程　關";
    oldBtn.classList.toggle("on-toggle", !!prefs.includeOld);
  }
  renderRadar();
  const paper = weakPaperId();
  const items0 = weakItems();
  const box = document.getElementById("weakBox");
  if (markedPaperCount(paper) === 0) {
    box.innerHTML = `<p class="hint">去進度標記${paperLabel(paper)}先出圖同功課。</p>`;
    return;
  }
  let items = items0;
  if (radarAxis) {
    const ax = AXES.find(a => a.id === radarAxis);
    if (ax) items = items.filter(it => it.axisPart === ax.part && ax.topics.includes(it.topic));
  }
  const arrange = document.getElementById("weakArrange").value;
  if (!items.length) {
    box.innerHTML = `<p class="hint">未有符合色掣嘅能力記錄。</p>`;
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
  if (prefs.showCore !== false) prefs.showCore = true;
  document.getElementById("showCore").checked = prefs.showCore !== false;
  document.getElementById("showM1").checked = !!prefs.showM1;
  document.getElementById("showM2").checked = !!prefs.showM2;
  const showCore = prefs.showCore !== false, showM1 = prefs.showM1, showM2 = prefs.showM2;
  let head = `<tr><th>年份</th>`;
  if (showCore) head += `<th>卷一 /105</th><th>卷二 /45</th><th>綜合％</th><th>估計等級</th>`;
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
      <td class="clickable" data-go-year="${y}">${y}</td>`;
    if (showCore) {
      rows += `<td><input type="number" min="0" max="105" step="1" inputmode="numeric" data-gs="p1:${y}" value="${p1}"></td>
      <td><input type="number" min="0" max="45" step="1" inputmode="numeric" data-gs="p2:${y}" value="${p2}"></td>
      <td>${coreCell}</td>
      ${ready && pack && !pack.incomplete ? lvCellHtml(coreLv, pack.starts, cp, true) : `<td class="lv">${coreLv}</td>`}`;
    }
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

function stuCutPct(kind, y) {
  if (kind === "core") {
    const p1 = getScore("p1", y), p2 = getScore("p2", y);
    if (p1 === "" || p2 === "") return null;
    return corePct(y, p1, p2);
  }
  const sc = getScore(kind, y);
  return sc === "" ? null : Number(sc);
}
function cutPolyline(vals, xOf, yOf) {
  const segs = [];
  let cur = [];
  vals.forEach((v, i) => {
    if (v == null) {
      if (cur.length > 1) segs.push(cur);
      cur = [];
      return;
    }
    cur.push(xOf(i).toFixed(1) + "," + yOf(v).toFixed(1));
  });
  if (cur.length > 1) segs.push(cur);
  return segs;
}
function renderCutChart() {
  const kind = prefs.cutKind || "core";
  const kindSel = document.getElementById("cutChartKind");
  if (kindSel) kindSel.value = kind;
  const lvOn = Object.assign({ "5**": true, "5*": true, "5": true, "4": true, "3": true, "2": true }, prefs.cutLv || {});
  const chips = document.getElementById("cutLvChips");
  if (chips) {
    chips.innerHTML = CUT_COLS.map(lv =>
      `<button type="button" class="chip cut-chip${lvOn[lv] ? " on" : ""}" data-cut-lv="${lv}" style="--cut:${CUT_COLORS[lv]}">${lv}</button>`
    ).join("");
  }
  const stuBtn = document.getElementById("cutStuBtn");
  if (stuBtn) {
    stuBtn.textContent = prefs.cutStu !== false ? "你的成績　開" : "你的成績　關";
    stuBtn.classList.toggle("on-toggle", prefs.cutStu !== false);
  }
  const W = 640, H = 220, l = 36, t = 14, r = 10, b = 28;
  const xOf = i => l + i * (W - l - r) / (YEARS.length - 1);
  const yOf = pct => t + (1 - Math.max(0, Math.min(100, pct)) / 100) * (H - t - b);
  const grid = [0, 20, 40, 60, 80, 100].map(p => {
    const y = yOf(p);
    return `<line x1="${l}" y1="${y}" x2="${W - r}" y2="${y}" stroke="#efe8dc" /><text x="${l - 4}" y="${y + 3}" text-anchor="end" font-size="9" fill="#6b645b">${p}</text>`;
  }).join("");
  const xlabels = YEARS.map((y, i) => `<text x="${xOf(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="#6b645b">${String(y).slice(2)}</text>`).join("");
  let lines = "";
  CUT_COLS.forEach(lv => {
    if (!lvOn[lv]) return;
    const vals = YEARS.map(y => {
      const pack = window.CUTOFFS[kind] && CUTOFFS[kind][String(y)];
      const m = startMap(pack || {});
      return m[lv] == null ? null : m[lv];
    });
    cutPolyline(vals, xOf, yOf).forEach(seg => {
      lines += `<polyline fill="none" stroke="${CUT_COLORS[lv]}" stroke-width="1.8" points="${seg.join(" ")}" />`;
    });
  });
  if (prefs.cutStu !== false) {
    const vals = YEARS.map(y => stuCutPct(kind, y));
    cutPolyline(vals, xOf, yOf).forEach(seg => {
      lines += `<polyline fill="none" stroke="${CUT_COLORS.stu}" stroke-width="2.6" points="${seg.join(" ")}" />`;
    });
    YEARS.forEach((y, i) => {
      const v = stuCutPct(kind, y);
      if (v == null) return;
      lines += `<circle cx="${xOf(i).toFixed(1)}" cy="${yOf(v).toFixed(1)}" r="3" fill="${CUT_COLORS.stu}" />`;
    });
  }
  document.getElementById("cutChart").innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" class="cut-svg">${grid}${lines}${xlabels}</svg>`;
}

function startMap(pack) {
  const m = {};
  (pack.starts || []).forEach(([lv, v]) => { m[String(lv)] = v; });
  return m;
}
function cutDisplay(kind, pack, lv) {
  const m = startMap(pack || {});
  if (m[lv] == null) return "-";
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
  renderCutChart();
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
  const hideOld = prefs.mcIncludeOld === false;
  const sig = hideOld ? "hide" : "show";
  if (tSel.dataset.ready === sig && tSel.options.length > 1) return;
  const freq = sortTopicRows(window.P2_TOPICS.freq || []).filter(f => !(hideOld && OLD_TOPICS.has(f.topic)));
  const a = freq.filter(f => f.part === "甲");
  const b = freq.filter(f => f.part === "乙");
  const lab = f => esc(f.topic) + (OLD_TOPICS.has(f.topic) ? "（舊課程）" : "");
  const keep = tSel.value;
  tSel.innerHTML = `<option value="">全部課題</option>
    <optgroup label="甲">${a.map(f => `<option value="${esc(f.topic)}">${lab(f)}</option>`).join("")}</optgroup>
    <optgroup label="乙">${b.map(f => `<option value="${esc(f.topic)}">${lab(f)}</option>`).join("")}</optgroup>`;
  if ([...tSel.options].some(o => o.value === keep)) tSel.value = keep;
  tSel.dataset.ready = sig;
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
  const sk = series === "ce" ? "" : syllKind("p2", +year || year, rec.q);
  const tag = sk === "old" ? "舊課程" : sk === "part" ? "部分舊課程" : "";
  const pct = rec.pct == null ? "—" : rec.pct + "%";
  const part = series === "ce" ? "" : (rec.q <= 30 ? " · 甲" : " · 乙");
  const on = picked === rec.q ? " pick" : "";
  return `<div class="qcard ${b}${on}${sk ? " " + (sk === "old" ? "syll-old" : "syll-part") : ""}" data-q="${rec.q}" data-y="${year}"><small>${extra || ""}Q${rec.q}${part}${tag ? " · " + tag : ""}</small><b>${rec.ans || "?"}</b><small>${pct}</small>${t ? `<small>${esc(t)}</small>` : ""}</div>`;
}
function focusHtml(series, year, rec, hide) {
  if (!rec) return "";
  const t = series === "dse" ? (topicOf(+year, rec.q) || "未分類") : "";
  const sk = series === "dse" ? syllKind("p2", +year, rec.q) : "";
  const syllLab = sk === "old" ? "　·　舊課程" : sk === "part" ? "　·　部分舊課程" : "";
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
      <button type="button" class="ghost${hasNote(getCell("p2", +year, rec.q)) ? " filled-note" : ""}" data-mc-note>筆記</button>
    </div>` : "";
  return `<section class="focus-card sticky-focus" data-fy="${year}" data-fq="${rec.q}">
    <div class="meta">${series === "dse" ? "DSE 必修卷二" : "CE Maths"}　${year}　Q${rec.q}${part ? "　" + part : ""}${t ? "　·　課題：" + esc(t) : ""}${syllLab}</div>
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
  const hexByYear = {};
  HEX_QS.forEach(k => { const y = +k.split(":")[0]; hexByYear[y] = (hexByYear[y] || 0) + 1; });
  const head = `<thead><tr><th class="sticky-col">部分</th><th class="sticky-col" style="left:52px">課題</th>${years.map(y => `<th>${String(y).slice(2)}</th>`).join("")}<th>合計</th></tr></thead>`;
  const hideOld = prefs.mcIncludeOld === false;
  const rows = sortTopicRows((P2_TOPICS.freq || []).filter(r => !(hideOld && OLD_TOPICS.has(r.topic))).map(r => {
    if (r.topic !== "進制" || !hideOld) return r;
    const ys = (P2_TOPICS.years || []).map((y, i) => Math.max(0, (r.years[i] || 0) - (hexByYear[y] || 0)));
    return { part: r.part, topic: r.topic, years: ys, total: ys.reduce((a, b) => a + b, 0) };
  }));
  const body = `<tbody>` + rows.map(r =>
    `<tr><td class="sticky-col">${r.part}</td><td class="sticky-col" style="left:52px">${esc(r.topic)}</td>${yIdx.map(i => `<td>${r.years[i] || ""}</td>`).join("")}<td>${r.total}</td></tr>`
  ).join("") + `</tbody>`;
  document.getElementById("mcFreq").innerHTML = `<div style="overflow:auto"><table class="data-table">${head}${body}</table></div>`;
}
function renderMcKeep() {
  const y = window.scrollY;
  renderMc();
  window.scrollTo(0, y);
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
  const oldMc = document.getElementById("mcOldBtn");
  if (oldMc) {
    const on = prefs.mcIncludeOld !== false;
    oldMc.textContent = on ? "含舊課程　開" : "含舊課程　關";
    oldMc.classList.toggle("on-toggle", on);
    oldMc.hidden = isCE;
  }
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
  paintItemP1TopicBtn();
  document.getElementById("itemYearHead").textContent = paper === "p2"
    ? `單年課題命中率（${year}）（平均命中率）`
    : `單年分題（${year}）（卷序）`;
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
  const showT = paper === "p1" && !!prefs.itemP1Topics;
  let html = "";
  order.forEach(g => {
    const list = groups[g] || [];
    html += `<div class="year-block" id="item-sec-${g}"><div class="year-head"><b>${g}</b></div>
      <table class="data-table"><thead><tr><th>題</th><th>滿分</th><th>平均分</th>${showT ? "<th>課題</th>" : ""}</tr></thead><tbody>`;
    list.forEach(p => {
      const topic = showT ? p1TopicForSub(year, p.q) : "";
      html += `<tr class="${bandClass(p.pct)}"><td>${esc(normQLabel(p.q))}</td><td>${p.full}</td><td>${p.mean == null ? "-" : fmt1(p.mean)}</td>${showT ? `<td>${esc(topic)}</td>` : ""}</tr>`;
    });
    html += `</tbody></table></div>`;
  });
  document.getElementById("itemYearView").innerHTML = html;
  if (focusSec) {
    const el = document.getElementById("item-sec-" + focusSec);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
function paintItemP1TopicBtn() {
  const btn = document.getElementById("itemP1TopicBtn");
  if (!btn) return;
  const paper = document.getElementById("itemPaper").value;
  btn.hidden = paper !== "p1";
  const on = !!prefs.itemP1Topics;
  btn.textContent = on ? "顯示卷一課題　開" : "顯示卷一課題　關";
  btn.classList.toggle("on-toggle", on);
}
function renderItemTopics() {
  const paper = document.getElementById("itemPaper").value;
  const wrap = document.getElementById("itemTopicBox");
  const box = document.getElementById("itemTopics");
  const sum = document.getElementById("itemTopicSummary");
  if (!wrap || !box) return;
  paintItemP1TopicBtn();
  wrap.open = false;
  if (paper === "p1") {
    wrap.hidden = false;
    if (sum) sum.textContent = "卷一課題表現（所有合計）";
    const rows = sortTopicRows(window.P1_TOPICS && P1_TOPICS.freq || []).map(f => {
      const items = p1Items().filter(x => p1PartOfSec(x.sec) === f.part && x.topic === f.topic);
      let hk = 0, m = 0, n = 0;
      items.forEach(x => {
        if (x.hk == null || x.hk === "" || !x.marks) return;
        hk += x.hk; m += x.marks; n++;
      });
      if (!m) return null;
      return { part: f.part, topic: f.topic, avg: hk / m * 100, n, old: OLD_TOPICS.has(f.topic) };
    }).filter(Boolean).sort((a, b) => b.avg - a.avg || a.part.localeCompare(b.part));
    box.innerHTML = `<div style="overflow:auto"><table class="data-table"><thead><tr><th>部</th><th>課題</th><th>平均得分率</th><th>分部數</th></tr></thead><tbody>` +
      rows.map(r => `<tr class="${bandClass(r.avg)}"><td>${r.part}</td><td>${esc(r.topic)}${r.old ? "　<span class='sub'>舊課程</span>" : ""}</td><td>${Math.round(r.avg)}%</td><td>${r.n}</td></tr>`).join("") +
      `</tbody></table></div><p class="hint">按全港得分率（分數加權）由高至低。綠 ≥60%、黃 41–59%、紅 ≤40%。短表預設摺埋，可隨時打開（唔使開「顯示卷一課題」）。</p>`;
    return;
  }
  if (paper !== "p2") { wrap.hidden = true; box.innerHTML = ""; return; }
  wrap.hidden = false;
  if (sum) sum.textContent = "卷二課題表現（所有合計）";
  const rows = sortTopicRows(P2_TOPICS.freq || []).map(f => {
    const items = (P2_TOPICS.items || []).filter(x => x.part === f.part && x.topic === f.topic);
    const pcts = items.map(x => p2Hit(x.y, x.q)).filter(p => p != null);
    if (!pcts.length) return null;
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    return { part: f.part, topic: f.topic, avg, n: pcts.length, old: OLD_TOPICS.has(f.topic) };
  }).filter(Boolean).sort((a, b) => b.avg - a.avg || a.part.localeCompare(b.part));
  box.innerHTML = `<div style="overflow:auto"><table class="data-table"><thead><tr><th>部</th><th>課題</th><th>平均命中率</th><th>題數</th></tr></thead><tbody>` +
    rows.map(r => `<tr class="${bandClass(r.avg)}"><td>${r.part}</td><td>${esc(r.topic)}${r.old ? "　<span class='sub'>舊課程</span>" : ""}</td><td>${Math.round(r.avg)}%</td><td>${r.n}</td></tr>`).join("") +
    `</tbody></table></div><p class="hint">按全港命中率由高至低。綠 ≥60%、黃 41–59%、紅 ≤40%。</p>`;
}
function renderItems() {
  const ySel = document.getElementById("itemYear");
  if (!itemYearFilled) {
    ySel.innerHTML = YEARS.slice().reverse().map(y => `<option value="${y}">${y}</option>`).join("");
    ySel.value = "2025";
    itemYearFilled = true;
  }
  renderItemMulti();
  renderItemTopics();
  renderItemYear();
}

function sortWeakList(items, arrange) {
  const rows = items.slice();
  if (arrange === "year") return rows.sort((a, b) => b.y - a.y || a.q - b.q);
  return rows.sort((a, b) => a.s - b.s || b.y - a.y || a.q - b.q);
}
function visibleWeakItems() {
  let items = weakItems();
  if (radarAxis) {
    const ax = AXES.find(a => a.id === radarAxis);
    if (ax) items = items.filter(it => it.axisPart === ax.part && ax.topics.includes(it.topic));
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
  const lab = paperLabel(weakPaperId());
  if (!rows.length) return "（沒有符合嘅題）";
  if (arrange !== "topic") {
    return currentProfile + "　" + lab + "\n" + yearPartLines(rows).join("\n");
  }
  const counts = {};
  rows.forEach(r => { counts[r.topic] = (counts[r.topic] || 0) + 1; });
  const topics = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  const blocks = topics.map(t => {
    const list = rows.filter(r => r.topic === t);
    const full = list[0] && list[0].topics && list[0].topics !== t ? t + "（" + list[0].topics + "）" : t;
    return full + "（" + list.length + "）\n" + yearPartLines(list).join("\n");
  });
  return currentProfile + "　" + lab + "　按課題\n" + blocks.join("\n\n");
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
  const lab = paperLabel(weakPaperId());
  const body = rows.map(r => [currentProfile, lab, r.y, r.q, r.part, r.topics || r.topic, bandLabel(r.pct), r.pct == null ? "" : r.pct, r.tags.map(tagName).join("、"), r.note]
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
function jumpToTrackerCell(paper, y, q) {
  const id = paper === "p1" || paper === "p2" || paper === "m1" || paper === "m2" ? paper : "p1";
  currentPaper = id;
  y = +y;
  q = +q;
  if (topicFilter) {
    const keep = currentPaper;
    if (!matchTopic(y, q)) topicFilter = "";
    currentPaper = keep;
  }
  showView("tracker");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => flashTrackerCell(y, q));
  });
}
function flashTrackerCell(y, q) {
  const cell = document.querySelector(`#grid .cell[data-y="${y}"][data-q="${q}"]`);
  if (!cell) {
    scrollToYear(y);
    return;
  }
  cell.classList.remove("flash");
  void cell.offsetWidth;
  cell.classList.add("flash");
  cell.scrollIntoView({ behavior: "smooth", block: "center" });
  clearTimeout(flashTrackerCell._t);
  flashTrackerCell._t = setTimeout(() => cell.classList.remove("flash"), 2200);
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
function fillTimerYears() {
  const sel = document.getElementById("timerYear");
  if (!sel || sel.dataset.ready) return;
  sel.innerHTML = `<option value="">練習，唔記入</option>` + yearsDesc().map(y => `<option value="${y}">${y}</option>`).join("");
  sel.dataset.ready = "1";
}
function timerUsedSec() {
  const dur = timerDuration();
  return Math.max(0, Math.round(dur - timerRemain()));
}
function paintTimer() {
  fillTimerYears();
  const p = document.getElementById("timerPaper").value;
  const rem = timerRemain();
  const dur = timerDuration();
  const used = dur - rem;
  document.getElementById("timerClock").textContent = fmtTime(rem);
  document.getElementById("timerElapsed").textContent = "已用 " + fmtTime(used);
  const ySel = document.getElementById("timerYear");
  const yLab = ySel && ySel.value ? ySel.value + "　" : "練習　";
  document.getElementById("timerNow").textContent = `而家：${yLab}${TIMER[p].name}　${timerExtra ? "加時" : "不加時"}　${fmtTime(dur)}`;
  document.getElementById("timerExtra").textContent = timerExtra ? "加時" : "不加時";
  document.getElementById("timerExtra").disabled = timerLocked;
  document.getElementById("timerPaper").disabled = timerLocked;
  if (ySel) ySel.disabled = timerLocked;
  let msg = "";
  if (timerRun.start && rem <= 0) { msg = "時間到"; timerRun.ended = true; }
  else if (timerRun.start && rem <= 5 * 60) msg = "最後 5 分鐘";
  else if (timerRun.start && rem <= 15 * 60) msg = "最後 15 分鐘";
  document.getElementById("timerAlerts").textContent = msg;
  const saveBtn = document.getElementById("timerSave");
  if (saveBtn) {
    const can = (timerRun.paused || timerRun.ended) && ySel && ySel.value;
    saveBtn.hidden = !can;
  }
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
function openNote(y, q, paper) {
  noteTarget = { y, q, paper: paper || currentPaper };
  const c = getCell(noteTarget.paper, y, q);
  document.getElementById("noteTitle").textContent = PAPERS[noteTarget.paper].name + " " + y + " Q" + q;
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
document.getElementById("paper").onchange = e => { currentPaper = e.target.value; selected.clear(); topicFilter = ""; renderTracker(); };
document.getElementById("batchBtn").onclick = () => { batch = !batch; selected.clear(); renderTracker(); };
document.getElementById("hitBtn").onclick = () => { showHit = !showHit; renderTracker(); };
document.getElementById("undoBtn").onclick = doUndo;
document.getElementById("hkRefBtn").onclick = () => { prefs.hkRef = !prefs.hkRef; savePrefs(); renderWeak(); };
document.getElementById("sumBtn").onclick = openSumDlg;
document.getElementById("sumDlgClose").onclick = () => document.getElementById("sumDlg").close();
document.getElementById("oldSyllBtn").onclick = () => { prefs.includeOld = !prefs.includeOld; savePrefs(); renderWeak(); };
document.getElementById("cellFilter").onchange = e => { cellFilter = e.target.value; renderTracker(); };
document.getElementById("topicFilter").onchange = e => { topicFilter = e.target.value; renderTracker(); };
document.getElementById("stats").addEventListener("click", e => {
  const bar = e.target.closest("[data-tag]");
  if (!bar) return;
  const tag = bar.dataset.tag;
  cellFilter = cellFilter === "tag:" + tag ? "all" : "tag:" + tag;
  document.getElementById("cellFilter").value = "all";
  document.querySelectorAll("#grid .cell[data-y]").forEach(el => paintCellEl(el, +el.dataset.y, +el.dataset.q));
  renderStats();
});
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
document.getElementById("weakPaper").addEventListener("change", e => {
  prefs.weakPaper = e.target.value;
  savePrefs();
  radarAxis = "";
  const box = document.getElementById("weakBox");
  if (box) box.dataset.topic = "";
  renderWeak();
});
document.getElementById("weakStatChips").addEventListener("click", e => {
  const btn = e.target.closest("[data-stat]");
  if (!btn) return;
  const st = Object.assign({ 2: true, 1: true }, prefs.weakStats || {});
  const key = btn.dataset.stat;
  if (st[key]) {
    const others = ["2", "1"].filter(k => k !== key && st[k]);
    if (!others.length) return;
    st[key] = false;
  } else st[key] = true;
  prefs.weakStats = st;
  savePrefs();
  renderWeak();
});
document.getElementById("weakChips").addEventListener("click", e => {
  const btn = e.target.closest("[data-band]");
  if (!btn) return;
  const bands = Object.assign({ hi: true, mid: true, lo: true }, prefs.weakBands || {});
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
  if (chip) {
    if (weakPaperId() === "p1") {
      document.getElementById("weakBox").dataset.topic = chip.dataset.jumpTopic;
      renderWeak();
      return;
    }
    jumpMcTopic(chip.dataset.jumpTopic);
    return;
  }
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
    const paper = jump.dataset.jumpPaper || "p2";
    if (paper === "p1") jumpToTrackerCell("p1", y, q);
    else jumpMc(y, q);
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
      ? visQs(y, allQs(currentPaper, y))
      : visQs(y, range(+pick.dataset.from, +pick.dataset.to));
    const allOn = qs.length && qs.every(q => selected.has(y + ":" + q));
    if (allOn) qs.forEach(q => selected.delete(y + ":" + q));
    else qs.forEach(q => selected.add(y + ":" + q));
    renderTracker();
    return;
  }
  if (e.target.classList.contains("pencil")) {
    const [y, q] = e.target.dataset.note.split(":").map(Number);
    if (batch) {
      const key = y + ":" + q;
      if (selected.has(key)) selected.delete(key); else selected.add(key);
      const cell = e.target.closest(".qcell") && e.target.closest(".qcell").querySelector(".cell");
      if (cell) paintCellEl(cell, y, q);
      document.getElementById("selCount").textContent = "已選 " + selected.size + " 格";
      return;
    }
    openNote(y, q); return;
  }
  const todayBtn = e.target.closest("[data-date-today]");
  if (todayBtn) {
    const y = +todayBtn.dataset.dateToday;
    pushUndo();
    setDate(currentPaper, y, todayIso());
    const inp = document.querySelector(`[data-date="${y}"]`);
    if (inp) inp.value = getDate(currentPaper, y);
    return;
  }
  const cell = e.target.closest(".cell");
  if (!cell || cell.classList.contains("missing") || longFired) { longFired = false; return; }
  const y = +cell.dataset.y, q = +cell.dataset.q;
  const key = y + ":" + q;
  if (batch) {
    if (selected.has(key)) selected.delete(key); else selected.add(key);
    paintCellEl(cell, y, q);
    document.getElementById("selCount").textContent = "已選 " + selected.size + " 格";
    return;
  }
  pushUndo();
  const cur = getCell(currentPaper, y, q).s;
  const next = { 0: 3, 3: 2, 2: 1, 1: 0 }[cur] ?? 3;
  setCell(currentPaper, y, q, { s: next });
  paintCellEl(cell, y, q);
  paintYearStack(y);
  renderYearJump();
  renderStats();
  renderSummary();
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
  if (batch) {
    const y = +cell.dataset.y, q = +cell.dataset.q;
    const key = y + ":" + q;
    if (selected.has(key)) selected.delete(key); else selected.add(key);
    paintCellEl(cell, y, q);
    document.getElementById("selCount").textContent = "已選 " + selected.size + " 格";
    return;
  }
  openNote(+cell.dataset.y, +cell.dataset.q);
});
document.getElementById("grid").addEventListener("change", e => {
  if (e.target.dataset.score) {
    const y = +e.target.dataset.score;
    pushUndo();
    const v = setScore(currentPaper, y, e.target.value);
    e.target.value = v;
    renderYearJump();
    return;
  }
  if (e.target.dataset.date) {
    const y = +e.target.dataset.date;
    pushUndo();
    e.target.value = setDate(currentPaper, y, e.target.value);
  }
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
  setCell(noteTarget.paper || currentPaper, noteTarget.y, noteTarget.q, { note: document.getElementById("noteText").value.trim(), tags });
  document.getElementById("noteDlg").close();
  if (currentView === "mc") renderMcKeep();
  else if (currentView === "tracker") renderTracker();
  else renderTracker();
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
document.getElementById("showCore").onchange = e => {
  if (!e.target.checked && !prefs.showM1 && !prefs.showM2) { e.target.checked = true; return; }
  prefs.showCore = e.target.checked; savePrefs(); renderGrades();
};
document.getElementById("showM1").onchange = e => {
  if (!e.target.checked && prefs.showCore === false && !prefs.showM2) { e.target.checked = true; return; }
  prefs.showM1 = e.target.checked; savePrefs(); renderGrades();
};
document.getElementById("showM2").onchange = e => {
  if (!e.target.checked && prefs.showCore === false && !prefs.showM1) { e.target.checked = true; return; }
  prefs.showM2 = e.target.checked; savePrefs(); renderGrades();
};
document.getElementById("cutChartKind").onchange = e => {
  prefs.cutKind = e.target.value; savePrefs(); renderCutChart();
};
document.getElementById("cutStuBtn").onclick = () => {
  const lvOn = CUT_COLS.some(lv => (prefs.cutLv || {})[lv] !== false);
  if (prefs.cutStu !== false && !lvOn) return;
  prefs.cutStu = prefs.cutStu === false; savePrefs(); renderCutChart();
};
document.getElementById("cutLvChips").addEventListener("click", e => {
  const btn = e.target.closest("[data-cut-lv]");
  if (!btn) return;
  if (!prefs.cutLv) prefs.cutLv = { "5**": true, "5*": true, "5": true, "4": true, "3": true, "2": true };
  const lv = btn.dataset.cutLv;
  const turningOff = prefs.cutLv[lv] !== false;
  const others = CUT_COLS.some(x => x !== lv && prefs.cutLv[x] !== false);
  if (turningOff && !others && prefs.cutStu === false) return;
  prefs.cutLv[lv] = !turningOff;
  savePrefs();
  renderCutChart();
});

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
document.getElementById("mcOldBtn").onclick = () => {
  prefs.mcIncludeOld = prefs.mcIncludeOld === false;
  savePrefs();
  document.getElementById("mcTopic").dataset.ready = "";
  renderMc();
};
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
    renderMcKeep();
    return;
  }
  const noteBtn = e.target.closest("[data-mc-note]");
  if (noteBtn) {
    const card = e.target.closest(".focus-card");
    if (!card) return;
    openNote(+card.dataset.fy, +card.dataset.fq, "p2");
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
document.getElementById("itemP1TopicBtn").addEventListener("click", () => {
  prefs.itemP1Topics = !prefs.itemP1Topics;
  savePrefs();
  renderItemTopics();
  renderItemYear();
});
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
document.getElementById("timerYear").onchange = () => { if (!timerLocked) paintTimer(); };
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
document.getElementById("timerSave").onclick = () => {
  if (!(timerRun.paused || timerRun.ended)) return;
  const paper = document.getElementById("timerPaper").value;
  const y = +document.getElementById("timerYear").value;
  if (!y) return;
  const used = timerUsedSec();
  const short = { p1: "卷一", p2: "卷二", m1: "M1", m2: "M2" }[paper] || paper;
  if (!confirm("將 " + fmtHm(used) + " 記入 " + y + " " + short + "進度？")) return;
  pushUndo();
  setTimeSec(paper, y, used);
  if (currentView === "tracker" && currentPaper === paper) renderTracker();
};
document.getElementById("timerReset").onclick = () => {
  clearInterval(timerRun.tick);
  timerRun = { paper: document.getElementById("timerPaper").value, extra: timerExtra, start: 0, pause: 0, paused: false, ended: false, tick: null, warned15: false, warned5: false };
  timerLocked = false;
  paintTimer();
};
document.addEventListener("visibilitychange", () => { if (timerRun.start && !timerRun.paused) timerTick(); });

const XFER_PAPERS = ["p1", "p2", "m1", "m2"];
const XFER_PREFIX = "DSEMT:";
let xferStream = null;
let xferRaf = 0;
let xferPending = null;

function cellLayout() {
  if (cellLayout._c) return cellLayout._c;
  const slots = [];
  XFER_PAPERS.forEach(paper => {
    YEARS.forEach(y => {
      allQs(paper, y).forEach(q => slots.push([paper, y, q]));
    });
  });
  cellLayout._c = slots;
  return slots;
}
function tagMask(tags) {
  let m = 0;
  (tags || []).forEach(id => {
    const i = TAGS.findIndex(t => t[0] === id);
    if (i >= 0) m |= 1 << i;
  });
  return m & 255;
}
function tagsFromMask(m) {
  return TAGS.filter((_, i) => m & (1 << i)).map(t => t[0]);
}
function bytesToB64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64ToBytes(b64) {
  const s = atob(b64);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
function dateToDay(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return 0;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return Math.max(0, Math.round((t - Date.UTC(2012, 0, 1)) / 86400000));
}
function dayToDate(n) {
  const d = new Date(Date.UTC(2012, 0, 1) + (+n || 0) * 86400000);
  const p = x => String(x).padStart(2, "0");
  return d.getUTCFullYear() + "-" + p(d.getUTCMonth() + 1) + "-" + p(d.getUTCDate());
}
function encodeQrSnap(profile) {
  const name = String(profile.name || "學生").slice(0, 40);
  const nameB = new TextEncoder().encode(name);
  const slots = cellLayout();
  const stBytes = new Uint8Array(Math.ceil(slots.length * 2 / 8));
  const tagList = [];
  slots.forEach(([paper, y, q], i) => {
    const c = (profile.cells || {})[paper + ":" + y + ":" + q] || { s: 0, tags: [] };
    const s = (c.s || 0) & 3;
    const bit = i * 2;
    stBytes[bit >> 3] |= s << (6 - (bit & 7));
    const mask = tagMask(c.tags);
    if (mask) tagList.push({ paper: XFER_PAPERS.indexOf(paper), y: y - 2012, q, mask });
  });
  const scoreBytes = new Uint8Array(XFER_PAPERS.length * YEARS.length);
  let si = 0;
  XFER_PAPERS.forEach(paper => {
    YEARS.forEach(y => {
      const v = (profile.scores || {})[paper + ":" + y];
      scoreBytes[si++] = (v == null || v === "") ? 255 : Math.max(0, Math.min(254, +v));
    });
  });
  const metas = [];
  XFER_PAPERS.forEach((paper, pi) => {
    YEARS.forEach(y => {
      const k = paper + ":" + y;
      const sec = (profile.times || {})[k];
      const iso = (profile.dates || {})[k];
      let flags = 0, min = 0, day = 0;
      if (sec) { flags |= 1; min = Math.max(1, Math.min(65535, Math.round(+sec / 60))); }
      if (iso) { flags |= 2; day = dateToDay(iso); }
      if (flags) metas.push({ paper: pi, y: y - 2012, flags, min, day });
    });
  });
  const buf = new Uint8Array(5 + nameB.length + stBytes.length + scoreBytes.length + 2 + tagList.length * 4 + 2 + metas.length * 7);
  buf[0] = 68; buf[1] = 77; buf[2] = 84; buf[3] = 49;
  buf[4] = nameB.length;
  buf.set(nameB, 5);
  let o = 5 + nameB.length;
  buf.set(stBytes, o); o += stBytes.length;
  buf.set(scoreBytes, o); o += scoreBytes.length;
  buf[o] = tagList.length & 255;
  buf[o + 1] = (tagList.length >> 8) & 255;
  o += 2;
  tagList.forEach(t => {
    buf[o++] = t.paper; buf[o++] = t.y; buf[o++] = t.q; buf[o++] = t.mask;
  });
  buf[o] = metas.length & 255;
  buf[o + 1] = (metas.length >> 8) & 255;
  o += 2;
  metas.forEach(t => {
    buf[o++] = t.paper; buf[o++] = t.y; buf[o++] = t.flags;
    buf[o++] = t.min & 255; buf[o++] = (t.min >> 8) & 255;
    buf[o++] = t.day & 255; buf[o++] = (t.day >> 8) & 255;
  });
  return buf;
}
async function deflateBytes(bytes) {
  if (typeof CompressionStream !== "function") return null;
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function inflateBytes(bytes) {
  if (typeof DecompressionStream !== "function") throw new Error("瀏覽器唔支援解壓");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function encodeQrText(profile) {
  const buf = encodeQrSnap(profile);
  try {
    const z = await deflateBytes(buf);
    if (z && z.length < buf.length) return "DSEMTZ:" + bytesToB64(z);
  } catch {}
  return XFER_PREFIX + bytesToB64(buf);
}
function decodeQrBuf(buf) {
  if (buf.length < 8 || buf[0] !== 68 || buf[1] !== 77 || buf[2] !== 84 || buf[3] !== 49) throw new Error("進度碼版本唔啱");
  const nameLen = buf[4];
  let o = 5;
  const name = new TextDecoder().decode(buf.slice(o, o + nameLen)) || "學生";
  o += nameLen;
  const slots = cellLayout();
  const stLen = Math.ceil(slots.length * 2 / 8);
  const stBytes = buf.slice(o, o + stLen);
  o += stLen;
  const status = slots.map((_, idx) => {
    const bit = idx * 2;
    return (stBytes[bit >> 3] >> (6 - (bit & 7))) & 3;
  });
  const scoreN = XFER_PAPERS.length * YEARS.length;
  const scoreBytes = buf.slice(o, o + scoreN);
  o += scoreN;
  const scores = [];
  let si = 0;
  XFER_PAPERS.forEach(paper => {
    YEARS.forEach(y => {
      const v = scoreBytes[si++];
      scores.push({ paper, y, v: v === 255 || v == null ? "" : v });
    });
  });
  const tagN = buf[o] | (buf[o + 1] << 8);
  o += 2;
  const tags = {};
  for (let t = 0; t < tagN; t++) {
    const paper = XFER_PAPERS[buf[o]] || "p1";
    const y = 2012 + buf[o + 1];
    const q = buf[o + 2];
    tags[paper + ":" + y + ":" + q] = tagsFromMask(buf[o + 3]);
    o += 4;
  }
  const times = {}, dates = {};
  if (o + 2 <= buf.length) {
    const metaN = buf[o] | (buf[o + 1] << 8);
    o += 2;
    for (let t = 0; t < metaN && o + 7 <= buf.length; t++) {
      const paper = XFER_PAPERS[buf[o]] || "p1";
      const y = 2012 + buf[o + 1];
      const flags = buf[o + 2];
      const min = buf[o + 3] | (buf[o + 4] << 8);
      const day = buf[o + 5] | (buf[o + 6] << 8);
      const k = paper + ":" + y;
      if (flags & 1) times[k] = min * 60;
      if (flags & 2) dates[k] = dayToDate(day);
      o += 7;
    }
  }
  return { name, status, scores, tags, times, dates };
}
async function decodeQrText(text) {
  const raw = String(text || "").trim();
  const zAt = raw.indexOf("DSEMTZ:");
  if (zAt >= 0) return decodeQrBuf(await inflateBytes(b64ToBytes(raw.slice(zAt + 7))));
  const at = raw.indexOf(XFER_PREFIX);
  if (at < 0) throw new Error("唔係操卷進度碼");
  return decodeQrBuf(b64ToBytes(raw.slice(at + XFER_PREFIX.length)));
}
function uniqueProfileName(base) {
  const root = (base || "學生").trim() || "學生";
  if (!db.profiles[root]) return root;
  let n = 2;
  while (db.profiles[root + " " + n]) n++;
  return root + " " + n;
}
function applyQrSnap(targetName, snap, mode) {
  if (!db.profiles[targetName]) db.profiles[targetName] = blankProfile(targetName);
  const p = db.profiles[targetName];
  const slots = cellLayout();
  if (mode === "replace") {
    const notes = {};
    Object.entries(p.cells || {}).forEach(([k, c]) => { if (c && c.note) notes[k] = c.note; });
    const cells = {};
    slots.forEach(([paper, y, q], i) => {
      const k = paper + ":" + y + ":" + q;
      const s = snap.status[i] || 0;
      const tags = snap.tags[k] || [];
      if (!s && !notes[k] && !tags.length) return;
      cells[k] = { s, note: notes[k] || "", tags };
    });
    Object.keys(notes).forEach(k => {
      if (!cells[k]) cells[k] = { s: 0, note: notes[k], tags: [] };
    });
    p.cells = cells;
    p.scores = {};
    snap.scores.forEach(({ paper, y, v }) => {
      if (v !== "" && v != null) p.scores[paper + ":" + y] = v;
    });
    p.times = Object.assign({}, snap.times || {});
    p.dates = Object.assign({}, snap.dates || {});
  } else {
    slots.forEach(([paper, y, q], i) => {
      const k = paper + ":" + y + ":" + q;
      const s = snap.status[i] || 0;
      const inTags = snap.tags[k] || [];
      if (!s && !inTags.length) return;
      const cur = p.cells[k] || { s: 0, note: "", tags: [] };
      const tags = [...new Set([...(cur.tags || []), ...inTags])].slice(0, 3);
      p.cells[k] = { s: s || cur.s || 0, note: cur.note || "", tags };
    });
    snap.scores.forEach(({ paper, y, v }) => {
      if (v === "" || v == null) return;
      p.scores[paper + ":" + y] = v;
    });
    p.times = p.times || {};
    p.dates = p.dates || {};
    Object.entries(snap.times || {}).forEach(([k, v]) => { if (v) p.times[k] = v; });
    Object.entries(snap.dates || {}).forEach(([k, v]) => { if (v) p.dates[k] = v; });
  }
  p.updatedAt = Date.now();
}
function refreshAfterProfile() {
  save();
  renderProfiles();
  if (currentView === "tracker") renderTracker();
  else if (currentView === "weak") renderWeak();
  else if (currentView === "mc") renderMc();
  else if (currentView === "grades") renderGrades();
  else if (currentView === "timer") renderTimer();
  else renderTracker();
}
function xferHidePanels() {
  ["xferShow", "xferScan", "xferMerge"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  });
}
function stopXferScan() {
  if (xferRaf) cancelAnimationFrame(xferRaf);
  xferRaf = 0;
  if (xferStream) {
    xferStream.getTracks().forEach(t => t.stop());
    xferStream = null;
  }
  const v = document.getElementById("xferVideo");
  if (v) v.srcObject = null;
}
function closeXferDlg() {
  stopXferScan();
  xferPending = null;
  const dlg = document.getElementById("xferDlg");
  if (dlg && dlg.open) dlg.close();
}
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawQrWithLogo(canvas, text) {
  if (typeof qrcode !== "function") throw new Error("QR 元件未載入");
  const qr = qrcode(0, "H");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 4;
  const mod = Math.max(5, Math.ceil(320 / (n + quiet * 2)));
  const size = (n + quiet * 2) * mod;
  const ctx = canvas.getContext("2d");
  canvas.width = size;
  canvas.height = size;
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#1c1915";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) ctx.fillRect((quiet + c) * mod, (quiet + r) * mod, mod, mod);
    }
  }
  const ls = n * mod * 0.14;
  const lx = (size - ls) / 2, ly = (size - ls) / 2;
  ctx.fillStyle = "#fff";
  roundRectPath(ctx, lx - mod, ly - mod, ls + mod * 2, ls + mod * 2, mod);
  ctx.fill();
  ctx.fillStyle = "#2f5d50";
  roundRectPath(ctx, lx, ly, ls, ls, Math.max(4, mod));
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 " + Math.max(9, Math.floor(ls * 0.16)) + "px 'Noto Sans TC', sans-serif";
  ctx.fillText("DSE", size / 2, size / 2 - ls * 0.22);
  ctx.font = "700 " + Math.max(14, Math.floor(ls * 0.28)) + "px 'Noto Sans TC', sans-serif";
  ctx.fillText("操卷", size / 2, size / 2 + ls * 0.04);
  ctx.font = "500 " + Math.max(8, Math.floor(ls * 0.14)) + "px 'Noto Sans TC', sans-serif";
  ctx.fillText("神器", size / 2, size / 2 + ls * 0.28);
}
async function openXferShow() {
  const dlg = document.getElementById("xferDlg");
  xferHidePanels();
  document.getElementById("xferShow").hidden = false;
  document.getElementById("xferShowMeta").textContent = "學生：" + currentProfile + "　狀態／分數／錯因／用時／操卷日";
  try {
    const text = await encodeQrText(prof());
    drawQrWithLogo(document.getElementById("xferQr"), text);
  } catch (err) {
    alert("出示失敗：" + err.message + "。改用匯出 JSON。");
    return;
  }
  dlg.showModal();
}
function openXferMerge(snap) {
  stopXferScan();
  xferPending = snap;
  xferHidePanels();
  document.getElementById("xferMerge").hidden = false;
  document.getElementById("xferMergeName").textContent = snap.name;
  const exists = !!db.profiles[snap.name];
  document.getElementById("xferMergeExist").textContent = exists
    ? "呢部機已有同名學生。"
    : "呢部機未有呢個學生，可直接加入。";
  document.getElementById("xferMergeBtn").textContent = exists ? "合併（建議）" : "加入「" + snap.name + "」";
  document.getElementById("xferReplaceBtn").hidden = !exists;
  document.getElementById("xferNewBtn").hidden = !exists;
  const dlg = document.getElementById("xferDlg");
  if (!dlg.open) dlg.showModal();
}
async function acceptQrText(text) {
  try {
    const snap = await decodeQrText(text);
    openXferMerge(snap);
    return true;
  } catch {
    return false;
  }
}
function xferScanTick() {
  const v = document.getElementById("xferVideo");
  const c = document.getElementById("xferScanCanvas");
  if (!v || !c || v.readyState < 2) {
    xferRaf = requestAnimationFrame(xferScanTick);
    return;
  }
  const w = v.videoWidth, h = v.videoHeight;
  if (!w) { xferRaf = requestAnimationFrame(xferScanTick); return; }
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(v, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  let text = "";
  if (typeof jsQR === "function") {
    const code = jsQR(img.data, w, h);
    if (code && code.data) text = code.data;
  }
  if (text) {
    acceptQrText(text).then(ok => { if (!ok) xferRaf = requestAnimationFrame(xferScanTick); });
    return;
  }
  xferRaf = requestAnimationFrame(xferScanTick);
}
async function openXferScan() {
  const dlg = document.getElementById("xferDlg");
  xferHidePanels();
  document.getElementById("xferScan").hidden = false;
  document.getElementById("xferScanHint").textContent = "對準另一部裝置嘅 QR。離線檔案或未授權鏡頭可用相簿。";
  dlg.showModal();
  stopXferScan();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    document.getElementById("xferScanHint").textContent = "呢個瀏覽器開唔到鏡頭，請用相簿圖片。";
    return;
  }
  try {
    xferStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    const v = document.getElementById("xferVideo");
    v.srcObject = xferStream;
    await v.play().catch(() => {});
    xferRaf = requestAnimationFrame(xferScanTick);
  } catch {
    document.getElementById("xferScanHint").textContent = "未授權鏡頭或離線頁開唔到相機，請用相簿圖片。";
  }
}
function readQrFromImageFile(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    const c = document.getElementById("xferScanCanvas");
    const ctx = c.getContext("2d");
    c.width = img.width; c.height = img.height;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height);
    const code = typeof jsQR === "function" ? jsQR(data.data, c.width, c.height) : null;
    if (!code) { alert("認唔到進度碼，試下近啲、光啲。"); return; }
    acceptQrText(code.data).then(ok => { if (!ok) alert("認唔到進度碼，試下近啲、光啲。"); });
  };
  img.onerror = () => { URL.revokeObjectURL(url); alert("圖片讀唔到"); };
  img.src = url;
}
function exportCurrentJson() {
  const p = prof();
  const out = { currentProfile, profiles: { [currentProfile]: p } };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "dse-math-tracker-" + currentProfile + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importJsonFiles() {
  const inp = document.getElementById("importFile");
  inp.value = "";
  inp.click();
}

document.getElementById("xferMenu").onchange = e => {
  const v = e.target.value;
  e.target.value = "";
  if (v === "scan") openXferScan();
  else if (v === "show") openXferShow();
  else if (v === "export") exportCurrentJson();
  else if (v === "import") importJsonFiles();
};
document.getElementById("xferShowClose").onclick = closeXferDlg;
document.getElementById("xferScanClose").onclick = closeXferDlg;
document.getElementById("xferMergeCancel").onclick = closeXferDlg;
document.getElementById("xferDlg").addEventListener("close", stopXferScan);
document.getElementById("xferPickImg").onclick = () => document.getElementById("xferImgFile").click();
document.getElementById("xferImgFile").onchange = e => {
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (f) readQrFromImageFile(f);
};
document.getElementById("xferMergeBtn").onclick = () => {
  if (!xferPending) return;
  const name = xferPending.name;
  applyQrSnap(name, xferPending, "merge");
  currentProfile = name;
  closeXferDlg();
  refreshAfterProfile();
};
document.getElementById("xferReplaceBtn").onclick = () => {
  if (!xferPending) return;
  applyQrSnap(xferPending.name, xferPending, "replace");
  currentProfile = xferPending.name;
  closeXferDlg();
  refreshAfterProfile();
};
document.getElementById("xferNewBtn").onclick = () => {
  if (!xferPending) return;
  const name = uniqueProfileName(xferPending.name);
  applyQrSnap(name, xferPending, "replace");
  currentProfile = name;
  closeXferDlg();
  refreshAfterProfile();
};

document.getElementById("importFile").onchange = e => {
  const files = [...(e.target.files || [])];
  e.target.value = "";
  if (!files.length) return;
  const mergeOne = (incoming, fileName) => {
    const src = incoming.profiles && typeof incoming.profiles === "object"
      ? incoming.profiles
      : (incoming.cells ? { [incoming.name || incoming.currentProfile || String(fileName).replace(/\.json$/i, "")]: incoming } : null);
    if (!src || !Object.keys(src).length) throw new Error(fileName + " 格式唔啱（要有 profiles）");
    for (const [name, p] of Object.entries(src)) {
      if (!p || typeof p !== "object") continue;
      db.profiles[name] = {
        name,
        cells: p.cells && typeof p.cells === "object" ? p.cells : {},
        scores: p.scores && typeof p.scores === "object" ? p.scores : {},
        dates: p.dates && typeof p.dates === "object" ? p.dates : {},
        times: p.times && typeof p.times === "object" ? p.times : {},
        updatedAt: p.updatedAt || Date.now()
      };
    }
    return incoming.currentProfile && db.profiles[incoming.currentProfile] ? incoming.currentProfile : Object.keys(src)[0];
  };
  Promise.all(files.map(f => f.text().then(t => ({ name: f.name, text: String(t || "").replace(/^\uFEFF/, "") }))))
    .then(list => {
      let last = currentProfile;
      list.forEach(({ name, text }) => { last = mergeOne(JSON.parse(text), name) || last; });
      currentProfile = db.profiles[last] ? last : currentProfile;
      refreshAfterProfile();
    })
    .catch(err => alert("匯入失敗：" + err.message));
};

document.getElementById("timerSound").checked = !!prefs.timerSound;
if (!prefs.bands3) {
  prefs.weakBands = { hi: true, mid: true, lo: true };
  prefs.bands3 = true;
  savePrefs();
}
if (!prefs.weakBands) prefs.weakBands = { hi: true, mid: true, lo: true };
if (!prefs.weakStats) prefs.weakStats = { 2: true, 1: true };
if (prefs.itemP1Topics == null) prefs.itemP1Topics = false;
if (!prefs.weakPaper) prefs.weakPaper = "p1";
{
  const wp = document.getElementById("weakPaper");
  if (wp && [...wp.options].some(o => o.value === prefs.weakPaper && !o.disabled)) wp.value = prefs.weakPaper;
}
const toTop = document.getElementById("toTop");
const paintToTop = () => { toTop.hidden = window.scrollY < 200; };
window.addEventListener("scroll", paintToTop, { passive: true });
toTop.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
paintToTop();
const hash = location.hash.replace("#", "");
if (["tracker", "weak", "grades", "mc", "items", "cutoffs", "timer"].includes(hash)) showView(hash);
else showView("tracker");
