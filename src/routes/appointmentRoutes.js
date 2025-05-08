const express = require('express');
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

router.get('/', appointmentController.getAllAppointments);
router.get('/:id', appointmentController.getAppointmentById);
router.post('/', appointmentController.createAppointment);
router.put('/:id', appointmentController.updateAppointment);
router.patch('/:id/status', appointmentController.updateAppointmentStatus);
router.patch('/:id/rate', appointmentController.rateAppointment);
router.patch('/:id/manicurist-note', appointmentController.addManicuristNote);
router.post('/:id/send-reminder', appointmentController.sendAppointmentReminder);

module.exports = router;