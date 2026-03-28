import { User, CreateUserRequest } from '@basic-serverless-app/shared';
import { DbPort } from './db-port';

/**
 * Mock implementation of DbPort.
 * Uses an in-memory Map as the data store for local development (MOCK_AWS=true).
 */
export class MockDbAdapter implements DbPort {
  private store = new Map<string, User>();

  async getUser(id: string): Promise<User | null> {
    return this.store.get(id) ?? null;
  }

  async createUser(input: CreateUserRequest): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.set(user.id, user);
    return user;
  }
}
