import React from 'react';

const colorMap = {
  blue: {
    border: 'border-l-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    border: 'border-l-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  purple: {
    border: 'border-l-purple-500',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    border: 'border-l-orange-500',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
};

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', onClick, loading }) {
  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700
        border-l-4 ${c.border} p-6 hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
          {loading ? (
            <div className="h-9 w-20 mt-2 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{value}</p>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className={`w-14 h-14 rounded-2xl ${c.iconBg} flex items-center justify-center`}>
          <Icon size={28} className={c.iconColor} />
        </div>
      </div>
    </div>
  );
}
