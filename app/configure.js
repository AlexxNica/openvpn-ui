'use strict';

const yaml = require('js-yaml');
const fs = require('fs');

// this is synchronous code, intended to run once at startup
const config = yaml.safeLoad(fs.readFileSync(__dirname+'/../config.yml', 'utf8'));

// load cert and key on startup
const cacert = fs.readFileSync(config.pki.cacert);
const cakey = fs.readFileSync(config.pki.cakey);
const dh = fs.readFileSync(config.pki.dh);

config.certs = {cacert, cakey, dh}

// add additional env vars
config.port = process.env.PORT || 9000;

module.exports = config;
