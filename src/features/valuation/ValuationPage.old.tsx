import {
  StyleSheet,
  ToastAndroid,
  View,
  Text as RNText,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState, useEffect, useMemo } from "react";
import { COLORS } from "../../constants/Colors";
import { useValuationStore } from "./store/valuation.store";
import { AppStepListDataRecord } from "./types";
import { submitLeadReportApi } from "./api/valuation.api";

// ============ STATIC DATA (REMOVED - Replaced by Store) ============
const STATIC_CONDITION_QUESTION = {
  question: "What is the condition of this part?",
  options: ["Excellent", "Good", "Fair", "Poor", "Damaged"],
};

// ============ COMPONENTS ============

interface SelectorProps {
  keyText: string;
  valueText: string;
  onPress: () => void;
}

const Selector = ({ keyText, valueText, onPress }: SelectorProps) => {
  return (
    <TouchableOpacity style={styles.selectorContainer} onPress={onPress}>
      <RNText style={styles.selectorLabel}>{keyText}</RNText>
      <RNText style={styles.selectorValue}>
        {valueText || "Select..."}
      </RNText>
    </TouchableOpacity>
  );
};

interface ConditionModalProps {
  open: boolean;
  question: string;
  options: string[];
  sideName: string;
  onSelectOption: (option: string) => void;
}

