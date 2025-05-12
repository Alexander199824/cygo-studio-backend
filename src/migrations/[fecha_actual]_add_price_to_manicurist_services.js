// src/migrations/[fecha_actual]_add_price_to_manicurist_services.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ManicuristServices', 'price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ManicuristServices', 'price');
  }
};