# Owner to-do (steps only the project owner can do)

## Google sign-in (pending)
1. Google Cloud console: new project "Salli" → OAuth consent screen (External, app name Salli,
   add your Gmail as a test user) → Clients → Web application with the redirect URI
   `https://wvlmhgrqvptqlcgjkjzw.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Providers → Google: switch on, paste the Client ID and secret.
3. (Done) Redirect URL `salli://auth-callback` is already allowed.

## Email sign-in codes (done)
- Both email templates contain `{{ .Token }}`, codes are 6 digits, subject "Your Salli code".
- Custom SMTP (Gmail app password) is set up, so family members can receive codes too.

## Database (done: all three files have run, and you are the admin)
- Run once in the SQL Editor, in order: `supabase/migrations/20261124000000_init.sql`
  (done), then `supabase/migrations/20261128000000_groups_live.sql` (live groups), then
  `supabase/migrations/20261129000000_community.sql` (community requests).
- Make yourself the admin who approves community requests (after signing in to the app once):
  `insert into public.app_admins (user_id) select id from auth.users where email = 'YOUR EMAIL';`

## Later
- Apple Developer account (iPhone builds, Sign in with Apple), Google Play Console.
- Scholar review of reminder texts and translations; native-speaker review of Arabic and French.
