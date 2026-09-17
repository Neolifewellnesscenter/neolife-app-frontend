import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE_URL } from "../services/api";

const GREEN = "#0B3D2E";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const MUTED = "#75837B";
const BORDER = "#E6EBE7";

type DoctorHeaderProps = {
  title: string;
  onMenuPress: () => void;
  showDashboardButton?: boolean;
};

export default function DoctorHeader({
  title,
  onMenuPress,
  showDashboardButton = true,
}: DoctorHeaderProps) {
  const insets = useSafeAreaInsets();

  const [doctorName, setDoctorName] = useState("Doctor");
  const [specialization, setSpecialization] = useState("");
  const [profileImage, setProfileImage] = useState("");

  const resolveImageUrl = useCallback((url?: string | null) => {
    if (!url) {
      return "";
    }

    const value = String(url).trim();

    if (!value) {
      return "";
    }

    const backendRoot = API_BASE_URL.replace(/\/api\/?$/, "");

    if (
      value.startsWith("http://") ||
      value.startsWith("https://")
    ) {
      if (
        value.includes("localhost:8085") ||
        value.includes("127.0.0.1:8085")
      ) {
        return value.replace(
          /^https?:\/\/(localhost|127\.0\.0\.1):8085/i,
          backendRoot
        );
      }

      return value;
    }

    return `${backendRoot}${
      value.startsWith("/") ? "" : "/"
    }${value}`;
  }, []);

  const loadDoctor = useCallback(async () => {
    try {
      const [
        savedDoctorName,
        savedSpecialization,
        savedImage,
        storedDoctor,
      ] = await Promise.all([
        AsyncStorage.getItem("doctorName"),
        AsyncStorage.getItem("doctorSpecialization"),
        AsyncStorage.getItem("doctorProfileImageUrl"),
        AsyncStorage.getItem("doctor"),
      ]);

      let name = savedDoctorName || "Doctor";
      let spec = savedSpecialization || "";
      let image = savedImage || "";

      if (storedDoctor) {
        try {
          const doctor = JSON.parse(storedDoctor);

          name =
            doctor?.name ||
            doctor?.doctorName ||
            savedDoctorName ||
            "Doctor";

          spec =
            doctor?.specialization ||
            savedSpecialization ||
            "";

          image =
            doctor?.imageUrl ||
            doctor?.profileImageUrl ||
            doctor?.profileImage ||
            savedImage ||
            "";
        } catch (error) {
          console.log(
            "DoctorHeader stored doctor parse error:",
            error
          );
        }
      }

      const resolvedImage = resolveImageUrl(image);

      setDoctorName(String(name || "Doctor"));
      setSpecialization(String(spec || ""));
      setProfileImage(resolvedImage);
    } catch (error) {
      console.log("DoctorHeader load error:", error);

      setDoctorName("Doctor");
      setSpecialization("");
      setProfileImage("");
    }
  }, [resolveImageUrl]);

  useFocusEffect(
    useCallback(() => {
      loadDoctor();
    }, [loadDoctor])
  );

  const cleanDoctorName = String(
    doctorName || "Doctor"
  )
    .replace(/^Dr\.?\s*/i, "")
    .trim();

  const initial =
    cleanDoctorName.charAt(0).toUpperCase() || "D";

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: Math.max(insets.top, 8) + 5,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.menuButton}
        onPress={onMenuPress}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel="Open doctor menu"
      >
        <Ionicons
          name="menu-outline"
          size={28}
          color={GREEN}
        />
      </TouchableOpacity>

      <View style={styles.titleWrap}>
        <Text style={styles.portalText}>
          DOCTOR PORTAL
        </Text>

        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.title}
        >
          {title}
        </Text>

        {specialization ? (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.specialization}
          >
            {specialization}
          </Text>
        ) : null}
      </View>

      {showDashboardButton && (
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() =>
            router.replace("/doctor/dashboard" as any)
          }
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Open dashboard"
        >
          <Ionicons
            name="grid-outline"
            size={22}
            color={GREEN}
          />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.profileButton}
        onPress={() =>
          router.push("/doctor/profile" as any)
        }
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel="Open doctor profile"
      >
        <View style={styles.avatar}>
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={styles.avatarImage}
              resizeMode="cover"
              onError={(event) => {
                console.log(
                  "DoctorHeader profile image failed:",
                  event.nativeEvent.error
                );

                console.log(
                  "DoctorHeader image URL:",
                  profileImage
                );

                setProfileImage("");
              }}
            />
          ) : (
            <Text style={styles.avatarText}>
              {initial}
            </Text>
          )}
        </View>

        <View style={styles.statusDot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 80,

    paddingHorizontal: 14,
    paddingBottom: 11,

    flexDirection: "row",
    alignItems: "center",

    gap: 10,

    backgroundColor: WHITE,

    borderBottomWidth: 1,
    borderBottomColor: BORDER,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 6,

    elevation: 3,

    zIndex: 50,
  },

  menuButton: {
    width: 48,
    height: 48,

    borderRadius: 16,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: MINT,

    borderWidth: 1,
    borderColor: "#DCEBE3",
  },

  titleWrap: {
    flex: 1,
    minWidth: 0,

    justifyContent: "center",
  },

  portalText: {
    fontFamily: "DMSans_700Bold",

    color: GOLD,

    fontSize: 8,
    letterSpacing: 1.35,
  },

  title: {
    marginTop: 1,

    fontFamily: "DMSans_700Bold",

    color: GREEN,

    fontSize: 18,
    lineHeight: 22,
  },

  specialization: {
    marginTop: 1,

    fontFamily: "DMSans_400Regular",

    color: MUTED,

    fontSize: 10,
    lineHeight: 13,
  },

  dashboardButton: {
    width: 45,
    height: 45,

    borderRadius: 15,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: CREAM,

    borderWidth: 1,
    borderColor: BORDER,
  },

  profileButton: {
    width: 48,
    height: 48,

    alignItems: "center",
    justifyContent: "center",
  },

  avatar: {
    width: 46,
    height: 46,

    borderRadius: 15,

    overflow: "hidden",

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: GREEN,

    borderWidth: 1,
    borderColor: "#DDE8E2",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarText: {
    fontFamily: "DMSans_700Bold",

    color: WHITE,

    fontSize: 18,
  },

  statusDot: {
    position: "absolute",

    right: 0,
    bottom: 0,

    width: 12,
    height: 12,

    borderRadius: 6,

    backgroundColor: "#41A36C",

    borderWidth: 2,
    borderColor: WHITE,
  },
});