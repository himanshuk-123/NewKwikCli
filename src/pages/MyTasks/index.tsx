import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
  ToastAndroid
} from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import SingleCard from "../../components/SingleCard";
import { COLORS } from "../../constants/Colors";
import { VehicleCE } from "../../assets";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Feather from "react-native-vector-icons/Feather";

// @ts-ignore
const ICON_SIZE_23 = { fontSize: 23 };
const ICON_SIZE_24 = { fontSize: 24 };
const VEHICLE_CE_ICON_STYLE = { width: 30, height: 20 };
const ICON_STRIP_STYLE = { height: 60 };
const PAGINATION_CONTAINER_STYLE: any = { flexDirection: 'row', justifyContent: 'center', padding: 10, gap: 20 };
const PAGE_TEXT_STYLE = { fontSize: 16 };
const PAGE_TEXT_PRIMARY = { fontSize: 16, color: COLORS.primary };

// Integration Imports
import { useFocusEffect } from "@react-navigation/native";
import { useMyTasksStore } from "../../features/myTasks/store/myTasks.store";
import { LeadListStatuswiseRespDataRecord } from "../../features/myTasks/types";

const DisplayIcons = [
  { vehicleType: "2W", icon: () => <Text style={ICON_SIZE_23}>🏍️</Text> },
  { vehicleType: "3W", icon: () => <Text style={ICON_SIZE_24}>🛺</Text> },
  { vehicleType: "4W", icon: () => <Text style={ICON_SIZE_24}>🚗</Text> },
  { vehicleType: "FE", icon: () => <Text style={ICON_SIZE_24}>🚜</Text> },
  { vehicleType: "CV", icon: () => <Text style={ICON_SIZE_24}>🚚</Text> },
  {
    vehicleType: "CE",
    icon: () => (
      <Image style={VEHICLE_CE_ICON_STYLE} source={VehicleCE} />
    ),
  },
];

// Helper Function: Billing Allowed
const isBillingAllowed = (item: LeadListStatuswiseRespDataRecord) => {
  let result = false;
  if (!item.LeadTypeName) return result;

  switch (item.LeadTypeName?.toLowerCase()) {
    case "retail":
      result = parseInt(item.RetailBillType, 10) === 2;
      break;
    case "repo":
      result = parseInt(item.RepoBillType, 10) === 2;
      break;
    case "cando":
      result = parseInt(item.CandoBillType, 10) === 2;
      break;
    case "asset":
      result = parseInt(item.AssetBillType, 10) === 2;
      break;
  }
  return result;
};

