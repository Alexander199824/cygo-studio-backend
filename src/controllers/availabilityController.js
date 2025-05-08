const { Availability, Manicurist, Appointment, sequelize } = require('../models');
const { validateAvailabilityCreate, validateAvailabilityUpdate } = require('../utils/validators');
const moment = require('moment');
const { Op } = require('sequelize');

exports.getManicuristAvailability = async (req, res) => {
  try {
    const { manicuristId } = req.params;
    const { date, startDate, endDate } = req.query;
    
    // Verificar si el manicurista existe
    const manicurist = await Manicurist.findByPk(manicuristId);
    if (!manicurist) {
      return res.status(404).json({ error: 'Manicurista no encontrada' });
    }
    
    let whereClause = { manicuristId };
    
    // Filtrar por fecha específica
    if (date) {
      const specificDate = moment(date, 'YYYY-MM-DD');
      
      if (!specificDate.isValid()) {
        return res.status(400).json({ error: 'Formato de fecha inválido' });
      }
      
      const dayOfWeek = specificDate.day();
      
      whereClause[Op.or] = [
        // Disponibilidad recurrente para ese día de la semana
        {
          isRecurring: true,
          dayOfWeek: dayOfWeek
        },
        // Disponibilidad específica para esa fecha
        {
          isRecurring: false,
          specificDate: specificDate.format('YYYY-MM-DD')
        }
      ];
    } else if (startDate && endDate) {
      // Filtrar por rango de fechas
      const start = moment(startDate, 'YYYY-MM-DD');
      const end = moment(endDate, 'YYYY-MM-DD');
      
      if (!start.isValid() || !end.isValid()) {
        return res.status(400).json({ error: 'Formato de fecha inválido' });
      }
      
      whereClause[Op.or] = [
        // Disponibilidad recurrente
        {
          isRecurring: true
        },
        // Disponibilidad específica en el rango
        {
          isRecurring: false,
          specificDate: {
            [Op.between]: [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')]
          }
        }
      ];
    }
    
    const availabilities = await Availability.findAll({
      where: whereClause,
      order: [
        ['dayOfWeek', 'ASC'],
        ['startTime', 'ASC']
      ]
    });
    
    // Si hay una fecha específica, recuperar también las citas
    let appointments = [];
    if (date) {
      appointments = await Appointment.findAll({
        where: {
          manicuristId,
          date: moment(date).format('YYYY-MM-DD'),
          status: {
            [Op.notIn]: ['cancelled'] // No mostrar citas canceladas
          }
        },
        attributes: ['id', 'date', 'startTime', 'endTime', 'status']
      });
    }
    
    return res.status(200).json({
      manicuristId,
      availabilities,
      appointments
    });
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    return res.status(500).json({ error: 'Error al obtener disponibilidad' });
  }
};

exports.createAvailability = async (req, res) => {
  try {
    // Validar datos
    const { error } = validateAvailabilityCreate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const { manicuristId, isRecurring, dayOfWeek, specificDate, startTime, endTime, isAvailable } = req.body;
    
    // Verificar permisos
    if (req.user.role !== 'superadmin' && req.user.role !== 'manicurist') {
      return res.status(403).json({
        error: 'No tienes permiso para crear disponibilidad'
      });
    }
    
    // Verificar si el manicurista existe
    const manicurist = await Manicurist.findByPk(manicuristId);
    if (!manicurist) {
      return res.status(404).json({ error: 'Manicurista no encontrada' });
    }
    
    // Si es manicurista, verificar que sea propietario
    if (req.user.role === 'manicurist') {
      const userManicurist = await Manicurist.findOne({
        where: { userId: req.user.id }
      });
      
      if (!userManicurist || userManicurist.id !== parseInt(manicuristId)) {
        return res.status(403).json({
          error: 'No puedes modificar la disponibilidad de otra manicurista'
        });
      }
    }
    
    // Validar que tenga día de la semana o fecha específica
    if (isRecurring && (dayOfWeek === null || dayOfWeek === undefined)) {
      return res.status(400).json({
        error: 'Para disponibilidad recurrente, se requiere día de la semana'
      });
    }
    
    if (!isRecurring && !specificDate) {
      return res.status(400).json({
        error: 'Para disponibilidad no recurrente, se requiere fecha específica'
      });
    }
    
    // Crear disponibilidad
    const availability = await Availability.create({
      manicuristId,
      isRecurring,
      dayOfWeek: isRecurring ? dayOfWeek : null,
      specificDate: !isRecurring ? specificDate : null,
      startTime,
      endTime,
      isAvailable
    });
    
    return res.status(201).json({
      message: 'Disponibilidad creada exitosamente',
      availability
    });
  } catch (error) {
    console.error('Error al crear disponibilidad:', error);
    return res.status(500).json({ error: 'Error al crear disponibilidad' });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar datos
    const { error } = validateAvailabilityUpdate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    // Verificar si la disponibilidad existe
    const availability = await Availability.findByPk(id, {
      include: [
        {
          model: Manicurist,
          as: 'manicurist'
        }
      ]
    });
    
    if (!availability) {
      return res.status(404).json({ error: 'Disponibilidad no encontrada' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'superadmin') {
      // Si es manicurista, verificar que sea propietario
      if (req.user.role === 'manicurist') {
        const userManicurist = await Manicurist.findOne({
          where: { userId: req.user.id }
        });
        
        if (!userManicurist || userManicurist.id !== availability.manicuristId) {
          return res.status(403).json({
            error: 'No puedes modificar la disponibilidad de otra manicurista'
          });
        }
      } else {
        return res.status(403).json({
          error: 'No tienes permiso para modificar disponibilidad'
        });
      }
    }
    
    // Actualizar disponibilidad
    await availability.update(req.body);
    
    return res.status(200).json({
      message: 'Disponibilidad actualizada exitosamente',
      availability
    });
  } catch (error) {
    console.error('Error al actualizar disponibilidad:', error);
    return res.status(500).json({ error: 'Error al actualizar disponibilidad' });
  }
};

exports.deleteAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si la disponibilidad existe
    const availability = await Availability.findByPk(id, {
      include: [
        {
          model: Manicurist,
          as: 'manicurist'
        }
      ]
    });
    
    if (!availability) {
      return res.status(404).json({ error: 'Disponibilidad no encontrada' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'superadmin') {
      // Si es manicurista, verificar que sea propietario
      if (req.user.role === 'manicurist') {
        const userManicurist = await Manicurist.findOne({
          where: { userId: req.user.id }
        });
        
        if (!userManicurist || userManicurist.id !== availability.manicuristId) {
          return res.status(403).json({
            error: 'No puedes eliminar la disponibilidad de otra manicurista'
          });
        }
      } else {
        return res.status(403).json({
          error: 'No tienes permiso para eliminar disponibilidad'
        });
      }
    }
    
    // Eliminar disponibilidad
    await availability.destroy();
    
    return res.status(200).json({
      message: 'Disponibilidad eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar disponibilidad:', error);
    return res.status(500).json({ error: 'Error al eliminar disponibilidad' });
  }
};