// seeders/seedData.js
const bcrypt = require('bcryptjs');
const { sequelize, User, Service } = require('../src/models');

const seedData = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida para sembrar datos.');
    
    // Sincronizar modelos (eliminar tablas existentes y recrearlas)
    await sequelize.sync({ force: true });
    console.log('Base de datos sincronizada. Todas las tablas han sido recreadas.');
    
    // Crear usuario superadmin
    console.log('Creando usuario superadmin...');
    
    // Ya no hacemos el hash manualmente para evitar el doble hashing
    // El hook beforeCreate se encargará de hashear la contraseña
    
    // Superadmin
    await User.create({
      username: 'admin',
      email: 'admin@cygostudio.com',
      password: 'CygoAdmin2025', // Pasar contraseña en texto plano
      name: 'Administrador',
      phone: '+50212345678',
      role: 'superadmin',
      active: true
    });
    
    // Crear servicios base
    console.log('Creando servicios base...');
    
    await Service.create({
      name: 'Manicure tradicional',
      description: 'Tratamiento completo para manos que incluye limado, cutículas y esmalte tradicional.',
      price: 150.00,
      duration: 45,
      active: true,
      category: 'básico'
    });
    
    await Service.create({
      name: 'Uñas acrílicas',
      description: 'Extensiones de uñas acrílicas con forma y longitud personalizada.',
      price: 300.00,
      duration: 90,
      active: true,
      category: 'extensiones'
    });
    
    await Service.create({
      name: 'Uñas de gel',
      description: 'Aplicación de gel de alta duración sobre uñas naturales o extensiones.',
      price: 280.00,
      duration: 75,
      active: true,
      category: 'extensiones'
    });
    
    console.log('¡Datos iniciales sembrados exitosamente!');
    
    // Información de acceso
    console.log('\nCredenciales de acceso:');
    console.log('Superadmin: admin@cygostudio.com / CygoAdmin2025');
    
  } catch (error) {
    console.error('Error al sembrar datos:', error);
  } finally {
    // Cerrar conexión
    await sequelize.close();
    console.log('Conexión cerrada.');
  }
};

// Ejecutar la función de siembra
seedData();