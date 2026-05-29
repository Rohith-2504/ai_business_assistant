import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  Send, 
  FileSpreadsheet, 
  MessageSquare, 
  Database, 
  Sparkles, 
  PieChart, 
  Info, 
  RefreshCw, 
  AlertCircle, 
  Trash2,
  TableProperties,
  LayoutDashboard
} from 'lucide-react';
import PlotlyChart from './components/PlotlyChart';
import DataPreview from './components/DataPreview';
import CodeInspector from './components/CodeInspector';
import StatsTable from './components/StatsTable';
import ChartBuilder from './components/ChartBuilder';

const BACKEND_URL = "http://127.0.0.1:8000";

// Markdown Parser Helper to format text and render markdown tables as beautiful HTML tables
function renderFormattedAnswer(text) {
  if (!text) return null;
  
  const lines = text.split('\n');
  const elements = [];
  let tableLines = [];
  let inTable = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('|')) {
      inTable = true;
      tableLines.push(line);
    } else {
      if (inTable) {
        elements.push(renderTable(tableLines, i));
        tableLines = [];
        inTable = false;
      }
      
      if (line.startsWith('### ')) {
        elements.push(<h3 key={i} className="text-md font-semibold text-slate-100 mt-4 mb-2">{line.replace('### ', '')}</h3>);
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={i} className="text-lg font-bold text-slate-100 mt-6 mb-3">{line.replace('## ', '')}</h2>);
      } else if (line.startsWith('# ')) {
        elements.push(<h1 key={i} className="text-xl font-extrabold text-indigo-400 mt-8 mb-4">{line.replace('# ', '')}</h1>);
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(<li key={i} className="ml-4 list-disc text-slate-300 text-sm my-1">{line.substring(2)}</li>);
      } else if (line !== '') {
        elements.push(<p key={i} className="text-slate-300 text-sm my-2 leading-relaxed">{line}</p>);
      }
    }
  }
  
  if (inTable && tableLines.length > 0) {
    elements.push(renderTable(tableLines, lines.length));
  }
  
  return <div className="space-y-1">{elements}</div>;
}

