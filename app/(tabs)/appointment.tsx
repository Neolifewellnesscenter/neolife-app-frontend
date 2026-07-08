import { Ionicons } from "@expo/vector-icons";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PAPPYJOE_URL = "YOUR_PAPPYJOE_BOOKING_LINK";

export default function AppointmentScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Ionicons name="calendar-outline" size={45} color="#1B5E20" />
        </View>

        <Text style={styles.title}>Book Appointment</Text>

        <Text style={styles.text}>
          Schedule your visit with Neolife Wellness Center through our official
          appointment booking system.
        </Text>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => Linking.openURL("https://cloud.pappyjoe.com/widget/index/UjhcZVAxCz0DYgNjAzUIYw%3D%3D")}
        >
          <Text style={styles.btnText}>Book Now</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.note}>
          You will be redirected to PappyJoe for appointment booking.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fbfff9",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    elevation: 6,
  },
  iconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    color: "#064b16",
    fontSize: 26,
    fontWeight: "bold",
  },
  text: {
    color: "#555",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 12,
  },
  btn: {
    marginTop: 24,
    backgroundColor: "#1B5E20",
    paddingVertical: 15,
    paddingHorizontal: 34,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  note: {
    color: "#777",
    fontSize: 12,
    textAlign: "center",
    marginTop: 14,
  },
});