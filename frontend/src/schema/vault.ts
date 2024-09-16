import { z } from 'zod';

class VaultSchema {
  schema: z.ZodObject<any>;

  constructor() {
    this.schema = z.object({
      id: z.string(),
      name: z.string(),
      blockchainType: z.enum(['XRP', 'Ethereum']),
      address: z.string(),
      createdAt: z.string().datetime({ precision: 3 })
    });
  }
}