// Customers see "Handmade" for the Inorganic section. The stored name stays
// "inorganic"; vendor and admin screens keep their own labels.
export const sectionLabel = (name) => {
  const value = String(name || "").trim();
  if (value.toLowerCase() === "inorganic") return "Handmade";
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
};

// Handmade first, Organic last, anything else in between.
const rank = (name) => {
  const value = String(name || "").toLowerCase();
  if (value === "inorganic") return 0;
  if (value === "organic") return 2;
  return 1;
};

export const orderSections = (sections = []) =>
  [...sections].sort((a, b) => rank(a?.name) - rank(b?.name));
