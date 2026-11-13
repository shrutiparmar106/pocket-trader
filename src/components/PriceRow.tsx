import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import type { SymbolInfo } from '../mocks/data';
import { useAppSelector } from '../store/hooks';
import { selectPrice } from '../store/priceSlice';
import { colors } from '../theme';
import { formatPrice } from '../utils/format';

export const ROW_HEIGHT = 64;
export const ROW_COLUMNS = { price: 82, spread: 56 };
const FLASH_OPACITY = 0.3;
const FLASH_MS = 450;

type Props = {
  info: SymbolInfo;
  onPress: (info: SymbolInfo) => void;
};

/**
 * One list row. It selects ONLY its own symbol from the store, so a tick for
 * EURUSD re-renders just the EURUSD row. The green/red flash runs on the native
 * driver (opacity of an overlay), so it costs no JS work per frame.
 */
const PriceRow = ({ info, onPress }: Props) => {
  const selector = useMemo(() => selectPrice(info.symbol), [info.symbol]);
  const price = useAppSelector(selector);

  const upFlash = useRef(new Animated.Value(0)).current;
  const downFlash = useRef(new Animated.Value(0)).current;

  const version = price?.version;
  const direction = price?.direction;

  useEffect(() => {
    if (direction !== 'up' && direction !== 'down') {
      return;
    }
    const active = direction === 'up' ? upFlash : downFlash;
    const other = direction === 'up' ? downFlash : upFlash;
    other.setValue(0);
    active.setValue(FLASH_OPACITY);
    Animated.timing(active, {
      toValue: 0,
      duration: FLASH_MS,
      useNativeDriver: true,
    }).start();
  }, [version, direction, upFlash, downFlash]);

  const priceColor =
    direction === 'up' ? colors.up : direction === 'down' ? colors.down : colors.navy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${info.symbol} ${info.description}`}
      onPress={() => onPress(info)}
      style={styles.row}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.upFlash, opacity: upFlash }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.downFlash, opacity: downFlash }]}
      />
      <View style={styles.symbolColumn}>
        <Text style={styles.symbol}>{info.symbol}</Text>
        <Text style={styles.description} numberOfLines={1}>
          {info.description}
        </Text>
      </View>
      <Text style={[styles.price, { color: priceColor }]}>
        {formatPrice(price?.bid, info.digits)}
      </Text>
      <Text style={[styles.price, { color: priceColor }]}>
        {formatPrice(price?.ask, info.digits)}
      </Text>
      <Text style={styles.spread}>{formatPrice(price?.spread, info.digits)}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderStrong,
  },
  symbolColumn: { flex: 1, paddingRight: 8 },
  symbol: { color: colors.navy, fontSize: 15, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 11, marginTop: 2 },
  price: {
    width: ROW_COLUMNS.price,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  spread: {
    width: ROW_COLUMNS.spread,
    textAlign: 'right',
    fontSize: 12,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
});

export default memo(PriceRow);