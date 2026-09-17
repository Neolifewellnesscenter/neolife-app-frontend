import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const GREEN = "#0B3D2E";
const GOLD = "#D6B45B";
const GOLD_LIGHT = "#F4E6B7";
const WHITE = "#FFFFFF";
const MUTED_WHITE = "rgba(255,255,255,0.66)";
const DIVIDER = "rgba(255,255,255,0.12)";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.86, 325);

type Props = {
  visible: boolean;
  onClose: () => void;
  activeRoute?: string;
};

type MenuItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const MAIN_ITEMS: MenuItem[] = [
  {
    label: "Dashboard",
    icon: "grid-outline",
    route: "/medical/dashboard",
  },
  {
    label: "Product Management",
    icon: "cube-outline",
    route: "/medical/products",
  },
  {
    label: "Patient Dashboard",
    icon: "people-outline",
    route: "/medical/patients",
  },
];

const CLINICAL_ITEMS: MenuItem[] = [
  {
    label: "Appointment Management",
    icon: "calendar-outline",
    route: "/medical/appointments",
  },
  {
    label: "Consultation Management",
    icon: "medkit-outline",
    route: "/medical/consultations",
  },
  {
    label: "Therapy Bookings",
    icon: "leaf-outline",
    route: "/medical/daily-treatment",
  },
  {
    label: "Prescriptions",
    icon: "document-text-outline",
    route: "/medical/prescriptions",
  },
];

const SALES_ITEMS: MenuItem[] = [
  {
    label: "Order Management",
    icon: "cart-outline",
    route: "/medical/orders",
  },
  {
    label: "My Profile",
    icon: "person-circle-outline",
    route: "/medical/profile",
  },
];

