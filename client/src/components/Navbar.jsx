import React, { useState } from 'react';
import {
  Menu,
  Moon,
  Sun,
  Database,
  Calendar,
  Sparkles,
  ChevronDown,
  Coins,
  LogOut,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const currencyOptions = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$)' },
  { code: 'AED', symbol: 'AED', label: 'AED (د.إ)' },
];

const Navbar = ({ setIsMobileOpen, onRefreshData }) => {
  const { theme, toggleTheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { user, seedDemoData, logout } = useAuth();
  const { showToast } = useToast();
  const [seeding, setSeeding] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  const handleSeedDemo = async () => {
    if (window.confirm('Load realistic sample employment, salary history, increments, and bonus records? This will enrich your dashboard with full data.')) {
      try {
        setSeeding(true);
        await seedDemoData();
        showToast('Sample dataset loaded successfully! Dashboard updated.');
        if (onRefreshData) onRefreshData();
      } catch (error) {
        showToast(error.message || 'Failed to load demo data', 'error');
      } finally {
        setSeeding(false);
      }
    }
  };

  const handleCurrencyChange = async (curr) => {
    try {
      await updateSettings({ currency: curr.code });
      setShowCurrencyDropdown(false);
      showToast(`Currency updated to ${curr.code} (${curr.symbol})`);
      if (onRefreshData) onRefreshData();
    } catch (error) {
      showToast('Failed to update currency', 'error');
    }
  };

  const currentYear = new Date().getFullYear();
  const fyStart = settings?.financialYearStartMonth || 4;
  const currentMonth = new Date().getMonth() + 1;
  const fyYear = currentMonth >= fyStart ? currentYear : currentYear - 1;
  const fyLabel = `FY ${fyYear}-${(fyYear + 1).toString().slice(-2)}`;

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 sm:px-8 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80 transition-colors">
      {/* Mobile Toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-100/70 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800/70 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
          <Calendar className="h-3.5 w-3.5 text-indigo-500" />
          <span>Active Period: <strong className="text-indigo-600 dark:text-indigo-400">{fyLabel}</strong></span>
          <span className="text-[10px] text-slate-400">(Start Month: {fyStart})</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-600" />
          )}
        </button>

        {/* Profile Avatar Badge & Top-Right Sign Out Button */}
        <div className="flex items-center gap-2 sm:gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              {user?.name || 'User'}
            </span>
            <span className="text-[10px] text-slate-400">
              {user?.email || ''}
            </span>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 font-bold text-white text-xs shadow-sm shrink-0">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>

          <button
            onClick={logout}
            title="Sign out of SalaryDetails"
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:border-rose-300 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/80 transition-colors shadow-sm ml-1"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
