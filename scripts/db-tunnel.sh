#!/usr/bin/env bash
#
# Opens a tunnel to the production MySQL, then connect on 127.0.0.1:3307.
#
# The server's MySQL listens on loopback only and 3306 is closed in the
# firewall, deliberately — an internet-facing database is the single worst
# thing on a box like this. SSH is the front door, so the tunnel borrows it.
#
#   ./scripts/db-tunnel.sh              # hold the tunnel open (Ctrl-C to stop)
#   ./scripts/db-tunnel.sh --mysql      # open it and drop into a mysql shell
#
set -euo pipefail

HOST=184.94.215.246
KEY="${HOME}/.ssh/rsskyler_deploy"
LOCAL_PORT=3307

ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/deploy/production.env"
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE — it holds the database password."; exit 1; }
DB_PASSWORD=$(grep '^DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
DB_NAME=$(grep '^DB_NAME=' "$ENV_FILE" | cut -d= -f2-)
DB_USER=$(grep '^DB_USER=' "$ENV_FILE" | cut -d= -f2-)

if [ "${1:-}" = "--mysql" ]; then
  command -v mysql >/dev/null || { echo "No local mysql client. Use the plain tunnel and a GUI."; exit 1; }
  # -f backgrounds the tunnel, `sleep 30` gives it a lifetime just long enough
  # for the client to connect; it exits when the session ends.
  ssh -i "$KEY" -o IdentitiesOnly=yes -f -L "${LOCAL_PORT}:127.0.0.1:3306" "root@${HOST}" sleep 30
  exec mysql --protocol=TCP -h 127.0.0.1 -P "$LOCAL_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"
fi

cat <<INFO
Tunnel open. Connect any client to:

  Host      127.0.0.1
  Port      ${LOCAL_PORT}
  User      ${DB_USER}
  Password  (DB_PASSWORD in deploy/production.env)
  Database  ${DB_NAME}

TablePlus / Sequel Ace / DBeaver: use those values with a plain TCP connection —
do not also enable the client's own SSH tunnelling, this script is the tunnel.

Ctrl-C to close.
INFO

exec ssh -i "$KEY" -o IdentitiesOnly=yes -N -L "${LOCAL_PORT}:127.0.0.1:3306" "root@${HOST}"
