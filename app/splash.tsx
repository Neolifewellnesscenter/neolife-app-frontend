
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect } from "react";
import { View, Text, StyleSheet, Image } from "react-native";

export default function SplashScreen() {
  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        // Keep the splash screen visible briefly.
        await new Promise((resolve) => setTimeout(resolve, 2500));

        const [token, doctorToken, role, onboardingDone] =
          await Promise.all([
            AsyncStorage.getItem("token"),
            AsyncStorage.getItem("doctorToken"),
            AsyncStorage.getItem("role"),
            AsyncStorage.getItem("onboardingCompleted"),
          ]);

        if (!active) return;

        const userRole = (role || "").toUpperCase();

        if (userRole === "DOCTOR" && (doctorToken || token)) {
          router.replace("/doctor/dashboard" as any);
          return;
        }

        if (userRole === "THERAPIST" && token) {
          router.replace("/therapist/dashboard" as any);
          return;
        }

        if (
          (userRole === "USER" || userRole === "PATIENT") &&
          token
        ) {
          router.replace("/(tabs)");
          return;
        }

        if (onboardingDone === "true") {
          router.replace("/(tabs)");
        } else {
          router.replace("/onboarding");
        }
      } catch (error) {
        console.log("Session check failed:", error);

        if (active) {
          router.replace("/(tabs)");
        }
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require("../assets/images/main_logo.jpeg")}
          style={styles.logo}
        />
      </View>

      <Text style={styles.title}>Neolife Wellness Center</Text>

      <Text style={styles.subTitle}>
        Ayurveda • Panchakarma • Yoga • Naturopathy
      </Text>

      <Text style={styles.tagline}>
        Healing Naturally, Living Better
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1B5E20",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
  },
  logo: {
    width: 170,
    height: 170,
    borderRadius: 85,
    resizeMode: "cover",
  },
  title: {
    marginTop: 35,
    fontSize: 30,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  subTitle: {
    marginTop: 12,
    fontSize: 16,
    color: "#E8F5E9",
    textAlign: "center",
    lineHeight: 24,
  },
  tagline: {
    marginTop: 18,
    fontSize: 15,
    color: "#C8E6C9",
    fontStyle: "italic",
    textAlign: "center",
  },
});
