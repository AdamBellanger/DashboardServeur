// One command for a local preview with real incidents:
//
//   npm run dev:local          start the local database, migrate, seed, next dev
//   npm run dev:local -- stop  stop the containers (data kept)
//   npm run dev:local -- reset delete them and their data (next start re-creates them)
//
// Needs Docker (Docker Desktop on Windows/macOS). Works the same on every OS.
// Containers: docker-compose.dev.yml (PostgreSQL, Prometheus, Node Exporter).
// DATABASE_URL always points at the local database, even if .env holds
// another one. PROMETHEUS_URL from .env wins (e.g. an SSH tunnel to the
// server); without it, the local Prometheus is used. The rest of .env applies.

import { spawn, spawnSync } from "node:child_process";

const COMPOSE = ["compose", "-f", "docker-compose.dev.yml"];
const DATABASE_URL = "postgres://status:status@localhost:5433/status";
const LOCAL_PROMETHEUS_URL = "http://localhost:9091";
const isWindows = process.platform === "win32";

function step(label) {
  console.log(`\n\x1b[1m▸ ${label}\x1b[0m`);
}

function fail(message) {
  console.error(`\n\x1b[31m✗ ${message}\x1b[0m\n`);
  process.exit(1);
}

/** Runs a command to completion, output shown; exits on failure. */
function run(cmd, args, env = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: isWindows, // npx/npm are .cmd files on Windows
    env: { ...process.env, ...env },
  });
  if (result.error || result.status !== 0) {
    fail(`Échec de : ${cmd} ${args.join(" ")}`);
  }
}

function dockerAvailable() {
  const result = spawnSync("docker", ["info"], { stdio: "ignore", shell: isWindows });
  return !result.error && result.status === 0;
}

const command = process.argv[2] ?? "start";

if (!dockerAvailable()) {
  fail("Docker ne répond pas. Installe Docker Desktop et lance-le, puis relance la commande.");
}

if (command === "stop") {
  step("Arrêt des conteneurs locaux (les données sont conservées)");
  run("docker", [...COMPOSE, "stop"]);
  process.exit(0);
}

if (command === "reset") {
  step("Suppression des conteneurs et des données locales");
  run("docker", [...COMPOSE, "down", "--volumes"]);
  process.exit(0);
}

if (command !== "start") {
  fail(`Commande inconnue : ${command} (start, stop ou reset)`);
}

try {
  process.loadEnvFile();
} catch {}
const env = { DATABASE_URL, PROMETHEUS_URL: process.env.PROMETHEUS_URL || LOCAL_PROMETHEUS_URL };

step("1/4 Conteneurs locaux : PostgreSQL (5433), Prometheus (9091), Node Exporter");
run("docker", [...COMPOSE, "up", "-d", "--wait"]);

step("2/4 Migrations");
run("npx", ["drizzle-kit", "migrate"], env);

step("3/4 Incidents de lib/db/seed-data.ts");
run("node", ["--env-file-if-exists=.env", "--import", "tsx", "lib/db/seed.ts", "--sync"], env);

step("4/4 Site sur http://localhost:3000 (Ctrl+C pour arrêter)");
console.log(`Métriques : ${env.PROMETHEUS_URL}`);
// Ctrl+C reaches next dev too: let it shut down, then print the hint below.
process.on("SIGINT", () => {});
const dev = spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  shell: isWindows,
  env: { ...process.env, ...env },
});
dev.on("exit", (code) => {
  console.log("\nSite arrêté. Les conteneurs tournent encore : `npm run dev:local -- stop` pour les arrêter.");
  process.exit(code ?? 0);
});
