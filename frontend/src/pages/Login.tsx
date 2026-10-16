import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';

const CURVES = [
  'M0 520 C 200 420, 320 300, 520 360 S 860 540, 1060 400 S 1340 220, 1600 300',
  'M0 580 C 240 500, 380 400, 600 450 S 900 600, 1120 480 S 1380 320, 1600 380',
  'M0 640 C 260 580, 420 500, 640 540 S 940 660, 1160 560 S 1420 430, 1600 470',
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) return setError('Enter your username and password.');
    setBusy(true);
    try { await login(username.trim(), password); navigate('/dashboard', { replace: true }); }
    catch (err) { setError(getErrorMessage(err, 'Invalid username or password.')); }
    finally { setBusy(false); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#082748] via-[#0B4F8F] to-[#0B6BB5] p-5">
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1600 800" preserveAspectRatio="xMidYMax slice" aria-hidden>
        {CURVES.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={i === 0 ? '#FF914D' : '#ffffff'} strokeOpacity={i === 0 ? 0.55 : 0.12} strokeWidth={i === 0 ? 2.5 : 1.5}
            className="motion-safe-anim" strokeDasharray="2400" strokeDashoffset="2400" style={{ animation: `draw 2.4s ease-out ${i * 0.25}s forwards` }} />
        ))}
      </svg>
      <form onSubmit={submit} noValidate className="relative w-full max-w-sm rounded-xl bg-white p-8 shadow-2xl shadow-black/30">
        <img src="/ismo_logo.png" alt="ISMO" className="mb-6 h-10 w-auto" />
        <h1 className="text-2xl font-bold text-navy-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Independent System and Market Operator. Manage the banners shown on ISMO websites.</p>
        {error && <div role="alert" className="mt-5 rounded-md border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="mt-6 space-y-4">
          <div><label htmlFor="u" className="mb-1.5 block text-sm font-medium text-slate-700">Username</label>
            <input id="u" className="input" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} /></div>
          <div><label htmlFor="p" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <input id="p" className="input pr-10" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-3 text-slate-500 hover:text-slate-800">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div></div>
        </div>
        <button className="btn-primary mt-7 w-full" disabled={busy}>{busy ? <><Loader2 className="animate-spin" size={16} /> Signing in...</> : 'Sign in'}</button>
      </form>
    </div>
  );
}