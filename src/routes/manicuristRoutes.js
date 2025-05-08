const express = require('express');
const manicuristController = require('../controllers/manicuristController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Rutas públicas para ver manicuristas
router.get('/', manicuristController.getAllManicurists);
router.get('/:id', manicuristController.getManicuristById);
router.get('/:id/services', manicuristController.getManicuristServices);

// Rutas protegidas
router.use(authenticate);

router.put('/:id', manicuristController.updateManicurist);
router.patch('/:id/status', authorize('superadmin'), manicuristController.toggleManicuristStatus);
router.post('/:id/services', manicuristController.assignServiceToManicurist);
router.delete('/:id/services/:serviceId', manicuristController.removeServiceFromManicurist);

module.exports = router;