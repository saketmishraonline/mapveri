# MapVeri Mobile Application (React Native / Expo)

A dedicated, cross-platform mobile application for **MapVeri** featuring **exclusive peer-to-peer offline token trading** via **NFC Phone Touch**, **Bluetooth Low Energy (BLE)**, and **Dynamic QR Fallback**.

> ⚠️ **Platform Exclusivity Note**: The offline peer-to-peer hardware exchange (NFC physical phone-to-phone touch and BLE proximity beam) is **exclusively built for this mobile application**. It does not exist on the desktop web interface.

---

## 🌟 Key Features

### 1. ⚡ Exclusive Phone-to-Phone Offline Token Trading (`NfcTradeScreen`)
Trade MapVeri reward tokens peer-to-peer **without cellular data, WiFi, or internet connectivity**:
- **Sender Flow**:
  1. Click **Send Tokens**.
  2. Enter the token amount (e.g., 5 🪙, 15 🪙, 50 🪙).
  3. Click **Ready: Tap Phones to Transfer**.
  4. Hold your phone back-to-back with the receiver's phone.
  5. The physical contact triggers an NFC field handshake, signs an offline cryptographic token ticket with a unique replay-defense nonce, and instantly transfers the tokens.
- **Receiver Flow**:
  1. Click **Receive Tokens**.
  2. Click **Listen for Sender Phone Touch**.
  3. Hold your phone touching the sender's phone.
  4. The receiver's vault cryptographically verifies the ticket checksum, validates the nonce, and credits the tokens locally.
- **Testing Simulator Built-in**:
  - Includes a `📲 Touch Phone / Simulate NFC Tap` button on screen so developers and testers can verify the physical touch transfer handshake instantly on any device or emulator without needing two physical NFC hardware units simultaneously!

### 2. 📡 Fallback Channels
- **Bluetooth Low Energy (BLE)**: Scans for neighboring peer phones within range and beams the encrypted token ticket.
- **Dynamic Signed QR Code**: When NFC is unavailable or disabled, the sender displays an offline QR ticket with a dynamic countdown timer that the receiver scans with their camera.

### 3. 🪙 Offline Token Vault (`WalletScreen`)
- Displays local token balance and offline cryptographic public address.
- Offline ledger tracking transaction hash, block index, timestamp, and transfer channel.
- Pending sync queue: When the phone reconnects to the internet, a one-tap **Sync to Cloud** button automatically submits the signed offline proofs to MapVeri's backend.

### 4. 🗺️ Community Map & Pinning (`MapScreen`)
- Mobile field notes map displaying verified community places and unverified locations nearby.
- One-tap verification checks (+1 🪙 reward).
- "+ Drop Pin" place submission with camera photo capture (+10 🪙 reward).

### 5. 🚚 Apex Freight Fleet Companion (`FleetScreen`)
- Mobile driver companion for commercial logistics.
- View assigned vehicle (`BharatBenz 2823C` | `MH-04-TR-8821`), live speed, fuel level, and cargo manifest.
- Check-in button at verified MapVeri toll checkpoints and one-tap VHF dispatcher radio simulation.

---

## 📱 Project Structure

```
mobile-app/
├── package.json
├── app.json                # Expo config with NFC, Bluetooth, Camera permissions
├── tsconfig.json
├── babel.config.js
├── App.tsx                 # Root application
├── index.js                # App entry
├── assets/                 # App icons and splash screen
└── src/
    ├── navigation/
    │   └── BottomTabNavigator.tsx  # Bottom tab bar with center floating NFC button
    ├── screens/
    │   ├── NfcTradeScreen.tsx      # ⭐ The centerpiece offline NFC/BLE/QR token exchange
    │   ├── WalletScreen.tsx        # Offline Vault & transaction ledger
    │   ├── MapScreen.tsx           # Mobile map & place verification
    │   ├── FleetScreen.tsx         # Driver & fleet companion
    │   └── ProfileScreen.tsx       # User identity & cryptographic keys
    ├── services/
    │   ├── nfc-service.ts          # NFC manager wrapper & touch contact simulation
    │   ├── bluetooth-service.ts    # BLE peer discovery & proximity beam
    │   ├── offline-token-vault.ts  # Local cryptographic vault, nonces, and signatures
    │   └── qr-crypto-service.ts    # Compressed visual QR token encoder/decoder
    ├── components/
    │   ├── PhoneTouchAnimation.tsx # Two phones touching back-to-back animation
    │   ├── NfcRadarAnimation.tsx   # Glowing concentric NFC antenna radar waves
    │   ├── DynamicQrCode.tsx       # Visual cryptographic QR ticket matrix
    │   └── OfflineStatusBanner.tsx # "100% Offline Mode" status indicator
    ├── theme/
    │   └── colors.ts               # MapVeri signature color palette
    └── types/
        └── index.ts                # TypeScript interfaces for offline tickets & transactions
```

---

## 🚀 How to Run the Mobile App

1. Open a terminal in the `mobile-app` directory:
   ```bash
   cd d:/MapProject/mobile-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npx expo start
   ```
4. **On Physical Device**:
   - Install **Expo Go** from the App Store (iOS) or Google Play Store (Android).
   - Scan the QR code displayed in your terminal.
5. **On Android Emulator**:
   - Press `a` in the terminal to launch the Android emulator.
6. **On iOS Simulator** (macOS):
   - Press `i` in the terminal to launch the iOS simulator.
7. **On Web Browser** (preview):
   - Press `w` in the terminal to open the mobile layout in a browser window.
