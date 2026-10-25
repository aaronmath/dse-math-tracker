function renderWeak() {
  paintWeakChips();
  const wp = document.getElementById("weakPaper");
  if (wp && prefs.weakPaper && [...wp.options].some(o => o.value === prefs.weakPaper && !o.disabled)) wp.value = prefs.weakPaper;
  const hkBtn = document.getElementById("hkRefBtn");
  if (hkBtn) {
    hkBtn.textContent = prefs.hkRef ? "全港參照　開" : "全港參照　關";
    hkBtn.classList.toggle("on-toggle", !!prefs.hkRef);
  }
  if (typeof paintMetricButtons === "function") paintMetricButtons();
  const oldBtn = document.getElementById("oldSyllBtn");
  if (oldBtn) {
    oldBtn.textContent = prefs.includeOld ? "含舊課程　開" : "含舊課程　關";
    oldBtn.classList.toggle("on-toggle", !!prefs.includeOld);
  }
  const legendSum = document.querySelector("#view-ability .axis-legend summary");
  if (legendSum) {
    const n = axesFor(weakPaperId()).length;
    legendSum.textContent = n + " 軸課題對照";
  }
  renderRadar();
  const paper = weakPaperId();
  const items0 = excerptItems();
  const box = document.getElementById("weakBox");
  if (markedPaperCount(paper) === 0) {
    box.innerHTML = "<p class=\"hint\">去進度標記" + paperLabel(paper) + "先出圖同功課。</p>";
    return;
  }
  let items = items0;
  if (radarAxis) {
    const ax = axesFor(weakPaperId()).find(a => a.id === radarAxis);
    if (ax) items = items.filter(it => it.axisPart === ax.part && ax.topics.includes(it.topic));
  }
  const arrange = document.getElementById("weakArrange").value;
  const emptyHint = prefs.weakMing ? "未有明返題。" : "未有符合色插嘅能力記錄。";
  if (!items.length && !(box.dataset.topic || "")) {
    box.innerHTML = "<p class=\"hint\">" + emptyHint + "</p>";
    return;
  }
  items = sortWeakList(items, arrange);
  const head = "<thead><tr><th>年</th><th>題</th><th>部</th><th>課題</th><th>命中率</th><th></th><th>錯因</th></tr></thead>";
  const MIX_CAP = 120;
  const showAll = box.dataset.all === "1";
  const tableBlock = list => "<div style=\"overflow:auto\"><table class=\"data-table\">" + head + "<tbody>" + list.map(itemRowHtml).join("") + "</tbody></table></div>";
  const capNote = (shown, total) => {
    if (total <= shown) return "<p class=\"hint\">列出 " + shown + " 題</p>";
    return "<p class=\"hint\">列出 " + shown + "／" + total + " 題　<button type=\"button\" class=\"ghost\" id=\"weakMore\">顯示其餘 " + (total - shown) + " 題</button></p>";
  };
  const nextHtml = topic => topicNextHtml(paper, topic, head);
  if (arrange === "year") {
    const years = [...new Set(items.map(x => x.y))].sort((a, b) => b - a);
    const total = items.length;
    const vis = showAll || total <= MIX_CAP ? items : items.slice(0, MIX_CAP);
    let html = capNote(vis.length, total);
    years.forEach(y => {
      const list = vis.filter(x => x.y === y);
      if (!list.length) return;
      html += "<h3 class=\"sec-title\">" + y + "（" + list.length + "）</h3>" + tableBlock(list);
    });
    const focus = box.dataset.topic || "";
    if (focus) html += nextHtml(focus);
    box.innerHTML = html || "<p class=\"hint\">" + emptyHint + "</p>";
    return;
  }
  const counts = {};
  items.forEach(it => { counts[it.topic] = (counts[it.topic] || 0) + 1; });
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, 8);
  const rest = ranked.slice(8).reduce((n, x) => n + x[1], 0);
  const max = top[0] ? top[0][1] : 1;
  const bars = top.map(([t, n]) =>
    "<div class=\"bar-row\" data-weak-topic=\"" + esc(t) + "\"><span>" + esc(topicLabel(t)) + "</span><div class=\"bar-track\"><i style=\"width:" + Math.round(n * 100 / max) + "%\"></i></div><b>" + n + "</b></div>"
  ).join("") + (rest ? "<div class=\"sub\">其他課題 " + rest + " 題</div>" : "");
  const focus = box.dataset.topic || "";
  const pool = focus ? items.filter(x => x.topic === focus) : items;
  const vis = (focus || showAll || pool.length <= MIX_CAP) ? pool : pool.slice(0, MIX_CAP);
  const mingLab = prefs.weakMing ? "明返　" : "";
  box.innerHTML = bars + (focus ? "<p class=\"hint\">而家睇：" + mingLab + esc(topicLabel(focus)) + "　<button class=\"ghost\" id=\"weakClear\">顯示全部</button></p>" : (prefs.weakMing ? "<p class=\"hint\">而家睇明返。撘課題條出未做建議。</p>" : "<p class=\"hint\">撘課題條先出未做建議（淺→深）。</p>")) +
    capNote(vis.length, pool.length) +
    tableBlock(vis) +
    (focus ? nextHtml(focus) : "");
}

