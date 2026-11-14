/**
 * Small illustrations (64 x 64 viewBox) for the helpers and upgrades, drawn in the game's colours.
 * Used on the helper buttons, the "new helper" card and in the shop.
 */
export const DETECTOR_ART = `<svg viewBox="0 0 64 64" aria-hidden="true">
<ellipse cx="22" cy="53" rx="17" ry="7" fill="#3e6f8c" stroke="#2b4f66" stroke-width="2.5"/>
<ellipse cx="22" cy="51" rx="17" ry="7" fill="#8ec9e6" stroke="#3e6f8c" stroke-width="2.5"/>
<ellipse cx="22" cy="51" rx="9" ry="3.4" fill="#c9ecf8" stroke="#3e6f8c" stroke-width="2"/>
<path d="M24 47 49 16" stroke="#8a6a4a" stroke-width="5" stroke-linecap="round"/>
<path d="M24 47 49 16" stroke="#c9a37a" stroke-width="1.8" stroke-linecap="round"/>
<rect x="42" y="12" width="17" height="9" rx="4.5" transform="rotate(-52 50 16)" fill="#e8806a" stroke="#a54d3a" stroke-width="2.2"/>
<circle cx="52.500" cy="9" r="4.500" fill="#4a4f55" stroke="#2f3338" stroke-width="2"/>
<rect x="26" y="30" width="11" height="9" rx="2.500" transform="rotate(-8 31 34)" fill="#f3cf5a" stroke="#b8891b" stroke-width="2"/>
<circle cx="29.500" cy="34.500" r="2" fill="#6bd24a"/>
</svg>`;

export const FAN_ART = `<svg viewBox="0 0 64 64" aria-hidden="true">
<ellipse cx="32" cy="60.500" rx="17" ry="3" fill="#2a1a08" opacity=".18"/>
<rect x="29.500" y="44" width="5" height="12" rx="2" fill="#8a9ba6" stroke="#6b7d88" stroke-width="2"/>
<rect x="15" y="53" width="34" height="8" rx="4" fill="#b4c5ce" stroke="#6b7d88" stroke-width="2.5"/>
<path d="M20 56.500h24" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".6"/>
<circle cx="32" cy="25" r="22" fill="#eaf8fd" stroke="#6b7d88" stroke-width="3"/>
<g fill="#6bbbdc" stroke="#3d8cae" stroke-width="1.7" stroke-linejoin="round">
<path d="M32 25C25.500 21 25.500 12 31 7.500C37.500 11 37.500 20 32 25Z"/>
<path d="M32 25C25.500 21 25.500 12 31 7.500C37.500 11 37.500 20 32 25Z" transform="rotate(72 32 25)"/>
<path d="M32 25C25.500 21 25.500 12 31 7.500C37.500 11 37.500 20 32 25Z" transform="rotate(144 32 25)"/>
<path d="M32 25C25.500 21 25.500 12 31 7.500C37.500 11 37.500 20 32 25Z" transform="rotate(216 32 25)"/>
<path d="M32 25C25.500 21 25.500 12 31 7.500C37.500 11 37.500 20 32 25Z" transform="rotate(288 32 25)"/>
</g>
<g stroke="#6b7d88" stroke-width="1.1" opacity=".5" stroke-linecap="round">
<path d="M32 25h22" transform="rotate(0 32 25)"/>
<path d="M32 25h22" transform="rotate(45 32 25)"/>
<path d="M32 25h22" transform="rotate(90 32 25)"/>
<path d="M32 25h22" transform="rotate(135 32 25)"/>
<path d="M32 25h22" transform="rotate(180 32 25)"/>
<path d="M32 25h22" transform="rotate(225 32 25)"/>
<path d="M32 25h22" transform="rotate(270 32 25)"/>
<path d="M32 25h22" transform="rotate(315 32 25)"/>
</g>
<circle cx="32" cy="25" r="13.500" fill="none" stroke="#6b7d88" stroke-width="1.2" opacity=".45"/>
<circle cx="32" cy="25" r="6" fill="#f3cf5a" stroke="#b8891b" stroke-width="2"/>
<circle cx="30.500" cy="23.500" r="1.800" fill="#fff" opacity=".7"/>
<path d="M15 17a19 19 0 0 1 11-9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>
</svg>`;
/** One art tile per helper: index 0 detector, 1 fan. */
export const HELPER_ART = [DETECTOR_ART, FAN_ART] as const;
export const HELPER_NAME = ['Detector', 'Fan'] as const;

