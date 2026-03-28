import { z } from 'zod';

// Define the User schema using Zod
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1, "Name is required"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Infer the TypeScript type from the Zod schema
export type User = z.infer<typeof UserSchema>;

// Example schema for creating a new user
export const CreateUserSchema = UserSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
