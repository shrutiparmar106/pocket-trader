
// import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import {
//   ActivityIndicator,
//   FlatList,
//   Pressable,
//   StyleSheet,
//   Text,
//   View,
// } from 'react-native';

// import { unwrap } from '../api/ApiClient';
// import { apiClient } from '../api/client';
// import { authService } from '../services';
// import type { SymbolInfo } from '../mocks/data';
// import { MockPriceFeed } from '../mocks/MockPriceFeed';
// import { updatePrices } from '../store/priceSlice';
// import { useAppDispatch, useAppSelector } from '../store/hooks';

// const MarketWatchScreen = () => {
//   const dispatch = useAppDispatch();
//   const prices = useAppSelector(state => state.prices.prices);
//   const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const priceFeed = useMemo(() => new MockPriceFeed(), []);

//   const loadMarket = useCallback(async () => {
//   try {
//     setLoading(true);
//     setError(null);
//     // A 401 refreshes the token once and retries the request.
//     const envelope = await authService.requestWithAuth(token =>
//       apiClient.getSymbols(token),
//     );
//     setSymbols(unwrap(envelope));
//   } catch (requestError) {
//     setError(
//       requestError instanceof Error
//         ? requestError.message
//         : 'Unable to load market symbols.',
//     );
//   } finally {
//     setLoading(false);
//   }
// }, []);

//   useEffect(() => {
//     loadMarket();
//   }, [loadMarket]);

//   useEffect(() => {
//     if (symbols.length === 0) {
//       return;
//     }

//     priceFeed.connect();
//     const unsubscribe = priceFeed.subscribe(
//       symbols.map(item => item.symbol),
//       ticks => dispatch(updatePrices(ticks)),
//     );

//     return () => {
//       unsubscribe();
//       priceFeed.disconnect();
//     };
//   }, [dispatch, priceFeed, symbols]);

//   const renderItem = ({ item }: { item: SymbolInfo }) => {
//     const price = prices[item.symbol];
//     const direction = price?.direction;

//     return (
//       <View style={styles.row}>
//         <View style={styles.symbolColumn}>
//           <Text style={styles.symbol}>{item.symbol}</Text>
//           <Text style={styles.description}>{item.description}</Text>
//         </View>
//         <View style={styles.priceColumn}>
//           <Text style={styles.price}>
//             {price ? price.bid.toFixed(item.digits) : '--'}
//           </Text>
//           <Text
//             style={[
//               styles.direction,
//               direction === 'up' && styles.up,
//               direction === 'down' && styles.down,
//             ]}>
//             {direction === 'up' ? 'Rising' : direction === 'down' ? 'Falling' : 'Waiting'}
//           </Text>
//         </View>
//         <Text style={styles.ask}>
//           {price ? price.ask.toFixed(item.digits) : '--'}
//         </Text>
//       </View>
//     );
//   };

//   if (loading) {
//     return (
//       <View style={styles.stateContainer}>
//         <ActivityIndicator size="large" color="#2563EB" />
//         <Text style={styles.stateText}>Loading market symbols...</Text>
//       </View>
//     );
//   }

//   if (error) {
//     return (
//       <View style={styles.stateContainer}>
//         <Text style={styles.stateTitle}>Market data unavailable</Text>
//         <Text style={styles.stateText}>{error}</Text>
//         <Pressable
//           accessibilityRole="button"
//           accessibilityLabel="Retry loading market data"
//           onPress={loadMarket}
//           style={({ pressed }) => [
//             styles.retryButton,
//             pressed && styles.pressedButton,
//           ]}>
//           <Text style={styles.retryText}>Retry</Text>
//         </Pressable>
//       </View>
//     );
//   }

