const http = require("http");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const port = Number(process.env.PORT || 8080);
const host = "127.0.0.1";

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml; charset=utf-8"],
]);

function contentType(filePath) {
  if (/\.js(\.|$)/i.test(filePath)) return "application/javascript; charset=utf-8";
  return mimeTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
}

http
  .createServer((req, res) => {
    let pathname = "/";

    try {
      pathname = decodeURIComponent(new URL(req.url, `http://${host}`).pathname);
    } catch {
      send(res, 400, "Bad request");
      return;
    }

    if (pathname === "/") pathname = "/美团外卖 - 订单查询.html";

    const target = path.resolve(root, `.${pathname.replace(/\//g, path.sep)}`);
    if (!target.startsWith(root)) {
      send(res, 403, "Forbidden");
      return;
    }

    fs.stat(target, (error, stat) => {
      if (error || !stat.isFile()) {
        send(res, 404, "Not found");
        return;
      }

      res.writeHead(200, {
        "Content-Type": contentType(target),
        "Cache-Control": "no-store",
      });
      fs.createReadStream(target).pipe(res);
    });
  })
  .listen(port, host, () => {
    console.log(`Serving ${root} at http://${host}:${port}/`);
  });
