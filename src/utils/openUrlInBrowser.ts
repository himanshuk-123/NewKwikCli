import { Linking, ToastAndroid } from 'react-native';

export const openUrlInBrowser = async (url?: string) => {
  if (!url) {
    ToastAndroid.show('Invalid URL', ToastAndroid.SHORT);
    return;
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      ToastAndroid.show('Cannot open URL', ToastAndroid.SHORT);
    }
  } catch (error) {
    console.error('An error occurred', error);
    ToastAndroid.show('Error opening URL', ToastAndroid.SHORT);
  }
};
