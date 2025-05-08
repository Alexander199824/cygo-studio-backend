const { Payment, Appointment, User, Manicurist, Service } = require('../models');
const paymentService = require('../services/paymentService');
const { validatePaymentCreate } = require('../utils/validators');

exports.createPayment = async (req, res) => {
  try {
    // Validar datos
    const { error } = validatePaymentCreate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const { appointmentId, method, transferDetails } = req.body;
    
    // Verificar si la cita existe
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        {
          model: User,
          as: 'client'
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
    if (req.user.role !== 'superadmin' && appointment.clientId !== req.user.id) {
      return res.status(403).json({
        error: 'No tienes permiso para crear un pago para esta cita'
      });
    }
    
    // Verificar si ya existe un pago pendiente
    const existingPayment = await Payment.findOne({
      where: {
        appointmentId,
        status: 'pending'
      }
    });
    
    if (existingPayment) {
      return res.status(400).json({
        error: 'Ya existe un pago pendiente para esta cita'
      });
    }
    
    // Procesar pago según el método
    let payment;
    let redirectUrl;
    
    switch (method) {
      case 'card':
        const result = await paymentService.processCardPayment(appointmentId);
        payment = result.payment;
        redirectUrl = result.redirectUrl;
        break;
      case 'transfer':
        payment = await paymentService.processTransferPayment(appointmentId, transferDetails);
        break;
      case 'cash':
        payment = await paymentService.processCashPayment(appointmentId);
        break;
      default:
        return res.status(400).json({ error: 'Método de pago no válido' });
    }
    
    return res.status(201).json({
      message: 'Pago iniciado exitosamente',
      payment,
      redirectUrl
    });
  } catch (error) {
    console.error('Error al crear pago:', error);
    return res.status(500).json({ error: 'Error al procesar el pago' });
  }
};

exports.getPaymentByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    // Verificar si la cita existe
    const appointment = await Appointment.findByPk(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'superadmin' && 
        req.user.role !== 'manicurist' && 
        appointment.clientId !== req.user.id) {
      
      // Si es manicurista, verificar que sea el de la cita
      if (req.user.role === 'manicurist') {
        const userManicurist = await Manicurist.findOne({
          where: { userId: req.user.id }
        });
        
        if (!userManicurist || userManicurist.id !== appointment.manicuristId) {
          return res.status(403).json({
            error: 'No tienes permiso para ver este pago'
          });
        }
      } else {
        return res.status(403).json({
          error: 'No tienes permiso para ver este pago'
        });
      }
    }
    
    // Obtener pagos de la cita
    const payments = await Payment.findAll({
      where: { appointmentId },
      order: [['createdAt', 'DESC']]
    });
    
    return res.status(200).json({ payments });
  } catch (error) {
    console.error('Error al obtener pago:', error);
    return res.status(500).json({ error: 'Error al obtener información de pago' });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    // Solo superadmin puede actualizar pagos manualmente
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        error: 'No tienes permiso para realizar esta acción'
      });
    }
    
    const { id } = req.params;
    const { status } = req.body;
    
    // Verificar estados válidos
    const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado de pago no válido' });
    }
    
    // Buscar el pago
    const payment = await Payment.findByPk(id);
    
    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    
    // Actualizar estado
    await payment.update({ status });
    
    // Si se completa el pago, actualizar la cita
    if (status === 'completed') {
      await Appointment.update(
        { status: 'confirmed' },
        { where: { id: payment.appointmentId } }
      );
    }
    
    return res.status(200).json({
      message: 'Estado de pago actualizado exitosamente',
      payment
    });
  } catch (error) {
    console.error('Error al actualizar estado de pago:', error);
    return res.status(500).json({ error: 'Error al actualizar estado de pago' });
  }
};

exports.handlePagaditoWebhook = async (req, res) => {
  try {
    const result = await paymentService.handlePagaditoWebhook(req.body);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error en webhook de Pagadito:', error);
    return res.status(500).json({ error: 'Error al procesar webhook' });
  }
};