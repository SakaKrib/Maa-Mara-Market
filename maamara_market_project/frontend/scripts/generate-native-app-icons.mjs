import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "public", "maamara-app-icon.png");
const platform = process.argv[2];

// The source filename has historically been .png while its bytes are JPEG.
// Always decode by file signature instead of trusting the extension.
const sourceBytes = await fs.readFile(source);
const decoded = await sharp(sourceBytes, { failOn: "error" })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

if (!decoded.info.width || !decoded.info.height) {
  throw new Error(`Unable to read image dimensions from ${source}. Check that the app icon is a valid image.`);
}

// The approved source is a horizontal wordmark exported on a black canvas.
// Remove only dark pixels connected to the outside edge; dark lettering inside
// the enclosed logo plate is preserved. For other artwork with non-dark
// corners, leave the source untouched.
function removeConnectedDarkCanvas({ data, info }) {
  const { width, height, channels } = info;
  const pixelCount = width * height;
  const dark = new Uint8Array(pixelCount);
  const visited = new Uint8Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const isDark = (index) => {
    const offset = index * channels;
    if (data[offset + 3] === 0) return false;
    const luminance = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
    return luminance < 72;
  };

  for (let i = 0; i < pixelCount; i += 1) dark[i] = isDark(i) ? 1 : 0;

  const seed = (index) => {
    if (dark[index] && !visited[index]) {
      visited[index] = 1;
      queue[tail++] = index;
    }
  };

  for (let x = 0; x < width; x += 1) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    seed(y * width);
    seed(y * width + width - 1);
  }

  const edgeCorners = [
    0,
    width - 1,
    (height - 1) * width,
    pixelCount - 1,
  ];
  const darkCornerCount = edgeCorners.filter((index) => dark[index]).length;
  if (darkCornerCount < 3) return null;

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    const neighbours = [];
    if (x > 0) neighbours.push(index - 1);
    if (x + 1 < width) neighbours.push(index + 1);
    if (y > 0) neighbours.push(index - width);
    if (y + 1 < height) neighbours.push(index + width);

    for (const neighbour of neighbours) {
      if (dark[neighbour] && !visited[neighbour]) {
        visited[neighbour] = 1;
        queue[tail++] = neighbour;
      }
    }
  }

  for (let index = 0; index < pixelCount; index += 1) {
    if (!visited[index]) continue;
    data[index * channels + 3] = 0;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

const knockedOut = removeConnectedDarkCanvas(decoded);
const normalizedBytes = knockedOut ?? sharp(sourceBytes).png().toBuffer();
const resolvedNormalizedBytes = await normalizedBytes;
const artworkBytes = await sharp(resolvedNormalizedBytes)
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
  .png()
  .toBuffer();
const artworkMetadata = await sharp(artworkBytes).metadata();

// Keep the logo on a clean white square instead of scaling its original black
// letterbox into the launcher tile. This retains the actual approved wordmark.
async function renderIcon(size, logoScale = 0.92) {
  const logoSize = Math.round(size * logoScale);
  const logo = await sharp(artworkBytes)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{
      input: logo,
      left: Math.round((size - logoSize) / 2),
      top: Math.round((size - logoSize) / 2),
    }])
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
    await fs.writeFile(path.join(dir, "ic_launcher.png"), await renderIcon(size, 0.94));
    await fs.writeFile(path.join(dir, "ic_launcher_round.png"), await renderIcon(size, 0.82));
  }

  const drawable = path.join(res, "drawable");
  await fs.mkdir(drawable, { recursive: true });

  // Adaptive foreground content must stay inside Android's central safe zone.
  const foregroundLogoSize = 640;
  const foregroundLogo = await sharp(artworkBytes)
    .resize(foregroundLogoSize, foregroundLogoSize, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();
  const foregroundOffset = Math.round((1024 - foregroundLogoSize) / 2);
  const foreground = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([{ input: foregroundLogo, left: foregroundOffset, top: foregroundOffset }])
    .png()
    .toBuffer();

  await fs.writeFile(path.join(drawable, "ic_launcher_foreground.png"), foreground);

  // Dedicated Android small-notification icon: transparent canvas, three
  // italic M glyphs, and no enclosing outline or background. Android applies
  // the notification tint when it renders this resource in the system tray.
  const notificationIcon = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M6.4,9.8 L7.8,2.4 L9.5,2.4 L11.4,5.8 L13.5,2.4 L15.2,2.4 L16.6,9.8 L14.4,9.8 L13.7,5.6 L11.5,9.1 L9.5,5.6 L8.6,9.8 Z" />
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M1.2,21.2 L2.7,13.5 L4.2,13.5 L6.3,17.1 L8.5,13.5 L10,13.5 L11.2,21.2 L9.2,21.2 L8.6,17 L6.3,20.4 L4.3,17 L3.4,21.2 Z" />
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M12.8,21.2 L14.3,13.5 L15.8,13.5 L17.9,17.1 L20.1,13.5 L21.6,13.5 L22.8,21.2 L20.8,21.2 L20.2,17 L17.9,20.4 L15.9,17 L15,21.2 Z" />
</vector>
`;
  await fs.writeFile(path.join(drawable, "ic_stat_maamara.xml"), notificationIcon);

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

  console.log(`Generated Android launcher icons from ${artworkMetadata.width}x${artworkMetadata.height} cleaned logo artwork (source: ${decoded.info.width}x${decoded.info.height}, ${decoded.info.format ?? "detected"}).`);
} else if (platform === "ios") {
  const dir = path.join(root, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "AppIcon-1024.png"), await renderIcon(1024, 0.94));
  await fs.writeFile(path.join(dir, "Contents.json"), JSON.stringify({
    images: [{ filename: "AppIcon-1024.png", idiom: "universal", platform: "ios", size: "1024x1024" }],
    info: { author: "xcode", version: 1 }
  }, null, 2) + "\n");
  console.log(`Generated iOS app icon from ${artworkMetadata.width}x${artworkMetadata.height} cleaned logo artwork.`);
} else {
  throw new Error("Usage: node scripts/generate-native-app-icons.mjs <android|ios>");
}
