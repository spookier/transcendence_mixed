#!/bin/bash

VAULT_ADDR="http://localhost:8200"
VAULT_TOKEN="root"

echo "[Vault Init] Injection des secrets..."

# Clé secrète JWT
curl --silent --header "X-Vault-Token: $VAULT_TOKEN" \
     --request POST \
     --data '{"data": {"jwt_secret": "SignatureToken42"}}' \
     "$VAULT_ADDR/v1/secret/data/jwt"

echo "[Vault Init] Secrets injectés avec succès."

