import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Maa Mara Market native icons, drawn from vector shapes so the build does not
// depend on a raster source, installed fonts or the network.
//
//   node scripts/generate-native-app-icons.mjs android
//   node scripts/generate-native-app-icons.mjs ios
//
// Design ("V2 pink M"): flat brand pink (#FFBFBF, the "Mara" highlight in
// maamara.css), the logo's #8DE02C accent bar, a bold ink "M", and the
// "MAA MARA MARKET" caption in Market green.
const root = process.cwd();
const platform = process.argv[2];

const PINK = "#FFBFBF";
const BAR_GREEN = "#8DE02C";
const INK = "#0B0B1A";
const MARKET_GREEN = "#128A12";

// "MAA MARA MARKET" in Poppins Bold, converted to outlines (1024 canvas).
const CAPTION_PATH = "M183.3 804.6V858H170.3V826L158.4 858H147.9L135.9 825.9V858H122.9V804.6H138.2L153.2 841.6L168 804.6ZM227.8 848.6H207.9L204.7 858H191.1L210.4 804.6H225.5L244.8 858H231ZM224.5 838.5 217.9 819 211.4 838.5ZM285.9 848.6H265.9L262.8 858H249.1L268.5 804.6H283.5L302.8 858H289ZM282.5 838.5 275.9 819 269.4 838.5ZM389.2 804.6V858H376.2V826L364.3 858H353.8L341.8 825.9V858H328.8V804.6H344.1L359.1 841.6L373.9 804.6ZM433.7 848.6H413.8L410.6 858H397L416.3 804.6H431.4L450.7 858H436.9ZM430.4 838.5 423.8 819 417.3 838.5ZM485.8 858 474.7 837.9H471.5V858H458.5V804.6H480.4Q486.7 804.6 491.1 806.9Q495.6 809.1 497.8 812.9Q500 816.7 500 821.4Q500 826.8 497 830.9Q494 835.1 488.1 836.9L500.4 858ZM471.5 828.7H479.6Q483.2 828.7 485 826.9Q486.7 825.2 486.7 822Q486.7 818.9 485 817.2Q483.2 815.4 479.6 815.4H471.5ZM543.3 848.6H523.4L520.2 858H506.6L525.9 804.6H541L560.3 858H546.5ZM540 838.5 533.4 819 526.8 838.5ZM646.6 804.6V858H633.6V826L621.7 858H611.2L599.2 825.9V858H586.2V804.6H601.6L616.5 841.6L631.4 804.6ZM691.2 848.6H671.3L668.1 858H654.5L673.8 804.6H688.8L708.2 858H694.4ZM687.9 838.5 681.2 819 674.7 838.5ZM743.2 858 732.1 837.9H729V858H716V804.6H737.8Q744.1 804.6 748.6 806.9Q753 809.1 755.2 812.9Q757.4 816.7 757.4 821.4Q757.4 826.8 754.4 830.9Q751.4 835.1 745.6 836.9L757.9 858ZM729 828.7H737.1Q740.6 828.7 742.4 826.9Q744.2 825.2 744.2 822Q744.2 818.9 742.4 817.2Q740.6 815.4 737.1 815.4H729ZM798.5 858 780.6 834.4V858H767.6V804.6H780.6V828.1L798.3 804.6H813.6L792.9 830.8L814.4 858ZM835.5 815.1V825.9H852.9V835.9H835.5V847.6H855.2V858H822.5V804.6H855.2V815.1ZM904 804.6V815.1H889.9V858H876.9V815.1H862.8V804.6Z";

const ACCENT_BAR = `<rect x="196" y="236" width="40" height="440" rx="20" fill="${BAR_GREEN}"/>`;
const LETTER_M = `<path fill="${INK}" d="M292 676V236H378L512 456L646 236H732V676H646V398L512 618L378 398V676Z"/>`;

// Full-bleed square artwork (iOS and the legacy square Android launcher icon).
const fullIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="${PINK}"/>
  ${ACCENT_BAR}
  ${LETTER_M}
  <path fill="${MARKET_GREEN}" d="${CAPTION_PATH}"/>
</svg>`;

// Mark only (no caption), scaled into the launcher safe zone and centred on
// 512,512. Content bounds are x 196..732, y 236..676 (centre 464,456).
const markGroup = (scale) =>
  `<g transform="translate(512 512) scale(${scale}) translate(-464 -456)">${ACCENT_BAR}${LETTER_M}</g>`;

const markIconSvg = (scale, withBackground) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  ${withBackground ? `<rect width="1024" height="1024" fill="${PINK}"/>` : ""}
  ${markGroup(scale)}
</svg>`;

