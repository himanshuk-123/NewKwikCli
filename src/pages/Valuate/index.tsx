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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useState, useEffect } from "react";
import { COLORS } from "../../constants/Colors";

// ============ STATIC DATA ============
const STATIC_CAR_ID = "KWC12345";
const STATIC_VEHICLE_TYPE = "2W";

const STATIC_VEHICLE_SIDES = [
  "Odometer Reading ",
  "Right Side",
  "Chassis Imprint",
  "Back Side",
  "Left Side",
  "Chassis Number",
];

const STATIC_OPTIONAL_INFO = [
  {
    question: "What is the engine type?",
    answer: "Petrol/Diesel/CNG",
  },
  {
    question: "Any additional features?",
    answer: "Sunroof/AlloyWheels",
  },
];

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
      onRequestClose={() => {}}
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
  const isUploading = false; // Static - no upload state

  const HandleClick = () => {
    if (!isClickable && (!isDone || isDone.trim().length === 0)) {
      ToastAndroid.show(
        "Please valuate previous side first",
        ToastAndroid.LONG
      );
      return;
    }

    // @ts-ignore
    navigation.navigate("Camera", {
      id: id,
      side: text,
      isDone,
      vehicleType,
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

/**
 * Route contains
 * @param id
 * @param vehicleType
 * @param imgUrl
 * @param side
 * @param showModal
 */
const ValuatePage = ({ route }: { route: any }) => {
  const insets = useSafeAreaInsets();

  const carId = route.params?.id;
  const vehicleType = route.params?.vehicleType || STATIC_VEHICLE_TYPE;
  const imageUri = route.params?.imageUri || null;
  const returnedSide = route.params?.side || null;
  const navigation = useNavigation();
  
  const [sidesDone, setSidesDone] = useState<sidesDone[]>([]);
  const [clickableImageSides] = useState<string[]>(STATIC_VEHICLE_SIDES);
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
  const [sideConditions, setSideConditions] = useState<Record<string, string>>({});

  // Handle image return from camera
  useEffect(() => {
    if (imageUri && returnedSide) {
      setSidesDone((prev) => {
        const existing = prev.findIndex((item) => item.side === returnedSide);
        if (existing !== -1) {
          const updated = [...prev];
          updated[existing] = { side: returnedSide, imgUrl: imageUri };
          return updated;
        }
        return [...prev, { side: returnedSide, imgUrl: imageUri }];
      });
      
      // Automatically show condition modal
      setCurrentSideForCondition(returnedSide);
      setShowConditionModal(true);
    }
  }, [imageUri, returnedSide]);


  const ClickedSideImage = (side: string) => {
    const index = sidesDone.findIndex((item) => item.side === side);
    if (index !== -1) {
      return sidesDone[index].imgUrl;
    } else {
      return "";
    }
  };

  const isDisabled = () => {
    if (
      !clickableImageSides ||
      !Array.isArray(clickableImageSides) ||
      clickableImageSides.length === 0
    ) {
      return false;
    }

    try {
      const mandatoryImagesLength = clickableImageSides.length;
      return sidesDone.length >= mandatoryImagesLength;
    } catch {
      return false;
    }
  };

  const HandleVideoNavigation = () => {
    // @ts-ignore
    navigation.navigate("VideoCamera", {
      id: carId,
      side: "Video",
      vehicleType,
    });
  };

  const handleNextClick = async () => {
    // if (!isDisabled()) {
    //   ToastAndroid.show("Please upload all the images.", ToastAndroid.SHORT);
    //   return;
    // }

    try {
      // @ts-ignore
      navigation.navigate("VehicleDetails", {
        carId: carId,
      });
    } catch (err: any) {
      console.error("ERROR IN NAVIGATION", err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {clickableImageSides.length ? (
        <View style={styles.mainContainer}>
          <View style={styles.contentContainer}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.headerContainer}>
                <RNText style={styles.carIdText}>{carId}</RNText>
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
                      id={carId}
                      isDone={ClickedSideImage(side)}
                      isClickable={
                        true ||
                        (index === 0 && isVideoRecorded) ||
                        !!ClickedSideImage(clickableImageSides[index - 1])
                      }
                      vehicleType={vehicleType}
                      text={side}
                    />
                  );
                })}
                <View style={styles.infoRecordContainer}>
                  <RNText style={styles.infoRecordTitle}>
                    Optional Information Record
                  </RNText>
                  {STATIC_OPTIONAL_INFO.map((item, index) => {
                    return (
                      <Selector
                        key={index + item.question}
                        keyText={item.question}
                        valueText={
                          OptionalInfoQuestionAnswer?.[item.question] || ""
                        }
                        onPress={() => {
                          setOptionalInfoModalState({
                            open: true,
                            Questions: item.question,
                            Answer: item.answer,
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
            question={STATIC_CONDITION_QUESTION.question}
            options={STATIC_CONDITION_QUESTION.options}
            sideName={currentSideForCondition}
            onSelectOption={(option) => {
              setSideConditions({
                ...sideConditions,
                [currentSideForCondition]: option,
              });
              setShowConditionModal(false);
              ToastAndroid.show(
                `Condition saved: ${option}`,
                ToastAndroid.SHORT
              );
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

export default ValuatePage;
