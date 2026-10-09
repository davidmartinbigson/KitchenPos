# Deploying Kitchen POS to Hostinger VPS

> **Important:** this app uses a database, logins and server APIs, so it **cannot**
> run on Hostinger *shared* hosting (hPanel / cPanel plans only serve static files
> and PHP). You need a **Hostinger VPS** (any KVM plan). The whole setup below
> takes ~10 minutes.

---

## Option 1 (recommended): Docker on a Hostinger VPS

### 1. Order a VPS and connect

- Any **KVM VPS** plan with **Ubuntu 24.04** is fine (1 GB RAM is enough to start).
- Point your domain (e.g. `pos.yourdomain.com`) in Hostinger's DNS to the VPS IP (A record).
- SSH in from your PC:

```bash
ssh root@YOUR_VPS_IP
```

### 2. Install Docker (copy-paste)

```bash
apt update && apt install -y ca-certificates curl
curl -fsSL https://get.docker.com | sh
```

### 3. Put the code on the server

Either upload the project folder (zip → extract), or git clone it:

```bash
mkdir -p /var/www && cd /var/www
# option A: upload kitchen-pos.zip with scp / FileZilla, then:
#   unzip kitchen-pos.zip -d kitchen-pos
# option B: git clone https://github.com/YOUR/repository.git kitchen-pos
cd kitchen-pos
```

### 4. Create your environment file

```bash
cp .env.example .env
nano .env
```

Change at least:

- `SESSION_SECRET` → any long random string (e.g. run `openssl rand -hex 32`)
- `MASTER_ADMIN_PASSWORD` → your own master-admin password
- `DB_PASSWORD` → a strong database password

Save with `Ctrl+O`, `Enter`, `Ctrl+X`.

### 5. Start the app

```bash
docker compose up -d --build
```

The database **creates all tables automatically** on first boot (from `drizzle/0000_init.sql`).
Check that everything is up:

```bash
docker compose ps        # both "app" and "db" should be running
curl http://localhost:3000/api/health    # → {"ok":true}
```

Open **http://YOUR_VPS_IP:3000** — the app is live.

### 6. Attach your domain + free SSL

Install Nginx as a reverse proxy and Certbot for free HTTPS:

```bash
apt install -y nginx certbot python3-certbot-nginx
cat > /etc/nginx/sites-available/kitchen-pos <<'EOF'
server {
    listen 80;
    server_name pos.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 25m;
    }
}
EOF
ln -s /etc/nginx/sites-available/kitchen-pos /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d pos.yourdomain.com
```

Then set `COOKIE_SECURE=true` in `.env` and restart:

```bash
docker compose up -d
```

Your app is now at **https://pos.yourdomain.com**. Log in with the master
admin email/password from `.env` (the admin account is created automatically
on first login) and start selling activation keys.

---

## Option 2: Manual run (no Docker) — using the `deploy/` folder

The `deploy/` folder is a self-contained production build (Next.js standalone).

```bash
# 1) Install Node.js 20 and PostgreSQL
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs postgresql unzip
sudo -u postgres createdb app_db

# 2) Upload and unpack
mkdir -p /var/www/kitchen-pos && cd /var/www/kitchen-pos
# upload deploy.zip here (scp / FileZilla), then:
unzip deploy.zip -d .

# 3) Create tables
sudo -u postgres psql -d app_db -f deploy/migrations/0000_init.sql

# 4) Configure environment
cp deploy/.env.example deploy/.env
nano deploy/.env     # set DATABASE_URL, SESSION_SECRET, master admin password

# 5) Run with pm2 (auto-restart on crash/reboot)
npm i -g pm2
cd deploy
set -a && source .env && set +a
HOSTNAME=0.0.0.0 PORT=3000 pm2 start server.js --name kitchen-pos
pm2 save && pm2 startup
```

Then do step 6 above (Nginx + SSL) the same way.

---

## Option 3: Easiest — Vercel + Neon (free tier)

If you don't want to manage a server:

1. Create a free database at <https://neon.tech> and copy its connection string.
2. Run once locally: `psql "NEON_URL" -f drizzle/0000_init.sql`
3. Push this repository to GitHub, then in <https://vercel.com>: **Add New → Import Project**.
4. Add env vars in Vercel → Settings → Environment Variables:
   `DATABASE_URL`, `SESSION_SECRET`, `COOKIE_SECURE=true`,
   `MASTER_ADMIN_EMAIL`, `MASTER_ADMIN_PASSWORD`.
5. Deploy. Connect your domain in Vercel → Domains (also works with a domain bought at Hostinger — just change its DNS records).

You can still **sell plans**: the master admin licenses every customer; hosting the
frontend somewhere else doesn't affect your activation-key business at all.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `docker compose up` fails with SESSION_SECRET error | Edit `.env`, set the secret, run again |
| White "connection refused" page | Check `docker compose ps`; make sure port 3000/tcp is open (Hostinger firewall + `ufw allow 3000/tcp`) |
| Login loops back to login | If using HTTPS, set `COOKIE_SECURE=true`; if HTTP, it must be `false` |
| "tables don't exist" errors | Run step 5/3 again (migrations), or `docker compose exec db psql -U postgres -d app_db -f /docker-entrypoint-initdb.d/0000_init.sql` |
| Change admin password later | Update `.env` → `docker compose up -d` → delete the old admin user from the DB, then log in once with the new password |
