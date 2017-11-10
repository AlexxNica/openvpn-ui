'use strict';

const fs = require('fs');
const forge = require('node-forge');
const path = require('path');
const genOvpn = require('./genOvpn');

const fieldMap = {
  'C': 'countryName',
  'ST': 'stateOrProvinceName',
  'L': 'localityName',
  'O': 'organizationName',
  'OU': 'organizationalUnitName'
}

const mkcert = module.exports = async (config, endpointName, cName, passphrase = null) => {

  const endpoint = config.endpoints[endpointName];
  
  // decode CA certs
  const caCert = forge.pki.certificateFromPem(config.certs.cacert);
  const caSubject = caCert.subject;
  const caKey = forge.pki.privateKeyFromPem(config.certs.cakey);

  // create client keypair and cert
  const keys = forge.pki.rsa.generateKeyPair(endpoint.keysize);
  const cert = forge.pki.createCertificate();

  cert.serialNumber = await getSerial();

  cert.publicKey = keys.publicKey;
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [];

  // copy CA subject fields into client cert, if any
  Object.keys(fieldMap).forEach(fieldName => {
    const field = caSubject.getField(fieldName);
    if (!field) return;
    const name = fieldMap[fieldName];
    const value = field.value;
    attrs.push({name, value});
  });

  // set CN for client
  attrs.push({
    name: 'commonName',
    value: cName
  });


  cert.setSubject(attrs);
  cert.setIssuer(caSubject.attributes);

  cert.sign(caKey, forge.md.sha256.create());

  const privateKey = passphrase ?
    forge.pki.privateKeyToPem(keys.privateKey) :
    forge.pki.encryptRsaPrivateKey(keys.privateKey, passphrase);

  const certs = {
    privateKey: privateKey,
    publicKey: forge.pki.publicKeyToPem(keys.publicKey),
    certificate: forge.pki.certificateToPem(cert),
    ca: forge.pki.certificateToPem(caCert),
    dh: config.certs.dh.toString('ascii')
  };

  return certs;
};

const getSerial = () => {
  // FIXME: read index.txt from disk
  return Promise.resolve(new Date().getTime());
}
