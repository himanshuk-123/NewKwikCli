import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ButtonText,
  InputField,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  Input,
  RadioGroup,
  RadioIcon,
  Button,
  HStack,
  Box,
  VStack,
  Radio,
  RadioIndicator,
  CircleIcon,
  RadioLabel,
} from "@gluestack-ui/themed";
import { COLORS } from "@src/constants/Colors";
import { HandleSaveImage } from "@src/Utils/imageHandlers";
import useQuestions from "@src/services/useQuestions";
import useZustandStore from "@src/store/useZustandStore";
import LeadReportDataCreateEdit from "@src/services/Slices/LeadReportDataCreateEdit";
import { MAPPING_FOR_IMAGE_TYPES } from "@src/constants";
import { LeadReportDataCreateedit } from "@src/@types/LeadReportDataCreateEdit";
import {
  FullPageLoader,
  handleWithErrorReporting,
  toCamelCase,
} from "@src/Utils";
import { useAppStepList } from "@src/contexts";
import { useFocusEffect } from "@react-navigation/native";
import { TYRE_MAPPING } from "@src/constants/DocumentUploadDataMapping";
import * as Location from "expo-location";
import { insertImagesUploadedStatusDB } from "@src/db/uploadStatusDb";
import { useGetLocationAndInsertInDB } from "@src/Utils/getLocationAndInsertInDb";

type Props = {};

