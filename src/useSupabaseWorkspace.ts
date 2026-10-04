import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

export type WorkspaceMotor = {
  id: string
  dbId?: string
  name: string
  location: string
  health: number
  status: string
  temperature: number
  vibration: number
  voltage?: number
  current?: number
  rpm?: number
  powerFactor?: number
  frequency?: number
  load?: number
  runtime: string
  model: string
}

export type WorkspaceAlert = {
  id: string | number
  severity: string
  title: string
  motor: string
  time: string
  recommendation: string
  confidence: number
}

type MotorRow = {
  id: string
  asset_number: string
  name: string
  location: string | null
  health_score: number | null
  status: string
  manufacturer: string | null
  model: string | null
}

type SensorRow = {
  motor_id: string
  temperature_c: number
  vibration_mm_s: number
  voltage_v: number
  current_a: number
  rpm: number
  load_percent: number
  power_factor: number | null
  frequency_hz: number | null
  runtime_hours: number | null
}

type AlertRow = {
  id: string
  severity: string
  issue: string
  recommendation: string
  confidence: number | null
  motor_id: string
  created_at: string
  status: string
}

type ProfileRow = { full_name: string; role: string }

function displayStatus(status: string) {
  return status === 'optimal' ? 'Optimal'
    : status === 'watch' ? 'Watch'
      : status === 'attention' ? 'Attention'
        : 'Maintenance'
}

function displaySeverity(severity: string) {
  return severity.charAt(0).toUpperCase() + severity.slice(1)
}

