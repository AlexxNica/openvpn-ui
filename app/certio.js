'use strict';

/**
 * Functions to read/write cert files to the PKI dir plus utility functions.
 */

const fs = require('fs');
const path = require('path');


/**
 * Generates the file names used to store certificate and private key for given client name based
 * on given easyrsa pki base path.
 */
const certPaths = module.exports.certPaths = (pkiPath, name) => {
  const keyPath = path.join(pkiPath, 'private', name+'.key');
  const certPath = path.join(pkiPath, 'issued', name+'.crt');
  const reqPath = path.join(pkiPath, 'reqs', name+'.csr');
  return {pkiPath, keyPath, certPath, reqPath};
}


/**
 * Write certificate and key into PKI dir for later reference
 * @param {string} pkiPath base path of pki to write files to
 * @param {string} name common name, used to generate file names
 * @param {object} certs object containing certificate data
 */
module.exports.writeCerts = async (pkiPath, name, certs) => {
  const {keyPath, certPath} = certPaths(pkiPath, name);
  await writeFile(keyPath, certs.privateKey);
  await writeFile(certPath, certs.certificate);
  console.log(`Client certificate for ${name} written to ${certPath}`);
}


module.exports.loadCerts = async (config, name) => {
  const {keyPath, certPath} = certPaths(config.pki.path, name);
  const caPath = config.pki.cacert;
  const dhPath = config.pki.dh;

  const privateKey = await loadFile(keyPath);
  const certificate = await loadFile(certPath);
  const dh = await loadFile(dhPath);
  const ca = await loadFile(caPath);

  return {privateKey, certificate, dh, ca};
}


const loadFile = (path, content) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, {encoding: 'ascii'}, (err, content) => {
      if (err) reject(err);
      else resolve(content);
    });
  });
}

const writeFile = (path, content) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, content, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
