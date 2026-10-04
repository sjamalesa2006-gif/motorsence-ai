create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'maintenance_engineer', 'plant_manager', 'operator');
create type public.motor_status as enum ('optimal', 'watch', 'attention', 'maintenance');
create type public.alert_severity as enum ('critical', 'high', 'medium', 'low');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'operator',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.motors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  asset_number text not null,
  name text not null,
  manufacturer text,
  model text,
  location text,
  rated_power_kw numeric(10, 2),
  health_score numeric(5, 2) check (health_score between 0 and 100),
  status public.motor_status not null default 'optimal',
  installed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, asset_number)
);

create table public.sensor_data (
  id bigint generated always as identity primary key,
  motor_id uuid not null references public.motors (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  temperature_c numeric(7, 2) not null,
  vibration_mm_s numeric(7, 3) not null,
  voltage_v numeric(8, 2) not null,
  current_a numeric(8, 2) not null,
  rpm numeric(9, 2) not null,
  load_percent numeric(6, 2) not null,
  humidity_percent numeric(6, 2),
  runtime_hours numeric(12, 2),
  power_factor numeric(5, 4),
  frequency_hz numeric(6, 3),
  energy_kwh numeric(12, 3),
  bearing_condition text,
  lubrication_status text,
  created_at timestamptz not null default now()
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  motor_id uuid not null references public.motors (id) on delete cascade,
  severity public.alert_severity not null,
  issue text not null,
  recommendation text not null,
  predicted_impact text,
  confidence numeric(5, 2) check (confidence between 0 and 100),
  estimated_failure_at timestamptz,
  status text not null default 'active' check (status in ('active', 'acknowledged', 'resolved')),
  acknowledged_by uuid references public.users (id) on delete set null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  motor_id uuid not null references public.motors (id) on delete cascade,
  performed_by uuid references public.users (id) on delete set null,
  title text not null,
  details text,
  parts_used jsonb not null default '[]'::jsonb,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  motor_id uuid not null references public.motors (id) on delete cascade,
  health_score numeric(5, 2) not null check (health_score between 0 and 100),
  failure_probability numeric(5, 2) not null check (failure_probability between 0 and 100),
  remaining_useful_life_hours numeric(12, 2),
  risk_class public.alert_severity not null,
  recommendation text not null,
  input_data jsonb not null,
  anomalies jsonb not null default '[]'::jsonb,
  failure_modes jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  report_type text not null,
  period_start date not null,
  period_end date not null,
  storage_path text,
  format text not null default 'pdf' check (format in ('pdf', 'xlsx', 'csv')),
  status text not null default 'queued' check (status in ('queued', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create table public.energy_analysis (
  id uuid primary key default gen_random_uuid(),
  motor_id uuid not null references public.motors (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  energy_consumption_kwh numeric(14, 3) not null default 0,
  load_efficiency_percent numeric(6, 2),
  estimated_waste_kwh numeric(14, 3) not null default 0,
  estimated_savings numeric(12, 2) not null default 0,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create index sensor_data_motor_time_idx on public.sensor_data (motor_id, recorded_at desc);
create index alerts_motor_status_time_idx on public.alerts (motor_id, status, created_at desc);
create index predictions_motor_time_idx on public.predictions (motor_id, generated_at desc);
create index maintenance_logs_motor_time_idx on public.maintenance_logs (motor_id, created_at desc);
create index energy_analysis_motor_period_idx on public.energy_analysis (motor_id, period_start desc);

create view public.latest_sensor_data
with (security_invoker = true)
as
select distinct on (motor_id)
  motor_id,
  recorded_at,
  temperature_c,
  vibration_mm_s,
  voltage_v,
  current_a,
  rpm,
  load_percent,
  humidity_percent,
  power_factor,
  frequency_hz,
  runtime_hours,
  bearing_condition,
  lubrication_status
from public.sensor_data
order by motor_id, recorded_at desc, id desc;

grant select on public.latest_sensor_data to authenticated;

create or replace function public.current_user_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.users where id = (select auth.uid())
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = (select auth.uid())
$$;

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.motors enable row level security;
alter table public.sensor_data enable row level security;
alter table public.alerts enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.predictions enable row level security;
alter table public.reports enable row level security;
alter table public.energy_analysis enable row level security;

create policy "organization members can view their organization"
  on public.organizations for select to authenticated
  using (id = (select public.current_user_organization_id()));

create policy "members can view organization profiles"
  on public.users for select to authenticated
  using (organization_id = (select public.current_user_organization_id()));
create policy "admins can add organization profiles"
  on public.users for insert to authenticated
  with check (
    organization_id = (select public.current_user_organization_id())
    and (select public.current_user_role()) = 'admin'
  );
create policy "admins can manage organization profiles"
  on public.users for update to authenticated
  using (organization_id = (select public.current_user_organization_id()) and (select public.current_user_role()) = 'admin')
  with check (organization_id = (select public.current_user_organization_id()) and (select public.current_user_role()) = 'admin');

create policy "members can view organization motors"
  on public.motors for select to authenticated
  using (organization_id = (select public.current_user_organization_id()));
create policy "engineers and admins can create motors"
  on public.motors for insert to authenticated
  with check (
    organization_id = (select public.current_user_organization_id())
    and (select public.current_user_role()) in ('admin', 'maintenance_engineer')
  );
create policy "engineers and admins can update motors"
  on public.motors for update to authenticated
  using (
    organization_id = (select public.current_user_organization_id())
    and (select public.current_user_role()) in ('admin', 'maintenance_engineer')
  )
  with check (
    organization_id = (select public.current_user_organization_id())
    and (select public.current_user_role()) in ('admin', 'maintenance_engineer')
  );
create policy "admins can delete motors"
  on public.motors for delete to authenticated
  using (
    organization_id = (select public.current_user_organization_id())
    and (select public.current_user_role()) = 'admin'
  );

create policy "members can view organization sensor data"
  on public.sensor_data for select to authenticated
  using (exists (
    select 1 from public.motors m
    where m.id = sensor_data.motor_id
      and m.organization_id = (select public.current_user_organization_id())
  ));
create policy "operators and engineers can insert sensor data"
  on public.sensor_data for insert to authenticated
  with check (
    (select public.current_user_role()) in ('admin', 'maintenance_engineer', 'operator')
    and exists (
      select 1 from public.motors m
      where m.id = sensor_data.motor_id
        and m.organization_id = (select public.current_user_organization_id())
    )
  );

create policy "members can view organization alerts"
  on public.alerts for select to authenticated
  using (exists (
    select 1 from public.motors m
    where m.id = alerts.motor_id
      and m.organization_id = (select public.current_user_organization_id())
  ));
create policy "engineers and admins can create alerts"
  on public.alerts for insert to authenticated
  with check (
    (select public.current_user_role()) in ('admin', 'maintenance_engineer')
    and exists (
      select 1 from public.motors m
      where m.id = alerts.motor_id
        and m.organization_id = (select public.current_user_organization_id())
    )
  );
create policy "authorized members can update alerts"
  on public.alerts for update to authenticated
  using (
    (select public.current_user_role()) in ('admin', 'maintenance_engineer', 'plant_manager')
    and exists (
      select 1 from public.motors m
      where m.id = alerts.motor_id
        and m.organization_id = (select public.current_user_organization_id())
    )
  )
  with check (
    (select public.current_user_role()) in ('admin', 'maintenance_engineer', 'plant_manager')
    and exists (
      select 1 from public.motors m
      where m.id = alerts.motor_id
        and m.organization_id = (select public.current_user_organization_id())
    )
  );

create policy "members can view organization maintenance logs"
  on public.maintenance_logs for select to authenticated
  using (exists (
    select 1 from public.motors m
    where m.id = maintenance_logs.motor_id
      and m.organization_id = (select public.current_user_organization_id())
  ));
create policy "engineers and admins can manage maintenance logs"
  on public.maintenance_logs for all to authenticated
  using (
    (select public.current_user_role()) in ('admin', 'maintenance_engineer')
    and exists (
      select 1 from public.motors m
      where m.id = maintenance_logs.motor_id
        and m.organization_id = (select public.current_user_organization_id())
    )
  )
  with check (
    (select public.current_user_role()) in ('admin', 'maintenance_engineer')
    and exists (
      select 1 from public.motors m
      where m.id = maintenance_logs.motor_id
        and m.organization_id = (select public.current_user_organization_id())
    )
  );

create policy "members can view organization predictions"
  on public.predictions for select to authenticated
  using (exists (
    select 1 from public.motors m
    where m.id = predictions.motor_id
      and m.organization_id = (select public.current_user_organization_id())
  ));
create policy "engineers and admins can save predictions"
  on public.predictions for insert to authenticated
  with check (
    (select public.current_user_role()) in ('admin', 'maintenance_engineer')
    and exists (
      select 1 from public.motors m
      where m.id = predictions.motor_id
        and m.organization_id = (select public.current_user_organization_id())
    )
  );

create policy "members can view organization reports"
  on public.reports for select to authenticated
  using (organization_id = (select public.current_user_organization_id()));
create policy "authorized members can create reports"
  on public.reports for insert to authenticated
  with check (
    organization_id = (select public.current_user_organization_id())
    and (select public.current_user_role()) in ('admin', 'maintenance_engineer', 'plant_manager')
  );

create policy "members can view organization energy analysis"
  on public.energy_analysis for select to authenticated
  using (exists (
    select 1 from public.motors m
    where m.id = energy_analysis.motor_id
      and m.organization_id = (select public.current_user_organization_id())
  ));
create policy "engineers and admins can manage energy analysis"
  on public.energy_analysis for all to authenticated
  using (
    (select public.current_user_role()) in ('admin', 'maintenance_engineer')
    and exists (
      select 1 from public.motors m
      where m.id = energy_analysis.motor_id
        and m.organization_id = (select public.current_user_organization_id())
    )
  )
  with check (
    (select public.current_user_role()) in ('admin', 'maintenance_engineer')
    and exists (
      select 1 from public.motors m
      where m.id = energy_analysis.motor_id
        and m.organization_id = (select public.current_user_organization_id())
    )
  );

insert into storage.buckets (id, name, public)
values ('motor-reports', 'motor-reports', false)
on conflict (id) do nothing;

create policy "members can read organization report files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'motor-reports'
    and (storage.foldername(name))[1] = (select public.current_user_organization_id())::text
  );
create policy "authorized members can upload organization report files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'motor-reports'
    and (storage.foldername(name))[1] = (select public.current_user_organization_id())::text
    and (select public.current_user_role()) in ('admin', 'maintenance_engineer', 'plant_manager')
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sensor_data'
    ) then
      execute 'alter publication supabase_realtime add table public.sensor_data';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'alerts'
    ) then
      execute 'alter publication supabase_realtime add table public.alerts';
    end if;
  end if;
end
$$;
