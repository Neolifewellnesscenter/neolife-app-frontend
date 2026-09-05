import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts as useDMSans,
} from "@expo-google-fonts/dm-sans";

import {
  PlayfairDisplay_600SemiBold,
  useFonts as usePlayfair,
} from "@expo-google-fonts/playfair-display";

import { router } from "expo-router";
import React, { useEffect, useState } from "react";

import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/* =========================================================
   COLORS
========================================================= */

const GREEN = "#0B3D2E";
const GREEN_SOFT = "#0B5B46";

const GOLD = "#D7B65B";
const GOLD_LIGHT = "#F3E4B5";

const WHITE = "#FFFFFF";
const MUTED = "#B9CBC3";

const DANGER = "#E1746B";

/* =========================================================
   TYPES
========================================================= */

type PatientDrawerProps = {
  visible: boolean;
  onClose: () => void;
  activeRoute?: string;
};

type MenuItem = {
  icon: any;
  label: string;
  route: string;
};

/* =========================================================
   MENU ITEMS
========================================================= */

const MENU_ITEMS: MenuItem[] = [
  {
    icon: "home-outline",
    label: "Home",
    route: "/(tabs)",
  },
  {
    icon: "leaf-outline",
    label: "Therapies",
    route: "/therapies",
  },
  {
    icon: "sparkles-outline",
    label: "Beauty & Cosmetics",
    route: "/beauty-cosmetics",
  },
  {
    icon: "medical-outline",
    label: "Doctors",
    route: "/doctors",
  },
  {
    icon: "bag-outline",
    label: "Products",
    route: "/(tabs)/products",
  },
  {
    icon: "calendar-outline",
    label: "Consultation",
    route: "/consultation",
  },
  {
    icon: "newspaper-outline",
    label: "Blogs",
    route: "/blogs",
  },
  {
    icon: "information-circle-outline",
    label: "About",
    route: "/about",
  },
  {
    icon: "call-outline",
    label: "Contact",
    route: "/contact",
  },
];

/* =========================================================
   COMPONENT
========================================================= */

