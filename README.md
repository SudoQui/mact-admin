# MACT Admin Dashboard

Private Next.js admin dashboard for managing MACT data in Supabase.

This is a separate web app from the public MACT mobile app. It is designed for localhost-first admin work.

## What this first version includes

- Supabase Auth login
- Server-side admin allowlist check
- Protected dashboard layout
- Add page with four safe entry points
- Add Food Place form
- Add Prayer Place form
- Add Community Event form
- Add Announcement form, backed by `whats_new_items`
- Server-side Supabase writes only
- Safe dropdown values based on the current MACT schema
- Basic audit logging hooks
- Developer quick links for Play Console, App Store Connect, Supabase, Expo, and GitHub

## Important security rule

Never put `SUPABASE_SERVICE_ROLE_KEY` in any `NEXT_PUBLIC_` variable.

The browser should only receive:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

The server only should receive:

```env
SUPABASE_SERVICE_ROLE_KEY=
```

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Supabase setup

Run `supabase/admin_setup.sql` in Supabase SQL Editor before using the dashboard seriously.

Then add your admin user after you create/sign in with Supabase Auth:

```sql
insert into public.admin_users (user_id, email, role)
select id, email, 'owner'
from auth.users
where email = 'YOUR_EMAIL_HERE';
```

## First version workflow

1. Login with Supabase Auth.
2. Open Add.
3. Choose Food, Prayer, Event, or Announcement.
4. Submit the form.
5. The form writes to Supabase from a server action.
6. The form redirects back blank after success.
7. A basic audit log row is written when possible.

## Notes

- Food creates one `places` row with `mode = food`, then one `food_details` row.
- Prayer creates one `places` row with `mode = prayer`, then one `prayer_details` row.
- Event creates one `community_events` row.
- Announcement creates one `whats_new_items` row.
- Community events do not create `places` rows because your current `places.mode` only allows `food` and `prayer`.
