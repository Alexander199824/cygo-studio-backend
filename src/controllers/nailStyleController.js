const { NailStyle, Service, Manicurist, User, sequelize } = require('../models');
const { validateNailStyleCreate, validateNailStyleUpdate } = require('../utils/validators');
const imageService = require('../services/imageService');

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
    
    // Añadir información sobre si tiene imagen en la base de datos
    const result = nailStyles.map(style => {
      const nailStyle = style.toJSON();
      nailStyle.hasImage = !!nailStyle.imageId;
      return nailStyle;
    });
    
    return res.status(200).json({ nailStyles: result });
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
    
    // Añadir información sobre si tiene imagen en la base de datos
    const result = nailStyle.toJSON();
    result.hasImage = !!result.imageId;
    
    return res.status(200).json({ nailStyle: result });
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
    
    // Iniciar transacción
    const transaction = await sequelize.transaction();
    
    try {
      // Manejar la carga de imágenes
      let imageId = null;
      if (req.file) {
        imageId = await imageService.uploadImage(req.file);
      }
      
      // Crear el estilo
      const nailStyle = await NailStyle.create({
        ...req.body,
        imageId
      }, { transaction });
      
      await transaction.commit();
      
      // Preparar respuesta
      const result = nailStyle.toJSON();
      result.hasImage = !!imageId;
      
      return res.status(201).json({
        message: 'Estilo de uñas creado exitosamente',
        nailStyle: result
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
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
    
    // Iniciar transacción
    const transaction = await sequelize.transaction();
    
    try {
      // Preparar datos para actualizar
      let updateData = { ...req.body };
      
      // Manejar la carga de imágenes
      if (req.file) {
        // Si ya tiene una imagen, eliminarla
        if (nailStyle.imageId) {
          await imageService.deleteImage(nailStyle.imageId);
        }
        
        // Subir la nueva imagen
        const imageId = await imageService.uploadImage(req.file);
        updateData.imageId = imageId;
      }
      
      // Actualizar el estilo
      await nailStyle.update(updateData, { transaction });
      
      await transaction.commit();
      
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
      
      // Preparar respuesta
      const result = updatedNailStyle.toJSON();
      result.hasImage = !!result.imageId;
      
      return res.status(200).json({
        message: 'Estilo de uñas actualizado exitosamente',
        nailStyle: result
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
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

// Nuevo método para obtener la imagen de un estilo de uñas
exports.getNailStyleImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const nailStyle = await NailStyle.findByPk(id);
    
    if (!nailStyle) {
      return res.status(404).json({ error: 'Estilo de uñas no encontrado' });
    }
    
    if (!nailStyle.imageId) {
      return res.status(404).json({ error: 'Este estilo no tiene imagen' });
    }
    
    const image = await imageService.getImage(nailStyle.imageId);
    
    // Establecer las cabeceras de respuesta
    res.set('Content-Type', image.mimetype);
    res.set('Content-Disposition', `inline; filename="${image.filename}"`);
    
    // Enviar los datos de la imagen como respuesta
    return res.send(image.data);
  } catch (error) {
    console.error('Error al obtener imagen de estilo de uñas:', error);
    return res.status(500).json({ error: 'Error al obtener imagen' });
  }
};