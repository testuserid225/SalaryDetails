import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';

// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import { LoadingSpinner } from './components/LoadingSpinner';

// Pages
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import SalaryManagement from './pages/SalaryManagement';
import BonusManagement from './pages/BonusManagement';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

const MainLayout = () => {
  const { isAuthenticated, loading } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LoadingSpinner text="Connecting to SalaryDetails Secure Engine..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const handleRefreshData = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Navbar
          setIsMobileOpen={setIsMobileOpen}
          onRefreshData={handleRefreshData}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activePage === 'dashboard' && (
            <Dashboard key={refreshKey} onNavigate={setActivePage} />
          )}
          {activePage === 'profile' && <Profile key={refreshKey} />}
          {activePage === 'salaries' && <SalaryManagement key={refreshKey} />}
          {activePage === 'bonuses' && <BonusManagement key={refreshKey} />}
          {activePage === 'reports' && <ReportsPage key={refreshKey} />}
          {activePage === 'settings' && <SettingsPage key={refreshKey} />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SettingsProvider>
            <MainLayout />
          </SettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
