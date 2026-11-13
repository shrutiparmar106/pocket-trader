
// import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
// import type { AuthTokens } from '../api/ApiClient';

// type AuthState = {
//   accessToken: string | null;
//   refreshToken: string | null;
//   isAuthenticated: boolean;
//   isLoading: boolean;
// };

// const initialState: AuthState = {
//   accessToken: null,
//   refreshToken: null,
//   isAuthenticated: false,
//   isLoading: true,
// };

// const authSlice = createSlice({
//   name: 'auth',
//   initialState,
//   reducers: {
//     setTokens: (state, action: PayloadAction<AuthTokens>) => {
//       state.accessToken = action.payload.accessToken;
//       state.refreshToken = action.payload.refreshToken;
//       state.isAuthenticated = true;
//       state.isLoading = false;
//     },

//     updateAccessToken: (state, action: PayloadAction<string>) => {
//       state.accessToken = action.payload;
//     },

//     logout: state => {
//       state.accessToken = null;
//       state.refreshToken = null;
//       state.isAuthenticated = false;
//       state.isLoading = false;
//     },

//     setAuthLoading: (state, action: PayloadAction<boolean>) => {
//       state.isLoading = action.payload;
//     },
//   },
// });

// export const {
//   setTokens,
//   updateAccessToken,
//   logout,
//   setAuthLoading,
// } = authSlice.actions;

// export default authSlice.reducer;
import { createSlice } from '@reduxjs/toolkit';

// Tokens are NOT kept in Redux: AuthService owns them (and Keychain stores them).
type AuthState = {
  isAuthenticated: boolean;
  /** True until the cold-start session restore has finished. */
  isLoading: boolean;
};

const initialState: AuthState = { isAuthenticated: false, isLoading: true };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedIn: state => {
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    signedOut: state => {
      state.isAuthenticated = false;
      state.isLoading = false;
    },
  },
});

export const { signedIn, signedOut } = authSlice.actions;
export default authSlice.reducer;