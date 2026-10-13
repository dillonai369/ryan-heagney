-- Ryan Heagney recruitment funnel — applicants table
-- Run once in Supabase → SQL Editor → New query → Run.
create extension if not exists pgcrypto;

create table if not exists public.applicants (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  first_name      text not null,
  last_name       text not null,
  email           text not null,
  phone           text not null,
  state           text not null,
  licensed        text,
  situation       text,
  commitment      text,
  why             text,
  consent_contact boolean not null default false,
  consent_sms     boolean not null default false,   -- needed later for Twilio / A2P
  attribution     jsonb not null default '{}'::jsonb,
  page            text,
  user_agent      text,
  status          text not null default 'new',       -- new · contacted · interview_booked · licensed · onboarded · not_a_fit
  notes           text
);

create index if not exists applicants_created_idx on public.applicants (created_at desc);
create index if not exists applicants_status_idx  on public.applicants (status);

-- Lock it down: no public access. Only the server (service_role key) can read/write.
alter table public.applicants enable row level security;
