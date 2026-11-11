/* Çini Bahçesi – arayüz ve oyun akışı (kutucuk / tepsi mekaniği)
   Dokunulan serbest taş üstteki kutucuğa iner. Aynı taştan ikincisi gelince ikisi birden kaybolur.
   Kutucuk farklı taşlarla dolarsa bölüm kaybedilir ve baştan başlar. */
(function () {
'use strict';
var CB = window.CB, SIZE = CB.TRAY_SIZE;
var BOOSTS = { undo: 3, hint: 3, shuffle: 2 };

function $(s) { return document.querySelector(s); }
var LS = {
  get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set: function (k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
var settings = Object.assign({ sound: true, vib: true, guide: true }, LS.get('cb_set', {}));
function freshProg() { return { level: 1, stars: {}, daily: {}, matches: 0, wins: 0, perfect: 0, maxCombo: 0, bestStreak: 0, fast: 0, coll: {}, ach: {} }; }
var prog = Object.assign(freshProg(), LS.get('cb_prog', {}));
var G = null, els = {}, hintIds = [], timer = null, busy = false, combo = 0, lastMatch = 0, boardVars = {};

// eski (kutucuksuz) sürümden kalan yarım oyunları temizle
['cb_g_level', 'cb_g_daily'].forEach(function (k) { var g = LS.get(k, null); if (g && !g.tray) LS.set(k, null); });

function saveGame() { if (G) LS.set('cb_g_' + G.mode, G); }
function saveProg() { LS.set('cb_prog', prog); }
function saveSet() { LS.set('cb_set', settings); document.body.classList.toggle('noguide', !settings.guide); }

// ---------- ses & titreşim
// Sesler Web Audio ile üretilir (dosya yok). Çini/seramik tınısı için temel nota + uyumsuz üst
// harmonikler (×2.76, ×5.4) hızlı sönümle çalınır; eşleşmede çan gibi uzun bir akor duyulur.
var ac = null, master = null;
function audio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createDynamicsCompressor(); master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
// tek bir "tını": f = frekans, t0 = başlangıç, vol = ses, dur = sönüm süresi, parts = [oran, ağırlık] listesi
function ring(f, t0, vol, dur, parts, type) {
  parts.forEach(function (p) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.value = f * p[0];
    var d = dur / Math.sqrt(p[0]);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol * p[1], t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + d + 0.05);
  });
}
var CLINK = [[1, 1], [2.76, 0.45], [5.4, 0.18]], BELL = [[1, 1], [2, 0.35], [3.01, 0.2], [4.2, 0.08]];
var SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]; // pentatonik: kombolar yükseldikçe kulağa hoş gelir
function sfx(kind, n) {
  if (!settings.sound) return;
  try {
    audio(); var now = ac.currentTime + 0.01;
    if (kind === 'tap') ring(1320 + Math.random() * 120, now, 0.08, 0.14, CLINK);
    else if (kind === 'no') { ring(150, now, 0.16, 0.18, [[1, 1], [1.5, 0.3]], 'triangle'); ring(142, now + 0.09, 0.12, 0.2, [[1, 1]], 'triangle'); }
    else if (kind === 'match') {
      var st = SCALE[Math.min((n || 1) - 1, SCALE.length - 1)], f = 523.25 * Math.pow(2, st / 12);
      ring(f, now, 0.15, 0.9, BELL); ring(f * 1.5, now + 0.07, 0.1, 0.8, BELL); ring(f * 2, now + 0.13, 0.05, 0.6, CLINK);
    }
    else if (kind === 'warn') { ring(880, now, 0.07, 0.15, CLINK, 'triangle'); ring(880, now + 0.16, 0.07, 0.15, CLINK, 'triangle'); }
    else if (kind === 'win') [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) { ring(f, now + i * 0.11, 0.14, 1.4, BELL); });
    else if (kind === 'lose') [392, 349.2, 311.1, 261.6].forEach(function (f, i) { ring(f, now + i * 0.17, 0.13, 0.7, [[1, 1], [2, 0.2]], 'triangle'); });
    else if (kind === 'badge') [783.99, 1174.7, 1568].forEach(function (f, i) { ring(f, now + i * 0.09, 0.1, 1.1, BELL); });
    else if (kind === 'shuffle') for (var i = 0; i < 6; i++) ring(900 + Math.random() * 900, now + i * 0.045, 0.05, 0.1, CLINK);
  } catch (e) {}
}
function vib(ms) { if (settings.vib && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }

// ---------- görsel efektler
var FX_COLORS = ['#ebc56b', '#f6dc8f', '#ffffff'];
function sparkle(rect, color) {
  var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2, n = 12;
  for (var i = 0; i < n; i++) {
    var p = document.createElement('i'), a = (i / n) * Math.PI * 2 + Math.random() * 0.4, d = 34 + Math.random() * 34;
    p.className = 'spark' + (i % 3 === 0 ? ' star' : '');
    p.style.left = cx + 'px'; p.style.top = cy + 'px';
    p.style.background = i % 2 ? color : FX_COLORS[i % 3];
    p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d + 'px');
    document.body.appendChild(p);
    setTimeout(p.remove.bind(p), 650);
  }
}
function floatText(msg, big) {
  var w = $('#boardWrap'), f = document.createElement('div');
  f.className = 'floattxt' + (big ? ' big' : ''); f.textContent = msg; w.appendChild(f);
  setTimeout(function () { f.remove(); }, 1000);
}
function confetti() {
  var cv = document.createElement('canvas'), W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  cv.className = 'confetti'; cv.width = W * dpr; cv.height = H * dpr; document.body.appendChild(cv);
  var x = cv.getContext('2d'); x.scale(dpr, dpr);
  var cols = CB.SUITS.map(function (s) { return s.color; }).concat(['#ebc56b', '#f6dc8f', '#ffffff', '#2fd3ad']), P = [];
  for (var i = 0; i < 140; i++) P.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 13,
    vy: -6 - Math.random() * 11, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    c: cols[i % cols.length], k: i % 4 });
  var t0 = performance.now();
  (function step(now) {
    var el = now - t0; x.clearRect(0, 0, W, H);
    P.forEach(function (p) {
      p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.globalAlpha = Math.max(0, 1 - el / 2600); x.fillStyle = p.c;
      if (p.k === 0) { x.beginPath(); x.arc(0, 0, p.s / 2, 0, 7); x.fill(); }
      else if (p.k === 1) { x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); x.rotate(Math.PI / 4); x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); }
      else x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      x.restore();
    });
    if (el < 2600) requestAnimationFrame(step); else cv.remove();
  })(t0);
}

