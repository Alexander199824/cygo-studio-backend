const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configurar AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();

// Función para subir imagen
exports.uploadImage = async (file) => {
  try {
    if (!file) throw new Error('No se proporcionó ningún archivo');

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `uploads/${fileName}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read'
    };
    
    const result = await s3.upload(uploadParams).promise();
    
    return result.Location;
  } catch (error) {
    console.error('Error al subir imagen:', error);
    throw error;
  }
};

// Función para eliminar imagen
exports.deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    
    // Extraer Key del URL
    const key = imageUrl.split('/').slice(3).join('/');
    
    const deleteParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key
    };
    
    await s3.deleteObject(deleteParams).promise();
    
    return true;
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    throw error;
  }
};