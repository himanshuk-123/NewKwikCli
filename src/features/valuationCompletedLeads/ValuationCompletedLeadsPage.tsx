import React, { useEffect } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ViewStyle } from 'react-native';
import { useValuationCompletedLeadsStore } from './store/valuationCompletedLeads.store';
import ValuationDataCard from '../../components/ValuationDataCard';
import { COLORS } from '../../constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { openUrlInBrowser } from '../../utils/openUrlInBrowser';
import { share } from '../../utils/share';

interface CounterProps {
  primaryText: string;
  count: string | number;
  backgroundStyle: ViewStyle;
}

const Counter = (props: CounterProps) => {
  return (
    <View style={[styles.counterContainer, props.backgroundStyle]}>
      <Text style={styles.counterPrimaryText}>{props.primaryText}</Text>
      <Text style={styles.counterCount}>{props.count}</Text>
    </View>
  );
};

const ValuationCompletedLeadsPage = () => {
  const { leads, dayBook, isLoading, fetchLeads, reset } = useValuationCompletedLeadsStore();

  useEffect(() => {
    fetchLeads();
    return () => reset();
  }, []);

  const renderHeader = () => (
    <View style={styles.counterStack}>
      <Counter
        backgroundStyle={{ backgroundColor: COLORS.Dashboard.bg.Blue }}
        primaryText="TODAY'S COUNT"
        count={dayBook.Today}
      />
      <Counter
        backgroundStyle={{ backgroundColor: COLORS.Dashboard.bg.Green }}
        primaryText="TDM"
        count={dayBook.thismonth}
      />
      <Counter
        backgroundStyle={{ backgroundColor: COLORS.Dashboard.bg.Orange }}
        primaryText="PREV'S MONTH"
        count={dayBook.lastmonth}
      />
    </View>
  );

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
            Lead Id: <Text style={{ fontWeight: 'bold', color: 'black' }}>{item.LeadUId || 'NA'}</Text>
          </Text>
          <Text style={styles.textMd} numberOfLines={1}>
            Reg. Number : <Text style={{ fontWeight: 'bold', color: 'black' }}>{item.RegNo || 'NA'}</Text>
          </Text>
          <Text style={styles.textMd} numberOfLines={1}>
            Loan Number: <Text style={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'black' }}>{item.ProspectNo || 'NA'}</Text>
          </Text>
        </View>
      }
      topRightComponent={
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => openUrlInBrowser(item.ViewUrl)}>
            <Feather name="eye" size={20} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openUrlInBrowser(item.DownLoadUrl)}>
            <Feather name="download-cloud" size={20} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => share(item.ViewUrl)}>
            <Feather name="share" size={20} color="black" />
          </TouchableOpacity>
        </View>
      }
      bottomLeftComponent={
        <View style={styles.columnDisplay}>
          <Text style={styles.textSecondary}>Created Date</Text>
          <Text style={[styles.textMd, { fontWeight: '600', color: COLORS.AppTheme.primary }]}>
            {item.AddedByDate ? item.AddedByDate.split('T')[0] : 'NA'}
          </Text>
        </View>
      }
      bottomRightComponent={
        <View style={[styles.columnDisplay, { alignItems: 'flex-end' }]}>
          <Text style={styles.textSecondary}>Completed Date</Text>
          <Text style={[styles.textMd, { fontWeight: '600', color: COLORS.Dashboard.text.Green }]}>
            {item.PriceUpdateDate ? item.PriceUpdateDate.split('T')[0] : 'N/A'}
          </Text>
        </View>
      }
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={renderHeader}
        data={leads}
        renderItem={renderItem}
        keyExtractor={(item) => item.LeadUId?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.center}>
              <Text style={styles.textXl}>No completed leads found</Text>
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
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 10,
    paddingBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  columnDisplay: {
    flexDirection: 'column',
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 15, // $3 gap approx
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
  },
  // Counter styles
  counterStack: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 10,
  },
  counterContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 85,
    width: 100, // slightly adjusted from Expo 110 to fit different screens
    borderRadius: 8,
    paddingVertical: 10,
    paddingBottom: 15,
  },
  counterPrimaryText: {
    fontSize: 12,
    color: '#333',
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 5,
  },
  counterCount: {
    fontSize: 24,
    color: COLORS.AppTheme.primary,
    textAlign: "center",
    fontWeight: "600",
  },
});

export default ValuationCompletedLeadsPage;
