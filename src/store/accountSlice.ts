
// import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
// import type { Account } from '../api/ApiClient';

// type AccountState = {
//   account: Account | null;
//   isLoading: boolean;
// };

// const initialState: AccountState = {
//   account: null,
//   isLoading: false,
// };

// const accountSlice = createSlice({
//   name: 'account',
//   initialState,
//   reducers: {
//     setAccount: (state, action: PayloadAction<Account>) => {
//       state.account = action.payload;
//       state.isLoading = false;
//     },

//     setAccountLoading: (state, action: PayloadAction<boolean>) => {
//       state.isLoading = action.payload;
//     },

//     clearAccount: state => {
//       state.account = null;
//       state.isLoading = false;
//     },
//   },
// });

// export const {
//   setAccount,
//   setAccountLoading,
//   clearAccount,
// } = accountSlice.actions;

// export default accountSlice.reducer;
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { unwrap, type Account } from '../api/ApiClient';
import { apiClient } from '../api/client';
import { authService } from '../services';

type AccountState = {
  account: Account | null;
  isLoading: boolean;
  error: string | null;
};

const initialState: AccountState = { account: null, isLoading: false, error: null };

/** GET /accounts/me through the authenticated (auto-refreshing) path. */
export const fetchAccount = createAsyncThunk<Account, void, { rejectValue: string }>(
  'account/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const envelope = await authService.requestWithAuth(token =>
        apiClient.getAccount(token),
      );
      return unwrap(envelope);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Unable to load account',
      );
    }
  },
);

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    clearAccount: () => initialState,
  },
  extraReducers: builder => {
    builder
      .addCase(fetchAccount.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccount.fulfilled, (state, action) => {
        state.account = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Unable to load account';
      });
  },
});

export const { clearAccount } = accountSlice.actions;
export default accountSlice.reducer;