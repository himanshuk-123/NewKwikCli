import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ToastAndroid,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import AntDesign from "react-native-vector-icons/AntDesign";
import { uploadValuationImageApi } from "../features/valuation/api/valuation.api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocationAsync } from "../utils/geolocation";
import { saveImageLocally } from "../utils/imageHandler";
import RNFS from "react-native-fs";
import { useValuationStore } from "../features/valuation/store/valuation.store";

const CustomCamera = ({ route }: { route: any }) => {
  const cameraRef = useRef<Camera>(null);
  const navigation = useNavigation<any>();
  const { markSideAsUploaded } = useValuationStore();

  // Get params from navigation
  const { id, side, vehicleType, appColumn } = route.params || {};

  // Determine if this is a selfie/valuator shot based on side name
  const isSelfie = side?.toLowerCase().includes("selfie") || 
                   side?.toLowerCase().includes("valuator") ||
                   side?.toLowerCase().includes("user with");
  const cameraFacing = isSelfie ? "front" : "back";
  const device = useCameraDevice(cameraFacing);
  const { hasPermission, requestPermission } = useCameraPermission();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  /* ---------- PERMISSION ---------- */
  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  /* ---------- CAMERA LIFECYCLE ---------- */
  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      setIsCameraActive(false);
    });
    return unsubscribe;
  }, [navigation]);

  /* ---------- CAPTURE ---------- */
  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);

      const photo = await cameraRef.current.takePhoto({
        flash: "off",
        qualityPrioritization: "balanced",
      });

      setImageUri(`file://${photo.path}`);
      setIsCameraActive(false);
    } catch (err) {
      console.error("Capture failed:", err);
    } finally {
      setIsCapturing(false);
    }
  };

  /* ---------- HELPERS ---------- */
  const readAsBase64 = async (uri: string): Promise<string | null> => {
    try {
      console.log("[Base64] Converting image from:", uri);

      // Remove "file://" prefix if present
      const filePath = uri.startsWith("file://") ? uri.slice(7) : uri;

      // Use react-native-fs to read the file as base64
      // This is the correct approach for React Native CLI (unlike Expo)
      const base64 = await RNFS.readFile(filePath, "base64");

      console.log("[Base64] Successfully converted, length:", base64.length);
      return base64;
    } catch (e) {
      console.error("Base64 conversion failed", e);
      return null;
    }
  };

  /* ---------- UPLOAD TO API (BACKGROUND) ---------- */
  const uploadImageInBackground = async (base64: string) => {
    try {
      // Get TOKENID from AsyncStorage
      const userCreds = await AsyncStorage.getItem("user_credentials");
      const tokenId = userCreds ? JSON.parse(userCreds)?.TOKENID : "";

      if (!tokenId) {
        throw new Error("User token not found. Please login again.");
      }

      // Get geolocation
      const location = await getLocationAsync();
      const geolocation = {
        lat: location?.lat || "0",
        long: location?.long || "0",
        timeStamp: new Date().toISOString(),
      };

      // Determine parameter name (e.g., OdometerBase64, DashboardBase64)
      const paramName = appColumn ? `${appColumn}Base64` : "OtherBase64";

      console.log("[Upload] Starting image upload:", {
        side,
        paramName,
        leadId: id,
        vehicleType,
        base64Length: base64.length,
        geolocation,
      });

      // Call API
      const response = await uploadValuationImageApi(
        base64,
        paramName,
        id,
        vehicleType,
        geolocation
      );

      // Check response for errors
      if (response?.ERROR && response.ERROR !== "0") {
        throw new Error(response?.MESSAGE || "API returned an error");
      }

      console.log("[Upload] Success:", response);
      ToastAndroid.show("Image uploaded successfully!", ToastAndroid.SHORT);
    } catch (error: any) {
      console.error("[Upload] Failed:", error);
      ToastAndroid.show(
        error?.message || "Failed to upload image. Please retry.",
        ToastAndroid.LONG
      );
    }
  };

  /* ---------- PROCEED ---------- */
  const handleProceed = async () => {
    if (!imageUri) return;

    try {
      setIsUploading(true);

      // Save image locally first (for immediate UI feedback)
      const savedImageUri = await saveImageLocally(imageUri, id, side);
      if (!savedImageUri) {
        throw new Error("Failed to save image locally");
      }

      console.log("[Upload] Image saved locally:", savedImageUri);

      // Mark side as uploaded with the saved image URI (for UI display)
      markSideAsUploaded(side, savedImageUri);

      // Navigate back immediately so modal can show
      setIsUploading(false);
      navigation.goBack();

      // Upload in background
      (async () => {
        const base64 = await readAsBase64(imageUri);
        if (!base64) {
          throw new Error("Failed to convert image to base64");
        }
        await uploadImageInBackground(base64);
      })().catch((error: any) => {
        console.error("[Proceed] Background upload failed:", error);
      });

    } catch (error: any) {
      console.error("[Proceed] Failed:", error);
      ToastAndroid.show(
        error?.message || "Error processing image. Please retry.",
        ToastAndroid.LONG
      );
      setIsUploading(false);
    }
  };

  /* ---------- LOADER ---------- */
  if (!hasPermission || !device) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1181B2" />
        <Text style={{ marginTop: 16, fontSize: 16 }}>
          Preparing camera…
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {/* ---------- IMAGE PREVIEW ---------- */}
      {imageUri ? (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
            resizeMode="contain"
          />

          {/* CLOSE / RETAKE */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              setImageUri(null);
              setIsCameraActive(true);
            }}
          >
            <AntDesign name="close" size={30} color="white" />
          </TouchableOpacity>

          {/* PROCEED */}
          <TouchableOpacity
            style={[
              styles.proceedBtn,
              isUploading && { backgroundColor: "gray" },
            ]}
            onPress={handleProceed}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.proceedText}>Proceed</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* ---------- CAMERA ---------- */
        isCameraActive && (
          <View style={styles.cameraContainer}>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isCameraActive}
              photo
            />

            <View style={styles.captureContainer}>
              <TouchableOpacity
                onPress={handleCapture}
                disabled={isCapturing}
                style={styles.captureBtn}
              >
                {isCapturing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <AntDesign name="camera" size={32} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )
      )}
    </View>
  );
};

export default CustomCamera;

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },

  cameraContainer: {
    flex: 1,
    backgroundColor: "black",
  },

  captureContainer: {
    position: "absolute",
    bottom: 60,
    width: "100%",
    alignItems: "center",
  },

  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#1181B2",
    justifyContent: "center",
    alignItems: "center",
  },

  previewContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
  },

  previewImage: {
    flex: 1,
    width: "100%",
  },

  closeBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },

  proceedBtn: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#1181B2",
    width: 180,
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  proceedText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
