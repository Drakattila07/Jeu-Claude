# Les Racines Creuses

Action-RPG 2D en TypeScript strict et Canvas 2D pur. La Vallée de Bruyère
s'assèche ; une jeune cartographe doit restaurer son ancien réseau d'irrigation,
comprendre pourquoi les arbres se sont mis à marcher — puis prendre la mer.

Le jeu s'affiche dans une fenêtre 16:9 de 384×216 pixels, agrandie d'un facteur
entier pour rester nette. La caméra suit le personnage à l'intérieur de régions
bien plus grandes qu'elle : le monde compte 90 régions de 512×448 pixels, soit
trente-deux tuiles sur vingt-huit chacune.

## Jouer

```bash
npm install
npm run dev
```

| Touche | Action |
| --- | --- |
| Flèches / WASD | marcher (huit directions) · barrer |
| Espace | épée — **maintenir** pour charger un coup tournoyant |
| Maj | esquive roulée, invincible pendant le roulé |
| X | parler, fouiller, entrer chez l'habitant, embarquer, accoster, dormir |
| C | utiliser le premier remède du sac · pêcher au quai |
| F | forme demi-démon, une fois le Crâne obtenu |
| Entrée | sac, quêtes, carte et aide |
| M | carte de la vallée |

Une manette est prise en charge : stick ou croix pour marcher, A pour agir,
X pour l'épée, gâchettes pour l'esquive.

## Ce qui vous attend

- **Un monde continu.** Passages alignés d'une région à l'autre, réseau de
  routes tracé par un arbre couvrant, cours d'eau, biomes qui se fondent aux
  frontières. Chaque région est vérifiée : toutes ses sorties communiquent.
- **La mer, et de quoi la traverser.** L'eau profonde ne se franchit plus à
  pied. Sarn, à Port-Marée, radoube une barque contre deux bordés de chêne et un
  filin goudronné ; on embarque et l'on accoste avec la même touche que le
  reste. La haute mer reste fermée tant qu'on n'a pas la Carte des Courants.
- **Une vraie forteresse.** Vertepierre compte neuf salles, trois herses et des
  clés laissées par ses gardes. Le Chevalier veille sur la Carte, au fond.
- **Un dragon.** Dans la Caldeira, tant qu'il vole, l'épée passe sous lui : il
  faut survivre à ses passes et frapper pendant qu'il se pose.
- **Un cycle jour/nuit éclairé.** L'aube rosit, midi blanchit, la nuit bleuit.
  Lanternes, braseros, coulées de lave et votre propre lumière creusent
  l'obscurité. La pluie assombrit, la brume monte du marais, les lucioles
  sortent sous les arbres.
- **Un combat lisible.** Chaque créature annonce son attaque ; l'esquive et le
  contre-coup existent. Frapper pendant l'annonce l'interrompt et fait mal.
  Les ennemis vaincus lâchent rubis et cœurs.
- **Un monde peuplé.** Dix-neuf villageois avec des emplois du temps, une faune
  propre à chaque milieu qui se renouvelle chaque matin, et des régions classées
  de « refuge » à « hostile ».
- **Des portes qui s'ouvrent.** Toutes, pas seulement les quatre lieux du
  récit : chaque maison du monde a son intérieur, meublé selon son métier —
  logis, atelier, auberge, échoppe — et son habitant, qui a un nom et des mots
  à lui. Un lit rend les forces et fait passer la nuit.
- **Des puits qui servent.** Tous, pas seulement celui de la Place : boire,
  graver son passage, ou attendre le matin, midi, le soir ou la nuit. Plusieurs
  secrets n'acceptent qu'une heure précise, et les guetter en tournant en rond
  était une punition. Un puits tari ne désaltère pas, mais laisse passer les
  heures.
- **Des créatures qui n'existent qu'à une heure.** L'Arbre Marcheur ne se
  montre dans la Clairière des Cimes qu'entre 22 h et 6 h. L'abattre fait
  avancer l'histoire — une consigne nocturne doit désigner quelque chose à
  faire, pas seulement un lieu où aller.
- **Un repère sur la carte.** Une étoile marque la région où avancer, une
  flèche indique la direction dans l'ATH. Savoir quoi faire ne suffisait pas :
  il fallait savoir où aller.
- **Du relief.** Les montagnes se lisent en paliers : parois éclairées sur la
  lèvre, noires au pied, percées d'escaliers. Le Grand Escalier grimpe pour de
  bon, paliers et vasques compris.
- **De vrais secrets.** Sept chandelles allumées de nuit, une veine de minerai
  qui n'apparaît que sous la pluie, deux moitiés de comptine entendues
  séparément. Le refus vous dit toujours ce qui manque.

Le puits soigne, sauvegarde et sert de point de renaissance une fois la source
rouverte. À zéro cœur on renaît au dernier puits touché en laissant un quart de
sa bourse, ou l'on recharge la sauvegarde.

## Développement

```bash
npm test              # 140 tests unitaires
npm run validate:data # cohérence des données et du monde généré
npm run build         # vérification de types, bundle, préparation du site
```

Deux outils servent à juger le résultat, pas seulement à le compiler :

```bash
npm run gallery       # une capture par ambiance, dans screenshots/galerie
npm run gallery -- --nuit
npm run playtest 360  # un automate parcourt les régions et signale
                      # tout encastrement ou blocage
```

`npm run verify` enchaîne validation, tests et partie automatique.
