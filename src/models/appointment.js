const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Appointment extends Model {
    static associate(models) {
      Appointment.belongsTo(models.User, {
        foreignKey: 'clientId',
        as: 'client'
      });
      Appointment.belongsTo(models.Manicurist, {
        foreignKey: 'manicuristId',
        as: 'manicurist'
      });
      Appointment.belongsTo(models.Service, {
        foreignKey: 'serviceId',
        as: 'service'
      });
      Appointment.belongsTo(models.NailStyle, {
        foreignKey: 'nailStyleId',
        as: 'nailStyle'
      });
      Appointment.hasOne(models.Payment, {
        foreignKey: 'appointmentId',
        as: 'payment'
      });
    }
  }

  Appointment.init({
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    manicuristId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Manicurists',
        key: 'id'
      }
    },
    serviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Services',
        key: 'id'
      }
    },
    nailStyleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'NailStyles',
        key: 'id'
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
      defaultValue: 'pending'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    clientRating: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    clientReview: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    manicuristNote: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reminderSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    customRequests: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    referenceImages: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Appointment',
  });
  
  return Appointment;
};