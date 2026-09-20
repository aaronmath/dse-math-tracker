/* Last-load M2 UI overlay: 明返點、能力跳轉、全港％、班況 M2、全港平均課題欄 */
function classPaperId() {
  return prefs.classPaper === "p2" || prefs.classPaper === "m2" ? prefs.classPaper : "p1";
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

function axisScore(axis) {
  const paper = weakPaperId();
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
    const hk = axisHkFromItems(items, "p1");
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
    const hk = axisHkFromItems(items, "m2");
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
  const hk = axisHkFromItems(items, "p2");
  if (n < 4) return { n: n, L: null, hk: hk };
  return { n: n, L: sum / n, hk: hk };
}

function axisScoreOf(pr, axis, paper) {
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
  if (prefs.hkRef) {
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
  const cap = cmpPeople && cmpPeople.length ? "藍＝呢班　玫紅虛線＝疊班　灰虛線＝全港" : "實色＝班平均　虛線＝全港參照";
  return "<svg viewBox=\"0 0 340 340\" class=\"radar-draw\">" + rings + spokes + hk + cmp + stu + labels +
    "<text x=\"170\" y=\"318\" text-anchor=\"middle\" font-size=\"11\" fill=\"#6b645b\">" + cap + "</text></svg>";
}

function renderClassPage() {
  if (!classUnlocked()) return;
  const paper = classPaperId();
  const axisList = axesFor(paper);
  const minN = classMinFor(paper);
  const paperSel = document.getElementById("classPaper");
  if (paperSel) paperSel.value = paper;
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
  document.getElementById("classRadar").innerHTML = classRadarHtml(people, paper, cmpPeople);
  const axes = axisList.map(function (ax) {
    const a = classAxisAvg(people, ax, paper);
    return { ax: ax, L: a.L, n: a.n };
  });
  document.getElementById("classAxes").innerHTML = axes.map(function (row, i) {
    const pct = row.L == null ? 0 : Math.round(row.L * 100);
    const lab = row.L == null ? "未評" : pct + "%";
    const on = prefs.classAxis === row.ax.id ? " on" : "";
    return "<button type=\"button\" class=\"class-axis" + on + "\" data-axis=\"" + row.ax.id + "\" style=\"--d:" + (i * 35) + "ms\">" +
      "<span>" + esc(row.ax.name) + "</span>" +
      "<i class=\"bar-track\"><b class=\"class-bar\" style=\"width:" + pct + "%\"></b></i>" +
      "<em>" + lab + (row.n ? " · " + row.n + " 人" : "") + "</em></button>";
  }).join("");
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
  const weak = ranked.slice(0, 5);
  const strong = topicRows.slice().sort(function (a, b) { return b.L - a.L; }).slice(0, 3);
  const weakTable = weak.length
    ? "<div style=\"overflow:auto\"><table class=\"data-table\"><thead><tr><th>課題</th><th>班掌握</th><th>全港得分</th><th>已標人數</th><th>最多人錯</th></tr></thead><tbody>" +
      weak.map(function (x) {
        return "<tr class=\"clickable" + (prefs.classTopic === x.topic && prefs.classPart === x.part ? " on-row" : "") + "\" data-class-topic=\"" + esc(x.topic) + "\" data-class-part=\"" + x.part + "\">" +
          "<td>" + esc(topicLabel(x.topic)) + "</td>" +
          "<td>" + Math.round(x.L * 100) + "%</td>" +
          "<td>" + (x.hk == null ? "—" : Math.round(x.hk * 100) + "%") + "</td>" +
          "<td>" + x.markedPeople + "／" + people.length + "</td>" +
          "<td>" + (x.worst ? qJumpHtml(x.worst) : "—") + "</td></tr>";
      }).join("") +
      "</tbody></table></div>"
    : "<p class=\"hint\">弱課題未夠人標。</p>";
  document.getElementById("classTopics").innerHTML =
    "<div class=\"class-sw\"><div><b>強</b><ul>" + (strong.length ? strong.map(function (x) {
      return "<li>" + esc(topicLabel(x.topic)) + "　" + Math.round(x.L * 100) + "%</li>";
    }).join("") : "<li>標記未夠</li>") + "</ul></div>" +
    "<div><b>弱課題</b>" + weakTable + "</div></div>" +
    "<p class=\"hint\">入圍＝已標 ≥" + minN + " 題（" + eligible.length + "／" + people.length + "）。未做唔入平均。錯題只計唔識。</p>";
  const axis = axisList.find(function (a) { return a.id === prefs.classAxis; });
  const drill = document.getElementById("classDrill");
  if (prefs.classLow) {
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
    scoreEl.innerHTML = "<p class=\"hint\">分數一覽（課題軸見上方雷達）。</p>" +
      "<table class=\"data-table\"><thead><tr><th>學生</th><th>必修綜合</th><th>等級</th><th>M1</th><th>M2</th></tr></thead><tbody>" +
      people.map(function (n) {
        const keep = currentProfile;
        currentProfile = n;
        const p1 = getScore("p1", year), p2 = getScore("p2", year);
        const cp = corePct(year, p1, p2);
        const lv = cp == null ? "—" : estimateShort("core", year, cp);
        const m1 = getScore("m1", year), m2 = getScore("m2", year);
        currentProfile = keep;
        return "<tr><td>" + esc(n) + "</td><td>" + (cp == null ? "—" : Math.round(cp) + "%") + "</td><td>" + lv + "</td><td>" + (m1 === "" ? "—" : m1) + "</td><td>" + (m2 === "" ? "—" : m2) + "</td></tr>";
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
    alert("呢個課題而家篩選下冇題。");
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
  const classPaper = document.getElementById("classPaper");
  if (classPaper) {
    classPaper.onchange = function (e) {
      const v = e.target.value;
      prefs.classPaper = v === "p2" || v === "m2" ? v : "p1";
      prefs.classAxis = "";
      prefs.classTopic = "";
      prefs.classPart = "";
      prefs.classLow = false;
      savePrefs();
      renderClassPage();
    };
  }
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
