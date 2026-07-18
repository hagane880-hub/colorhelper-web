import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { extname, join, normalize } from "node:path";
import { readFile } from "node:fs/promises";

const host = "0.0.0.0";
const port = 4174;
const certificatePort = 4175;
const root = process.cwd();
const certificateDirectory = join(root, "certificates");
const keyPath = join(certificateDirectory, "server-key.pem");
const certificatePath = join(certificateDirectory, "server-cert.pem");

if (!existsSync(keyPath) || !existsSync(certificatePath)) {
  console.error("HTTPS証明書がありません。先に `npm run cert -- <MacのIPアドレス>` を実行してください。");
  process.exit(1);
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".pem": "application/x-pem-file",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = createHttpsServer({
  key: await readFile(keyPath),
  cert: await readFile(certificatePath),
}, (request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, `https://${request.headers.host}`).pathname);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = normalize(join(root, relativePath));

  if (
    relativePath.startsWith("certificates/") ||
    !filePath.startsWith(root) ||
    !existsSync(filePath) ||
    !statSync(filePath).isFile()
  ) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`ColorHelper HTTPS server: https://<MacのIPアドレス>:${port}`);
  console.log(`iPhone用認証局証明書: http://<MacのIPアドレス>:${certificatePort}`);
});

createHttpServer((request, response) => {
  if (request.url !== "/" && request.url !== "/color-helper-ca.crt") {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": "application/x-x509-ca-cert",
    "Content-Disposition": 'attachment; filename="color-helper-ca.crt"',
  });
  createReadStream(join(certificateDirectory, "color-helper-ca.pem")).pipe(response);
}).listen(certificatePort, host, () => {
  console.log(`Certificate download server: http://<MacのIPアドレス>:${certificatePort}`);
});