const render = (svg, size) =>
  sharp(Buffer.from(svg), { density: 72 })
    .resize(size, size)
    .png();

async function circleMasked(svg, size) {
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
  );
  return render(svg, size)
    .composite([{ input: mask, blend: "dest-in" }])
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
    await fs.writeFile(path.join(dir, "ic_launcher.png"), await render(fullIconSvg, size).toBuffer());
    await fs.writeFile(path.join(dir, "ic_launcher_round.png"), await circleMasked(markIconSvg(0.8, true), size));
  }

  const drawable = path.join(res, "drawable");
  await fs.mkdir(drawable, { recursive: true });

  // Adaptive icon foreground: transparent canvas with the mark inside the safe
  // zone (the launcher masks the outer ~1/3). The pink background colour below
  // supplies the tile, so the icon cannot render transparent or white-on-white.
  await fs.writeFile(
    path.join(drawable, "maamara_launcher_foreground.png"),
    await render(markIconSvg(0.8, false), 1024).toBuffer()
  );

  // Small status-bar notification icon: exactly three solid M glyphs on a
  // transparent canvas. Android applies the system notification tint to the
  // alpha mask, so no brand-colour background or outline belongs in this asset.
  const notificationIcon = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="96"
    android:viewportHeight="96">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M7,70 V26 H13 L19,41 L25,26 H31 V70 H25 V43 L19,57 L13,43 V70 Z" />
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M36,70 V26 H42 L48,41 L54,26 H60 V70 H54 V43 L48,57 L42,43 V70 Z" />
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M65,70 V26 H71 L77,41 L83,26 H89 V70 H83 V43 L77,57 L71,43 V70 Z" />
</vector>
`;
  await fs.writeFile(path.join(drawable, "ic_stat_maamara.xml"), notificationIcon);

  const values = path.join(res, "values");
  await fs.mkdir(values, { recursive: true });

  // Avoid creating duplicate color resources. If any existing values file
  // already defines ic_launcher_background, skip writing a new one.
  const colorName = "ic_launcher_background";
  let found = false;
  try {
    const files = await fs.readdir(values);
    for (const f of files) {
      const p = path.join(values, f);
      try {
        const txt = await fs.readFile(p, "utf8");
        if (txt.includes(`name="${colorName}"`) || txt.includes(`<color name="${colorName}">`)) {
          found = true;
          break;
        }
      } catch (_) {
        // ignore unreadable files
      }
    }
  } catch (_) {
    // ignore
  }

  if (!found) {
    await fs.writeFile(
      path.join(values, "maamara_colors.xml"),
      `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="${colorName}">${PINK}</color>\n</resources>\n`
    );
  } else {
    console.log(`Skipping writing ${colorName}; already defined in values/`);
  }

  const adaptive = path.join(res, "mipmap-anydpi-v26");
  await fs.mkdir(adaptive, { recursive: true });
  const xml = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background" />\n    <foreground android:drawable="@drawable/maamara_launcher_foreground" />\n</adaptive-icon>\n`;
  await fs.writeFile(path.join(adaptive, "ic_launcher.xml"), xml);
  await fs.writeFile(path.join(adaptive, "ic_launcher_round.xml"), xml);

  console.log("Generated Android launcher icons, adaptive icon and notification icon (V2 pink M).");
} else if (platform === "ios") {
  const dir = path.join(root, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset");
  await fs.mkdir(dir, { recursive: true });
  // iOS rejects app icons with an alpha channel, so flatten to opaque pink.
  await fs.writeFile(
    path.join(dir, "AppIcon-1024.png"),
    await render(fullIconSvg, 1024).flatten({ background: PINK }).removeAlpha().toBuffer()
  );
  await fs.writeFile(path.join(dir, "Contents.json"), JSON.stringify({
    images: [{ filename: "AppIcon-1024.png", idiom: "universal", platform: "ios", size: "1024x1024" }],
    info: { author: "xcode", version: 1 }
  }, null, 2) + "\n");
  console.log("Generated iOS app icon (V2 pink M).");
} else {
  throw new Error("Usage: node scripts/generate-native-app-icons.mjs <android|ios>");
}
