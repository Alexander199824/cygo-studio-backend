const emailService = require('./emailService');
const whatsappService = require('./whatsappService');

// Reexportar métodos para correo
exports.sendAppointmentConfirmationEmail = emailService.sendAppointmentConfirmationEmail;
exports.sendAppointmentCancellationEmail = emailService.sendAppointmentCancellationEmail;
exports.sendAppointmentReminderEmail = emailService.sendAppointmentReminderEmail;
exports.sendNewAppointmentEmail = emailService.sendNewAppointmentEmail;

// Reexportar métodos para WhatsApp
exports.sendAppointmentConfirmationWhatsapp = whatsappService.sendAppointmentConfirmationWhatsapp;
exports.sendAppointmentCancellationWhatsapp = whatsappService.sendAppointmentCancellationWhatsapp;
exports.sendAppointmentReminderWhatsapp = whatsappService.sendAppointmentReminderWhatsapp;

// Programar recordatorios automáticos (se llamaría desde un cron job)
exports.scheduleAppointmentReminders = async () => {
  try {
    const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
    
    // Buscar citas para mañana
    const appointments = await Appointment.findAll({
      where: {
        date: tomorrow,
        status: 'confirmed',
        reminderSent: false
      },
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
    
    // Enviar recordatorios
    const results = await Promise.all(
      appointments.map(async (appointment) => {
        try {
          // Enviar correo
          await emailService.sendAppointmentReminderEmail(
            appointment.client.email,
            {
              appointment,
              client: appointment.client,
              service: appointment.service,
              manicurist: appointment.manicurist
            }
          );
          
          // Enviar WhatsApp si hay número
          if (appointment.client.phone) {
            await whatsappService.sendAppointmentReminderWhatsapp(
              appointment.client.phone,
              {
                appointment,
                client: appointment.client,
                service: appointment.service,
                manicurist: appointment.manicurist
              }
            );
          }
          
          // Marcar como enviado
          await appointment.update({ reminderSent: true });
          
          return {
            id: appointment.id,
            client: appointment.client.name,
            success: true
          };
        } catch (error) {
          console.error(`Error al enviar recordatorio para cita ${appointment.id}:`, error);
          
          return {
            id: appointment.id,
            client: appointment.client.name,
            success: false,
            error: error.message
          };
        }
      })
    );
    
    return {
      total: appointments.length,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      details: results
    };
  } catch (error) {
    console.error('Error al programar recordatorios:', error);
    throw error;
  }
};