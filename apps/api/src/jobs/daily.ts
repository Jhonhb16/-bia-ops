import { store } from "../lib/store.js";

export function runDailyJobs() {
  const alertRun = store.runDailyAlerts();
  return {
    executedAt: new Date().toISOString(),
    ...alertRun
  };
}

export function startDailyJobs(intervalMs: number) {
  const timer = setInterval(() => {
    runDailyJobs();
  }, intervalMs);

  timer.unref();
  return timer;
}