//   return (
//     <FlatList
//       style={styles.container}
//       contentContainerStyle={symbols.length === 0 ? styles.emptyContent : undefined}
//       data={symbols}
//       keyExtractor={item => item.symbol}
//       renderItem={renderItem}
//       ListHeaderComponent={
//         <View style={styles.header}>
//           <Text style={styles.title}>Market Watch</Text>
//           <Text style={styles.subtitle}>Live bid and ask prices</Text>
//           <View style={styles.tableHeader}>
//             <Text style={styles.headerLabel}>Instrument</Text>
//             <Text style={styles.headerLabel}>Bid</Text>
//             <Text style={styles.headerLabel}>Ask</Text>
//           </View>
//         </View>
//       }
//       ListEmptyComponent={
//         <View style={styles.emptyState}>
//           <Text style={styles.stateTitle}>No instruments available</Text>
//           <Text style={styles.stateText}>
//             Market symbols will appear here when the account is ready.
//           </Text>
//         </View>
//       }
//     />
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F5F7FA',
//     paddingHorizontal: 16,
//   },
//   header: {
//     paddingTop: 24,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: '700',
//     color: '#172554',
//   },
//   subtitle: {
//     marginTop: 6,
//     fontSize: 15,
//     color: '#64748B',
//   },
//   tableHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 28,
//     paddingBottom: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: '#CBD5E1',
//   },
//   headerLabel: {
//     color: '#64748B',
//     fontSize: 12,
//     fontWeight: '700',
//     textTransform: 'uppercase',
//   },
//   row: {
//     minHeight: 72,
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderBottomWidth: 1,
//     borderBottomColor: '#E2E8F0',
//   },
//   symbolColumn: {
//     flex: 1,
//   },
//   symbol: {
//     color: '#172554',
//     fontSize: 16,
//     fontWeight: '700',
//   },
//   description: {
//     color: '#64748B',
//     fontSize: 12,
//     marginTop: 4,
//   },
//   priceColumn: {
//     alignItems: 'flex-end',
//     width: 92,
//   },
//   price: {
//     color: '#172554',
//     fontSize: 15,
//     fontWeight: '600',
//   },
//   direction: {
//     color: '#64748B',
//     fontSize: 11,
//     marginTop: 3,
//   },
//   up: {
//     color: '#15803D',
//   },
//   down: {
//     color: '#B91C1C',
//   },
//   ask: {
//     color: '#334155',
//     fontSize: 15,
//     textAlign: 'right',
//     width: 92,
//   },
//   stateContainer: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#F5F7FA',
//     padding: 24,
//   },
//   stateTitle: {
//     color: '#172554',
//     fontSize: 17,
//     fontWeight: '700',
//     textAlign: 'center',
//   },
//   stateText: {
//     color: '#64748B',
//     fontSize: 14,
//     lineHeight: 21,
//     marginTop: 8,
//     textAlign: 'center',
//   },
//   retryButton: {
//     alignItems: 'center',
//     backgroundColor: '#2563EB',
//     borderRadius: 8,
//     justifyContent: 'center',
//     marginTop: 20,
//     minHeight: 44,
//     paddingHorizontal: 28,
//   },
//   pressedButton: {
//     opacity: 0.8,
//   },
//   retryText: {
//     color: '#FFFFFF',
//     fontSize: 15,
//     fontWeight: '700',
//   },
//   emptyContent: {
//     flexGrow: 1,
//   },
//   emptyState: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     padding: 24,
//   },
// });

// export default MarketWatchScreen;
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { unwrap } from '../api/ApiClient';
import { apiClient, debugTools } from '../api/client';
import AccountBar from '../components/AccountBar';
import PriceRow, { ROW_COLUMNS, ROW_HEIGHT } from '../components/PriceRow';
import { usePriceSubscription } from '../hooks/usePriceSubscription';
import type { SymbolInfo } from '../mocks/data';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { authService } from '../services';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MarketWatch'>;

const NO_SYMBOLS: string[] = [];

