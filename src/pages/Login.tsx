import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (user) navigate('/app/dashboard'); }, [user, navigate]);

  const reset = () => {
    setLoginId('');
    setPassword('');
    setError('');
    setSubmitting(false);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    const result = login(loginId, password);
    if (result.ok) navigate('/app/dashboard');
    else {
      setSubmitting(false);
      setError(result.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4] lg:grid lg:grid-cols-[58.3%_41.7%]">
      <div className="relative hidden min-h-screen overflow-hidden bg-[#0579b6] lg:block">
        <img alt="" src="https://www.vinculumgroup.com/vin-eretail/img/lhs-panel-vin-seller-panel-mobile-app-june-26.jpg" className="w-full" />
      </div>

      <main className="flex min-h-screen items-start justify-center bg-white px-12 pt-[18vh] lg:px-[8vw]">
        <div className="w-full max-w-[465px]">
          <div className="mb-14 text-center">
            <div className="inline-flex items-end font-black tracking-[-0.06em] text-[#151515]">
              <span className="mr-1 inline-flex h-12 w-12 -skew-x-6 items-center justify-center bg-[#e5232b] text-[38px] italic leading-none text-white">e</span>
              <span className="text-[48px] leading-none">RETAIL</span>
            </div>
            <div className="mt-2 text-base text-[#333]">Omni-channel OMS &amp; WMS</div>
          </div>

          <form name="loginForm" onSubmit={submit} onReset={reset} className="space-y-8">
            <label className="flex items-center border-b-2 border-[#dedede] pb-2 text-[#9d9d9d] focus-within:border-[#269bd2]">
              <UserRound size={29} strokeWidth={1.2} />
              <input id="userName" name="userName" autoComplete="off" autoFocus aria-label="Login Id" placeholder="Login Id" value={loginId} onChange={(event) => setLoginId(event.target.value)} className="w-full bg-transparent px-3 py-1 text-base text-[#444] outline-none placeholder:text-[#aaa]" />
            </label>

            <label className="flex items-center border-b-2 border-[#dedede] pb-2 text-[#9d9d9d] focus-within:border-[#269bd2]">
              <LockKeyhole size={29} strokeWidth={1.2} />
              <input id="password" type="password" autoComplete="off" aria-label="Password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent px-3 py-1 text-base text-[#444] outline-none placeholder:text-[#aaa]" />
              <button type="button" className="text-sm text-[#555]">Forgot?</button>
            </label>

            {error && <div role="alert" className="text-sm text-rose-600">{error}</div>}

            <div className="grid grid-cols-2 gap-4 px-14 pt-1">
              <button type="submit" disabled={submitting} className="h-11 rounded-lg bg-gradient-to-r from-[#c51e4d] to-[#2256ac] text-xl text-white disabled:opacity-60">Login</button>
              <button type="reset" className="h-11 rounded-lg bg-[#5a5b5d] text-xl text-white">Reset</button>
            </div>
          </form>

          <div className="mt-12 text-center text-base text-[#333]">
            <span>Connect With Us:</span>
            <span className="ml-3 inline-flex gap-2">
              <a aria-label="Facebook" href="https://www.facebook.com/VinculumGroup/" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5878b9] font-bold text-white">f</a>
              <a aria-label="Twitter" href="https://twitter.com/Vin_Omnichannel" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#209bd1] font-bold text-white">♥</a>
              <a aria-label="LinkedIn" href="https://www.linkedin.com/company/vinculumgroup/" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#39a9dc] font-bold text-white">in</a>
            </span>
          </div>

          <div className="mt-10 text-center">
            <p className="text-xl font-bold text-[#303030]">Click below to refer a customer for<br />Vinculum</p>
            <a href="https://www.vinculumgroup.com/customer-referral/" className="mt-3 inline-flex h-10 min-w-48 items-center justify-center rounded-md bg-[#079bd7] px-8 text-xl text-white">Refer Now</a>
          </div>
        </div>
      </main>
    </div>
  );
}
