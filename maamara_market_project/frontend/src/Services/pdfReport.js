// Dependency-free branded PDF reports.
//
// Each page is drawn on a canvas (so the real brand fonts, logo and borders
// render exactly) and embedded in a minimal PDF as a JPEG. The result is a
// normal A4 PDF that opens everywhere, including inside the native apps.

const BRAND = {
  ink: "#0B0B1A",
  green: "#128A12",
  lime: "#8DE02C",
  pink: "#FFBFBF",
  soft: "#FFF4F4",
  line: "#E7E3E3",
  muted: "#5B5B6B",
};
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const LOGO_URL = "/maamara-brand-artwork.svg";
const SCALE = 2.4; // canvas pixels per PDF point (~173 dpi)
const MAX_ROWS_GUARD = 5000;

const loadLogo = () =>
  new Promise((resolve) => {
    const image = new Image();
    const base = typeof window !== "undefined" ? window.location.origin : "";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `${base}${LOGO_URL}`;
  });

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const wrapText = (ctx, text, maxWidth) => {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines = [];
  let current = "";
  const pushLong = (word) => {
    // Break very long tokens (references, emails) so they never overflow a cell.
    let chunk = "";
    for (const ch of word) {
      if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    return chunk;
  };
  words.forEach((word) => {
    const attempt = current ? `${current} ${word}` : word;
    if (ctx.measureText(attempt).width <= maxWidth) {
      current = attempt;
    } else if (!current) {
      current = pushLong(word);
    } else {
      lines.push(current);
      current = ctx.measureText(word).width > maxWidth ? pushLong(word) : word;
    }
  });
  lines.push(current);
  return lines;
};

const looksNumeric = (value) => /^-?[\d,]+(\.\d+)?%?$/.test(String(value ?? "").trim());

const dataUrlToBytes = (dataUrl) => {
  const binary = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

// Assemble a PDF whose pages are full-bleed JPEG images.
const assemblePdf = (pages, widthPt, heightPt, title) => {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let length = 0;
  const push = (data) => {
    const bytes = typeof data === "string" ? encoder.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const startObject = (id) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const pageObjectIds = pages.map((_, i) => 3 + i * 3);
  startObject(1);
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  startObject(2);
  push(`<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] >>\nendobj\n`);

  pages.forEach((page, i) => {
    const pageId = 3 + i * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    startObject(pageId);
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt} ${heightPt}] ` +
      `/Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`
    );
    const content = `q ${widthPt} 0 0 ${heightPt} 0 0 cm /Im0 Do Q`;
    startObject(contentId);
    push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    startObject(imageId);
    push(
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`
    );
    push(page.bytes);
    push("\nendstream\nendobj\n");
  });

  const infoId = 3 + pages.length * 3;
  const safeTitle = String(title || "Report").replace(/[()\\]/g, "").replace(/[^\x20-\x7E]/g, "");
  startObject(infoId);
  push(`<< /Title (${safeTitle}) /Producer (Maa Mara Market) /Creator (Maa Mara Market) >>\nendobj\n`);

  const xrefStart = length;
  const total = infoId + 1;
  let xref = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let id = 1; id < total; id += 1) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size ${total} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  const out = new Uint8Array(length);
  let cursor = 0;
  chunks.forEach((chunk) => {
    out.set(chunk, cursor);
    cursor += chunk.length;
  });
  return out;
};

/**
 * Build a branded PDF report and return it as a data URL.
 *
 * @param {object} options
 * @param {string} options.title        Report title.
 * @param {string} [options.subtitle]   One line under the title.
 * @param {string[]} options.headers    Table column headings.
 * @param {Array<Array>} options.rows   Table rows.
 * @param {Array<[string,string]>} [options.summary]  Up to 4 headline figures.
 * @param {Array<[string,string]>} [options.meta]     Label/value pairs under the title.
 * @param {string} options.producedAt   Human readable generation time.
 * @param {number[]} [options.weights]  Relative column widths.
 */
