const fs = require("fs");
const path = require("path");

const root = process.cwd();
const sourceHtml = fs
  .readdirSync(root)
  .find(name => name.endsWith(".html") && name !== "index.html");

if (!sourceHtml) {
  throw new Error("Source HTML file was not found.");
}

const sourceDir = path.join(root, sourceHtml.replace(/\.html$/i, "_files"));
const assetsDir = path.join(root, "assets");

fs.mkdirSync(assetsDir, { recursive: true });

const assetFiles = ["main-BtXuWT8i.js", "main-C-QYtgiP.css", "log.png"];
for (const file of assetFiles) {
  const sourceFile =
    file === "main-BtXuWT8i.js"
      ? path.join(sourceDir, fs.existsSync(path.join(sourceDir, file)) ? file : `${file}.下载`)
      : path.join(sourceDir, file);

  fs.copyFileSync(sourceFile, path.join(assetsDir, file));
}

let html = fs.readFileSync(path.join(root, sourceHtml), "utf8");

html = html
  .replace(/src="\.[^"]*_files\/main-BtXuWT8i\.js(?:\.下载)?"/g, 'src="./assets/main-BtXuWT8i.js"')
  .replace(/href="\.[^"]*_files\/main-C-QYtgiP\.css"/g, 'href="./assets/main-C-QYtgiP.css"')
  .replace(/src="\.[^"]*_files\/log\.png"/g, 'src="./assets/log.png"');

fs.writeFileSync(path.join(root, "index.html"), html, "utf8");

const title = html.match(/<title>([\s\S]*?)<\/title>/);
console.log(`Generated index.html from ${sourceHtml}`);
console.log(`Title: ${title ? title[1] : "(missing)"}`);
