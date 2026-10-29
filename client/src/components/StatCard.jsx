import React from 'react';

const StatCard = ({
  title,
  value,
  subvalue,
  icon: Icon,
  trend,
  trendPositive = true,
  badge,
  color = 'indigo', // 'indigo', 'emerald', 'sky', 'amber', 'rose', 'purple'
}) => {
  const colorStyles = {
    indigo: {
      iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      badgeBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
    },
    emerald: {
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    },
    sky: {
      iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      badgeBg: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
    },
    amber: {
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    },
    rose: {
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    },
    purple: {
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      badgeBg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    },
    yellow: {
      iconBg: 'bg-yellow-400 text-yellow-950 dark:bg-yellow-400/25 dark:text-yellow-300 border-yellow-400/60 shadow-sm',
      badgeBg: 'bg-yellow-300 text-yellow-950 font-bold dark:bg-yellow-400/25 dark:text-yellow-200 border border-yellow-400',
      cardClass: 'border-yellow-300/80 bg-gradient-to-br from-yellow-50/90 via-amber-50/40 to-white hover:border-yellow-400 dark:border-yellow-500/40 dark:from-yellow-950/25 dark:via-slate-900/90 dark:to-slate-900/90',
      topBar: 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500',
    },
  }[color] || {
    iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    badgeBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
    cardClass: '',
    topBar: '',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md backdrop-blur-sm group ${
        colorStyles.cardClass ||
        'border-slate-200/80 bg-white/90 hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900/80'
      }`}
    >
      {colorStyles.topBar && (
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${colorStyles.topBar}`} />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </div>
          {subvalue && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {subvalue}
            </p>
          )}
        </div>

        {Icon && (
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105 ${colorStyles.iconBg}`}
          >
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>

      {(trend || badge) && (
        <div className="mt-4 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          {trend && (
            <span
              className={`inline-flex items-center text-xs font-semibold ${
                trendPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend}
            </span>
          )}
          {badge && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorStyles.badgeBg}`}
            >
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
