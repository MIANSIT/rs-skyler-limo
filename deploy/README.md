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

`/srv/rsskyler/app` is now a git checkout tracking `origin/main`, so releases
run through the script rather than an rsync of somebody's working tree.

The remote is **HTTPS**, not SSH: the GitHub repository is public, so the server
pulls without any credential. That means the read-only deploy key described
below is not needed for releases — only CI's *write* path uses SSH. If the
repository is ever made private, add the deploy key and switch the remote to
`git@github.com:MIANSIT/rs-skyler-limo.git`.

Root also carries `safe.directory` for that path. The tree is owned by
`rsskyler`, and git refuses to run on another user's repository without it —
the release script calls `git` as both users.

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

The code is pushed and the server is a git checkout, so the only thing left is
letting GitHub Actions reach the box.

1. ~~**Deploy key**~~ — **not needed.** The repository is public and the server
   pulls over HTTPS. The server's public key is kept in
   `deploy/github-secrets.md` for the day the repo goes private.

2. **Secrets** — four of them, and that is the whole list. The names, the
   values and how to rotate them are in **`deploy/github-secrets.md`**, which
   is git-ignored and sits beside this file:

   | Secret | Required |
   |---|---|
   | `DEPLOY_HOST` | yes |
   | `DEPLOY_USER` | yes |
   | `DEPLOY_SSH_KEY` | yes |
   | `DEPLOY_HOST_KEY` | strongly recommended |

   **No application configuration belongs in GitHub.** The database password,
   the session secret and the Google key live in `.env` files on the server,
   are git-ignored, and are never touched by a release. CI never needs to see
   them, so do not add them — every copy is another thing that can leak.

3. **Push.** The workflow lints, typechecks and builds all three apps, and only
   releases if that passes. Once the secrets above exist, every push to `main`
   deploys itself. Pull requests run the gate and never release.

   Optionally: repo → Settings → Environments → `production` → require a
   reviewer. The workflow already names that environment, so approval gates
   apply the moment you configure one.

4. ~~**One-time git checkout**~~ — **done.** `/srv/rsskyler/app` tracks
   `origin/main` over HTTPS. The `.env` files are git-ignored and survived the
   conversion; uploads live outside the tree entirely, and both were checked
   afterwards.

The CI key is restricted on the server to a **forced command** — it can run the
release script and nothing else. No shell, no port forwarding, no pty. A leaked
CI secret can redeploy `main`; it cannot read the database or the env files.
Re-tested with `ssh -i deploy/ci_deploy_key root@… "cat api/.env"`, which ran
the release script and printed no secret.

The workflow sends `deploy <40-char SHA>`, and the forced command honours only a
full SHA — anything else falls back to the tip of `main`, so a crafted command
cannot check out an arbitrary ref. Pinning the SHA also means the release is the
commit CI just tested, not whatever `main` points at by the time it runs. Both
paths were exercised against the live server before this was written.

After the release, CI curls the site over the public IP. The release script's
own health check runs on loopback and cannot see an nginx or firewall fault;
this one is on the outside, where the customers are.

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
- **Email** — nothing is sent, in either direction. A quote submitted on the
  site reaches the dashboard and stops there, so somebody has to be watching it.
  This is the largest remaining gap now that the forms themselves work, and it
  needs a sending domain with SPF and DKIM on `rsskylerlimo.com` — the business
  mailbox is on Yahoo, which cannot send on the site's behalf.
- **Off-site backups** — see above.
- **The root password** used to bootstrap this server was typed into a chat
  window. Password authentication is now disabled, so it cannot be used to log
  in, but rotate it anyway at your provider.
