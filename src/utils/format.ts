export const formatMoney = (value: number): string =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatPrice = (value: number | undefined, digits: number): string =>
  value === undefined ? '--' : value.toFixed(digits);