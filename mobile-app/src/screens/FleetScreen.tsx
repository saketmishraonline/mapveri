import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';

export const FleetScreen: React.FC = () => {
  const [checkedIn, setCheckedIn] = useState(false);
  const [radioActive, setRadioActive] = useState(false);

  const handleCheckIn = () => {
    setCheckedIn(true);
    Alert.alert(
      'Waypoint Check-in Verified',
      'Location check-in logged at Ghodbunder Toll Plaza Checkpoint. Dispatcher notified.'
    );
  };

  const handleRadio = () => {
    setRadioActive(true);
    Alert.alert('VHF Dispatch Radio', 'Connected to Dispatcher Channel 04 (Boisar Fleet Base). Audio channel open.');
    setTimeout(() => setRadioActive(false), 5000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <div>
            <Text style={styles.title}>Fleet Driver Hub</Text>
            <Text style={styles.subtitle}>Apex Freight &bull; Western Corridor</Text>
          </div>
          <View style={styles.truckPill}>
            <Text style={styles.truckId}>TRK-101</Text>
          </View>
        </View>

        {/* Assigned Truck Card */}
        <View style={styles.vehicleCard}>
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.modelText}>BharatBenz 2823C (24T Hauler)</Text>
              <Text style={styles.plateText}>MH-04-TR-8821</Text>
            </View>
            <View style={styles.activePill}>
              <View style={styles.greenDot} />
              <Text style={styles.activePillText}>IN TRANSIT</Text>
            </View>
          </View>

          {/* Telemetry Gauge Grid */}
          <View style={styles.gaugeGrid}>
            <View style={styles.gaugeBox}>
              <Text style={styles.gaugeLabel}>Speed</Text>
              <Text style={styles.gaugeVal}>58 km/h</Text>
              <Text style={styles.gaugeSub}>Limit: 65</Text>
            </View>
            <View style={styles.gaugeBox}>
              <Text style={styles.gaugeLabel}>Fuel Level</Text>
              <Text style={[styles.gaugeVal, { color: colors.amber }]}>78%</Text>
              <Text style={styles.gaugeSub}>270 Liters</Text>
            </View>
            <View style={styles.gaugeBox}>
              <Text style={styles.gaugeLabel}>Engine Temp</Text>
              <Text style={styles.gaugeVal}>88 °C</Text>
              <Text style={styles.gaugeSub}>Optimal</Text>
            </View>
            <View style={styles.gaugeBox}>
              <Text style={styles.gaugeLabel}>Tires (TPMS)</Text>
              <Text style={[styles.gaugeVal, { color: colors.success }]}>110 PSI</Text>
              <Text style={styles.gaugeSub}>10 Tires OK</Text>
            </View>
          </View>

          {/* Quick Driver Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.radioBtn, radioActive && styles.radioBtnActive]}
              onPress={handleRadio}
            >
              <Text style={styles.radioBtnText}>
                {radioActive ? '📻 Transmitting Radio...' : '📻 Radio Dispatcher'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkInBtn, checkedIn && styles.checkInBtnDone]}
              onPress={handleCheckIn}
            >
              <Text style={styles.checkInBtnText}>
                {checkedIn ? '✓ Checkpoint Passed' : '📍 Check-in at Toll'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cargo Manifest */}
        <View style={styles.manifestCard}>
          <Text style={styles.sectionHead}>Current Cargo Manifest</Text>
          <Text style={styles.manifestTitle}>Cold-Chain Pharmaceuticals & Vaccines</Text>
          <Text style={styles.manifestMeta}>
            Weight: 16.4 Tons &bull; Temp: 4.2 °C (Cold Chain OK)
          </Text>
          <Text style={styles.clientMeta}>Client: Sun Pharma Laboratories &bull; Manifest #MAN-2026-8801</Text>
        </View>

        {/* Route Corridor Progress */}
        <View style={styles.routeCard}>
          <Text style={styles.sectionHead}>Active Route Waypoints</Text>
          <View style={styles.routePoints}>
            <View style={styles.pointRow}>
              <Text style={styles.pointCheck}>✓</Text>
              <View>
                <Text style={styles.pointTitle}>Boisar MIDC Chemical Hub</Text>
                <Text style={styles.pointTime}>Departed 06:15 AM</Text>
              </View>
            </View>

            <View style={styles.pointRow}>
              <Text style={styles.pointCheck}>✓</Text>
              <View>
                <Text style={styles.pointTitle}>Manor Highway Bypass Checkpoint</Text>
                <Text style={styles.pointTime}>Passed 07:05 AM</Text>
              </View>
            </View>

            <View style={styles.pointRow}>
              <Text style={styles.pointActive}>&bull;</Text>
              <View>
                <Text style={[styles.pointTitle, { color: colors.navy }]}>Ghodbunder Toll Plaza</Text>
                <Text style={styles.pointTime}>Next Waypoint &bull; ETA 18 mins</Text>
              </View>
            </View>

            <View style={styles.pointRow}>
              <Text style={styles.pointPending}>○</Text>
              <View>
                <Text style={styles.pointTitleMuted}>Nhava Sheva JNPT Container Gate 4</Text>
                <Text style={styles.pointTime}>Final Destination &bull; ETA 09:45 AM</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
  truckPill: {
    backgroundColor: colors.navy,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  truckId: {
    color: colors.saffron,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modelText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  plateText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textSecondary,
    marginTop: 2,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#daf0e3',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  activePillText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#166534',
  },
  gaugeGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  gaugeBox: {
    flex: 1,
    backgroundColor: colors.parchment,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  gaugeLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  gaugeVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  gaugeSub: {
    fontSize: 8,
    color: colors.textSecondary,
    marginTop: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f1eb',
    paddingTop: 12,
  },
  radioBtn: {
    flex: 1,
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  radioBtnActive: {
    backgroundColor: colors.coral,
  },
  radioBtnText: {
    color: colors.saffron,
    fontSize: 11,
    fontWeight: '800',
  },
  checkInBtn: {
    flex: 1,
    backgroundColor: colors.teal,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  checkInBtnDone: {
    backgroundColor: '#86efac',
  },
  checkInBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  manifestCard: {
    backgroundColor: colors.parchmentCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    marginTop: 10,
  },
  sectionHead: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.teal,
    letterSpacing: 0.8,
  },
  manifestTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 4,
  },
  manifestMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clientMeta: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    marginTop: 10,
  },
  routePoints: {
    marginTop: 10,
    paddingLeft: 6,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pointCheck: {
    width: 18,
    color: colors.teal,
    fontWeight: '800',
  },
  pointActive: {
    width: 18,
    color: colors.saffron,
    fontSize: 20,
    lineHeight: 16,
    fontWeight: '900',
  },
  pointPending: {
    width: 18,
    color: '#cbd5e1',
    fontWeight: '800',
  },
  pointTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pointTitleMuted: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  pointTime: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
