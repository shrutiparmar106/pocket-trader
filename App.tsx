
// import React, { useEffect } from 'react';
// import {
//   ActivityIndicator,
//   StyleSheet,
//   Text,
//   View,
// } from 'react-native';

// import { Provider } from 'react-redux';
// import { NavigationContainer } from '@react-navigation/native';

// import { store } from './src/store';
// import AppNavigator from './src/navigation/AppNavigator';

// import { authService } from './src/services/AuthService';
// import {
//   setTokens,
//   logout,
// } from './src/store/authSlice';
// import { useAppDispatch, useAppSelector } from './src/store/hooks';

// const AppContent = () => {
//   const dispatch = useAppDispatch();

//   const isLoading = useAppSelector(
//     state => state.auth.isLoading,
//   );

//   useEffect(() => {
//     let mounted = true;

//     const initializeApp = async () => {
//       const tokens = await authService.restoreSession();

//       if (!mounted) {
//         return;
//       }

//       if (tokens) {
//         dispatch(setTokens(tokens));
//       } else {
//         dispatch(logout());
//       }
//     };

//     initializeApp().catch(() => {
//       if (mounted) {
//         dispatch(logout());
//       }
//     });

//     return () => {
//       mounted = false;
//     };
//   }, [dispatch]);

//   if (isLoading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#2563EB" />
//         <Text style={styles.loadingText}>Loading Pocket Trader...</Text>
//       </View>
//     );
//   }

//   return (
//     <NavigationContainer>
//       <AppNavigator />
//     </NavigationContainer>
//   );
// };

// const App = () => {
//   return (
//     <Provider store={store}>
//       <AppContent />
//     </Provider>
//   );
// };

// const styles = StyleSheet.create({
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#F5F7FA',
//   },
//   loadingText: {
//     marginTop: 12,
//     color: '#64748B',
//   },
// });

// export default App;
import './src/i18n';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';

import AppNavigator from './src/navigation/AppNavigator';
import { authService } from './src/services';
import { store } from './src/store';
import { signedIn, signedOut } from './src/store/authSlice';
import { useAppDispatch, useAppSelector } from './src/store/hooks';
import { clearPrices } from './src/store/priceSlice';
import { clearAccount, fetchAccount } from './src/store/accountSlice';
import { priceFeed } from './src/api/client';

const Root = () => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(state => state.auth.isLoading);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  useEffect(() => {
    // Logout, or a rejected refresh token → back to Login.
    const unsubscribe = authService.onSessionEnded(() => {
      dispatch(signedOut());
      dispatch(clearAccount());
      dispatch(clearPrices());
    });

    // Cold start: restore from Keychain, otherwise show Login.
    authService
      .restoreSession()
      .then(tokens => dispatch(tokens ? signedIn() : signedOut()))
      .catch(() => dispatch(signedOut()));

    return unsubscribe;
  }, [dispatch]);

  useEffect(() => {
  if (!isAuthenticated) {
    return;
  }
  priceFeed.connect(); // one shared feed, connected while signed in
  dispatch(fetchAccount());
  return () => priceFeed.disconnect();
}, [isAuthenticated, dispatch]);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
};

const App = () => (
  <Provider store={store}>
    <Root />
  </Provider>
);

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
  },
});

export default App;