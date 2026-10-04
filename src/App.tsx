import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { useSupabaseWorkspace } from './useSupabaseWorkspace'
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, Bell, Bot, Check,
  ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Command, Download, Factory,
  Gauge, LayoutDashboard, Lightbulb, Menu, MoreHorizontal, Search, Settings2,
  ShieldCheck, Sparkles, Thermometer, Zap, X,
} from 'lucide-react'
const MotorModel = lazy(() => import('./MotorModel'))
const ChartCard = lazy(() => import('./Charts'))
const AIWorkbench = lazy(() => import('./AIWorkbench'))

function DeferredChart(props: React.ComponentProps<typeof ChartCard>) {
  return <Suspense fallback={<div className="panel chart-card chart-loading"><span className="section-label">{props.title}</span><div className="chart-loading-line" /></div>}><ChartCard {...props} /></Suspense>
}

type View = 'Overview' | 'AI analysis' | 'Fleet' | 'Digital twin' | 'Analytics' | 'Alerts' | 'Reports'
type Motor = { id: string; dbId?: string; name: string; location: string; health: number; status: string; temperature: number; vibration: number; voltage?: number; current?: number; rpm?: number; powerFactor?: number; frequency?: number; load?: number; runtime: string; model: string }
type AlertItem = { id: string | number; severity: string; title: string; motor: string; time: string; recommendation: string; confidence: number }

const motors: Motor[] = [
  { id: 'M-2048', name: 'Main drive motor', location: 'Production line 04 · Plant A', health: 96, status: 'Optimal', temperature: 68.4, vibration: 2.1, runtime: '8,421 h', model: 'WEG W22 · 75 kW' },
  { id: 'M-2052', name: 'Cooling pump motor', location: 'Utilities · Plant A', health: 88, status: 'Watch', temperature: 74.2, vibration: 3.8, runtime: '12,098 h', model: 'ABB M3BP · 55 kW' },
  { id: 'M-2091', name: 'Conveyor motor 02', location: 'Assembly · Plant B', health: 62, status: 'Attention', temperature: 81.6, vibration: 5.7, runtime: '18,342 h', model: 'Siemens SIMOTICS · 90 kW' },
  { id: 'M-2104', name: 'Exhaust fan motor', location: 'Processing · Plant B', health: 99, status: 'Optimal', temperature: 61.2, vibration: 1.6, runtime: '5,628 h', model: 'WEG W22 · 45 kW' },
]

const sensorMetrics = [
  { label: 'Temperature', value: '68.4', unit: '°C', icon: Thermometer, delta: '+1.2°', good: true, detail: 'Within normal operating range', fill: 0.68 },
  { label: 'Vibration', value: '2.1', unit: 'mm/s', icon: Activity, delta: '−0.3', good: true, detail: 'Smooth · no resonance detected', fill: 0.32 },
  { label: 'Voltage', value: '414', unit: 'V', icon: Zap, delta: 'Stable', good: true, detail: 'Balanced across all 3 phases', fill: 0.76 },
  { label: 'Current', value: '44.2', unit: 'A', icon: Gauge, delta: '+2.1%', good: true, detail: 'Consistent with operating load', fill: 0.56 },
]

const navItems: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'AI analysis', icon: Sparkles },
  { label: 'Fleet', icon: Factory },
  { label: 'Digital twin', icon: Activity },
  { label: 'Analytics', icon: Gauge },
  { label: 'Alerts', icon: Bell },
  { label: 'Reports', icon: Download },
]

const initialAlerts: AlertItem[] = [
  { id: 1, severity: 'High', title: 'Elevated bearing vibration', motor: 'Conveyor motor 02 · M-2091', time: '12 min ago', recommendation: 'Schedule bearing inspection within 48 hours.', confidence: 94 },
  { id: 2, severity: 'Medium', title: 'Temperature trending upward', motor: 'Cooling pump motor · M-2052', time: '1 hr ago', recommendation: 'Inspect cooling path at next planned stop.', confidence: 87 },
  { id: 3, severity: 'Low', title: 'Efficiency below optimal range', motor: 'Main drive motor · M-2048', time: '3 hr ago', recommendation: 'Review load profile during next shift.', confidence: 91 },
]

