# Kitchen POS — Vercel Deploy Guide (Free, Permanent Link)

Yeh guide repo push hone ke baad follow karein. Sab kuch free hai aur link hamesha live rahega (Arena sandbox jaisa band nahi hota).

---

## Step 1 — Vercel account (2 minute)

1. [vercel.com](https://vercel.com) kholen → **Sign Up** → **Continue with GitHub** (usi GitHub se jahan KitchenPos repo hai)
2. Free **Hobby** plan select karein

## Step 2 — Repository import karein

1. Vercel dashboard → **Add New… → Project**
2. `davidmartinbigson/KitchenPos` ke samne **Import** (agar repo na dikhe: "Adjust GitHub App Permissions" se access dein)
3. Vercel Next.js khud detect kar leta hai — **Root Directory kuch na badlein**, **Build Settings default** rakhen
4. **Deploy ABHI mat karein** — pehle Step 3 (database + env vars)

## Step 3 — Database (Vercel Postgres / Neon — free)

1. Vercel dashboard → **Storage** tab → **Create Database** → **Postgres** (Neon Serverless — free tier)
2. Region: apne qarib (Singapore/Mumbai best for PK)
3. Create hone ke baad **Connect Project** → KitchenPos project select → sab environments (Production+Preview) → **Connect**
   - Is se `DATABASE_URL` (aur POSTGRES_* vars) khud-ba-khud project me aa jati hain

_Alternative:_ [neon.tech](https://neon.tech) pe free database banain, connection string copy kar ke Step 4 me `DATABASE_URL` ke tor pe paste karein.

## Step 4 — Environment variables (Project → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Step 3 se auto aa jati hai (Neon) |
| `SESSION_SECRET` | koi lambi random string (32+ chars) |
| `COOKIE_SECURE` | `true` (Vercel HTTPS hai) |
| `MASTER_ADMIN_EMAIL` | davidmartinbigson@gmail.com |
| `MASTER_ADMIN_PASSWORD` | apna strong master admin password |

SMTP_* vars optional hain — bina configure kiye "Forgot password" reset-link screen par hi dikhta hai (by design).

## Step 5 — Deploy

Project → **Deployments → Redeploy** (ya koi bhi naya commit push karein — Vercel har push pe auto-deploy karta hai).
Live URL: `https://<project-name>.vercel.app` — baad me apna custom domain bhi laga sakte hain (Settings → Domains).

## Step 6 — Database schema (ek martaba)

Database ke tables banane zaruri hain (`users`, `restaurants`, `orders`, …). SQL files repo me mojood hain:
`drizzle/0000_init.sql` aur `drizzle/0001_owner_extended.sql`.

- **Asaan tareeqa:** `DATABASE_URL` mujhe (Arena chat) bhej dein — main seedha schema apply kar dunga aur master admin verify kar dunga.
- **Khud karne ke liye:** Neon dashboard → **SQL Editor** me dono files ka content order me paste kar ke Run karein.

Master admin pehli login koshish par auto-create ho jata hai (env vars se).

---

### Notes
- Repo me `deploy/.next/` ke stale build artifacts committed hain — Vercel inhe ignore karta hai (apna fresh build karta hai); chahen to baad me safai kar sakte hain.
- Har GitHub push = naya auto-deploy. Preview sandbox ki tarah kabhi suspend nahi hota.
