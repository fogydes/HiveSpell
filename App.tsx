import React, { useEffect, Suspense, lazy } from "react";
import "./i18n"; // Initialize i18n before other components
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { MultiplayerProvider } from "./context/MultiplayerContext";
import { ToastProvider } from "./context/ToastContext";
import { FeatureFlagsProvider } from "./context/FeatureFlagsContext";
import { SceneProvider } from "./context/SceneContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { logger } from "./services/logger";
import { analytics, setAnalyticsUser } from "./services/analytics";
import {
  HomeErrorBoundary,
  AuthErrorBoundary,
  LobbyErrorBoundary,
  PlayErrorBoundary,
  LeaderboardsErrorBoundary,
  BattlePassErrorBoundary,
  ChallengesErrorBoundary,
} from "./components/RouteErrorBoundary";
import Header from "./components/Header";
import { InviteHandler, PendingInviteHandler } from "./components/InviteHandler";
import { PWAUpdateHandler } from "./hooks/usePWA";
import Home from "./views/Home";
import NotFound from "./views/NotFound";

// Lazily-loaded route views — each ships as its own code-split chunk so the
// initial bundle only carries the shell + Home.
const Auth = lazy(() => import("./views/Auth"));
const LinkDiscordCallback = lazy(() => import("./views/LinkDiscordCallback"));
const Lobby = lazy(() => import("./views/Lobby"));
const Play = lazy(() => import("./views/Play"));
const ScenePreview = lazy(() => import("./views/ScenePreview"));
const BattlePass = lazy(() => import("./views/BattlePass"));
const Challenges = lazy(() => import("./views/Challenges"));
const Leaderboards = lazy(() => import("./views/Leaderboards"));
const Watch = lazy(() => import("./views/Watch"));
const Ranked = lazy(() => import("./views/Ranked"));
const Tournaments = lazy(() => import("./views/Tournaments"));
import { AdminPanel } from "./components/AdminPanel";
import { FriendsPanel } from "@/components/friends";


// Skip link component for accessibility
const SkipLink: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-app focus:rounded-lg focus:font-medium focus:shadow-xl"
  >
    Skip to main content
  </a>
);

// Fallback shown while a lazily-loaded route chunk is fetched
const RouteFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center text-primary bg-app">
    Loading Hive...
  </div>
);

// 3. Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();

  // Track user in logger and analytics
  useEffect(() => {
    if (!loading) {
      logger.setUser(user?.uid || null);
      setAnalyticsUser(user?.uid || null, user ? { email: user.email, username: user.displayName } : undefined);
    }
  }, [user, loading]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-primary bg-app">
        Loading Hive...
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const location = useLocation();

  // Initialize Analytics on first render (client-side only)
  useEffect(() => {
    // Initialize PostHog Analytics
    analytics.init();
  }, []);

  // Track page views for SPA navigation
  useEffect(() => {
    analytics.capturePageView(location.pathname);
  }, [location.pathname]);

  return (
    <>
      {/* Skip link for accessibility */}
      <SkipLink />
      {/* 2. Header placed under Router but above Routes */}
      <Header />
      {/* Handle friend invite deep links */}
      <InviteHandler />
      {/* Handle pending invite after login */}
      <PendingInviteHandler />
      {/* PWA update notifications */}
      <PWAUpdateHandler />
      <main id="main-content" role="main" className="min-h-screen">
        <Suspense fallback={<RouteFallback />}>
        <Routes>
        <Route
          path="/"
          element={
            <HomeErrorBoundary>
              <Home />
            </HomeErrorBoundary>
          }
        />
        <Route
          path="/auth"
          element={
            <AuthErrorBoundary>
              <Auth />
            </AuthErrorBoundary>
          }
        />
        {/* Discord account-linking callback. Separate from /auth, which bounces
            signed-in users to /lobby and would swallow the callback. */}
        <Route
          path="/link/discord"
          element={
            <ProtectedRoute>
              <AuthErrorBoundary>
                <LinkDiscordCallback />
              </AuthErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <LobbyErrorBoundary>
                <Lobby />
              </LobbyErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/play/:mode"
          element={
            <ProtectedRoute>
              <PlayErrorBoundary>
                <Play />
              </PlayErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/battle-pass"
          element={
            <ProtectedRoute>
              <BattlePassErrorBoundary>
                <BattlePass />
              </BattlePassErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/challenges"
          element={
            <ProtectedRoute>
              <ChallengesErrorBoundary>
                <Challenges />
              </ChallengesErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboards"
          element={
            <ProtectedRoute>
              <LeaderboardsErrorBoundary>
                <Leaderboards />
              </LeaderboardsErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scene-preview"
          element={
            <HomeErrorBoundary>
              <ScenePreview />
            </HomeErrorBoundary>
          }
        />
        <Route
          path="/watch/:roomId"
          element={
            <HomeErrorBoundary>
              <Watch />
            </HomeErrorBoundary>
          }
        />
        <Route
          path="/ranked"
          element={
            <ProtectedRoute>
              <HomeErrorBoundary>
                <Ranked />
              </HomeErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tournaments"
          element={
            <ProtectedRoute>
              <HomeErrorBoundary>
                <Tournaments />
              </HomeErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <HomeErrorBoundary>
                <FriendsPanel variant="full" />
              </HomeErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <HomeErrorBoundary>
                <AdminPanel />
              </HomeErrorBoundary>
            </ProtectedRoute>
          }
        />
        {/* 404 Fallback Route - Catch all unmatched paths */}
        <Route path="*" element={<NotFound />} />
      </Routes>
        </Suspense>
    </main>
    </>
  );
};

const App: React.FC = () => {
  return (
    // 1. Wrap entire app in AuthProvider AND SettingsProvider
    <ErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider>
            <MultiplayerProvider>
              <FeatureFlagsProvider>
                <SceneProvider>
                  <Router>
                    <AppRoutes />
                  </Router>
                </SceneProvider>
              </FeatureFlagsProvider>
            </MultiplayerProvider>
          </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
