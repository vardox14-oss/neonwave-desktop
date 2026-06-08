const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireOwner } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// All admin routes require authentication + owner role
router.use(authenticate, requireOwner);

// GET /api/admin/users — List all users
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        expirationDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/admin/users — Create a new user
router.post('/users', async (req, res) => {
  try {
    const { email, password, name, expirationDate } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, mot de passe et nom requis.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'USER',
        expirationDate: expirationDate ? new Date(expirationDate) : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        expirationDate: true,
        createdAt: true,
      },
    });

    res.status(201).json({ user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PUT /api/admin/users/:id — Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, expirationDate, password } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (expirationDate !== undefined) {
      updateData.expirationDate = expirationDate ? new Date(expirationDate) : null;
    }
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        expirationDate: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /api/admin/users/:id — Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }
    if (user.role === 'OWNER') {
      return res.status(403).json({ error: 'Impossible de supprimer le compte Owner.' });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Utilisateur supprimé.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
