import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/Colors";

interface LeadInProgress {
  LeadUId: string;
  RegNo: string;
  CustomerName: string;
  AddedByDate: string;
  QcUpdateDate: string;
}

const STATIC_LEADS: LeadInProgress[] = [
  {
    LeadUId: "LD-2024-0101",
    RegNo: "KA01AB1234",
    CustomerName: "Arjun Rao",
    AddedByDate: "2024-06-01",
    QcUpdateDate: "2024-06-05",
  },
  {
    LeadUId: "LD-2024-0102",
    RegNo: "KA02CD5678",
    CustomerName: "Meera Iyer",
    AddedByDate: "2024-06-03",
    QcUpdateDate: "2024-06-07",
  },
];

export default function LeadsInProgress() {
  const leadsInProgress = STATIC_LEADS;

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.pagePadding}>
        <View style={styles.container}>
          {leadsInProgress?.length > 0 ? (
            leadsInProgress.map((lead) => (
              <View key={lead.LeadUId} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.leftColumn}>
                    <Text style={styles.textMdPrimary} numberOfLines={1}>
                      Lead Id: <Text style={styles.textBold}>{lead.LeadUId}</Text>
                    </Text>
                    <Text style={styles.textMdPrimary} numberOfLines={1}>
                      Reg. Number: <Text style={styles.textBold}>{lead.RegNo}</Text>
                    </Text>
                    <Text style={styles.textMdSecondary} numberOfLines={1}>
                      Name: <Text style={styles.textUpper}>{lead.CustomerName}</Text>
                    </Text>
                  </View>
                  <View style={styles.rightColumn}>
                    <Text style={styles.textLabel}>Created Date</Text>
                    <Text style={styles.textValue}>{lead.AddedByDate}</Text>
                  </View>
                </View>

                <View style={styles.cardRowBottom}>
                  <Text style={styles.statusText}>pending with qc</Text>
                  <View style={styles.rightColumn}>
                    <Text style={styles.textLabel}>Valuated Date</Text>
                    <Text style={styles.textValue}>{lead.QcUpdateDate || "N/A"}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noLeadsContainer}>
              <Text style={styles.noLeadsText}>No leads in progress</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "white",
  },
  pagePadding: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  container: {
    gap: 14,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cardRowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  leftColumn: {
    flex: 1,
    gap: 6,
    paddingRight: 8,
  },
  rightColumn: {
    gap: 4,
    alignItems: "flex-end",
  },
  textMdPrimary: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  textMdSecondary: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  textBold: {
    fontSize: 14,
    color: COLORS.AppTheme.primary,
    fontWeight: "700",
  },
  textUpper: {
    fontSize: 14,
    color: COLORS.AppTheme.primary,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  textLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  textValue: {
    fontSize: 16,
    color: COLORS.AppTheme.primary,
    fontWeight: "700",
    textAlign: "right",
  },
  statusText: {
    fontSize: 14,
    color: COLORS.Dashboard.text.Orange,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  noLeadsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  noLeadsText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});
