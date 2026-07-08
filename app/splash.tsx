import { router } from "expo-router";
import { useEffect } from "react";
import { View, Text, StyleSheet, Image } from "react-native";

export default function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/onboarding");
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Circular Logo */}
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

    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
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