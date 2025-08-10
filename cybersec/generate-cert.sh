#!/bin/bash

CERT_DIR="./srcs/nginx/certs"
CRT_FILE="$CERT_DIR/selfsigned.crt"
KEY_FILE="$CERT_DIR/selfsigned.key"

# Crée le dossier s’il n'existe pas
mkdir -p "$CERT_DIR"

# Génère le certificat si non déjà présent
if [ ! -f "$CRT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  echo "🔐 Génération du certificat auto-signé pour localhost..."
  openssl req -x509 -newkey rsa:4096 \
    -keyout "$KEY_FILE" \
    -out "$CRT_FILE" \
    -days 365 \
    -nodes \
    -subj "/CN=localhost"
  echo "✅ Certificat généré dans $CERT_DIR"
else
  echo "✅ Certificats déjà existants. Rien à faire."
fi
