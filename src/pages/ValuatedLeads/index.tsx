import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ToastAndroid,
} from "react-native";
import React from "react";
import { COLORS } from "../../constants/Colors";
import { useNavigation } from "@react-navigation/native";

// ============ STATIC DATA ============
const STATIC_VALUATED_LEADS = [
  {
    leadId: "KWC12345",
    regNo: "MH12AB1234",
    prospectNo: "LOAN123456",
    uploaded_count: 5,
    total_count: 8,
    lastValuated: "2026-01-03",
    vehicleType: "2W",
  },
  {
    leadId: "KWC12346",
    regNo: "DL01CD5678",
    prospectNo: "LOAN789012",
    uploaded_count: 8,
    total_count: 8,
    lastValuated: "2026-01-02",
    vehicleType: "4W",
  },
  {
    leadId: "KWC12347",
    regNo: "KA03EF9012",
    prospectNo: "LOAN345678",
    uploaded_count: 3,
    total_count: 8,
    lastValuated: "2026-01-01",
    vehicleType: "2W",
  },
]
// ============ STATIC DATA ============
const STATIC_VALUATED_LEADS2 = [
  {
    leadId: "KWC12345",
    regNo: "MH12AB1234",
    prospectNo: "LOAN123456",
    uploaded_count: 5,
    total_count: 8,
    lastValuated: "2026-01-03",
    vehicleType: "2W",
  },
  {
    leadId: "KWC12346",
    regNo: "DL01CD5678",
    prospectNo: "LOAN789012",
    uploaded_count: 8,
    total_count: 8,
    lastValuated: "2026-01-02",
    vehicleType: "4W",
  },
  {
    leadId: "KWC12347",
    regNo: "KA03EF9012",
    prospectNo: "LOAN345678",
    uploaded_count: 3,
    total_count: 8,
    lastValuated: "2026-01-01",
    vehicleType: "2W",
  },
];

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
  uploaded_count: number;
  total_count: number;
  lastValuated: string;
  onUploadPress: () => void;
}

const ValuationCard = ({
  leadId,
  regNo,
  prospectNo,
  uploaded_count,
  total_count,
  lastValuated,
  onUploadPress,
}: ValuationCardProps) => {
  const isPartiallyUploaded = total_count > uploaded_count;

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

      <View style={styles.cardFooter}>
        <View style={styles.uploadStatus}>
          <Text style={styles.uploadCount}>
            {uploaded_count}/{total_count}{" "}
          </Text>
          <Text style={styles.uploadLabel}>UPLOADED</Text>
        </View>

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

  const handleUploadPress = (item: (typeof STATIC_VALUATED_LEADS)[0]) => {
    const condition = item.total_count > item.uploaded_count;

    if (condition) {
      // Navigate to valuate screen for incomplete uploads
      ToastAndroid.show(
        "Navigating to valuation screen...",
        ToastAndroid.SHORT
      );
      navigation.navigate("Valuate", {
        id: item.leadId.toUpperCase(),
        vehicleType: item.vehicleType,
      });
    } else {
      // Show upload again message
      ToastAndroid.show("All images already uploaded", ToastAndroid.SHORT);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {STATIC_VALUATED_LEADS.length > 0 ? (
            STATIC_VALUATED_LEADS.map((item) => (
              <ValuationCard
                key={item.leadId}
                leadId={item.leadId}
                regNo={item.regNo}
                prospectNo={item.prospectNo}
                uploaded_count={item.uploaded_count}
                total_count={item.total_count}
                lastValuated={item.lastValuated}
                onUploadPress={() => handleUploadPress(item)}
              />
            ))
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No valuated leads found</Text>
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
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
  },
});
