import { type ReactNode, useEffect, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { useGetMe, getGetMeQueryKey } from '@workspace/api-client-react';
import { AuthFrame, Logo, Skeleton } from '@/components/shared';
import { LoginPage, RegisterPage } from '@/pages/auth';
import { PwaPrompt } from '@/components/pwa-prompt';
import { SocialLoginTiles } from '@/components/social-login';
import { SetUsernameModal } from '@/components/set-username-modal';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

// Lazy-load heavy pages so LoginPage loads instantaneously
const MapPage = lazy(() => import('@/pages/map').then((m) => ({ default: m.MapPage })));
const ProfilePage = lazy(() => import('@/pages/profile').then((m) => ({ default: m.ProfilePage })));
const RewardsPage = lazy(() => import('@/pages/rewards').then((m) => ({ default: m.RewardsPage })));
const AdminPage = lazy(() => import('@/pages/admin').then((m) => ({ default: m.AdminPage })));
const OrganizationPage = lazy(() => import('@/pages/organization').then((m) => ({ default: m.OrganizationPage })));

// Persistent high-performance query cache
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes fresh
      gcTime: 24 * 60 * 60 * 1000, // Keep in memory for 24 hours
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Home() {
  const [, setLocation] = useLocation();
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('mapveri_token') : null;

  const me = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      staleTime: 5 * 60 * 1000,
    },
  });

  useEffect(() => {
    if (token && me.data) {
      if (me.data.role === 'organization') {
        setLocation('/org/fleet');
      } else if (me.data.role === 'admin') {
        setLocation('/admin/overview');
      } else {
        setLocation('/map');
      }
    }
  }, [token, me.data, setLocation]);

  if (token && me.isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f3f0e5]">
        <div className="w-full max-w-sm p-6 text-center">
          <div className="mb-6 flex justify-center"><Logo compact /></div>
          <Skeleton className="mx-auto h-8 w-48" />
        </div>
      </div>
    );
  }

  return (
    <AuthFrame>
      <div className="fade-up text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1c744] text-[#172a3a]">
          <span className="font-display text-2xl font-bold">m</span>
        </span>
        <p className="mt-8 font-mono-map text-[10px] uppercase tracking-[.2em] text-[#f1c744]">The local record</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-[-.06em]">Your neighborhood<br />has more to say.</h1>
        <p className="mt-4 text-sm leading-6 text-[#a9c4ba]">MapVeri is a community-powered map for places that deserve to be seen, checked, and kept honest.</p>
        <div className="mt-9 grid gap-3">
          <a href="/login" className="rounded-lg bg-[#f1c744] px-4 py-3 text-sm font-bold text-[#172a3a] transition hover:bg-[#f5d664]" data-testid="link-home-login">Sign in to the map</a>
          <a href="/register" className="rounded-lg border border-[#557271] px-4 py-3 text-sm font-bold text-[#f6f1df] transition hover:border-[#f1c744] hover:text-[#f1c744]" data-testid="link-home-register">Create your local account</a>
        </div>
        <SocialLoginTiles className="mt-4" dividerText="OR" />
      </div>
    </AuthFrame>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('mapveri_token') : null;

  // Immediate redirect if not logged in - avoids network delay
  useEffect(() => {
    if (!token) {
      setLocation('/login');
    }
  }, [token, setLocation]);

  const me = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      staleTime: 5 * 60 * 1000,
    },
  });

  useEffect(() => {
    if (token && me.isError) {
      setLocation('/login');
    }
  }, [token, me.isError, setLocation]);

  if (!token) return null;
  if (me.isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f3f0e5]">
        <Skeleton className="h-8 w-44" />
      </div>
    );
  }
  if (me.isError || !me.data) return null;

  return (
    <>
      {(!me.data.username || me.data.needsUsername) && (
        <SetUsernameModal user={me.data} />
      )}
      <Suspense
        fallback={
          <div className="flex min-h-[100dvh] items-center justify-center bg-[#f3f0e5]">
            <Skeleton className="h-8 w-44" />
          </div>
        }
      >
        {children}
      </Suspense>
    </>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/map"><Protected><MapPage /></Protected></Route>
        <Route path="/profile"><Protected><ProfilePage /></Protected></Route>
        <Route path="/rewards"><Protected><RewardsPage /></Protected></Route>
        <Route path="/admin"><Protected><AdminPage /></Protected></Route>
        <Route path="/admin/overview"><Protected><AdminPage view="overview" /></Protected></Route>
        <Route path="/admin/queue"><Protected><AdminPage view="queue" /></Protected></Route>
        <Route path="/admin/pins"><Protected><AdminPage view="pins" /></Protected></Route>
        <Route path="/admin/users"><Protected><AdminPage view="users" /></Protected></Route>
        <Route path="/admin/map"><Protected><AdminPage view="map" /></Protected></Route>
        <Route path="/org"><Protected><OrganizationPage view="fleet" /></Protected></Route>
        <Route path="/org/fleet"><Protected><OrganizationPage view="fleet" /></Protected></Route>
        <Route path="/org/overview"><Protected><OrganizationPage view="overview" /></Protected></Route>
        <Route path="/org/routes"><Protected><OrganizationPage view="routes" /></Protected></Route>
        <Route path="/org/drivers"><Protected><OrganizationPage view="drivers" /></Protected></Route>
        <Route path="/org/geofences"><Protected><OrganizationPage view="geofences" /></Protected></Route>
        <Route path="/org/maintenance"><Protected><OrganizationPage view="maintenance" /></Protected></Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <PwaPrompt />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
