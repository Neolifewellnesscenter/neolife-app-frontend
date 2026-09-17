import React from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

type TherapistHeaderProps = {
  title: string;
  subtitle?: string;
  therapistName?: string;
  onMenuPress: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export default function TherapistHeader({
  title,
  subtitle,
  therapistName = "Therapist",
  onMenuPress,
  onRefresh,
  refreshing = false,
}: TherapistHeaderProps) {
  const getInitial = () => {
    const name = therapistName?.trim();

    if (!name) {
      return "T";
    }

    return name.charAt(0).toUpperCase();
  };

  const openProfile = () => {
    router.push("/therapist/profile" as any);
  };

  return (
    <View style={styles.headerWrapper}>
      {/* =========================================
          MOBILE STATUS BAR SAFE SPACE
      ========================================== */}

      <View style={styles.statusBarSpace} />

      {/* =========================================
          ACTUAL HEADER
      ========================================== */}

      <View style={styles.header}>
        {/* MENU */}

        <TouchableOpacity
          style={styles.menuButton}
          onPress={onMenuPress}
          activeOpacity={0.75}
        >
          <Ionicons
            name="menu-outline"
            size={26}
            color="#123E32"
          />
        </TouchableOpacity>

        {/* PAGE TITLE */}

        <View style={styles.titleContainer}>
          <Text
            style={styles.title}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={styles.subtitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* RIGHT ACTIONS */}

        <View style={styles.rightActions}>
          {onRefresh ? (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
              disabled={refreshing}
              activeOpacity={0.75}
            >
              <Ionicons
                name="refresh-outline"
                size={21}
                color={
                  refreshing
                    ? "#AAB5AF"
                    : "#123E32"
                }
              />
            </TouchableOpacity>
          ) : null}

          {/* PROFILE */}

          <TouchableOpacity
            style={styles.profileButton}
            onPress={openProfile}
            activeOpacity={0.8}
          >
            <Text style={styles.profileInitial}>
              {getInitial()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* =========================================
     COMPLETE HEADER WRAPPER
  ========================================== */

  headerWrapper: {
    width: "100%",
    backgroundColor: "#FFFFFF",

    borderBottomWidth: 1,
    borderBottomColor: "#E3EAE6",

    ...Platform.select({
      android: {
        elevation: 4,
      },

      ios: {
        shadowColor: "#000000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.06,
        shadowRadius: 5,
      },
    }),
  },

  /* =========================================
     ANDROID STATUS BAR SPACE

     This pushes the header below:
     time / Wi-Fi / signal / battery
  ========================================== */

  statusBarSpace: {
    height:
      Platform.OS === "android"
        ? StatusBar.currentHeight || 24
        : 0,

    backgroundColor: "#FFFFFF",
  },

  /* =========================================
     ACTUAL HEADER
  ========================================== */

  header: {
    height: 64,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 14,

    backgroundColor: "#FFFFFF",
  },

  /* =========================================
     MENU BUTTON
  ========================================== */

  menuButton: {
    width: 42,
    height: 42,

    borderRadius: 13,

    backgroundColor: "#EAF4EF",

    alignItems: "center",
    justifyContent: "center",

    flexShrink: 0,
  },

  /* =========================================
     TITLE
  ========================================== */

  titleContainer: {
    flex: 1,

    minWidth: 0,

    marginLeft: 12,
    marginRight: 8,

    justifyContent: "center",
  },

  title: {
    fontSize: 16,
    lineHeight: 20,

    fontWeight: "800",

    color: "#123E32",

    includeFontPadding: false,
  },

  subtitle: {
    marginTop: 2,

    fontSize: 9,
    lineHeight: 13,

    fontWeight: "500",

    color: "#718078",

    includeFontPadding: false,
  },

  /* =========================================
     RIGHT ACTIONS
  ========================================== */

  rightActions: {
    flexDirection: "row",
    alignItems: "center",

    gap: 7,

    flexShrink: 0,
  },

  /* =========================================
     REFRESH
  ========================================== */

  refreshButton: {
    width: 40,
    height: 40,

    borderRadius: 12,

    backgroundColor: "#EAF4EF",

    alignItems: "center",
    justifyContent: "center",
  },

  /* =========================================
     PROFILE
  ========================================== */

  profileButton: {
    width: 42,
    height: 42,

    borderRadius: 21,

    backgroundColor: "#123E32",

    borderWidth: 2,
    borderColor: "#D9BE74",

    alignItems: "center",
    justifyContent: "center",
  },

  profileInitial: {
    color: "#FFFFFF",

    fontSize: 15,
    lineHeight: 18,

    fontWeight: "900",

    includeFontPadding: false,
  },
});