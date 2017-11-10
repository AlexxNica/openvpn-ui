'use strict';

const certPaths = require('./certPaths');
const fs = require('fs');

/**
 * Write certificate and key into PKI dir for later reference
 * @param {string} pkiPath base path of pki to write files to
 * @param {string} name common name, used to generate file names
 * @param {object} certs object containing certificate data
 */
const writeCerts = module.exports = async (pkiPath, name, certs) => {
  const {privateKeyPath, certPath} = certPaths(pkiPath, name);

  await writeFile(privateKeyPath, certs.privateKey);
  await writeFile(certPath, certs.certificate);

  console.log(`Client certificate for ${name} written to ${certPath}`);
}

const writeFile = (path, content) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, content, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