function renderTable(lines, key) {
  if (lines.length < 2) return null;
  const headers = lines[0].split('|').map(s => s.trim()).filter(s => s !== '');
  
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const cells = lines[i].split('|').map(s => s.trim()).filter(s => s !== '');
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  
  return (
    <div key={key} className="overflow-x-auto my-4 border border-white/5 rounded-lg bg-slate-950/40">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-900/60 border-b border-white/10">
            {headers.map((h, idx) => (
              <th key={idx} className="px-3 py-2 font-semibold text-slate-200">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-white/[0.01] transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-2 text-slate-300 font-mono">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('chat'); // dashboard, chat, preview
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Dataset metadata states
  const [datasetMeta, setDatasetMeta] = useState(null);
  const [isMetaOpen, setIsMetaOpen] = useState(true);

  // Chat conversation states
  const [chatHistory, setChatHistory] = useState([]);
  const [question, setQuestion] = useState('');
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Suggested Prompts
  const suggestions = [
    "Give me a general summary of the dataset",
    "Identify null values and suggest cleaning",
    "Plot a bar chart of the highest frequency category",
    "Compute correlation of numeric columns and report insights"
  ];

  // Auto-scroll chat window
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, analyzing]);

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setUploading(true);
    setStatusMessage('Uploading CSV dataset...');
    setFile(selectedFile);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${BACKEND_URL}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setDatasetMeta(data);
      setChatHistory([
        {
          sender: 'ai',
          text: `### Dataset Loaded: **${selectedFile.name}**\n\nI have successfully loaded the dataset containing **${data.rows.toLocaleString()}** rows and **${data.columns}** columns. Check out the **Overview Dashboard** for automated stats and charts, or query me in this chat!`,
          chart: null,
          code: null
        }
      ]);
      setActiveTab('dashboard'); // Redirect directly to dashboard upon successful upload
    } catch (err) {
      console.error(err);
      alert(`Upload failed: ${err.message || 'Server error'}`);
      setFile(null);
    } finally {
      setUploading(false);
      setStatusMessage('');
    }
  };

  const handleSendQuestion = async (queryText = question) => {
    const prompt = queryText.trim();
    if (!prompt) return;

    // Add user question to chat history
    setChatHistory(prev => [...prev, { sender: 'user', text: prompt }]);
    setQuestion('');
    setAnalyzing(true);
    setStatusMessage('AI Agent is synthesizing analysis code...');

    try {
      const formData = new FormData();
      formData.append('question', prompt);

      const response = await fetch(`${BACKEND_URL}/ask`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      
      // Append AI response
      setChatHistory(prev => [...prev, {
        sender: 'ai',
        text: result.answer,
        chart: result.chart,
        code: result.code
      }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, {
        sender: 'ai',
        text: `⚠️ **Analysis Error:** Failed to execute query.\n\n{err.message || 'Server timeout or connection refused.'}`,
        chart: null,
        code: null
      }]);
    } finally {
      setAnalyzing(false);
      setStatusMessage('');
    }
  };

  const clearSession = () => {
    if (confirm("Are you sure you want to clear the active dataset and conversation history?")) {
      setFile(null);
      setDatasetMeta(null);
      setChatHistory([]);
      setActiveTab('chat');
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative text-slate-100">
      {/* Background Glows */}
      <div className="glow-bg" />

      {/* Glassmorphic Navbar */}
      <header className="sticky top-0 z-50 glass-card border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white font-outfit m-0">Antigravity BI</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Self-Healing Analytics Engine</p>
          </div>
        </div>
        
        {file && (
          <button 
            onClick={clearSession}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-950/20 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500 hover:text-white transition-all duration-300 focus:outline-none"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Project</span>
          </button>
        )}
      </header>

      {/* Main Layout Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-12 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Controls (Left) */}
        <section className="w-full md:w-80 flex flex-col space-y-6 shrink-0">
          
          {/* File Upload / Info Box */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            {/* File input is always in DOM so it can be clicked to load different datasets */}
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept=".csv"
              onChange={handleFileUpload}
            />
            
            {!file ? (
              <div 
                onClick={() => fileInputRef.current.click()}
                className="border-2 border-dashed border-slate-700/50 hover:border-indigo-500/50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group bg-slate-950/30"
              >
                <UploadCloud className="w-12 h-12 text-slate-500 group-hover:text-indigo-400 transition-colors mb-3" />
                <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Upload CSV Dataset</span>
                <span className="text-xs text-slate-500 mt-1">Files up to 100MB supported</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div className="truncate">
                    <h3 className="text-sm font-bold text-white truncate">{file.name}</h3>
                    <p className="text-[11px] text-slate-400">Loaded and ready</p>
                  </div>
                </div>

                {datasetMeta && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Rows</p>
                      <p className="text-lg font-extrabold text-white font-outfit mt-0.5">{datasetMeta.rows.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Columns</p>
                      <p className="text-lg font-extrabold text-white font-outfit mt-0.5">{datasetMeta.columns}</p>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="w-full mt-2 py-2 border border-slate-700/50 hover:border-indigo-500/30 hover:bg-indigo-500/5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all duration-300 flex items-center justify-center space-x-1.5 focus:outline-none"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Upload Different CSV</span>
                </button>
              </div>
            )}
            
            {uploading && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-20">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-xs font-semibold text-slate-300">{statusMessage}</p>
              </div>
            )}
          </div>

          {/* Dataset Schema Explorer */}
          {datasetMeta && (
            <div className="glass-card rounded-2xl overflow-hidden">
              <button 
                onClick={() => setIsMetaOpen(!isMetaOpen)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors focus:outline-none"
              >
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-bold text-white">Dataset Schema</span>
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{datasetMeta.column_names.length} fields</span>
              </button>
              
              {isMetaOpen && (
                <div className="px-5 pb-5 max-h-[300px] overflow-y-auto divide-y divide-white/5 border-t border-white/5">
                  {datasetMeta.column_names.map(col => (
                    <div key={col} className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-300 truncate max-w-[150px] font-semibold" title={col}>{col}</span>
                      <div className="flex items-center space-x-2 text-right">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/5 text-[10px] font-bold text-indigo-400 uppercase">{datasetMeta.data_types[col]}</span>
                        {datasetMeta.missing_values[col] > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-red-950/20 text-[9px] font-bold text-red-400" title="Null values">
                            {datasetMeta.missing_values[col]} nulls
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assistant Info */}
          <div className="glass-card rounded-2xl p-5 border-l-2 border-l-indigo-500/50">
            <div className="flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white mb-1">GPT-4o Code Agent</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Queries are handled by writing Python scripts and Plotly configurations. In case of errors, the agent tracebacks and repairs the script automatically.
                </p>
              </div>
            </div>
          </div>
          
        </section>

        {/* Tabbed Analytics Content (Right) */}
        <section className="flex-1 flex flex-col space-y-6 min-w-0">
          
          {/* Main Controls (Tabs) */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-1.5 p-1 bg-slate-950/60 border border-white/5 rounded-xl">
              <button
                onClick={() => setActiveTab('dashboard')}
                disabled={!datasetMeta}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${activeTab === 'dashboard' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/10' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Executive Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'chat' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/10' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>AI Copilot Chat</span>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                disabled={!datasetMeta}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${activeTab === 'preview' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/10' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <TableProperties className="w-3.5 h-3.5" />
                <span>Spreadsheet Preview</span>
              </button>
            </div>
            
            <div className="hidden md:flex items-center space-x-1 bg-slate-900/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping mr-1.5"></span>
              <span>API Gateway: Online</span>
            </div>
          </div>

          {/* Active Tab Screen */}
          <div className="flex-1 glass-card rounded-2xl p-6 min-h-[500px] flex flex-col justify-start">
            
            {/* 1. Executive Dashboard Overview Tab */}
            {activeTab === 'dashboard' && datasetMeta && (
              <div className="space-y-8 animate-fadeIn">
                {/* KPI Card Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="glass-card rounded-2xl p-5 border-l-4 border-l-indigo-500 relative overflow-hidden bg-slate-950/30">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Rows</p>
                    <h3 className="text-2xl font-extrabold text-white font-outfit mt-1">{datasetMeta.rows.toLocaleString()}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Data observations</p>
                  </div>
                  <div className="glass-card rounded-2xl p-5 border-l-4 border-l-purple-500 relative overflow-hidden bg-slate-950/30">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Column Fields</p>
                    <h3 className="text-2xl font-extrabold text-white font-outfit mt-1">{datasetMeta.columns}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Classified metrics</p>
                  </div>
                  <div className="glass-card rounded-2xl p-5 border-l-4 border-l-emerald-500 relative overflow-hidden bg-slate-950/30">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Data Density</p>
                    <h3 className="text-2xl font-extrabold text-white font-outfit mt-1">{datasetMeta.data_density.toFixed(1)}%</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Non-null values percentage</p>
                  </div>
                  <div className="glass-card rounded-2xl p-5 border-l-4 border-l-red-500 relative overflow-hidden bg-slate-950/30">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-sans">Null Rate</p>
                    <h3 className="text-2xl font-extrabold text-white font-outfit mt-1">{datasetMeta.global_null_rate.toFixed(1)}%</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Missing values percentage</p>
                  </div>
                </div>

                {/* Chart designer and Profile Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <ChartBuilder columns={datasetMeta.column_names} previewData={datasetMeta.preview} />
                  </div>
                  <div className="glass-card rounded-2xl p-5 flex flex-col justify-between min-h-[300px] bg-slate-950/20">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Null Value Profile</h4>
                    <div className="flex-1 min-h-[220px]">
                      <PlotlyChart data={{
                        data: [{
                          x: datasetMeta.column_names,
                          y: Object.values(datasetMeta.missing_percentages),
                          type: 'bar',
                          marker: { color: 'rgba(99, 102, 241, 0.5)' }
                        }],
                        layout: {
                          paper_bgcolor: 'rgba(0,0,0,0)',
                          plot_bgcolor: 'rgba(0,0,0,0)',
                          font: { color: '#cbd5e1', size: 9 },
                          margin: { t: 10, b: 35, l: 30, r: 10 },
                          xaxis: { tickfont: { size: 8 } },
                          yaxis: { range: [0, 100], title: { text: "Missing Rate (%)", font: { size: 9 } } }
                        }
                      }} />
                    </div>
                  </div>
                </div>

                {/* Descriptive Statistics */}
                <div className="glass-card rounded-2xl p-6 bg-slate-950/20">
                  <h3 className="text-sm font-bold text-white mb-4">Dataset Descriptive Statistics</h3>
                  <StatsTable 
                    columnNames={datasetMeta.column_names} 
                    dataTypes={datasetMeta.data_types} 
                    describeData={datasetMeta.describe} 
                  />
                </div>
              </div>
            )}

            {/* 2. Conversational Chat Screen */}
            {activeTab === 'chat' && (
              <div className="flex-grow flex flex-col h-full justify-between">
                
                {/* Conversations Body */}
                <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-6 max-h-[500px]">
                  {chatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
                      <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 animate-pulse" />
                      </div>
                      <div className="max-w-md">
                        <h2 className="text-lg font-bold text-white mb-2">Ready to Synthesize Insights</h2>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {!file 
                            ? "Please upload a CSV dataset on the left panel to begin your automated business analysis journey."
                            : "Ask any analytical question, request visualizations, or ask to highlight trends in your dataset."}
                        </p>
                      </div>

                      {file && (
                        <div className="w-full max-w-lg grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                          {suggestions.map((sug, i) => (
                            <button
                              key={i}
                              onClick={() => handleSendQuestion(sug)}
                              className="p-3 text-left border border-white/5 hover:border-indigo-500/30 rounded-xl bg-slate-950/20 hover:bg-slate-900/40 transition-all text-xs font-semibold text-slate-300 hover:text-white focus:outline-none"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {chatHistory.map((chat, idx) => (
                        <div 
                          key={idx} 
                          className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-3xl rounded-2xl p-5 ${
                              chat.sender === 'user' 
                                ? 'bg-indigo-600/90 text-white rounded-br-none shadow-md shadow-indigo-600/10' 
                                : 'bg-slate-900/40 border border-white/5 rounded-bl-none shadow-md shadow-black/20'
                            }`}
                          >
                            <div className="text-sm">
                              {chat.sender === 'user' ? (
                                <p className="font-semibold leading-relaxed whitespace-pre-wrap">{chat.text}</p>
                              ) : (
                                <div className="space-y-4">
                                  {renderFormattedAnswer(chat.text)}
                                  
                                  {chat.chart && (
                                    <div className="mt-4">
                                      <PlotlyChart data={chat.chart} />
                                    </div>
                                  )}
                                  
                                  {chat.code && (
                                    <div className="mt-4">
                                      <CodeInspector code={chat.code} />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {analyzing && (
                        <div className="flex justify-start">
                          <div className="max-w-xl rounded-2xl rounded-bl-none p-5 bg-slate-900/40 border border-white/5 shadow-md flex items-center space-x-4">
                            <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                            <div className="text-xs">
                              <p className="font-bold text-white">{statusMessage}</p>
                              <p className="text-slate-400 mt-0.5">Drafting & self-healing python code blocks...</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>

                {/* Question Input form */}
                {file && (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendQuestion();
                    }}
                    className="flex items-center space-x-3 pt-4 border-t border-white/5"
                  >
                    <input
                      type="text"
                      className="flex-1 px-4 py-3 bg-slate-950/60 border border-white/15 rounded-xl text-sm placeholder-slate-400 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Ask a query (e.g. 'Plot average sales per month as a scatter chart')..."
                      value={question}
                      disabled={analyzing}
                      onChange={(e) => setQuestion(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={!question.trim() || analyzing}
                      className="p-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-45 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-500/20 flex items-center justify-center transition-all focus:outline-none"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
                
              </div>
            )}

            {/* 3. Raw Preview Screen */}
            {activeTab === 'preview' && datasetMeta && (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center space-x-2.5 mb-4">
                  <TableProperties className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Raw Dataset Preview (First 50 Rows)</h3>
                </div>
                <div className="flex-1">
                  <DataPreview 
                    columns={datasetMeta.column_names} 
                    previewData={datasetMeta.preview} 
                  />
                </div>
              </div>
            )}

          </div>

        </section>

      </main>
      
      {/* Visual background dots grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))] -z-20 pointer-events-none" />
    </div>
  );
}

export default App;
