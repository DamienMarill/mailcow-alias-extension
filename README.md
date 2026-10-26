# Mailcow Alias Manager

Extension Chrome / Firefox pour créer en un clic un alias [Mailcow](https://mailcow.email/) à partir du site courant
(`https://www.amazon.fr` → `amazon@ton-domaine.fr`), puis le copier dans le presse-papier.

- Alias proposé à partir du site ouvert, sélectionné pour être confirmé avec <kbd>Entrée</kbd> ou remplacé.
- Suffixe aléatoire optionnel (`amazon.k3x9q`) pour des alias impossibles à deviner, ou à la demande avec le bouton dé.
- Remplissage des champs « email » / « confirmer l'email » de la page, compatible React, Vue, Angular, Shadow DOM
  et iframes (le formulaire d'inscription passe avant la newsletter du pied de page).
- Domaine et boîte de destination mémorisés d'une utilisation à l'autre.
- Listes mises en cache : le popup s'affiche tout de suite et se rafraîchit en arrière-plan.
- Erreurs Mailcow lisibles (alias déjà existant, clé API refusée, serveur injoignable…).
- Raccourci clavier <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd> (modifiable dans les réglages de raccourcis du navigateur).
- Thème clair/sombre selon le système.

## Configuration Mailcow

Il faut une **clé API en lecture/écriture** : Mailcow → Système → Configuration → Accès → API.
Cette clé donne un accès administrateur complet au serveur : limite les IP autorisées quand c'est possible.

## Permissions

| Permission | Pourquoi |
|---|---|
| accès au serveur Mailcow | demandé à l'enregistrement des paramètres, **pour ce seul serveur** |
| `activeTab` + `scripting` | lire l'URL du site et remplir ses champs email, uniquement quand tu ouvres le popup |
| `clipboardWrite` | copier l'alias même après l'appel à l'API |
| `storage` | paramètres et préférences |

## Développement

Prérequis : Node.js 22.12+.

```bash
npm install
npm run dev:chrome     # build en watch dans dist/chrome
npm run dev:firefox    # build en watch dans dist/firefox
npm run start:firefox  # lance un Firefox de test avec l'extension (à côté de dev:firefox)
npm run check          # vérification des types (svelte-check)
npm test               # tests unitaires (Vitest)
```

Charger l'extension :

- **Chrome** : `chrome://extensions` → Mode développeur → « Charger l'extension non empaquetée » → `dist/chrome`.
- **Firefox** : `about:debugging#/runtime/this-firefox` → « Charger un module temporaire » → `dist/firefox/manifest.json`
  (ou `npm run start:firefox`).

## Build et publication

```bash
npm run build          # dist/chrome et dist/firefox
npm run lint:firefox   # validation AMO (web-ext lint)
npm run zip            # release/mailcow-alias-<version>-{chrome,firefox}.zip
```

La version vient de `package.json`, le manifest est généré par `manifest.config.js` pour chaque navigateur.

- **Chrome Web Store** : envoyer `release/*-chrome.zip`.
- **Firefox (AMO)** : envoyer `release/*-firefox.zip`. Le code étant bundlé, AMO demande aussi les sources
  (une archive du dépôt suffit, avec ces instructions de build). L'ID Gecko (`manifest.config.js`) ne doit plus
  changer une fois l'extension publiée.

### Release automatique

Changer la version sur `main` suffit :

```bash
npm version minor      # met à jour package.json et package-lock.json (sans tag local)
git commit -am "build: v1.3.0" && git push
```

Le workflow `Release` crée alors le tag `v1.3.0` et une release GitHub avec les deux zips.
Il ne fait rien si la release de cette version existe déjà. Le workflow `CI` vérifie chaque PR
(types, tests, build, lint AMO).
