'use strict';

// Dummy middleware, used when no other auth was configured
const passTrough = (req, res, next) => next()

/**
 * Simple factory creating the authorization middleware based on system config.
 */
const MkAuth = module.exports = (config) => {
  if (!config.auth) {
    console.log("No auth configured");
    return passTrough;
  }
  const path = config.auth.module;
  const mod = require('./'+path)(config.auth.options);
  return mod;
}
