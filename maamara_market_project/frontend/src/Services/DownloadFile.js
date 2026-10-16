import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const isNative = () => Capacitor.isNativePlatform();

const toBase64 = (value) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
};

const parseDataUrl = (dataUrl) => {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("The file could not be prepared for download.");
  const mimeType = match[1] || "application/octet-stream";
  const data = match[2] ? match[3] : toBase64(decodeURIComponent(match[3]));
  return { mimeType, data };
};

/**
 * On the web, trigger a normal browser download. In native Capacitor apps,
 * write the file to the app cache and open the system share/save sheet so
 * iOS users can choose Save to Files and Android users can save/share it.
 */
export const downloadFile = async ({ filename, content, mimeType = "text/plain;charset=utf-8" }) => {
  if (!isNative()) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
    return;
  }

  const base64 = typeof content === "string" ? toBase64(content) : toBase64(String(content));
  await shareNativeFile(filename, base64);
};

export const downloadDataUrl = async (filename, dataUrl) => {
  if (!isNative()) {
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
    }
    return;
  }
  const { data } = parseDataUrl(dataUrl);
  await shareNativeFile(filename, data);
};

const shareNativeFile = async (filename, data) => {
  const file = await Filesystem.writeFile({
    path: filename,
    data,
    directory: Directory.Cache,
    recursive: true,
  });
  await Share.share({
    title: filename,
    text: "Maa Mara Market export",
    url: file.uri,
    dialogTitle: "Save or share your download",
  });
};
