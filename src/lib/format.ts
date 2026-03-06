export function formatNumber(value: number | null, decimals = 1) {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }

  return value.toFixed(decimals);
}

export function formatRecord(wins: number, losses: number) {
  return `${wins}-${losses}`;
}