function topicNextUnseen(paper, topic, limit) {
  const today = todayIso();
  const out = [];
  if (paper === "p1") {
    for (const y of YEARS) {
      if (getDate("p1", y) === today) continue;
      for (const q of allQs("p1", y)) {
        if (p1MainTopic(y, q) !== topic) continue;
        if (skipOldQ(y, q, topic)) continue;
        if (getCell("p1", y, q).s) continue;
        const subs = p1Subs(y, q);
        const sec = (subs[0] && subs[0].sec) || (q <= 9 ? "甲一" : q <= 14 ? "甲二" : "乙");
        out.push({ paper: "p1", y: y, q: q, topic: topic, part: sec, pct: p1HitPct(y, q) });
      }
    }
  } else if (paper === "m2") {
    const want = M2_FILTER_ALIAS[topic] || [topic];
    const seen = new Set();
    for (const x of m2Items()) {
      if (!want.includes(x.topic)) continue;
      const k = x.y + ":" + x.q;
      if (seen.has(k)) continue;
      seen.add(k);
      if (getDate("m2", x.y) === today) continue;
      if (getCell("m2", x.y, x.q).s) continue;
      out.push({ paper: "m2", y: x.y, q: x.q, topic: m2MainTopic(x.y, x.q) || x.topic, part: x.sec || "", pct: m2HitPct(x.y, x.q) });
    }
  } else {
    for (const it of (P2_TOPICS.items || [])) {
      if (it.topic !== topic) continue;
      if (isHexQ(it.y, it.q) || skipOldQ(it.y, it.q, it.topic)) continue;
      if (getDate("p2", it.y) === today) continue;
      if (getCell("p2", it.y, it.q).s) continue;
      out.push({ paper: "p2", y: it.y, q: it.q, topic: topic, part: it.part || (it.q <= 30 ? "甲" : "乙"), pct: p2Hit(it.y, it.q) });
    }
  }
  out.sort((a, b) => {
    const ap = a.pct == null ? -1 : a.pct, bp = b.pct == null ? -1 : b.pct;
    if (ap !== bp) return bp - ap;
    return b.y - a.y || a.q - b.q;
  });
  return out.slice(0, limit || 5);
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
      return { part: f.part, topic: f.topic, avg: hk / m * 100, n: n, old: OLD_TOPICS.has(f.topic) };
    }).filter(Boolean).sort((a, b) => b.avg - a.avg || a.part.localeCompare(b.part));
    box.innerHTML = "<div style=\"overflow:auto\"><table class=\"data-table\"><thead><tr><th>部</th><th>課題</th><th>平均得分率</th><th>分部數</th></tr></thead><tbody>" +
      rows.map(r => "<tr class=\"" + bandClass(r.avg) + "\"><td>" + r.part + "</td><td>" + esc(topicLabel(r.topic)) + (r.old ? "　<span class='sub'>舊課程</span>" : "") + "</td><td>" + Math.round(r.avg) + "%</td><td>" + r.n + "</td></tr>").join("") +
      "</tbody></table></div><p class=\"hint\">按全港得分率（分數加權）由高至低。綠 ≥60%、黃 41–59%、紅 ≤40%。短表預設摺埋，可隨時打開（唔使開「顯示卷一課題」）。</p>";
    return;
  }
  if (paper === "m2") {
    wrap.hidden = false;
    if (sum) sum.textContent = "M2 課題表現（所有合計）";
    const rows = ((window.M2_TOPICS && M2_TOPICS.freq) || []).map(f => {
      const items = m2Items().filter(x => x.topic === f.topic);
      let hk = 0, m = 0, n = 0;
      items.forEach(x => {
        if (x.hk == null || x.hk === "" || !x.marks) return;
        hk += Number(x.hk); m += x.marks; n++;
      });
      if (!m) return null;
      const ax = M2_AXES.find(a => a.topics.includes(f.topic));
      return { part: ax ? axisLabel(ax.name) : "", topic: f.topic, avg: hk / m * 100, n: n };
    }).filter(Boolean).sort((a, b) => b.avg - a.avg || a.topic.localeCompare(b.topic));
    box.innerHTML = "<div style=\"overflow:auto\"><table class=\"data-table\"><thead><tr><th>軸</th><th>課題</th><th>平均得分率</th><th>分部數</th></tr></thead><tbody>" +
      rows.map(r => "<tr class=\"" + bandClass(r.avg) + "\"><td>" + esc(r.part) + "</td><td>" + esc(topicLabel(r.topic)) + "</td><td>" + Math.round(r.avg) + "%</td><td>" + r.n + "</td></tr>").join("") +
      "</tbody></table></div><p class=\"hint\">2012–2025 DSE，按全港得分率（分數加權）由高至低。綠 ≥60%、黃 41–59%、紅 ≤40%。樣本／練習唔入。</p>";
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
    return { part: f.part, topic: f.topic, avg: avg, n: pcts.length, old: OLD_TOPICS.has(f.topic) };
  }).filter(Boolean).sort((a, b) => b.avg - a.avg || a.part.localeCompare(b.part));
  box.innerHTML = "<div style=\"overflow:auto\"><table class=\"data-table\"><thead><tr><th>部</th><th>課題</th><th>平均命中率</th><th>題數</th></tr></thead><tbody>" +
    rows.map(r => "<tr class=\"" + bandClass(r.avg) + "\"><td>" + r.part + "</td><td>" + esc(topicLabel(r.topic)) + (r.old ? "　<span class='sub'>舊課程</span>" : "") + "</td><td>" + Math.round(r.avg) + "%</td><td>" + r.n + "</td></tr>").join("") +
    "</tbody></table></div><p class=\"hint\">按全港命中率由高至低。綠 ≥60%、黃 41–59%、紅 ≤40%。</p>";
}