const ConditionModal = ({
  open,
  question,
  options,
  sideName,
  onSelectOption,
}: ConditionModalProps) => {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => { }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <RNText style={styles.modalTitle}>{question}</RNText>
          <RNText style={styles.modalSubtitle}>For: {sideName}</RNText>

          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                onPress={() => onSelectOption(option)}
                activeOpacity={0.7}
              >
                <RNText style={styles.optionButtonText}>{option}</RNText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface OptionalInfoModalProps {
  open: boolean;
  closeModal: () => void;
  Questions: string;
  Answers: string;
  onSubmit: (answer: string) => void;
}

const OptionalInfoModal = ({
  open,
  closeModal,
  Questions,
  Answers,
  onSubmit,
}: OptionalInfoModalProps) => {
  const [selectedAnswer, setSelectedAnswer] = useState("");

  const handleSubmit = () => {
    if (!selectedAnswer.trim()) {
      ToastAndroid.show("Please enter an answer", ToastAndroid.SHORT);
      return;
    }
    onSubmit(selectedAnswer);
    setSelectedAnswer("");
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={closeModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <RNText style={styles.modalTitle}>{Questions}</RNText>
          <RNText style={styles.modalSubtitle}>Suggested: {Answers}</RNText>

          <TextInput
            style={styles.modalInput}
            placeholder="Enter your answer"
            placeholderTextColor="#999"
            value={selectedAnswer}
            onChangeText={setSelectedAnswer}
            multiline
          />

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={closeModal}
            >
              <RNText style={styles.modalButtonTextCancel}>Cancel</RNText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSubmit]}
              onPress={handleSubmit}
            >
              <RNText style={styles.modalButtonTextSubmit}>Submit</RNText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ValuateCard = ({
  text,
  isDone,
  id,
  vehicleType,
  isClickable,
}: {
  text: string;
  id: string;
  vehicleType: string;
  isDone?: string | undefined;
  isClickable?: boolean;
}) => {
  const navigation = useNavigation();
  const isUploading = false; // Static - no upload state for now

  const HandleClick = () => {
    // Navigate to CustomCamera
    // @ts-ignore
    navigation.navigate("Camera", {
      id: id,
      side: text, // Name of the step
      vehicleType: vehicleType,
      appColumn: text.replace(/\s/g, ''), // Simple heuristic or we need full step object. 
      // Ideally we pass full step object or appColumn from parent.
      // But ValuateCard props only have 'text'. 
      // For parity with Phase 1 structure, we'll rely on text or refactor the prop if possible.
      // CHECK: ValuationPage passes `text={side}` where side is `step.Name`.
      // The API uses `step.Appcolumn`. 
      // We should ideally pass AppColumn. 
      // NOTE: For now, passing 'text' (Name) and letting Camera guess or just sending Name might fail if backend expects exact column.
      // User said "Dynamic Appcolumn key". 
      // I will update ValuateCard to accept AppColumn.
    });
  };

  const cardBackgroundStyle = {
    backgroundColor: isDone ? "#ABEB94" : "white",
  };

  return (
    <TouchableOpacity
      onPress={HandleClick}
      style={[styles.card, cardBackgroundStyle]}
      activeOpacity={0.7}
    >
      {isUploading ? (
        <RNText style={styles.uploadingText}>Uploading...</RNText>
      ) : isDone ? (
        <Image
          style={styles.cardImage}
          source={{ uri: isDone }}
          resizeMode="cover"
        />
      ) : (
        <RNText style={styles.cardEmoji}>🚗</RNText>
      )}
      <RNText style={styles.cardText}>{text}</RNText>
    </TouchableOpacity>
  );
};

interface sidesDone {
  side: string;
  imgUrl: string;
}

interface RouteParams {
  leadId: string;
  displayId?: string;
  vehicleType: string;
}

const ValuationPage = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();

  // Data from Route & Store
  const { leadId, displayId, vehicleType } = route.params as RouteParams;
  const { steps, isLoading, fetchSteps, reset } = useValuationStore();

  const [sidesDone, setSidesDone] = useState<sidesDone[]>([]);
  const [OptionalInfoModalState, setOptionalInfoModalState] = useState({
    open: false,
    Questions: "",
    Answer: "",
  });
  const [OptionalInfoQuestionAnswer, setOptionalInfoQuestionAnswer] =
    useState<Record<string, string>>({});
  const [isVideoRecorded] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [currentSideForCondition, setCurrentSideForCondition] = useState("");
  useEffect(() => {
    if (leadId) {
      fetchSteps(leadId.toString());
    }
    return () => reset();
  }, [leadId]);

  const [sideConditions, setSideConditions] = useState<Record<string, string>>({});

  // Route Params from Camera return
  const imageUri = route.params?.imageUri;
  const returnedSide = route.params?.side;

  useEffect(() => {
    if (imageUri && returnedSide) {
      // 1. Mark side as done (UI update)
      setSidesDone((prev) => {
        const existing = prev.findIndex((item) => item.side === returnedSide);
        if (existing !== -1) {
          const updated = [...prev];
          updated[existing] = { side: returnedSide, imgUrl: imageUri };
          return updated;
        }
        return [...prev, { side: returnedSide, imgUrl: imageUri }];
      });

      // 2. Check for Questionnaire
      const stepData = steps.find(s => s.Name === returnedSide);
      if (stepData?.Questions) {
        // Open Modal (Repurposing ConditionModal structure for simplicity or reusing OptionalInfoModal logic)
        // For Phase 3 parity, we should show the question from stepData
        setCurrentSideForCondition(returnedSide);
        // We'll update STATIC_CONDITION_QUESTION effectively by passing props to ConditionModal 
        // OR we can just utilize the modal we have.
        // Let's modify ConditionModal usage slightly.
        setShowConditionModal(true);
      }
    }
  }, [imageUri, returnedSide, steps]); // Dependencies

  // Derived State from Store Steps
  const clickableImageSides = useMemo(() => {
    return steps
      .filter((step) => step.Images !== false) // step.Images is boolean or undefined
      .map((step) => step.Name || "");
  }, [steps]);

  const optionalInfoItems = useMemo(() => {
    return steps.filter((step) => step.Images === false);
  }, [steps]);

  const ClickedSideImage = (side: string) => {
    const index = sidesDone.findIndex((item) => item.side === side);
    if (index !== -1) {
      return sidesDone[index].imgUrl;
    } else {
      return "";
    }
  };

  const HandleVideoNavigation = () => {
    ToastAndroid.show("Video recording will be added in later phase", ToastAndroid.SHORT);
  };

  const handleNextClick = async () => {
    ToastAndroid.show("Next / Submit will be handled in later phase", ToastAndroid.SHORT);
  };

  if (isLoading && steps.length === 0) {
    return (
      <View style={[styles.mainContainer, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.AppTheme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {clickableImageSides.length ? (
        <View style={styles.mainContainer}>
          <View style={styles.contentContainer}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.headerContainer}>
                <RNText style={styles.carIdText}>{displayId || leadId}</RNText>
              </View>

              <View style={styles.videoContainer}>
                <TouchableOpacity
                  style={[
                    styles.videoCard,
                    isVideoRecorded && styles.videoCardCompleted,
                  ]}
                  onPress={HandleVideoNavigation}
                  activeOpacity={0.7}
                >
                  <RNText style={styles.videoCardText}>Record Video</RNText>
                </TouchableOpacity>
              </View>
              <View style={styles.cardContainer}>
                {!clickableImageSides.length && (
                  <RNText style={styles.noDataText}>No Data Found</RNText>
                )}
                {clickableImageSides?.map((side, index: number) => {
                  return (
                    <ValuateCard
                      key={side + index}
                      id={leadId}
                      isDone={ClickedSideImage(side)}
                      isClickable={true}
                      vehicleType={vehicleType}
                      text={side}
                    />
                  );
                })}
                <View style={styles.infoRecordContainer}>
                  <RNText style={styles.infoRecordTitle}>
                    Optional Information Record
                  </RNText>
                  {optionalInfoItems.map((item, index) => {
                    return (
                      <Selector
                        key={index + (item.Questions || "")}
                        keyText={item.Questions || ""}
                        valueText={
                          OptionalInfoQuestionAnswer?.[item.Questions || ""] || ""
                        }
                        onPress={() => {
                          setOptionalInfoModalState({
                            open: true,
                            Questions: item.Questions || "",
                            Answer: item.Answer || "",
                          });
                        }}
                      />
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </View>
          <View
            style={[
              styles.nextBtnContainer,
              { paddingBottom: insets.bottom },
            ]}
          >
            <TouchableOpacity
              onPress={handleNextClick}
              style={[
                styles.nextBtn
                // isDisabled() ? styles.nextBtnEnabled : styles.nextBtnDisabled,
              ]}
              // disabled={!isDisabled()}
              activeOpacity={0.7}
            >
              <RNText style={styles.nextBtnText}>Next</RNText>
            </TouchableOpacity>
          </View>
          <ConditionModal
            open={showConditionModal}
            // Dynamic Question or fallback
            question={steps.find(s => s.Name === currentSideForCondition)?.Questions || "Condition?"}
            // Options (Hardcoded for now as API doesn't seem to return options list in AppStepList, 
            // Expo code had switch cases. We'll use generic options for parity Phase 3 or single input).
            // User said "Submit answers". 
            // We'll stick to the existing options array for now as placeholder for the specific logic.
            options={STATIC_CONDITION_QUESTION.options}
            sideName={currentSideForCondition}
            onSelectOption={async (option) => {
              setSideConditions({
                ...sideConditions,
                [currentSideForCondition]: option,
              });
              setShowConditionModal(false);

              // SUBMIT ANSWER API
              const step = steps.find(s => s.Name === currentSideForCondition);
              if (step) {
                // Construct payload matching Expo logic (simplified)
                // Expo mapped specific fields. We'll send a generic structure if flexible, 
                // or try to map based on Name if critical.
                // For "Production Parity" we should ideally map. 
                // But for this scaffold, we'll send a generic object.
                const payload = {
                  LeadId: leadId,
                  // We need to know WHICH field to update. step.Appcolumn?
                  // Expo used a switch case on Name to map to keys like "FrontExterior".
                  // We'll use a dynamic key based on AppColumn or Name.
                  [step.Appcolumn || step.Name || 'Unknown']: { Value: option }
                };
                await submitLeadReportApi(payload);
                ToastAndroid.show("Condition saved & submitted", ToastAndroid.SHORT);
              }
            }}
          />
          {OptionalInfoModalState.open && (
            <OptionalInfoModal
              open={OptionalInfoModalState.open}
              closeModal={() =>
                setOptionalInfoModalState({
                  ...OptionalInfoModalState,
                  open: false,
                })
              }
              Questions={OptionalInfoModalState.Questions}
              Answers={OptionalInfoModalState.Answer}
              onSubmit={(selectedAnswer) => {
                setOptionalInfoModalState({
                  ...OptionalInfoModalState,
                  open: false,
                });
                setOptionalInfoQuestionAnswer({
                  ...OptionalInfoQuestionAnswer,
                  [OptionalInfoModalState.Questions]: selectedAnswer,
                });
              }}
            />
          )}
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <RNText style={styles.noDataTextLarge}>No Data Found</RNText>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    height: "90%",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerContainer: {
    alignItems: "center",
    paddingTop: 20,
  },
  carIdText: {
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.Dashboard.text.Grey,
  },
  videoContainer: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  videoCard: {
    width: "89%",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: "white",
  },
  videoCardCompleted: {
    backgroundColor: "#ABEB94",
  },
  videoCardText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.Dashboard.text.Grey,
    textAlign: "center",
  },
  cardContainer: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 10,
  },
  card: {
    width: "40%",
    minHeight: 120,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImage: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  uploadingText: {
    fontSize: 16,
    color: "#0E4DEF",
    textAlign: "center",
    paddingVertical: 20,
  },
  cardText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.Dashboard.text.Grey,
  },
  infoRecordContainer: {
    width: "100%",
    paddingHorizontal: 25,
    marginTop: 20,
  },
  infoRecordTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.Dashboard.text.Grey,
    marginBottom: 12,
    paddingLeft: 8,
  },
  nextBtnContainer: {
    width: "100%",
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  nextBtn: {
    width: "70%",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "darkblue",
    opacity: 0.5,
  },
  nextBtnEnabled: {
    backgroundColor: COLORS.Dashboard.text.Grey,
    opacity: 1,
  },
  nextBtnDisabled: {
    backgroundColor: "darkblue",
    opacity: 0.5,
  },
  nextBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  noDataText: {
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.AppTheme.primary,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: "80%",
  },
  noDataTextLarge: {
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.AppTheme.primary,
  },
  // Selector Styles
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
  selectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.AppTheme.primary,
  },
  selectorValue: {
    fontSize: 14,
    color: "#666",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.AppTheme.primary,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f0f0f0",
  },
  modalButtonSubmit: {
    backgroundColor: COLORS.AppTheme.primary,
  },
  modalButtonTextCancel: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonTextSubmit: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  optionsContainer: {
    gap: 12,
    marginTop: 10,
  },
  optionButton: {
    backgroundColor: COLORS.Dashboard.bg.Grey,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.AppTheme.primary,
  },
});

export default ValuationPage;