export default function PatientDrawer({
  visible,
  onClose,
  activeRoute,
}: PatientDrawerProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
  });

  /* =======================================================
     LOGIN STATUS
  ======================================================= */

  useEffect(() => {
    if (visible) {
      checkLoginStatus();
    }
  }, [visible]);

  async function checkLoginStatus() {
    try {
      const token = await AsyncStorage.getItem("token");
      const loggedIn = await AsyncStorage.getItem("isLoggedIn");

      setIsLoggedIn(
        Boolean(token) && loggedIn === "true"
      );
    } catch (error) {
      console.log(
        "Drawer login status failed:",
        error
      );

      setIsLoggedIn(false);
    }
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function handleLogout() {
    try {
      await AsyncStorage.multiRemove([
        "token",
        "refreshToken",
        "userId",
        "email",
        "role",
        "profileCompleted",
        "isLoggedIn",
        "name",
        "userName",
      ]);

      setIsLoggedIn(false);

      onClose();

      router.replace("/login" as any);
    } catch (error) {
      console.log("Logout failed:", error);
    }
  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function handleNavigate(route: string) {
    onClose();

    setTimeout(() => {
      router.push(route as any);
    }, 100);
  }

  function isActive(route: string) {
    return activeRoute === route;
  }

  if (!dmLoaded || !playfairLoaded) {
    return null;
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        {/* BACKDROP */}

        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />

        {/* DRAWER */}

        <View style={styles.drawer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.drawerScroll
            }
          >
            {/* ===========================================
                BRAND HEADER
            =========================================== */}

            <View style={styles.drawerHeader}>
              <View style={styles.brandWrap}>
                <Text style={styles.drawerBrand}>
                  NeoLife
                </Text>

                <Text style={styles.drawerSub}>
                  Wellness Center
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={GREEN}
                />
              </TouchableOpacity>
            </View>

            {/* SMALL LABEL */}

            <Text style={styles.menuLabel}>
              EXPLORE
            </Text>

            {/* ===========================================
                MENU ITEMS
            =========================================== */}

            <View style={styles.menuContainer}>
              {MENU_ITEMS.map((item) => {
                const active = isActive(
                  item.route
                );

                return (
                  <TouchableOpacity
                    key={item.label}
                    activeOpacity={0.82}
                    style={[
                      styles.drawerItem,
                      active &&
                        styles.drawerItemActive,
                    ]}
                    onPress={() =>
                      handleNavigate(
                        item.route
                      )
                    }
                  >
                    {/* ICON */}

                    <View
                      style={[
                        styles.menuIconWrap,
                        active &&
                          styles.menuIconWrapActive,
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={
                          active
                            ? GREEN
                            : GOLD
                        }
                      />
                    </View>

                    {/* TITLE */}

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.drawerText,
                        active &&
                          styles.drawerTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>

                    {/* ARROW */}

                    <View
                      style={[
                        styles.arrowWrap,
                        active &&
                          styles.arrowWrapActive,
                      ]}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={15}
                        color={
                          active
                            ? GREEN
                            : MUTED
                        }
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ===========================================
                ACCOUNT
            =========================================== */}

            <View style={styles.authDivider} />

            <Text style={styles.menuLabel}>
              ACCOUNT
            </Text>

            {isLoggedIn ? (
              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.authDrawerItem}
                onPress={handleLogout}
              >
                <View
                  style={styles.authIconBox}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={20}
                    color={DANGER}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={
                      styles.logoutDrawerText
                    }
                  >
                    Logout
                  </Text>

                  <Text style={styles.authSubtext}>
                    Sign out of your account
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={MUTED}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.authDrawerItem}
                onPress={() => {
                  onClose();

                  setTimeout(() => {
                    router.push(
                      "/login" as any
                    );
                  }, 100);
                }}
              >
                <View
                  style={styles.authIconBox}
                >
                  <Ionicons
                    name="log-in-outline"
                    size={20}
                    color={GREEN}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={
                      styles.loginDrawerText
                    }
                  >
                    Login
                  </Text>

                  <Text style={styles.authSubtext}>
                    Access your NeoLife account
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={MUTED}
                />
              </TouchableOpacity>
            )}

            {/* BOTTOM TEXT */}

            <View style={styles.bottomBrand}>
              <Ionicons
                name="leaf-outline"
                size={13}
                color={GOLD}
              />

              <Text style={styles.bottomBrandText}>
                Natural care • Better living
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     ROOT
  ======================================================= */

  modalRoot: {
    flex: 1,
    flexDirection: "row",
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(2, 24, 17, 0.60)",
  },

  /* =======================================================
     DRAWER
  ======================================================= */

  drawer: {
    width: "81%",
    maxWidth: 328,
    height: "100%",

    backgroundColor: GREEN,
  },

  drawerScroll: {
    flexGrow: 1,

    paddingTop:
      Platform.OS === "web"
        ? 34
        : 64,

    paddingHorizontal: 17,

    paddingBottom: 26,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  drawerHeader: {
    marginBottom: 20,

    flexDirection: "row",

    alignItems: "flex-start",
  },

  brandWrap: {
    flex: 1,

    paddingLeft: 4,
  },

  drawerBrand: {
    fontFamily:
      "PlayfairDisplay_600SemiBold",

    color: WHITE,

    fontSize: 27,

    lineHeight: 32,

    letterSpacing: -0.3,
  },

  drawerSub: {
    marginTop: 1,

    fontFamily: "DMSans_500Medium",

    color: GOLD_LIGHT,

    fontSize: 10.5,

    letterSpacing: 0.45,
  },

  closeButton: {
    width: 39,
    height: 39,

    borderRadius: 13,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: WHITE,
  },

  /* =======================================================
     SECTION LABEL
  ======================================================= */

  menuLabel: {
    marginLeft: 8,

    marginBottom: 7,

    fontFamily: "DMSans_700Bold",

    color:
      "rgba(244,230,183,0.72)",

    fontSize: 8.5,

    letterSpacing: 1.5,
  },

  /* =======================================================
     MENU
  ======================================================= */

  menuContainer: {
    gap: 3,
  },

  drawerItem: {
    minHeight: 52,

    paddingHorizontal: 8,

    borderRadius: 15,

    flexDirection: "row",

    alignItems: "center",
  },

  drawerItemActive: {
    backgroundColor:
      "rgba(255,255,255,0.96)",
  },

  menuIconWrap: {
    width: 36,
    height: 36,

    marginRight: 8,

    borderRadius: 11,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.055)",
  },

  menuIconWrapActive: {
    backgroundColor: "#EAF4EF",
  },

  drawerText: {
    flex: 1,

    fontFamily:
      "DMSans_600SemiBold",

    color: WHITE,

    fontSize: 13.5,

    lineHeight: 18,
  },

  drawerTextActive: {
    fontFamily:
      "DMSans_700Bold",

    color: GREEN,
  },

  arrowWrap: {
    width: 26,
    height: 26,

    borderRadius: 9,

    alignItems: "center",

    justifyContent: "center",
  },

  arrowWrapActive: {
    backgroundColor: "#EFF6F2",
  },

  /* =======================================================
     AUTH
  ======================================================= */

  authDivider: {
    height: 1,

    marginTop: 17,
    marginBottom: 14,

    backgroundColor:
      "rgba(255,255,255,0.14)",
  },

  authDrawerItem: {
    minHeight: 61,

    paddingHorizontal: 8,
    paddingVertical: 6,

    borderRadius: 16,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor:
      "rgba(255,255,255,0.045)",
  },

  authIconBox: {
    width: 39,
    height: 39,

    marginRight: 10,

    borderRadius: 12,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: WHITE,
  },

  loginDrawerText: {
    fontFamily:
      "DMSans_700Bold",

    color: WHITE,

    fontSize: 13.5,
  },

  logoutDrawerText: {
    fontFamily:
      "DMSans_700Bold",

    color: DANGER,

    fontSize: 13.5,
  },

  authSubtext: {
    marginTop: 2,

    fontFamily:
      "DMSans_400Regular",

    color: MUTED,

    fontSize: 9.5,
  },

  /* =======================================================
     BOTTOM
  ======================================================= */

  bottomBrand: {
    marginTop: "auto",
    paddingTop: 24,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 5,
  },

  bottomBrandText: {
    fontFamily:
      "DMSans_500Medium",

    color:
      "rgba(255,255,255,0.48)",

    fontSize: 9.5,
  },
});