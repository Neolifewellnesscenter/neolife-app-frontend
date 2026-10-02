import React from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  fontSize,
  horizontalPadding,
  isSmallPhone,
} from "../utils/responsive";

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
  const { width } = useWindowDimensions();

  const compact = width < 360;
  const veryCompact = width < 330;

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

      <View
        style={[
          styles.header,
          {
            minHeight: compact ? 58 : 64,
            paddingHorizontal: compact ? 10 : horizontalPadding,
          },
        ]}
      >
        {/* MENU */}

        <TouchableOpacity
          style={[
            styles.menuButton,
            compact && styles.compactActionButton,
          ]}
          onPress={onMenuPress}
          activeOpacity={0.75}
        >
          <Ionicons
            name="menu-outline"
            size={compact ? 23 : 26}
            color="#123E32"
          />
        </TouchableOpacity>

        {/* PAGE TITLE */}

        <View
          style={[
            styles.titleContainer,
            {
              marginLeft: compact ? 8 : 12,
              marginRight: compact ? 5 : 8,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              compact && styles.titleCompact,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                compact && styles.subtitleCompact,
              ]}
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
              style={[
                styles.refreshButton,
                compact && styles.compactActionButton,
              ]}
              onPress={onRefresh}
              disabled={refreshing}
              activeOpacity={0.75}
            >
              <Ionicons
                name="refresh-outline"
                size={compact ? 19 : 21}
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
            style={[
              styles.profileButton,
              compact && styles.compactProfileButton,
            ]}
            onPress={openProfile}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.profileInitial,
                compact && styles.profileInitialCompact,
              ]}
            >
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
    flexDirection: "row",
    alignItems: "center",

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
    fontSize: fontSize(16),
    lineHeight: fontSize(20),

    fontWeight: "800",

    color: "#123E32",

    includeFontPadding: false,
  },

  subtitle: {
    marginTop: 2,

    fontSize: fontSize(9),
    lineHeight: fontSize(13),

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

    gap: isSmallPhone ? 5 : 7,

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

    fontSize: fontSize(15),
    lineHeight: fontSize(18),

    fontWeight: "900",

    includeFontPadding: false,
  },

  compactActionButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
  },

  compactProfileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  titleCompact: {
    fontSize: fontSize(14),
    lineHeight: fontSize(18),
  },

  subtitleCompact: {
    fontSize: fontSize(8),
    lineHeight: fontSize(11),
  },

  profileInitialCompact: {
    fontSize: fontSize(13),
    lineHeight: fontSize(16),
  },
});
