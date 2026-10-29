import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Plus,
  Download,
  Upload,
  Search,
  Filter,
  ArrowUpDown,
  Star,
  Edit2,
  Trash2,
  Check,
  X,
  CheckCircle,
  Clock,
  Building,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Wallet,
  PiggyBank,
} from 'lucide-react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, TableSkeleton } from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import ImportSalaryModal from '../components/ImportSalaryModal';
import ConfirmModal from '../components/ConfirmModal';
import { formatDate, getMonthName } from '../utils/formatters';

const monthsList = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

// Helper: Calculate working days (Mon-Fri, excluding Sat & Sun) for cycle: 24th prev month to 23rd current month
const calculateSalaryCycleWorkingDays = (month, year) => {
  const m = Number(month) || (new Date().getMonth() + 1);
  const y = Number(year) || new Date().getFullYear();
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;

  const startDate = new Date(Date.UTC(prevY, prevM - 1, 24));
  const endDate = new Date(Date.UTC(y, m - 1, 23));

  let count = 0;
  let cur = new Date(startDate);
  while (cur <= endDate) {
    const day = cur.getUTCDay(); // 0 is Sun, 6 is Sat
    if (day !== 0 && day !== 6) {
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count > 0 ? count : 22;
};

const SalaryManagement = () => {
  const { formatCurrency, settings } = useSettings();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [salaries, setSalaries] = useState([]);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({ companies: [], years: [] });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, pages: 1, total: 0 });

  // Filter & Search State
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('salaryYear');
  const [sortOrder, setSortOrder] = useState('desc');

  // Inline Row State (Add & Edit in Grid)
  const defaultNewSalary = () => {
    const curMonth = new Date().getMonth() + 1;
    const curYear = new Date().getFullYear();
    const defaultDays = calculateSalaryCycleWorkingDays(curMonth, curYear);
    const isFromFeb2026 = curYear > 2026 || (curYear === 2026 && curMonth >= 2);
    const defaultPt = 200;
    const defaultPf = isFromFeb2026 ? 4800 : 1800;
    const defaultEsic = isFromFeb2026 ? 800 : 0;
    const defaultDiff = defaultPt + defaultPf + defaultEsic;
    return {
      companyName: selectedCompany || filters.companies?.[0] || 'Current Employer',
      salaryMonth: curMonth,
      salaryYear: curYear,
      createdDate: new Date().toISOString().split('T')[0],
      salary: '',
      pt: defaultPt,
      pfAmount: defaultPf,
      esic: defaultEsic,
      differencePerMonthAmount: defaultDiff,
      workingDays: defaultDays,
      perDaySalary: '',
      leaveDeductionAmount: 0,
      leaveTaken: 0,
      amount: '',
      remark: '',
      paymentStatus: 'Received',
    };
  };

  const [newRow, setNewRow] = useState(null);
  const [savingRow, setSavingRow] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingRowData, setEditingRowData] = useState({});

  // Modals (Import CSV & Delete Confirm)
  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSalaries = useCallback(async (page = pagination.page) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        year: selectedYear,
        company: selectedCompany,
        paymentStatus: selectedStatus,
        search,
        sortBy,
        sortOrder,
      };

      const res = await api.get('/salaries', params);
      if (res.success) {
        setSalaries(res.data || []);
        setStats(res.stats || {});
        setFilters(res.filters || { companies: [], years: [] });
        setPagination(res.pagination || { page: 1, limit: 10, pages: 1, total: 0 });
      }
    } catch (error) {
      showToast(error.message || 'Failed to fetch salary records', 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, selectedYear, selectedCompany, selectedStatus, search, sortBy, sortOrder, showToast]);

  useEffect(() => {
    fetchSalaries(1);
  }, [selectedYear, selectedCompany, selectedStatus, search, sortBy, sortOrder]);

  // Real-time calculation helper for inline salary row
  const calculateSalaryRow = (row, changedField, val) => {
    const updated = { ...row, [changedField]: val };

    // Automatically recalculate workingDays, PF and ESIC from salary cycle when salaryMonth, salaryYear, or createdDate changes
    if (changedField === 'salaryMonth' || changedField === 'salaryYear') {
      const m = Number(changedField === 'salaryMonth' ? val : updated.salaryMonth);
      const y = Number(changedField === 'salaryYear' ? val : updated.salaryYear);
      updated.workingDays = calculateSalaryCycleWorkingDays(m, y);
      const isFromFeb2026 = y > 2026 || (y === 2026 && m >= 2);
      if (updated.pfAmount === 1800 || updated.pfAmount === 4800 || updated.pfAmount === '' || updated.pfAmount === undefined) {
        updated.pfAmount = isFromFeb2026 ? 4800 : 1800;
      }
      if (updated.esic === 0 || updated.esic === 800 || updated.esic === '' || updated.esic === undefined) {
        updated.esic = isFromFeb2026 ? 800 : 0;
      }
    } else if (changedField === 'createdDate' && val) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const cMonth = d.getMonth() + 1;
        const cYear = d.getFullYear();
        updated.salaryMonth = cMonth;
        updated.salaryYear = cYear;
        updated.workingDays = calculateSalaryCycleWorkingDays(cMonth, cYear);
        const isFromFeb2026 = cYear > 2026 || (cYear === 2026 && cMonth >= 2);
        if (updated.pfAmount === 1800 || updated.pfAmount === 4800 || updated.pfAmount === '' || updated.pfAmount === undefined) {
          updated.pfAmount = isFromFeb2026 ? 4800 : 1800;
        }
        if (updated.esic === 0 || updated.esic === 800 || updated.esic === '' || updated.esic === undefined) {
          updated.esic = isFromFeb2026 ? 800 : 0;
        }
      }
    }

    const sal = Number(changedField === 'salary' ? val : updated.salary) || 0;
    const wDays = Number(changedField === 'workingDays' ? val : updated.workingDays) > 0
      ? Number(changedField === 'workingDays' ? val : updated.workingDays)
      : calculateSalaryCycleWorkingDays(updated.salaryMonth, updated.salaryYear);

    // 1. Per day salary = Salary / Working Day's
    const perDay = sal > 0 ? Number((sal / wDays).toFixed(2)) : 0;
    if (changedField !== 'perDaySalary') {
      updated.perDaySalary = perDay > 0 ? perDay : '';
    }

    // 2. Leave Deduction Amount = Per day salary * Leave Taken
    const lTaken = Number(changedField === 'leaveTaken' ? val : updated.leaveTaken) || 0;
    const currentPerDay = Number(updated.perDaySalary) || perDay;
    const calcLeaveDed = Number((currentPerDay * lTaken).toFixed(2));
    if (changedField !== 'leaveDeductionAmount') {
      updated.leaveDeductionAmount = calcLeaveDed;
    }

    // 3. Difference Per Month Amount = PT + PF Amount + ESIC
    const pt = Number(changedField === 'pt' ? val : updated.pt) || 0;
    const pf = Number(changedField === 'pfAmount' ? val : updated.pfAmount) || 0;
    const esic = Number(changedField === 'esic' ? val : updated.esic) || 0;
    const calculatedDiff = Number((pt + pf + esic).toFixed(2));

    if (changedField === 'differencePerMonthAmount') {
      updated.differencePerMonthAmount = val !== '' ? Number(val) : '';
    } else {
      updated.differencePerMonthAmount = calculatedDiff;
    }

    const diff = Number(updated.differencePerMonthAmount) || calculatedDiff;
    const lDed = Number(updated.leaveDeductionAmount) || 0;

    // 4. Amount = Salary - Difference Per Month Amount - Leave Deduction Amount
    const calcNet = sal > 0 ? Number((sal - diff - lDed).toFixed(2)) : 0;

    if (changedField !== 'amount') {
      updated.amount = calcNet > 0 ? calcNet : '';
    }

    return updated;
  };

  const handleStartAddRow = () => {
    setEditingRowId(null);
    setNewRow(defaultNewSalary());
  };

  const handleNewRowChange = (field, value) => {
    setNewRow((prev) => calculateSalaryRow(prev, field, value));
  };

  const handleSaveNewRow = async () => {
    if (!newRow) return;
    if (!newRow.salary || Number(newRow.salary) <= 0) {
      showToast('Please enter a valid Salary amount', 'error');
      return;
    }
    setSavingRow(true);
    try {
      await api.post('/salaries', {
        ...newRow,
        salary: Number(newRow.salary),
        workingDays: Number(newRow.workingDays) || 30,
        perDaySalary: Number(newRow.perDaySalary) || 0,
        leaveTaken: Number(newRow.leaveTaken) || 0,
        leaveDeductionAmount: Number(newRow.leaveDeductionAmount) || 0,
        pt: Number(newRow.pt) || 0,
        pfAmount: Number(newRow.pfAmount) || 0,
        esic: Number(newRow.esic) || 0,
        differencePerMonthAmount: Number(newRow.differencePerMonthAmount) || 0,
        amount: Number(newRow.amount) || 0,
        companyName: newRow.companyName || filters.companies?.[0] || 'Current Employer',
        notes: newRow.remark,
      });
      showToast('Salary record added to grid successfully');
      setNewRow(null);
      fetchSalaries(1);
    } catch (error) {
      showToast(error.message || 'Failed to save salary row', 'error');
    } finally {
      setSavingRow(false);
    }
  };

  const handleStartEditRow = (s) => {
    setNewRow(null);
    setEditingRowId(s._id);
    const m = s.salaryMonth || 1;
    const y = s.salaryYear || new Date().getFullYear();
    const cycleDays = calculateSalaryCycleWorkingDays(m, y);
    const isFromFeb2026 = y > 2026 || (y === 2026 && m >= 2);

    setEditingRowData({
      companyName: s.companyName || 'Current Employer',
      salaryMonth: m,
      salaryYear: y,
      createdDate: s.createdDate
        ? new Date(s.createdDate).toISOString().split('T')[0]
        : (s.effectiveDate ? new Date(s.effectiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      salary: s.salary ?? s.grossSalary ?? '',
      pt: s.pt ?? 200,
      pfAmount: s.pfAmount ?? (isFromFeb2026 ? 4800 : 1800),
      esic: s.esic ?? (isFromFeb2026 ? 800 : 0),
      differencePerMonthAmount: s.differencePerMonthAmount ?? 0,
      workingDays: s.workingDays > 0 ? s.workingDays : cycleDays,
      perDaySalary: s.perDaySalary ?? '',
      leaveDeductionAmount: s.leaveDeductionAmount ?? 0,
      leaveTaken: s.leaveTaken ?? 0,
      amount: s.amount ?? s.takeHomeSalary ?? '',
      remark: s.remark || s.notes || '',
      paymentStatus: s.paymentStatus || 'Received',
    });
  };

  const handleEditRowChange = (field, value) => {
    setEditingRowData((prev) => calculateSalaryRow(prev, field, value));
  };

  const handleSaveEditRow = async () => {
    if (!editingRowId || !editingRowData) return;
    setSavingRow(true);
    try {
      await api.put(`/salaries/${editingRowId}`, {
        ...editingRowData,
        salary: Number(editingRowData.salary),
        workingDays: Number(editingRowData.workingDays) || 30,
        perDaySalary: Number(editingRowData.perDaySalary) || 0,
        leaveTaken: Number(editingRowData.leaveTaken) || 0,
        leaveDeductionAmount: Number(editingRowData.leaveDeductionAmount) || 0,
        pt: Number(editingRowData.pt) || 0,
        pfAmount: Number(editingRowData.pfAmount) || 0,
        esic: Number(editingRowData.esic) || 0,
        differencePerMonthAmount: Number(editingRowData.differencePerMonthAmount) || 0,
        amount: Number(editingRowData.amount) || 0,
        notes: editingRowData.remark,
      });
      showToast('Salary record updated in grid');
      setEditingRowId(null);
      setEditingRowData({});
      fetchSalaries();
    } catch (error) {
      showToast(error.message || 'Failed to update salary row', 'error');
    } finally {
      setSavingRow(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/salaries/${deleteId}`);
      showToast('Salary record deleted');
      setDeleteId(null);
      fetchSalaries();
    } catch (error) {
      showToast(error.message || 'Failed to delete record', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      await api.downloadBlob('/salaries/export/csv', `salarydetails-salaries-${new Date().toISOString().split('T')[0]}.csv`);
      showToast('Salary records exported to CSV successfully');
    } catch (error) {
      showToast('Failed to export CSV', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Salary Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track monthly payroll slips, gross earnings, take-home net pay, and deductions in grid format
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            onClick={handleStartAddRow}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Row in Grid
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Salary Amount"
          value={formatCurrency(stats.totalSalary || stats.totalReceivedGross || 0)}
          subvalue="Gross / Base earnings across all slips"
          icon={Wallet}
          color="yellow"
          badge="Total Base"
        />
        <StatCard
          title="Total PF Amount"
          value={formatCurrency(stats.totalPF || 0)}
          subvalue="Provident Fund deductions across slips"
          icon={PiggyBank}
          color="yellow"
          badge="PF Total"
        />
        <StatCard
          title="Total Net Received"
          value={formatCurrency(stats.totalAmount || stats.totalReceivedTakeHome || 0)}
          subvalue="Actual credited Take-Home cash in bank"
          icon={Receipt}
          color="emerald"
          badge="Credited"
        />
        <StatCard
          title="Difference Per Month Amount Total"
          value={formatCurrency(
            stats.totalDiff ||
            ((stats.totalPT || 0) + (stats.totalPF || 0) + (stats.totalESIC || 0))
          )}
          subvalue="PT + PF Amount + ESIC"
          icon={CreditCard}
          color="indigo"
          badge="PT+PF+ESIC"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company or remark..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Years</option>
              {filters.years?.map((y) => {
                const val = typeof y === 'object' ? y.value : y;
                const label = typeof y === 'object' ? y.label : (String(y).includes('-') ? `Sep ${String(y).split('-')[0]} - Aug ${String(y).split('-')[1]}` : `Year ${y}`);
                return (
                  <option key={val} value={val}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Statuses</option>
              <option value="Received">Received Only</option>
              <option value="Expected">Expected Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Salary Records Grid */}
      <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white shadow-sm overflow-hidden dark:bg-slate-900">
        {/* Top-Left Next/Prev Pagination Controls (Directly above column names) */}
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() => fetchSalaries(pagination.page + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Next page records"
            >
              <span>Next Page</span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchSalaries(pagination.page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
              title="Previous page records"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </button>

            <div className="flex items-center gap-1.5 pl-2 text-xs font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
              <span>
                Page <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{pagination.page}</strong> of <strong>{pagination.pages || 1}</strong>
              </span>
              <span className="text-[11px] text-slate-400">
                ({pagination.total} records • 10 / page)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-950/60 px-2 py-0.5 text-[10px] font-bold text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700">
              10 Records Per Page
            </span>
            {pagination.total > 0 && (
              <span>
                Showing {(pagination.page - 1) * 10 + 1} - {Math.min(pagination.page * 10, pagination.total)} of {pagination.total}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading && !newRow ? (
            <div className="p-6">
              <TableSkeleton rows={6} cols={14} />
            </div>
          ) : salaries.length === 0 && !newRow ? (
            <div className="p-12">
              <EmptyState
                icon={Receipt}
                title="No Salary Slips Found"
                description={
                  search || selectedCompany || selectedYear
                    ? 'No records match your selected filters. Try adjusting your search query.'
                    : 'Start maintaining your salary history by adding your first row in the grid.'
                }
                actionLabel="Add First Salary Row"
                onAction={handleStartAddRow}
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
              {/* Yellow Header Row from Screenshot */}
              <thead className="bg-yellow-300 dark:bg-yellow-400/25 text-slate-950 dark:text-yellow-200 border-b-2 border-yellow-400 dark:border-yellow-600/40 font-bold uppercase tracking-wider text-[11px] select-none">
                <tr className="divide-x divide-black/25">
                  <th className="px-3 py-3 text-center w-24">Actions</th>
                  <th className="px-3 py-3">Month</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3">Salary</th>
                  <th className="px-3 py-3">PT</th>
                  <th className="px-3 py-3">PF Amount</th>
                  <th className="px-3 py-3">ESIC</th>
                  <th className="px-3 py-3">Difference Per Month Amount</th>
                  <th className="px-3 py-3 text-center">Working Day's</th>
                  <th className="px-3 py-3">Per day Salary</th>
                  <th className="px-3 py-3">Leave Deduction Amount</th>
                  <th className="px-3 py-3 text-center">Leave Taken</th>
                  <th className="px-3 py-3">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {/* 1. Inline New Row Insertion directly in grid */}
                {newRow && (
                  <tr className="divide-x divide-amber-200 dark:divide-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 border-b-2 border-amber-400 dark:border-amber-600/50 animate-in fade-in duration-200">
                    {/* Save / Cancel Actions */}
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
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
                          onClick={() => setNewRow(null)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>

                    {/* Month */}
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <select
                          value={newRow.salaryMonth}
                          onChange={(e) => handleNewRowChange('salaryMonth', Number(e.target.value))}
                          className="px-1.5 py-1 text-xs font-bold border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          {monthsList.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={newRow.salaryYear}
                          onChange={(e) => handleNewRowChange('salaryYear', Number(e.target.value))}
                          className="w-16 px-1.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </td>

                    {/* Amount (Auto-calculated / Editable) */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Net Amount"
                        value={newRow.amount}
                        onChange={(e) => handleNewRowChange('amount', e.target.value)}
                        className="w-28 px-2 py-1 text-xs font-extrabold text-emerald-600 border border-emerald-300 rounded bg-emerald-50/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-300"
                      />
                    </td>

                    {/* Created Date */}
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        value={newRow.createdDate}
                        onChange={(e) => handleNewRowChange('createdDate', e.target.value)}
                        className="w-32 px-1.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono text-[11px]"
                      />
                    </td>

                    {/* Salary */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Salary"
                        value={newRow.salary}
                        onChange={(e) => handleNewRowChange('salary', e.target.value)}
                        className="w-28 px-2 py-1 text-xs font-bold border border-indigo-400 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-indigo-600 dark:bg-slate-800 dark:text-white"
                      />
                    </td>

                    {/* PT */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={newRow.pt}
                        onChange={(e) => handleNewRowChange('pt', e.target.value)}
                        className="w-16 px-1.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </td>

                    {/* PF Amount */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={newRow.pfAmount}
                        onChange={(e) => handleNewRowChange('pfAmount', e.target.value)}
                        className="w-20 px-1.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </td>

                    {/* ESIC */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={newRow.esic}
                        onChange={(e) => handleNewRowChange('esic', e.target.value)}
                        className="w-16 px-1.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </td>

                    {/* Difference Per Month Amount */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={newRow.differencePerMonthAmount}
                        onChange={(e) => handleNewRowChange('differencePerMonthAmount', e.target.value)}
                        className="w-20 px-1.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </td>

                    {/* Working Day's */}
                    <td className="px-2 py-2 text-center">
                      <input
                        type="number"
                        value={newRow.workingDays}
                        onChange={(e) => handleNewRowChange('workingDays', e.target.value)}
                        className="w-14 px-1 py-1 text-xs text-center font-bold border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </td>

                    {/* Per day Salary (Auto-calculated) */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={newRow.perDaySalary}
                        onChange={(e) => handleNewRowChange('perDaySalary', e.target.value)}
                        className="w-24 px-1.5 py-1 text-xs font-mono text-[11px] border border-slate-300 rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                      />
                    </td>

                    {/* Leave Deduction Amount (Auto-calculated) */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={newRow.leaveDeductionAmount}
                        onChange={(e) => handleNewRowChange('leaveDeductionAmount', e.target.value)}
                        className="w-24 px-1.5 py-1 text-xs font-semibold text-rose-600 border border-rose-300 rounded bg-rose-50/50 dark:bg-rose-950/30 dark:border-rose-700 dark:text-rose-400"
                      />
                    </td>

                    {/* Leave Taken */}
                    <td className="px-2 py-2 text-center">
                      <input
                        type="number"
                        step="0.5"
                        value={newRow.leaveTaken}
                        onChange={(e) => handleNewRowChange('leaveTaken', e.target.value)}
                        className="w-14 px-1 py-1 text-xs text-center font-bold border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </td>

                    {/* Remark */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        placeholder="Remark"
                        value={newRow.remark}
                        onChange={(e) => handleNewRowChange('remark', e.target.value)}
                        className="w-32 px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </td>
                  </tr>
                )}

                {/* 2. Existing Rows (Read / Inline Edit) */}
                {salaries.map((s) => {
                  const isEditing = editingRowId === s._id;

                  if (isEditing) {
                    return (
                      <tr
                        key={s._id}
                        className="divide-x divide-indigo-200 dark:divide-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 border-b-2 border-indigo-400 dark:border-indigo-600/50"
                      >
                        {/* Save / Cancel Actions */}
                        <td className="px-2 py-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
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
                              onClick={() => setEditingRowId(null)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>

                        {/* Month */}
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            <select
                              value={editingRowData.salaryMonth}
                              onChange={(e) => handleEditRowChange('salaryMonth', Number(e.target.value))}
                              className="px-1.5 py-1 text-xs font-bold border border-slate-300 rounded bg-white text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                              {monthsList.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={editingRowData.salaryYear}
                              onChange={(e) => handleEditRowChange('salaryYear', Number(e.target.value))}
                              className="w-16 px-1.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editingRowData.amount}
                            onChange={(e) => handleEditRowChange('amount', e.target.value)}
                            className="w-28 px-2 py-1 text-xs font-extrabold text-emerald-600 border border-emerald-300 rounded bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-300"
                          />
                        </td>

                        {/* Created */}
                        <td className="px-2 py-2">
                          <input
                            type="date"
                            value={editingRowData.createdDate}
                            onChange={(e) => handleEditRowChange('createdDate', e.target.value)}
                            className="w-32 px-1.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono text-[11px]"
                          />
                        </td>

                        {/* Salary */}
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editingRowData.salary}
                            onChange={(e) => handleEditRowChange('salary', e.target.value)}
                            className="w-28 px-2 py-1 text-xs font-bold border border-indigo-400 rounded bg-white text-slate-900 dark:border-indigo-600 dark:bg-slate-800 dark:text-white"
                          />
                        </td>

                        {/* PT */}
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={editingRowData.pt}
                            onChange={(e) => handleEditRowChange('pt', e.target.value)}
                            className="w-16 px-1.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </td>

                        {/* PF Amount */}
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={editingRowData.pfAmount}
                            onChange={(e) => handleEditRowChange('pfAmount', e.target.value)}
                            className="w-20 px-1.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </td>

                        {/* ESIC */}
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={editingRowData.esic}
                            onChange={(e) => handleEditRowChange('esic', e.target.value)}
                            className="w-16 px-1.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </td>

                        {/* Difference Per Month Amount */}
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={editingRowData.differencePerMonthAmount}
                            onChange={(e) => handleEditRowChange('differencePerMonthAmount', e.target.value)}
                            className="w-20 px-1.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </td>

                        {/* Working Day's */}
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            value={editingRowData.workingDays}
                            onChange={(e) => handleEditRowChange('workingDays', e.target.value)}
                            className="w-14 px-1 py-1 text-xs text-center font-bold border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </td>

                        {/* Per day Salary */}
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editingRowData.perDaySalary}
                            onChange={(e) => handleEditRowChange('perDaySalary', e.target.value)}
                            className="w-24 px-1.5 py-1 text-xs font-mono text-[11px] border border-slate-300 rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                          />
                        </td>

                        {/* Leave Deduction Amount */}
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editingRowData.leaveDeductionAmount}
                            onChange={(e) => handleEditRowChange('leaveDeductionAmount', e.target.value)}
                            className="w-24 px-1.5 py-1 text-xs font-semibold text-rose-600 border border-rose-300 rounded bg-rose-50/50 dark:bg-rose-950/30 dark:border-rose-700 dark:text-rose-400"
                          />
                        </td>

                        {/* Leave Taken */}
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            step="0.5"
                            value={editingRowData.leaveTaken}
                            onChange={(e) => handleEditRowChange('leaveTaken', e.target.value)}
                            className="w-14 px-1 py-1 text-xs text-center font-bold border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </td>

                        {/* Remark */}
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={editingRowData.remark}
                            onChange={(e) => handleEditRowChange('remark', e.target.value)}
                            className="w-32 px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={s._id}
                      className={`divide-x divide-slate-200 dark:divide-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        s.isCurrent ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* Actions */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStartEditRow(s)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                            title="Edit row in grid"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(s._id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            title="Delete Salary Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* 1. Month */}
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-1.5">
                          {s.isCurrent && (
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 shrink-0" title="Effective Current Salary" />
                          )}
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {getMonthName(s.salaryMonth)} {s.salaryYear}
                            </span>
                            {s.companyName && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                {s.companyName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Amount */}
                      <td className="px-3.5 py-3">
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm block">
                          {formatCurrency(s.amount ?? s.takeHomeSalary ?? 0)}
                        </span>
                        {s.paymentStatus && (
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${
                            s.paymentStatus === 'Received' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
                          }`}>
                            {s.paymentStatus}
                          </span>
                        )}
                      </td>

                      {/* 3. Created */}
                      <td className="px-3.5 py-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {formatDate(s.createdDate || s.effectiveDate || s.createdAt)}
                      </td>

                      {/* 4. Salary */}
                      <td className="px-3.5 py-3 font-bold text-slate-900 dark:text-white">
                        {formatCurrency(s.salary ?? s.grossSalary ?? 0)}
                      </td>

                      {/* 5. PT */}
                      <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300">
                        {formatCurrency(s.pt ?? 0)}
                      </td>

                      {/* 6. PF Amount */}
                      <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300">
                        {formatCurrency(s.pfAmount ?? 0)}
                      </td>

                      {/* 7. ESIC */}
                      <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300">
                        {formatCurrency(s.esic ?? 0)}
                      </td>

                      {/* 8. Difference Per Month Amount */}
                      <td className="px-3.5 py-3">
                        <span
                          className={`font-semibold ${
                            Number(s.differencePerMonthAmount) > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : Number(s.differencePerMonthAmount) < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {Number(s.differencePerMonthAmount) > 0 ? '+' : ''}
                          {formatCurrency(s.differencePerMonthAmount ?? 0)}
                        </span>
                      </td>

                      {/* 8. Working Day's */}
                      <td className="px-3.5 py-3 text-center font-bold text-slate-800 dark:text-slate-200">
                        {s.workingDays ?? 30}
                      </td>

                      {/* 9. Per day Salary */}
                      <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        {formatCurrency(s.perDaySalary ?? 0)}
                      </td>

                      {/* 10. Leave Deduction Amount */}
                      <td className="px-3.5 py-3 font-medium text-rose-600 dark:text-rose-400">
                        {Number(s.leaveDeductionAmount) > 0 ? `-${formatCurrency(s.leaveDeductionAmount)}` : formatCurrency(0)}
                      </td>

                      {/* 11. Leave Taken */}
                      <td className="px-3.5 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            Number(s.leaveTaken) > 0
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {s.leaveTaken ?? 0} {Number(s.leaveTaken) === 1 ? 'day' : 'days'}
                        </span>
                      </td>

                      {/* 12. Remark */}
                      <td className="px-3.5 py-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={s.remark || s.notes || ''}>
                        {s.remark || s.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs">
            <span className="text-slate-500">
              Showing page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong> ({pagination.total} records)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchSalaries(pagination.page - 1)}
                className="rounded-lg border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchSalaries(pagination.page + 1)}
                className="rounded-lg border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Import Modal */}
      <ImportSalaryModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => fetchSalaries(1)}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Salary Slip"
        message="Are you sure you want to delete this salary slip record? This will adjust your cumulative earnings and annual reports."
      />
    </div>
  );
};

export default SalaryManagement;
