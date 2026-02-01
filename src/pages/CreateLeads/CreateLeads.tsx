import {
  BackHandler,
  StyleSheet,
  ToastAndroid,
  TouchableOpacity,
  View,
  Text as RNText,
  TextInput,
  Modal,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useCallback, useEffect, useState } from "react";
import { COLORS } from "../../constants/Colors";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCreateLeadStore } from "../../features/createLead/store/createLead.store";

// ============ COMPONENTS (Kept as is) ============

interface CustomInputProps {
  isNumeric?: boolean;
  maxLength?: number;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}

const CustomInput = ({
  isNumeric,
  maxLength,
  placeholder,
  value,
  onChangeText,
}: CustomInputProps) => {
  return (
    <TextInput
      style={styles.textInput}
      placeholder={placeholder}
      placeholderTextColor="#999"
      value={value}
      onChangeText={onChangeText}
      keyboardType={isNumeric ? "numeric" : "default"}
      maxLength={maxLength}
    />
  );
};

interface SelectorProps {
  keyText: string;
  valueText: string;
  onPress: () => void;
  disabled?: boolean;
}

const Selector = ({ keyText, valueText, onPress, disabled }: SelectorProps) => {
  return (
    <TouchableOpacity
      style={[styles.selectorContainer, disabled && styles.disabledSelector]}
      onPress={onPress}
      disabled={disabled}
    >
      <RNText style={styles.selectorLabel}>{keyText}</RNText>
      <RNText style={styles.selectorValue}>
        {valueText || "Select..."}
      </RNText>
    </TouchableOpacity>
  );
};

interface LayoutProps {
  children: React.ReactNode;
  style?: any;
}

