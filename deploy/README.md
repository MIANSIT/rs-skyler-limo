# Production

Everything runs on one Ubuntu 24.04 server: `184.94.215.246`, 4 vCPU, 6 GB RAM,
118 GB disk.

| | | |
|---|---|---|
| Public site | http://184.94.215.246 | Next.js on `:3000` (loopback) |
| Dashboard | http://184.94.215.246:8080 | Next.js on `:3001` (loopback) |
| API | not exposed | Express on `:4000` (loopback) |
| MySQL | not exposed | `:3306` (loopback), firewalled |

Only ports 22, 80, 443 and 8080 are open. The three apps bind to `127.0.0.1`,
so nginx is the only way in — the firewall is the second line of defence, not
the only one.

Secrets live in `deploy/production.env`, which is **git-ignored**. The server
holds the live originals; that file is a copy for your reference.

## Deploying

Today's release was an rsync of the working tree. Once the code is pushed to
GitHub, releases run through CI — see below.

To release by hand at any time:

```bash
ssh -i ~/.ssh/rsskyler_deploy root@184.94.215.246 rsskyler-deploy
```

`/usr/local/bin/rsskyler-deploy` fetches, installs, migrates, **builds, and only
then restarts**, so a compile error leaves the current release serving traffic.
It exits non-zero if any service or health check fails.

## Reaching the database

MySQL answers on loopback only. Tunnel in over SSH:

```bash
npm run db:shell     # tunnel + a mysql prompt
npm run db:tunnel    # tunnel only, for TablePlus / Sequel Ace / DBeaver
```

The GUI form: host `127.0.0.1`, port `3307`, user `rsskyler`, database
`rsskyler`, password from `deploy/production.env`. Use a plain TCP connection —
the script *is* the tunnel, so do not also switch on the client's own SSH
option.

## Service control

```bash
systemctl status  rsskyler-api rsskyler-web rsskyler-admin
systemctl restart rsskyler-web
journalctl -u rsskyler-admin -n 100 --no-pager
journalctl -u rsskyler-api -f
```

## Backups

Nightly at 03:30 UTC via `rsskyler-backup.timer`: a `mysqldump` and a tar of
`/var/lib/rsskyler/uploads`, into `/var/backups/rsskyler`, 14 days retained. A
restore into a scratch database was tested and returned all 8 tables intact.

**These backups are on the same disk as the thing they protect.** That covers a
bad migration; it does not cover losing the server. Ship them off-box — a
nightly `rclone`/`rsync` to Cloudflare R2 or Namecheap's backup add-on — before
this holds real customer data.

## Setting up CI/CD

`.github/workflows/deploy.yml` is written and ready. It will not run until the
code is pushed. Four things to do on GitHub:

1. **Deploy key** — repo → Settings → Deploy keys → Add. Read-only. This lets
   the *server* pull from GitHub:

   ```
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJGo6/CzE6U/4j3kghHk611KgzhszzRzVUlaPjDa5djb rsskyler-server-deploy
   ```

2. **Secrets** — repo → Settings → Secrets and variables → Actions:

   | Secret | Value |
   |---|---|
   | `DEPLOY_HOST` | `184.94.215.246` |
   | `DEPLOY_USER` | `root` |
   | `DEPLOY_SSH_KEY` | the private key printed by the setup (see below) |

3. **Push.** The workflow lints, typechecks and builds all three apps, and only
   releases if that passes.

4. **One-time**, after the first push — turn the server's app directory into a
   git checkout so `rsskyler-deploy` can fetch:

   ```bash
   ssh -i ~/.ssh/rsskyler_deploy root@184.94.215.246 '
     cd /srv/rsskyler/app &&
     sudo -u rsskyler git init -q -b main &&
     sudo -u rsskyler git remote add origin git@github.com:MIANSIT/rs-skyler-limo.git &&
     sudo -u rsskyler git fetch origin &&
     sudo -u rsskyler git reset --hard origin/main'
   ```

   The `.env` files are git-ignored and survive this; uploads live outside the
   tree entirely.

The CI key is restricted on the server to a **forced command** — it can run the
release script and nothing else. No shell, no port forwarding. A leaked CI
secret can redeploy `main`; it cannot read the database or the env files. That
was tested by asking it to print the database password, which ran the deploy
script instead.

## Attaching the domains

In order, because the middle step is easy to get wrong:

1. Point `rsskylerlimo.com`, `www` and `admin.rsskylerlimo.com` at
   `184.94.215.246`. Cloudflare DNS, proxied.
2. Issue certificates. Use the **DNS-01** challenge, not HTTP-01 — DNS-01
   proves ownership through a TXT record, so certificates exist before anything
   is publicly reachable.
3. Replace `/etc/nginx/sites-available/rsskyler` with `deploy/nginx.conf`,
   which already has the two name-based server blocks on 443.
4. **Remove `COOKIE_INSECURE=true` from `/srv/rsskyler/app/admin/.env.local`**
   and restart `rsskyler-admin`. See the warning below.
5. Update the URLs that currently name the IP:
   - `api/.env` → `CORS_ORIGINS`, `UPLOADS_BASE_URL`
   - `.env.local` → `UPLOADS_BASE_URL`
   - `admin/.env.local` → `WEB_REVALIDATE_URL` stays on loopback
6. Close port 8080 in the firewall — the dashboard moves to its own hostname on
   443 and no longer needs it.

### The one thing that must not be forgotten

The dashboard currently runs with `COOKIE_INSECURE=true`. A `Secure` cookie is
discarded by the browser over plain HTTP, so on a bare IP the session would
never stick and sign-in would fail in a way that looks like a wrong password.

The cost is that **the operator's session token crosses the network in clear
text**, and so does everything in the dashboard — customer names, phone numbers,
addresses. Treat this host as a preview until step 4 is done, and do not put
real customer data through it.

The admin app logs a warning on every boot while that flag is set:

```
journalctl -u rsskyler-admin | grep COOKIE_INSECURE
```

## Still outstanding

- **Google Places** — `GOOGLE_MAPS_API_KEY` is unset in `api/.env`. Address
  autocomplete is off and the booking form uses its borough-selector fallback;
  fixed airport fares work either way.
- **Off-site backups** — see above.
- **Email** — no Resend integration, so quote emails are still sent by hand.
- **The root password** used to bootstrap this server was typed into a chat
  window. Password authentication is now disabled, so it cannot be used to log
  in, but rotate it anyway at your provider.
