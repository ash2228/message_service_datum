const config = require('../config');
const MetricAlertState = require('../models/MetricAlertState');

const CRITICAL_SEVERITY = 'critical';

/**
 * Decides whether an alert for `metric` should actually be dispatched, and
 * records the send so later calls can enforce the cooldown.
 *
 * - `critical` alerts always send, regardless of cooldown, and reset the
 *   cooldown clock for that metric.
 * - Any other severity only sends if this metric hasn't already been sent
 *   within the last `cooldownSeconds` (defaults to DEFAULT_COOLDOWN_SECONDS).
 * - Alerts with no `metric` skip cooldown tracking entirely — there's nothing
 *   to key the cooldown on, so they always send.
 */
async function shouldSend(metric, severity, cooldownSeconds = config.defaultCooldownSeconds) {
  if (!metric) return { allowed: true };

  const isCritical = String(severity).toLowerCase() === CRITICAL_SEVERITY;
  const now = new Date();

  const state = await MetricAlertState.findOneAndUpdate(
    { metric },
    { $setOnInsert: { metric } },
    { upsert: true, new: true }
  );

  const cooldownMs = cooldownSeconds * 1000;
  const elapsedMs = state.lastSentAt ? now - state.lastSentAt : null;
  const cooldownExpired = elapsedMs === null || elapsedMs >= cooldownMs;

  if (!isCritical && !cooldownExpired) {
    return { allowed: false, retryAfterMs: cooldownMs - elapsedMs };
  }

  await MetricAlertState.updateOne({ metric }, { $set: { lastSentAt: now } });
  return { allowed: true };
}

module.exports = { shouldSend };
