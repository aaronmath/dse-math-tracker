function mingItems() {
  const paper = weakPaperId();
  const out = [];
  if (paper === "m2") {
    YEARS.forEach(function (y) {
      allQs("m2", y).forEach(function (q) {
        const c = getCell("m2", y, q);
        if (!isMing(c)) return;
        const topic = m2MainTopic(y, q) || "\u672a\u5206\u985e";
        const subs = m2Subs(y, q);
        const sec = (subs[0] && subs[0].sec) || (q <= 8 ? "\u7532" : "\u4e59");
        out.push({ paper: "m2", y: y, q: q, s: c.s, topic: topic, topics: m2TopicLine(y, q), tags: c.tags || [], note: c.note || "", part: sec, axisPart: "M2", pct: m2HitPct(y, q), w: true });
      });
    });
  } else {
    YEARS.forEach(function (y) {
      allQs(paper, y).forEach(function (q) {
        const c = getCell(paper, y, q);
        if (!isMing(c)) return;
        out.push({ paper: paper, y: y, q: q, s: c.s, topic: (paper === "p1" ? p1MainTopic(y, q) : topicOf(y, q)) || "\u672a\u5206\u985e", topics: "", tags: c.tags || [], note: c.note || "", part: "", axisPart: "", pct: paper === "p1" ? p1HitPct(y, q) : p2Hit(y, q), w: true });
      });
    });
  }
  out.sort(function (a, b) { return b.y - a.y || a.q - b.q; });
  return out;
}
function excerptItems() { return prefs.weakMing ? mingItems() : weakItems(); }
function axisScoreOf(pr, axis, paper) {
  if (paper === "p1") {
    const items = p1Items().filter(function (x) { return p1PartOfSec(x.sec) === axis.part && axis.topics.indexOf(x.topic) >= 0 && !skipOldQ(x.y, x.q, x.topic); });
    let sum = 0, wsum = 0; const seenQ = new Set();
    items.forEach(function (x) {
      const c = getCellOf(pr, "p1", x.y, x.q); if (!c.s) return;
      const w = c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0; const m = x.marks || 0;
      sum += w * m; wsum += m; seenQ.add(x.y + ":" + x.q);
    });
    if (seenQ.size < axisMinN(paper)) return { n: seenQ.size, L: null };
    return { n: seenQ.size, L: wsum ? sum / wsum : null };
  }
  if (paper === "m2") {
    const items = m2Items().filter(function (x) { return axis.topics.indexOf(x.topic) >= 0; });
    let sum = 0, wsum = 0; const seenQ = new Set();
    items.forEach(function (x) {
      const c = getCellOf(pr, "m2", x.y, x.q); if (!c.s) return;
      const w = c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0; const m = x.marks || 0;
      sum += w * m; wsum += m; seenQ.add(x.y + ":" + x.q);
    });
    if (seenQ.size < axisMinN(paper)) return { n: seenQ.size, L: null };
    return { n: seenQ.size, L: wsum ? sum / wsum : null };
  }
  const items = (P2_TOPICS.items || []).filter(function (x) { return x.part === axis.part && axis.topics.indexOf(x.topic) >= 0 && !skipOldQ(x.y, x.q, x.topic); });
  let sum = 0, n = 0;
  items.forEach(function (x) { const c = getCellOf(pr, "p2", x.y, x.q); if (!c.s) return; sum += c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0; n++; });
  if (n < axisMinN(paper)) return { n: n, L: null };
  return { n: n, L: sum / n };
}
function axisHk(axis, paper) {
  if (paper === "m2") {
    const items = m2Items().filter(function (x) { return axis.topics.indexOf(x.topic) >= 0; });
    let hkSum = 0, hkW = 0;
    items.forEach(function (x) { const m = x.marks || 0; if (x.hk != null && x.hk !== "" && m) { hkSum += Number(x.hk); hkW += m; } });
    return hkW ? hkSum / hkW : null;
  }
  if (paper === "p1") {
    const items = p1Items().filter(function (x) { return p1PartOfSec(x.sec) === axis.part && axis.topics.indexOf(x.topic) >= 0 && !skipOldQ(x.y, x.q, x.topic); });
    let hkSum = 0, hkW = 0;
    items.forEach(function (x) { const m = x.marks || 0; if (x.hk != null && x.hk !== "" && m) { hkSum += Number(x.hk); hkW += m; } });
    return hkW ? hkSum / hkW : null;
  }
  const items = (P2_TOPICS.items || []).filter(function (x) { return x.part === axis.part && axis.topics.indexOf(x.topic) >= 0 && !skipOldQ(x.y, x.q, x.topic); });
  const hk = [];
  items.forEach(function (x) { const pct = p2Hit(x.y, x.q); if (pct != null) hk.push(pct / 100); });
  return hk.length ? hk.reduce(function (a, b) { return a + b; }, 0) / hk.length : null;
}
function classRadarHtml(people, paper, cmpPeople) {
  const axes = axesFor(paper);
  const cx = 170, cy = 170, r = 112, N = axes.length;
  const L = axes.map(function (ax) { return classAxisAvg(people, ax, paper).L; });
  const C = cmpPeople ? axes.map(function (ax) { return classAxisAvg(cmpPeople, ax, paper).L; }) : [];
  const H = axes.map(function (ax) { return axisHk(ax, paper); });
  var rings = "";
  [0.25, 0.5, 0.75, 1].forEach(function (k) {
    rings += '<polygon points="' + radarPolyRated(Array(N).fill(k), cx, cy, r).join(" ") + '" fill="none" stroke="#e4ddd2" stroke-width="1"/>';
  });
  [[0.4, "#e0b8b0"], [0.6, "#b7d0b3"]].forEach(function (row) {
    rings += '<polygon points="' + radarPolyRated(Array(N).fill(row[0]), cx, cy, r).join(" ") + '" fill="none" stroke="' + row[1] + '" stroke-width="1.5"/>';
  });
  var spokes = "", labels = "";
  axes.forEach(function (a, i) {
    const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
    spokes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + r * Math.cos(ang)).toFixed(1) + '" y2="' + (cy + r * Math.sin(ang)).toFixed(1) + '" stroke="#e4ddd2"/>';
    const lx = cx + (r + 22) * Math.cos(ang), ly = cy + (r + 22) * Math.sin(ang);
    labels += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle" font-size="10" fill="' + (prefs.classAxis === a.id ? "#3d6e8c" : "#1c1915") + '" data-axis="' + a.id + '" style="cursor:pointer">' + esc(a.name.replace("\u3000", " ")) + "</text>";
  });
  var stu = "", hk = "";
  const ratedL = radarPolyRated(L, cx, cy, r);
  if (ratedL.length >= 4) stu = '<polygon class="radar-stu" points="' + ratedL.join(" ") + '" fill="rgba(61,110,140,.28)" stroke="#3d6e8c" stroke-width="2"/>';
  else stu = radarSpokes(L, cx, cy, r, "#3d6e8c");
  L.forEach(function (v, i) {
    if (v != null) return;
    const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
    stu += '<circle cx="' + (cx + r * Math.cos(ang)).toFixed(1) + '" cy="' + (cy + r * Math.sin(ang)).toFixed(1) + '" r="4" class="miss"/>';
  });
  if (prefs.hkRef) {
    const ratedH = radarPolyRated(H, cx, cy, r);
    if (ratedH.length >= 4) hk = '<polygon points="' + ratedH.join(" ") + '" fill="none" stroke="#8a8178" stroke-width="1.5" stroke-dasharray="5 4"/>';
    else hk = radarSpokes(H, cx, cy, r, "#8a8178", "5 4").replace(/fill="#8a8178"/g, 'fill="none" stroke="#8a8178"');
  }
  var cmp = "";
  if (cmpPeople && cmpPeople.length) {
    const ratedC = radarPolyRated(C, cx, cy, r);
    if (ratedC.length >= 4) cmp = '<polygon points="' + ratedC.join(" ") + '" fill="rgba(226,61,106,.16)" stroke="#e23d6a" stroke-width="2" stroke-dasharray="5 4"/>';
    else cmp = radarSpokes(C, cx, cy, r, "#e23d6a", "5 4");
  }
  const empty = people.filter(function (n) { return classEligible(db.profiles[n], paper); }).length === 0;
  if (empty) return '<p class="hint">\u5165\u570d 0 \u4eba\uff0c\u6a19\u6eff ' + classMinFor(paper) + " \u984c\u5148\u51fa\u73ed\u96f7\u9054\u3002</p>";
  const cap = cmpPeople && cmpPeople.length ? "\u85cd\uff1d\u5462\u73ed\u3000\u73ab\u7d05\u865b\u7dda\uff1d\u758a\u73ed\u3000\u7070\u865b\u7dda\uff1d\u5168\u6e2f" : "\u5be6\u8272\uff1d\u73ed\u5e73\u5747\u3000\u865b\u7dda\uff1d\u5168\u6e2f";
  return '<svg viewBox="0 0 340 340" class="radar-draw">' + rings + spokes + hk + cmp + stu + labels +
    '<text x="170" y="318" text-anchor="middle" font-size="11" fill="#6b645b">' + cap + "</text></svg>";
}
(function () {
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
      if (mix && ming && mix.textContent.indexOf("\u660e\u8fd4") < 0) mix.textContent += " \u00b7 \u660e\u8fd4 " + ming;
    } catch (e) {}
  };
  try {
    if (typeof currentView !== "undefined" && currentView === "ability" && typeof renderWeak === "function") renderWeak();
    if (typeof currentView !== "undefined" && currentView === "tracker" && typeof renderTracker === "function") renderTracker();
    if (typeof currentView !== "undefined" && currentView === "class" && typeof renderClassPage === "function") renderClassPage();
  } catch (e) {}
})();
