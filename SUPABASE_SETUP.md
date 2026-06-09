# MehnatKash — Complete Setup Guide

---

## Step 1 — Disable email confirmation in Supabase

1. Supabase Dashboard → your project → **Authentication → Settings → Email**
2. Turn OFF **"Enable email confirmations"**
3. Save

The app uses a toast-based OTP for sign-up UX. No emails are ever sent.

---

## Step 2 — Apply all database migrations

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_ID   # from Settings → General → Reference ID
npx supabase db push
```

This applies all migrations including professional visibility fixes and the admin helper.

---

## Step 3 — Create your admin account

1. Sign up in the app normally with your admin email.
2. Open **Supabase Dashboard → SQL Editor** and run:

```sql
SELECT assign_admin_role('your-admin@email.com');
```

3. Log out and log back in.  
   → You'll be redirected to `/admin` automatically.  
   → The **Admin** button also appears on the home screen header.

---

## Step 4 — Deploy to Vercel

```bash
git add .
git commit -m "fix: routing, professionals visibility, admin, security"
git push
```

In Vercel → New Project → import repo → **Environment Variables**:

| Name | Value (from Supabase → Settings → API) |
|------|----------------------------------------|
| `VITE_SUPABASE_URL` | `https://your-project-id.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | your anon/public key |

Click **Deploy**.

---

## How sign-up works

1. Enter email + password → "Create Account"
2. A 6-digit OTP **pops up as a toast** (top of screen) — enter it
3. Fill in name, phone → choose **Customer** or **Professional**
4. Professionals land on `/pro/dashboard`, customers on the home screen

---

## Professional workflow

- Sign up → choose "Professional" → fill profile
- Complete onboarding at `/pro/onboarding` to set service, rate, skills
- Toggle **Online/Offline** on the dashboard to appear in search results
- Customers can see you immediately (no manual verification required to appear)
- Admin can verify/reject professionals from the admin panel

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| "Email not confirmed" | Disable email confirmation (Step 1) |
| Professionals not showing on home | Make sure they toggled "Online" in their dashboard |
| `/admin` redirects to home | Run the SQL in Step 3 |
| 404 on page refresh | `vercel.json` handles this — make sure it's committed |
| Chat 404 for professionals | Fixed — chats are now shared between all user types |
