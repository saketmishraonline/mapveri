import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { MapScreen } from '../screens/MapScreen';
import { FleetScreen } from '../screens/FleetScreen';
import { NfcTradeScreen } from '../screens/NfcTradeScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

type TabName = 'map' | 'fleet' | 'trade' | 'wallet' | 'profile';

export const BottomTabNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabName>('trade'); // Default to the requested offline trade feature

  const renderScreen = () => {
    switch (activeTab) {
      case 'map':
        return <MapScreen />;
      case 'fleet':
        return <FleetScreen />;
      case 'trade':
        return <NfcTradeScreen />;
      case 'wallet':
        return <WalletScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <NfcTradeScreen />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Active Screen View */}
      <View style={styles.screenWrapper}>{renderScreen()}</View>

      {/* Bottom Tab Navigation Bar */}
      <SafeAreaView style={styles.bottomNavContainer}>
        <View style={styles.tabBar}>
          {/* 1. Map Tab */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('map')}
            accessibilityLabel="Community Map"
          >
            <Text style={[styles.tabIcon, activeTab === 'map' && styles.tabIconActive]}>🗺️</Text>
            <Text style={[styles.tabLabel, activeTab === 'map' && styles.tabLabelActive]}>Map</Text>
          </TouchableOpacity>

          {/* 2. Fleet Tab */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('fleet')}
            accessibilityLabel="Trucking Fleet"
          >
            <Text style={[styles.tabIcon, activeTab === 'fleet' && styles.tabIconActive]}>🚚</Text>
            <Text style={[styles.tabLabel, activeTab === 'fleet' && styles.tabLabelActive]}>Fleet</Text>
          </TouchableOpacity>

          {/* 3. Center Floating NFC Tap & Trade Button */}
          <TouchableOpacity
            style={styles.centerTradeButton}
            onPress={() => setActiveTab('trade')}
            accessibilityLabel="Offline Token Trade"
          >
            <View
              style={[
                styles.centerTradeCircle,
                activeTab === 'trade' && styles.centerTradeCircleActive,
              ]}
            >
              <Text style={styles.centerTradeIcon}>⚡</Text>
              <Text style={styles.centerTradeLabel}>NFC TAP</Text>
            </View>
          </TouchableOpacity>

          {/* 4. Wallet Tab */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('wallet')}
            accessibilityLabel="Offline Token Vault"
          >
            <Text style={[styles.tabIcon, activeTab === 'wallet' && styles.tabIconActive]}>🪙</Text>
            <Text style={[styles.tabLabel, activeTab === 'wallet' && styles.tabLabelActive]}>Vault</Text>
          </TouchableOpacity>

          {/* 5. Profile Tab */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('profile')}
            accessibilityLabel="My Profile"
          >
            <Text style={[styles.tabIcon, activeTab === 'profile' && styles.tabIconActive]}>👤</Text>
            <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  screenWrapper: {
    flex: 1,
  },
  bottomNavContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1.5,
    borderTopColor: colors.parchmentBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 10,
  },
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 62 : 66,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  tabIconActive: {
    opacity: 1,
    transform: [{ scale: 1.15 }],
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  tabLabelActive: {
    color: colors.tealDark,
    fontWeight: '800',
  },
  centerTradeButton: {
    top: -14,
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
  },
  centerTradeCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  centerTradeCircleActive: {
    backgroundColor: colors.saffron,
    borderColor: colors.navy,
  },
  centerTradeIcon: {
    fontSize: 22,
  },
  centerTradeLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'monospace',
    marginTop: -2,
    letterSpacing: 0.5,
  },
});
