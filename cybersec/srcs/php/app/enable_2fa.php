<?php
require_once 'auth.php';
require_once '../vendor/autoload.php';
require_once 'vault.php';

use RobThree\Auth\TwoFactorAuth;
use RobThree\Auth\Providers\Qr\BaconQrCodeProvider;
use RobThree\Auth\Algorithm;

// 1. Authentification de l'utilisateur
$currentUser = requireAuth();
$userId = $currentUser['id'];
$email = $currentUser['email'];

// 2. Initialisation de TwoFactorAuth avec provider et algo
$tfa = new TwoFactorAuth(
    new BaconQrCodeProvider(),
    'ft_transcendence',
    6,
    30,
    Algorithm::Sha1
);

// 3. Génération d’un secret unique TOTP
$secret = $tfa->createSecret();

// 4. Stocker ce secret dans Vault, à la clé: secret/data/2fa/user_{ID}
$vaultKey = "2fa/user_$userId";
$vaultContext = stream_context_create([
    "http" => [
        "method" => "POST",
        "header" => "X-Vault-Token: root\r\nContent-Type: application/json",
        "content" => json_encode(["data" => ["secret" => $secret]])
    ]
]);
$response = @file_get_contents("http://vault:8200/v1/secret/data/$vaultKey", false, $vaultContext);

if ($response === false) {
    http_response_code(500);
    echo json_encode(["error" => "Erreur lors de l'enregistrement du secret dans Vault"]);
    exit;
}

// 5. Mettre à jour la base : active 2FA
try {
    $pdo = new PDO('sqlite:/var/sqlite-data/database.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $pdo->prepare("UPDATE users SET twofa_secret = 1 WHERE id = ?");
    $stmt->execute([$userId]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Erreur base de données : " . $e->getMessage()]);
    exit;
}

// 6. Générer un QR code base64 inline à afficher dans l'interface
$qrCodeImage = $tfa->getQRCodeImageAsDataUri($email, $secret);

// 7. Retourner le QR code + secret
echo json_encode([
    "qr_code" => $qrCodeImage,
    "secret" => $secret // utile pour debug ou saisie manuelle
]);
