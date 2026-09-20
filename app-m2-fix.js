function mingItems() {
  const paper = weakPaperId();
  const out = [];
  YEARS.forEach(function (y) {
    allQs(paper, y).forEach(function (q) {
      const c = getCell(paper, y, q);
      if (!isMing(c)) return;
      var topic = "未分類", topics = "", part = "", pct = null;
      if (paper === "m2") {
        topic = m2MainTopic(y, q) || "未分類";
        topics = m2TopicLine(y, q);
        const subs = m2Subs(y, q);
        part = (subs[0] && subs[0].sec) || (q <= 8 ? "甲" : "乙");
        pct = m2HitPct(y, q);
      } else if (paper === "p1") {
        topic = p1MainTopic(y, q) || "未分類";
        topics = p1TopicLine(y, q);
        const subs = p1Subs(y, q);
        part = (subs[0] && subs[0].sec) || "";
        pct = p1HitPct(y, q);
      } else {
        topic = topicOf(y, q) || "未分類";
        topics = topic;
        part = q <= 30 ? "甲" : "乙";
        pct = p2Hit(y, q);
      }
      out.push({ paper: paper, y: y, q: q, s: c.s, topic: topic, topics: topics, tags: c.tags || [], note: c.note || "", part: part, axisPart: paper === "m2" ? "M2" : (paper === "p1" ? p1PartOfSec(part) : part), pct: pct, w: true });
    });
  });
  out.sort(function (a, b) { return b.y - a.y || a.q - b.q; });
  return out;
}
function excerptItems() { return prefs.weakMing ? mingItems() : weakItems(); }

const _applyStatus = window.applyStatus;
window.applyStatus = function (paper, year, q, next, how) {
  const cur = getCell(paper, year, q);
  if (typeof _applyStatus === "function") _applyStatus(paper, year, q, next, how);
  const now = getCell(paper, year, q);
  if (now.s === 3 && (cur.s === 1 || cur.s === 2 || cur.w) && !now.w) {
    setCell(paper, year, q, { w: 1 });
  }
  if (now.s === 0 && how !== "cycle") {
    setCell(paper, year, q, { w: 0 });
  }
};

function paintCellEl(cell, y, q) {
  const c = getCell(currentPaper, y, q);
  const sk = syllKind(currentPaper, y, q);
  cell.classList.remove("s1", "s2", "s3", "sel", "syll-old", "syll-part", "ming");
  if (STATE_CLASS[c.s]) cell.classList.add(STATE_CLASS[c.s]);
  if (selected.has(y + ":" + q)) cell.classList.add("sel");
  if (sk === "old") cell.classList.add("syll-old");
  if (sk === "part") cell.classList.add("syll-part");
  if (isMing(c)) cell.classList.add("ming");
  const qcell = cell.closest(".qcell");
  if (qcell) qcell.classList.toggle("dim", !matchFilter(c));
  cell.querySelectorAll(".ming-badge").forEach(function (el) { el.remove(); });
}

const _rs = window.renderStats;
window.renderStats = function () {
  if (typeof _rs === "function") _rs();
  try {
    var ming = 0;
    YEARS.forEach(function (y) {
      allQs(currentPaper, y).forEach(function (q) {
        if (isMing(getCell(currentPaper, y, q))) ming++;
      });
    });
    var mix = document.querySelector("#stats .mix-stat span");
    if (mix && ming && mix.textContent.indexOf("明返") < 0) mix.textContent += " · 明返 " + ming;
  } catch (e) {}
};

try {
  if (typeof currentView !== "undefined" && currentView === "ability" && typeof renderWeak === "function") renderWeak();
  if (typeof currentView !== "undefined" && currentView === "tracker" && typeof renderTracker === "function") renderTracker();
  if (typeof currentView !== "undefined" && currentView === "class" && typeof renderClassPage === "function") renderClassPage();
} catch (e) {}
