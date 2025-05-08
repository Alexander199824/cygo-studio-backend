const moment = require('moment');

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// Formato de fecha
const formatDate = (date) => moment(date).format('DD/MM/YYYY');
const formatTime = (time) => moment(time, 'HH:mm:ss').format('h:mm A');

// Inicialización condicional del cliente de Twilio
let twilioClient = null;
let twilioEnabled = false;

try {
  if (accountSid && authToken) {
    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
    twilioEnabled = true;
    console.log('Servicio de WhatsApp configurado correctamente');
  } else {
    console.log('Las credenciales de Twilio no están configuradas. Servicio de WhatsApp deshabilitado.');
  }
} catch (error) {
  console.error('Error al inicializar el cliente de Twilio:', error);
  console.log('Servicio de WhatsApp deshabilitado debido a errores de configuración.');
}

// Función helper para verificar si se puede usar Twilio
function canUseTwilio() {
  if (!twilioEnabled) {
    console.log('Solicitud de WhatsApp ignorada - Twilio no está configurado');
    return false;
  }
  return true;
}

// Enviar mensaje de WhatsApp para confirmación de cita
exports.sendAppointmentConfirmationWhatsapp = async (to, data) => {
  try {
    if (!canUseTwilio()) {
      return { success: false, message: 'Twilio no está configurado' };
    }

    // Verificar si el número tiene el formato correcto
    if (!to || !to.startsWith('+')) {
      console.warn('Número de WhatsApp no válido:', to);
      return { success: false, message: 'Número no válido' };
    }
    
    const { appointment, client, service, manicurist } = data;
    
    const message = await twilioClient.messages.create({
      from: `whatsapp:${twilioNumber}`,
      to: `whatsapp:${to}`,
      body: `¡Cita Confirmada! 👍

Hola ${client.name},

Tu cita en Cygo Studio ha sido confirmada:

📅 Fecha: ${formatDate(appointment.date)}
⏰ Hora: ${formatTime(appointment.startTime)}
💅 Servicio: ${service.name}
👩‍🎨 Manicurista: ${manicurist.user.name}
💲 Precio: Q${appointment.price}

Por favor, llega 5 minutos antes de tu cita. Para cancelar o reprogramar, hazlo con al menos 24 horas de anticipación.

Gracias por elegirnos. ¡Te esperamos!`
    });
    
    return { success: true, message };
  } catch (error) {
    console.error('Error al enviar mensaje de WhatsApp de confirmación:', error);
    return { success: false, error: error.message };
  }
};

// Enviar mensaje de WhatsApp para cancelación de cita
exports.sendAppointmentCancellationWhatsapp = async (to, data) => {
  try {
    if (!canUseTwilio()) {
      return { success: false, message: 'Twilio no está configurado' };
    }
    
    // Verificar si el número tiene el formato correcto
    if (!to || !to.startsWith('+')) {
      console.warn('Número de WhatsApp no válido:', to);
      return { success: false, message: 'Número no válido' };
    }
    
    const { appointment, client, service, manicurist } = data;
    
    const message = await twilioClient.messages.create({
      from: `whatsapp:${twilioNumber}`,
      to: `whatsapp:${to}`,
      body: `Cita Cancelada ❌

Hola ${client.name},

Tu cita en Cygo Studio ha sido cancelada:

📅 Fecha: ${formatDate(appointment.date)}
⏰ Hora: ${formatTime(appointment.startTime)}
💅 Servicio: ${service.name}
👩‍🎨 Manicurista: ${manicurist.user.name}

Si deseas reprogramar, por favor visita nuestra plataforma o contáctanos directamente.

Lamentamos los inconvenientes. ¡Esperamos verte pronto!`
    });
    
    return { success: true, message };
  } catch (error) {
    console.error('Error al enviar mensaje de WhatsApp de cancelación:', error);
    return { success: false, error: error.message };
  }
};

// Enviar mensaje de WhatsApp para recordatorio de cita
exports.sendAppointmentReminderWhatsapp = async (to, data) => {
  try {
    if (!canUseTwilio()) {
      return { success: false, message: 'Twilio no está configurado' };
    }
    
    // Verificar si el número tiene el formato correcto
    if (!to || !to.startsWith('+')) {
      console.warn('Número de WhatsApp no válido:', to);
      return { success: false, message: 'Número no válido' };
    }
    
    const { appointment, client, service, manicurist } = data;
    
    const message = await twilioClient.messages.create({
      from: `whatsapp:${twilioNumber}`,
      to: `whatsapp:${to}`,
      body: `¡Recordatorio de Cita! ⏰

Hola ${client.name},

Te recordamos que tienes una cita programada en Cygo Studio:

📅 Fecha: ${formatDate(appointment.date)}
⏰ Hora: ${formatTime(appointment.startTime)}
💅 Servicio: ${service.name}
👩‍🎨 Manicurista: ${manicurist.user.name}
💲 Precio: Q${appointment.price}

Por favor, llega 5 minutos antes de tu cita. Para cancelar o reprogramar, hazlo con al menos 24 horas de anticipación.

¡Te esperamos!`
    });
    
    return { success: true, message };
  } catch (error) {
    console.error('Error al enviar mensaje de WhatsApp de recordatorio:', error);
    return { success: false, error: error.message };
  }
};