#!/usr/bin/env bash
set -e

BASE_URL="https://localhost:8443"
HTTP_URL="http://localhost:8080"

echo "[1] Test redirection HTTP -> HTTPS"
curl -Ik $HTTP_URL | grep -i "Location:"

echo
echo "[2] Test certificat et protocole TLS"
curl -Ik --insecure $BASE_URL | grep -E "HTTP/|Strict-Transport-Security"

echo
echo "[3] Vérification des en-têtes de sécurité"
curl -Ik --insecure $BASE_URL | grep -E "Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options|Referrer-Policy|Permissions-Policy|Content-Security-Policy"

echo
echo "[4] Test ModSecurity (payload XSS)"
curl -isk --insecure "$BASE_URL/?q=%3Cscript%3Ealert(1)%3C/script%3E" > /dev/null

LOG_PATH="./srcs/nginx/logs/modsec_audit.log"
if [ -f "$LOG_PATH" ]; then
    echo "→ Vérifie si ModSecurity a logué l'attaque :"
    tail -n 20 "$LOG_PATH" | grep --color=always --ignore-case "xss"
else
    echo "⚠ Le fichier $LOG_PATH n'existe pas ou n'est pas monté"
fi
