/* Compact M2 overlay — loaded after app.js */
var CLASS_MIN_M2 = 12;
var M2_AXES = [
  { id: "m2-base", name: "基礎知識", part: "M2", topics: ["數學歸納法","二項式定理"] },
  { id: "m2-trig", name: "三角學", part: "M2", topics: ["三角學"] },
  { id: "m2-diff", name: "微分", part: "M2", topics: ["基本原理","微分法","切線與法線","極值","變率","曲線描繪"] },
  { id: "m2-int", name: "積分", part: "M2", topics: ["不定積分","積分求方程","定積分","面積與體積"] },
  { id: "m2-alg", name: "矩陣與方程組", part: "M2", topics: ["行列式","矩陣","線性方程組"] },
  { id: "m2-vec", name: "向量", part: "M2", topics: ["向量簡介","向量的應用"] }
];
var M2_TOPIC_ORDER = ["數學歸納法","二項式定理","三角學","基本原理","微分法","切線與法線","極值","變率","曲線描繪","不定積分","積分求方程","定積分","面積與體積","行列式","矩陣","線性方程組","向量簡介","向量的應用"];
var M2_FILTER_ALIAS = { "定積分": ["定積分","面積與體積"] };
var M2_TOPIC_LABEL = { "切線與法線": "切線" };
var TOPIC_EN = {
  "指數": "Indices", "主項變換": "Change of subject", "因式分解": "Factorization", "代數分式": "Algebraic fractions",
  "不等式": "Inequalities", "百分數": "Percentages", "恆等式": "Identities", "量度與誤差": "Measurement and errors",
  "聯立方程": "Simultaneous equations", "函數": "Functions", "二次方程": "Quadratic equations", "數列": "Sequences",
  "率與比": "Rates and ratios", "二次函數圖像": "Graphs of quadratic functions", "多項式": "Polynomials",
  "極坐標": "Polar coordinates", "變分": "Variations", "面積與體積": "Areas and volumes", "扇形": "Sectors",
  "直線圖形：角度": "Rectilinear figures: angles", "直線圖形：長度與面積": "Rectilinear figures: lengths and areas",
  "多邊形": "Polygons", "對稱": "Symmetry", "面積比": "Area ratios", "全等與相似三角形": "Congruent and similar triangles",
  "三角函數": "Trigonometric functions", "三角學（甲部）": "Trigonometry (Section A)", "坐標幾何：點": "Coordinate geometry: points",
  "圓的性質": "Properties of circles", "直線方程": "Equations of straight lines", "圓方程": "Equations of circles", "軌跡": "Locus",
  "概率": "Probability", "統計": "Statistics", "進制": "Numeral systems", "複數": "Complex numbers",
  "H.C.F./L.C.M.": "H.C.F. / L.C.M.", "圖像變換": "Transformation of graphs", "續方程": "More about equations",
  "指數與對數": "Exponentials and logarithms", "圖像軸的變換": "Change of axes", "線性規劃": "Linear programming",
  "三角學（乙部）": "Trigonometry (Section B)", "立體三角": "3-D trigonometry", "三角形的心": "Centres of a triangle",
  "排列組合": "Permutations and combinations", "數學歸納法": "Mathematical induction", "二項式定理": "Binomial theorem",
  "三角學": "Trigonometry", "基本原理": "Differentiation from first principles", "微分法": "Rules of differentiation",
  "切線與法線": "Tangents and normals", "極值": "Maxima and minima", "變率": "Rates of change", "曲線描繪": "Curve sketching",
  "不定積分": "Indefinite integration", "積分求方程": "Equations of curves by integration", "定積分": "Definite integration",
  "行列式": "Determinants", "矩陣": "Matrices", "線性方程組": "Systems of linear equations",
  "向量簡介": "Introduction to vectors", "向量的應用": "Applications of vectors"
};
var AXIS_EN = {
  "甲　數與代數": "甲 Number and Algebra",
  "甲　度量圖形": "甲 Measures and Figures",
  "甲　坐標幾何": "甲 Coordinate Geometry",
  "甲　統計與概率": "甲 Statistics and Probability",
  "乙　數與代數": "乙 Number and Algebra",
  "乙　圖形與幾何": "乙 Geometry",
  "乙　坐標幾何": "乙 Coordinate Geometry",
  "乙　統計與概率": "乙 Statistics and Probability",
  "基礎知識": "Foundation",
  "三角學": "Trigonometry",
  "微分": "Differentiation",
  "積分": "Integration",
  "矩陣與方程組": "Matrices and Systems",
  "向量": "Vectors"
};
function topicLabel(t) {
  if (t && typeof prefs !== "undefined" && prefs.lang === "en" && TOPIC_EN[t]) return TOPIC_EN[t];
  return (M2_TOPIC_LABEL && M2_TOPIC_LABEL[t]) || t;
}
function axisLabel(name) {
  const raw = String(name || "");
  const key = raw.replace(/ /g, "\u3000");
  if (typeof prefs !== "undefined" && prefs.lang === "en" && AXIS_EN[key]) return AXIS_EN[key];
  return raw.replace(/\u3000/g, " ");
}
function paintLang() {
  document.querySelectorAll("#langSeg [data-lang]").forEach(function (btn) {
    btn.classList.toggle("on", btn.dataset.lang === (prefs.lang === "en" ? "en" : "zh"));
  });
}
function bindLang() {
  const box = document.getElementById("langSeg");
  if (!box || box.dataset.bound) return;
  box.dataset.bound = "1";
  box.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-lang]");
    if (!btn) return;
    prefs.lang = btn.dataset.lang === "en" ? "en" : "zh";
    savePrefs();
    paintLang();
    if (typeof showView === "function") showView(currentView || "tracker");
  });
  paintLang();
}
bindLang();
if (typeof TOPIC_ORDER === "object") TOPIC_ORDER.M2 = M2_TOPIC_ORDER;
function classMinFor(paper) { return paper === "m2" ? CLASS_MIN_M2 : CLASS_MIN; }
function axisMinN(paper) { return paper === "m2" ? 3 : 4; }
function axesFor(paper) { return paper === "m2" ? M2_AXES : AXES; }
function axisOf(part, topic, paper) {
  return axesFor(paper || "p1").find(function (a) { return a.part === part && a.topics.indexOf(topic) >= 0; }) || null;
}
function m2Items() { return (window.M2_TOPICS && M2_TOPICS.items) || []; }
function m2Subs(y, q) { return m2Items().filter(function (x) { return x.y === y && x.q === q; }); }
function m2MainTopics(y, q) {
  const names = [], seen = {};
  m2Subs(y, q).forEach(function (s) {
    if (s.topic && !seen[s.topic]) { seen[s.topic] = 1; names.push(s.topic); }
  });
  return names;
}
function m2MainTopic(y, q) {
  const subs = m2Subs(y, q);
  if (!subs.length) return "";
  const by = {};
  subs.forEach(function (s) { by[s.topic] = (by[s.topic] || 0) + (s.marks || 0); });
  return Object.keys(by).sort(function (a, b) { return by[b] - by[a] || a.localeCompare(b); })[0];
}
function m2TopicLine(y, q) {
  const names = [], seen = {};
  m2Subs(y, q).forEach(function (s) {
    [s.topic, s.sub1, s.sub2].forEach(function (t) {
      if (t && !seen[t]) { seen[t] = 1; names.push(topicLabel(t)); }
    });
  });
  return names.join("／");
}
function m2HitPct(y, q) {
  const subs = m2Subs(y, q);
  let hk = 0, m = 0;
  for (let i = 0; i < subs.length; i++) {
    const s = subs[i];
    if (s.hk == null || s.hk === "" || !s.marks) return null;
    hk += Number(s.hk); m += s.marks;
  }
  return m ? Math.round(hk / m * 100) : null;
}
function qTopics(paper, y, q) {
  if (paper === "p2") { const t = topicOf(y, q); return t ? [t] : []; }
  if (paper === "p1") {
    const names = [], seen = {};
    p1Subs(y, q).forEach(function (s) {
      [s.topic, s.sub1, s.sub2].forEach(function (t) {
        if (t && !seen[t]) { seen[t] = 1; names.push(t); }
      });
    });
    return names;
  }
  if (paper === "m2") return m2MainTopics(y, q);
  return [];
}
function matchTopic(y, q) {
  if (!topicFilter) return true;
  if (currentPaper === "p2") return topicOf(y, q) === topicFilter;
  if (currentPaper === "p1") return qTopics("p1", y, q).indexOf(topicFilter) >= 0;
  if (currentPaper === "m2") {
    const want = M2_FILTER_ALIAS[topicFilter] || [topicFilter];
    return m2MainTopics(y, q).some(function (t) { return want.indexOf(t) >= 0; });
  }
  return true;
}
function cellTopicBits(paper, y, q) {
  if (paper === "p1") {
    const subs = p1Subs(y, q);
    return { part: subs.length ? p1PartOfSec(subs[0].sec) : "", topic: p1MainTopic(y, q) };
  }
  if (paper === "p2") {
    const hit = (window.P2_TOPICS && P2_TOPICS.items || []).find(function (x) { return x.y === y && x.q === q; });
    return { part: hit ? hit.part : "", topic: hit ? hit.topic : "" };
  }
  if (paper === "m2") {
    const subs = m2Subs(y, q);
    return { part: subs.length ? subs[0].sec : "", topic: m2MainTopic(y, q) };
  }
  return { part: "", topic: "" };
}
function paperHasTopic(paper, part, topic) {
  if (paper === "m2") {
    return ((window.M2_TOPICS && M2_TOPICS.freq) || []).some(function (f) { return f.topic === topic && (f.total || 0) > 0; });
  }
  const freq = paper === "p1" ? ((window.P1_TOPICS && P1_TOPICS.freq) || []) : ((window.P2_TOPICS && P2_TOPICS.freq) || []);
  return freq.some(function (f) { return f.part === part && f.topic === topic && (f.total || 0) > 0; });
}
function fillTopicFilter() {
  const lab = document.getElementById("topicFilterLab");
  const sel = document.getElementById("topicFilter");
  if (!lab || !sel) return;
  const show = currentPaper === "p1" || currentPaper === "p2" || currentPaper === "m2";
  lab.hidden = !show;
  if (!show) { topicFilter = ""; return; }
  const labT = function (f) { return esc(topicLabel(f.topic)) + (OLD_TOPICS.has(f.topic) ? "（舊課程）" : ""); };
  const keep = topicFilter;
  if (currentPaper === "m2") {
    const freq = ((window.M2_TOPICS && M2_TOPICS.freq) || []).filter(function (f) { return (f.total || 0) > 0; });
    const groups = M2_AXES.map(function (ax) {
      return { name: axisLabel(ax.name), rows: ax.topics.map(function (t) { return freq.find(function (f) { return f.topic === t; }); }).filter(Boolean) };
    }).filter(function (g) { return g.rows.length; });
    sel.innerHTML = '<option value="">全部課題</option>' + groups.map(function (g) {
      return '<optgroup label="' + esc(g.name) + '">' + g.rows.map(function (f) {
        return '<option value="' + esc(f.topic) + '">' + labT(f) + "</option>";
      }).join("") + "</optgroup>";
    }).join("");
  } else {
    const freq = sortTopicRows(currentPaper === "p1" ? ((window.P1_TOPICS && P1_TOPICS.freq) || []) : ((window.P2_TOPICS && P2_TOPICS.freq) || []));
    const a = freq.filter(function (f) { return f.part === "甲"; });
    const b = freq.filter(function (f) { return f.part === "乙"; });
    const opt = function (f) { return '<option value="' + esc(f.topic) + '">' + labT(f) + "</option>"; };
    sel.innerHTML = '<option value="">全部課題</option><optgroup label="甲">' + a.map(opt).join("") + '</optgroup><optgroup label="乙">' + b.map(opt).join("") + "</optgroup>";
  }
  if ([].some.call(sel.options, function (o) { return o.value === keep; })) sel.value = keep;
  else { sel.value = ""; topicFilter = ""; }
}
function weakPaperId() {
  const el = document.getElementById("weakPaper");
  const v = (el && el.value) || prefs.weakPaper || "p1";
  return v === "p1" || v === "p2" || v === "m2" ? v : "p1";
}
function collectPaperItems(paper, pred) {
  const out = [];
  if (paper === "m2") {
    YEARS.forEach(function (y) {
      allQs("m2", y).forEach(function (q) {
        const c = getCell("m2", y, q);
        if (!pred(c)) return;
        const topic = m2MainTopic(y, q) || "未分類";
        const subs = m2Subs(y, q);
        const sec = (subs[0] && subs[0].sec) || (q <= 8 ? "甲" : "乙");
        const pct = m2HitPct(y, q);
        if (!isMing(c) && !bandOk(pct)) return;
        out.push({ paper: "m2", y: y, q: q, s: c.s, topic: topic, topics: m2TopicLine(y, q), tags: c.tags || [], note: c.note || "", part: sec, axisPart: "M2", pct: pct, w: !!c.w });
      });
    });
    return out;
  }
  if (paper === "p1") {
    YEARS.forEach(function (y) {
      allQs("p1", y).forEach(function (q) {
        const c = getCell("p1", y, q);
        if (!pred(c)) return;
        const topic = p1MainTopic(y, q) || "未分類";
        if (skipOldTopic(topic)) return;
        const subs = p1Subs(y, q);
        const sec = (subs[0] && subs[0].sec) || (q <= 9 ? "甲一" : q <= 14 ? "甲二" : "乙");
        const pct = p1HitPct(y, q);
        if (!isMing(c) && !bandOk(pct)) return;
        out.push({ paper: paper, y: y, q: q, s: c.s, topic: topic, topics: p1TopicLine(y, q), tags: c.tags || [], note: c.note || "", part: sec, axisPart: p1PartOfSec(sec), pct: pct, w: !!c.w });
      });
    });
    return out;
  }
  YEARS.forEach(function (y) {
    allQs("p2", y).forEach(function (q) {
      const c = getCell("p2", y, q);
      if (!pred(c)) return;
      const pct = p2Hit(y, q);
      const topic = topicOf(y, q) || "未分類";
      if (isHexQ(y, q) || skipOldTopic(topic)) return;
      if (!isMing(c) && !bandOk(pct)) return;
      out.push({ paper: "p2", y: y, q: q, s: c.s, topic: topic, topics: topic, tags: c.tags || [], note: c.note || "", part: q <= 30 ? "甲" : "乙", axisPart: q <= 30 ? "甲" : "乙", pct: pct, w: !!c.w });
    });
  });
  return out;
}
function renderPaperSelect() {
  const el = document.getElementById("paper");
  if (!el) return;
  el.innerHTML = Object.keys(PAPERS).map(function (id) {
    return '<option value="' + id + '"' + (id === currentPaper ? " selected" : "") + '>' + PAPERS[id].name + "</option>";
  }).join("");
  const hb = document.getElementById("hitBtn");
  if (!hb) return;
  const hitPaper = currentPaper === "p2" || currentPaper === "m2";
  hb.hidden = !hitPaper;
  if (hitPaper) {
    const hide = currentPaper === "m2" ? "隱藏得分率" : "隱藏命中率";
    const show = currentPaper === "m2" ? "顯示得分率" : "顯示命中率";
    hb.textContent = showHit ? hide : show;
    hb.classList.toggle("on-toggle", !!showHit);
  }
}
try { renderPaperSelect(); fillTopicFilter(); } catch (e) {}
