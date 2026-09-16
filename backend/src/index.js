/**
 * Point d'entrée du serveur Medicis Change Control (API REST).
 * Express + CORS + JSON. Démarre la connexion SQL Server paresseusement.
 */

'use strict';

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const morgan = require('morgan');
require('dotenv').config();

const routes = require('./routes');

const app = express();
app.use(morgan('dev'));
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'medicis-gxp-change-control-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
}));

app.get('/api/ping', (_req, res) => {
  res.json({ message: 'pong', date: new Date().toLocaleString('fr-FR') });
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ error: `Route inconnue : ${req.method} ${req.originalUrl}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur',
  });
});

const PORT = parseInt(process.env.PORT || '4000', 10);

app.listen(PORT, () => {
  console.log(`[Medicis-API] http://localhost:${PORT}/api en écoute`);
});