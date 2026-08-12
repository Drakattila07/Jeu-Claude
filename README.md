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
| C | utiliser le premier remède du sac · pêcher au bord de l'eau |
| E ou Q | lever le bouclier — **au dernier moment**, il pare |
| F | forme demi-démon, une fois le Crâne obtenu |
| Entrée | sac, carnet, quêtes, carte et aide |
| M | carte de la vallée |

Deux objets s'utilisent depuis le sac sans s'y consumer : la flûte de saule
ouvre son répertoire, le nécessaire à feu monte un bivouac. L'onglet **carnet**
tient le relevé — régions, gens, bêtes, secrets — et votre titre.

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
- **Un arbre qui brûle.** L'Arbre-Mère est du bois sec : le feu de la forme
  demi-démon la ronge sur la durée, écorce ouverte ou non, et chaque coup porté
  sur un tronc en flammes mord d'un point de plus. C'est la réponse au combat —
  à l'épée seule il faut trois fois plus de temps.
- **Un cycle jour/nuit éclairé.** L'aube rosit, midi blanchit, la nuit bleuit.
  Lanternes, braseros, coulées de lave et votre propre lumière creusent
  l'obscurité. La pluie assombrit, la brume monte du marais, les lucioles
  sortent sous les arbres.
- **Un combat lisible.** Chaque créature annonce son attaque ; l'esquive et le
  contre-coup existent. Frapper pendant l'annonce l'interrompt et fait mal.
  Les ennemis vaincus lâchent rubis et cœurs.
- **Un monde peuplé.** Vingt-sept villageois avec des emplois du temps, une faune
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
- **Un carnet qui se remplit tout seul.** Vous êtes cartographe : chaque région
  traversée, chaque tête rencontrée, chaque bête abattue et chaque secret percé
  s'y inscrit, daté. Le bestiaire donne une faiblesse par créature. C'est le
  carnet — et non le récit — qui décerne vos titres, d'Apprentie à Mémoire de
  la Vallée.
- **La marée.** Deux basses mers par jour, décalées d'une heure chaque
  matin : impossible d'apprendre un horaire, il faut regarder. Le reflux
  découvre l'estran, dégage des passages et ouvre une grotte que la pleine mer
  referme. Un rôdeur y fouille le sable tant que la mer le laisse.
- **Le vent.** Au portant la barque file, au près elle peine. Le rhumb tourne
  toutes les trois heures et s'affiche à la barre : le cap cesse d'être une
  formalité.
- **Une flûte de saule.** Wren la baladine fait la tournée des villages et
  enseigne trois airs, un par visite : appeler la pluie, faire basculer le
  jour, appeler le Chat-Lanterne.
- **Le bivouac.** Un nécessaire à feu, et l'on campe où l'on veut. Le feu tient
  six heures, cuit ce qu'on lui donne, laisse passer les heures et tient les
  créatures à distance dans son cercle de lumière.
- **Une vraie forge.** Bram trempe la lame en trois paliers contre du minerai
  de lune et des rubis. Les dégâts par coup montent de un à quatre — et cette
  fois le compte est honoré.
- **On rêve en dormant.** Chaque lit rend un rêve accordé à l'avancement, qui
  dit l'objectif par une image plutôt que par une consigne.
- **Une poste aux pigeons.** Confiez un objet à Colombin ; la réponse arrive le
  lendemain, d'un habitant à qui il manquait précisément cela.
- **Trois lieux sous condition.** La Bibliothèque Noyée ne s'ouvre qu'avec des
  bottes de plomb, le Verger de Nuit ne donne qu'après vingt heures, la Grotte
  de l'Estran n'a d'entrée qu'à mer basse. Chacun se récolte une fois par jour.
