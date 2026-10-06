/* Last-load M2 UI overlay: 明返點、能力跳轉、全港％、班況 M2、全港平均課題欄 */
function classPaperId() {
  return prefs.classPaper === "p2" || prefs.classPaper === "m1" || prefs.classPaper === "m2" ? prefs.classPaper : "p1";
}

function axisHkFromItems(items, paper) {
  if (paper === "p2") {
    const hk = [];
    items.forEach(function (x) {
      const pct = p2Hit(x.y, x.q);
      if (pct != null) hk.push(pct / 100);
    });
    return hk.length ? hk.reduce(function (a, b) { return a + b; }, 0) / hk.length : null;
  }
  let hkSum = 0, hkW = 0;
  items.forEach(function (x) {
    const m = x.marks || 0;
    if (x.hk != null && x.hk !== "" && m) { hkSum += Number(x.hk); hkW += m; }
  });
  return hkW ? hkSum / hkW : null;
}

function useScoreMetric() { return prefs.metric !== "know"; }
function partRate(cell, sub, marks) {
  if (!cell || !cell.pts || cell.pts[sub] == null || cell.pts[sub] === "" || !marks) return null;
  const v = +cell.pts[sub];
  return Number.isFinite(v) ? v / marks : null;
}
function p2Rate(cell, year, q) {
  if (!cell || !cell.mc) return null;
  const bank = (window.P2_DATA && P2_DATA.dse && P2_DATA.dse[String(year)]) || [];
  const row = bank.find(function (r) { return r.q === q; });
  if (!row || !row.ans) return null;
  return cell.mc === row.ans ? 1 : 0;
}
function scoreAxis(items, paper, cellOf) {
  let sum = 0, wsum = 0, n = 0;
  items.forEach(function (x) {
    const c = cellOf(x);
    if (paper === "p2") {
      const r = p2Rate(c, x.y, x.q);
      if (r == null) return;
      sum += r; wsum += 1; n++;
      return;
    }
    const r = partRate(c, x.sub, x.marks || 0);
    if (r == null) return;
    const m = x.marks || 0;
    sum += r * m; wsum += m; n++;
  });
  return { n: n, L: wsum ? sum / wsum : null };
}
function axisScore(axis) {
  const paper = weakPaperId();
  if (useScoreMetric()) {
    const items = paper === "m2"
      ? m2Items().filter(function (x) { return axis.topics.includes(x.topic); })
      : paper === "p1"
        ? p1Items().filter(function (x) { return p1PartOfSec(x.sec) === axis.part && axis.topics.includes(x.topic) && !skipOldQ(x.y, x.q, x.topic); })
        : (P2_TOPICS.items || []).filter(function (x) { return x.part === axis.part && axis.topics.includes(x.topic) && !skipOldQ(x.y, x.q, x.topic); });
    const got = scoreAxis(items, paper, function (x) { return getCell(paper, x.y, x.q); });
    const hk = axisHkFromItems(items, paper);
    const minN = paper === "p2" ? 4 : axisMinN(paper);
    if (got.n < minN) return { n: got.n, L: null, hk: hk };
    return { n: got.n, L: got.L, hk: hk };
  }
  if (paper === "p1") {
    const items = p1Items().filter(function (x) {
      return p1PartOfSec(x.sec) === axis.part && axis.topics.includes(x.topic) && !skipOldQ(x.y, x.q, x.topic);
    });
    let sum = 0, wsum = 0;
    const seenQ = new Set();
    items.forEach(function (x) {
      const c = getCell("p1", x.y, x.q);
      if (!c.s) return;
      const w = c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0;
      const m = x.marks || 0;
      sum += w * m;
      wsum += m;
      seenQ.add(x.y + ":" + x.q);
    });
    const hk = useScoreMetric() ? axisHkFromItems(items, "p1") : null;
    if (seenQ.size < axisMinN(paper)) return { n: seenQ.size, L: null, hk: hk };
    return { n: seenQ.size, L: wsum ? sum / wsum : null, hk: hk };
  }
  if (paper === "m2") {
    const items = m2Items().filter(function (x) { return axis.topics.includes(x.topic); });
    let sum = 0, wsum = 0;
    const seenQ = new Set();
    items.forEach(function (x) {
      const c = getCell("m2", x.y, x.q);
      if (!c.s) return;
      const w = c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0;
      const m = x.marks || 0;
      sum += w * m;
      wsum += m;
      seenQ.add(x.y + ":" + x.q);
    });
    const hk = useScoreMetric() ? axisHkFromItems(items, "m2") : null;
    if (seenQ.size < axisMinN(paper)) return { n: seenQ.size, L: null, hk: hk };
    return { n: seenQ.size, L: wsum ? sum / wsum : null, hk: hk };
  }
  const items = (P2_TOPICS.items || []).filter(function (x) {
    return x.part === axis.part && axis.topics.includes(x.topic) && !skipOldQ(x.y, x.q, x.topic);
  });
  let sum = 0, n = 0;
  items.forEach(function (x) {
    const c = getCell("p2", x.y, x.q);
    if (!c.s) return;
    sum += c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0;
    n++;
  });
  const hk = useScoreMetric() ? axisHkFromItems(items, "p2") : null;
  if (n < 4) return { n: n, L: null, hk: hk };
  return { n: n, L: sum / n, hk: hk };
}

function axisScoreOf(pr, axis, paper) {
  if (useScoreMetric()) {
    const items = paper === "m2"
      ? m2Items().filter(function (x) { return axis.topics.includes(x.topic); })
      : paper === "p1"
        ? p1Items().filter(function (x) { return p1PartOfSec(x.sec) === axis.part && axis.topics.includes(x.topic) && !skipOldQ(x.y, x.q, x.topic); })
        : (P2_TOPICS.items || []).filter(function (x) { return x.part === axis.part && axis.topics.includes(x.topic) && !skipOldQ(x.y, x.q, x.topic); });
    const got = scoreAxis(items, paper, function (x) { return getCellOf(pr, paper, x.y, x.q); });
    const minN = paper === "p2" ? 4 : axisMinN(paper);
    if (got.n < minN) return { n: got.n, L: null };
    return got;
  }
  if (paper === "p1") {
    const items = p1Items().filter(function (x) {
      return p1PartOfSec(x.sec) === axis.part && axis.topics.includes(x.topic) && !skipOldQ(x.y, x.q, x.topic);
    });
    let sum = 0, wsum = 0;
    const seenQ = new Set();
    items.forEach(function (x) {
      const c = getCellOf(pr, "p1", x.y, x.q);
      if (!c.s) return;
      const w = c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0;
      const m = x.marks || 0;
      sum += w * m;
      wsum += m;
      seenQ.add(x.y + ":" + x.q);
    });
    if (seenQ.size < axisMinN(paper)) return { n: seenQ.size, L: null };
    return { n: seenQ.size, L: wsum ? sum / wsum : null };
  }
  if (paper === "m2") {
    const items = m2Items().filter(function (x) { return axis.topics.includes(x.topic); });
    let sum = 0, wsum = 0;
    const seenQ = new Set();
    items.forEach(function (x) {
      const c = getCellOf(pr, "m2", x.y, x.q);
      if (!c.s) return;
      const w = c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0;
      const m = x.marks || 0;
      sum += w * m;
      wsum += m;
      seenQ.add(x.y + ":" + x.q);
    });
    if (seenQ.size < axisMinN(paper)) return { n: seenQ.size, L: null };
    return { n: seenQ.size, L: wsum ? sum / wsum : null };
  }
  const items = (P2_TOPICS.items || []).filter(function (x) {
    return x.part === axis.part && axis.topics.includes(x.topic) && !skipOldQ(x.y, x.q, x.topic);
  });
  let sum = 0, n = 0;
  items.forEach(function (x) {
    const c = getCellOf(pr, "p2", x.y, x.q);
    if (!c.s) return;
    sum += c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0;
    n++;
  });
  if (n < 4) return { n: n, L: null };
  return { n: n, L: sum / n };
}

