'use strict';

const auth = require('./app/auth');
const config = require('./configure');
const cookieParser = require('cookie-parser');
const express = require('express');
const fs = require('fs');
const hbs = require('express-handlebars');
const pki = require('./app/pki');

const app = express();

app.listen(config.port, () => {
  console.log('Listening on :' + config.port);
});

// App settings - handlebars templates, static stuff, cookies
app.engine('hbs', hbs({extname: 'hbs', defaultLayout: 'main.hbs'}));
app.set('view engine', 'hbs');
app.use(express.static('public'));
app.use(cookieParser());

/**
 * Authentication middleware. Change your authentication system if needed.
 */
app.use(auth(config.sso));

/*
 * Home page
 */
app.get('/', (req, res) => {
  const endpoints = [];
  for (var endpoint in config.endpoints) {
    endpoints.push({id: endpoint, name: config.endpoints[endpoint].name});
  }
  res.render('index', {endpoints: endpoints});
});

/**
 * Download credentials as zip file
 */
app.get('/download', (req, res) => {
  if(!req.query.e || !config.endpoints[req.query.e]) {
    return res.status(401).send('Invalid endpoint.');
  }
  
  if(!req.query.p) {
    return res.status(401).send('Invalid passphrase.');
  }
  
  const zip = pki.zip(config, req.certCommonName, req.query.p, config.endpoints[req.query.e]);
  const fileName = 'Credentials-' + config.endpoints[req.query.e].suffix + '.zip';

  if(!zip) {
    return res.status(401).send('Generation error.');
  }

  res.contentType('application/zip');
  res.setHeader('content-disposition','attachment; filename='+fileName);

  res.send(zip);
});
