const fs = require('fs');
const path = require('path');

// Generate an intricate, realistic botanical leaf skeleton (reticulated venation)
function createLeafSkeleton(options = {}) {
  const {
    width = 300,
    height = 300,
    strokeMidrib = 'rgba(0, 0, 66, 0.45)',
    strokeSecondary = 'rgba(0, 0, 66, 0.28)',
    strokeTertiary = 'rgba(0, 0, 66, 0.16)',
    strokeMicro = 'rgba(0, 0, 66, 0.08)'
  } = options;

  // Primary midrib path (curving gently diagonally across the frame)
  // from (40, 260) to (260, 40)
  const midrib = 'M 45 265 Q 130 170 255 45';

  const secondaryPaths = [];
  const tertiaryPaths = [];
  const microPaths = [];

  // Generate 12 pairs of lateral secondary veins branching off the midrib
  const numVeins = 11;
  for (let i = 1; i <= numVeins; i++) {
    const t = i / (numVeins + 1); // 0 to 1
    // Midrib quadratic bezier: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
    const p0x = 45, p0y = 265;
    const p1x = 130, p1y = 170;
    const p2x = 255, p2y = 45;
    const mx = (1-t)*(1-t)*p0x + 2*(1-t)*t*p1x + t*t*p2x;
    const my = (1-t)*(1-t)*p0y + 2*(1-t)*t*p1y + t*t*p2y;

    // Normal to curve
    const dxdt = 2*(1-t)*(p1x - p0x) + 2*t*(p2x - p1x);
    const dydt = 2*(1-t)*(p1y - p0y) + 2*t*(p2y - p1y);
    const len = Math.hypot(dxdt, dydt) || 1;
    const nx = -dydt / len;
    const ny = dxdt / len;

    // Length of secondary vein follows natural leaf silhouette (bulges at 40-60% of length)
    const span = Math.sin(t * Math.PI) * 78;

    // Right/Upper branch: arches forward
    const rx = mx + nx * span + dxdt/len * (span * 0.45);
    const ry = my + ny * span + dydt/len * (span * 0.45);
    const rcx = mx + nx * (span * 0.55) + dxdt/len * (span * 0.15);
    const rcy = my + ny * (span * 0.55) + dydt/len * (span * 0.15);
    secondaryPaths.push(`M ${mx.toFixed(1)} ${my.toFixed(1)} Q ${rcx.toFixed(1)} ${rcy.toFixed(1)} ${rx.toFixed(1)} ${ry.toFixed(1)}`);

    // Left/Lower branch: arches forward
    const lx = mx - nx * span + dxdt/len * (span * 0.45);
    const ly = my - ny * span + dydt/len * (span * 0.45);
    const lcx = mx - nx * (span * 0.55) + dxdt/len * (span * 0.15);
    const lcy = my - ny * (span * 0.55) + dydt/len * (span * 0.15);
    secondaryPaths.push(`M ${mx.toFixed(1)} ${my.toFixed(1)} Q ${lcx.toFixed(1)} ${lcy.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)}`);

    // Tertiary ladder veinlets along the secondary branches
    for (let j = 1; j <= 3; j++) {
      const u = j / 4;
      // On right branch
      const curRx = (1-u)*(1-u)*mx + 2*(1-u)*u*rcx + u*u*rx;
      const curRy = (1-u)*(1-u)*my + 2*(1-u)*u*rcy + u*u*ry;
      const tEndRx = curRx + nx * 12 + dxdt/len * 10;
      const tEndRy = curRy + ny * 12 + dydt/len * 10;
      tertiaryPaths.push(`M ${curRx.toFixed(1)} ${curRy.toFixed(1)} L ${tEndRx.toFixed(1)} ${tEndRy.toFixed(1)}`);

      // Micro anastomosis areole loop
      microPaths.push(`M ${(curRx + 4).toFixed(1)} ${(curRy + 3).toFixed(1)} q 4 -5 8 -2`);

      // On left branch
      const curLx = (1-u)*(1-u)*mx + 2*(1-u)*u*lcx + u*u*lx;
      const curLy = (1-u)*(1-u)*my + 2*(1-u)*u*lcy + u*u*ly;
      const tEndLx = curLx - nx * 12 + dxdt/len * 10;
      const tEndLy = curLy - ny * 12 + dydt/len * 10;
      tertiaryPaths.push(`M ${curLx.toFixed(1)} ${curLy.toFixed(1)} L ${tEndLx.toFixed(1)} ${tEndLy.toFixed(1)}`);

      // Micro anastomosis areole loop
      microPaths.push(`M ${(curLx - 4).toFixed(1)} ${(curLy - 3).toFixed(1)} q -4 5 -8 2`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none">
  <!-- Micro anastomosis capillaries -->
  <path d="${microPaths.join(' ')}" stroke="${strokeMicro}" stroke-width="0.7" stroke-linecap="round" fill="none"/>
  <!-- Tertiary veinlets -->
  <path d="${tertiaryPaths.join(' ')}" stroke="${strokeTertiary}" stroke-width="0.9" stroke-linecap="round" fill="none"/>
  <!-- Secondary lateral veins -->
  <path d="${secondaryPaths.join(' ')}" stroke="${strokeSecondary}" stroke-width="1.3" stroke-linecap="round" fill="none"/>
  <!-- Primary midrib rachis -->
  <path d="${midrib}" stroke="${strokeMidrib}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
</svg>`;
}

// Generate repeating seamless leaf-vein watermark wallpaper
function createLeafVeinPatternSVG() {
  const leaf1 = createLeafSkeleton({
    width: 240,
    height: 240,
    strokeMidrib: 'rgba(0, 0, 66, 0.18)',
    strokeSecondary: 'rgba(0, 0, 66, 0.11)',
    strokeTertiary: 'rgba(0, 0, 66, 0.06)',
    strokeMicro: 'rgba(0, 0, 66, 0.035)'
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="none">
  <g transform="translate(40, 20) rotate(15 120 120) scale(0.9)">
    ${leaf1.replace(/<\/?svg[^>]*>/g, '')}
  </g>
  <g transform="translate(180, 160) rotate(-45 60 60) scale(0.65)" opacity="0.6">
    ${leaf1.replace(/<\/?svg[^>]*>/g, '')}
  </g>
</svg>`;
}

fs.writeFileSync(path.join(__dirname, 'images', 'leaf-vein-card.svg'), createLeafSkeleton());
fs.writeFileSync(path.join(__dirname, 'images', 'leaf-vein-pattern.svg'), createLeafVeinPatternSVG());
console.log('Botanical leaf vein SVGs generated successfully in images/');

