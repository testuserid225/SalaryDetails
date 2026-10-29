import React, { useState } from 'react';
import {
  CreditCard,
  Lock,
  Mail,
  User,
  ShieldCheck,
  TrendingUp,
  Gift,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ForgotPassword from './ForgotPassword';
import { useToast } from '../context/ToastContext';

const AuthPage = () => {
  const { login, register, seedDemoData } = useAuth();
  const [showForgot, setShowForgot] = useState(false);
  const { showToast } = useToast();

  const [isRegister, setIsRegister] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        await register(formData.name, formData.email, formData.password);
        showToast('Account setup completed successfully! Welcome to SalaryDetails.');
      } else {
        await login(formData.email, formData.password);
        showToast('Logged in successfully!');
      }
    } catch (error) {
      showToast(error.message || 'Authentication failed. Please verify credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click test button: logs into demo account or registers it if not existing
  const handleQuickDemoAccess = async () => {
    setLoading(true);
    try {
      try {
        await login('aditya@salarydetails.app', 'password123');
        showToast('Signed in to sample demo profile!');
      } catch {
        // If demo user does not exist yet, register and seed
        await register('Aditya Sharma', 'aditya@salarydetails.app', 'password123');
        await seedDemoData();
        showToast('Created and loaded verified sample dataset!');
      }
    } catch (error) {
      showToast(error.message || 'Demo access failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden border border-slate-200 shadow-2xl bg-white dark:border-slate-800 dark:bg-slate-900">
        {/* Left Hero Column */}
        <div className="relative p-8 sm:p-10 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-md">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-black tracking-tight text-white">
                  Salary<span className="text-indigo-300">Details</span>
                </span>
                <p className="text-xs text-indigo-200 font-medium">Personal Compensation Suite</p>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold leading-snug">
              Master your salary, bonuses, increments, and career timeline.
            </h2>
            <p className="mt-2 text-sm text-indigo-100/80 leading-relaxed">
              Real-time MongoDB tracking of monthly payroll slips, performance bonuses, promotion appraisal hikes, and non-overlapping work experience.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="my-8 space-y-3">
            <div className="flex items-center gap-3 text-xs text-indigo-100 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Isolated single-user database security & JWT auth</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-indigo-100 font-medium">
              <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Exact career earnings calculation with no overlap</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-indigo-100 font-medium">
              <Gift className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Expected vs paid bonus tracking with deduplication</span>
            </div>
          </div>

          {/* 1-Click Demo Shortcut */}
          <div className="rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Want to test immediately?
              </span>
            </div>
            <button
              type="button"
              onClick={handleQuickDemoAccess}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-indigo-900 py-2.5 px-4 text-xs font-bold shadow-md hover:bg-indigo-50 transition-colors disabled:opacity-50"
            >
              <span>Instant 1-Click Demo Access</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {isRegister ? 'Initial Account Setup' : 'Welcome to SalaryDetails'}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isRegister
                ? 'Create your master personal account to securely manage your compensation records'
                : 'Enter your credentials to access your private financial dashboard'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
              {/* Forgot password link */}
              { !showForgot && (
                <div className="text-right mb-2">
                  <button type="button" onClick={() => setShowForgot(true)} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
                    Forgot password?
                  </button>
                </div>
              ) }
            {isRegister && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Aditya Sharma"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="aditya@salarydetails.app"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength="6"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : isRegister ? 'Initialize Account' : 'Sign In to Dashboard'}
            </button>
          </form>

          {/* Toggle Register / Login */}
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            {isRegister ? (
              <p>
                Already initialized your account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  Sign in here
                </button>
              </p>
            ) : (
              <p>
                First time using SalaryDetails?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  Create initial account
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
