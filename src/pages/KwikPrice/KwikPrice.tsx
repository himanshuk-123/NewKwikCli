import { WebView } from "react-native-webview";
import React, { Component } from 'react';

import { StyleSheet } from "react-native";

export default function KwikPrice() {
  return (
    <WebView
      style={styles.container}
      source={{ uri: "https://kwikcheck.in/kwikprice" }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // marginTop: Constants.statusBarHeight,
  },
});