const QuestionsModal = ({
  side,
  imgUrl,
  carId,
  showModal,
  setShowModal,
  isDone,
  vehicleType,
}: {
  side: string;
  carId: string;
  imgUrl: string;
  vehicleType: string;
  showModal: boolean;

  isDone: boolean;
  setShowModal: any;
}) => {
  console.log(side);

  const { myTaskValuate } = useZustandStore();
  const { data: AppStepList } = useAppStepList();
  const ref = useRef(null);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | string>(false);
  const [odometerReading, setOdometerReading] = useState<string>("");
  const [keyAvailable, setKeyAvailable] = useState<string>("");
  const { getSideQuestion } = useQuestions();
  const currentSideData = getSideQuestion({
    data: AppStepList,
    nameInApplication: side,
    vehicleType,
  });
  const { getLocationAndInsertInDB } = useGetLocationAndInsertInDB();
  // console.log("currentSideData", side);

  const renderItem = ({ item }: { item: string }) => {
    console.log({ item });
    return (
      <TouchableOpacity
        onPressIn={() => {
          console.log("CURRENT ITEM", item);
          if (selectedAnswer !== item) {
            setSelectedAnswer(item);
          }
        }}
        style={[
          styles.item,
          {
            backgroundColor:
              selectedAnswer == item ? COLORS.AppTheme.success : "white",
          },
        ]}
      >
        {item.split("/").map((currItem, index) => (
          <Text
            key={currItem + index}
            style={[
              styles.itemText,
              {
                color: selectedAnswer == currItem ? "white" : "black",
              },
            ]}
          >
            {currItem}
          </Text>
        ))}
      </TouchableOpacity>
    );
  };

  const HandleSubmit = async () => {
    console.log(
      "TYRE_MAPPING[vehicleType].find((item: any) => item.name === side).Life",
      TYRE_MAPPING[vehicleType].find((item: any) => item.name === side)
    );
    if (!selectedAnswer) {
      return;
    }

    let request: LeadReportDataCreateedit = {
      Id: 1,
      LeadId: myTaskValuate.data.Id,
    };

    switch (MAPPING_FOR_IMAGE_TYPES[side]) {
      case "Odometer":
        if (!odometerReading || !keyAvailable) {
          return;
        }
        request = {
          ...request,
          Odometer: odometerReading,
          LeadFeature: {
            Keys: keyAvailable,
          },
        };
        break;
      case "FrontExterior":
        if (!selectedAnswer) {
          return;
        }
        request = {
          ...request,
          FrontExterior: { FrontExteriorValue: selectedAnswer?.toString() },
        };
        break;
      case "RightExterior":
        if (!selectedAnswer) {
          return;
        }
        request = {
          ...request,
          RightExterior: { RightExteriorValue: selectedAnswer?.toString() },
        };
        break;
      case "BackExterior":
        if (!selectedAnswer) {
          return;
        }
        request = {
          ...request,
          BackExterior: { BackExteriorValue: selectedAnswer?.toString() },
        };
        break;
      case "LeftExterior":
        if (!selectedAnswer) {
          return;
        }
        request = {
          ...request,
          LeftExterior: { LeftExteriorValue: selectedAnswer?.toString() },
        };
        break;
      case "ChassisTypeId":
        if (!selectedAnswer) {
          return;
        }
        request = {
          ...request,
          LeadHighlight: { Repunched: selectedAnswer?.toString() },
        };
        break;

      case "ChassisPlate":
        if (!selectedAnswer) {
          return;
        }
        request = {
          ...request,
          LeadList: { ChassisNo: selectedAnswer?.toString() },
        };
        break;
      case "EngineExterior":
        if (!selectedAnswer) {
          return;
        }
        request = {
          ...request,
          EngineExterior: { EngineExteriorValue: selectedAnswer?.toString() },
        };
        break;
      case "InteriorDashboard":
        if (!selectedAnswer) {
          return;
        }
        request = {
          ...request,
          InteriorsExterior: {
            InteriorExteriorValue: selectedAnswer?.toString(),
          },
        };
        break;
      case "RcStatusTypeId":
        if (!selectedAnswer) {
          return;
        }
        request = {
          ...request,
          RcStatusTypeId:
            /** 1 for true and 2 for false */
            selectedAnswer?.toString().toLowerCase() === "yes" ? 1 : 2,
        };
        break;
      case "Tyre":
        if (!selectedAnswer) {
          return;
        }

        request = {
          ...request,
          WheelsTyres: {
            [TYRE_MAPPING[vehicleType].find((item: any) => item.name === side)
              .Life]: selectedAnswer?.toString().toLowerCase(),
          },
        };
        break;

      default:
        console.log(
          "Before HANDLESAVEIMG request22",
          MAPPING_FOR_IMAGE_TYPES[side]
        );
        request = {
          ...request,
          [MAPPING_FOR_IMAGE_TYPES[side]]: {
            selectedAnswer,
          },
        };
        break;
    }

    console.log("Before HANDLESAVEIMG request", request);
    const imageUrlInDeviceStorage = await HandleSaveImage({
      uri: imgUrl,
      id: carId,
      side,
      removePreviousImage: isDone,
      totalLength: AppStepList.filter(
        (item) => item.Images && !item.Name.toLowerCase().includes("optional")
      ).length,
    });

    setShowModal(false);
    const response = LeadReportDataCreateEdit(request);
    // if (response.ERROR == "0") {
    //   setShowModal(false);
    // }
    // console.log(
    //   "Going to HandleValuationUpload",
    //   "paramName:",
    //   side,
    //   "LeadId:",
    //   myTaskValuate.data.Id.toString(),
    //   "VehicleTypeValue:",
    //   myTaskValuate.data.VehicleTypeValue,
    //   " ========== "
    // );
    // let location = await Location.getCurrentPositionAsync({
    //   accuracy: Location.Accuracy.Highest,
    // });
    await handleWithErrorReporting(
      async () =>
        await getLocationAndInsertInDB({
          imgPath: imageUrlInDeviceStorage,
          side,
        })
    );
    // await insertImagesUploadedStatusDB({
    //   leadUId: myTaskValuate.data.LeadUId,
    //   leadId: myTaskValuate.data.LeadId,
    //   uri: imageUrlInDeviceStorage,
    //   step: toCamelCase(side),
    //   vehicleType: myTaskValuate.data.VehicleType.toString(),
    //   imgUrl: imageUrlInDeviceStorage,
    //   side: toCamelCase(side),
    //   lastValuated: new Date().toLocaleString(),
    //   regNo: myTaskValuate.data.RegNo,
    //   prospectNo: myTaskValuate.data.ProspectNo,
    // });

    // HandleValuationUpload({
    //   base64String: imageUrlInDeviceStorage,
    //   paramName: side,
    //   LeadId: myTaskValuate.data.Id.toString(),
    //   VehicleTypeValue: myTaskValuate.data.VehicleTypeValue ?? vehicleType,
    //   geolocation: {
    //     lat: location?.coords?.latitude.toString(),
    //     long: location?.coords?.longitude.toString(),
    //     timeStamp: convertDateString(new Date()),
    //   },
    // });
  };

  useEffect(() => {
    const isLast = async () => {
      FullPageLoader.open({
        label: "Please wait...",
      });
      console.log("Before HANDLESAVEIMG 2", imgUrl);
      await HandleSaveImage({
        uri: imgUrl,
        id: carId,
        side,
        removePreviousImage: isDone,
      });
      setShowModal(false);
    };

    if (currentSideData["Name"] === "RC Back Image") {
      isLast();
    }
  }, []);

  const upload = async () => {
    try {
      FullPageLoader.open({
        label: "Please wait...",
      });
      console.log("HandleValuationUpload", side);
      // let location = await Location.getCurrentPositionAsync({
      //   accuracy: Location.Accuracy.Balanced,
      // });

      // const response = await
      // HandleValuationUpload({
      //   base64String: imgUrl,
      //   paramName: side,
      //   LeadId: myTaskValuate.data.Id.toString(),
      //   VehicleTypeValue: myTaskValuate.data.VehicleTypeValue,
      //   geolocation: {
      //     lat: location.coords.latitude.toString(),
      //     long: location.coords.longitude.toString(),
      //     timeStamp: convertDateString(new Date()),
      //   },
      // });
      const updatedImg = await HandleSaveImage({
        uri: imgUrl,
        id: carId,
        side,
        removePreviousImage: isDone,
      });

      await handleWithErrorReporting(
        async () =>
          await getLocationAndInsertInDB({ imgPath: updatedImg, side })
      );
      // await insertImagesUploadedStatusDB({
      //   leadUId: myTaskValuate.data.LeadUId,
      //   leadId: myTaskValuate.data.LeadId,
      //   uri: imgUrl,
      //   step: toCamelCase(side),
      //   vehicleType: myTaskValuate.data.VehicleType.toString(),
      //   imgUrl: imgUrl,
      //   side: toCamelCase(side),
      //   lastValuated: new Date().toLocaleString(),
      //   regNo: myTaskValuate.data.RegNo,
      //   prospectNo: myTaskValuate.data.ProspectNo,
      //   latitude: location.coords.latitude.toString(),
      //   longitude: location.coords.longitude.toString(),
      // });

      setShowModal(false);
    } catch (error) {
    } finally {
      FullPageLoader.close();
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!currentSideData.Questions) {
        upload();
      }
    }, [currentSideData.Questions])
  );

  return (
    <>
      {currentSideData.Questions && (
        <Modal isOpen={showModal} finalFocusRef={ref}>
          <ModalBackdrop />
          <ModalContent>
            <ModalBody scrollEnabled={false}>
              {typeof currentSideData.Questions === "string" &&
                currentSideData.Answer.length !== 0 && (
                  <>
                    <Box px={"$4"} pt={"$2"}>
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: "bold",
                          textTransform: "capitalize",
                          textAlign: "auto",
                        }}
                      >
                        {currentSideData.Questions}
                      </Text>
                    </Box>
                    {/* <ScrollView> */}
                    <FlatList
                      data={currentSideData.Answer.split("/")}
                      renderItem={renderItem}
                      numColumns={2}
                      columnWrapperStyle={styles.row}
                      contentContainerStyle={styles.container}
                    />
                    {/* </ScrollView> */}
                  </>
                )}

              {/* Case of Odometer */}
              {typeof currentSideData.Questions !== "string" &&
                currentSideData["Name"] === "Odmeter Reading" && (
                  <VStack space="md" pt={"$4"}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        textTransform: "capitalize",
                        textAlign: "auto",
                      }}
                    >
                      {currentSideData.Questions[0]}
                    </Text>
                    <Input variant="outline">
                      <InputField
                        keyboardType="numeric"
                        placeholder="Odometer Reading"
                        onChangeText={(e) => {
                          setOdometerReading(e);
                          setSelectedAnswer(e);
                        }}
                      />
                    </Input>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        textTransform: "capitalize",
                        textAlign: "auto",
                      }}
                    >
                      {currentSideData.Questions[1]}
                    </Text>
                    <RadioGroup
                      pb={"$4"}
                      onChange={(e) => {
                        setKeyAvailable(e);
                      }}
                    >
                      <HStack space="2xl">
                        <Radio value="Available">
                          <RadioIndicator mr="$2">
                            <RadioIcon as={CircleIcon} />
                          </RadioIndicator>
                          <RadioLabel>Available</RadioLabel>
                        </Radio>
                        <Radio value="Not Available">
                          <RadioIndicator mr="$2">
                            <RadioIcon as={CircleIcon} />
                          </RadioIndicator>
                          <RadioLabel>Not Available</RadioLabel>
                        </Radio>
                      </HStack>
                    </RadioGroup>
                  </VStack>
                )}

              {typeof currentSideData.Questions !== "string" &&
                currentSideData["Name"] === "Chassis Imprint Image" && (
                  <VStack space="md" pt={"$4"}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        textTransform: "capitalize",
                        textAlign: "auto",
                      }}
                    >
                      {currentSideData.Questions}
                    </Text>
                    {/* <Input variant="outline">
                      <InputField
                        placeholder="Chassis Imprint Image"
                        onChangeText={(e) => setChassisImprint(e)}
                      />
                    </Input> */}
                    <View style={styles.container}>
                      {currentSideData.Answer.split("/").map(
                        (item: string, index: number) => (
                          <TouchableOpacity
                            key={item + index}
                            onPress={() => setSelectedAnswer(item)}
                            style={[
                              styles.item,
                              {
                                backgroundColor:
                                  selectedAnswer == item
                                    ? COLORS.AppTheme.success
                                    : "white",
                              },
                            ]}
                          >
                            {item.split("/").map((currItem, index) => (
                              <Text
                                key={currItem + index}
                                style={[
                                  styles.itemText,
                                  {
                                    color:
                                      selectedAnswer == currItem
                                        ? "white"
                                        : "black",
                                  },
                                ]}
                              >
                                {currItem}
                              </Text>
                            ))}
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  </VStack>
                )}

              {currentSideData["Name"] === "Chassis Plate Image" && (
                <VStack space="md" pt={"$4"}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "bold",
                      textTransform: "capitalize",
                      textAlign: "auto",
                    }}
                  >
                    {currentSideData.Questions}
                  </Text>
                  <Input variant="outline">
                    <InputField
                      placeholder="Chassis Plate Image"
                      onChangeText={(e) => setSelectedAnswer(e)}
                    />
                  </Input>
                </VStack>
              )}
            </ModalBody>

            <HStack pb={"$3"} justifyContent={"center"}>
              <Button
                size="sm"
                backgroundColor={COLORS.AppTheme.primary}
                action="positive"
                borderWidth="$0"
                onPress={HandleSubmit}
                isDisabled={
                  (MAPPING_FOR_IMAGE_TYPES[side] === "Odometer" &&
                    (odometerReading.trim() === "" ||
                      keyAvailable.trim() === "")) ||
                  (MAPPING_FOR_IMAGE_TYPES[side] !== "Odometer" &&
                    (selectedAnswer === false || selectedAnswer === ""))
                }
              >
                <ButtonText>Submit</ButtonText>
              </Button>
            </HStack>
          </ModalContent>
        </Modal>
      )}
    </>
  );
};
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 10,
  },
  row: {
    flex: 1,
    justifyContent: "space-between",
    marginBottom: 10,
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    margin: 5,
    borderRadius: 5,
    height: 35,
  },
  itemText: {
    fontWeight: "bold",
  },
});

export { QuestionsModal };
