export function dayStart(d: string) {
  return new Date(`${d}T00:00:00.000Z`);
}
export function dayEnd(d: string) {
  return new Date(`${d}T23:59:59.999Z`);
}
export function dateRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: dayStart(from) } : {}),
    ...(to ? { lte: dayEnd(to) } : {}),
  };
}
export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
