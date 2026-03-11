import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ToastAndroid,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import React, { useState } from "react";
import { COLORS } from "../../constants/Colors";
import { useNavigation } from "@react-navigation/native";
import { useValuationLeads } from "../../hooks/useValuationLeads";

// ============ STATIC DATA - REMOVED (Now using dynamic data) ============

// ============ HELPER FUNCTIONS ============
const convertDateString = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// ============ COMPONENTS ============
interface ValuationCardProps {
  leadId: string;
  regNo: string;
  prospectNo: string;
  uploadedCount: number;
  totalCount: number;
  uploadProgress: number;
  lastValuated: string;
  onUploadPress: () => void;
}

const ValuationCard = ({
  leadId,
  regNo,
  prospectNo,
  uploadedCount,
  totalCount,
  uploadProgress,
  lastValuated,
  onUploadPress,
}: ValuationCardProps) => {
  const isPartiallyUploaded = totalCount > uploadedCount;

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.leftSection}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Lead Id: </Text>
            <Text style={styles.value}>{leadId ?? "NA"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Reg. Number: </Text>
            <Text style={styles.value}>{regNo ?? "NA"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Loan Number: </Text>
            <Text style={[styles.value, styles.uppercase]}>
              {prospectNo ?? "NA"}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <Text style={styles.dateLabel}>Valuated Date</Text>
          <Text style={styles.dateValue}>
            {lastValuated ? convertDateString(lastValuated) : "NA"}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(uploadProgress, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{uploadProgress}% uploaded</Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.uploadStatus}>
          <Text style={styles.uploadCount}>
            {uploadedCount}/{totalCount}{" "}
          </Text>
          <Text style={styles.uploadLabel}>UPLOADED</Text>
        </View>

        <Text style={styles.remainingText}>
          Left: {Math.max(totalCount - uploadedCount, 0)}
        </Text>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={onUploadPress}
          activeOpacity={0.7}
        >
          <Text style={styles.uploadButtonText}>
            {isPartiallyUploaded ? "Valuate" : "Upload Again"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};



export default function ValuatedLeads() {
  const navigation = useNavigation<any>();
  const { leads, isLoading, error, refetch } = useValuationLeads();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleUploadPress = async (item: any) => {
    console.log('[ValuatedLeads] Attempting to navigate with item:', {
      leadId: item.leadId,
      regNo: item.regNo,
      vehicleType: item.vehicleType,
      uploadedCount: item.uploadedCount,
      totalCount: item.totalCount,
    });

    // ✅ Safety check: Ensure required data exists
    if (!item.leadId) {
      console.error('[ValuatedLeads] Missing leadId, cannot navigate');
      ToastAndroid.show("Error: Lead ID missing", ToastAndroid.SHORT);
      return;
    }

    // Allow navigation even if vehicleType was not previously stored,
    // but log it and fall back safely so the user is not blocked.
    let vehicleType = item.vehicleType as string | undefined;
    if (!vehicleType) {
      console.warn('[ValuatedLeads] Missing vehicleType, falling back to default "2W" for lead:', item.leadId);
      vehicleType = '2W';
      ToastAndroid.show(
        "Vehicle type missing in history, using 2W as default",
        ToastAndroid.SHORT
      );
    }

    const condition = item.totalCount > item.uploadedCount;

    if (condition) {
      // Use regNo as displayId (like MyTasks does)
      // If regNo is empty, use leadId as fallback
      const displayId = item.regNo || item.leadId;

      // ✅ IMPORTANT: Update database with regNo BEFORE navigation
      // This ensures ValuatedLeads shows the same displayId as MyTask when they return
      if (!item.regNo && displayId !== item.leadId) {
        try {
          const { updateLeadMetadata } = await import('../../database/valuationProgress.db');
          await updateLeadMetadata(item.leadId, { regNo: displayId });
          console.log('[ValuatedLeads] Updated regNo in database:', displayId);
        } catch (error) {
          console.warn('[ValuatedLeads] Failed to update regNo in database:', error);
          // Continue anyway - navigation shouldn't be blocked by this
        }
      }

      // Navigate to valuate screen for incomplete uploads
      console.log('[ValuatedLeads] Navigating to Valuate screen:', {
        leadId: item.leadId,
        displayId,
        vehicleType,
      });
      
      ToastAndroid.show(
        `Opening valuation for ${displayId}`,
        ToastAndroid.SHORT
      );
      
      // ✅ Pass correct parameter names, reusing the same route shape as MyTasks
      navigation.navigate("Valuate", {
        leadId: item.leadId,
        displayId,
        vehicleType,
      });
    } else {
      // Show upload again message
      console.log('[ValuatedLeads] All images uploaded for:', item.leadId);
      ToastAndroid.show(
        `${item.regNo || item.leadId}: All ${item.totalCount} images uploaded ✓`,
        ToastAndroid.SHORT
      );
    }
  };

  // Show loading only on first load, not on refresh
  if (isLoading && !refreshing && leads.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.AppTheme.primary} />
          <Text style={styles.loadingText}>Loading valuated leads...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  console.log('[ValuatedLeads] Rendering:', {
    leadsCount: leads.length,
    isLoading,
    error,
    firstLead: leads[0] ? {
      leadId: leads[0].leadId,
      regNo: leads[0].regNo,
      uploadedCount: leads[0].uploadedCount,
      totalCount: leads[0].totalCount,
    } : null,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.AppTheme.primary]}
            tintColor={COLORS.AppTheme.primary}
          />
        }
      >
        <View style={styles.container}>
          {leads.length > 0 ? (
            <>
              <View style={styles.headerContainer}>
                <Text style={styles.headerText}>
                  {leads.length} Valuated Vehicle{leads.length !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.subHeaderText}>
                  Pull down to refresh
                </Text>
              </View>
              {leads.map((item) => (
                <ValuationCard
                  key={item.leadId}
                  leadId={item.leadId}
                  regNo={item.regNo}
                  prospectNo={item.prospectNo}
                  uploadedCount={item.uploadedCount}
                  totalCount={item.totalCount}
                  uploadProgress={item.uploadProgress}
                  lastValuated={item.lastValuated}
                  onUploadPress={() => handleUploadPress(item)}
                />
              ))}
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>
                📋 No valuated leads yet
              </Text>
              <Text style={styles.noDataSubText}>
                Start valuating a vehicle from "My Tasks" to see it here
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 15,
    gap: 15,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  leftSection: {
    flex: 1,
    gap: 5,
  },
  rightSection: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    color: "#666",
    fontWeight: "400",
  },
  value: {
    fontSize: 14,
    color: "#000",
    fontWeight: "500",
  },
  uppercase: {
    textTransform: "uppercase",
  },
  dateLabel: {
    fontSize: 14,
    color: "#666",
    textAlign: "right",
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.AppTheme.primary,
    textAlign: "right",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  uploadStatus: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  uploadCount: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.Dashboard.text.Green || "#10B981",
  },
  uploadLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  remainingText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  uploadButton: {
    backgroundColor: COLORS.AppTheme.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 96,
    alignItems: "center",
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  progressContainer: {
    marginBottom: 12,
    gap: 6,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.Dashboard.text.Green || "#10B981",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    color: "#dc2626",
    fontWeight: "600",
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  noDataText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  noDataSubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  headerContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  subHeaderText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "400",
  },
});
