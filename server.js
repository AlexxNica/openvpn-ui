'use strict';

const fs= require('fs');
const hbs = require('express-handlebars');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const config = require('./app/configure');
const routes = require('./app/routes');
const auth = require('./app/auth');

process.on('SIGTERM', () => {
  console.log('Bye');
  process.exit();
});

const app = express();

// psst!
app.disable('x-powered-by'); 

app.engine('hbs', hbs({extname: 'hbs', defaultLayout: 'main.hbs'}));
app.set('view engine', 'hbs');

// vendor middleware
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(morgan('tiny'));


// app specific middleware and routes
app.use(auth(config));
app.use(routes);


// 404 handler. Invoked when none of the above kicks in
app.use((req, res, next) => next(error.NotFound()));

// Error handler, send response as json (No error page, sry)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const accepts = req.accepts(['json', 'html']);

  if (statusCode >= 500) {
    console.error(err.stack || err);
  }

  switch (accepts) {
    case 'html':
      res.status(statusCode).render('error', {statusCode, message});
    case 'json':
    default:
      res.status(statusCode).json({message}); break;
  }
});


// ready, go
app.listen(config.port, () => {
  console.log('ready on '+config.port);
});
