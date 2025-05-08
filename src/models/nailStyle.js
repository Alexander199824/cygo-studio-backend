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
      // Nueva asociación con Image
      NailStyle.belongsTo(models.Image, {
        foreignKey: 'imageId',
        as: 'image'
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
      allowNull: true
    },
    // Nuevo campo para referencia a la imagen en BD
    imageId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Images',
        key: 'id'
      }
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