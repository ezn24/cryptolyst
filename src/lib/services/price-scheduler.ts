import { prisma } from "@/lib/db";
import { updateAssetPrices } from "@/lib/services/price-service";
import {
  MINUTE_MS,
  priceRefreshIntervalMs,
  validPriceRefreshMinutes,
} from "@/lib/services/price-scheduler-config";

const INITIAL_DELAY_MS = 10_000;

type SchedulerState = {
  started: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  nextRunAt: Date | null;
};

const globalForScheduler = globalThis as typeof globalThis & {
  __cryptolystPriceScheduler?: SchedulerState;
};

const scheduler =
  globalForScheduler.__cryptolystPriceScheduler ??
  ({ started: false, timer: null, nextRunAt: null } satisfies SchedulerState);

globalForScheduler.__cryptolystPriceScheduler = scheduler;

function environmentIntervalMinutes() {
  return validPriceRefreshMinutes(process.env.PRICE_REFRESH_INTERVAL_MINUTES) ?? 5;
}

async function configuredIntervalMs() {
  try {
    const settings = await prisma.appSetting.findUnique({
      where: { id: "singleton" },
      select: { priceRefreshInterval: true },
    });
    return priceRefreshIntervalMs(
      settings?.priceRefreshInterval,
      environmentIntervalMinutes(),
    );
  } catch (error) {
    console.error("[price-scheduler] failed to read refresh interval", error);
    return priceRefreshIntervalMs(null, environmentIntervalMinutes());
  }
}

function schedule(delayMs: number) {
  if (scheduler.timer) clearTimeout(scheduler.timer);
  scheduler.nextRunAt = new Date(Date.now() + delayMs);
  scheduler.timer = setTimeout(runScheduledUpdate, delayMs);
}

async function runScheduledUpdate() {
  scheduler.timer = null;
  scheduler.nextRunAt = null;
  try {
    const result = await updateAssetPrices();
    console.info(
      `[price-scheduler] ${result.skipped ? "skipped" : "updated"} ${result.updated} assets`,
    );
  } catch (error) {
    console.error("[price-scheduler] update failed", error);
  } finally {
    schedule(await configuredIntervalMs());
  }
}

export function startPriceScheduler() {
  if (scheduler.started) return;
  scheduler.started = true;
  schedule(INITIAL_DELAY_MS);
  console.info("[price-scheduler] started; first update in 10 seconds");
}

export async function reschedulePriceScheduler() {
  if (!scheduler.started) return;
  const intervalMs = await configuredIntervalMs();
  schedule(intervalMs);
  console.info(`[price-scheduler] rescheduled for ${intervalMs / MINUTE_MS} minutes`);
}
