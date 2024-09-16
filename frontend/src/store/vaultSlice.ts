import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from 'frontend/src/services/api';

// HUMAN ASSISTANCE NEEDED
// The fetchVaults function has a confidence level below 0.8. Please review and adjust as necessary.
export const fetchVaults = createAsyncThunk('vaults/fetchVaults', async () => {
  try {
    const vaults = await api.getVaults();
    return vaults;
  } catch (error) {
    throw error;
  }
});

interface Vault {
  // Define Vault interface properties here
}

interface VaultState {
  vaults: Vault[];
  status: string;
  error: string | null;
}

const initialState: VaultState = {
  vaults: [],
  status: 'idle',
  error: null,
};

const vaultSlice = createSlice({
  name: 'vault',
  initialState,
  reducers: {
    setVaults: (state, action: PayloadAction<Vault[]>) => {
      state.vaults = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVaults.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchVaults.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.vaults = action.payload;
      })
      .addCase(fetchVaults.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || null;
      });
  },
});

export const { setVaults } = vaultSlice.actions;
export default vaultSlice.reducer;