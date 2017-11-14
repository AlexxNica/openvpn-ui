'use strict';

const express = require('express');
const assert = require('assert');
const request = require('request');
const error = require('http-errors');
const intersect = require('lodash.intersection');

const GithubLogin = module.exports = (options) => {

  assert(process.env.GITHUB_CLIENT_ID, 'GITHUB_CLIENT_ID must be set');
  assert(process.env.GITHUB_CLIENT_SECRET, 'GITHUB_CLIENT_SECRET must be set');

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const cookieName = 'gh_token';
  const scope = 'read:org,read:user';

  const router = express.Router();
  
  // Middleware to check if a valid github token is present in the request cookies.
  // Redirects to the github authorization url if no valid token is found.
  router.use(async (req, res, next) => {
    try {
      // Pass through if this is the callback url
      if (req.path === options.callback) {
        return next();
      }
      // Have token, validate and attach user info to request. Will throw if user is not authorized
      if (req.cookies[cookieName] !== undefined) {
        req.user = await checkAuthorization(req.cookies[cookieName], options);
        return next();
      }
    } catch(err) {
      // Fail on non-auth errors to prevent redirect loops
      if (err.statusCode !== 401) return next(err);
    }
    
    // No auth or token expired, redirect to Github login
    res.redirect(ghAuthUrl(clientId, scope));
  });

  // Authorization callback, retrieves the Github oauth token and redirects to the index page
  router.get(options.callback, async (req, res, next) => {
    try {
      const code = req.query.code;
      const token = await getAuthToken({code, clientId, clientSecret});
      res.cookie(cookieName, token);
      res.redirect('/');
    } catch (err) {
      next(err);
    }
  });
  
  return router;
}

// Get Github auth token
const getAuthToken = async ({code, clientId, clientSecret}) => {
  const url = 'https://github.com/login/oauth/access_token';
  const body = {
    'client_id': clientId,
    'client_secret': clientSecret,
    'code': code
  };
  const {access_token} = await mkRequest('POST', url, {body});
  return access_token;
}

// Ensure given auth token is a valid github auth token, return user name if that is the case.
// Return null if not.
const checkAuthorization = async (authToken, options) => {
    const {login} = await getProfile(authToken);

    // Check if user is in required org
    if (options.orgId) {
      const orgIds = await getOrgIds(authToken);
      if (orgIds.indexOf(options.orgId) < 0) throw error.Forbidden("Not in a required org");
    }

    // Check if user is in any of the required teams
    if (options.teamIds) {
      const teamIds = await getTeamIds(authToken);
      const i = intersect(teamIds, options.teamIds);
      if (i.length === 0) throw error.Forbidden("Not in a required team");
    }
    
    return {
      authorized: true, 
      name: login
    };
}

// Call github api, return promise on the result
const ghApi = (method, path, {body, authToken, baseUrl}) => {
  assert(authToken, 'authToken must not be emtpy');

  const url = path.match(/^http/) ? path : 'https://api.github.com'+path;
  const headers = {
    'Authorization': `token ${authToken}`,
    'User-Agent': 'openvpn-ui'
  };

  return mkRequest(method, url, {body, headers});
};

// Make request to given url, return promise on body. Promise is rejected when response status is
// anything greater or equal 400 or response body contains an 'error' property.
const mkRequest = (method, url, {body, headers}) => {
  return new Promise((resolve, reject) => {
    request({url, method, body, headers, json: true}, (err, res) => {
      if (err) {
        reject(err);
      }
      else if (res.statusCode >= 400) {
        reject(error(res.statusCode, res.body.error_description || res.body));
      } 
      else if (res.body.error) {
        reject(error.InternalServerError(res.body.error_description));
      }
      else {
        resolve(res.body);
      }
    });
  });
}

// Get current user profile info from github
const getProfile = async (authToken) => {
  return await ghApi('GET', '/user', {authToken});
};

const getTeamIds = async (authToken, orgsUrl) => {
  const teams = await ghApi('GET', '/user/teams', {authToken});
  return teams.map(t => t.id);
};

const getOrgIds = async (authToken) => {
  const orgs = await ghApi('GET', '/user/orgs', {authToken});
  return orgs.map(o => o.id);
}

const ghAuthUrl = (clientId, scope) => {
  return `https://github.com/login/oauth/authorize?scope=${scope}&client_id=${clientId}`;
};
