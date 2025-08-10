<?php
try {
    $pdo = new PDO('sqlite:/var/sqlite-data/database.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Erreur de connexion SQLite : " . $e->getMessage());
}
