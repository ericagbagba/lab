# 🤖 Bit — Application Progressive (PWA) de Gestion Opérationnelle

Bit est une application web progressive (PWA) conçue pour la gestion opérationnelle d'agences d'accès internet. Elle gère de manière réactive, résiliente et sécurisée (hors connexion incluse) les clients, les fiches techniques, les bases, la topologie réseau, les pannes d'agences et le réapprovisionnement des stocks de matériels.

## 🚀 Fonctionnalités Clés

1. **Architecture Offline-First (Dexie.js + Workbox)** :
   - Fonctionne à 100 % hors connexion.
   - Les opérations d'écriture et de modification hors ligne sont mises en cache dans IndexedDB avec un flag `_pendingSync`.
   - À la reconnexion, la synchronisation est automatique, résolvant les conflits à l'aide de la valeur `updatedAt` (le plus récent gagne).
   - Un indicateur interactif `OfflineIndicator` montre l'état de la synchronisation et le nombre d'éléments en attente.

2. **Formulaire Client en 5 Étapes (Wizard Prioritaire)** :
   - **Étape 1 : Sélection de case** — Une grille interactive basée sur l'objet de codes dynamiques `CODES` (1 à 81) montre en blanc les cases libres et en gris coché (✓) les cases déjà occupées dans la base sélectionnée. IP calculée dynamiquement (`10.50.1.numero`).
   - **Étape 2 : Nom complet** — Affiche les informations automatiques générées et permet de renseigner le nom.
   - **Étape 3 : Téléphone** — Entrée optimisée pour pavé numérique.
   - **Étape 4 : Adresse MAC & Localisation** — Saisie des 4 derniers caractères de l'adresse MAC et code GPS/Plus.
   - **Étape 5 : Récapitulatif** — Vérification visuelle globale avant validation et journalisation dans l'historique.

3. **Matrice de Permissions & Rôles stricte** :
   - Double-vérification : Côté client via des helpers d'UI (`roles.js`) et côté serveur via des règles Firestore de pointe (`firestore.rules`).
   - Rôles : `directeur` | `contrôleur` | `superviseur` | `chef_agence` | `opérateur` | `technicien`.
   - Les utilisateurs sans rôles se voient verrouiller l'écran de manière sécurisée en attente de validation.

4. **Tableau de Bord Statistique Mensuel (Directeur/Contrôleur)** :
   - Comparaison de pannes mensuelles (% de variation).
   - Graphique hebdomadaire de pannes (4 barres) en SVG natif.
   - Graphique linéaire de cumul quotidien des pannes vs mois précédent (SVG interactif).
   - Ancienneté des pannes ouvertes (&gt;24h, &gt;48h, &gt;7j).
   - Temps moyen de résolution (minutes -> heures) et taux de résolution.

5. **Gestion Avancée des Stocks & Approvisionnement** :
   - Flux de réapprovisionnement : Le `chef_agence` soumet une demande, le `contrôleur` l'examine (approuve/refuse). Une approbation crédite automatiquement l'inventaire de l'agence.
   - Consommation instantanée de stock lors de la résolution de panne par les techniciens et membres d'agence.
   - Alerte visuelle intelligente lorsque la quantité descend sous le seuil `minThreshold`.

---

## 📂 Architecture Générée

Le projet respecte exactement la structure suivante :
```
bit-pwa/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── firestore.rules
├── firebase.json
├── .env.example
├── README.md
├── public/
│   ├── manifest.json
│   ├── robots.txt
│   └── icons/
│       ├── icon-192x192.svg
│       └── icon-512x512.svg
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── styles/
    │   └── index.css
    ├── db/
    │   └── index.js
    ├── firebase/
    │   └── config.js
    ├── utils/
    │   ├── constants.js
    │   ├── helpers.js
    │   └── roles.js
    ├── context/
    │   └── AuthContext.jsx
    ├── hooks/
    │   └── useAuth.js
    │   └── useSync.js
    ├── services/
    │   ├── activities.js
    │   ├── dataService.js
    │   └── sync.js
    ├── components/
    │   ├── UI/
    │   │   ├── CaseGrid.jsx
    │   │   ├── FirebaseConfigWarning.jsx
    │   │   ├── Loading.jsx
    │   │   ├── OfflineIndicator.jsx
    │   │   └── Toast.jsx
    │   └── Layout/
    │       ├── Layout.jsx
    │       └── Navbar.jsx
    └── pages/
        ├── DashboardPage.jsx
        ├── ClientsPage.jsx
        ├── FaultFormPage.jsx
        ├── FaultsPage.jsx
        ├── BasesPage.jsx
        ├── TopologiesPage.jsx
        ├── StocksPage.jsx
        ├── AgenciesPage.jsx
        ├── UsersPage.jsx
        ├── ActivitiesPage.jsx
        ├── LoginPage.jsx
        ├── RegisterPage.jsx
        ├── ProfilePage.jsx
        ├── SettingsPage.jsx
        └── NotFoundPage.jsx
```

---

## 🛠️ Installation et Démarrage

### 1. Pré-requis
- Node.js (v18 ou supérieur)
- Un projet Firebase actif (Firestore, Auth)

### 2. Cloner et configurer les clés Firebase
Créez un fichier `.env` à la racine en copiant `.env.example` et renseignez vos clés de projet Firebase :
```env
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre_auth_domain
VITE_FIREBASE_PROJECT_ID=votre_project_id
VITE_FIREBASE_STORAGE_BUCKET=votre_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_messaging_sender_id
VITE_FIREBASE_APP_ID=votre_app_id
```

### 3. Installer les dépendances et démarrer
```bash
# Installer les modules
npm install

# Lancer en local
npm run dev
```
L'application se lance sur `http://localhost:3000`.

### 4. Déploiement et Production
```bash
# Compiler l'application PWA optimisée
npm run build

# Déployer sur Firebase Hosting (si Firebase CLI est installé)
firebase deploy
```

---

## 🛡️ Matrice de Sécurité (Double Validation UI/Firestore)

- **Directeur** : Droits totaux. Seul rôle capable de créer des utilisateurs, d'attribuer des rôles métiers et d'affecter des agences.
- **Contrôleur** : Droits globaux en lecture seule sur les agences, gère en exclusivité le Stock Global Central (MikroTik), examine et valide/refuse les requêtes d'approvisionnement. Ne peut pas résoudre de pannes opérationnelles.
- **Superviseur** : Agit sur ses agences assignées uniquement. Droits en lecture/écriture de niveau agence. Ne gère pas les paramètres d'administration généraux.
- **Chef d'agence** : Gère l'inventaire de son agence, crée les bases rattachées et effectue les demandes d'approvisionnement en cas de manque.
- **Opérateur** : Droits exclusifs d'écriture, modification et suppression sur les fiches clients et les topologies réseau de son agence de rattachement.
- **Technicien** : Enregistre les clients, signale les pannes et consomme le stock d'agence lors d'interventions de maintenance de réseau.

---
*Conçu avec rigueur professionnelle, Bit PWA offre une expérience fluide, réactive et sécurisée, parée pour la production.*
