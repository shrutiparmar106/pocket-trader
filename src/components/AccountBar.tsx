import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../store/hooks';
import { colors } from '../theme';
import { formatMoney } from '../utils/format';

/** Balance and equity from GET /accounts/me. Shown on every signed-in screen. */
const AccountBar = () => {
  const { t } = useTranslation();
  const account = useAppSelector(state => state.account.account);
  const currency = account?.currency ?? '';

  return (
    <View style={styles.bar} accessibilityRole="summary">
      <View style={styles.item}>
        <Text style={styles.label}>{t('account.balance')}</Text>
        <Text style={styles.value}>
          {account ? `${formatMoney(account.balance)} ${currency}` : '--'}
        </Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>{t('account.equity')}</Text>
        <Text style={styles.value}>
          {account ? `${formatMoney(account.equity)} ${currency}` : '--'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  item: { flex: 1 },
  label: { color: '#93C5FD', fontSize: 12 },
  value: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 2 },
});

export default AccountBar;