const express = require('express');
const availabilityController = require('../controllers/availabilityController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Rutas públicas
router.get('/manicurist/:manicuristId', availabilityController.getManicuristAvailability);

// Rutas protegidas
router.use(authenticate);

router.post('/', availabilityController.createAvailability);
router.put('/:id', availabilityController.updateAvailability);
router.delete('/:id', availabilityController.deleteAvailability);

module.exports = router;