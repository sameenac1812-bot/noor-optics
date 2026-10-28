/**
 * server.js – Noor Optics Unified Business Platform Server
 * Serves E-Commerce Storefront, Admin & Physical POS, REST APIs, and Thermal Printer Spooler.
 */

'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const apiRouter = require('./server/api');
const { initializeDatabase } = require('./server/db');

// Ensure DB is initialized
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and Request Parsers
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check for /api
app.get('/api', (req, res) => {
  res.json({ status: 'ok', service: 'Noor Optics API', timestamp: new Date().toISOString() });
});

// Mount REST API
app.use('/api', apiRouter);
// Also mount apiRouter directly to catch any stripped serverless paths
app.use(apiRouter);

// Serve Admin Portal at /admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve Static Front-end Files (Storefront, CSS, JS, Images)
app.use(express.static(path.join(__dirname), {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Fallback for client navigation
app.use((req, res) => {
  if (req.path.startsWith('/admin')) {
    return res.sendFile(path.join(__dirname, 'admin.html'));
  }
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl || req.url}` });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`👓 NOOR OPTICS COMPLETE BUSINESS PLATFORM IS LIVE`);
    console.log(`======================================================`);
    console.log(`🛍️  Customer Storefront: http://localhost:${PORT}`);
    console.log(`💼 Admin & Physical POS: http://localhost:${PORT}/admin`);
    console.log(`⚙️  REST APIs:           http://localhost:${PORT}/api`);
    console.log(`🖨️  Thermal Printer:     2-inch / 58 mm Ready`);
    console.log(`🔑 Owner Login:          admin@nooroptics.com / AdminPassword@123`);
    console.log(`======================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} in use, attempting restart...`);
    } else {
      console.error('Server error:', err);
    }
  });
}

module.exports = app;
