const express = require('express');
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Rutas públicas
router.post('/webhook/pagadito', paymentController.handlePagaditoWebhook);

// Rutas protegidas
router.use(authenticate);

router.post('/', paymentController.createPayment);
router.get('/appointment/:appointmentId', paymentController.getPaymentByAppointment);
router.patch('/:id/status', paymentController.updatePaymentStatus);

module.exports = router;