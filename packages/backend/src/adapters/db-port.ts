import type { User, CreateUserRequest } from '@construction-ifc-tools/shared';

// Port (Interface) definition for the Hexagonal Architecture.
// All database access MUST go through this interface.
export interface DbPort {
  getUser(id: string): Promise<User | null>;
  createUser(input: CreateUserRequest): Promise<User>;
}
