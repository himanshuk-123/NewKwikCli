import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../features/auth/store/auth.store';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { View, ActivityIndicator } from 'react-native';
import { navigationRef } from '../services/navigationService';
import { requestAllPermissions } from '../services/permissionsService';

const RootNavigator = () => {
  const { user, checkLogin, isLoading } = useAuthStore();
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [isNavReady, setIsNavReady] = React.useState(false);

  useEffect(() => {
    const init = async () => {
      await checkLogin();
      setIsInitializing(false);
    };
    init();
  }, [checkLogin]);

  // Request permissions when user logs in
  useEffect(() => {
    if (user && !isInitializing && isNavReady) {
      // Delay to ensure Activity is attached
      setTimeout(() => {
        requestAllPermissions();
      }, 300);
    }
  }, [user, isInitializing, isNavReady]);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1181B2" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setIsNavReady(true)}
    >
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default RootNavigator;
