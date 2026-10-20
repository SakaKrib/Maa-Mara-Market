// Mirrors the backend payout rules so an admin sees payment problems at approval,
// long before a payout is attempted.

const clean = (v) => (v === null || v === undefined ? "" : String(v).trim());
const digits = (v) => clean(v).replace(/\D/g, "");

export const MPESA_TYPE_LABELS = {
  PHONE: "Phone number (send money)",
  TILL: "Buy Goods / Till number",
  LIPA_NA_MPESA: "Paybill number",
};

export const resolveMpesaType = (vd) => {
  const explicit = clean(vd.mpesa_type).toUpperCase();
  if (MPESA_TYPE_LABELS[explicit]) return explicit;
  if (clean(vd.mpesa_till)) return "TILL";
  if (clean(vd.mpesa_paybill)) return "LIPA_NA_MPESA";
  if (clean(vd.mpesa_number)) return "PHONE";
  return "";
};

const validPhone = (v) => /^(?:0|254|\+254)?[17]\d{8}$/.test(clean(v).replace(/[\s-]/g, ""));

export const paymentSummary = (vd = {}) => {
  const method = clean(vd.payment_method);
  const rows = [];
  const problems = [];

  if (method === "MOBILE_MONEY") {
    const type = resolveMpesaType(vd);
    rows.push(["Payment method", "M-Pesa"]);
    rows.push(["M-Pesa type", MPESA_TYPE_LABELS[type] || "Not saved"]);
    if (!type) problems.push("No M-Pesa phone, Till or Paybill number was provided.");
    if (type === "PHONE") {
      rows.push(["Phone number", clean(vd.mpesa_number) || "Not saved"]);
      if (!validPhone(vd.mpesa_number)) problems.push("The M-Pesa phone number is missing or not a valid Kenyan number.");
    }
    if (type === "TILL") {
      rows.push(["Till number", clean(vd.mpesa_till) || "Not saved"]);
      if (!/^\d{5,20}$/.test(digits(vd.mpesa_till))) problems.push("The Till number is missing or invalid.");
    }
    if (type === "LIPA_NA_MPESA") {
      rows.push(["Paybill number", clean(vd.mpesa_paybill) || "Not saved"]);
      rows.push(["Paybill account number", clean(vd.mpesa_paybill_account) || "Not saved"]);
      if (!/^\d{5,20}$/.test(digits(vd.mpesa_paybill))) problems.push("The Paybill number is missing or invalid.");
      if (!clean(vd.mpesa_paybill_account)) problems.push("The Paybill account number is missing; payouts cannot be credited without it.");
    }
  } else if (method === "PAYPAL") {
    rows.push(["Payment method", "PayPal"]);
    rows.push(["PayPal email", clean(vd.paypal_email) || "Not saved"]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(vd.paypal_email))) problems.push("The PayPal email is missing or invalid.");
  } else if (method === "BANK_TRANSFER") {
    rows.push(["Payment method", "Bank transfer"]);
    rows.push(["Bank name", clean(vd.bank_name) || "Not saved"]);
    rows.push(["Account name", clean(vd.bank_account_name) || "Not saved"]);
    rows.push(["Account number", clean(vd.bank_account_number) || "Not saved"]);
    if (clean(vd.bank_account_number).length < 6) problems.push("The bank account number is missing or too short.");
  } else {
    rows.push(["Payment method", method || "Not saved"]);
    problems.push("No valid payment method was chosen.");
  }

  return { rows, problems };
};

// Keys shown in the dedicated Payment/Media sections (kept out of the generic grid).
export const PAYMENT_KEYS = new Set([
  "payment_method", "mpesa_type", "mpesa_number", "mpesa_till", "mpesa_paybill", "mpesa_paybill_account",
  "paypal_email", "bank_account_number", "bank_name", "bank_branch", "bank_account_name", "bank_swift_code",
  "bank_iban", "bank_country", "bank_currency", "intermediary_bank_name", "intermediary_swift_code",
]);
export const MEDIA_KEYS = new Set(["vendor_company_logo", "profile_picture"]);

export const mediaProblems = (vd = {}) => {
  const problems = [];
  if (!clean(vd.vendor_company_logo)) problems.push("No company logo was uploaded.");
  if (!clean(vd.profile_picture)) problems.push("No profile picture was uploaded.");
  const brand = vd.brand;
  if (!brand || !clean(brand.name)) problems.push("No brand name was provided; approval needs one.");
  return problems;
};