function topicAbilityOf(pr, part, topic, paper) {
  if (useScoreMetric()) {
    const items = paper === "m2"
      ? m2Items().filter(function (x) { return x.topic === topic; })
      : paper === "p1"
        ? p1Items().filter(function (x) { return p1PartOfSec(x.sec) === part && x.topic === topic; })
        : (P2_TOPICS.items || []).filter(function (x) { return x.part === part && x.topic === topic; });
    return scoreAxis(items, paper, function (x) { return getCellOf(pr, paper, x.y, x.q); });
  }
  if (paper === "m2") {
    const items = m2Items().filter(function (x) { return x.topic === topic; });
    let sum = 0, w = 0;
    const seen = new Set();
    items.forEach(function (x) {
      const c = getCellOf(pr, "m2", x.y, x.q);
      if (!c.s) return;
      const m = x.marks || 0;
      sum += (c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0) * m;
      w += m;
      seen.add(x.y + ":" + x.q);
    });
    if (!w) return { n: 0, L: null };
    return { n: seen.size, L: sum / w };
  }
  if (paper === "p1") {
    const items = p1Items().filter(function (x) { return p1PartOfSec(x.sec) === part && x.topic === topic; });
    let sum = 0, w = 0;
    items.forEach(function (x) {
      const c = getCellOf(pr, "p1", x.y, x.q);
      if (!c.s) return;
      const m = x.marks || 0;
      sum += (c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0) * m;
      w += m;
    });
    if (!w) return { n: 0, L: null };
    return { n: items.filter(function (x) { return getCellOf(pr, "p1", x.y, x.q).s; }).length, L: sum / w };
  }
  const items = (P2_TOPICS.items || []).filter(function (x) { return x.part === part && x.topic === topic; });
  let sum = 0, n = 0;
  items.forEach(function (x) {
    const c = getCellOf(pr, "p2", x.y, x.q);
    if (!c.s) return;
    sum += c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0;
    n++;
  });
  if (!n) return { n: 0, L: null };
  return { n: n, L: sum / n };
}

function itemsForAxis(axis, paper) {
  const seen = new Map();
  if (paper === "p1") {
    p1Items().forEach(function (x) {
      if (p1PartOfSec(x.sec) !== axis.part || !axis.topics.includes(x.topic) || skipOldQ(x.y, x.q, x.topic)) return;
      const k = x.y + ":" + x.q;
      if (!seen.has(k)) seen.set(k, { y: x.y, q: x.q, paper: "p1", topic: x.topic, part: axis.part });
    });
  } else if (paper === "m2") {
    m2Items().forEach(function (x) {
      if (!axis.topics.includes(x.topic)) return;
      const k = x.y + ":" + x.q;
      if (!seen.has(k)) seen.set(k, { y: x.y, q: x.q, paper: "m2", topic: x.topic, part: x.sec || "M2" });
    });
  } else {
    (P2_TOPICS.items || []).forEach(function (x) {
      if (x.part !== axis.part || !axis.topics.includes(x.topic) || skipOldQ(x.y, x.q, x.topic)) return;
      const k = x.y + ":" + x.q;
      if (!seen.has(k)) seen.set(k, { y: x.y, q: x.q, paper: "p2", topic: x.topic, part: x.part });
    });
  }
  return Array.from(seen.values());
}

function itemsForTopic(part, topic, paper) {
  const ax = axesFor(paper).find(function (a) {
    return a.topics.includes(topic) && (paper === "m2" || a.part === part);
  });
  if (!ax) return [];
  return itemsForAxis(ax, paper).filter(function (x) { return x.topic === topic; });
}

function topicHkAvg(part, topic, paper) {
  if (paper === "m2") return axisHkFromItems(m2Items().filter(function (x) { return x.topic === topic; }), "m2");
  if (paper === "p1") {
    return axisHkFromItems(p1Items().filter(function (x) {
      return p1PartOfSec(x.sec) === part && x.topic === topic;
    }), "p1");
  }
  const items = (P2_TOPICS.items || []).filter(function (x) { return x.part === part && x.topic === topic; });
  return axisHkFromItems(items, "p2");
}

function axisHk(axis, paper) {
  if (paper === "m2") return axisHkFromItems(m2Items().filter(function (x) { return axis.topics.includes(x.topic); }), "m2");
  if (paper === "p1") {
    return axisHkFromItems(p1Items().filter(function (x) {
      return p1PartOfSec(x.sec) === axis.part && axis.topics.includes(x.topic) && !skipOldQ(x.y, x.q, x.topic);
    }), "p1");
  }
  return axisHkFromItems((P2_TOPICS.items || []).filter(function (x) {
    return x.part === axis.part && axis.topics.includes(x.topic) && !skipOldQ(x.y, x.q, x.topic);
  }), "p2");
}

function classRadarHtml(people, paper, cmpPeople) {
  const axisList = axesFor(paper);
  const cx = 170, cy = 170, r = 112, N = axisList.length;
  const L = axisList.map(function (ax) { return classAxisAvg(people, ax, paper).L; });
  const C = cmpPeople ? axisList.map(function (ax) { return classAxisAvg(cmpPeople, ax, paper).L; }) : [];
  const H = axisList.map(function (ax) { return axisHk(ax, paper); });
  let rings = "";
  [0.25, 0.5, 0.75, 1].forEach(function (k) {
    rings += "<polygon points=\"" + radarPolyRated(Array(N).fill(k), cx, cy, r).join(" ") + "\" fill=\"none\" stroke=\"#e4ddd2\" stroke-width=\"1\"/>";
  });
  [[0.4, "#e0b8b0"], [0.6, "#b7d0b3"]].forEach(function (row) {
    rings += "<polygon points=\"" + radarPolyRated(Array(N).fill(row[0]), cx, cy, r).join(" ") + "\" fill=\"none\" stroke=\"" + row[1] + "\" stroke-width=\"1.5\"/>";
  });
  let spokes = "", labels = "";
  axisList.forEach(function (a, i) {
    const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
    const x2 = cx + r * Math.cos(ang), y2 = cy + r * Math.sin(ang);
    spokes += "<line x1=\"" + cx + "\" y1=\"" + cy + "\" x2=\"" + x2.toFixed(1) + "\" y2=\"" + y2.toFixed(1) + "\" stroke=\"#e4ddd2\"/>";
    const lx = cx + (r + 22) * Math.cos(ang), ly = cy + (r + 22) * Math.sin(ang);
    labels += "<text x=\"" + lx.toFixed(1) + "\" y=\"" + ly.toFixed(1) + "\" text-anchor=\"middle\" font-size=\"10\" fill=\"" + (prefs.classAxis === a.id ? "#3d6e8c" : "#1c1915") + "\" data-axis=\"" + a.id + "\" style=\"cursor:pointer\">" + esc(a.name.replace("\u3000", " ")) + "</text>";
  });
  let stu = "", hk = "";
  const ratedL = radarPolyRated(L, cx, cy, r);
  if (ratedL.length >= 4) stu = "<polygon class=\"radar-stu\" points=\"" + ratedL.join(" ") + "\" fill=\"rgba(61,110,140,.28)\" stroke=\"#3d6e8c\" stroke-width=\"2\"/>";
  else stu = radarSpokes(L, cx, cy, r, "#3d6e8c");
  L.forEach(function (v, i) {
    if (v != null) return;
    const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
    stu += "<circle cx=\"" + (cx + r * Math.cos(ang)).toFixed(1) + "\" cy=\"" + (cy + r * Math.sin(ang)).toFixed(1) + "\" r=\"4\" class=\"miss\"/>";
  });
  const showHk = useScoreMetric() && prefs.hkRef;
  if (showHk) {
    const ratedH = radarPolyRated(H, cx, cy, r);
    if (ratedH.length >= 4) hk = "<polygon points=\"" + ratedH.join(" ") + "\" fill=\"none\" stroke=\"#8a8178\" stroke-width=\"1.5\" stroke-dasharray=\"5 4\"/>";
    else hk = radarSpokes(H, cx, cy, r, "#8a8178", "5 4").replace(/fill="#8a8178"/g, "fill=\"none\" stroke=\"#8a8178\"");
  }
  let cmp = "";
  if (cmpPeople && cmpPeople.length) {
    const ratedC = radarPolyRated(C, cx, cy, r);
    if (ratedC.length >= 4) cmp = "<polygon points=\"" + ratedC.join(" ") + "\" fill=\"rgba(226,61,106,.16)\" stroke=\"#e23d6a\" stroke-width=\"2\" stroke-dasharray=\"5 4\"/>";
    else cmp = radarSpokes(C, cx, cy, r, "#e23d6a", "5 4");
  }
  const minN = classMinFor(paper);
  const empty = people.filter(function (n) { return classEligible(db.profiles[n], paper); }).length === 0;
  if (empty) return "<p class=\"hint\">入圍 0 人，標滿 " + minN + " 題先出班雷達。</p>";
  const drawKey = (prefs.classSel || "") + ":" + paper + ":" + (prefs.classCmp || "") + ":" + (showHk ? 1 : 0) + ":" + (useScoreMetric() ? "score" : "know");
  const draw = classRadarDrawn !== drawKey;
  classRadarDrawn = drawKey;
  const cap = useScoreMetric() ? "實色＝已入分得分率　虛線＝全港" : "實色＝掌握程度　掌握模式唔畫全港";
  return "<svg viewBox=\"0 0 340 340\" class=\"" + (draw ? "radar-draw" : "") + "\">" + rings + spokes + hk + cmp + stu + labels +
    "<text x=\"170\" y=\"318\" text-anchor=\"middle\" font-size=\"11\" fill=\"#6b645b\">" + cap + "</text></svg>";
}

