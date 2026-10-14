import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import { colors } from './src/theme/colors';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor={colors.parchment} />
      <BottomTabNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
});
