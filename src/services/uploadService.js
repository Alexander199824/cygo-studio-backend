const axios = require('axios');
const { Payment, Appointment, Service, User, Manicurist, sequelize } = require('../models');
const moment = require('moment');

// Configuración para Pagadito
const PAGADITO_UID = process.env.PAGADITO_UID;
const PAGADITO_WSK = process.env.PAGADITO_WSK;
const PAGADITO_URL = process.env.NODE_ENV === 'production' 
  ? 'https://secure.pagadito.com/api'
  : 'https://sandbox.pagadito.com/api';

// Función para conectarse a Pagadito
async function connectToPagadito() {
  try {
    const response = await axios.post(`${PAGADITO_URL}/connect`, {
      uid: PAGADITO_UID,
      wsk: PAGADITO_WSK
    });
    
    if (response.data.status === 'ok') {
      return response.data.token;
    } else {
      throw new Error(`Error al conectar con Pagadito: ${response.data.message}`);
    }
  } catch (error) {
    console.error('Error al conectar con Pagadito:', error);
    throw error;
  }
}

// Función para crear transacción en Pagadito
async function createPagaditoTransaction(appointment) {
  try {
    const token = await connectToPagadito();
    
    const response = await axios.post(`${PAGADITO_URL}/exec_trans`, {
      token,
      details: [
        {
          quantity: 1,
          description: `Cita de ${appointment.service.name} con ${appointment.manicurist.user.name}`,
          price: appointment.price.toString(),
          subtotal: appointment.price.toString()
        }
      ],
      custom_params: {
        appointmentId: appointment.id
      },
      currency: 'GTQ',
      format_date: 'es_GT',
      expires_at: '1d'
    });
    
    if (response.data.status === 'ok') {
      return {
        transactionId: response.data.reference,
        redirectUrl: response.data.exec_trans_url
      };
    } else {
      throw new Error(`Error al crear transacción: ${response.data.message}`);
    }
  } catch (error) {
    console.error('Error al crear transacción en Pagadito:', error);
    throw error;
  }
}

// Función para verificar estado de transacción
async function verifyTransaction(transactionId) {
  try {
    const token = await connectToPagadito();
    
    const response = await axios.post(`${PAGADITO_URL}/get_status`, {
      token,
      reference: transactionId
    });
    
    if (response.data.status === 'ok') {
      return {
        status: response.data.transaction.status,
        details: response.data.transaction
      };
    } else {
      throw new Error(`Error al verificar transacción: ${response.data.message}`);
    }
  } catch (error) {
    console.error('Error al verificar transacción:', error);
    throw error;
  }
}

// Función para procesar pago con tarjeta
exports.processCardPayment = async (appointmentId) => {
  try {
    // Obtener la cita con sus relaciones
    const appointment = await Appointment.findByPk(appointmentId, {
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
              as: 'user'
            }
          ]
        }
      ]
    });
    
    if (!appointment) {
      throw new Error('Cita no encontrada');
    }
    
    // Crear transacción en Pagadito
    const transaction = await createPagaditoTransaction(appointment);
    
    // Crear registro de pago
    const payment = await Payment.create({
      appointmentId,
      amount: appointment.price,
      method: 'card',
      status: 'pending',
      transactionId: transaction.transactionId,
      gatewayResponse: transaction
    });
    
    return {
      payment,
      redirectUrl: transaction.redirectUrl
    };
  } catch (error) {
    console.error('Error al procesar pago con tarjeta:', error);
    throw error;
  }
};

// Función para procesar pago por transferencia
exports.processTransferPayment = async (appointmentId, transferDetails) => {
  try {
    // Obtener la cita
    const appointment = await Appointment.findByPk(appointmentId);
    
    if (!appointment) {
      throw new Error('Cita no encontrada');
    }
    
    // Crear registro de pago
    const payment = await Payment.create({
      appointmentId,
      amount: appointment.price,
      method: 'transfer',
      status: 'pending',
      gatewayResponse: transferDetails
    });
    
    return payment;
  } catch (error) {
    console.error('Error al procesar pago por transferencia:', error);
    throw error;
  }
};

// Función para procesar pago en efectivo
exports.processCashPayment = async (appointmentId) => {
  try {
    // Obtener la cita
    const appointment = await Appointment.findByPk(appointmentId);
    
    if (!appointment) {
      throw new Error('Cita no encontrada');
    }
    
    // Crear registro de pago
    const payment = await Payment.create({
      appointmentId,
      amount: appointment.price,
      method: 'cash',
      status: 'pending'
    });
    
    return payment;
  } catch (error) {
    console.error('Error al procesar pago en efectivo:', error);
    throw error;
  }
};

// Función para actualizar estado de pago
exports.updatePaymentStatus = async (transactionId, status, details = {}) => {
  try {
    const payment = await Payment.findOne({
      where: { transactionId }
    });
    
    if (!payment) {
      throw new Error('Pago no encontrado');
    }
    
    await payment.update({
      status,
      gatewayResponse: { ...payment.gatewayResponse, ...details }
    });
    
    // Si el pago se completa, actualizar estado de la cita
    if (status === 'completed') {
      await Appointment.update(
        { status: 'confirmed' },
        { where: { id: payment.appointmentId } }
      );
    }
    
    return payment;
  } catch (error) {
    console.error('Error al actualizar estado de pago:', error);
    throw error;
  }
};

// Función webhook para Pagadito
exports.handlePagaditoWebhook = async (payload) => {
  try {
    const { reference, status } = payload;
    
    // Mapear estados de Pagadito a nuestros estados
    let paymentStatus;
    switch (status) {
      case 'COMPLETED':
        paymentStatus = 'completed';
        break;
      case 'PENDING':
        paymentStatus = 'pending';
        break;
      case 'FAILED':
        paymentStatus = 'failed';
        break;
      case 'REFUNDED':
        paymentStatus = 'refunded';
        break;
      default:
        paymentStatus = 'pending';
    }
    
    // Actualizar estado de pago
    await this.updatePaymentStatus(reference, paymentStatus, payload);
    
    return { success: true };
  } catch (error) {
    console.error('Error en webhook de Pagadito:', error);
    throw error;
  }
};