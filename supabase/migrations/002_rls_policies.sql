alter table incidents enable row level security;
alter table neighborhoods enable row level security;
alter table news_articles enable row level security;
alter table resident_reports enable row level security;
alter table alerts enable row level security;
alter table narratives enable row level security;
alter table users enable row level security;

-- INCIDENTS: anyone can read, only service role can insert/update
create policy "Public can read incidents"
on incidents for select
to anon, authenticated
using (true);

-- NEIGHBORHOODS: anyone can read
create policy "Public can read neighborhoods"
on neighborhoods for select
to anon, authenticated
using (true);

-- NEWS ARTICLES: anyone can read
create policy "Public can read news articles"
on news_articles for select
to anon, authenticated
using (true);

-- NARRATIVES: anyone can read
create policy "Public can read narratives"
on narratives for select
to anon, authenticated
using (true);

-- RESIDENT REPORTS: anyone can submit, anyone can read, only authenticated can update
create policy "Anyone can submit resident reports"
on resident_reports for insert
to anon, authenticated
with check (true);

create policy "Anyone can read resident reports"
on resident_reports for select
to anon, authenticated
using (true);

create policy "Officials can update resident reports"
on resident_reports for update
to authenticated
using (true);

-- ALERTS: anyone can read active alerts, only authenticated can insert/update
create policy "Anyone can read active alerts"
on alerts for select
to anon, authenticated
using (is_active = true);

create policy "Officials can create alerts"
on alerts for insert
to authenticated
with check (true);

create policy "Officials can update alerts"
on alerts for update
to authenticated
using (true);

-- USERS: users can only read their own record
create policy "Users can read own record"
on users for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert own record"
on users for insert
to authenticated
with check (auth.uid() = id);