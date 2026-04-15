/**
 * Mobile Responsive Utilities & Checkliste
 * Best Practices für mobile-first Design
 */

/**
 * Mobile Breakpoints (Tailwind)
 * - sm: 640px (Tablets)
 * - md: 768px (iPad, Desktop)
 * - lg: 1024px (Desktop)
 * - xl: 1280px (Wide Desktop)
 */
export const BREAKPOINTS = {
  mobile: 'max-w-screen-sm', // < 640px
  tablet: 'md:flex', // ≥ 768px
  desktop: 'lg:flex', // ≥ 1024px
};

/**
 * Mobile-first Layout Patterns
 */
export const MOBILE_PATTERNS = {
  // Stack vertikal auf Mobile, horizontal ab md
  stackOnMobile: 'flex flex-col md:flex-row',
  
  // Grid: 1 Spalte auf Mobile, 2+ ab md
  gridAutoMobile: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  
  // Padding: Kleiner auf Mobile, größer ab md
  paddingMobile: 'p-3 md:p-6',
  
  // Text: Kleiner auf Mobile, größer ab md
  textMobile: 'text-sm md:text-base',
  
  // Button: Volle Breite auf Mobile, Auto ab md
  buttonMobile: 'w-full md:w-auto',
  
  // Modal: Fullscreen auf Mobile, centered ab md
  modalMobile: 'fixed inset-0 md:absolute md:inset-auto md:top-1/2 md:left-1/2 md:transform md:-translate-x-1/2 md:-translate-y-1/2',
};

/**
 * Responsive Mobile Checkliste
 */
export const MOBILE_CHECKLIST = [
  {
    category: 'Layout',
    items: [
      '✓ Stack vertikal auf Mobile (flex-col)',
      '✓ Max-width auf Desktop begrenzen',
      '✓ Padding responsive: p-3 md:p-6',
      '✓ Grid: grid-cols-1 md:grid-cols-2',
      '✓ Keine horizontalen Scrolls',
    ],
  },
  {
    category: 'Navigation',
    items: [
      '✓ Mobile Bottom-Navigation (pb-[calc(5rem+env(safe-area-inset-bottom))])',
      '✓ Hamburger-Menü auf Mobile verbergen',
      '✓ Desktop-Sidebar mit md:hidden ausblenden',
      '✓ Touch-Targets min. 44×44px (iOS/Android)',
    ],
  },
  {
    category: 'Inputs & Buttons',
    items: [
      '✓ Buttons: min-h-[44px] min-w-[44px]',
      '✓ Inputs: h-11 (≥ 44px)',
      '✓ Full-width auf Mobile: w-full md:w-auto',
      '✓ Spacing zwischen Buttons: gap-2',
    ],
  },
  {
    category: 'Text & Lesbarkeit',
    items: [
      '✓ Text-Größe responsive: text-sm md:text-base',
      '✓ Line-height ausreichend (leading-relaxed)',
      '✓ Max-width für lange Texte: max-w-2xl',
      '✓ Keine zu kleine Fonts (< 16px)',
    ],
  },
  {
    category: 'Modals & Overlays',
    items: [
      '✓ Fullscreen auf Mobile (<768px)',
      '✓ pb-safe: padding-bottom: env(safe-area-inset-bottom)',
      '✓ Drawer statt Dialog auf Mobile',
      '✓ Keine modalen Dialoge mit minimaler Höhe',
    ],
  },
  {
    category: 'Images & Media',
    items: [
      '✓ Images responsive: w-full h-auto',
      '✓ Aspect-ratio beibehalten',
      '✓ Lazy loading für Bilder',
      '✓ Max-width auf Bilder: max-w-full',
    ],
  },
  {
    category: 'Performance',
    items: [
      '✓ CSS Media Queries statt JS für Layout',
      '✓ Touch-Optimierungen (keine Hover-States)',
      '✓ Viewport meta: width=device-width, initial-scale=1',
      '✓ Safe Area Insets nutzen',
    ],
  },
];

/**
 * Safe Area Insets für Notches & Bezels
 * Automatisch durch Tailwind verfügbar
 */
export const SAFE_AREA_UTILITIES = {
  ptSafe: 'pt-safe', // padding-top: env(safe-area-inset-top)
  pbSafe: 'pb-safe', // padding-bottom: env(safe-area-inset-bottom)
  plSafe: 'pl-safe', // padding-left: env(safe-area-inset-left)
  prSafe: 'pr-safe', // padding-right: env(safe-area-inset-right)
};

/**
 * Mobile-First CSS Klassen Generator
 * @param {object} config - { mobile, tablet, desktop }
 * @returns {string} - Tailwind classes
 */
export function responsiveClass(config) {
  const { mobile = '', tablet = '', desktop = '' } = config;
  return `${mobile} ${tablet ? `md:${tablet}` : ''} ${desktop ? `lg:${desktop}` : ''}`.trim();
}

/**
 * Detektiere Viewport-Größe (Hook-agnostisch)
 * @returns {string} - 'mobile' | 'tablet' | 'desktop'
 */
export function getViewportSize() {
  if (typeof window === 'undefined') return 'mobile';
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Touch-Device Detection
 */
export const IS_TOUCH_DEVICE = () => {
  if (typeof window === 'undefined') return false;
  return (
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0)
  );
};

export default MOBILE_PATTERNS;