import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import CustomDrawerContent from '../components/CustomDrawerContent';

// SCREENS
import DashBoard from '../pages/DashBoard/DashBoard'
import CreateLeads from '../pages/CreateLeads/CreateLeads';
import ValuationPage from '../features/valuation/ValuationPage';
import MyTaskPage from '../pages/MyTasks/index';
import ValuationCompletedLeadsPage from '../features/valuationCompletedLeads/ValuationCompletedLeadsPage';
import LeadsInProgressPage from '../features/leadInProgress/LeadInProgressPage';
import CompletedLeads from '../pages/CompletedLeads/CompletedLeads'
import QCLeads from '../pages/QCLeads'
import QCCompletedLeads from '../pages/QCCompletedLeads'
import QCHoldLeads from '../pages/QCHoldLeads'
import Account from '../pages/Account/Account';
import ChangePassword from '../pages/ChangePassword/ChangePassword';
import CustomCamera from '../components/CustomCamera'
import VideoCamera from '../components/VideoCamera'
import VehicleDetails from '../pages/VehicleDetails/index'
import ValuatedLeads from '../pages/ValuatedLeads/index';
import KwikPrice from '../pages/KwikPrice/KwikPrice';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

/* -------------------- DRAWER -------------------- */
const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#1181B2",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashBoard} />
      <Drawer.Screen name="Completed Leads" component={CompletedLeads} />
      <Drawer.Screen name="KwikPrice" component={KwikPrice} />
      <Drawer.Screen name="Account" component={Account} />
    </Drawer.Navigator>
  );
};

/* -------------------- APP STACK -------------------- */
const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{
      headerShown: true,
      headerStyle: {
        backgroundColor: "#1181B2",
      },
      headerTintColor: "#fff",
      headerTitleStyle: {
        fontWeight: "bold",
      },
    }}>
      {/* MAIN APP */}
      <Stack.Screen name="MainApp" component={DrawerNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="My Tasks" component={MyTaskPage} options={{ title: "My Tasks" }} />
      <Stack.Screen name="Valuate" component={ValuationPage} options={{ title: "Valuate" }} />
      <Stack.Screen name="Create Leads" component={CreateLeads} options={{ title: "Create Leads" }} />
      <Stack.Screen name="LeadsInProgress" component={LeadsInProgressPage} options={{ title: "Leads In Progress " }} />
      <Stack.Screen name="QCLeads" component={QCLeads} options={{ title: "QC Pending" }} />
      <Stack.Screen name="QCCompletedLeads" component={QCCompletedLeads} options={{ title: "QC Completed" }} />
      <Stack.Screen name="QCHoldLeads" component={QCHoldLeads} options={{ title: "QC Hold" }} />
      <Stack.Screen name="ValuationCompletedLeads" component={ValuationCompletedLeadsPage} options={{ title: "Completed Leads" }} />
      <Stack.Screen name="Camera" component={CustomCamera} options={{ title: "Camera" }} />
      <Stack.Screen name="VideoCamera" component={VideoCamera} options={{ title: "Record Video", headerShown: false }} />
      <Stack.Screen name="VehicleDetails" component={VehicleDetails} options={{ headerShown: false }} />
      <Stack.Screen name="CreateLeads" component={CreateLeads} options={{ title: "Create Leads" }} />
      <Stack.Screen name="ValuatedLeads" component={ValuatedLeads} options={{ title: "Valuated Leads" }} />
      <Stack.Screen name="KwikPrice" component={KwikPrice} options={{ title: "Kwik Price" }} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} options={{ title: "Change Password" }} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
