const { User, Manicurist, sequelize } = require('../models');
const imageService = require('../services/imageService');

// Obtener todos los usuarios
exports.getAllUsers = async (req, res) => {
  try {
    // Filtros
    const { role, active } = req.query;
    let whereClause = {};
    
    if (role) {
      whereClause.role = role;
    }
    
    if (active !== undefined) {
      whereClause.active = active === 'true';
    }
    
    // Solo superadmin puede ver todos los usuarios
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'No tienes permiso para ver todos los usuarios' });
    }
    
    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] }
    });
    
    // Agregar información sobre si tiene imagen de perfil en la BD
    const result = users.map(user => {
      const userData = user.toJSON();
      userData.hasProfileImage = !!userData.profileImageId;
      return userData;
    });
    
    return res.status(200).json({ users: result });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// Obtener usuario por ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Permisos: superadmin puede ver cualquiera, usuarios solo a sí mismos
    if (req.user.role !== 'superadmin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'No tienes permiso para ver este usuario' });
    }
    
    const user = await User.findByPk(id, {
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
    
    // Agregar información sobre si tiene imagen de perfil en la BD
    const result = user.toJSON();
    result.hasProfileImage = !!result.profileImageId;
    
    return res.status(200).json({ user: result });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

// Actualizar usuario
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Permisos: superadmin puede actualizar cualquiera, usuarios solo a sí mismos
    if (req.user.role !== 'superadmin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'No tienes permiso para actualizar este usuario' });
    }
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Iniciar transacción
    const transaction = await sequelize.transaction();
    
    try {
      // Campos permitidos para actualización
      const allowedFields = ['name', 'email', 'phone'];
      // Solo superadmin puede cambiar 'active'
      if (req.user.role === 'superadmin') {
        allowedFields.push('active');
      }
      
      const updateData = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });
      
      // Actualizar contraseña si se proporciona
      if (req.body.password) {
        updateData.password = req.body.password;
      }
      
      // Manejar imagen de perfil si se proporciona
      if (req.file) {
        // Si ya tiene una imagen, eliminarla
        if (user.profileImageId) {
          await imageService.deleteImage(user.profileImageId);
        }
        
        // Subir la nueva imagen
        const imageId = await imageService.uploadImage(req.file);
        updateData.profileImageId = imageId;
      }
      
      await user.update(updateData, { transaction });
      
      await transaction.commit();
      
      // Respuesta sin incluir la contraseña
      const { password: _, ...userData } = user.toJSON();
      userData.hasProfileImage = !!userData.profileImageId;
      
      return res.status(200).json({
        message: 'Usuario actualizado exitosamente',
        user: userData
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// Activar/Desactivar usuario
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    await user.update({ active: !user.active });
    
    return res.status(200).json({
      message: `Usuario ${user.active ? 'activado' : 'desactivado'} exitosamente`,
      status: user.active
    });
  } catch (error) {
    console.error('Error al cambiar estado de usuario:', error);
    return res.status(500).json({ error: 'Error al cambiar estado de usuario' });
  }
};

// Cambiar rol de usuario
exports.changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    // Verificar que el rol sea válido
    const validRoles = ['client', 'manicurist', 'superadmin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Rol no válido' });
    }
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Transacción para manejar cambios relacionados con el rol
    const transaction = await sequelize.transaction();
    
    try {
      // Actualizar rol de usuario
      await user.update({ role }, { transaction });
      
      // Si cambia a manicurista, crear perfil relacionado
      if (role === 'manicurist' && user.role !== 'manicurist') {
        const existingProfile = await Manicurist.findOne({
          where: { userId: user.id }
        });
        
        if (!existingProfile) {
          await Manicurist.create({
            userId: user.id,
            specialty: 'General',
            biography: '',
            active: false
          }, { transaction });
        }
      }
      
      await transaction.commit();
      
      return res.status(200).json({
        message: `Rol de usuario cambiado a ${role} exitosamente`,
        role
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error al cambiar rol de usuario:', error);
    return res.status(500).json({ error: 'Error al cambiar rol de usuario' });
  }
};

exports.getUserProfileImage = async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await User.findByPk(id);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      if (!user.profileImageId) {
        return res.status(404).json({ error: 'Este usuario no tiene imagen de perfil' });
      }
      
      const image = await imageService.getImage(user.profileImageId);
      
      // Establecer las cabeceras de respuesta
      res.set('Content-Type', image.mimetype);
      res.set('Content-Disposition', `inline; filename="${image.filename}"`);
      
      // Enviar los datos de la imagen como respuesta
      return res.send(image.data);
    } catch (error) {
      console.error('Error al obtener imagen de perfil:', error);
      return res.status(500).json({ error: 'Error al obtener imagen de perfil' });
    }
  };