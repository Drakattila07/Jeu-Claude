# Progression

## T01 — Fondations ✅

- Vite, TypeScript strict et Vitest
- Boucle déterministe à pas fixe 60 Hz
- Canvas 256×224 et upscale entier ×1 à ×4
- Entrées abstraites clavier
- Écran de contrôle et tests du pas de temps

## T02 — Tilemap ✅

- TileSet procédural respectant la palette globale
- Chargement d'une carte JSON au format Tiled
- Quatre couches et `decor_above` rendu en dernier
- Place du Puits [3,3] jouable comme carte de référence

## T03 — Joueur et collisions ✅

- Marche 4 directions à 1,5 px/frame et animation 4 frames
- AABB contre la grille solide, diagonales normalisées
- Correction de coin jusqu'à 4 px
- Tests du glissement et de la reproductibilité

## T04 — Caméra et transitions ✅

- Caméra par écran et registre de zones piloté par les données
- Sorties cardinales et apparition à deux tuiles du bord opposé
- Fondu noir 8 frames puis retour en 8 frames
- Test d'une boucle de navigation sur quatre zones

## T05 — Interactables ✅

- Puits, panneau, coffre, pot et buisson décrits dans les données
- Interaction contextuelle à proximité
- Persistance par zone des coffres ouverts et buissons coupés
- Messages de retour et récompense en rubis

## T06 — Combat et game feel ✅

- Épée : 4 frames de windup, 8 actives, 6 de recovery
- Hitstop 3 frames, flash, i-frames 40 frames et knockback
- Screen shake 2 px sur les impacts lourds
- Buissons coupables et contrôle verrouillé pendant le windup

## T07 — Ennemis et IA ✅

- Coléoptères, chauves-souris, champignons et gargouilles pilotés par données
- Patrouille, bond, plongée et réveil selon rayon
- Dégâts de contact, drops, recul, flash et mort
- Spawns détruits/recréés avec les changements de zone

## T08 — Dialogues et typewriter ✅

- Boîte de texte 3 lignes de 18 caractères et pagination
- Typewriter 2 frames/caractère, accélérable avec A
- Résolution en cascade selon flags, météo et horaire
- Panneau, puits et objets raccordés à l'interface

## T09 — Flags et quêtes ✅

- Flags comme source de vérité unique
- Machines de quêtes : prérequis, étapes, récompenses et effets monde
- EventBus pub/sub avec mémoire des 10 derniers événements
- Quatre actes et douze quêtes secondaires entièrement décrits dans les données

## T10 — PNJ, horaires et affinité ✅

- Casting complet piloté par données, avec quatre bavardages chacun
- Emplois du temps horaires et déplacement A* sur grille
- Affinité plafonnée à 9, paliers uniques 3/6/9
- Réactions à la mémoire récente de l'EventBus

## T11 — Horloge, nuit et météo ✅

- Minutes, heures et jours de jeu en frames
- Météo journalière déterministe et historique sur trois jours
- Nuit et Canopée Dense avec masque radial
- Pluie pixel et ressources à repousse journalière

## T12 — Reconfiguration du monde ✅

- Résolution ordonnée des variantes depuis les données
- Forêt v1/v2/v3, clairière jour/nuit, rivière et pont
- Moulin arrêté/tournant et dix écrans de lac bas/haut
- Tests des cascades de flags

## T13 — Chaudron et alchimie ✅

- Inventaire typé et recettes entièrement pilotées par données
- Potions rouge, verte et bleue
- Lanterne éternelle et lecture de la Lettre jamais envoyée
- Résultat comique « Bloup » pour les objets sans recette

## T14 — Donjon du Canal Tari ✅

- Dix salles décrites dans les données
- Quatre vannes à trois positions et propagation des niveaux d'eau
- Eau basse/moyenne/haute, blocs flottants et courants décrits
- Mini-boss Sangsue de Pierre et Bottes de Plomb

## T15 — HUD, inventaire, carte et menus ✅

- HUD : cœurs, rubis, zone, heure et météo
- Menu à onglets pour sac, carte et quête active
- Carte 8×7 entièrement jouable, révélée par exploration, sur 56 zones
- Sylve reliée au HintSystem et aux secrets non trouvés

## T16 — Trame principale, Actes I à III ✅

- Épée remise par Bram et racines de la source coupables
- Traque nocturne de l'Arbre Marcheur
- Trois Sceaux activables dans les Marches
- Cœur du Canal et effets en cascade sur le lac, le moulin et les dialogues

## T17 — Quêtes secondaires et mini-jeux ✅

- Douze activités secondaires raccordées aux quêtes de données
- Canne perdue et mini-jeu de pêche déterministe avec Nessa
- Souche Fantôme, Statues-Œil et secrets environnementaux
- Récompenses, flags et progression partagent le même pipeline

## T18 — Acte IV, boss et épilogues ✅

- Arbre-Mère en trois phases : racines, graines et branches-arène
- Dix-huit points de vie, projectiles et impacts lourds
- Choix final Libérer / Enraciner
- Deux jeux complets de dialogues post-game et Chasse aux Secrets

## T19 — Audio et polish visuel ✅

- Synthétiseur WebAudio pur pour musique chiptune adaptative
- Épée, impact, texte, plouf, enclume et secret
- Bips toutes les quatre lettres du typewriter
- Particules de feuilles, étincelles, bulles et fumée

## T20 — Sauvegarde, validation et outillage ✅

- Trois slots localStorage versionnés et tolérants aux données corrompues
- Sauvegarde/soin au puits restauré et reprise automatique du slot principal
- Validation de la palette, des JSON et des références
- Capture headless déterministe après N frames

## Extension de la vallée ✅

- Grille complète de 8×7 écrans, soit 56 zones explorables
- Cartes procédurales déterministes adaptées aux biomes
- Passage continu entre toutes les zones voisines
- Limites extérieures bloquantes, sans retour façon Pac-Man

## Refonte graphique et vie du village ✅

- Tuiles 16-bit redessinées avec ombres, reliefs et détails par biome
- Eau animée, ponts, falaises, ruines moussues, roseaux et cultures
- Personnage principal et habitants plus détaillés et plus expressifs
- Treize routines individuelles avec de vrais trajets de plusieurs cases
- Nessa pêche au lac, Bram forge, Mira récolte et les fermiers cultivent
- Balayage occasionnel, méditation, commerce, garde, repos et jeu de ballon
- Particules atmosphériques adaptées à chaque région

## État final

Les vingt tickets sont implémentés, compilés, testés et versionnés
individuellement. Le jeu respecte TypeScript strict, le Canvas 2D pur, la
résolution 256×224, l'upscale entier, les données séparées du moteur et la
simulation déterministe à 60 Hz.
