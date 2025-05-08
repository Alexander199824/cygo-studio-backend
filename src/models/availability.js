const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Availability extends Model {
    static associate(models) {
      Availability.belongsTo(models.Manicurist, {
        foreignKey: 'manicuristId',
        as: 'manicurist'
      });
    }
  }

  Availability.init({
    manicuristId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Manicurists',
        key: 'id'
      }
    },
    dayOfWeek: {
      type: DataTypes.INTEGER, // 0-6 (Domingo-Sábado)
      allowNull: true
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    specificDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Availability',
  });
  
  return Availability;
};