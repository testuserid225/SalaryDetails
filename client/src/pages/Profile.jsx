import React, { useState, useEffect } from 'react';
import {
  User,
  Briefcase,
  Building,
  Calendar,
  Clock,
  Save,
  RotateCcw,
  Edit2,
  X,
  CreditCard,
  MapPin,
  Sparkles,
  Lock,
  Mail,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { calculateExperienceFromDate } from '../utils/formatters';

const Profile = () => {
  const { formatCurrency, settings } = useSettings();
  const { showToast } = useToast();
  const { user, updateCredentials } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [serverExperience, setServerExperience] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    newPassword: '',
    confirmPassword: '',
    employeeId: '',
    companyName: '',
    jobTitle: '',
    department: '',
    employmentType: 'Full-time',
    joiningDate: '',
    previousExperienceYears: 0,
    previousExperienceMonths: 0,
    employmentStatus: 'Active',
    currentMonthlyBasicSalary: '',
    currentMonthlyGrossSalary: '',
    currentMonthlyTakeHomeSalary: '',
    currency: settings.currency || 'INR',
    workLocation: '',
    notes: '',
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/profile');
      if (res.success && res.data) {
        const p = res.data;
        const initial = {
          fullName: p.fullName || user?.name || '',
          email: user?.email || '',
          newPassword: '',
          confirmPassword: '',
          employeeId: p.employeeId || '',
          companyName: p.companyName || '',
          jobTitle: p.jobTitle || '',
          department: p.department || '',
          employmentType: p.employmentType || 'Full-time',
          joiningDate: p.joiningDate ? new Date(p.joiningDate).toISOString().split('T')[0] : '',
          previousExperienceYears: p.previousExperienceYears || 0,
          previousExperienceMonths: p.previousExperienceMonths || 0,
          employmentStatus: p.employmentStatus || 'Active',
          currentMonthlyBasicSalary: p.currentMonthlyBasicSalary || '',
          currentMonthlyGrossSalary: p.currentMonthlyGrossSalary || '',
          currentMonthlyTakeHomeSalary: p.currentMonthlyTakeHomeSalary || '',
          currency: p.currency || settings.currency || 'INR',
          workLocation: p.workLocation || '',
          notes: p.notes || '',
        };
        setFormData(initial);
        setOriginalData(initial);
        setServerExperience(res.experience);
        setIsEditing(false);
      } else {
        const initial = {
          fullName: user?.name || '',
          email: user?.email || '',
          newPassword: '',
          confirmPassword: '',
          employeeId: '',
          companyName: '',
          jobTitle: '',
          department: '',
          employmentType: 'Full-time',
          joiningDate: '',
          previousExperienceYears: 0,
          previousExperienceMonths: 0,
          employmentStatus: 'Active',
          currentMonthlyBasicSalary: '',
          currentMonthlyGrossSalary: '',
          currentMonthlyTakeHomeSalary: '',
          currency: settings.currency || 'INR',
          workLocation: '',
          notes: '',
        };
        setFormData(initial);
        setOriginalData(initial);
        setIsEditing(true); // first time setup
      }
    } catch (error) {
      showToast(error.message || 'Failed to fetch employment profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Synchronize email from user context once loaded
  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData((prev) => ({ ...prev, email: user.email }));
      setOriginalData((prev) => (prev ? { ...prev, email: user.email } : prev));
    }
  }, [user]);

  // Real-time live client-side experience calculator
  const liveCurrentCompanyExp = calculateExperienceFromDate(formData.joiningDate);
  const prevY = Number(formData.previousExperienceYears) || 0;
  const prevM = Number(formData.previousExperienceMonths) || 0;
  
  // Total career experience estimate: sum without overlap
  let totalYears = liveCurrentCompanyExp.years + prevY;
  let totalMonths = liveCurrentCompanyExp.months + prevM;
  if (totalMonths >= 12) {
    totalYears += Math.floor(totalMonths / 12);
    totalMonths = totalMonths % 12;
  }
  const liveTotalCareerExp = `${totalYears} yrs, ${totalMonths} mos, ${liveCurrentCompanyExp.days} days`;

  const handleSave = async (e) => {
    e.preventDefault();

    // 1. Validate Email
    if (!formData.email || !formData.email.trim()) {
      showToast('Login email address is required', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      showToast('Please enter a valid email address (e.g. name@domain.com)', 'error');
      return;
    }

    // 2. Validate Password (if user typed something)
    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        showToast('Password and Confirm Password do not match. Please verify.', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      // Step A: Update login credentials if email, password, or name changed
      const emailChanged = formData.email.trim().toLowerCase() !== (user?.email || '').toLowerCase();
      const passwordProvided = Boolean(formData.newPassword && formData.newPassword.trim());
      const nameChanged = formData.fullName.trim() !== (user?.name || '').trim();

      if (emailChanged || passwordProvided || nameChanged) {
        const credRes = await updateCredentials({
          email: formData.email.trim(),
          password: passwordProvided ? formData.newPassword : undefined,
          name: formData.fullName.trim(),
        });

        if (!credRes.success) {
          showToast(credRes.message || 'Failed to update login credentials', 'error');
          setSaving(false);
          return;
        }
      }

      // Step B: Save employment profile details
      const res = await api.put('/profile', formData);
      if (res.success) {
        const successMessage = passwordProvided
          ? 'Profile and login credentials (email & password) updated successfully!'
          : emailChanged
          ? 'Profile and login email updated successfully!'
          : 'Profile updated successfully!';
        showToast(successMessage);

        const updated = {
          ...formData,
          newPassword: '',
          confirmPassword: '',
        };
        setFormData(updated);
        setOriginalData(updated);
        setShowPassword(false);
        setShowConfirmPassword(false);
        setServerExperience(res.experience);
        setIsEditing(false);
      }
    } catch (error) {
      showToast(error.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (originalData) {
      setFormData({
        ...originalData,
        newPassword: '',
        confirmPassword: '',
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
      setIsEditing(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset editable fields to previously saved profile?')) {
      if (originalData) {
        setFormData({
          ...originalData,
          newPassword: '',
          confirmPassword: '',
        });
        setShowPassword(false);
        setShowConfirmPassword(false);
      }
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading employment and personal details..." />;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Personal & Employment Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Maintain your login credentials, official employer details, current compensation, and career experience
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </button>
          ) : (
            <>
              {originalData && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      {/* Live Experience Calculation Banner Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Company Experience */}
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/30">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1">
            <Clock className="h-4 w-4" />
            <span>Current Company Tenure</span>
          </div>
          <div className="text-xl font-extrabold text-indigo-950 dark:text-indigo-100">
            {formData.joiningDate ? liveCurrentCompanyExp.formatted : 'Enter Joining Date'}
          </div>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 block">
            Calculated live from {formData.joiningDate || 'joining date'} to today
          </span>
        </div>

        {/* Previous Work Experience */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            <Briefcase className="h-4 w-4 text-slate-500" />
            <span>Previous Work Experience</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white">
            {prevY} {prevY === 1 ? 'year' : 'years'}, {prevM} {prevM === 1 ? 'month' : 'months'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Prior employment before {formData.companyName || 'current company'}
          </span>
        </div>

        {/* Total Career Experience */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-1">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>Total Career Experience</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-950 dark:text-emerald-100">
            {serverExperience?.totalCareerExperience?.formatted || liveTotalCareerExp}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">
            Non-overlapping merged career duration
          </span>
        </div>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
        
        {/* Section 0: Application Login Credentials */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/40 p-5 sm:p-6 dark:border-indigo-900/50 dark:bg-slate-800/60 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-indigo-100/80 dark:border-indigo-900/40 gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  Application Login & Access Credentials
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-950/80 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                    Sign In Credentials
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This email and password are used to log in and access your SalaryDetails account
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Login Email Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Login Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  disabled={!isEditing}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. aditya@salarydetails.app"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2 text-sm text-slate-900 font-medium focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-100/70 dark:disabled:bg-slate-800/40"
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Used to log into this application
              </p>
            </div>

            {/* Login Password / New Password Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                {isEditing ? 'New Password (Optional)' : 'Login Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  disabled={!isEditing}
                  value={isEditing ? formData.newPassword : '••••••••••••'}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder={isEditing ? 'Leave blank to keep current' : '••••••••••••'}
                  minLength={6}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 py-2 text-sm text-slate-900 font-medium focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-100/70 dark:disabled:bg-slate-800/40 tracking-wider"
                />
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {isEditing ? 'Enter min 6 characters to change password' : 'Encrypted with bcrypt in MongoDB'}
              </p>
            </div>

            {/* Confirm New Password (during edit) or Active Status Badge (view mode) */}
            {isEditing ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    disabled={!isEditing || !formData.newPassword}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder={formData.newPassword ? 'Re-enter new password' : 'Type new password first'}
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 py-2 text-sm text-slate-900 font-medium focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-100/70 dark:disabled:bg-slate-800/40 tracking-wider"
                  />
                  {isEditing && formData.newPassword && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Must match the new password above
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Security Status
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Verified Login Credentials</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Click &quot;Edit Profile&quot; to change login email or password
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 1: Personal and Company Info */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Building className="h-5 w-5 text-indigo-500" />
            Company & Employment Overview
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                disabled={!isEditing}
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Aditya Sharma"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Employee ID (Optional)
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="e.g. EMP-10492"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                disabled={!isEditing}
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="e.g. Apex Cloud Technologies"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Job Title / Designation *
              </label>
              <input
                type="text"
                required
                disabled={!isEditing}
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="e.g. Senior Software Engineer"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Department
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Engineering & Architecture"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Employment Type
              </label>
              <select
                disabled={!isEditing}
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/40"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Dates and Experience Details */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-500" />
            Joining Date & Career Experience
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Joining Date (Current Co.) *
              </label>
              <input
                type="date"
                required
                disabled={!isEditing}
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Previous Exp (Years)
              </label>
              <input
                type="number"
                min="0"
                disabled={!isEditing}
                value={formData.previousExperienceYears}
                onChange={(e) => setFormData({ ...formData, previousExperienceYears: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Previous Exp (Months)
              </label>
              <input
                type="number"
                min="0"
                max="11"
                disabled={!isEditing}
                value={formData.previousExperienceMonths}
                onChange={(e) => setFormData({ ...formData, previousExperienceMonths: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Employment Status
              </label>
              <select
                disabled={!isEditing}
                value={formData.employmentStatus}
                onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/40"
              >
                <option value="Active">Active</option>
                <option value="Resigned">Resigned</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Current Monthly Compensation Snapshot */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-500" />
            Current Monthly Compensation Structure
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Monthly Basic Salary ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={!isEditing}
                value={formData.currentMonthlyBasicSalary}
                onChange={(e) => setFormData({ ...formData, currentMonthlyBasicSalary: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/40 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Monthly Gross Salary ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={!isEditing}
                value={formData.currentMonthlyGrossSalary}
                onChange={(e) => setFormData({ ...formData, currentMonthlyGrossSalary: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/40 font-semibold text-indigo-600 dark:text-indigo-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Monthly Take-Home (Net) ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={!isEditing}
                value={formData.currentMonthlyTakeHomeSalary}
                onChange={(e) => setFormData({ ...formData, currentMonthlyTakeHomeSalary: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/40 font-semibold text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Location and Additional Notes */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Work Location
            </label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.workLocation}
              onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
              placeholder="e.g. Bengaluru, India (Hybrid)"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/40"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Personal Notes / Career Goals
            </label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Lead architect for cloud migrations"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/40"
            />
          </div>
        </div>

        {/* Save Bar */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {originalData && (
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Profile;
