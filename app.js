require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs'); // Importamos bcryptjs
const { sequelize, User, Service, ManicuristService, Manicurist } = require('./src/models'); // Importar todos los modelos necesarios

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

// Función para verificar si las tablas existen
const checkTablesExist = async () => {
  try {
    // Consultar la base de datos para ver si existe la tabla Users (como ejemplo)
    const result = await sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Users')",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    // Convertir el resultado a booleano
    return result[0] && result[0].exists;
  } catch (error) {
    console.error('Error al verificar tablas:', error);
    return false;
  }
};

// Función para verificar si existe el usuario superadmin
const checkSuperadminExists = async () => {
  try {
    const count = await User.count({
      where: {
        role: 'superadmin'
      }
    });
    return count > 0;
  } catch (error) {
    console.error('Error al verificar superadmin:', error);
    return false;
  }
};

// Función para verificar si existe la tabla ManicuristServices con la columna price
const checkManicuristServicesWithPrice = async () => {
  try {
    // Consulta para verificar si existe la columna price en la tabla ManicuristServices
    const result = await sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'ManicuristServices' AND column_name = 'price')",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    // Convertir el resultado a booleano
    return result[0] && result[0].exists;
  } catch (error) {
    console.error('Error al verificar columna price en ManicuristServices:', error);
    return false;
  }
};

// Función para crear datos iniciales
const createInitialData = async () => {
  try {
    console.log('Verificando si existe usuario superadmin...');
    const superadminExists = await checkSuperadminExists();
    
    if (!superadminExists) {
      console.log('Creando usuario superadmin...');
      
      const saltRounds = 10;
      const defaultPassword = await bcrypt.hash('CygoAdmin2025', saltRounds);
      
      // Crear superadmin
      const admin = await User.create({
        username: 'admin',
        email: 'admin@cygostudio.com',
        password: defaultPassword,
        name: 'Administrador',
        phone: '+50212345678',
        role: 'superadmin',
        active: true
      });
      
      console.log('Creando servicios base...');
      
      // Crear servicios base
      const service1 = await Service.create({
        name: 'Manicure tradicional',
        description: 'Tratamiento completo para manos que incluye limado, cutículas y esmalte tradicional.',
        price: 150.00,
        duration: 45,
        active: true,
        category: 'básico'
      });
      
      const service2 = await Service.create({
        name: 'Uñas acrílicas',
        description: 'Extensiones de uñas acrílicas con forma y longitud personalizada.',
        price: 300.00,
        duration: 90,
        active: true,
        category: 'extensiones'
      });
      
      const service3 = await Service.create({
        name: 'Uñas de gel',
        description: 'Aplicación de gel de alta duración sobre uñas naturales o extensiones.',
        price: 280.00,
        duration: 75,
        active: true,
        category: 'extensiones'
      });
      
      // Verificar si existe el modelo de ManicuristService para crear relaciones de ejemplo
      if (typeof ManicuristService !== 'undefined') {
        console.log('Configurando relaciones de servicios para manicuristas...');
        
        // Crear un manicurista de ejemplo para el administrador
        const adminManicurist = await Manicurist.findOne({
          where: { userId: admin.id }
        });
        
        if (adminManicurist) {
          // Asignar servicios al manicurista con precios
          await ManicuristService.create({
            manicuristId: adminManicurist.id,
            serviceId: service1.id,
            price: service1.price
          });
          
          await ManicuristService.create({
            manicuristId: adminManicurist.id,
            serviceId: service2.id,
            price: service2.price
          });
          
          await ManicuristService.create({
            manicuristId: adminManicurist.id,
            serviceId: service3.id,
            price: service3.price
          });
        }
      }
      
      console.log('¡Datos iniciales creados exitosamente!');
      console.log('Credenciales de acceso:');
      console.log('Superadmin: admin@cygostudio.com / CygoAdmin2025');
    } else {
      console.log('El usuario superadmin ya existe, no es necesario crear datos iniciales.');
      
      // Verificar si la tabla ManicuristServices existe y tiene la columna price
      const hasPrice = await checkManicuristServicesWithPrice();
      if (!hasPrice) {
        console.log('La tabla ManicuristServices existe pero falta la columna price. Actualizando estructura...');
        // Esto se manejará con alterSync en la función initializeDatabase
      }
    }
  } catch (error) {
    console.error('Error al crear datos iniciales:', error);
    throw error;
  }
};

// Función para inicializar base de datos
const initializeDatabase = async () => {
  try {
    console.log('Verificando conexión a la base de datos...');
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida.');
    
    // Verificar si la tabla ManicuristServices existe y tiene la columna price
    const hasPrice = await checkManicuristServicesWithPrice();
    
    // Opciones de sincronización - MODIFICADAS PARA SOLUCIONAR EL PROBLEMA
    const forceSync = process.env.FORCE_SYNC === 'true';
    const alterSync = !hasPrice || process.env.SYNC_DB === 'true'; // Forzar alter si falta la columna price
    const isDev = process.env.NODE_ENV === 'development' || !hasPrice; // Considerar como dev si falta la columna
    
    // Verificar si las tablas existen
    const tablesExist = await checkTablesExist();
    
    // Estrategia de sincronización:
    if (forceSync) {
      // Reiniciar desde cero (¡CUIDADO! Borra todos los datos)
      console.log('FORCE_SYNC=true: Eliminando tablas existentes y recreándolas...');
      await sequelize.sync({ force: true });
      console.log('Base de datos reiniciada y modelos sincronizados.');
      
      // Crear datos iniciales después de forzar sincronización
      await createInitialData();
    } else if (alterSync) {
      // Modo desarrollo con sincronización activa O falta la columna price
      if (!hasPrice) {
        console.log('Falta la columna price en ManicuristServices. Actualizando estructura de tablas...');
      } else {
        console.log('Modo desarrollo con SYNC_DB=true: Modificando estructura de tablas...');
      }
      await sequelize.sync({ alter: true });
      console.log('Modelos sincronizados con alter: true.');
      
      // Verificar y crear datos iniciales si es necesario
      await createInitialData();
    } else if (!tablesExist) {
      // Las tablas no existen, crearlas sin alterar (seguro en cualquier entorno)
      console.log('Las tablas no existen: Creando esquema inicial...');
      await sequelize.sync();
      console.log('Tablas iniciales creadas.');
      
      // Crear datos iniciales para nueva instalación
      await createInitialData();
    } else {
      console.log('Las tablas ya existen. No se realizó sincronización automática.');
      console.log('Para modificar la estructura use NODE_ENV=development SYNC_DB=true');
      console.log('Para reiniciar desde cero use FORCE_SYNC=true (¡CUIDADO! Borra datos)');
      
      // Verificar datos iniciales incluso si las tablas ya existen
      await createInitialData();
    }
    
    return true;
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
    throw error;
  }
};

module.exports = { app, initializeDatabase };