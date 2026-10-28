/**
 * api/[...all].js – Catch-all Vercel Serverless Function for /api/* routes
 */
'use strict';

const app = require('../server.js');

module.exports = (req, res) => {
  // If the serverless invocation strips '/api', ensure req.url has '/api'
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  return app(req, res);
};
