import React, { useEffect, useRef } from 'react';

export default function PlotlyChart({ data }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    if (window.Plotly) {
      try {
        // Deep copy of data and layout to prevent mutate issues
        const chartData = JSON.parse(JSON.stringify(data.data || []));
        const chartLayout = JSON.parse(JSON.stringify(data.layout || {}));
        
        // Custom styling for premium theme
        chartLayout.paper_bgcolor = 'rgba(0,0,0,0)';
        chartLayout.plot_bgcolor = 'rgba(0,0,0,0)';
        
        if (!chartLayout.font) chartLayout.font = {};
        chartLayout.font.color = '#cbd5e1'; // slate-300
        chartLayout.font.family = 'Outfit, Inter, sans-serif';
        
        // Make grids and axes look sleek
        const axisStyles = {
          gridcolor: 'rgba(255, 255, 255, 0.05)',
          zerolinecolor: 'rgba(255, 255, 255, 0.1)',
          linecolor: 'rgba(255, 255, 255, 0.1)',
          tickcolor: 'rgba(255, 255, 255, 0.1)',
        };

        if (chartLayout.xaxis) Object.assign(chartLayout.xaxis, axisStyles);
        if (chartLayout.yaxis) Object.assign(chartLayout.yaxis, axisStyles);
        if (chartLayout.xaxis2) Object.assign(chartLayout.xaxis2, axisStyles);
        if (chartLayout.yaxis2) Object.assign(chartLayout.yaxis2, axisStyles);

        const config = {
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'lasso2d', 'select2d']
        };

        // Redraw/plot chart
        window.Plotly.newPlot(containerRef.current, chartData, chartLayout, config);
      } catch (err) {
        console.error("Plotly rendering failure: ", err);
      }
    }
  }, [data]);

  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center p-2 rounded-xl bg-slate-950/40 border border-white/5 relative overflow-hidden">
      <div ref={containerRef} className="w-full h-full min-h-[400px]" />
    </div>
  );
}
