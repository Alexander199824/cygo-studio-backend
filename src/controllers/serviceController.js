const { Service, NailStyle } = require('../models');
const { validateServiceCreate, validateServiceUpdate } = require('../utils/validators');

exports.getAllServices = async (req, res) => {
  try {
    const { category, active } = req.query;
    let whereClause = {};
    
    if (category) {
      whereClause.category = category;
    }
    
    if (active !== undefined) {
      whereClause.active = active === 'true';
    }
    
    const services = await Service.findAll({
      where: whereClause,
      include: [
        {
          model: NailStyle,
          as: 'nailStyles',
          where: { active: true },
          required: false
        }
      ]
    });
    
    return res.status(200).json({ services });
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    return res.status(500).json({ error: 'Error al obtener servicios' });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await Service.findByPk(id, {
      include: [
        {
          model: NailStyle,
          as: 'nailStyles',
          where: { active: true },
          required: false
        }
      ]
    });
    
    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    return res.status(200).json({ service });
  } catch (error) {
    console.error('Error al obtener servicio:', error);
    return res.status(500).json({ error: 'Error al obtener servicio' });
  }
};

exports.createService = async (req, res) => {
  try {
    // Solo superadmin puede crear servicios
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        error: 'No tienes permiso para crear servicios'
      });
    }
    
    // Validar datos
    const { error } = validateServiceCreate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const service = await Service.create(req.body);
    
    return res.status(201).json({
      message: 'Servicio creado exitosamente',
      service
    });
  } catch (error) {
    console.error('Error al crear servicio:', error);
    return res.status(500).json({ error: 'Error al crear servicio' });
  }
};

exports.updateService = async (req, res) => {
  try {
    // Solo superadmin puede actualizar servicios
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        error: 'No tienes permiso para actualizar servicios'
      });
    }
    
    const { id } = req.params;
    
    // Validar datos
    const { error } = validateServiceUpdate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    await service.update(req.body);
    
    return res.status(200).json({
      message: 'Servicio actualizado exitosamente',
      service
    });
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    return res.status(500).json({ error: 'Error al actualizar servicio' });
  }
};

exports.toggleServiceStatus = async (req, res) => {
  try {
    // Solo superadmin puede activar/desactivar servicios
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        error: 'No tienes permiso para realizar esta acción'
      });
    }
    
    const { id } = req.params;
    
    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    await service.update({ active: !service.active });
    
    return res.status(200).json({
      message: `Servicio ${service.active ? 'activado' : 'desactivado'} exitosamente`,
      status: service.active
    });
  } catch (error) {
    console.error('Error al cambiar estado de servicio:', error);
    return res.status(500).json({ error: 'Error al cambiar estado de servicio' });
  }
};

exports.getServiceCategories = async (req, res) => {
  try {
    const categories = await Service.findAll({
      attributes: ['category'],
      group: ['category'],
      where: {
        category: {
          [Op.not]: null
        }
      }
    });
    
    return res.status(200).json({
      categories: categories.map(c => c.category)
    });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return res.status(500).json({ error: 'Error al obtener categorías' });
  }
};