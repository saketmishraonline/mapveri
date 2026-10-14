import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, LockKeyhole, Mail, UserRound, Eye, EyeOff, KeyRound, AtSign, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { getGetMeQueryKey, useLogin, useRegister } from '@workspace/api-client-react';
import { AuthFrame, PrimaryButton } from '@/components/shared';
import { SocialLoginTiles } from '@/components/social-login';

export function LoginPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    login.mutate(
      { data: { email, password } },
      {
        onSuccess: (session) => {
          window.localStorage.setItem('mapveri_token', session.token);
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          if (session.user.role === 'organization') {
            setLocation('/org/fleet');
          } else if (session.user.role === 'admin') {
            setLocation('/admin/overview');
          } else {
            setLocation('/map');
          }
        },
      },
    );
  };

  const setDemoUser = (userIdentifier: string, userPass: string) => {
    setEmail(userIdentifier);
    setPassword(userPass);
  };

  return (
    <AuthFrame>
      <div className="fade-up">
        <p className="font-mono-map text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f1c744]">
          Welcome back
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.03em] text-[#f6f1df]">
          Sign in to your<br />neighborhood map.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#a9c4ba]">
          Pick up where you left off. Your local record is waiting.
        </p>

        {/* Quick Demo Credentials Selection */}
        <div className="mt-5 rounded-lg border border-[#355064] bg-[#1a3142] p-2.5">
          <p className="text-[10px] font-mono-map uppercase tracking-wider text-[#8eaaa2] mb-1.5">
            Quick demo account sign-in:
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setDemoUser('apex_trucking', 'trucking123')}
              className="rounded bg-[#284252] border border-[#f1c744]/40 px-2 py-1 text-[11px] font-bold text-[#f1c744] hover:bg-[#345265] transition"
            >
              🚚 Trucking Org (Apex)
            </button>
            <button
              type="button"
              onClick={() => setDemoUser('admin', 'admin123')}
              className="rounded bg-[#284252] border border-[#3c5c6a] px-2 py-1 text-[11px] font-semibold text-[#f6f1df] hover:bg-[#345265] transition"
            >
              🛡️ Admin
            </button>
            <button
              type="button"
              onClick={() => setDemoUser('saket', 'user123')}
              className="rounded bg-[#284252] border border-[#3c5c6a] px-2 py-1 text-[11px] font-semibold text-[#f6f1df] hover:bg-[#345265] transition"
            >
              👤 Contributor
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-[#dce7dc]">Username or Email</span>
            <span className="relative block">
              <Mail className="absolute left-3.5 top-3 text-[#7f9d91]" size={17} />
              <input
                required
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#3c5c6a] bg-[#203a4a] py-2.5 pl-10 pr-3 text-sm text-[#f6f1df] outline-none transition placeholder:text-[#719087] focus:border-[#f1c744] focus:ring-2 focus:ring-[#f1c744]/20 shadow-2xs"
                placeholder="Enter your username or email"
                data-testid="input-login-email"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-[#dce7dc]">Password</span>
            <span className="relative block">
              <LockKeyhole className="absolute left-3.5 top-3 text-[#7f9d91]" size={17} />
              <input
                required
                minLength={6}
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#3c5c6a] bg-[#203a4a] py-2.5 pl-10 pr-11 text-sm text-[#f6f1df] outline-none transition placeholder:text-[#719087] focus:border-[#f1c744] focus:ring-2 focus:ring-[#f1c744]/20 shadow-2xs"
                placeholder="Enter your password"
                data-testid="input-login-password"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-2.5 p-1 text-[#7f9d91] hover:text-[#f1c744] transition"
                aria-label="Toggle password visibility"
                data-testid="button-toggle-password"
              >
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          {login.isError && (
            <p className="rounded-lg border border-[#80483c] bg-[#552f2b] px-3 py-2 text-xs text-[#f1b3a5]" data-testid="status-login-error">
              That sign-in did not work. Check your username/email and password.
            </p>
          )}

          <PrimaryButton type="submit" disabled={login.isPending} testId="button-login">
            {login.isPending ? 'Logging in…' : <>Login <ArrowRight size={16} /></>}
          </PrimaryButton>
        </form>

        {/* Graphical OR Divider + Social Login Tiles */}
        <SocialLoginTiles className="mt-5" dividerText="OR" />

        <p className="mt-6 text-center text-sm text-[#a9c4ba]">
          New to MapVeri?{' '}
          <Link href="/register" className="font-bold text-[#f1c744] hover:underline" data-testid="link-register">
            Create an account
          </Link>
        </p>
      </div>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const register = useRegister();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    reason?: string;
  }>({ checking: false, available: null });

  // Debounced Bloom filter check for username reservation & uniqueness
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed || trimmed.length < 3) {
      setUsernameStatus({ checking: false, available: null });
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus({ checking: true, available: null });
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setUsernameStatus({
          checking: false,
          available: Boolean(data.available),
          reason: data.reason,
        });
      } catch {
        setUsernameStatus({ checking: false, available: null });
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [username]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (usernameStatus.available !== true) return;

    register.mutate(
      { data: { name, username: username.trim().toLowerCase(), email, password } },
      {
        onSuccess: (session) => {
          window.localStorage.setItem('mapveri_token', session.token);
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLocation('/map');
        },
      },
    );
  };

  return (
    <AuthFrame>
      <div className="fade-up">
        <p className="font-mono-map text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f1c744]">
          Join the record
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.03em] text-[#f6f1df]">
          Make your corner<br />more knowable.
        </h1>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-[#dce7dc]">Your full name</span>
            <span className="relative block">
              <UserRound className="absolute left-3.5 top-3 text-[#7f9d91]" size={17} />
              <input
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#3c5c6a] bg-[#203a4a] py-2.5 pl-10 pr-3 text-sm text-[#f6f1df] outline-none transition focus:border-[#f1c744] focus:ring-2 focus:ring-[#f1c744]/20 shadow-2xs"
                placeholder="e.g. Alex Rivera"
                data-testid="input-register-name"
              />
            </span>
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#dce7dc]">Username Handle</span>
              {usernameStatus.checking && (
                <span className="text-[#8eaaa2] flex items-center gap-1 text-[11px]">
                  <Loader2 size={12} className="animate-spin text-[#f1c744]" />
                  Checking...
                </span>
              )}
              {!usernameStatus.checking && usernameStatus.available === true && (
                <span className="text-[#4ade80] flex items-center gap-1 text-[11px] font-medium">
                  <ShieldCheck size={12} />
                  Available
                </span>
              )}
              {!usernameStatus.checking && usernameStatus.available === false && (
                <span className="text-[#f87171] flex items-center gap-1 text-[11px] font-medium">
                  <AlertCircle size={12} />
                  {usernameStatus.reason || 'Unavailable'}
                </span>
              )}
            </div>
            <span className="relative block">
              <AtSign className="absolute left-3.5 top-3 text-[#7f9d91]" size={17} />
              <input
                required
                minLength={3}
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className={`w-full rounded-lg border bg-[#203a4a] py-2.5 pl-10 pr-10 text-sm text-[#f6f1df] outline-none transition focus:ring-2 shadow-2xs ${
                  usernameStatus.available === true
                    ? 'border-[#3dbb72] focus:border-[#3dbb72] focus:ring-[#3dbb72]/20'
                    : usernameStatus.available === false
                    ? 'border-[#cf4f4f] focus:border-[#cf4f4f] focus:ring-[#cf4f4f]/20'
                    : 'border-[#3c5c6a] focus:border-[#f1c744] focus:ring-[#f1c744]/20'
                }`}
                placeholder="e.g. alex_rivera"
                data-testid="input-register-username"
              />
              <span className="absolute right-3 top-3">
                {usernameStatus.checking && <Loader2 className="animate-spin text-[#f1c744]" size={17} />}
                {!usernameStatus.checking && usernameStatus.available === true && (
                  <CheckCircle2 className="text-[#4ade80]" size={17} />
                )}
                {!usernameStatus.checking && usernameStatus.available === false && (
                  <AlertCircle className="text-[#f87171]" size={17} />
                )}
              </span>
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-[#dce7dc]">Email address</span>
            <span className="relative block">
              <Mail className="absolute left-3.5 top-3 text-[#7f9d91]" size={17} />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#3c5c6a] bg-[#203a4a] py-2.5 pl-10 pr-3 text-sm text-[#f6f1df] outline-none transition focus:border-[#f1c744] focus:ring-2 focus:ring-[#f1c744]/20 shadow-2xs"
                placeholder="you@somewhere.local"
                data-testid="input-register-email"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-[#dce7dc]">Password</span>
            <span className="relative block">
              <KeyRound className="absolute left-3.5 top-3 text-[#7f9d91]" size={17} />
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#3c5c6a] bg-[#203a4a] py-2.5 pl-10 pr-3 text-sm text-[#f6f1df] outline-none transition focus:border-[#f1c744] focus:ring-2 focus:ring-[#f1c744]/20 shadow-2xs"
                placeholder="Six characters or more"
                data-testid="input-register-password"
              />
            </span>
          </label>

          {register.isError && (
            <p className="rounded-lg border border-[#80483c] bg-[#552f2b] px-3 py-2 text-xs text-[#f1b3a5]" data-testid="status-register-error">
              {(register.error as any)?.message || 'We could not create that account. Your email or username may already be in use.'}
            </p>
          )}

          <PrimaryButton
            type="submit"
            disabled={register.isPending || usernameStatus.available !== true}
            testId="button-register"
          >
            {register.isPending ? 'Setting up your record…' : <>Start contributing <ArrowRight size={16} /></>}
          </PrimaryButton>
        </form>

        <p className="mt-6 text-center text-sm text-[#a9c4ba]">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-[#f1c744] hover:underline" data-testid="link-login">
            Sign in
          </Link>
        </p>
      </div>
    </AuthFrame>
  );
}