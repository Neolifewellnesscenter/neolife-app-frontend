import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useCart } from "../context/CartContext";

export default function CartScreen() {
  const { cartItems, increaseQty, decreaseQty, removeFromCart, subtotal } =
    useCart();

  const delivery = subtotal > 500 || subtotal === 0 ? 0 : 50;
  const total = subtotal + delivery;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Cart</Text>
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="cart-outline" size={65} color="#1B5E20" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>
            Add Ayurvedic products to your cart.
          </Text>

          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => router.push("/(tabs)/products")}
          >
            <Text style={styles.shopText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {cartItems.map((item) => (
            <View style={styles.card} key={item.id}>
              <Image source={item.image} style={styles.image} />

              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.qty}>{item.qty}</Text>
                <Text style={styles.price}>₹{item.price}</Text>

                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => decreaseQty(item.id)}
                  >
                    <Ionicons name="remove" size={18} color="#1B5E20" />
                  </TouchableOpacity>

                  <Text style={styles.qtyCount}>{item.quantity}</Text>

                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => increaseQty(item.id)}
                  >
                    <Ionicons name="add" size={18} color="#1B5E20" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => removeFromCart(item.id)}
                  >
                    <Ionicons name="trash-outline" size={19} color="#c62828" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Order Summary</Text>

            <Row label="Subtotal" value={`₹${subtotal}`} />
            <Row
              label="Delivery"
              value={delivery === 0 ? "Free" : `₹${delivery}`}
            />
            <View style={styles.line} />
            <Row label="Total" value={`₹${total}`} bold />
          </View>

          <TouchableOpacity
  style={styles.checkoutBtn}
  onPress={() => router.push("/checkout")}
>
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      <View style={{ height: 35 }} />
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
      <Text style={[styles.rowLabel, bold && styles.boldText]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.boldText]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fbfff9" },
  header: {
    paddingTop: 55,
    paddingHorizontal: 18,
    paddingBottom: 15,
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
  headerTitle: { color: "#064b16", fontSize: 24, fontWeight: "bold" },
  emptyBox: {
    margin: 18,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 35,
    alignItems: "center",
    elevation: 4,
  },
  emptyTitle: {
    color: "#064b16",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 15,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
  },
  shopBtn: {
    marginTop: 20,
    backgroundColor: "#1B5E20",
    paddingVertical: 13,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  shopText: { color: "#fff", fontWeight: "bold" },
  card: {
    marginHorizontal: 18,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    elevation: 4,
  },
  image: {
    width: 95,
    height: 95,
    borderRadius: 16,
    resizeMode: "contain",
    backgroundColor: "#f5f5f5",
  },
  info: { flex: 1, marginLeft: 14 },
  name: { color: "#064b16", fontSize: 16, fontWeight: "bold" },
  qty: { color: "#666", marginTop: 4 },
  price: {
    color: "#1B5E20",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 5,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyCount: { fontSize: 16, fontWeight: "bold", color: "#222" },
  deleteBtn: {
    marginLeft: "auto",
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "#ffebee",
    justifyContent: "center",
    alignItems: "center",
  },
  summary: {
    margin: 18,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 20,
    elevation: 4,
  },
  summaryTitle: {
    color: "#064b16",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
  },
  rowLabel: { color: "#555", fontSize: 15 },
  rowValue: { color: "#222", fontSize: 15, fontWeight: "600" },
  line: { height: 1, backgroundColor: "#e0e0e0", marginVertical: 8 },
  boldText: { color: "#064b16", fontSize: 18, fontWeight: "bold" },
  checkoutBtn: {
    marginHorizontal: 18,
    backgroundColor: "#1B5E20",
    paddingVertical: 16,
    borderRadius: 28,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 5,
  },
  checkoutText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});