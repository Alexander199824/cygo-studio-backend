const Availability = require('../models').Availability;
const { Appointment, User, Manicurist, Service, NailStyle, Payment, sequelize } = require('../models');
const { validateAppointmentCreate, validateAppointmentUpdate } = require('../utils/validators');
const notificationService = require('../services/notificationService');
const { Op } = require('sequelize'); 
const moment = require('moment');

exports.getAllAppointments = async (req, res) => {
  try {
    // Verificar permisos según rol
    let whereClause = {};
    
    if (req.user.role === 'client') {
      // Cliente solo ve sus propias citas
      whereClause.clientId = req.user.id;
    } else if (req.user.role === 'manicurist') {
      // Manicurista solo ve sus propias citas
      const manicurist = await Manicurist.findOne({
        where: { userId: req.user.id }
      });
      
      if (!manicurist) {
        return res.status(404).json({ error: 'Perfil de manicurista no encontrado' });
      }
      
      whereClause.manicuristId = manicurist.id;
    }
    
    // Filtros por parámetros
    const { status, startDate, endDate, manicuristId, clientId } = req.query;
    
    if (status) {
      whereClause.status = status;
    }
    
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      whereClause.date = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      whereClause.date = {
        [Op.lte]: endDate
      };
    }
    
    // Superadmin puede filtrar por manicurista o cliente
    if (req.user.role === 'superadmin') {
      if (manicuristId) {
        whereClause.manicuristId = manicuristId;
      }
      
      if (clientId) {
        whereClause.clientId = clientId;
      }
    }
    
    // Buscar citas
    const appointments = await Appointment.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'name', 'email', 'phone', 'profileImage']
        },
        {
          model: Manicurist,
          as: 'manicurist',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'phone', 'profileImage']
            }
          ]
        },
        {
          model: Service,
          as: 'service'
        },
        {
          model: NailStyle,
          as: 'nailStyle'
        },
        {
          model: Payment,
          as: 'payment'
        }
      ],
      order: [['date', 'ASC'], ['startTime', 'ASC']]
    });
    
    return res.status(200).json({ appointments });
  } catch (error) {
    console.error('Error al obtener citas:', error);
    return res.status(500).json({ error: 'Error al obtener citas' });
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'name', 'email', 'phone', 'profileImage']
        },
        {
          model: Manicurist,
          as: 'manicurist',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'phone', 'profileImage']
            }
          ]
        },
        {
          model: Service,
          as: 'service'
        },
        {
          model: NailStyle,
          as: 'nailStyle'
        },
        {
          model: Payment,
          as: 'payment'
        }
      ]
    });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'superadmin' && 
        appointment.clientId !== req.user.id && 
        req.user.role !== 'manicurist') {
      return res.status(403).json({
        error: 'No tienes permiso para ver esta cita'
      });
    }
    
    // Si es manicurista, verificar que sea la manicurista de la cita
    if (req.user.role === 'manicurist') {
      const manicurist = await Manicurist.findOne({
        where: { userId: req.user.id }
      });
      
      if (!manicurist || manicurist.id !== appointment.manicuristId) {
        return res.status(403).json({
          error: 'No tienes permiso para ver esta cita'
        });
      }
    }
    
    return res.status(200).json({ appointment });
  } catch (error) {
    console.error('Error al obtener cita:', error);
    return res.status(500).json({ error: 'Error al obtener cita' });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    // Validar datos
    const { error } = validateAppointmentCreate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const {
      manicuristId,
      serviceId,
      nailStyleId,
      date,
      startTime,
      clientId,
      customRequests,
      referenceImages
    } = req.body;
    
    // Verificar permisos
    if (req.user.role !== 'superadmin' && req.user.role !== 'client') {
      return res.status(403).json({
        error: 'No tienes permiso para crear una cita'
      });
    }
    
    // Si es cliente, solo puede crear citas para sí mismo
    if (req.user.role === 'client' && clientId !== req.user.id) {
      return res.status(403).json({
        error: 'Solo puedes crear citas para ti mismo'
      });
    }
    
    // Verificar si el manicurista existe
    const manicurist = await Manicurist.findByPk(manicuristId);
    if (!manicurist) {
      return res.status(404).json({ error: 'Manicurista no encontrada' });
    }
    
    // Verificar si el servicio existe
    const service = await Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    // Verificar si el estilo existe (si se proporciona)
    if (nailStyleId) {
      const nailStyle = await NailStyle.findByPk(nailStyleId);
      if (!nailStyle) {
        return res.status(404).json({ error: 'Estilo de uñas no encontrado' });
      }
    }
    
    // Verificar disponibilidad del manicurista
    const appointmentDate = moment(date);
    const dayOfWeek = appointmentDate.day();
    
    // Buscar disponibilidad recurrente o específica
    const availability = await Availability.findOne({
      where: {
        manicuristId,
        isAvailable: true,
        [Op.or]: [
          {
            isRecurring: true,
            dayOfWeek
          },
          {
            isRecurring: false,
            specificDate: date
          }
        ],
        startTime: {
          [Op.lte]: startTime
        },
        endTime: {
          [Op.gte]: moment(startTime, 'HH:mm:ss')
            .add(service.duration, 'minutes')
            .format('HH:mm:ss')
        }
      }
    });
    
    if (!availability) {
      return res.status(400).json({ 
        error: 'El manicurista no está disponible en el horario seleccionado' 
      });
    }
    
    // Verificar si ya hay una cita en ese horario
    const endTime = moment(startTime, 'HH:mm:ss')
      .add(service.duration, 'minutes')
      .format('HH:mm:ss');
    
    const existingAppointment = await Appointment.findOne({
      where: {
        manicuristId,
        date,
        status: {
          [Op.notIn]: ['cancelled']
        },
        [Op.or]: [
          {
            startTime: {
              [Op.lt]: endTime,
              [Op.gte]: startTime
            }
          },
          {
            endTime: {
              [Op.gt]: startTime,
              [Op.lte]: endTime
            }
          }
        ]
      }
    });
    
    if (existingAppointment) {
      return res.status(400).json({ 
        error: 'Ya existe una cita en ese horario' 
      });
    }
    
    // Iniciar transacción
    const transaction = await sequelize.transaction();
    
    try {
      // Crear la cita
      const appointment = await Appointment.create({
        clientId: clientId || req.user.id,
        manicuristId,
        serviceId,
        nailStyleId,
        date,
        startTime,
        endTime,
        price: service.price,
        status: 'pending',
        customRequests,
        referenceImages
      }, { transaction });
      
      // Confirmar transacción
      await transaction.commit();
      
      // Enviar notificación al manicurista
      const client = await User.findByPk(appointment.clientId);
      const manicuristUser = await User.findByPk(manicurist.userId);
      
      // Notificar por correo
      await notificationService.sendNewAppointmentEmail(
        manicuristUser.email,
        {
          appointment,
          client,
          service,
          manicurist
        }
      );
      
      // Obtener cita completa con relaciones
      const createdAppointment = await Appointment.findByPk(appointment.id, {
        include: [
          {
            model: User,
            as: 'client',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: Manicurist,
            as: 'manicurist',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email', 'phone']
              }
            ]
          },
          {
            model: Service,
            as: 'service'
          },
          {
            model: NailStyle,
            as: 'nailStyle'
          }
        ]
      });
      
      return res.status(201).json({
        message: 'Cita creada exitosamente',
        appointment: createdAppointment
      });
    } catch (error) {
      // Rollback en caso de error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error al crear cita:', error);
    return res.status(500).json({ error: 'Error al crear cita' });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar datos
    const { error } = validateAppointmentUpdate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    // Verificar si la cita existe
    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: Service,
          as: 'service'
        },
        {
          model: Manicurist,
          as: 'manicurist'
        },
        {
          model: User,
          as: 'client'
        }
      ]
    });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'superadmin' && 
        appointment.clientId !== req.user.id && 
        req.user.role !== 'manicurist') {
      return res.status(403).json({
        error: 'No tienes permiso para actualizar esta cita'
      });
    }
    
    // Si es manicurista, verificar que sea la manicurista de la cita
    if (req.user.role === 'manicurist') {
      const manicurist = await Manicurist.findOne({
        where: { userId: req.user.id }
      });
      
      if (!manicurist || manicurist.id !== appointment.manicuristId) {
        return res.status(403).json({
          error: 'No tienes permiso para actualizar esta cita'
        });
      }
    }
    
    // Verificar cambios según rol
    const updateData = { ...req.body };
    
    // Cliente solo puede actualizar ciertos campos
    if (req.user.role === 'client') {
      const allowedFields = ['nailStyleId', 'customRequests', 'referenceImages'];
      Object.keys(updateData).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete updateData[key];
        }
      });
    }
    
    // Manicuristas pueden actualizar ciertos campos
    if (req.user.role === 'manicurist') {
      const allowedFields = ['status', 'manicuristNote'];
      Object.keys(updateData).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete updateData[key];
        }
      });
    }
    
    // Si se cambia la fecha o hora, verificar disponibilidad
    if ((updateData.date && updateData.date !== appointment.date) || 
        (updateData.startTime && updateData.startTime !== appointment.startTime)) {
      
      const date = updateData.date || appointment.date;
      const startTime = updateData.startTime || appointment.startTime;
      const appointmentDate = moment(date);
      const dayOfWeek = appointmentDate.day();
      
      // Buscar disponibilidad recurrente o específica
      const availability = await Availability.findOne({
        where: {
          manicuristId: appointment.manicuristId,
          isAvailable: true,
          [Op.or]: [
            {
              isRecurring: true,
              dayOfWeek
            },
            {
              isRecurring: false,
              specificDate: date
            }
          ],
          startTime: {
            [Op.lte]: startTime
          },
          endTime: {
            [Op.gte]: moment(startTime, 'HH:mm:ss')
              .add(appointment.service.duration, 'minutes')
              .format('HH:mm:ss')
          }
        }
      });
      
      if (!availability) {
        return res.status(400).json({ 
          error: 'El manicurista no está disponible en el horario seleccionado' 
        });
      }
      
      // Verificar si ya hay otra cita en ese horario
      const endTime = moment(startTime, 'HH:mm:ss')
        .add(appointment.service.duration, 'minutes')
        .format('HH:mm:ss');
      
      const existingAppointment = await Appointment.findOne({
        where: {
          id: {
            [Op.ne]: appointment.id
          },
          manicuristId: appointment.manicuristId,
          date,
          status: {
            [Op.notIn]: ['cancelled']
          },
          [Op.or]: [
            {
              startTime: {
                [Op.lt]: endTime,
                [Op.gte]: startTime
              }
            },
            {
              endTime: {
                [Op.gt]: startTime,
                [Op.lte]: endTime
              }
            }
          ]
        }
      });
      
      if (existingAppointment) {
        return res.status(400).json({ 
          error: 'Ya existe una cita en ese horario' 
        });
      }
      
      // Si se cambia la hora de inicio, actualizar la hora de fin
      if (updateData.startTime) {
        updateData.endTime = endTime;
      }
    }
    
    // Actualizar la cita
    await appointment.update(updateData);
    
    // Si se cambia el estado a completado, actualizar rating del manicurista
    if (updateData.status === 'completed' && appointment.status !== 'completed') {
      await updateManicuristRating(appointment.manicuristId);
    }
    
    // Si se cambia el estado, enviar notificaciones
    if (updateData.status && updateData.status !== appointment.status) {
      if (updateData.status === 'confirmed') {
        // Notificar al cliente
        await notificationService.sendAppointmentConfirmationEmail(
          appointment.client.email,
          {
            appointment: {
              ...appointment.toJSON(),
              status: 'confirmed'
            },
            client: appointment.client,
            service: appointment.service,
            manicurist: appointment.manicurist
          }
        );
      } else if (updateData.status === 'cancelled') {
        // Notificar al cliente y al manicurista
        await notificationService.sendAppointmentCancellationEmail(
          appointment.client.email,
          {
            appointment: {
              ...appointment.toJSON(),
              status: 'cancelled'
            },
            client: appointment.client,
            service: appointment.service,
            manicurist: appointment.manicurist
          }
        );
        
        const manicuristUser = await User.findByPk(appointment.manicurist.userId);
        await notificationService.sendAppointmentCancellationEmail(
          manicuristUser.email,
          {
            appointment: {
              ...appointment.toJSON(),
              status: 'cancelled'
            },
            client: appointment.client,
            service: appointment.service,
            manicurist: appointment.manicurist
          }
        );
      }
    }
    
    // Obtener cita actualizada
    const updatedAppointment = await Appointment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Manicurist,
          as: 'manicurist',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'phone']
            }
          ]
        },
        {
          model: Service,
          as: 'service'
        },
        {
          model: NailStyle,
          as: 'nailStyle'
        },
        {
          model: Payment,
          as: 'payment'
        }
      ]
    });
    
    return res.status(200).json({
      message: 'Cita actualizada exitosamente',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('Error al actualizar cita:', error);
    return res.status(500).json({ error: 'Error al actualizar cita' });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Verificar estados válidos
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado de cita no válido' });
    }
    
    // Verificar si la cita existe
    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'client'
        },
        {
          model: Manicurist,
          as: 'manicurist',
          include: [
            {
              model: User,
              as: 'user'
            }
          ]
        },
        {
          model: Service,
          as: 'service'
        }
      ]
    });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'superadmin') {
      // Cliente solo puede cancelar sus propias citas
      if (req.user.role === 'client') {
        if (appointment.clientId !== req.user.id) {
          return res.status(403).json({
            error: 'No tienes permiso para actualizar esta cita'
          });
        }
        
        // Cliente solo puede cancelar
        if (status !== 'cancelled') {
          return res.status(403).json({
            error: 'Solo puedes cancelar la cita, no cambiar a otros estados'
          });
        }
      } 
      // Manicurista puede actualizar sus citas
      else if (req.user.role === 'manicurist') {
        const manicurist = await Manicurist.findOne({
          where: { userId: req.user.id }
        });
        
        if (!manicurist || manicurist.id !== appointment.manicuristId) {
          return res.status(403).json({
            error: 'No tienes permiso para actualizar esta cita'
          });
        }
      }
    }
    
    // Actualizar el estado
    await appointment.update({ status });
    
    // Si se completa la cita, actualizar rating del manicurista
    if (status === 'completed' && appointment.status !== 'completed') {
      await updateManicuristRating(appointment.manicuristId);
    }
    
    // Enviar notificaciones según el nuevo estado
    if (status === 'confirmed') {
      // Notificar al cliente
      await notificationService.sendAppointmentConfirmationEmail(
        appointment.client.email,
        {
          appointment: {
            ...appointment.toJSON(),
            status: 'confirmed'
          },
          client: appointment.client,
          service: appointment.service,
          manicurist: appointment.manicurist
        }
      );
      
      // También enviar WhatsApp si está disponible
      await notificationService.sendAppointmentConfirmationWhatsapp(
        appointment.client.phone,
        {
          appointment: {
            ...appointment.toJSON(),
            status: 'confirmed'
          },
          client: appointment.client,
          service: appointment.service,
          manicurist: appointment.manicurist
        }
      );
    } else if (status === 'cancelled') {
      // Notificar al cliente y al manicurista
      await notificationService.sendAppointmentCancellationEmail(
        appointment.client.email,
        {
          appointment: {
            ...appointment.toJSON(),
            status: 'cancelled'
          },
          client: appointment.client,
          service: appointment.service,
          manicurist: appointment.manicurist
        }
      );
      
      await notificationService.sendAppointmentCancellationEmail(
        appointment.manicurist.user.email,
        {
          appointment: {
            ...appointment.toJSON(),
            status: 'cancelled'
          },
          client: appointment.client,
          service: appointment.service,
          manicurist: appointment.manicurist
        }
      );
      
      // También enviar WhatsApp si está disponible
      await notificationService.sendAppointmentCancellationWhatsapp(
        appointment.client.phone,
        {
          appointment: {
            ...appointment.toJSON(),
            status: 'cancelled'
          },
          client: appointment.client,
          service: appointment.service,
          manicurist: appointment.manicurist
        }
      );
    }
    
    return res.status(200).json({
      message: `Estado de cita actualizado a "${status}" exitosamente`,
      status
    });
  } catch (error) {
    console.error('Error al actualizar estado de cita:', error);
    return res.status(500).json({ error: 'Error al actualizar estado de cita' });
  }
};

