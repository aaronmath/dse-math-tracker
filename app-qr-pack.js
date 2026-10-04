/* 進度碼：位元打包，1–4 個 QR，掃齊先寫入。舊 DSEMT 碼仍可掃。筆記唔入。 */
(function () {
  const PAP = ["p1", "p2", "m1", "m2"];

  function BitWriter() { this.a = []; }
  BitWriter.prototype.u = function (v, n) {
    v >>>= 0;
    for (let i = n - 1; i >= 0; i--) this.a.push((v >>> i) & 1);
  };
  BitWriter.prototype.bytes = function () {
    const b = new Uint8Array(Math.ceil(this.a.length / 8));
    for (let i = 0; i < this.a.length; i++) if (this.a[i]) b[i >> 3] |= 128 >> (i & 7);
    return b;
  };
  function BitReader(bytes) { this.b = bytes || new Uint8Array(0); this.i = 0; }
  BitReader.prototype.u = function (n) {
    let v = 0;
    for (let k = 0; k < n; k++) {
      const o = this.i >> 3;
      const bit = o < this.b.length ? (this.b[o] >> (7 - (this.i & 7))) & 1 : 0;
      this.i++;
      v = (v << 1) | bit;
    }
    return v;
  };

  function topicsOf(paper) {
    if (paper === "m2") return (window.M2_TOPICS && window.M2_TOPICS.items) || [];
    if (paper === "p1") return (window.P1_TOPICS && window.P1_TOPICS.items) || [];
    return [];
  }
  function itemsOf(paper, year) {
    return topicsOf(paper).filter(x => x.y === +year);
  }
  function cellOf(profile, paper, year, q) {
    return ((profile && profile.cells) || {})[paper + ":" + year + ":" + q] || {};
  }
  function tagBits(tags) {
    let m = 0;
    (tags || []).forEach(id => {
      const i = TAGS.findIndex(t => t[0] === id);
      if (i >= 0 && i < 8) m |= 1 << i;
    });
    return m & 255;
  }
  function nameBytes(name) {
    const enc = new TextEncoder();
    let s = String(name || "學生").slice(0, 40);
    let b = enc.encode(s);
    while (b.length > 40 && s.length) {
      s = s.slice(0, -1);
      b = enc.encode(s);
    }
    return b;
  }
  function paperUsed(profile, paper, year) {
    const k = paper + ":" + year;
    if (allQs(paper, year).some(q => {
      const c = cellOf(profile, paper, year, q);
      return (c.s | 0) || (c.tags && c.tags.length) || c.mc || (c.pts && Object.keys(c.pts).length);
    })) return true;
    const sc = (profile.scores || {})[k];
    if (sc != null && sc !== "") return true;
    if ((profile.times || {})[k]) return true;
    if ((profile.dates || {})[k]) return true;
    return false;
  }
  function partVals(profile, paper, year) {
    return itemsOf(paper, year).map(it => {
      const pts = cellOf(profile, paper, year, it.q).pts || {};
      if (pts[it.sub] == null || pts[it.sub] === "") return null;
      const n = Math.round(+pts[it.sub]);
      return Number.isFinite(n) ? Math.max(0, Math.min(7, n)) : null;
    });
  }

  function packBits(profile) {
    const nb = nameBytes(profile && profile.name);
    const w = new BitWriter();
    const years = [];
    let mask = 0;
    YEARS.forEach(y => {
      if (PAP.some(p => paperUsed(profile, p, y))) {
        mask |= 1 << (y - 2012);
        years.push(y);
      }
    });
    w.u(mask, 16);
    years.forEach(y => {
      let pm = 0;
      PAP.forEach((p, i) => { if (paperUsed(profile, p, y)) pm |= 1 << i; });
      w.u(pm, 4);
      PAP.forEach((paper, i) => {
        if (!(pm & (1 << i))) return;
        allQs(paper, y).forEach(q => {
          const c = cellOf(profile, paper, y, q);
          w.u((c.s | 0) & 3, 2);
          const tb = tagBits(c.tags);
          w.u(tb ? 1 : 0, 1);
          if (tb) w.u(tb, 8);
          if (paper === "p2") {
            const li = "ABCD".indexOf(c.mc || "");
            w.u(li >= 0 ? 1 : 0, 1);
            if (li >= 0) {
              w.u(li, 2);
              w.u(c.ink === "b" ? 1 : 0, 1);
            }
          }
        });
        if (paper === "p1" || paper === "m2") {
          const vals = partVals(profile, paper, y);
          if (vals.length) {
            const full = vals.every(v => v != null);
            w.u(full ? 1 : 0, 1);
            if (full) vals.forEach(v => w.u(v, 3));
            else vals.forEach(v => {
              w.u(v == null ? 0 : 1, 1);
              if (v != null) w.u(v, 3);
            });
          }
        }
        const derived = (paper === "p1" || paper === "m2") && partVals(profile, paper, y).some(v => v != null);
        const hand = (profile.scores || {})[paper + ":" + y];
        if (!derived && hand != null && hand !== "" && Number.isFinite(+hand)) {
          w.u(1, 1);
          w.u(Math.max(0, Math.min(254, Math.round(+hand))), 8);
        } else w.u(0, 1);
        const sec = (profile.times || {})[paper + ":" + y];
        if (sec) {
          w.u(1, 1);
          w.u(Math.max(1, Math.min(65535, Math.round(+sec / 60))), 16);
        } else w.u(0, 1);
        const iso = (profile.dates || {})[paper + ":" + y] || "";
        const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
        if (dm) {
          w.u(1, 1);
          w.u(+dm[2], 4);
          w.u(+dm[3], 5);
        } else w.u(0, 1);
      });
    });
    const bits = w.bytes();
    const out = new Uint8Array(1 + nb.length + bits.length);
    out[0] = nb.length;
    out.set(nb, 1);
    out.set(bits, 1 + nb.length);
    return out;
  }

  function unpackBits(raw) {
    const buf = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
    const nameLen = buf[0] || 0;
    const name = new TextDecoder().decode(buf.subarray(1, 1 + nameLen)) || "學生";
    const r = new BitReader(buf.subarray(1 + nameLen));
    const yearMask = r.u(16);
    const status = {};
    const tags = {};
    const mc = {};
    const parts = {};
    const scores = [];
    const times = {};
    const dates = {};
    YEARS.forEach(y => {
      if (!(yearMask & (1 << (y - 2012)))) return;
      const pm = r.u(4);
      PAP.forEach((paper, i) => {
        if (!(pm & (1 << i))) return;
        allQs(paper, y).forEach(q => {
          const key = paper + ":" + y + ":" + q;
          const s = r.u(2);
          status[key] = s;
          if (r.u(1)) tags[key] = tagsFromMask(r.u(8));
          if (paper === "p2" && r.u(1)) {
            const li = r.u(2);
            const ink = r.u(1);
            mc[key] = { mc: "ABCD"[li] || "A", ink: ink ? "b" : "" };
          }
        });
        if (paper === "p1" || paper === "m2") {
          const its = itemsOf(paper, y);
          if (its.length) {
            const full = r.u(1);
            let sum = 0;
            let any = false;
            its.forEach(it => {
              const has = full ? 1 : r.u(1);
              if (!has) return;
              const v = r.u(3);
              const key = paper + ":" + y + ":" + it.q;
              parts[key] = parts[key] || {};
              parts[key][it.sub] = v;
              sum += v;
              any = true;
            });
            if (any) scores.push({ paper, y, v: Math.min(254, sum) });
          }
        }
        const k = paper + ":" + y;
        if (r.u(1)) scores.push({ paper, y, v: r.u(8) });
        if (r.u(1)) times[k] = r.u(16) * 60;
        if (r.u(1)) {
          const month = r.u(4);
          const day = r.u(5);
          const p = n => String(n).padStart(2, "0");
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) dates[k] = y + "-" + p(month) + "-" + p(day);
        }
      });
    });
    const slots = cellLayout();
    return {
      name,
      status: slots.map(([paper, y, q]) => status[paper + ":" + y + ":" + q] || 0),
      scores,
      tags,
      times,
      dates,
      mc,
      parts
    };
  }

  function batchId(bytes) {
    let h = 2166136261;
    for (let i = 0; i < bytes.length; i++) h = Math.imul(h ^ bytes[i], 16777619);
    return h & 65535;
  }
  function binStr(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }
  function tryMake(bytes, ecc) {
    const qr = qrcode(0, ecc);
    qr.addData(binStr(bytes), "Byte");
    qr.make();
    return qr;
  }
  function chunkBytes(payload, n) {
    const id = batchId(payload);
    const size = Math.ceil(payload.length / n) || 1;
    const out = [];
    for (let i = 0; i < n; i++) {
      const sl = payload.subarray(i * size, Math.min(payload.length, (i + 1) * size));
      const buf = new Uint8Array(10 + sl.length);
      buf[0] = 68; buf[1] = 80; buf[2] = 75; buf[3] = 49;
      buf[4] = id & 255; buf[5] = (id >> 8) & 255;
      buf[6] = i; buf[7] = n;
      buf[8] = sl.length & 255; buf[9] = (sl.length >> 8) & 255;
      buf.set(sl, 10);
      out.push(buf);
    }
    return out;
  }
  async function studentBlob(profile) {
    const raw = packBits(profile);
    let z = null;
    try { z = await deflateBytes(raw); } catch (e) { z = null; }
    if (z && z.length + 1 < raw.length) {
      const out = new Uint8Array(1 + z.length);
      out[0] = 1;
      out.set(z, 1);
      return out;
    }
    const out = new Uint8Array(1 + raw.length);
    out[0] = 0;
    out.set(raw, 1);
    return out;
  }
  async function blobToSnap(blob) {
    const body = blob.subarray(1);
    const raw = (blob[0] & 1) ? await inflateBytes(body) : body;
    return unpackBits(raw);
  }
  async function buildQrSet(profile) {
    const payload = await studentBlob(profile);
    const eccs = ["H", "Q", "M", "L"];
    for (let n = 1; n <= 4; n++) {
      const codes = chunkBytes(payload, n);
      for (let e = 0; e < eccs.length; e++) {
        try {
          const qrs = codes.map(c => tryMake(c, eccs[e]));
          return { n, ecc: eccs[e], qrs, codes, logo: n === 1 && eccs[e] === "H" && codes[0].length <= 1000 };
        } catch (err) { /* 呢個糾錯裝唔落 */ }
      }
    }
    return null;
  }

  function drawCode(canvas, qr, logo) {
    const n = qr.getModuleCount();
    const quiet = 4;
    const mod = Math.max(logo ? 4 : 3, Math.ceil((logo ? 320 : 260) / (n + quiet * 2)));
    const size = (n + quiet * 2) * mod;
    const ctx = canvas.getContext("2d");
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#1c1915";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) ctx.fillRect((quiet + c) * mod, (quiet + r) * mod, mod, mod);
      }
    }
    if (!logo) return;
    const ls = n * mod * 0.14;
    const lx = (size - ls) / 2, ly = (size - ls) / 2;
    ctx.fillStyle = "#fff";
    roundRectPath(ctx, lx - mod, ly - mod, ls + mod * 2, ls + mod * 2, mod);
    ctx.fill();
    ctx.fillStyle = "#2f5d50";
    roundRectPath(ctx, lx, ly, ls, ls, Math.max(4, mod));
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 " + Math.max(9, Math.floor(ls * 0.16)) + "px 'Noto Sans TC', sans-serif";
    ctx.fillText("DSE", size / 2, size / 2 - ls * 0.22);
    ctx.font = "700 " + Math.max(14, Math.floor(ls * 0.28)) + "px 'Noto Sans TC', sans-serif";
    ctx.fillText("操卷", size / 2, size / 2 + ls * 0.04);
    ctx.font = "500 " + Math.max(8, Math.floor(ls * 0.14)) + "px 'Noto Sans TC', sans-serif";
    ctx.fillText("神器", size / 2, size / 2 + ls * 0.28);
  }

  let bag = null;
  let page = 0;
  let seenKey = "";
  let seenAt = 0;
  let warnAt = 0;

  function resetBag() { bag = null; }
  function showPage(i, n) {
    page = i;
    const row = document.getElementById("xferQrRow");
    if (!row) return;
    [...row.querySelectorAll("canvas")].forEach((c, k) => c.classList.toggle("on", k === i));
    const lab = document.getElementById("xferQrPage");
    if (lab) lab.textContent = (i + 1) + "/" + n;
  }
  function paintQrSet(made) {
    const row = document.getElementById("xferQrRow");
    row.innerHTML = "";
    made.qrs.forEach(qr => {
      const c = document.createElement("canvas");
      c.className = "xfer-qr";
      drawCode(c, qr, made.logo);
      row.appendChild(c);
    });
    const nav = document.getElementById("xferQrNav");
    if (nav) nav.classList.toggle("show", made.n > 1);
    showPage(0, made.n);
  }

  function readChunk(bytes) {
    if (!bytes || bytes.length < 10) return null;
    if (bytes[0] !== 68 || bytes[1] !== 80 || bytes[2] !== 75 || bytes[3] !== 49) return null;
    const id = bytes[4] | (bytes[5] << 8);
    const index = bytes[6];
    const count = bytes[7];
    const len = bytes[8] | (bytes[9] << 8);
    if (count < 1 || count > 4 || index >= count || bytes.length < 10 + len) return null;
    return { id, index, count, piece: bytes.subarray(10, 10 + len) };
  }
  function hint(text) {
    const el = document.getElementById("xferScanHint");
    if (el) el.textContent = text;
  }
  function warn(text) {
    if (Date.now() - warnAt < 1600) return;
    warnAt = Date.now();
    askBox({ notice: true, text });
  }
  async function acceptPacked(bytes) {
    const ch = readChunk(bytes);
    if (!ch) return false;
    if (bag && bag.id !== ch.id) {
      warn("呢個碼係另一個學生。掃齊而家呢組，或者關閉再掃。");
      return false;
    }
    if (!bag || bag.n !== ch.count) bag = { id: ch.id, n: ch.count, parts: [] };
    bag.parts[ch.index] = ch.piece;
    const got = bag.parts.filter(Boolean).length;
    if (got < bag.n) {
      hint("已掃 " + got + "/" + bag.n + "。掃齊先寫入。");
      return false;
    }
    const chunks = [];
    for (let i = 0; i < bag.n; i++) chunks.push(bag.parts[i]);
    const len = chunks.reduce((s, p) => s + p.length, 0);
    const blob = new Uint8Array(len);
    let o = 0;
    chunks.forEach(p => { blob.set(p, o); o += p.length; });
    resetBag();
    const snap = await blobToSnap(blob);
    openXferMerge(snap);
    return true;
  }

  async function onCode(code) {
    if (!code) return false;
    const text = code.data || "";
    if (text.indexOf("DSEMTZ:") >= 0 || text.indexOf("DSEMT:") >= 0) {
      const snap = await decodeQrText(text);
      resetBag();
      openXferMerge(snap);
      return true;
    }
    const bytes = code.binaryData && code.binaryData.length ? new Uint8Array(code.binaryData) : null;
    if (!bytes) return false;
    const key = bytes.length + ":" + bytes[0] + ":" + bytes[bytes.length - 1] + ":" + (bytes[6] || 0);
    const now = Date.now();
    if (key === seenKey && now - seenAt < 900) return false;
    seenKey = key;
    seenAt = now;
    return acceptPacked(bytes);
  }

  function tickFrom(code) {
    onCode(code).then(ok => {
      if (!ok) xferRaf = requestAnimationFrame(xferScanTick);
    }).catch(() => {
      xferRaf = requestAnimationFrame(xferScanTick);
    });
  }

  xferScanTick = function () {
    const v = document.getElementById("xferVideo");
    const c = document.getElementById("xferScanCanvas");
    if (!v || !c || v.readyState < 2) {
      xferRaf = requestAnimationFrame(xferScanTick);
      return;
    }
    const w = v.videoWidth, h = v.videoHeight;
    if (!w) { xferRaf = requestAnimationFrame(xferScanTick); return; }
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0);
    const img = ctx.getImageData(0, 0, w, h);
    const code = typeof jsQR === "function" ? jsQR(img.data, w, h) : null;
    if (code && ((code.binaryData && code.binaryData.length) || code.data)) {
      tickFrom(code);
      return;
    }
    xferRaf = requestAnimationFrame(xferScanTick);
  };

  readQrFromImageFile = function (file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const c = document.getElementById("xferScanCanvas");
      const ctx = c.getContext("2d");
      c.width = img.width; c.height = img.height;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      const code = typeof jsQR === "function" ? jsQR(data.data, c.width, c.height) : null;
      if (!code) { askBox({ notice: true, text: "認唔到進度碼，試下近啲、光啲。" }); return; }
      onCode(code).then(ok => { if (!ok && !(bag && bag.parts && bag.parts.some(Boolean))) askBox({ notice: true, text: "認唔到進度碼，試下近啲、光啲。" }); });
    };
    img.onerror = () => { URL.revokeObjectURL(url); askBox({ notice: true, text: "圖片讀唔到" }); };
    img.src = url;
  };

  const prevScan = openXferScan;
  openXferScan = async function () {
    resetBag();
    seenKey = "";
    const out = await prevScan();
    hint("對準進度碼。多過一個就掃齊先寫入。");
    return out;
  };
  const prevClose = closeXferDlg;
  closeXferDlg = function () {
    resetBag();
    const dlg = document.getElementById("xferDlg");
    if (dlg) dlg.classList.remove("wide");
    return prevClose();
  };

  openXferShow = async function () {
    const dlg = document.getElementById("xferDlg");
    xferHidePanels();
    document.getElementById("xferShow").hidden = false;
    const row = document.getElementById("xferQrRow");
    if (row) row.innerHTML = "";
    try {
      const made = await buildQrSet(prof());
      if (!made) {
        askBox({ notice: true, text: "進度碼太大，四個都裝唔落。請用匯出 JSON。" });
        return;
      }
      paintQrSet(made);
      document.getElementById("xferShowMeta").textContent = "學生：" + currentProfile + "　" + made.n + " 個碼" + (made.n > 1 ? "　掃齊先寫入" : "");
      dlg.classList.toggle("wide", made.n > 1);
      if (!dlg.open) dlg.showModal();
    } catch (err) {
      askBox({ notice: true, text: "出示失敗：" + (err && err.message ? err.message : "未知") + "。改用匯出 JSON。" });
    }
  };

  const prevBtn = document.getElementById("xferQrPrev");
  const nextBtn = document.getElementById("xferQrNext");
  if (prevBtn) prevBtn.onclick = () => {
    const n = document.querySelectorAll("#xferQrRow canvas").length || 1;
    showPage((page + n - 1) % n, n);
  };
  if (nextBtn) nextBtn.onclick = () => {
    const n = document.querySelectorAll("#xferQrRow canvas").length || 1;
    showPage((page + 1) % n, n);
  };

  window.qrPackBits = packBits;
  window.qrUnpackBits = unpackBits;
  window.qrBuildSet = buildQrSet;
})();