const Layout = ({ children, style }: LayoutProps) => {
  return (
    <SafeAreaView style={[styles.layoutContainer, style]}>
      <ScrollView
        contentContainerStyle={styles.layoutContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};

// ============ MAIN SCREEN ============

const CreateLeads = () => {
  const navigation = useNavigation();
  const [showModal, setShowModal] = useState(false);
  const [filterData, setFilterData] = useState("");

  // Local state for BottomSheet to handle dynamic lists
  const [bottomSheetData, setBottomSheetData] = useState<{
    key: string;            // Field Name to set
    value: string[];        // List of Strings to show
  }>({ key: "", value: [] });

  const {
    formData,
    dropdowns,
    isLoading,
    error,
    successMessage,
    initialize,
    reset,
    setField,
    fetchVehicleTypesForCompany,
    fetchAreasForCity,
    fetchCitiesForState,
    fetchYardsForState,
    submit
  } = useCreateLeadStore();

  // Initialize on Mount
  useFocusEffect(
    useCallback(() => {
      initialize();
      return () => {
        reset(); // Clear form on exit
      };
    }, [initialize, reset])
  );

  // Handle Success/Error Toasts
  useEffect(() => {
    if (error) {
      ToastAndroid.show(error, ToastAndroid.LONG);
    }
    if (successMessage) {
      ToastAndroid.show(successMessage, ToastAndroid.LONG);
      navigation.goBack();
    }
  }, [error, successMessage, navigation]);

  // Modal Handlers
  const handlePresentModalPress = useCallback(() => setShowModal(true), []);
  const handleCloseModalPress = useCallback(() => {
    setShowModal(false);
    setFilterData("");
  }, []);

  // Back Button for Modal
  useEffect(() => {
    const backAction = () => {
      if (showModal) {
        handleCloseModalPress();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [showModal, handleCloseModalPress]);

  // Submit Handler
  const HandleSubmit = () => {
    const isRepo = formData.vehicleType.toLowerCase() === "repo";
    if (!formData.clientName || !formData.vehicleType || !formData.registrationNumber || !formData.customerName || !formData.customerMobile) {
      ToastAndroid.show("Please fill mandatory fields", ToastAndroid.SHORT);
      return;
    }
    if (isRepo && (!formData.yardName || !formData.chassisNo)) {
      ToastAndroid.show("Yard Name and Chassis No are required for Repo", ToastAndroid.SHORT);
      return;
    }
    // Retail validations if needed (Customer State/City/Area)
    if (!isRepo && (!formData.customerState || !formData.customerCity)) {
      ToastAndroid.show("State and City are required for Retail", ToastAndroid.SHORT);
      return;
    }

    submit();
  };

  const openSelection = (key: string, list: string[]) => {
    setBottomSheetData({ key, value: list });
    handlePresentModalPress();
  };

  if (isLoading && !showModal) {
    // Optional blocking loader logic
  }

  return (
    <>
      <Layout style={styles.layoutStyle}>
        {isLoading && <ActivityIndicator size="small" color={COLORS.AppTheme.primary} style={{ alignSelf: 'center', marginBottom: 10 }} />}

        {/* Client Name */}
        <Selector
          keyText="Client Name"
          valueText={formData.clientName}
          onPress={() => openSelection("clientName", dropdowns.companies.map(c => c.name))}
        />

        <View style={styles.divider} />

        {/* Vehicle Type (Dynamic based on Client) */}
        <Selector
          keyText="Vehicle Type"
          valueText={formData.vehicleType}
          onPress={() => openSelection("vehicleType", dropdowns.vehicleTypes.map(v => v.name))}
          disabled={!formData.clientName}
        />

        <View style={styles.divider} />

        {/* Vehicle Category */}
        <Selector
          keyText="Vehicle Category"
          valueText={formData.vehicleCategory}
          onPress={() => openSelection("vehicleCategory", ["2W", "3W", "4W", "FE", "CV", "CE"])}
        />

        <View style={styles.divider} />

        {/* Client City - Dynamic from Store (StateCityList) */}
        <Selector
          keyText="Client City"
          valueText={formData.clientCity}
          onPress={() => openSelection("clientCity", dropdowns.clientCities)}
        />

        <View style={styles.divider} />

        {/* Registration Number */}
        <CustomInput
          placeholder="Registration Number"
          value={formData.registrationNumber}
          maxLength={11}
          onChangeText={(value) => setField("registrationNumber", value)}
        />

        {/* Chassis Number (Repo Only) */}
        {formData.vehicleType.toLowerCase() === "repo" && (
          <>
            <View style={styles.spacer} />
            <CustomInput
              placeholder="Chassis Number"
              value={formData.chassisNo}
              onChangeText={(value) => setField("chassisNo", value)}
            />
          </>
        )}

        <View style={styles.spacer} />

        {/* Prospect Number */}
        <CustomInput
          placeholder="Prospect Number"
          value={formData.prospectNumber}
          onChangeText={(value) => setField("prospectNumber", value)}
        />

        <View style={styles.spacer} />

        {/* Customer Name */}
        <CustomInput
          placeholder="Customer Name"
          value={formData.customerName}
          onChangeText={(value) => setField("customerName", value)}
        />

        <View style={styles.spacer} />

        {/* Customer Mobile */}
        <CustomInput
          isNumeric
          maxLength={10}
          placeholder="Customer Mobile Number"
          value={formData.customerMobile}
          onChangeText={(value) => setField("customerMobile", value)}
        />

        <View style={styles.spacer} />

        {/* Customer State - Dynamic from Store */}
        <Selector
          keyText="Customer State"
          valueText={formData.customerState}
          onPress={() => openSelection("customerState", dropdowns.states)}
        />

        <View style={styles.divider} />

        {/* Yard Name / Customer City */}
        <Selector
          keyText={formData.vehicleType.toLowerCase() === "repo" ? "Yard Name" : "Customer City"}
          valueText={formData.vehicleType.toLowerCase() === "repo" ? formData.yardName : formData.customerCity}
          onPress={() => {
            if (!formData.customerState) {
              ToastAndroid.show("Please Select Customer State first", ToastAndroid.SHORT);
              return;
            }

            if (formData.vehicleType.toLowerCase() === "repo") {
              openSelection("yardName", dropdowns.yards.map(y => y.name));
            } else {
              // Dynamic Customer Cities based on State
              openSelection("customerCity", dropdowns.customerCities);
            }
          }}
        />

        {/* Customer Area & Pin (Retail Only) */}
        {formData.vehicleType.toLowerCase() !== "repo" && (
          <>
            <View style={styles.divider} />

            <Selector
              keyText="Customer Area"
              valueText={formData.customerArea}
              onPress={() => {
                if (!formData.customerCity) {
                  ToastAndroid.show("Please Select Customer City first", ToastAndroid.SHORT);
                  return;
                }
                openSelection("customerArea", dropdowns.areas.map(a => a.name));
              }}
            />

            <View style={styles.divider} />

            <CustomInput
              isNumeric
              maxLength={6}
              placeholder="Customer Pincode"
              value={formData.customerPin}
              onChangeText={(value) => setField("customerPin", value)}
            />

            <View style={styles.spacer} />

            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              placeholder="Customer Address"
              placeholderTextColor="#999"
              value={formData.customerAddress}
              onChangeText={(value) => setField("customerAddress", value)}
              multiline
              numberOfLines={4}
            />
          </>
        )}

        <View style={styles.spacer} />
        <View style={styles.spacer} />

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && { opacity: 0.7 }]}
          onPress={HandleSubmit}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <RNText style={styles.submitButtonText}>{isLoading ? "Submitting..." : "Submit"}</RNText>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </Layout>

      {/* Selection Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModalPress}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#999"
              value={filterData}
              onChangeText={setFilterData}
            />

            <FlatList
              data={bottomSheetData.value.filter((item) =>
                item.toLowerCase().includes(filterData.toLowerCase())
              )}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => {
                    const key = bottomSheetData.key;
                    // Trigger Store Actions on Change
                    setField(key as any, item);

                    // Logic Chains (Cascading Dropdowns)
                    if (key === "clientName") {
                      fetchVehicleTypesForCompany(item);
                      setField("vehicleType", ""); // Reset child
                    }
                    if (key === "customerState") {
                      // Fetch Cities and Yards for State
                      fetchCitiesForState(item);
                      setField("customerCity", "");
                      setField("customerArea", "");

                      // If Repo, fetch yards
                      if (formData.vehicleType.toLowerCase() === "repo") {
                        fetchYardsForState(item);
                        setField("yardName", "");
                      }
                    }
                    if (key === "customerCity") {
                      fetchAreasForCity(item);
                      setField("customerArea", "");
                      setField("customerPin", "");
                    }
                    if (key === "customerArea") {
                      const area = dropdowns.areas.find(a => a.name === item);
                      if (area) {
                        setField("customerPin", area.pincode.toString());
                      }
                    }

                    handleCloseModalPress();
                  }}
                >
                  <RNText style={styles.listItemText}>
                    {item.replace("(Client)", "").trim()}
                  </RNText>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseModalPress}
            >
              <RNText style={styles.closeButtonText}>Close</RNText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default CreateLeads;

const styles = StyleSheet.create({
  layoutStyle: {
    backgroundColor: "white",
    position: "relative",
  },
  layoutContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  layoutContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  selectorContainer: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: COLORS.Dashboard.bg.Grey,
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  disabledSelector: {
    opacity: 0.6,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.AppTheme.primary,
  },
  selectorValue: {
    fontSize: 14,
    color: "#666",
    textTransform: "capitalize",
    maxWidth: '60%'
  },
  textInput: {
    height: 50,
    backgroundColor: COLORS.Dashboard.bg.Grey,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 14,
    color: "#000",
    marginVertical: 8,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 8,
  },
  spacer: {
    height: 8,
  },
  bottomPadding: {
    height: 80,
  },
  submitButton: {
    backgroundColor: COLORS.AppTheme.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 16,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    minHeight: "50%",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  searchInput: {
    height: 50,
    backgroundColor: COLORS.Dashboard.bg.Grey,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 14,
    color: "#000",
    marginBottom: 20,
  },
  listItem: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  listItemText: {
    fontSize: 14,
    color: COLORS.AppTheme.primary,
    textTransform: "capitalize",
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: COLORS.AppTheme.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