const MyTasksPage = () => {
  const navigation = useNavigation();
  const searchRef = useRef<any>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedVehicleType, setSelectedVehicleType] = useState("2W");

  // Store Hooks
  const {
    tasks,
    isLoading,
    initialize,
    setVehicle,
    countsByVehicle,
    currentVehicle,
    reset,
    confirmAppointment
  } = useMyTasksStore();

  // Fetch Data on Focus
  useFocusEffect(
    useCallback(() => {
      initialize();
      return undefined;
    }, [initialize])
  );

  // Keep local selection in sync with store (preserve filter on back)
  useEffect(() => {
    if (currentVehicle && currentVehicle !== selectedVehicleType) {
      setSelectedVehicleType(currentVehicle);
    }
  }, [currentVehicle, selectedVehicleType]);

  // Sync Local Vehicle State with Store
  const handleVehicleChange = (vehicleType: string) => {
    setSelectedVehicleType(vehicleType);
    setVehicle(vehicleType);
  };

  // Computed: Filtered Tasks (Search only, as Vehicle filter is API-side now)
  const filteredTasks = useMemo(() => {
    if (!searchText.trim()) return tasks;

    const search = searchText.trim().toLowerCase();
    return tasks.filter((item) =>
      item.LeadUId?.trim().toLowerCase().includes(search) ||
      item.CustomerName?.trim().toLowerCase().includes(search) ||
      item.ChassisNo?.trim().toLowerCase().includes(search)||
      item.RegNo?.trim().toLowerCase().includes(search)
    );
  }, [tasks, searchText]);

  if (isLoading && tasks.length === 0) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.AppTheme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ICON STRIP */}
      <View style={ICON_STRIP_STYLE}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.iconContainer}>
            {DisplayIcons.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.iconButton,
                  {
                    backgroundColor:
                      selectedVehicleType === item.vehicleType
                        ? COLORS.AppTheme.success
                        : "#fff",
                  } as any,
                ]}
                onPress={() => handleVehicleChange(item.vehicleType)}
              >
                
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{countsByVehicle[item.vehicleType] || 0}</Text>
                </View>
                <item.icon />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* MAIN CONTENT */}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* SEARCH */}
        <TouchableWithoutFeedback onPress={() => searchRef.current?.blur()}>
          <View style={styles.rowContainer}>
            <TextInput
              ref={searchRef}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search"
              style={styles.input}
              editable={true}
              placeholderTextColor={"grey"}
            />
            <TouchableOpacity onPress={() => searchRef.current?.focus()}>
              <Feather name="search" size={22} color="#666" />
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>

        {/* DATA / EMPTY STATE */}
        {filteredTasks.length > 0 ? (
          filteredTasks.map((item, index) => {
            const isRepoCase = item.LeadTypeName?.toLowerCase() === "repo";

            return (
              <SingleCard
                key={index}
                data={{
                  id: item.LeadUId?.toUpperCase(),
                  regNo: item.RegNo?.toUpperCase(),
                  vehicleName: item.Vehicle,
                  chassisNo: item.ChassisNo || "NA",
                  client: isRepoCase ? item.companyname : item.CustomerName,
                  isCash: isBillingAllowed(item),
                  location: isRepoCase ? item.YardName : item.cityname,
                  requestId: item.LeadUId?.toUpperCase(),
                  cashToBeCollected: isRepoCase ? item.RepoFeesAmount : item.RetailFeesAmount,
                  engineNo: item.EngineNo,
                  vehicleType: item.VehicleType?.toString() || "",
                  mobileNumber: item.CustomerMobileNo,
                  leadType: item.LeadTypeName,
                  leadId: item.Id,
                  companyName: item.companyname || "",
                  vehicleStatus: "Active",
                }}
                vehicleType={selectedVehicleType}
                onValuateClick={() => {
                  // @ts-ignore
                  navigation.navigate("Valuate", {
                    leadId: item.Id,
                    displayId: item.LeadUId?.toUpperCase(),
                    vehicleType: selectedVehicleType,
                    leadData: item,
                  });
                }}
                onAppointmentClick={() => {
                  DateTimePickerAndroid.open({
                    value: new Date(),
                    minimumDate: new Date(),
                    mode: 'date',
                    onChange: async (event, date) => {
                      if (event.type === 'dismissed' || !date) return;

                      try {
                        await confirmAppointment(item.Id?.toString() || '', date);
                        ToastAndroid.show('Appointment set successfully', ToastAndroid.SHORT);
                      } catch {
                        ToastAndroid.show('Failed to set appointment', ToastAndroid.SHORT);
                      }
                    },
                  });
                }}
              />
            )
          })
        ) : (
          <View style={styles.empty}>
            <Text style={styles.noDataText}>No Data Found</Text>
          </View>
        )}

        <View style={PAGINATION_CONTAINER_STYLE}>
          <TouchableOpacity onPress={() => useMyTasksStore.getState().setPage(useMyTasksStore.getState().pageNumber - 1)} disabled={useMyTasksStore.getState().pageNumber <= 1}>
            <Text style={PAGE_TEXT_PRIMARY}>Previous</Text>
          </TouchableOpacity>
          <Text style={PAGE_TEXT_STYLE}>Page {useMyTasksStore.getState().pageNumber}</Text>
          <TouchableOpacity onPress={() => useMyTasksStore.getState().setPage(useMyTasksStore.getState().pageNumber + 1)}>
            <Text style={PAGE_TEXT_PRIMARY}>Next</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MyTasksPage;

const styles = StyleSheet.create({
  safe: {
    paddingTop: 10,
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#fca5a5",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: '#000',
  },
  content: {
    flexGrow: 1,
    padding: 10,
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 9,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  noDataText: {
    fontSize: 18,
    fontWeight: "500",
  },
});
