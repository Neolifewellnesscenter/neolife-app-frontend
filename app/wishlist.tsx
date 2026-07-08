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
import { useWishlist } from "../context/WishlistContext";

export default function WishlistScreen() {
  const { wishlistItems, removeFromWishlist } = useWishlist();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Wishlist</Text>
      </View>

      {wishlistItems.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="heart-outline" size={65} color="#1B5E20" />
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptyText}>
            Save your favourite Ayurvedic products here.
          </Text>

          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => router.push("/(tabs)/products")}
          >
            <Text style={styles.shopText}>Explore Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        wishlistItems.map((item) => (
          <View style={styles.card} key={item.id}>
            <Image source={item.image} style={styles.image} />

            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.qty}>{item.qty}</Text>
              <Text style={styles.price}>{item.price}</Text>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.detailsBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/product-details",
                      params: { id: item.id.toString() },
                    })
                  }
                >
                  <Text style={styles.detailsText}>View Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeFromWishlist(item.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#c62828" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}

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
  headerTitle: {
    color: "#064b16",
    fontSize: 24,
    fontWeight: "bold",
  },
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
    lineHeight: 21,
  },
  shopBtn: {
    marginTop: 20,
    backgroundColor: "#1B5E20",
    paddingVertical: 13,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  shopText: {
    color: "#fff",
    fontWeight: "bold",
  },
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
  info: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    color: "#064b16",
    fontSize: 16,
    fontWeight: "bold",
  },
  qty: {
    color: "#666",
    marginTop: 4,
  },
  price: {
    color: "#1B5E20",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 5,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  detailsBtn: {
    flex: 1,
    backgroundColor: "#1B5E20",
    paddingVertical: 10,
    borderRadius: 22,
    alignItems: "center",
  },
  detailsText: {
    color: "#fff",
    fontWeight: "bold",
  },
  removeBtn: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "#ffebee",
    justifyContent: "center",
    alignItems: "center",
  },
});