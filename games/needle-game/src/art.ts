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
export const VACUUM_ART = `<svg viewBox="0 0 64 64" aria-hidden="true">
<ellipse cx="30" cy="59" rx="22" ry="3" fill="#2a1a08" opacity=".18"/>
<path d="M44 24c0 14-6 22-18 26" fill="none" stroke="#5c6770" stroke-width="7" stroke-linecap="round"/>
<path d="M44 24c0 14-6 22-18 26" fill="none" stroke="#a9b6bf" stroke-width="3.200" stroke-linecap="round" stroke-dasharray="1.500 5"/>
<path d="M6 46h26l4 11H2Z" fill="#f3cf5a" stroke="#b8891b" stroke-width="2.500" stroke-linejoin="round"/>
<path d="M12 50l-3 6M19 50l-1 6M26 50l1 6" stroke="#b8891b" stroke-width="1.800" stroke-linecap="round"/>
<rect x="36" y="6" width="24" height="26" rx="8" fill="#6fcf9d" stroke="#2f8a5c" stroke-width="2.500"/>
<rect x="41" y="11" width="14" height="6" rx="3" fill="#c9f5df" stroke="#2f8a5c" stroke-width="1.800"/>
<circle cx="48" cy="24" r="3.200" fill="#2f8a5c"/>
<path d="M40 12v14" stroke="#ffffff" stroke-width="2.600" stroke-linecap="round" opacity=".55"/>
<circle cx="10" cy="38" r="1.800" fill="#d9b86a"/><circle cx="20" cy="34" r="1.400" fill="#d9b86a"/><circle cx="28" cy="39" r="1.800" fill="#d9b86a"/>
</svg>`;

/** One art tile per helper: index 0 detector, 1 fan, 2 vacuum. */
export const HELPER_ART = [DETECTOR_ART, FAN_ART, VACUUM_ART] as const;
export const HELPER_NAME = ['Detector', 'Fan', 'Vacuum'] as const;

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

/** Title-screen tiles and the daily hub. */
export const MAP_ART = `<svg viewBox="0 0 64 64" aria-hidden="true">
<ellipse cx="32" cy="60" rx="24" ry="3" fill="#2a1a08" opacity=".18"/>
<path d="M5 15 22 10 42 16 59 10V49L42 55 22 49 5 55Z" fill="#f6e4b4" stroke="#a56c30" stroke-width="2.800" stroke-linejoin="round"/>
<path d="M22 10v39M42 16v39" stroke="#d9bd84" stroke-width="2.200"/>
<path d="M11 44c6-12 12 0 18-10s8 4 14-6" fill="none" stroke="#d9453d" stroke-width="2.600" stroke-linecap="round" stroke-dasharray="1 5.500"/>
<path d="M46 20l8 8m0-8-8 8" stroke="#d9453d" stroke-width="3.400" stroke-linecap="round"/>
<circle cx="14" cy="26" r="5" fill="#8cc152" stroke="#4f7f2e" stroke-width="2"/><path d="M14 31v6" stroke="#8a5a34" stroke-width="2.500" stroke-linecap="round"/>
</svg>`;
export const BOOK_ART = `<svg viewBox="0 0 64 64" aria-hidden="true">
<ellipse cx="32" cy="60" rx="22" ry="3" fill="#2a1a08" opacity=".18"/>
<rect x="14" y="7" width="38" height="49" rx="5" fill="#fbf1d6" stroke="#8a6a3a" stroke-width="2.500"/>
<rect x="10" y="6" width="38" height="49" rx="5" fill="#5fa8d8" stroke="#2f6f9c" stroke-width="2.800"/>
<path d="M17 6v49" stroke="#2f6f9c" stroke-width="2.600"/>
<path d="M31 20l3.200 6.600 7.200 1-5.200 5 1.300 7.200L31 36.400l-6.500 3.400 1.300-7.200-5.200-5 7.200-1Z" fill="#ffd24a" stroke="#b9780f" stroke-width="2" stroke-linejoin="round"/>
<path d="M40 55v7l4-3 4 3v-7" fill="#d9453d" stroke="#a52a24" stroke-width="2" stroke-linejoin="round"/>
</svg>`;
export const CAL_ART = `<svg viewBox="0 0 64 64" aria-hidden="true">
<ellipse cx="32" cy="60" rx="22" ry="3" fill="#2a1a08" opacity=".18"/>
<rect x="8" y="11" width="48" height="45" rx="7" fill="#fff8e6" stroke="#a56c30" stroke-width="2.800"/>
<path d="M8 25V18a7 7 0 0 1 7-7h34a7 7 0 0 1 7 7v7Z" fill="#e8806a" stroke="#a54d3a" stroke-width="2.800" stroke-linejoin="round"/>
<path d="M20 6v10M44 6v10" stroke="#8a5a34" stroke-width="4" stroke-linecap="round"/>
<circle cx="32" cy="40" r="8" fill="#ffd24a" stroke="#b9780f" stroke-width="2.400"/>
<path d="M32 27v3M32 50v3M19 40h3M42 40h3M23 31l2 2M39 47l2 2M41 31l-2 2M25 47l-2 2" stroke="#e0a526" stroke-width="2.400" stroke-linecap="round"/>
</svg>`;
export const HAY_ART = `<svg viewBox="0 0 64 64" aria-hidden="true">
<ellipse cx="32" cy="57" rx="26" ry="4" fill="#2a1a08" opacity=".2"/>
<path d="M6 54C8 28 20 10 32 10s24 18 26 44Z" fill="#e8bd5c" stroke="#a5742a" stroke-width="2.800" stroke-linejoin="round"/>
<path d="M14 54C16 36 24 22 32 20M50 54C48 36 40 22 32 20M32 20v34M22 54c0-14 4-24 10-30M42 54c0-14-4-24-10-30" fill="none" stroke="#c4912f" stroke-width="2" stroke-linecap="round"/>
<path d="M26 12l-3-6M32 9V3M38 12l3-6" stroke="#c4912f" stroke-width="2.400" stroke-linecap="round"/>
</svg>`;
export const SCROLL_ART = `<svg viewBox="0 0 64 64" aria-hidden="true">
<ellipse cx="32" cy="60" rx="22" ry="3" fill="#2a1a08" opacity=".18"/>
<path d="M14 10h36a4 4 0 0 1 4 4v34a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8V14a4 4 0 0 1 4-4Z" fill="#fbecc0" stroke="#a56c30" stroke-width="2.800" stroke-linejoin="round"/>
<path d="M18 10a4 4 0 0 0-8 0v4h8" fill="#e6c27e" stroke="#a56c30" stroke-width="2.400" stroke-linejoin="round"/>
<path d="M22 22h24M22 32h24M22 42h16" stroke="#c9a66a" stroke-width="3" stroke-linecap="round"/>
<path d="M44 40l4 4 8-9" fill="none" stroke="#4fa842" stroke-width="4.400" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;