export const maskText = (text) => {
  if (!text) return "";

  const str = String(text);

  if (str.length <= 20) return str;

  return str.slice(0, 20) + "...";
};
