const { NailStyle, Service, Manicurist, User } = require('../models');
const { validateNailStyleCreate, validateNailStyleUpdate } = require('../utils/validators');
const { uploadImage } = require('../services/uploadService');

exports.getAllNailStyles = async (req, res) => {
  try {
    const { category, serviceId, manicuristId, active } = req.query;
    let whereClause = {};
    
    if (category) {
      whereClause.category = category;
    }
    
    if (serviceId) {
      whereClause.serviceId = serviceId;
    }
    
    if (manicuristId) {
      whereClause.manicuristId = manicuristId;
    }
    
    if (active !== undefined) {
      whereClause.active = active === 'true';
    }
    
    const nailStyles = await NailStyle.findAll({
      where: whereClause,
      include: [
        {
          model: Service,
          as: 'service',
          attributes: ['id', 'name', 'category']
        },
        {
          model: Manicurist,
          as: 'manicurist',
          attributes: ['id', 'specialty'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });
    
    return res.status(200).json({ nailStyles });
  } catch (error) {
    console.error('Error al obtener estilos de uñas:', error);
    return res.status(500).json({ error: 'Error al obtener estilos de uñas' });
  }
};

exports.getNailStyleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const nailStyle = await NailStyle.findByPk(id, {
      include: [
        {
          model: Service,
          as: 'service',
          attributes: ['id', 'name', 'category']
        },
        {
          model: Manicurist,
          as: 'manicurist',
          attributes: ['id', 'specialty'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });
    
    if (!nailStyle) {
      return res.status(404).json({ error: 'Estilo de uñas no encontrado' });
    }
    
    return res.status(200).json({ nailStyle });
  } catch (error) {
    console.error('Error al obtener estilo de uñas:', error);
    return res.status(500).json({ error: 'Error al obtener estilo de uñas' });
  }
};

exports.createNailStyle = async (req, res) => {
  try {
    // Verificar permisos
    if (req.user.role !== 'superadmin' && req.user.role !== 'manicurist') {
      return res.status(403).json({
        error: 'No tienes permiso para crear estilos de uñas'
      });
    }
    
    // Validar datos
    const { error } = validateNailStyleCreate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    // Si es manicurista, asignar su ID
    if (req.user.role === 'manicurist') {
      const manicurist = await Manicurist.findOne({
        where: { userId: req.user.id }
      });
      
      if (!manicurist) {
        return res.status(404).json({ error: 'Perfil de manicurista no encontrado' });
      }
      
      req.body.manicuristId = manicurist.id;
    }
    
    // Verificar si el servicio existe
    const service = await Service.findByPk(req.body.serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    // Manejar la carga de imágenes
    let imageUrl = req.body.imageUrl;
    
    if (req.file) {
      imageUrl = await uploadImage(req.file);
    }
    
    // Crear el estilo
    const nailStyle = await NailStyle.create({
      ...req.body,
      imageUrl
    });
    
    return res.status(201).json({
      message: 'Estilo de uñas creado exitosamente',
      nailStyle
    });
  } catch (error) {
    console.error('Error al crear estilo de uñas:', error);
    return res.status(500).json({ error: 'Error al crear estilo de uñas' });
  }
};

exports.updateNailStyle = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar datos
    const { error } = validateNailStyleUpdate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    // Verificar si el estilo existe
    const nailStyle = await NailStyle.findByPk(id, {
      include: [
        {
          model: Manicurist,
          as: 'manicurist',
          include: [
            {
              model: User,
              as: 'user'
            }
          ]
        }
      ]
    });
    
    if (!nailStyle) {
      return res.status(404).json({ error: 'Estilo de uñas no encontrado' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'superadmin') {
      // Si es manicurista, verificar que sea propietaria del estilo
      if (req.user.role === 'manicurist') {
        const manicurist = await Manicurist.findOne({
          where: { userId: req.user.id }
        });
        
        if (!manicurist || nailStyle.manicuristId !== manicurist.id) {
          return res.status(403).json({
            error: 'No tienes permiso para actualizar este estilo'
          });
        }
      } else {
        return res.status(403).json({
          error: 'No tienes permiso para actualizar estilos de uñas'
        });
      }
    }
    
    // Manejar la carga de imágenes
    let updateData = { ...req.body };
    
    if (req.file) {
      updateData.imageUrl = await uploadImage(req.file);
    }
    
    // Actualizar el estilo
    await nailStyle.update(updateData);
    
    // Obtener el estilo actualizado
    const updatedNailStyle = await NailStyle.findByPk(id, {
      include: [
        {
          model: Service,
          as: 'service'
        },
        {
          model: Manicurist,
          as: 'manicurist',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });
    
    return res.status(200).json({
      message: 'Estilo de uñas actualizado exitosamente',
      nailStyle: updatedNailStyle
    });
  } catch (error) {
    console.error('Error al actualizar estilo de uñas:', error);
    return res.status(500).json({ error: 'Error al actualizar estilo de uñas' });
  }
};

exports.toggleNailStyleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el estilo existe
    const nailStyle = await NailStyle.findByPk(id, {
      include: [
        {
          model: Manicurist,
          as: 'manicurist'
        }
      ]
    });
    
    if (!nailStyle) {
      return res.status(404).json({ error: 'Estilo de uñas no encontrado' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'superadmin') {
      // Si es manicurista, verificar que sea propietaria del estilo
      if (req.user.role === 'manicurist') {
        const manicurist = await Manicurist.findOne({
          where: { userId: req.user.id }
        });
        
        if (!manicurist || nailStyle.manicuristId !== manicurist.id) {
          return res.status(403).json({
            error: 'No tienes permiso para modificar este estilo'
          });
        }
      } else {
        return res.status(403).json({
          error: 'No tienes permiso para modificar estilos de uñas'
        });
      }
    }
    
    // Cambiar estado
    await nailStyle.update({ active: !nailStyle.active });
    
    return res.status(200).json({
      message: `Estilo de uñas ${nailStyle.active ? 'activado' : 'desactivado'} exitosamente`,
      status: nailStyle.active
    });
  } catch (error) {
    console.error('Error al cambiar estado de estilo de uñas:', error);
    return res.status(500).json({ error: 'Error al cambiar estado de estilo de uñas' });
  }
};

exports.getNailStyleCategories = async (req, res) => {
  try {
    const categories = await NailStyle.findAll({
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