# Client portal setup

The client portal lives at `/portal`. Clients register with their email and a
password, confirm their email, and wait for you to approve them. Once approved,
they sign in whenever they like and see their prepaid balance, monthly usage,
and work log. You approve people, record prepaid purchases, and log hours from
`/portal/admin`.

Until the two environment variables below are set, `/portal` shows a
"being set up" message and the rest of the site is unaffected.

## 1. Create the Supabase project

1. Create a free project at supabase.com. Pick the region closest to most of
   your clients.
2. Open **SQL Editor -> New query**, paste all of
   `supabase/migrations/0001_client_portal.sql`, and click **Run**.

## 2. Configure sign-in

In **Authentication**:

1. **Sign In / Providers -> Email**:
   - Email provider: enabled.
   - "Allow new users to sign up": **on** (clients register themselves).
   - "Confirm email": **on**.
   - Minimum password length: **8**.
2. **URL Configuration**:
   - Site URL: the address the live site finishes on, e.g. `https://www.erpvers.com`
   - Redirect URLs: add `https://www.erpvers.com/auth/confirm` and
     `https://erpvers.com/auth/confirm` (and `http://localhost:3000/auth/confirm`
     for local testing).
3. **Emails -> Templates**. Replace the link in these two templates so it works
   even if the email is opened on a different device or browser:

   **Confirm signup**

   ```html
   <h2>Confirm your ERP VERS client portal account</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/portal">Confirm my email</a></p>
   <p>After confirming, we'll review your account and link it to your company's dashboard.</p>
   ```

   **Reset password**

   ```html
   <h2>Reset your ERP VERS client portal password</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/portal/reset-password">Set a new password</a></p>
   <p>This link works once and expires in one hour. If you didn't ask for this, you can ignore this email.</p>
   ```

4. **Emails -> SMTP Settings**: connect your own mail sender (for example the
   mailbox behind support@erpvers.com, or a service like Resend). Supabase's
   built-in sender is only meant for testing and sends very few emails per hour.

## 3. Add the keys to Vercel

In Supabase, **Project Settings -> API Keys** (and **Data API** for the URL).
In Vercel, **Project -> Settings -> Environment Variables**, add for
Production (and Preview if you want):

| Name                | Value                                   |
| ------------------- | --------------------------------------- |
| `SUPABASE_URL`      | Project URL, `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | the anon / publishable key              |

Then redeploy. The site never needs the service_role / secret key: every admin
action runs as you, and the database checks you are an admin.

## 4. Make yourself an admin

1. Go to `/portal/register` and create your own account, then confirm the email.
2. In Supabase **SQL Editor**, replacing the email:

   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'support@erpvers.com';
   ```

3. Sign in at `/portal`. You'll land on the admin page.

## Day to day

- A client registers at `/portal/register`. They see "waiting for approval".
- The **Admin** link shows a count of people waiting. Approve each one by
  linking them to an existing client or creating a new one, or decline them
  (their account is deleted).
- Record their prepaid purchase and log hours. They see updates the next time
  they open the portal. Clients stay signed in on their device until they sign
  out, and can reset their own password.

## How client data is kept private

- **The database enforces it.** Every table has row level security. A signed-in
  client can only read rows for the company you linked them to; they cannot
  write anything. This is checked by Postgres on every query, not just hidden
  in the page.
- **Approval before access.** Anyone can register, but a new account sees
  nothing until you approve it. Declining deletes the account.
- **No account fishing.** The registration and password-reset forms give the
  same reply whether or not an email already has an account.
- **Passwords are never stored in readable form.** Supabase stores only a
  salted hash.
- **Server-side only.** The Supabase keys never reach the browser, and no
  service/secret key is used at all.
- **Not cached, not indexed.** Portal pages are sent with `Cache-Control:
  private, no-store` and are excluded from search engines.
- **Transparent access.** Each dashboard lists exactly who can see it.
