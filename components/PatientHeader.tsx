import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts as useDMSans,
} from "@expo-google-fonts/dm-sans";

import {
  PlayfairDisplay_700Bold,
  useFonts as usePlayfair,
} from "@expo-google-fonts/playfair-display";

import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";

import React, {
  useCallback,
  useState,
} from "react";

import {
  Image,
  Platform,
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
const DEEP_GREEN = "#083629";
const MINT = "#EEF7F1";
const WHITE = "#FFFFFF";
const MUTED = "#758178";
const BORDER = "#E7ECE9";

/* =========================================================
   TYPES
========================================================= */

type PatientHeaderProps = {
  onMenuPress: () => void;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function PatientHeader({
  onMenuPress,
}: PatientHeaderProps) {
  const [profileLetter, setProfileLetter] =
    useState("");
  const [userRole, setUserRole] =
    useState("");
  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  const { width } = useWindowDimensions();

  /* =======================================================
     RESPONSIVE BREAKPOINTS
  ======================================================= */

  const isVerySmallPhone = width <= 340;
  const isSmallPhone =
    width > 340 && width < 375;
  const isNormalPhone =
    width >= 375 && width < 430;
  const isLargePhone = width >= 430;

  /* =======================================================
     RESPONSIVE SIZES
  ======================================================= */

  const sideButtonSize = isVerySmallPhone
    ? 38
    : isSmallPhone
      ? 40
      : isLargePhone
        ? 46
        : 44;

  const sideButtonRadius = isVerySmallPhone
    ? 12
    : isSmallPhone
      ? 13
      : 14;

  const logoSize = isVerySmallPhone
    ? 36
    : isSmallPhone
      ? 39
      : isLargePhone
        ? 46
        : 44;

  const brandNameSize = isVerySmallPhone
    ? 16
    : isSmallPhone
      ? 18
      : isLargePhone
        ? 21
        : 20;

  const brandSubSize = isVerySmallPhone
    ? 8
    : isSmallPhone
      ? 9
      : isLargePhone
        ? 10.5
        : 10;

  const horizontalPadding =
    isVerySmallPhone
      ? 8
      : isSmallPhone
        ? 10
        : isLargePhone
          ? 16
          : 14;

  const brandLeftMargin =
    isVerySmallPhone
      ? 6
      : isSmallPhone
        ? 8
        : 12;

  const brandRightMargin =
    isVerySmallPhone
      ? 5
      : isSmallPhone
        ? 7
        : 10;

  const brandTextMargin =
    isVerySmallPhone
      ? 6
      : isSmallPhone
        ? 8
        : 10;

  /* =======================================================
     FONTS
  ======================================================= */

  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_700Bold,
  });

  /* =======================================================
     PROFILE
  ======================================================= */

  useFocusEffect(
    useCallback(() => {
      loadProfileLetter();
    }, [])
  );

  async function loadProfileLetter() {
    try {
      const [
        token,
        accessToken,
        doctorToken,
        role,
        savedName,
        userName,
        doctorName,
        savedEmail,
      ] = await Promise.all([
        AsyncStorage.getItem("token"),
        AsyncStorage.getItem("accessToken"),
        AsyncStorage.getItem("doctorToken"),
        AsyncStorage.getItem("role"),
        AsyncStorage.getItem("name"),
        AsyncStorage.getItem("userName"),
        AsyncStorage.getItem("doctorName"),
        AsyncStorage.getItem("email"),
      ]);

      const normalizedRole = (role || "")
        .replace(/^ROLE_/i, "")
        .trim()
        .toUpperCase();

      const activeToken =
        normalizedRole === "DOCTOR"
          ? doctorToken || token || accessToken
          : token || accessToken || doctorToken;

      if (!activeToken) {
        setIsLoggedIn(false);
        setUserRole("");
        setProfileLetter("");
        return;
      }

      setIsLoggedIn(true);
      setUserRole(normalizedRole);

      const displayValue =
        (normalizedRole === "DOCTOR" ? doctorName : "")?.trim() ||
        savedName?.trim() ||
        userName?.trim() ||
        savedEmail?.trim() ||
        (normalizedRole === "DOCTOR" ? "Doctor" : "");

      setProfileLetter(displayValue.charAt(0).toUpperCase());
    } catch (error) {
      console.log("Header session check failed:", error);
      setIsLoggedIn(false);
      setUserRole("");
      setProfileLetter("");
    }
  }

  function handleProfilePress() {
    if (!isLoggedIn) {
      router.push("/login" as any);
      return;
    }

    switch (userRole) {
      case "DOCTOR":
        router.push("/doctor/profile" as any);
        return;

      case "USER":
      case "PATIENT":
        router.push("/profile" as any);
        return;

      case "THERAPIST":
        router.push("/therapist/profile" as any);
        return;

      default:
        router.push("/login" as any);
    }
  }

  /* =======================================================
     FONT LOADING PLACEHOLDER
  ======================================================= */

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View
        style={[
          styles.headerPlaceholder,
          {
            minHeight:
              Platform.OS === "web"
                ? 70
                : isVerySmallPhone ||
                    isSmallPhone
                  ? 86
                  : 92,
          },
        ]}
      />
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <View
      style={[
        styles.header,
        {
          minHeight:
            Platform.OS === "web"
              ? 70
              : isVerySmallPhone ||
                  isSmallPhone
                ? 86
                : 92,

          paddingTop:
            Platform.OS === "web"
              ? 8
              : isVerySmallPhone
                ? 34
                : isSmallPhone
                  ? 35
                  : 39,

          paddingHorizontal:
            horizontalPadding,
        },
      ]}
    >
      {/* ================= MENU ================= */}

      <TouchableOpacity
        style={[
          styles.menuButton,
          {
            width: sideButtonSize,
            height: sideButtonSize,
            borderRadius:
              sideButtonRadius,
          },
        ]}
        activeOpacity={0.7}
        onPress={onMenuPress}
      >
        <Ionicons
          name="menu-outline"
          size={
            isVerySmallPhone
              ? 22
              : isSmallPhone
                ? 24
                : 26
          }
          color={GREEN}
        />
      </TouchableOpacity>

      {/* ================= BRAND ================= */}

      <TouchableOpacity
        style={[
          styles.brandWrap,
          {
            marginLeft:
              brandLeftMargin,

            marginRight:
              brandRightMargin,
          },
        ]}
        activeOpacity={0.82}
        onPress={() =>
          router.replace(
            "/(tabs)" as any
          )
        }
      >
        {/* LOGO */}

        <Image
          source={require(
            "../assets/images/main_logo.jpeg"
          )}
          style={[
            styles.logo,
            {
              width: logoSize,
              height: logoSize,
              borderRadius:
                logoSize / 2,
            },
          ]}
        />

        {/* BRAND TEXT */}

        <View
          style={[
            styles.brandTextWrap,
            {
              marginLeft:
                brandTextMargin,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            style={[
              styles.brandName,
              {
                fontSize:
                  brandNameSize,

                lineHeight:
                  brandNameSize + 3,
              },
            ]}
          >
            Neolife
          </Text>

          <View
            style={
              styles.brandBottomRow
            }
          >
            {!isVerySmallPhone && (
              <View
                style={[
                  styles.brandLine,
                  {
                    width:
                      isSmallPhone
                        ? 10
                        : 14,

                    marginRight:
                      isSmallPhone
                        ? 4
                        : 6,
                  },
                ]}
              />
            )}

            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.68}
              style={[
                styles.brandSub,
                {
                  fontSize:
                    brandSubSize,

                  lineHeight:
                    brandSubSize + 3,

                  letterSpacing:
                    isVerySmallPhone
                      ? 0.2
                      : isSmallPhone
                        ? 0.4
                        : 0.65,
                },
              ]}
            >
              Wellness Center
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* ================= PROFILE ================= */}

      <TouchableOpacity
        style={[
          styles.profileButton,
          {
            width: sideButtonSize,
            height: sideButtonSize,
            borderRadius:
              sideButtonRadius,
          },
        ]}
        activeOpacity={0.76}
        onPress={
          handleProfilePress
        }
      >
        {profileLetter ? (
          <Text
            style={[
              styles.profileLetter,
              {
                fontSize:
                  isVerySmallPhone
                    ? 14
                    : isSmallPhone
                      ? 15
                      : 16,
              },
            ]}
          >
            {profileLetter}
          </Text>
        ) : (
          <Ionicons
            name="person-outline"
            size={
              isVerySmallPhone
                ? 16
                : isSmallPhone
                  ? 18
                  : 19
            }
            color={WHITE}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    /* =========================
       PLACEHOLDER
    ========================= */

    headerPlaceholder: {
      width: "100%",
      backgroundColor: WHITE,
    },

    /* =========================
       HEADER
    ========================= */

    header: {
      width: "100%",

      paddingBottom: 9,

      flexDirection: "row",
      alignItems: "center",

      backgroundColor: WHITE,

      borderBottomWidth: 1,
      borderBottomColor: BORDER,

      shadowColor: "#0B3D2E",

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.035,
      shadowRadius: 5,

      elevation: 2,

      zIndex: 100,
    },

    /* =========================
       MENU
    ========================= */

    menuButton: {
      flexShrink: 0,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor: MINT,
    },

    /* =========================
       BRAND
    ========================= */

    brandWrap: {
      flex: 1,
      minWidth: 0,

      flexDirection: "row",
      alignItems: "center",
    },

    logo: {
      flexShrink: 0,

      borderWidth: 1,
      borderColor: "#E0E8E3",

      backgroundColor: "#F7FAF8",
    },

    brandTextWrap: {
      flex: 1,
      minWidth: 0,

      justifyContent: "center",
    },

    brandName: {
      flexShrink: 1,

      fontFamily:
        "PlayfairDisplay_700Bold",

      color: DEEP_GREEN,

      letterSpacing: 0.1,
    },

    brandBottomRow: {
      marginTop: 2,

      minWidth: 0,

      flexDirection: "row",
      alignItems: "center",
    },

    brandLine: {
      height: 1,

      flexShrink: 0,

      backgroundColor:
        "#CBB06B",
    },

    brandSub: {
      flexShrink: 1,

      fontFamily:
        "DMSans_500Medium",

      color: MUTED,
    },

    /* =========================
       PROFILE
    ========================= */

    profileButton: {
      flexShrink: 0,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        DEEP_GREEN,

      shadowColor:
        DEEP_GREEN,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      shadowOpacity: 0.1,
      shadowRadius: 5,

      elevation: 2,
    },

    profileLetter: {
      fontFamily:
        "PlayfairDisplay_700Bold",

      color: WHITE,

      lineHeight: 20,
    },
  });