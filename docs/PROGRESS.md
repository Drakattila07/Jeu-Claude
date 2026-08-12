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

## Intérieurs et lieux remarquables ✅

- Porte de la maison solide et ouverture uniquement avec le bouton d'action
- Salle intérieure indépendante avec lit, tapis, bibliothèque, table et cheminée
- Fleuve sinueux, gué en pierres et pont de bois clairement différenciés
- Falaises en terrasses avec escaliers et sentiers lisibles
- Ermitage de Gorm reconstruit autour d'une maison isolée dans les hauteurs

## Lisibilité, habitants et montagnes ✅

- Intérieur du Doyen redessiné autour d'un grand tapis rouge et de meubles complets
- Journal multi-quêtes, étapes numérotées, progression et objectif permanent
- X réservé aux dialogues et interactions ; Espace réservé à l'épée
- Garde du village, riposte des habitants agressés et alarme collective
- Cinq loups répartis dans les forêts
- Cimes, terrasses rocheuses, ruines et arène finale entièrement restructurées
- Intérieur distinct et accessible pour l'ermitage de Gorm

## Château de Cendre et forme demi-démon ✅

- Nouvelle forteresse extérieure et grande salle intérieure avec trône et braseros
- Trois Gardes de Cendre et un Mage des Braises
- Crâne du Demi-Démon remis après la victoire et conservé dans l'inventaire
- Transformation activable avec Maj, vitesse accrue et dégâts doublés
- Onde de feu autour du joueur et boule de feu à chaque attaque
- Incendies sur les arbres, maisons, clôtures, ponts et éléments en bois
- Forêts densifiées avec arbres sur les sentiers et contreforts montagneux

## Tour de Lune et accès nord du château ✅

- Passage nord du Château de Cendre ouvert jusqu'à sa porte principale
- Tour de Lune érigée à la place de l'ancienne cabane d'Îris
- Intérieur céleste visitable avec chaudron, fioles, bibliothèque et escalier
- Maëlis la sorcière animée par une routine individuelle
- Chat-Lanterne flottant, interactif et capable de restaurer tous les cœurs

## Enjeux, économie et quêtes atteignables ✅

Une relecture complète a montré que le contenu déclaré dépassait largement le
contenu jouable : neuf des dix-sept quêtes ne pouvaient pas être terminées.

### Correctifs

- Mort réelle : chute, écran de fin, renaissance au dernier puits touché,
  quart de la bourse perdu — les cœurs à zéro n'avaient aucun effet
- Ennemis bloqués par le décor et bornés à l'écran ; chauves-souris et
  gargouilles conservent le droit de traverser les murs
- Emplois du temps des PNJ rafraîchis au changement d'heure, plus seulement
  en franchissant une frontière de zone
- Sauvegardes intégralement validées avant chargement, restauration protégée,
  objets inconnus ignorés au lieu de faire planter le démarrage
- Recul du joueur réellement joué sur huit frames et arrêté par les murs
- Notices coupées sur les espaces via `paginateText`, plus de fin avalée
- Transition de zone qui continue d'avancer même menu ouvert
- Boîte de collision des ennemis alignée sur leur hitbox déclarée

### Contenu

- Sept objets de monde créés pour les déclencheurs orphelins : fagot de
  racines, veine de minerai, dalles de la comptine, cercle de chandelles,
  pierres du saule, festin de Gorm et fente à courrier
- Système de conditions : objets requis et consommés, nuit, pluie, drapeaux,
  rubis, taux d'exploration — chacun avec son message de refus
- Boutique du Colporteur : sept lignes, stock rare déblocable, dette de
  200 rubis qui donne enfin un usage à la monnaie
- Quête de cartographie déclenchée automatiquement à 56 zones sur 56
  (l'activité n'en accordait que 44, la quête ne pouvait pas se boucler)
- Récompenses converties en statistiques réelles : Épée +1, Porte-monnaie 500
  et trois gains de cœurs, centralisés dans `Progression`
- Primes en rubis effectivement versées : le type de récompense existait dans
  les données mais `complete()` n'appliquait que les drapeaux
- Deux nouvelles quêtes appuyées sur des déclencheurs déjà câblés — La Battue
  (cinq loups) et Le Panier du Lac (quatre prises) — soit dix-neuf au total

### Garde-fous

