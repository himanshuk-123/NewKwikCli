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
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useState, useEffect, useMemo, useCallback } from "react";
import { COLORS } from "../../constants/Colors";
import { useValuationStore } from "./store/valuation.store";
import { AppStepListDataRecord } from "./types";
import { submitLeadReportApi } from "./api/valuation.api";
import useQuestions from "../../services/useQuestions";
import { Lead } from "../../types/leads";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

// ============ STATIC DATA (REMOVED - Replaced by Store) ============

// ============ ICON MAPPING FOR CARDS ============
const getCardIcon = (cardName: string): { name: string; color: string } => {
  const normalizedName = cardName?.toLowerCase().trim() || '';
  
  // Odometer
  if (normalizedName.includes('odmeter') || normalizedName.includes('odometer')) 
    return { name: 'counter', color: '#FF6B6B' };
  
  // Dashboard & Interior
  if (normalizedName.includes('dashboard')) 
    return { name: 'view-dashboard', color: '#4ECDC4' };
  if (normalizedName.includes('interior back')) 
    return { name: 'car-seat', color: '#95E1D3' };
  if (normalizedName.includes('interior')) 
    return { name: 'car-door', color: '#45B7D1' };
  
  // Engine
  if (normalizedName.includes('engine')) 
    return { name: 'engine', color: '#F38181' };
  
  // Chassis
  if (normalizedName.includes('chassis imprint')) 
    return { name: 'stamper', color: '#AA96DA' };
  if (normalizedName.includes('chassis plate')) 
    return { name: 'card-text', color: '#FCBAD3' };
  if (normalizedName.includes('chassis')) 
    return { name: 'barcode', color: '#A8E6CF' };
  
  // Vehicle Sides
  if (normalizedName.includes('front side')) 
    return { name: 'arrow-up-circle', color: '#4A90E2' };
  if (normalizedName.includes('right side')) 
    return { name: 'arrow-right-circle', color: '#50C878' };
  if (normalizedName.includes('back side') || normalizedName.includes('rear')) 
    return { name: 'arrow-down-circle', color: '#FFB347' };
  if (normalizedName.includes('left side')) 
    return { name: 'arrow-left-circle', color: '#FF6F91' };
  
  // Tyres
  if (normalizedName.includes('front right tyre')) 
    return { name: 'car-tire-alert', color: '#5DADE2' };
  if (normalizedName.includes('rear right tyre')) 
    return { name: 'car-tire-alert', color: '#AF7AC5' };
  if (normalizedName.includes('rear left tyre')) 
    return { name: 'car-tire-alert', color: '#F39C12' };
  if (normalizedName.includes('front left tyre')) 
    return { name: 'car-tire-alert', color: '#52BE80' };
  if (normalizedName.includes('tyre') || normalizedName.includes('tire')) 
    return { name: 'car-tire-alert', color: '#566573' };
  
  // Selfie & RC
  if (normalizedName.includes('selfie')) 
    return { name: 'camera-account', color: '#E74C3C' };
  if (normalizedName.includes('rc front')) 
    return { name: 'file-document', color: '#3498DB' };
  if (normalizedName.includes('rc back')) 
    return { name: 'file-document-outline', color: '#9B59B6' };
  if (normalizedName.includes('rc')) 
    return { name: 'file-certificate', color: '#1ABC9C' };
  
  // Optional & Information
  if (normalizedName.includes('optional')) 
    return { name: 'camera-plus', color: '#95A5A6' };
  if (normalizedName.includes('information') || normalizedName.includes('record')) 
    return { name: 'clipboard-text', color: '#34495E' };
  
  // Video
  if (normalizedName.includes('video')) 
    return { name: 'video', color: '#E67E22' };
  
  return { name: 'camera', color: '#7F8C8D' }; // Default camera icon
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
  sideName: string;
  questionsData: AppStepListDataRecord | null;
  onSubmit: (payload: {
    selectedAnswer?: string;
    odometerReading?: string;
    keyAvailable?: string;
    chassisPlate?: string;
  }) => void;
  onClose: () => void;
}

