const { EstablishmentReview, User } = require('../models');
const { validateReviewCreate } = require('../utils/validators');

exports.getAllReviews = async (req, res) => {
  try {
    // Parámetros de filtrado
    const { approved, clientId } = req.query;
    let whereClause = {};
    
    if (approved !== undefined) {
      whereClause.approved = approved === 'true';
    }
    
    if (clientId) {
      whereClause.clientId = clientId;
    }
    
    // Obtener reseñas
    const reviews = await EstablishmentReview.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'name', 'profileImage']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    return res.status(200).json({ reviews });
  } catch (error) {
    console.error('Error al obtener reseñas:', error);
    return res.status(500).json({ error: 'Error al obtener reseñas' });
  }
};

exports.getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const review = await EstablishmentReview.findByPk(id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'name', 'profileImage']
        }
      ]
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Reseña no encontrada' });
    }
    
    return res.status(200).json({ review });
  } catch (error) {
    console.error('Error al obtener reseña:', error);
    return res.status(500).json({ error: 'Error al obtener reseña' });
  }
};

exports.createReview = async (req, res) => {
  try {
    // Validar datos
    const { error } = validateReviewCreate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const { rating, review } = req.body;
    
    // Solo clientes pueden crear reseñas
    if (req.user.role !== 'client') {
      return res.status(403).json({
        error: 'Solo los clientes pueden crear reseñas'
      });
    }
    
    // Verificar si el cliente ya ha creado una reseña
    const existingReview = await EstablishmentReview.findOne({
      where: { clientId: req.user.id }
    });
    
    if (existingReview) {
      return res.status(400).json({ error: 'Ya has creado una reseña del establecimiento' });
    }
    
    // Crear reseña
    const newReview = await EstablishmentReview.create({
      clientId: req.user.id,
      rating,
      review,
      approved: false // Las reseñas requieren aprobación por defecto
    });
    
    // Obtener reseña con relaciones
    const createdReview = await EstablishmentReview.findByPk(newReview.id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'name', 'profileImage']
        }
      ]
    });
    
    return res.status(201).json({
      message: 'Reseña creada exitosamente, pendiente de aprobación',
      review: createdReview
    });
  } catch (error) {
    console.error('Error al crear reseña:', error);
    return res.status(500).json({ error: 'Error al crear reseña' });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    
    // Verificar si la reseña existe
    const existingReview = await EstablishmentReview.findByPk(id);
    
    if (!existingReview) {
      return res.status(404).json({ error: 'Reseña no encontrada' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'superadmin' && existingReview.clientId !== req.user.id) {
      return res.status(403).json({
        error: 'No tienes permiso para actualizar esta reseña'
      });
    }
    
    // Preparar datos para actualización
    const updateData = {};
    if (rating !== undefined) updateData.rating = rating;
    if (review !== undefined) updateData.review = review;
    
    // Si el cliente está actualizando, marcar como no aprobada
    if (req.user.role === 'client') {
      updateData.approved = false;
    }
    
    // Actualizar reseña
    await existingReview.update(updateData);
    
    // Obtener reseña actualizada
    const updatedReview = await EstablishmentReview.findByPk(id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'name', 'profileImage']
        }
      ]
    });
    
    return res.status(200).json({
      message: 'Reseña actualizada exitosamente',
      review: updatedReview
    });
  } catch (error) {
    console.error('Error al actualizar reseña:', error);
    return res.status(500).json({ error: 'Error al actualizar reseña' });
  }
};

exports.toggleReviewApproval = async (req, res) => {
  try {
    // Solo superadmin puede aprobar/desaprobar reseñas
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        error: 'No tienes permiso para realizar esta acción'
      });
    }
    
    const { id } = req.params;
    
    // Verificar si la reseña existe
    const review = await EstablishmentReview.findByPk(id);
    
    if (!review) {
      return res.status(404).json({ error: 'Reseña no encontrada' });
    }
    
    // Cambiar estado de aprobación
    await review.update({ approved: !review.approved });
    
    return res.status(200).json({
      message: `Reseña ${review.approved ? 'aprobada' : 'desaprobada'} exitosamente`,
      approved: review.approved
    });
  } catch (error) {
    console.error('Error al cambiar aprobación de reseña:', error);
    return res.status(500).json({ error: 'Error al cambiar aprobación de reseña' });
  }
};