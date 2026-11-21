import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState { session: Session | null; loading: boolean }
const Ctx = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => alive && setState({ session: data.session, loading: false }))
      .catch(() => alive && setState({ session: null, loading: false }));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setState({ session, loading: false }));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
