import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, ClipboardList, Download, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const MAIN_NAV = [
  { label: 'Pulse',  path: '/pulse',  icon: Activity,      feature: 'canViewPulse'       },
  { label: 'Survey', path: '/survey', icon: ClipboardList, feature: 'canViewSurvey'      },
  { label: 'Export', path: '/export', icon: Download,      feature: 'canExportAnalytics' },
] as const;

function NavItem({ label, path, icon: Icon }: { label: string; path: string; icon: React.ElementType }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const { user, flags, clearSession } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    toast.success('Logged out');
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-gray-900 border-r border-gray-800 h-screen sticky top-0">
        <div className="px-5 py-6">
          <span className="text-xl font-semibold text-white tracking-tight">totalE</span>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 space-y-1">
          {MAIN_NAV.map(({ label, path, icon, feature }) =>
            flags?.[feature] ? <NavItem key={path} label={label} path={path} icon={icon} /> : null
          )}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 space-y-1">
          {/* Admin — only if canManagePermissions */}
          {flags?.canManagePermissions && (
            <>
              <div className="border-t border-gray-800 my-2" />
              <NavItem label="Admin" path="/admin" icon={Shield} />
            </>
          )}

          <div className="border-t border-gray-800 pt-3 mt-1">
            <div className="px-3 py-1 text-xs text-gray-500 truncate mb-1">{user?.email}</div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