const STRANDS = [
  { id: "alg", zh: "數與代數", en: "Number and Algebra", color: "#8c6a3a", ink: "#fff" },
  { id: "meas", zh: "度量圖形", en: "Measures and Figures", color: "#5d738c", ink: "#fff" },
  { id: "coord", zh: "坐標幾何", en: "Coordinate Geometry", color: "#a65d3f", ink: "#fff" },
  { id: "stat", zh: "統計與概率", en: "Statistics and Probability", color: "#1f6f6a", ink: "#fff" }
];
const M2_STRANDS = [
  { id: "m2-base", zh: "基礎知識", en: "Foundation", color: "#d9d0c3", ink: "#1c1915" },
  { id: "m2-trig", zh: "三角學", en: "Trigonometry", color: "#5d738c", ink: "#fff" },
  { id: "m2-diff", zh: "微分", en: "Differentiation", color: "#1f6f6a", ink: "#fff" },
  { id: "m2-int", zh: "積分", en: "Integration", color: "#a65d3f", ink: "#fff" },
  { id: "m2-alg", zh: "矩陣與方程組", en: "Matrices and Systems", color: "#7d6a8a", ink: "#fff" },
  { id: "m2-vec", zh: "向量", en: "Vectors", color: "#6b7040", ink: "#fff" }
];
const strandPick = {};
function strandOfTopic(paper, part, topic) {
  if (paper === "m2") {
    const ax = M2_AXES.find(a => a.topics.includes(topic));
    return ax ? ax.id : "";
  }
  const ax = axisOf(part, topic) || AXES.find(a => a.topics.includes(topic));
  if (!ax) return "";
  if (ax.id === "a-alg" || ax.id === "b-alg") return "alg";
  if (ax.id === "a-meas" || ax.id === "b-shape") return "meas";
  if (ax.id === "a-coord" || ax.id === "b-coord") return "coord";
  if (ax.id === "a-stat" || ax.id === "b-stat") return "stat";
  return "";
}
function strandYearStat(paper, year, cat) {
  const marks = {};
  const got = {};
  const base = {};
  cat.forEach(c => { marks[c.id] = 0; got[c.id] = 0; base[c.id] = 0; });
  if (paper === "p2") {
    (P2_TOPICS.items || []).filter(x => x.y === year).forEach(x => {
      const id = strandOfTopic(paper, x.part, x.topic);
      if (!id || !Object.prototype.hasOwnProperty.call(marks, id)) return;
      marks[id] += 1;
      const pct = p2Hit(year, x.q);
      if (pct != null) { got[id] += pct; base[id] += 100; }
    });
  } else {
    const items = paper === "p1" ? p1Items() : m2Items();
    items.filter(x => x.y === year && x.marks).forEach(x => {
      const part = paper === "p1" ? p1PartOfSec(x.sec) : "";
      const id = strandOfTopic(paper, part, x.topic);
      if (!id || !Object.prototype.hasOwnProperty.call(marks, id)) return;
      marks[id] += +x.marks;
      if (x.hk != null && x.hk !== "") { got[id] += +x.hk; base[id] += +x.marks; }
    });
  }
  const total = cat.reduce((s, c) => s + marks[c.id], 0) || 1;
  const share = {};
  const rate = {};
  cat.forEach(c => {
    share[c.id] = marks[c.id] / total * 100;
    rate[c.id] = base[c.id] ? got[c.id] / base[c.id] * 100 : null;
  });
  return { year: year, share: share, rate: rate, marks: marks, got: got, base: base };
}
function strandBar(cat, share, thin) {
  return "<div class=\"strand-bar" + (thin ? " thin" : "") + "\">" + cat.map(c => {
    const w = share[c.id] || 0;
    const lab = !thin && w >= 14 ? Math.round(w) + "%" : "";
    return "<span style=\"flex:0 0 " + w + "%;background:" + c.color + ";color:" + c.ink + "\">" + lab + "</span>";
  }).join("") + "</div>";
}
function strandName(c) { return prefs.lang === "en" ? c.en : c.zh; }
function strandSentence(cat, pooled, first, last) {
  let top = cat[0], low = null;
  cat.forEach(c => {
    if ((pooled.share[c.id] || 0) > (pooled.share[top.id] || 0)) top = c;
    if (pooled.rate[c.id] == null) return;
    if (!low || pooled.rate[c.id] < pooled.rate[low.id]) low = c;
  });
  let s = strandName(top) + "佔 " + Math.round(pooled.share[top.id] || 0) + "%";
  if (low) s += "，得分率最低是" + strandName(low) + " " + Math.round(pooled.rate[low.id]) + "%";
  s += "。";
  if (!first || !last || first.year === last.year) return s + "結構穩定。";
  let up = null, down = null;
  cat.forEach(c => {
    const d = (last.share[c.id] || 0) - (first.share[c.id] || 0);
    if (!up || d > up.d) up = { c: c, d: d };
    if (!down || d < down.d) down = { c: c, d: d };
  });
  if (up.d < 3 && down.d > -3) return s + "結構穩定。";
  const bits = [];
  if (up.d >= 3) bits.push(strandName(up.c) + "升 " + Math.round(up.d) + " 個百分點");
  if (down.d <= -3) bits.push(strandName(down.c) + "跌 " + Math.round(-down.d) + " 個百分點");
  return s + bits.join("，") + "。";
}
function renderStrandShare() {
  const box = document.getElementById("strandBox");
  const body = document.getElementById("strandBody");
  const fromSel = document.getElementById("strandFrom");
  const toSel = document.getElementById("strandTo");
  if (!box || !body || !fromSel || !toSel) return;
  const paper = document.getElementById("itemPaper").value;
  if (paper === "m1") { box.hidden = true; return; }
  box.hidden = false;
  const cat = paper === "m2" ? M2_STRANDS : STRANDS;
  const years = YEARS.filter(y => {
    if (paper === "p2") return (P2_TOPICS.items || []).some(x => x.y === y);
    if (paper === "p1") return p1Items().some(x => x.y === y && x.marks);
    return m2Items().some(x => x.y === y && x.marks);
  });
  if (!years.length) { body.innerHTML = "<p class=\"hint\">未有資料</p>"; return; }
  const recent = years.slice(-5);
  const pick = strandPick[paper] || { from: recent[0], to: recent[recent.length - 1] };
  let from = years.includes(pick.from) ? pick.from : recent[0];
  let to = years.includes(pick.to) ? pick.to : recent[recent.length - 1];
  if (from > to) { const t = from; from = to; to = t; }
  strandPick[paper] = { from: from, to: to };
  const opt = years.map(y => "<option value=\"" + y + "\">" + y + "</option>").join("");
  fromSel.innerHTML = opt;
  toSel.innerHTML = opt;
  fromSel.value = String(from);
  toSel.value = String(to);
  const span = years.filter(y => y >= from && y <= to);
  const rows = span.map(y => strandYearStat(paper, y, cat));
  const pooledMarks = {};
  const pooledGot = {};
  const pooledBase = {};
  cat.forEach(c => { pooledMarks[c.id] = 0; pooledGot[c.id] = 0; pooledBase[c.id] = 0; });
  rows.forEach(r => cat.forEach(c => {
    pooledMarks[c.id] += r.marks[c.id];
    pooledGot[c.id] += r.got[c.id];
    pooledBase[c.id] += r.base[c.id];
  }));
  const total = cat.reduce((s, c) => s + pooledMarks[c.id], 0) || 1;
  const pooled = { share: {}, rate: {} };
  cat.forEach(c => {
    pooled.share[c.id] = pooledMarks[c.id] / total * 100;
    pooled.rate[c.id] = pooledBase[c.id] ? pooledGot[c.id] / pooledBase[c.id] * 100 : null;
  });
  const legend = "<div class=\"strand-legend\">" + cat.map(c => {
    const rate = pooled.rate[c.id] == null ? "—" : Math.round(pooled.rate[c.id]) + "%";
    return "<span><b style=\"background:" + c.color + "\"></b>" + esc(strandName(c)) + " " + Math.round(pooled.share[c.id] || 0) + "% · 得分率 " + rate + "</span>";
  }).join("") + "</div>";
  const yearsHtml = rows.map(r => "<div class=\"strand-year\"><em>" + r.year + "</em>" + strandBar(cat, r.share, true) + "</div>").join("");
  body.innerHTML = strandBar(cat, pooled.share, false) + legend + yearsHtml +
    "<p class=\"hint\">" + esc(strandSentence(cat, pooled, rows[0], rows[rows.length - 1])) + "</p>";
}
const _renderItemsStrand = renderItems;
renderItems = function () {
  _renderItemsStrand();
  renderStrandShare();
};
const itemPaperEl = document.getElementById("itemPaper");
if (itemPaperEl) itemPaperEl.addEventListener("change", () => renderItems());
try { renderStrandShare(); } catch (e) {}
const strandBoxEl = document.getElementById("strandBox");
if (strandBoxEl && !strandBoxEl.dataset.bound) {
  strandBoxEl.dataset.bound = "1";
  strandBoxEl.addEventListener("change", e => {
    if (e.target.id !== "strandFrom" && e.target.id !== "strandTo") return;
    const paper = document.getElementById("itemPaper").value;
    strandPick[paper] = { from: +document.getElementById("strandFrom").value, to: +document.getElementById("strandTo").value };
    renderStrandShare();
  });
}

function classEligible(pr, paper) {
  return markedCountOf(pr, paper) >= classMinFor(paper);
}

(function () {
  const el = document.querySelector("#view-ability .axis-legend summary");
  try {
    if (el && typeof weakPaperId === "function")
      el.textContent = weakPaperId() === "m2" ? "6 軸課題對照" : "8 軸課題對照";
  } catch (e) {}
  try {
    if (typeof currentView !== "undefined" && currentView === "ability" && typeof renderRadar === "function") renderRadar();
    if (typeof currentView !== "undefined" && currentView === "items" && typeof renderItemTopics === "function") renderItemTopics();
  } catch (e) {}
})();
