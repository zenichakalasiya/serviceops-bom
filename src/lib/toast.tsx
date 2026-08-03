/**
 * Minimal toast. Actions that would need a backend (Deploy Patch, Export,
 * View Configuration) surface here rather than pretending to succeed.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const Ctx = createContext<(msg: string) => void>(() => {});

export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const [shown, setShown] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const push = useCallback((m: string) => {
    setMsg(m);
    setShown(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown(false), 1800);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className={'toast' + (shown ? ' show' : '')} role="status" aria-live="polite">{msg}</div>
    </Ctx.Provider>
  );
}
