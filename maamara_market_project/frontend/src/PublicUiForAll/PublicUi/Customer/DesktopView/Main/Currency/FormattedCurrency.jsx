import React from "react";
import { useCurrency } from "./CurrencyContext";
import { FALLBACK_RATES } from "./Currency";

const FormattedCurrency = ({ value = 0, className = "" }) => {
  const { currency, rates, loading } = useCurrency();

  if (loading || !rates) {
    return <span className={className}>...</span>;
  }

  const rate = currency === "KES"
    ? 1
    : (rates?.[currency] ?? FALLBACK_RATES[currency]);

  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;

  const converted = safeValue * rate;

  return (
    <span className={className}>
      {new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
      }).format(converted)}
    </span>
  );
};

export default FormattedCurrency;
