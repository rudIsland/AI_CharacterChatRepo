import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";

import { MobileChatScreen } from "./src/features/chat/mobile-chat-screen";

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f1f5f9" }}>
      <StatusBar style="dark" />
      <MobileChatScreen />
    </SafeAreaView>
  );
}
