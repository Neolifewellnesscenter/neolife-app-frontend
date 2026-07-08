import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const orders = [
  {
    id: "NL1001",
    product: "Neodia Kashayam",
    amount: "₹450",
    status: "Delivered",
    date: "12 Jun 2026",
  },
  {
    id: "NL1002",
    product: "Neo9 KH Syrup",
    amount: "₹350",
    status: "Processing",
    date: "18 Jun 2026",
  },
];

export default function MyOrdersScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      {orders.map((order) => (
        <View style={styles.card} key={order.id}>
          <View style={styles.topRow}>
            <Text style={styles.orderId}>Order #{order.id}</Text>
            <Text
              style={[
                styles.status,
                order.status === "Delivered"
                  ? styles.delivered
                  : styles.processing,
              ]}
            >
              {order.status}
            </Text>
          </View>

          <Text style={styles.product}>{order.product}</Text>
          <Text style={styles.date}>Ordered on {order.date}</Text>
          <Text style={styles.amount}>{order.amount}</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.trackBtn}>
              <Text style={styles.trackText}>Track Order</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.invoiceBtn}>
              <Text style={styles.invoiceText}>Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={{ height: 35 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fbfff9",
  },
  header: {
    paddingTop: 55,
    paddingHorizontal: 18,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  headerTitle: {
    color: "#064b16",
    fontSize: 24,
    fontWeight: "bold",
  },
  card: {
    marginHorizontal: 18,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    elevation: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  orderId: {
    color: "#064b16",
    fontWeight: "bold",
    fontSize: 15,
  },
  status: {
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  delivered: {
    backgroundColor: "#e8f5e9",
    color: "#1B5E20",
  },
  processing: {
    backgroundColor: "#fff3e0",
    color: "#ef6c00",
  },
  product: {
    color: "#222",
    fontSize: 17,
    fontWeight: "bold",
  },
  date: {
    color: "#666",
    marginTop: 6,
    fontSize: 13,
  },
  amount: {
    color: "#1B5E20",
    fontSize: 19,
    fontWeight: "bold",
    marginTop: 8,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },
  trackBtn: {
    flex: 1,
    backgroundColor: "#1B5E20",
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: "center",
  },
  trackText: {
    color: "#fff",
    fontWeight: "bold",
  },
  invoiceBtn: {
    flex: 1,
    backgroundColor: "#e8f5e9",
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: "center",
  },
  invoiceText: {
    color: "#1B5E20",
    fontWeight: "bold",
  },
});