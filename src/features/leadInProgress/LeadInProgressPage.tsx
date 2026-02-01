import React, { useEffect } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLeadInProgressStore } from './store/leadInProgress.store';
import ValuationDataCard from '../../components/ValuationDataCard';
import { COLORS } from '../../constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const LeadsInProgressPage = () => {
  const { leads, isLoading, fetchLeads, reset } = useLeadInProgressStore();

  useEffect(() => {
    fetchLeads();
    return () => reset(); // Cleanup on unmount
  }, []);

  if (isLoading && leads.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.AppTheme.primary} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => (
    <ValuationDataCard
      topLeftComponent={
        <View style={styles.columnDisplay}>
          <Text style={styles.textMd} numberOfLines={1}>
            Lead Id: <Text style={{ color: 'black' }}>{item.LeadUId || 'NA'}</Text>
          </Text>
          <Text style={styles.textMd} numberOfLines={1}>
            Reg. Number : <Text style={{ color: 'black' }}>{item.RegNo || 'NA'}</Text>
          </Text>
          <Text style={styles.textMd} numberOfLines={1}>
            Name: <Text style={{ textTransform: 'uppercase', color: 'black' }}>{item.CustomerName || 'NA'}</Text>
          </Text>
        </View>
      }
      topRightComponent={
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.textSecondary}>Created Date</Text>
          <Text style={styles.textPrimary}>
            {item.AddedByDate ? item.AddedByDate.split('T')[0] : 'NA'}
            {/* Simple date formatting if convertDateString not avail, or import it if widely used */}
          </Text>
        </View>
      }
      bottomLeftComponent={
        <View>
          <Text style={[styles.textXl, { color: COLORS.Dashboard.text.Orange, textTransform: 'capitalize' }]}>
            pending with qc
          </Text>
        </View>
      }
      bottomRightComponent={
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.textSecondary}>Valuated Date</Text>
          <Text style={styles.textPrimary}>
            {item.QcUpdateDate ? item.QcUpdateDate.split('T')[0] : 'N/A'}
          </Text>
        </View>
      }
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={leads}
        renderItem={renderItem}
        keyExtractor={(item) => item.LeadUId?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.center}>
              <Text style={styles.textXl}>No leads in progress</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 10,
    paddingBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  columnDisplay: {
    flexDirection: 'column',
    gap: 4,
  },
  textMd: {
    fontSize: 14,
    color: '#666',
  },
  textXl: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  textSecondary: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  textPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.AppTheme.primary,
    textAlign: 'right',
  },
});

export default LeadsInProgressPage;
