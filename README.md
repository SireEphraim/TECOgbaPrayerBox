# Prayer Box — shared Supabase version

## Why Supabase

Supabase is the best fit here: it gives this small app one shared PostgreSQL database, authentication for the Prayer Ministry, and database-level rules that keep submitted requests out of public view. The browser uses only a publishable key; the database rules decide what it can do. No server secret or default PIN is shipped to visitors.

The public page is `index.html`. The separate Ministry link is `ministry.html` (after deployment: `https://your-domain.example/ministry.html`).

## Set it up

1. Create a Supabase project.
2. In **Settings → API → Data API**, make sure the `public` schema is exposed. New Supabase projects may require this explicit step before the browser can reach the tables.
3. In **SQL Editor**, run [database-setup.sql](database-setup.sql). It creates the shared request table, locks it down with Row Level Security, and creates the Ministry membership list.
4. In **Authentication → Users**, create each Prayer Ministry user with an email and password. Copy each user UUID and add it to `public.ministry_members` using the commented `INSERT` at the end of `database-setup.sql`.
5. Copy the **Project URL** and **Publishable key** from the project’s Connect/API settings into [app-config.js](app-config.js). Do not use a secret key or legacy `service_role` key there.
6. Deploy this entire folder to any static host (Netlify, Vercel, Cloudflare Pages, or your church website host). Keep the folder structure intact.
7. Open `https://your-domain.example/ministry.html` and sign in with an approved account. Submit a test request from `index.html` and confirm it appears in the Ministry dashboard.

## Security design

- Anyone may insert a request, but nobody can read requests anonymously.
- Only authenticated users listed in `ministry_members` can read, change status, or remove requests.
- Ministry accounts may update only the request `status`; the original request text is not editable in the browser.
- The previous browser-stored PIN and storage API have been removed, so requests are shared across devices and survive browser changes.
- `database-verification.sql` contains read-only checks to run after setup.

For a public form that may attract spam, add a CAPTCHA or a rate-limited Supabase Edge Function before broadly sharing the link. That is a separate protection from the database access rules.
