const express = require('express');
const path = require('path');
const morgan = require('morgan');

const api = require('./routes/api');

const app = express();

app.use('/', (req, res, next) => {
  //we could use 'npm install cors' to get the CORS middleware for more
  //functionality than this if we wanted.
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  next();
});
app.use(morgan('combined'));

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/v1', api);

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = app;