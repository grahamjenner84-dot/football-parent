/**
 * Single Slide Builder — shared drawing core.
 *
 * Pure canvas 2D drawing logic for the "joke" slide type (dark / cream layouts).
 * Takes a CanvasRenderingContext2D-compatible object and plain data — no DOM,
 * no React, no localStorage, no font-loading side effects. Works against the
 * browser's native canvas context and against @napi-rs/canvas server-side,
 * since both implement the same 2D context API.
 *
 * Loaded two ways from one file (single source of truth):
 *   - Browser: <script src="/single-slide-core.js"> — attaches window.SingleSlideCore
 *   - Node:    require('./single-slide-core.js') — CommonJS export
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
    root.SingleSlideCore = mod;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  var WIDTH = 1080;
  var HEIGHT = 1920;

  function handleFor(platform) {
    return platform === 'tiktok' ? '@footballparent' : '@football.parent';
  }
  function platformName(platform) {
    return platform === 'tiktok' ? 'TikTok' : 'Instagram';
  }

  // Whole-word accent: any space-delimited word containing * is highlighted, strip the *.
  function words(text) {
    return String(text).toUpperCase().split(/\s+/).filter(Boolean).map(function (w) {
      return { t: w.replace(/\*/g, ''), a: w.indexOf('*') !== -1 };
    });
  }

  function wrapWords(ctx, wordList, maxW, space) {
    var lines = [], line = [], w = 0;
    for (var i = 0; i < wordList.length; i++) {
      var word = wordList[i];
      var ww = ctx.measureText(word.t).width;
      var add = (line.length ? space : 0) + ww;
      if (w + add > maxW && line.length) {
        lines.push(line); line = [word]; w = ww;
      } else {
        line.push(word); w += add;
      }
    }
    if (line.length) lines.push(line);
    return lines;
  }

  function drawLines(ctx, lines, anchorX, y, lineH, align, space, base, accent) {
    ctx.textAlign = 'left';
    var yy = y;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var lw = 0;
      line.forEach(function (wd, j) { lw += ctx.measureText(wd.t).width + (j ? space : 0); });
      var x = align === 'center' ? anchorX - lw / 2 : anchorX;
      line.forEach(function (wd, j) {
        if (j) x += space;
        ctx.fillStyle = wd.a ? accent : base;
        ctx.fillText(wd.t, x, yy);
        x += ctx.measureText(wd.t).width;
      });
      yy += lineH;
    }
    return yy;
  }

  // Shrink-to-fit: tries font sizes from hi down to lo (step 2) until the
  // wrapped paragraphs fit within maxH; falls back to lo (may overflow).
  function fit(ctx, paras, maxW, maxH, hi, lo, lhR, gap) {
    for (var s = hi; s >= lo; s -= 2) {
      ctx.font = "400 " + s + "px 'Anton'";
      var space = ctx.measureText(' ').width;
      var totalLines = 0; var wrapped = [];
      for (var i = 0; i < paras.length; i++) {
        var p = paras[i];
        if (!p.length) continue;
        var ls = wrapWords(ctx, p, maxW, space);
        wrapped.push(ls); totalLines += ls.length;
      }
      var lineH = s * lhR;
      var h = totalLines * lineH + (wrapped.length > 1 ? (wrapped.length - 1) * gap : 0);
      if (h <= maxH) return { size: s, lineH: lineH, space: space, wrapped: wrapped, height: h };
    }
    ctx.font = "400 " + lo + "px 'Anton'";
    var space2 = ctx.measureText(' ').width;
    var wrapped2 = paras.filter(function (p) { return p.length; }).map(function (p) { return wrapWords(ctx, p, maxW, space2); });
    var lineH2 = lo * lhR;
    var h2 = wrapped2.reduce(function (a, l) { return a + l.length; }, 0) * lineH2 + (wrapped2.length > 1 ? (wrapped2.length - 1) * gap : 0);
    return { size: lo, lineH: lineH2, space: space2, wrapped: wrapped2, height: h2 };
  }

  // Platform-safe geometry (top 250, side 96, extra-right 96, bottom 220).
  // Keeps text clear of TikTok/Instagram top bars, the bottom caption, and
  // the right-side action buttons.
  function safe() {
    var W = WIDTH, H = HEIGHT, side = 96, extraR = 96, top = 250, bot = 220;
    var leftX = side, rightEdge = W - side - extraR;
    return { W: W, H: H, leftX: leftX, rightEdge: rightEdge, maxW: rightEdge - leftX, centerX: (leftX + rightEdge) / 2, safeTop: top, safeBottom: H - bot };
  }

  // Drawn as a filled rect rather than the '■' glyph: Spline Sans Mono has no
  // glyph for it, so this previously relied on the browser silently falling
  // back to a system symbol font — a dependency @napi-rs/canvas doesn't
  // replicate. A primitive rect renders identically everywhere.
  function eyebrow(ctx, color, x, y) {
    ctx.font = "600 26px 'Spline Sans Mono'"; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    var markSize = 13;
    ctx.fillRect(x, y - 17, markSize, markSize);
    var str = 'FOOTBALLPARENT.CO.UK'; var extra = 5; var cx = x + markSize + 10;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + extra;
    }
  }

  // Real family name of the bundled public/fonts/NotoEmoji-PointDown.woff2
  // (a single-glyph subset of Google's Noto Emoji, ~900 bytes). Server-side
  // renderers must register that file before drawing. Browsers ignore this
  // entirely — they fall back to their own system emoji font for any family
  // that lacks the glyph, which is how this already worked pre-refactor.
  var EMOJI_FONT_FAMILY = 'Noto Emoji';

  function drawTagline(ctx, centerX, y, textFont, color) {
    var before = 'Tag a football parent ';
    var emoji = '👇';
    var after = '  ·  Follow for more';
    ctx.fillStyle = color;
    ctx.font = textFont;
    var wBefore = ctx.measureText(before).width;
    var wAfter = ctx.measureText(after).width;
    ctx.font = "32px '" + EMOJI_FONT_FAMILY + "'";
    var wEmoji = ctx.measureText(emoji).width;
    var x = centerX - (wBefore + wEmoji + wAfter) / 2;
    ctx.textAlign = 'left';
    ctx.font = textFont; ctx.fillText(before, x, y); x += wBefore;
    ctx.font = "32px '" + EMOJI_FONT_FAMILY + "'"; ctx.fillText(emoji, x, y); x += wEmoji;
    ctx.font = textFont; ctx.fillText(after, x, y);
    ctx.textAlign = 'center';
  }

  function footer(ctx, platform, S, dark) {
    var cx = S.centerX; var y = S.safeBottom - 140;
    ctx.save();
    ctx.strokeStyle = dark ? 'rgba(255,255,255,.14)' : 'rgba(22,20,15,.16)';
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(S.leftX, y); ctx.lineTo(S.rightEdge, y); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = "800 40px 'Archivo'"; ctx.fillStyle = dark ? '#ffffff' : '#16140f';
    ctx.fillText(handleFor(platform), cx, y + 60);
    drawTagline(ctx, cx, y + 108, "600 32px 'Archivo'", dark ? '#9a9a93' : '#9a7d1e');
    ctx.restore();
  }

  function drawDark(ctx, joke, platform) {
    var W = WIDTH, H = HEIGHT;
    var S = safe();
    var g = ctx.createRadialGradient(W / 2, 360, 0, W / 2, 360, 1180);
    g.addColorStop(0, '#24241f'); g.addColorStop(.42, '#121215'); g.addColorStop(1, '#0b0b0d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var glow = ctx.createRadialGradient(S.centerX, 210, 0, S.centerX, 210, 540);
    glow.addColorStop(0, 'rgba(230,181,61,.18)'); glow.addColorStop(1, 'rgba(230,181,61,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, 560);
    eyebrow(ctx, '#E6B53D', S.leftX, S.safeTop + 44);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    var sWords = words(joke.setup), pWords = words(joke.punch);
    var paras = [sWords, pWords].filter(function (p) { return p.length; });
    var bandTop = S.safeTop + 150, bandBot = S.safeBottom - 260, bandH = bandBot - bandTop;
    var f = fit(ctx, paras, S.maxW, bandH, 120, 52, 1.02, 40);
    ctx.font = "400 " + f.size + "px 'Anton'";
    var yy = bandTop + (bandH - f.height) / 2;
    f.wrapped.forEach(function (ls, pi) {
      yy = drawLines(ctx, ls, S.centerX, yy, f.lineH, 'center', f.space, '#ffffff', '#E6B53D');
      if (pi < f.wrapped.length - 1) yy += 40;
    });
    footer(ctx, platform, S, true);
  }

  function drawCream(ctx, joke, platform) {
    var W = WIDTH, H = HEIGHT;
    var S = safe();
    ctx.fillStyle = '#ECE6D8'; ctx.fillRect(0, 0, W, H);
    eyebrow(ctx, '#9a7d1e', S.leftX, S.safeTop + 44);
    var allWords = words((joke.setup ? joke.setup + ' ' : '') + joke.punch);
    ctx.textBaseline = 'top';
    var bandTop = S.safeTop + 150, bandBot = S.safeBottom - 260, bandH = bandBot - bandTop;
    var qH = 170;
    var f = fit(ctx, [allWords], S.maxW, bandH - qH, 118, 52, 1.04, 0);
    var groupH = qH + f.height;
    var qy = bandTop + (bandH - groupH) / 2;
    ctx.font = "400 200px 'Anton'"; ctx.fillStyle = '#E6B53D'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('“', S.leftX - 6, qy + 150);
    ctx.textBaseline = 'top'; ctx.font = "400 " + f.size + "px 'Anton'";
    drawLines(ctx, f.wrapped[0], S.leftX, qy + qH, f.lineH, 'left', f.space, '#16140f', '#c69214');
    footer(ctx, platform, S, false);
  }

  // joke: {setup, punch, layout} — layout 'C' = cream quote card, anything else = dark.
  function drawJoke(ctx, joke, platform) {
    if (joke.layout === 'C') return drawCream(ctx, joke, platform);
    return drawDark(ctx, joke, platform);
  }

  function drawSafeOverlay(ctx) {
    var S = safe();
    ctx.save();
    ctx.fillStyle = 'rgba(229,72,77,0.18)';
    ctx.fillRect(0, 0, S.W, S.safeTop);
    ctx.fillRect(0, S.safeBottom, S.W, S.H - S.safeBottom);
    ctx.fillRect(S.rightEdge, 1000, S.W - S.rightEdge, S.safeBottom - 1000);
    ctx.strokeStyle = 'rgba(82,196,128,0.95)'; ctx.setLineDash([16, 11]); ctx.lineWidth = 3;
    ctx.strokeRect(S.leftX, S.safeTop, S.maxW, S.safeBottom - S.safeTop);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(82,196,128,0.95)'; ctx.font = "600 24px 'Spline Sans Mono'"; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('SAFE AREA', S.leftX + 8, S.safeTop + 8);
    ctx.fillStyle = 'rgba(255,180,184,0.95)'; ctx.textAlign = 'right';
    ctx.fillText('BUTTONS', S.W - 12, 1010);
    ctx.restore();
  }

  return {
    WIDTH: WIDTH,
    HEIGHT: HEIGHT,
    EMOJI_FONT_FAMILY: EMOJI_FONT_FAMILY,
    handleFor: handleFor,
    platformName: platformName,
    words: words,
    wrapWords: wrapWords,
    drawLines: drawLines,
    fit: fit,
    safe: safe,
    eyebrow: eyebrow,
    footer: footer,
    drawDark: drawDark,
    drawCream: drawCream,
    drawJoke: drawJoke,
    drawSafeOverlay: drawSafeOverlay
  };
});
