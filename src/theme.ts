import { Platform } from 'react-native';

/**
 * KidsFlix design tokens.
 * Bright, candy-coloured, chunky and friendly — big type, soft shadows, round shapes.
 */
export const colors = {
  bg: '#150C31',
  bgDeep: '#0B0619',
  surface: '#241447',
  surfaceAlt: '#2F1B58',
  primary: '#7C4DFF',
  primarySoft: '#A88BFF',
  blue: '#3EA8FF',
  pink: '#FF5CA8',
  yellow: '#FFD23F',
  mint: '#3FE0B0',
  orange: '#FF8A3D',
  white: '#FFFFFF',
  text: '#FFFFFF',
  textDim: '#CFC3EF',
  textFaint: '#9C90C6',
  danger: '#FF5E6C',
  success: '#3FE0B0',
  overlay: 'rgba(8,4,20,0.78)',
  card: 'rgba(255,255,255,0.08)',
  cardStrong: 'rgba(255,255,255,0.14)',
  border: 'rgba(255,255,255,0.14)',
  darkScrim: 'rgba(0,0,0,0.55)',
};

export const gradients = {
  app: ['#170D36', '#211048', '#120A29'] as const,
  primary: ['#7C4DFF', '#B14BFF'] as const,
  sun: ['#FFD23F', '#FF8A3D'] as const,
  candy: ['#FF5CA8', '#FF8A3D'] as const,
  ocean: ['#3EA8FF', '#7C4DFF'] as const,
  mint: ['#3FE0B0', '#3EA8FF'] as const,
  grape: ['#5B2EFF', '#FF5CA8'] as const,
};

export const font = {
  display: 'Baloo2_800ExtraBold',
  displaySoft: 'Baloo2_700Bold',
  bold: 'Nunito_800ExtraBold',
  semibold: 'Nunito_700Bold',
  medium: 'Nunito_600SemiBold',
  body: 'Nunito_400Regular',
};

export const radius = { xs: 10, sm: 14, md: 20, lg: 26, xl: 34, pill: 999 };

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 22, xl: 30, xxl: 44 };

export const shadow = Platform.select({
  web: { boxShadow: '0 14px 34px rgba(5,2,16,0.45)' } as object,
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
});

export const layout = {
  maxContentWidth: 1180,
  tabBarHeight: 78,
};

/** Breakpoints used for phone / tablet / TV layouts. */
export function layoutFor(width: number) {
  if (width >= 1280) return { kind: 'tv' as const, poster: 208, gutter: 40, columns: 6, scale: 1.18 };
  if (width >= 900) return { kind: 'tablet' as const, poster: 176, gutter: 28, columns: 4, scale: 1.08 };
  if (width >= 640) return { kind: 'large' as const, poster: 158, gutter: 22, columns: 3, scale: 1 };
  return { kind: 'phone' as const, poster: 132, gutter: 16, columns: 2, scale: 0.92 };
}

export const ratingColor = (rating: string) =>
  rating === 'G' ? colors.mint : rating === 'PG' ? colors.blue : colors.yellow;
