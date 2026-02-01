import React from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import {COLORS} from "../../constants/Colors";

interface CompletedLead {
  LeadUId: string;
  RegNo: string;
  ProspectNo: string;
  AddedByDate: string;
  PriceUpdateDate: string;
  ViewUrl: string;
  DownLoadUrl: string;
}

const STATIC_DAYBOOK = {
  Today: 5,
  thismonth: 12,
  lastmonth: 28,
};

const STATIC_COMPLETED_LEADS: CompletedLead[] = [
  {
    LeadUId: "LD-2024-0001",
    RegNo: "KA03XX1234",
    ProspectNo: "LN-2391922",
    AddedByDate: "2024-06-01",
    PriceUpdateDate: "2024-06-10",
    ViewUrl: "https://example.com/view/ld-2024-0001",
    DownLoadUrl: "https://example.com/download/ld-2024-0001",
  },
  {
    LeadUId: "LD-2024-0002",
    RegNo: "KA03YY2345",
    ProspectNo: "LN-2391923",
    AddedByDate: "2024-06-02",
    PriceUpdateDate: "2024-06-11",
    ViewUrl: "https://example.com/view/ld-2024-0002",
    DownLoadUrl: "https://example.com/download/ld-2024-0002",
  },
];

interface CounterProps {
  primaryText: string;
  count: string | number;
  backgroundColor: string;
}

const Counter = ({ primaryText, count, backgroundColor }: CounterProps) => {
  return (
    <View style={[styles.counterContainer, { backgroundColor }]}>
      <Text style={styles.counterPrimaryText}>{primaryText}</Text>
      <Text style={styles.counterCount}>{count}</Text>
    </View>
  );
};

interface CompletedLeadCardProps {
  leadId: string;
  regNo: string;
  loanNo: string;
  createdDate: string;
  completedDate: string;
  viewUrl: string;
  downloadUrl: string;
}

const CompletedLeadCard = ({
  leadId,
  regNo,
  loanNo,
  createdDate,
  completedDate,
  viewUrl,
  downloadUrl,
}: CompletedLeadCardProps) => {
  const openUrl = (url: string) => {
    // placeholder for navigation / deep link
    console.log("OPEN URL", url);
  };

  const shareUrl = (url: string) => {
    console.log("SHARE URL", url);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.topLeftComponent}>
          <Text style={styles.textMdSecondary} numberOfLines={1}>
            Lead Id: <Text style={styles.textBold}>{leadId}</Text>
          </Text>
          <Text style={styles.textMdSecondary} numberOfLines={1}>
            Reg. Number: <Text style={styles.textBold}>{regNo}</Text>
          </Text>
          <Text style={styles.textMdSecondary} numberOfLines={1}>
            Loan Number: <Text style={styles.textBold}>{loanNo}</Text>
          </Text>
        </View>
        <View style={styles.iconRow}>
          <TouchableOpacity onPress={() => openUrl(viewUrl)}>
            <Feather name="eye" size={20} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openUrl(downloadUrl)}>
            <Feather name="download-cloud" size={20} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => shareUrl(viewUrl)}>
            <Feather name="share" size={20} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardRowBottom}>
        <View style={styles.bottomLeftColumn}>
          <Text style={styles.textMdSecondary}>Created Date</Text>
          <Text style={styles.textMdPrimary}>{createdDate}</Text>
        </View>
        <View style={styles.bottomRightColumn}>
          <Text style={[styles.textMdSecondary, styles.textRight]}>Completed Date</Text>
          <Text style={[styles.textMdPrimary, styles.textCompleted]}>
            {completedDate || "N/A"}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function ValuationCompletedLeads() {
  const completedLeads = STATIC_COMPLETED_LEADS;
  const dayBook = STATIC_DAYBOOK;

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.pagePadding}>
        <View style={styles.counterStack}>
          <Counter
            backgroundColor={COLORS.Dashboard.bg.Blue}
            primaryText="TODAY'S COUNT"
            count={dayBook.Today}
          />
          <Counter
            backgroundColor={COLORS.Dashboard.bg.Green}
            primaryText="TDM"
            count={dayBook.thismonth}
          />
          <Counter
            backgroundColor={COLORS.Dashboard.bg.Orange}
            primaryText="PREV'S MONTH"
            count={dayBook.lastmonth}
          />
        </View>
        <View style={styles.container}>
          {completedLeads?.length > 0 ? (
            completedLeads.map((lead) => (
              <CompletedLeadCard
                key={lead.LeadUId}
                leadId={lead.LeadUId}
                regNo={lead.RegNo}
                loanNo={lead.ProspectNo}
                createdDate={lead.AddedByDate}
                completedDate={lead.PriceUpdateDate}
                viewUrl={lead.ViewUrl}
                downloadUrl={lead.DownLoadUrl}
              />
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
  topLeftComponent: {
    flex: 1,
    flexDirection: "column",
    gap: 6,
    paddingRight: 8,
  },
  counterStack: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  counterContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: 90,
    width: "32%",
    borderRadius: 12,
    paddingVertical: 10,
  },
  counterPrimaryText: {
    fontSize: 13,
    color: COLORS.Dashboard.text.Grey,
    fontWeight: "600",
    textAlign: "center",
    height: 36,
    letterSpacing: 0.25,
  },
  counterCount: {
    fontSize: 28,
    color: COLORS.AppTheme.primary,
    textAlign: "center",
    fontWeight: "700",
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
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardRowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  bottomLeftColumn: {
    flex: 1,
    gap: 2,
  },
  bottomRightColumn: {
    gap: 2,
  },
  textMdSecondary: {
    fontSize: 14,
    color:"#0c0c0c",
    fontWeight: "600",
  },
  textMdPrimary: {
    fontSize: 14,
    color: COLORS.AppTheme.primary,
    fontWeight: "600",
  },
  textBold: {
    fontWeight: "500",
    color: "#4c4d4e",
  },
  textRight: {
    textAlign: "right",
  },
  textCompleted: {
    color: COLORS.Dashboard.text.Green,
    textAlign: "right",
  },
  noLeadsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  noLeadsText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
});
