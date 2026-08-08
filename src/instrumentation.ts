export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV === "test") return;

  const { startPriceScheduler } = await import("./lib/services/price-scheduler");
  startPriceScheduler();
}
