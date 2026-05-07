import React, { useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Download } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

export default function ReportChart({ type = 'bar', data, options = {}, title, className = '' }) {
    const chartRef = useRef(null);

    function downloadPng() {
        const chart = chartRef.current;
        if (!chart) return;
        const url = chart.toBase64Image('image/png', 1.0);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title ?? 'chart'}.png`;
        a.click();
    }

    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: !!title, text: title ?? '' },
        },
        ...options,
    };

    const ChartComponent = { bar: Bar, line: Line, doughnut: Doughnut }[type] ?? Bar;

    return (
        <div className={`relative rounded-xl border border-slate-100 bg-white p-4 shadow-sm ${className}`}>
            <button
                onClick={downloadPng}
                className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors z-10"
                title="Download chart as PNG"
            >
                <Download size={12} />
                PNG
            </button>
            <ChartComponent ref={chartRef} data={data} options={defaultOptions} />
        </div>
    );
}
