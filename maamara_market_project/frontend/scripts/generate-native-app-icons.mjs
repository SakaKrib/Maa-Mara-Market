import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "public", "maamara-app-icon.png");
const platform = process.argv[2];

// The source file may contain PNG, JPEG, WebP, or SVG data regardless of its
// filename extension. Pass the original bytes to Sharp; do not decode them as
// text or perform SVG-only string replacements on raster images.
const sourceBytes = await fs.readFile(source);
const sourceImage = sharp(sourceBytes, { failOn: "error" });
const metadata = await sourceImage.metadata();

if (!metadata.width || !metadata.height) {
  throw new Error(`Unable to read image dimensions from ${source}. Check that the app icon is a valid image.`);
}

async function renderIcon(size) {
  return sharp(sourceBytes)
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
}

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

    const png = await renderIcon(size);
    const inset = Math.round(size * 0.16);
    const paddedArtwork = await sharp(sourceBytes)
      .resize(size - inset * 2, size - inset * 2, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toBuffer();

    const roundPadded = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: paddedArtwork, left: inset, top: inset }])
      .png()
      .toBuffer();

    await fs.writeFile(path.join(dir, "ic_launcher.png"), png);
    await fs.writeFile(path.join(dir, "ic_launcher_round.png"), roundPadded);
  }

  const drawable = path.join(res, "drawable");
  await fs.mkdir(drawable, { recursive: true });

  // Build a centered adaptive-icon foreground from the image's actual format.
  // No SVG text manipulation is performed, so raster sources remain valid.
  const adaptiveArtwork = await sharp(sourceBytes)
    .resize(700, 700, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  const foreground = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([{ input: adaptiveArtwork, left: 162, top: 162 }])
    .png()
    .toBuffer();

  await fs.writeFile(path.join(drawable, "ic_launcher_foreground.png"), foreground);

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

  console.log(`Generated Android launcher icons from ${metadata.format ?? "detected"} source (${metadata.width}x${metadata.height}) for all densities and adaptive icons.`);
} else if (platform === "ios") {
  const dir = path.join(root, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "AppIcon-1024.png"), await renderIcon(1024));
  await fs.writeFile(path.join(dir, "Contents.json"), JSON.stringify({
    images: [{ filename: "AppIcon-1024.png", idiom: "universal", platform: "ios", size: "1024x1024" }],
    info: { author: "xcode", version: 1 }
  }, null, 2) + "\n");
  console.log(`Generated iOS app icon from ${metadata.format ?? "detected"} source (${metadata.width}x${metadata.height}).`);
} else {
  throw new Error("Usage: node scripts/generate-native-app-icons.mjs <android|ios>");
}
