const { User, Manicurist, Service, Availability, NailStyle, ManicuristService, sequelize } = require('../models');
const { validateManicuristUpdate } = require('../utils/validators');

exports.getAllManicurists = async (req, res) => {
  try {
    const { active } = req.query;
    let whereClause = {};
    
    if (active !== undefined) {
      whereClause.active = active === 'true';
    }

    const manicurists = await Manicurist.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'profileImage', 'active']
        },
        {
          model: Service,
          as: 'services',
          through: { attributes: ['price'] },
          attributes: ['id', 'name', 'description', 'duration', 'category']
        }
      ]
    });

    return res.status(200).json({ manicurists });
  } catch (error) {
    console.error('Error al obtener manicuristas:', error);
    return res.status(500).json({ error: 'Error al obtener manicuristas' });
  }
};

exports.getManicuristById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const manicurist = await Manicurist.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'profileImage', 'active']
        },
        {
          model: Service,
          as: 'services',
          through: { attributes: ['price'] },
          attributes: ['id', 'name', 'description', 'price', 'duration', 'category']
        },
        {
          model: NailStyle,
          as: 'nailStyles',
          where: { active: true },
          required: false
        },
        {
          model: Availability,
          as: 'availabilities'
        }
      ]
    });

    if (!manicurist) {
      return res.status(404).json({ error: 'Manicurista no encontrada' });
    }

    return res.status(200).json({ manicurist });
  } catch (error) {
    console.error('Error al obtener manicurista:', error);
    return res.status(500).json({ error: 'Error al obtener manicurista' });
  }
};

exports.updateManicurist = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar permisos
    const manicurist = await Manicurist.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });
    
    if (!manicurist) {
      return res.status(404).json({ error: 'Manicurista no encontrada' });
    }
    
    // Solo el propietario o el superadmin pueden actualizar
    if (req.user.role !== 'superadmin' && manicurist.user.id !== req.user.id) {
      return res.status(403).json({
        error: 'No tienes permiso para modificar este perfil'
      });
    }
    
    // Validar datos
    const { error } = validateManicuristUpdate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    // Iniciar transacción
    const transaction = await sequelize.transaction();
    
    try {
      // Actualizar información del manicurista
      const manicuristData = {};
      if (req.body.specialty) manicuristData.specialty = req.body.specialty;
      if (req.body.biography) manicuristData.biography = req.body.biography;
      
      if (Object.keys(manicuristData).length > 0) {
        await manicurist.update(manicuristData, { transaction });
      }
      
      // Actualizar información del usuario relacionado
      const userData = {};
      if (req.body.name) userData.name = req.body.name;
      if (req.body.email) userData.email = req.body.email;
      if (req.body.phone) userData.phone = req.body.phone;
      if (req.body.profileImage) userData.profileImage = req.body.profileImage;
      
      if (Object.keys(userData).length > 0) {
        await manicurist.user.update(userData, { transaction });
      }
      
      // Commit de la transacción
      await transaction.commit();
      
      // Obtener manicurista actualizada
      const updatedManicurist = await Manicurist.findByPk(id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'phone', 'profileImage', 'active']
          }
        ]
      });
      
      return res.status(200).json({
        message: 'Perfil de manicurista actualizado exitosamente',
        manicurist: updatedManicurist
      });
    } catch (error) {
      // Rollback en caso de error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error al actualizar manicurista:', error);
    return res.status(500).json({ error: 'Error al actualizar perfil de manicurista' });
  }
};

