import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function OrderSuccessScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Ionicons name="checkmark" size={70} color="#fff" />
      </View>

      <Text style={styles.title}>Order Placed Successfully</Text>

      <Text style={styles.text}>
        Thank you for shopping with Neolife Wellness Center. Your order has been
        received successfully.
      </Text>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => router.replace("/(tabs)/products")}
      >
        <Text style={styles.primaryText}>Continue Shopping</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => router.replace("/(tabs)")}
      >
        <Text style={styles.secondaryText}>Go to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fbfff9",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },
  iconBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1B5E20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
  },
  title: {
    color: "#064b16",
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center",
  },
  text: {
    color: "#555",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 30,
  },
  primaryBtn: {
    backgroundColor: "#1B5E20",
    paddingVertical: 15,
    borderRadius: 28,
    width: "100%",
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryBtn: {
    marginTop: 14,
    backgroundColor: "#e8f5e9",
    paddingVertical: 15,
    borderRadius: 28,
    width: "100%",
    alignItems: "center",
  },
  secondaryText: {
    color: "#1B5E20",
    fontSize: 16,
    fontWeight: "bold",
  },
});