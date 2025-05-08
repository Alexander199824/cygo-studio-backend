const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EstablishmentReview extends Model {
    static associate(models) {
      EstablishmentReview.belongsTo(models.User, {
        foreignKey: 'clientId',
        as: 'client'
      });
    }
  }

  EstablishmentReview.init({
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    review: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'EstablishmentReview',
  });
  
  return EstablishmentReview;
};