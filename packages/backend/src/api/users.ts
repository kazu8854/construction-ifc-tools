import { Hono } from 'hono';
import { CreateUserSchema } from '@basic-serverless-app/shared';
import { MockDbAdapter } from '../adapters/mock-db-adapter';
import { UserUsecase } from '../usecases/user-usecase';

// --- Dependency Injection ---
// Decide which adapter to inject based on the environment.
// When adding a new domain, follow this same DI pattern at the top of your route file.
const isMock = process.env.MOCK_AWS === 'true';
const dbAdapter = isMock ? new MockDbAdapter() : new MockDbAdapter(); // Replace second with actual AWS Adapter
const userUsecase = new UserUsecase(dbAdapter);

// --- Sub-Router for /users ---
// Notice how we chain .get() and .post() without re-assigning to a variable.
// This chaining is CRITICAL for `hono/client` to correctly infer types.
export const usersApp = new Hono()
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const result = await userUsecase.getUser(id);

    if (!result.success) {
      // Hono's c.json requires explicitly defining the status code for type inference
      return c.json(result, 404);
    }
    return c.json(result, 200);
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }

    const result = await userUsecase.createUser(parsed.data);
    return c.json(result, 201);
  });
