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
