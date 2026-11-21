import assert from 'node:assert/strict';

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ];
}

function linearize(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

const pairs = [
  ['#ECEBE7', '#090C11', 4.5, 'Primary Text on Primary Bg'],
  ['#ECEBE7', '#121922', 4.5, 'Primary Text on Secondary Bg'],
  ['#8996A3', '#090C11', 4.5, 'Secondary Text on Primary Bg'],
  ['#8996A3', '#121922', 4.5, 'Secondary Text on Secondary Bg'],
  ['#48D7BA', '#090C11', 4.5, 'Cyan Accent on Primary Bg'],
  ['#48D7BA', '#121922', 4.5, 'Cyan Accent on Secondary Bg'],
  ['#E3B86B', '#090C11', 4.5, 'Evidence Gold on Primary Bg'],
  ['#E3B86B', '#121922', 4.5, 'Evidence Gold on Secondary Bg'],
  ['#FF594F', '#090C11', 4.5, 'Critical Red on Primary Bg'],
  ['#FF594F', '#121922', 4.5, 'Critical Red on Secondary Bg'],
];

const results = pairs.map(([fg, bg, min, label]) => {
  const ratio = Number(contrastRatio(fg, bg).toFixed(2));
  assert.ok(ratio >= min, `${label}: contrast ${ratio} < ${min}`);
  return { label, fg, bg, ratio, passAA: ratio >= 4.5, passAAA: ratio >= 7.0 };
});

console.log(JSON.stringify({ status: 'PASS', results }, null, 2));
