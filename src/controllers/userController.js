exports.changeUserRole = async (req, res) => {
    try {
      // Solo superadmin puede cambiar roles
      if (req.user.role !== 'superadmin') {
        return res.status(403).json({
          error: 'No tienes permiso para cambiar roles de usuarios'
        });
      }
  
      const { id } = req.params;
      const { role } = req.body;
      
      // Verificar rol válido
      if (!['superadmin', 'manicurist', 'client'].includes(role)) {
        return res.status(400).json({ error: 'Rol no válido' });
      }
      
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      // Si se cambia a manicurista, crear perfil de manicurista si no existe
      if (role === 'manicurist' && user.role !== 'manicurist') {
        const existingProfile = await Manicurist.findOne({
          where: { userId: user.id }
        });
        
        if (!existingProfile) {
          await Manicurist.create({
            userId: user.id,
            specialty: 'General',
            biography: '',
            active: false
          });
        }
      }
      
      await user.update({ role });
      
      return res.status(200).json({
        message: `Rol de usuario actualizado a ${role} exitosamente`
      });
    } catch (error) {
      console.error('Error al cambiar rol de usuario:', error);
      return res.status(500).json({ error: 'Error al cambiar rol de usuario' });
    }
  };