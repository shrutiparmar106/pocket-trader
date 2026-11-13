
// import React from 'react';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';

// import LoginScreen from '../screens/LoginScreen';
// import MarketWatchScreen from '../screens/MarketWatchScreen';
// import { useAppSelector } from '../store/hooks';
// import type { SymbolInfo } from '../mocks/data';

// export type RootStackParamList = {
//   Login: undefined;
//   MarketWatch: undefined;
//   Order: { instrument: SymbolInfo };
// };

// const Stack = createNativeStackNavigator<RootStackParamList>();

// const AppNavigator = () => {
//   const isAuthenticated = useAppSelector(
//     state => state.auth.isAuthenticated,
//   );

//   return (
//     <Stack.Navigator screenOptions={{headerShown: true}}>
//       {isAuthenticated ? (
//         <Stack.Screen
//           name="MarketWatch"
//           component={MarketWatchScreen}
//           options={{ title: 'Pocket Trader', headerShown: true }}
//         />
//       ) : (
//         <Stack.Screen
//           name="Login"
//           component={LoginScreen}
//           options={{ headerShown: false }}
//         />
//       )}
//     </Stack.Navigator>
//   );
// };

// export default AppNavigator;
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import LoginScreen from '../screens/LoginScreen';
import MarketWatchScreen from '../screens/MarketWatchScreen';
import OrderScreen from '../screens/OrderScreen';
import type { SymbolInfo } from '../mocks/data';
import { useAppSelector } from '../store/hooks';

export type RootStackParamList = {
  Login: undefined;
  MarketWatch: undefined;
  Order: { instrument: SymbolInfo };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { t } = useTranslation();
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  return (
    <Stack.Navigator>
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="MarketWatch"
            component={MarketWatchScreen}
            options={{ title: t('login.title') }}
          />
          <Stack.Screen
            name="Order"
            component={OrderScreen}
            options={({ route }) => ({ title: route.params.instrument.symbol })}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;