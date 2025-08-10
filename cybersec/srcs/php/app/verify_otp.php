<?php
require_once 'auth.php';
require_once '../vendor/autoload.php';
require_once 'vault.php';

use RobThree\Auth\TwoFactorAuth;
use RobThree\Auth\Providers\Qr\BaconQrCodeProvider;
use RobThree\Auth\Algorithm;

// Authentifier l'utilisateur via JWT
$currentUser = requireAuth();
$userId = $currentUser['id'];
$email = $currentUser['email'];

// Vérifier que le code est envoyé
$code = $_POST['code'] ?? null;
if (!$code || !preg_match('/^\d{6}$/', $code)) {
    http_response_code(400);
    echo json_encode(["error" => "Code OTP invalide"]);
    exit;
}

// Lire le secret 2FA depuis Vault
$vaultKey = "2fa/user_$userId";
$context = stream_context_create([
    "http" => [
        "method" => "GET",
        "header" => "X-Vault-Token: root"
    ]
]);
$response = @file_get_contents("http://vault:8200/v1/secret/data/$vaultKey", false, $context);

if ($response === false) {
    http_response_code(500);
    echo json_encode(["error" => "Impossible de lire le secret 2FA depuis Vault"]);
    exit;
}

$json = json_decode($response, true);
$secret = $json["data"]["data"]["secret"] ?? null;
if (!$secret) {
    http_response_code(500);
    echo json_encode(["error" => "Secret 2FA manquant ou mal formaté"]);
    exit;
}

// Vérification du code
$tfa = new TwoFactorAuth(
    new BaconQrCodeProvider(),
    'ft_transcendence',
    6,
    30,
    Algorithm::Sha1
);

$isValid = $tfa->verifyCode($secret, $code);

if ($isValid) {
    echo json_encode(["success" => true]);
} else {
    http_response_code(401);
    echo json_encode(["error" => "Code incorrect"]);
}
