#!/bin/bash
# Ubuntu 24.04; dependencies installed by the bootstrap. Run as root with PUBLIC_IP.
set -euo pipefail
: "${PUBLIC_IP:?Set PUBLIC_IP to the server public IPv4 address}"
[[ "$PUBLIC_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]
cd /opt/studyflow

if [ ! -f /etc/studyflow.env ]; then
  umask 077
  DB_PASSWORD=$(openssl rand -hex 24)
  ENCRYPTION_KEY=$(openssl rand -hex 32)
  cat >/etc/studyflow.env <<ENVFILE
DATABASE_URL=postgresql://studyflow:$DB_PASSWORD@127.0.0.1:5432/studyflow
APP_ORIGIN=https://$PUBLIC_IP
COOKIE_SECURE=true
MODEL_ENCRYPTION_KEY=$ENCRYPTION_KEY
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
HOSTNAME=127.0.0.1
PORT=3000
ENVFILE
fi
umask 022
chmod 600 /etc/studyflow.env
set -a
source /etc/studyflow.env
set +a
DB_PASSWORD=${DATABASE_URL#postgresql://studyflow:}
DB_PASSWORD=${DB_PASSWORD%@127.0.0.1:5432/studyflow}
[[ "$DB_PASSWORD" =~ ^[a-f0-9]{48}$ ]]
if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='studyflow'" | grep -q 1; then
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "CREATE ROLE studyflow LOGIN PASSWORD '$DB_PASSWORD'"
fi
if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='studyflow'" | grep -q 1; then
  runuser -u postgres -- createdb -O studyflow studyflow
fi

mkdir -p /var/www/studyflow-acme
chmod 755 /var/www/studyflow-acme
cat >/etc/nginx/sites-available/studyflow <<NGINX
server {
  listen 80;
  server_name $PUBLIC_IP;
  location /.well-known/acme-challenge/ { root /var/www/studyflow-acme; }
  location / { return 503; }
}
NGINX
ln -sfn /etc/nginx/sites-available/studyflow /etc/nginx/sites-enabled/studyflow
nginx -t
systemctl reload nginx
/opt/certbot/bin/certbot certonly --non-interactive --agree-tos --register-unsafely-without-email \
  --webroot --webroot-path /var/www/studyflow-acme --ip-address "$PUBLIC_IP" \
  --preferred-profile shortlived --cert-name studyflow-ip

chown -R studyflow:studyflow /opt/studyflow
runuser -u studyflow -- env NODE_ENV=production STANDALONE=true NODE_OPTIONS=--max-old-space-size=1536 \
  /bin/bash -c 'set -eu; cd /opt/studyflow; npm ci --include=dev --no-audit --no-fund; node scripts/postgres-schema.mjs; npx prisma generate --schema=prisma/postgresql.prisma; npx prisma migrate deploy --schema=prisma/postgresql.prisma; npm run build; cp -a public .next/standalone/; cp -a .next/static .next/standalone/.next/'

cat >/etc/systemd/system/studyflow.service <<'SERVICE'
[Unit]
Description=StudyFlow learning workspace
After=network.target postgresql.service
Requires=postgresql.service
[Service]
Type=simple
User=studyflow
Group=studyflow
WorkingDirectory=/opt/studyflow
EnvironmentFile=/etc/studyflow.env
ExecStart=/usr/local/bin/node /opt/studyflow/.next/standalone/server.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
UMask=0077
[Install]
WantedBy=multi-user.target
SERVICE
systemctl daemon-reload
systemctl enable --now studyflow
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health; then break; fi
  sleep 2
done
curl -fsS http://127.0.0.1:3000/api/health

cat >/etc/nginx/sites-available/studyflow <<NGINX
limit_req_zone \$binary_remote_addr zone=studyflow:10m rate=10r/s;
server {
  listen 80;
  server_name $PUBLIC_IP;
  location /.well-known/acme-challenge/ { root /var/www/studyflow-acme; }
  location / { return 301 https://$PUBLIC_IP\$request_uri; }
}
server {
  listen 443 ssl;
  server_name $PUBLIC_IP;
  ssl_certificate /etc/letsencrypt/live/studyflow-ip/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/studyflow-ip/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  server_tokens off;
  client_max_body_size 64k;
  add_header Strict-Transport-Security "max-age=604800" always;
  location /api/ {
    limit_req zone=studyflow burst=30 nodelay;
    limit_req_status 429;
    proxy_pass http://127.0.0.1:3000;
    include /etc/nginx/proxy_params;
    proxy_http_version 1.1;
    proxy_read_timeout 180s;
    proxy_send_timeout 180s;
    proxy_buffering off;
  }
  location / {
    proxy_pass http://127.0.0.1:3000;
    include /etc/nginx/proxy_params;
    proxy_http_version 1.1;
    proxy_read_timeout 180s;
  }
}
NGINX
nginx -t
systemctl reload nginx
cat >/etc/systemd/system/studyflow-cert-renew.service <<'RENEW'
[Unit]
Description=Renew StudyFlow IP TLS certificate
After=network-online.target
[Service]
Type=oneshot
ExecStart=/opt/certbot/bin/certbot renew --quiet --deploy-hook "/usr/sbin/nginx -s reload"
RENEW
cat >/etc/systemd/system/studyflow-cert-renew.timer <<'TIMER'
[Unit]
Description=Check StudyFlow certificate renewal every six hours
[Timer]
OnCalendar=*-*-* 00,06,12,18:00:00
RandomizedDelaySec=15m
Persistent=true
[Install]
WantedBy=timers.target
TIMER
systemctl daemon-reload
systemctl enable --now studyflow-cert-renew.timer
curl -fsS "https://$PUBLIC_IP/api/health"
echo STUDYFLOW_DEPLOY_READY
