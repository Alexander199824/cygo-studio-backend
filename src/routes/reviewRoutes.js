const express = require('express');
const reviewController = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Rutas públicas para ver reseñas aprobadas
router.get('/', reviewController.getAllReviews);
router.get('/:id', reviewController.getReviewById);

// Rutas protegidas
router.use(authenticate);

router.post('/', reviewController.createReview);
router.put('/:id', reviewController.updateReview);
router.patch('/:id/approve', authorize('superadmin'), reviewController.toggleReviewApproval);

module.exports = router;