/* Çini Bahçesi – sakin bir taş eşleştirme bulmacası
   Tek dosyalık oyun motoru + arayüz. Harici kütüphane yok, tamamen çevrimdışı çalışır. */
(function () {
'use strict';

// ---------------------------------------------------------------- Motifler
// Her motif 100x100'lük bir alana çizilir. currentColor = taşın renk takımı.
var IV = '#fffaf0';
var MOTIFS = {
  lale: '<path d="M50 12C41 22 36 30 36 44c0 11 6 18 14 18s14-7 14-18c0-14-5-22-14-32z"/>' +
        '<path d="M48 62c-13 0-22-10-23-28 8 4 15 10 19 18z"/><path d="M52 62c13 0 22-10 23-28-8 4-15 10-19 18z"/>' +
        '<rect x="48" y="60" width="4" height="30" rx="2"/><path d="M50 86c-10-2-18-10-20-20 9 2 16 8 20 16z"/>' +
        '<path d="M50 80c8-2 14-8 16-16-7 2-13 7-16 12z"/>',
  karanfil: '<path d="M50 62L22 34Q24 26 31 28Q33 19 41 22Q45 14 50 20Q55 14 59 22Q67 19 69 28Q76 26 78 34Z"/>' +
        '<path d="M50 58L38 30M50 58V24M50 58l12-28" stroke="' + IV + '" stroke-width="2.5" fill="none"/>' +
        '<path d="M43 58h14l-3 12h-8z"/><rect x="48" y="68" width="4" height="22" rx="2"/>' +
        '<path d="M50 84c6-8 14-10 22-10-4 7-12 11-22 10z"/>',
  nar: '<circle cx="50" cy="58" r="28"/><path d="M38 36l2-14 5 8 5-10 5 10 5-8 2 14z"/>' +
        '<g fill="' + IV + '"><circle cx="40" cy="54" r="4"/><circle cx="52" cy="50" r="4"/><circle cx="62" cy="58" r="4"/>' +
        '<circle cx="46" cy="66" r="4"/><circle cx="58" cy="70" r="4"/><circle cx="35" cy="66" r="3"/></g>',
  yildiz: '<rect x="25" y="25" width="50" height="50" rx="3"/><rect x="25" y="25" width="50" height="50" rx="3" transform="rotate(45 50 50)"/>' +
        '<circle cx="50" cy="50" r="13" fill="' + IV + '"/><circle cx="50" cy="50" r="6"/>',
  servi: '<path d="M50 8C64 30 68 54 60 76H40C32 54 36 30 50 8z"/>' +
        '<path d="M50 20v54M50 40l-8-8M50 40l8-8M50 56l-10-9M50 56l10-9" stroke="' + IV + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
        '<rect x="46" y="76" width="8" height="14" rx="2"/>',
  nazar: '<circle cx="50" cy="50" r="38"/><circle cx="50" cy="50" r="26" fill="' + IV + '"/><circle cx="50" cy="50" r="16"/>' +
        '<circle cx="50" cy="50" r="7" fill="#1b1b2f"/><circle cx="45" cy="45" r="3" fill="' + IV + '"/>',
  cay: '<path d="M32 20h36c-5 14-9 22-7 34 2 12 3 20 0 28H39c-3-8-2-16 0-28 2-12-2-20-7-34z"/>' +
        '<path d="M37 26h26c-2 6-4 12-4 18H41c0-6-2-12-4-18z" fill="' + IV + '" opacity=".6"/>' +
        '<ellipse cx="50" cy="88" rx="26" ry="5"/>',
  kahve: '<path d="M24 42h48v14c0 14-10 24-24 24S24 70 24 56z"/>' +
        '<path d="M72 48c12 0 12 18 0 18" fill="none" stroke="currentColor" stroke-width="6"/>' +
        '<ellipse cx="48" cy="86" rx="30" ry="5"/>' +
        '<path d="M40 34c-4-6 4-10 0-16M54 34c-4-6 4-10 0-16" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<path d="M30 50h36" stroke="' + IV + '" stroke-width="3"/>',
  sumbul: '<rect x="48" y="48" width="4" height="42" rx="2"/><path d="M50 88c-8-4-14-14-14-26 8 4 13 12 14 20z"/>' +
        '<circle cx="50" cy="14" r="6"/><circle cx="43" cy="24" r="6"/><circle cx="57" cy="24" r="6"/>' +
        '<circle cx="37" cy="35" r="6"/><circle cx="50" cy="35" r="6"/><circle cx="63" cy="35" r="6"/>' +
        '<circle cx="43" cy="46" r="6"/><circle cx="57" cy="46" r="6"/>',
  yaprak: '<path d="M18 84C24 46 52 20 86 14c-4 34-30 62-68 70z"/>' +
        '<path d="M22 80C40 60 58 40 80 20" stroke="' + IV + '" stroke-width="3" fill="none"/>' +
        '<path d="M40 62l-4-12M52 48l-2-12M62 36l2-10M44 58l12 2M56 44l12 2" stroke="' + IV + '" stroke-width="2" fill="none"/>',
  rozet: (function () { var s = ''; for (var k = 0; k < 8; k++) s += '<ellipse cx="50" cy="26" rx="10" ry="18" transform="rotate(' + (k * 45) + ' 50 50)"/>'; return s; })() +
        '<circle cx="50" cy="50" r="14" fill="' + IV + '"/><circle cx="50" cy="50" r="8"/>',
  cintemani: '<circle cx="36" cy="28" r="10"/><circle cx="64" cy="28" r="10"/><circle cx="50" cy="50" r="10"/>' +
        '<path d="M14 72q9-10 18 0t18 0 18 0 18 0" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>' +
        '<path d="M14 88q9-10 18 0t18 0 18 0 18 0" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>'
};
var MOTIF_KEYS = ['lale', 'karanfil', 'nar', 'yildiz', 'servi', 'nazar', 'cay', 'kahve', 'sumbul', 'yaprak', 'rozet', 'cintemani'];
var SUITS = [{ name: 'Lacivert', color: '#1f56a8' }, { name: 'Firuze', color: '#0f8069' }, { name: 'Mercan', color: '#c0392b' }];

// 36 taş türü: motif = t % 12. Renk takımı, ilk 12 türün renkleri karışık olacak şekilde dağıtılır.
function motifOf(t) { return t % 12; }
function suitOf(t) { return (Math.floor(t / 12) + t) % 3; }
function typeOf(m, s) { for (var k = 0; k < 3; k++) { var t = k * 12 + m; if (suitOf(t) === s) return t; } return m; }

function faceSVG(t, standalone) {
  var s = suitOf(t), c = SUITS[s].color, dots = '';
  for (var i = 0; i <= s; i++) dots += '<circle cx="' + (50 + (i - s / 2) * 14) + '" cy="119" r="4.5"/>';
  return '<svg ' + (standalone ? 'xmlns="http://www.w3.org/2000/svg" width="200" height="260" ' : '') +
    'viewBox="0 0 100 130" color="' + c + '" style="color:' + c + '"><g fill="currentColor">' +
    '<g transform="translate(6 6) scale(.88)">' + MOTIFS[MOTIF_KEYS[motifOf(t)]] + '</g>' + dots + '</g></svg>';
}

// ---------------------------------------------------------------- Tahtalar
// Her katman: satırlar ('#' = taş), ox/oy = yarım taş cinsinden kaydırma.
// Az taşlı, katmanlı tahtalar (14–58 taş). Yarım kaydırmalı katmanlar taşları kısmen örter.
var LAYOUTS = [
  { name: 'Fidan', types: 4, layers: [
    { r: ['###', '###', '###', '###'] },
    { r: ['##', '##'], ox: 1, oy: 2 }] },
  { name: 'Lale', types: 6, layers: [
    { r: ['#.#.#', '#####', '.###.', '..#..'] },
    { r: ['####', '.##.'], ox: 1, oy: 1 },
    { r: ['##'], ox: 2, oy: 2 }] },
  { name: 'Çeşme', types: 7, layers: [
    { r: ['####', '####', '####', '####'] },
    { r: ['###', '###', '###'], ox: 1, oy: 1 },
    { r: ['##', '##'], ox: 2, oy: 2 }] },
  { name: 'Yıldız', types: 8, layers: [
    { r: ['..#..', '.###.', '#####', '.###.', '..#..'] },
    { r: ['.##.', '####', '####', '.##.'], ox: 1, oy: 1 },
    { r: ['.#.', '###', '.#.'], ox: 2, oy: 2 },
    { r: ['#'], ox: 4, oy: 4 }] },
  { name: 'Köprü', types: 9, layers: [
    { r: ['#####', '#####', '#...#', '#####', '#####'] },
    { r: ['####', '####', '....', '####', '####'], ox: 1 },
    { r: ['###'], ox: 2, oy: 4 },
    { r: ['#', '#'], ox: 4, oy: 1 }] },
  { name: 'Kule', types: 11, layers: [
    { r: ['####', '####', '####', '####', '####'] },
    { r: ['####', '####', '####', '####', '####'], ox: 1, oy: 1 },
    { r: ['###', '###', '###', '###'], ox: 2, oy: 2 }] },
  { name: 'Kervansaray', types: 12, layers: [
    { r: ['#####', '#####', '#####', '#####', '#####'] },
    { r: ['####', '####', '####', '####'], ox: 1, oy: 1 },
    { r: ['###', '###', '###'], ox: 2, oy: 2 },
    { r: ['##', '##'], ox: 3, oy: 3 },
    { r: ['#'], ox: 4, oy: 4 }] },
  { name: 'Saray', types: 13, layers: [
    { r: ['#####', '#####', '#####', '#####', '#####', '#####'] },
    { r: ['####', '####', '####', '####', '####'], ox: 1, oy: 1 },
    { r: ['###', '###', '###'], ox: 2, oy: 3 }] }
];
var TRAY_SIZE = 4;

function buildPositions(layout) {
  var pos = [];
  layout.layers.forEach(function (L, z) {
    L.r.forEach(function (row, i) {
      for (var j = 0; j < row.length; j++) if (row[j] === '#') pos.push({ x: j * 2 + (L.ox || 0), y: i * 2 + (L.oy || 0), z: z });
    });
  });
  if (pos.length % 2) pos.pop();
  return pos;
}

// Taşın neden alınamadığı: 'ust' = üstünde (kısmen bile olsa) taş var,
// 'yan' = aynı katta hem sağında hem solunda taş var, null = serbest.
function blockReason(a, list) {
  var left = false, right = false;
  for (var i = 0; i < list.length; i++) {
    var b = list[i]; if (b === a) continue;
    var dx = b.x - a.x, dy = b.y - a.y;
    if (dy >= 2 || dy <= -2) continue;
    if (b.z > a.z) { if (dx < 2 && dx > -2) return 'ust'; }
    else if (b.z === a.z) { if (dx === -2) left = true; else if (dx === 2) right = true; }
  }
  return left && right ? 'yan' : null;
}
// Serbest taş: üstü açık VE sağ ya da sol yanından en az biri boş.
function isFree(a, list) { return blockReason(a, list) === null; }

function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function shuffle(arr, rng) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var x = arr[i]; arr[i] = arr[j]; arr[j] = x; } return arr; }
function pickWeighted(list, rng) {
  var tot = 0, i; for (i = 0; i < list.length; i++) tot += 1 + list[i].z * 2;
  var r = rng() * tot; for (i = 0; i < list.length; i++) { r -= 1 + list[i].z * 2; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}

// Çözülebilir dağıtım: tahtayı serbest çiftleri kaldırarak "oynar", her çifte aynı türü verir.
// Kutucuk mekaniğine göre: taşlar tek tek (her seferinde serbest olan biri) alınır,
// art arda alınan iki taşa aynı tür verilir. Bu sırayla oynayan kutucukta en fazla 1 taş tutar,
// yani her dağıtımın kesin bir çözümü vardır. Çıktı bu çözüm sırasındadır.
function deal(positions, pairTypes, rng) {
  var rem = positions.slice(), order = [];
  while (rem.length) {
    var free = rem.filter(function (p) { return isFree(p, rem); });
    var a = pickWeighted(free, rng);
    order.push(a); rem.splice(rem.indexOf(a), 1);
  }
  var types = shuffle(pairTypes.slice(), rng);
  return order.map(function (p, i) { return { x: p.x, y: p.y, z: p.z, t: types[i >> 1] }; });
}

// Seviyedeki tür havuzu: önce farklı motifler, sonra aynı motifin diğer renkleri.
function typePool(n, rng) {
  var g = [0, 1, 2].map(function (k) { var a = []; for (var m = 0; m < 12; m++) a.push(k * 12 + m); return shuffle(a, rng); });
  return g[0].concat(g[1], g[2]).slice(0, n);
}

function makeDeal(layoutIndex, types, seed) {
  var rng = mulberry32(seed), pos = buildPositions(LAYOUTS[layoutIndex]);
  var pairs = pos.length / 2, nt = Math.min(types, pairs, 36), pool = typePool(nt, rng), pt = [];
  for (var i = 0; i < pairs; i++) pt.push(pool[i % nt]);
  return deal(pos, pt, rng);
}

function levelConfig(n) {
  var i = (n - 1) % LAYOUTS.length, round = Math.floor((n - 1) / LAYOUTS.length);
  return { layout: i, types: Math.min(36, LAYOUTS[i].types + round * 2), seed: n * 7919 + 13, title: 'Seviye ' + n, sub: LAYOUTS[i].name };
}
function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function trDate(key) { var p = key.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }); }
function dailyConfig(key) {
  var seed = parseInt(key.replace(/-/g, ''), 10), i = 3 + seed % (LAYOUTS.length - 3);
  return { layout: i, types: LAYOUTS[i].types + 2, seed: seed, title: 'Günlük Bulmaca', sub: trDate(key) + ' · ' + LAYOUTS[i].name };
}

window.CB = { MOTIFS: MOTIFS, MOTIF_KEYS: MOTIF_KEYS, SUITS: SUITS, LAYOUTS: LAYOUTS, TRAY_SIZE: TRAY_SIZE, faceSVG: faceSVG, typeOf: typeOf,
  buildPositions: buildPositions, isFree: isFree, blockReason: blockReason, deal: deal, makeDeal: makeDeal, mulberry32: mulberry32, shuffle: shuffle,
  levelConfig: levelConfig, dailyConfig: dailyConfig, dayKey: dayKey, trDate: trDate };
})();