- **Cinq visages de plus.** Wren la baladine, Fennec le passeur (deux rubis la
  traversée, tant que vous n'avez pas de coque), Sœur Aubel qui soigne contre
  trois fleurs-œil, Odile la rivale qui mesure son carnet au vôtre, et
  Colombin.
- **Quatre bêtes de plus.** Le Héron d'Encre, qu'on ne gagne rien à tuer et
  tout à approcher ; le Golem de tourbe ; la Méduse de lune ; le Rôdeur de
  l'estran.
- **Un bouclier, et une parade qui compte.** Lever la garde ralentit et coûte
  de l'endurance. La lever au dernier moment sonne l'adversaire et ouvre une
  riposte. Un coup dans le dos passe quand même.
- **Trois techniques d'épée.** Kerdec le Manchot les enseigne dans l'ordre, sur
  la Terrasse du Vent. L'Estoc suit une roulade, la Fauche vient au troisième
  coup d'un enchaînement, la Riposte suit une parade parfaite. Aucune ne
  s'active au bouton : chacune récompense un placement.
- **Un familier qui se bat.** Un poisson fumé, et le Chat-Lanterne quitte son
  perchoir, vous suit, et lâche une flammèche sur ce qui approche.
- **Quatre saisons et cinq ciels.** Le cycle fait huit jours. Il neige l'hiver,
  il orage l'été, la brume monte à l'automne. La foudre frappe à découvert — un
  feu de camp abrite —, le froid ronge l'élan, la brume avale la vue.
- **Quatre fêtes.** La Foire aux Graines, la Fête des Lanternes, la Veillée des
  Moissons, la Nuit Longue. Chacune tombe un jour précis, dans un lieu précis,
  et laisse quelque chose. Le jour affiché veut enfin dire quelque chose.
- **Un potager.** Six planches aux Champs Ouest. On sème, on arrose, on récolte
  — et la pluie fait le travail à votre place. Hors saison, la récolte est
  maigre mais elle vient.
- **Le réseau des puits.** Chaque margelle touchée devient une destination :
  c'est le seul raccourci du jeu, et il se gagne région par région.
- **Un mulet.** Grognon attend à la Grange. Nettement plus vite sur les
  chemins, inutile sur l'eau.
- **Une herboriste et des prix qui bougent.** Mira vend enfin ce qu'elle
  cultive. Un port paie cher ce qui pousse ; un hameau brade. Acheter loin et
  revendre près devient un métier.
- **Une besace doublée et un manteau teint.** Sarn coud un double fond, les
  piles montent d'une moitié. Garance, guède ou safran : la teinte se voit.
- **La Chronique de la Vallée.** Douze feuillets dispersés, reliés au pupitre
  de la Bibliothèque Noyée, un par visite. Ils disent pourquoi le canal a été
  bâti et ce que les arbres ont à voir là-dedans. Quatre cairns aux quatre
  points cardinaux la referment — le dernier n'accepte que la Chronique
  complète.
- **Des poissons qui ne se ressemblent pas.** Dix espèces, chacune liée au
  lieu, à l'heure, à la saison, au ciel ou à la marée. On pêche partout où l'on
  borde de l'eau, et chaque première prise entre au bestiaire. Le Roi du Lac ne
  mord qu'en été, sous l'orage.

Le puits soigne, sauvegarde et sert de point de renaissance une fois la source
rouverte. À zéro cœur on renaît au dernier puits touché en laissant un quart de
sa bourse, ou l'on recharge la sauvegarde.

## Acte II — Les Racines Creuses

Une fois l'Arbre-Mère libérée ou enracinée, une fissure s'ouvre à la Cime
Errante, sur le lieu même du combat. En dessous : dix salles, deux clés, et
enfin la réponse à la seule question que le jeu n'avait jamais posée — ce que
« racines creuses » veut dire.

- **Une prisonnière.** Liane, une graine de l'Arbre-Mère oubliée sous la Cime
  depuis plus longtemps qu'elle ne saurait dire. Deux répliques suffisent à la
  décider ; une fois recrutée, elle ne s'efface plus jamais en changeant de
  région — contrairement au Chat-Lanterne, elle est une compagne, pas un
  familier qu'on rappelle. Elle lance des ronces sur ce qui s'approche, boss
  compris, et tourne son bavardage à chaque fois qu'on lui reparle.
- **Une vraie gardienne.** La Gardienne des Racines ne cède rien au hasard :
  un anneau de racines force à se replacer avant qu'elle ne s'ouvre, elle
  lance des spores dès la deuxième phase, et referme une cage de trois
  éruptions sous vos pieds dans la troisième. Vingt cœurs, aucun brasier,
  aucune forme démoniaque requise — elle se bat seule, à l'ancienne.
- **Deux créatures de plus.** La Vigie des Spores tire à distance ; la
  Sentinelle de Cristal encaisse et charge. La Horreur des Racines, dormante
  dans les données depuis longtemps, y trouve enfin sa place.
- **Une matière neuve.** Sol de racine tassée, piliers vivants, champignons
  bioluminescents qui tiennent lieu de torches — la seule matière du jeu qui
  n'appartienne à aucun biome de surface.
- **Un dernier mot pour la vallée.** Une fois la Gardienne tue, huit
  habitants ont quelque chose à en dire — un ultime palier de dialogue, au-
  dessus des deux épilogues déjà existants.

## Développement

```bash
npm test              # 295 tests unitaires
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
