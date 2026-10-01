// Incident write-ups loaded by `npm run db:seed`. The database is the source
// of truth once seeded; this file is how new incidents get written and
// reviewed in git before going live (run the seed again to add them, or with
// --sync to overwrite existing ones from here).
//
// startedAt: null → the seed skips the incident (date still unknown).
// Fill it in (ISO 8601 with offset) and run the seed again.

type Text = { title: string; summary: string; body: string };

export type SeedIncident = {
  slug: string;
  severity: "minor" | "major" | "critical";
  status: "investigating" | "monitoring" | "resolved";
  startedAt: string | null;
  resolvedAt: string | null;
  services: string[];
  tags: string[];
  fr: Text;
  en: Text;
};

export const seedIncidents: SeedIncident[] = [
  {
    slug: "2026-09-03-serveur-injoignable",
    severity: "critical",
    status: "investigating",
    // Day known, time of day not: midnight Paris time until it's filled in.
    startedAt: "2026-09-03T00:00:00+02:00",
    // TODO: set resolvedAt and status "resolved" once Hetzner support has answered.
    resolvedAt: null,
    services: ["server", "ssh", "web"],
    tags: ["network"],
    fr: {
      title: "Serveur injoignable depuis l'extérieur",
      summary:
        "SSH et toutes les applications injoignables depuis Internet, alors que la VM restait saine en interne. Hypothèse : blocage réseau côté Hetzner.",
      body: `## Symptômes

- Plus aucun accès au serveur depuis l'extérieur : SSH et l'ensemble des applications web ne répondaient plus.
- Le problème se reproduisait depuis un réseau totalement différent (connexion 4G), ce qui écarte une cause côté poste client ou fournisseur d'accès.

## Diagnostic

Vérifications faites depuis la console Hetzner, un accès hors bande qui ne passe pas par le réseau public du serveur :

| Point vérifié | Constat |
| --- | --- |
| \`sshd\` | actif |
| Ports 22, 80, 443… | en écoute (\`LISTEN\`) |
| \`ufw\` | trafic autorisé depuis Anywhere |
| Firewall Hetzner Cloud | aucun firewall attaché au serveur |
| Disque | 53 % utilisé |
| Mémoire | 2,1 Go disponibles |
| Fail2Ban | 0 IP bannie |

La machine était saine et ses services à l'écoute : le blocage se situait en amont de la VM.

## Hypothèse retenue

Blocage réseau ou null-route appliqué côté Hetzner, probablement à la suite d'un abus détecté. L'hypothèse fait écho à un avertissement de sécurité antérieur, concernant une instance PostgreSQL exposée publiquement.

## Actions

- Ticket ouvert auprès du support Hetzner.
- En attente de leur retour pour confirmer la cause.`,
    },
    en: {
      title: "Server unreachable from the outside",
      summary:
        "SSH and every application unreachable from the Internet, while the VM itself stayed healthy. Working hypothesis: network block on Hetzner's side.",
      body: `## Symptoms

- No access to the server from the outside: SSH and every web application stopped responding.
- The problem reproduced from a completely different network (4G connection), which rules out the client machine or the ISP.

## Diagnosis

Checks run from the Hetzner console, an out-of-band access that doesn't go through the server's public network:

| Check | Finding |
| --- | --- |
| \`sshd\` | running |
| Ports 22, 80, 443… | listening (\`LISTEN\`) |
| \`ufw\` | traffic allowed from Anywhere |
| Hetzner Cloud firewall | none attached to the server |
| Disk | 53% used |
| Memory | 2.1 GB available |
| Fail2Ban | 0 banned IPs |

The machine was healthy and its services were listening: the block was upstream of the VM.

## Working hypothesis

A network block or null-route applied on Hetzner's side, probably after detected abuse. This echoes an earlier security warning about a publicly exposed PostgreSQL instance.

## Actions

- Ticket opened with Hetzner support.
- Waiting for their answer to confirm the cause.`,
    },
  },
  {
    slug: "postgresql-expose",
    severity: "major",
    status: "resolved",
    // TODO: date of Hetzner's warning (it's in their email).
    startedAt: null,
    resolvedAt: null,
    services: ["postgresql"],
    tags: ["security"],
    fr: {
      title: "Instance PostgreSQL exposée publiquement",
      summary:
        "Hetzner a signalé une instance PostgreSQL accessible depuis Internet sans authentification suffisante.",
      body: `## Signalement

Hetzner a signalé qu'une instance PostgreSQL du serveur était accessible publiquement depuis Internet, sans authentification suffisante.

## Risque

Une base exposée de cette façon peut être lue, modifiée ou servir de point d'entrée à n'importe qui sur Internet. C'est aussi le type de situation qui déclenche des mesures de la part de l'hébergeur.

## Résolution

L'exposition a été corrigée et l'incident est clos.

## Suite

Ce signalement est la piste principale derrière l'incident du 3 septembre 2026, où le serveur est devenu injoignable depuis l'extérieur.`,
    },
    en: {
      title: "PostgreSQL instance publicly exposed",
      summary:
        "Hetzner reported a PostgreSQL instance reachable from the Internet without sufficient authentication.",
      body: `## Report

Hetzner reported that a PostgreSQL instance on the server was publicly reachable from the Internet, without sufficient authentication.

## Risk

A database exposed this way can be read, modified or used as an entry point by anyone on the Internet. It's also the kind of situation that makes a hosting provider take action.

## Resolution

The exposure was fixed and the incident is closed.

## Follow-up

This report is the main lead behind the 3 September 2026 incident, when the server became unreachable from the outside.`,
    },
  },
  {
    slug: "perte-acces-ssh",
    severity: "minor",
    status: "resolved",
    // TODO: approximate date.
    startedAt: null,
    resolvedAt: null,
    services: ["ssh"],
    tags: ["security"],
    fr: {
      title: "Perte temporaire de l'accès SSH",
      summary:
        "Clé SSH indisponible depuis un poste secondaire ; accès rétabli via la console VNC de Hetzner.",
      body: `## Contexte

En travaillant depuis un PC secondaire, la clé SSH autorisée sur le serveur n'était pas disponible : impossible de se connecter en SSH.

## Récupération

- Connexion au serveur par la console VNC de Hetzner, qui ne dépend pas de SSH.
- Opération compliquée par un décalage de disposition clavier AZERTY / QWERTY dans la console, qui faussait la saisie des commandes et des mots de passe.
- Accès SSH rétabli ensuite.

## Points retenus

- Garder une procédure d'accès de secours documentée, et la tester avant d'en avoir besoin.
- Anticiper la disposition clavier de la console VNC.`,
    },
    en: {
      title: "Temporary loss of SSH access",
      summary:
        "SSH key unavailable from a secondary computer; access restored through Hetzner's VNC console.",
      body: `## Context

While working from a secondary computer, the SSH key authorised on the server wasn't available: SSH login was impossible.

## Recovery

- Logged in through Hetzner's VNC console, which doesn't depend on SSH.
- Made harder by an AZERTY / QWERTY keyboard layout mismatch in the console, which garbled commands and passwords.
- SSH access restored afterwards.

## Takeaways

- Keep a documented fallback access procedure, and test it before it's needed.
- Plan for the VNC console's keyboard layout.`,
    },
  },
];
