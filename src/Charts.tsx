import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

const trend = [
  { time: '08:00', temp: 62, vibration: 1.8, current: 42, probability: 2 },
  { time: '09:00', temp: 64, vibration: 2, current: 43, probability: 2.4 },
  { time: '10:00', temp: 63, vibration: 1.9, current: 41, probability: 2.1 },
  { time: '11:00', temp: 67, vibration: 2.4, current: 45, probability: 3.2 },
  { time: '12:00', temp: 66, vibration: 2.2, current: 44, probability: 2.8 },
  { time: '13:00', temp: 69, vibration: 2.7, current: 46, probability: 3.8 },
  { time: '14:00', temp: 68, vibration: 2.1, current: 43, probability: 3.4 },
  { time: '15:00', temp: 68.4, vibration: 2.1, current: 44, probability: 3.1 },
]

type ChartCardProps = {
  title: string
  value: string
  unit: string
  change: string
  dataKey: keyof typeof trend[0]
  color: string
  type?: 'area' | 'line'
}

export default function ChartCard({ title, value, unit, change, dataKey, color, type = 'area' }: ChartCardProps) {
  return (
    <div className="panel chart-card">
      <div className="chart-heading"><div><span className="section-label">{title}</span><div className="chart-value">{value}<span>{unit}</span></div></div><span className="trend-chip">↗ {change}</span></div>
      <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={60} initialDimension={{ width: 480, height: 110 }}>
          {type === 'area' ? (
            <AreaChart data={trend} margin={{ top: 8, right: 2, left: -26, bottom: 0 }}>
              <defs><linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.26} /><stop offset="95%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#ffffff0a" vertical={false} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#707988', fontSize: 10 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#707988', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#171c25', border: '1px solid #ffffff18', borderRadius: 10, fontSize: 12 }} itemStyle={{ color }} labelStyle={{ color: '#a5afbd' }} />
              <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#gradient-${dataKey})`} activeDot={{ r: 4, stroke: '#11151c', strokeWidth: 2 }} />
            </AreaChart>
          ) : (
            <LineChart data={trend} margin={{ top: 8, right: 2, left: -26, bottom: 0 }}>
              <CartesianGrid stroke="#ffffff0a" vertical={false} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#707988', fontSize: 10 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#707988', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#171c25', border: '1px solid #ffffff18', borderRadius: 10, fontSize: 12 }} itemStyle={{ color }} labelStyle={{ color: '#a5afbd' }} />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      <div className="chart-footer"><span><span className="live-dot" /> DEMO SERIES</span><span>LAST 8 HOURS</span></div>
    </div>
  )
}
