<?php
require_once 'auth.php';

$currentUser = requireAuth();

echo json_encode([
    "message" => "Bienvenue !",
    "email" => $currentUser["email"],
    "2FA" => $currentUser["twofa"] ? "active" : "désactive"
]);
