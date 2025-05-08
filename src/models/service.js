const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Service extends Model {
    static associate(models) {
      Service.belongsToMany(models.Manicurist, {
        through: 'ManicuristServices',
        foreignKey: 'serviceId',
        otherKey: 'manicuristId',
        as: 'manicurists'
      });
      Service.hasMany(models.Appointment, {
        foreignKey: 'serviceId',
        as: 'appointments'
      });
      Service.hasMany(models.NailStyle, {
        foreignKey: 'serviceId',
        as: 'nailStyles'
      });
    }
  }

  Service.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER, // en minutos
      allowNull: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Service',
  });
  
  return Service;
};