import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from 'frontend/src/services/api';

// HUMAN ASSISTANCE NEEDED
// The confidence level for createTransaction is below 0.8. Please review and adjust as needed.
export const createTransaction = createAsyncThunk(
  'transactions/createTransaction',
  async (transactionData: TransactionRequest): Promise<Transaction> => {
    try {
      const response = await api.createTransaction(transactionData);
      return response;
    } catch (error) {
      throw error;
    }
  }
);

interface TransactionState {
  transactions: Transaction[];
  status: string;
  error: string | null;
}

const initialState: TransactionState = {
  transactions: [],
  status: 'idle',
  error: null,
};

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createTransaction.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.transactions.push(action.payload);
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'An error occurred';
      });
  },
});

export const { addTransaction } = transactionSlice.actions;
export default transactionSlice.reducer;