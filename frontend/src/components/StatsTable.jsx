import React from 'react';

export default function StatsTable({ columnNames, dataTypes, describeData }) {
  if (!describeData) return null;

  return (
    <div className="flex flex-col space-y-4">
      <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20 max-h-[350px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-slate-900/40 sticky top-0 z-10">
              <th className="px-4 py-3 font-semibold text-slate-200">Field Name</th>
              <th className="px-4 py-3 font-semibold text-slate-200">Data Type</th>
              <th className="px-4 py-3 font-semibold text-slate-200">Count</th>
              <th className="px-4 py-3 font-semibold text-slate-200">Mean</th>
              <th className="px-4 py-3 font-semibold text-slate-200">Std Dev</th>
              <th className="px-4 py-3 font-semibold text-slate-200">Min</th>
              <th className="px-4 py-3 font-semibold text-slate-200">Median (50%)</th>
              <th className="px-4 py-3 font-semibold text-slate-200">Max</th>
              <th className="px-4 py-3 font-semibold text-slate-200">Unique</th>
              <th className="px-4 py-3 font-semibold text-slate-200">Top Value (Freq)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {columnNames.map(col => {
              const stats = describeData[col] || {};
              const type = dataTypes[col] || 'unknown';
              
              // Helper to format float values
              const formatVal = (val, isInt = false) => {
                if (val === "" || val === undefined || val === null) return "-";
                if (typeof val === 'number') {
                  if (isInt || Number.isInteger(val)) return val.toLocaleString();
                  return val.toFixed(2);
                }
                return String(val);
              };

              return (
                <tr key={col} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-300 font-sans">{col}</td>
                  <td className="px-4 py-3">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/5 text-[10px] font-bold text-indigo-400 uppercase">
                      {type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatVal(stats['count'], true)}</td>
                  <td className="px-4 py-3 text-slate-300">{formatVal(stats['mean'])}</td>
                  <td className="px-4 py-3 text-slate-400">{formatVal(stats['std'])}</td>
                  <td className="px-4 py-3 text-slate-300">{formatVal(stats['min'])}</td>
                  <td className="px-4 py-3 text-slate-300">{formatVal(stats['50%'])}</td>
                  <td className="px-4 py-3 text-slate-300">{formatVal(stats['max'])}</td>
                  <td className="px-4 py-3 text-slate-400">{formatVal(stats['unique'], true)}</td>
                  <td className="px-4 py-3 text-slate-300 font-sans truncate max-w-[150px]" title={stats['top'] ? `${stats['top']} (${stats['freq']})` : ''}>
                    {stats['top'] ? `${stats['top']} (${formatVal(stats['freq'], true)})` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
