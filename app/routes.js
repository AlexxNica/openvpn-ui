'use strict';

const express = require('express');
const error = require('http-errors');
const mkcert = require('./mkcert');
const writeCerts = require('./writeCerts');
const loadCerts = require('./loadCerts');
const genOvpn = require('./genOvpn');
const config = require('./configure');

const router = module.exports = express.Router();

/**
 * Base route, renders the index page with initial state.
 */
router.get('/', (req, res) => {
  const endpoints = Object.keys(config.endpoints).map(name=> {
    return {name}
  })
  res.render('index', {endpoints});
});

/**
 * Download generated ovpn config for given cn/user. Expects name for the cert and the endpoint
 * the certs are to be used for.
 */
router.get('/configs/:endpoint/:name.ovpn', async (req, res, next) => {
  const name = req.params.name;
  const endpoint = req.params.endpoint;

  if (!config.endpoints[endpoint]) {
    return next(error.NotFound('Invalid endpoint'));
  }

  try {
    const certs = await loadCerts(config, name);
    const ovpn = genOvpn(config.endpoints[endpoint].ovpn, certs);
    res
      .header('Content-disposition', 'attachment; filename="'+ name +'.ovpn"')
      .header('Content-type', 'text/plain')
      .status(200).send(ovpn);
  } catch (error) {
    next(error);
  }
});

/**
 * Generate ovpn config for given cn/user and return the path to download it relative to root url
 */
router.post('/certs', async (req, res, next) => {
  const name = req.body.name;
  const passphrase = req.body.passphrase;
  const endpoint = req.body.endpoint;

  if (!config.endpoints[endpoint]) {
    return next(error.BadRequest("Invalid endpoint selected"));
  }

  try {
    const certs = await mkcert(config, endpoint, name, passphrase);
    await writeCerts(config.pki.path, name, certs);

    res.status(200).json({
      message: 'OK',
      configPath: `/configs/${endpoint}/${name}.ovpn`
    });
  } catch(err) {
    next(err);
  }
});

/**
 * 404 handler. Invoked when none of the above kicks in
 */
router.use((req, res, next) => {
  next(error.NotFound());
});

/**
 * Error handler, send response as json (No error page, sry)
 */
router.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (statusCode >= 500) {
    console.error(err.stack || err);
  }
  res.status(statusCode).json({message});
});
