require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { sequelize } = require('./src/models');

// Importar rutas
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const serviceRoutes = require('./src/routes/serviceRoutes');
const manicuristRoutes = require('./src/routes/manicuristRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const nailStyleRoutes = require('./src/routes/nailStyleRoutes');
const availabilityRoutes = require('./src/routes/availabilityRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');

// Inicializar app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/manicurists', manicuristRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/nail-styles', nailStyleRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.status(200).json({ message: 'API de Cygo Studio funcionando correctamente' });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Función para inicializar base de datos
const initializeDatabase = async () => {
  try {
    console.log('Verificando conexión a la base de datos...');
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida.');
    
    // En desarrollo, sincronizar modelos (opcional)
    if (process.env.NODE_ENV === 'development' && process.env.SYNC_DB === 'true') {
      console.log('Sincronizando modelos...');
      await sequelize.sync({ alter: true });
      console.log('Modelos sincronizados.');
    }
    
    return true;
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
    throw error;
  }
};

module.exports = { app, initializeDatabase };