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
      // Cambiamos el nombre de la asociación a 'profileImageData'
      User.belongsTo(models.Image, {
        foreignKey: 'profileImageId',
        as: 'profileImageData'
      });
    }

    async comparePassword(password) {
      return bcrypt.compare(password, this.password);
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
    // Campo para referencia a la imagen en BD
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
          // Verificar si la contraseña ya es un hash bcrypt
          if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$') && !user.password.startsWith('$2y$')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          // Verificar si la contraseña ya es un hash bcrypt
          if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$') && !user.password.startsWith('$2y$')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        }
      }
    }
  });
  
  return User;
}