/**
 * Loads the system config file from yaml and validates it. This file contains blocking IO ops,
 * since it should only be loaded once during startup.
 */
require('dotenv').load();

const fs = require('fs');
const url = require('url');
const assert = require('assert');

const config = module.exports = require('./config.yml');

// check for required vars
assert(process.env.NODE_ENV, 'NODE_ENV is missing');
assert(process.env.PORT, 'PORT is missing');

// validate sso config
assert(config.sso, 'sso config is missing');
assert(config.sso.api, 'sso api endpoint is missing');
assert(url.parse(config.sso.api), 'sso api endpoint is invalid');

// validate ca config
assert(config.ca, 'ca config is missing');
assert(config.ca.key, 'ca key is missing');
assert(config.ca.cert, 'ca cert is missing');
assert(fs.statsSync(config.ca.key).isFile(), 'ca key file does not exist');
assert(fs.statsSync(config.ca.cert).isFile(), 'ca cert file does not exist');

config.sso.cookie = config.sso.cookie || 'openvpn.pki.gui';

// validate vpn endpoints
assert(config.endpoints, 'endpoints are missing');

config.endpoints.forEach((endpoint) => {
  assert(endpoint.name, 'Missing client name.');
  assert(!isNaN(endpoint.name), 'Invalid or missing client keysize.');
  endpoint.suffix = endpoint.suffix || undefined;
});
