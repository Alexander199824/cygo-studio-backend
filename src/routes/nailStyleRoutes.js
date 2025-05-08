const express = require('express');
const multer = require('multer');
const nailStyleController = require('../controllers/nailStyleController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Configuración de multer para carga de imágenes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// Rutas públicas
router.get('/', nailStyleController.getAllNailStyles);
router.get('/categories', nailStyleController.getNailStyleCategories);
router.get('/:id', nailStyleController.getNailStyleById);

// Rutas protegidas
router.use(authenticate);

router.post('/', upload.single('image'), nailStyleController.createNailStyle);
router.put('/:id', upload.single('image'), nailStyleController.updateNailStyle);
router.patch('/:id/status', nailStyleController.toggleNailStyleStatus);

module.exports = router;