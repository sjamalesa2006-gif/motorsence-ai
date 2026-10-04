import { useMemo, useState } from 'react'
import { Activity, AlertTriangle, ArrowRight, Check, Clock3, Gauge, Lightbulb, LoaderCircle, ShieldCheck, Sparkles, Thermometer, Zap } from 'lucide-react'
import { supabase } from './lib/supabase'

type Readings = {
  temperature: number
  vibration: number
  voltage: number
  current: number
  rpm: number
  load: number
  humidity: number
  runtime: number
}

type CloudPrediction = {
  health_score: number
  failure_probability: number
  remaining_useful_life_hours: number
  risk_class: string
  recommendation: string
  generated_at: string
}

const initialReadings: Readings = {
  temperature: 68.4,
  vibration: 2.1,
  voltage: 414,
  current: 44.2,
  rpm: 1482,
  load: 76,
  humidity: 52,
  runtime: 8421,
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

const inputRows: { key: keyof Readings; label: string; unit: string; min: number; max: number; step: number; icon: typeof Thermometer }[] = [
  { key: 'temperature', label: 'Temperature', unit: '°C', min: 20, max: 120, step: 0.1, icon: Thermometer },
  { key: 'vibration', label: 'Vibration', unit: 'mm/s', min: 0, max: 20, step: 0.1, icon: Activity },
  { key: 'voltage', label: 'Voltage', unit: 'V', min: 300, max: 500, step: 1, icon: Zap },
  { key: 'current', label: 'Current', unit: 'A', min: 0, max: 150, step: 0.1, icon: Gauge },
  { key: 'rpm', label: 'RPM', unit: 'rpm', min: 0, max: 4000, step: 1, icon: Activity },
  { key: 'load', label: 'Load', unit: '%', min: 0, max: 120, step: 1, icon: Gauge },
  { key: 'humidity', label: 'Humidity', unit: '% RH', min: 0, max: 100, step: 1, icon: Activity },
  { key: 'runtime', label: 'Runtime hours', unit: 'h', min: 0, max: 100000, step: 100, icon: Clock3 },
]

export default function AIWorkbench({ motorId, canRunCloud }: { motorId?: string; canRunCloud: boolean }) {
  const [readings, setReadings] = useState(initialReadings)
  const [cloudPrediction, setCloudPrediction] = useState<CloudPrediction | null>(null)
  const [cloudError, setCloudError] = useState<string | null>(null)
  const [cloudBusy, setCloudBusy] = useState(false)
  const analysis = useMemo(() => {
    const penalties = [
      Math.max(0, readings.temperature - 65) * 0.55,
      Math.max(0, readings.vibration - 1.8) * 4.2,
      Math.max(0, Math.abs(readings.voltage - 415) - 5) * 0.08,
      Math.max(0, readings.current - 44) * 0.15,
      Math.abs(readings.rpm - 1480) / 100 * 1.2,
      Math.max(0, readings.load - 85) * 0.22 + Math.max(0, 30 - readings.load) * 0.12,
      Math.max(0, readings.humidity - 70) * 0.12,
      Math.max(0, readings.runtime - 10000) / 1000 * 0.4,
    ]
    const health = Math.round(clamp(100 - penalties.reduce((sum, penalty) => sum + penalty, 0), 8, 99))
    const probability = Math.round(clamp((100 - health) * 0.62 + Math.max(0, readings.temperature - 75) * 0.5 + Math.max(0, readings.vibration - 4) * 3, 1, 95))
    const risk = probability >= 40 ? 'Critical' : probability >= 20 ? 'High' : probability >= 8 ? 'Medium' : 'Low'
    const usefulLife = Math.max(24, Math.round((health / 100) ** 2 * 22000))
    const recommendation = readings.vibration > 4.5
      ? 'Prioritize a bearing and alignment inspection. Increased vibration is the clearest early-warning signal.'
      : readings.temperature > 80
        ? 'Inspect cooling airflow and winding insulation at the next safe stop to address elevated temperature.'
        : readings.load > 90
          ? 'Review process loading and reduce sustained demand to protect rotor and winding life.'
          : health < 82
            ? 'Schedule a condition-based inspection within the next planned maintenance window.'
            : 'Continue normal operation. Keep current inspection intervals and monitor the next trend update.'
    const anomalies = [
      { issue: 'Abnormal vibration', active: readings.vibration > 4, confidence: Math.min(99, Math.round(69 + readings.vibration * 3)), severity: readings.vibration > 7 ? 'High' : 'Medium', cause: 'Bearing wear or mechanical looseness' },
      { issue: 'Bearing wear', active: readings.vibration > 3.5, confidence: Math.min(98, Math.round(72 + readings.vibration * 2)), severity: readings.vibration > 6 ? 'High' : 'Medium', cause: 'Raceway fatigue or inadequate lubrication' },
      { issue: 'Overheating', active: readings.temperature > 78, confidence: Math.min(99, Math.round(72 + Math.max(0, readings.temperature - 75))), severity: readings.temperature > 92 ? 'Critical' : 'High', cause: 'Cooling restriction or winding overload' },
      { issue: 'Voltage fluctuation', active: Math.abs(readings.voltage - 415) > 10, confidence: 91, severity: Math.abs(readings.voltage - 415) > 25 ? 'High' : 'Medium', cause: 'Supply imbalance or loose terminal connection' },
      { issue: 'Mechanical imbalance', active: readings.vibration > 5 && readings.rpm > 100, confidence: 89, severity: readings.vibration > 8 ? 'High' : 'Medium', cause: 'Rotor mass imbalance or deposit buildup' },
      { issue: 'Shaft misalignment', active: readings.vibration > 3.5 && Math.abs(readings.rpm - 1480) > 25, confidence: 86, severity: 'Medium', cause: 'Coupling offset or soft foot condition' },
    ].filter((item) => item.active)
    const failureModes = [
      { name: 'Bearing failure', score: clamp(2 + Math.max(0, readings.vibration - 2) * 5 + Math.max(0, readings.temperature - 72) * 0.3, 1, 86), action: 'Inspect bearing raceways and confirm lubrication condition.' },
      { name: 'Rotor damage', score: clamp(1 + Math.max(0, readings.load - 80) * 0.35 + Math.max(0, readings.current - 48) * 0.5, 1, 72), action: 'Check rotor bar integrity and current balance.' },
      { name: 'Stator insulation', score: clamp(1 + Math.max(0, readings.temperature - 78) * 1.1 + Math.max(0, readings.humidity - 65) * 0.2, 1, 79), action: 'Trend winding temperature and perform insulation resistance testing.' },
      { name: 'Shaft misalignment', score: clamp(1 + Math.max(0, readings.vibration - 3) * 4 + Math.max(0, Math.abs(readings.rpm - 1480) - 20) * 0.4, 1, 75), action: 'Verify coupling alignment and inspect for soft foot.' },
      { name: 'Lubrication issue', score: clamp(1 + Math.max(0, readings.vibration - 2.5) * 3 + Math.max(0, readings.temperature - 74) * 0.5, 1, 80), action: 'Check lubricant level, grade, and relubrication interval.' },
      { name: 'Overload damage', score: clamp(1 + Math.max(0, readings.load - 82) * 1.15 + Math.max(0, readings.current - 48) * 0.7, 1, 88), action: 'Review load profile and verify motor sizing against the process.' },
    ].sort((a, b) => b.score - a.score)
    return { health, probability, risk, usefulLife, recommendation, anomalies, failureModes }
  }, [readings])

  const updateReading = (key: keyof Readings, value: string) => {
    const numericValue = Number(value)
    if (Number.isFinite(numericValue)) {
      setReadings((current) => ({ ...current, [key]: numericValue }))
      setCloudPrediction(null)
      setCloudError(null)
    }
  }
  const formatLife = (hours: number) => hours >= 1000 ? `${(hours / 1000).toFixed(1)}k` : String(hours)
  const runCloudPrediction = async () => {
    if (!supabase || !motorId) {
      setCloudError('Select a configured motor to run a cloud prediction.')
      return
    }
    setCloudBusy(true)
    setCloudError(null)
    setCloudPrediction(null)
    const { data, error } = await supabase.functions.invoke('predict-motor-health', {
      body: {
        motorId,
        readings: {
          temperature: readings.temperature,
          vibration: readings.vibration,
          voltage: readings.voltage,
          current: readings.current,
          rpm: readings.rpm,
          load: readings.load,
          humidity: readings.humidity,
          runtimeHours: readings.runtime,
        },
      },
    })
    setCloudBusy(false)
    if (error) {
      setCloudError(`Cloud prediction failed: ${error.message}`)
      return
    }
    const result = data as { prediction?: Partial<CloudPrediction> } | null
    const prediction = result?.prediction
    if (!prediction
      || typeof prediction.health_score !== 'number'
      || typeof prediction.failure_probability !== 'number'
      || typeof prediction.remaining_useful_life_hours !== 'number'
      || typeof prediction.risk_class !== 'string'
      || typeof prediction.recommendation !== 'string'
      || typeof prediction.generated_at !== 'string') {
      setCloudError('The prediction service returned an incomplete result.')
      return
    }
    setCloudPrediction({
      health_score: prediction.health_score,
      failure_probability: prediction.failure_probability,
      remaining_useful_life_hours: prediction.remaining_useful_life_hours,
      risk_class: prediction.risk_class,
      recommendation: prediction.recommendation,
      generated_at: prediction.generated_at,
    })
  }

  return (
    <section className="page-section ai-workbench">
      <div className="section-intro"><div className="eyebrow"><span className="eyebrow-line" /> PREDICTIVE INTELLIGENCE ENGINE</div><h1>AI analysis</h1><p>Turn live operating conditions into a clear plan of action.</p></div>
      <div className="panel analysis-banner"><div className="analysis-banner-icon"><Sparkles size={19} /></div><div><span className="section-label">MOTORSENSE PREDICTIVE MODEL · {canRunCloud ? 'WORKSPACE PROFILE' : 'DEMO PROFILE'}</span><h2>Condition assessment</h2><p>Adjust sensor readings to explore failure risk, remaining life, and recommended action.</p></div>{canRunCloud ? <button className="button-primary cloud-run-button" onClick={runCloudPrediction} disabled={cloudBusy || !motorId}>{cloudBusy ? <LoaderCircle size={14} className="loader-icon" /> : <Sparkles size={14} />}{cloudBusy ? 'Analyzing…' : 'Run cloud prediction'} <ArrowRight size={13} /></button> : <span className="model-status"><span className="live-dot" /> DEMO MODEL</span>}</div>
      {cloudError && <div className="cloud-error" role="alert">{cloudError}</div>}
      {cloudPrediction && <div className="panel cloud-result"><div><span className="section-label">OPENAI EDGE PREDICTION · {new Date(cloudPrediction.generated_at).toLocaleString()}</span><strong>{cloudPrediction.health_score}% health · {cloudPrediction.failure_probability}% failure risk · {formatLife(cloudPrediction.remaining_useful_life_hours)} h remaining</strong><p>{cloudPrediction.recommendation}</p></div><span className="status-pill">{cloudPrediction.risk_class.toUpperCase()} RISK</span></div>}
      <div className="analysis-layout">
        <div className="panel reading-panel"><div className="panel-heading"><div><span className="section-label">SENSOR INPUTS</span><h2>Operating conditions</h2></div><button className="text-button" onClick={() => setReadings(initialReadings)}>Reset to typical <ArrowRight size={13} /></button></div><div className="reading-grid">{inputRows.map(({ key, label, unit, min, max, step, icon: Icon }) => <label className="reading-control" key={key}><span className="reading-label"><Icon size={14} />{label}</span><span className="reading-input"><input type="number" min={min} max={max} step={step} value={readings[key]} onChange={(event) => updateReading(key, event.target.value)} /><small>{unit}</small></span><input className="reading-slider" type="range" min={min} max={max} step={step} value={readings[key]} onChange={(event) => updateReading(key, event.target.value)} /></label>)}</div><div className="readings-note"><ShieldCheck size={13} /><span>Model estimates are indicative. Validate against site history before scheduling work.</span></div></div>
        <div className="analysis-results">
          <div className="panel prediction-panel"><div className="panel-heading"><div><span className="section-label">PREDICTIVE MAINTENANCE</span><h2>Motor health score</h2></div><span className={`status-pill ${analysis.risk.toLowerCase()}`}><span className="status-dot" />{analysis.risk} risk</span></div><div className="prediction-score"><div className="prediction-gauge"><svg viewBox="0 0 140 140"><circle cx="70" cy="70" r="60" /><circle className={analysis.health < 70 ? 'gauge-warning' : ''} cx="70" cy="70" r="60" style={{ strokeDashoffset: `${377 - 377 * analysis.health / 100}` }} /></svg><div><strong>{analysis.health}</strong><small>HEALTH SCORE</small></div></div><div><span className="prediction-probability">{analysis.probability}<small>%</small></span><span className="section-label">FAILURE PROBABILITY · 30 DAYS</span><div className="prediction-mini-meter"><i style={{ width: `${analysis.probability}%` }} /></div></div></div><div className="prediction-stats"><div><Clock3 size={14} /><span>REMAINING USEFUL LIFE</span><strong>{formatLife(analysis.usefulLife)} <small>hours</small></strong></div><div><AlertTriangle size={14} /><span>RISK CLASSIFICATION</span><strong>{analysis.risk}</strong></div></div><div className="recommendation analysis-recommendation"><div className="recommendation-icon"><Lightbulb size={15} /></div><div><span className="section-label">RECOMMENDED ACTION</span><p>{analysis.recommendation}</p></div></div></div>
          <div className="panel anomaly-panel"><div className="panel-heading"><div><span className="section-label">ANOMALY DETECTION</span><h2>{analysis.anomalies.length ? `${analysis.anomalies.length} signals to review` : 'No active anomalies'}</h2></div><span className="confidence"><Sparkles size={12} /> LIVE</span></div>{analysis.anomalies.length ? <div className="anomaly-list">{analysis.anomalies.map((anomaly) => <div className="anomaly-row" key={anomaly.issue}><span className={`severity-mark ${anomaly.severity.toLowerCase()}`} /><div><strong>{anomaly.issue}</strong><small>Likely cause · {anomaly.cause}</small></div><span className={`anomaly-severity ${anomaly.severity.toLowerCase()}`}>{anomaly.severity}</span><span className="anomaly-confidence">{anomaly.confidence}%</span></div>)}</div> : <div className="no-anomalies"><Check size={15} /> All monitored signals are within expected ranges.</div>}</div>
        </div>
      </div>
      <div className="panel failure-panel"><div className="panel-heading"><div><span className="section-label">FAILURE MODE FORECAST</span><h2>What the model is watching for</h2></div><span className="section-label">NEXT 90 DAYS</span></div><div className="failure-grid">{analysis.failureModes.map((failure, index) => <div className="failure-card" key={failure.name}><div className="failure-top"><span>{String(index + 1).padStart(2, '0')}</span><strong>{failure.name}</strong><span>{Math.round(failure.score)}%</span></div><div className="failure-meter"><i style={{ width: `${failure.score}%` }} /></div><p>{failure.action}</p><span className="failure-timeline"><Clock3 size={11} /> {failure.score > 30 ? 'Monitor weekly' : 'Routine monitoring'}</span></div>)}</div></div>
    </section>
  )
}
