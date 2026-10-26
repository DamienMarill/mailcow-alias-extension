# Mailcow Alias Manager

Extension Chrome / Firefox pour créer en un clic un alias [Mailcow](https://mailcow.email/) à partir du site courant
(`https://www.amazon.fr` → `amazon@ton-domaine.fr`), puis le copier dans le presse-papier.

- Alias proposé à partir du site ouvert, sélectionné pour être confirmé avec <kbd>Entrée</kbd> ou remplacé.
- Domaine et boîte de destination mémorisés d'une utilisation à l'autre.
- Listes mises en cache : le popup s'affiche tout de suite et se rafraîchit en arrière-plan.
- Erreurs Mailcow lisibles (alias déjà existant, clé API refusée, serveur injoignable…).
- Raccourci clavier <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd> (modifiable dans les réglages de raccourcis du navigateur).
- Thème clair/sombre selon le système.

## Configuration Mailcow

Il faut une **clé API en lecture/écriture** : Mailcow → Système → Configuration → Accès → API.
Cette clé donne un accès administrateur complet au serveur : limite les IP autorisées quand c'est possible.

À l'enregistrement des paramètres, l'extension demande l'accès **au seul serveur Mailcow configuré**
(pas à tous les sites).

## Développement

Prérequis : Node.js 20+.

```bash
npm install
npm run dev:chrome     # build en watch dans dist/chrome
npm run dev:firefox    # build en watch dans dist/firefox
npm run start:firefox  # lance un Firefox de test avec l'extension (à côté de dev:firefox)
npm run check          # vérification des types (svelte-check)
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
