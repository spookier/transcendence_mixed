
# Lancement des conteneurs #
Docker compose build

Docker compose up -d

# Lancement des scripts #
./generate-cert.sh -> certificats auto-signe pour https

./vault-init.sh    -> Injection de la signature pour le JWT


A partir de la vous pouvez lancer firefox et acceder dans un premier temps a https://localhost/register.html
Inscrivez vous avec ou sans la double authentification.
Si double authentification vous verez un bouton pour generer le QRcode. Scannez le avec l'appli Google Authenticator.
vous pouvez vous logs sur https://localhost/login.html. rentrez le code OTP de l'appli si vous avez activer 2FA

# Securiser les appels au backend # 

Dans login.php je genere le JWT (json web token). A partir de la, pour tout appels au backend vous devez inclure le fichier auth.php et faire appel a la fonction requireAuth().
Celle ci verifie le token. si il est invalid, on renvois erreur 401.

<img width="573" height="399" alt="image" src="https://github.com/user-attachments/assets/cf594144-ef3f-45af-96ae-879f8d3ef3d8" />

# Securiser les changements de page html (frontend) # 

Le JWT est stocker dans le localstorage du navigateur 
<img width="522" height="32" alt="image" src="https://github.com/user-attachments/assets/cbf80ca8-fa04-48df-9044-bcd98715cf64" />

Il faut donc que pour toutes page nécessitant d'etre connecte il faut : 
<img width="779" height="147" alt="image" src="https://github.com/user-attachments/assets/04097a0e-f7e9-4d00-881f-5260207ade21" />

Au debut du JS
