import React, { useState } from 'react';
import { Code, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

export default function CodeInspector({ code }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  if (!code) return null;

  return (
    <div className="border border-white/5 rounded-xl bg-slate-950/40 overflow-hidden text-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-slate-300 hover:bg-white/[0.02] transition-colors focus:outline-none"
      >
        <div className="flex items-center space-x-2">
          <Code className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-xs tracking-wider uppercase text-slate-400">View Execution Code</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="relative border-t border-white/5 bg-slate-950/80 p-4">
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 p-1.5 rounded bg-slate-900 border border-white/10 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <pre className="text-xs text-indigo-200 font-mono overflow-x-auto leading-relaxed max-w-full whitespace-pre">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
