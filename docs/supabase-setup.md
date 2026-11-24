# Supabase setup

Salli uses Supabase for accounts, the shared database and live group updates.
The app works fully offline without it; signing in adds sync and groups.

## What's in this repo

- `supabase/migrations/20261124000000_init.sql`: every table from the brief's data
  model, row-level security on all of them, and server functions that keep day
  totals and streaks in step with the phone (same rules as `src/store/streaks.ts`).
- `supabase/seed_reminders.sql`: the 14 starter reminder cards, unverified.
  They stay hidden until a qualified reviewer fills in `verified_by`.
- `.env.example`: the two public values the app needs.

## Steps for the owner

1. Create a free account at supabase.com and a project called **Salli**.
   Pick the region closest to your users. Save the database password in a
   password manager; never share it.
2. Run the migration, then the seed, in the SQL Editor (or let Claude do it
   with a short-lived access token saved through the secure form).
3. Put the project URL and **publishable** key into `.env.local` (and later
   the EAS environment). Both are public by design. Never use the secret or
   service_role key in the app.
4. Auth → Email: change the "Magic Link" email to show the 6-digit code
   (`{{ .Token }}`), because the app signs in with a typed code.
5. Later: Google (needs a Google Cloud OAuth client) and Apple (needs the
   Apple Developer Program) under Auth → Providers.
6. Before launch: set up custom SMTP (the built-in email sender is limited
   to a few emails an hour).

## Testing the SQL locally

The migration was tested on Postgres 16 with a stand-in `auth` schema:
streaks with shields, no double counting by `client_id`, and privacy between
group members (counts hidden unless sharing is on; entries never visible).

## To add in the accounts step

Streak repairs (`streak.repaired`) and quest days (`quests.doneDays`, every 5 earns
a shield) are worked out on the phone. The server's `recompute_streak` doesn't know
them yet; add two small tables and teach it the same rules so the bot and groups agree.
