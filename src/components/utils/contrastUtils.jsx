// Berechnet die Helligkeit einer Farbe (0-1)
export function getLuminance(hexColor) {
    // Hex zu RGB konvertieren
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    // Relative Luminanz berechnen (WCAG-Standard)
    const [rs, gs, bs] = [r, g, b].map(c => {
        if (c <= 0.03928) return c / 12.92;
        return Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Gibt beste Textfarbe basierend auf Hintergrund zurück (hell oder dunkel)
export function getContrastColor(bgColor) {
    const luminance = getLuminance(bgColor);
    // Wenn Hintergrund dunkel (< 0.5), verwende helle Textfarbe, sonst dunkle
    return luminance < 0.5 ? '#ffffff' : '#000000';
}

// Gibt RGB für CSS zurück
export function getContrastColorRGB(bgColor) {
    const color = getContrastColor(bgColor);
    return color === '#ffffff' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
}

// Konvertiert HSL zu Hex (für CSS-Variablen)
export function hslToHex(h, s, l) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}