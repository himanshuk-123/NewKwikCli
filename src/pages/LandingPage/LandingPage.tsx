import { LocalStorage } from "@src/Utils";
import { SplashScreenLogo } from "@src/assets";
import { GetTokenValidity } from "@src/services/Slices";
import { useCustomNavigation } from "@src/services/useCustomNavigation";
import useGetPermissionsAsync from "@src/services/useGetPermissionsAsync";
import { useEffect, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function LandingPage() {
  const permissions = useGetPermissionsAsync();
  const { replaceNavigation } = useCustomNavigation();

  const openAppSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  useEffect(() => {
    const getCreds = async () => {
      try {
        const token = await LocalStorage.get("user_credentials");
        console.log("Found token", token);
        if (Object.keys(token).length !== 0) {
          const isValidToken = await GetTokenValidity();
          if (isValidToken) {
            replaceNavigation("Homepage");
          } else {
            replaceNavigation("Login");
            LocalStorage.remove("user_credentials");
          }
        } else {
          replaceNavigation("Login");
        }
      } catch (error) {
        console.log(error);
      }
    };

    if (permissions) {
      (async () => await getCreds())();
    }
  }, [permissions]);

  if (permissions === null) {
    return (
      <View style={styles.center}>
        <Image height={100} width={100} source={SplashScreenLogo} />
      </View>
    );
  }

  if (permissions === false) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TouchableOpacity onPress={openAppSettings}>
          <Text style={{}}>
            Not all permissions granted! Tap to go to settings.
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Image height={100} width={100} source={SplashScreenLogo} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
});
