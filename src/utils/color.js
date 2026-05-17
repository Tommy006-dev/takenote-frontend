const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const hexToRgb = (value) => {
  if (!value || typeof value !== 'string') return null;
  const full = value.trim();
  const shortHex = /^#([0-9a-f]{3})$/i.exec(full);
  if (shortHex) {
    const [r, g, b] = shortHex[1].split('').map(ch => parseInt(ch + ch, 16));
    return { r, g, b };
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(full);
  if (!hex) return null;
  const int = parseInt(hex[1], 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const hslToRgb = (h, s, l) => {
  h = ((Number(h) % 360) + 360) % 360;
  s = clamp(Number(s), 0, 100) / 100;
  l = clamp(Number(l), 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;

  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
};

const parseCssColor = (value) => {
  if (!value || typeof value !== 'string' || value.startsWith('var(')) return null;
  const trimmed = value.trim();
  const hex = hexToRgb(trimmed);
  if (hex) return hex;

  const hslMatch = /^hsla?\(\s*([\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/i.exec(trimmed);
  if (hslMatch) return hslToRgb(hslMatch[1], hslMatch[2], hslMatch[3]);

  const rgbMatch = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(trimmed);
  if (rgbMatch) {
    return {
      r: clamp(Number(rgbMatch[1]), 0, 255),
      g: clamp(Number(rgbMatch[2]), 0, 255),
      b: clamp(Number(rgbMatch[3]), 0, 255),
    };
  }
  return null;
};

const relativeLuminance = ({ r, g, b }) => {
  const channel = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

export const getReadableNoteVars = (backgroundColor) => {
  const rgb = parseCssColor(backgroundColor);
  if (!rgb) return {};

  const isLight = relativeLuminance(rgb) > 0.55;
  const text = isLight ? '#0f172a' : '#ffffff';
  const muted = isLight ? '#334155' : '#f1f5ff';
  const controlBg = isLight ? 'rgba(255, 255, 255, 0.74)' : 'rgba(15, 23, 42, 0.42)';
  const controlHoverBg = isLight ? 'rgba(15, 23, 42, 0.10)' : 'rgba(255, 255, 255, 0.20)';

  return {
    '--note-text': text,
    '--note-muted': muted,
    '--note-icon': text,
    '--note-control-text': text,
    '--note-control-bg': controlBg,
    '--note-control-hover-bg': controlHoverBg,
    '--note-soft': isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.24)',
    '--note-strong-border': isLight ? 'rgba(15, 23, 42, 0.20)' : 'rgba(255, 255, 255, 0.34)',
    '--note-chip-bg': isLight ? 'rgba(255, 255, 255, 0.68)' : 'rgba(15, 23, 42, 0.36)',
    '--note-chip-text': text,
  };
};
