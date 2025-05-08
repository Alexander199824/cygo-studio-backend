// migrations/[fecha]_add_image_references.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Añadir imageId a la tabla NailStyles
    await queryInterface.addColumn('NailStyles', 'imageId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Images',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Añadir profileImageId a la tabla Users
    await queryInterface.addColumn('Users', 'profileImageId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Images',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('NailStyles', 'imageId');
    await queryInterface.removeColumn('Users', 'profileImageId');
  }
};