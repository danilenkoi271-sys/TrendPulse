import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isConfigured, supabase } from '../lib/supabase';

export default function Auth() {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  const nav = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  if (session) return <Navigate to="/markets" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name.trim() } } });
        if (error) throw error;
        if (data.session) nav('/markets');
        else setMsg({ kind: 'info', text: 'Check your inbox to confirm your email, then sign in.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav('/markets');
      }
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setBusy(false); }
  };

  return (
    <main className="auth">
      <div className="auth__card card">
        <div className="auth__sticker" aria-hidden="true">$1,000<small>play money</small></div>
        <h1>{mode === 'signup' ? 'Grab your starter stack' : 'Welcome back'}</h1>
        <p className="muted">
          {mode === 'signup' ? 'New accounts start with $1,000 of play money. It has no cash value and can never be withdrawn.' : 'Sign in to pick up where you left off.'}
        </p>
        {!isConfigured && (
          <p className="form-error" role="alert">Supabase isn't configured. Copy <code>.env.example</code> to <code>.env.local</code> and fill in your project URL and anon key.</p>
        )}
        <form onSubmit={submit} className="auth__form">
          {mode === 'signup' && (
            <label className="field"><span>Display name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="nickname" placeholder="What should we call you?" /></label>
          )}
          <label className="field"><span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          <label className="field"><span>Password</span>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></label>
          {msg && <p className={msg.kind === 'error' ? 'form-error' : 'form-info'} role="alert">{msg.text}</p>}
          <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'One moment…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        </form>
        <button className="link-btn" onClick={() => setParams(mode === 'signup' ? {} : { mode: 'signup' })}>
          {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </div>
    </main>
  );
}
