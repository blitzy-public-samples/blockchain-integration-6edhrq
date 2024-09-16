import { configureStore } from '@reduxjs/toolkit';
import { vaultReducer } from './vaultSlice';
import { transactionReducer } from './transactionSlice';
import { userReducer } from './userSlice';

const configureAppStore = () => {
  const store = configureStore({
    reducer: {
      vault: vaultReducer,
      transaction: transactionReducer,
      user: userReducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
  });

  return store;
};

export const store = configureAppStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;