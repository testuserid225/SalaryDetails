import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  TrendingUp,
  Gift,
  CreditCard,
  RefreshCw,
  Filter,
} from 'lucide-react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import StatCard from '../components/StatCard';
import { LoadingSpinner } from '../components/LoadingSpinner';

const Dashboard = ({ onNavigate }) => {
  const { formatCurrency } = useSettings();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');

  const fetchDashboardData = useCallback(async (yearToFetch = selectedYear) => {
    try {
      setLoading(true);
      const params = yearToFetch ? { year: yearToFetch } : {};
      const res = await api.get('/dashboard', params);
      if (res.success) {
        setData(res);
        if (!selectedYear && res.filters?.targetYear) {
          setSelectedYear(String(res.filters.targetYear));
        }
      }
    } catch (error) {
      showToast(error.message || 'Failed to load dashboard metrics', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, showToast]);

  useEffect(() => {
    fetchDashboardData(selectedYear);
  }, [selectedYear]);

  if (loading && !data) {
    return <LoadingSpinner text="Computing MongoDB live financial metrics..." />;
  }

  const summary = data?.summary || {};
  const charts = data?.charts || {};
  const filters = data?.filters || {};
  const recentActivity = data?.recentActivity || [];

  const activeCycleLabel = selectedYear === 'all'
    ? 'All Years'
    : (filters.cycleOptions?.find((c) => c.value === selectedYear)?.label ||
       (String(selectedYear).includes('-')
         ? `Sep ${selectedYear.split('-')[0]} - Aug ${selectedYear.split('-')[1]}`
         : selectedYear));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header & Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Financial & Career Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time MongoDB dynamic analysis of your salary history, bonuses, and experience
          </p>
        </div>

        {/* Action Controls & Year Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year Filter Dropdown (Sep - Aug Salary Cycle) */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Cycle:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none dark:text-slate-100"
            >
              <option value="all">All Years</option>
              {filters.cycleOptions ? (
                filters.cycleOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))
              ) : (
                filters.availableYears?.map((y) => (
                  <option key={y} value={y}>
                    {String(y).includes('-') ? `Sep ${String(y).split('-')[0]} - Aug ${String(y).split('-')[1]}` : `Year ${y}`}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={() => fetchDashboardData(selectedYear)}
            title="Refresh from MongoDB"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Primary Summary Metric Cards (Dynamic MongoDB) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Monthly Salary (Filtered by Year) */}
        <StatCard
          title={selectedYear && selectedYear !== 'all' ? `Monthly Salary (${activeCycleLabel})` : "Current Monthly Salary"}
          value={formatCurrency(summary.currentMonthlySalary)}
          subvalue={`Take-Home: ${formatCurrency(summary.currentMonthlyTakeHome)}`}
          icon={Wallet}
          color="indigo"
          badge={summary.currentCompany}
        />

        {/* Current Annual Salary (Filtered by Year) */}
        <StatCard
          title={selectedYear && selectedYear !== 'all' ? `Annual Salary (${activeCycleLabel})` : "Current Annual Salary"}
          value={formatCurrency(summary.currentAnnualSalary)}
          subvalue="Monthly Gross × 12 (Annualized)"
          icon={CreditCard}
          color="emerald"
        />

        {/* Total Earnings Received (Filtered by Year) */}
        <StatCard
          title={selectedYear && selectedYear !== 'all' ? `Total Earnings Received (${activeCycleLabel})` : "Total Earnings Received"}
          value={formatCurrency(summary.totalEarnings)}
          subvalue={
            selectedYear && selectedYear !== 'all'
              ? `Total Salary Amount in ${activeCycleLabel}`
              : `Total Salary Amount across all slips`
          }
          icon={TrendingUp}
          color="purple"
          trend={selectedYear && selectedYear !== 'all' ? `Salary Amount in ${activeCycleLabel}` : "Total Salary Amount"}
          trendPositive={true}
        />

        {/* Total Bonuses Received */}
        <StatCard
          title="Total Bonuses Received"
          value={formatCurrency(summary.paidBonusAmount !== undefined && summary.paidBonusAmount !== null ? summary.paidBonusAmount : summary.totalBonusesReceived)}
          subvalue="Paid Bonus Amount from Bonus Settlement"
          icon={Gift}
          color="amber"
          badge="Paid Bonus"
        />
      </div>
    </div>
  );
};

export default Dashboard;