function GaugeRing({ value, size = 42, stroke = 3 }: { value: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2
  const circumference = Math.PI * radius * 2
  return (
    <svg width={size} height={size} className="gauge-ring" viewBox={`0 0 ${size} ${size}`}>
      <circle className="gauge-track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
      <circle className="gauge-value" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} strokeDasharray={`${circumference * value / 100} ${circumference}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  )
}

function Sparkline({ color = '#82baff', values = [8, 11, 9, 13, 10, 16, 14, 19] }: { color?: string; values?: number[] }) {
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${29 - value}`).join(' ')
  return <svg className="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points={points} fill="none" stroke={color} strokeWidth="1.7" vectorEffect="non-scaling-stroke" /></svg>
}

function Landing({ onEnter }: { onEnter: () => void }) {
  const [phase, setPhase] = useState(0)
  const phaseLabels = ['Activating neural engine', 'Synchronizing sensor array', 'Generating digital twin', 'Analyzing motor health', 'System ready']
  useEffect(() => {
    const timer = window.setInterval(() => setPhase((value) => Math.min(value + 1, phaseLabels.length - 1)), 1050)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <main className="landing">
      <div className="landing-grid" />
      <header className="landing-header">
        <div className="brand-lockup"><div className="brand-mark"><Activity size={18} /></div><span>MOTORSENSE<span className="brand-ai"> AI</span></span></div>
        <span className="landing-header-label"><span className="live-dot" /> INTELLIGENCE PLATFORM · V 2.4</span>
      </header>
      <div className="landing-copy">
        <div className="eyebrow"><span className="eyebrow-line" /> PREDICTIVE INTELLIGENCE, REDEFINED</div>
        <h1>Know before<br />it <span>stops.</span></h1>
        <p className="landing-description">A new standard in industrial reliability.<br />See what your motors are telling you.</p>
        <div className="init-status">
          <span className="init-icon">{phase === 4 ? <Check size={15} /> : <span className="spinner" />}</span>
          <span className="init-copy"><strong>MotorSense AI initializing</strong><small>{phaseLabels[phase]}</small></span>
          <span className="init-progress">{String(Math.round(((phase + 1) / phaseLabels.length) * 100)).padStart(2, '0')}%</span>
        </div>
        {phase === 4 && <motion.button className="enter-button" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={onEnter}>Enter your workspace <ArrowRight size={17} /></motion.button>}
        <div className="landing-footnote"><ShieldCheck size={13} /> SECURE INDUSTRIAL INTELLIGENCE <span>·</span> BUILT FOR WHAT MATTERS</div>
      </div>
      <div className="hero-visual">
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <div className="hero-scan" />
        <Suspense fallback={<div className="hero-motor model-loading" />}><MotorModel className="hero-motor" /></Suspense>
        <div className="hero-label label-temperature"><span className="sensor-pulse" /><small>WINDING TEMP</small><strong>68.4<span>°C</span></strong><em>OPTIMAL</em></div>
        <div className="hero-label label-vibration"><span className="sensor-pulse" /><small>VIBRATION</small><strong>2.1<span> mm/s</span></strong><em>WITHIN RANGE</em></div>
        <div className="health-float"><div className="health-float-label">MOTOR HEALTH</div><div className="health-float-value">96<span>%</span></div><div className="health-float-foot"><span className="live-dot" /> DEMO MODEL · SAMPLE DATA</div></div>
        <div className="hero-telemetry"><span>FIG. 01</span><span>DIGITAL TWIN · DEMO DATA <span className="live-dot" /></span></div>
      </div>
      <div className="landing-bottom"><span>© {new Date().getFullYear()} MOTORSENSE INTELLIGENCE</span><span>DESIGNED FOR UPTIME <span className="blue-dot">●</span></span></div>
    </main>
  )
}

function Overview({ motors, selected, setSelected, onAsk, onNavigate }: { motors: Motor[]; selected: Motor; setSelected: (motor: Motor) => void; onAsk: () => void; onNavigate: (view: View) => void }) {
  const [filter, setFilter] = useState('All motors')
  const fleet = filter === 'All motors' ? motors.slice(0, 3) : motors.filter((motor) => motor.status === filter)
  const liveMetrics = sensorMetrics.map((metric) => ({
    ...metric,
    value: metric.label === 'Temperature' ? selected.temperature.toFixed(1)
      : metric.label === 'Vibration' ? selected.vibration.toFixed(1)
        : metric.label === 'Voltage' ? String(selected.voltage ?? 414)
          : String(selected.current ?? 44.2),
    good: metric.label === 'Temperature' ? selected.temperature <= 80
      : metric.label === 'Vibration' ? selected.vibration <= 4
        : true,
    detail: metric.label === 'Temperature' && selected.temperature > 80 ? 'Above recommended operating range'
      : metric.label === 'Vibration' && selected.vibration > 4 ? 'Inspect for bearing wear or imbalance'
        : metric.detail,
  }))
  const averageHealth = motors.length
    ? Math.round(motors.reduce((total, motor) => total + motor.health, 0) / motors.length * 10) / 10
    : 0
  const failureProbability = Math.min(95, Math.max(1, Math.round((100 - selected.health) * 0.62 + Math.max(0, selected.temperature - 75) * 0.5 + Math.max(0, selected.vibration - 4) * 3)))
  const riskLabel = failureProbability >= 40 ? 'Critical' : failureProbability >= 20 ? 'High' : failureProbability >= 8 ? 'Medium' : 'Low'
  const recommendation = selected.vibration > 4.5
    ? 'Prioritize a bearing inspection. Elevated vibration is the clearest early-warning signal.'
    : selected.temperature > 80
      ? 'Inspect cooling airflow and winding insulation at the next safe stop.'
      : selected.health < 82
        ? 'Schedule a condition-based inspection within the next planned maintenance window.'
        : 'Continue normal operation. Next scheduled inspection in 42 days.'
  return (
    <>
      <section className="welcome-row">
        <div><div className="breadcrumb">WORKSPACE <ChevronRight size={12} /> PLANT A <ChevronRight size={12} /> OVERVIEW</div><h1>Good morning, Alex <span className="wave">✳</span></h1><p>Here's what's happening across your operation today.</p></div>
        <div className="welcome-actions"><button className="button-quiet" onClick={onAsk}><Sparkles size={15} /> Ask MotorSense</button><div className="date-pill"><span className="live-dot" /> DEMO DATA <span className="date-separator" /> <span>Today, {new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric' }).format(new Date())}</span></div></div>
      </section>
      <section className="kpi-grid">
        {[
          { label: 'FLEET HEALTH', value: averageHealth.toFixed(1), unit: '%', note: 'Average asset condition', icon: Activity, color: 'blue', spark: [8, 10, 11, 9, 14, 12, 16, 19] },
          { label: 'FAILURE PROBABILITY', value: '3.1', unit: '%', note: '↓ 0.8% vs last month', icon: ShieldCheck, color: 'green', spark: [19, 15, 17, 13, 12, 11, 9, 8] },
          { label: 'UPTIME THIS MONTH', value: '99.8', unit: '%', note: '↑ 0.3% vs last month', icon: Clock3, color: 'purple', spark: [10, 12, 11, 15, 14, 17, 16, 20] },
          { label: 'ENERGY EFFICIENCY', value: '94.6', unit: '%', note: '$2,840 saved this month', icon: Zap, color: 'amber', spark: [8, 9, 12, 10, 14, 15, 17, 19] },
        ].map((item, i) => <motion.div className={`panel kpi-card ${item.color}`} key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}><div className="kpi-top"><span className="section-label">{item.label}</span><span className="kpi-icon"><item.icon size={15} /></span></div><div className="kpi-number">{item.value}<small>{item.unit}</small></div><div className="kpi-bottom"><span>{item.note}</span><Sparkline values={item.spark} /></div></motion.div>)}
      </section>
      <div className="content-grid twin-grid">
        <section className="panel twin-panel">
          <div className="panel-heading"><div><span className="section-label">DIGITAL TWIN</span><h2>{selected.name}</h2></div><button className="icon-button" aria-label="Twin options"><MoreHorizontal size={18} /></button></div>
          <div className="twin-canvas">
            <div className="twin-halo" /><div className="twin-scanline" />
            <Suspense fallback={<div className="twin-model model-loading" />}><MotorModel className="twin-model" /></Suspense>
            <div className="twin-tag tag-temp"><span className="tag-dot amber-dot" /> TEMP <b>{selected.temperature}°C</b></div>
            <div className="twin-tag tag-vibe"><span className="tag-dot" /> VIBRATION <b>{selected.vibration} mm/s</b></div>
            <div className="twin-caption"><span className="live-dot" /> RENDERING LIVE TWIN</div>
            <div className="twin-scale"><span>− Z</span><span>+ Z</span></div>
          </div>
          <div className="twin-footer"><div><span className="section-label">MODEL</span><strong>{selected.model}</strong></div><div><span className="section-label">RUNTIME</span><strong>{selected.runtime}</strong></div><button className="button-outline" onClick={() => onNavigate('Digital twin')}>Explore twin <ArrowRight size={13} /></button></div>
        </section>
        <section className="panel health-panel">
          <div className="panel-heading"><div><span className="section-label">AI HEALTH ASSESSMENT</span><h2>Motor condition</h2></div><button className="text-button" onClick={onAsk}>Ask AI <ArrowRight size={13} /></button></div>
          <div className="health-score-block"><div className="big-gauge"><svg viewBox="0 0 160 160"><circle className="big-gauge-track" cx="80" cy="80" r="69" /><circle className="big-gauge-progress" cx="80" cy="80" r="69" style={{ strokeDashoffset: `${433.5 * (1 - selected.health / 100)}` }} /></svg><div><strong>{selected.health}</strong><span>HEALTH SCORE</span></div></div><div className="health-insight"><span className={`status-pill ${selected.status === 'Maintenance' ? 'attention' : selected.status.toLowerCase()}`}><span className="status-dot" /> {selected.status.toUpperCase()}</span><h3>{selected.health >= 85 ? 'Operating as expected' : selected.health >= 70 ? 'Condition needs monitoring' : 'Inspection recommended'}</h3><p>{selected.health >= 85 ? 'Sensor readings remain within acceptable operating parameters.' : `Review the ${selected.temperature > 80 ? 'temperature' : 'vibration'} trend and plan a condition-based inspection.`}</p><span className="confidence"><Sparkles size={12} /> DEMO MODEL · 99.2% CONFIDENCE</span></div></div>
          <div className="risk-box"><div className="risk-head"><span><span className={`status-dot ${riskLabel === 'Low' ? 'green-bg' : 'warning-dot'}`} /> FAILURE RISK</span><strong className={riskLabel === 'Low' ? '' : 'warning-text'}>{riskLabel}</strong></div><div className="risk-meter"><i style={{ width: `${failureProbability}%` }} /></div><div className="risk-foot"><span>{failureProbability}% probability</span><span>Next 30 days · estimate</span></div></div>
          <div className="recommendation"><div className="recommendation-icon"><Lightbulb size={15} /></div><div><span className="section-label">AI RECOMMENDATION · DEMO MODEL</span><p>{recommendation}</p></div></div>
          <button className="button-quiet full-button" onClick={onAsk}>View full AI analysis <ArrowRight size={14} /></button>
        </section>
      </div>
      <section className="panel sensors-panel">
        <div className="panel-heading sensor-heading"><div><span className="section-label">SENSOR TELEMETRY · DEMO</span><h2>Live sensor readings</h2></div><div className="sensor-meta"><span className="sensor-meta-item"><span className="live-dot" /> SAMPLE DATA</span><span className="sensor-divider" /><span>Demo stream</span><button className="icon-button"><Settings2 size={16} /></button></div></div>
        <div className="sensors-grid">{liveMetrics.map((metric, i) => <div className="sensor-tile" key={metric.label}><div className="sensor-tile-top"><span className="sensor-icon"><metric.icon size={15} /></span><span className="sensor-delta">{metric.delta}</span></div><div className="sensor-reading">{metric.value}<small>{metric.unit}</small></div><div className="sensor-name">{metric.label}</div><div className="sensor-bar"><i style={{ width: `${metric.fill * 100}%`, transitionDelay: `${i * 100}ms` }} /></div><span className="sensor-interp"><span className={`status-dot ${metric.good ? 'green-bg' : 'warning-dot'}`} /> {metric.detail}</span></div>)}</div>
        <div className="sensor-extra-row">{[['RPM', (selected.rpm ?? 1482).toLocaleString(), 'rpm'], ['Power factor', (selected.powerFactor ?? 0.94).toFixed(2), 'PF'], ['Frequency', (selected.frequency ?? 50).toFixed(1), 'Hz'], ['Load', String(selected.load ?? 76), '%']].map(([label, value, unit]) => <div className="sensor-extra" key={label}><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>)}</div>
      </section>
      <section className="charts-grid">
        <DeferredChart title="WINDING TEMPERATURE" value="68.4" unit=" °C" change="+1.2°" dataKey="temp" color="#73b7ff" />
        <DeferredChart title="VIBRATION VELOCITY" value="2.1" unit=" mm/s" change="−0.3" dataKey="vibration" color="#9c91ff" />
        <DeferredChart title="MOTOR CURRENT" value="44.2" unit=" A" change="+2.1%" dataKey="current" color="#5dd7b4" />
      </section>
      <section className="panel fleet-panel">
        <div className="panel-heading"><div><span className="section-label">YOUR OPERATION</span><h2>Motor fleet <span className="count-badge">{motors.length}</span></h2></div><div className="fleet-tools"><div className="select-wrap"><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter motors"><option>All motors</option><option>Optimal</option><option>Watch</option><option>Attention</option></select><ChevronDown size={13} /></div><button className="text-button" onClick={() => onNavigate('Fleet')}>View all <ArrowRight size={13} /></button></div></div>
        <div className="fleet-table"><div className="fleet-row fleet-header"><span>MOTOR</span><span>HEALTH</span><span>STATUS</span><span>TEMPERATURE</span><span>VIBRATION</span><span>RUNTIME</span><span /></div>{fleet.map((motor) => <button className={`fleet-row fleet-item ${selected.id === motor.id ? 'selected' : ''}`} key={motor.id} onClick={() => setSelected(motor)}><span className="motor-name"><span className="motor-asset"><Activity size={14} /></span><span><strong>{motor.name}</strong><small>{motor.id} · {motor.location}</small></span></span><span className="fleet-health"><GaugeRing value={motor.health} size={28} stroke={3} /><strong>{motor.health}%</strong></span><span><span className={`status-pill ${motor.status.toLowerCase()}`}><span className="status-dot" /> {motor.status}</span></span><span className={motor.temperature > 80 ? 'warning-text' : ''}>{motor.temperature}°C</span><span className={motor.vibration > 5 ? 'warning-text' : ''}>{motor.vibration} mm/s</span><span>{motor.runtime}</span><ChevronRight size={15} className="fleet-chevron" /></button>)}</div>
        <div className="fleet-footer"><span>Showing {fleet.length} of {motors.length} motors</span><div className="page-controls"><button aria-label="Previous page"><ChevronLeft size={14} /></button><span>01 / {String(Math.max(1, Math.ceil(motors.length / 3))).padStart(2, '0')}</span><button aria-label="Next page"><ChevronRight size={14} /></button></div></div>
      </section>
    </>
  )
}

function FleetView({ motors, selected, setSelected }: { motors: Motor[]; selected: Motor; setSelected: (motor: Motor) => void }) {
  return <section className="page-section"><div className="section-intro"><div className="eyebrow"><span className="eyebrow-line" /> ASSET MANAGEMENT</div><h1>Motor fleet</h1><p>Every motor. One clear picture.</p></div><div className="fleet-summary">{[['TOTAL ASSETS', String(motors.length), 'Across monitored facilities'], ['OPTIMAL', String(motors.filter((motor) => motor.status === 'Optimal').length), 'Within operating limits'], ['NEEDS ATTENTION', String(motors.filter((motor) => motor.status === 'Watch' || motor.status === 'Attention').length), 'Review active recommendations'], ['IN MAINTENANCE', String(motors.filter((motor) => motor.status === 'Maintenance').length), 'Scheduled work']].map(([title, value, note]) => <div className="panel fleet-summary-card" key={title}><span className="section-label">{title}</span><strong>{value}</strong><small>{note}</small></div>)}</div><div className="fleet-card-grid">{motors.map((motor) => <button className={`panel fleet-asset-card ${selected.id === motor.id ? 'selected' : ''}`} onClick={() => setSelected(motor)} key={motor.id}><div className="asset-card-top"><span className="motor-asset"><Activity size={15} /></span><span className={`status-pill ${motor.status.toLowerCase()}`}><span className="status-dot" />{motor.status}</span><MoreHorizontal size={16} /></div><span className="section-label">{motor.id} · {motor.location.split(' · ')[0].toUpperCase()}</span><h3>{motor.name}</h3><p>{motor.model}</p><div className="asset-health"><GaugeRing value={motor.health} size={35} stroke={3} /><strong>{motor.health}% <small>HEALTH</small></strong><Sparkline color={motor.health < 70 ? '#f1a474' : '#82baff'} /></div><div className="asset-readings"><span><Thermometer size={13} /> {motor.temperature}°C</span><span><Activity size={13} /> {motor.vibration} mm/s</span><span><Clock3 size={13} /> {motor.runtime}</span></div></button>)}</div></section>
}

function TwinView({ selected, onAsk }: { selected: Motor; onAsk: () => void }) {
  return <section className="page-section twin-view"><div className="section-intro"><div className="eyebrow"><span className="eyebrow-line" /> LIVE DIGITAL REPLICA</div><h1>Digital twin</h1><p>One-to-one intelligence for {selected.id}.</p></div><div className="panel full-twin"><div className="full-twin-top"><div><span className="section-label">LIVE DIGITAL TWIN</span><h2>{selected.name}</h2></div><span className="date-pill"><span className="live-dot" /> SYNCHRONIZED</span></div><div className="full-twin-stage"><div className="full-twin-orbit" /><Suspense fallback={<div className="full-twin-model model-loading" />}><MotorModel className="full-twin-model" /></Suspense><div className="twin-tag full-tag-temp"><span className="tag-dot amber-dot" /> STATOR TEMP <b>{selected.temperature}°C</b></div><div className="twin-tag full-tag-vibration"><span className="tag-dot" /> BEARING VIBRATION <b>{selected.vibration} mm/s</b></div><div className="twin-tag full-tag-health"><span className="tag-dot green-bg" /> OVERALL HEALTH <b>{selected.health}%</b></div><div className="twin-caption"><span className="live-dot" /> DATA STREAM ACTIVE · 250 MS</div></div><div className="twin-sensors"><div><Thermometer size={16} /><span>THERMAL PROFILE</span><strong>{selected.temperature}°C <small>Nominal</small></strong></div><div><Activity size={16} /><span>VIBRATION MAP</span><strong>{selected.vibration} mm/s <small>Stable</small></strong></div><div><ShieldCheck size={16} /><span>WEAR INDICATOR</span><strong>Low <small>3.2% estimated</small></strong></div><div><Clock3 size={16} /><span>REMAINING USEFUL LIFE</span><strong>18,420 h <small>+ 6.8% vs baseline</small></strong></div></div><button className="button-quiet" onClick={onAsk}><Sparkles size={14} /> Ask AI about this motor <ArrowRight size={14} /></button></div></section>
}

function AnalyticsView() {
  return <section className="page-section"><div className="section-intro"><div className="eyebrow"><span className="eyebrow-line" /> OPERATIONAL INTELLIGENCE</div><h1>Analytics</h1><p>Reliability, performance, and impact — at a glance.</p></div><div className="analytics-kpis">{[['MEAN TIME BETWEEN FAILURES', '2,840', 'hrs', '+18% vs. industry'], ['MEAN TIME TO REPAIR', '3.2', 'hrs', '−24% this quarter'], ['AVOIDED DOWNTIME', '128', 'hrs', 'Year to date'], ['COST AVOIDED', '$84,320', '', 'Through predictive action']].map(([label, value, unit, note]) => <div className="panel analytics-kpi" key={label}><span className="section-label">{label}</span><strong>{value}<small>{unit}</small></strong><span className="trend-chip"><ArrowUpRight size={11} /> {note}</span></div>)}</div><div className="analytics-charts"><DeferredChart title="FLEET TEMPERATURE" value="68.4" unit=" °C" change="+1.2°" dataKey="temp" color="#73b7ff" /><DeferredChart title="FAILURE PROBABILITY" value="3.1" unit="%" change="−0.8%" dataKey="probability" color="#c690ff" /><DeferredChart title="ENERGY CONSUMPTION" value="248" unit=" kWh" change="−6.2%" dataKey="current" color="#62dbb2" /></div><div className="content-grid analytics-bottom"><div className="panel analytics-note"><span className="section-label">RELIABILITY OUTLOOK</span><h2>Fleet reliability is improving.</h2><p>Predictive maintenance interventions have reduced unplanned downtime by <strong>32%</strong> this quarter. The team is on track to exceed the annual reliability target.</p><div className="progress-row"><span>ANNUAL RELIABILITY TARGET</span><strong>96.2% <small> / 98%</small></strong></div><div className="risk-meter"><i style={{ width: '76%' }} /></div></div><div className="panel analytics-note"><span className="section-label">COST IMPACT · YTD</span><h2>$84,320 <small>saved</small></h2><p>Across avoided failures, optimized energy usage, and reduced reactive maintenance.</p><div className="cost-breakdown"><span>AVOIDED FAILURES <strong>$58,400</strong></span><span>ENERGY OPTIMIZATION <strong>$18,720</strong></span><span>PLANNED MAINTENANCE <strong>$7,200</strong></span></div></div></div></section>
}

function AlertsView({ alerts, acknowledge }: { alerts: AlertItem[]; acknowledge: (id: string | number) => void }) {
  return <section className="page-section"><div className="section-intro"><div className="eyebrow"><span className="eyebrow-line" /> AI-POWERED MONITORING</div><h1>Alert center</h1><p>See the signals that need your attention.</p></div><div className="alerts-summary"><div className="panel alert-count-card"><span className="section-label">OPEN ALERTS</span><strong>{alerts.length}</strong><span>Across monitored motors</span></div>{['High', 'Medium', 'Low'].map((level) => <div className="panel alert-level" key={level}><span className={`severity-mark ${level.toLowerCase()}`} /><span>{level.toUpperCase()}</span><strong>{alerts.filter((alert) => alert.severity.toLowerCase() === level.toLowerCase()).length}</strong></div>)}</div><div className="panel alerts-list"><div className="panel-heading"><div><span className="section-label">ACTIVE INSIGHTS</span><h2>Needs your attention</h2></div><button className="button-outline"><Settings2 size={14} /> Alert settings</button></div>{alerts.length ? alerts.map((alert) => <div className="alert-entry" key={alert.id}><div className={`alert-symbol ${alert.severity.toLowerCase()}`}><AlertTriangle size={17} /></div><div className="alert-main"><div className="alert-title-row"><h3>{alert.title}</h3><span className={`status-pill ${alert.severity.toLowerCase()}`}>{alert.severity} priority</span></div><p>{alert.motor} <span>·</span> {alert.time}</p><div className="alert-recommendation"><Sparkles size={13} /><span><strong>AI recommendation</strong> · {alert.recommendation}</span></div></div><div className="alert-confidence"><span className="section-label">CONFIDENCE</span><strong>{alert.confidence}%</strong></div><button className="button-outline" onClick={() => acknowledge(alert.id)}><Check size={13} /> Acknowledge</button></div>) : <div className="empty-state"><span className="empty-icon"><Check size={21} /></span><h3>You're all caught up.</h3><p>No active alerts across the fleet.</p></div>}</div></section>
}

function ReportsView({ motors }: { motors: Motor[] }) {
  const [period, setPeriod] = useState('Last 7 days')
  const [selectedTemplate, setSelectedTemplate] = useState('Daily operations')
  const [exported, setExported] = useState(false)
  const templates = [
    { title: 'Daily operations', description: 'A shift-by-shift health and alert summary.', icon: Activity },
    { title: 'Weekly reliability', description: 'Uptime trends, MTBF, and action items.', icon: ShieldCheck },
    { title: 'Energy efficiency', description: 'Consumption patterns and savings opportunities.', icon: Zap },
    { title: 'Failure analysis', description: 'Root cause, impact, and preventive actions.', icon: AlertTriangle },
  ]
  const exportCsv = () => {
    const rows = [['Motor', 'ID', 'Health', 'Status', 'Temperature °C', 'Vibration mm/s', 'Runtime'], ...motors.map((motor) => [motor.name, motor.id, `${motor.health}%`, motor.status, motor.temperature.toString(), motor.vibration.toString(), motor.runtime])]
    const link = document.createElement('a')
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
    link.href = url
    link.download = `motorsense-${selectedTemplate.toLowerCase().replaceAll(' ', '-')}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setExported(true)
  }
  return (
    <section className="page-section">
      <div className="section-intro"><div className="eyebrow"><span className="eyebrow-line" /> YOUR DATA, CLEARLY TOLD</div><h1>Reports</h1><p>Decision-ready insights for your operation.</p></div>
      <div className="panel report-builder">
        <div className="report-builder-copy">
          <span className="section-label">REPORT GENERATOR · CSV EXPORT</span><h2>What would you like to know?</h2><p>Select a report template and date range. The current demo export includes fleet asset readings.</p>
          <div className="report-controls"><select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Report period"><option>Last 7 days</option><option>Last 30 days</option><option>This quarter</option><option>Year to date</option></select><button className="button-primary" onClick={exportCsv}><Download size={14} /> {exported ? 'Download CSV again' : 'Export report as CSV'} <ArrowRight size={14} /></button></div>
        </div>
        <div className="report-preview">
          <div className="report-preview-top"><span className="brand-mark small-mark"><Activity size={13} /></span><span>MOTORSENSE AI <small>· {selectedTemplate.toUpperCase()}</small></span><span className="report-page">01 / 04</span></div>
          <span className="section-label">PLANT A · {period.toUpperCase()}</span><strong>{selectedTemplate}</strong>
          <div className="report-mini-stats"><span><small>FLEET HEALTH</small><b>96.2%</b></span><span><small>UPTIME</small><b>99.8%</b></span><span><small>OPEN ALERTS</small><b>{String(initialAlerts.length).padStart(2, '0')}</b></span></div>
          <div className="report-mini-chart"><Sparkline values={[7, 11, 10, 15, 13, 18, 16, 23]} /></div>
          <span className="report-footnote">DEMO PREVIEW · {new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date()).toUpperCase()}</span>
        </div>
      </div>
      <div className="report-types"><span className="section-label">START WITH A TEMPLATE</span>
        <div className="report-type-grid">{templates.map(({ title, description, icon: Icon }) => <button className={`panel report-type ${selectedTemplate === title ? 'selected' : ''}`} onClick={() => setSelectedTemplate(title)} aria-pressed={selectedTemplate === title} key={title}><span className="report-type-icon"><Icon size={17} /></span><strong>{title}</strong><p>{description}</p><ArrowRight size={14} className="report-arrow" /></button>)}</div>
        <button className="button-outline export-csv" onClick={exportCsv}><Download size={14} /> Export fleet data · CSV</button>
      </div>
    </section>
  )
}

function Assistant({ onClose, selected, cloudEnabled }: { onClose: () => void; selected: Motor; cloudEnabled: boolean }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<{ from: 'ai' | 'user'; text: string }[]>([{ from: 'ai', text: `Hi — I’m looking at ${selected.name}. Its current health score is ${selected.health}% with ${selected.status.toLowerCase()} status. Ask me about readings, risks, or next steps.` }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prompts = ['Explain the latest readings', 'Anything I should watch?', 'Recommend a maintenance plan', 'Suggest spare parts to inspect']
  const send = async (value = question) => {
    const text = value.trim()
    if (!text || busy) return
    setMessages((items) => [...items, { from: 'user', text }])
    setQuestion('')
    setError(null)
    if (cloudEnabled && supabase) {
      if (!selected.dbId) {
        setError('Select a motor configured in your secure workspace before asking the hosted assistant.')
        return
      }
      setBusy(true)
      const { data, error: invokeError } = await supabase.functions.invoke('motorsense-copilot', {
        body: { motorId: selected.dbId, question: text },
      })
      setBusy(false)
      if (invokeError) {
        setError(`MotorSense Copilot failed: ${invokeError.message}`)
        return
      }
      const result = data as { reply?: unknown } | null
      const reply = result?.reply
      if (typeof reply !== 'string' || !reply.trim()) {
        setError('MotorSense Copilot returned an incomplete response.')
        return
      }
      setMessages((items) => [...items, { from: 'ai', text: reply }])
      return
    }

    const answer = /spare|part/i.test(text)
      ? `For ${selected.name}, have the OEM bearing kit, shaft seals, and specified lubricant reviewed against the nameplate and service manual. This demo cannot verify part numbers or fitment; confirm compatibility with the motor manufacturer before ordering.`
      : /report|summar/i.test(text)
        ? `Maintenance summary for ${selected.name}: ${selected.health}% health, ${selected.temperature}°C winding temperature, and ${selected.vibration} mm/s vibration. Current demo status is ${selected.status.toLowerCase()}. Include the latest inspection findings and site work-order details before issuing a formal report.`
        : /anomal|cause|watch|reading/i.test(text)
          ? `For ${selected.name}, the demo profile reports ${selected.temperature}°C temperature and ${selected.vibration} mm/s vibration. ${selected.temperature > 80 || selected.vibration > 4 ? 'Review the elevated reading and verify the sensor and machine condition at a safe planned inspection.' : 'Both readings are within the displayed operating range; keep trending them during normal operation.'}`
          : `For ${selected.name}, plan a condition-based inspection${selected.health < 80 || selected.vibration > 4 ? ' at the next safe maintenance opportunity' : ' at the next scheduled stop'}. Review bearing condition, lubrication, and alignment; follow site isolation procedures and confirm any part numbers with the OEM.`
    setMessages((items) => [...items, { from: 'ai', text: answer }])
  }
  return (
    <motion.div className="assistant-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <motion.aside className="assistant-panel" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 30, opacity: 0 }}>
        <div className="assistant-header"><div className="assistant-avatar"><Bot size={17} /></div><div><strong>MotorSense Copilot</strong><span><span className="live-dot" /> {cloudEnabled ? 'SECURE WORKSPACE AI' : 'DEMO MODEL · SENSOR CONTEXT'}</span></div><button className="icon-button" onClick={onClose} aria-label="Close assistant"><X size={17} /></button></div>
        <div className="assistant-context"><Sparkles size={13} /> ANALYZING <strong>{selected.id} · {selected.name}</strong></div>
        <div className="assistant-messages">{messages.map((message, index) => <div className={`assistant-message ${message.from}`} key={index}>{message.from === 'ai' && <span className="assistant-message-avatar"><Bot size={13} /></span>}<div>{message.text}</div></div>)}{busy && <div className="assistant-message ai"><span className="assistant-message-avatar"><Bot size={13} /></span><div className="assistant-thinking"><span className="spinner" /> Reviewing motor context…</div></div>}</div>
        {error && <div className="assistant-error" role="alert">{error}</div>}
        <div className="assistant-prompts">{prompts.map((prompt) => <button onClick={() => { void send(prompt) }} disabled={busy} key={prompt}>{prompt} <ArrowRight size={12} /></button>)}</div>
        <form className="assistant-input" onSubmit={(event) => { event.preventDefault(); void send() }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about your motor fleet…" disabled={busy} /><button type="submit" aria-label="Send question" disabled={busy}><ArrowRight size={16} /></button></form>
        <span className="assistant-disclaimer">AI guidance is informational. Follow site safety procedures and verify critical decisions.</span>
      </motion.aside>
    </motion.div>
  )
}

function SignInScreen({ message }: { message: string | null }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(message)
  const [busy, setBusy] = useState(false)

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) setError(signInError.message)
    setBusy(false)
  }

  return (
    <main className="auth-screen">
      <div className="auth-grid" />
      <div className="auth-card panel">
        <div className="brand-lockup"><div className="brand-mark"><Activity size={18} /></div><span>MOTORSENSE<span className="brand-ai"> AI</span></span></div>
        <div className="eyebrow"><span className="eyebrow-line" /> SECURE WORKSPACE</div>
        <h1>Welcome back.</h1><p>Sign in with your invited workspace account to continue.</p>
        <form onSubmit={signIn}>
          <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="button-primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'} <ArrowRight size={14} /></button>
        </form>
        <span className="auth-footnote"><ShieldCheck size={13} /> AUTHENTICATED WITH YOUR SUPABASE WORKSPACE</span>
      </div>
    </main>
  )
}

function App() {
  const [entered, setEntered] = useState(false)
  const [view, setView] = useState<View>('Overview')
  const [selected, setSelected] = useState(motors[0])
  const [session, setSession] = useState<Session | null>(null)
  const [authChecking, setAuthChecking] = useState(isSupabaseConfigured)
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const workspace = useSupabaseWorkspace(session, motors, initialAlerts)
  const fleetMotors = workspace.motors
  const alerts = workspace.alerts
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const liveValue = useMemo(() => new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date()), [])

  useEffect(() => {
    if (!supabase) return
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthChecking(false)
    })
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setAuthMessage(`Unable to restore your session: ${error.message}`)
      setSession(data.session)
      setAuthChecking(false)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (fleetMotors.length === 0) return
    setSelected((current) => fleetMotors.find((motor) => motor.dbId && motor.dbId === current.dbId)
      ?? fleetMotors.find((motor) => motor.id === current.id)
      ?? fleetMotors[0])
  }, [fleetMotors])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((value) => !value)
      }
      if (event.key === 'Escape') { setAssistantOpen(false); setSearchOpen(false); setMenuOpen(false) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const allowedNavItems = workspace.role === 'operator'
    ? navItems.filter((item) => ['Overview', 'Digital twin', 'Alerts'].includes(item.label))
    : workspace.role === 'plant_manager'
      ? navItems.filter((item) => item.label !== 'AI analysis')
      : navItems
  useEffect(() => {
    if (workspace.role && !allowedNavItems.some((item) => item.label === view)) setView('Overview')
  }, [workspace.role, view, allowedNavItems])
  const acknowledge = async (id: string | number) => {
    if (session && supabase && typeof id === 'string') {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'acknowledged', acknowledged_by: session.user.id, acknowledged_at: new Date().toISOString() })
        .eq('id', id)
      if (error) {
        workspace.setError(`Unable to acknowledge this alert: ${error.message}`)
        return
      }
    }
    workspace.setAlerts((items) => items.filter((item) => item.id !== id))
  }
  const selectView = (next: View) => {
    setView(allowedNavItems.some((item) => item.label === next) ? next : 'Overview')
    setMenuOpen(false)
  }

  return (
    <AnimatePresence mode="wait">
      {!entered ? <motion.div key="landing" exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.55 }}><Landing onEnter={() => setEntered(true)} /></motion.div> : (
        isSupabaseConfigured && !session
          ? authChecking
            ? <motion.div key="auth-loading" className="auth-loading"><span className="spinner" /><span>Restoring your secure session…</span></motion.div>
            : <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><SignInScreen message={authMessage ?? workspace.error} /></motion.div>
          : isSupabaseConfigured && session && (workspace.loading || !workspace.role)
            ? <motion.div key="workspace-loading" className="auth-loading"><span className="spinner" /><span>Loading your secure workspace…</span></motion.div>
            : isSupabaseConfigured && session && workspace.error
              ? <motion.main key="workspace-error" className="auth-screen"><div className="auth-card panel"><div className="brand-lockup"><div className="brand-mark"><Activity size={18} /></div><span>MOTORSENSE<span className="brand-ai"> AI</span></span></div><div className="eyebrow"><span className="eyebrow-line" /> WORKSPACE CONNECTION</div><h1>We couldn’t load your workspace.</h1><p>{workspace.error}</p><button className="button-primary" onClick={async () => { if (supabase) { const { error } = await supabase.auth.signOut(); if (error) workspace.setError(`Unable to sign out: ${error.message}`) } }}>Sign out securely <ArrowRight size={14} /></button></div></motion.main>
          : (
        <motion.div key="app" className="app-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.65 }}>
          <aside className={`sidebar ${menuOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-brand"><div className="brand-mark"><Activity size={17} /></div><span>MOTORSENSE<span className="brand-ai"> AI</span></span><button className="mobile-close icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={16} /></button></div>
            <div className="workspace-select"><span className="plant-avatar"><Factory size={16} /></span><span><strong>Northstar Industries</strong><small>Plant A · Operations</small></span><ChevronDown size={14} /></div>
            <span className="sidebar-label">WORKSPACE</span>
            <nav className="sidebar-nav">{allowedNavItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => selectView(label)} className={`nav-item ${view === label ? 'active' : ''}`} data-view={label}><Icon size={16} /><span>{label}</span>{label === 'Alerts' && alerts.length > 0 && <span className="nav-count">{alerts.length}</span>}{label === 'Overview' && <span className="nav-active-mark" />}</button>)}</nav>
            <div className="sidebar-separator" />
            <div className="sidebar-label-row"><span className="sidebar-label">FLEET STATUS</span><span className="online-count"><span className="live-dot" /> {fleetMotors.length} MONITORED</span></div>
            <div className="fleet-status-list"><button onClick={() => selectView('Fleet')}><span className="fleet-status-dot healthy-dot" />Healthy motors<span>{fleetMotors.filter((motor) => motor.status === 'Optimal').length}</span></button><button onClick={() => selectView('Alerts')}><span className="fleet-status-dot warning-dot" />Needs attention<span>{fleetMotors.filter((motor) => motor.status === 'Watch' || motor.status === 'Attention').length}</span></button><button onClick={() => selectView('Fleet')}><span className="fleet-status-dot maintenance-dot" />In maintenance<span>{fleetMotors.filter((motor) => motor.status === 'Maintenance').length}</span></button></div>
            <div className="sidebar-spacer" />
            <button className="copilot-card" onClick={() => setAssistantOpen(true)}><div className="copilot-icon"><Sparkles size={15} /></div><div><strong>Meet your Copilot</strong><small>Intelligence, on demand</small></div><ArrowRight size={14} /></button>
            <button className="profile-card" onClick={async () => { if (session && supabase) { const { error } = await supabase.auth.signOut(); if (error) workspace.setError(`Unable to sign out: ${error.message}`) } }}><span className="profile-avatar">{workspace.fullName ? workspace.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : 'AC'}</span><span><strong>{workspace.fullName ?? 'Alex Chen'}</strong><small>{workspace.role?.replaceAll('_', ' ') ?? 'Maintenance engineer'}</small></span><MoreHorizontal size={17} /></button>
          </aside>
          {menuOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
          <main className="main-area">
            <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={17} /></button><div className="topbar-breadcrumb"><span>{session ? 'Secure workspace' : 'Northstar Industries'}</span><ChevronRight size={12} /><strong>{view}</strong></div><div className="topbar-right"><button className="search-trigger" onClick={() => setSearchOpen(true)}><Search size={14} /><span>Search anything...</span><kbd><Command size={10} /> K</kbd></button><span className={`backend-status ${session ? 'connected' : ''}`} title={workspace.error ?? undefined}>{workspace.error ? 'CONNECTION ISSUE' : session ? 'SECURE SESSION' : 'DEMO MODE'}</span><span className="topbar-divider" /><button className="topbar-icon" onClick={() => selectView('Alerts')} aria-label="View alerts"><Bell size={16} /><i /></button><button className="help-button" aria-label="Help"><CircleHelp size={16} /></button><span className="topbar-divider" /><button className="topbar-avatar">{workspace.fullName ? workspace.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : 'AC'}</button></div></header>
            {workspace.error && <div className="workspace-error" role="alert">{workspace.error}</div>}
            <div className={`page-content ${view !== 'Overview' ? 'subpage-content' : ''}`} key={view}>
              {view === 'Overview' && <Overview motors={fleetMotors} selected={selected} setSelected={setSelected} onAsk={() => setAssistantOpen(true)} onNavigate={selectView} />}
              {view === 'AI analysis' && <Suspense fallback={<div className="page-section" />}><AIWorkbench motorId={selected.dbId} canRunCloud={Boolean(session && supabase)} /></Suspense>}
              {view === 'Fleet' && <FleetView motors={fleetMotors} selected={selected} setSelected={setSelected} />}
              {view === 'Digital twin' && <TwinView selected={selected} onAsk={() => setAssistantOpen(true)} />}
              {view === 'Analytics' && <AnalyticsView />}
              {view === 'Alerts' && <AlertsView alerts={alerts} acknowledge={acknowledge} />}
              {view === 'Reports' && <ReportsView motors={fleetMotors} />}
              <footer className="app-footer"><span>© {new Date().getFullYear()} MOTORSENSE AI <span>·</span> DEMO DATA</span><span><span className="live-dot" /> SIMULATED DATA <span className="footer-time">{liveValue} LOCAL</span></span></footer>
            </div>
          </main>
          <AnimatePresence>{assistantOpen && <Assistant onClose={() => setAssistantOpen(false)} selected={selected} cloudEnabled={Boolean(session && supabase)} />}</AnimatePresence>
          <AnimatePresence>{searchOpen && <motion.div className="search-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false) }}><motion.div className="command-modal" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}><div className="command-input"><Search size={17} /><input autoFocus placeholder="Search motors, alerts, reports…" /><kbd>ESC</kbd><button className="icon-button" onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={16} /></button></div><span className="command-label">QUICK NAVIGATION</span>{allowedNavItems.map(({ label, icon: Icon }) => <button className="command-result" onClick={() => { selectView(label); setSearchOpen(false) }} key={label}><Icon size={15} />{label}<ArrowRight size={13} /></button>)}<div className="command-footer"><span>↑↓ TO NAVIGATE</span><span>↵ TO SELECT</span><span>ESC TO CLOSE</span></div></motion.div></motion.div>}</AnimatePresence>
        </motion.div>
          )
      )}
    </AnimatePresence>
  )
}

export default App
