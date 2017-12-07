'use strict';

/**
 * Configuration script. Code in this file is using blocking I/O for simplicities sake - it is 
 * intented to run only once on startup!
 */

const path = require('path');
const assert = require('assert');
const yaml = require('js-yaml');
const fs = require('fs');

const configPath = path.normalize(__dirname+'/../config.yml');

assert(fs.existsSync(configPath), 'Config file does not exist');

// Load and parse YAML config file
const config = module.exports = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'));

// Additional env vars
config.port = process.env.PORT || 9000;

// Validate easyrsa generated config file exists
assert(config.openssl.config, 'OpenSSL config file location missing in config');
assert(fs.existsSync(config.openssl.config),  'OpenSSL config file  not found at '+config.openssl.config);

// Validate PKI structure
assert(config.pki.path, 'Path to PKI missing in config');
assert(fs.existsSync(config.pki.path), 'Path to PKI does not exist');

// PKI config, use overrides or defaults. All path must exist, even index and serial file
// since the PKI should have at least the server cert already in place.
const pki = {
  cakey: config.pki.cakey || path.join(config.pki.path, 'private', 'ca.key'),
  cacert: config.pki.cacert || path.join(config.pki.path, 'ca.crt'),
  dh: config.pki.dh || path.join(config.pki.path, 'dh.pem'),
  index: config.pki.index || path.join(config.pki.path, 'index.txt'),
  serial: config.pki.serial || path.join(config.pki.path, 'serial'),
  path: config.pki.path
};

assert(fs.existsSync(pki.cakey), 'CA key file not found at '+pki.cakey);
assert(fs.existsSync(pki.cacert), 'CA cert file not found at '+pki.cacert);
assert(fs.existsSync(pki.dh), 'DH params file not found at '+pki.dh);
assert(fs.existsSync(pki.index), 'Index file file not found at '+pki.index);
assert(fs.existsSync(pki.serial), 'Serial file not found at '+pki.serial);

// Load cert and key on startup
const certs = {
  cacert: fs.readFileSync(pki.cacert),
  cakey: fs.readFileSync(pki.cakey),
  dh: fs.readFileSync(pki.dh)
};

config.certs = certs;
config.pki = pki;
