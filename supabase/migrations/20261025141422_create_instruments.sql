create table public.instruments (
  id bigint primary key generated always as identity,
  name text not null
);

-- New public tables are not exposed to the Data API by default, so anon needs an explicit grant.
grant select on public.instruments to anon;

alter table public.instruments enable row level security;

create policy "public can read instruments"
on public.instruments
for select
to anon
using (true);
