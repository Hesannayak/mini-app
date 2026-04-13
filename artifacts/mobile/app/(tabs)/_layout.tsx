import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

// iOS 26: native tabs with liquid glass — system-level appearance, no custom branding
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "bubble.left", selected: "bubble.left.fill" }} />
        <Label>Chat</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="spending">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Spending</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="voice">
        <Icon sf={{ default: "mic", selected: "mic.fill" }} />
        <Label>Voice</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bills">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>Bills</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="score">
        <Icon sf={{ default: "star", selected: "star.fill" }} />
        <Label>Score</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// Tab metadata
const TAB_META: Record<string, { icon: string; label: string }> = {
  index: { icon: "message-circle", label: "Chat" },
  spending: { icon: "bar-chart-2", label: "Spending" },
  voice: { icon: "mic", label: "Voice" },
  bills: { icon: "file-text", label: "Bills" },
  score: { icon: "star", label: "Score" },
};

function MiniTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === "web" ? 0 : 8);

  return (
    <View
      style={[
        tabStyles.bar,
        {
          paddingBottom: bottomPad + (Platform.OS === "web" ? 12 : 8),
          height: 64 + bottomPad + (Platform.OS === "web" ? 12 : 8),
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const isVoice = route.name === "voice";
        const meta = TAB_META[route.name] || { icon: "circle", label: route.name };

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            if (Platform.OS !== "web") Haptics.selectionAsync();
            navigation.navigate(route.name);
          }
        };

        if (isVoice) {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={tabStyles.voiceTab}
              activeOpacity={0.85}
            >
              <View
                style={[
                  tabStyles.voiceCircle,
                  focused
                    ? tabStyles.voiceCircleFocused
                    : tabStyles.voiceCircleBase,
                ]}
              >
                <Feather name="mic" size={26} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          );
        }

        const color = focused ? "#EEF2FF" : "#4A4A6A";

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={tabStyles.tab}
            activeOpacity={0.7}
          >
            <Feather name={meta.icon as any} size={21} color={color} />
            <Text style={[tabStyles.label, { color }]}>{meta.label}</Text>
            {focused && <View style={tabStyles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      tabBar={(props) => <MiniTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="spending" />
      <Tabs.Screen name="voice" />
      <Tabs.Screen name="bills" />
      <Tabs.Screen name="score" />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#080812",
    borderTopWidth: 1,
    borderTopColor: "#0F0F1E",
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.2,
    fontFamily: "Inter_500Medium",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#6366F1",
    marginTop: 2,
  },
  voiceTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: -22,
    paddingBottom: 4,
  },
  voiceCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#080812",
  },
  voiceCircleBase: {
    backgroundColor: "#1A1A30",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  voiceCircleFocused: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
});