const MarketWatchScreen = ({ navigation }: Props) => {
  const { t } = useTranslation();
  const isFocused = useIsFocused();

  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [bursting, setBursting] = useState(false);

  const loadSymbols = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Goes through requestWithAuth: a 401 refreshes the token and retries once.
      const envelope = await authService.requestWithAuth(token =>
        apiClient.getSymbols(token),
      );
      setSymbols(unwrap(envelope));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('errors.generic'),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSymbols();
  }, [loadSymbols]);

  const visibleSymbols = useMemo(() => {
    const needle = query.trim().toUpperCase();
    return needle ? symbols.filter(s => s.symbol.includes(needle)) : symbols;
  }, [symbols, query]);

  // Subscribe only to the symbols shown, and only while this screen is focused.
  const subscribedSymbols = useMemo(
    () => (isFocused ? visibleSymbols.map(s => s.symbol) : NO_SYMBOLS),
    [isFocused, visibleSymbols],
  );
  usePriceSubscription(subscribedSymbols);

  const handlePressRow = useCallback(
    (instrument: SymbolInfo) => navigation.navigate('Order', { instrument }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: SymbolInfo }) => (
      <PriceRow info={item} onPress={handlePressRow} />
    ),
    [handlePressRow],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  // Debug: fire 3 authenticated calls at once. With an expired token they all
  // get a 401 together, and exactly ONE refresh call must be made.
  const handleBurst = async () => {
    setBursting(true);
    const refreshesBefore = authService.getRefreshCallCount();
    const results = await Promise.allSettled(
      Array.from({ length: 3 }, () =>
        authService.requestWithAuth(token => apiClient.getAccount(token)),
      ),
    );
    const ok = results.filter(r => r.status === 'fulfilled').length;
    setBursting(false);
    Alert.alert(
      t('market.debugTitle'),
      t('market.burstResult', {
        ok,
        failed: results.length - ok,
        refreshes: authService.getRefreshCallCount() - refreshesBefore,
      }),
    );
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>{t('market.loading')}</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>{t('market.unavailable')}</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={loadSymbols}
            style={styles.retryButton}>
            <Text style={styles.retryText}>{t('market.retry')}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        data={visibleSymbols}
        keyExtractor={item => item.symbol}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialNumToRender={14}
        maxToRenderPerBatch={10}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>
              {symbols.length === 0
                ? t('market.empty')
                : t('market.noMatches', { query: query.trim() })}
            </Text>
          </View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <AccountBar />

      <View style={styles.header}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder={t('market.searchPlaceholder')}
          placeholderTextColor="#888"
          autoCapitalize="characters"
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel={t('market.searchPlaceholder')}
        />

        <View style={styles.debugRow}>
          <Pressable
            accessibilityRole="button"
            onPress={handleBurst}
            disabled={bursting}
            style={[styles.debugButton, bursting && styles.disabled]}>
            <Text style={styles.debugText}>{t('market.burst')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={debugTools.expireAccessToken}
            style={styles.debugButton}>
            <Text style={styles.debugText}>{t('market.expire')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => authService.logout()}
            style={styles.debugButton}>
            <Text style={styles.debugText}>{t('market.logout')}</Text>
          </Pressable>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.headerLabel, styles.headerSymbol]}>
            {t('market.instrument')}
          </Text>
          <Text style={[styles.headerLabel, { width: ROW_COLUMNS.price }]}>
            {t('market.bid')}
          </Text>
          <Text style={[styles.headerLabel, { width: ROW_COLUMNS.price }]}>
            {t('market.ask')}
          </Text>
          <Text style={[styles.headerLabel, { width: ROW_COLUMNS.spread }]}>
            {t('market.spread')}
          </Text>
        </View>
      </View>

      {renderBody()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  search: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    color: colors.navy,
  },
  debugRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  debugButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  debugText: { fontSize: 12, color: colors.text },
  disabled: { opacity: 0.5 },
  tableHeader: {
    flexDirection: 'row',
    marginTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  headerLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  headerSymbol: { flex: 1, textAlign: 'left' },
  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateTitle: { color: colors.navy, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginTop: 20,
    minHeight: 44,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});

export default MarketWatchScreen;