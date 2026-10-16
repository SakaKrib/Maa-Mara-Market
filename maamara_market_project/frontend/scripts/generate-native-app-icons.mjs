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
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

const knockedOut = await removeConnectedDarkCanvas(decoded);
const normalizedBytes = knockedOut ?? await sharp(sourceBytes).png().toBuffer();
const artworkBytes = await sharp(normalizedBytes)
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

  // Adaptive icon foregrounds must include a visible, contrast-safe base so the
  // launcher cannot render a white-on-white or transparent-on-white icon.
  const brandBackground = { r: 21, g: 34, b: 47, alpha: 255 };
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
      background: brandBackground,
    },
  })
    .composite([{ input: foregroundLogo, left: foregroundOffset, top: foregroundOffset }])
    .png()
    .toBuffer();

  await fs.writeFile(path.join(drawable, "ic_launcher_foreground.png"), foreground);

  // Dedicated Android small-notification icon: transparent canvas, three
  // italic M glyphs drawn as stroked paths (no fill) so the system tint can
  // adapt their color for different themes and backgrounds.
  const notificationIcon = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#00000000"
        android:strokeColor="#FFFFFFFF"
        android:strokeWidth="2.6"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M0,20 C1,12 2,8 2,6 C3.5,10 4.5,14 5,16 L7,6" />
    <path
        android:fillColor="#00000000"
        android:strokeColor="#FFFFFFFF"
        android:strokeWidth="2.6"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M8,20 C9,12 10,8 10,6 C11.5,10 12.5,14 13,16 L15,6" />
    <path
        android:fillColor="#00000000"
        android:strokeColor="#FFFFFFFF"
        android:strokeWidth="2.6"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M16,20 C17,12 18,8 18,6 C19.5,10 20.5,14 21,16 L23,6" />
</vector>
`;
  await fs.writeFile(path.join(drawable, "ic_stat_maamara.xml"), notificationIcon);

  const values = path.join(res, "values");
  await fs.mkdir(values, { recursive: true });
  await fs.writeFile(
    path.join(values, "colors.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#15232F</color>
</resources>
`
  );

  const adaptive = path.join(res, "mipmap-anydpi-v26");
  await fs.mkdir(adaptive, { recursive: true });
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;
  await fs.writeFile(path.join(adaptive, "ic_launcher.xml"), xml);
  await fs.writeFile(path.join(adaptive, "ic_launcher_round.xml"), xml);

  console.log(`Generated Android launcher icons from ${artworkMetadata.width}x${artworkMetadata.height} cleaned logo artwork (source: ${decoded.info.width}x${decoded.info.height}, ${decoded.info.channels} channels).`);
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