exports.rateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    
    // Validar calificación
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'La calificación debe estar entre 1 y 5' });
    }
    
    // Verificar si la cita existe
    const appointment = await Appointment.findByPk(id);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    // Verificar si la cita está completada
    if (appointment.status !== 'completed') {
      return res.status(400).json({ error: 'Solo se pueden calificar citas completadas' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'superadmin' && appointment.clientId !== req.user.id) {
      return res.status(403).json({
        error: 'No tienes permiso para calificar esta cita'
      });
    }
    
    // Actualizar la cita con la calificación
    await appointment.update({
      clientRating: rating,
      clientReview: review
    });
    
    // Actualizar el rating promedio del manicurista
    await updateManicuristRating(appointment.manicuristId);
    
    return res.status(200).json({
      message: 'Cita calificada exitosamente',
      rating,
      review
    });
  } catch (error) {
    console.error('Error al calificar cita:', error);
    return res.status(500).json({ error: 'Error al calificar cita' });
  }
};

exports.addManicuristNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    
    // Verificar si la cita existe
    const appointment = await Appointment.findByPk(id);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'superadmin' && req.user.role !== 'manicurist') {
      return res.status(403).json({
        error: 'No tienes permiso para añadir notas'
      });
    }
    
    // Si es manicurista, verificar que sea la manicurista de la cita
    if (req.user.role === 'manicurist') {
      const manicurist = await Manicurist.findOne({
        where: { userId: req.user.id }
      });
      
      if (!manicurist || manicurist.id !== appointment.manicuristId) {
        return res.status(403).json({
          error: 'No tienes permiso para añadir notas a esta cita'
        });
      }
    }
    
    // Actualizar la cita con la nota
    await appointment.update({ manicuristNote: note });
    
    return res.status(200).json({
      message: 'Nota añadida exitosamente'
    });
  } catch (error) {
    console.error('Error al añadir nota:', error);
    return res.status(500).json({ error: 'Error al añadir nota' });
  }
};

