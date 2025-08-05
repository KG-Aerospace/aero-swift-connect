import bcrypt from 'bcryptjs';
import { storage } from '../storage';
import type { InsertUser, User } from '@shared/schema';

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async createUser(userData: Omit<InsertUser, 'id' | 'password'> & { password: string }): Promise<User> {
    const hashedPassword = await this.hashPassword(userData.password);
    const user: InsertUser = {
      ...userData,
      password: hashedPassword,
    };
    return storage.createUser(user);
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await this.verifyPassword(password, user.password);
    if (!isValid) {
      return null;
    }

    return user;
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await this.hashPassword(newPassword);
    await storage.updateUserPassword(userId, hashedPassword);
  }
}

export const authService = new AuthService();