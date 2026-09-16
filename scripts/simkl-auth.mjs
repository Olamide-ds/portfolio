#!/usr/bin/env node

import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { exec } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
const PORT = 8787;
const DEFAULT_REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const APP_NAME = "ola-studio-portfolio";
const APP_VERSION = "1.0";

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const values = {};
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function upsertEnv(path, updates) {
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const lines = existing ? existing.split("\n") : [];
  const seen = new Set();

  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (!match || !(match[1] in updates)) return line;
    seen.add(match[1]);
    return `${match[1]}=${updates[match[1]]}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) nextLines.push(`${key}=${value}`);
  }

  const body = `${nextLines.filter((line, index, all) => !(line === "" && all[index - 1] === "")).join("\n").trim()}\n`;
  writeFileSync(path, body, "utf8");
}

const fileEnv = loadEnvFile(envPath);
const clientId = process.env.SIMKL_CLIENT_ID || fileEnv.SIMKL_CLIENT_ID;
const clientSecret = process.env.SIMKL_CLIENT_SECRET || fileEnv.SIMKL_CLIENT_SECRET;
const existingToken = process.env.SIMKL_ACCESS_TOKEN || fileEnv.SIMKL_ACCESS_TOKEN;
const redirectUri = process.env.SIMKL_REDIRECT_URI || fileEnv.SIMKL_REDIRECT_URI || DEFAULT_REDIRECT;

if (!clientId || !clientSecret) {
  console.error(`
Missing Simkl credentials.

1. Copy .env.example to .env.local
2. Put SIMKL_CLIENT_ID and SIMKL_CLIENT_SECRET in .env.local
3. In Simkl app settings, add this Redirect URI:
   ${redirectUri}
4. Run: npm run simkl:auth
`);
  process.exit(1);
}

if (existingToken) {
  console.log(`
SIMKL_ACCESS_TOKEN is already set in .env.local.

Add these in Vercel → Project Settings → Environment Variables
(Production, Preview, and Development):

  SIMKL_CLIENT_ID
  SIMKL_CLIENT_SECRET
  SIMKL_ACCESS_TOKEN

Then /api/watching can authenticate server-side.
`);
  process.exit(0);
}

const state = randomBytes(16).toString("hex");
const authorizeUrl =
  "https://simkl.com/oauth/authorize" +
  `?response_type=code` +
  `&client_id=${encodeURIComponent(clientId)}` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&state=${encodeURIComponent(state)}` +
  `&app-name=${encodeURIComponent(APP_NAME)}` +
  `&app-version=${encodeURIComponent(APP_VERSION)}`;

function htmlPage(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; background: #4a342c; color: #fff8ef; padding: 48px 24px; }
    main { max-width: 560px; margin: 0 auto; line-height: 1.5; }
    code { color: #d7ea7a; }
  </style>
</head>
<body><main>${body}</main></body>
</html>`;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (url.pathname !== "/callback") {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(htmlPage("Not found", "<p>Open the authorize URL printed in your terminal.</p>"));
    return;
  }

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  if (error || !code || returnedState !== state) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(htmlPage("Authorization failed", "<p>Simkl did not return a valid code. Close this tab and retry <code>npm run simkl:auth</code>.</p>"));
    server.close();
    process.exit(1);
  }

  try {
    const tokenResponse = await fetch("https://api.simkl.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `${APP_NAME}/${APP_VERSION}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const payload = await tokenResponse.json();
    const accessToken = payload?.access_token;

    if (!tokenResponse.ok || !accessToken) {
      throw new Error("token_exchange_failed");
    }

    upsertEnv(envPath, {
      SIMKL_CLIENT_ID: clientId,
      SIMKL_CLIENT_SECRET: clientSecret,
      SIMKL_ACCESS_TOKEN: accessToken,
      SIMKL_REDIRECT_URI: redirectUri,
    });

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(htmlPage(
      "Simkl connected",
      "<h1>Simkl is authorized.</h1><p>You can close this tab. The access token was saved to <code>.env.local</code> and printed once in the terminal.</p>"
    ));

    console.log(`
Authorization complete.

Access token saved to:
  ${envPath}
  key: SIMKL_ACCESS_TOKEN

Token (paste this into Vercel, then you can ignore it locally):
  ${accessToken}

Vercel → Project Settings → Environment Variables
Add all three for Production, Preview, and Development:

  SIMKL_CLIENT_ID
  SIMKL_CLIENT_SECRET
  SIMKL_ACCESS_TOKEN

Do not put any of these in frontend JavaScript.
`);
  } catch {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(htmlPage("Token exchange failed", "<p>The helper could not exchange the code. Check the Redirect URI in your Simkl app settings and try again.</p>"));
    server.close();
    process.exit(1);
  }

  server.close();
  process.exit(0);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`
Simkl local auth helper is running.

Before you continue, in Simkl app settings add this exact Redirect URI:
  ${redirectUri}

Then visit this URL and approve the app:
  ${authorizeUrl}

After you approve, Simkl redirects to the local helper, which exchanges the code
server-side and writes SIMKL_ACCESS_TOKEN to .env.local.
`);

  const opener =
    process.platform === "darwin"
      ? `open "${authorizeUrl}"`
      : process.platform === "win32"
        ? `start "" "${authorizeUrl}"`
        : `xdg-open "${authorizeUrl}"`;

  exec(opener, () => {});
});
