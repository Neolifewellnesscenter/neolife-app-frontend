import { router } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";

const slides = [
  {
    title: "Welcome to Neolife",
    subtitle: "Natural healing for a healthier and happier life.",
    icon: "🌿",
  },
  {
    title: "Holistic Wellness",
    subtitle: "Ayurveda, Panchakarma, Yoga, Naturopathy and Acupuncture.",
    icon: "🧘",
  },
  {
    title: "Care at Your Fingertips",
    subtitle: "Book appointments, consult online and buy Ayurvedic products.",
    icon: "📱",
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const item = slides[index];

  const next = () => {
  if (index < slides.length - 1) {
    setIndex(index + 1);
  } else {
    router.replace("/(tabs)");
  }
};

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, index === i && styles.activeDot]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={next}>
        <Text style={styles.buttonText}>
          {index === slides.length - 1 ? "Get Started" : "Next"}
        </Text>
      </TouchableOpacity>

      {index < slides.length - 1 && (
  <TouchableOpacity onPress={() => router.replace("/(tabs)")}>
    <Text style={styles.skip}>Skip</Text>
  </TouchableOpacity>
)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4faf4",
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },
  iconCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#1B5E20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 35,
  },
  icon: {
    fontSize: 70,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#1B5E20",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginTop: 15,
    lineHeight: 24,
  },
  dots: {
    flexDirection: "row",
    marginTop: 35,
    marginBottom: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#c8e6c9",
    marginHorizontal: 5,
  },
  activeDot: {
    width: 24,
    backgroundColor: "#1B5E20",
  },
  button: {
    backgroundColor: "#1B5E20",
    paddingVertical: 14,
    paddingHorizontal: 55,
    borderRadius: 30,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  skip: {
    marginTop: 18,
    color: "#1B5E20",
    fontWeight: "bold",
  },
});