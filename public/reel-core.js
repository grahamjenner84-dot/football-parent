/**
 * Reel Builder — shared drawing core.
 *
 * Pure canvas 2D drawing logic for multi-slide reels (hook/content/cta/quote
 * slide kinds, two visual styles, template-driven backgrounds + layout
 * overrides). Takes a CanvasRenderingContext2D-compatible object and plain
 * data — no DOM tree building, no React, no localStorage, no upload/SVG
 * handling. Works against the browser's native canvas context and against
 * @napi-rs/canvas server-side.
 *
 * This module is the single source of truth for the *exported* slide look
 * (what drawSlide produces). The browser tool's on-screen interactive editor
 * (drag-to-reposition, inline contentEditable text) is a separate DOM/React
 * approximation for editing convenience — it is not required to share code
 * with this module, only to visually match what drawSlide produces.
 *
 * Loaded two ways from one file (single source of truth):
 *   - Browser: <script src="/reel-core.js"> — attaches window.ReelCore
 *   - Node:    require('./reel-core.js') — CommonJS export
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  }
  if (root) {
    root.ReelCore = mod;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  var WIDTH = 1080;
  var HEIGHT = 1920;

  /* ---------- fonts ---------- */
  var FONT_STACKS = {
    Helvetica: 'Helvetica,Arial,sans-serif',
    Archivo: "Archivo,Helvetica,sans-serif",
    'Archivo Black': "'Archivo Black',Helvetica,sans-serif",
    Anton: "Anton,Impact,sans-serif",
    'Spline Sans Mono': "'Spline Sans Mono',ui-monospace,Menlo,monospace",
    Oswald: "Oswald,sans-serif",
    'Bebas Neue': "'Bebas Neue',Impact,sans-serif",
    Teko: "'Teko',Oswald,sans-serif",
    'Barlow Condensed': "'Barlow Condensed',Oswald,sans-serif",
    Montserrat: "'Montserrat',Helvetica,sans-serif",
    Poppins: "'Poppins',Helvetica,sans-serif"
  };
  var HEAD_WEIGHTS = {
    Anton: '400', 'Bebas Neue': '400', 'Archivo Black': '400',
    Teko: '700', 'Barlow Condensed': '800', Montserrat: '900',
    Poppins: '800', Oswald: '700', Archivo: '800', Helvetica: '800'
  };
  function fontStack(key) { return FONT_STACKS[key] || 'Helvetica,Arial,sans-serif'; }
  function headWeight(key) { return HEAD_WEIGHTS[key] || '800'; }

  /* ---------- templates / layout ---------- */
  function defaultLayout(kind) {
    var base = {
      headColor: '#ffffff', accent: '#D4AF37', font: 'Helvetica', frame: true, scrim: true,
      splitHead: false, showHandle: true, cover: false, coverColor: '#06070b', coverOpacity: 85,
      coverRadius: 20, coverFull: true, bgType: 'default', bgSolid: '#0b0b0d', textCase: 'upper',
      letterSpacing: -1, lineHeight: 1.06
    };
    if (kind === 'hook') return Object.assign({}, base, { yPct: 30, align: 'center', bodyColor: '#d8d8d8', headSize: 92 });
    if (kind === 'cta') return Object.assign({}, base, { yPct: 34, align: 'center', bodyColor: '#ffffff', headSize: 84 });
    if (kind === 'quote') return Object.assign({}, base, { yPct: 36, align: 'left', bodyColor: '#43403a', headColor: '#16140f', headSize: 96, frame: false, scrim: false });
    return Object.assign({}, base, { yPct: 34, align: 'left', bodyColor: '#dcdcdc', headSize: 78 });
  }

  // Two built-in styles. `bg` is an optional shared background image (data
  // URL or http(s) URL) applied to both — the browser tool historically left
  // this null (window.MATCHDAY_BG), i.e. no background by default.
  function builtinTemplates(bg) {
    bg = bg || null;
    var d2 = { accent: '#E6B53D', font: 'Anton', frame: false, scrim: true, textCase: 'upper', letterSpacing: 1, lineHeight: 1.0, headColor: '#ffffff', bgType: 'default' };
    return [
      { id: 'default', name: 'Floodlit (default)', style: 'classic', hook: bg, content: bg, cta: bg },
      {
        id: 'design2', name: 'Matchday (Design 2)', style: 'design2', hook: bg, content: bg, cta: bg,
        layout: {
          hook: Object.assign({}, d2, { yPct: 29, align: 'left', headSize: 111, lineHeight: 0.98, bodyColor: '#ffffff' }),
          content: Object.assign({}, d2, { yPct: 15, align: 'left', headSize: 86, bodyColor: 'rgba(255,255,255,0.9)' }),
          cta: Object.assign({}, d2, { yPct: 30, align: 'left', headSize: 104, bodyColor: 'rgba(255,255,255,0.9)' }),
          quote: Object.assign({}, d2, { yPct: 34, align: 'left', headSize: 108, headColor: '#16140f', bodyColor: '#43403a', scrim: false })
        }
      }
    ];
  }
  function isBuiltinTemplate(id) { return id === 'default' || id === 'design2'; }

  // template: the active template object ({id,name,style,hook,content,cta,layout}) or null.
  function resolveStyle(template) { return (template && template.style) || 'classic'; }
  function resolveLayout(kind, template) {
    var L = (template && template.layout && template.layout[kind]) || {};
    return Object.assign({}, defaultLayout(kind), L);
  }
  // bgOverrides: brand.bg-style {hook,content,cta} quick-swap, takes priority over the template's own background.
  function resolveBg(kind, template, bgOverrides) {
    if (bgOverrides && bgOverrides[kind]) return bgOverrides[kind];
    return (template && template[kind]) || null;
  }

  function hexToRgba(hex, pct) {
    var m = String(hex).replace('#', '');
    var n = m.length === 3 ? m.split('').map(function (c) { return c + c; }).join('') : m;
    var r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (pct / 100) + ')';
  }

  /* ---------- text helpers ---------- */
  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/);
    var lines = []; var cur = '';
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      var t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function drawML(ctx, text, x, y, maxW, lineH) {
    var paras = String(text).split('\n'); var yy = y;
    for (var i = 0; i < paras.length; i++) {
      var ls = wrap(ctx, paras[i], maxW);
      for (var j = 0; j < ls.length; j++) { ctx.fillText(ls[j], x, yy); yy += lineH; }
    }
    return yy;
  }
  function countLines(ctx, text, maxW) {
    var n = 0;
    String(text).split('\n').forEach(function (p) { n += Math.max(1, wrap(ctx, p, maxW).length); });
    return n;
  }
  // Splits "*word*"-highlighted text into {t, a(ccent)} tokens, then into words.
  function tokenize(text) {
    var out = []; var re = /\*([^*]+)\*/g; var last = 0; var m; var s = String(text);
    while ((m = re.exec(s))) {
      if (m.index > last) out.push({ t: s.slice(last, m.index), a: false });
      out.push({ t: m[1], a: true });
      last = re.lastIndex;
    }
    if (last < s.length) out.push({ t: s.slice(last), a: false });
    return out;
  }
  function words(text) {
    var toks = tokenize(text); var out = [];
    toks.forEach(function (tk) {
      tk.t.split(/\s+/).forEach(function (w) { if (w !== '') out.push({ t: w, a: tk.a }); });
    });
    return out;
  }
  function wrapWords(ctx, wordList, maxW, space) {
    space = (space == null) ? ctx.measureText(' ').width : space;
    var lines = []; var line = []; var w = 0;
    for (var i = 0; i < wordList.length; i++) {
      var word = wordList[i];
      var ww = ctx.measureText(word.t).width;
      var add = (line.length ? space : 0) + ww;
      if (w + add > maxW && line.length) { lines.push(line); line = [word]; w = ww; } else { line.push(word); w += add; }
    }
    if (line.length) lines.push(line);
    return lines;
  }
  function drawRichHead(ctx, text, anchorX, y, maxW, lineH, align, baseColor, accentColor, forceFirst) {
    var prevAlign = ctx.textAlign; ctx.textAlign = 'left';
    var space = ctx.measureText(' ').width;
    var paras = String(text).split('\n'); var yy = y;
    paras.forEach(function (p, pIdx) {
      var wl = words(p);
      if (!wl.length) { yy += lineH; return; }
      var lines = wrapWords(ctx, wl, maxW, space);
      lines.forEach(function (line) {
        var lw = 0;
        line.forEach(function (wd, i) { lw += ctx.measureText(wd.t).width + (i ? space : 0); });
        var drawX = align === 'center' ? anchorX - lw / 2 : anchorX;
        line.forEach(function (wd, i) {
          if (i) drawX += space;
          var acc = wd.a || (forceFirst && pIdx === 0);
          ctx.fillStyle = acc ? accentColor : baseColor;
          ctx.fillText(wd.t, drawX, yy);
          drawX += ctx.measureText(wd.t).width;
        });
        yy += lineH;
      });
    });
    ctx.textAlign = prevAlign;
    return yy;
  }
  function drawHeadline(ctx, rawText, L, fs, hw, anchorX, y, maxW) {
    var txt = (L.textCase === 'none') ? String(rawText || '') : String(rawText || '').toUpperCase();
    ctx.font = hw + ' ' + L.headSize + 'px ' + fs;
    var hadLS = ('letterSpacing' in ctx);
    if (hadLS) ctx.letterSpacing = (L.letterSpacing || 0) + 'px';
    var forceFirst = !!L.splitHead && txt.indexOf('*') < 0;
    var ny = drawRichHead(ctx, txt, anchorX, y, maxW, L.headSize * (L.lineHeight || 1.06), L.align, L.headColor, L.accent, forceFirst);
    if (hadLS) ctx.letterSpacing = '0px';
    ctx.textAlign = L.align;
    return ny;
  }
  // Splits a body string into checklist items (lines starting with "+ "/"✓ " = tick, "- "/"• "/"· " = square) and remaining plain paragraph lines.
  function parseBody(body) {
    var out = { items: [], para: '' }; var para = [];
    String(body || '').split('\n').forEach(function (l) {
      var tk = l.match(/^\s*[+✓]\s*(.+)$/);
      var sq = l.match(/^\s*[-•·]\s*(.+)$/);
      if (tk) out.items.push({ type: 'tick', text: tk[1].trim() });
      else if (sq) out.items.push({ type: 'square', text: sq[1].trim() });
      else if (l.trim() !== '') para.push(l);
    });
    out.para = para.join('\n');
    return out;
  }
  // Position of this slide among the "middle" (content+quote) slides, for design2's progress dots.
  function middleInfo(slide, reel) {
    if (!reel) return null;
    var mids = reel.slides.filter(function (s) { return s.kind === 'content' || s.kind === 'quote'; });
    var pos = mids.indexOf(slide);
    if (pos < 0 || mids.length < 2) return null;
    return { pos: pos, total: mids.length };
  }
  function drawChecklist(ctx, items, x, y, maxW, accent, textColor, fs) {
    var prevAlign = ctx.textAlign, prevBase = ctx.textBaseline;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    var gap = 28, fSize = 40, lineH = 50;
    items.forEach(function (it) {
      var isTick = it.type === 'tick';
      var mark = isTick ? 60 : 26;
      var tx = x + mark + gap;
      ctx.font = '500 ' + fSize + 'px ' + fs;
      var lines = wrap(ctx, it.text, maxW - (mark + gap));
      var rowH = Math.max(mark + 24, lines.length * lineH + 20);
      var cy = y + rowH / 2;
      if (isTick) {
        var R = mark / 2;
        ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(x + R, cy, R, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#11140f'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(x + R - 12, cy + 1); ctx.lineTo(x + R - 3, cy + 10); ctx.lineTo(x + R + 13, cy - 10); ctx.stroke();
      } else {
        ctx.fillStyle = accent; ctx.fillRect(x, cy - mark / 2, mark, mark);
      }
      ctx.fillStyle = textColor; ctx.font = '500 ' + fSize + 'px ' + fs;
      var ly = cy - ((lines.length - 1) * lineH) / 2;
      lines.forEach(function (l) { ctx.fillText(l, tx, ly); ly += lineH; });
      y += rowH;
    });
    ctx.textAlign = prevAlign; ctx.textBaseline = prevBase;
    return y;
  }

  /* ---------- emoji-aware text (server-side font-fallback fix) ---------- */
  // Real family name of the bundled public/fonts/NotoEmoji-PointDown.woff2
  // (a single-glyph subset of Google's Noto Emoji). Browsers ignore this —
  // they fall back to their own system emoji font for any family that lacks
  // the glyph (how this already worked pre-refactor); @napi-rs/canvas does
  // not do cross-family fallback, so server-side renderers must register
  // that file before drawing. brand.saveLine is free user text (not a fixed
  // string), so unlike single-slide-core this splits on the glyph wherever
  // it appears rather than a fixed 3-part split.
  var EMOJI_FONT_FAMILY = 'Noto Emoji';
  var KNOWN_EMOJI_GLYPH = '👇';
  // font: a "<weight> <size>px <family>" string, as used everywhere in drawSlide.
  function fillTextEmojiAware(ctx, text, x, y, font, align) {
    var s = String(text);
    if (s.indexOf(KNOWN_EMOJI_GLYPH) === -1) {
      ctx.font = font; ctx.textAlign = align; ctx.fillText(s, x, y); return;
    }
    var sizeMatch = font.match(/^\S+\s+\S+px/);
    var sizePart = sizeMatch ? sizeMatch[0] : font;
    var emojiFont = sizePart + " '" + EMOJI_FONT_FAMILY + "'";
    var segs = s.split(KNOWN_EMOJI_GLYPH);
    ctx.font = font;
    var totalW = 0;
    segs.forEach(function (seg) { totalW += ctx.measureText(seg).width; });
    ctx.font = emojiFont;
    var emojiW = ctx.measureText(KNOWN_EMOJI_GLYPH).width;
    totalW += emojiW * (segs.length - 1);
    var startX = align === 'center' ? x - totalW / 2 : (align === 'right' ? x - totalW : x);
    ctx.textAlign = 'left';
    var cx = startX;
    segs.forEach(function (seg, i) {
      if (seg) { ctx.font = font; ctx.fillText(seg, cx, y); cx += ctx.measureText(seg).width; }
      if (i < segs.length - 1) { ctx.font = emojiFont; ctx.fillText(KNOWN_EMOJI_GLYPH, cx, y); cx += emojiW; }
    });
    ctx.textAlign = align;
  }
  // Drawn as a primitive rather than the '→' glyph, for the same reason —
  // no font dependency at all, renders identically everywhere. fontPx sets
  // the arrow's scale to match the text it follows; (x,y) is its left tip,
  // y expected to line up with a textBaseline:'top' text run of that size.
  function drawArrowRight(ctx, x, y, fontPx, color) {
    var h = fontPx * 0.5, w = fontPx * 0.62, head = fontPx * 0.22;
    var midY = y + h / 2;
    ctx.save();
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, fontPx * 0.07); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, midY); ctx.lineTo(x + w - head, midY); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w, midY);
    ctx.lineTo(x + w - head, midY - head * 0.85);
    ctx.lineTo(x + w - head, midY + head * 0.85);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    return w;
  }

  /* ---------- video timing (kept for a future video pass; unused by PNG export) ---------- */
  // Given elapsed seconds `el` into the reel and each slide's duration `durs`,
  // returns which slide is showing plus its fade-in alpha (0..1 over 0.5s)
  // and a continuous 5%-over-duration Ken-Burns zoom factor.
  function frameAt(el, reel, durs) {
    var acc = 0, idx = 0, local = el;
    for (var i = 0; i < reel.slides.length; i++) {
      if (el < acc + durs[i]) { idx = i; local = el - acc; break; }
      acc += durs[i];
    }
    return { idx: idx, alpha: Math.min(1, local / 0.5), zoom: 1 + 0.05 * (local / durs[idx]) };
  }

  /* ---------- slide drawing (the export path) ---------- */
  // ctx: 2D context. slide: {kind,num,head,body,attrib,secs}. reel: {day,slides:[...]} (only used for middleInfo dots).
  // bgImg: loaded Image (or null). alpha/zoom: 1/1 for a static export, animated values from frameAt() for video.
  // brand: {saveLine,hookSubtitle,handle,tiktokHandle,ctaUrl,ctaLines,marginTop,marginX,marginRight,marginBottom,tiktokSafe}.
  // layout: pre-resolved via resolveLayout(slide.kind, template). style: pre-resolved via resolveStyle(template).
  function drawSlide(ctx, slide, reel, bgImg, alpha, zoom, brand, layout, style) {
    var W = WIDTH, H = HEIGHT; zoom = zoom || 1;
    var L = layout; var fs = fontStack(L.font); var hw = headWeight(L.font);
    var bodyFont = fontStack('Archivo'); var monoFont = fontStack('Spline Sans Mono');
    var setLS = function (v) { if ('letterSpacing' in ctx) ctx.letterSpacing = v + 'px'; };
    var isQuote = slide.kind === 'quote'; var CREAM = '#ECE6D8', QINK = '#16140f', QSUB = '#43403a';
    ctx.globalAlpha = 1; ctx.fillStyle = '#020203'; ctx.fillRect(0, 0, W, H);
    if (isQuote) {
      ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = L.accent; ctx.fillRect(0, 0, W, 18);
    } else if (L.bgType === 'solid') {
      ctx.fillStyle = L.bgSolid || '#0b0b0d'; ctx.fillRect(0, 0, W, H);
    } else if (bgImg) {
      var ir = bgImg.width / bgImg.height, cr = W / H; var dw, dh;
      if (ir > cr) { dh = H * zoom; dw = dh * ir; } else { dw = W * zoom; dh = dw / ir; }
      ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
      if (L.scrim) {
        var ov = ctx.createLinearGradient(0, 0, 0, H);
        ov.addColorStop(0, 'rgba(2,2,3,0.5)'); ov.addColorStop(0.5, 'rgba(2,2,3,0.18)'); ov.addColorStop(1, 'rgba(2,2,3,0.62)');
        ctx.fillStyle = ov; ctx.fillRect(0, 0, W, H);
      }
    } else {
      var g = ctx.createRadialGradient(W * 0.5, H * 0.2, 0, W * 0.5, H * 0.2, W * 0.62);
      g.addColorStop(0, 'rgba(170,185,210,0.22)'); g.addColorStop(1, 'rgba(170,185,210,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      var g2 = ctx.createLinearGradient(0, H, 0, H * 0.48);
      g2.addColorStop(0, 'rgba(22,46,26,0.55)'); g2.addColorStop(1, 'rgba(22,46,26,0)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    }
    var mX = brand.marginX || 0, mR = brand.marginRight || 0, mB = brand.marginBottom || 0;
    var tkSafe = !!brand.tiktokSafe; var sT = tkSafe ? (brand.marginTop || 0) : 0; var sB = tkSafe ? mB : 0;
    var dispHandle = (tkSafe && brand.tiktokHandle) ? brand.tiktokHandle : brand.handle;
    var leftX = mX, rightInset = mX + mR, maxW = W - leftX - rightInset, centerX = leftX + maxW / 2;
    var anchorX = L.align === 'center' ? centerX : leftX;
    var topY = H * (L.yPct / 100);
    var dy = (1 - alpha) * 42; ctx.globalAlpha = alpha; ctx.textBaseline = 'top'; ctx.textAlign = L.align;
    // copy backdrop — hides any baked-in text on uploaded designs
    if (L.cover && bgImg) {
      var bTop, bBot;
      if (slide.kind === 'hook') {
        ctx.font = hw + ' ' + L.headSize + 'px ' + fs;
        var hl = countLines(ctx, String(slide.head || '').toUpperCase(), maxW);
        bTop = topY - 76 - 18; bBot = topY + hl * (L.headSize * 1.07) + 26 + 46 + 18;
      } else if (slide.kind === 'cta') {
        var cl = String(brand.ctaLines).split('\n').length;
        bTop = topY - 18; bBot = topY + L.headSize + 44 + cl * 66 + 18;
      } else {
        ctx.font = hw + ' ' + L.headSize + 'px ' + fs;
        var hl2 = countLines(ctx, String(slide.head || '').toUpperCase(), maxW);
        var bl = 0;
        if (slide.body) { ctx.font = '400 42px ' + fs; bl = countLines(ctx, slide.body, maxW); }
        bTop = topY - 18; bBot = topY + 84 + 46 + hl2 * (L.headSize * 1.08) + 14 + (bl ? bl * 56 : 0) + 18;
      }
      var bx = L.coverFull ? 0 : Math.max(0, leftX - 34), bw = L.coverFull ? W : (Math.min(W, W - rightInset + 34) - bx);
      var by = Math.max(0, bTop + dy), bh = (bBot - bTop);
      ctx.fillStyle = hexToRgba(L.coverColor, L.coverOpacity);
      ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(bx, by, bw, bh, L.coverFull ? 0 : (L.coverRadius || 0)); } else { ctx.rect(bx, by, bw, bh); }
      ctx.fill();
    }
    // brand chip (gold dot + url) pinned top-left, used by design2 hook + cta
    var drawChip = function () {
      var yc = 100; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = L.accent;
      ctx.fillRect(leftX, yc + 4, 20, 20);
      ctx.font = '600 30px ' + bodyFont; setLS(4);
      ctx.fillText(String(brand.ctaUrl || '').toUpperCase(), leftX + 34, yc + 3); setLS(0);
    };
    if (style === 'design2' && (slide.kind === 'hook' || slide.kind === 'cta')) { ctx.globalAlpha = 1; drawChip(); ctx.globalAlpha = alpha; }
    if (slide.kind === 'hook') {
      if (style === 'design2') {
        ctx.fillStyle = L.accent; setLS(7);
        fillTextEmojiAware(ctx, String(brand.saveLine || '').toUpperCase(), anchorX, topY - 64 + dy, '600 30px ' + monoFont, L.align);
        setLS(0);
        var y1 = drawHeadline(ctx, slide.head, L, fs, hw, anchorX, topY + dy, maxW);
        ctx.textAlign = L.align; ctx.fillStyle = L.accent; ctx.font = '600 30px ' + bodyFont; setLS(3);
        var subtitleText = String(brand.hookSubtitle || '').toUpperCase();
        ctx.fillText(subtitleText, anchorX, y1 + 44);
        var subW = ctx.measureText(subtitleText).width;
        var arrowStartX = L.align === 'center' ? anchorX + subW / 2 + 18 : anchorX + subW + 18;
        drawArrowRight(ctx, arrowStartX, y1 + 44, 30, L.accent);
        setLS(0);
      } else {
        ctx.fillStyle = L.headColor;
        fillTextEmojiAware(ctx, brand.saveLine, anchorX, topY - 76 + dy, '500 34px ' + fs, L.align);
        var y2 = drawHeadline(ctx, slide.head, L, fs, hw, anchorX, topY + dy, maxW);
        ctx.font = '400 46px ' + fs; ctx.fillStyle = L.bodyColor; ctx.fillText(brand.hookSubtitle, anchorX, y2 + 26);
      }
    } else if (slide.kind === 'cta') {
      if (style === 'design2') {
        var y3 = topY + dy;
        ctx.fillStyle = L.accent; ctx.textAlign = L.align; ctx.font = '600 30px ' + monoFont; setLS(7);
        ctx.fillText('FOR EVERY STAGE OF THEIR GAME', anchorX, y3); setLS(0); y3 += 52;
        var cL = Object.assign({}, L, { headColor: '#ffffff' });
        y3 = drawHeadline(ctx, 'FOLLOW *' + (dispHandle || '') + '*', cL, fs, hw, anchorX, y3, maxW); y3 += 20;
        var cta1 = parseBody(brand.ctaLines);
        if (cta1.para) { ctx.fillStyle = L.bodyColor; ctx.textAlign = 'left'; ctx.font = '500 44px ' + bodyFont; y3 = drawML(ctx, cta1.para, leftX, y3, maxW, 60) + 24; }
        if (cta1.items.length) { y3 = drawChecklist(ctx, cta1.items, leftX, y3, maxW, L.accent, L.bodyColor, bodyFont); }
      } else {
        ctx.fillStyle = L.accent; ctx.font = hw + ' ' + L.headSize + 'px ' + fs; ctx.fillText(brand.ctaUrl, anchorX, topY + dy);
        var y4 = topY + L.headSize + 44 + dy; var cta2 = parseBody(brand.ctaLines);
        if (cta2.para) { ctx.fillStyle = L.bodyColor; ctx.textAlign = L.align; ctx.font = '400 44px ' + fs; y4 = drawML(ctx, cta2.para, anchorX, y4, maxW, 60) + 18; }
        if (cta2.items.length) { ctx.textAlign = 'left'; y4 = drawChecklist(ctx, cta2.items, leftX, y4, maxW, L.accent, L.bodyColor, fs); }
      }
    } else if (isQuote) {
      ctx.fillStyle = L.accent; ctx.textAlign = 'left'; ctx.font = '400 240px ' + fs; ctx.fillText('“', leftX, topY - 150 + dy);
      var qL = Object.assign({}, L, { headColor: QINK });
      var y5 = topY + dy;
      y5 = drawHeadline(ctx, slide.head, qL, fs, hw, anchorX, y5, maxW); y5 += 22;
      if (slide.body) { ctx.fillStyle = QSUB; ctx.textAlign = L.align; ctx.font = '400 44px ' + bodyFont; y5 = drawML(ctx, slide.body, anchorX, y5, maxW, 60); y5 += 10; }
      if (slide.attrib) { ctx.fillStyle = L.accent; ctx.textAlign = L.align; ctx.font = '600 30px ' + bodyFont; setLS(2); ctx.fillText('— ' + slide.attrib, anchorX, y5 + 16); setLS(0); }
    } else {
      var pb = parseBody(slide.body); var bf = (style === 'design2') ? bodyFont : fs;
      if (style === 'design2') {
        var hdrY = Math.max(110, sT);
        ctx.textBaseline = 'top'; ctx.textAlign = 'left';
        ctx.fillStyle = L.accent; ctx.font = '800 58px ' + bodyFont; ctx.fillText(String(slide.num || 1).padStart(2, '0'), leftX, hdrY + dy);
        var mi = middleInfo(slide, reel);
        if (mi) {
          var dwi = 42, dg = 12, dyy = hdrY + 24 + dy; var dx = W - rightInset - (mi.total * (dwi + dg) - dg);
          for (var k = 0; k < mi.total; k++) { ctx.fillStyle = k <= mi.pos ? L.accent : 'rgba(255,255,255,0.25)'; ctx.fillRect(dx, dyy, dwi, 8); dx += dwi + dg; }
        }
        ctx.font = hw + ' ' + L.headSize + 'px ' + fs;
        var headLines = countLines(ctx, (L.textCase === 'none') ? String(slide.head || '') : String(slide.head || '').toUpperCase(), maxW);
        var headH = headLines * (L.headSize * (L.lineHeight || 1.06));
        var bodyH = 0;
        if (pb.items.length) {
          if (pb.para) { ctx.font = '400 40px ' + bf; bodyH += countLines(ctx, pb.para, maxW) * 56 + 12; }
          ctx.font = '500 40px ' + bf;
          pb.items.forEach(function (it) {
            var mark = it.type === 'tick' ? 60 : 26;
            var lines = wrap(ctx, it.text, maxW - (mark + 28));
            bodyH += Math.max(mark + 24, lines.length * 50 + 20);
          });
        } else if (slide.body) { ctx.font = '400 42px ' + bf; bodyH = countLines(ctx, slide.body, maxW) * 60; }
        var blockH = headH + 90 + bodyH;
        var y6 = Math.max(hdrY + (tkSafe ? 140 : 180), sT + ((H - sB - sT) - blockH) / 2) + dy;
        ctx.textAlign = L.align;
        y6 = drawHeadline(ctx, slide.head, L, fs, hw, anchorX, y6, maxW); y6 += 38;
        ctx.fillStyle = L.accent; ctx.fillRect(leftX, y6, 118, 8); y6 += 8 + 44;
        if (pb.items.length) {
          if (pb.para) { ctx.fillStyle = L.bodyColor; ctx.textAlign = L.align; ctx.font = '400 40px ' + bf; y6 = drawML(ctx, pb.para, anchorX, y6, maxW, 56) + 12; }
          y6 = drawChecklist(ctx, pb.items, leftX, y6 + 8, maxW, L.accent, L.bodyColor, bf);
        } else if (slide.body) { ctx.fillStyle = L.bodyColor; ctx.textAlign = L.align; ctx.font = '400 42px ' + bf; y6 = drawML(ctx, slide.body, anchorX, y6, maxW, 60); }
      } else {
        var y7 = topY + dy;
        ctx.fillStyle = L.accent; ctx.font = hw + ' 66px ' + fs; ctx.fillText(String(slide.num || 1).padStart(2, '0'), anchorX, y7); y7 += 84;
        ctx.fillStyle = L.accent;
        if (L.align === 'center') { ctx.fillRect(centerX - 48, y7, 96, 6); } else { ctx.fillRect(leftX, y7, 96, 6); }
        y7 += 46;
        y7 = drawHeadline(ctx, slide.head, L, fs, hw, anchorX, y7, maxW); y7 += 14;
        if (pb.items.length) {
          if (pb.para) { ctx.fillStyle = L.bodyColor; ctx.textAlign = L.align; ctx.font = '400 40px ' + bf; y7 = drawML(ctx, pb.para, anchorX, y7, maxW, 56) + 12; }
          y7 = drawChecklist(ctx, pb.items, leftX, y7 + 8, maxW, L.accent, L.bodyColor, bf);
        } else if (slide.body) { ctx.fillStyle = L.bodyColor; ctx.textAlign = L.align; ctx.font = '400 42px ' + bf; y7 = drawML(ctx, slide.body, anchorX, y7, maxW, 56); }
      }
    }
    ctx.globalAlpha = 1;
    if (L.frame && !isQuote) { ctx.fillStyle = L.accent; ctx.fillRect(0, 0, W, 14); ctx.fillRect(0, H - 14, W, 14); ctx.fillRect(0, 0, 14, H); ctx.fillRect(W - 14, 0, 14, H); }
    if (L.showHandle) {
      var hf = (style === 'design2') ? ('600 30px ' + bodyFont) : ('500 30px ' + fs);
      ctx.font = hf;
      if (style === 'design2') {
        ctx.textAlign = 'left'; ctx.fillStyle = isQuote ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)'; setLS(1);
        ctx.fillText(isQuote ? String(brand.ctaUrl || '') : String(dispHandle || ''), leftX, H - 104 - mB); setLS(0);
      } else {
        ctx.textAlign = 'right'; ctx.fillStyle = isQuote ? 'rgba(0,0,0,0.45)' : '#cfcfcf';
        ctx.fillText(dispHandle, W - Math.max(64, rightInset), H - 104 - mB);
      }
    }
  }

  return {
    WIDTH: WIDTH,
    HEIGHT: HEIGHT,
    fontStack: fontStack,
    headWeight: headWeight,
    defaultLayout: defaultLayout,
    builtinTemplates: builtinTemplates,
    isBuiltinTemplate: isBuiltinTemplate,
    resolveStyle: resolveStyle,
    resolveLayout: resolveLayout,
    resolveBg: resolveBg,
    hexToRgba: hexToRgba,
    wrap: wrap,
    drawML: drawML,
    countLines: countLines,
    tokenize: tokenize,
    words: words,
    wrapWords: wrapWords,
    drawRichHead: drawRichHead,
    drawHeadline: drawHeadline,
    parseBody: parseBody,
    middleInfo: middleInfo,
    drawChecklist: drawChecklist,
    frameAt: frameAt,
    drawSlide: drawSlide
  };
});
