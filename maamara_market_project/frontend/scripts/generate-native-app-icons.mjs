import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "public", "maamara-app-icon.svg");
const svg = await fs.readFile(source);
const platform = process.argv[2];

if (platform === "android") {
  const res = path.join(root, "android", "app", "src", "main", "res");
  const densities = [
    ["mdpi", 48],
    ["hdpi", 72],
    ["xhdpi", 96],
    ["xxhdpi", 144],
    ["xxxhdpi", 192],
  ];
  for (const [density, size] of densities) {
    const dir = path.join(res, `mipmap-${density}`);
    await fs.mkdir(dir, { recursive: true });
    const png = await sharp(svg).resize(size, size).png().toBuffer();
    await fs.writeFile(path.join(dir, "ic_launcher.png"), png);
    await fs.writeFile(path.join(dir, "ic_launcher_round.png"), png);
  }
  const drawable = path.join(res, "drawable");
  await fs.mkdir(drawable, { recursive: true });
  await fs.writeFile(
    path.join(drawable, "ic_launcher_foreground.png"),
    await sharp(svg).resize(432, 432).png().toBuffer()
  );
  const adaptive = path.join(res, "mipmap-anydpi-v26");
  await fs.mkdir(adaptive, { recursive: true });
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@android:color/white" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;
  await fs.writeFile(path.join(adaptive, "ic_launcher.xml"), xml);
  await fs.writeFile(path.join(adaptive, "ic_launcher_round.xml"), xml);
  console.log("Generated matching MaaMara Market Android launcher icons (all densities and adaptive icons).");
} else if (platform === "ios") {
  const dir = path.join(root, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "AppIcon-1024.png"), await sharp(svg).resize(1024, 1024).png().toBuffer());
  await fs.writeFile(path.join(dir, "Contents.json"), JSON.stringify({
    images: [{ filename: "AppIcon-1024.png", idiom: "universal", platform: "ios", size: "1024x1024" }],
    info: { author: "xcode", version: 1 }
  }, null, 2) + "\n");
  console.log("Generated matching MaaMara Market iOS app icon.");
} else {
  throw new Error("Usage: node scripts/generate-native-app-icons.mjs <android|ios>");
}
