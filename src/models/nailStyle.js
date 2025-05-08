const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class NailStyle extends Model {
    static associate(models) {
      NailStyle.belongsTo(models.Service, {
        foreignKey: 'serviceId',
        as: 'service'
      });
      NailStyle.belongsTo(models.Manicurist, {
        foreignKey: 'manicuristId',
        as: 'manicurist'
      });
      NailStyle.hasMany(models.Appointment, {
        foreignKey: 'nailStyleId',
        as: 'appointments'
      });
    }
  }

  NailStyle.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false
    },
    serviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Services',
        key: 'id'
      }
    },
    manicuristId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Manicurists',
        key: 'id'
      }
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'NailStyle',
  });
  
  return NailStyle;
};