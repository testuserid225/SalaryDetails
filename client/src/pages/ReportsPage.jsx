import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Building,
  DollarSign,
  TrendingUp,
  Gift,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  RotateCcw,
  Wallet,
  Receipt,
  PiggyBank,
  CreditCard,
  Layers,
  AlertCircle,
  Calculator,
  Award,
} from 'lucide-react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import { formatDate } from '../utils/formatters';

const ReportsPage = () => {
  const { formatCurrency } = useSettings();
  const { showToast } = useToast();

  // Active Report Tab: Strictly 'salary' or 'bonus'
  const [activeTab, setActiveTab] = useState('salary');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Reports API Data
  const [reportData, setReportData] = useState({
    salaryReport: { records: [], stats: {}, cycleOptions: [], companies: [] },
    bonusReport: { records: [], stats: {}, years: [], companies: [] },
    summary: {},
  });

  // Salary Filters
  const [salaryCycle, setSalaryCycle] = useState('all');
  const [salaryCompany, setSalaryCompany] = useState('');
  const [salaryStatus, setSalaryStatus] = useState('');
  const [salarySearch, setSalarySearch] = useState('');

  // Bonus Filters
  const [bonusYear, setBonusYear] = useState('all');
  const [bonusCompany, setBonusCompany] = useState('');
  const [bonusStatus, setBonusStatus] = useState('');
  const [bonusSearch, setBonusSearch] = useState('');

  // Fetch Reports Data
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        salaryCycle,
        salaryCompany,
        salaryStatus,
        bonusYear,
        bonusCompany,
        bonusStatus,
        search: activeTab === 'salary' ? salarySearch : bonusSearch,
      };

      const res = await api.get('/reports', params);
      if (res.success) {
        setReportData({
          salaryReport: res.salaryReport || { records: [], stats: {}, cycleOptions: [], companies: [] },
          bonusReport: res.bonusReport || { records: [], stats: {}, years: [], companies: [] },
          summary: res.summary || {},
        });
      }
    } catch (error) {
      showToast(error.message || 'Failed to fetch reports', 'error');
    } finally {
      setLoading(false);
    }
  }, [
    salaryCycle,
    salaryCompany,
    salaryStatus,
    salarySearch,
    bonusYear,
    bonusCompany,
    bonusStatus,
    bonusSearch,
    activeTab,
    showToast,
  ]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const isSalary = activeTab === 'salary';
      const type = isSalary ? 'salary' : 'bonus';
      const params = isSalary
        ? `report=salary&salaryCycle=${salaryCycle}&salaryCompany=${encodeURIComponent(salaryCompany)}&salaryStatus=${encodeURIComponent(salaryStatus)}`
        : `report=bonus&bonusYear=${bonusYear}&bonusCompany=${encodeURIComponent(bonusCompany)}&bonusStatus=${encodeURIComponent(bonusStatus)}`;

      const dateStr = new Date().toISOString().split('T')[0];
      await api.downloadBlob(
        `/reports/export/csv?${params}`,
        `salarydetails-${type}-report-${dateStr}.csv`
      );
      showToast(`${isSalary ? 'Salary' : 'Bonus'} Report CSV downloaded successfully`);
    } catch (error) {
      showToast(error.message || 'Failed to export CSV', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const resetSalaryFilters = () => {
    setSalaryCycle('all');
    setSalaryCompany('');
    setSalaryStatus('');
    setSalarySearch('');
  };

  const resetBonusFilters = () => {
    setBonusYear('all');
    setBonusCompany('');
    setBonusStatus('');
    setBonusSearch('');
  };

  const salaryRecords = reportData.salaryReport?.records || [];
  const salaryStats = reportData.salaryReport?.stats || {};
  const salaryCycleOptions = reportData.salaryReport?.cycleOptions || [];
  const salaryCompanies = reportData.salaryReport?.companies || [];

  const bonusRecords = reportData.bonusReport?.records || [];
  const bonusStats = reportData.bonusReport?.stats || {};
  const bonusYears = reportData.bonusReport?.years || [];
  const bonusCompanies = reportData.bonusReport?.companies || [];

  const summary = reportData.summary || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-sm shadow-sm">
              <FileText className="h-4 w-4" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Reports & Statements
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Audit-ready financial statements, cycle summaries, and verified compensation reports strictly for Salary and Bonus
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            Print View
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {exporting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export {activeTab === 'salary' ? 'Salary' : 'Bonus'} CSV
          </button>
        </div>
      </div>

      {/* Top Combined Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <StatCard
          title="Total Net Salary Received"
          value={formatCurrency(summary.totalSalaryNetReceived || 0)}
          subvalue="Take-home cash credited in bank"
          icon={Wallet}
          color="emerald"
          badge="Net Salary"
        />
        <StatCard
          title="Total Monthly Bonus Given"
          value={formatCurrency(summary.totalBonusGiven || 0)}
          subvalue="Disbursed performance bonuses"
          icon={Gift}
          color="sky"
          badge="Bonus Given"
        />
        <StatCard
          title="Grand Total Earnings"
          value={formatCurrency(summary.grandTotalEarnings || 0)}
          subvalue="Salary Net + Bonus Given"
          icon={Award}
          color="indigo"
          badge="Total Inflow"
        />
        <StatCard
          title="Paid Bonus Balance"
          value={formatCurrency(summary.netBalanceAfterPaidBonus || 0)}
          subvalue={`Given minus Paid (${formatCurrency(summary.paidBonusAmount || 0)})`}
          icon={Calculator}
          color="amber"
          badge="Bonus Balance"
        />
      </div>

      {/* Primary Report Tabs: STRICTLY SALARY AND BONUS */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 pb-1 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('salary')}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold transition-all rounded-xl ${
            activeTab === 'salary'
              ? 'bg-yellow-400 text-slate-950 shadow-md ring-2 ring-yellow-400/50'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Salary Report</span>
          <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-bold">
            {salaryRecords.length} Slips
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bonus')}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold transition-all rounded-xl ${
            activeTab === 'bonus'
              ? 'bg-[#00a2e8] text-white shadow-md ring-2 ring-[#00a2e8]/50'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
          }`}
        >
          <Gift className="h-4 w-4" />
          <span>Bonus Report</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
            {bonusRecords.length} Bonuses
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SALARY REPORT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'salary' && (
        <div className="space-y-6">
          {/* Salary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 print:hidden">
            <StatCard
              title="Total Salary Amount"
              value={formatCurrency(salaryStats.totalSalary || 0)}
              subvalue="Gross / Base earnings"
              icon={Wallet}
              color="yellow"
              badge="Base Gross"
            />
            <StatCard
              title="Total Net Received"
              value={formatCurrency(salaryStats.totalAmount || 0)}
              subvalue="Net credited in bank"
              icon={Receipt}
              color="emerald"
              badge="Credited"
            />
            <StatCard
              title="Total PF Amount"
              value={formatCurrency(salaryStats.totalPF || 0)}
              subvalue="Provident fund total"
              icon={PiggyBank}
              color="yellow"
              badge="PF Total"
            />
            <StatCard
              title="Total ESIC Amount"
              value={formatCurrency(salaryStats.totalESIC || 0)}
              subvalue="ESIC deductions total"
              icon={ShieldCheck}
              color="yellow"
              badge="ESIC Total"
            />
            <StatCard
              title="Total PT Amount"
              value={formatCurrency(salaryStats.totalPT || 0)}
              subvalue="Professional tax total"
              icon={CreditCard}
              color="yellow"
              badge="PT Total"
            />
            <StatCard
              title="Diff Amount Total"
              value={formatCurrency(salaryStats.totalDiff || 0)}
              subvalue="PT + PF + ESIC"
              icon={Layers}
              color="indigo"
              badge="PT+PF+ESIC"
            />
          </div>

          {/* Salary Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={salarySearch}
                  onChange={(e) => setSalarySearch(e.target.value)}
                  placeholder="Search remark or company..."
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:border-yellow-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Cycle Dropdown (Sep-to-Aug) */}
              <div>
                <select
                  value={salaryCycle}
                  onChange={(e) => setSalaryCycle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-yellow-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Salary Cycles (Sep - Aug)</option>
                  {salaryCycleOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Company */}
              <div>
                <select
                  value={salaryCompany}
                  onChange={(e) => setSalaryCompany(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-yellow-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">All Companies</option>
                  {salaryCompanies.map((comp) => (
                    <option key={comp} value={comp}>
                      {comp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <select
                  value={salaryStatus}
                  onChange={(e) => setSalaryStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-yellow-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">All Statuses</option>
                  <option value="Received">Received / Credited</option>
                  <option value="Expected">Expected / Pending</option>
                </select>
              </div>

              {/* Reset */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={resetSalaryFilters}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Salary Statement Table */}
          <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white shadow-sm overflow-hidden dark:bg-slate-900">
            {/* Table Header Bar */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Salary History & Component Statement
                </h3>
                <span className="text-[11px] font-semibold text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-950/60 px-2 py-0.5 rounded-full border border-yellow-300 dark:border-yellow-700">
                  {salaryRecords.length} records found
                </span>
              </div>
              <span className="text-xs text-slate-500 print:block">
                Cycle: 24th prev month to 23rd current month
              </span>
            </div>

            {loading ? (
              <div className="p-12">
                <LoadingSpinner text="Compiling Salary Report Statement..." />
              </div>
            ) : salaryRecords.length === 0 ? (
              <div className="p-12">
                <EmptyState
                  icon={Receipt}
                  title="No Salary Records Found"
                  description="No salary slips match the selected cycle, company, or status filter."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                  {/* Yellow Header Row from SalaryManagement */}
                  <thead className="bg-yellow-300 dark:bg-yellow-400/25 text-slate-950 dark:text-yellow-200 border-b-2 border-yellow-400 dark:border-yellow-600/40 font-bold uppercase tracking-wider text-[11px] select-none">
                    <tr className="divide-x divide-black/25">
                      <th className="px-3.5 py-3">Month</th>
                      <th className="px-3.5 py-3">Amount</th>
                      <th className="px-3.5 py-3">Created</th>
                      <th className="px-3.5 py-3">Salary</th>
                      <th className="px-3.5 py-3">PT</th>
                      <th className="px-3.5 py-3">PF Amount</th>
                      <th className="px-3.5 py-3">ESIC</th>
                      <th className="px-3.5 py-3">Difference Per Month Amount</th>
                      <th className="px-3.5 py-3 text-center">Working Day's</th>
                      <th className="px-3.5 py-3">Per day Salary</th>
                      <th className="px-3.5 py-3">Leave Deduction Amount</th>
                      <th className="px-3.5 py-3 text-center">Leave Taken</th>
                      <th className="px-3.5 py-3">Remark</th>
                      <th className="px-3.5 py-3">Company</th>
                      <th className="px-3.5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {salaryRecords.map((s) => (
                      <tr
                        key={s._id}
                        className="divide-x divide-slate-200 dark:divide-slate-800 hover:bg-yellow-50/40 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* 1. Month */}
                        <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white">
                          {s.monthLabel}
                        </td>

                        {/* 2. Amount (Take-home) */}
                        <td className="px-3.5 py-2.5 font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatCurrency(s.amount)}
                        </td>

                        {/* 3. Created Date */}
                        <td className="px-3.5 py-2.5 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                          {formatDate(s.createdDate, 'date-only')}
                        </td>

                        {/* 4. Salary (Gross/Base) */}
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(s.salary)}
                        </td>

                        {/* 5. PT */}
                        <td className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300">
                          {formatCurrency(s.pt)}
                        </td>

                        {/* 6. PF Amount */}
                        <td className="px-3.5 py-2.5 font-medium text-amber-700 dark:text-amber-400">
                          {formatCurrency(s.pfAmount)}
                        </td>

                        {/* 7. ESIC */}
                        <td className="px-3.5 py-2.5 font-medium text-sky-700 dark:text-sky-400">
                          {formatCurrency(s.esic)}
                        </td>

                        {/* 8. Difference Per Month Amount */}
                        <td className="px-3.5 py-2.5 font-bold text-indigo-700 dark:text-indigo-400">
                          {formatCurrency(s.differencePerMonthAmount)}
                        </td>

                        {/* 9. Working Days */}
                        <td className="px-3.5 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                          {s.workingDays}
                        </td>

                        {/* 10. Per Day Salary */}
                        <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400">
                          {formatCurrency(s.perDaySalary)}
                        </td>

                        {/* 11. Leave Deduction */}
                        <td className="px-3.5 py-2.5 font-medium text-rose-600 dark:text-rose-400">
                          {s.leaveDeductionAmount > 0 ? `-${formatCurrency(s.leaveDeductionAmount)}` : '₹0.00'}
                        </td>

                        {/* 12. Leave Taken */}
                        <td className="px-3.5 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                          {s.leaveTaken}
                        </td>

                        {/* 13. Remark */}
                        <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={s.remark}>
                          {s.remark || '—'}
                        </td>

                        {/* 14. Company */}
                        <td className="px-3.5 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                          {s.companyName}
                        </td>

                        {/* 15. Status */}
                        <td className="px-3.5 py-2.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                              s.paymentStatus === 'Received'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
                            }`}
                          >
                            {s.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Salary Grand Total Footer Row */}
                  <tfoot className="bg-yellow-100/90 dark:bg-yellow-950/50 border-t-2 border-yellow-400 dark:border-yellow-600/50 font-extrabold text-slate-950 dark:text-yellow-200 select-none">
                    <tr className="divide-x divide-black/20">
                      <td className="px-3.5 py-3 uppercase tracking-wider text-xs">
                        GRAND TOTAL ({salaryRecords.length})
                      </td>
                      <td className="px-3.5 py-3 text-emerald-700 dark:text-emerald-300 text-sm font-black">
                        {formatCurrency(salaryStats.totalAmount || 0)}
                      </td>
                      <td className="px-3.5 py-3 text-center text-slate-400">—</td>
                      <td className="px-3.5 py-3 text-slate-900 dark:text-white">
                        {formatCurrency(salaryStats.totalSalary || 0)}
                      </td>
                      <td className="px-3.5 py-3 text-slate-900 dark:text-white">
                        {formatCurrency(salaryStats.totalPT || 0)}
                      </td>
                      <td className="px-3.5 py-3 text-amber-800 dark:text-amber-300">
                        {formatCurrency(salaryStats.totalPF || 0)}
                      </td>
                      <td className="px-3.5 py-3 text-sky-800 dark:text-sky-300">
                        {formatCurrency(salaryStats.totalESIC || 0)}
                      </td>
                      <td className="px-3.5 py-3 text-indigo-800 dark:text-indigo-300 font-black">
                        {formatCurrency(salaryStats.totalDiff || 0)}
                      </td>
                      <td className="px-3.5 py-3 text-center text-slate-400">—</td>
                      <td className="px-3.5 py-3 text-center text-slate-400">—</td>
                      <td className="px-3.5 py-3 text-rose-700 dark:text-rose-400">
                        -{formatCurrency(salaryStats.totalLeaveDeduction || 0)}
                      </td>
                      <td className="px-3.5 py-3 text-center text-slate-900 dark:text-white">
                        {salaryStats.totalLeaveTaken || 0}
                      </td>
                      <td className="px-3.5 py-3 text-slate-500 font-normal">All filtered records</td>
                      <td className="px-3.5 py-3 text-slate-500 font-normal">
                        {salaryCompany || 'All Companies'}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          Complete
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BONUS REPORT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'bonus' && (
        <div className="space-y-6">
          {/* Bonus KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 print:hidden">
            <StatCard
              title="Total Monthly Amount"
              value={formatCurrency(bonusStats.totalMonthlyBonusAmount || 0)}
              subvalue="Scheduled bonus entitlement"
              icon={DollarSign}
              color="yellow"
              badge="Entitled"
            />
            <StatCard
              title="Total Bonus Given"
              value={formatCurrency(bonusStats.totalMonthlyBonusGiven || 0)}
              subvalue={`${bonusStats.givenCount || 0} bonuses disbursed in bank`}
              icon={Gift}
              color="emerald"
              badge="Disbursed"
            />
            <StatCard
              title="Total Deductions"
              value={formatCurrency(
                Math.max(
                  0,
                  (bonusStats.totalMonthlyBonusAmount || 0) - (bonusStats.totalMonthlyBonusGiven || 0)
                )
              )}
              subvalue="Total Monthly Amount - Bonus Given"
              icon={AlertCircle}
              color="rose"
              badge="Deductions"
            />
            <StatCard
              title="Paid Bonus Amount"
              value={formatCurrency(bonusStats.paidBonusAmount || 0)}
              subvalue="User benchmark settlement base"
              icon={Calculator}
              color="sky"
              badge="Benchmark"
            />
            <StatCard
              title="Balance Result"
              value={formatCurrency(bonusStats.balanceResult || 0)}
              subvalue="Given minus Paid bonus"
              icon={TrendingUp}
              color="indigo"
              badge="Given - Paid"
            />
          </div>

          {/* Paid Bonus Settlement Card */}
          <div className="rounded-2xl border border-sky-300 dark:border-sky-800 bg-white shadow-sm overflow-hidden dark:bg-slate-900">
            <div className="px-5 py-3 border-b border-sky-200 dark:border-sky-900/60 flex items-center justify-between bg-sky-50/70 dark:bg-sky-950/40">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Bonus Settlement Calculation Summary
                </h3>
                <span className="text-[11px] font-semibold text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 rounded-full border border-sky-300">
                  Audit Summary
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#00a2e8] text-white border-b-2 border-[#0081ba] font-extrabold uppercase tracking-wider text-[11px] select-none">
                  <tr className="divide-x divide-black/25">
                    <th className="px-5 py-3">Paid Bonus Amount</th>
                    <th className="px-5 py-3 text-right">Total Monthly Bonus Given</th>
                    <th className="px-5 py-3 text-right">Result (Given - Paid)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                    <td className="px-5 py-3 font-extrabold text-slate-900 dark:text-white text-base">
                      {formatCurrency(bonusStats.paidBonusAmount || 0)}
                    </td>
                    <td className="px-5 py-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                      {formatCurrency(bonusStats.totalMonthlyBonusGiven || 0)}
                    </td>
                    <td className="px-5 py-3 text-right font-black text-sky-600 dark:text-sky-400 text-lg">
                      {formatCurrency(bonusStats.balanceResult || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bonus Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={bonusSearch}
                  onChange={(e) => setBonusSearch(e.target.value)}
                  placeholder="Search remark or company..."
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Year Filter */}
              <div>
                <select
                  value={bonusYear}
                  onChange={(e) => setBonusYear(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Bonus Years</option>
                  {bonusYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Year {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Company */}
              <div>
                <select
                  value={bonusCompany}
                  onChange={(e) => setBonusCompany(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">All Companies</option>
                  {bonusCompanies.map((comp) => (
                    <option key={comp} value={comp}>
                      {comp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <select
                  value={bonusStatus}
                  onChange={(e) => setBonusStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">All Statuses</option>
                  <option value="Given">Given / Paid</option>
                  <option value="Pending">Pending / Unpaid</option>
                  <option value="Partially Given">Partially Given</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Reset */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={resetBonusFilters}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Bonus Statement Table */}
          <div className="rounded-2xl border border-sky-300 dark:border-sky-800 bg-white shadow-sm overflow-hidden dark:bg-slate-900">
            {/* Table Header Bar */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Monthly Bonus Payment Statement
                </h3>
                <span className="text-[11px] font-semibold text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 rounded-full border border-sky-300">
                  {bonusRecords.length} records found
                </span>
              </div>
            </div>

            {loading ? (
              <div className="p-12">
                <LoadingSpinner text="Compiling Bonus Report Statement..." />
              </div>
            ) : bonusRecords.length === 0 ? (
              <div className="p-12">
                <EmptyState
                  icon={Gift}
                  title="No Bonus Records Found"
                  description="No bonus records match the selected year, company, or status filter."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                  {/* Cyan-Blue Header Row from BonusManagement */}
                  <thead className="bg-[#00a2e8] text-white border-b-2 border-[#0081ba] font-extrabold uppercase tracking-wider text-[11px] select-none">
                    <tr className="divide-x divide-black/25">
                      <th className="px-4 py-3.5">Bonus Month & Year</th>
                      <th className="px-4 py-3.5">Company</th>
                      <th className="px-4 py-3.5 text-right">Monthly Bonus Amount</th>
                      <th className="px-4 py-3.5 text-right">Monthly Bonus Given</th>
                      <th className="px-4 py-3.5 text-right">Deduction Amount</th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                      <th className="px-4 py-3.5">Notes / Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {bonusRecords.map((b) => (
                      <tr
                        key={b._id}
                        className="divide-x divide-slate-200 dark:divide-slate-800 hover:bg-sky-50/40 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* 1. Month & Year */}
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <Gift className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                            <span>{b.monthLabel}</span>
                          </div>
                        </td>

                        {/* 2. Company */}
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {b.companyName}
                        </td>

                        {/* 3. Monthly Bonus Amount */}
                        <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(b.monthlyBonusAmount)}
                        </td>

                        {/* 4. Monthly Bonus Given */}
                        <td className="px-4 py-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatCurrency(b.monthlyBonusGiven)}
                        </td>

                        {/* 5. Deduction Amount */}
                        <td className="px-4 py-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                          {b.deductionAmount > 0 ? `-${formatCurrency(b.deductionAmount)}` : '₹0.00'}
                        </td>

                        {/* 6. Status */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                              b.status === 'Given' || b.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                                : b.status === 'Partially Given'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300'
                                : b.status === 'Cancelled'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
                            }`}
                          >
                            {b.status === 'Given' ? 'Given / Paid' : b.status}
                          </span>
                        </td>

                        {/* 7. Notes */}
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-sm truncate" title={b.notes}>
                          {b.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Bonus Grand Total Footer Row */}
                  <tfoot className="bg-sky-100/90 dark:bg-sky-950/50 border-t-2 border-sky-400 dark:border-sky-600/50 font-extrabold text-slate-950 dark:text-sky-200 select-none">
                    <tr className="divide-x divide-black/20">
                      <td className="px-4 py-3 uppercase tracking-wider text-xs">
                        GRAND TOTAL ({bonusRecords.length})
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-normal">
                        {bonusCompany || 'All Companies'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-white">
                        {formatCurrency(bonusStats.totalMonthlyBonusAmount || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-300 text-sm font-black">
                        {formatCurrency(bonusStats.totalMonthlyBonusGiven || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-700 dark:text-rose-400">
                        -{formatCurrency(Math.max(0, (bonusStats.totalMonthlyBonusAmount || 0) - (bonusStats.totalMonthlyBonusGiven || 0)))}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-sky-800 dark:text-sky-300 font-black">
                        Balance: {formatCurrency(bonusStats.balanceResult || 0)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-normal">
                        Paid Base: {formatCurrency(bonusStats.paidBonusAmount || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