- `validate:data` refuse désormais un déclencheur absent du monde ou une
  activité qui n'accorde pas le compte attendu
- Tests d'atteignabilité : chaque étape de quête doit avoir une source capable
  de la faire avancer, chaque objet doit être posé sur une case accessible

## Identité visuelle des biomes ✅

Trois couples de biomes se partageaient tuile pour tuile le même sol *et* le
même décor : les Cimes se rendaient avec l'herbe et les champignons de la
forêt, les falaises avec le pavage des ruines. Seul l'obstacle changeait.

- Onze tuiles ajoutées en fin de table — névé, éboulis, pelouse d'altitude,
  bruyère, bloc erratique, aiguille, sapin enneigé, gravier, pavage, chaume
  et tourbe herbue. Les indices existants n'ont pas bougé.
- Palette inchangée : les 32 couleurs suffisaient, il manquait des matières
- Sommets étagés du clair au sombre — névé, roche, pelouse, bruyère : la
  hauteur se lit d'un coup d'œil
- Chaque biome possède désormais sa propre matière dominante
- Composition revue : un sol domine largement, l'autre ponctue. L'alternance
  à parts égales redonnait le damier qu'on cherchait à fuir.
- Falaises stratifiées avec fissures indexées sur la variante de tuile : une
  rangée cesse de se lire comme un motif répété
- Arène de l'Arbre-Mère refaite en plateau dallé clair, pour que le joueur et
  le boss se détachent pendant le combat
- Tests : aucun couple de biomes ne peut plus partager ses matières
  dominantes, les sommets refusent les tuiles de vallée, et toutes les
  sorties d'une zone restent reliées entre elles

## Refonte — vallée continue, lumière et lisibilité ✅

Le bug rapporté était le bon fil à tirer : « on passe dans un terrain à côté et
on se retrouve bloqué par un objet du terrain ». Trois causes s'additionnaient.

1. **Le point de dépose n'était pas vérifié.** La carte d'arrivée était générée
   indépendamment de celle qu'on quittait ; rien ne garantissait que la case
   d'atterrissage soit praticable. On pouvait apparaître en plein tronc.
2. **`moveOnGrid` ne savait pas sortir d'un solide.** Une fois encastré, chaque
   candidat de mouvement touchait le même mur, donc tout était refusé : la
   partie était perdue sans message.
3. **Les passages n'étaient pas partagés.** Chaque zone perçait sa ceinture où
   elle voulait ; l'ouverture d'en face pouvait ne mener nulle part.

Correctifs : `resolveOverlap` (recherche en anneaux, déterministe) appliqué à
chaque téléportation, `moveOnGrid` qui laisse repartir un corps encastré, et
des passages calculés depuis l'identité de la frontière — les deux voisines
lisent le même nombre. Le point de dépose est en outre borné au passage
partagé, ce qui a révélé quatre poches fermées supplémentaires.

Vérification : un test parcourt les 56 régions × 4 bords × 9 hauteurs et exige
que l'arrivée soit libre *et* reliée au réseau principal. Un automate joue
36 000 images en visitant chaque région : zéro encastrement, zéro blocage.

### Le reste de la refonte

- **Fenêtre 16:9 de 384×216** et caméra à défilement libre ; les régions font
  512×448, quatre fois l'ancien écran fixe
- **Police bitmap maison** 5×7 avec accents composés — plus de texte flou
- **Générateur réécrit** : passages partagés, réseau de routes par arbre
  couvrant, cours d'eau, fondu des biomes aux frontières, réparation de la
  connexité par parcours en largeur
- **Sols au bruit fractal** ; les motifs centrés dans la cellule dessinaient la
  grille de 16 px, les grains sont désormais tirés d'un bruit par tuile
- **Tuiles conscientes de leurs voisines** : toitures avec faîtage et
  avant-toit, façades avec soubassement, falaises avec lèvre éclairée, tapis
  d'un seul tenant
- **Éclairage dynamique** : courbe ambiante sur la journée, halos des lanternes
  et des foyers, teinte par biome et par météo
- **Météo et atmosphère** : pluie et éclairs, neige, brume de marais, lucioles
- **Combat lisible** : annonce avant chaque attaque, esquive roulée invincible,
  coup tournoyant chargé, contre-coup, chiffres de dégâts, butin ramassable
