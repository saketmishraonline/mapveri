import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';

const SAMPLE_PINS = [
  {
    id: 5,
    name: "H.J. Thim Trust's Theem College of Engineering",
    category: 'Education',
    lat: 19.8055,
    lng: 72.7668,
    status: 'unverified',
    distance: '120 m away',
    reward: '+1 🪙 Check',
  },
  {
    id: 6,
    name: "Nallasopara Famous Khau Galli Street #1",
    category: 'Food & Drink',
    lat: 19.4241,
    lng: 72.787,
    status: 'community_verified',
    distance: '3.2 km away',
    reward: 'Verified',
  },
  {
    id: 7,
    name: "Vasai Road Iconic Vada Pav Stall #2",
    category: 'Food & Drink',
    lat: 19.3354,
    lng: 72.8258,
    status: 'community_verified',
    distance: '7.8 km away',
    reward: 'Verified',
  },
  {
    id: 8,
    name: "Boisar Old Heritage Banyan Tree Chowk",
    category: 'Landmark',
    lat: 19.7995,
    lng: 72.7482,
    status: 'community_verified',
    distance: '850 m away',
    reward: 'Verified',
  },
];

export const MapScreen: React.FC = () => {
  const [pins, setPins] = useState(SAMPLE_PINS);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [verifiedCount, setVerifiedCount] = useState(0);

  const handleVerify = (pinId: number) => {
    setPins((prev) =>
      prev.map((p) =>
        p.id === pinId
          ? { ...p, status: 'community_verified', reward: 'Verified (+1 🪙 Credited)' }
          : p
      )
    );
    setVerifiedCount((c) => c + 1);
    Alert.alert('Verification Logged! 🪙', 'You verified this place and earned +1 MapVeri Token in your wallet!');
  };

  const handleAddNewPlace = () => {
    Alert.alert(
      'Drop Place Pin',
      'GPS location acquired at current mobile coordinates [19.8036, 72.7615]. Take a photo and submit your place to earn +10 🪙 tokens.'
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <div>
            <Text style={styles.title}>Map Workspace</Text>
            <Text style={styles.subtitle}>Community Map & Local Record</Text>
          </div>
          <TouchableOpacity style={styles.addPinButton} onPress={handleAddNewPlace}>
            <Text style={styles.addPinText}>+ Drop Pin</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search neighborhood places..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Pin List */}
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Places to Check</Text>
            <Text style={styles.verifiedTally}>{verifiedCount} verified today</Text>
          </View>

          {pins.map((pin) => (
            <View key={pin.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <Text style={styles.pinName}>{pin.name}</Text>
                  <Text style={styles.pinMeta}>
                    {pin.category} &bull; {pin.distance}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    pin.status === 'unverified' ? styles.badgePending : styles.badgeVerified,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      pin.status === 'unverified' ? styles.textPending : styles.textVerified,
                    ]}
                  >
                    {pin.status === 'unverified' ? 'Needs Check' : 'Verified'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.coordsText}>
                  {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                </Text>
                {pin.status === 'unverified' ? (
                  <TouchableOpacity
                    style={styles.verifyAction}
                    onPress={() => handleVerify(pin.id)}
                  >
                    <Text style={styles.verifyActionText}>Verify Place (+1 🪙)</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.verifiedPill}>✓ Confirmed by You</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addPinButton: {
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addPinText: {
    color: colors.saffron,
    fontSize: 12,
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.parchmentBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginVertical: 8,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    padding: 0,
  },
  listContent: {
    paddingBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  verifiedTally: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.teal,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
    marginRight: 8,
  },
  pinName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pinMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgeVerified: {
    backgroundColor: '#daf0e3',
  },
  statusText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  textPending: {
    color: '#854d0e',
  },
  textVerified: {
    color: '#166534',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f1eb',
    paddingTop: 8,
  },
  coordsText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  verifyAction: {
    backgroundColor: colors.teal,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  verifyActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  verifiedPill: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: '700',
  },
});
