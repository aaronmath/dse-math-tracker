function topicAbility(part, topic) {
  const paper = weakPaperId();
  if (paper === "m2") {
    const items = m2Items().filter(x => x.topic === topic);
    let sum = 0, w = 0;
    const seen = new Set();
    items.forEach(x => {
      const c = getCell("m2", x.y, x.q);
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
    if (seenQ.size < axisMinN(paper)) return { n: seenQ.size, L: null, hk: null };
    return { n: seenQ.size, L: wsum ? sum / wsum : null, hk: hkW ? hkSum / hkW : null };
  }
  if (paper === "m2") {
    const items = m2Items().filter(x => axis.topics.includes(x.topic));
    let sum = 0, wsum = 0, hkSum = 0, hkW = 0;
    const seenQ = new Set();
    items.forEach(x => {
      const c = getCell("m2", x.y, x.q);
      if (!c.s) return;
      const w = c.s === 3 ? 1 : c.s === 2 ? 0.5 : 0;
      const m = x.marks || 0;
      sum += w * m;
      wsum += m;
      seenQ.add(x.y + ":" + x.q);
      if (x.hk != null && x.hk !== "" && m) { hkSum += Number(x.hk); hkW += m; }
    });
    if (seenQ.size < axisMinN(paper)) return { n: seenQ.size, L: null, hk: null };
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

function renderRadar() {
  const cx = 170, cy = 170, r = 112;
  const paper = weakPaperId();
  const axes = axesFor(paper);
  const scores = axes.map(axisScore);
  const N = axes.length;
  let rings = "";
  [0.25, 0.5, 0.75, 1].forEach(k => {
    const pts = radarPolyRated(Array(N).fill(k), cx, cy, r).join(" ");
    rings += "<polygon points=\"" + pts + "\" fill=\"none\" stroke=\"#e4ddd2\" stroke-width=\"1\"/>";
  });
  [[0.4, "#e0b8b0", "1.5"], [0.6, "#b7d0b3", "1.5"]].forEach(function (row) {
    const k = row[0], col = row[1], w = row[2];
    const pts = radarPolyRated(Array(N).fill(k), cx, cy, r).join(" ");
    rings += "<polygon points=\"" + pts + "\" fill=\"none\" stroke=\"" + col + "\" stroke-width=\"" + w + "\"/>";
  });
  let spokes = "", labels = "";
  axes.forEach((a, i) => {
    const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
    const x2 = cx + r * Math.cos(ang), y2 = cy + r * Math.sin(ang);
    spokes += "<line x1=\"" + cx + "\" y1=\"" + cy + "\" x2=\"" + x2.toFixed(1) + "\" y2=\"" + y2.toFixed(1) + "\" stroke=\"#e4ddd2\"/>";
    const lx = cx + (r + 22) * Math.cos(ang), ly = cy + (r + 22) * Math.sin(ang);
    const short = a.name.replace("\u3000", " ");
    labels += "<text x=\"" + lx.toFixed(1) + "\" y=\"" + ly.toFixed(1) + "\" text-anchor=\"middle\" font-size=\"10\" fill=\"" + (radarAxis === a.id ? "#3d6e8c" : "#1c1915") + "\" data-axis=\"" + a.id + "\" style=\"cursor:pointer\">" + esc(short) + "</text>";
  });
  const L = scores.map(s => s.L);
  const H = scores.map(s => s.hk);
  let stu = "", hk = "";
  const ratedL = radarPolyRated(L, cx, cy, r);
  if (ratedL.length >= 4) {
    stu = "<polygon class=\"radar-stu\" points=\"" + ratedL.join(" ") + "\" fill=\"rgba(61,110,140,.28)\" stroke=\"#3d6e8c\" stroke-width=\"2\"/>";
  } else {
    stu = radarSpokes(L, cx, cy, r, "#3d6e8c");
  }
  L.forEach((v, i) => {
    if (v != null) return;
    const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
    const ox = (cx + r * Math.cos(ang)).toFixed(1), oy = (cy + r * Math.sin(ang)).toFixed(1);
    stu += "<circle cx=\"" + ox + "\" cy=\"" + oy + "\" r=\"4\" class=\"miss\"/>";
  });
  if (prefs.hkRef) {
    const ratedH = radarPolyRated(H, cx, cy, r);
    if (ratedH.length >= 4) {
      hk = "<polygon points=\"" + ratedH.join(" ") + "\" fill=\"none\" stroke=\"#8a8178\" stroke-width=\"1.5\" stroke-dasharray=\"5 4\"/>";
    } else {
      hk = radarSpokes(H, cx, cy, r, "#8a8178", "5 4").replace(/fill="#8a8178"/g, 'fill="none" stroke="#8a8178"');
    }
  }
  const empty = markedPaperCount(weakPaperId()) === 0;
  const emptyHint = "去進度標記" + paperLabel(weakPaperId()) + "先出圖。";
  const drawKey = currentProfile + ":" + weakPaperId();
  const first = radarDrawn !== drawKey;
  if (!empty) radarDrawn = drawKey;
  document.getElementById("radarBox").innerHTML = empty
    ? "<p class=\"hint\">" + emptyHint + "</p>"
    : "<svg viewBox=\"0 0 340 340\" class=\"" + (first ? "radar-draw" : "") + "\">" + rings + spokes + hk + stu + labels +
      "<text x=\"170\" y=\"318\" text-anchor=\"middle\" font-size=\"11\" fill=\"#6b645b\">實色＝你嘅標記平均　虛線＝全港參照</text>" +
      "<text x=\"170\" y=\"332\" text-anchor=\"middle\" font-size=\"11\" fill=\"#6b645b\">紅線＝40%　綠線＝60%　卷一／M2 按分數加權</text></svg>";
  document.getElementById("axisLegend").innerHTML = axes.map((a, i) => {
    const sc = scores[i];
    const stuLab = sc.L == null ? "未評" : Math.round(sc.L * 100) + "%";
    const hkLab = sc.hk == null ? "—" : Math.round(sc.hk * 100) + "%";
    const chips = a.topics.filter(t => !skipOldTopic(t) && paperHasTopic(paper, a.part, t)).map(t => {
      const ab = topicAbility(a.part, t);
      const bc = abilityBand(ab.L);
      return "<button type=\"button\" class=\"tchip" + (bc ? " " + bc : "") + "\" data-jump-topic=\"" + esc(t) + "\">" + esc(topicLabel(t)) + "</button>";
    }).join("");
    return "<div class=\"axis-row" + (radarAxis === a.id ? " on" : "") + "\" data-axis=\"" + a.id + "\"><b>" + esc(a.name) + "\u3000" + esc(currentProfile) + " " + stuLab + "\u3000\u5168港 " + hkLab + (sc.n ? " \u00b7 " + sc.n + " 題" : "") + "</b>" + chips + "</div>";
  }).join("");
}

function axisBuckets() {
  const axes = axesFor(weakPaperId());
  const scores = axes.map(axisScore);
  const strong = [], weak = [], unrated = [];
  scores.forEach((sc, i) => {
    const ax = axes[i];
    const rec = {
      id: ax.id,
      name: ax.name.replace("\u3000", " "),
      part: ax.part,
      L: sc.L,
      hk: sc.hk,
      deep: ax.part === "乙",
      hkLow: sc.hk != null && sc.hk <= 0.4
    };
    rec.lab = sc.L == null ? "" : Math.round(sc.L * 100) + "%" + (sc.hk != null ? "（全港 " + Math.round(sc.hk * 100) + "%）" : "");
    if (sc.L == null) { unrated.push(rec); return; }
    const vsHk = sc.hk != null ? sc.L - sc.hk : 0;
    const hi = sc.L >= 0.6 || vsHk > 0.03;
    const lo = sc.L <= 0.4 || vsHk < -0.03;
    if (lo && !hi) weak.push(rec);
    else if (hi) strong.push(rec);
  });
  return { strong, weak, unrated, rated: axes.length - unrated.length };
}