exports.sendAppointmentReminder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si la cita existe
    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'client'
        },
        {
          model: Manicurist,
          as: 'manicurist',
          include: [
            {
              model: User,
              as: 'user'
            }
          ]
        },
        {
          model: Service,
          as: 'service'
        }
      ]
    });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'superadmin' && req.user.role !== 'manicurist') {
      return res.status(403).json({
        error: 'No tienes permiso para enviar recordatorios'
      });
    }
    
    // Si es manicurista, verificar que sea la manicurista de la cita
    if (req.user.role === 'manicurist') {
      const manicurist = await Manicurist.findOne({
        where: { userId: req.user.id }
      });
      
      if (!manicurist || manicurist.id !== appointment.manicuristId) {
        return res.status(403).json({
          error: 'No tienes permiso para enviar recordatorios para esta cita'
        });
      }
    }
    
    // Verificar si la cita está confirmada
    if (appointment.status !== 'confirmed') {
      return res.status(400).json({ error: 'Solo se pueden enviar recordatorios para citas confirmadas' });
    }
    
    // Verificar si la cita es en el futuro
    const appointmentDate = moment(`${appointment.date} ${appointment.startTime}`);
    if (appointmentDate.isBefore(moment())) {
      return res.status(400).json({ error: 'No se pueden enviar recordatorios para citas pasadas' });
    }
    
    // Enviar recordatorio por correo
    await notificationService.sendAppointmentReminderEmail(
      appointment.client.email,
      {
        appointment,
        client: appointment.client,
        service: appointment.service,
        manicurist: appointment.manicurist
      }
    );
    
    // Enviar recordatorio por WhatsApp si está disponible
    if (appointment.client.phone) {
      await notificationService.sendAppointmentReminderWhatsapp(
        appointment.client.phone,
        {
          appointment,
          client: appointment.client,
          service: appointment.service,
          manicurist: appointment.manicurist
        }
      );
    }
    
    // Actualizar estado de recordatorio
    await appointment.update({ reminderSent: true });
    
    return res.status(200).json({
      message: 'Recordatorio enviado exitosamente'
    });
  } catch (error) {
    console.error('Error al enviar recordatorio:', error);
    return res.status(500).json({ error: 'Error al enviar recordatorio' });
  }
};

// Función auxiliar para actualizar el rating promedio del manicurista
async function updateManicuristRating(manicuristId) {
  try {
    // Calcular promedio de calificaciones
    const result = await Appointment.findAll({
      where: {
        manicuristId,
        status: 'completed',
        clientRating: {
          [Op.not]: null
        }
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('clientRating')), 'avgRating'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'reviewCount']
      ]
    });
    
    if (result && result.length > 0) {
      const avgRating = parseFloat(result[0].get('avgRating')) || 0;
      const reviewCount = parseInt(result[0].get('reviewCount')) || 0;
      
      // Actualizar manicurista
      await Manicurist.update(
        {
          rating: avgRating,
          reviewCount
        },
        {
          where: { id: manicuristId }
        }
      );
    }
  } catch (error) {
    console.error('Error al actualizar rating de manicurista:', error);
    throw error;
  }
}