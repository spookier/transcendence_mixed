<?php
/**
 * Récupère un secret stocké dans HashiCorp Vault
 * string $path Le chemin du secret dans Vault
 * array|null Les données du secret ou null si erreur
 */
function getSecretFromVault(string $path): ?array {
    $url = "http://vault:8200/v1/secret/data/" . $path;
    $token = "root"; // Token de dév

    $headers = [
        "X-Vault-Token: $token"
    ];

    $context = stream_context_create([
        "http" => [
            "method" => "GET",
            "header" => implode("\r\n", $headers)
        ]
    ]);

    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        error_log("Erreur : impossible de contacter Vault ou secret introuvable.");
        return null;
    }

    $json = json_decode($response, true);
    if (!isset($json["data"]["data"])) {
        error_log("Format de réponse invalide.");
        return null;
    }

    return $json["data"]["data"];
}