export default function MedicalDrawer({
  visible,
  onClose,
  activeRoute = "",
}: Props) {
  const translateX = useRef(
    new Animated.Value(-DRAWER_WIDTH)
  ).current;

  const [staffName, setStaffName] =
    useState("Medical Staff");

  const [designation, setDesignation] =
    useState("Medical Staff");

  useEffect(() => {
    if (visible) {
      void loadProfile();

      translateX.setValue(-DRAWER_WIDTH);

      Animated.timing(translateX, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateX]);

  async function loadProfile() {
    const name =
      (await AsyncStorage.getItem("staffName")) ||
      (await AsyncStorage.getItem("name")) ||
      "Medical Staff";

    let roleText = "Medical Staff";

    try {
      const raw =
        await AsyncStorage.getItem("staffProfile");

      if (raw) {
        const profile = JSON.parse(raw);

        roleText =
          profile?.designation ||
          profile?.department ||
          "Medical Staff";
      }
    } catch {
      // Keep fallback values.
    }

    setStaffName(name);
    setDesignation(roleText);
  }

  function navigate(route: string) {
    onClose();

    setTimeout(() => {
      router.push(route as any);
    }, 100);
  }

  async function logout() {
    await AsyncStorage.multiRemove([
      "staffToken",
      "staffRefreshToken",
      "token",
      "accessToken",
      "refreshToken",
      "role",
      "medicalStaffId",
      "staffName",
      "staffProfile",
      "userId",
      "userName",
      "name",
      "email",
      "phoneNumber",
      "profileCompleted",
      "isLoggedIn",
    ]);

    onClose();

    router.replace("/login" as any);
  }

  function renderSection(
    title: string,
    items: MenuItem[]
  ) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          {title}
        </Text>

        {items.map((item) => {
          const active =
            activeRoute === item.route;

          return (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.menuItem,
                active && styles.menuItemActive,
              ]}
              onPress={() =>
                navigate(item.route)
              }
              activeOpacity={0.82}
            >
              <View
                style={[
                  styles.menuIcon,
                  active &&
                    styles.menuIconActive,
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={
                    active ? GREEN : WHITE
                  }
                />
              </View>

              <Text
                style={[
                  styles.menuText,
                  active &&
                    styles.menuTextActive,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>

              {active && (
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={GOLD}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Ionicons
                name="medical"
                size={22}
                color={GREEN}
              />
            </View>

            <View style={styles.brandText}>
              <Text style={styles.brandName}>
                NeoLife
              </Text>

              <Text style={styles.brandPortal}>
                MEDICAL STAFF PORTAL
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.82}
            >
              <Ionicons
                name="close"
                size={21}
                color={WHITE}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.staffCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {staffName
                  .trim()
                  .charAt(0)
                  .toUpperCase() || "M"}
              </Text>
            </View>

            <View style={styles.staffInfo}>
              <Text
                style={styles.staffName}
                numberOfLines={1}
              >
                {staffName}
              </Text>

              <Text
                style={styles.designation}
                numberOfLines={1}
              >
                {designation}
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={
              styles.scrollContent
            }
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {renderSection(
              "MAIN",
              MAIN_ITEMS
            )}

            {renderSection(
              "CLINICAL OPERATIONS",
              CLINICAL_ITEMS
            )}

            {renderSection(
              "SALES & DELIVERY",
              SALES_ITEMS
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={logout}
              activeOpacity={0.85}
            >
              <Ionicons
                name="log-out-outline"
                size={19}
                color={WHITE}
              />

              <Text style={styles.logoutText}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(8, 25, 17, 0.58)",
  },

  drawer: {
    height: "100%",

    paddingTop:
      Platform.OS === "ios" ? 20 : 8,

    backgroundColor: GREEN,

    shadowColor: "#000000",
    shadowOffset: {
      width: 6,
      height: 0,
    },
    shadowOpacity: 0.22,
    shadowRadius: 18,

    elevation: 18,
  },

  brand: {
    minHeight: 72,

    paddingHorizontal: 16,
    paddingVertical: 10,

    flexDirection: "row",
    alignItems: "center",

    gap: 10,

    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },

  brandMark: {
    width: 42,
    height: 42,

    borderRadius: 21,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: GOLD,

    borderWidth: 1.5,
    borderColor: GOLD_LIGHT,
  },

  brandText: {
    flex: 1,
    minWidth: 0,
  },

  brandName: {
    color: WHITE,

    fontSize: 18,
    fontWeight: "800",
  },

  brandPortal: {
    marginTop: 1,

    color: GOLD_LIGHT,

    fontSize: 8,
    fontWeight: "800",

    letterSpacing: 0.9,
  },

  closeButton: {
    width: 36,
    height: 36,

    borderRadius: 18,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.10)",
  },

  staffCard: {
    minHeight: 62,

    marginHorizontal: 13,
    marginTop: 10,
    marginBottom: 8,

    paddingHorizontal: 11,
    paddingVertical: 8,

    borderRadius: 14,

    flexDirection: "row",
    alignItems: "center",

    gap: 10,

    backgroundColor:
      "rgba(255,255,255,0.07)",

    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.12)",
  },

  avatar: {
    width: 38,
    height: 38,

    borderRadius: 19,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: GOLD,
  },

  avatarText: {
    color: GREEN,

    fontSize: 15,
    fontWeight: "800",
  },

  staffInfo: {
    flex: 1,
    minWidth: 0,
  },

  staffName: {
    color: WHITE,

    fontSize: 13,
    fontWeight: "800",
  },

  designation: {
    marginTop: 2,

    color: MUTED_WHITE,

    fontSize: 9,
    fontWeight: "500",
  },

  menuScroll: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 10,
  },

  section: {
    marginBottom: 9,
  },

  sectionLabel: {
    marginLeft: 11,
    marginBottom: 4,
    marginTop: 3,

    color:
      "rgba(255,255,255,0.46)",

    fontSize: 8,
    fontWeight: "800",

    letterSpacing: 1.1,
  },

  menuItem: {
    minHeight: 44,

    marginBottom: 3,

    paddingHorizontal: 9,

    borderRadius: 11,

    flexDirection: "row",
    alignItems: "center",

    gap: 9,
  },

  menuItemActive: {
    backgroundColor: WHITE,
  },

  menuIcon: {
    width: 31,
    height: 31,

    borderRadius: 9,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.08)",
  },

  menuIconActive: {
    backgroundColor: "#F8EFCF",
  },

  menuText: {
    flex: 1,

    color:
      "rgba(255,255,255,0.86)",

    fontSize: 12,
    fontWeight: "700",
  },

  menuTextActive: {
    color: GREEN,
    fontWeight: "800",
  },

  footer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom:
      Platform.OS === "ios" ? 24 : 12,

    borderTopWidth: 1,
    borderTopColor: DIVIDER,

    backgroundColor: GREEN,
  },

  logoutButton: {
    minHeight: 46,

    borderRadius: 12,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 8,

    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.18)",

    backgroundColor:
      "rgba(255,255,255,0.08)",
  },

  logoutText: {
    color: WHITE,

    fontSize: 13,
    fontWeight: "800",
  },
});