// ---------- başarımlar (rozetler) ve koleksiyon
function collectedTypes() { var n = 0; for (var k in prog.coll) if (prog.coll[k] > 0) n++; return n; }
function collectedMotifs() { var m = {}; for (var k in prog.coll) if (prog.coll[k] > 0) m[k % 12] = 1; return Object.keys(m).length; }
function dailyCount() { return Object.keys(prog.daily).length; }
var ACH = [
  { id: 'ilk', i: '🌱', n: 'İlk Fidan', d: 'İlk seviyeyi tamamla', t: function () { return prog.level > 1; } },
  { id: 's10', i: '🌷', n: 'Çırak', d: '10 seviye tamamla', t: function () { return prog.level > 10; } },
  { id: 's25', i: '🏺', n: 'Kalfa', d: '25 seviye tamamla', t: function () { return prog.level > 25; } },
  { id: 's50', i: '🎖️', n: 'Usta', d: '50 seviye tamamla', t: function () { return prog.level > 50; } },
  { id: 's100', i: '👑', n: 'Üstat', d: '100 seviye tamamla', t: function () { return prog.level > 100; } },
  { id: 'm100', i: '✨', n: 'Yüz Eşleşme', d: 'Toplam 100 çift eşleştir', t: function () { return prog.matches >= 100; } },
  { id: 'm1000', i: '💎', n: 'Bin Eşleşme', d: 'Toplam 1000 çift eşleştir', t: function () { return prog.matches >= 1000; } },
  { id: 'kombo', i: '🔥', n: 'Kombo Ustası', d: 'Art arda ×8 kombo yap', t: function () { return prog.maxCombo >= 8; } },
  { id: 'kusursuz', i: '⭐', n: 'Kusursuz', d: 'Bir bölümü yardımcı kullanmadan bitir', t: function () { return prog.perfect >= 1; } },
  { id: 'yagmur', i: '🌟', n: 'Yıldız Yağmuru', d: '10 bölümü yardımcı kullanmadan bitir', t: function () { return prog.perfect >= 10; } },
  { id: 'cevik', i: '⚡', n: 'Çevik El', d: '30 taştan büyük bir bölümü 1 dakikadan kısa sürede bitir', t: function () { return prog.fast >= 1; } },
  { id: 'gunluk', i: '📅', n: 'Günün Bulmacası', d: 'İlk günlük bulmacanı çöz', t: function () { return dailyCount() >= 1; } },
  { id: 'hafta', i: '🗓️', n: 'Bir Hafta', d: '7 gün üst üste günlük bulmaca çöz', t: function () { return prog.bestStreak >= 7; } },
  { id: 'motif', i: '🎨', n: 'Motif Avcısı', d: '12 farklı motifin hepsini topla', t: function () { return collectedMotifs() >= 12; } },
  { id: 'koleksiyon', i: '🏆', n: 'Koleksiyoncu', d: '36 taşın hepsini topla', t: function () { return collectedTypes() >= 36; } }
];
var bannerQ = [], bannerOn = false;
function banner(icon, title, sub) { bannerQ.push([icon, title, sub]); if (!bannerOn) nextBanner(); }
function nextBanner() {
  var b = bannerQ.shift(); if (!b) { bannerOn = false; return; }
  bannerOn = true;
  var el = document.createElement('div'); el.className = 'banner';
  el.innerHTML = '<span class="bi">' + b[0] + '</span><span><b>' + b[1] + '</b><small>' + b[2] + '</small></span>';
  document.body.appendChild(el);
  requestAnimationFrame(function () { el.classList.add('show'); });
  setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); nextBanner(); }, 300); }, bannerQ.length ? 1300 : 2300);
}
function checkAch() {
  var got = 0;
  ACH.forEach(function (a) {
    if (!prog.ach[a.id] && a.t()) { prog.ach[a.id] = CB.dayKey(); got++; banner(a.i, 'Rozet kazandın: ' + a.n, a.d); }
  });
  if (got) { saveProg(); setTimeout(function () { sfx('badge'); vib([20, 40, 20]); }, 150); }
  return got;
}
function motifName(t) { var m = CB.MOTIF_KEYS[t % 12]; return CB.MOTIF_INFO[m][0]; }
function suitName(t) { return CB.SUITS[CB.suitOf(t)].name; }

