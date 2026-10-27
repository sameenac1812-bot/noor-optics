/**
 * server/auth.js – Authentication, Authorization (RBAC) & Audit Logging
 */

'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'noor_optics_super_secure_jwt_secret_key_2026';
const JWT_EXPIRES_IN = '12h';

/**
 * Generate signed JWT token
 */
function signToken(user, permissions = []) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      roleId: user.role_id,
      permissions
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Get user permissions by role ID
 */
function getUserPermissions(roleId) {
  const rows = db.prepare('SELECT code FROM permissions WHERE role_id = ?').all(roleId);
  return rows.map(r => r.code);
}

/**
 * Express Middleware: Authenticate JWT Token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Authentication token required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Fetch fresh user record
    const user = db.prepare('SELECT id, name, email, role_id, is_active FROM users WHERE id = ?').get(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Unauthorized: User account inactive or removed.' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.role_id,
      permissions: decoded.permissions || getUserPermissions(user.role_id)
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Forbidden: Invalid or expired authentication token.' });
  }
}

/**
 * Express Middleware: Require Specific Permission
 */
function requirePermission(permCode) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user.permissions.includes(permCode) || req.user.roleId === 'role-owner') {
      return next();
    }

    return res.status(403).json({
      error: `Forbidden: Missing required permission [${permCode}]`
    });
  };
}

/**
 * Express Middleware: Require Specific Role(s)
 */
function requireRole(...roleIds) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (roleIds.includes(req.user.roleId) || req.user.roleId === 'role-owner') {
      return next();
    }

    return res.status(403).json({ error: 'Forbidden: Insufficient role privileges.' });
  };
}

/**
 * Record Audit Log in Database
 */
function logAudit(userId, userEmail, action, entityType, entityId, details, req) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : '127.0.0.1';
    const id = 'aud-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const detailsJson = typeof details === 'object' ? JSON.stringify(details) : String(details);

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_email, action, entity_type, entity_id, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, userEmail, action, entityType, entityId, detailsJson, ip);
  } catch (e) {
    console.error('Audit log write error:', e.message);
  }
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  signToken,
  verifyToken,
  getUserPermissions,
  authenticateToken,
  requirePermission,
  requireRole,
  logAudit,
  JWT_SECRET
};