const ConditionModal = ({
  open,
  sideName,
  questionsData,
  onSubmit,
  onClose,
}: ConditionModalProps) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [odometerReading, setOdometerReading] = useState<string>("");
  const [keyAvailable, setKeyAvailable] = useState<string>("");
  const [chassisPlate, setChassisPlate] = useState<string>("");

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedAnswer("");
      setOdometerReading("");
      setKeyAvailable("");
      setChassisPlate("");
    }
  }, [open]);

  if (!questionsData?.Questions) {
    return null;
  }

  const stepName = (questionsData.Name || '').toLowerCase();
  const isOdometer = stepName.includes('odometer') || stepName.includes('odmeter');
  const isChassisPlate = stepName.includes('chassis plate');
  const questions = questionsData.Questions;
  const normalizedAnswers = (questionsData.Answer || '').replaceAll('~', '/');
  const answers = normalizedAnswers
    .split('/')
    .map((item: string) => item.trim())
    .filter(Boolean);

  const renderAnswerOptions = () => {
    return answers.map((answer: string, index: number) => (
      <TouchableOpacity
        key={index}
        style={[
          styles.optionButton,
          selectedAnswer === answer && styles.optionButtonSelected,
        ]}
        onPress={() => setSelectedAnswer(answer)}
        activeOpacity={0.7}
      >
        <RNText
          style={[
            styles.optionButtonText,
            selectedAnswer === answer && styles.optionButtonTextSelected,
          ]}
        >
          {answer}
        </RNText>
      </TouchableOpacity>
    ));
  };

  const handleSubmit = () => {
    if (isOdometer) {
      if (!odometerReading.trim() || !keyAvailable.trim()) {
        ToastAndroid.show("Please enter odometer and select key availability", ToastAndroid.SHORT);
        return;
      }
      onSubmit({
        odometerReading,
        keyAvailable,
        selectedAnswer: selectedAnswer || odometerReading,
      });
      setOdometerReading("");
      setKeyAvailable("");
      setSelectedAnswer("");
      onClose();
      return;
    }

    if (isChassisPlate) {
      if (!chassisPlate.trim()) {
        ToastAndroid.show("Please enter chassis plate", ToastAndroid.SHORT);
        return;
      }
      onSubmit({ chassisPlate: chassisPlate.trim(), selectedAnswer: chassisPlate.trim() });
      setChassisPlate("");
      onClose();
      return;
    }

    if (!selectedAnswer.trim()) {
      ToastAndroid.show("Please select an option", ToastAndroid.SHORT);
      return;
    }

    onSubmit({ selectedAnswer });
    setSelectedAnswer("");
    onClose();
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <RNText style={styles.modalTitle}>
              {Array.isArray(questions) ? questions[0] : questions}
            </RNText>
            <RNText style={styles.modalSubtitle}>For: {sideName}</RNText>

            {isOdometer && Array.isArray(questions) && (
              <>
                <RNText style={styles.optionsLabel}>{questions[0]}</RNText>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Odometer Reading"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={odometerReading}
                  onChangeText={(value) => {
                    setOdometerReading(value);
                    setSelectedAnswer(value);
                  }}
                />
                <RNText style={styles.optionsLabel}>{questions[1]}</RNText>
                <View style={styles.optionsContainer}>
                  {['Available', 'Not Available'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionButton,
                        keyAvailable === option && styles.optionButtonSelected,
                      ]}
                      onPress={() => setKeyAvailable(option)}
                      activeOpacity={0.7}
                    >
                      <RNText
                        style={[
                          styles.optionButtonText,
                          keyAvailable === option && styles.optionButtonTextSelected,
                        ]}
                      >
                        {option}
                      </RNText>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {isChassisPlate && (
              <>
                <RNText style={styles.optionsLabel}>
                  {Array.isArray(questions) ? questions[0] : questions}
                </RNText>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Chassis Plate"
                  placeholderTextColor="#999"
                  value={chassisPlate}
                  onChangeText={setChassisPlate}
                />
              </>
            )}

            {!isOdometer && !isChassisPlate && (
              <>
                <RNText style={styles.optionsLabel}>Select an option:</RNText>
                <View style={styles.optionsContainer}>
                  {renderAnswerOptions()}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={onClose}
            >
              <RNText style={styles.modalButtonTextCancel}>Cancel</RNText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalButtonSubmit,
                ((isOdometer && (!odometerReading.trim() || !keyAvailable.trim())) ||
                  (isChassisPlate && !chassisPlate.trim()) ||
                  (!isOdometer && !isChassisPlate && !selectedAnswer)) &&
                  styles.modalButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={
                (isOdometer && (!odometerReading.trim() || !keyAvailable.trim())) ||
                (isChassisPlate && !chassisPlate.trim()) ||
                (!isOdometer && !isChassisPlate && !selectedAnswer)
              }
            >
              <RNText style={styles.modalButtonTextSubmit}>Submit</RNText>
            </TouchableOpacity>
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

  const options = (Answers || "")
    .replaceAll("~", "/")
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean);

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
          <RNText style={styles.modalSubtitle}>Select an option</RNText>

          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={`${option}-${index}`}
                style={[
                  styles.optionButton,
                  selectedAnswer === option && styles.optionButtonSelected,
                ]}
                onPress={() => setSelectedAnswer(option)}
                activeOpacity={0.7}
              >
                <RNText
                  style={[
                    styles.optionButtonText,
                    selectedAnswer === option && styles.optionButtonTextSelected,
                  ]}
                >
                  {option}
                </RNText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={closeModal}
            >
              <RNText style={styles.modalButtonTextCancel}>Cancel</RNText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalButtonSubmit,
                !selectedAnswer && styles.modalButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedAnswer}
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
  isClickable: _isClickable,
  appColumn,
  isUploading,
}: {
  text: string;
  id: string;
  vehicleType: string;
  isDone?: string | undefined;
  isClickable?: boolean;
  appColumn?: string;
  isUploading?: boolean;
}) => {
  const navigation = useNavigation();

  const HandleClick = () => {
    // Navigate to CustomCamera with appColumn for dynamic API param naming
    // @ts-ignore
    navigation.navigate("Camera", {
      id: id,
      side: text,
      vehicleType: vehicleType,
      appColumn: appColumn || text.replace(/\s/g, ''),
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
        <MaterialCommunityIcons
          name={getCardIcon(text).name}
          size={40}
          color={getCardIcon(text).color}
          style={styles.cardIcon}
        />
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
  leadData?: Lead;
}

const ValuationPage = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();

  // Initialize useQuestions hook
  const { getSideQuestion } = useQuestions();

  // Data from Route & Store
  const { leadId, displayId, vehicleType, leadData } = route.params as RouteParams;
  const { steps, isLoading, fetchSteps, reset, uploadedSides, getSideImage } = useValuationStore();

  const [_sidesDone, _setSidesDone] = useState<sidesDone[]>([]);
  const [OptionalInfoModalState, setOptionalInfoModalState] = useState({
    open: false,
    Questions: "",
    Answer: "",
  });
  const [OptionalInfoQuestionAnswer, setOptionalInfoQuestionAnswer] =
    useState<Record<string, string>>({});
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [currentSideForCondition, setCurrentSideForCondition] = useState("");
  const [currentSideQuestionData, setCurrentSideQuestionData] = useState<any>(null);

  useEffect(() => {
    if (leadId) {
      fetchSteps(leadId.toString());
    }
    return () => reset();
  }, [leadId, fetchSteps, reset]);

  const [sideConditions, setSideConditions] = useState<Record<string, string>>({});
  const [lastProcessedSide, setLastProcessedSide] = useState<string>("");

  // Watch for uploaded sides from store and show condition modal
  useEffect(() => {
    // If any new sides are uploaded (from Camera component), check if we need to show modal
    if (uploadedSides.length > 0) {
      // Get the last uploaded side
      const lastUploadedSide = uploadedSides[uploadedSides.length - 1];
      
      // Only process if this is a NEW side (not already processed)
      if (lastUploadedSide && lastUploadedSide.side !== lastProcessedSide) {
        const stepData = steps.find(s => s.Name === lastUploadedSide.side);
        if (stepData?.Questions) {
          setCurrentSideForCondition(lastUploadedSide.side);
          
          // Get processed question data from useQuestions hook
          const questionData = getSideQuestion({
            data: steps,
            vehicleType: vehicleType,
            nameInApplication: lastUploadedSide.side,
          });
          setCurrentSideQuestionData(questionData);
          
          setShowConditionModal(true);
          setLastProcessedSide(lastUploadedSide.side);
        }
      }
    }
  }, [uploadedSides.length, steps, getSideQuestion, vehicleType, lastProcessedSide]);

  const clickableImageSides = useMemo(() => {
    return steps
      .filter((step) => step.Images !== false) // step.Images is boolean or undefined
      .map((step) => step.Name || "");
  }, [steps]);

  const optionalInfoItems = useMemo(() => {
    return steps.filter((step) => step.Images === false);
  }, [steps]);

  const ClickedSideImage = (side: string) => {
    // Get image URI from Zustand store
    const imgUri = getSideImage(side);
    return imgUri || "";
  };

  const isVideoRecorded = () => {
    // Check if video is recorded from Zustand store (same pattern as images)
    const videoUri = getSideImage('Video');
    return videoUri ? true : false;
  };

  const HandleVideoNavigation = () => {
    // @ts-ignore
    navigation.navigate("VideoCamera", {
      id: leadId,
      side: "Video",
      vehicleType,
    });
  };

  const handleNextClick = async () => {
    // Match Expo behavior: navigate to VehicleDetails screen
    // @ts-ignore
    navigation.navigate("VehicleDetails", {
      carId: leadId,
      leadData,
      vehicleType,
    });
  };

  if (isLoading && steps.length === 0) {
    return (
      <View style={styles.loadingContainer}>
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
                    isVideoRecorded() && styles.videoCardCompleted,
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
                      appColumn={steps.find(s => s.Name === side)?.Appcolumn || side}
                      isUploading={false}
                    />
                  );
                })}
                <View style={styles.infoRecordContainer}>
                  <RNText style={styles.infoRecordTitle}>
                    Optional Information Record
                  </RNText>
                  {optionalInfoItems.map((item, index) => {
                    const questionKey = Array.isArray(item.Questions) 
                      ? item.Questions.join(',') 
                      : (item.Questions || "");
                    return (
                      <Selector
                        key={index + questionKey}
                        keyText={questionKey}
                        valueText={
                          OptionalInfoQuestionAnswer?.[questionKey] || ""
                        }
                        onPress={() => {
                          setOptionalInfoModalState({
                            open: true,
                            Questions: questionKey,
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
            sideName={currentSideForCondition}
            questionsData={currentSideQuestionData}
            onSubmit={async ({ selectedAnswer, odometerReading, keyAvailable, chassisPlate }) => {
              if (selectedAnswer) {
                setSideConditions({
                  ...sideConditions,
                  [currentSideForCondition]: selectedAnswer,
                });
              }

              setShowConditionModal(false);

              const step = steps.find(s => s.Name === currentSideForCondition);
              if (!step) return;

              const stepName = (step.Name || '').toLowerCase();
              const isOdometer = stepName.includes('odometer') || stepName.includes('odmeter');
              const isChassisPlate = stepName.includes('chassis plate');

              let payload: any = { LeadId: leadId };

              if (isOdometer) {
                payload = {
                  ...payload,
                  Odometer: odometerReading,
                  LeadFeature: { Keys: keyAvailable },
                };
              } else if (isChassisPlate) {
                payload = {
                  ...payload,
                  LeadList: { ChassisNo: chassisPlate || selectedAnswer },
                };
              } else {
                payload = {
                  ...payload,
                  [step.Appcolumn || step.Name || 'Unknown']: { Value: selectedAnswer },
                };
              }

              try {
                await submitLeadReportApi(payload);
                ToastAndroid.show("Answer submitted successfully", ToastAndroid.SHORT);
              } catch (error: any) {
                console.error("Submit answer error:", error);
                ToastAndroid.show("Failed to submit answer", ToastAndroid.LONG);
              }
            }}
            onClose={() => setShowConditionModal(false)}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
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
  cardIcon: {
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
    padding: 15,
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
  },
  modalScrollContent: {
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.AppTheme.primary,
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    height: 45,
    textAlignVertical: "center",
    marginBottom: 12,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
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
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  optionsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginTop: 10,
    marginBottom: 8,
  },
  optionButton: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ddd",
  },
  optionButtonSelected: {
    backgroundColor: COLORS.AppTheme.primary,
    borderColor: COLORS.AppTheme.primary,
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  optionButtonTextSelected: {
    color: "#fff",
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
});

export default ValuationPage;
