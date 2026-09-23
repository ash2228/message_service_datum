const mongoose = require('mongoose');
const config = require('../config');

let connectPromise = null;

function connectMongo() {
  if (!config.mongoUri) {
    return Promise.reject(new Error('MONGO_URI is not configured on this service'));
  }
  if (!connectPromise) {
    connectPromise = mongoose.connect(config.mongoUri);
  }
  return connectPromise;
}

module.exports = { connectMongo };
