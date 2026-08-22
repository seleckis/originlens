import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, normalize, resolve } from "node:path";
import process from "node:process";
import { URL } from "node:url";

const root = resolve("tests/fixtures/app");
const port = Number(process.env.ORIGINLENS_FIXTURE_PORT ?? 4173);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};
const server = createServer((request, response) => {
  if (request.method === "POST") {
    request.resume();
    response.writeHead(204).end();
    return;
  }
  const pathname = new URL(request.url ?? "/", "http://fixture.local").pathname;
  if (pathname === "/redirect") {
    response.writeHead(302, { Location: "/benign-search.html" }).end();
    return;
  }
  if (pathname === "/payment-redirect") {
    response.writeHead(302, { Location: "/payment-redirect.html" }).end();
    return;
  }
  const file = resolve(
    root,
    `.${normalize(pathname === "/" ? "/index.html" : pathname)}`
  );
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.setHeader(
    "Content-Type",
    contentTypes[extname(file)] ?? "application/octet-stream"
  );
  createReadStream(file).pipe(response);
});
server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`OriginLens fixtures: http://127.0.0.1:${port}/\n`);
});
