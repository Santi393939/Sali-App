# Owner to-do (steps only the project owner can do)

## Google sign-in (pending)
1. Google Cloud console: new project "Salli" → OAuth consent screen (External, app name Salli,
   add your Gmail as a test user) → Clients → Web application with the redirect URI
   `https://wvlmhgrqvptqlcgjkjzw.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Providers → Google: switch on, paste the Client ID and secret.
3. Supabase → Authentication → URL Configuration → Redirect URLs: add `salli://auth-callback`.

## Email sign-in codes
- Supabase → Authentication → Emails → Templates: in **Magic Link** and **Confirm signup**,
  the message must contain `{{ .Token }}` (the 6-digit code the app asks for).
- Custom SMTP (Gmail app password) is set up, so family members can receive codes too.

## Database
- Run once in the SQL Editor, in order: `supabase/migrations/20261124000000_init.sql`
  (done), then `supabase/migrations/20261128000000_groups_live.sql` (live groups).

## Later
- Apple Developer account (iPhone builds, Sign in with Apple), Google Play Console.
- Scholar review of reminder texts and translations; native-speaker review of Arabic and French.
