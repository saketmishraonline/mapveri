import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetMeQueryKey, type User } from '@workspace/api-client-react';
import { AtSign, CheckCircle2, AlertCircle, Loader2, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface SetUsernameModalProps {
  user: User;
}

export function SetUsernameModal({ user }: SetUsernameModalProps) {
  const queryClient = useQueryClient();

  // Generate sensible default suggestion from user's full name or email prefix
  const initialSuggestion = (
    user.name
      ? user.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 15)
      : user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15)
  ).replace(/^_+|_+$/g, '');

  const [username, setUsername] = useState(initialSuggestion || '');
  const [status, setStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    reason?: string;
  }>({ checking: false, available: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Debounced real-time Bloom filter availability check
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed || trimmed.length < 3) {
      setStatus({ checking: false, available: null });
      return;
    }

    const timer = setTimeout(async () => {
      setStatus({ checking: true, available: null });
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setStatus({
          checking: false,
          available: Boolean(data.available),
          reason: data.reason,
        });
      } catch {
        setStatus({ checking: false, available: null });
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || status.available !== true) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const token = window.localStorage.getItem('mapveri_token');
      const res = await fetch('/api/auth/set-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ username: username.trim().toLowerCase() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Could not save username.');
      }

      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to set username. Please try another.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-[#3c5c6a] bg-[#162734] p-6 text-[#f6f1df] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[#284252] pb-4">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#203a4a] border border-[#f1c744]/40 text-[#f1c744]">
            <Sparkles size={22} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-[#f6f1df]">
              Choose Your Handle
            </h3>
            <p className="text-xs text-[#8eaaa2]">
              Signed in via <span className="capitalize font-semibold text-[#f1c744]">{user.source || 'OAuth'}</span>
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-5 text-[#a9c4ba]">
          Welcome <strong className="text-[#f6f1df]">{user.name}</strong> ({user.email})!
          Please select your unique username handle. All your local map pins and verifications will be attributed to this handle.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#dce7dc]">
                Username Handle
              </span>
              <div className="relative">
                <AtSign className="absolute left-3.5 top-3 text-[#7f9d91]" size={16} />
                <input
                  required
                  minLength={3}
                  maxLength={20}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="e.g. alex_rivera"
                  data-testid="input-oauth-set-username"
                  className={`w-full rounded-lg border bg-[#203a4a] py-2.5 pl-10 pr-10 text-sm text-[#f6f1df] outline-none transition focus:ring-2 shadow-2xs ${
                    status.available === true
                      ? 'border-[#3dbb72] focus:border-[#3dbb72] focus:ring-[#3dbb72]/20'
                      : status.available === false
                      ? 'border-[#cf4f4f] focus:border-[#cf4f4f] focus:ring-[#cf4f4f]/20'
                      : 'border-[#3c5c6a] focus:border-[#f1c744] focus:ring-[#f1c744]/20'
                  }`}
                />
                <div className="absolute right-3 top-3">
                  {status.checking && <Loader2 className="animate-spin text-[#f1c744]" size={16} />}
                  {!status.checking && status.available === true && (
                    <CheckCircle2 className="text-[#4ade80]" size={16} />
                  )}
                  {!status.checking && status.available === false && (
                    <AlertCircle className="text-[#f87171]" size={16} />
                  )}
                </div>
              </div>
            </label>

            {/* Bloom Filter Live Indicator */}
            <div className="mt-2 min-h-[20px] text-xs">
              {status.checking && (
                <span className="text-[#8eaaa2] flex items-center gap-1.5 text-[11px]">
                  <Loader2 size={12} className="animate-spin text-[#f1c744]" />
                  Checking Bloom filter reservation list...
                </span>
              )}
              {!status.checking && status.available === true && (
                <span className="text-[#4ade80] flex items-center gap-1.5 text-[11px] font-semibold">
                  <ShieldCheck size={13} />
                  @{username} is available (Bloom filter verified)
                </span>
              )}
              {!status.checking && status.available === false && (
                <span className="text-[#f87171] flex items-center gap-1.5 text-[11px] font-medium">
                  <AlertCircle size={13} />
                  {status.reason || 'Username is not available.'}
                </span>
              )}
              {!status.checking && status.available === null && (
                <span className="text-[#7f9d91] text-[11px]">
                  3–20 characters, lowercase letters, numbers, and underscores.
                </span>
              )}
            </div>
          </div>

          {submitError && (
            <p className="rounded-lg border border-[#80483c] bg-[#552f2b] px-3 py-2 text-xs text-[#f1b3a5]">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={status.available !== true || isSubmitting}
            data-testid="button-confirm-set-username"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#f1c744] py-3 text-sm font-bold text-[#172a3a] transition hover:bg-[#f5d664] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Claiming handle…
              </>
            ) : (
              <>
                Claim @{username || 'handle'} & Enter Map <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
