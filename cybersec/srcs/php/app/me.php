<?php
require_once 'auth.php';

header('Content-Type: application/json');

$currentUser = requireAuth();

echo json_encode([
    "id" => $currentUser["id"],
    "email" => $currentUser["email"],
    "twofa" => $currentUser["twofa"]
]);
