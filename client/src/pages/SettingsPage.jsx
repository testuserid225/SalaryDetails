import React, { useState } from 'react';
import {
  Settings,
  Coins,
  Calendar,
  Database,
  Lock,
  Save,
  CheckCircle2,
  HardDrive,
  Copy,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const currencyList = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
];

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April (Standard in India/UK)' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July (Standard in Australia)' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October (Standard in US Federal)' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const SettingsPage = () => {
  const { settings, updateSettings } = useSettings();
  const { theme, setTheme } = useTheme();
  const { user, seedDemoData } = useAuth();
  const { showToast } = useToast();

  const [currency, setCurrency] = useState(settings?.currency || 'INR');
  const [fyMonth, setFyMonth] = useState(settings?.financialYearStartMonth || 4);
  const [savingSettings, setSavingSettings] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSaveGeneralSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateSettings({
        currency,
        financialYearStartMonth: Number(fyMonth),
        theme,
      });
      showToast('Settings saved successfully');
    } catch (error) {
      showToast(error.message || 'Failed to update settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.put('/auth/password', { currentPassword, newPassword });
      if (res.success) {
        showToast('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      showToast(error.message || 'Failed to change password', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSeed = async () => {
    if (window.confirm('Populate realistic sample records? This will enrich your salary history and charts.')) {
      setSeeding(true);
      try {
        await seedDemoData();
        showToast('Sample dataset loaded successfully!');
      } catch (err) {
        showToast('Failed to load demo data', 'error');
      } finally {
        setSeeding(false);
      }
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  const backupCmd = 'mongodump --db=paytrack --out="C:\\SalaryDetails_Backups\\paytrack_%date:~-4,4%%date:~-7,2%%date:~-10,2%"';
  const restoreCmd = 'mongorestore --db=paytrack --drop "C:\\SalaryDetails_Backups\\<backup-folder>\\paytrack"';

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Application Settings & Preferences
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configure financial year standards, currency presentation, account security, and MongoDB database backups
        </p>
      </div>

      {/* 1. General Preferences Form */}
      <form
        onSubmit={handleSaveGeneralSettings}
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Coins className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Currency & Financial Year Configuration
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Default Currency */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Application Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
            >
              {currencyList.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.symbol} - {c.code})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Used across dashboard metrics, charts, and salary slips
            </p>
          </div>

          {/* Financial Year Start Month */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Financial Year Start Month
            </label>
            <select
              value={fyMonth}
              onChange={(e) => setFyMonth(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.value})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Groups tax statements and annual summaries (e.g. Apr 1 to Mar 31)
            </p>
          </div>
        </div>

        {/* Theme Preference */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
            Appearance & Interface Theme
          </label>
          <div className="grid grid-cols-2 gap-3 sm:w-80">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`rounded-xl border p-3 text-xs font-bold text-center transition-all ${
                theme === 'light'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              ☀️ Clean Light Mode
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`rounded-xl border p-3 text-xs font-bold text-center transition-all ${
                theme === 'dark'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              🌙 Modern Dark Mode
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={savingSettings}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {savingSettings ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>

      {/* 2. MongoDB Database Backup & Restore Guide (Windows) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <HardDrive className="h-5 w-5 text-emerald-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            MongoDB Database Backup & Recovery (Windows)
          </h2>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Your personal data is saved securely in your MongoDB instance (database name: <code>paytrack</code>).
          To back up or restore your database using Windows PowerShell or Command Prompt, run these exact commands:
        </p>

        {/* Backup Command Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-indigo-500" />
              1. Create Database Snapshot Backup:
            </span>
            <button
              onClick={() => copyToClipboard(backupCmd, 'Backup command')}
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1 text-[11px]"
            >
              <Copy className="h-3 w-3" /> Copy Command
            </button>
          </div>
          <div className="rounded-xl bg-slate-950 p-3.5 font-mono text-xs text-emerald-400 overflow-x-auto border border-slate-800">
            {backupCmd}
          </div>
        </div>

        {/* Restore Command Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-emerald-500" />
              2. Restore from Backup:
            </span>
            <button
              onClick={() => copyToClipboard(restoreCmd, 'Restore command')}
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1 text-[11px]"
            >
              <Copy className="h-3 w-3" /> Copy Command
            </button>
          </div>
          <div className="rounded-xl bg-slate-950 p-3.5 font-mono text-xs text-indigo-300 overflow-x-auto border border-slate-800">
            {restoreCmd}
          </div>
        </div>
      </div>

      {/* 3. Account Security / Password Change */}
      <form
        onSubmit={handlePasswordChange}
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Lock className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Change Password
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              minLength="6"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength="6"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={changingPassword}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {changingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </div>
      </form>

      {/* 4. Quick Demo Dataset Seed Card */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 dark:border-indigo-900/60 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Populate Realistic Demo Dataset
          </h3>
          <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 mt-1">
            Generates realistic 2-year salary slips (2023-2024), appraisal hikes, festival & performance bonuses, and career timeline records.
          </p>
        </div>

        <button
          onClick={handleSeed}
          disabled={seeding}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          {seeding ? 'Seeding Data...' : 'Seed Sample Data'}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
