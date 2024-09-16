import { z } from 'zod';

export class TransactionSchema {
  schema: z.ZodObject<any>;

  constructor() {
    this.schema = z.object({
      id: z.string(),
      vaultId: z.string(),
      status: z.enum(['Pending', 'Completed', 'Failed']),
      blockchainType: z.enum(['XRP', 'Ethereum']),
      txHash: z.string(),
      amount: z.number(),
      createdAt: z.string().datetime()
    });
  }
}