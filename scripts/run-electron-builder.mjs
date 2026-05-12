import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const builderArgs = process.argv.slice(2);
const electronPackage = JSON.parse(
  fs.readFileSync("node_modules/electron/package.json", "utf8"),
);
const electronVersion = electronPackage.version;

const electronRebuild = spawnSync(
  "npx",
  ["electron-rebuild", "-v", electronVersion, "-f", "-w", "better-sqlite3"],
  {
    shell: process.platform === "win32",
    stdio: "inherit",
  },
);

if (electronRebuild.status && electronRebuild.status !== 0) {
  process.exit(electronRebuild.status);
}

if (electronRebuild.error) {
  throw electronRebuild.error;
}

syncStandaloneBetterSqliteBinding();
syncStandaloneAssets();

const builder = spawnSync("npx", ["electron-builder", ...builderArgs], {
  shell: process.platform === "win32",
  stdio: "inherit",
});

const rebuild = spawnSync("npm", ["rebuild", "better-sqlite3"], {
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (builder.status && builder.status !== 0) {
  process.exit(builder.status);
}

if (builder.error) {
  throw builder.error;
}

if (rebuild.status && rebuild.status !== 0) {
  process.exit(rebuild.status);
}

if (rebuild.error) {
  throw rebuild.error;
}

function syncStandaloneBetterSqliteBinding() {
  const source = path.join(
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
  );
  const target = path.join(
    ".next",
    "standalone",
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
  );

  if (!fs.existsSync(source) || !fs.existsSync(target)) {
    return;
  }

  fs.cpSync(source, target, { recursive: true });
}

function syncStandaloneAssets() {
  copyDirectory(
    path.join(".next", "static"),
    path.join(".next", "standalone", ".next", "static"),
  );
  copyDirectory("public", path.join(".next", "standalone", "public"));
}

function copyDirectory(source, target) {
  if (!fs.existsSync(source)) {
    return;
  }

  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}
