/* 卷一、M2 操卷分題。筆記唔入進度碼。舊碼冇細分就當冇。 */
(function () {
  const mkUi = { sec: "", axis: "", topic: "", boardOpen: true, radarKey: "", st: "", blank: false };

  function markItems(paper, year) {
    const src = paper === "m2"
      ? ((window.M2_TOPICS && M2_TOPICS.items) || [])
      : ((window.P1_TOPICS && P1_TOPICS.items) || []);
    return src.filter(x => x.y === +year);
  }
  function itemPart(paper, it) {
    if (paper === "m2") return "M2";
    return String(it.sec || "").indexOf("乙") >= 0 ? "乙" : "甲";
  }
  function partVal(paper, year, q, sub, pr) {
    const pts = (getCellOf(pr || prof(), paper, year, q).pts) || {};
    if (pts[sub] == null || pts[sub] === "") return null;
    const n = +pts[sub];
    return Number.isFinite(n) ? n : null;
  }
  function hasPartScores(paper, year) {
    if (paper !== "p1" && paper !== "m2") return false;
    return markItems(paper, year).some(it => partVal(paper, year, it.q, it.sub) != null);
  }
  function partSum(paper, year, pr) {
    let s = 0, any = false;
    markItems(paper, year).forEach(it => {
      const v = partVal(paper, year, it.q, it.sub, pr);
      if (v == null) return;
      any = true;
      s += v;
    });
    return any ? s : null;
  }
  window.hasPartScores = hasPartScores;
  window.partSum = partSum;
  window.enteredScore = enteredScore;

  function setPart(paper, year, q, sub, val) {
    const pts = Object.assign({}, getCell(paper, year, q).pts || {});
    if (val == null || val === "") delete pts[sub];
    else pts[sub] = val;
    setCell(paper, year, q, { pts });
    const sum = partSum(paper, year);
    setScore(paper, year, sum == null ? "" : sum);
  }

  function axesOf(paper) {
    return paper === "m2" && window.M2_AXES ? M2_AXES : AXES;
  }
  function poly(vals, cx, cy, r) {
    return radarPolyRated(vals, cx, cy, r).join(" ");
  }
  function radarHtml(rows, draw) {
    if (!rows.length) return "";
    const cx = 170, cy = 158, r = 104, N = rows.length;
    let rings = "", spokes = "", labels = "";
    [0.25, 0.5, 0.75, 1].forEach(k => {
      rings += `<polygon points="${poly(Array(N).fill(k), cx, cy, r)}" fill="none" stroke="#e4ddd2"/>`;
    });
    [[0.4, "#e0b8b0"], [0.6, "#b7d0b3"]].forEach(([k, col]) => {
      rings += `<polygon points="${poly(Array(N).fill(k), cx, cy, r)}" fill="none" stroke="${col}" stroke-width="1.5"/>`;
    });
    rows.forEach((row, i) => {
      const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
      spokes += `<line x1="${cx}" y1="${cy}" x2="${(cx + r * Math.cos(ang)).toFixed(1)}" y2="${(cy + r * Math.sin(ang)).toFixed(1)}" stroke="#e4ddd2"/>`;
      const lx = cx + (r + 28) * Math.cos(ang), ly = cy + (r + 28) * Math.sin(ang);
      labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="10" fill="${mkUi.axis === row.id ? "#3d6e8c" : "#1c1915"}" data-mk-axis="${row.id}" style="cursor:pointer">${esc(row.name)}</text>`;
    });
    const stu = `<polygon class="radar-stu" points="${poly(rows.map(row => row.v || 0), cx, cy, r)}" fill="rgba(61,110,140,.28)" stroke="#3d6e8c" stroke-width="2"/>`;
    const hk = `<polygon points="${poly(rows.map(row => row.hk || 0), cx, cy, r)}" fill="none" stroke="#8a8178" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    const cap = `<text x="170" y="318" text-anchor="middle" font-size="11" fill="#6b645b">實色＝你嘅得分率　虛線＝全港</text><text x="170" y="332" text-anchor="middle" font-size="11" fill="#6b645b">紅線＝40%　綠線＝60%　撳軸名篩題</text>`;
    return `<svg viewBox="0 0 340 344" class="${draw ? "radar-draw" : ""}">${rings}${spokes}${hk}${stu}${labels}${cap}</svg>`;
  }
  function axisRows(paper, year) {
    return axesOf(paper).map(ax => {
      const items = markItems(paper, year).filter(it => ax.topics.includes(it.topic) && (paper === "m2" || itemPart(paper, it) === ax.part));
      let earned = 0, tried = 0, all = 0, hkS = 0, hkM = 0;
      items.forEach(it => {
        const full = +it.marks || 0;
        all += full;
        if (it.hk != null && full) { hkS += +it.hk; hkM += full; }
        const v = partVal(paper, year, it.q, it.sub);
        if (v == null) return;
        earned += v;
        tried += full;
      });
      return {
        id: ax.id,
        name: ax.name.replace("　", " "),
        n: tried,
        v: tried ? earned / tried : 0,
        hk: hkM ? hkS / hkM : 0,
        earned, all,
        pct: tried ? Math.round(earned / tried * 100) : null
      };
    });
  }
  function boardHtml(paper, year) {
    const blocks = axesOf(paper).map(ax => {
      const items = markItems(paper, year).filter(it => ax.topics.includes(it.topic) && (paper === "m2" || itemPart(paper, it) === ax.part));
      const row = axisRows(paper, year).find(r => r.id === ax.id) || { pct: null, earned: 0, all: 0, hk: 0 };
      const by = new Map();
      items.forEach(it => {
        if (!by.has(it.topic)) by.set(it.topic, []);
        by.get(it.topic).push(it);
      });
      const topics = [...by.keys()].sort((a, b) => {
        const rank = paper === "m2" && window.M2_TOPIC_ORDER ? M2_TOPIC_ORDER.indexOf(a) - M2_TOPIC_ORDER.indexOf(b) : topicRank(itemPart(paper, by.get(a)[0]), a) - topicRank(itemPart(paper, by.get(b)[0]), b);
        return rank;
      });
      const chips = topics.map(topic => {
        let got = 0, full = 0, any = false;
        by.get(topic).forEach(it => {
          const v = partVal(paper, year, it.q, it.sub);
          if (v == null) return;
          any = true;
          got += v;
          full += +it.marks || 0;
        });
        let cls = "";
        if (any && full && got >= full) cls = " hi";
        else if (any && got === 0) cls = " lo";
        else if (any) cls = " mid";
        const part = itemPart(paper, by.get(topic)[0]);
        const key = part + "\n" + topic;
        const lab = window.topicLabel ? topicLabel(topic) : topic;
        return `<button type="button" class="tchip${cls}${mkUi.topic === key ? " on" : ""}" data-mk-part="${esc(part)}" data-mk-topic="${esc(topic)}">${esc(lab)}</button>`;
      }).join("");
      const hk = row.hk ? "　全港 " + Math.round(row.hk * 100) + "%" : "";
      const you = row.pct == null ? "—" : row.pct + "%";
      return `<div class="axis-row${mkUi.axis === ax.id ? " on" : ""}"><button type="button" class="mk-axis-name" data-mk-axis="${esc(ax.id)}">${esc(row.name || ax.name)}　你 ${you}　${row.earned}/${row.all}${hk}</button>${chips}</div>`;
    }).join("");
    const open = mkUi.boardOpen !== false ? " open" : "";
    return `<details class="mc-board axis-legend"${open}><summary>${paper === "m2" ? "6" : "8"}軸課題對照</summary>${blocks}</details>`;
  }
  function secColor(name) {
    if (name === "甲一" || name === "甲") return "#3d6e8c";
    if (name === "甲二") return "#3e9a62";
    return "#c48a3a";
  }
  function secLabel(paper, name) {
    return paper === "p1" && name === "乙" ? "乙部" : name;
  }
  function secStats(paper, year) {
    const map = new Map();
    markItems(paper, year).forEach(it => {
      const name = it.sec || "全卷";
      let s = map.get(name);
      if (!s) { s = { name, earned: 0, all: 0, any: false, hk: 0, hkN: 0 }; map.set(name, s); }
      s.all += +it.marks || 0;
      if (it.hk != null && it.hk !== "") { s.hk += +it.hk; s.hkN++; }
      const v = partVal(paper, year, it.q, it.sub);
      if (v == null) return;
      s.any = true;
      s.earned += v;
    });
    return [...map.values()];
  }
  function enteredScore(paper, year) {
    if ((paper === "p1" || paper === "m2") && hasPartScores(paper, year)) {
      const s = partSum(paper, year);
      if (s != null) return s;
    }
    const raw = getScore(paper, year);
    if (raw === "" || raw == null) return null;
    const n = +raw;
    return Number.isFinite(n) ? n : null;
  }
  function levelCol(kind, year, pct, kicker, emptyText) {
    const pack = window.CUTOFFS && CUTOFFS[kind] && CUTOFFS[kind][String(year)];
    if (pct == null) return `<aside class="lv-col"><span class="lv-kicker">${kicker}</span><b class="lv-big lv-wait">${emptyText}</b></aside>`;
    const lv = estimateShort(kind, year, Number(pct));
    if (!pack || !lv || lv === "資料未齊") return "";
    const starts = pack.starts.slice().sort((a, b) => a[1] - b[1]);
    const p = Math.round(levelProgress(starts, Number(pct)));
    return `<aside class="lv-col"><span class="lv-kicker">${kicker}</span><b class="lv-big">${esc(lv)}</b><div class="lv-bar" title="${p}%"><i style="width:${p}%"></i></div></aside>`;
  }
  window.levelCol = levelCol;
  function scoreVisual(paper, year) {
    const secs = secStats(paper, year);
    const full = secs.reduce((s, x) => s + x.all, 0);
    const sum = partSum(paper, year);
    const earned = sum == null ? 0 : sum;
    const hkAll = secs.reduce((s, x) => s + (x.hkN ? x.hk : 0), 0);
    const hkOk = secs.some(x => x.hkN);
    const parts = secs.map(s => ({ n: s.earned, col: secColor(s.name) }));
    const ring = donutSvg(parts, Math.max(0, full - earned), sum == null ? "—" : String(sum), "/" + full);
    const bar = (lab, got, all, any, color, key, hk) => {
      const pct = any && all ? Math.round(got * 100 / all) : 0;
      const on = key && mkUi.sec === key ? " on" : "";
      const dim = key && mkUi.sec && mkUi.sec !== key ? " dim" : "";
      const tick = hk != null && all ? `<em class="hk-tick" style="left:${Math.max(0, Math.min(100, hk * 100 / all)).toFixed(1)}%"></em>` : "";
      let note = "";
      if (hk != null) {
        const diff = any ? got - hk : null;
        const gap = diff == null ? "" : diff >= 0 ? ` · 高 ${diff.toFixed(1)}` : ` · 低 ${Math.abs(diff).toFixed(1)}`;
        note = `<small class="hk-note">全港 ${hk.toFixed(1)}${gap}</small>`;
      }
      return `<button type="button" class="mc-bar mk-sec${on}${dim}" data-mk-sec="${esc(key)}" style="--mk-fill:${color}"><span>${esc(lab)}</span><i><b style="width:${pct}%"></b>${tick}</i><span>${any ? got + "/" + all : "—/" + all}${note}</span></button>`;
    };
    const rows = bar("總分", earned, full, sum != null, "#2f5d50", "*", hkOk ? hkAll : null) + secs.map(s => bar(secLabel(paper, s.name), s.earned, s.all, s.any, secColor(s.name), s.name, s.hkN ? s.hk : null)).join("");
    let lv = "";
    if (paper === "m2") lv = levelCol("m2", year, enteredScore("m2", year), "M2", "—");
    else {
      const p1 = enteredScore("p1", year), p2 = enteredScore("p2", year);
      const cp = p1 != null && p2 != null ? corePct(year, p1, p2) : null;
      lv = levelCol("core", year, cp, "必修", "未齊");
    }
    const note = paper === "m2"
      ? "圓環係已得分，顏色分甲、乙。灰色係未得分。棒上黑線係全港。撳條篩下面的題。"
      : "圓環係已得分，顏色分甲一、甲二、乙部。灰色係未得分。棒上黑線係全港。撳條篩下面的題。";
    return `<div class="score-row"><div class="score-ring">${ring}</div><div class="mk-bars">${rows}</div>${lv}</div><p class="hint">${note}</p>`;
  }
  function donutSvg(parts, rest, center, sub) {
    const radius = 42, circ = 2 * Math.PI * radius;
    const total = parts.reduce((s, p) => s + p.n, 0) + rest || 1;
    let acc = 0;
    let arcs = "";
    if (!parts.some(p => p.n > 0)) {
      arcs = `<circle cx="54" cy="54" r="${radius}" fill="none" stroke="#d9d3c8" stroke-width="12"/>`;
    } else {
      parts.forEach(p => {
        if (!p.n) return;
        const len = circ * p.n / total;
        arcs += `<circle cx="54" cy="54" r="${radius}" fill="none" stroke="${p.col}" stroke-width="12" stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}"/>`;
        acc += len;
      });
      if (rest > 0) {
        const len = circ * rest / total;
        arcs += `<circle cx="54" cy="54" r="${radius}" fill="none" stroke="#d9d3c8" stroke-width="12" stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}"/>`;
      }
    }
    return `<svg viewBox="0 0 108 108" class="mc-donut"><g transform="rotate(-90 54 54)">${arcs}</g><text x="54" y="52" text-anchor="middle" font-size="18" fill="#1c1915">${center}</text><text x="54" y="68" text-anchor="middle" font-size="11" fill="#6b645b">${sub}</text></svg>`;
  }
  function scoreVisual(paper, year) {
    const secs = secStats(paper, year);
    const full = secs.reduce((s, x) => s + x.all, 0);
    const sum = partSum(paper, year);
    const earned = sum == null ? 0 : sum;
    const parts = secs.map(s => ({ n: s.earned, col: secColor(s.name) }));
    const ring = donutSvg(parts, Math.max(0, full - earned), sum == null ? "—" : String(sum), "/" + full);
    const bar = (lab, got, all, any, color, key) => {
      const pct = any && all ? Math.round(got * 100 / all) : 0;
      const on = key && mkUi.sec === key ? " on" : "";
      const dim = key && mkUi.sec && mkUi.sec !== key ? " dim" : "";
      return `<button type="button" class="mc-bar mk-sec${on}${dim}" data-mk-sec="${esc(key)}" style="--mk-fill:${color}"><span>${esc(lab)}</span><i><b style="width:${pct}%"></b></i><span>${any ? got + "/" + all : "—/" + all}</span></button>`;
    };
    const rows = bar("總分", earned, full, sum != null, "#2f5d50", "*") + secs.map(s => bar(secLabel(paper, s.name), s.earned, s.all, s.any, secColor(s.name), s.name)).join("");
    const note = paper === "m2"
      ? "圓環係已得分，顏色分甲、乙。灰色係未得分。撳條篩下面的題。"
      : "圓環係已得分，顏色分甲一、甲二、乙部。灰色係未得分。撳條篩下面的題。";
    return `<div class="mc-visual mk-visual">${ring}<div class="mk-bars">${rows}</div></div><p class="hint">${note}</p>`;
  }
  function statusCell(paper, year, q) {
    const c = getCell(paper, year, q);
    const st = c.s || 0;
    const chips = [[3, "ok", "已掌握"], [2, "warn", "一般"], [1, "danger", "唔識"]].map(([sv, cls, lab]) => {
      const on = st === sv;
      const ming = sv === 3 && on && c.w;
      return `<button type="button" class="${cls}${ming ? " ming" : ""}${on ? "" : " fade"}" data-mk-s="${sv}" data-mk-q="${q}">${ming ? "已掌握　明返" : lab}</button>`;
    }).join("");
    return `<div class="mark-row mc-mark">${chips}</div>`;
  }
  function renderMarkSheet() {
    const box = document.getElementById("markSheet");
    if (!box) return;
    const paperEl = document.getElementById("timerPaper");
    const yearEl = document.getElementById("timerYear");
    const paper = paperEl ? paperEl.value : "";
    const year = yearEl ? +yearEl.value : 0;
    if (paper === "m1") {
      box.hidden = false;
      box.innerHTML = `<p class="hint">M1 未有分題課題表，呢度未有評卷。</p>`;
      return;
    }
    if ((paper !== "p1" && paper !== "m2") || !year) {
      if (paper === "p1" || paper === "m2") {
        box.hidden = false;
        box.innerHTML = `<p class="hint">揀年份先可以評卷。</p>`;
        return;
      }
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    const keep = window.scrollY;
    const prevScroll = box.querySelector(".mk-scroll");
    const keepLeft = prevScroll ? prevScroll.scrollLeft : 0;
    const items = markItems(paper, year);
    const axes = axisRows(paper, year);
    const drawKey = paper + ":" + year;
    const draw = mkUi.radarKey !== drawKey;
    mkUi.radarKey = drawKey;
    const shown = items.filter(it => {
      if (mkUi.sec && it.sec !== mkUi.sec) return false;
      if (mkUi.axis) {
        const ax = axesOf(paper).find(a => a.id === mkUi.axis);
        if (!ax || !ax.topics.includes(it.topic) || (paper !== "m2" && itemPart(paper, it) !== ax.part)) return false;
      }
      if (mkUi.topic) {
        const part = itemPart(paper, it);
        if (part + "\n" + it.topic !== mkUi.topic) return false;
      }
      if (mkUi.st !== "" && (getCell(paper, year, it.q).s || 0) !== +mkUi.st) return false;
      if (mkUi.blank && partVal(paper, year, it.q, it.sub) != null) return false;
      return true;
    });
    const groups = [];
    shown.forEach((it, i) => {
      const last = groups[groups.length - 1];
      if (last && last.q === it.q) last.rows.push(it);
      else groups.push({ q: it.q, rows: [it], i });
    });
    const body = groups.map(g => g.rows.map((it, idx) => {
      const v = partVal(paper, year, it.q, it.sub);
      const max = +it.marks || 0;
      const sets = [];
      for (let n = 0; n <= max; n++) {
        const cls = v == null ? "" : v === n ? "on" : "off";
        sets.push(`<button type="button" tabindex="-1" class="${cls}" data-mk-set="${n}" data-mk-q="${it.q}" data-mk-sub="${esc(it.sub)}">${n}</button>`);
      }
      const rate = max && it.hk != null ? Math.round(+it.hk / max * 100) : null;
      const hkTxt = it.hk == null ? "—" : (Math.round(+it.hk * 10) / 10) + "／" + max;
      const span = idx ? "" : ` rowspan="${g.rows.length}" class="mk-span"`;
      const tail = idx ? "" : `<td${span}>${statusCell(paper, year, it.q)}</td><td${span}><button type="button" class="ghost" data-mk-note="${it.q}">${esc(getCell(paper, year, it.q).note || "筆記")}</button></td><td${span}><button type="button" class="ghost" data-mk-note="${it.q}">${esc((getCell(paper, year, it.q).tags || []).map(tagName).join("、") || "錯因")}</button></td>`;
      return `<tr>
        <td>${esc(it.sub)}</td>
        <td>${esc(window.topicLabel ? topicLabel(it.topic) : it.topic)}</td>
        <td><div class="mk-sets"><input class="mk-score" inputmode="numeric" data-mk-q="${it.q}" data-mk-sub="${esc(it.sub)}" data-mk-max="${max}" value="${v == null ? "" : v}">${sets.join("")}<span>／${max}</span></div></td>
        <td class="${rate == null ? "" : bandClass(rate)}">${hkTxt}</td>
        ${tail}
      </tr>`;
    }).join("")).join("");
    const bits = [];
    if (mkUi.topic) {
      const topic = mkUi.topic.split("\n").slice(1).join("\n");
      bits.push(window.topicLabel ? topicLabel(topic) : topic);
    } else if (mkUi.axis) {
      const ax = axesOf(paper).find(a => a.id === mkUi.axis);
      if (ax) bits.push(String(ax.name).replace("　", " "));
    } else if (mkUi.sec) bits.push(secLabel(paper, mkUi.sec));
    if (mkUi.st !== "") bits.push(["未做", "唔識", "一般", "已掌握"][+mkUi.st] || "");
    if (mkUi.blank) bits.push("未入分");
    const watch = bits.filter(Boolean).join(" · ");
    const filters = [["3", "已掌握", " st3"], ["2", "一般", " st2"], ["1", "唔識", " st1"], ["0", "未做", " st0"]].map(([v, lab, cls]) => {
      return `<button type="button" class="mk-stf${cls}${mkUi.st === v ? " on" : ""}" data-mk-stf="${v}">${lab}</button>`;
    }).join("") + `<button type="button" class="mk-stf stblank${mkUi.blank ? " on" : ""}" data-mk-blank="1">未入分</button>` + `<button type="button" class="mk-stf${mkUi.st === "" ? " on" : ""}" data-mk-stf="">全部</button>`;
    box.innerHTML = `<section class="mc-analysis">
      <h3 class="sec-title">評卷</h3>
      <div class="mc-review mk-top">
        <div class="radar-box">
          ${radarHtml(axes, draw)}
          <p class="hint">實色＝已入分題的得分率。未入唔當 0，亦唔入百分比。虛線＝全港。</p>
        </div>
        <div class="mk-topics">
          ${boardHtml(paper, year)}
        </div>
      </div>
      <div class="mc-scoreboard mk-scoreboard score-card">
        ${scoreVisual(paper, year)}
      </div>
      <div class="mk-filters">${filters}</div>
      ${watch ? `<p class="hint">而家只顯示：${esc(watch)}　<button type="button" class="ghost" id="mkReset">顯示全部</button></p>` : ""}
      <div class="mk-scroll"><table class="data-table mk-ana"><thead><tr><th>題號</th><th>課題</th><th>得分</th><th>全港平均分</th><th>狀態</th><th>筆記</th><th>錯因</th></tr></thead><tbody>${body || `<tr><td colspan="7">冇符合嘅分題。</td></tr>`}</tbody></table></div>
    </section>`;
    window.scrollTo(0, keep);
    const scNow = box.querySelector(".mk-scroll");
    if (scNow) scNow.scrollLeft = keepLeft;
    const want = mkUi.focus;
    mkUi.focus = "";
    if (want) {
      const el = box.querySelector(`input.mk-score[data-mk-q="${want.q}"][data-mk-sub="${CSS.escape(want.sub)}"]`);
      if (el) { el.focus(); el.select(); }
    }
  }
  window.renderMarkSheet = renderMarkSheet;

  function readParts(buf) {
    if (!buf || buf.length < 8 || buf[0] !== 68) return null;
    let o = 5 + buf[4];
    o += Math.ceil(cellLayout().length * 2 / 8);
    o += XFER_PAPERS.length * YEARS.length;
    if (o + 2 > buf.length) return null;
    const tagN = buf[o] | (buf[o + 1] << 8);
    o += 2 + tagN * 4;
    if (o + 2 > buf.length) return null;
    const metaN = buf[o] | (buf[o + 1] << 8);
    o += 2 + metaN * 7;
    if (o + 2 > buf.length) return null;
    const mcN = buf[o] | (buf[o + 1] << 8);
    o += 2 + mcN * 3;
    if (o + 2 > buf.length) return null;
    const n = buf[o] | (buf[o + 1] << 8);
    o += 2;
    const map = {};
    for (let t = 0; t < n && o + 4 <= buf.length; t++) {
      const paper = buf[o] === 1 ? "m2" : "p1";
      const y = 2012 + buf[o + 1];
      const idx = buf[o + 2];
      const score = buf[o + 3];
      o += 4;
      const it = markItems(paper, y)[idx];
      if (!it) continue;
      const k = paper + ":" + y + ":" + it.q;
      map[k] = map[k] || {};
      map[k][it.sub] = score;
    }
    return map;
  }
  function partBytes(profile) {
    const recs = [];
    ["p1", "m2"].forEach((paper, pi) => {
      YEARS.forEach(y => {
        markItems(paper, y).forEach((it, i) => {
          if (i > 255) return;
          const v = partVal(paper, y, it.q, it.sub, profile);
          if (v == null) return;
          recs.push(pi, y - 2012, i, Math.max(0, Math.min(254, v)));
        });
      });
    });
    return recs;
  }
  const prevEncode = encodeQrSnap;
  encodeQrSnap = function (profile) {
    const base = prevEncode(profile);
    const recs = partBytes(profile);
    const out = new Uint8Array(base.length + 2 + recs.length);
    out.set(base, 0);
    const n = recs.length / 4;
    out[base.length] = n & 255;
    out[base.length + 1] = (n >> 8) & 255;
    recs.forEach((v, i) => { out[base.length + 2 + i] = v; });
    return out;
  };
  const prevDecode = decodeQrBuf;
  decodeQrBuf = function (buf) {
    const snap = prevDecode(buf);
    if (snap) snap.parts = readParts(buf);
    return snap;
  };
  const prevApply = applyQrSnap;
  applyQrSnap = function (name, snap, mode) {
    const prev = db.profiles[name];
    const before = {};
    if (prev) {
      Object.entries(prev.cells || {}).forEach(([k, c]) => {
        if (c && c.pts && Object.keys(c.pts).length) before[k] = Object.assign({}, c.pts);
      });
    }
    prevApply(name, snap, mode);
    const p = db.profiles[name];
    if (!p) return;
    const explicit = !!(snap && snap.parts);
    if (!(mode === "replace" && explicit)) {
      Object.entries(before).forEach(([k, pts]) => {
        const cell = p.cells[k] || { s: 0, note: "", tags: [] };
        cell.pts = Object.assign({}, pts, cell.pts || {});
        p.cells[k] = cell;
      });
    }
    if (explicit) {
      Object.entries(snap.parts).forEach(([k, pts]) => {
        const cell = p.cells[k] || { s: 0, note: "", tags: [] };
        cell.pts = Object.assign({}, mode === "replace" ? {} : (cell.pts || {}), pts);
        p.cells[k] = cell;
      });
    }
    const touch = new Set();
    Object.keys(before).forEach(k => touch.add(k.split(":").slice(0, 2).join(":")));
    if (explicit) Object.keys(snap.parts).forEach(k => touch.add(k.split(":").slice(0, 2).join(":")));
    touch.forEach(id => {
      const bits = id.split(":");
      const sum = partSum(bits[0], +bits[1], p);
      if (sum != null) p.scores[id] = sum;
    });
    save();
  };

  const prevRender = renderTimer;
  renderTimer = function () {
    prevRender();
    try { renderMarkSheet(); } catch (err) { console.error(err); }
  };

  function readScore(inp) {
    const max = +inp.dataset.mkMax || 0;
    const raw = String(inp.value || "").trim();
    if (raw === "") return null;
    let val = Math.round(+raw);
    if (!Number.isFinite(val)) return null;
    return Math.max(0, Math.min(max, val));
  }
  function writeScore(inp) {
    const paper = document.getElementById("timerPaper").value;
    const year = +document.getElementById("timerYear").value;
    const q = +inp.dataset.mkQ;
    const sub = inp.dataset.mkSub;
    const val = readScore(inp);
    const cur = partVal(paper, year, q, sub);
    if ((val == null && cur == null) || val === cur) return false;
    pushUndo();
    setPart(paper, year, q, sub, val);
    return true;
  }
  function livePaper() {
    return {
      paper: document.getElementById("timerPaper").value,
      year: +document.getElementById("timerYear").value
    };
  }
  function keepPos() {
    const sc = box.querySelector(".mk-scroll");
    return { top: window.scrollY, left: sc ? sc.scrollLeft : 0 };
  }
  function putPos(pos) {
    window.scrollTo(0, pos.top);
    const sc = box.querySelector(".mk-scroll");
    if (sc) sc.scrollLeft = pos.left;
  }
  function paintStatus(q) {
    const pos = keepPos();
    const { paper, year } = livePaper();
    if (mkUi.st !== "" && (getCell(paper, year, q).s || 0) !== +mkUi.st) {
      renderMarkSheet();
      putPos(pos);
      requestAnimationFrame(() => putPos(pos));
      return;
    }
    const btn = box.querySelector(`[data-mk-s][data-mk-q="${q}"]`);
    const td = btn && btn.closest("td");
    if (td) td.innerHTML = statusCell(paper, year, q);
    putPos(pos);
  }
  function paintScore(q, sub) {
    const pos = keepPos();
    const { paper, year } = livePaper();
    if (mkUi.st !== "" && (getCell(paper, year, q).s || 0) !== +mkUi.st) {
      renderMarkSheet();
      putPos(pos);
      requestAnimationFrame(() => putPos(pos));
      return;
    }
    if (mkUi.blank && partVal(paper, year, q, sub) != null) {
      renderMarkSheet();
      putPos(pos);
      requestAnimationFrame(() => putPos(pos));
      return;
    }
    const v = partVal(paper, year, q, sub);
    const inp = box.querySelector(`input.mk-score[data-mk-q="${q}"][data-mk-sub="${CSS.escape(String(sub))}"]`);
    if (inp && document.activeElement !== inp) inp.value = v == null ? "" : String(v);
    const host = inp && inp.closest(".mk-sets");
    if (host) host.querySelectorAll("[data-mk-set]").forEach(b => {
      const n = +b.dataset.mkSet;
      b.className = v == null ? "" : n === v ? "on" : "off";
    });
    const radar = box.querySelector(".radar-box");
    if (radar) {
      radar.innerHTML = radarHtml(axisRows(paper, year), false) + `<p class="hint">實色＝已入分題的得分率。未入唔當 0，亦唔入百分比。虛線＝全港。</p>`;
    }
    const topics = box.querySelector(".mk-topics");
    if (topics) topics.innerHTML = boardHtml(paper, year);
    const sb = box.querySelector(".mk-scoreboard");
    if (sb) sb.innerHTML = scoreVisual(paper, year);
    putPos(pos);
  }
  function clearChart() { mkUi.sec = ""; mkUi.axis = ""; mkUi.topic = ""; }
  function clearTable() { mkUi.st = ""; mkUi.blank = false; }
  const box = document.getElementById("markSheet");
  let holdRender = false;
  if (box) {
    box.addEventListener("toggle", e => {
      if (e.target.classList && e.target.classList.contains("mc-board")) mkUi.boardOpen = e.target.open;
    }, true);
    box.addEventListener("mousedown", e => {
      if (e.target.closest("[data-mk-set],[data-mk-s],[data-mk-note],[data-mk-sec],[data-mk-topic],[data-mk-axis],#mkReset")) holdRender = true;
    });
    box.addEventListener("click", e => {
      holdRender = false;
      if (e.target.id === "mkReset") { clearChart(); clearTable(); renderMarkSheet(); return; }
      const stf = e.target.closest("[data-mk-stf]");
      if (stf) {
        const v = stf.dataset.mkStf;
        mkUi.st = v === "" ? "" : (mkUi.st === v ? "" : v);
        clearChart();
        renderMarkSheet();
        return;
      }
      const blank = e.target.closest("[data-mk-blank]");
      if (blank) {
        mkUi.blank = !mkUi.blank;
        clearChart();
        renderMarkSheet();
        return;
      }
      const sec = e.target.closest("[data-mk-sec]");
      if (sec) {
        const name = sec.dataset.mkSec;
        clearTable();
        if (name === "*") clearChart();
        else {
          mkUi.sec = mkUi.sec === name ? "" : name;
          mkUi.axis = "";
          mkUi.topic = "";
        }
        renderMarkSheet();
        return;
      }
      const ax = e.target.closest("[data-mk-axis]");
      if (ax) {
        clearTable();
        mkUi.axis = mkUi.axis === ax.dataset.mkAxis ? "" : ax.dataset.mkAxis;
        if (mkUi.axis) { mkUi.sec = ""; mkUi.topic = ""; }
        renderMarkSheet();
        return;
      }
      const topic = e.target.closest("[data-mk-topic]");
      if (topic) {
        clearTable();
        const key = topic.dataset.mkPart + "\n" + topic.dataset.mkTopic;
        mkUi.topic = mkUi.topic === key ? "" : key;
        if (mkUi.topic) { mkUi.sec = ""; mkUi.axis = ""; }
        renderMarkSheet();
        return;
      }
      const set = e.target.closest("[data-mk-set]");
      if (set) {
        const paper = document.getElementById("timerPaper").value;
        const year = +document.getElementById("timerYear").value;
        pushUndo();
        setPart(paper, year, +set.dataset.mkQ, set.dataset.mkSub, +set.dataset.mkSet);
        paintScore(+set.dataset.mkQ, set.dataset.mkSub);
        return;
      }
      const st = e.target.closest("[data-mk-s]");
      if (st) {
        const paper = document.getElementById("timerPaper").value;
        const year = +document.getElementById("timerYear").value;
        const q = +st.dataset.mkQ;
        const s = +st.dataset.mkS;
        const cur = getCell(paper, year, q).s || 0;
        pushUndo();
        applyStatus(paper, year, q, cur === s ? 0 : s, "pick");
        paintStatus(q);
        return;
      }
      const note = e.target.closest("[data-mk-note]");
      if (note) openNote(yearOf(), +note.dataset.mkNote, document.getElementById("timerPaper").value);
    });
    box.addEventListener("keydown", e => {
      const inp = e.target.closest && e.target.closest("input.mk-score");
      if (!inp || (e.key !== "Tab" && e.key !== "Enter")) return;
      const inputs = [...box.querySelectorAll("input.mk-score")];
      const nxt = inputs[inputs.indexOf(inp) + (e.shiftKey ? -1 : 1)];
      e.preventDefault();
      writeScore(inp);
      paintScore(+inp.dataset.mkQ, inp.dataset.mkSub);
      if (nxt) { nxt.focus(); nxt.select(); }
    });
    box.addEventListener("change", e => {
      const inp = e.target.closest("input.mk-score");
      if (!inp) return;
      const hold = holdRender;
      holdRender = false;
      if (!writeScore(inp) || hold) return;
      paintScore(+inp.dataset.mkQ, inp.dataset.mkSub);
    });
  }
  function hookSelect(el) {
    if (!el) return;
    const prev = el.onchange;
    el.onchange = ev => {
      mkUi.sec = "";
      mkUi.axis = "";
      mkUi.topic = "";
      mkUi.st = "";
      mkUi.blank = false;
      if (prev) prev(ev);
      try { renderMarkSheet(); } catch (err) { console.error(err); }
    };
  }
  hookSelect(document.getElementById("timerPaper"));
  hookSelect(document.getElementById("timerYear"));
  if (typeof currentView !== "undefined" && currentView === "timer") {
    try { renderTimer(); } catch (err) { console.error(err); }
  }
  function yearOf() {
    return +document.getElementById("timerYear").value;
  }
})();