exports.toggleManicuristStatus = async (req, res) => {
  try {
    // Solo superadmin puede activar/desactivar manicuristas
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        error: 'No tienes permiso para realizar esta acción'
      });
    }

    const { id } = req.params;
    const manicurist = await Manicurist.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });
    
    if (!manicurist) {
      return res.status(404).json({ error: 'Manicurista no encontrada' });
    }

    // Transacción para actualizar manicurista y usuario
    const transaction = await sequelize.transaction();
    
    try {
      await manicurist.update(
        { active: !manicurist.active },
        { transaction }
      );
      
      await manicurist.user.update(
        { active: !manicurist.user.active },
        { transaction }
      );
      
      await transaction.commit();
      
      return res.status(200).json({
        message: `Manicurista ${manicurist.active ? 'activada' : 'desactivada'} exitosamente`,
        status: manicurist.active
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error al cambiar estado de manicurista:', error);
    return res.status(500).json({ error: 'Error al cambiar estado de manicurista' });
  }
};

exports.getManicuristServices = async (req, res) => {
  try {
    const { id } = req.params;
    
    const manicurist = await Manicurist.findByPk(id, {
      include: [{
        model: Service,
        as: 'services',
        through: { attributes: ['price'] },
        attributes: ['id', 'name', 'description', 'price', 'duration', 'category']
      }]
    });
    
    if (!manicurist) {
      return res.status(404).json({ error: 'Manicurista no encontrada' });
    }
    
    return res.status(200).json({ services: manicurist.services });
  } catch (error) {
    console.error('Error al obtener servicios de manicurista:', error);
    return res.status(500).json({ error: 'Error al obtener servicios' });
  }
};

exports.assignServiceToManicurist = async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceId, price } = req.body;
    
    // Verificar permisos
    if (req.user.role !== 'superadmin' && req.user.role !== 'manicurist') {
      return res.status(403).json({
        error: 'No tienes permiso para realizar esta acción'
      });
    }
    
    // Verificar si el manicurista existe
    const manicurist = await Manicurist.findByPk(id);
    if (!manicurist) {
      return res.status(404).json({ error: 'Manicurista no encontrada' });
    }
    
    // Si es manicurista, verificar que sea el propietario
    if (req.user.role === 'manicurist') {
      const userManicurist = await Manicurist.findOne({
        where: { userId: req.user.id }
      });
      
      if (!userManicurist || userManicurist.id !== parseInt(id)) {
        return res.status(403).json({
          error: 'No puedes modificar servicios de otra manicurista'
        });
      }
    }
    
    // Verificar si el servicio existe
    const service = await Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    // Asignar o actualizar la relación
    const [manicuristService, created] = await ManicuristService.findOrCreate({
      where: {
        manicuristId: id,
        serviceId
      },
      defaults: {
        price: price || service.price
      }
    });
    
    if (!created) {
      await manicuristService.update({
        price: price || service.price
      });
    }
    
    return res.status(200).json({
      message: created ? 'Servicio asignado exitosamente' : 'Servicio actualizado exitosamente',
      manicuristService
    });
  } catch (error) {
    console.error('Error al asignar servicio:', error);
    return res.status(500).json({ error: 'Error al asignar servicio' });
  }
};

exports.removeServiceFromManicurist = async (req, res) => {
  try {
    const { id, serviceId } = req.params;
    
    // Verificar permisos
    if (req.user.role !== 'superadmin' && req.user.role !== 'manicurist') {
      return res.status(403).json({
        error: 'No tienes permiso para realizar esta acción'
      });
    }
    
    // Si es manicurista, verificar que sea el propietario
    if (req.user.role === 'manicurist') {
      const userManicurist = await Manicurist.findOne({
        where: { userId: req.user.id }
      });
      
      if (!userManicurist || userManicurist.id !== parseInt(id)) {
        return res.status(403).json({
          error: 'No puedes modificar servicios de otra manicurista'
        });
      }
    }
    
    // Eliminar la relación
    const deleted = await ManicuristService.destroy({
      where: {
        manicuristId: id,
        serviceId
      }
    });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Servicio no encontrado para esta manicurista' });
    }
    
    return res.status(200).json({
      message: 'Servicio removido exitosamente'
    });
  } catch (error) {
    console.error('Error al remover servicio:', error);
    return res.status(500).json({ error: 'Error al remover servicio' });
  }
};