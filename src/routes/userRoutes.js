const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.patch('/:id/status', authorize('superadmin'), userController.toggleUserStatus);
router.patch('/:id/role', authenticate, authorize('superadmin'), userController.changeUserRole);

module.exports = router;