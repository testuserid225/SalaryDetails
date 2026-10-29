import React, { useState, useEffect } from 'react';
import {
  Gift,
  Plus,
  Download,
  Filter,
  CheckCircle,
  Clock,
  Sparkles,
  Trophy,
  ArrowUpRight,
  Building,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  DollarSign,
  Calculator,
  TrendingUp,
} from 'lucide-react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import ConfirmModal from '../components/ConfirmModal';
import { formatDate, getMonthName } from '../utils/formatters';

const monthsList = [
  { value: 1, label: 'January (1)' },
  { value: 2, label: 'February (2)' },
  { value: 3, label: 'March (3)' },
  { value: 4, label: 'April (4)' },
  { value: 5, label: 'May (5)' },
  { value: 6, label: 'June (6)' },
  { value: 7, label: 'July (7)' },
  { value: 8, label: 'August (8)' },
  { value: 9, label: 'September (9)' },
  { value: 10, label: 'October (10)' },
  { value: 11, label: 'November (11)' },
  { value: 12, label: 'December (12)' },
];

const bonusStatuses = [
  'Paid',
  'Unpaid',
  'No Bonus',
  'Given',
  'Pending',
  'Partially Given',
  'Cancelled',
];

const BonusManagement = () => {
  const { formatCurrency } = useSettings();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [bonuses, setBonuses] = useState([]);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({ companies: [], types: [] });

  // Filter States
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Inline Row State (No Modal)
  const defaultNewBonus = () => ({
    bonusMonth: new Date().getMonth() + 1,
    bonusYear: new Date().getFullYear(),
    monthlyBonusAmount: '',
    monthlyBonusGiven: '',
    deductionAmount: 0,
    status: 'Given',
    companyName: selectedCompany || filters.companies?.[0] || 'Current Employer',
    notes: '',
  });

  const [newBonusRow, setNewBonusRow] = useState(null);
  const [savingRow, setSavingRow] = useState(false);
  const [editingBonusId, setEditingBonusId] = useState(null);
  const [editingBonusData, setEditingBonusData] = useState({});

  // Delete Confirm Modal
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Paid Bonus Settlement Grid State
  const [isEditingPaidBonus, setIsEditingPaidBonus] = useState(false);
  const [paidBonusInput, setPaidBonusInput] = useState('');
  const [savingPaidBonus, setSavingPaidBonus] = useState(false);

  useEffect(() => {
    if (!isEditingPaidBonus && stats.paidBonusAmount !== undefined) {
      setPaidBonusInput(stats.paidBonusAmount);
    }
  }, [stats.paidBonusAmount, isEditingPaidBonus]);

  const handleSavePaidBonus = async () => {
    try {
      setSavingPaidBonus(true);
      const val = Math.max(0, Number(paidBonusInput) || 0);
      const res = await api.put('/bonuses/paid-bonus-amount', { paidBonusAmount: val });
      if (res.success) {
        showToast('Paid Bonus Amount updated successfully');
        setIsEditingPaidBonus(false);
        fetchBonuses();
      }
    } catch (error) {
      showToast(error.message || 'Failed to update Paid Bonus Amount', 'error');
    } finally {
      setSavingPaidBonus(false);
    }
  };

  const fetchBonuses = async () => {
    try {
      setLoading(true);
      const params = {
        status: selectedStatus,
        company: selectedCompany,
        year: selectedYear,
      };

      const res = await api.get('/bonuses', params);
      if (res.success) {
        setBonuses(res.data || []);
        setStats(res.stats || {});
        setFilters(res.filters || { companies: [], types: [] });
      }
    } catch (error) {
      showToast(error.message || 'Failed to fetch bonus records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBonuses();
  }, [selectedStatus, selectedCompany, selectedYear]);

  // Real-time calculation helper for inline bonus row
  const calculateBonusRow = (row, changedField, val) => {
    const updated = { ...row, [changedField]: val };
    const numVal = Number(val) || 0;

    if (changedField === 'monthlyBonusAmount') {
      const currentDed = Number(updated.deductionAmount) || 0;
      if (currentDed > 0) {
        updated.monthlyBonusGiven = Math.max(0, Number((numVal - currentDed).toFixed(2)));
      } else {
        updated.monthlyBonusGiven = numVal;
      }
      if (Number(updated.monthlyBonusGiven) > 0 && updated.status === 'Pending') {
        updated.status = 'Given';
      }
    } else if (changedField === 'monthlyBonusGiven') {
      const totalAmt = Number(updated.monthlyBonusAmount) || 0;
      updated.deductionAmount = Math.max(0, Number((totalAmt - numVal).toFixed(2)));
      if (numVal > 0 && updated.status === 'Pending') {
        updated.status = 'Given';
      } else if (numVal === 0 && totalAmt > 0) {
        updated.status = 'Pending';
      }
    } else if (changedField === 'deductionAmount') {
      const totalAmt = Number(updated.monthlyBonusAmount) || 0;
      updated.monthlyBonusGiven = Math.max(0, Number((totalAmt - numVal).toFixed(2)));
      if (Number(updated.monthlyBonusGiven) > 0 && updated.status === 'Pending') {
        updated.status = 'Given';
      }
    }

    return updated;
  };

  const handleStartAddRow = () => {
    setEditingBonusId(null);
    setNewBonusRow(defaultNewBonus());
  };

  const handleNewRowChange = (field, value) => {
    setNewBonusRow((prev) => calculateBonusRow(prev, field, value));
  };

  const handleSaveNewRow = async () => {
    if (!newBonusRow) return;
    if (!newBonusRow.monthlyBonusAmount || Number(newBonusRow.monthlyBonusAmount) <= 0) {
      showToast('Please enter a valid Monthly Bonus Amount', 'error');
      return;
    }
    setSavingRow(true);
    try {
      await api.post('/bonuses', {
        ...newBonusRow,
        bonusMonth: Number(newBonusRow.bonusMonth),
        bonusYear: Number(newBonusRow.bonusYear),
        monthlyBonusAmount: Number(newBonusRow.monthlyBonusAmount) || 0,
        monthlyBonusGiven: Number(newBonusRow.monthlyBonusGiven) || 0,
        deductionAmount: Number(newBonusRow.deductionAmount) || 0,
        bonusAmount: Number(newBonusRow.monthlyBonusGiven) || Number(newBonusRow.monthlyBonusAmount) || 0,
      });
      showToast('Monthly bonus row added to grid successfully');
      setNewBonusRow(null);
      fetchBonuses();
    } catch (error) {
      showToast(error.message || 'Failed to save bonus row', 'error');
    } finally {
      setSavingRow(false);
    }
  };

  const handleStartEditRow = (b) => {
    setNewBonusRow(null);
    setEditingBonusId(b._id);

    const bAmt = b.monthlyBonusAmount || b.bonusAmount || '';
    const bGiven = b.monthlyBonusGiven !== undefined ? b.monthlyBonusGiven : (b.bonusStatus === 'Paid' ? bAmt : '');
    const bDed = b.deductionAmount !== undefined ? b.deductionAmount : (bAmt && bGiven !== '' ? Math.max(0, Number(bAmt) - Number(bGiven)) : 0);
    const bStatus = b.status || (b.bonusStatus === 'Paid' ? 'Given' : (b.bonusStatus || 'Given'));

    let bMonth = b.bonusMonth;
    let bYear = b.bonusYear;
    if (!bMonth) {
      const d = b.actualPaymentDate || b.expectedPaymentDate || b.createdAt;
      bMonth = d ? new Date(d).getMonth() + 1 : new Date().getMonth() + 1;
      bYear = d ? new Date(d).getFullYear() : new Date().getFullYear();
    }

    setEditingBonusData({
      companyName: b.companyName || 'Current Employer',
      bonusMonth: bMonth,
      bonusYear: bYear || new Date().getFullYear(),
      monthlyBonusAmount: bAmt,
      monthlyBonusGiven: bGiven,
      deductionAmount: bDed,
      status: bStatus,
      notes: b.notes || b.bonusReason || '',
    });
  };

  const handleEditRowChange = (field, value) => {
    setEditingBonusData((prev) => calculateBonusRow(prev, field, value));
  };

  const handleSaveEditRow = async () => {
    if (!editingBonusId || !editingBonusData) return;
    setSavingRow(true);
    try {
      await api.put(`/bonuses/${editingBonusId}`, {
        ...editingBonusData,
        bonusMonth: Number(editingBonusData.bonusMonth),
        bonusYear: Number(editingBonusData.bonusYear),
        monthlyBonusAmount: Number(editingBonusData.monthlyBonusAmount) || 0,
        monthlyBonusGiven: Number(editingBonusData.monthlyBonusGiven) || 0,
        deductionAmount: Number(editingBonusData.deductionAmount) || 0,
        bonusAmount: Number(editingBonusData.monthlyBonusGiven) || Number(editingBonusData.monthlyBonusAmount) || 0,
      });
      showToast('Monthly bonus updated in grid');
      setEditingBonusId(null);
      setEditingBonusData({});
      fetchBonuses();
    } catch (error) {
      showToast(error.message || 'Failed to update bonus row', 'error');
    } finally {
      setSavingRow(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/bonuses/${deleteId}`);
      showToast('Bonus record deleted');
      setDeleteId(null);
      fetchBonuses();
    } catch (error) {
      showToast(error.message || 'Failed to delete bonus', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      await api.downloadBlob('/bonuses/export/csv', `salarydetails-bonuses-${new Date().toISOString().split('T')[0]}.csv`);
      showToast('Bonuses exported to CSV successfully');
    } catch (error) {
      showToast('Failed to export CSV', 'error');
    }
  };

  // Compute column totals for grid footer
  const totalBonusAmount = bonuses.reduce(
    (acc, b) => acc + (b.monthlyBonusAmount || b.bonusAmount || 0),
    0
  );
  const totalBonusGiven = bonuses.reduce(
    (acc, b) => acc + (b.monthlyBonusGiven !== undefined ? b.monthlyBonusGiven : (b.bonusStatus === 'Paid' ? (b.bonusAmount || 0) : 0)),
    0
  );
  const totalDeductions = bonuses.reduce(
    (acc, b) => {
      const bAmt = b.monthlyBonusAmount || b.bonusAmount || 0;
      const bGiv = b.monthlyBonusGiven !== undefined ? b.monthlyBonusGiven : (b.bonusStatus === 'Paid' ? bAmt : 0);
      return acc + (b.deductionAmount !== undefined ? b.deductionAmount : Math.max(0, bAmt - bGiv));
    },
    0
  );

  if (loading && bonuses.length === 0) {
    return <LoadingSpinner text="Loading monthly bonus grid..." />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Bonus Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monthly bonus grid tracking: Monthly Bonus Amount, Bonus Given, Deductions, and Status
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            onClick={handleStartAddRow}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Row in Grid
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Monthly Amount"
          value={formatCurrency(stats.totalMonthlyBonusAmount || 0)}
          subvalue="Scheduled bonus entitlement"
          icon={DollarSign}
          color="yellow"
          badge="Entitled"
        />

        <StatCard
          title="Total Monthly Bonus Given"
          value={formatCurrency(stats.totalMonthlyBonusGiven || stats.totalBonusesPaid || 0)}
          subvalue={`${stats.givenCount || stats.paidCount || 0} bonuses disbursed in bank`}
          icon={Gift}
          color="emerald"
          badge="Disbursed"
        />

        <StatCard
          title="Total Deduction Amount"
          value={formatCurrency(
            Math.max(
              0,
              (stats.totalMonthlyBonusAmount || 0) -
              (stats.totalMonthlyBonusGiven || stats.totalBonusesPaid || 0)
            )
          )}
          subvalue="Total Monthly Amount - Total Bonus Given"
          icon={AlertCircle}
          color="rose"
          badge="Deductions"
        />

        <StatCard
          title="Remaining to Paid Bonus"
          value={formatCurrency(
            (stats.totalMonthlyBonusGiven || 0) -
            (isEditingPaidBonus ? (Number(paidBonusInput) || 0) : (stats.paidBonusAmount || 0))
          )}
          subvalue="Total Bonus Given - Paid Bonus"
          icon={TrendingUp}
          color="indigo"
          badge="Remaining"
        />
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Statuses</option>
              <option value="Given">Given / Paid</option>
              <option value="Pending">Pending / Expected</option>
              <option value="Partially Given">Partially Given</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Companies</option>
              {filters.companies?.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="number"
              placeholder="Filter by Year (e.g. 2024)"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Separate Top Grid: Paid Bonus Amount */}
      <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white shadow-sm overflow-hidden dark:bg-slate-900">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Paid Bonus Amount Grid
            </h3>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              Settlement Calculation
            </span>
          </div>

          {/* Top Two Buttons: Edit and Save Changes */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditingPaidBonus(true);
                setPaidBonusInput(stats.paidBonusAmount !== undefined ? stats.paidBonusAmount : 0);
              }}
              disabled={isEditingPaidBonus}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              Edit
            </button>
            <button
              type="button"
              onClick={handleSavePaidBonus}
              disabled={!isEditingPaidBonus || savingPaidBonus}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {savingPaidBonus ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Save Changes
            </button>
            {isEditingPaidBonus && (
              <button
                type="button"
                onClick={() => {
                  setIsEditingPaidBonus(false);
                  setPaidBonusInput(stats.paidBonusAmount || 0);
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#00a2e8] text-white border-b-2 border-[#0081ba] font-extrabold uppercase tracking-wider text-[11px] select-none">
              <tr className="divide-x divide-black/25">
                <th className="px-5 py-3">Paid Bonus Amount</th>
                <th className="px-5 py-3 text-right">Total Monthly Bonus Given</th>
                <th className="px-5 py-3 text-right">Result (Remaining to Paid)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              <tr className="divide-x divide-slate-200 dark:divide-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                {/* Paid Bonus Amount Field */}
                <td className="px-5 py-3">
                  {isEditingPaidBonus ? (
                    <div className="flex items-center gap-2 max-w-xs">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        autoFocus
                        value={paidBonusInput}
                        onChange={(e) => setPaidBonusInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSavePaidBonus();
                          if (e.key === 'Escape') setIsEditingPaidBonus(false);
                        }}
                        className="w-48 rounded-lg border-2 border-sky-500 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 shadow-sm focus:outline-none dark:border-sky-400 dark:bg-slate-800 dark:text-white"
                        placeholder="Enter Paid Bonus Amount..."
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(stats.paidBonusAmount || 0)}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        (Click Edit above to change)
                      </span>
                    </div>
                  )}
                </td>

                {/* Total Monthly Bonus Given */}
                <td className="px-5 py-3 text-right">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(stats.totalMonthlyBonusGiven || 0)}
                  </span>
                </td>

                {/* Result (Total Monthly Bonus Given - Paid Bonus Amount) */}
                <td className="px-5 py-3 text-right">
                  <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                    {formatCurrency(
                      (stats.totalMonthlyBonusGiven || 0) -
                      (isEditingPaidBonus ? (Number(paidBonusInput) || 0) : (stats.paidBonusAmount || 0))
                    )}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bonus Records Grid */}
      <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white shadow-sm overflow-hidden dark:bg-slate-900">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Monthly Bonus Grid
            </h3>
            <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
              Inline Grid Editing
            </span>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {bonuses.length} records in grid
          </span>
        </div>

        {bonuses.length === 0 && !newBonusRow ? (
          <div className="p-10">
            <EmptyState
              icon={Gift}
              title="No Monthly Bonus Records Found"
              description="Record your monthly bonus payments directly in the grid."
              actionLabel="Add First Bonus Row"
              onAction={handleStartAddRow}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Cyan-Blue Header Row from Screenshot */}
              <thead className="bg-[#00a2e8] text-white border-b-2 border-[#0081ba] font-extrabold uppercase tracking-wider text-[11px] select-none">
                <tr className="divide-x divide-black/25">
                  <th className="px-4 py-3.5">Month</th>
                  <th className="px-4 py-3.5 text-right">Monthly Bonus Amount</th>
                  <th className="px-4 py-3.5 text-right">Monthly Bonus Given</th>
                  <th className="px-4 py-3.5 text-right">Deduction Amount</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {/* 1. Inline New Bonus Row added directly into grid */}
                {newBonusRow && (
                  <tr className="divide-x divide-sky-200 dark:divide-sky-900/60 bg-sky-50/70 dark:bg-sky-950/30 border-b-2 border-sky-400 dark:border-sky-600/50 animate-in fade-in duration-200">
                    {/* Month */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={newBonusRow.bonusMonth}
                          onChange={(e) => handleNewRowChange('bonusMonth', Number(e.target.value))}
                          className="px-2 py-1 text-xs font-bold border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          {monthsList.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={newBonusRow.bonusYear}
                          onChange={(e) => handleNewRowChange('bonusYear', Number(e.target.value))}
                          className="w-16 px-1.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </td>

                    {/* Monthly Bonus Amount */}
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Bonus Amount"
                        value={newBonusRow.monthlyBonusAmount}
                        onChange={(e) => handleNewRowChange('monthlyBonusAmount', e.target.value)}
                        className="w-32 px-2.5 py-1 text-xs text-right font-bold border border-sky-400 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-sky-600 dark:bg-slate-800 dark:text-white"
                      />
                    </td>

                    {/* Monthly Bonus Given */}
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Bonus Given"
                        value={newBonusRow.monthlyBonusGiven}
                        onChange={(e) => handleNewRowChange('monthlyBonusGiven', e.target.value)}
                        className="w-32 px-2.5 py-1 text-xs text-right font-extrabold text-emerald-600 border border-emerald-300 rounded bg-emerald-50/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-300"
                      />
                    </td>

                    {/* Deduction Amount */}
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newBonusRow.deductionAmount}
                        onChange={(e) => handleNewRowChange('deductionAmount', e.target.value)}
                        className="w-28 px-2.5 py-1 text-xs text-right font-semibold text-rose-600 border border-rose-300 rounded bg-rose-50/50 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:bg-rose-950/30 dark:border-rose-700 dark:text-rose-400"
                      />
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5 text-center">
                      <select
                        value={newBonusRow.status}
                        onChange={(e) => handleNewRowChange('status', e.target.value)}
                        className="px-2.5 py-1 text-xs font-bold border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {bonusStatuses.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={handleSaveNewRow}
                          disabled={savingRow}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                          title="Save Row"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewBonusRow(null)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* 2. Existing Bonus Rows (Read / Inline Edit) */}
                {bonuses.map((b) => {
                  const isEditing = editingBonusId === b._id;

                  if (isEditing) {
                    return (
                      <tr
                        key={b._id}
                        className="divide-x divide-sky-200 dark:divide-sky-900/60 bg-sky-50/50 dark:bg-sky-950/30 border-b-2 border-sky-400 dark:border-sky-600/50"
                      >
                        {/* Month */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={editingBonusData.bonusMonth}
                              onChange={(e) => handleEditRowChange('bonusMonth', Number(e.target.value))}
                              className="px-2 py-1 text-xs font-bold border border-slate-300 rounded bg-white text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                              {monthsList.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={editingBonusData.bonusYear}
                              onChange={(e) => handleEditRowChange('bonusYear', Number(e.target.value))}
                              className="w-16 px-1.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                          </div>
                        </td>

                        {/* Monthly Bonus Amount */}
                        <td className="px-3 py-2.5 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={editingBonusData.monthlyBonusAmount}
                            onChange={(e) => handleEditRowChange('monthlyBonusAmount', e.target.value)}
                            className="w-32 px-2.5 py-1 text-xs text-right font-bold border border-sky-400 rounded bg-white text-slate-900 dark:border-sky-600 dark:bg-slate-800 dark:text-white"
                          />
                        </td>

                        {/* Monthly Bonus Given */}
                        <td className="px-3 py-2.5 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={editingBonusData.monthlyBonusGiven}
                            onChange={(e) => handleEditRowChange('monthlyBonusGiven', e.target.value)}
                            className="w-32 px-2.5 py-1 text-xs text-right font-extrabold text-emerald-600 border border-emerald-300 rounded bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-300"
                          />
                        </td>

                        {/* Deduction Amount */}
                        <td className="px-3 py-2.5 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={editingBonusData.deductionAmount}
                            onChange={(e) => handleEditRowChange('deductionAmount', e.target.value)}
                            className="w-28 px-2.5 py-1 text-xs text-right font-semibold text-rose-600 border border-rose-300 rounded bg-rose-50/50 dark:bg-rose-950/30 dark:border-rose-700 dark:text-rose-400"
                          />
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5 text-center">
                          <select
                            value={editingBonusData.status}
                            onChange={(e) => handleEditRowChange('status', e.target.value)}
                            className="px-2.5 py-1 text-xs font-bold border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          >
                            {bonusStatuses.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={handleSaveEditRow}
                              disabled={savingRow}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                              title="Update Row"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBonusId(null)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const monthDisplay = b.bonusMonth
                    ? `${getMonthName(b.bonusMonth)} ${b.bonusYear || ''}`
                    : (b.bonusPeriod || '—');
                  const bAmount = b.monthlyBonusAmount || b.bonusAmount || 0;
                  const bGiven = b.monthlyBonusGiven !== undefined
                    ? b.monthlyBonusGiven
                    : (b.bonusStatus === 'Paid' ? bAmount : 0);
                  const bDed = b.deductionAmount !== undefined
                    ? b.deductionAmount
                    : Math.max(0, bAmount - bGiven);
                  const bStatus = b.status || (b.bonusStatus === 'Paid' ? 'Given' : (b.bonusStatus || 'Given'));

                  return (
                    <tr
                      key={b._id}
                      className="divide-x divide-slate-200 dark:divide-slate-800 hover:bg-sky-50/40 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* 1. Month */}
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Gift className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                          <div>
                            <span>{monthDisplay}</span>
                            {b.companyName && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {b.companyName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Monthly Bonus Amount */}
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(bAmount)}
                      </td>

                      {/* 3. Monthly Bonus Given */}
                      <td className="px-4 py-3.5 text-right font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap text-sm bg-emerald-50/20 dark:bg-emerald-950/10">
                        {formatCurrency(bGiven)}
                      </td>

                      {/* 4. Deduction Amount */}
                      <td className="px-4 py-3.5 text-right font-semibold whitespace-nowrap">
                        {bDed > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            -{formatCurrency(bDed)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">₹ 0.00</span>
                        )}
                      </td>

                      {/* 5. Status */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${bStatus === 'Given' || bStatus === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : bStatus === 'Pending' || bStatus === 'Expected'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : bStatus === 'Partially Given'
                                  ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                  : bStatus === 'No Bonus'
                                    ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}
                        >
                          {bStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleStartEditRow(b)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                            title="Edit row in grid"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(b._id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            title="Delete Bonus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals Summary Footer Row */}
              <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs divide-x divide-slate-200 dark:divide-slate-700">
                <tr>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                    Grid Total ({bonuses.length})
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-white">
                    {formatCurrency(totalBonusAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(totalBonusGiven)}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-rose-600 dark:text-rose-400">
                    {totalDeductions > 0 ? `-${formatCurrency(totalDeductions)}` : '₹ 0.00'}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 font-semibold text-[11px]">
                    Summary
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Bonus Record"
        message="Are you sure you want to delete this monthly bonus record?"
      />
    </div>
  );
};

export default BonusManagement;
