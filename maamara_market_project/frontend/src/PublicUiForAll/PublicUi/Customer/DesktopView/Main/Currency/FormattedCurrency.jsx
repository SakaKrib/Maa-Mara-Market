import React from "react";
import { useCurrency } from "./CurrencyContext";

const FormattedCurrency = ({ value = 0, className = "" }) => {
  const { currency, rates, loading } = useCurrency();

  if (loading || !rates) {
    return <span className={className}>...</span>;
  }

  const rate = currency === "KES" ? 1 : (rates?.[currency] ?? 1);

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
