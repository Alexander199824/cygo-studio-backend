const Joi = require('joi');

// Validación de registro
exports.validateRegister = (data) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().required(),
    phone: Joi.string().allow('', null),
    role: Joi.string().valid('superadmin', 'manicurist', 'client')
  });
  return schema.validate(data);
};

// Validación de login
exports.validateLogin = (data) => {
  const schema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  });
  return schema.validate(data);
};

// Validación de creación de cita
exports.validateAppointmentCreate = (data) => {
  const schema = Joi.object({
    manicuristId: Joi.number().required(),
    serviceId: Joi.number().required(),
    nailStyleId: Joi.number().allow(null),
    date: Joi.date().required(),
    startTime: Joi.string().required(),
    clientId: Joi.number(),
    customRequests: Joi.string().allow('', null),
    referenceImages: Joi.array().items(Joi.string()).allow(null)
  });
  return schema.validate(data);
};

// Validación de actualización de cita
exports.validateAppointmentUpdate = (data) => {
  const schema = Joi.object({
    manicuristId: Joi.number(),
    serviceId: Joi.number(),
    nailStyleId: Joi.number().allow(null),
    date: Joi.date(),
    startTime: Joi.string(),
    status: Joi.string().valid('pending', 'confirmed', 'completed', 'cancelled'),
    customRequests: Joi.string().allow('', null),
    referenceImages: Joi.array().items(Joi.string()).allow(null),
    manicuristNote: Joi.string().allow('', null)
  });
  return schema.validate(data);
};

// Validación de disponibilidad
exports.validateAvailabilityCreate = (data) => {
  const schema = Joi.object({
    manicuristId: Joi.number().required(),
    dayOfWeek: Joi.number().min(0).max(6).allow(null),
    startTime: Joi.string().required(),
    endTime: Joi.string().required(),
    isRecurring: Joi.boolean().required(),
    specificDate: Joi.date().allow(null),
    isAvailable: Joi.boolean().default(true)
  });
  return schema.validate(data);
};

exports.validateAvailabilityUpdate = (data) => {
  const schema = Joi.object({
    dayOfWeek: Joi.number().min(0).max(6).allow(null),
    startTime: Joi.string(),
    endTime: Joi.string(),
    isRecurring: Joi.boolean(),
    specificDate: Joi.date().allow(null),
    isAvailable: Joi.boolean()
  });
  return schema.validate(data);
};

// Validación de manicurista
exports.validateManicuristUpdate = (data) => {
  const schema = Joi.object({
    name: Joi.string(),
    email: Joi.string().email(),
    phone: Joi.string(),
    specialty: Joi.string(),
    biography: Joi.string().allow('', null),
    profileImage: Joi.string().allow('', null)
  });
  return schema.validate(data);
};

// Validación de estilo de uñas
exports.validateNailStyleCreate = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow('', null),
    imageUrl: Joi.string().allow('', null),
    category: Joi.string().required(),
    serviceId: Joi.number().required(),
    manicuristId: Joi.number().allow(null)
  });
  return schema.validate(data);
};

exports.validateNailStyleUpdate = (data) => {
  const schema = Joi.object({
    name: Joi.string(),
    description: Joi.string().allow('', null),
    imageUrl: Joi.string().allow('', null),
    category: Joi.string(),
    serviceId: Joi.number(),
    active: Joi.boolean()
  });
  return schema.validate(data);
};

// Validación de pago
exports.validatePaymentCreate = (data) => {
  const schema = Joi.object({
    appointmentId: Joi.number().required(),
    method: Joi.string().valid('cash', 'card', 'transfer').required(),
    transferDetails: Joi.object().when('method', {
      is: 'transfer',
      then: Joi.required()
    })
  });
  return schema.validate(data);
};

// Validación de servicio
exports.validateServiceCreate = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow('', null),
    price: Joi.number().required(),
    duration: Joi.number().required(),
    category: Joi.string(),
    active: Joi.boolean().default(true)
  });
  return schema.validate(data);
};

exports.validateServiceUpdate = (data) => {
  const schema = Joi.object({
    name: Joi.string(),
    description: Joi.string().allow('', null),
    price: Joi.number(),
    duration: Joi.number(),
    category: Joi.string(),
    active: Joi.boolean()
  });
  return schema.validate(data);
};

// Validación de reseña
exports.validateReviewCreate = (data) => {
  const schema = Joi.object({
    rating: Joi.number().min(1).max(5).required(),
    review: Joi.string().required()
  });
  return schema.validate(data);
};