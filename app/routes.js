'use strict';

const express = require('express');
const error = require('http-errors');
const {MkCert, ListCerts, LoadCerts} = require('./pki');
const tpl = require('./tpl');

module.exports = (config) => {

  const router = module.exports = express.Router();

  /**
   * Base route, renders the index page with initial state.
   */
  router.get('/', (req, res) => {
    const username = req.user ? req.user.name : "";
    const endpoints = Object.keys(config.endpoints).map(name=> {
      return {name}
    });
    res.render('index', {endpoints, username});
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
      const certs = await LoadCerts(config, name);
      const ovpn = tpl(config.endpoints[endpoint].ovpn, certs);
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
      await MkCert(config, endpoint, name, passphrase);
      res.status(200).json({
        message: 'OK',
        configPath: `/configs/${endpoint}/${name}.ovpn`
      });
    } catch(err) {
      next(err);
    }
  });


  /**
   * Get list of certs issued so far
   */
  router.get('/certs', async (req, res, next) => {
    try {
      const certs = await ListCerts(config);
      res.status(200).json(certs);
    } catch(err) {
      next(err);
    }
  });

  return router;
}
