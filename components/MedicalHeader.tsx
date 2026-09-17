import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const GREEN = "#0B3D2E";
const GOLD = "#D6B45B";
const WHITE = "#FFFFFF";
const MUTED = "#75837B";
const BORDER = "#E7ECE8";
const DANGER = "#C34F48";

type MedicalHeaderProps = {
  title: string;
  subtitle?: string;
  onMenuPress: () => void;
  notificationCount?: number;
  onNotificationPress?: () => void;
};

export default function MedicalHeader({
  title,
  subtitle,
  onMenuPress,
  notificationCount = 0,
  onNotificationPress,
}: MedicalHeaderProps) {
  const [staffName, setStaffName] = useState("Medical Staff");

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    try {
      const name =
        (await AsyncStorage.getItem("staffName")) ||
        (await AsyncStorage.getItem("name")) ||
        "Medical Staff";

      setStaffName(name);
    } catch {
      setStaffName("Medical Staff");
    }
  }

  const initial =
    staffName?.trim()?.charAt(0)?.toUpperCase() || "M";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {/* LEFT */}
        <View style={styles.leftSection}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={onMenuPress}
            activeOpacity={0.8}
          >
            <Ionicons
              name="menu-outline"
              size={27}
              color={WHITE}
            />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text
              style={styles.title}
              numberOfLines={1}
            >
              {title}
            </Text>

            {subtitle ? (
              <Text
                style={styles.subtitle}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* RIGHT */}
        <View style={styles.rightSection}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onNotificationPress}
            activeOpacity={0.8}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={GREEN}
            />

            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>
                  {notificationCount > 99
                    ? "99+"
                    : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() =>
              router.push("/medical/profile" as any)
            }
            activeOpacity={0.8}
          >
            <Text style={styles.profileInitial}>
              {initial}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: WHITE,
  },

  header: {
  minHeight: Platform.OS === "ios" ? 104 : 96,

  paddingTop: Platform.OS === "ios" ? 22 : 32,
  paddingBottom: 12,
  paddingHorizontal: 16,

  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",

  backgroundColor: WHITE,

  borderBottomWidth: 1,
  borderBottomColor: BORDER,

  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.05,
  shadowRadius: 5,
  elevation: 3,
},

  leftSection: {
    flex: 1,

    flexDirection: "row",
    alignItems: "center",

    minWidth: 0,
  },

  menuButton: {
    width: 46,
    height: 46,

    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: GREEN,

    marginRight: 12,
  },

  titleContainer: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    color: GREEN,

    fontSize: 20,
    fontWeight: "800",

    letterSpacing: -0.3,
  },

  subtitle: {
    marginTop: 2,

    color: MUTED,

    fontSize: 10,
    fontWeight: "500",
  },

  rightSection: {
    flexDirection: "row",
    alignItems: "center",

    marginLeft: 10,

    gap: 8,
  },

  notificationButton: {
    width: 44,
    height: 44,

    position: "relative",

    borderRadius: 22,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: WHITE,

    borderWidth: 1,
    borderColor: BORDER,
  },

  notificationBadge: {
    position: "absolute",

    top: -3,
    right: -3,

    minWidth: 18,
    height: 18,

    paddingHorizontal: 4,

    borderRadius: 9,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: DANGER,

    borderWidth: 2,
    borderColor: WHITE,
  },

  notificationText: {
    color: WHITE,

    fontSize: 8,
    fontWeight: "800",
  },

  profileButton: {
    width: 44,
    height: 44,

    borderRadius: 22,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: GOLD,
  },

  profileInitial: {
    color: GREEN,

    fontSize: 16,
    fontWeight: "800",
  },
});