function showBadges() {
  var n = Object.keys(prog.ach).length, h = '<h2>Rozetler</h2><p class="sub">' + n + ' / ' + ACH.length + ' rozet</p><div class="badges">';
  ACH.forEach(function (a) {
    var on = !!prog.ach[a.id];
    h += '<div class="bdg' + (on ? '' : ' off') + '"><span class="bi">' + (on ? a.i : '🔒') + '</span><span><b>' + a.n + '</b><small>' + a.d + '</small></span></div>';
  });
  modal(h + '</div>', [{ label: 'Kapat', cls: 'primary' }]);
}
function showCollection() {
  var h = '<h2>Koleksiyon</h2><p class="sub">' + collectedTypes() + ' / 36 taş · eşleştirdiğin her yeni taş albüme girer</p><div class="album">';
  CB.MOTIF_KEYS.forEach(function (key, m) {
    var info = CB.MOTIF_INFO[key], any = false, tiles = '';
    for (var s = 0; s < 3; s++) {
      var t = CB.typeOf(m, s), c = prog.coll[t] || 0; if (c) any = true;
      tiles += '<div class="ctile-wrap"><div class="tile ctile' + (c ? '' : ' locked') + '">' + CB.faceSVG(t) + '</div><small>' + (c ? '×' + c : '?') + '</small></div>';
    }
    h += '<div class="arow' + (any ? '' : ' off') + '"><div class="atiles">' + tiles + '</div><div class="atext"><b>' + (any ? info[0] : 'Gizli motif') +
      '</b><small>' + (any ? info[1] : 'Bu motifi eşleştirerek açabilirsin.') + '</small></div></div>';
  });
  modal(h + '</div>', [{ label: 'Kapat', cls: 'primary' }]);
}

