import { User, CreateUserRequest, ApiResponse } from '@basic-serverless-app/shared';
import { DbPort } from '../adapters/db-port';

/**
 * UserUsecase — Pure business logic, completely decoupled from HTTP and AWS.
 * This class can be reused by:
 *   - Hono routes (HTTP API)
 *   - AI Agent Action Groups (Bedrock / MCP tools)
 *   - Unit tests (with MockDbAdapter)
 */
export class UserUsecase {
  constructor(private readonly db: DbPort) {}

  async getUser(id: string): Promise<ApiResponse<User>> {
    const user = await this.db.getUser(id);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    return { success: true, data: user };
  }

  async createUser(input: CreateUserRequest): Promise<ApiResponse<User>> {
    const user = await this.db.createUser(input);
    return { success: true, data: user };
  }
}
