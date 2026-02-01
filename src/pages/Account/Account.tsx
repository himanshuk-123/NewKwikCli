import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { COLORS } from '../../constants/Colors.tsx';
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProfileInterface } from "../../types/UserProfile";
import * as ImagePicker from 'react-native-image-picker';
import { uploadProfileImageApi } from "../../features/account/api/profileImage.api";
import Feather from "react-native-vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";

type Props = {};

const Account = (props: Props) => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<ProfileInterface | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userCreds = await AsyncStorage.getItem('user_credentials');
      if (userCreds) {
        const parsed = JSON.parse(userCreds);
        setProfile(parsed);
      }
    } catch (error) {
      console.error('[Account] Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to pick image');
        return;
      }

      if (result.assets && result.assets[0].base64) {
        setIsUploading(true);
        const uploadResponse = await uploadProfileImageApi({
          base64String: result.assets[0].base64,
        });
        
        // Update local profile image
        if (profile) {
          const serverImagePath = uploadResponse?.ProfileImage || uploadResponse?.PROFILEIMAGE || uploadResponse?.ImagePath;
          const updatedProfile = {
            ...profile,
            ProfileImage: serverImagePath || result.assets[0].uri,
          };
          setProfile(updatedProfile);
          // Update AsyncStorage
          await AsyncStorage.setItem('user_credentials', JSON.stringify(updatedProfile));
        }
        setIsUploading(false);
      }
    } catch (error) {
      console.error('[Account] Error uploading image:', error);
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.AppTheme.primary} />
          <Text style={styles.loaderText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContainer}>
        <View>
          <View style={styles.imageContainer}>
            <TouchableOpacity 
              style={styles.avatarContainer} 
              onPress={pickImage}
              disabled={isUploading}
            >
              {profile?.ProfileImage ? (
                <Image
                  style={styles.avatar}
                  source={{
                    uri:
                      profile.ProfileImage.startsWith('http') ||
                      profile.ProfileImage.startsWith('file://') ||
                      profile.ProfileImage.startsWith('content://')
                        ? profile.ProfileImage
                        : `https://inspection.kwikcheck.in${profile.ProfileImage}`,
                  }}
                />
              ) : (
                <Feather name="camera" size={40} color="white" />
              )}
              {isUploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="white" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.imageContainerText}>
              {profile?.SHOPNAME || 'Shop Name'}
            </Text>
          </View>

          <View style={styles.detailContainer}>
            <Text style={styles.fwBold}>User Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={profile?.LoginUserId || profile?.USERID || ''}
              editable={false}
            />
            <Text style={styles.fwBold}>Email ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={profile?.EMAIL || ''}
              editable={false}
            />
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          enabled
          keyboardVerticalOffset={Platform.select({ ios: 80, android: 50 })}
        >
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.outlineButton}>
              <Text style={styles.outlineButtonText}>Help</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                (navigation as any).navigate("ChangePassword");
              }}
            >
              <Text style={styles.primaryButtonText}>Change Password</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

export default Account;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mainContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#9ca3af",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imageContainerText: {
    fontWeight: "bold",
    paddingTop: 10,
    fontSize: 20,
    textAlign: "center",
  },
  fwBold: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  detailContainer: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#f9fafb",
  },
  buttonContainer: {
    height: 150,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: COLORS.AppTheme.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  outlineButtonText: {
    color: COLORS.AppTheme.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  primaryButton: {
    backgroundColor: COLORS.AppTheme.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
    color: "#4b5563",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 60,
  },
});
