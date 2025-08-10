<?php

require_once '../vendor/autoload.php';
require_once 'vault.php';

use Firebase\JWT\JWT;

// Récupération des données du formulaire
$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';
$twofa = isset($_POST['twofa']) ? 1 : 0;

if (!$email || !$password) {
    echo json_encode(["error" => "Email et mot de passe requis"]);
    exit;
}

// Connexion à SQLite
try {
    $pdo = new PDO('sqlite:/var/sqlite-data/database.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(["error" => "Erreur SQLite : " . $e->getMessage()]));
}

// Hachage du mot de passe
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Insertion en base
try {
    $stmt = $pdo->prepare("INSERT INTO users (email, password, twofa_secret) VALUES (?, ?, ?)");
    $stmt->execute([$email, $hashedPassword, $twofa]);

    $userId = $pdo->lastInsertId();

    // Génération du JWT après inscription
    $secrets = getSecretFromVault("jwt");
    $jwtSecret = $secrets["jwt_secret"] ?? null;

    if (!$jwtSecret) {
        http_response_code(500);
        echo json_encode(["error" => "Clé JWT manquante"]);
        exit;
    }

    $payload = [
        "sub" => $userId,
        "email" => $email,
        "twofa" => (bool)$twofa,
        "exp" => time() + 3600
    ];

    $token = JWT::encode($payload, $jwtSecret, 'HS256');

    echo json_encode([
        "success" => true,
        "token" => $token
    ]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        echo json_encode(["error" => "Email déjà utilisé"]);
    } else {
        echo json_encode(["error" => "Erreur base de données : " . $e->getMessage()]);
    }
}
