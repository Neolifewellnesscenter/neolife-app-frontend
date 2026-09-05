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
import React, { useCallback, useState } from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const GREEN = "#0B3D2E";
const DEEP_GREEN = "#083629";
const MINT = "#EEF7F1";
const WHITE = "#FFFFFF";
const MUTED = "#758178";
const BORDER = "#E7ECE9";

type PatientHeaderProps = {
  onMenuPress: () => void;
};

export default function PatientHeader({
  onMenuPress,
}: PatientHeaderProps) {
  const [profileLetter, setProfileLetter] = useState("");

  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_700Bold,
  });

  useFocusEffect(
    useCallback(() => {
      loadProfileLetter();
    }, [])
  );

  async function loadProfileLetter() {
    try {
      const token =
        (await AsyncStorage.getItem("token")) ||
        (await AsyncStorage.getItem("accessToken")) ||
        "";

      if (!token) {
        setProfileLetter("");
        return;
      }

      const savedName =
        (await AsyncStorage.getItem("name")) ||
        (await AsyncStorage.getItem("userName")) ||
        "";

      const savedEmail =
        (await AsyncStorage.getItem("email")) || "";

      const value =
        savedName.trim() ||
        savedEmail.trim();

      setProfileLetter(
        value.charAt(0).toUpperCase()
      );
    } catch {
      setProfileLetter("");
    }
  }

  function handleProfilePress() {
    if (profileLetter) {
      router.push("/profile" as any);
    } else {
      router.push("/login" as any);
    }
  }

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.headerPlaceholder} />
    );
  }

  return (
    <View style={styles.header}>
      {/* MENU */}
      <TouchableOpacity
        style={styles.menuButton}
        activeOpacity={0.7}
        onPress={onMenuPress}
      >
        <Ionicons
          name="menu-outline"
          size={26}
          color={GREEN}
        />
      </TouchableOpacity>

      {/* BRAND */}
      <TouchableOpacity
        style={styles.brandWrap}
        activeOpacity={0.82}
        onPress={() =>
          router.replace("/(tabs)" as any)
        }
      >
        <Image
          source={require("../assets/images/main_logo.jpeg")}
          style={styles.logo}
        />

        <View style={styles.brandTextWrap}>
          <Text style={styles.brandName}>
            NeoLife
          </Text>

          <View style={styles.brandBottomRow}>
            <View style={styles.brandLine} />

            <Text style={styles.brandSub}>
              Wellness Center
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* PROFILE */}
      <TouchableOpacity
        style={styles.profileButton}
        activeOpacity={0.76}
        onPress={handleProfilePress}
      >
        {profileLetter ? (
          <Text style={styles.profileLetter}>
            {profileLetter}
          </Text>
        ) : (
          <Ionicons
            name="person-outline"
            size={19}
            color={WHITE}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerPlaceholder: {
    height:
      Platform.OS === "web" ? 70 : 92,
    backgroundColor: WHITE,
  },

  header: {
    minHeight:
      Platform.OS === "web" ? 70 : 92,

    paddingTop:
      Platform.OS === "web" ? 8 : 39,

    paddingBottom: 9,
    paddingHorizontal: 14,

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

  menuButton: {
    width: 44,
    height: 44,

    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: MINT,
  },

  brandWrap: {
    flex: 1,

    marginLeft: 12,
    marginRight: 10,

    flexDirection: "row",
    alignItems: "center",
  },

  logo: {
    width: 44,
    height: 44,

    borderRadius: 22,

    borderWidth: 1,
    borderColor: "#E0E8E3",

    backgroundColor: "#F7FAF8",
  },

  brandTextWrap: {
    flex: 1,

    marginLeft: 10,

    justifyContent: "center",
  },

  brandName: {
    fontFamily: "PlayfairDisplay_700Bold",

    color: DEEP_GREEN,

    fontSize: 20,
    lineHeight: 22,

    letterSpacing: 0.1,
  },

  brandBottomRow: {
    marginTop: 2,

    flexDirection: "row",
    alignItems: "center",
  },

  brandLine: {
    width: 14,
    height: 1,

    marginRight: 6,

    backgroundColor: "#CBB06B",
  },

  brandSub: {
    fontFamily: "DMSans_500Medium",

    color: MUTED,

    fontSize: 10,
    lineHeight: 13,

    letterSpacing: 0.65,
  },

  profileButton: {
    width: 44,
    height: 44,

    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: DEEP_GREEN,

    shadowColor: DEEP_GREEN,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,

    elevation: 2,
  },

  profileLetter: {
    fontFamily: "PlayfairDisplay_700Bold",

    color: WHITE,

    fontSize: 16,
    lineHeight: 20,
  },
});