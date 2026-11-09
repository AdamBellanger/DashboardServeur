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
    // Still open: no answer from Hetzner support yet. Set resolvedAt and status
    // "resolved" once they answer.
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

Blocage réseau ou null-route appliqué côté Hetzner, probablement à la suite d'un abus détecté.

## Actions

- Ticket ouvert auprès du support Hetzner.
- Toujours aucune réponse du support à ce jour : la cause reste à confirmer.`,
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

A network block or null-route applied on Hetzner's side, probably after detected abuse.

## Actions

- Ticket opened with Hetzner support.
- Still no answer from support so far: the cause remains unconfirmed.`,
    },
  },
];
