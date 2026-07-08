import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function OrderDetailsScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.productTop}>
          <View style={styles.productIcon}>
            <Ionicons name="cube-outline" size={35} color="#1B5E20" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>NeoPainil Capsules</Text>
            <Text style={styles.status}>Delivered</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Detail label="Order ID" value="NL100001" />
        <Detail label="Order Date" value="15 Jul 2026" />
        <Detail label="Quantity" value="1" />
        <Detail label="Total Amount" value="₹199" />
        <Detail label="Payment Method" value="UPI" />
        <Detail label="Delivery Address" value="Home Address, Udupi" />
        <Detail label="Courier Partner" value="Shiprocket" />
        <Detail label="Tracking ID" value="SR123456789" />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order Actions</Text>

        <ActionItem
          icon="document-text-outline"
          title="Download Invoice"
          onPress={() => Alert.alert("Invoice", "Invoice download will be available soon")}
        />

        <ActionItem
          icon="location-outline"
          title="Track Order"
          onPress={() => Alert.alert("Tracking", "Tracking page will open here")}
        />

        <ActionItem
          icon="cart-outline"
          title="Buy Again"
          onPress={() => router.push("/product-details")}
        />

        <ActionItem
          icon="chatbubble-ellipses-outline"
          title="Need Help?"
          onPress={() => router.push("/contact")}
        />
      </View>

      <View style={styles.noteBox}>
        <Ionicons name="information-circle-outline" size={22} color="#1B5E20" />
        <Text style={styles.noteText}>
          Medicines and wellness products are not returnable. For damaged or wrong product delivery, please contact support.
        </Text>
      </View>

      <View style={{ height: 35 }} />
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ActionItem({
  icon,
  title,
  onPress,
}: {
  icon: any;
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color="#1B5E20" />
      </View>

      <Text style={styles.actionTitle}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color="#777" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffaf0",
  },
  header: {
    paddingTop: 55,
    paddingHorizontal: 18,
    paddingBottom: 20,
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#123524",
  },
  card: {
    marginHorizontal: 18,
    marginBottom: 18,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#eadb9b",
  },
  productTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  productIcon: {
    width: 65,
    height: 65,
    borderRadius: 22,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  productName: {
    color: "#123524",
    fontSize: 18,
    fontWeight: "bold",
  },
  status: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#e8f5e9",
    color: "#1B5E20",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 18,
    fontWeight: "bold",
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 16,
  },
  detailRow: {
    marginBottom: 13,
  },
  detailLabel: {
    color: "#777",
    fontSize: 12,
  },
  detailValue: {
    color: "#222",
    fontWeight: "bold",
    marginTop: 3,
    fontSize: 15,
  },
  sectionTitle: {
    color: "#123524",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionTitle: {
    flex: 1,
    color: "#222",
    fontWeight: "bold",
    fontSize: 15,
  },
  noteBox: {
    marginHorizontal: 18,
    backgroundColor: "#fff7df",
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e0c56e",
  },
  noteText: {
    flex: 1,
    color: "#555",
    lineHeight: 20,
    fontSize: 13,
  },
});