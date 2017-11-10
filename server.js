'use strict';

const fs= require('fs');
const hbs = require('express-handlebars');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');

// const auth = require('./app/auth');
const config = require('./app/configure');
const routes = require('./app/routes');

process.on('SIGTERM', () => {
  console.log('Bye');
  process.exit();
});

const app = express();

app.disable('x-powered-by'); // shuddup

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(morgan('tiny'));

app.engine('hbs', hbs({extname: 'hbs', defaultLayout: 'main.hbs'}));
app.set('view engine', 'hbs');

app.use(routes);

app.listen(config.port, () => {
  console.log('ready on '+config.port);
});
