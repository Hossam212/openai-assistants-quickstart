/**
 * These are base black and white color styles to
 * quickly swap out if you need to.
 */
const base = {
    white: '#ffffff',
    black: '#000000',
  } as const;
  
  /**
   * Gray is a neutral color and is the foundation
   * of the color system. Almost everything in UI
   * design — text, form fields, backgrounds,
   * dividers — are usually gray.
   */
  const gray = {
    50: '#f7f7f7',
    100: '#595959',
    200: '#e5e5e5',
    400: '#afafaf',
    500: '#7a7a7a',
    600: '#545454',
    900: '#1f1f1f',
  } as const;

  
  /**
   * The primary color is your "brand" color, and is
   * used across all interactive elements such as
   * buttons, links, inputs, etc. This color can
   * define the overall feel and can elicit emotion.
   */
  const primary = {
    50: '#E8F7FF',        // Very light blue, ideal for backgrounds or highlights
    100: '#C2EBFF',       // Light blue, solid (equivalent to #C2EBFF without opacity)
    200: '#C2EBFF99',     // Light blue with 60% opacity (translucent)
    500: '#69C8FF',       // Primary mid-blue, strong enough for main elements
    700: '#2A3A8C',       // Darker blue, useful for active states or accents
    900: '#1A5F80',       // Darkest blue, suitable for text or deep accents
  } as const;
  
  
  /**
   * Negative colors are used across error states and
   * in "destructive" actions. They communicate a
   * destructive/negative action, such as removing
   * a user from your team.
   */
  const negative = {
    50: '#fff1f0',
    100: '#ffb8b2',
    500: '#cc3d33',
    600: '#ad342b',
  } as const;
  
  /**
   * Success colors communicate a positive action,
   * positive trend, or a successful confirmation.
   * If you're using green as your primary color, it
   * can be helpful to introduce a different hue for
   * your success green.
   */
  const positive = {
    50: '#f6fef9',
    100: 'abefc6',
    500: '#17b26a',
    700: '#067647',
  } as const;
  
  /**
   * The secondary brand color is your "brand" color, and
   * is used across all interactive elements such as buttons,
   * links, inputs, etc. This color can define the overall feel
   * and can elicit emotion.
   */
  const accent = {
    500: '#167DD3',
    600: '#1162A6',
  } as const;
  
  const fileIcon = {
    blue: '#155EEF',
    success: '#079455',
    orange: '#ED800E',
    warning: '#DC6803',
    fuchsia: '#BA24D5',
    purple: '#6938EF',
  } as const;
  
  const custom = {
    fawry: '#006E96',
    blue: '#0000AC',
  } as const;
  
  export const colors = {
    accent,
    base,
    custom,
    fileIcon,
    gray,
    negative,
    primary,
    positive,
  } as const;
  
  type Color<T extends keyof typeof colors> = `${T}-${number}`;
  
  /**
   * Get a color using their string identifier
   *
   * @param color - The color string identifier in the format of `${category}-${variant}`
   * @returns The color hex code
   *
   * @example
   * ```tsx
   * import { clr } from 'lib/base';
   *
   * () => <div style={{ backgroundColor: clr('primary-500') }} />
   * ```
   */
  export function clr<T extends keyof typeof colors>(color: Color<T>) {
    const category = color.split('-')[0];
    const variant = color.split('-')[1];
  
    if (!colors[category] || !colors[category][variant]) {
      return color;
    }
  
    return colors[category][variant];
  }
  
  export function isLight(color: Color<any>) {
    const variant = color.split('-')[1] as unknown as number;
  
    return Number(variant) < 250 || color === 'base-white';
  }
  