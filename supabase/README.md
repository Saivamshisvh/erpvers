# Client portal setup

The client portal lives at `/portal`. There are three kinds of account:

- **Clients** see their prepaid balance, tasks, monthly usage and work log.
  They join their company automatically when their confirmed email matches the
  company's email domain (or an email you invited).
- **Freelancers** see only the tasks you assign them and log hours against
  them, up to the task's estimate plus any change requests.
- **Admins** (you) create clients and tasks, set estimates, add change
  requests, review freelancer hours, and record prepaid purchases at
  `/portal/admin`.

How hours flow: a freelancer logs hours -> you review them -> the client gets
an email from your support address and approves them in the portal. Clients can
only approve; if something looks wrong they contact you, and you fix or delete
the entry. Hours count against the prepaid balance once you've sent them.

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

For the approval emails, also add your mailbox's SMTP settings:

| Name            | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| `SMTP_HOST`     | e.g. `smtp.gmail.com` (Google Workspace) or `smtp.zoho.in` (Zoho) |
| `SMTP_PORT`     | `465`                                                        |
| `SMTP_USER`     | `support@erpvers.com`                                        |
| `SMTP_PASS`     | an app password for that mailbox (not your normal password). Mark it **Sensitive**. |
| `MAIL_FROM`     | `ERP VERS <support@erpvers.com>`                             |
| `SITE_URL`      | `https://www.erpvers.com` (used for the link in emails)      |

Google Workspace: turn on 2-step verification for the mailbox, then create an
app password at myaccount.google.com/apppasswords. Zoho Mail: My Account ->
Security -> App Passwords. Until these are set, everything still works; the
client simply sees the hours when they sign in, and the admin page tells you
no email went out.

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

**New client**
1. Admin -> Clients -> Add a client.
2. On the client page, add their company email domain (e.g. `acme-mfg.com`).
   Personal providers like gmail.com are refused; invite those people by
   exact email instead.
3. Their people register at `/portal/register`, confirm their email, and land
   on the dashboard. No approval needed.
4. Record their prepaid purchase.

**New freelancer**
1. Admin -> Freelancers -> Invite (name + email).
2. They register with that email and see their tasks straight away.

**Requirements and changes**
1. On the client page, create a task per requirement with your hour estimate
   and tick the freelancers who work on it.
2. Freelancers log hours against the task. They are blocked once they reach
   the estimate.
3. If the client asks for changes, open the task -> Add change request with
   the extra hours. The task's estimate grows by that amount and the
   freelancer can log the extra work against the change request.
4. Admin -> Hours to review: approve (you can adjust the hours) or reject with
   a reason. Approving sends the hours to the client: they get one email and
   approve in the portal. "Approve all" sends a whole batch in a single email.
   Hours you log yourself go to the client the same way.
5. On the client page, "Awaiting the client's approval" shows what they
   haven't approved yet. "Email client" resends (or reminds), and "Mark
   approved" records an approval they gave you by email or phone.

**Anyone else** who registers appears under Admin -> Clients -> "Not linked
yet", where you can link them to a client, make them a freelancer, or decline.

## Keeping the free Supabase project awake

Free Supabase projects pause after a week with no activity.
`.github/workflows/keepalive.yml` calls `https://www.erpvers.com/api/keepalive`
once a day, which runs one tiny query. It works as soon as the code is pushed
to GitHub. If you move the site to a different address, update the URL in that
file. You can also run it by hand: GitHub -> Actions -> "Keep client portal
awake" -> Run workflow.

## How client data is kept private

- **The database enforces it.** Every table has row level security. A signed-in
  client can only read rows for the company you linked them to; they cannot
  write anything. This is checked by Postgres on every query, not just hidden
  in the page.
- **Proof of email before access.** An account is linked to a company only
  after its email address is confirmed, so only someone who can read mail at
  `@acme-mfg.com` can join Acme. Keep "Confirm email" switched on in
  Supabase: with it off, anyone could type someone else's address.
- **Freelancers see only their own work.** Only the tasks you assign them,
  only their own hours, never purchases, balances or other clients.
- **Clients see only reviewed hours.** Freelancer entries stay hidden from the
  client until you approve them.
- **Clients can only approve.** The database allows exactly one change from a
  client: marking hours that were sent to them as approved. They cannot edit,
  reject or delete anything.
- **Only you control estimates.** Freelancers cannot change estimates, add
  change requests, approve hours, or assign themselves tasks. The database
  enforces the hour limit, not just the page.
- **No account fishing.** The registration and password-reset forms give the
  same reply whether or not an email already has an account.
- **Passwords are never stored in readable form.** Supabase stores only a
  salted hash.
- **Server-side only.** The Supabase keys never reach the browser, and no
  service/secret key is used at all.
- **Not cached, not indexed.** Portal pages are sent with `Cache-Control:
  private, no-store` and are excluded from search engines.
- **Transparent access.** Each dashboard lists exactly who can see it.
