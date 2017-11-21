'use strict';

const assert = require('assert');
const fs = require('fs');
const forge = require('node-forge');
const {promisify} = require('util');
const error = require('http-errors');
const moment = require('moment');
const {sprintf} = require('sprintf-js');

// Promisified versions of fs library functions
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const exists = promisify(fs.exists);
const appendFile = promisify(fs.appendFile);

const asn1date = 'YYMMDDHHmmss[Z]';

/**
 * Generate client certificate and certificate key for given name. Optionally encrypt the key with 
 * a given passphrase.
 * 
 * This function is using a file-based locking mechanism - only one certificate can be generated at
 * any given time. Issued certs are registered in index.txt, aiming to be compatible with EasyRSA's
 * revocation mechanism.
 * 
 * This is assumed to be sufficiently robust for a small-scale deployment, for larger system a 
 * database-backed solution would likely be a better solution.
 */
exports.MkCert = async (config, endpointName, name, passphrase = null) => {

  const endpoint = config.endpoints[endpointName];
  const indexFile = config.pki.index;
  const serialFile = config.pki.serial;

  if (!await isUnique(indexFile, name)) {
    throw error.Conflict("A certificate with this name was already issued");
  }
  
  // decode CA certs
  const caCert = forge.pki.certificateFromPem(config.certs.cacert);
  const caSubject = caCert.subject;
  const caKey = forge.pki.privateKeyFromPem(config.certs.cakey);
  
  // create client keypair and cert
  const keys = forge.pki.rsa.generateKeyPair(endpoint.keysize);
  const cert = forge.pki.createCertificate();

  const mStart = moment.utc();
  const mEnd = moment.utc().add(1, "year");

  cert.publicKey = keys.publicKey;
  cert.validity.notBefore = mStart.toDate();
  cert.validity.notAfter = mEnd.toDate();

  // Copy ca subject into client cert (except CN)
  cert.subject.addField({name: 'commonName', value: name});
  caCert.subject.attributes.forEach(attr => {
    if (attr.name === 'commonName') return;
    else cert.subject.setField(attr);
  });
  cert.setIssuer(caSubject.attributes);

  // Will fail if index is already locked
  await lockIndex(indexFile);

  // Get serial number and sign. If any of this fails, make sure we unlock the index
  try {
    cert.serialNumber = await getNextSerial(serialFile);
    cert.sign(caKey, forge.md.sha256.create());
    
    let privateKey = null;
    if (passphrase == null) {
      privateKey = forge.pki.privateKeyToPem(keys.privateKey);
    } else {
      privateKey = forge.pki.encryptRsaPrivateKey(keys.privateKey, passphrase);
    }

    const certs = {
      privateKey: privateKey,
      publicKey: forge.pki.publicKeyToPem(keys.publicKey),
      certificate: forge.pki.certificateToPem(cert),
      ca: forge.pki.certificateToPem(caCert),
      dh: config.certs.dh.toString('ascii')
    };

    validateCerts(certs);

    // Cert was issued, update the index and unlock index file
    await updateIndex(indexFile, name, cert.serialNumber, mEnd);
    await unlockIndex(indexFile);
  
    return certs;

  } catch(err) {
    // Ensure we unlock the index before we go ...
    await unlockIndex(indexFile);
    throw err;
  }
};

exports.ListCerts = async (config) => {
  const indexFile = config.pki.index;
  return listCerts(indexFile);
}

const validateCerts = (certs) => {
  assert(certs.privateKey, 'Invalid or missing private key');
  assert(certs.publicKey, 'Invalid or missing public key');
  assert(certs.certificate, 'Invalid certificate');
}

const listCerts = async (indexFile) => {
  const data = await readFile(indexFile, {encoding: 'ascii'});
  
  return data.split("\n").slice(0, -1).map(line => {
    const [state, exp, serial, _, subject] = line.replace(/\t+/g, ";").split(";");
    // TODO: properly parse X.500 distinguished name''?
    const name = subject.match(/\/CN=(\w+)/)[1];
    return {
      state,
      subject,
      name,
      expires: moment(exp, asn1date).toJSON(),
      serial: parseInt(serial),
    }
  });
}

// Check if cert for given name has already been issued
const isUnique = async (indexFile, name) => {
  // TODO: use full X.500 DN instead of just the name
  const certs = await listCerts(indexFile);
  return certs.filter(cert => cert.name === name).length === 0;
}

// Return the path to the lock file based on index file path
const lockfile = (indexFile) => {
  return indexFile + '.lock';
}

// Lock index by writing a lock file to disk
const lockIndex = async (indexFile) => {
  const lockStamp = await isLocked(indexFile);
  if (lockStamp !== null) {
    return Promise.reject(
      error.Locked(`Index file was locked ${moment(lockStamp).toJSON()}. Please try again later.`)
    );
  }
  const tstamp = new Date().valueOf().toString();
  return writeFile(lockfile(indexFile), tstamp+"\n");
}

// Unlock index by deleting the lock file
const unlockIndex = (indexFile) => {
  return unlink(lockfile(indexFile));
}

// Check if the index is presently locked
const isLocked = async (indexFile) => {
  const lf = lockfile(indexFile);
  if (await exists(lf)) {
    const data = await readFile(lf);
    return parseInt(data);
  } else {
    return null;
  }
}

// Track issued certificate by appending it to the index.txt file
const updateIndex = async (indexFile, name, serial, expiryDate) => {
  const fmtDate = moment(expiryDate).utc().format(asn1date);
  const fmtSerial = sprintf("%02d", serial);
  const fmtName = "/CN="+name;
  const line = `V\t${fmtDate}\t\t${fmtSerial}\tunknown\t${fmtName}\n`;
  await appendFile(indexFile, line);
}

// Get the next serial number, the generated index is written back to 'serial' file immediately
const getNextSerial = async (serialFile) => {
  const data = await readFile(serialFile);
  const next = parseInt(data)+1;
  await writeFile(serialFile, sprintf("%02d\n", next));
  return next;
}
