const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Manicurist extends Model {
    static associate(models) {
      Manicurist.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      Manicurist.hasMany(models.Appointment, {
        foreignKey: 'manicuristId',
        as: 'appointments'
      });
      Manicurist.hasMany(models.Availability, {
        foreignKey: 'manicuristId',
        as: 'availabilities'
      });
      Manicurist.belongsToMany(models.Service, {
        through: 'ManicuristServices',
        foreignKey: 'manicuristId',
        otherKey: 'serviceId',
        as: 'services'
      });
      Manicurist.hasMany(models.NailStyle, {
        foreignKey: 'manicuristId',
        as: 'nailStyles'
      });
    }
  }

  Manicurist.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    specialty: {
      type: DataTypes.STRING,
      allowNull: false
    },
    biography: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    rating: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    reviewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'Manicurist',
  });
  
  return Manicurist;
};