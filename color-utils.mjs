export const MAX_COLOR_DISTANCE = Math.sqrt(3 * 255 ** 2);

export function colorValue(red, green, blue) {
  const r = clampChannel(red);
  const g = clampChannel(green);
  const b = clampChannel(blue);
  const { hue, saturation, brightness } = rgbToHsb(r, g, b);

  return {
    red: r,
    green: g,
    blue: b,
    hue,
    saturation,
    brightness,
    hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
  };
}

export function parseHex(input) {
  const normalized = normalizeHex(input);
  if (!normalized) return null;

  return colorValue(
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  );
}

export function normalizeHex(input) {
  const candidate = String(input).trim().replace(/^#/, "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(candidate) ? `#${candidate}` : null;
}

export function compareColors(base, sample) {
  const redDelta = sample.red - base.red;
  const greenDelta = sample.green - base.green;
  const blueDelta = sample.blue - base.blue;
  const distance = Math.sqrt(redDelta ** 2 + greenDelta ** 2 + blueDelta ** 2);

  return {
    base,
    sample,
    redDelta,
    greenDelta,
    blueDelta,
    distance,
    similarity: Math.max(0, 100 * (1 - distance / MAX_COLOR_DISTANCE)),
    match: distance < 18 ? "とても近い" : distance < 55 ? "近い" : "異なる",
  };
}

export function rgbText(color) {
  return `${color.red}, ${color.green}, ${color.blue}`;
}

export function hsbText(color) {
  return `${Math.round(color.hue)}°, ${Math.round(color.saturation)}%, ${Math.round(color.brightness)}%`;
}

export function signedText(value) {
  return value > 0 ? `+${value}` : String(value);
}

function clampChannel(value) {
  return Math.min(255, Math.max(0, Math.round(Number(value) || 0)));
}

function toHex(value) {
  return value.toString(16).padStart(2, "0").toUpperCase();
}

function rgbToHsb(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }

  return {
    hue: hue < 0 ? hue + 360 : hue,
    saturation: max === 0 ? 0 : (delta / max) * 100,
    brightness: max * 100,
  };
}
