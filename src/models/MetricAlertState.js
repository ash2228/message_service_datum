const mongoose = require('mongoose');

const metricAlertStateSchema = new mongoose.Schema(
  {
    metric: { type: String, required: true, unique: true, trim: true },
    lastSentAt: { type: Date },
  },
  { collection: 'metric_alert_state' }
);

module.exports = mongoose.model('MetricAlertState', metricAlertStateSchema);
