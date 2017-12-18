'use strict';

/**
 * Configuration script. Code in this file is using blocking I/O for simplicities sake - it is 
 * intented to run only once on startup!
 */

const assert = require('assert');
const backoff = require('backoff');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {promisify} = require('util');

const exists = promisify(fs.exists);
const readFile = promisify(fs.readFile);

module.exports = () => {
  // wrap around configuration handler which returns a promise
  const wrapper = (cb) => {
    configure()
      .then(res => cb(null, res))
      .catch(err => cb(err));
  };

  // return promise wrapped around backoff
  return new Promise((resolve, reject) => {
    const bo = backoff.call(wrapper, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });

    bo.setStrategy(new backoff.ExponentialStrategy({initialDelay: 1000}));
    bo.failAfter(20);

    bo.on('backoff', (num, delay, err) => {
      console.warn(`Error encountered during config: ${err.message}`);
      console.warn(`Will retry in ${Math.round(delay/1000)} s`);
    });

    bo.start();
  });
};


const configure = async () => {

  const configPath = path.normalize(__dirname+'/../config.yml');
  assert(await exists(configPath), 'Config file does not exist');

  const config = module.exports = yaml.safeLoad(await readFile(configPath, 'utf8'));
  
  // Load and parse YAML config file
  
  // Additional env vars
  config.port = process.env.PORT || 9000;
  
  // Validate easyrsa generated config file exists
  assert(config.openssl.config, 'OpenSSL config file location missing in config');
  
  // Validate PKI structure
  assert(config.pki.path, 'Path to PKI missing in config');
  
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
  
  assert(await exists(config.openssl.config), 'OpenSSL config file not found at '+config.openssl.config);
  assert(await exists(pki.cakey), 'CA key file not found at '+pki.cakey);
  assert(await exists(config.pki.path), 'Path to PKI does not exist');
  assert(await exists(pki.cacert), 'CA cert file not found at '+pki.cacert);
  assert(await exists(pki.dh), 'DH params file not found at '+pki.dh);
  assert(await exists(pki.index), 'Index file file not found at '+pki.index);
  assert(await exists(pki.serial), 'Serial file not found at '+pki.serial);
  
  // Load cert and key on startup
  const certs = {
    cacert: await readFile(pki.cacert),
    cakey: await readFile(pki.cakey),
    dh: await readFile(pki.dh)
  };
  
  config.certs = certs;
  config.pki = pki;

  return config;
}
