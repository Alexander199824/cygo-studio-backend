const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Configuración JWT
const JWT_SECRET = process.env.JWT_SECRET || 'cygo_studio_secret';

// Middleware para verificar token
exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Verificar si el usuario existe y está activo
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        return res.status(401).json({ error: 'Usuario no encontrado.' });
      }
      
      if (!user.active) {
        return res.status(403).json({ error: 'Usuario desactivado. Contacte al administrador.' });
      }
      
      // Agregar información del usuario a la solicitud
      req.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };
      
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    return res.status(500).json({ error: 'Error al autenticar usuario.' });
  }
};

// Middleware para verificar roles
exports.authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    const userRole = req.user.role;
    
    // Convertir a array si es un solo rol
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'No tienes permiso para acceder a este recurso' 
      });
    }
    
    next();
  };
};