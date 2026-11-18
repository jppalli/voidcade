import bounds from "./paintedBounds.json";

export const paintedRows = [
  ["apple", "pear", "cherries", "banana", "lemon", "grapes"],
  ["sun", "cloud", "rain", "snowflake", "lightning", "rainbow"],
  ["fish", "whale", "crab", "starfish", "shell", "octopus"],
  ["car", "bicycle", "sailboat", "airplane", "train", "balloon"],
  ["tulip", "wateringcan", "leaf", "mushroom", "carrot", "snail"],
  ["teapot"],
] as const;

// Center the visible paint, not the uneven atlas cell. Inline dimensions keep
// the global svg sizing rule from stretching the nested crop viewport.
export const paintedIllustrations: Record<string, string> = Object.fromEntries(
  paintedRows.flat().map((name) => {
    const [x, y, width, height] = bounds[name];
    const scale = 88 / Math.max(width, height);
    const w = width * scale;
    const h = height * scale;
    return [
      name,
      `<svg class="painted-art" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><svg x="${(100 - w) / 2}" y="${(100 - h) / 2}" width="${w}" height="${h}" style="width:${w}%;height:${h}%;overflow:hidden" viewBox="${x} ${y} ${width} ${height}"><image href="${import.meta.env.BASE_URL}art/painted-card-atlas.png" width="1254" height="1254" /></svg></svg>`,
    ];
  }),
);
