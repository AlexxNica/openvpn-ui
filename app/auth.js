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
  const type = config.auth.type;
  const mod = require('./auth/'+type)(config.auth.options);
  return mod;
}
