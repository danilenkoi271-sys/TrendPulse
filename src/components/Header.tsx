import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { PlayMoneyBar } from './PlayMoneyBar';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';

/** Rendered on every page: the play-money notice lives in the header itself. */
export function Header() {
  const { session } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  return (
    <header className="site-header">
      <PlayMoneyBar />
      <div className="site-header__row">
        <Link to="/" aria-label="Trendline home"><Logo /></Link>
        <nav className="site-header__nav" aria-label="Main">
          {session && (
            <>
              <NavLink to="/markets">Markets</NavLink>
              <NavLink to="/portfolio">Portfolio</NavLink>
            </>
          )}
        </nav>
        <div className="site-header__actions">
          <button className="icon-btn" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title="Toggle theme">
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>
            )}
          </button>
          {session ? (
            <button className="btn btn--ghost btn--sm" onClick={async () => { await supabase.auth.signOut(); nav('/'); }}>Sign out</button>
          ) : (
            <>
              <Link className="btn btn--ghost btn--sm" to="/login">Sign in</Link>
              <Link className="btn btn--primary btn--sm" to="/login?mode=signup">Start playing</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
