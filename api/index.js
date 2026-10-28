/**
 * api/index.js – Vercel Serverless Function Entry Point for Noor Optics
 * Routes all /api/* requests into the Express REST API.
 */

'use strict';

const app = require('../server.js');

module.exports = (req, res) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/qr') && !req.url.startsWith('/q')) {
    req.url = '/api' + req.url;
  }
  return app(req, res);
};
