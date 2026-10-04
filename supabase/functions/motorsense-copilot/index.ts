import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return jsonResponse({ error: 'Authentication is required.' }, 401)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  if (!url || !anonKey || !openAiKey) return jsonResponse({ error: 'The assistant service is not configured.' }, 503)

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    if (error instanceof SyntaxError) return jsonResponse({ error: 'Request body must be valid JSON.' }, 400)
    throw error
  }
  if (!isRecord(payload) || typeof payload.question !== 'string' || payload.question.trim().length < 2 || payload.question.length > 1000) {
    return jsonResponse({ error: 'Enter a question between 2 and 1000 characters.' }, 400)
  }
  if (typeof payload.motorId !== 'string') return jsonResponse({ error: 'Select a motor in your workspace.' }, 400)

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authData, error: authError } = await client.auth.getUser(authorization.slice(7))
  if (authError || !authData.user) return jsonResponse({ error: 'Your session is invalid or has expired.' }, 401)

  const { data: profile, error: profileError } = await client
    .from('users')
    .select('id')
    .eq('id', authData.user.id)
    .single()
  if (profileError || !profile) return jsonResponse({ error: 'A workspace profile is required to use MotorSense Copilot.' }, 403)

  const { data: motor, error: motorError } = await client
    .from('motors')
    .select('id, asset_number, name, manufacturer, model, location, health_score, status')
    .eq('id', payload.motorId)
    .single()
  if (motorError || !motor) return jsonResponse({ error: 'The selected motor is unavailable in this workspace.' }, 404)

  const { data: sensor, error: sensorError } = await client
    .from('latest_sensor_data')
    .select('temperature_c, vibration_mm_s, voltage_v, current_a, rpm, load_percent, humidity_percent, runtime_hours, bearing_condition, lubrication_status, recorded_at')
    .eq('motor_id', motor.id)
    .maybeSingle()
  if (sensorError) return jsonResponse({ error: 'The latest motor readings could not be loaded.' }, 500)

  const modelContext = {
    motor: {
      asset: motor.asset_number,
      name: motor.name,
      manufacturer: motor.manufacturer,
      model: motor.model,
      location: motor.location,
      healthScore: motor.health_score,
      status: motor.status,
    },
    latestReadings: sensor ?? null,
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You are MotorSense Copilot, a cautious industrial reliability assistant. Explain the provided readings in plain language, distinguish observed facts from estimates, and give practical preventive actions. You may explain anomaly causes, outline maintenance reports, and suggest candidate spare parts, but never invent OEM part numbers or claim parts are confirmed compatible. For maintenance work, remind the user to follow site procedures, isolate energy sources, and use qualified personnel. If sensor data is missing, say so instead of inferring it. Keep responses focused and concise.',
        },
        { role: 'user', content: `Motor context (JSON): ${JSON.stringify(modelContext)}\n\nQuestion: ${payload.question}` },
      ],
    }),
  })
  if (!response.ok) return jsonResponse({ error: `The AI assistant provider returned status ${response.status}.` }, 502)

  const completion: unknown = await response.json()
  if (!isRecord(completion) || !Array.isArray(completion.choices) || !isRecord(completion.choices[0]) || !isRecord(completion.choices[0].message)) {
    return jsonResponse({ error: 'The AI assistant provider returned an unexpected response.' }, 502)
  }
  const reply = completion.choices[0].message.content
  if (typeof reply !== 'string' || !reply.trim()) return jsonResponse({ error: 'The AI assistant provider returned an empty response.' }, 502)

  return jsonResponse({ reply: reply.trim() })
})
