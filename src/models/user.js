const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasOne(models.Manicurist, {
        foreignKey: 'userId',
        as: 'manicuristProfile'
      });
      User.hasMany(models.Appointment, {
        foreignKey: 'clientId',
        as: 'clientAppointments'
      });
      User.hasMany(models.EstablishmentReview, {
        foreignKey: 'clientId',
        as: 'reviews'
      });
      User.belongsTo(models.Image, {
        foreignKey: 'profileImageId',
        as: 'profileImageData'
      });
    }

    // Modified comparePassword method with better error handling
    async comparePassword(password) {
      try {
        console.log("Comparing password with hash...");
        console.log("Input password:", password);
        console.log("Stored hash:", this.password);
        
        // Using bcryptjs directly for comparison
        const result = await bcrypt.compare(password, this.password);
        console.log("Comparison result:", result);
        return result;
      } catch (error) {
        console.error("Error in password comparison:", error);
        return false;
      }
    }
  }

  User.init({
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('superadmin', 'manicurist', 'client'),
      allowNull: false,
      defaultValue: 'client'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true
    },
    profileImageId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Images',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'User',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });
  
  return User;
};