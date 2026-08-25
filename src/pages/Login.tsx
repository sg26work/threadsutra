import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captcha] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [captchaInput, setCaptchaInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) nav('/app/dashboard'); }, [user, nav]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (captchaInput.trim() !== captcha) { setError('Captcha does not match'); return; }
    setLoading(true);
    setTimeout(() => {
      const r = login(username, password);
      setLoading(false);
      if (r.ok) nav('/app/dashboard');
      else setError(r.error || 'Login failed');
    }, 600);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0e2a45] via-[#1c5a8a] to-[#2f9e9e] p-4">
      {/* soft ambient blobs */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[#3fb6c9]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#3b8fc4]/25 blur-3xl" />
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20 md:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-[#132a4d] via-[#1c4b73] to-[#2f9e9e] p-10 text-white md:flex">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-lg"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#d62828] text-lg font-black italic text-white">e</span></div>
              <span className="text-xl font-bold tracking-tight">eRetail</span>
            </div>
            <h2 className="mt-10 text-2xl font-semibold leading-snug">Unified Omnichannel<br />Order &amp; Warehouse<br />Management</h2>
            <p className="mt-4 text-sm text-white/70">Sell more across every channel. Manage orders, inventory, procurement and fulfillment from one platform.</p>
          </div>
          <ul className="relative space-y-2 text-sm text-white/85">
            {['Multi-channel Order Management', 'Real-time Inventory & WMS', 'Procurement, GRN & Returns'].map((f) => (
              <li key={f} className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-300" />{f}</li>
            ))}
          </ul>
          <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Vinculum Solutions — Demo Environment</p>
        </div>

        {/* Form */}
        <div className="p-8 sm:p-10">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow"><span className="flex h-7 w-7 items-center justify-center rounded bg-[#d62828] text-base font-black italic text-white">e</span></div>
            <span className="text-lg font-bold text-[#1c5a8a]">eRetail</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-800">Sign in to your account</h1>
          <p className="mt-1 text-sm text-slate-400">Enter your credentials to access the console</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Username</label>
              <div className="flex items-center rounded-md border border-slate-300 px-3 focus-within:border-[#2f9e9e] focus-within:ring-1 focus-within:ring-[#2f9e9e]">
                <User size={16} className="text-slate-400" />
                <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-transparent px-2 py-2.5 text-sm text-slate-700 outline-none" placeholder="Username" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
              <div className="flex items-center rounded-md border border-slate-300 px-3 focus-within:border-[#2f9e9e] focus-within:ring-1 focus-within:ring-[#2f9e9e]">
                <Lock size={16} className="text-slate-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent px-2 py-2.5 text-sm text-slate-700 outline-none" placeholder="Password" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Captcha</label>
              <div className="flex items-center gap-3">
                <div className="select-none rounded-md bg-slate-800 px-4 py-2 font-mono text-lg italic tracking-[0.3em] text-white line-through decoration-slate-500">{captcha}</div>
                <input value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#2f9e9e] focus:ring-1 focus:ring-[#2f9e9e]" placeholder="Enter captcha" />
              </div>
            </div>

            {error && <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#1c5a8a] to-[#2f9e9e] py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
            Local mock authentication is enabled. Enter any non-empty username and password.
          </div>
        </div>
      </div>
    </div>
  );
}
