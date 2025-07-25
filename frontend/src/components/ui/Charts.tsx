import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import './Charts.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Default chart options
const defaultOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(200, 200, 200, 0.1)',
      },
      ticks: {
        color: 'var(--text-secondary)',
      },
    },
    x: {
      grid: {
        color: 'rgba(200, 200, 200, 0.1)',
      },
      ticks: {
        color: 'var(--text-secondary)',
      },
    },
  },
};

// Line Chart Component
interface LineChartProps {
  data: ChartData<'line'>;
  options?: ChartOptions<'line'>;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({ 
  data, 
  options = {}, 
  height = 300 
}) => {
  const mergedOptions = {
    ...defaultOptions,
    ...options,
  };

  return (
    <div className="chart-wrapper" style={{ height: `${height}px` }}>
      <Line data={data} options={mergedOptions} />
    </div>
  );
};

// Bar Chart Component
interface BarChartProps {
  data: ChartData<'bar'>;
  options?: ChartOptions<'bar'>;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  options = {}, 
  height = 300 
}) => {
  const mergedOptions = {
    ...defaultOptions,
    ...options,
  };

  return (
    <div className="chart-wrapper" style={{ height: `${height}px` }}>
      <Bar data={data} options={mergedOptions} />
    </div>
  );
};