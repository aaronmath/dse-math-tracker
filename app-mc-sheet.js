/* 卷二計時答案紙、班況作答、QR 字母同筆色。舊進度碼冇呢段就當冇 MC。 */
(function () {
  const LETTERS = ["A", "B", "C", "D"];
  const mcDrafts = {};
  let mcWho = "";
  const classUi = { mode: "person", filter: "", open: "" };

  function mcYear() {
    const el = document.getElementById("timerYear");
    return el && el.value ? +el.value : 0;
  }
  function syncWho() {
    if (mcWho === currentProfile) return;
    mcWho = currentProfile;
    Object.keys(mcDrafts).forEach(k => delete mcDrafts[k]);
  }
  function freshDraft(year) {
    const picks = {};
    if (year) {
      for (let q = 1; q <= 45; q++) {
        const c = getCell("p2", year, q);
        if (c.mc && LETTERS.includes(c.mc)) picks[q] = { letter: c.mc, ink: c.ink === "b" ? "b" : "k" };
      }
    }
    return { picks, touch: {}, status: {}, notes: {}, revealed: false };
  }
  function draft() {
    syncWho();
    const y = mcYear();
    const k = String(y);
    if (!mcDrafts[k]) mcDrafts[k] = freshDraft(y);
    return mcDrafts[k];
  }
  function keyMap(year) {
    const list = (window.P2_DATA && P2_DATA.dse && P2_DATA.dse[String(year)]) || [];
    const m = {};
    list.forEach(r => { m[r.q] = r; });
    return m;
  }
  function judged(year, q, letter) {
    if (!letter || !year) return null;
    const row = keyMap(year)[q];
    if (!row || !row.ans) return null;
    return row.ans === letter;
  }
  function pen() { return prefs.mcPen === "b" ? "b" : "k"; }

  function tally(d, from, to) {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    let black = 0;
    const blanks = [];
    for (let q = from; q <= to; q++) {
      const p = d.picks[q];
      if (!p || !p.letter) blanks.push(q);
      else if (p.ink !== "b") { counts[p.letter]++; black++; }
    }
    return { counts, black, blanks };
  }
  function leastOf(counts) {
    const min = Math.min(counts.A, counts.B, counts.C, counts.D);
    return LETTERS.filter(L => counts[L] === min);
  }
  function countLine(counts) {
    return LETTERS.map(L => L + counts[L]).join(" ");
  }

  function summary(year, d) {
    let ok = 0, seen = 0, blank = 0;
    let bk = 0, bkOk = 0, bl = 0, blOk = 0, sureBad = 0;
    const sec = { A: { ok: 0, n: 30 }, B: { ok: 0, n: 15 } };
    for (let q = 1; q <= 45; q++) {
      const p = d.picks[q];
      const side = q <= 30 ? "A" : "B";
      if (!p || !p.letter) { blank++; continue; }
      seen++;
      const hit = judged(year, q, p.letter);
      const blue = p.ink === "b";
      if (blue) bl++; else bk++;
      if (hit) {
        ok++;
        sec[side].ok++;
        if (blue) blOk++; else bkOk++;
      } else if (hit === false && !blue) sureBad++;
    }
    return { ok, seen, blank, bk, bkOk, bl, blOk, sureBad, sec };
  }

  function axisVals(year, d, mode) {
    return AXES.map(ax => {
      const items = (P2_TOPICS.items || []).filter(x => x.y === year && x.part === ax.part && ax.topics.includes(x.topic));
      let sum = 0, n = 0;
      items.forEach(x => {
        if (mode === "know") {
          const t = d.touch[x.q];
          if (!t || !t.s) return;
          const s = d.status[x.q] || 0;
          if (!s) return;
          sum += s === 3 ? 1 : s === 2 ? 0.5 : 0;
          n++;
        } else {
          const p = d.picks[x.q];
          if (!p || !p.letter) return;
          const hit = judged(year, x.q, p.letter);
          if (hit == null) return;
          sum += hit ? 1 : 0;
          n++;
        }
      });
      const name = ax.name.replace(/^[甲乙]\s*/, "");
      return { name, n, v: n ? sum / n : null };
    });
  }
  function radarHtml(rows) {
    if (!rows.some(r => r.v != null)) return `<p class="hint">未有可計嘅題。留空唔入圖。</p>`;
    const cx = 170, cy = 158, r = 96, N = rows.length;
    let rings = "", spokes = "", labels = "";
    [0.25, 0.5, 0.75, 1].forEach(k => {
      rings += `<polygon points="${radarPolyRated(Array(N).fill(k), cx, cy, r).join(" ")}" fill="none" stroke="#e4ddd2"/>`;
    });
    for (let i = 0; i < N; i++) {
      const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
      spokes += `<line x1="${cx}" y1="${cy}" x2="${(cx + r * Math.cos(ang)).toFixed(1)}" y2="${(cy + r * Math.sin(ang)).toFixed(1)}" stroke="#e4ddd2"/>`;
      const lx = cx + (r + 34) * Math.cos(ang), ly = cy + (r + 34) * Math.sin(ang);
      const lab = esc(rows[i].name) + (rows[i].n ? " " + rows[i].n : "");
      labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="10" fill="#1c1915">${lab}</text>`;
    }
    const stu = radarSpokes(rows.map(x => x.v), cx, cy, r, "#2f5d50");
    return `<svg viewBox="0 0 340 330" class="radar-draw">${rings}${spokes}${stu}${labels}</svg>`;
  }

  function rowHtml(q, d, year) {
    const p = d.picks[q];
    const show = d.revealed && year;
    const hit = show && p && p.letter ? judged(year, q, p.letter) : null;
    const numCls = hit == null ? "" : hit ? " ok" : " bad";
    const bubbles = LETTERS.map(L => {
      const on = p && p.letter === L ? (p.ink === "b" ? " b" : " k") : "";
      return `<button type="button" class="mc-bub${on}" data-mc-q="${q}" data-mc-l="${L}"><span>${L}</span><b></b></button>`;
    }).join("");
    let meta = "";
    let stat = "";
    if (show) {
      const row = keyMap(year)[q] || {};
      const topic = topicOf(year, q) || "";
      const mark = !p || !p.letter ? "未填" : hit ? `<span class="ok">對</span>` : `<span class="bad">錯</span>`;
      const ans = row.ans ? "答案 " + row.ans : "";
      const pct = row.pct == null ? "" : "全港 " + Math.round(row.pct) + "%";
      meta = `<div class="mc-meta">${mark}${topic ? "　" + esc(topic) : ""}${ans ? "　" + ans : ""}${pct ? "　" + pct : ""}</div>`;
      const saved = year ? getCell("p2", year, q) : { s: 0, note: "" };
      const touched = d.touch[q] && d.touch[q].s;
      const cur = touched ? (d.status[q] || 0) : 0;
      const chips = [3, 2, 1].map(s =>
        `<button type="button" class="ghost${cur === s ? " on-toggle" : ""}" data-mc-s="${s}" data-mc-q="${q}">${STATE_LABEL[s]}</button>`
      ).join("");
      const now = !touched && saved.s ? `<span class="sub">現時 ${STATE_LABEL[saved.s]}</span>` : "";
      const note = d.touch[q] && d.touch[q].note ? (d.notes[q] || "") : (saved.note || "");
      stat = `<div class="mc-stat">${chips}${now}<input class="mc-note" data-mc-note="${q}" placeholder="筆記" value="${esc(note)}"></div>`;
    }
    return `<div class="mc-q" data-row="${q}"><div class="mc-num${numCls}">${hit === false ? "✗" : hit ? "✓" : ""}${q}</div><div class="mc-bubbles">${bubbles}</div>${meta}${stat}</div>`;
  }
  function colHtml(from, to, d, year) {
    let html = "";
    for (let q = from; q <= to; q++) {
      if (q === 31) html += `<div class="mc-sec">乙部</div>`;
      html += rowHtml(q, d, year);
    }
    return html;
  }

  function renderMcSheet() {
    const box = document.getElementById("mcSheet");
    if (!box) return;
    const keep = window.scrollY;
    const paper = document.getElementById("timerPaper");
    const on = paper && paper.value === "p2";
    box.hidden = !on;
    if (!on) return;
    const year = mcYear();
    const d = draft();
    const warnOn = prefs.mcWarn !== false;
    const know = prefs.mcRadar === "know";
    const ink = pen();
    let sum = "";
    if (d.revealed && year) {
      const s = summary(year, d);
      sum = `<div class="mc-sum">
        <span>全卷 <b>${s.ok}/45</b></span>
        <span>甲 <b>${s.sec.A.ok}/30</b></span>
        <span>乙 <b>${s.sec.B.ok}/15</b></span>
        <span>黑筆 <b>${s.bkOk}/${s.bk}</b></span>
        <span>撞中 <b>${s.blOk}/${s.bl}</b></span>
        <span>留空 <b>${s.blank}</b></span>
        <span>信心錯 <b>${s.sureBad}</b></span>
      </div>`;
    }
    const radar = d.revealed && year
      ? `<div class="mc-tools">
          <button type="button" class="ghost${!know ? " on-toggle" : ""}" data-mc-radar="mark">對錯</button>
          <button type="button" class="ghost${know ? " on-toggle" : ""}" data-mc-radar="know">明白程度</button>
        </div>
        <div class="radar-box">${radarHtml(axisVals(year, d, know ? "know" : "mark"))}</div>
        <p class="hint">${know ? "呢張圖只用今次揀嘅狀態。未揀唔入圖。" : "呢張圖用對錯，撞中都算對。留空唔入圖。能力頁唔跟呢度。"}</p>`
      : "";
    const shortcuts = d.revealed && year ? `<div class="mc-status-tools">
      <button type="button" class="ghost" data-mc-batch="sure-ok">黑筆答對標已掌握</button>
      <button type="button" class="ghost" data-mc-batch="sure-bad">黑筆答錯標唔識</button>
      <button type="button" class="ghost" data-mc-batch="guess-bad">藍筆答錯標唔識</button>
    </div>` : "";
    box.innerHTML = `
      <div class="mc-tools">
        <button type="button" class="ghost${ink === "k" ? " on-toggle" : ""}" data-mc-pen="k">黑筆</button>
        <button type="button" class="ghost${ink === "b" ? " on-toggle" : ""}" data-mc-pen="b">藍筆</button>
        <button type="button" class="ghost${warnOn ? " on-toggle" : ""}" data-mc-warn="1">${warnOn ? "填之前報數　開" : "填之前報數　關"}</button>
        <button type="button" class="ghost" data-mc-least="A">甲部空白撞最少</button>
        <button type="button" class="ghost" data-mc-least="B">乙部空白撞最少</button>
      </div>
      <p class="hint">黑筆＝有信心。藍筆＝撞。再撳同一格就清走。填卷期間唔出答案、課題同命中率。${year ? "" : "揀年份先可以對答案同寫入。"}</p>
      <div class="mc-sheet">
        <div>${colHtml(1, 25, d, year)}</div>
        <div>${colHtml(26, 45, d, year)}</div>
      </div>
      <div class="mc-tools">
        <button type="button" id="mcCheck" ${d.revealed ? "disabled" : ""}>${d.revealed ? "已對答案" : "對答案"}</button>
        ${year ? `<button type="button" class="ghost" id="mcWrite">寫入進度</button>` : ""}
      </div>
      ${sum}
      ${shortcuts}
      ${radar}`;
    window.scrollTo(0, keep);
  }

  function fillLeast(part) {
    const d = draft();
    const from = part === "A" ? 1 : 31;
    const to = part === "A" ? 30 : 45;
    const name = part === "A" ? "甲部" : "乙部";
    const t = tally(d, from, to);
    if (!t.black) { alert(name + "還沒有黑筆，唔會自動撞。"); return; }
    const least = leastOf(t.counts);
    if (least.length !== 1) {
      alert(name + "黑筆 " + countLine(t.counts) + "，最少係 " + least.join("、") + "，請自行用藍筆填。");
      return;
    }
    if (!t.blanks.length) { alert(name + "冇空白題。"); return; }
    if (prefs.mcWarn !== false) {
      const msg = name + "黑筆 " + countLine(t.counts) + "，空白 " + t.blanks.length + " 題將填 " + least[0] + "（藍筆）。確定？";
      if (!confirm(msg)) return;
    }
    t.blanks.forEach(q => { d.picks[q] = { letter: least[0], ink: "b" }; });
    renderMcSheet();
  }

  function applyBatch(kind) {
    const year = mcYear();
    const d = draft();
    if (!d.revealed || !year) return;
    for (let q = 1; q <= 45; q++) {
      const p = d.picks[q];
      if (!p || !p.letter) continue;
      const hit = judged(year, q, p.letter);
      const blue = p.ink === "b";
      let s = 0;
      if (kind === "sure-ok" && !blue && hit) s = 3;
      else if (kind === "sure-bad" && !blue && hit === false) s = 1;
      else if (kind === "guess-bad" && blue && hit === false) s = 1;
      else continue;
      d.status[q] = s;
      d.touch[q] = d.touch[q] || {};
      d.touch[q].s = true;
    }
    renderMcSheet();
  }

  function writeSheet() {
    const year = mcYear();
    if (!year) return;
    const d = draft();
    const s = d.revealed ? summary(year, d) : null;
    let statusN = 0, noteN = 0, letters = 0, cleared = 0;
    for (let q = 1; q <= 45; q++) {
      if (d.picks[q] && d.picks[q].letter) letters++;
      else if (getCell("p2", year, q).mc) cleared++;
      if (d.touch[q] && d.touch[q].s) statusN++;
      if (d.touch[q] && d.touch[q].note) noteN++;
    }
    const timerOn = document.getElementById("timerPaper").value === "p2" && (timerRun.paused || timerRun.ended);
    const timerRuning = document.getElementById("timerPaper").value === "p2" && timerRun.start && !timerRun.paused && !timerRun.ended;
    const lines = ["寫入 " + year + " 卷二？"];
    lines.push(s ? "分數 " + s.ok + "/45" : "未對答案，分數唔更新");
    if (timerOn) lines.push("用時 " + fmtHm(timerUsedSec()));
    else if (timerRuning) lines.push("計時未暫停，唔寫用時");
    else lines.push("冇計時可寫");
    lines.push("選項 " + letters + " 題" + (cleared ? "，清空 " + cleared + " 題" : ""));
    lines.push("狀態更新 " + statusN + " 題，筆記 " + noteN + " 題");
    lines.push("今次未改嘅狀態同筆記唔郁。");
    if (!confirm(lines.join("\n"))) return;
    pushUndo();
    const pr = prof();
    for (let q = 1; q <= 45; q++) {
      const k = "p2:" + year + ":" + q;
      const p = d.picks[q];
      let cell = pr.cells[k];
      if (p && p.letter) {
        cell = cell || { s: 0, note: "", tags: [] };
        cell.mc = p.letter;
        if (p.ink === "b") cell.ink = "b";
        else delete cell.ink;
        pr.cells[k] = cell;
      } else if (cell && cell.mc) {
        delete cell.mc;
        delete cell.ink;
        if (!cell.s && !(cell.note && cell.note.length) && !(cell.tags && cell.tags.length)) delete pr.cells[k];
      }
      if (d.touch[q] && d.touch[q].s) {
        cell = pr.cells[k] || { s: 0, note: "", tags: [] };
        cell.s = d.status[q] || 0;
        if (cell.s === 1 || cell.s === 2) cell.w = 1;
        else if (cell.s === 0) cell.w = 0;
        pr.cells[k] = cell;
      }
      if (d.touch[q] && d.touch[q].note) {
        cell = pr.cells[k] || { s: 0, note: "", tags: [] };
        cell.note = d.notes[q] || "";
        pr.cells[k] = cell;
      }
    }
    if (s) setScore("p2", year, s.ok);
    if (timerOn) setTimeSec("p2", year, timerUsedSec());
    if (!getDate("p2", year)) {
      const now = new Date();
      const p = n => String(n).padStart(2, "0");
      setDate("p2", year, now.getFullYear() + "-" + p(now.getMonth() + 1) + "-" + p(now.getDate()));
    }
    pr.updatedAt = Date.now();
    save();
    if (currentView === "tracker" && currentPaper === "p2") renderTracker();
  }

  function personMc(pr, year) {
    let scoreLetters = 0, ok = 0, bk = 0, bkOk = 0, bl = 0, blOk = 0, sureBad = 0, marked = 0, filled = 0;
    for (let q = 1; q <= 45; q++) {
      const c = getCellOf(pr, "p2", year, q);
      if (c.s) marked++;
      if (!c.mc || !LETTERS.includes(c.mc)) continue;
      filled++;
      const hit = judged(year, q, c.mc);
      const blue = c.ink === "b";
      if (blue) bl++; else bk++;
      if (hit) {
        ok++;
        if (blue) blOk++; else bkOk++;
      } else if (hit === false && !blue) sureBad++;
    }
    scoreLetters = ok;
    const stored = (pr.scores || {})["p2:" + year];
    const score = stored == null || stored === "" ? (filled ? scoreLetters : null) : +stored;
    return { score, bk, bkOk, bl, blOk, sureBad, marked, filled };
  }
  function keepQ(c, year, q, filter) {
    if (!filter) return true;
    if (!c.mc) return false;
    const hit = judged(year, q, c.mc);
    const blue = c.ink === "b";
    if (filter === "sure-bad") return !blue && hit === false;
    if (filter === "guess-ok") return blue && hit === true;
    return true;
  }
  function renderClassMc() {
    const box = document.getElementById("classMc");
    if (!box || typeof classUnlocked !== "function" || !classUnlocked()) return;
    const paper = typeof classPaperId === "function" ? classPaperId() : "p1";
    if (paper !== "p2") { box.innerHTML = ""; return; }
    const year = +prefs.classYear || 2026;
    const cls = prefs.classSel === "__none" ? "" : (prefs.classSel || "");
    const people = peopleOfClass(cls);
    const years = yearsDesc().map(y => `<option value="${y}"${y === year ? " selected" : ""}>${y}</option>`).join("");
    const mode = classUi.mode;
    const filter = classUi.filter;
    let body = "";
    if (mode === "q") {
      const rows = [];
      for (let q = 1; q <= 45; q++) {
        const dist = { A: 0, B: 0, C: 0, D: 0 };
        let sureBad = 0, guessOk = 0, any = false;
        people.forEach(n => {
          const c = getCellOf(db.profiles[n], "p2", year, q);
          if (!c.mc || !dist.hasOwnProperty(c.mc)) return;
          dist[c.mc]++;
          any = true;
          const hit = judged(year, q, c.mc);
          if (c.ink !== "b" && hit === false) sureBad++;
          if (c.ink === "b" && hit) guessOk++;
        });
        if (filter === "sure-bad" && !sureBad) continue;
        if (filter === "guess-ok" && !guessOk) continue;
        if (!any && filter) continue;
        const key = keyMap(year)[q] || {};
        const topic = topicOf(year, q) || "";
        rows.push(`<tr><td>${q}</td><td>${esc(topic)}</td><td>${esc(key.ans || "—")}</td><td>${key.pct == null ? "—" : Math.round(key.pct) + "%"}</td><td>${dist.A}</td><td>${dist.B}</td><td>${dist.C}</td><td>${dist.D}</td><td>${sureBad}</td></tr>`);
      }
      body = `<div style="overflow:auto"><table class="data-table"><thead><tr><th>題</th><th>課題</th><th>答案</th><th>全港</th><th>A</th><th>B</th><th>C</th><th>D</th><th>黑筆錯</th></tr></thead><tbody>${rows.join("") || `<tr><td colspan="9">冇符合嘅題。</td></tr>`}</tbody></table></div>`;
    } else {
      body = `<div style="overflow:auto"><table class="data-table"><thead><tr><th>姓名</th><th>總分</th><th>黑筆</th><th>撞中</th><th>信心錯</th><th>已標狀態</th></tr></thead><tbody>`;
      people.forEach(n => {
        const st = personMc(db.profiles[n], year);
        body += `<tr><td><button type="button" class="ghost" data-mc-open="${esc(n)}">${esc(n)}</button></td><td>${st.score == null ? "—" : st.score}</td><td>${st.bkOk}/${st.bk}</td><td>${st.blOk}/${st.bl}</td><td>${st.sureBad}</td><td>${st.marked}</td></tr>`;
        if (classUi.open === n) {
          let cells = "";
          for (let q = 1; q <= 45; q++) {
            const c = getCellOf(db.profiles[n], "p2", year, q);
            if (!keepQ(c, year, q, filter)) continue;
            const hit = c.mc ? judged(year, q, c.mc) : null;
            const clsN = (c.ink === "b" ? "b" : "k") + (hit == null ? "" : hit ? " ok" : " bad");
            const topic = topicOf(year, q) || "";
            const stLab = c.s ? STATE_LABEL[c.s] : "未標";
            cells += `<div class="class-mc-cell ${clsN}" title="${esc(topic)}　${stLab}">${q}<br>${esc(c.mc || "–")}<br>${esc(stLab)}</div>`;
          }
          body += `<tr><td colspan="6"><div class="class-mc-grid">${cells || "冇符合嘅題。"}</div></td></tr>`;
        }
      });
      body += `</tbody></table></div>`;
    }
    box.innerHTML = `<h3 class="sec-title">卷二作答</h3>
      <p class="hint">字母同筆色跟進度。對錯用官方答案計，唔使等學生撳對答案。筆記唔喺呢度。</p>
      <div class="mc-tools">
        <label>年份 <select id="classMcYear">${years}</select></label>
        <button type="button" class="ghost${mode === "person" ? " on-toggle" : ""}" data-mc-mode="person">按人</button>
        <button type="button" class="ghost${mode === "q" ? " on-toggle" : ""}" data-mc-mode="q">按題</button>
        <button type="button" class="ghost${filter === "sure-bad" ? " on-toggle" : ""}" data-mc-filter="sure-bad">淨係信心錯</button>
        <button type="button" class="ghost${filter === "guess-ok" ? " on-toggle" : ""}" data-mc-filter="guess-ok">淨係撞中</button>
        <button type="button" class="ghost" id="classMcCsv">匯出作答 CSV</button>
      </div>
      ${body}`;
  }
  function exportClassMc() {
    const year = +prefs.classYear || 2026;
    const cls = prefs.classSel === "__none" ? "" : (prefs.classSel || "");
    const people = peopleOfClass(cls);
    const lines = ["班,姓名,題號,課題,選項,筆色,對錯,狀態"];
    people.forEach(n => {
      for (let q = 1; q <= 45; q++) {
        const c = getCellOf(db.profiles[n], "p2", year, q);
        if (!c.mc && !c.s) continue;
        const hit = c.mc ? judged(year, q, c.mc) : null;
        const mark = hit == null ? "" : hit ? "對" : "錯";
        const ink = c.mc ? (c.ink === "b" ? "藍" : "黑") : "";
        const cols = [cls || "未分班", n, q, topicOf(year, q) || "", c.mc || "", ink, mark, c.s ? STATE_LABEL[c.s] : ""];
        lines.push(cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
      }
    });
    downloadBlob(new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" }), "dse-math-p2-mc-" + year + ".csv");
  }

  function readMcTail(buf) {
    if (!buf || buf.length < 8 || buf[0] !== 68 || buf[1] !== 77 || buf[2] !== 84 || buf[3] !== 49) return null;
    const nameLen = buf[4];
    let o = 5 + nameLen;
    const slots = cellLayout();
    o += Math.ceil(slots.length * 2 / 8);
    o += XFER_PAPERS.length * YEARS.length;
    if (o + 2 > buf.length) return null;
    const tagN = buf[o] | (buf[o + 1] << 8);
    o += 2 + tagN * 4;
    if (o + 2 > buf.length) return null;
    const metaN = buf[o] | (buf[o + 1] << 8);
    o += 2 + metaN * 7;
    if (o === buf.length || o + 2 > buf.length) return null;
    const mcN = buf[o] | (buf[o + 1] << 8);
    o += 2;
    const map = {};
    for (let t = 0; t < mcN && o + 3 <= buf.length; t++) {
      const y = 2012 + buf[o];
      const q = buf[o + 1];
      const pack = buf[o + 2];
      o += 3;
      const letter = LETTERS[(pack & 7) - 1] || "";
      if (!letter) continue;
      map["p2:" + y + ":" + q] = { mc: letter, ink: (pack & 8) ? "b" : "" };
    }
    return map;
  }
  function mcBytes(profile) {
    const recs = [];
    YEARS.forEach(y => {
      for (let q = 1; q <= 45; q++) {
        const c = (profile.cells || {})["p2:" + y + ":" + q];
        if (!c || !LETTERS.includes(c.mc)) continue;
        let pack = LETTERS.indexOf(c.mc) + 1;
        if (c.ink === "b") pack |= 8;
        recs.push(y - 2012, q, pack);
      }
    });
    return recs;
  }
  const _encodeQrSnap = encodeQrSnap;
  encodeQrSnap = function (profile) {
    const base = _encodeQrSnap(profile);
    const recs = mcBytes(profile);
    const out = new Uint8Array(base.length + 2 + recs.length);
    out.set(base, 0);
    const n = recs.length / 3;
    out[base.length] = n & 255;
    out[base.length + 1] = (n >> 8) & 255;
    recs.forEach((v, i) => { out[base.length + 2 + i] = v; });
    return out;
  };
  const _decodeQrBuf = decodeQrBuf;
  decodeQrBuf = function (buf) {
    const snap = _decodeQrBuf(buf);
    snap.mc = readMcTail(buf);
    return snap;
  };
  function putMc(p, k, v) {
    const cur = p.cells[k] || { s: 0, note: "", tags: [] };
    cur.mc = v.mc;
    if (v.ink) cur.ink = v.ink;
    else delete cur.ink;
    p.cells[k] = cur;
  }
  const _applyQrSnap = applyQrSnap;
  applyQrSnap = function (targetName, snap, mode) {
    const prev = db.profiles[targetName];
    const before = {};
    if (prev) {
      Object.entries(prev.cells || {}).forEach(([k, c]) => {
        if (c && c.mc) before[k] = { mc: c.mc, ink: c.ink || "" };
      });
    }
    _applyQrSnap(targetName, snap, mode);
    const p = db.profiles[targetName];
    if (!p) return;
    if (mode === "replace") {
      if (snap.mc == null) Object.entries(before).forEach(([k, v]) => putMc(p, k, v));
      else Object.entries(snap.mc).forEach(([k, v]) => putMc(p, k, v));
    } else {
      Object.entries(before).forEach(([k, v]) => putMc(p, k, v));
      if (snap.mc) Object.entries(snap.mc).forEach(([k, v]) => putMc(p, k, v));
    }
  };

  const _paintTimer = paintTimer;
  paintTimer = function () {
    _paintTimer();
    if (document.getElementById("timerPaper").value === "p2") {
      const b = document.getElementById("timerSave");
      if (b) b.hidden = true;
    }
  };
  const _renderTimer = renderTimer;
  renderTimer = function () { _renderTimer(); renderMcSheet(); };
  const _renderClassPage = renderClassPage;
  renderClassPage = function () { _renderClassPage(); renderClassMc(); };
  const _cellHtml = cellHtml;
  cellHtml = function (y, q) {
    const html = _cellHtml(y, q);
    if (currentPaper !== "p2") return html;
    const c = getCell("p2", y, q);
    if (!c.mc || c.ink !== "b") return html;
    if (html.includes("syll-old") || html.includes("syll-part")) return html;
    return html.replace('<div class="cell ', '<div class="cell mc-guess ');
  };

  const sheet = document.getElementById("mcSheet");
  if (sheet) {
    sheet.addEventListener("click", e => {
      const penBtn = e.target.closest("[data-mc-pen]");
      if (penBtn) { prefs.mcPen = penBtn.dataset.mcPen; savePrefs(); renderMcSheet(); return; }
      const warnBtn = e.target.closest("[data-mc-warn]");
      if (warnBtn) { prefs.mcWarn = prefs.mcWarn === false; savePrefs(); renderMcSheet(); return; }
      const leastBtn = e.target.closest("[data-mc-least]");
      if (leastBtn) { fillLeast(leastBtn.dataset.mcLeast); return; }
      const bub = e.target.closest("[data-mc-l]");
      if (bub) {
        const q = +bub.dataset.mcQ;
        const L = bub.dataset.mcL;
        const d = draft();
        const ink = pen();
        const cur = d.picks[q];
        if (cur && cur.letter === L && cur.ink === ink) delete d.picks[q];
        else d.picks[q] = { letter: L, ink };
        renderMcSheet();
        return;
      }
      const st = e.target.closest("[data-mc-s]");
      if (st) {
        const q = +st.dataset.mcQ;
        const s = +st.dataset.mcS;
        const d = draft();
        d.touch[q] = d.touch[q] || {};
        d.touch[q].s = true;
        d.status[q] = d.status[q] === s ? 0 : s;
        renderMcSheet();
        return;
      }
      const batch = e.target.closest("[data-mc-batch]");
      if (batch) { applyBatch(batch.dataset.mcBatch); return; }
      const radar = e.target.closest("[data-mc-radar]");
      if (radar) { prefs.mcRadar = radar.dataset.mcRadar; savePrefs(); renderMcSheet(); return; }
      if (e.target.id === "mcCheck") {
        const year = mcYear();
        if (!year) { alert("揀年份先可以對答案。"); return; }
        const d = draft();
        if (d.revealed) return;
        if (!confirm("對完會顯示答案、課題同全港命中率，確定？")) return;
        d.revealed = true;
        renderMcSheet();
        return;
      }
      if (e.target.id === "mcWrite") writeSheet();
    });
    sheet.addEventListener("input", e => {
      const note = e.target.closest("[data-mc-note]");
      if (!note) return;
      const q = +note.dataset.mcNote;
      const d = draft();
      d.notes[q] = note.value;
      d.touch[q] = d.touch[q] || {};
      d.touch[q].note = true;
    });
  }
  const classBox = document.getElementById("classMc");
  if (classBox) {
    classBox.addEventListener("click", e => {
      const mode = e.target.closest("[data-mc-mode]");
      if (mode) { classUi.mode = mode.dataset.mcMode; renderClassMc(); return; }
      const fil = e.target.closest("[data-mc-filter]");
      if (fil) {
        classUi.filter = classUi.filter === fil.dataset.mcFilter ? "" : fil.dataset.mcFilter;
        renderClassMc();
        return;
      }
      const open = e.target.closest("[data-mc-open]");
      if (open) {
        classUi.open = classUi.open === open.dataset.mcOpen ? "" : open.dataset.mcOpen;
        renderClassMc();
        return;
      }
      if (e.target.id === "classMcCsv") exportClassMc();
    });
    classBox.addEventListener("change", e => {
      if (e.target.id !== "classMcYear") return;
      prefs.classYear = +e.target.value;
      savePrefs();
      renderClassPage();
    });
  }
  const paperSel = document.getElementById("timerPaper");
  const yearSel = document.getElementById("timerYear");
  if (paperSel) {
    const prev = paperSel.onchange;
    paperSel.onchange = ev => { if (prev) prev(ev); renderMcSheet(); };
  }
  if (yearSel) {
    const prev = yearSel.onchange;
    yearSel.onchange = ev => { if (prev) prev(ev); renderMcSheet(); };
  }
})();
