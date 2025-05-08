const express = require('express');
const serviceController = require('../controllers/serviceController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Rutas públicas para ver servicios
router.get('/', serviceController.getAllServices);
router.get('/categories', serviceController.getServiceCategories);
router.get('/:id', serviceController.getServiceById);

// Rutas protegidas
router.use(authenticate);

router.post('/', authorize('superadmin'), serviceController.createService);
router.put('/:id', authorize('superadmin'), serviceController.updateService);
router.patch('/:id/status', authorize('superadmin'), serviceController.toggleServiceStatus);

module.exports = router;