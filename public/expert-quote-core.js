/**
 * Expert Opinion Builder — shared drawing core.
 *
 * Pure canvas 2D drawing logic for the co-branded Q&A carousel (cover/bio/
 * qa/quote/cta slide kinds, dark+light theme, 9:16 reel or 4:5 carousel
 * format). Takes a CanvasRenderingContext2D-compatible object and plain
 * data — no DOM, no React, no localStorage, no video encoding. Works
 * against the browser's native canvas context and against @napi-rs/canvas
 * server-side, since both implement the same 2D context API.
 *
 * Loaded two ways from one file (single source of truth):
 *   - Browser: <script src="/expert-quote-core.js"> — attaches window.ExpertQuoteCore
 *   - Node:    require('./expert-quote-core.js') — CommonJS export
 *
 * Fonts (Anton / Archivo / Spline Sans Mono) must already be loaded/registered
 * by the caller before drawing — this module only references them by name.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  }
  if (root) {
    root.ExpertQuoteCore = mod;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  var WIDTH = 1080, HEIGHT = 1920;
  var CAROUSEL_WIDTH = 1080, CAROUSEL_HEIGHT = 1350;

  function dims(format) { return format === 'carousel' ? { W: CAROUSEL_WIDTH, H: CAROUSEL_HEIGHT } : { W: WIDTH, H: HEIGHT }; }
  function safe(format) {
    var d = dims(format), W = d.W, H = d.H;
    var car = format === 'carousel';
    var side = 96, extraR = car ? 0 : 96, top = car ? 150 : 250, bot = car ? 150 : 220;
    var leftX = side, rightEdge = W - side - extraR;
    return { W: W, H: H, leftX: leftX, rightEdge: rightEdge, maxW: rightEdge - leftX, centerX: (leftX + rightEdge) / 2, safeTop: top, safeBottom: H - bot };
  }

  function theme(bgMode) {
    var light = bgMode === 'light';
    return {
      light: light,
      accent: light ? '#c69214' : '#E6B53D',
      text: light ? '#16140f' : '#ffffff',
      sub: light ? '#7c6a3e' : '#9a9a93',
      body: light ? '#3a352a' : '#e6e3da',
      chalk: light ? 0.06 : 0.11
    };
  }

  function myHandle(platform) { return platform === 'tiktok' ? '@footballparent' : '@football.parent'; }
  function platformName(platform) { return platform === 'tiktok' ? 'TikTok' : 'Instagram'; }

  /* ---------- slide model ---------- */
  function hasBio(data) { return !!((data.bio && data.bio.trim()) || data.bioSrc); }
  function slideList(data) {
    var qas = data.qas || [];
    var list = [{ type: 'cover' }];
    if (hasBio(data)) list.push({ type: 'bio' });
    var showQuote = data.coverStyle !== 'quote';
    if (showQuote && data.quoteFirst) list.push({ type: 'quote' });
    qas.forEach(function (x, i) { list.push({ type: 'qa', i: i }); });
    if (showQuote && !data.quoteFirst) list.push({ type: 'quote' });
    list.push({ type: 'cta' });
    return list;
  }
  function slideCount(data) { return slideList(data).length; }
  function slideName(s) { if (s.type === 'cover') return 'Cover'; if (s.type === 'bio') return 'Bio'; if (s.type === 'qa') return 'Q' + (s.i + 1); if (s.type === 'quote') return 'Pull-quote'; return 'Closing'; }
  function slideKey(s) { return s.type === 'qa' ? 'qa' + s.i : s.type; }
  function bgFor(bgBySlide, key) { return (bgBySlide && bgBySlide[key]) || 'dark'; }
  function creditName(data) { return data.person || data.name || ''; }

  /* ---------- text helpers ---------- */
  function wordsUC(text) { return String(text).toUpperCase().split(/\s+/).filter(Boolean).map(function (w) { return { t: w.replace(/\*/g, ''), a: w.indexOf('*') !== -1 }; }); }
  function wordsRaw(text) { return String(text).split(/\s+/).filter(Boolean).map(function (w) { return { t: w.replace(/\*/g, ''), a: w.indexOf('*') !== -1 }; }); }
  function wrapWords(ctx, words, maxW, space) {
    var lines = [], line = [], w = 0;
    for (var i = 0; i < words.length; i++) {
      var wd = words[i]; var ww = ctx.measureText(wd.t).width; var add = (line.length ? space : 0) + ww;
      if (w + add > maxW && line.length) { lines.push(line); line = [wd]; w = ww; } else { line.push(wd); w += add; }
    }
    if (line.length) lines.push(line);
    return lines;
  }
  function drawLines(ctx, lines, anchorX, y, lineH, align, space, base, accent) {
    ctx.textAlign = 'left'; var yy = y;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i]; var lw = 0;
      line.forEach(function (wd, j) { lw += ctx.measureText(wd.t).width + (j ? space : 0); });
      var x = align === 'center' ? anchorX - lw / 2 : (align === 'right' ? anchorX - lw : anchorX);
      line.forEach(function (wd, j) { if (j) x += space; ctx.fillStyle = wd.a ? accent : base; ctx.fillText(wd.t, x, yy); x += ctx.measureText(wd.t).width; });
      yy += lineH;
    }
    return yy;
  }
  function fitWords(ctx, paras, maxW, maxH, hi, lo, lhR, gap, fontFn) {
    for (var s = hi; s >= lo; s -= 2) {
      ctx.font = fontFn(s); var space = ctx.measureText(' ').width; var total = 0; var wrapped = [];
      for (var i = 0; i < paras.length; i++) { var p = paras[i]; if (!p.length) continue; var ls = wrapWords(ctx, p, maxW, space); wrapped.push(ls); total += ls.length; }
      var lineH = s * lhR; var h = total * lineH + (wrapped.length > 1 ? (wrapped.length - 1) * gap : 0);
      if (h <= maxH) return { size: s, lineH: lineH, space: space, wrapped: wrapped, height: h };
    }
    ctx.font = fontFn(lo); var space2 = ctx.measureText(' ').width;
    var wrapped2 = paras.filter(function (p) { return p.length; }).map(function (p) { return wrapWords(ctx, p, maxW, space2); });
    var lineH2 = lo * lhR; var h2 = wrapped2.reduce(function (a, l) { return a + l.length; }, 0) * lineH2 + (wrapped2.length > 1 ? (wrapped2.length - 1) * gap : 0);
    return { size: lo, lineH: lineH2, space: space2, wrapped: wrapped2, height: h2 };
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /* ---------- glyph-free icon primitives (server-side font-fallback fix) ----------
   * ★ (stamp), ↗ and → (CTA action lines) are outside the subsetted woff2 unicode
   * ranges for Archivo/Spline Sans Mono bundled in public/fonts — browsers silently
   * fall back to a system symbol font for the missing glyph (how this already worked
   * pre-refactor), but @napi-rs/canvas does not do cross-family fallback. Drawn as
   * primitives instead, same fix as the ■/→ glyphs in single-slide-core/reel-core.
   */
  function drawStar(ctx, cx, cy, r, color) {
    ctx.save(); ctx.fillStyle = color; ctx.beginPath();
    for (var i = 0; i < 5; i++) {
      var oa = -Math.PI / 2 + i * (2 * Math.PI / 5);
      var ia = oa + Math.PI / 5;
      var ox = cx + r * Math.cos(oa), oy = cy + r * Math.sin(oa);
      var ix = cx + (r * 0.42) * Math.cos(ia), iy = cy + (r * 0.42) * Math.sin(ia);
      if (i === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  // (x,y) is the left tip, on a textBaseline:'top' line of size fontPx. Returns width.
  function drawArrowRight(ctx, x, y, fontPx, color) {
    var h = fontPx * 0.5, w = fontPx * 0.62, head = fontPx * 0.22;
    var midY = y + h / 2;
    ctx.save();
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, fontPx * 0.07); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, midY); ctx.lineTo(x + w - head, midY); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w, midY); ctx.lineTo(x + w - head, midY - head * 0.85); ctx.lineTo(x + w - head, midY + head * 0.85);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    return w;
  }
  // ↗ north-east arrow, same (x,y)/return-width contract as drawArrowRight.
  function drawArrowDiagonal(ctx, x, y, fontPx, color) {
    var w = fontPx * 0.56, hgt = fontPx * 0.56, head = fontPx * 0.22;
    var x0 = x, y0 = y + hgt, x1 = x + w, y1 = y;
    var dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    var xb = x1 - ux * head * 1.1, yb = y1 - uy * head * 1.1;
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(2, fontPx * 0.07); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(xb, yb); ctx.stroke();
    var px = -uy, py = ux;
    var baseX = x1 - ux * head, baseY = y1 - uy * head;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(baseX + px * head * 0.6, baseY + py * head * 0.6);
    ctx.lineTo(baseX - px * head * 0.6, baseY - py * head * 0.6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    return w;
  }
  // Draws "<icon> TEXT" centered at cx on a textBaseline:'top' line, icon as a
  // primitive instead of the '↗'/'→' glyph. font: "<weight> <size>px <family>".
  function drawIconLine(ctx, icon, text, cx, y, font, color) {
    ctx.font = font;
    var space = ctx.measureText(' ').width;
    var textW = ctx.measureText(text).width;
    var sizeMatch = font.match(/(\d+(?:\.\d+)?)px/);
    var fontPx = sizeMatch ? parseFloat(sizeMatch[1]) : 30;
    var iconW = fontPx * (icon === 'diagonal' ? 0.56 : 0.62);
    var total = iconW + space + textW;
    var startX = cx - total / 2;
    ctx.fillStyle = color;
    if (icon === 'diagonal') drawArrowDiagonal(ctx, startX, y, fontPx, color);
    else drawArrowRight(ctx, startX, y, fontPx, color);
    ctx.font = font; ctx.textAlign = 'left'; ctx.fillText(text, startX + iconW + space, y);
    ctx.textAlign = 'center';
  }

  /* ---------- image readiness (browser Image vs @napi-rs/canvas Image) ---------- */
  function imgReady(img) {
    if (!img) return false;
    if ('complete' in img) return !!img.complete && !!(img.naturalWidth || img.width);
    return !!img.width;
  }
  function imgW(img) { return img.naturalWidth || img.width; }
  function imgH(img) { return img.naturalHeight || img.height; }

  /* ---------- shared bits ---------- */
  function tacticsOverlay(ctx, format, t) { // full tactics board, the Expert Opinion signature
    var d = dims(format), W = d.W, H = d.H;
    var alpha = t.chalk, lw = 4, stroke = t.light ? 'rgba(22,20,15,' + alpha + ')' : 'rgba(255,255,255,' + alpha + ')';
    ctx.save();
    ctx.strokeStyle = stroke; ctx.lineWidth = lw;
    ctx.strokeRect(60, 200, W - 120, H - 400);
    ctx.beginPath(); ctx.moveTo(60, H / 2); ctx.lineTo(W - 60, H / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 150, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 10, 0, Math.PI * 2); ctx.fillStyle = stroke; ctx.fill();
    var bw = 400, bh = 190; ctx.strokeRect(W / 2 - bw / 2, 200, bw, bh); ctx.strokeRect(W / 2 - bw / 2, H - 200 - bh, bw, bh);
    var gw = 200, gh = 70; ctx.strokeRect(W / 2 - gw / 2, 200, gw, gh); ctx.strokeRect(W / 2 - gw / 2, H - 200 - gh, gw, gh);
    ctx.restore();
  }
  function bgDark(ctx, format, t) {
    var d = dims(format), W = d.W, H = d.H;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    if (t.light) { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#f1ece1'); } else { g.addColorStop(0, '#141715'); g.addColorStop(1, '#0c0e0d'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    tacticsOverlay(ctx, format, t);
  }
  function goldGlow() { /* floodlight removed for the flat tactics-board look; kept as a no-op for call-site parity */ }
  function stamp(ctx, cx, cy, t) { // centered gold pill "EXPERT OPINION"
    ctx.save(); ctx.font = "700 26px 'Spline Sans Mono'";
    var label = 'EXPERT OPINION', extra = 4;
    var tw = 0; for (var i = 0; i < label.length; i++) tw += ctx.measureText(label[i]).width + extra; tw += 34; // star + gap
    var padX = 26, h = 58, w = tw + padX * 2, x = cx - w / 2, y = cy - h / 2;
    ctx.fillStyle = t.accent; roundRect(ctx, x, y, w, h, 10); ctx.fill();
    ctx.fillStyle = '#0b0b0d'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    var tx = x + padX;
    drawStar(ctx, tx + 13, cy + 1, 13, '#0b0b0d'); tx += 34;
    ctx.font = "700 26px 'Spline Sans Mono'";
    for (var j = 0; j < label.length; j++) { ctx.fillText(label[j], tx, cy + 1); tx += ctx.measureText(label[j]).width + extra; }
    ctx.restore();
  }
  function logoCircle(ctx, cx, cy, r, accent, logoImg, name) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (imgReady(logoImg)) {
      ctx.save(); ctx.clip();
      var iw = imgW(logoImg), ih = imgH(logoImg), s = Math.max(2 * r / iw, 2 * r / ih), dw = iw * s, dh = ih * s;
      ctx.drawImage(logoImg, cx - dw / 2, cy - dh / 2, dw, dh); ctx.restore();
    } else {
      ctx.fillStyle = '#16161a'; ctx.fill(); ctx.fillStyle = '#7d7a52'; ctx.font = "700 " + (r * 0.42) + "px 'Archivo'";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((name || '?').slice(0, 2).toUpperCase(), cx, cy);
    }
    ctx.lineWidth = 5; ctx.strokeStyle = accent || '#E6B53D'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  function footerHandles(ctx, S, dark, platform, handle) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.font = "700 30px 'Archivo'";
    var y = S.safeBottom - 10, my = myHandle(platform), th = handle || '@guest', cross = ' × ';
    ctx.font = "700 30px 'Archivo'";
    var wMy = ctx.measureText(my).width, wC = ctx.measureText(cross).width, wTh = ctx.measureText(th).width, tot = wMy + wC + wTh;
    var x = S.centerX - tot / 2; ctx.textAlign = 'left';
    ctx.fillStyle = dark ? '#9a9a93' : '#7c6a3e'; ctx.fillText(my, x, y); x += wMy;
    ctx.fillStyle = dark ? '#5f5f58' : '#b3a98f'; ctx.fillText(cross, x, y); x += wC;
    ctx.fillStyle = dark ? '#9a9a93' : '#7c6a3e'; ctx.fillText(th, x, y);
    ctx.restore();
  }
  // Defined for parity with the pre-refactor app but not called by any current
  // slide (superseded by drawCredit's logo+name+role lockup) — dead code, kept
  // so drawSlide's call graph matches the original 1:1.
  function expertStrip(ctx, S, dark, data, images) {
    var y = S.safeTop + 6, r = 44, lx = S.leftX + r;
    logoCircle(ctx, lx, y + r, r, dark ? '#E6B53D' : '#c69214', images.logoImg, data.name);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    var title = creditName(data), sub = data.person ? (data.name || '') : (data.role || '');
    ctx.font = "400 40px 'Anton'"; ctx.fillStyle = dark ? '#fff' : '#16140f'; ctx.fillText(title.toUpperCase(), lx + r + 22, y + 38);
    ctx.font = "600 22px 'Spline Sans Mono'"; ctx.fillStyle = dark ? '#9a9a93' : '#7c6a3e'; ctx.fillText(sub.toUpperCase(), lx + r + 22, y + 74);
    ctx.strokeStyle = dark ? 'rgba(255,255,255,.12)' : 'rgba(22,20,15,.16)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(S.leftX, y + 2 * r + 30); ctx.lineTo(S.rightEdge, y + 2 * r + 30); ctx.stroke();
    return y + 2 * r + 30;
  }
  function drawCredit(ctx, S, t, ay, data, images) { // logo + credited name + sub-line lockup (bottom-left)
    var r = 44; logoCircle(ctx, S.leftX + r, ay + r, r, t.accent, images.logoImg, data.name);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = "400 42px 'Anton'"; ctx.fillStyle = t.text;
    ctx.fillText(creditName(data).toUpperCase(), S.leftX + 2 * r + 22, ay + 40);
    var subLine = data.person ? ((data.name || '') + ' · ' + (data.handle || '')) : ((data.handle || '') + ' · WITH ' + myHandle(data.platform));
    ctx.font = "600 22px 'Spline Sans Mono'"; ctx.fillStyle = t.sub; ctx.fillText(subLine.toUpperCase(), S.leftX + 2 * r + 22, ay + 74);
  }

  /* ---------- slide drawing ---------- */
  function drawCoverQuestion(ctx, format, data, images) {
    var S = safe(format), t = theme(bgFor(data.bgBySlide, 'cover'));
    bgDark(ctx, format, t);
    stamp(ctx, S.centerX, S.safeTop + 64, t);
    var creditY = S.safeBottom - 150, eyebrowH = 52;
    var regionTop = S.safeTop + 150, regionBot = creditY - 56;
    var q = (((data.coverQuestion && data.coverQuestion.trim()) || (data.qas[0] && data.qas[0].q) || data.topic || '')).trim();
    var words = wordsUC(q);
    var ctxLine = (data.coverContext || '').trim();
    var cf = null, ctxGap = 0;
    if (ctxLine) { ctxGap = 42; cf = fitWords(ctx, [wordsRaw(ctxLine)], S.maxW - 30, 180, 32, 26, 1.4, 0, function (s) { return "500 " + s + "px 'Archivo'"; }); }
    var f = fitWords(ctx, [words], S.maxW, regionBot - regionTop - eyebrowH - ctxGap - (cf ? cf.height : 0), 108, 54, 1.04, 0, function (s) { return "400 " + s + "px 'Anton'"; });
    var blockH = eyebrowH + f.height + ctxGap + (cf ? cf.height : 0);
    var y = Math.max(regionTop, (regionTop + regionBot) / 2 - blockH / 2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = "600 28px 'Spline Sans Mono'"; ctx.fillStyle = t.accent;
    ctx.fillText((data.coverEyebrow || 'A parent asks').toUpperCase(), S.centerX, y); y += eyebrowH;
    ctx.font = "400 " + f.size + "px 'Anton'"; var yq = drawLines(ctx, f.wrapped[0], S.centerX, y, f.lineH, 'center', f.space, t.text, t.accent);
    if (cf) { yq += ctxGap; ctx.font = "500 " + cf.size + "px 'Archivo'"; drawLines(ctx, cf.wrapped[0], S.centerX, yq, cf.lineH, 'center', cf.space, t.sub, t.accent); }
    drawCredit(ctx, S, t, creditY, data, images);
    footerHandles(ctx, S, !t.light, data.platform, data.handle);
  }
  function drawCoverQuote(ctx, format, data, images) {
    var S = safe(format), t = theme(bgFor(data.bgBySlide, 'cover'));
    bgDark(ctx, format, t); goldGlow();
    var accent = data.quoteWhite ? t.text : t.accent;
    stamp(ctx, S.centerX, S.safeTop + 64, t);
    var creditY = S.safeBottom - 150, markH = 130;
    var regionTop = S.safeTop + 150, regionBot = creditY - 56;
    var words = wordsUC(data.quote);
    var ctxLine = (data.coverContext || '').trim();
    var cf = null, ctxGap = 0;
    if (ctxLine) { ctxGap = 42; cf = fitWords(ctx, [wordsRaw(ctxLine)], S.maxW - 30, 180, 32, 26, 1.4, 0, function (s) { return "500 " + s + "px 'Archivo'"; }); }
    var f = fitWords(ctx, [words], S.maxW, regionBot - regionTop - markH - ctxGap - (cf ? cf.height : 0), 66, 36, 1.06, 0, function (s) { return "400 " + s + "px 'Anton'"; });
    var blockH = markH + f.height + ctxGap + (cf ? cf.height : 0);
    var y = Math.max(regionTop, (regionTop + regionBot) / 2 - blockH / 2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = "400 170px 'Anton'"; ctx.fillStyle = accent; ctx.fillText('“', S.centerX, y + 120);
    y += markH; ctx.textBaseline = 'top';
    ctx.font = "400 " + f.size + "px 'Anton'"; var yq = drawLines(ctx, f.wrapped[0], S.centerX, y, f.lineH, 'center', f.space, t.text, accent);
    if (cf) { yq += ctxGap; ctx.font = "500 " + cf.size + "px 'Archivo'"; drawLines(ctx, cf.wrapped[0], S.centerX, yq, cf.lineH, 'center', cf.space, t.sub, t.accent); }
    drawCredit(ctx, S, t, creditY, data, images);
    footerHandles(ctx, S, !t.light, data.platform, data.handle);
  }
  function drawCoverClassic(ctx, format, data, images) {
    var S = safe(format), t = theme(bgFor(data.bgBySlide, 'cover'));
    bgDark(ctx, format, t); goldGlow();
    var cx = S.centerX, y = S.safeTop + 120;
    stamp(ctx, cx, y, t); y += 70;
    var r = 104; logoCircle(ctx, cx, y + r, r, t.accent, images.logoImg, data.name); y += 2 * r + 44;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = "400 60px 'Anton'"; ctx.fillStyle = t.text; ctx.fillText((data.name || '').toUpperCase(), cx, y); y += 44;
    ctx.font = "600 26px 'Spline Sans Mono'"; ctx.fillStyle = t.accent; ctx.fillText((data.role || '').toUpperCase(), cx, y); y += 70;
    ctx.textBaseline = 'top';
    var tw = wordsUC(data.topic);
    var f = fitWords(ctx, [tw], S.maxW, 360, 96, 52, 1.0, 0, function (s) { return "400 " + s + "px 'Anton'"; });
    ctx.font = "400 " + f.size + "px 'Anton'";
    drawLines(ctx, f.wrapped[0], cx, y, f.lineH, 'center', f.space, t.text, t.accent);
    footerHandles(ctx, S, !t.light, data.platform, data.handle);
  }
  function drawCover(ctx, format, data, images) {
    var st = data.coverStyle || 'question';
    if (st === 'quote') return drawCoverQuote(ctx, format, data, images);
    if (st === 'classic') return drawCoverClassic(ctx, format, data, images);
    return drawCoverQuestion(ctx, format, data, images);
  }
  function photoBox(ctx, x, y, w, h, t, bioImg) {
    ctx.save(); roundRect(ctx, x, y, w, h, 26);
    if (imgReady(bioImg)) {
      ctx.save(); ctx.clip();
      var iw = imgW(bioImg), ih = imgH(bioImg), s = Math.max(w / iw, h / ih), dw = iw * s, dh = ih * s;
      ctx.drawImage(bioImg, x + w / 2 - dw / 2, y + h / 2 - dh / 2, dw, dh); ctx.restore();
    } else {
      ctx.fillStyle = t.light ? '#e7e0d0' : '#16181a'; ctx.fill(); ctx.fillStyle = t.sub;
      ctx.font = "600 26px 'Spline Sans Mono'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
    }
    ctx.lineWidth = 6; ctx.strokeStyle = t.accent; roundRect(ctx, x, y, w, h, 26); ctx.stroke();
    ctx.restore();
  }
  function drawBio(ctx, format, data, images) {
    var S = safe(format), t = theme(bgFor(data.bgBySlide, 'bio'));
    bgDark(ctx, format, t);
    stamp(ctx, S.centerX, S.safeTop + 50, t);
    var y = S.safeTop + 118;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = "600 26px 'Spline Sans Mono'"; ctx.fillStyle = t.accent; ctx.fillText('MEET THE EXPERT', S.centerX, y); y += 52;
    var pw = 470, ph = 490, px = S.centerX - pw / 2;
    photoBox(ctx, px, y, pw, ph, t, images.bioImg); y += ph + 46;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = "400 62px 'Anton'"; ctx.fillStyle = t.text; ctx.fillText(creditName(data).toUpperCase(), S.centerX, y); y += 42;
    ctx.font = "600 25px 'Spline Sans Mono'"; ctx.fillStyle = t.accent; ctx.fillText((data.role || '').toUpperCase(), S.centerX, y); y += 54;
    ctx.textBaseline = 'top';
    var bw = wordsRaw(data.bio);
    var bf = fitWords(ctx, [bw], S.maxW, S.safeBottom - y - 70, 38, 30, 1.4, 0, function (s) { return "500 " + s + "px 'Archivo'"; });
    ctx.font = "500 " + bf.size + "px 'Archivo'"; drawLines(ctx, bf.wrapped[0], S.centerX, y, bf.lineH, 'center', bf.space, t.body, t.accent);
    footerHandles(ctx, S, !t.light, data.platform, data.handle);
  }
  function drawQA(ctx, format, data, images, slide) {
    var qa = data.qas[slide.i];
    var S = safe(format), t = theme(bgFor(data.bgBySlide, slideKey(slide)));
    bgDark(ctx, format, t);
    stamp(ctx, S.centerX, S.safeTop + 50, t);
    var y = S.safeTop + 130;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    var qw = wordsUC((qa && qa.q) || '');
    var qf = fitWords(ctx, [qw], S.maxW, 210, 44, 30, 1.06, 0, function (s) { return "400 " + s + "px 'Anton'"; });
    ctx.font = "400 " + qf.size + "px 'Anton'"; var yy = drawLines(ctx, qf.wrapped[0], S.leftX, y, qf.lineH, 'left', qf.space, t.sub, t.accent); y = yy + 34;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = "400 120px 'Anton'"; ctx.fillStyle = t.accent; ctx.fillText('“', S.leftX - 4, y + 80); y += 70;
    ctx.textBaseline = 'top';
    var creditY = S.safeBottom - 150;
    var aw = wordsRaw((qa && qa.a) || '');
    var af = fitWords(ctx, [aw], S.maxW, creditY - y - 30, 56, 34, 1.42, 0, function (s) { return "500 " + s + "px 'Archivo'"; });
    ctx.font = "500 " + af.size + "px 'Archivo'"; drawLines(ctx, af.wrapped[0], S.leftX, y, af.lineH, 'left', af.space, t.text, t.accent);
    drawCredit(ctx, S, t, creditY, data, images);
    footerHandles(ctx, S, !t.light, data.platform, data.handle);
  }
  function drawQuote(ctx, format, data, images) {
    var S = safe(format), t = theme(bgFor(data.bgBySlide, 'quote'));
    bgDark(ctx, format, t); goldGlow();
    var accent = data.quoteWhite ? t.text : t.accent;
    stamp(ctx, S.centerX, S.safeTop + 50, t);
    var ay = S.safeBottom - 150;
    var regionTop = S.safeTop + 140, regionBot = ay - 56;
    var markH = Math.min(150, (regionBot - regionTop) * 0.24);
    var markGap = Math.round(markH * 0.32);
    var qw = wordsUC(data.quote);
    var f = fitWords(ctx, [qw], S.maxW, regionBot - regionTop - markH - markGap, 88, 46, 1.04, 0, function (s) { return "400 " + s + "px 'Anton'"; });
    var blockH = markH + markGap + f.height;
    var y = Math.max(regionTop, (regionTop + regionBot) / 2 - blockH / 2);
    var markFs = Math.round(markH * 1.5);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = "400 " + markFs + "px 'Anton'"; ctx.fillStyle = accent; ctx.fillText('“', S.leftX - 6, y + markH);
    y += markH + markGap; ctx.textBaseline = 'top';
    ctx.font = "400 " + f.size + "px 'Anton'"; drawLines(ctx, f.wrapped[0], S.leftX, y, f.lineH, 'left', f.space, t.text, accent);
    var r = 44; logoCircle(ctx, S.leftX + r, ay + r, r, t.accent, images.logoImg, data.name);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = "400 42px 'Anton'"; ctx.fillStyle = t.text;
    ctx.fillText(creditName(data).toUpperCase(), S.leftX + 2 * r + 22, ay + 40);
    var subLine = data.person ? ((data.name || '') + ' · ' + (data.handle || '')) : ((data.handle || '') + ' · WITH ' + myHandle(data.platform));
    ctx.font = "600 22px 'Spline Sans Mono'"; ctx.fillStyle = t.sub; ctx.fillText(subLine.toUpperCase(), S.leftX + 2 * r + 22, ay + 74);
  }
  function followPill(ctx, cx, cy, t, fs, platform) {
    fs = fs || 42; var h = Math.round(fs * 2.4);
    ctx.font = "800 " + fs + "px 'Archivo'"; var label = 'FOLLOW ' + myHandle(platform); var w = ctx.measureText(label).width + h;
    var x = cx - w / 2, y = cy - h / 2;
    ctx.fillStyle = t.accent; roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = '#0b0b0d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = "800 " + fs + "px 'Archivo'"; ctx.fillText(label, cx, cy + 2);
    return h;
  }
  // Defined for parity with the pre-refactor app but not called by any current
  // slide — dead code, kept so drawSlide's call graph matches the original 1:1.
  function drawWordmark(ctx, cx, topY, fs, t) {
    ctx.save(); ctx.font = "400 " + fs + "px 'Anton'"; try { ctx.letterSpacing = '1px'; } catch (e) {} ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    var a = 'FOOTBALL ', b = 'PARENT', wa = ctx.measureText(a).width, wb = ctx.measureText(b).width, x = cx - (wa + wb) / 2;
    ctx.fillStyle = t.text; ctx.fillText(a, x, topY);
    ctx.fillStyle = t.accent; ctx.fillText(b, x + wa, topY);
    ctx.restore();
  }
  function drawCTA(ctx, format, data, images) {
    var S = safe(format), t = theme(bgFor(data.bgBySlide, 'cta'));
    bgDark(ctx, format, t);
    var site = (data.siteUrl || '').trim();
    if (site) {
      ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = "400 40px 'Anton'"; try { ctx.letterSpacing = '1px'; } catch (e) {}
      ctx.fillStyle = t.text; ctx.fillText(site.toUpperCase(), S.leftX, S.safeTop + 18); ctx.restore();
    }
    ctx.textAlign = 'center';
    var actH = 40;
    var hf = fitWords(ctx, [wordsUC(data.cta)], S.maxW, 260, 52, 38, 1.08, 0, function (s) { return "400 " + s + "px 'Anton'"; });
    var iv = (data.interview || '').trim();
    var sh = (data.shareLine || '').trim();
    var rf = fitWords(ctx, [wordsRaw(data.blurb)], S.maxW - 30, 240, 34, 28, 1.42, 0, function (s) { return "500 " + s + "px 'Archivo'"; });
    var pillFs = 54, pillH = Math.round(pillFs * 2.4);
    var g2 = 28, gSec = 104, g4 = 40;
    var hHead = hf.wrapped[0].length * hf.lineH;
    var hAct = ((sh ? 1 : 0) + (iv ? 1 : 0)) * actH;
    var hReason = rf.wrapped[0].length * rf.lineH;
    var total = hHead + g2 + hAct + gSec + pillH + g4 + hReason;
    var regionTop = S.safeTop + 150, regionBot = S.safeBottom - 52;
    var y = Math.max(regionTop, (regionTop + regionBot) / 2 - total / 2);
    ctx.textBaseline = 'top';
    ctx.font = "400 " + hf.size + "px 'Anton'"; y = drawLines(ctx, hf.wrapped[0], S.centerX, y, hf.lineH, 'center', hf.space, t.text, t.accent); y += g2;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = "600 30px 'Spline Sans Mono'"; ctx.fillStyle = t.body;
    if (sh) { drawIconLine(ctx, 'diagonal', sh.toUpperCase(), S.centerX, y, "600 30px 'Spline Sans Mono'", t.body); y += actH; }
    if (iv) { drawIconLine(ctx, 'right', iv.toUpperCase(), S.centerX, y, "600 30px 'Spline Sans Mono'", t.body); y += actH; }
    y += gSec; var pillCy = y + pillH / 2; followPill(ctx, S.centerX, pillCy, t, pillFs, data.platform); y = pillCy + pillH / 2 + g4;
    ctx.font = "500 " + rf.size + "px 'Archivo'"; y = drawLines(ctx, rf.wrapped[0], S.centerX, y, rf.lineH, 'center', rf.space, t.body, t.accent);
    footerHandles(ctx, S, !t.light, data.platform, data.handle);
  }
  function drawSafeOverlay(ctx, format) {
    var S = safe(format);
    ctx.save();
    ctx.fillStyle = 'rgba(229,72,77,0.16)';
    ctx.fillRect(0, 0, S.W, S.safeTop); ctx.fillRect(0, S.safeBottom, S.W, S.H - S.safeBottom);
    if (format !== 'carousel') ctx.fillRect(S.rightEdge, 1000, S.W - S.rightEdge, S.safeBottom - 1000);
    ctx.strokeStyle = 'rgba(82,196,128,0.95)'; ctx.setLineDash([16, 11]); ctx.lineWidth = 3;
    ctx.strokeRect(S.leftX, S.safeTop, S.maxW, S.safeBottom - S.safeTop); ctx.setLineDash([]);
    ctx.restore();
  }

  // slide: {type:'cover'|'bio'|'qa'|'quote'|'cta', i?} (i = qa index, for type 'qa').
  // data: {name,handle,role,person,quoteWhite,topic,bio,bioSrc,quoteFirst,coverStyle,
  //   coverQuestion,coverEyebrow,coverContext,blurb,qas,quote,cta,interview,siteUrl,
  //   shareLine,platform,format,bgBySlide}. images: {logoImg,bioImg} (loaded Image or null).
  function draw(ctx, slide, data, images) {
    images = images || {};
    var t = slide.type;
    if (t === 'cover') return drawCover(ctx, data.format, data, images);
    if (t === 'bio') return drawBio(ctx, data.format, data, images);
    if (t === 'qa') return drawQA(ctx, data.format, data, images, slide);
    if (t === 'quote') return drawQuote(ctx, data.format, data, images);
    return drawCTA(ctx, data.format, data, images);
  }

  return {
    WIDTH: WIDTH,
    HEIGHT: HEIGHT,
    CAROUSEL_WIDTH: CAROUSEL_WIDTH,
    CAROUSEL_HEIGHT: CAROUSEL_HEIGHT,
    dims: dims,
    safe: safe,
    theme: theme,
    myHandle: myHandle,
    platformName: platformName,
    hasBio: hasBio,
    slideList: slideList,
    slideCount: slideCount,
    slideName: slideName,
    slideKey: slideKey,
    bgFor: bgFor,
    creditName: creditName,
    wordsUC: wordsUC,
    wordsRaw: wordsRaw,
    wrapWords: wrapWords,
    drawLines: drawLines,
    fitWords: fitWords,
    roundRect: roundRect,
    drawStar: drawStar,
    drawArrowRight: drawArrowRight,
    drawArrowDiagonal: drawArrowDiagonal,
    bgDark: bgDark,
    tacticsOverlay: tacticsOverlay,
    goldGlow: goldGlow,
    stamp: stamp,
    logoCircle: logoCircle,
    footerHandles: footerHandles,
    expertStrip: expertStrip,
    drawCredit: drawCredit,
    drawCoverQuestion: drawCoverQuestion,
    drawCoverQuote: drawCoverQuote,
    drawCoverClassic: drawCoverClassic,
    drawCover: drawCover,
    photoBox: photoBox,
    drawBio: drawBio,
    drawQA: drawQA,
    drawQuote: drawQuote,
    followPill: followPill,
    drawWordmark: drawWordmark,
    drawCTA: drawCTA,
    drawSafeOverlay: drawSafeOverlay,
    draw: draw
  };
});
