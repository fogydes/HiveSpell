import React from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { MultiplayerProvider } from "./context/MultiplayerContext";
import Header from "./components/Header";
import Home from "./views/Home";
import Auth from "./views/Auth";
import Lobby from "./views/Lobby";
import Play from "./views/Play";
import NotFound from "./views/NotFound";

// 3. Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
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
  return (
    <>
      {/* 2. Header placed under Router but above Routes */}
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <Lobby />
            </ProtectedRoute>
          }
        />
        <Route
          path="/play/:mode"
          element={
            <ProtectedRoute>
              <Play />
            </ProtectedRoute>
          }
        />
        {/* 404 Fallback Route - Catch all unmatched paths */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    // 1. Wrap entire app in AuthProvider AND SettingsProvider
    <AuthProvider>
      <SettingsProvider>
        <MultiplayerProvider>
          <Router>
            <AppRoutes />
          </Router>
        </MultiplayerProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
