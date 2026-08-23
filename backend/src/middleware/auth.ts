import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'RESIDENT' | 'ADMIN';
  flat_number: string;
  is_verified?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'AUTH_REQUIRED', 'Authentication token is missing or malformed'));
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET || 'orqen_super_secret_jwt_key_2026_production_grade';

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError(401, 'INVALID_TOKEN', 'Session token is invalid or expired'));
  }
}

export function requireRole(...allowedRoles: Array<'RESIDENT' | 'ADMIN'>) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'AUTH_REQUIRED', 'Authentication is required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'Access denied for your role'));
    }

    next();
  };
}