- **Peuplement automatique** de la vallée selon le biome, le danger et l'heure
- **Interface refaite** : écran-titre, ATH en surimpression, dialogues à
  portraits, menu à quatre onglets, carte de la vallée, minicarte
- **Outillage** : `npm run gallery` (planche de contrôle graphique) et
  `npm run playtest` (partie automatique qui signale tout blocage)

### Bugs trouvés et corrigés au passage

- La caméra se bornait toujours à la taille d'une région : dans une pièce plus
  petite, elle descendait sous le plancher et l'on ne voyait jamais le haut de
  la salle
- Le générateur maintenait sa propre liste de tuiles bloquantes, divergée de
  celle du moteur : il perçait des couloirs au travers des bâtiments
- La balle de Ryn rebondissait à une coordonnée absolue héritée de l'ancien
  écran fixe, donc à l'autre bout de la carte
- Les dégâts de contact permanents doublaient chaque attaque annoncée : 96
  morts en deux minutes de partie automatique, une seule après correction
- La carte de la vallée dépassait de la fenêtre : deux rangées de régions
  n'étaient jamais affichées
- Le signe « × » manquait à la police : chaque quantité du sac s'affichait
  « ?4 »

## Acte II — Les Racines Creuses ✅

Le jeu se terminait sur un choix, jamais sur une réponse : la page 12 de la
Chronique promettait une suite (« la suite appartient à celle qui lira ces
pages ») que rien ne tenait, et le titre du jeu lui-même n'était expliqué
nulle part. Un contenu de post-partie complet répare les deux à la fois.

- Nouveau donjon à salles `racines_creuses`, dix salles pour neuf à
  Vertepierre, bâti sur le même système générique (`Dungeons.ts`/
  `Fortress.ts`) — aucune extension de la grille des 90 zones, aucun risque
  sur les tests de connexité existants
- Trois tuiles neuves (`hollow_floor`, `giant_root`, `glow_spore`) : la seule
  matière du jeu qui n'appartienne à aucun biome de surface, avec ses propres
  piliers et sa propre source de lumière
- Une vraie gardienne de fin, `HollowGuardian` : vingt cœurs, trois phases,
  anneau de racines à esquiver puis fenêtre de faiblesse, spores dès la
  deuxième phase, cage de racines en troisième — sans brasier ni forme
  démoniaque, un combat qui se tient seul
- Une compagne permanente, `Companion` (Liane) : recrutée en deux répliques,
  elle ne s'efface jamais en changeant de région ni de donjon — à la
  différence du Chat-Lanterne — se bat à ses côtés (ronces sur les ennemis et
  sur la Gardienne) et fait tourner son bavardage
- Deux créatures neuves (Vigie des Spores, Sentinelle de Cristal) et
  réemploi de la Horreur des Racines, déclarée depuis longtemps mais jamais
  posée nulle part
- Portail conditionnel à la Cime Errante, gardé par le drapeau `postgame`
  déjà posé (et jusque-là inutilisé) à la fin de l'Acte IV ; nouvelle quête
  `racines_creuses` à déclenchement automatique
- Huitième palier de dialogue post-partie (`hollow`), prioritaire sur les
  deux épilogues Libérer/Enraciner, pour huit habitants
- Correctif profité au passage : mourir dans une forteresse laissait le jeu
  convaincu d'y être encore une fois respawné dehors — `Fortress.leave()`
  manquait au retour au puits. Vertepierre en bénéficie aussi.
- Trente tests neufs : topologie du donjon (salles reliées dans les deux
  sens, atteignables, clés ≥ verrous), phases et fenêtres de la gardienne,
  suivi et bavardage de la compagne

## Vallée — atmosphère de fond ✅

Deux biomes dessinaient un décor sans jamais bouger : ni fumée de cheminée au
village, ni duvet ni pollen aux champs, alors que `forest`, `lake` et `marsh`
en avaient depuis longtemps. `EnvironmentOverlay` leur donne chacun leur
ambiance propre, sans toucher à la génération du terrain.

## État final

Le jeu respecte TypeScript strict, le Canvas 2D pur, l'upscale entier, les
données séparées du moteur et la simulation déterministe à 60 Hz. 295 tests
unitaires, validation des données et du monde généré, et une partie automatique
sans incident sur les 90 régions.
