'use strict';

const certPaths = require('./certPaths');
const fs = require('fs');

const loadCerts = module.exports = async (config, name) => {
  const {privateKeyPath, certPath} = certPaths(config.pki.path, name);
  const caPath = config.pki.cacert;
  const dhPath = config.pki.dh;

  const privateKey = await loadFile(privateKeyPath);
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
