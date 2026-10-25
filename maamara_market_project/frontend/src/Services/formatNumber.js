// Short numbers for chart axes: 950 -> "950", 1000 -> "1K", 2500 -> "2.5K",
// 1200000 -> "1.2M". Values under 1,000 are shown as they are.
export const formatAxisNumber = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  const abs = Math.abs(number);
  const trim = (n) => String(Number(n.toFixed(1)));
  if (abs >= 1e9) return `${trim(number / 1e9)}B`;
  if (abs >= 1e6) return `${trim(number / 1e6)}M`;
  if (abs >= 1e3) return `${trim(number / 1e3)}K`;
  return String(Number(number.toFixed(abs < 10 && !Number.isInteger(number) ? 1 : 0)));
};
