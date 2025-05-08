const nodemailer = require('nodemailer');
const moment = require('moment');

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Formato de fecha
const formatDate = (date) => moment(date).format('DD/MM/YYYY');
const formatTime = (time) => moment(time, 'HH:mm:ss').format('h:mm A');

// Enviar correo de confirmación de cita
exports.sendAppointmentConfirmationEmail = async (to, data) => {
  try {
    const { appointment, client, service, manicurist } = data;
    
    const mailOptions = {
      from: `"Cygo Studio" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Confirmación de cita - Cygo Studio',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1a385a; margin-bottom: 10px;">¡Cita Confirmada!</h1>
            <p style="color: #666; font-size: 16px;">Hola ${client.name}, tu cita ha sido confirmada.</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #1a385a; margin-top: 0;">Detalles de la Cita</h2>
            <p><strong>Fecha:</strong> ${formatDate(appointment.date)}</p>
            <p><strong>Hora:</strong> ${formatTime(appointment.startTime)}</p>
            <p><strong>Servicio:</strong> ${service.name}</p>
            <p><strong>Manicurista:</strong> ${manicurist.user.name}</p>
            <p><strong>Precio:</strong> Q${appointment.price}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #1a385a;">Recordatorio</h3>
            <p>Por favor, llegue 5 minutos antes de su cita. Si necesita cancelar o reprogramar, hágalo con al menos 24 horas de anticipación.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #888; font-size: 14px;">© 2025 Cygo Studio. Todos los derechos reservados.</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error al enviar correo de confirmación:', error);
    throw error;
  }
};

// Enviar correo de cancelación de cita
exports.sendAppointmentCancellationEmail = async (to, data) => {
  try {
    const { appointment, client, service, manicurist } = data;
    
    const mailOptions = {
      from: `"Cygo Studio" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Cancelación de cita - Cygo Studio',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1a385a; margin-bottom: 10px;">Cita Cancelada</h1>
            <p style="color: #666; font-size: 16px;">Hola ${client.name}, la cita ha sido cancelada.</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #1a385a; margin-top: 0;">Detalles de la Cita Cancelada</h2>
            <p><strong>Fecha:</strong> ${formatDate(appointment.date)}</p>
            <p><strong>Hora:</strong> ${formatTime(appointment.startTime)}</p>
            <p><strong>Servicio:</strong> ${service.name}</p>
            <p><strong>Manicurista:</strong> ${manicurist.user.name}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #1a385a;">¿Deseas reagendar?</h3>
            <p>Si deseas reprogramar tu cita, por favor visita nuestra plataforma o contáctanos directamente.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #888; font-size: 14px;">© 2025 Cygo Studio. Todos los derechos reservados.</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error al enviar correo de cancelación:', error);
    throw error;
  }
};

// Enviar correo de recordatorio de cita
exports.sendAppointmentReminderEmail = async (to, data) => {
  try {
    const { appointment, client, service, manicurist } = data;
    
    const mailOptions = {
      from: `"Cygo Studio" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Recordatorio de cita - Cygo Studio',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1a385a; margin-bottom: 10px;">¡Recordatorio de Cita!</h1>
            <p style="color: #666; font-size: 16px;">Hola ${client.name}, te recordamos que tienes una cita programada.</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #1a385a; margin-top: 0;">Detalles de la Cita</h2>
            <p><strong>Fecha:</strong> ${formatDate(appointment.date)}</p>
            <p><strong>Hora:</strong> ${formatTime(appointment.startTime)}</p>
            <p><strong>Servicio:</strong> ${service.name}</p>
            <p><strong>Manicurista:</strong> ${manicurist.user.name}</p>
            <p><strong>Precio:</strong> Q${appointment.price}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #1a385a;">Recordatorio</h3>
            <p>Por favor, llegue 5 minutos antes de su cita. Si necesita cancelar o reprogramar, hágalo con al menos 24 horas de anticipación.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #888; font-size: 14px;">© 2025 Cygo Studio. Todos los derechos reservados.</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error al enviar correo de recordatorio:', error);
    throw error;
  }
};

// Enviar correo de nueva cita
exports.sendNewAppointmentEmail = async (to, data) => {
  try {
    const { appointment, client, service, manicurist } = data;
    
    const mailOptions = {
      from: `"Cygo Studio" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Nueva cita programada - Cygo Studio',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1a385a; margin-bottom: 10px;">Nueva Cita Programada</h1>
            <p style="color: #666; font-size: 16px;">Hola ${manicurist.user.name}, tienes una nueva cita programada.</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #1a385a; margin-top: 0;">Detalles de la Cita</h2>
            <p><strong>Cliente:</strong> ${client.name}</p>
            <p><strong>Fecha:</strong> ${formatDate(appointment.date)}</p>
            <p><strong>Hora:</strong> ${formatTime(appointment.startTime)}</p>
            <p><strong>Servicio:</strong> ${service.name}</p>
            <p><strong>Precio:</strong> Q${appointment.price}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p>Inicia sesión en el sistema para ver más detalles y confirmar la cita.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #888; font-size: 14px;">© 2025 Cygo Studio. Todos los derechos reservados.</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error al enviar correo de nueva cita:', error);
    throw error;
  }
};