import { app, BrowserWindow, dialog, shell } from "electron";
import { config as loadEnv } from "dotenv";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const defaultDevServerUrl = "http://localhost:3000";
const productionHostname = "127.0.0.1";

let mainWindow: BrowserWindow | null = null;

async function createWindow(appUrl: string) {
  log(`Creating BrowserWindow for ${appUrl}`);

  const appRoot = getAppRoot();
  const preloadPath = path.join(appRoot, "dist-electron", "preload.cjs");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 700,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    log("BrowserWindow ready to show");
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== new URL(appUrl).origin) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  await mainWindow.loadURL(appUrl);
}

async function startProductionNextServer() {
  log("Starting bundled Next.js server");
  loadRuntimeEnvironment();

  const port = await getAvailablePort();
  const appRoot = getAppRoot();
  const standaloneDir = path.join(appRoot, ".next", "standalone");
  const serverPath = path.join(standaloneDir, "server.js");
  const serverUrl = `http://${productionHostname}:${port}`;

  process.env.APP_TARGET = "electron";
  process.env.NEXT_PUBLIC_APP_TARGET = "electron";
  process.env.ELECTRON = "1";
  process.env.HOSTNAME = productionHostname;
  process.env.PORT = String(port);
  process.env.RELEASE_NOTES_PATH ??= path.join(
    appRoot,
    "public",
    "release-notes.json",
  );
  process.env.SQLITE_PATH ??= path.join(getElectronConfigDir(), "resume-pro.sqlite");

  log(`Loading Next.js standalone server from ${serverPath}`);
  const standaloneRequire = createRequire(serverPath);
  standaloneRequire(serverPath);

  log(`Waiting for Next.js server at ${serverUrl}`);
  await waitForServer(serverUrl);

  log(`Next.js server is ready at ${serverUrl}`);
  return serverUrl;
}

function loadRuntimeEnvironment() {
  const envPath = ensureElectronEnvFile();

  loadEnv({ path: envPath });
}

function getAppRoot() {
  return isElectronDevelopment() ? process.cwd() : app.getAppPath();
}

function isElectronDevelopment() {
  return Boolean(process.env.ELECTRON_RENDERER_URL);
}

function getElectronConfigDir() {
  return path.join(os.homedir(), ".resume-pro");
}

function ensureElectronEnvFile() {
  const configDir = getElectronConfigDir();
  const envPath = path.join(configDir, ".env");

  fs.mkdirSync(configDir, { recursive: true });

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, defaultElectronEnv(configDir), { mode: 0o600 });
  }

  return envPath;
}

function defaultElectronEnv(configDir: string) {
  return `# Resume Pro Electron runtime configuration

# Database
DATABASE_PROVIDER=sqlite
SQLITE_PATH=${path.join(configDir, "resume-pro.sqlite")}

# To use Postgres instead:
# DATABASE_PROVIDER=postgres
# DATABASE_URL=postgres://user:password@localhost:5432/resume_pro

# AI - OpenAI-compatible LangChain configuration
AI_API_URL=https://api.openai.com/v1
AI_API_KEY=
AI_API_MODEL=gpt-4o-mini
AI_SUMMARY_MODEL=
AI_HISTORY_MAX_MESSAGES=50
AI_HISTORY_SUMMARIZE_ABOVE=30
AI_HISTORY_CONTEXT_MESSAGES=20

# Runtime target
APP_TARGET=electron
`;
}

function log(message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;

  console.log(line.trim());

  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.appendFileSync(path.join(app.getPath("userData"), "main.log"), line);
  } catch {
    // Logging must never prevent the app from opening.
  }
}

async function getAvailablePort() {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen(0, productionHostname, () => {
      const address = server.address();
      server.close(() => {
        if (typeof address === "object" && address) {
          resolve(address.port);
          return;
        }

        reject(new Error("Unable to allocate a local port for Next.js."));
      });
    });
  });
}

async function waitForServer(url: string, timeoutMs = 30_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await canReachServer(url)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Next.js server did not become ready at ${url}.`);
}

async function canReachServer(url: string) {
  return new Promise<boolean>((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode !== undefined && response.statusCode < 500);
    });

    request.once("error", () => resolve(false));
    request.setTimeout(1_000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

app.whenReady()
  .then(async () => {
    const appUrl = isElectronDevelopment()
      ? (process.env.ELECTRON_RENDERER_URL ?? defaultDevServerUrl)
      : await startProductionNextServer();

    await createWindow(appUrl);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow(appUrl);
      }
    });
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    log(`Fatal startup error: ${message}`);
    dialog.showErrorBox("Resume Pro failed to start", message);
    app.quit();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
