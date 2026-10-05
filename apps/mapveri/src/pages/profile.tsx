import { useState } from 'react';
import { Link } from 'wouter';
import {
  MapPin,
  ShieldCheck,
  TrendingUp,
  CalendarDays,
  ArrowRight,
  Plus,
  CheckCircle2,
  Code2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useGetProfile, getGetProfileQueryKey } from '@workspace/api-client-react';
import {
  Shell,
  PageTitle,
  Avatar,
  LevelBadge,
  StatusPill,
  Skeleton,
  ErrorState,
  EmptyState,
  formatDate,
} from '@/components/shared';
import { GoogleLogo, ZohoLogo, OutlookLogo } from '@/components/social-login';

export function ProfilePage() {
  const profile = useGetProfile({ query: { queryKey: getGetProfileQueryKey(), staleTime: 45_000 } });
  const user = profile.data?.user;
  const recentPins = profile.data?.recentPins ?? [];
  const [showRawOAuth, setShowRawOAuth] = useState(false);

  const targetChecks = user?.level === 'C' ? 100 : 250;
  const progressPercent =
    !user || user.verificationsCast <= 0
      ? 0
      : user.level === 'A'
      ? user.verificationsCast >= 250
        ? 100
        : Math.min(100, Math.round((user.verificationsCast / 250) * 100))
      : Math.min(100, Math.round((user.verificationsCast / targetChecks) * 100));

  // Parse third-party OAuth payload
  let parsedOAuth: Record<string, any> | null = null;
  if (user?.oauthData) {
    try {
      parsedOAuth = JSON.parse(user.oauthData);
    } catch {
      parsedOAuth = { raw: user.oauthData };
    }
  }

  const isOAuthUser = user?.authProvider && user.authProvider !== 'local';

  return (
    <Shell>
      <PageTitle
        eyebrow="Your contribution record"
        title="Your field notes."
        description="A living snapshot of what you have added, checked, and helped keep honest."
        action={
          <Link
            href="/map"
            className="inline-flex items-center gap-2 rounded-lg bg-[#2d6b60] px-3.5 py-1.5 text-xs font-bold text-[#f8f4e7] hover:bg-[#20574e]"
            data-testid="link-profile-add-pin"
          >
            <Plus size={15} /> Add a place
          </Link>
        }
      />
      {profile.isLoading ? (
        <ProfileSkeleton />
      ) : profile.isError || !user ? (
        <ErrorState message="Your profile could not be loaded right now." onRetry={() => profile.refetch()} />
      ) : (
        <div className="fade-up">
          <section className="grid gap-3.5 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-xl bg-[#172a3a] p-4 text-[#f6f1df] shadow-md sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={user.name} size="md" src={user.avatarUrl} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-xl font-bold tracking-[-.03em]" data-testid="text-profile-name">
                        {user.name}
                      </h2>
                      {isOAuthUser && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#3b5d53] bg-[#163a34] px-2 py-0.5 text-[10px] font-semibold text-[#a3e3cc]">
                          <CheckCircle2 size={12} className="text-[#4ade80]" />
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#9ab3a9]">{user.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <LevelBadge level={user.level} />
                      <span className="font-mono-map text-[9px] text-[#9ab3a9]">
                        since {formatDate(user.createdAt)}
                      </span>
                      {user.authProvider === 'google' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#203a4a] px-2 py-0.5 text-[10px] font-medium text-[#8ab4f8]">
                          <GoogleLogo className="h-3 w-3" /> Google Account
                        </span>
                      )}
                      {user.authProvider === 'zoho' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#203a4a] px-2 py-0.5 text-[10px] font-medium text-[#fca5a5]">
                          <ZohoLogo className="h-3 w-3" /> Zoho Mail
                        </span>
                      )}
                      {user.authProvider === 'outlook' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#203a4a] px-2 py-0.5 text-[10px] font-medium text-[#7dd3fc]">
                          <OutlookLogo className="h-3 w-3" /> Microsoft Outlook
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-[#3b5969] bg-[#203a4a] px-3 py-2 text-left sm:text-right">
                  <p className="font-mono-map text-[9px] uppercase tracking-[.12em] text-[#8eaaa2]">trust weight</p>
                  <p className="font-display text-2xl font-bold text-[#f1c744]" data-testid="text-profile-level">
                    {user.level}
                  </p>
                </div>
              </div>
              <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-[#355064] pt-2.5">
                <div>
                  <p className="font-mono-map text-[9px] uppercase tracking-[.14em] text-[#8eaaa2]">Pins placed</p>
                  <p className="font-display text-xl font-bold" data-testid="text-pins-created">
                    {user.pinsCreated}
                  </p>
                </div>
                <div>
                  <p className="font-mono-map text-[9px] uppercase tracking-[.14em] text-[#8eaaa2]">Checks cast</p>
                  <p className="font-display text-xl font-bold" data-testid="text-verifications-cast">
                    {user.verificationsCast}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-xl border border-[#d6ded4] bg-[#f8f5ea] p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e8d982] text-[#6e5310]">
                    <TrendingUp size={16} />
                  </span>
                  <div>
                    <p className="font-display text-base font-bold text-[#172a3a]">Keep going</p>
                    <p className="text-[11px] text-[#708079]">Every accurate check compounds.</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e0e5dc]">
                  <div
                    className="h-full rounded-full bg-[#dba91a] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-[#708079]">
                  <span>{user.verificationsCast} checks logged</span>
                  <span>{user.level === 'A' ? 'Top tier' : 'Next tier ahead'}</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#d6ded4] bg-[#e6efe8] p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#c4ddd0] text-[#2d6b60]">
                    <ShieldCheck size={16} />
                  </span>
                  <div>
                    <p className="font-display text-base font-bold text-[#172a3a]">The neighbor code</p>
                    <p className="text-[11px] text-[#53736a]">Specificity builds trust.</p>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#53736a]">
                  Add what you know first-hand. Dispute gently. Return when a place changes.
                </p>
              </div>
            </div>
          </section>

          {/* Third-Party Verified Data Section */}
          {isOAuthUser && (
            <section className="mt-4 rounded-xl border border-[#3c5c6a] bg-[#162734] p-4 text-[#f6f1df] shadow-sm">
              <div className="flex items-center justify-between border-b border-[#284252] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#203a4a] border border-[#3b5969]">
                    {user.authProvider === 'google' && <GoogleLogo className="h-4 w-4" />}
                    {user.authProvider === 'zoho' && <ZohoLogo className="h-4 w-4" />}
                    {user.authProvider === 'outlook' && <OutlookLogo className="h-4 w-4" />}
                  </span>
                  <div>
                    <h3 className="font-display text-sm font-bold text-[#f6f1df]">
                      Third-Party Verified Data
                    </h3>
                    <p className="text-[11px] text-[#8eaaa2]">
                      Retrieved from {user.authProvider === 'google' ? 'Google' : user.authProvider === 'zoho' ? 'Zoho Mail' : 'Microsoft Outlook'} verification assertion
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRawOAuth(!showRawOAuth)}
                  className="flex items-center gap-1 rounded-lg border border-[#3b5969] bg-[#203a4a] px-2.5 py-1 text-xs font-semibold text-[#f1c744] hover:bg-[#28495c] transition"
                  data-testid="button-toggle-oauth-raw"
                >
                  <Code2 size={13} />
                  {showRawOAuth ? 'Hide JSON' : 'Inspect JSON'}
                  {showRawOAuth ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-[#1a2f3e] p-2.5 border border-[#2d4957]">
                  <span className="text-[10px] uppercase font-mono-map text-[#8eaaa2]">Verified Email</span>
                  <p className="font-semibold text-white mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-[#4ade80]" />
                    {user.email}
                  </p>
                </div>
                <div className="rounded-lg bg-[#1a2f3e] p-2.5 border border-[#2d4957]">
                  <span className="text-[10px] uppercase font-mono-map text-[#8eaaa2]">Provider User ID</span>
                  <p className="font-mono text-[11px] text-[#f1c744] truncate mt-0.5">
                    {user.providerId || parsedOAuth?.providerId || 'N/A'}
                  </p>
                </div>
                <div className="rounded-lg bg-[#1a2f3e] p-2.5 border border-[#2d4957]">
                  <span className="text-[10px] uppercase font-mono-map text-[#8eaaa2]">Verification Status</span>
                  <p className="font-semibold text-[#4ade80] mt-0.5">
                    Active & Authenticated
                  </p>
                </div>
              </div>

              {showRawOAuth && (
                <div className="mt-3 rounded-lg border border-[#284252] bg-[#0c1820] p-3 text-[11px] font-mono text-[#a9c4ba] overflow-x-auto">
                  <p className="text-[10px] uppercase font-semibold text-[#f1c744] mb-1.5 font-mono-map">
                    Raw Third-Party Verification Payload:
                  </p>
                  <pre className="whitespace-pre-wrap">{JSON.stringify(parsedOAuth || user, null, 2)}</pre>
                </div>
              )}
            </section>
          )}

          <section className="mt-4">
            <div className="mb-2.5 flex items-end justify-between">
              <div>
                <p className="font-mono-map text-[9px] uppercase tracking-[.18em] text-[#8a6c20]">
                  Recent additions
                </p>
                <h2 className="mt-0.5 font-display text-xl font-bold tracking-[-.03em] text-[#172a3a]">
                  Your latest pins
                </h2>
              </div>
              <Link
                href="/map"
                className="flex items-center gap-1 text-xs font-bold text-[#2d6b60] hover:underline"
                data-testid="link-view-map"
              >
                View map <ArrowRight size={13} />
              </Link>
            </div>
            {recentPins.length === 0 ? (
              <EmptyState
                title="Your map starts here"
                description="Add a place that should be easier for neighbors to find."
                action={
                  <Link
                    href="/map"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2d6b60] px-3.5 py-1.5 text-xs font-bold text-[#f8f4e7]"
                    data-testid="link-empty-add"
                  >
                    <Plus size={14} /> Add your first pin
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-2.5 md:grid-cols-2">
                {recentPins.map((pin) => (
                  <article
                    key={pin.id}
                    className="group rounded-xl border border-[#d6ded4] bg-[#f8f5ea] p-3 transition hover:border-[#a9c4b3]"
                    data-testid={`card-profile-pin-${pin.id}`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={15} className="text-[#d9533a]" />
                          <h3 className="font-display text-sm font-bold text-[#172a3a]">{pin.name}</h3>
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-[#708079]">
                          {pin.description || 'No description yet.'}
                        </p>
                      </div>
                      <StatusPill status={pin.status} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-[#e1e4d9] pt-2 text-[10px] text-[#708079]">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={12} /> {formatDate(pin.createdAt)}
                      </span>
                      <span className="font-mono-map">{pin.totalPoints} pts</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Shell>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-7">
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  );
}