/** Three green battery cells, for the energy shown on the helpers and in the shop. */
export const CELLS_ART = `<svg viewBox="0 0 64 64" aria-hidden="true">
<g stroke="#2f7a2a" stroke-width="2.5" stroke-linejoin="round">
<rect x="6" y="22" width="15" height="30" rx="4" fill="#5fd04f"/><rect x="24.500" y="14" width="15" height="38" rx="4" fill="#6fdc5c"/><rect x="43" y="22" width="15" height="30" rx="4" fill="#5fd04f"/>
<rect x="11" y="17" width="5" height="5" rx="1.500" fill="#2f7a2a"/><rect x="29.500" y="9" width="5" height="5" rx="1.500" fill="#2f7a2a"/><rect x="48" y="17" width="5" height="5" rx="1.500" fill="#2f7a2a"/>
</g>
<path d="M10 27v18M28.500 19v26M47 27v18" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".45"/>
</svg>`;

/** The shop: a little market stall with a striped awning. */
export const SHOP_ART = `<svg viewBox="0 0 64 64" aria-hidden="true">
<ellipse cx="32" cy="60.500" rx="24" ry="3" fill="#2a1a08" opacity=".18"/>
<rect x="10" y="28" width="44" height="30" rx="3" fill="#f6dca4" stroke="#a56c30" stroke-width="2.5"/>
<rect x="15" y="34" width="21" height="13" rx="2" fill="#bfe9f7" stroke="#6b7d88" stroke-width="2"/>
<path d="M18 44l6-7M25 44l6-7" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>
<rect x="13" y="46" width="25" height="4" rx="1.500" fill="#b8793d" stroke="#754329" stroke-width="1.800"/>
<rect x="40" y="34" width="10" height="24" rx="2" fill="#b8793d" stroke="#754329" stroke-width="2.200"/>
<circle cx="46.500" cy="47" r="1.300" fill="#f3cf5a"/>
<g stroke="#a54d3a" stroke-width="2" stroke-linejoin="round">
<path d="M6 12h10.400v14a5.200 5.200 0 0 1-10.400 0Z" fill="#e8806a"/>
<path d="M16.4 12h10.400v14a5.200 5.200 0 0 1-10.400 0Z" fill="#fff3d6"/>
<path d="M26.8 12h10.400v14a5.200 5.200 0 0 1-10.400 0Z" fill="#e8806a"/>
<path d="M37.2 12h10.400v14a5.200 5.200 0 0 1-10.400 0Z" fill="#fff3d6"/>
<path d="M47.6 12h10.400v14a5.200 5.200 0 0 1-10.400 0Z" fill="#e8806a"/>
</g>
<rect x="4" y="9" width="56" height="6" rx="3" fill="#e8806a" stroke="#a54d3a" stroke-width="2.200"/>
<circle cx="25.500" cy="53" r="4" fill="#f3cf5a" stroke="#b8891b" stroke-width="1.800"/>
</svg>`;

/** One battery cell with a bolt, for the cell count at the top. */
export const CELL_ART = `<svg viewBox="0 0 64 64" aria-hidden="true">
<rect x="25" y="4" width="14" height="8" rx="2.500" fill="#2f7a2a"/>
<rect x="17" y="9" width="30" height="52" rx="8" fill="#6fdc5c" stroke="#2f7a2a" stroke-width="3"/>
<path d="M23 18v32" stroke="#fff" stroke-width="3.500" stroke-linecap="round" opacity=".45"/>
<path d="M36 17 25 37h8l-3 16 12-22h-8Z" fill="#fff" stroke="#2f7a2a" stroke-width="2" stroke-linejoin="round"/>
</svg>`;
/** A wrapped gift, for the daily gift card. */
export const GIFT_ART = `<svg viewBox="0 0 64 64" aria-hidden="true">
<ellipse cx="32" cy="60" rx="22" ry="3" fill="#2a1a08" opacity=".18"/>
<rect x="10" y="29" width="44" height="29" rx="4" fill="#e8806a" stroke="#a54d3a" stroke-width="2.500"/>
<rect x="7" y="21" width="50" height="12" rx="4" fill="#f19a86" stroke="#a54d3a" stroke-width="2.500"/>
<rect x="28" y="21" width="8" height="37" fill="#ffd24a" stroke="#b9780f" stroke-width="2"/>
<path d="M32 20C22 20 16 14 20 9c5-3 11 3 12 11Z" fill="#ffd24a" stroke="#b9780f" stroke-width="2" stroke-linejoin="round"/>
<path d="M32 20c10 0 16-6 12-11-5-3-11 3-12 11Z" fill="#ffd24a" stroke="#b9780f" stroke-width="2" stroke-linejoin="round"/>
<circle cx="32" cy="20" r="3.200" fill="#f3b53a" stroke="#b9780f" stroke-width="1.800"/>
<path d="M14 36v15" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".45"/>
</svg>`;