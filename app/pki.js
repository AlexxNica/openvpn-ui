'use strict';

var forge = require('node-forge');
var fs = require('fs');
var log = require('./log');
var zip = require('jszip');
var uniqid = require('uniqid');

function generateCertificate(config, commonName, passphrase, client)
{
  // https://github.com/digitalbazaar/forge/issues/152
  // https://github.com/digitalbazaar/forge/issues/265
  
  // CA info
  var caCert = forge.pki.certificateFromPem(config.ca.cert);
  var caKey = forge.pki.privateKeyFromPem(config.ca.key);
  var caSubject = caCert.subject;
    
  // Client info
  var keys = forge.pki.rsa.generateKeyPair(client.keysize);
  var cert =forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = uniqid();
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  var attrs = [
    {
      name: 'commonName',
      value: commonName
    },
    {
      name: 'countryName',
      value: caSubject.getField('C').value
    },
    {
      name: 'stateOrProvinceName',
      value: caSubject.getField('ST').value
    },
    {
      name: 'localityName',
      value: caSubject.getField('L').value
    },
    {
      name: 'organizationName',
      value: caSubject.getField('O').value
    }
  ];

  if(caSubject.getField('OU')) {
    attrs.push({
      name: 'organizationalUnitName',
      value: caSubject.getField('OU').value
    });
  }

  cert.setSubject(attrs);
  cert.setIssuer(caSubject.attributes);

  cert.sign(caKey, forge.md.sha256.create());

  var certs = {
    privateKey: forge.pki.encryptRsaPrivateKey(keys.privateKey, passphrase),
    publicKey: forge.pki.publicKeyToPem(keys.publicKey),
    certificate: forge.pki.certificateToPem(cert),
    ca: forge.pki.certificateToPem(caCert)
  };

  // Log
  log.info('Signed new certicate for ' + commonName + ', serial ' + cert.serialNumber);

  var basePath = path.resolve(__dirname + '/../certs') + , ;
  var fileName = commonName + '-' + cert.serialNumber + '.crt';
  var filePath = path.join(basePath, fileName);

  // Save the cert, for revokation
  fs.writeFile(filePath, certs.certificate, (err) => {
    if(err) {
      log.error('Failed to save certificate to ' + filePath);
    }
  });

  return certs;
};

exports.zip = function(config, commonName, passphrase, client) {

  var files = generateCertificate(config, commonName, passphrase, client);

  if(!files || !files.privateKey) {
    return false;
  }

  // OVPN content
  var ovpn = client.ovpn;
  var prefix = commonName + '-' + client.suffix;
  var caName = prefix + '-ca.crt';
  var certName = prefix + '.crt';
  var pubName = prefix + '.pub';
  var keyName = prefix + '.key';
  var ovpnName = prefix + '.ovpn';

  ovpn = ovpn.replace('{{ca}}', caName);
  ovpn = ovpn.replace('{{cert}}', certName);
  ovpn = ovpn.replace('{{key}}', keyName);

  // zip
  var archive = new zip();
  var folder = archive.folder(client.suffix);

  folder.file(keyName, files.privateKey);
  folder.file(certName, files.certificate);
  folder.file(pubName, files.publicKey);
  folder.file(caName, files.ca);
  folder.file(ovpnName, ovpn);

  return archive.generate({type: 'nodebuffer'});
};
