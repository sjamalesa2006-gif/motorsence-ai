# MotorSense AI

Premium industrial motor-monitoring dashboard and predictive-maintenance prototype.

## Run locally

```powershell
npm install
npm run dev
```

`npm run build` runs the TypeScript project build and creates production assets in `dist/`.

## Demo data

The dashboard opens with deterministic sample motors, telemetry, alerts, and analytics so the full experience works without accounts or credentials. The AI analysis workbench calculates indicative health, risk, remaining-life, anomaly, and failure-mode estimates from its editable sensor readings. Those local estimates are for product demonstration and are not a substitute for a validated, site-calibrated reliability model.

## Supabase setup

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project URL and public anon/publishable key. Never put a service-role key in frontend environment variables.
3. Apply `supabase/migrations/20261003000000_initial_schema.sql` using the Supabase CLI or SQL editor.
4. Create an organization, authenticate its members with Supabase Auth, and create matching `public.users` rows with the assigned role. The migration enables organization-scoped row-level security for admin, maintenance engineer, plant manager, and operator roles. The private `motor-reports` storage bucket is provisioned by the migration.
5. Set the Edge Function secrets `OPENAI_API_KEY` and `APP_ORIGIN`, then deploy `supabase/functions/predict-motor-health` and `supabase/functions/motorsense-copilot`. Both endpoints validate the caller's Supabase session and workspace access. Predictive analysis validates all eight sensor readings, requests a structured prediction, and saves the result under the motor's row-level security policy; Copilot answers natural-language questions using the selected motor's latest telemetry.

Supabase and AI credentials are intentionally not included. The hosted service, authenticated workspace, production telemetry, and live fleet data require a configured Supabase project and deployed Edge Functions. CSV export is implemented for the demo data; PDF and Excel report generation require a production report-rendering service.
