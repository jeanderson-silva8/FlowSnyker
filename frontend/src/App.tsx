import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';
import { useBoardStore } from './store/useBoardStore';
import AuthPage from './components/Auth/AuthPage';
import Sidebar from './components/Layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import BoardPage from './pages/BoardPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import BackgroundParticleField from './components/UI/BackgroundParticleField';
import ConfirmDialog from './components/UI/ConfirmDialog';


function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="sidebar-brand-icon" style={{ width: 48, height: 48, fontSize: 22, animation: 'pulse-dot 1.5s ease infinite' }}>⚡</div>
      </div>
    );
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { fetchBoards } = useBoardStore();
  useEffect(() => { fetchBoards(); }, []);

  return (
    <div className="app-layout">
      <BackgroundParticleField />
      <div className="app-edge-glow" aria-hidden="true" />
      <Sidebar />
      {children}
    </div>
  );
}

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <ConfirmDialog />
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/reset-password/:id/:token" element={<ResetPasswordPage />} />

        <Route path="/" element={
          <PrivateRoute>
            <AppLayout><DashboardPage /></AppLayout>
          </PrivateRoute>
        } />
        <Route path="/board/:id" element={
          <PrivateRoute>
            <AppLayout><BoardPage /></AppLayout>
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
