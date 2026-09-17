import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

type TherapistDrawerProps = {
  visible: boolean;
  onClose: () => void;
  activeRoute: string;
};

type MenuItem = {
  label: string;
  route: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const MENU_SECTIONS: MenuSection[] = [
  {
    title: "MAIN",
    items: [
      {
        label: "Dashboard",
        route: "/therapist/dashboard",
        icon: "grid-outline",
      },
      {
        label: "Manage Availability",
        route: "/therapist/availability",
        icon: "time-outline",
      },
      {
        label: "Booking Requests",
        route: "/therapist/booking-requests",
        icon: "file-tray-full-outline",
      },
      {
        label: "Daily Schedule",
        route: "/therapist/daily-schedule",
        icon: "calendar-outline",
      },
    ],
  },

  {
    title: "TREATMENT OPERATIONS",
    items: [
      {
        label: "Attendance & Sessions",
        route: "/therapist/attendance",
        icon: "checkmark-circle-outline",
      },
      {
        label: "Patient History",
        route: "/therapist/patient-history",
        icon: "people-outline",
      },
    ],
  },

  {
    title: "ACCOUNT",
    items: [
      {
        label: "My Profile",
        route: "/therapist/profile",
        icon: "person-outline",
      },
    ],
  },
];

export default function TherapistDrawer({
  visible,
  onClose,
  activeRoute,
}: TherapistDrawerProps) {
  const [therapistName, setTherapistName] =
    useState("Therapist");

  const [specialization, setSpecialization] =
    useState("Therapist");

  useEffect(() => {
    if (visible) {
      loadTherapistDetails();
    }
  }, [visible]);

  const loadTherapistDetails = async () => {
    try {
      const values = await AsyncStorage.multiGet([
        "therapistName",
        "name",
        "therapistProfile",
      ]);

      const therapistNameValue = values[0][1];
      const normalNameValue = values[1][1];
      const therapistProfileValue = values[2][1];

      setTherapistName(
        therapistNameValue ||
          normalNameValue ||
          "Therapist"
      );

      if (therapistProfileValue) {
        try {
          const profile = JSON.parse(
            therapistProfileValue
          );

          setSpecialization(
            profile?.specialization || "Therapist"
          );
        } catch {
          setSpecialization("Therapist");
        }
      }
    } catch (error) {
      console.log(
        "Unable to load therapist drawer details:",
        error
      );
    }
  };

  const navigateTo = (route: string) => {
    onClose();

    setTimeout(() => {
      router.push(route as any);
    }, 120);
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        "therapistToken",
        "therapistRefreshToken",

        "token",
        "accessToken",
        "refreshToken",

        "therapistId",
        "therapistName",
        "therapistProfile",
        "therapistProfileCompleted",

        "userId",
        "userName",
        "name",
        "email",
        "phoneNumber",

        "role",
        "profileCompleted",
        "isLoggedIn",
      ]);

      onClose();

      router.replace("/" as any);
    } catch (error) {
      console.log("Therapist logout error:", error);
    }
  };

  const getInitial = () => {
    const cleanName = therapistName?.trim();

    if (!cleanName) {
      return "T";
    }

    return cleanName.charAt(0).toUpperCase();
  };

  const isActive = (route: string) => {
    return activeRoute === route;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* DARK BACKDROP */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />

        {/* DRAWER */}
        <View style={styles.drawer}>
          {/* HEADER */}
          <View style={styles.drawerHeader}>
            <View style={styles.brandRow}>
              <View style={styles.logoBox}>
                <Text style={styles.logoText}>N</Text>
              </View>

              <View style={styles.brandTextContainer}>
                <Text style={styles.brandName}>
                  NeoLife
                </Text>

                <Text style={styles.portalText}>
                  THERAPIST PORTAL
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="close-outline"
                  size={24}
                  color="#123E32"
                />
              </TouchableOpacity>
            </View>

            {/* THERAPIST CARD */}
            <TouchableOpacity
              style={styles.profileCard}
              activeOpacity={0.8}
              onPress={() =>
                navigateTo("/therapist/profile")
              }
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitial()}
                </Text>
              </View>

              <View style={styles.profileInfo}>
                <Text
                  style={styles.therapistName}
                  numberOfLines={1}
                >
                  {therapistName}
                </Text>

                <Text
                  style={styles.specialization}
                  numberOfLines={1}
                >
                  {specialization}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward-outline"
                size={18}
                color="#718078"
              />
            </TouchableOpacity>
          </View>

          {/* MENU */}
          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={
              styles.menuContent
            }
            showsVerticalScrollIndicator={false}
          >
            {MENU_SECTIONS.map((section) => (
              <View
                key={section.title}
                style={styles.menuSection}
              >
                <Text style={styles.sectionTitle}>
                  {section.title}
                </Text>

                {section.items.map((item) => {
                  const active = isActive(
                    item.route
                  );

                  return (
                    <TouchableOpacity
                      key={item.route}
                      style={[
                        styles.menuItem,
                        active &&
                          styles.menuItemActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() =>
                        navigateTo(item.route)
                      }
                    >
                      <View
                        style={[
                          styles.menuIconBox,
                          active &&
                            styles.menuIconBoxActive,
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={
                            active
                              ? "#FFFFFF"
                              : "#123E32"
                          }
                        />
                      </View>

                      <Text
                        style={[
                          styles.menuLabel,
                          active &&
                            styles.menuLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>

                      {active ? (
                        <View
                          style={
                            styles.activeIndicator
                          }
                        />
                      ) : (
                        <Ionicons
                          name="chevron-forward-outline"
                          size={16}
                          color="#A5B0AA"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          {/* LOGOUT */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.8}
              onPress={logout}
            >
              <View
                style={styles.logoutIconContainer}
              >
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color="#A63F3F"
                />
              </View>

              <Text style={styles.logoutText}>
                Logout
              </Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              NeoLife Wellness Center
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    flexDirection: "row",
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor: "rgba(8, 29, 22, 0.55)",
  },

  drawer: {
    width: "84%",
    maxWidth: 350,

    height: "100%",

    backgroundColor: "#F8FAF8",

    shadowColor: "#000000",
    shadowOffset: {
      width: 4,
      height: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,

    elevation: 12,
  },

  drawerHeader: {
    backgroundColor: "#FFFFFF",

    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,

    borderBottomWidth: 1,
    borderBottomColor: "#E3EAE6",
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  logoBox: {
    width: 45,
    height: 45,

    borderRadius: 14,

    backgroundColor: "#123E32",

    alignItems: "center",
    justifyContent: "center",
  },

  logoText: {
    color: "#E7C66B",

    fontSize: 22,
    fontWeight: "900",
  },

  brandTextContainer: {
    flex: 1,

    marginLeft: 11,
  },

  brandName: {
    color: "#123E32",

    fontSize: 21,
    fontWeight: "900",
  },

  portalText: {
    marginTop: 1,

    color: "#B8923B",

    fontSize: 9,
    fontWeight: "900",

    letterSpacing: 1.3,
  },

  closeButton: {
    width: 40,
    height: 40,

    borderRadius: 12,

    backgroundColor: "#EAF4EF",

    alignItems: "center",
    justifyContent: "center",
  },

  profileCard: {
    marginTop: 17,

    padding: 12,

    borderRadius: 17,

    backgroundColor: "#F8FAF8",

    borderWidth: 1,
    borderColor: "#E3EAE6",

    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 46,
    height: 46,

    borderRadius: 23,

    backgroundColor: "#123E32",

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 2,
    borderColor: "#E7D19A",
  },

  avatarText: {
    color: "#FFFFFF",

    fontSize: 17,
    fontWeight: "900",
  },

  profileInfo: {
    flex: 1,

    marginLeft: 11,
    marginRight: 6,
  },

  therapistName: {
    color: "#20342D",

    fontSize: 13,
    fontWeight: "800",
  },

  specialization: {
    marginTop: 3,

    color: "#718078",

    fontSize: 10,
    fontWeight: "500",
  },

  menuScroll: {
    flex: 1,
  },

  menuContent: {
    paddingHorizontal: 14,
    paddingTop: 7,
    paddingBottom: 20,
  },

  menuSection: {
    marginTop: 14,
  },

  sectionTitle: {
    marginLeft: 8,
    marginBottom: 7,

    color: "#B8923B",

    fontSize: 9,
    fontWeight: "900",

    letterSpacing: 1.2,
  },

  menuItem: {
    minHeight: 52,

    marginBottom: 5,

    paddingHorizontal: 9,

    borderRadius: 14,

    flexDirection: "row",
    alignItems: "center",
  },

  menuItemActive: {
    backgroundColor: "#123E32",
  },

  menuIconBox: {
    width: 36,
    height: 36,

    borderRadius: 11,

    backgroundColor: "#EAF4EF",

    alignItems: "center",
    justifyContent: "center",
  },

  menuIconBoxActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  menuLabel: {
    flex: 1,

    marginLeft: 11,

    color: "#31483F",

    fontSize: 12,
    fontWeight: "700",
  },

  menuLabelActive: {
    color: "#FFFFFF",

    fontWeight: "800",
  },

  activeIndicator: {
    width: 5,
    height: 5,

    borderRadius: 3,

    backgroundColor: "#E7C66B",
  },

  footer: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 18,

    backgroundColor: "#FFFFFF",

    borderTopWidth: 1,
    borderTopColor: "#E3EAE6",
  },

  logoutButton: {
    minHeight: 50,

    borderRadius: 14,

    backgroundColor: "#FFF4F4",

    borderWidth: 1,
    borderColor: "#F0D1D1",

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 12,
  },

  logoutIconContainer: {
    width: 34,
    height: 34,

    borderRadius: 10,

    backgroundColor: "#FCE4E4",

    alignItems: "center",
    justifyContent: "center",
  },

  logoutText: {
    marginLeft: 11,

    color: "#A63F3F",

    fontSize: 12,
    fontWeight: "800",
  },

  footerText: {
    marginTop: 12,

    color: "#8B9891",

    fontSize: 9,
    fontWeight: "600",

    textAlign: "center",
  },
});