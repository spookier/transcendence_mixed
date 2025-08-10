<?php
try {
    $pdo = new PDO('sqlite:/var/sqlite-data/database.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->query("SELECT id, email, twofa_secret, created_at FROM users");

    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Liste des utilisateurs :\n";
    foreach ($users as $user) {
        echo "-----------------------------\n";
        echo "ID        : " . $user['id'] . "\n";
        echo "Email     : " . $user['email'] . "\n";
        echo "2FA actif : " . ($user['twofa_secret'] ? "Oui" : "Non") . "\n";
        echo "Créé le   : " . $user['created_at'] . "\n";
    }
} catch (PDOException $e) {
    echo "Erreur SQLite : " . $e->getMessage() . "\n";
}
