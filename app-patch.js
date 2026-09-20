(function () {
  if (typeof noteTopic === "undefined") {
    window.noteTopic = "";
    window.notePart = "";
    window.noteTag = "";
  }
  window.collectNotes = function collectNotes() {
    const items = [];
    for (const y of yearsDesc()) {
      for (const q of allQs(currentPaper, y)) {
        if (PAPERS[currentPaper].missing(y).includes(q)) continue;
        const c = getCell(currentPaper, y, q);
        if (!hasNote(c)) continue;
        const bits = cellTopicBits(currentPaper, y, q);
        items.push({ y: y, q: q, c: c, part: bits.part || "", topic: bits.topic || "", tags: c.tags || [] });
      }
    }
    return items;
  };
  window.noteMatch = function noteMatch(it) {
    if (notePart && it.part !== notePart) return false;
    if (noteTopic && it.topic !== noteTopic) return false;
    if (noteTag && !(it.tags || []).includes(noteTag)) return false;
    return true;
  };
  window.renderNoteList = function renderNoteList() {
    const box = document.getElementById("noteList");
    const body = document.getElementById("noteListBody");
    const filt = document.getElementById("noteFilters");
    if (!box || !body) return;
    const wasOpen = box.open;
    const all = collectNotes();
    box.hidden = !all.length;
    if (!all.length) { body.innerHTML = ""; if (filt) filt.innerHTML = ""; return; }
    const topics = [];
    const seenT = new Set();
    all.forEach(function (it) {
      if (!it.topic || seenT.has(it.topic)) return;
      seenT.add(it.topic);
      topics.push({ topic: it.topic, part: it.part, old: OLD_TOPICS.has(it.topic) });
    });
    topics.sort(function (a, b) { return (a.part || "").localeCompare(b.part || "") || a.topic.localeCompare(b.topic); });
    if (noteTopic && !seenT.has(noteTopic)) noteTopic = "";
    const parts = [];
    all.forEach(function (it) { if (it.part && parts.indexOf(it.part) < 0) parts.push(it.part); });
    if (notePart && parts.indexOf(notePart) < 0) notePart = "";
    const tags = TAGS.filter(function (pair) { return all.some(function (it) { return it.tags.indexOf(pair[0]) >= 0; }); });
    if (noteTag && !tags.some(function (pair) { return pair[0] === noteTag; })) noteTag = "";
    const shown = all.filter(noteMatch);
    if (filt) {
      const hasTopic = currentPaper === "p1" || currentPaper === "p2" || currentPaper === "m2";
      var topicSel = "";
      if (hasTopic) {
        topicSel = "<label>\u8ab2\u984c <select id=\"noteTopicSel\"><option value=\"\">\u5168\u90e8\u8ab2\u984c</option>";
        topics.forEach(function (x) {
          topicSel += "<option value=\"" + esc(x.topic) + "\"" + (noteTopic === x.topic ? " selected" : "") + ">" + esc(x.part ? x.part + "\u3000" : "") + esc(x.topic) + (x.old ? "\uff08\u820a\u8ab2\u7a0b\uff09" : "") + "</option>";
        });
        topicSel += "</select></label>";
      }
      var partBtns = "";
      if (hasTopic && parts.length) {
        partBtns = "<span class=\"seg mini\" id=\"notePartSeg\">";
        ["", "\u7532", "\u4e59"].forEach(function (p) {
          if (p && parts.indexOf(p) < 0) return;
          partBtns += "<button type=\"button\" data-note-part=\"" + p + "\" class=\"" + (notePart === p ? "on" : "") + "\">" + (p || "\u5168\u90e8") + "</button>";
        });
        partBtns += "</span>";
      }
      var tagSel = "";
      if (tags.length) {
        tagSel = "<label>\u6a19\u7c64 <select id=\"noteTagSel\"><option value=\"\">\u5168\u90e8\u6a19\u7c64</option>";
        tags.forEach(function (pair) {
          tagSel += "<option value=\"" + pair[0] + "\"" + (noteTag === pair[0] ? " selected" : "") + ">" + esc(pair[1]) + "</option>";
        });
        tagSel += "</select></label>";
      }
      filt.innerHTML = "<div class=\"note-filter-row\">" + topicSel + partBtns + tagSel + "</div>";
    }
    box.querySelector("summary").textContent = "\u7b46\u8a18\u4e00\u89bd\u3000" + shown.length + (shown.length !== all.length ? "\uff0f" + all.length : "");
    if (!shown.length) body.innerHTML = "<p class=\"hint\">\u5462\u500b\u7be9\u5187\u7b46\u8a18\u3002</p>";
    else body.innerHTML = shown.map(function (it) {
      const topic = [it.part, it.topic].filter(Boolean).join("\u3000");
      return "<button type=\"button\" class=\"note-row\" data-jump=\"" + it.y + ":" + it.q + "\" data-jump-paper=\"" + currentPaper + "\"><b>" + it.y + " Q" + it.q + (topic ? "\u3000" + esc(topic) : "") + "</b><span>" + esc(notePreview(it.c)) + "</span></button>";
    }).join("");
    box.open = wasOpen;
  };
  const _renderStats = window.renderStats;
  window.renderStats = function renderStats() {
    if (typeof _renderStats === "function") _renderStats();
    const box = document.getElementById("stats");
    const ring = box && box.querySelector(".ring-stat");
    if (!ring) return;
    var total = 0, counts = [0, 0, 0, 0];
    for (var yi = 0; yi < YEARS.length; yi++) {
      var y = YEARS[yi];
      var qs = visQs(y, allQs(currentPaper, y));
      for (var qi = 0; qi < qs.length; qi++) { total++; counts[getCell(currentPaper, y, qs[qi]).s]++; }
    }
    var done = total - counts[0];
    var spans = ring.querySelectorAll("span");
    var lab = ring.querySelector(".ring-lab") || spans[0];
    if (lab) { lab.classList.add("ring-lab"); lab.textContent = "\u5df2\u6a19\u8a18\u3000" + done + "/" + total; }
    var undo = ring.querySelector(".ring-undo") || ring.querySelector("span.sub") || spans[1];
    if (undo) { undo.classList.add("ring-undo"); undo.textContent = "\u672a\u505a " + counts[0]; }
    ring.querySelectorAll("span").forEach(function (sp) { if (sp !== lab && sp !== undo) sp.remove(); });
  };
  const _paintTimer = window.paintTimer;
  window.paintTimer = function paintTimer() {
    if (typeof _paintTimer === "function") _paintTimer();
    const extraSeg = document.getElementById("timerExtraSeg");
    const extraBtn = document.getElementById("timerExtra");
    if (extraSeg) {
      extraSeg.hidden = false;
      extraSeg.classList.toggle("is-running", !!timerLocked);
      extraSeg.querySelectorAll("[data-extra]").forEach(function (b) {
        b.classList.toggle("on", (b.dataset.extra === "1") === !!timerExtra);
        b.disabled = !!timerLocked;
      });
    }
    if (extraBtn) extraBtn.hidden = !!extraSeg;
  };
  const paperEl = document.getElementById("paper");
  if (paperEl) {
    const prev = paperEl.onchange;
    paperEl.onchange = function (e) {
      noteTopic = ""; notePart = ""; noteTag = "";
      if (typeof prev === "function") prev.call(this, e);
    };
  }
  const noteList = document.getElementById("noteList");
  if (noteList && !noteList.dataset.patchBound) {
    noteList.dataset.patchBound = "1";
    noteList.addEventListener("click", function (e) {
      const part = e.target.closest("[data-note-part]");
      if (part) { notePart = part.dataset.notePart || ""; renderNoteList(); e.stopPropagation(); }
    });
    noteList.addEventListener("change", function (e) {
      if (e.target.id === "noteTopicSel") { noteTopic = e.target.value; renderNoteList(); }
      if (e.target.id === "noteTagSel") { noteTag = e.target.value; renderNoteList(); }
    });
  }
  const seg = document.getElementById("timerExtraSeg");
  if (seg && !seg.dataset.patchBound) {
    seg.dataset.patchBound = "1";
    seg.addEventListener("click", function (e) {
      const b = e.target.closest("[data-extra]");
      if (!b || timerLocked) return;
      timerExtra = b.dataset.extra === "1";
      paintTimer();
    });
  }
  try { if (currentView === "tracker") { renderStats(); renderNoteList(); } } catch (e) {}
  try { if (currentView === "timer") paintTimer(); } catch (e) {}
})();
(function loadM2Overlay() {
  const files = ["./data/p1-q5-fix.js?v=20260920i","./app-m2a.js?v=20260920i","./app-m2b.js?v=20260920i","./app-m2c.js?v=20260920i","./app-m2-fix.js?v=20260920i"];
  function next(i) {
    if (i >= files.length) {
      try {
        window.classEligible = function (pr, paper) { return markedCountOf(pr, paper) >= classMinFor(paper); };
        if (typeof renderPaperSelect === "function") renderPaperSelect();
        if (typeof fillTopicFilter === "function") fillTopicFilter();
        if (typeof currentView !== "undefined" && currentView === "tracker" && typeof renderGrid === "function") renderGrid();
        if (typeof currentView !== "undefined" && currentView === "ability" && typeof renderRadar === "function") renderRadar();
        if (typeof currentView !== "undefined" && currentView === "items" && typeof renderItemTopics === "function") renderItemTopics();
      } catch (e) {}
      return;
    }
    const s = document.createElement("script");
    s.src = files[i];
    s.onload = function () { next(i + 1); };
    s.onerror = function () { next(i + 1); };
    document.body.appendChild(s);
  }
  next(0);
})();
