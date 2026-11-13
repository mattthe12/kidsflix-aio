import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { RootRoute, TabName } from './types';

interface NavContextValue {
  route: RootRoute;
  tab: TabName;
  canGoBack: boolean;
  push: (route: RootRoute) => void;
  replace: (route: RootRoute) => void;
  back: () => void;
  setTab: (tab: TabName) => void;
}

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<RootRoute[]>([{ name: 'tabs', tab: 'home' }]);
  const [tab, setTabState] = useState<TabName>('home');

  const push = useCallback((route: RootRoute) => {
    setStack((prev) => [...prev, route]);
  }, []);

  const replace = useCallback((route: RootRoute) => {
    setStack((prev) => [...prev.slice(0, -1), route]);
  }, []);

  const back = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const setTab = useCallback((next: TabName) => {
    setTabState(next);
    setStack([{ name: 'tabs', tab: next }]);
  }, []);

  const route = stack[stack.length - 1];

  const value = useMemo<NavContextValue>(
    () => ({
      route,
      tab,
      canGoBack: stack.length > 1,
      push,
      replace,
      back,
      setTab,
    }),
    [route, tab, stack.length, push, replace, back, setTab]
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used inside NavProvider');
  return ctx;
}
