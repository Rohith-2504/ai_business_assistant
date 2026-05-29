import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DataPreview({ columns, previewData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Filter preview data by search term
  const filteredData = previewData.filter(row => {
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Search preview rows..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="text-xs text-slate-400">
          Showing {filteredData.length > 0 ? startIndex + 1 : 0}-{Math.min(filteredData.length, startIndex + rowsPerPage)} of {filteredData.length} preview rows
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-white/5 rounded-xl bg-slate-950/20 max-h-[500px]">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-slate-900/40 sticky top-0 z-10">
              {columns.map(col => (
                <th key={col} className="px-4 py-3 font-semibold text-slate-200 select-none whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  {columns.map(col => (
                    <td key={col} className="px-4 py-3 text-slate-300 font-mono text-xs max-w-xs truncate">
                      {String(row[col])}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                  No matching data rows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-white/10 bg-slate-900/40 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800/40 transition-colors"
          >
            <ChevronLeft className="w-4.5 h-4.5" />
          </button>
          <span className="text-xs text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-white/10 bg-slate-900/40 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800/40 transition-colors"
          >
            <ChevronRight className="w-4.5 h-4.5" />
          </button>
        </div>
      )}
    </div>
  );
}
