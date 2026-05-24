import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const source = join(root, "src", "assets", "logo.png");
const publicDir = join(root, "public");

const sizes = [
  { name: "favicon-32.png", size: 32 },
  { name: "favicon-192.png", size: 192 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "pwa-512.png", size: 512 },
];

for (const { name, size } of sizes) {
  await sharp(source)
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile(join(publicDir, name));
}

console.log("Favicons generated in public/");
