# status.adambellanger.pro

Status page publique de mon infra auto-hébergée : état des services en direct, métriques du serveur et journal des incidents réellement vécus.

Ce n'est pas un outil de monitoring de plus. Le site est une **couche de présentation** : il lit Uptime Kuma et Prometheus côté serveur, et ajoute un historique d'incidents rédigé à la main, stocké dans PostgreSQL. Même direction artistique que [adambellanger.pro](https://adambellanger.pro) (repo `Portfolio2026`).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion · Lenis · Drizzle ORM + PostgreSQL · Docker

Mêmes versions, mêmes tokens, même nav, mêmes transitions et même i18n FR/EN que le portfolio.

## Fonctionnement

```
Navigateur ──► status (Next.js) ──► Uptime Kuma   /api/status-page/<slug>        cache 30 s
                                ├─► Prometheus    /api/v1/query(_range)          cache 60 s
                                └─► PostgreSQL    incidents + traductions
```

- Le navigateur ne parle **qu'à cette application**. Les rafraîchissements live passent par `/api/status` (30 s) et `/api/metrics` (60 s), qui proxifient les outils avec un cache court.
- Si une source ne répond pas, la page l'indique (« Uptime Kuma ne répond pas… ») au lieu d'afficher un faux statut vert.
- `/api/health` répond tant que Next.js tourne, sans dépendre des outils : c'est la cible du healthcheck Docker.

| Donnée | Source |
| --- | --- |
| État live de chaque service, latence | Uptime Kuma, page de statut publique (aucun token) |
| Bandes de disponibilité 90 j, uptime 30/90 j, latence 24 h | Prometheus, métriques `/metrics` d'Uptime Kuma |
| CPU, mémoire, disque, uptime serveur | Prometheus, Node Exporter |
| Incidents | PostgreSQL (Drizzle) : ouverts/fermés automatiquement par le webhook Uptime Kuma, ou écrits à la main |

## Structure

```
app/[lang]/                 pages (FR à la racine, EN sous /en, réécrit par proxy.ts)
  page.tsx                  dashboard
  incidents/                flux + détail /incidents/[slug]
  a-propos/                 page Infra (/en/about)
app/api/                    status · metrics · health · webhooks/uptime-kuma
components/layout|ui|providers   repris du portfolio (nav, rideau, curseur, Lenis…)
components/status/          Dashboard, bandes de dispo, sparklines
components/incidents/       flux, filtres, rendu Markdown
content/                    site.ts · services.ts (services affichés) · i18n/ui.ts
lib/uptime-kuma.ts          client Uptime Kuma ; lib/kuma-webhook.ts = incidents automatiques
lib/prometheus.ts           client PromQL ; lib/metrics.ts = les requêtes
lib/db/                     schéma Drizzle, requêtes, seed
drizzle/                    migrations SQL générées
```

## Configuration

Copier `.env.example` en `.env` et remplir. Toutes les variables sont détaillées dans ce fichier.

Les services affichés sont définis dans [content/services.ts](content/services.ts). Le champ `monitor` doit correspondre **exactement** au nom du monitor dans Uptime Kuma.

## Développement local

```bash
npm install
cp .env.example .env
npm run dev                 # http://localhost:3000
```

Sans `.env`, le site tourne quand même et affiche chaque source comme indisponible.

Pour travailler avec les vraies données, ouvre un tunnel SSH vers les conteneurs. PostgreSQL ne doit **jamais** être publié sur Internet (voir l'incident correspondant) :

```bash
# IP des conteneurs : docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' postgres
ssh -L 5432:<ip-postgres>:5432 -L 3001:<ip-uptime-kuma>:3001 -L 9090:<ip-prometheus>:9090 user@serveur
```

puis dans `.env` : `localhost:5432`, `http://localhost:3001` et `http://localhost:9090`.

## Base de données

```bash
npm run db:generate         # après une modif de lib/db/schema.ts → nouvelle migration dans drizzle/
npm run db:migrate          # applique les migrations
npm run db:seed             # ajoute les incidents de lib/db/seed-data.ts absents de la base
npm run db:seed -- --sync   # … et écrase ceux qui existent déjà avec le contenu du fichier
npm run db:studio           # interface web Drizzle
```

### Incidents automatiques (webhook Uptime Kuma)

`POST /api/webhooks/uptime-kuma`, protégé par `Authorization: Bearer <UPTIME_KUMA_WEBHOOK_SECRET>` :

| Événement Uptime Kuma | Effet |
| --- | --- |
| Un service de `content/services.ts` passe **DOWN** | incident « *X injoignable* » ouvert (majeur, en cours d'investigation), heure de début = heure de la sonde |
| Le même service repasse **UP** | incident passé en « Résolu », heure de fin et durée calculées |
| DOWN répété alors qu'un incident est déjà ouvert | rien (un seul incident ouvert par monitor, garanti par un index unique partiel) |
| Monitor absent de `services.ts` (Grafana, Portainer…) | ignoré : un monitor interne n'apparaît jamais publiquement |
| Bouton « Test » de la notification | répond `{"action":"test"}`, rien n'est écrit |

Le texte généré reste volontairement générique : le message brut de la sonde n'est jamais publié, car il peut contenir des IP internes. Pour documenter la cause ensuite, édite l'incident dans `npm run db:studio` (tables `incidents` et `incident_translations`). Tu peux aussi le recopier dans `seed-data.ts` avec le même slug, puis lancer le seed avec `--sync`.

### Ajouter ou mettre à jour un incident écrit à la main

1. Rédiger l'incident (FR + EN, corps en Markdown) dans [lib/db/seed-data.ts](lib/db/seed-data.ts).
2. Commit et push, puis `./deploy.sh` sur le serveur.
3. Lancer `docker compose run --rm migrate npm run db:seed`, avec `-- --sync` pour une mise à jour.

Les incidents sans `startedAt` sont ignorés par le seed, tant que leur date n'est pas connue.

## Déploiement

Même modèle que le portfolio : conteneur `status` sur le réseau Docker `services_default`, sans port publié, derrière Nginx Proxy Manager.

```bash
git clone <repo> && cd <repo>
cp .env.example .env && nano .env
./deploy.sh                 # pull → build → migrations → restart → attente du healthcheck
```

Ensuite, chaque mise à jour se fait avec `git pull && ./deploy.sh`. Les migrations tournent dans un conteneur jetable (`migrate`, profil `tools`) basé sur l'étape `build` du Dockerfile. `drizzle-kit` n'est donc pas embarqué dans l'image de prod.

## Mise en place côté serveur (une seule fois)

### 1. Base PostgreSQL dédiée

Utilisateur et base séparés, sans toucher aux autres projets :

```bash
docker exec -it postgres psql -U <admin>
```
```sql
CREATE USER status WITH PASSWORD 'mot-de-passe-long-et-aleatoire';
CREATE DATABASE status OWNER status;
```

Reporter l'URL dans `.env` : `DATABASE_URL=postgres://status:...@postgres:5432/status`

Puis, après le premier `./deploy.sh` (qui applique les migrations) : `docker compose run --rm migrate npm run db:seed`

### 2. Uptime Kuma

- Un monitor par service de `content/services.ts`, avec exactement les mêmes noms : `Portfolio`, `Status`, `Polytrack`, `Mail`.
- Ces monitors placés sur la page de statut publique `infra` (Status Pages). Le slug va dans `UPTIME_KUMA_STATUS_SLUG`.
- Créer une **clé API** (Settings → API Keys) pour que Prometheus puisse lire `/metrics`.
- **Incidents automatiques** : Settings → Notifications → Setup Notification :
  - Type : **Webhook**.
  - URL : `http://status:3000/api/webhooks/uptime-kuma` (réseau Docker interne).
  - Request body : preset `application/json`.
  - Additional Headers : `{"Authorization": "Bearer <UPTIME_KUMA_WEBHOOK_SECRET>"}`.

  Ensuite, active cette notification sur les 4 monitors publics, puis clique sur « Test » : la réponse attendue est `{"action":"test"}`.
- Régler **Retries** à 2 ou 3 sur ces monitors, pour qu'une seule sonde ratée n'ouvre pas d'incident.

### 3. Prometheus

Ajouter Uptime Kuma aux cibles de scrape, avec un nom d'utilisateur vide et la clé API comme mot de passe :

```yaml
scrape_configs:
  - job_name: uptime-kuma
    scrape_interval: 30s
    static_configs:
      - targets: ["uptime-kuma:3001"]
    basic_auth:
      password: "<clé API Uptime Kuma>"
```

Par défaut, Prometheus ne garde que **15 jours** de données. Pour remplir les bandes sur 90 jours, ajouter `--storage.tsdb.retention.time=90d` à sa commande. D'ici là, les jours sans données s'affichent en gris, avec le nombre de jours couverts.

Si Prometheus scrape plusieurs machines, restreindre les séries Node Exporter avec `PROMETHEUS_NODE_SELECTOR`, par exemple `instance="node-exporter:9100"`.

### 4. DNS + Nginx Proxy Manager

- **Namecheap :** enregistrement `A` `status` → IP du serveur, ou `CNAME` `status` → `adambellanger.pro`.
- **NPM → Proxy Host :**
  - Domain : `status.adambellanger.pro`
  - Forward : `http` / `status` / `3000`
  - Block Common Exploits activé
  - Optionnel, onglet Advanced : `location /api/webhooks/ { return 404; }`. Uptime Kuma passe par le réseau Docker et n'a pas besoin de la route publique.
- **Onglet SSL :** nouveau certificat Let's Encrypt, Force SSL, HTTP/2.
