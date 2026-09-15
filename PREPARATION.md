# Préparation vocale C1

Ouvrir `c1_3d.html` avec le dossier `vendor` et les deux fichiers `preparation-*.js` à côté. Pour le microphone, utiliser de préférence le serveur local (`python3 -m http.server 8765 --bind 127.0.0.1`) puis http://127.0.0.1:8765/c1_3d.html. En ligne, utiliser HTTPS.

## Organisation

- `c1_3d.html` : scène Three.js existante, interface, navigation, raycasting et animation du dépôt.
- `preparation-core.js` : emplacements et machine d’états indépendante du navigateur.
- `preparation-voice.js` : synthèse française et reconnaissance Web Speech (`SpeechRecognition` / `webkitSpeechRecognition`). Pas de compte, clé API ou serveur vocal propre au jeu.
- `tests/` : tests de logique et du cycle de vie vocal avec service simulé.

## Emplacements

200 emplacements fixes, `001` à `200`, impairs à gauche en regardant depuis l’entrée vers le fond, pairs à droite. Chaque côté contient 100 emplacements actifs. Les codes à deux chiffres (`00` à `99`) changent à chaque nouvelle partie et restent stables entre commandes. Un code ne vaut pas le numéro numérique de son emplacement. Deux voisins successifs du même côté, même de part et d’autre d’un montant, ont des codes différents.

**200 n’est pas divisible par trois.** Le compromis adopté est 34 travées par côté avec exactement trois palettes chacune : 200 palettes actives et quatre palettes de réserve non numérotées, non jouables, à l’extrémité. Ces réserves ne sont jamais annoncées par Lydia. Les palettes sont au sol sous la première lisse, hors de l’allée, avec de petits cartons semblables.

## Jouer

1. Cliquer **Commencer · Voix et micro**, puis autoriser le micro si le navigateur le demande.
2. Lydia annonce « Bin 150 » (exemple). Avancer/reculer avec ↑/↓ ou les boutons, puis utiliser **Palettes gauche/droite** pour lire les étiquettes. Le noir sur fond clair est le numéro fixe ; le nombre dessous est le détrompeur.
3. Dire « deux, cinq », « 2 5 », ou « deux », laisser le premier chiffre être reconnu, puis « cinq ». « vingt-cinq » et la transcription compacte « 25 » sont refusés. Le moteur peut normaliser une bonne prononciation en « 25 » : dans ce cas, dire les chiffres successivement. Le jeu ne prétend pas déduire la prononciation de cette transcription ambiguë.
4. Après le bon code, Lydia annonce « Un Delta ». Cliquer la palette 150 (ou son étiquette) pour prendre le colis.
5. Répéter à voix haute « Un Delta », puis cliquer le roll Delta dans la scène. Le bouton **Afficher les rolls** aide à les identifier.
6. Un mauvais roll ajoute une erreur, sans réussite, et permet de retenter le dépôt. Le bon roll compte une seule fois, anime le dépôt, fait confirmer Lydia, puis crée une commande suivante.

Les anciens contrôles caméra, l’inversion du C1 et la pause restent disponibles. A/Z/E rapprochent la caméra des trois positions ; ←/→ repèrent les rolls. Espace répète Lydia. **Entrée ne dépose plus** : le clic sur le roll est désormais obligatoire. Aucun ancien choix de palette au clavier ne remplace une validation vocale.

Lydia et le microphone alternent : les résultats intermédiaires, reçus pendant Lydia ou appartenant à un ancien cycle sont ignorés. La pause et le changement d’onglet interrompent la voix et l’écoute. Les erreurs de permission, de réseau ou de microphone sont affichées ; **Réactiver le micro** permet de réessayer. Le jeu ne stocke aucun audio. Certains navigateurs utilisent un service distant pour la reconnaissance ; connexion et disponibilité varient selon le navigateur.

Références : [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis).

## Vérifier la boucle

**Mode test vocal · Bin 150 → Delta** démarre une session séparée du score normal, place le joueur près du bin 150 et fixe son code à 25. Faire réellement les étapes ci-dessus au micro. Le journal montre les validations successives. Ce test nécessite un microphone et un service vocal disponibles.

**Test de la boucle sans micro** utilise la même scène, les mêmes validateurs et la même voix de Lydia, mais permet d’injecter une transcription à la place de la reconnaissance :

1. Attendre l’annonce « Bin 150 » ; injecter `vingt-cinq` : refus, score zéro.
2. Injecter `deux, cinq` : Lydia annonce « Un Delta ».
3. Cliquer une autre palette : refus. Cliquer la palette 150 : colis en main.
4. Injecter `Un Alpha` : refus. Injecter `Un Delta` : dépôt autorisé.
5. Cliquer Alpha : erreur, score zéro. Cliquer Delta : une réussite et une nouvelle commande.
6. Vérifier aussi pause/reprise, nouvelle partie pendant une annonce et double clic sur un roll.

La simulation est explicitement signalée et inaccessible dans une partie normale. Elle ne constitue pas un test acoustique du micro.

Tests automatisés sur macOS, sans installation :

```sh
python3 tests/run-jsc.py
```

Les 14 tests couvrent notamment les 200 emplacements, 100 tirages de voisinage, codes stables, lecture des chiffres, validation des trois conditions et du prélèvement, erreurs, pause, double dépôt, interruption de Lydia, résultats vocaux obsolètes et refus du microphone. Le rendu et des transitions du mode simulé ont aussi été contrôlés dans Safari. La reconnaissance d’une voix humaine reste à vérifier sur le micro de l’utilisateur.
