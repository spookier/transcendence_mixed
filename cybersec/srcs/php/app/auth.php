<?php
require_once '../vendor/autoload.php';
require_once 'vault.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

//Extrait le token JWT depuis l'en-tête Authorization
function getTokenFromHeader(): ?string {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) return null;

    if (preg_match('/Bearer\s+(\S+)/', $headers['Authorization'], $matches)) {
        return $matches[1];
    }
    return null;
}


//Décode et valide le JWT
function getCurrentUser(): ?array {
    $token = getTokenFromHeader();
    if (!$token) return null;

    $secrets = getSecretFromVault("jwt");
    $jwtSecret = $secrets["jwt_secret"] ?? null;
    if (!$jwtSecret) return null;

    try {
        $decoded = JWT::decode($token, new Key($jwtSecret, 'HS256'));

        return [
            "id" => $decoded->sub ?? null,
            "email" => $decoded->email ?? null,
            "twofa" => $decoded->twofa ?? false,
            "token" => $token
        ];
    } catch (Exception $e) {
        return null;
    }
}


//Protège une route : renvoie 401 si non authentifié
function requireAuth(): array {
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Accès non autorisé"]);
        exit;
    }
    return $user;
}
