import { z } from 'zod';

export class UserSchema {
  schema: z.ZodObject<any>;

  constructor() {
    this.schema = z.object({
      id: z.string(),
      username: z.string(),
      email: z.string().email(),
      role: z.enum(['Admin', 'Manager', 'Operator', 'Auditor']),
      createdAt: z.string().datetime({ precision: 3 })
    });
  }
}