'use strict';

const restler = require('restler');

/**
 * Middleware for SSO authentication.
 */
const auth = module.exports = (config) => {
  return (req, res, next) => {
    doAuth(config.api, config.cookie, req.cookies[config.cookie])
      .then((cred) => {
        req.certCommonName = cred.email;
        next();
      })
      .catch(() => {
        res.status(401).send('Invalid SSO credentials.');
      });
  }
}

/**
 * Performs the actual SSO authentication, returns a Promise on the result.
 */
const doAuth = (apiEndpoint, cookieName, cookieValue) => {

  return new Promise((resolve, reject) => {
    if(!cookieValue){
      reject('Invalid SSO cookie.');
      return;
    } 

    const headers = {Cookie: cookieName + '=' + cookieValue};

    const handleResult = (result, response) => {
      if(result instanceof Error || response.statusCode !== 200) {
        reject('Invalid SSO credentials.');
      }
      else {
        resolve(result);
      }
    };
      
    restler
      .get(apiEndpoint, {headers})
      .on('complete', handleResult);
  });
}
