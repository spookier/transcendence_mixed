<?php
try {
    $pdo = new PDO('sqlite:/var/sqlite-data/database.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Créer la table users si elle n'existe pas
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            twofa_secret INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    ");

    echo "Table 'users' prête.\n";
} catch (PDOException $e) {
    echo "Erreur dans setup.php : " . $e->getMessage() . "\n";
    exit(1);
}
