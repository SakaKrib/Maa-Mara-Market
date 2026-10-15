#!/bin/sh
set -eu

BOOTSTRAP_CONFIG="/etc/nginx/templates/bootstrap.conf"
PRODUCTION_CONFIG="/etc/nginx/templates/production.conf"
ACTIVE_CONFIG="/etc/nginx/conf.d/default.conf"
CERT_FILE="/etc/letsencrypt/live/maamaramarket.com/fullchain.pem"
KEY_FILE="/etc/letsencrypt/live/maamaramarket.com/privkey.pem"
last_cert_mtime=""

cp "$BOOTSTRAP_CONFIG" "$ACTIVE_CONFIG"
nginx -t
nginx

stop_nginx() {
    nginx -s quit 2>/dev/null || true
}
trap stop_nginx TERM INT

while :; do
    if [ -s "$CERT_FILE" ] && [ -s "$KEY_FILE" ]; then
        cert_mtime="$(stat -c '%Y' "$CERT_FILE" 2>/dev/null || true)"
        if [ -n "$cert_mtime" ] && [ "$cert_mtime" != "$last_cert_mtime" ]; then
            cp "$PRODUCTION_CONFIG" "$ACTIVE_CONFIG"
            if nginx -t; then
                if nginx -s reload; then
                    last_cert_mtime="$cert_mtime"
                else
                    echo "Nginx reload failed; retaining bootstrap configuration on disk." >&2
                    cp "$BOOTSTRAP_CONFIG" "$ACTIVE_CONFIG"
                    nginx -t
                fi
            else
                echo "Production Nginx configuration is invalid; retaining bootstrap configuration." >&2
                cp "$BOOTSTRAP_CONFIG" "$ACTIVE_CONFIG"
                nginx -t
            fi
        fi
    fi

    nginx_pid="$(cat /var/run/nginx.pid 2>/dev/null || true)"
    if [ -z "$nginx_pid" ] || ! kill -0 "$nginx_pid" 2>/dev/null; then
        echo "Nginx master process is not running." >&2
        exit 1
    fi

    sleep 30
done
