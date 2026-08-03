import React, { useEffect } from "react";
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
} from "./components/RouteErrorBoundary";
import Header from "./components/Header";
import { InviteHandler, PendingInviteHandler } from "./components/InviteHandler";
import { PWAUpdateHandler } from "./hooks/usePWA";
import Home from "./views/Home";
import Auth from "./views/Auth";
import Lobby from "./views/Lobby";
import Play from "./views/Play";
import ScenePreview from "./views/ScenePreview";
import BattlePass from "./views/BattlePass";
import Challenges from "./views/Challenges";
import Leaderboards from "./views/Leaderboards";
import Watch from "./views/Watch";
import Ranked from "./views/Ranked";
import Tournaments from "./views/Tournaments";
import NotFound from "./views/NotFound";
import { AdminPanel } from "./components/AdminPanel";

// Skip link component for accessibility
const SkipLink: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-app focus:rounded-lg focus:font-medium focus:shadow-xl"
  >
    Skip to main content
  </a>
);

// 3. Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();

  // Track user in logger and analytics
  useEffect(() => {
    if (!loading) {
      logger.setUser(user?.uid || null, user?.email || undefined, user?.displayName || undefined);
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

  // Initialize Sentry and Analytics on first render (client-side only)
  useEffect(() => {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (dsn && dsn !== "YOUR_SENTRY_DSN_HERE") {
      logger.initSentry(dsn);
    }

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
              <HomeErrorBoundary>
                <BattlePass />
              </HomeErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/challenges"
          element={
            <ProtectedRoute>
              <HomeErrorBoundary>
                <Challenges />
              </HomeErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboards"
          element={
            <ProtectedRoute>
              <HomeErrorBoundary>
                <Leaderboards />
              </HomeErrorBoundary>
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
