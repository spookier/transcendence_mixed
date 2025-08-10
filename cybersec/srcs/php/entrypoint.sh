#!/bin/sh

echo "Initialisation de l’environnement SQLite..."

# Crée le dossier du volume
mkdir -p /var/sqlite-data

# Fixer les droits du dossier
chown -R www-data:www-data /var/sqlite-data
chmod -R 775 /var/sqlite-data

# Créer le fichier de base
if [ ! -f /var/sqlite-data/database.sqlite ]; then
    touch /var/sqlite-data/database.sqlite
    echo "Base SQLite créée."
fi

# Fixer les droits sur le fichier
chown www-data:www-data /var/sqlite-data/database.sqlite
chmod 664 /var/sqlite-data/database.sqlite

# Créer la table si besoin
echo "Exécution de setup.php"
php /var/www/html/app/setup.php

# Lancer PHP-FPM
echo "Lancement de php-fpm"
exec php-fpm
