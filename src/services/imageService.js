const { Image } = require('../models');
const { v4: uuidv4 } = require('uuid');

// Método para subir una imagen a la base de datos
exports.uploadImage = async (file) => {
  try {
    if (!file) {
      throw new Error('No se proporcionó ningún archivo');
    }

    // Crear registro de imagen en la base de datos
    const image = await Image.create({
      id: uuidv4(),
      data: file.buffer,
      mimetype: file.mimetype,
      filename: file.originalname,
      size: file.size
    });
    
    return image.id; // Retornamos el ID de la imagen
  } catch (error) {
    console.error('Error al subir imagen a la base de datos:', error);
    throw error;
  }
};

// Método para obtener una imagen por su ID
exports.getImage = async (imageId) => {
  try {
    const image = await Image.findByPk(imageId);
    if (!image) {
      throw new Error('Imagen no encontrada');
    }
    return image;
  } catch (error) {
    console.error('Error al obtener imagen de la base de datos:', error);
    throw error;
  }
};

// Método para eliminar una imagen por su ID
exports.deleteImage = async (imageId) => {
  try {
    if (!imageId) return false;
    
    const result = await Image.destroy({
      where: { id: imageId }
    });
    
    return result > 0;
  } catch (error) {
    console.error('Error al eliminar imagen de la base de datos:', error);
    throw error;
  }
};

// Método para comprobar si una imagen existe
exports.imageExists = async (imageId) => {
  try {
    if (!imageId) return false;
    
    const count = await Image.count({
      where: { id: imageId }
    });
    
    return count > 0;
  } catch (error) {
    console.error('Error al verificar existencia de imagen:', error);
    return false;
  }
};