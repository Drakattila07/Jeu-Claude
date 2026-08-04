# Les Racines Creuses

Action-RPG 2D en TypeScript strict et Canvas 2D pur. La Vallée de Bruyère
s'assèche ; une jeune cartographe doit restaurer son ancien réseau d'irrigation
et comprendre pourquoi les arbres se sont mis à marcher.

Le jeu s'affiche dans une fenêtre 16:9 de 384×216 pixels, agrandie d'un facteur
entier pour rester nette. La caméra suit le personnage à l'intérieur de régions
bien plus grandes qu'elle : la vallée compte 56 régions de 512×448 pixels, soit
trente-deux tuiles sur vingt-huit chacune.

## Jouer

```bash
npm install
npm run dev
```

| Touche | Action |
| --- | --- |
| Flèches / WASD | marcher (huit directions) |
| Espace | épée — **maintenir** pour charger un coup tournoyant |
| Maj | esquive roulée, invincible pendant le roulé |
| X | parler, fouiller, ouvrir, entrer |
| C | utiliser le premier remède du sac · pêcher au quai |
| F | forme demi-démon, une fois le Crâne obtenu |
| Entrée | sac, quêtes, carte et aide |
| M | carte de la vallée |

Une manette est prise en charge : stick ou croix pour marcher, A pour agir,
X pour l'épée, gâchettes pour l'esquive.

## Ce qui vous attend

- **Une vallée continue.** Passages alignés d'une région à l'autre, réseau de
  routes tracé par un arbre couvrant, cours d'eau, biomes qui se fondent aux
  frontières. Chaque région est vérifiée : toutes ses sorties communiquent.
- **Un cycle jour/nuit éclairé.** L'aube rosit, midi blanchit, la nuit bleuit.
  Lanternes, braseros, feux de cheminée et votre propre lumière creusent
  l'obscurité. La pluie assombrit, la brume monte du marais, les lucioles
  sortent sous les arbres.
- **Un combat lisible.** Chaque créature annonce son attaque ; l'esquive et le
  contre-coup existent. Frapper pendant l'annonce l'interrompt et fait mal.
  Les ennemis vaincus lâchent rubis et cœurs.
- **Une vallée peuplée.** Quinze villageois avec des emplois du temps, une
  faune propre à chaque milieu qui se renouvelle chaque matin, et des régions
  classées de « refuge » à « hostile ».
- **De vrais secrets.** Sept chandelles allumées de nuit, une veine de minerai
  qui n'apparaît que sous la pluie, deux moitiés de comptine entendues
  séparément. Le refus vous dit toujours ce qui manque.

Le puits soigne, sauvegarde et sert de point de renaissance une fois la source
rouverte. À zéro cœur on renaît au dernier puits touché en laissant un quart de
sa bourse, ou l'on recharge la sauvegarde.

## Développement

```bash
npm test              # 126 tests unitaires
npm run validate:data # cohérence des données et du monde généré
npm run build         # vérification de types, bundle, préparation du site
```

Deux outils servent à juger le résultat, pas seulement à le compiler :

```bash
npm run gallery       # une capture par ambiance, dans screenshots/galerie
npm run gallery -- --nuit
npm run playtest 360  # un automate parcourt les 56 régions et signale
                      # tout encastrement ou blocage
```

`npm run verify` enchaîne validation, tests et partie automatique.
