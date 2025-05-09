const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { User, Manicurist } = require('../models');
const { validateLogin, validateRegister } = require('../utils/validators');

// Configuración JWT
const JWT_SECRET = process.env.JWT_SECRET || 'cygo_studio_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

exports.register = async (req, res) => {
  try {
    // Validar datos de entrada
    const { error } = validateRegister(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, email, password, name, phone, role } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'El usuario ya existe con ese nombre de usuario o correo electrónico'
      });
    }

    // Solo superadmin puede crear manicuristas
    if (role === 'manicurist' && req.user && req.user.role !== 'superadmin') {
      return res.status(403).json({
        error: 'No tienes permiso para crear una cuenta de manicurista'
      });
    }

    // Crear usuario
    const user = await User.create({
      username,
      email,
      password,
      name,
      phone,
      role: role || 'client',
      active: role === 'manicurist' ? false : true // Manicuristas inactivos por defecto
    });

    // Si es manicurista, crear perfil relacionado
    if (role === 'manicurist') {
      await Manicurist.create({
        userId: user.id,
        specialty: req.body.specialty || 'General',
        biography: req.body.biography || '',
        active: false
      });
    }

    // Generar token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Respuesta sin incluir la contraseña
    const { password: _, ...userData } = user.toJSON();

    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: userData,
      token
    });
  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

exports.login = async (req, res) => {
  try {
    // Validar datos de entrada
    const { error } = validateLogin(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, password } = req.body;

    // Buscar usuario
    const user = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email: username }]
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Credenciales incorrectas'
      });
    }

    // Verificar contraseña
    const passwordValid = await user.comparePassword(password);
    if (!passwordValid) {
      return res.status(401).json({
        error: 'Credenciales incorrectas'
      });
    }

    // Verificar si está activo
    if (!user.active) {
      return res.status(401).json({
        error: 'Cuenta desactivada. Contacta al administrador.'
      });
    }

    // Generar token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Respuesta sin incluir la contraseña
    const { password: _, ...userData } = user.toJSON();

    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      user: userData,
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Manicurist,
          as: 'manicuristProfile',
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return res.status(500).json({ error: 'Error al obtener perfil de usuario' });
  }
};