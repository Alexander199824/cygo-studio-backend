require('dotenv').config();
const { app, initializeDatabase } = require('./app');

const PORT = process.env.PORT || 3000;

// Inicializar base de datos y luego iniciar servidor
initializeDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`Ambiente: ${process.env.NODE_ENV}`);
    });
  })
  .catch(error => {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  });