function formatAge(timestamp: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours} hr ago` : `${Math.floor(hours / 24)} days ago`
}

export function useSupabaseWorkspace(
  session: Session | null,
  demoMotors: WorkspaceMotor[],
  demoAlerts: WorkspaceAlert[],
) {
  const [motors, setMotors] = useState(demoMotors)
  const [alerts, setAlerts] = useState(demoAlerts)
  const [role, setRole] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(session && supabase))

  useEffect(() => {
    if (!supabase || !session) {
      setMotors(demoMotors)
      setAlerts(demoAlerts)
      setRole(null)
      setFullName(null)
      setError(null)
      setLoading(false)
      return
    }
    const client = supabase
    let active = true
    setLoading(true)
    setMotors([])
    setAlerts([])
    setRole(null)
    setFullName(null)
    setError(null)

    const loadWorkspace = async () => {
      const { data: profile, error: profileError } = await client
        .from('users')
        .select('full_name, role')
        .eq('id', session.user.id)
        .single()
      if (!active) return
      if (profileError || !profile) {
        setError(profileError?.message ?? 'No workspace profile is available for this account.')
        setLoading(false)
        return
      }
      const profileRow = profile as ProfileRow
      setRole(profileRow.role)
      setFullName(profileRow.full_name)

      const { data: motorData, error: motorsError } = await client
        .from('motors')
        .select('id, asset_number, name, location, health_score, status, manufacturer, model')
        .order('asset_number')
      if (!active) return
      if (motorsError) {
        setError(`Unable to load motors: ${motorsError.message}`)
        setLoading(false)
        return
      }
      const motorRows = (motorData ?? []) as MotorRow[]
      if (motorRows.length === 0) {
        setError('No motors are configured for this workspace. Ask an administrator to add an asset.')
        setLoading(false)
        return
      }
      const motorIds = motorRows.map((motor) => motor.id)
      let sensorRows: SensorRow[] = []
      if (motorIds.length > 0) {
        const { data, error: sensorError } = await client
          .from('latest_sensor_data')
          .select('motor_id, temperature_c, vibration_mm_s, voltage_v, current_a, rpm, load_percent, power_factor, frequency_hz, runtime_hours')
          .in('motor_id', motorIds)
        if (!active) return
        if (sensorError) {
          setError(`Unable to load sensor readings: ${sensorError.message}`)
          setLoading(false)
          return
        }
        sensorRows = (data ?? []) as SensorRow[]
      }
      const latestByMotor = new Map<string, SensorRow>()
      sensorRows.forEach((reading) => {
        if (!latestByMotor.has(reading.motor_id)) latestByMotor.set(reading.motor_id, reading)
      })
      setMotors(motorRows.map((motor) => {
        const latest = latestByMotor.get(motor.id)
        return {
          id: motor.asset_number,
          dbId: motor.id,
          name: motor.name,
          location: motor.location ?? 'Unassigned location',
          health: Number(motor.health_score ?? 0),
          status: displayStatus(motor.status),
          temperature: Number(latest?.temperature_c ?? 0),
          vibration: Number(latest?.vibration_mm_s ?? 0),
          voltage: Number(latest?.voltage_v ?? 0),
          current: Number(latest?.current_a ?? 0),
          rpm: Number(latest?.rpm ?? 0),
          load: Number(latest?.load_percent ?? 0),
          powerFactor: Number(latest?.power_factor ?? 0),
          frequency: Number(latest?.frequency_hz ?? 0),
          runtime: `${Number(latest?.runtime_hours ?? 0).toLocaleString()} h`,
          model: [motor.manufacturer, motor.model].filter(Boolean).join(' · ') || 'Motor model not specified',
        }
      }))

      const { data: alertData, error: alertsError } = await client
        .from('alerts')
        .select('id, severity, issue, recommendation, confidence, motor_id, created_at, status')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (!active) return
      if (alertsError) {
        setError(`Unable to load alerts: ${alertsError.message}`)
        setLoading(false)
        return
      }
      const motorNames = new Map(motorRows.map((motor) => [motor.id, `${motor.name} · ${motor.asset_number}`]))
      setAlerts(((alertData ?? []) as AlertRow[]).map((alert) => ({
        id: alert.id,
        severity: displaySeverity(alert.severity),
        title: alert.issue,
        motor: motorNames.get(alert.motor_id) ?? alert.motor_id,
        time: formatAge(alert.created_at),
        recommendation: alert.recommendation,
        confidence: Number(alert.confidence ?? 0),
      })))
      setError(null)
      setLoading(false)
    }

    void loadWorkspace()

    const channel = client
      .channel(`workspace-${session.user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_data' }, (event) => {
        const reading = event.new as SensorRow
        setMotors((current) => current.map((motor) => motor.dbId !== reading.motor_id ? motor : {
          ...motor,
          temperature: Number(reading.temperature_c),
          vibration: Number(reading.vibration_mm_s),
          voltage: Number(reading.voltage_v),
          current: Number(reading.current_a),
          rpm: Number(reading.rpm),
          load: Number(reading.load_percent),
          powerFactor: Number(reading.power_factor ?? 0),
          frequency: Number(reading.frequency_hz ?? 0),
          runtime: `${Number(reading.runtime_hours ?? 0).toLocaleString()} h`,
        }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (event) => {
        const alert = event.new as AlertRow
        if (event.eventType === 'DELETE' || alert.status !== 'active') {
          setAlerts((current) => current.filter((item) => item.id !== (event.old as AlertRow).id))
          return
        }
        if (event.eventType === 'INSERT') {
          setAlerts((current) => [{
            id: alert.id,
            severity: displaySeverity(alert.severity),
            title: alert.issue,
            motor: alert.motor_id,
            time: formatAge(alert.created_at),
            recommendation: alert.recommendation,
            confidence: Number(alert.confidence ?? 0),
          }, ...current])
        }
      })
      .subscribe((status) => {
        if (active && status === 'CHANNEL_ERROR') setError('Supabase realtime disconnected. Check the workspace connection and RLS policies.')
      })

    return () => {
      active = false
      void client.removeChannel(channel)
    }
  }, [session])

  return { motors, setMotors, alerts, setAlerts, role, fullName, error, setError, loading }
}
