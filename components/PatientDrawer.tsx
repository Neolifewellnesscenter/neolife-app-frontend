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

import React, {
  useEffect,
  useState,
} from "react";

import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

/* =========================================================
   COLORS
========================================================= */

const GREEN = "#0B3D2E";
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
    icon: "pricetag-outline",
    label: "Offers",
    route: "/offers",
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
    icon:
      "information-circle-outline",
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
  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  const { width, height } =
    useWindowDimensions();

  /* =======================================================
     RESPONSIVE BREAKPOINTS
  ======================================================= */

  const isVerySmallPhone =
    width <= 340;

  const isSmallPhone =
    width > 340 && width < 375;

  const isLargePhone =
    width >= 430;

  const isShortPhone =
    height < 700;

  const isVeryShortPhone =
    height < 620;

  /* =======================================================
     RESPONSIVE VALUES
  ======================================================= */

  const drawerWidth = Math.min(
    width *
      (isVerySmallPhone
        ? 0.9
        : isSmallPhone
          ? 0.86
          : 0.82),
    isLargePhone ? 350 : 340
  );

  const drawerHorizontalPadding =
    isVerySmallPhone
      ? 11
      : isSmallPhone
        ? 14
        : 17;

  const drawerTopPadding =
    Platform.OS === "web"
      ? 30
      : isVeryShortPhone
        ? 40
        : isShortPhone
          ? 48
          : 64;

  const drawerBottomPadding =
    isVeryShortPhone
      ? 14
      : isShortPhone
        ? 18
        : 26;

  const itemHeight =
    isVeryShortPhone
      ? 44
      : isShortPhone
        ? 47
        : 52;

  const iconSize =
    isVerySmallPhone
      ? 32
      : isShortPhone
        ? 34
        : 36;

  const menuFontSize =
    isVerySmallPhone
      ? 12
      : isSmallPhone
        ? 12.5
        : 13.5;

  /* =======================================================
     FONTS
  ======================================================= */

  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  const [playfairLoaded] =
    usePlayfair({
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
      const token =
        await AsyncStorage.getItem(
          "token"
        );

      const loggedIn =
        await AsyncStorage.getItem(
          "isLoggedIn"
        );

      setIsLoggedIn(
        Boolean(token) &&
          loggedIn === "true"
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

      router.replace(
        "/login" as any
      );
    } catch (error) {
      console.log(
        "Logout failed:",
        error
      );
    }
  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function handleNavigate(
    route: string
  ) {
    onClose();

    setTimeout(() => {
      router.push(route as any);
    }, 100);
  }

  function isActive(
    route: string
  ) {
    return activeRoute === route;
  }

  /* =======================================================
     FONT LOADING
  ======================================================= */

  if (
    !dmLoaded ||
    !playfairLoaded
  ) {
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
        {/* ================= BACKDROP ================= */}

        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />

        {/* ================= DRAWER ================= */}

        <View
          style={[
            styles.drawer,
            {
              width: drawerWidth,
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.drawerScroll,
              {
                paddingTop:
                  drawerTopPadding,

                paddingHorizontal:
                  drawerHorizontalPadding,

                paddingBottom:
                  drawerBottomPadding,
              },
            ]}
          >
            {/* =========================================
                BRAND HEADER
            ========================================= */}

            <View
              style={[
                styles.drawerHeader,
                {
                  marginBottom:
                    isShortPhone
                      ? 14
                      : 20,
                },
              ]}
            >
              <View
                style={
                  styles.brandWrap
                }
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={[
                    styles.drawerBrand,
                    {
                      fontSize:
                        isVerySmallPhone
                          ? 23
                          : isSmallPhone
                            ? 25
                            : 27,

                      lineHeight:
                        isVerySmallPhone
                          ? 28
                          : isSmallPhone
                            ? 30
                            : 32,
                    },
                  ]}
                >
                  NeoLife
                </Text>

                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  style={[
                    styles.drawerSub,
                    {
                      fontSize:
                        isVerySmallPhone
                          ? 9
                          : 10.5,
                    },
                  ]}
                >
                  Wellness Center
                </Text>
              </View>

              {/* CLOSE */}

              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.closeButton,
                  {
                    width:
                      isVerySmallPhone
                        ? 35
                        : 39,

                    height:
                      isVerySmallPhone
                        ? 35
                        : 39,

                    borderRadius:
                      isVerySmallPhone
                        ? 11
                        : 13,
                  },
                ]}
                onPress={onClose}
              >
                <Ionicons
                  name="close"
                  size={
                    isVerySmallPhone
                      ? 20
                      : 22
                  }
                  color={GREEN}
                />
              </TouchableOpacity>
            </View>

            {/* ================= EXPLORE ================= */}

            <Text
              style={[
                styles.menuLabel,
                {
                  marginBottom:
                    isShortPhone
                      ? 5
                      : 7,
                },
              ]}
            >
              EXPLORE
            </Text>

            {/* ================= MENU ================= */}

            <View
              style={[
                styles.menuContainer,
                {
                  gap:
                    isVeryShortPhone
                      ? 1
                      : 3,
                },
              ]}
            >
              {MENU_ITEMS.map(
                (item) => {
                  const active =
                    isActive(
                      item.route
                    );

                  return (
                    <TouchableOpacity
                      key={
                        item.label
                      }
                      activeOpacity={
                        0.82
                      }
                      style={[
                        styles.drawerItem,

                        {
                          minHeight:
                            itemHeight,

                          borderRadius:
                            isVerySmallPhone
                              ? 13
                              : 15,
                        },

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

                          {
                            width:
                              iconSize,

                            height:
                              iconSize,

                            borderRadius:
                              isVerySmallPhone
                                ? 10
                                : 11,

                            marginRight:
                              isVerySmallPhone
                                ? 6
                                : 8,
                          },

                          active &&
                            styles.menuIconWrapActive,
                        ]}
                      >
                        <Ionicons
                          name={
                            item.icon
                          }
                          size={
                            isVerySmallPhone
                              ? 18
                              : 20
                          }
                          color={
                            active
                              ? GREEN
                              : GOLD
                          }
                        />
                      </View>

                      {/* TEXT */}

                      <Text
                        numberOfLines={
                          1
                        }
                        adjustsFontSizeToFit
                        minimumFontScale={
                          0.8
                        }
                        style={[
                          styles.drawerText,

                          {
                            fontSize:
                              menuFontSize,

                            lineHeight:
                              menuFontSize +
                              5,
                          },

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
                          size={
                            isVerySmallPhone
                              ? 14
                              : 15
                          }
                          color={
                            active
                              ? GREEN
                              : MUTED
                          }
                        />
                      </View>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>

            {/* ================= ACCOUNT ================= */}

            <View
              style={[
                styles.authDivider,
                {
                  marginTop:
                    isShortPhone
                      ? 11
                      : 17,

                  marginBottom:
                    isShortPhone
                      ? 10
                      : 14,
                },
              ]}
            />

            <Text
              style={styles.menuLabel}
            >
              ACCOUNT
            </Text>

            {/* LOGGED IN */}

            {isLoggedIn ? (
              <TouchableOpacity
                activeOpacity={0.82}
                style={[
                  styles.authDrawerItem,
                  {
                    minHeight:
                      isShortPhone
                        ? 54
                        : 61,
                  },
                ]}
                onPress={handleLogout}
              >
                <View
                  style={[
                    styles.authIconBox,
                    {
                      width:
                        isVerySmallPhone
                          ? 35
                          : 39,

                      height:
                        isVerySmallPhone
                          ? 35
                          : 39,

                      marginRight:
                        isVerySmallPhone
                          ? 7
                          : 10,
                    },
                  ]}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={
                      isVerySmallPhone
                        ? 18
                        : 20
                    }
                    color={DANGER}
                  />
                </View>

                <View
                  style={
                    styles.authTextWrap
                  }
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.logoutDrawerText,
                      {
                        fontSize:
                          isVerySmallPhone
                            ? 12.5
                            : 13.5,
                      },
                    ]}
                  >
                    Logout
                  </Text>

                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={
                      0.8
                    }
                    style={
                      styles.authSubtext
                    }
                  >
                    Sign out of your
                    account
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={MUTED}
                />
              </TouchableOpacity>
            ) : (
              /* NOT LOGGED IN */

              <TouchableOpacity
                activeOpacity={0.82}
                style={[
                  styles.authDrawerItem,
                  {
                    minHeight:
                      isShortPhone
                        ? 54
                        : 61,
                  },
                ]}
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
                  style={[
                    styles.authIconBox,
                    {
                      width:
                        isVerySmallPhone
                          ? 35
                          : 39,

                      height:
                        isVerySmallPhone
                          ? 35
                          : 39,

                      marginRight:
                        isVerySmallPhone
                          ? 7
                          : 10,
                    },
                  ]}
                >
                  <Ionicons
                    name="log-in-outline"
                    size={
                      isVerySmallPhone
                        ? 18
                        : 20
                    }
                    color={GREEN}
                  />
                </View>

                <View
                  style={
                    styles.authTextWrap
                  }
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.loginDrawerText,
                      {
                        fontSize:
                          isVerySmallPhone
                            ? 12.5
                            : 13.5,
                      },
                    ]}
                  >
                    Login
                  </Text>

                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={
                      0.78
                    }
                    style={
                      styles.authSubtext
                    }
                  >
                    Access your NeoLife
                    account
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={MUTED}
                />
              </TouchableOpacity>
            )}

            {/* ================= BOTTOM ================= */}

            <View
              style={[
                styles.bottomBrand,
                {
                  paddingTop:
                    isShortPhone
                      ? 16
                      : 24,
                },
              ]}
            >
              <Ionicons
                name="leaf-outline"
                size={13}
                color={GOLD}
              />

              <Text
                style={
                  styles.bottomBrandText
                }
              >
                Natural care • Better
                living
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

const styles =
  StyleSheet.create({
    /* =========================
       ROOT
    ========================= */

    modalRoot: {
      flex: 1,
      flexDirection: "row",
    },

    backdrop: {
      ...StyleSheet.absoluteFillObject,

      backgroundColor:
        "rgba(2, 24, 17, 0.60)",
    },

    /* =========================
       DRAWER
    ========================= */

    drawer: {
      height: "100%",

      backgroundColor: GREEN,

      shadowColor: "#000",

      shadowOffset: {
        width: 4,
        height: 0,
      },

      shadowOpacity: 0.18,
      shadowRadius: 10,

      elevation: 12,
    },

    drawerScroll: {
      flexGrow: 1,
    },

    /* =========================
       HEADER
    ========================= */

    drawerHeader: {
      flexDirection: "row",

      alignItems: "flex-start",
    },

    brandWrap: {
      flex: 1,
      minWidth: 0,

      paddingLeft: 4,
    },

    drawerBrand: {
      flexShrink: 1,

      fontFamily:
        "PlayfairDisplay_600SemiBold",

      color: WHITE,

      letterSpacing: -0.3,
    },

    drawerSub: {
      marginTop: 1,

      flexShrink: 1,

      fontFamily:
        "DMSans_500Medium",

      color: GOLD_LIGHT,

      letterSpacing: 0.45,
    },

    closeButton: {
      flexShrink: 0,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor: WHITE,
    },

    /* =========================
       SECTION LABEL
    ========================= */

    menuLabel: {
      marginLeft: 8,

      fontFamily:
        "DMSans_700Bold",

      color:
        "rgba(244,230,183,0.72)",

      fontSize: 8.5,

      letterSpacing: 1.5,
    },

    /* =========================
       MENU
    ========================= */

    menuContainer: {},

    drawerItem: {
      paddingHorizontal: 8,

      flexDirection: "row",
      alignItems: "center",
    },

    drawerItemActive: {
      backgroundColor:
        "rgba(255,255,255,0.96)",
    },

    menuIconWrap: {
      flexShrink: 0,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        "rgba(255,255,255,0.055)",
    },

    menuIconWrapActive: {
      backgroundColor:
        "#EAF4EF",
    },

    drawerText: {
      flex: 1,
      minWidth: 0,

      fontFamily:
        "DMSans_600SemiBold",

      color: WHITE,
    },

    drawerTextActive: {
      fontFamily:
        "DMSans_700Bold",

      color: GREEN,
    },

    arrowWrap: {
      width: 26,
      height: 26,

      flexShrink: 0,

      borderRadius: 9,

      alignItems: "center",
      justifyContent: "center",
    },

    arrowWrapActive: {
      backgroundColor:
        "#EFF6F2",
    },

    /* =========================
       ACCOUNT
    ========================= */

    authDivider: {
      height: 1,

      backgroundColor:
        "rgba(255,255,255,0.14)",
    },

    authDrawerItem: {
      paddingHorizontal: 8,
      paddingVertical: 6,

      borderRadius: 16,

      flexDirection: "row",
      alignItems: "center",

      backgroundColor:
        "rgba(255,255,255,0.045)",
    },

    authIconBox: {
      flexShrink: 0,

      borderRadius: 12,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor: WHITE,
    },

    authTextWrap: {
      flex: 1,
      minWidth: 0,
    },

    loginDrawerText: {
      fontFamily:
        "DMSans_700Bold",

      color: WHITE,
    },

    logoutDrawerText: {
      fontFamily:
        "DMSans_700Bold",

      color: DANGER,
    },

    authSubtext: {
      marginTop: 2,

      flexShrink: 1,

      fontFamily:
        "DMSans_400Regular",

      color: MUTED,

      fontSize: 9.5,
    },

    /* =========================
       BOTTOM
    ========================= */

    bottomBrand: {
      marginTop: "auto",

      flexDirection: "row",
      flexWrap: "wrap",

      alignItems: "center",
      justifyContent: "center",

      gap: 5,
    },

    bottomBrandText: {
      flexShrink: 1,

      fontFamily:
        "DMSans_500Medium",

      color:
        "rgba(255,255,255,0.48)",

      fontSize: 9.5,

      textAlign: "center",
    },
  });