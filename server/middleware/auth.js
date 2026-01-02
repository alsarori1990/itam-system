import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Authentication middleware
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Permission checking middleware
export const checkPermission = (resource, action) => {
  return (req, res, next) => {
    const user = req.user;
    
    // Super Admin has all permissions
    if (user.roles.includes('Super Admin')) {
      return next();
    }
    
    // Check specific role permissions
    const hasPermission = checkUserPermission(user, resource, action);
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Helper function to check permissions
function checkUserPermission(user, resource, action) {
  // Permission matrix (simplified)
  const permissions = {
    'IT Manager': {
      assets: ['view', 'create', 'update', 'delete'],
      tickets: ['view', 'create', 'update', 'assign'],
      subscriptions: ['view', 'create', 'update']
    },
    'IT Technician': {
      assets: ['view', 'update'],
      tickets: ['view', 'create', 'update']
    },
    'Auditor / Finance': {
      assets: ['view', 'export'],
      tickets: ['view', 'export'],
      subscriptions: ['view', 'view_sensitive', 'export']
    },
    'Viewer': {
      assets: ['view'],
      reports: ['view']
    }
  };
  
  for (const role of user.roles) {
    const rolePerms = permissions[role];
    if (rolePerms && rolePerms[resource] && rolePerms[resource].includes(action)) {
      return true;
    }
  }
  
  return false;
}
