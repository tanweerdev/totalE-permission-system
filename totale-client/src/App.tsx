import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import PulsePage from './pages/PulsePage';
import SurveyPage from './pages/SurveyPage';
import ExportPage from './pages/ExportPage';
import AdminPage from './pages/AdminPage';

function SmartRedirect() {
  const { flags } = useAuth();
  if (flags?.canViewPulse) return <Navigate to="/pulse" replace />;
  if (flags?.canViewSurvey) return <Navigate to="/survey" replace />;
  if (flags?.canExportAnalytics) return <Navigate to="/export" replace />;
  if (flags?.canManagePermissions) return <Navigate to="/admin" replace />;
  return <Navigate to="/unauthorized" replace />;
}

function UnauthorizedPage() {
  const { user, clearSession } = useAuth();

  function handleLogout() {
    clearSession();
    window.location.href = '/login';
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="text-center space-y-4">
        <p className="text-5xl font-bold text-gray-700">403</p>
        <p className="text-white font-medium">No permissions assigned</p>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">
          Your account doesn't have access to any features yet. Please contact your administrator.
        </p>
        {user && (
          <p className="text-gray-600 text-xs">{user.email}</p>
        )}
        <button
          onClick={handleLogout}
          className="mt-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster theme="dark" position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<SmartRedirect />} />
            <Route path="/pulse"  element={<RequireAuth feature="canViewPulse"><PulsePage /></RequireAuth>} />
            <Route path="/survey" element={<RequireAuth feature="canViewSurvey"><SurveyPage /></RequireAuth>} />
            <Route path="/export" element={<RequireAuth feature="canExportAnalytics"><ExportPage /></RequireAuth>} />
            <Route path="/admin"  element={<RequireAuth feature="canManagePermissions"><AdminPage /></RequireAuth>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