var toastT = null;
function toast(msg) {
  var t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 1400);
}

// ---------- pencereler
function modal(html, buttons) {
  var card = $('#modalCard'); card.innerHTML = html;
  (buttons || []).forEach(function (b) {
    var el = document.createElement('button'); el.className = 'btn ' + (b.cls || ''); el.textContent = b.label;
    el.onclick = function () { closeModal(); if (b.fn) b.fn(); }; card.appendChild(el);
  });
  $('#modal').classList.remove('hidden');
}
function closeModal() { $('#modal').classList.add('hidden'); }
function modalOpen() { return !$('#modal').classList.contains('hidden'); }

// ---------- ekranlar
function show(id) { document.querySelectorAll('.screen').forEach(function (s) { s.classList.toggle('active', s.id === id); }); }
function streak() {
  var d = new Date(), n = 0;
  if (!prog.daily[CB.dayKey(d)]) d.setDate(d.getDate() - 1);
  while (prog.daily[CB.dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function showMenu() {
  stopTimer(); G = null; show('menu');
  $('#playSub').textContent = (LS.get('cb_g_level', null) ? 'Devam et · ' : '') + 'Seviye ' + prog.level;
  var today = CB.dayKey();
  $('#dailySub').textContent = prog.daily[today] ? 'Bugün tamamlandı ✓' : CB.trDate(today);
  var stars = 0; for (var k in prog.stars) stars += prog.stars[k];
  var s = streak();
  $('#stats').innerHTML = 'Tamamlanan seviye: <b>' + (prog.level - 1) + '</b> · Yıldız: <b>' + stars + '</b>' +
    (s ? '<br>Günlük seri: <b>' + s + ' gün</b>' : '');
  $('#collSub').textContent = collectedTypes() + ' / 36';
  $('#badgeSub').textContent = Object.keys(prog.ach).length + ' / ' + ACH.length;
}

function playLevel(n) {
  var saved = LS.get('cb_g_level', null);
  if (saved && saved.level === n) { G = saved; startGame(); return; }
  newGame('level', CB.levelConfig(n), { level: n });
}
function playDaily() {
  var key = CB.dayKey();
  if (prog.daily[key]) {
    modal('<h2>Günlük Bulmaca</h2><p>Bugünün bulmacasını tamamladın. Yarın yeni bir bulmaca seni bekliyor!</p>',
      [{ label: 'Yine de tekrar oyna', cls: 'primary', fn: function () { newGame('daily', CB.dailyConfig(key), { day: key }); } }, { label: 'Kapat' }]);
    return;
  }
  var saved = LS.get('cb_g_daily', null);
  if (saved && saved.day === key) { G = saved; startGame(); return; }
  newGame('daily', CB.dailyConfig(key), { day: key });
}
function newGame(mode, cfg, extra) {
  var dealt = CB.makeDeal(cfg.layout, cfg.types, cfg.seed);
  G = { mode: mode, cfg: cfg, level: extra.level || 0, day: extra.day || '', tray: [], hist: [], used: 0, time: 0,
    boosts: { undo: BOOSTS.undo, hint: BOOSTS.hint, shuffle: BOOSTS.shuffle },
    tiles: dealt.map(function (d, i) { return { id: i, x: d.x, y: d.y, z: d.z, t: d.t, st: 'b' }; }) };
  saveGame(); startGame();
}
function restart() { var g = G; newGame(g.mode, g.cfg, { level: g.level, day: g.day }); }
function startGame() {
  show('game'); busy = false; combo = 0; lastMatch = 0;
  if (!history.state || !history.state.g) history.pushState({ g: 1 }, '');
  $('#gTitle').textContent = G.cfg.title + ' · ' + G.cfg.sub.split(' · ').pop();
  renderBoard(); renderTray(); updateBoosts(); startTimer();
}
function goMenu() { if (history.state && history.state.g) history.back(); else showMenu(); }
window.addEventListener('popstate', function () { closeModal(); if ($('#game').classList.contains('active')) showMenu(); });

function startTimer() {
  stopTimer();
  timer = setInterval(function () { if (G && !document.hidden && !modalOpen()) { G.time++; if (G.time % 5 === 0) saveGame(); } }, 1000);
}
function stopTimer() { if (timer) clearInterval(timer); timer = null; }
function fmt(s) { var m = Math.floor(s / 60); return m + ':' + ('0' + (s % 60)).slice(-2); }

// ---------- tahta
function onBoard() { return G.tiles.filter(function (t) { return t.st === 'b'; }); }
function renderBoard() {
  var b = $('#board'); b.innerHTML = ''; els = {}; hintIds = [];
  G.tiles.forEach(function (t) {
    var d = document.createElement('div'); d.className = 'tile'; d.dataset.id = t.id; d.innerHTML = CB.faceSVG(t.t);
    if (t.st !== 'b') d.style.display = 'none';
    b.appendChild(d); els[t.id] = d;
  });
  layoutBoard(); refresh();
}
function layoutBoard() {
  if (!G || !$('#game').classList.contains('active')) return;
  var wrap = $('#boardWrap'), aw = wrap.clientWidth - 16, ah = wrap.clientHeight - 16;
  var mx = 0, my = 0, mz = 0;
  G.tiles.forEach(function (t) { mx = Math.max(mx, t.x + 2); my = Math.max(my, t.y + 2); mz = Math.max(mz, t.z); });
  var R = 1.3, D = 0.08;
  var W = Math.min(aw / (mx / 2 + mz * D + 0.12), ah / (my / 2 * R + mz * D + 0.16), 96);
  var H = W * R, dz = W * D, gap = Math.max(1, W * 0.035);
  var bw = mx / 2 * W + mz * dz + W * 0.12, bh = my / 2 * H + mz * dz + W * 0.16;
  var b = $('#board');
  b.style.width = bw + 'px'; b.style.height = bh + 'px';
  b.style.left = (wrap.clientWidth - bw) / 2 + 'px'; b.style.top = (wrap.clientHeight - bh) / 2 + 'px';
  var e = W * 0.045;
  boardVars = { '--e1': e + 'px', '--e2': e * 1.9 + 'px', '--e3': e * 2.4 + 'px', '--e4': e * 3.2 + 'px' };
  for (var k in boardVars) b.style.setProperty(k, boardVars[k]);
  G.tiles.forEach(function (t) {
    var d = els[t.id];
    d.style.left = t.x / 2 * W + (mz - t.z) * dz + 'px';
    d.style.top = t.y / 2 * H + (mz - t.z) * dz + 'px';
    d.style.width = W - gap + 'px'; d.style.height = H - gap + 'px';
    d.style.zIndex = t.z * 1000 + t.y * 30 + t.x;
  });
}
function refresh() {
  var act = onBoard();
  act.forEach(function (t) { els[t.id].classList.toggle('blocked', !CB.isFree(t, act)); });
  $('#gInfo').textContent = act.length + ' taş kaldı';
}
function clearHint() { hintIds.forEach(function (id) { if (els[id]) els[id].classList.remove('hint'); }); hintIds = []; }

// ---------- kutucuk
function renderTray() {
  var tr = $('#tray'); tr.innerHTML = '';
  for (var i = 0; i < SIZE; i++) {
    var s = document.createElement('div'); s.className = 'slot';
    var id = G.tray[i];
    if (id !== undefined) {
      var d = document.createElement('div'); d.className = 'tile mini'; d.innerHTML = CB.faceSVG(G.tiles[id].t);
      d.dataset.tid = id; s.appendChild(d);
    }
    tr.appendChild(s);
  }
  tr.classList.toggle('warn', G.tray.length >= SIZE - 1);
}
function slotRect(i) { var s = $('#tray').children[Math.min(i, SIZE - 1)]; return s.getBoundingClientRect(); }

function fly(el, toRect, done) {
  var r = el.getBoundingClientRect(), c = el.cloneNode(true);
  c.classList.remove('blocked', 'hint', 'shake'); c.classList.add('flying');
  for (var k in boardVars) c.style.setProperty(k, boardVars[k]);
  c.style.left = r.left + 'px'; c.style.top = r.top + 'px'; c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
  c.style.zIndex = 9000; document.body.appendChild(c);
  el.style.display = 'none';
  var sx = toRect.width / r.width, dx = toRect.left - r.left, dy = toRect.top - r.top;
  requestAnimationFrame(function () { requestAnimationFrame(function () {
    c.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ')';
  }); });
  setTimeout(function () { c.remove(); done(); }, 230);
}
function popAt(rect, t) {
  var c = document.createElement('div'); c.className = 'tile mini popfx'; c.innerHTML = CB.faceSVG(t);
  c.style.left = rect.left + 'px'; c.style.top = rect.top + 'px'; c.style.width = rect.width + 'px'; c.style.height = rect.height + 'px';
  document.body.appendChild(c); setTimeout(function () { c.remove(); }, 380);
}

function tap(id) {
  if (busy || !G) return;
  var t = G.tiles[id]; if (!t || t.st !== 'b') return;
  clearHint();
  var why = CB.blockReason(t, onBoard());
  if (why) {
    var d = els[id]; d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake');
    sfx('no'); toast(why === 'ust' ? 'Bu taşın üstü kapalı' : 'Önce sağındaki ya da solundaki taşı al'); return;
  }
  busy = true; sfx('tap'); vib(8);
  var partner = null;
  for (var i = 0; i < G.tray.length; i++) if (G.tiles[G.tray[i]].t === t.t) { partner = G.tray[i]; break; }
  var target = slotRect(G.tray.length);
  t.st = 'tray'; refresh();
  fly(els[id], target, function () {
    if (partner !== null) {
      var pi = G.tray.indexOf(partner), pr = slotRect(pi);
      G.tray.splice(pi, 1); t.st = 'gone'; G.tiles[partner].st = 'gone';
      G.hist.push({ id: id, m: partner });
      renderTray(); popAt(pr, t.t); popAt(target, t.t);
      var col = CB.SUITS[CB.suitOf(t.t)].color; sparkle(pr, col); sparkle(target, col);
      var now = Date.now(); combo = now - lastMatch < 4000 ? combo + 1 : 1; lastMatch = now;
      if (combo >= 2) floatText('Kombo ×' + combo + '!', combo >= 4);
      else if (Math.random() < 0.35) floatText(['Harika!', 'Güzel!', 'Süper!', 'Maşallah!'][Math.floor(Math.random() * 4)]);
      sfx('match', combo); vib(combo >= 3 ? [15, 30, 15] : 18);
      var first = !prog.coll[t.t];
      prog.coll[t.t] = (prog.coll[t.t] || 0) + 1; prog.matches++; prog.maxCombo = Math.max(prog.maxCombo, combo);
      if (first) banner('<span class="mini-face">' + CB.faceSVG(t.t) + '</span>', 'Yeni motif: ' + motifName(t.t), suitName(t.t) + ' · koleksiyona eklendi');
      saveProg(); checkAch();
    } else {
      G.tray.push(id); G.hist.push({ id: id, m: null }); renderTray();
      if (G.tray.length === SIZE - 1) { sfx('warn'); vib([10, 50, 10]); }
    }
    saveGame(); busy = false;
    if (!onBoard().length && !G.tray.length) setTimeout(win, 350);
    else if (G.tray.length >= SIZE) { busy = true; setTimeout(lose, 450); }
  });
}

// ---------- yardımcılar
function updateBoosts() {
  [['undo', '#bUndo'], ['hint', '#bHint'], ['shuffle', '#bShuffle']].forEach(function (a) {
    var n = G.boosts[a[0]]; $(a[1]).textContent = n;
    $(a[1]).parentNode.classList.toggle('empty', n <= 0);
  });
}
function useBoost(k, label) {
  if (G.boosts[k] <= 0) { toast(label + ' hakkın bitti'); sfx('no'); return false; }
  G.boosts[k]--; G.used++; updateBoosts(); return true;
}
function undo() {
  if (busy) return;
  var h = G.hist[G.hist.length - 1];
  if (!h) { toast('Geri alınacak hamle yok'); return; }
  if (!useBoost('undo', 'Geri alma')) return;
  G.hist.pop(); clearHint();
  if (h.m === null) G.tray.splice(G.tray.indexOf(h.id), 1);
  else { G.tiles[h.m].st = 'tray'; G.tray.push(h.m); }
  G.tiles[h.id].st = 'b'; els[h.id].style.display = '';
  combo = 0; renderTray(); refresh(); saveGame(); sfx('tap');
}
function hint() {
  if (busy) return;
  clearHint();
  var act = onBoard(), free = act.filter(function (t) { return CB.isFree(t, act); }), pick = null;
  for (var i = 0; i < G.tray.length && !pick; i++) {
    var tt = G.tiles[G.tray[i]].t;
    for (var j = 0; j < free.length; j++) if (free[j].t === tt) { pick = [free[j].id]; break; }
  }
  if (!pick) {
    var by = {};
    for (var k = 0; k < free.length && !pick; k++) {
      var f = free[k]; if (by[f.t] !== undefined) pick = [by[f.t], f.id]; else by[f.t] = f.id;
    }
  }
  if (!pick) { toast('Açık çift yok, karıştırmayı dene'); return; }
  if (!useBoost('hint', 'İpucu')) return;
  hintIds = pick; pick.forEach(function (id) { els[id].classList.add('hint'); });
  saveGame(); sfx('tap');
}
function shuffleBoard() {
  if (busy) return;
  var act = onBoard(); if (act.length < 2) return;
  if (!useBoost('shuffle', 'Karıştırma')) return;
  var types = CB.shuffle(act.map(function (t) { return t.t; }), CB.mulberry32((Date.now() ^ (Math.random() * 1e9)) | 0));
  act.forEach(function (t, i) { t.t = types[i]; els[t.id].innerHTML = CB.faceSVG(t.t); });
  act.forEach(function (t) { var d = els[t.id]; d.classList.remove('shuffling'); void d.offsetWidth; d.classList.add('shuffling'); });
  G.hist = []; clearHint(); refresh(); saveGame(); sfx('shuffle'); vib(20); toast('Taşlar karıştırıldı');
}

// ---------- sonuç
function win() {
  stopTimer();
  var used = G.used, stars = used === 0 ? 3 : used <= 2 ? 2 : 1, g = G, btns;
  LS.set('cb_g_' + g.mode, null);
  if (g.mode === 'level') {
    prog.stars[g.level] = Math.max(prog.stars[g.level] || 0, stars);
    if (prog.level <= g.level) prog.level = g.level + 1;
    btns = [{ label: 'Sonraki Seviye', cls: 'primary', fn: function () { playLevel(g.level + 1); } }, { label: 'Ana Menü', fn: goMenu }];
  } else {
    prog.daily[g.day] = true; prog.bestStreak = Math.max(prog.bestStreak, streak());
    btns = [{ label: 'Ana Menü', cls: 'primary', fn: goMenu }];
  }
  prog.wins++; if (!used) prog.perfect++;
  if (g.tiles.length > 30 && g.time < 60) prog.fast++;
  saveProg(); sfx('win'); vib([30, 60, 30]); confetti();
  setTimeout(checkAch, 600);
  var st = ''; for (var i = 0; i < 3; i++) st += '<span class="' + (i < stars ? '' : 'off') + '">★</span>';
  modal('<h2>Tebrikler!</h2><div class="stars">' + st + '</div><p><b>' + g.cfg.title + '</b> · ' + g.cfg.sub +
    '<br>Süre: ' + fmt(g.time) + (used ? '<br><small>Yardımcı kullanmadan bitirirsen 3 yıldız alırsın.</small>' : '') + '</p>' +
    (g.mode === 'daily' ? '<p>Günlük seri: <b>' + streak() + ' gün</b></p>' : ''), btns);
}
function lose() {
  stopTimer(); sfx('lose'); vib([60, 40, 60]);
  var g = G; LS.set('cb_g_' + g.mode, null);
  modal('<h2>Kutucuk doldu!</h2><p>Kutucukta eşleşmeyen ' + SIZE + ' taş birikti. Bölüm baştan başlıyor.</p>' +
    '<p><small>İpucu: Kutucuğa bir taş koymadan önce, eşini de alabileceğin taşları seç.</small></p>',
    [{ label: 'Baştan Başla', cls: 'primary', fn: function () { busy = false; G = g; restart(); } },
     { label: 'Ana Menü', fn: function () { busy = false; goMenu(); } }]);
}

// ---------- ayarlar & yardım
function howTo() {
  modal('<h2>Nasıl Oynanır?</h2><div class="how">' +
    '<p>👆 Serbest bir taşa dokun, taş yukarıdaki <b>kutucuğa</b> iner.</p>' +
    '<p>🔓 <b>Serbest taş:</b> Üstünde taş yok ve <b>sağ ya da sol</b> yanından en az biri boş. Yan yana üç taştan ortadakini almak için önce kenardakilerden birini almalısın. Alınamayan taşlar soluk görünür.</p>' +
    '<p>✨ Aynı taştan <b>ikincisini</b> de kutucuğa koyunca ikisi birden kaybolur.</p>' +
    '<p>⚠️ Kutucukta <b>' + SIZE + ' bölme</b> var. Eşleşmeyen taşlarla dolarsa bölüm <b>baştan başlar</b>.</p>' +
    '<p>🎨 Motifin yanında <b>renk ve alttaki noktalar</b> da aynı olmalı.</p>' +
    '<p>💡 Her bölümde ücretsiz <b>Geri Al</b>, <b>İpucu</b> ve <b>Karıştır</b> hakların var. Reklam yok, süre baskısı yok.</p></div>',
    [{ label: 'Anladım', cls: 'primary' }]);
  LS.set('cb_seen3', 1);
}
function openSettings() {
  function row(key, label) { return '<label class="sw"><span>' + label + '</span><input type="checkbox" data-k="' + key + '"' + (settings[key] ? ' checked' : '') + '></label>'; }
  modal('<h2>Ayarlar</h2>' + row('sound', 'Ses efektleri') + row('vib', 'Titreşim') + row('guide', 'Kapalı taşları soluk göster') +
    '<p class="ver">Çini Bahçesi · sürüm 1.3.0</p>',
    [{ label: 'Tamam', cls: 'primary' }, { label: 'Nasıl Oynanır', fn: howTo }, { label: 'İlerlemeyi Sıfırla', cls: 'danger', fn: confirmReset }]);
  document.querySelectorAll('#modalCard input[data-k]').forEach(function (inp) {
    inp.onchange = function () { settings[inp.dataset.k] = inp.checked; saveSet(); };
  });
}
function confirmReset() {
  modal('<h2>Emin misin?</h2><p>Tüm seviyeler, yıldızlar, günlük seri, rozetler ve koleksiyon silinecek. Bu işlem geri alınamaz.</p>',
    [{ label: 'Vazgeç', cls: 'primary' }, { label: 'Evet, sıfırla', cls: 'danger', fn: function () {
      prog = freshProg(); saveProg(); LS.set('cb_g_level', null); LS.set('cb_g_daily', null); showMenu(); } }]);
}

// ---------- başlat
function init() {
  var logo = $('#logoTiles');
  [[2, 0, -10], [0, 2, 0], [3, 1, 10]].forEach(function (a) {
    var d = document.createElement('div'); d.className = 'tile logo-tile';
    d.style.transform = 'rotate(' + a[2] + 'deg)' + (a[2] ? ' translateY(8px)' : '');
    d.innerHTML = CB.faceSVG(CB.typeOf(a[0], a[1])); logo.appendChild(d);
  });
  $('#btnPlay').onclick = function () { playLevel(prog.level); };
  $('#btnDaily').onclick = playDaily;
  $('#btnHow').onclick = howTo;
  $('#btnColl').onclick = showCollection;
  $('#btnBadges').onclick = showBadges;
  $('#btnSettings').onclick = openSettings;
  $('#btnGSettings').onclick = openSettings;
  $('#btnBack').onclick = goMenu;
  $('#btnUndo').onclick = undo;
  $('#btnHint').onclick = hint;
  $('#btnShuffle').onclick = shuffleBoard;
  $('#board').addEventListener('click', function (e) { var d = e.target.closest('.tile'); if (d) tap(+d.dataset.id); });
  window.addEventListener('resize', layoutBoard);
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) saveGame(); });
  saveSet(); showMenu();
  if (!LS.get('cb_seen3', 0)) setTimeout(howTo, 300);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
}
init();
})();