export const buildPdfReportDataUrl = async ({
  title,
  subtitle = "",
  headers,
  rows,
  summary = [],
  meta = [],
  producedAt,
  weights,
}) => {
  if (rows.length > MAX_ROWS_GUARD) {
    throw new Error("This report is too large for PDF. Please use the CSV download.");
  }
  const logo = await loadLogo();
  const landscape = headers.length > 6;
  const W = landscape ? 842 : 595;
  const H = landscape ? 595 : 842;
  const margin = 34; // inside the page border
  const pad = 22;
  const left = margin + pad;
  const right = W - margin - pad;
  const contentWidth = right - left;

  const colWeights = (weights && weights.length === headers.length ? weights : headers.map(() => 1));
  const weightSum = colWeights.reduce((a, b) => a + b, 0);
  const colWidths = colWeights.map((w) => (w / weightSum) * contentWidth);

  const makePage = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(W * SCALE);
    canvas.height = Math.round(H * SCALE);
    const ctx = canvas.getContext("2d");
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
    return { canvas, ctx };
  };

  const drawFrame = (ctx) => {
    // Faint watermark.
    if (logo) {
      ctx.save();
      ctx.globalAlpha = 0.045;
      const size = Math.min(W, H) * 0.62;
      ctx.drawImage(logo, (W - size) / 2, (H - size) / 2, size, size);
      ctx.restore();
    }
    // Double border: strong outer line, fine inner line.
    ctx.strokeStyle = BRAND.ink;
    ctx.lineWidth = 1.6;
    roundRect(ctx, 16, 16, W - 32, H - 32, 10);
    ctx.stroke();
    ctx.strokeStyle = BRAND.green;
    ctx.lineWidth = 0.7;
    roundRect(ctx, 21, 21, W - 42, H - 42, 7);
    ctx.stroke();
    // Corner accents.
    ctx.fillStyle = BRAND.lime;
    [[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 3.4, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawLetterhead = (ctx) => {
    const top = margin + 14;
    // Logo tile.
    const tile = 58;
    ctx.save();
    roundRect(ctx, left, top, tile, tile, 12);
    ctx.clip();
    if (logo) {
      ctx.drawImage(logo, left, top, tile, tile);
    } else {
      ctx.fillStyle = BRAND.pink;
      ctx.fillRect(left, top, tile, tile);
      ctx.fillStyle = BRAND.ink;
      ctx.font = `800 34px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("M", left + tile / 2, top + tile / 2);
    }
    ctx.restore();

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = BRAND.ink;
    ctx.font = `800 21px ${FONT}`;
    ctx.fillText("MAA MARA MARKET", left + tile + 14, top + 26);
    ctx.fillStyle = BRAND.green;
    ctx.font = `600 9.5px ${FONT}`;
    ctx.fillText("ONLINE MARKETPLACE", left + tile + 14, top + 42);
    ctx.fillStyle = BRAND.muted;
    ctx.font = `400 9px ${FONT}`;
    ctx.fillText("hello@maamaramarket.com  |  Nairobi, Kenya", left + tile + 14, top + 56);

    // Date block on the right.
    ctx.textAlign = "right";
    ctx.fillStyle = BRAND.muted;
    ctx.font = `600 8px ${FONT}`;
    ctx.fillText("DATE PRODUCED", right, top + 18);
    ctx.fillStyle = BRAND.ink;
    ctx.font = `700 10.5px ${FONT}`;
    ctx.fillText(producedAt, right, top + 33);
    ctx.fillStyle = BRAND.muted;
    ctx.font = `400 8px ${FONT}`;
    ctx.fillText("Africa/Nairobi time", right, top + 45);
    ctx.textAlign = "left";

    // Letterhead rule: ink bar with lime/pink accents.
    const ruleY = top + tile + 12;
    ctx.fillStyle = BRAND.ink;
    ctx.fillRect(left, ruleY, contentWidth, 2.4);
    ctx.fillStyle = BRAND.lime;
    ctx.fillRect(left, ruleY, 70, 2.4);
    ctx.fillStyle = BRAND.pink;
    ctx.fillRect(left + 70, ruleY, 34, 2.4);
    return ruleY + 2.4;
  };

  const drawFooter = (ctx, pageNumber, pageCount) => {
    const y = H - margin - 6;
    ctx.strokeStyle = BRAND.line;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(left, y - 12);
    ctx.lineTo(right, y - 12);
    ctx.stroke();
    ctx.fillStyle = BRAND.muted;
    ctx.font = `400 7.5px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText("Confidential - generated by Maa Mara Market. For the named recipient only.", left, y);
    ctx.textAlign = "right";
    ctx.font = `600 8px ${FONT}`;
    ctx.fillText(`Page ${pageNumber} of ${pageCount}`, right, y);
    ctx.textAlign = "left";
  };

  const pageBottom = H - margin - 30;
  const cellPadX = 5;
  const lineHeight = 10.5;
  const rowPadY = 5.5;

  // Measure rows first so pagination (and "Page x of y") is exact.
  const measureCtx = makePage().ctx;
  measureCtx.font = `400 8.5px ${FONT}`;
  const measuredRows = rows.map((row) => {
    const cells = row.map((cell, i) => wrapText(measureCtx, cell, colWidths[i] - cellPadX * 2));
    const lines = Math.max(1, ...cells.map((c) => c.length));
    return { cells, height: lines * lineHeight + rowPadY * 2 };
  });
  measureCtx.font = `700 8.5px ${FONT}`;
  const headerCells = headers.map((h, i) => wrapText(measureCtx, h, colWidths[i] - cellPadX * 2));
  const headerHeight = Math.max(1, ...headerCells.map((c) => c.length)) * lineHeight + rowPadY * 2;

  const pages = [];
  let current = null;
  let y = 0;
  const startPage = (first) => {
    const page = makePage();
    drawFrame(page.ctx);
    y = drawLetterhead(page.ctx) + 18;
    current = page;
    pages.push(page);
    return first;
  };
  const drawHeaderRow = () => {
    const { ctx } = current;
    ctx.fillStyle = BRAND.ink;
    roundRect(ctx, left, y, contentWidth, headerHeight, 5);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 8.5px ${FONT}`;
    let x = left;
    headerCells.forEach((lines, i) => {
      const numeric = rows.length && rows.slice(0, 20).every((r) => looksNumeric(r[i]) || r[i] === "" || r[i] == null);
      lines.forEach((line, li) => {
        ctx.textAlign = numeric ? "right" : "left";
        const tx = numeric ? x + colWidths[i] - cellPadX : x + cellPadX;
        ctx.fillText(line, tx, y + rowPadY + 7.5 + li * lineHeight);
      });
      x += colWidths[i];
    });
    ctx.textAlign = "left";
    y += headerHeight;
  };

  startPage(true);
  const { ctx: first } = current;

  // Title block.
  first.fillStyle = BRAND.ink;
  first.font = `800 20px ${FONT}`;
  first.fillText(title, left, y + 14);
  y += 22;
  if (subtitle) {
    first.fillStyle = BRAND.muted;
    first.font = `400 10px ${FONT}`;
    first.fillText(subtitle, left, y + 8);
    y += 16;
  }
  if (meta.length) {
    y += 4;
    first.font = `600 8.5px ${FONT}`;
    let x = left;
    meta.forEach(([label, value]) => {
      const text = `${label}: ${value}`;
      const width = first.measureText(text).width + 16;
      if (x + width > right) {
        x = left;
        y += 22;
      }
      first.fillStyle = BRAND.soft;
      roundRect(first, x, y, width, 17, 8.5);
      first.fill();
      first.strokeStyle = BRAND.pink;
      first.lineWidth = 0.6;
      first.stroke();
      first.fillStyle = BRAND.ink;
      first.fillText(text, x + 8, y + 11.5);
      x += width + 6;
    });
    y += 26;
  } else {
    y += 8;
  }

  // Summary cards.
  const cards = summary.slice(0, 4);
  if (cards.length) {
    const gap = 8;
    const cardW = (contentWidth - gap * (cards.length - 1)) / cards.length;
    cards.forEach(([label, value], i) => {
      const cx = left + i * (cardW + gap);
      first.fillStyle = i % 2 === 0 ? BRAND.soft : "#F3FAEB";
      roundRect(first, cx, y, cardW, 44, 8);
      first.fill();
      first.fillStyle = i % 2 === 0 ? BRAND.pink : BRAND.lime;
      first.fillRect(cx + 8, y, 22, 2.2);
      first.fillStyle = BRAND.muted;
      first.font = `600 7.5px ${FONT}`;
      first.fillText(String(label).toUpperCase(), cx + 10, y + 16);
      first.fillStyle = BRAND.ink;
      first.font = `800 14px ${FONT}`;
      first.fillText(String(value), cx + 10, y + 34);
    });
    y += 58;
  }

  if (!rows.length) {
    first.fillStyle = BRAND.muted;
    first.font = `italic 400 10px ${FONT}`;
    first.fillText("No records were available for this report.", left, y + 12);
  } else {
    drawHeaderRow();
    measuredRows.forEach((row, index) => {
      if (y + row.height > pageBottom) {
        startPage(false);
        drawHeaderRow();
      }
      const { ctx } = current;
      if (index % 2 === 1) {
        ctx.fillStyle = "#F8F6F6";
        ctx.fillRect(left, y, contentWidth, row.height);
      }
      ctx.strokeStyle = BRAND.line;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(left, y + row.height);
      ctx.lineTo(right, y + row.height);
      ctx.stroke();
      ctx.fillStyle = BRAND.ink;
      ctx.font = `400 8.5px ${FONT}`;
      let x = left;
      row.cells.forEach((lines, i) => {
        const numeric = looksNumeric(rows[index][i]);
        lines.forEach((line, li) => {
          ctx.textAlign = numeric ? "right" : "left";
          const tx = numeric ? x + colWidths[i] - cellPadX : x + cellPadX;
          ctx.fillText(line, tx, y + rowPadY + 7.5 + li * lineHeight);
        });
        x += colWidths[i];
      });
      ctx.textAlign = "left";
      y += row.height;
    });
  }

  const encoded = pages.map(({ canvas, ctx }, i) => {
    drawFooter(ctx, i + 1, pages.length);
    const bytes = dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.92));
    return { bytes, width: canvas.width, height: canvas.height };
  });
  const pdf = assemblePdf(encoded, W, H, title);

  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < pdf.length; i += chunk) {
    binary += String.fromCharCode(...pdf.subarray(i, i + chunk));
  }
  return `data:application/pdf;base64,${btoa(binary)}`;
};
