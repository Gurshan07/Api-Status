
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { StatusHistory } from '../types';

interface Props {
  data: StatusHistory[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const date = new Date(label).toLocaleTimeString();
    return (
      <div className="bg-[#1a1a1a] border border-[#333] p-3 rounded-lg shadow-xl">
        <p className="text-gray-400 text-xs mb-1">{date}</p>
        <p className="text-emerald-400 font-medium">
          Response: {payload[0].value.toFixed(0)}ms
        </p>
        <p className="text-gray-500 text-[10px] mt-1 uppercase">
          Status: {payload[0].payload.status}
        </p>
      </div>
    );
  }
  return null;
};

const UptimeChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
          <XAxis 
            dataKey="timestamp" 
            hide 
          />
          <YAxis 
            domain={[0, 'auto']} 
            stroke="#555" 
            fontSize={10} 
            tickFormatter={(value) => `${value}ms`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="responseTime"
            stroke="#10b981"
            fillOpacity={1}
            fill="url(#colorResponse)"
            strokeWidth={2}
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UptimeChart;
