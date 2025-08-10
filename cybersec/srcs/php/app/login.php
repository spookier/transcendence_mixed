<?php
require_once '../vendor/autoload.php';
require_once 'vault.php';
use Firebase\JWT\JWT;
use RobThree\Auth\TwoFactorAuth;
use RobThree\Auth\Providers\Qr\BaconQrCodeProvider;
use RobThree\Auth\Algorithm;

// Récupération des champs
$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';
$otp = $_POST['otp'] ?? null;

if (!$email || !$password) {
    echo json_encode(["error" => "Email et mot de passe requis"]);
    exit;
}

// Connexion SQLite
try {
    $pdo = new PDO('sqlite:/var/sqlite-data/database.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(["error" => "Erreur SQLite : " . $e->getMessage()]);
    exit;
}

// Récupération de l'utilisateur
$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode(["error" => "Identifiants invalides"]);
    exit;
}

// Vérification 2FA seulement si activé
if ($user['twofa_secret']) {
    if (!$otp) {
        http_response_code(401);
        echo json_encode(["error" => "Code OTP requis"]);
        exit;
    }

    // Lecture du secret 2FA depuis Vault
    $vaultKey = "2fa/user_" . $user["id"];
    $context = stream_context_create([
        "http" => [
            "method" => "GET",
            "header" => "X-Vault-Token: root"
        ]
    ]);
    $response = @file_get_contents("http://vault:8200/v1/secret/data/$vaultKey", false, $context);
    if (!$response) {
        http_response_code(500);
        echo json_encode(["error" => "Erreur Vault"]);
        exit;
    }

    $json = json_decode($response, true);
    $secret = $json["data"]["data"]["secret"] ?? null;

    if (!$secret) {
        http_response_code(500);
        echo json_encode(["error" => "Secret OTP manquant"]);
        exit;
    }

    $tfa = new TwoFactorAuth(
        new BaconQrCodeProvider(),
        'ft_transcendence',
        6,
        30,
        Algorithm::Sha1
    );

    if (!$tfa->verifyCode($secret, $otp)) {
        http_response_code(401);
        echo json_encode(["error" => "Code OTP incorrect"]);
        exit;
    }
}

// Génération du JWT
$secrets = getSecretFromVault("jwt");
$jwtSecret = $secrets["jwt_secret"] ?? null;

if (!$jwtSecret) {
    http_response_code(500);
    echo json_encode(["error" => "Clé JWT manquante"]);
    exit;
}

$payload = [
    "sub" => $user["id"],
    "email" => $user["email"],
    "twofa" => (bool)$user["twofa_secret"],
    "exp" => time() + 3600
];

$token = JWT::encode($payload, $jwtSecret, 'HS256');

echo json_encode([
    "token" => $token
]);
