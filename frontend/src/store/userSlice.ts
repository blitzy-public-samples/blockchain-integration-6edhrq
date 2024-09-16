import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { auth } from 'frontend/src/services/auth';

interface User {
  // Define user properties here
}

interface LoginCredentials {
  // Define login credentials properties here
}

interface UserState {
  currentUser: User | null;
  status: string;
  error: string | null;
}

// HUMAN ASSISTANCE NEEDED
// The loginUser thunk might need additional error handling or refinement
export const loginUser = createAsyncThunk<User, LoginCredentials>(
  'user/login',
  async (credentials) => {
    try {
      const user = await auth.login(credentials);
      return user;
    } catch (error) {
      throw error;
    }
  }
);

const initialState: UserState = {
  currentUser: null,
  status: 'idle',
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentUser = action.payload;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'An error occurred';
      });
  },
});

export const { setUser } = userSlice.actions;
export default userSlice.reducer;