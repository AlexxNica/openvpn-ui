'use strict';

const path = require('path');

/**
 * Generates the file names used to store certificate and private key for given client name based
 * on given easyrsa pki base path.
 */
const certPaths = module.exports = (pkiPath, name) => {
  const privateKeyPath = path.join(pkiPath, 'private', name+'.key');
  const certPath = path.join(pkiPath, 'issued', name+'.crt');
  return {privateKeyPath, certPath};
}
