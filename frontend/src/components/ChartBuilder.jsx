import React, { useState, useEffect, useRef } from 'react';

export default function ChartBuilder({ columns, previewData }) {
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [colorCol, setColorCol] = useState('');
  const [chartType, setChartType] = useState('bar'); // bar, line, scatter, box, histogram
  const chartRef = useRef(null);

  // Set default columns
  useEffect(() => {
    if (columns && columns.length > 0) {
      setXAxis(columns[0]);
      if (columns.length > 1) {
        setYAxis(columns[1]);
      } else {
        setYAxis(columns[0]);
      }
    }
  }, [columns]);

  useEffect(() => {
    if (!chartRef.current || !xAxis || !previewData || previewData.length === 0) return;

    if (window.Plotly) {
      try {
        let traces = [];
        
        if (colorCol) {
          // Group data by color column values
          const groups = {};
          previewData.forEach(row => {
            const key = String(row[colorCol] || 'Undefined');
            if (!groups[key]) groups[key] = [];
            groups[key].push(row);
          });

          Object.keys(groups).forEach(groupKey => {
            const groupData = groups[groupKey];
            traces.push(createTrace(groupKey, groupData));
          });
        } else {
          traces.push(createTrace('Dataset', previewData));
        }

        const layout = {
          title: {
            text: `${chartType.toUpperCase()} Chart: ${xAxis} vs ${yAxis || 'Count'}`,
            font: { color: '#f8fafc', size: 13, family: 'Outfit, sans-serif' }
          },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: '#cbd5e1', family: 'Inter, sans-serif' },
          xaxis: {
            title: { text: xAxis, font: { size: 10 } },
            gridcolor: 'rgba(255, 255, 255, 0.05)',
            zerolinecolor: 'rgba(255, 255, 255, 0.1)',
            tickfont: { size: 9 },
            color: '#94a3b8'
          },
          yaxis: {
            title: { text: yAxis || 'Count', font: { size: 10 } },
            gridcolor: 'rgba(255, 255, 255, 0.05)',
            zerolinecolor: 'rgba(255, 255, 255, 0.1)',
            tickfont: { size: 9 },
            color: '#94a3b8'
          },
          margin: { t: 40, b: 40, l: 55, r: 20 },
          showlegend: colorCol !== '',
          legend: { font: { size: 9, color: '#cbd5e1' }, x: 1, y: 1 },
          barmode: 'group'
        };

        const config = {
          responsive: true,
          displayModeBar: false
        };

        window.Plotly.newPlot(chartRef.current, traces, layout, config);
      } catch (err) {
        console.error("Chart builder rendering failed: ", err);
      }
    }
  }, [xAxis, yAxis, colorCol, chartType, previewData]);

  function createTrace(name, dataRows) {
    const xVals = dataRows.map(row => row[xAxis]);
    const yVals = yAxis ? dataRows.map(row => row[yAxis]) : null;

    const trace = {
      name: name,
      x: xVals,
      y: yVals,
      type: chartType === 'histogram' ? 'histogram' : (chartType === 'scatter' ? 'scatter' : (chartType === 'line' ? 'scatter' : 'bar')),
      mode: chartType === 'line' ? 'lines+markers' : (chartType === 'scatter' ? 'markers' : undefined),
    };

    if (chartType === 'box') {
      trace.type = 'box';
      trace.y = yVals || xVals;
      trace.x = yVals ? xVals : undefined;
    }

    return trace;
  }

  return (
    <div className="w-full flex flex-col md:flex-row gap-6 bg-slate-900/10 border border-white/5 rounded-2xl p-5">
      <div className="w-full md:w-56 space-y-4 shrink-0">
        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Dynamic Visualizer</h4>
        
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Chart Type</label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="w-full text-xs bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="scatter">Scatter Plot</option>
            <option value="box">Box Plot</option>
            <option value="histogram">Histogram</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">X Axis</label>
          <select
            value={xAxis}
            onChange={(e) => setXAxis(e.target.value)}
            className="w-full text-xs bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {chartType !== 'histogram' && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Y Axis</label>
            <select
              value={yAxis}
              onChange={(e) => setYAxis(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">(None / Row Count)</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Color By (Group)</label>
          <select
            value={colorCol}
            onChange={(e) => setColorCol(e.target.value)}
            className="w-full text-xs bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">(None)</option>
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-[300px] border border-white/5 rounded-xl bg-slate-950/40 p-2 flex items-center justify-center relative overflow-hidden">
        <div ref={chartRef} className="w-full h-full min-h-[300px]" />
      </div>
    </div>
  );
}
