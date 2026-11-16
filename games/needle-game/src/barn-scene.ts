/**
 * The picture of the barn. Improvements you have not built yet show as grey ghosts, so you can
 * see what is still to come. Built ones are in colour and move. Bales you own stack up in front.
 */
const MAX_BALES = 12;
/** Where each visible bale sits: a pyramid of 5, 4 and 3. */
const BALE_SPOTS: [number, number][] = [
  ...Array.from({ length: 5 }, (_, i) => [204 + i * 22, 212] as [number, number]),
  ...Array.from({ length: 4 }, (_, i) => [215 + i * 22, 200] as [number, number]),
  ...Array.from({ length: 3 }, (_, i) => [226 + i * 22, 188] as [number, number]),
];

export function barnScene(built: string[], bales: number, justBuilt = '', newBales = 0): string {
  const imp = (id: string, body: string) => {
    const on = built.includes(id);
    return `<g class="imp${on ? ' on' : ' ghost'}${on && justBuilt === id ? ' new' : ''}" data-imp="${id}">${body}</g>`;
  };
  const shown = Math.min(bales, MAX_BALES);
  const baleSvg = BALE_SPOTS.slice(0, shown)
    .map(([x, y], i) => `<g class="bale${i >= shown - newBales ? ' new' : ''}"><rect x="${x}" y="${y}" width="20" height="12" rx="2.500" fill="#ebc562" stroke="#a8741a" stroke-width="1.600"/><path d="M${x + 6} ${y}v12M${x + 14} ${y}v12" stroke="#a8741a" stroke-width="1.200"/><path d="M${x + 2} ${y + 4}h16M${x + 2} ${y + 8}h16" stroke="#f7e3a0" stroke-width="1"/></g>`)
    .join('');
  const more = bales > MAX_BALES ? `<text x="262" y="182" text-anchor="middle" font-size="13" font-weight="900" fill="#8f5a28">+${bales - MAX_BALES}</text>` : '';
  const flowerBox = (x: number) =>
    `<rect x="${x}" y="153" width="28" height="8" rx="2" fill="#b0743a" stroke="#7a4a20" stroke-width="1.500"/>` +
    [4, 10, 16, 22].map((d, k) => `<circle cx="${x + d}" cy="${k % 2 ? 149 : 151}" r="3.500" fill="${k % 2 ? '#ff8aa5' : '#e5506a'}"/>`).join('') +
    `<path d="M${x + 3} 153q2-3 4 0M${x + 13} 153q2-3 4 0" stroke="#4f9a3c" stroke-width="2" fill="none"/>`;
  return `<svg viewBox="0 0 320 230" role="img" aria-label="Your barn, with its improvements and bales">
<defs><linearGradient id="bs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9dcef"/><stop offset="1" stop-color="#f6efd0"/></linearGradient></defs>
<rect width="320" height="230" fill="url(#bs-sky)"/>
<circle cx="40" cy="38" r="17" fill="#ffe9a0" opacity=".9"/>
<g class="bs-cloud"><ellipse cx="238" cy="36" rx="26" ry="9" fill="#fff" opacity=".9"/><ellipse cx="252" cy="29" rx="16" ry="9" fill="#fff" opacity=".9"/></g>
<g class="bs-cloud slow"><ellipse cx="120" cy="22" rx="20" ry="7" fill="#fff" opacity=".8"/><ellipse cx="132" cy="17" rx="12" ry="7" fill="#fff" opacity=".8"/></g>
<path d="M0 150Q80 122 160 146T320 138V230H0Z" fill="#b6dc8f"/>
<path d="M0 188Q160 166 320 188V230H0Z" fill="#8fc46a"/>
${imp('mill', `<path d="M268 152 272 106h12l4 46Z" fill="#f4ead0" stroke="#b8793d" stroke-width="2.500" stroke-linejoin="round"/><rect x="274" y="130" width="8" height="12" rx="2" fill="#b0743a"/><g class="mill-blades"><g stroke="#8f5a28" stroke-width="3" stroke-linecap="round"><path d="M278 106V80M278 106V132M278 106H252M278 106H304"/></g><g fill="#fffaf0" stroke="#b8793d" stroke-width="1.500"><rect x="280" y="82" width="9" height="20" rx="1.500"/><rect x="267" y="110" width="9" height="20" rx="1.500"/><rect x="282" y="107" width="20" height="9" rx="1.500"/><rect x="254" y="96" width="20" height="9" rx="1.500"/></g></g><circle cx="278" cy="106" r="4" fill="#b8793d"/>`)}
<ellipse cx="160" cy="205" rx="100" ry="8" fill="#2a1a08" opacity=".14"/>
<path d="M80 202V108L108 68 160 52 212 68 240 108V202Z" fill="#d9604f" stroke="#8f3328" stroke-width="3" stroke-linejoin="round"/>
<path d="M92 190V112M104 190V112M216 190V112M228 190V112" stroke="#c9524a" stroke-width="2"/>
<path d="M70 114 104 64 160 46 216 64 250 114" fill="none" stroke="#8f3328" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M70 114 104 64 160 46 216 64 250 114" fill="none" stroke="#b5584a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="144" y="70" width="32" height="28" rx="3" fill="#fff4dc" stroke="#8f3328" stroke-width="2.500"/>
<path d="M148 80h24M148 86h24M148 92h24" stroke="#e3b44d" stroke-width="3" stroke-linecap="round"/>
<rect x="130" y="140" width="60" height="62" rx="3" fill="#fff4dc" stroke="#8f3328" stroke-width="3.500"/>
<path d="M130 140 190 202M190 140 130 202M160 140v62" stroke="#c9524a" stroke-width="3"/>
<rect x="96" y="128" width="26" height="24" rx="3" fill="#fdf3c2" stroke="#8f3328" stroke-width="2.500"/><path d="M109 128v24M96 140h26" stroke="#8f3328" stroke-width="2"/>
<rect x="198" y="128" width="26" height="24" rx="3" fill="#fdf3c2" stroke="#8f3328" stroke-width="2.500"/><path d="M211 128v24M198 140h26" stroke="#8f3328" stroke-width="2"/>
${imp('flowers', flowerBox(95) + flowerBox(197))}
${imp('sign', `<path d="M146 118v-5M174 118v-5" stroke="#8f5a28" stroke-width="2"/><rect x="136" y="117" width="48" height="19" rx="4" fill="#f6dca0" stroke="#8f5a28" stroke-width="2.500"/><text x="160" y="131" text-anchor="middle" font-size="12" font-weight="900" fill="#8f3328" letter-spacing="1">HAY</text>`)}
${imp('vane', `<path d="M160 47V22" stroke="#6e4a24" stroke-width="3" stroke-linecap="round"/><g class="vane-turn"><ellipse cx="160" cy="19" rx="9" ry="5.500" fill="#e8a13a" stroke="#a8741a" stroke-width="1.500"/><circle cx="169" cy="13" r="4" fill="#e8a13a" stroke="#a8741a" stroke-width="1.500"/><path d="M172 12l4 2-4 2Z" fill="#f0643a"/><circle cx="168" cy="8.500" r="2" fill="#e5506a"/><path d="M152 17l-8-8 2 10 6 1Z" fill="#d98a2a" stroke="#a8741a" stroke-width="1.200"/></g><path d="M150 26H170" stroke="#6e4a24" stroke-width="2.500" stroke-linecap="round"/>`)}
${imp('bell', `<path d="M52 205V150H70" stroke="#8f5a28" stroke-width="4.500" stroke-linecap="round" stroke-linejoin="round" fill="none"/><g class="bell-swing"><path d="M60 170Q60 155 68 155T76 170Z" fill="#f0b83a" stroke="#a8741a" stroke-width="2"/><circle cx="68" cy="173" r="3" fill="#a8741a"/><path d="M68 150v5" stroke="#a8741a" stroke-width="2"/></g>`)}
${imp('lantern', `<circle class="glow" cx="212" cy="176" r="24" fill="#ffd24a" opacity=".38"/><path d="M212 160v6" stroke="#6e4a24" stroke-width="2"/><rect x="205" y="166" width="14" height="19" rx="3.500" fill="#ffe9a0" stroke="#a8741a" stroke-width="2.200"/><path d="M204 166h16M207 185h10" stroke="#a8741a" stroke-width="3" stroke-linecap="round"/><path d="M212 170v11" stroke="#f0a83a" stroke-width="2.500" stroke-linecap="round"/>`)}
${baleSvg}${more}
</svg>`;
}
