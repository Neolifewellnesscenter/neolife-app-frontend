import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCart } from "../context/CartContext";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function CheckoutScreen() {
    const { clearCart } = useCart();
  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#1B5E20"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      {/* Customer Details */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Customer Details
        </Text>

        <TextInput
          placeholder="Full Name"
          style={styles.input}
        />

        <TextInput
          placeholder="Phone Number"
          keyboardType="phone-pad"
          style={styles.input}
        />

        <TextInput
          placeholder="Email Address"
          keyboardType="email-address"
          style={styles.input}
        />
      </View>

      {/* Delivery Address */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Delivery Address
        </Text>

        <TextInput
          placeholder="House / Flat No."
          style={styles.input}
        />

        <TextInput
          placeholder="Street / Area"
          style={styles.input}
        />

        <TextInput
          placeholder="City"
          style={styles.input}
        />

        <TextInput
          placeholder="State"
          style={styles.input}
        />

        <TextInput
          placeholder="PIN Code"
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      {/* Payment */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Payment Method
        </Text>

        <TouchableOpacity style={styles.paymentBox}>
          <Ionicons
            name="cash-outline"
            size={24}
            color="#1B5E20"
          />
          <Text style={styles.paymentText}>
            Cash on Delivery
          </Text>

          <Ionicons
            name="checkmark-circle"
            size={24}
            color="#2e7d32"
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.paymentBox}>
          <Ionicons
            name="card-outline"
            size={24}
            color="#1B5E20"
          />

          <Text style={styles.paymentText}>
            Razorpay (Coming Soon)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Order Summary */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Order Summary
        </Text>

        <Row label="Subtotal" value="₹800" />
        <Row label="Delivery" value="Free" />
        <Row label="Discount" value="-₹0" />

        <View style={styles.line} />

        <Row label="Total" value="₹800" bold />
      </View>

      {/* Button */}

      <TouchableOpacity
  style={styles.placeBtn}
  onPress={() => {
    clearCart();
    router.replace("/order-success");
  }}
>

        <Text style={styles.placeText}>
          Place Order
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Row({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.rowText,
          bold && styles.bold,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.rowText,
          bold && styles.bold,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4faf4",
  },

  header: {
    marginTop: 55,
    marginHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },

  backBtn: {
    width: 42,
    height: 42,
    backgroundColor: "#fff",
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1B5E20",
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 18,
    marginBottom: 18,
    borderRadius: 22,
    padding: 18,
    elevation: 4,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B5E20",
    marginBottom: 15,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 14,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },

  paymentBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },

  paymentText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },

  rowText: {
    fontSize: 15,
    color: "#444",
  },

  bold: {
    fontWeight: "bold",
    color: "#1B5E20",
    fontSize: 17,
  },

  line: {
    height: 1,
    backgroundColor: "#ddd",
    marginVertical: 10,
  },

  placeBtn: {
    backgroundColor: "#1B5E20",
    marginHorizontal: 18,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    elevation: 5,
  },

  placeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 17,
  },
});