import React, { useState } from 'react';
import { Mail, Lock, Key } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

const ForgotPassword = ({ onBack }) => {
  const { showToast } = useToast();
  const [step, setStep] = useState(1); // 1: request token, 2: reset password
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const requestToken = async () => {
    setLoading(true);
    try {
      const res = await api.post('/auth/request-reset', { email });
      // The API returns a resetLink; we extract token for simplicity.
      if (res.resetLink) {
        const url = new URL(res.resetLink);
        const token = url.searchParams.get('token');
        setResetToken(token);
        showToast('Reset token generated. Use it below to set a new password.');
      } else {
        // In case the API only returns a message, still move to step 2.
        setResetToken('');
        showToast('If the email exists, a reset token was generated.');
      }
      setStep(2);
    } catch (e) {
      showToast(e.message || 'Failed to generate reset token.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setLoading(true);
    try {
      await api.post('/auth/reset', { token: resetToken, newPassword });
      showToast('Password reset successfully. You can now sign in.');
      // Return to login view
      onBack();
    } catch (e) {
      showToast(e.message || 'Password reset failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 sm:p-10 flex flex-col justify-center">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
        Forgot Password
      </h3>
      {step === 1 && (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Enter your email address and a temporary reset token will be generated.
          </p>
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={requestToken}
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Reset Token'}
          </button>
        </>
      )}
      {step === 2 && (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Paste the reset token you received and set a new password.
          </p>
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Reset Token
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Token string"
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={resetPassword}
            disabled={loading}
            className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white shadow-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </>
      )}
      <div className="mt-4 text-center">
        <button type="button" onClick={onBack} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          ← Back to Sign In
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;

