import { View, Text, StatusBar, Platform } from 'react-native'
import React, { useEffect } from 'react'
import RootNavigator from './src/navigation/RootNavigator'
import { SafeAreaView } from 'react-native-safe-area-context'
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { uploadQueueManager } from './src/services/uploadQueue.manager';

const App = () => {
  // Resume pending uploads when app starts
  useEffect(() => {
    uploadQueueManager.resumeUploads().catch(error => {
      console.error('[App] Error resuming uploads:', error);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {Platform.OS === 'android' && (
        <View style={{ height: StatusBar.currentHeight, backgroundColor: '#1181B2' }} />
      )}
      <SafeAreaView style={{ flex: 1 }}>
        <RootNavigator />
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

export default App