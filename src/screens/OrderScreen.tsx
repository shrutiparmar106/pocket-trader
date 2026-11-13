import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { unwrap, type TradeSide } from '../api/ApiClient';
import { apiClient } from '../api/client';
import AccountBar from '../components/AccountBar';
import { usePriceSubscription } from '../hooks/usePriceSubscription';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { authService } from '../services';
import { fetchAccount } from '../store/accountSlice';
import { useAppDispatch, useAppSelector, useAppStore } from '../store/hooks';
import { selectPrice } from '../store/priceSlice';
import { colors } from '../theme';
import { formatPrice } from '../utils/format';
import { validateOrder, type OrderErrorCode } from '../utils/orderValidation';

type Props = NativeStackScreenProps<RootStackParamList, 'Order'>;

type Outcome =
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

const OrderScreen = ({ route }: Props) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const { instrument } = route.params;
  const { symbol, digits } = instrument;

  // This screen shows one symbol, so it subscribes to just that one.
  const symbols = useMemo(() => [symbol], [symbol]);
  usePriceSubscription(symbols);

  const selector = useMemo(() => selectPrice(symbol), [symbol]);
  const price = useAppSelector(selector);

  const [volume, setVolume] = useState('0.01');
  const [stopLoss, setStopLoss] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // A ref guards against double taps that land before React re-renders.
  const submittingRef = useRef(false);

  const describeError = (code: OrderErrorCode, side: TradeSide) => {
    const latest = store.getState().prices.prices[symbol];
    const shown = side === 'BUY' ? latest?.bid : latest?.ask;
    return t(`orderErrors.${code}`, { price: formatPrice(shown, digits) });
  };

  const submit = async (side: TradeSide) => {
    if (submittingRef.current) {
      return;
    }
    setOutcome(null);

    // Validate against the LATEST price in the store, not the one this render saw.
    const latest = store.getState().prices.prices[symbol];
    const result = validateOrder({
      side,
      volumeInput: volume,
      stopLossInput: stopLoss,
      quote: latest,
      digits,
    });
    if (!result.ok) {
      setFormError(describeError(result.code, side));
      return;
    }
    setFormError(null);

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const envelope = await authService.requestWithAuth(token =>
        apiClient.placeTrade(token, {
          symbol,
          side,
          volume: result.value.volume,
          sl: result.value.sl,
        }),
      );
      const trade = unwrap(envelope);
      setOutcome({
        kind: 'success',
        message: t('order.successBody', {
          ticket: trade.ticket,
          side: side === 'BUY' ? t('order.buy') : t('order.sell'),
          volume: result.value.volume,
          price: formatPrice(trade.openPrice, digits),
        }),
      });
      dispatch(fetchAccount()); // refresh balance/equity after the order
    } catch (error) {
      setOutcome({
        kind: 'error',
        message: error instanceof Error ? error.message : t('errors.generic'),
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const disabled = submitting || !price;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AccountBar />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.symbol}>{symbol}</Text>
        <Text style={styles.description}>{instrument.description}</Text>

        <View style={styles.quote}>
          <View style={styles.quoteCell}>
            <Text style={styles.quoteLabel}>{t('market.bid')}</Text>
            <Text style={styles.quoteValue}>{formatPrice(price?.bid, digits)}</Text>
          </View>
          <View style={styles.quoteCell}>
            <Text style={styles.quoteLabel}>{t('market.spread')}</Text>
            <Text style={styles.quoteSpread}>{formatPrice(price?.spread, digits)}</Text>
          </View>
          <View style={styles.quoteCell}>
            <Text style={styles.quoteLabel}>{t('market.ask')}</Text>
            <Text style={styles.quoteValue}>{formatPrice(price?.ask, digits)}</Text>
          </View>
        </View>
        {!price && <Text style={styles.hint}>{t('order.waitingPrice')}</Text>}

        <Text style={styles.label}>{t('order.volume')}</Text>
        <TextInput
          style={styles.input}
          value={volume}
          onChangeText={setVolume}
          keyboardType="decimal-pad"
          editable={!submitting}
          accessibilityLabel={t('order.volume')}
        />
        <Text style={styles.hint}>{t('order.volumeHint')}</Text>

        <Text style={styles.label}>{t('order.stopLoss')}</Text>
        <TextInput
          style={styles.input}
          value={stopLoss}
          onChangeText={setStopLoss}
          keyboardType="decimal-pad"
          editable={!submitting}
          accessibilityLabel={t('order.stopLoss')}
        />
        <Text style={styles.hint}>
          {t('order.slHintBuy', { price: formatPrice(price?.bid, digits) })}
        </Text>
        <Text style={styles.hint}>
          {t('order.slHintSell', { price: formatPrice(price?.ask, digits) })}
        </Text>

        {formError && (
          <Text style={styles.formError} accessibilityLiveRegion="polite">
            {formError}
          </Text>
        )}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => submit('SELL')}
            style={[styles.actionButton, styles.sell, disabled && styles.disabled]}>
            <Text style={styles.actionLabel}>{t('order.sell')}</Text>
            <Text style={styles.actionPrice}>{formatPrice(price?.bid, digits)}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => submit('BUY')}
            style={[styles.actionButton, styles.buy, disabled && styles.disabled]}>
            <Text style={styles.actionLabel}>{t('order.buy')}</Text>
            <Text style={styles.actionPrice}>{formatPrice(price?.ask, digits)}</Text>
          </Pressable>
        </View>

        {submitting && (
          <View style={styles.submitting}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.hint}>{t('order.submitting')}</Text>
          </View>
        )}

        {outcome && (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.outcome,
              outcome.kind === 'success' ? styles.outcomeOk : styles.outcomeFail,
            ]}>
            <Text style={styles.outcomeTitle}>
              {outcome.kind === 'success'
                ? t('order.successTitle')
                : t('order.failureTitle')}
            </Text>
            <Text style={styles.outcomeText}>{outcome.message}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  symbol: { fontSize: 24, fontWeight: '700', color: colors.navy },
  description: { fontSize: 14, color: colors.muted, marginTop: 2 },
  quote: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 16,
  },
  quoteCell: { alignItems: 'center', flex: 1 },
  quoteLabel: { fontSize: 12, color: colors.muted },
  quoteValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.navy,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  quoteSpread: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 20, marginBottom: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    color: colors.navy,
    fontSize: 16,
  },
  hint: { fontSize: 12, color: colors.muted, marginTop: 6 },
  formError: { color: colors.down, fontSize: 14, marginTop: 16, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionButton: {
    flex: 1,
    height: 64,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sell: { backgroundColor: colors.down },
  buy: { backgroundColor: colors.up },
  disabled: { opacity: 0.45 },
  actionLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  actionPrice: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  submitting: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  outcome: { borderRadius: 10, borderWidth: 1, padding: 14, marginTop: 20 },
  outcomeOk: { borderColor: colors.up, backgroundColor: '#F0FDF4' },
  outcomeFail: { borderColor: colors.down, backgroundColor: '#FEF2F2' },
  outcomeTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  outcomeText: { fontSize: 14, color: colors.text, marginTop: 4, lineHeight: 20 },
});

export default OrderScreen;