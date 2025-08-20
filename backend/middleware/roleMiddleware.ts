import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  id: number;
  role?: string;
}

export const requireRole = (allowedRoles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      const decoded = jwt.verify(token, "dev_secret_change_me") as JwtPayload;
      const userRole = decoded.role || '';
      console.log("hi");
      console.log(decoded);
      console.log(userRole);
      
      const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      
      if (!rolesArray.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${rolesArray.join(' or ')}. Your role: ${userRole}`
        });
      }

      (req as any).user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  };
};

export const requireExaminerRole = requireRole('examiner');
export const requireAdminRole = requireRole('admin');
export const requireStudentRole = requireRole('student');