function medianNums(nums) {
  if (!nums.length) return null;
  const a = nums.slice().sort(function (x, y) { return x - y; });
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function gapBarHtml(L, hk) {
  if (L == null || hk == null) return "";
  const d = L - hk;
  const w = Math.min(50, Math.abs(d) * 100 * 50 / 30);
  return "<i class=\"gap-bar\" title=\"" + (d >= 0 ? "高全港 " : "低全港 ") + Math.round(Math.abs(d) * 100) + "\"><b class=\"" + (d >= 0 ? "up" : "down") + "\" style=\"width:" + w.toFixed(1) + "%\"></b></i>";
}
function paperScoreOf(name, paper, year) {
  const keep = currentProfile;
  currentProfile = name;
  let sc = null;
  if ((paper === "p1" || paper === "m2") && typeof hasPartScores === "function" && hasPartScores(paper, year) && partSum(paper, year) != null) sc = partSum(paper, year);
  else {
    const raw = getScore(paper, year);
    sc = raw === "" || raw == null ? null : +raw;
  }
  currentProfile = keep;
  return Number.isFinite(sc) ? sc : null;
}
function masteryOf(name, paper) {
  const pr = db.profiles[name];
  let filled = 0, m3 = 0;
  YEARS.forEach(function (y) {
    allQs(paper, y).forEach(function (q) {
      const s = getCellOf(pr, paper, y, q).s;
      if (!s) return;
      filled++;
      if (s === 3) m3++;
    });
  });
  return { filled: filled, pct: filled ? m3 * 100 / filled : null };
}
function missRows(people, paper, year) {
  if (paper === "p2") {
    const bank = ((window.P2_DATA && P2_DATA.dse && P2_DATA.dse[String(year)]) || []);
    const rows = [];
    for (let q = 1; q <= 45; q++) {
      const ans = bank.find(function (r) { return r.q === q; });
      if (!ans) continue;
      let sure = 0, other = 0;
      people.forEach(function (n) {
        const c = getCellOf(db.profiles[n], "p2", year, q);
        if (!c.mc || c.mc === ans.ans) return;
        if (c.ink === "b") other++; else sure++;
      });
      if (sure + other) rows.push({ q: q, sure: sure, other: other, n: sure + other });
    }
    return rows.sort(function (a, b) { return b.n - a.n || b.sure - a.sure; }).slice(0, 8);
  }
  const src = paper === "m2" ? ((window.M2_TOPICS && M2_TOPICS.items) || []) : ((window.P1_TOPICS && P1_TOPICS.items) || []);
  const qs = [];
  src.forEach(function (it) { if (it.y === year && qs.indexOf(it.q) < 0) qs.push(it.q); });
  return qs.map(function (q) {
    let n = 0;
    people.forEach(function (name) { if (getCellOf(db.profiles[name], paper, year, q).s === 1) n++; });
    return { q: q, n: n, sure: n, other: 0 };
  }).filter(function (r) { return r.n > 0; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
}
function subRowsHtml(people, paper, year) {
  if (paper !== "p1" && paper !== "m2") return "";
  const src = paper === "m2" ? ((window.M2_TOPICS && M2_TOPICS.items) || []) : ((window.P1_TOPICS && P1_TOPICS.items) || []);
  const items = src.filter(function (x) { return x.y === year; });
  if (!items.length) return "<p class=\"hint\">呢年未有分題表。</p>";
  const body = items.map(function (it) {
    const vals = [];
    people.forEach(function (name) {
      const pts = (getCellOf(db.profiles[name], paper, year, it.q).pts) || {};
      if (pts[it.sub] == null || pts[it.sub] === "") return;
      const v = +pts[it.sub];
      if (Number.isFinite(v)) vals.push(v);
    });
    const avg = vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : null;
    const hk = it.hk == null || it.hk === "" ? null : +it.hk;
    const full = +it.marks || 0;
    const rate = avg != null && full ? avg / full : null;
    const hkRate = hk != null && full ? hk / full : null;
    return "<tr><td>" + esc(it.sub) + "</td><td>" + esc(it.topic || "") + "</td><td class=\"" + (rate == null ? "" : bandClass(rate * 100)) + "\">" +
      (avg == null ? "—" : Math.round(avg * 10) / 10) + "／" + full + gapBarHtml(rate, hkRate) + "</td><td>" +
      (hk == null ? "—" : Math.round(hk * 10) / 10) + "</td><td>" + vals.length + "／" + people.length + "</td></tr>";
  }).join("");
  return "<div class=\"class-chart\"><h3>" + year + " 分題得分</h3><div style=\"overflow:auto\"><table class=\"data-table\"><thead><tr><th>分題</th><th>課題</th><th>班平均</th><th>全港平均</th><th>已入分</th></tr></thead><tbody>" +
    body + "</tbody></table></div><p class=\"hint\">未入分唔當 0。棒：右高全港，左低全港。</p></div>";
}
function classChartsHtml(people, paper, year, statsHtml) {
  const misses = missRows(people, paper, year);
  const maxN = misses.reduce(function (m, r) { return Math.max(m, r.n); }, 1);
  const missHtml = misses.length ? "<div class=\"class-miss\">" + misses.map(function (r) {
    const bar = paper === "p2"
      ? "<i><b style=\"width:" + (r.sure * 100 / maxN).toFixed(1) + "%\"></b><b class=\"other\" style=\"width:" + (r.other * 100 / maxN).toFixed(1) + "%\"></b></i><em>" + r.sure + " 信 / " + r.other + " 其他</em>"
      : "<i><b style=\"width:" + (r.n * 100 / maxN).toFixed(1) + "%\"></b></i><em>" + r.n + " 唔識</em>";
    return "<button type=\"button\" data-jump=\"" + year + ":" + r.q + "\" data-jump-paper=\"" + paper + "\"><span>" + year + " Q" + r.q + "</span>" + bar + "</button>";
  }).join("") + "</div>" : "<p class=\"hint\">呢年未有可排的錯題。</p>";
  const scores = people.map(function (n) { return paperScoreOf(n, paper, year); }).filter(function (v) { return v != null; });
  const step = paper === "p2" ? 5 : 10;
  const full = paper === "p2" ? 45 : paper === "p1" ? 105 : 100;
  let hist = "<p class=\"hint\">未有分數。</p>";
  if (scores.length) {
    const bins = [];
    for (let x = 0; x < full; x += step) bins.push({ lo: x, hi: Math.min(full, x + step), n: 0 });
    scores.forEach(function (v) { bins[Math.min(bins.length - 1, Math.floor(v / step))].n++; });
    const peak = bins.reduce(function (m, b) { return Math.max(m, b.n); }, 1);
    const mean = scores.reduce(function (a, b) { return a + b; }, 0) / scores.length;
    const med = medianNums(scores);
    const W = 520, H = 120, l = 28, btm = 22;
    const bw = (W - l - 8) / bins.length;
    let bars = bins.map(function (bin, i) {
      const h = bin.n / peak * (H - btm - 8);
      return "<rect x=\"" + (l + i * bw + 2).toFixed(1) + "\" y=\"" + (H - btm - h).toFixed(1) + "\" width=\"" + (bw - 4).toFixed(1) + "\" height=\"" + h.toFixed(1) + "\" fill=\"#3d6e8c\"></rect>" +
        "<text x=\"" + (l + i * bw + bw / 2).toFixed(1) + "\" y=\"" + (H - 6) + "\" text-anchor=\"middle\" font-size=\"9\" fill=\"#6b645b\">" + bin.lo + "</text>";
    }).join("");
    const xOf = function (v) { return l + Math.max(0, Math.min(full, v)) / full * (W - l - 8); };
    bars += "<line x1=\"" + xOf(mean).toFixed(1) + "\" y1=\"4\" x2=\"" + xOf(mean).toFixed(1) + "\" y2=\"" + (H - btm) + "\" stroke=\"#1c1915\" stroke-width=\"1.5\"/>";
    bars += "<line x1=\"" + xOf(med).toFixed(1) + "\" y1=\"4\" x2=\"" + xOf(med).toFixed(1) + "\" y2=\"" + (H - btm) + "\" stroke=\"#1c1915\" stroke-width=\"1.5\" stroke-dasharray=\"4 3\"/>";
    hist = "<svg viewBox=\"0 0 " + W + " " + H + "\" width=\"100%\">" + bars + "</svg><p class=\"hint\">實線平均 " + (Math.round(mean * 10) / 10) + "　虛線中位 " + (Math.round(med * 10) / 10) + "　" + scores.length + " 人有分</p>";
  }
  const kind = paper === "m2" ? "m2" : paper === "m1" ? "m1" : "core";
  const pack = window.CUTOFFS && CUTOFFS[kind] && CUTOFFS[kind][String(year)];
  let strip = "<p class=\"hint\">未有等級線。</p>";
  if (pack && pack.starts) {
    const starts = pack.starts.slice().sort(function (a, b) { return a[1] - b[1]; });
    const counts = {};
    let pending = 0, none = 0;
    people.forEach(function (n) {
      const keep = currentProfile;
      currentProfile = n;
      const p1 = paperScoreOf(n, "p1", year), p2 = paperScoreOf(n, "p2", year), m1 = paperScoreOf(n, "m1", year), m2 = paperScoreOf(n, "m2", year);
      currentProfile = keep;
      if (kind === "m2" || kind === "m1") {
        const sc = kind === "m2" ? m2 : m1;
        if (sc == null) { none++; return; }
        const lv = estimateShort(kind, year, sc);
        if (lv === "資料未齊") { pending++; return; }
        counts[lv.replace("暫估 ", "")] = (counts[lv.replace("暫估 ", "")] || 0) + 1;
        return;
      }
      if (p1 == null && p2 == null) { none++; return; }
      if (p1 == null || p2 == null) { pending++; return; }
      const cp = corePct(year, p1, p2);
      const lv = cp == null ? "資料未齊" : estimateShort("core", year, cp);
      if (lv === "資料未齊") { pending++; return; }
      counts[lv.replace("暫估 ", "")] = (counts[lv.replace("暫估 ", "")] || 0) + 1;
    });
    const peak = Math.max(1, Object.keys(counts).reduce(function (m, k) { return Math.max(m, counts[k]); }, 0));
    strip = "<div class=\"lv-strip\">" + starts.map(function (row, i) {
      const next = starts[i + 1] ? starts[i + 1][1] : 100;
      const w = Math.max(4, next - row[1]);
      const n = counts[row[0]] || 0;
      const h = 18 + n / peak * 48;
      return "<div class=\"lv-band\" style=\"flex:" + w.toFixed(2) + ";height:" + h.toFixed(0) + "px\"><b>" + n + "</b><span>" + row[0] + "</span></div>";
    }).join("") + "</div><p class=\"lv-out\">未齊 " + pending + "　未入 " + none + "。格寬跟該年等級線間距。</p>";
  }
  const dots = people.filter(function (n) { return classEligible(db.profiles[n], paper); }).map(function (n) {
    const sc = paperScoreOf(n, paper, year);
    const ab = masteryOf(n, paper);
    return { n: n, sc: sc, pct: ab.pct, filled: ab.filled };
  }).filter(function (d) { return d.sc != null && d.pct != null; });
  let scatter = "<p class=\"hint\">入圍兼有分的人未夠，未畫掌握對分數。</p>";
  if (dots.length) {
    const W = 520, H = 180, l = 32, btm = 22, t = 10, r = 8;
    const xOf = function (v) { return l + Math.max(0, Math.min(full, v)) / full * (W - l - r); };
    const yOf = function (v) { return t + (1 - Math.max(0, Math.min(100, v)) / 100) * (H - t - btm); };
    const mx = medianNums(dots.map(function (d) { return d.sc; }));
    const my = medianNums(dots.map(function (d) { return d.pct; }));
    const maxF = dots.reduce(function (m, d) { return Math.max(m, d.filled); }, 1);
    let marks = "<line x1=\"" + xOf(mx).toFixed(1) + "\" y1=\"" + t + "\" x2=\"" + xOf(mx).toFixed(1) + "\" y2=\"" + (H - btm) + "\" stroke=\"#e4ddd2\"/>" +
      "<line x1=\"" + l + "\" y1=\"" + yOf(my).toFixed(1) + "\" x2=\"" + (W - r) + "\" y2=\"" + yOf(my).toFixed(1) + "\" stroke=\"#e4ddd2\"/>";
    dots.forEach(function (d) {
      const rad = 3 + d.filled / maxF * 5;
      marks += "<circle cx=\"" + xOf(d.sc).toFixed(1) + "\" cy=\"" + yOf(d.pct).toFixed(1) + "\" r=\"" + rad.toFixed(1) + "\" fill=\"#3d6e8c\" fill-opacity=\"0.75\"><title>" + esc(d.n) + " " + d.sc + " / " + Math.round(d.pct) + "%</title></circle>";
    });
    scatter = "<svg viewBox=\"0 0 " + W + " " + H + "\" width=\"100%\">" + marks + "</svg><p class=\"hint\">只計入圍。點愈大＝已標題愈多。十字係中位。</p>";
  }
  const lvName = paper === "m2" ? "M2 等級" : paper === "m1" ? "M1 等級" : "必修等級";
  return "<div class=\"class-charts\"><div class=\"class-chart\"><h3>" + year + " 最多人錯</h3>" + missHtml + "</div>" +
    subRowsHtml(people, paper, year) +
    "<div class=\"class-chart\"><h3>分數分佈</h3>" + hist + (statsHtml || "") + "</div>" +
    "<div class=\"class-chart\"><h3>" + lvName + "</h3>" + strip + "</div>" +
    "<div class=\"class-chart\"><h3>掌握對分數</h3>" + scatter + "</div></div>";
}

function renderClassPage() {
  if (!classUnlocked()) return;
  const paper = classPaperId();
  const axisList = axesFor(paper);
  const minN = classMinFor(paper);
  const paperSel = document.getElementById("classPaper");
  if (paperSel) paperSel.value = paper;
  document.querySelectorAll("#classPaperChips [data-class-paper]").forEach(function (btn) {
    btn.classList.toggle("on", btn.dataset.classPaper === paper);
  });
  document.querySelectorAll("#classMetric [data-metric], #weakMetric [data-metric]").forEach(function (btn) {
    btn.classList.toggle("on", btn.dataset.metric === (useScoreMetric() ? "score" : "know"));
  });
  const mingBtn = document.getElementById("classMingBtn");
  if (mingBtn) {
    mingBtn.textContent = prefs.classMing !== false ? "明返人數　開" : "明返人數　關";
    mingBtn.classList.toggle("on-toggle", prefs.classMing !== false);
  }
  const oldBtn = document.getElementById("classOldBtn");
  if (oldBtn) {
    oldBtn.textContent = prefs.includeOld ? "含舊課程　開" : "含舊課程　關";
    oldBtn.classList.toggle("on-toggle", !!prefs.includeOld);
  }
  const hkBtn = document.getElementById("classHkBtn");
  if (hkBtn) {
    hkBtn.textContent = prefs.hkRef ? "全港參照　開" : "全港參照　關";
    hkBtn.classList.toggle("on-toggle", !!prefs.hkRef);
  }
  const names = classNames();
  if (!prefs.classSel || (prefs.classSel !== "" && !names.includes(prefs.classSel) && prefs.classSel !== "__none")) {
    prefs.classSel = names[0] || "__none";
  }
  if (prefs.classCmp && prefs.classCmp === prefs.classSel) prefs.classCmp = "";
  if (prefs.classAxis && !axisList.some(function (a) { return a.id === prefs.classAxis; })) {
    prefs.classAxis = "";
    prefs.classTopic = "";
    prefs.classPart = "";
  }
  const pills = document.getElementById("classPills");
  if (pills) {
    pills.innerHTML = names.map(function (n) {
      return "<span class=\"class-pill-wrap\"><button type=\"button\" class=\"chip" + (prefs.classSel === n ? " on" : "") + "\" data-class=\"" + esc(n) + "\">" + esc(n) + "</button>" +
        (n !== prefs.classSel ? "<button type=\"button\" class=\"ghost cmp-btn" + (prefs.classCmp === n ? " on-toggle" : "") + "\" data-cmp=\"" + esc(n) + "\">疊</button>" : "") +
        "</span>";
    }).join("") + "<span class=\"class-pill-wrap\"><button type=\"button\" class=\"chip" + (prefs.classSel === "__none" ? " on" : "") + "\" data-class=\"__none\">未分班</button></span>";
  }
  const noneN = peopleOfClass("").length;
  const warn = document.getElementById("classWarn");
  if (warn) {
    warn.hidden = !noneN;
    warn.textContent = noneN ? noneN + " 人未分班" : "";
  }
  const cls = prefs.classSel === "__none" ? "" : prefs.classSel;
  const people = peopleOfClass(cls);
  const cmpPeople = prefs.classCmp ? peopleOfClass(prefs.classCmp === "__none" ? "" : prefs.classCmp) : [];
  const st = classStats(people, paper);
  const eligible = people.filter(function (n) { return classEligible(db.profiles[n], paper); });
  const low = people.filter(function (n) { return !classEligible(db.profiles[n], paper); });
  document.getElementById("classStats").innerHTML =
    "<button type=\"button\" class=\"stat" + (prefs.classLow ? " on" : "") + "\" data-class-low=\"1\"><b>" + eligible.length + "／" + st.n + "</b><span>入圍／全班</span></button>" +
    "<div class=\"stat\"><b>" + st.mid + "</b><span>已標題中位</span></div>" +
    "<div class=\"stat\"><b>" + (st.masteredPct == null ? "—" : st.masteredPct + "%") + "</b><span>已掌握％</span></div>" +
    (prefs.classMing !== false ? "<div class=\"stat\"><b>" + st.mingPeople + "</b><span>明返人數</span></div>" : "");
  document.getElementById("classRadar").innerHTML = paper === "m1"
    ? "<p class=\"hint\">M1 未有課題表，下面只顯示分數同等級。</p>"
    : classRadarHtml(people, paper, cmpPeople);
  if (paper === "m1") {
    document.getElementById("classAxes").innerHTML = "";
    document.getElementById("classTopics").innerHTML = "";
    document.getElementById("classDrill").innerHTML = "";
  }
  const axes = paper === "m1" ? [] : axisList.map(function (ax) {
    const a = classAxisAvg(people, ax, paper);
    return { ax: ax, L: a.L, n: a.n };
  });
  document.getElementById("classAxes").innerHTML = axes.map(function (row, i) {
    const pct = row.L == null ? 0 : Math.round(row.L * 100);
    const lab = row.L == null ? "未評" : pct + "%";
    const on = prefs.classAxis === row.ax.id ? " on" : "";
    return "<button type=\"button\" class=\"class-axis" + on + "\" data-axis=\"" + row.ax.id + "\" style=\"--d:" + (i * 35) + "ms\">" +
      "<span>" + esc(row.ax.name) + "</span>" +
      "<i class=\"bar-track\"><b class=\"class-bar " + (row.L == null ? "" : bandClass(row.L * 100)) + "\" style=\"width:" + pct + "%\"></b></i>" +
      "<em>" + lab + (row.n ? " · " + row.n + " 人" : "") + "</em></button>";
  }).join("");
  const ratedAxes = axes.filter(function (row) { return row.L != null; }).slice().sort(function (a, b) { return b.L - a.L; });
  if (ratedAxes.length) {
    const best = ratedAxes[0], worst = ratedAxes[ratedAxes.length - 1];
    document.getElementById("classAxes").innerHTML += "<p class=\"hint\">最強：" + esc(best.ax.name.replace("\u3000", " ")) + " " + Math.round(best.L * 100) + "%　最弱：" + esc(worst.ax.name.replace("\u3000", " ")) + " " + Math.round(worst.L * 100) + "%</p>";
  }
  const topicRows = [];
  axisList.forEach(function (ax) {
    ax.topics.filter(function (t) { return !skipOldTopic(t) && paperHasTopic(paper, ax.part, t); }).forEach(function (t) {
      const a = classTopicAvg(people, ax.part, t, paper);
      if (a.L == null) return;
      const markedPeople = people.filter(function (n) { return topicAbilityOf(db.profiles[n], ax.part, t, paper).n > 0; }).length;
      const worst = topWrong(people, itemsForTopic(ax.part, t, paper), 1)[0];
      const hk = topicHkAvg(ax.part, t, paper);
      topicRows.push({ part: ax.part, topic: t, L: a.L, n: a.n, markedPeople: markedPeople, worst: worst, hk: hk });
    });
  });
  const ranked = topicRows.slice().sort(function (a, b) { return a.L - b.L; });
  const weak = ranked.slice(0, 10);
  const weakKey = {};
  weak.forEach(function (x) { weakKey[x.part + "\n" + x.topic] = 1; });
  const strong = topicRows.slice().sort(function (a, b) { return b.L - a.L; }).filter(function (x) { return !weakKey[x.part + "\n" + x.topic]; }).slice(0, 10);
  const topicTable = function (list, empty) {
    if (!list.length) return "<p class=\"hint\">" + empty + "</p>";
    return "<div style=\"overflow:auto\"><table class=\"data-table\"><thead><tr><th>課題</th><th>" + (useScoreMetric() ? "班得分" : "班掌握") + "</th><th>全港得分</th><th>已標人數</th><th>最多人錯</th></tr></thead><tbody>" +
      list.map(function (x) {
        return "<tr class=\"clickable" + (prefs.classTopic === x.topic && prefs.classPart === x.part ? " on-row" : "") + "\" data-class-topic=\"" + esc(x.topic) + "\" data-class-part=\"" + x.part + "\">" +
          "<td>" + esc(topicLabel(x.topic)) + "</td>" +
          "<td class=\"" + bandClass(x.L * 100) + "\">" + Math.round(x.L * 100) + "%" + (useScoreMetric() ? gapBarHtml(x.L, x.hk) : "") + "</td>" +
          "<td class=\"" + (x.hk == null ? "" : bandClass(x.hk * 100)) + "\">" + (x.hk == null ? "—" : Math.round(x.hk * 100) + "%") + "</td>" +
          "<td>" + x.markedPeople + "／" + people.length + "</td>" +
          "<td>" + (x.worst ? qJumpHtml(x.worst) : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  };
  if (paper !== "m1") document.getElementById("classTopics").innerHTML =
    "<div class=\"class-sw\"><div><b>強課題</b>" + topicTable(strong, "強課題未夠，或已出現在弱課題。") + "</div>" +
    "<div><b>弱課題</b>" + topicTable(weak, "弱課題未夠人標。") + "</div></div>" +
    "<p class=\"hint\">入圍＝已標 ≥" + minN + " 題（" + eligible.length + "／" + people.length + "）。未做唔入平均。錯題只計唔識。掌握格的棒：右高全港，左低全港。每邊最多 10 個。</p>";
  const axis = axisList.find(function (a) { return a.id === prefs.classAxis; });
  const drill = document.getElementById("classDrill");
  if (paper === "m1") drill.innerHTML = "";
  else if (prefs.classLow) {
    drill.innerHTML = "<h3 class=\"sec-title\">標少過 " + minN + " 題　" + esc(cls || "未分班") + "</h3>" +
      "<p class=\"hint\">計人數、唔入軸平均。撳名去能力頁。</p>" +
      "<div class=\"class-people\">" + (low.length ? low.map(function (n) {
        return "<button type=\"button\" class=\"class-person dim\" data-go-stu=\"" + esc(n) + "\"><b>" + esc(n) + "</b><span>標 " + markedCountOf(db.profiles[n], paper) + "</span></button>";
      }).join("") : "<p class='hint'>全員已入圍。</p>") + "</div>";
  } else if (prefs.classTopic && prefs.classPart) {
    const rows = people.map(function (n) {
      const ab = topicAbilityOf(db.profiles[n], prefs.classPart, prefs.classTopic, paper);
      return { n: n, L: ab.L, marked: ab.n };
    }).sort(function (a, b) { return (a.L == null ? 1 : 0) - (b.L == null ? 1 : 0) || (a.L || 0) - (b.L || 0); });
    drill.innerHTML = "<h3 class=\"sec-title\">" + esc(topicLabel(prefs.classTopic)) + "</h3>" +
      "<p class=\"hint\">弱 → 強。未做唔評。撳名去能力頁。</p>" +
      "<div class=\"class-people\">" + rows.map(function (r) {
        return "<button type=\"button\" class=\"class-person" + (r.L == null ? " dim" : "") + "\" data-go-stu=\"" + esc(r.n) + "\"><b>" + esc(r.n) + "</b><span>" + (r.L == null ? "未評" : Math.round(r.L * 100) + "%") + "　標 " + r.marked + "</span></button>";
      }).join("") + "</div>";
  } else if (!axis) drill.innerHTML = "";
  else {
    const rows = people.map(function (n) {
      const pr = db.profiles[n];
      const sc = axisScoreOf(pr, axis, paper);
      const ok = classEligible(pr, paper);
      return { n: n, L: sc.L, ok: ok, marked: markedCountOf(pr, paper) };
    }).sort(function (a, b) { return (a.L == null ? 1 : 0) - (b.L == null ? 1 : 0) || (a.L || 0) - (b.L || 0); });
    const wrongs = topWrong(people, itemsForAxis(axis, paper), 3);
    drill.innerHTML = "<h3 class=\"sec-title\">" + esc(axis.name) + "　" + esc(cls || "未分班") + "</h3>" +
      "<p class=\"hint\">弱 → 強。撳名去該學生能力頁。</p>" +
      "<div class=\"class-people\">" + rows.map(function (r) {
        return "<button type=\"button\" class=\"class-person" + (r.ok ? "" : " dim") + "\" data-go-stu=\"" + esc(r.n) + "\"><b>" + esc(r.n) + "</b><span>" + (r.L == null ? "未評" : Math.round(r.L * 100) + "%") + "　標 " + r.marked + "</span></button>";
      }).join("") + "</div>" +
      "<p class=\"hint\">最多人錯（唔識；未做唔算）</p>" +
      "<div class=\"class-wrong\">" + (wrongs.length ? wrongs.map(qJumpHtml).join(" ") : "未夠人標。") + "</div>";
  }
  const allCls = classNames();
  const tableEl = document.getElementById("classMatrix");
  if (!allCls.length) tableEl.innerHTML = "<p class='hint'>未有班。上面新增班名，再喺學生列分班。</p>";
  else {
    let html = "<table class=\"data-table\"><thead><tr><th>軸</th>" + allCls.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
    axisList.forEach(function (ax) {
      html += "<tr><td>" + esc(ax.name) + "</td>";
      allCls.forEach(function (c) {
        const a = classAxisAvg(peopleOfClass(c), ax, paper);
        html += "<td>" + (a.L == null ? "—" : Math.round(a.L * 100) + "%") + "</td>";
      });
      html += "</tr>";
    });
    tableEl.innerHTML = html + "</tbody></table>";
  }
  const ySel = document.getElementById("classYear");
  if (ySel && !ySel.dataset.ready) {
    ySel.innerHTML = YEARS.slice().reverse().map(function (y) { return "<option value=\"" + y + "\">" + y + "</option>"; }).join("");
    ySel.dataset.ready = "1";
  }
  if (ySel && YEARS.includes(+prefs.classYear)) ySel.value = String(prefs.classYear);
  const year = +(ySel && ySel.value) || YEARS[YEARS.length - 1];
  prefs.classYear = year;
  const scoreEl = document.getElementById("classScores");
  if (scoreEl) {
    const rows = people.map(function (n) {
      const p1 = paperScoreOf(n, "p1", year);
      const p2 = paperScoreOf(n, "p2", year);
      const m1 = paperScoreOf(n, "m1", year);
      const m2 = paperScoreOf(n, "m2", year);
      const cp = p1 != null && p2 != null ? corePct(year, p1, p2) : null;
      let coreLv = "—";
      if (p1 == null && p2 == null) coreLv = "—";
      else if (p1 == null || p2 == null) coreLv = "未齊";
      else coreLv = cp == null ? "資料未齊" : estimateShort("core", year, cp);
      const m2Lv = m2 == null ? "—" : estimateShort("m2", year, m2);
      return { n: n, p1: p1, p2: p2, m1: m1, m2: m2, cp: cp, coreLv: coreLv, m2Lv: m2Lv };
    });
    const showM1Box = paper === "m1";
    const showM1Col = rows.some(function (r) { return r.m1 != null; });
    const p1s = rows.map(function (r) { return r.p1; }).filter(function (v) { return v != null; });
    const p2s = rows.map(function (r) { return r.p2; }).filter(function (v) { return v != null; });
    const m1s = rows.map(function (r) { return r.m1; }).filter(function (v) { return v != null; });
    const m2s = rows.map(function (r) { return r.m2; }).filter(function (v) { return v != null; });
    const avg = function (a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; };
    const box = function (lab, v, pct) {
      return "<div class=\"stat\"><b class=\"" + (pct == null ? "" : bandClass(pct)) + "\">" + (v == null ? "—" : Math.round(v * 10) / 10) + "</b><span>" + lab + "</span></div>";
    };
    const lvCount = {};
    rows.forEach(function (r) {
      const key = paper === "m2" ? r.m2Lv : paper === "m1" ? (r.m1 == null ? "—" : estimateShort("m1", year, r.m1)) : r.coreLv;
      lvCount[key] = (lvCount[key] || 0) + 1;
    });
    const lvLine = Object.keys(lvCount).map(function (k) { return k + "×" + lvCount[k]; }).join("、");
    const p1Avg = avg(p1s), p2Avg = avg(p2s), m1Avg = avg(m1s), m2Avg = avg(m2s);
    const sel = paper === "p2" ? p2s : paper === "m1" ? m1s : paper === "m2" ? m2s : p1s;
    const medLab = paper === "p2" ? "卷二中位" : paper === "m1" ? "M1 中位" : paper === "m2" ? "M2 中位" : "卷一中位";
    const statsHtml = "<div class=\"stats tight\">" +
      box("卷一平均", p1Avg, p1Avg == null ? null : p1Avg / 105 * 100) +
      box("卷二平均", p2Avg, p2Avg == null ? null : p2Avg / 45 * 100) +
      (showM1Box ? box("M1 平均", m1Avg, m1Avg) : "") +
      box("M2 平均", m2Avg, m2Avg) +
      box(medLab, medianNums(sel), null) + "</div>" +
      "<p class=\"hint\">等級分佈：" + (lvLine || "—") + "。無分唔當 0。中位跟所選卷，雙數取中間兩人平均。</p>";
    const m1Lv = function (r) { return r.m1 == null ? "—" : estimateShort("m1", year, r.m1); };
    scoreEl.innerHTML = classChartsHtml(people, paper, year, statsHtml) +
      "<table class=\"data-table\"><thead><tr><th>學生</th><th>卷一</th><th>卷二</th><th>必修％</th><th>必修等級</th>" +
      (showM1Col ? "<th>M1</th><th>M1等級</th>" : "") + "<th>M2</th><th>M2等級</th></tr></thead><tbody>" +
      rows.map(function (r) {
        return "<tr><td>" + esc(r.n) + "</td><td>" + (r.p1 == null ? "—" : r.p1) + "</td><td>" + (r.p2 == null ? "—" : r.p2) + "</td><td class=\"" + (r.cp == null ? "" : bandClass(r.cp)) + "\">" + (r.cp == null ? "—" : Math.round(r.cp) + "%") + "</td><td>" + r.coreLv + "</td>" +
          (showM1Col ? "<td>" + (r.m1 == null ? "—" : r.m1) + "</td><td>" + m1Lv(r) + "</td>" : "") +
          "<td>" + (r.m2 == null ? "—" : r.m2) + "</td><td>" + r.m2Lv + "</td></tr>";
      }).join("") + "</tbody></table>";
  }
  const roster = document.getElementById("classRoster");
  if (roster) {
    const all = Object.keys(db.profiles);
    const clsOpts = "<option value=\"\">未分班</option>" + classNames().map(function (c) { return "<option value=\"" + esc(c) + "\">" + esc(c) + "</option>"; }).join("");
    roster.innerHTML = "<h3 class=\"sec-title\">學生</h3>" +
      "<div class=\"toolbar\"><label>調去 <select id=\"classMoveTo\">" + clsOpts + "</select></label>" +
      "<button type=\"button\" class=\"ghost\" id=\"classMoveBtn\">套用已剔</button></div>" +
      "<div style=\"overflow:auto\"><table class=\"data-table\"><thead><tr><th></th><th>學生</th><th>班</th><th>已標</th><th>掌握％</th></tr></thead><tbody>" +
      all.map(function (n) {
        const pr = db.profiles[n];
        const mk = markedCountOf(pr, paper);
        let filled = 0, m3 = 0;
        YEARS.forEach(function (y) {
          allQs(paper, y).forEach(function (q) {
            const s = getCellOf(pr, paper, y, q).s;
            if (!s) return;
            filled++;
            if (s === 3) m3++;
          });
        });
        return "<tr><td><input type=\"checkbox\" class=\"roster-pick\" data-name=\"" + esc(n) + "\"></td>" +
          "<td class=\"clickable\" data-go-stu=\"" + esc(n) + "\">" + esc(n) + "</td>" +
          "<td>" + esc(pr.className || "未分班") + "</td><td>" + mk + "</td>" +
          "<td>" + (filled ? Math.round(m3 * 100 / filled) + "%" : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
}

function exportClassCsv() {
  const paper = classPaperId();
  const axisList = axesFor(paper);
  const lines = ["班,試卷,軸,平均％,入圍人數,班人數"];
  classNames().concat([""]).forEach(function (c) {
    const people = peopleOfClass(c);
    axisList.forEach(function (ax) {
      const a = classAxisAvg(people, ax, paper);
      lines.push([c || "未分班", paper, ax.name.replace("\u3000", " "), a.L == null ? "" : (Math.round(a.L * 1000) / 10), a.n, people.length].join(","));
    });
  });
  lines.push("");
  lines.push("班,試卷,部分,課題,平均％,入圍人數");
  classNames().forEach(function (c) {
    const people = peopleOfClass(c);
    axisList.forEach(function (ax) {
      ax.topics.filter(function (t) { return !skipOldTopic(t) && paperHasTopic(paper, ax.part, t); }).forEach(function (t) {
        const a = classTopicAvg(people, ax.part, t, paper);
        if (a.L == null) return;
        lines.push([c, paper, ax.part, t, Math.round(a.L * 1000) / 10, a.n].join(","));
      });
    });
  });
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "dse-math-class.csv";
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
}

function jumpTrackerTopic(paper, topic) {
  const prevPaper = currentPaper, prevTopic = topicFilter, prevCell = cellFilter;
  currentPaper = paper;
  topicFilter = topic;
  cellFilter = "all";
  let yHit = 0;
  for (let i = 0; i < yearsDesc().length; i++) {
    const y = yearsDesc()[i];
    if (visQs(y, allQs(paper, y)).length) { yHit = y; break; }
  }
  if (!yHit) {
    currentPaper = prevPaper;
    topicFilter = prevTopic;
    cellFilter = prevCell;
    askBox({ notice: true, text: "呢個課題而家篩選下冇題。" });
    return;
  }
  showView("tracker");
  requestAnimationFrame(function () { scrollToYear(yHit); });
}

function cellHtml(y, q) {
  const c = getCell(currentPaper, y, q);
  const sel = selected.has(y + ":" + q) ? "sel" : "";
  const dim = matchFilter(c) ? "" : "dim";
  const hit = showHit && !yearHitOff[y]
    ? (currentPaper === "p2" ? p2Hit(y, q) : currentPaper === "m2" ? m2HitPct(y, q) : null)
    : null;
  const b = bandOf(hit);
  const hitHtml = hit != null ? "<span class=\"hit " + b + "\">" + String(Math.round(hit)).padStart(2, "0") + "</span>" : "";
  const qn = "<span class=\"qn\" style=\"cursor:default;text-decoration:none;color:var(--muted)\">" + q + "</span>";
  const sk = syllKind(currentPaper, y, q);
  const syllCls = sk === "old" ? " syll-old" : sk === "part" ? " syll-part" : "";
  const mingCls = isMing(c) ? " ming" : "";
  const syllTitle = sk === "old" ? "舊課程" : sk === "part" ? "部分舊課程" : "";
  const mingTitle = isMing(c) ? "明返" : "";
  const title = [syllTitle, mingTitle].filter(Boolean).join(" · ");
  return "<div class=\"qcell " + dim + "\">" + qn +
    "<div class=\"cell " + (STATE_CLASS[c.s] || "") + " " + sel + syllCls + mingCls + "\" data-y=\"" + y + "\" data-q=\"" + q + "\"" + (title ? " title=\"" + title + "\"" : "") + ">" + hitHtml + "</div>" +
    "<button class=\"pencil " + (hasNote(c) ? "filled" : "") + "\" data-note=\"" + y + ":" + q + "\" title=\"筆記\">✎</button></div>";
}

const _renderGrid = window.renderGrid;
window.renderGrid = function () {
  if (typeof _renderGrid === "function") _renderGrid();
  if (currentPaper !== "m2") return;
  document.querySelectorAll("#grid .year-block").forEach(function (block) {
    const head = block.querySelector(".year-head");
    if (!head || head.querySelector("[data-toggle-hit]")) return;
    const y = block.dataset.year;
    const btn = document.createElement("button");
    btn.className = "ghost";
    btn.dataset.toggleHit = y;
    btn.textContent = yearHitOff[y] ? "顯示得分率" : "隱藏得分率";
    head.appendChild(btn);
  });
};

function m2TopicForSub(year, sub) {
  const key = normQLabel(sub);
  const hit = m2Items().find(function (x) { return x.y === year && normQLabel(x.sub) === key; });
  if (!hit) return "";
  return topicLabel(hit.topic);
}

function paintItemP1TopicBtn() {
  const btn = document.getElementById("itemP1TopicBtn");
  if (!btn) return;
  const paper = document.getElementById("itemPaper").value;
  btn.hidden = paper !== "p1" && paper !== "m2";
  const on = !!prefs.itemP1Topics;
  if (paper === "m2") btn.textContent = on ? "顯示 M2 課題　開" : "顯示 M2 課題　關";
  else btn.textContent = on ? "顯示卷一課題　開" : "顯示卷一課題　關";
  btn.classList.toggle("on-toggle", on);
}

function renderItemYear(focusSec) {
  const paper = document.getElementById("itemPaper").value;
  const year = +document.getElementById("itemYear").value;
  paintItemP1TopicBtn();
  document.getElementById("itemYearHead").textContent = paper === "p2"
    ? "單年課題命中率（" + year + "）（平均命中率）"
    : "單年分題（" + year + "）（卷序）";
  if (paper === "p2") {
    const rows = (P2_TOPICS.freq || []).map(function (f) {
      return { part: f.part, topic: f.topic, avg: topicYearAvg(year, f.topic) };
    }).filter(function (r) { return r.avg != null; });
    const buckets = { hi: [], mid: [], lo: [] };
    rows.forEach(function (r) { buckets[bandOf(r.avg)].push(r); });
    const block = function (title, key) {
      const list = buckets[key];
      return "<h3 class=\"sec-title\">" + title + "（" + list.length + "）</h3>" +
        (list.length ? "<table class=\"data-table\"><thead><tr><th>部</th><th>課題</th><th>平均命中率</th></tr></thead><tbody>" +
          list.map(function (r) {
            return "<tr class=\"" + bandClass(r.avg) + "\"><td>" + r.part + "</td><td>" + esc(r.topic) + "</td><td>" + Math.round(r.avg) + "%</td></tr>";
          }).join("") + "</tbody></table>" : "<p class=\"hint\">無</p>");
    };
    document.getElementById("itemYearView").innerHTML = rows.length
      ? block("≥ 60% 課題", "hi") + block("41%–59% 課題", "mid") + block("≤ 40% 課題", "lo") +
        "<p class=\"hint\"><button class=\"ghost\" id=\"jumpMcYear\">去 MC 查 " + year + "</button></p>"
      : "<p class=\"hint\">" + year + " 未有命中率。</p>";
    return;
  }
  const pack = ITEM_STATS[paper] && ITEM_STATS[paper][String(year)];
  if (!pack) {
    document.getElementById("itemYearView").innerHTML = "<p class=\"hint\">" + year + " 未有分題數據。</p>";
    return;
  }
  const groups = {};
  pack.parts.forEach(function (p) {
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
  const showT = (paper === "p1" || paper === "m2") && !!prefs.itemP1Topics;
  let html = "";
  order.forEach(function (g) {
    const list = groups[g] || [];
    html += "<div class=\"year-block\" id=\"item-sec-" + g + "\"><div class=\"year-head\"><b>" + g + "</b></div>" +
      "<table class=\"data-table\"><thead><tr><th>題</th><th>滿分</th><th>平均分</th>" + (showT ? "<th>課題</th>" : "") + "</tr></thead><tbody>";
    list.forEach(function (p) {
      const topic = showT ? (paper === "m2" ? m2TopicForSub(year, p.q) : p1TopicForSub(year, p.q)) : "";
      html += "<tr class=\"" + bandClass(p.pct) + "\"><td>" + esc(normQLabel(p.q)) + "</td><td>" + p.full + "</td><td>" +
        (p.mean == null ? "-" : fmt1(p.mean)) + "</td>" + (showT ? "<td>" + esc(topic) + "</td>" : "") + "</tr>";
    });
    html += "</tbody></table></div>";
  });
  document.getElementById("itemYearView").innerHTML = html;
  if (focusSec) {
    const el = document.getElementById("item-sec-" + focusSec);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

(function bindM2Ui() {
  const loadDemoBtn = document.getElementById("loadDemoBtn");
  if (loadDemoBtn && !loadDemoBtn.dataset.bound) {
    loadDemoBtn.dataset.bound = "1";
    loadDemoBtn.onclick = function () {
      fetch("./samples/dse-math-tracker-示範五人.json?v=20261006b")
        .then(function (r) { if (!r.ok) throw new Error("示範檔讀唔到"); return r.json(); })
        .then(function (incoming) {
          const src = incoming.profiles || {};
          Object.keys(src).forEach(function (name) {
            const p = src[name];
            db.profiles[name] = {
              name: name,
              className: p.className || "示範班",
              cells: p.cells || {},
              scores: p.scores || {},
              dates: p.dates || {},
              times: p.times || {},
              updatedAt: p.updatedAt || Date.now()
            };
            if (typeof ensureClassName === "function") ensureClassName(p.className || "示範班");
          });
          currentProfile = db.profiles["示範甲"] ? "示範甲" : currentProfile;
          prefs.classSel = "示範班";
          prefs.classPaper = prefs.classPaper || "p1";
          savePrefs();
          if (typeof saveDb === "function") saveDb();
          if (typeof refreshAfterProfile === "function") refreshAfterProfile();
          if (typeof showView === "function") showView("class");
        })
        .catch(function () { askBox({ notice: true, text: "示範班載入失敗，請再試。" }); });
    };
  }
  const classPaper = document.getElementById("classPaperChips");
  if (classPaper && !classPaper.dataset.bound) {
    classPaper.dataset.bound = "1";
    classPaper.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-class-paper]");
      if (!btn) return;
      prefs.classPaper = btn.dataset.classPaper;
      prefs.classAxis = "";
      prefs.classTopic = "";
      prefs.classPart = "";
      prefs.classLow = false;
      savePrefs();
      renderClassPage();
    });
  }
  document.querySelectorAll("#classMetric, #weakMetric").forEach(function (box) {
    box.querySelectorAll("[data-metric]").forEach(function (btn) {
      btn.classList.toggle("on", btn.dataset.metric === (prefs.metric === "know" ? "know" : "score"));
    });
  });
  document.querySelectorAll("#classMetric, #weakMetric").forEach(function (box) {
    if (box.dataset.bound) return;
    box.dataset.bound = "1";
    box.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-metric]");
      if (!btn) return;
      prefs.metric = btn.dataset.metric === "know" ? "know" : "score";
      savePrefs();
      if (typeof renderWeak === "function") renderWeak();
      if (typeof renderClassPage === "function") renderClassPage();
    });
  });
  const axisLegend = document.getElementById("axisLegend");
  if (axisLegend && !axisLegend.dataset.m2Jump) {
    axisLegend.dataset.m2Jump = "1";
    axisLegend.addEventListener("click", function (e) {
      const chip = e.target.closest("[data-jump-topic]");
      if (!chip) return;
      const paper = weakPaperId();
      if (paper !== "m2" && paper !== "p1") return;
      e.stopImmediatePropagation();
      jumpTrackerTopic(paper, chip.dataset.jumpTopic);
    }, true);
  }
  const weakBox = document.getElementById("weakBox");
  if (weakBox && !weakBox.dataset.m2Jump) {
    weakBox.dataset.m2Jump = "1";
    weakBox.addEventListener("click", function (e) {
      const jump = e.target.closest("[data-jump]");
      if (!jump) return;
      if (jump.dataset.jumpPaper !== "m2") return;
      e.stopImmediatePropagation();
      const parts = jump.dataset.jump.split(":");
      jumpToTrackerCell("m2", parts[0], parts[1]);
    }, true);
  }
  try {
    if (typeof currentView !== "undefined" && currentView === "ability" && typeof renderWeak === "function") renderWeak();
    if (typeof currentView !== "undefined" && currentView === "class" && typeof renderClassPage === "function") renderClassPage();
    if (typeof currentView !== "undefined" && currentView === "items" && typeof renderItemTopics === "function") renderItemTopics();
  } catch (err) {}
})();
