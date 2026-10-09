# Kitchen POS · Open-source restaurant point of sale

A full-stack, open-source point of sale for restaurants, cafés and food stalls.
Built with **Next.js 16 (App Router)**, **PostgreSQL**, **Drizzle ORM**, **Tailwind CSS**
and **Framer Motion**. Fully bilingual: **English (default)** and **Urdu (اردو, RTL)**.

## Features

- **Accounts** – sign up / log in / log out (scrypt-hashed passwords, signed HTTP-only session cookie).
- **Your own kitchen** – each account has a private shop name, currency symbol, menu and sales data.
- **Menu & items** – add dishes with a picture (auto-compressed in the browser), category, description,
  price, fallback emoji and an availability switch. Edit or delete anytime.
- **Point of sale** – search & filter items, tap to add, adjust quantities, optional customer name,
  amount received (with quick cash buttons), automatic **total**, **change to return** or **balance due**,
  and a printable **receipt**.
- **Sales tracking** – dashboard with today's sales, orders, revenue, last 7 days chart, top-selling items
  and recent orders. The Sales page shows **per-day totals** for the last 30 days, plus full order history
  (with items, received amount and change) for any selected date.
- **CSV / Excel import** – upload a sheet and create your whole menu at once. Flexible headers
  (`name, price, category, description, emoji, available, image`), a downloadable template,
  a live preview showing which rows will be imported or skipped, and image URLs support.
- **Staff roles** – the shop owner creates sub-logins for **chefs** and **cashiers** (Team page):
  pick a role, set credentials, limit a chef to specific menu categories, disable or delete any
  login instantly. Staff signs in from the normal login page and lands on their own workspace.
- **Kitchen Display System (KDS)** – every completed POS order instantly lands on the kitchen
  screen at `/kitchen`, routed by category to the matching chef. Three boards (New / Cooking /
  Ready), big touch targets, "late" highlights, optional sound alerts, and 6-second live polling.
- **License keys & subscriptions** – the app is locked until the shop owner redeems a unique
  activation key (`KPOS-XXXX-XXXX-XXXX`). Keys carry a duration (monthly, quarterly, half-yearly,
  yearly, lifetime or custom days); redeeming stacks onto any remaining time.
- **Master admin panel** (`/admin`) – only for the platform owner: see every customer with their
  shop, subscription status, orders, revenue and menu size; extend a subscription, suspend/resume,
  cut access instantly, or delete a customer. Generate keys in batches, copy them, and revoke
  or delete unused keys.
- **Language** – switch the whole interface between English and Urdu from the header or Settings.
  The choice is remembered per browser and saved to your account.
- **Animated, responsive UI** – works on mobile (bottom tab bar), tablet and desktop (sidebar).

## Tech stack

| Layer      | Tech                                              |
| ---------- | ------------------------------------------------- |
| Framework  | Next.js 16 (App Router), React 19, TypeScript     |
| Database   | PostgreSQL + Drizzle ORM (`src/db`)               |
| Styling    | Tailwind CSS v4, Google Fonts (Inter, Noto Nastaliq Urdu) |
| Motion     | Framer Motion                                     |
| Icons      | lucide-react                                      |

## Project structure

```
src/
  app/
    page.tsx                 Landing page
    kitchen/                 Kitchen display (chef / owner)
    (app)/staff/             Team & roles management (owner)
    login/ signup/           Auth pages
    (app)/                   Protected dashboard area (sidebar layout)
      dashboard/ pos/ menu/ sales/ settings/
    api/
      auth/{signup,login,logout}
      menu/  menu/[id]
      orders/                POST (checkout, server-side pricing) & GET (history)
      stats/                 Daily totals, totals, top items
      settings/              Profile, currency, language
  components/                UI kit, POS terminal, menu manager, sales, dashboard, auth, landing
  db/                        Drizzle client + schema
  lib/                       auth (sessions & hashing), i18n dictionaries, formatting, API helpers
```

## Getting started

1. Create a PostgreSQL database and set `DATABASE_URL` in `.env`:

   ```bash
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
   SESSION_SECRET=change-me-to-a-long-random-string
   COOKIE_SECURE=true              # only when serving over HTTPS

   # Master admin (created automatically on its first login attempt)
   MASTER_ADMIN_EMAIL=davidmartinbigson@gmail.com
   MASTER_ADMIN_PASSWORD=ShAyAnAlI!123#
   ```

2. Install and push the schema:

   ```bash
   npm install
   npx drizzle-kit push
   ```

3. Run the app:

   ```bash
   npm run dev      # development
   npm run build && npm start   # production
   ```

4. Open http://localhost:3000.

### As the platform owner (you)

Log in with the master admin credentials above — you land on **/admin**. Generate activation keys
(choose a plan and quantity), copy them and hand them to the shop owner you sold to. From the same
screen you can extend, suspend, resume, cut access or delete any customer at any time.

### As a shop owner (your customer)

Sign up, then enter the activation key you were given on the **/activate** screen. The app unlocks
for the key's duration. When it expires (or if you suspend them), they are sent back to `/activate`
until they redeem a new key — their menu and sales data are kept safe in the meantime.

## Security notes

- Prices are always re-read from the database when an order is placed; the browser can't set prices.
- Every API route checks the session and scopes queries to the logged-in kitchen.
- Passwords are hashed with `scrypt` and random salts; sessions are HMAC-signed and expire after 30 days.

## License

MIT – use it, fork it, improve it.
