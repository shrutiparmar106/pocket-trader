
import { configureStore } from '@reduxjs/toolkit';

import authReducer from './authSlice';
import accountReducer from './accountSlice';
import priceReducer from './priceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    account: accountReducer,
    prices: priceReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
