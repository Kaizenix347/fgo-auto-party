import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve("src");
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
};
const port = Number(process.env.PORT) || 4173;

createServer(async (request, response) => {
  const path = resolve(
    root,
    `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`,
  );
  if (path !== root && !path.startsWith(root + sep)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const file = path === root ? resolve(root, "index.html") : path;
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": `${types[extname(file)] || "application/octet-stream"}; charset=utf-8`,
    });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, () =>
  console.log(`Chaldea Party Lab: http://localhost:${port}`),
);
