import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export type LayoutKind = 'compact' | 'phone' | 'phablet' | 'tablet' | 'desktop' | 'wide';

export interface ResponsiveValues {
  width: number;
  height: number;
  isLandscape: boolean;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  kind: LayoutKind;
  gutter: number;
  contentWidth: number;
  maxContentWidth: number;
  columns: number;
  touch: number;
  titleSize: number;
  bodySize: number;
}

/** Shared breakpoints so every screen agrees on when the layout changes. */
export const BREAKPOINTS = { compact: 360, phone: 600, phablet: 760, tablet: 1024, desktop: 1280 };

export function columnsFor(available: number, minItem: number, gap = 12, max = 8): number {
  if (!Number.isFinite(available) || available <= 0) return 1;
  return Math.max(1, Math.min(max, Math.floor((available + gap) / (minItem + gap))));
}

export function responsiveFor(width: number, height: number): ResponsiveValues {
  const kind: LayoutKind =
    width < BREAKPOINTS.compact
      ? 'compact'
      : width < BREAKPOINTS.phone
        ? 'phone'
        : width < BREAKPOINTS.tablet
          ? width < BREAKPOINTS.phablet
            ? 'phablet'
            : 'tablet'
          : width < BREAKPOINTS.desktop
            ? 'desktop'
            : 'wide';

  const gutter = kind === 'compact' ? 14 : kind === 'phone' ? 18 : kind === 'phablet' ? 22 : kind === 'tablet' ? 28 : 36;
  const maxContentWidth = 1180;
  const contentWidth = Math.max(0, Math.min(width - gutter * 2, maxContentWidth));
  const columns = width < 520 ? 2 : width < 760 ? 3 : width < 1024 ? 4 : width < 1440 ? 5 : 6;

  return {
    width,
    height,
    isLandscape: width > height,
    isPhone: width < BREAKPOINTS.phone,
    isTablet: width >= BREAKPOINTS.phone && width < BREAKPOINTS.tablet,
    isDesktop: width >= BREAKPOINTS.tablet,
    kind,
    gutter,
    contentWidth,
    maxContentWidth,
    columns,
    touch: width < BREAKPOINTS.compact ? 46 : 52,
    titleSize: kind === 'compact' ? 24 : kind === 'phone' ? 28 : kind === 'phablet' ? 32 : 36,
    bodySize: kind === 'compact' ? 13 : 14,
  };
}

export function useResponsive(): ResponsiveValues {
  const { width, height } = useWindowDimensions();
  return useMemo(() => responsiveFor(width, height), [width, height]);
}
