const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ManicuristService extends Model {
    static associate(models) {
      // Este es un modelo de unión, no necesita asociaciones explícitas
    }
  }

  ManicuristService.init({
    manicuristId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Manicurists',
        key: 'id'
      }
    },
    serviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Services',
        key: 'id'
      }
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true // Precio personalizado (opcional)
    }
  }, {
    sequelize,
    modelName: 'ManicuristService',
    tableName: 'ManicuristServices'
  });
  
  return ManicuristService;
};