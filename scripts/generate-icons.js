// Draws the Salli app icon, Android adaptive icons, splash logo and favicon.
// Run from the project root: node scripts/generate-icons.js
// Swap the Amiri text for the commissioned Maghribi calligraphy when it arrives.
const { chromium } = require('playwright');
const fs = require('fs');
const amiri = fs.readFileSync(process.cwd() + '/node_modules/@expo-google-fonts/amiri/700Bold/Amiri_700Bold.ttf').toString('base64');
function star(cx, cy, r, inner = Math.cos(Math.PI/4)/Math.cos(Math.PI/8)) {
  const pts = [];
  for (let i = 0; i < 16; i++) { const rad = i % 2 ? r * inner : r; const a = -Math.PI/2 + i * Math.PI/8; pts.push((cx + rad*Math.cos(a)).toFixed(1)+','+(cy + rad*Math.sin(a)).toFixed(1)); }
  return 'M' + pts.join('L') + 'Z';
}
function arch(cx, top, w, h) {
  const r = w/2, cy = top + r, t = 26*Math.PI/180, lx = cx - r*Math.cos(t), rx = cx + r*Math.cos(t), sy = cy + r*Math.sin(t), base = top + h;
  return `M${lx},${base} L${lx},${sy} A${r},${r} 0 1 1 ${rx},${sy} L${rx},${base} Z`;
}
function tiles(size, color, op) {
  let s = ''; const cell = size/6;
  for (let y = 0; y <= 6; y++) for (let x = 0; x <= 6; x++) s += `<path d="${star(x*cell, y*cell, cell*0.42)}" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="${size/300}"/>`;
  return s;
}
const G = '#1E5C46', DG = '#174836', S = '#C98E2B', LG = '#E9B860', C = '#FBF6EC';
function logo(cx, cy, R, mono = false) {
  const aw = R*0.86, ah = R*1.05, top = cy - ah/2 + R*0.04;
  const fill = mono ? '#fff' : G;
  if (mono) return `<path d="${star(cx, cy, R)} ${arch(cx, top, aw, ah)}" fill="#fff" fill-rule="evenodd"/>`;
  return `
    <path d="${star(cx, cy, R)}" fill="${fill}" stroke="${mono ? '#fff' : S}" stroke-width="${R*0.045}" stroke-linejoin="miter"/>
    ${mono ? '' : `<path d="${star(cx, cy, R*0.86)}" fill="none" stroke="${LG}" stroke-opacity="0.45" stroke-width="${R*0.012}"/>`}
    <path d="${arch(cx, top, aw, ah)}" fill="${mono ? '#000' : C}"/>
    ${mono ? '' : `<text x="${cx}" y="${top + ah*0.74}" text-anchor="middle" font-family="AmiriB" font-size="${R*0.42}" fill="${G}">صلِّ</text>`}`;
}
const files = {
  'icon.png': [1024, `<rect width="1024" height="1024" fill="${G}"/>${tiles(1024, LG, 0.10)}${logo(512, 512, 380)}`],
  'android-icon-background.png': [1024, `<rect width="1024" height="1024" fill="${G}"/>${tiles(1024, LG, 0.10)}`],
  'android-icon-foreground.png': [1024, logo(512, 512, 300)],
  'android-icon-monochrome.png': [1024, logo(512, 512, 300, true)],
  'splash-icon.png': [1024, logo(512, 512, 440)],
  'favicon.png': [64, `<rect width="64" height="64" rx="14" fill="${G}"/>${logo(32, 32, 23)}`],
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [name, [size, body]] of Object.entries(files)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><head><style>@font-face{font-family:AmiriB;src:url(data:font/ttf;base64,${amiri})} html,body{margin:0;background:transparent}</style></head><body>${svg}</body></html>`);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
    await p.locator('svg').screenshot({ path: process.cwd() + '/assets/images/' + name, omitBackground: true });
    console.log('wrote', name);
  }
  await b.close();
})();
