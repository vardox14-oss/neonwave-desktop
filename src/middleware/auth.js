const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Verify JWT token and attach user to request
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Accès non autorisé. Token manquant.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        expirationDate: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré. Veuillez vous reconnecter.' });
    }
    return res.status(401).json({ error: 'Token invalide.' });
  }
};

// Check if user subscription is still valid
const checkSubscription = (req, res, next) => {
  const { user } = req;

  // Owner never expires
  if (user.role === 'OWNER') {
    return next();
  }

  // Check expiration date
  if (!user.expirationDate) {
    return res.status(403).json({ error: 'Aucune date d\'expiration définie. Contactez l\'administrateur.' });
  }

  if (new Date(user.expirationDate) < new Date()) {
    return res.status(403).json({ 
      error: 'Votre abonnement a expiré. Contactez l\'administrateur pour renouveler votre accès.',
      expired: true,
    });
  }

  next();
};

// Require Owner role
const requireOwner = (req, res, next) => {
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({ error: 'Accès réservé à l\'administrateur.' });
  }
  next();
};

module.exports = { authenticate, checkSubscription, requireOwner };
