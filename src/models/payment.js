const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      Payment.belongsTo(models.Appointment, {
        foreignKey: 'appointmentId',
        as: 'appointment'
      });
    }
  }

  Payment.init({
    appointmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Appointments',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    method: {
      type: DataTypes.ENUM('cash', 'card', 'transfer', 'deposit'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending'
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    advancePayment: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    gatewayResponse: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Payment',
  });
  
  return Payment;
};