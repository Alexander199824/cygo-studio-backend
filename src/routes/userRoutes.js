const express = require('express');
const multer = require('multer');
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Configuración de multer para carga de imágenes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// Todas las rutas requieren autenticación
router.use(authenticate);

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
// Nueva ruta para obtener la imagen de perfil
router.get('/:id/profile-image', userController.getUserProfileImage);
router.put('/:id', upload.single('profileImage'), userController.updateUser);
router.patch('/:id/status', authorize('superadmin'), userController.toggleUserStatus);
router.patch('/:id/role', authorize('superadmin'), userController.changeUserRole);

module.exports = router;