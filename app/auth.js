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
      .catch((err) => {
        res.status(401).send(err.message);
      });
  }
}

/**
 * Performs the actual SSO authentication, returns a Promise on the result.
 */
const doAuth = (apiEndpoint, cookieName, cookieValue) => {

  return new Promise((resolve, reject) => {
    if(!cookieValue){
      reject(Error('Invalid SSO cookie.'));
      return;
    } 

    const headers = {Cookie: cookieName + '=' + cookieValue};

    const handleResult = (result, response) => {
      if(result instanceof Error) {
        reject(result);
      }
      else if (response.statusCode !== 200) {
        reject('Unexpected status code from upstream: '+response.statusCode);
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
