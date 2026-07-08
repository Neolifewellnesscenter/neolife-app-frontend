import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useCart } from "../../context/CartContext";

import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useWishlist } from "../../context/WishlistContext";

const products = [
  {
    id: 1,
    name: "Neodia Kashayam",
    price: "₹450",
    qty: "500 ml",
    category: "Diabetes",
    image: require("../../assets/images/neodia-kashayam.jpg"),
  },
  {
    id: 2,
    name: "Neo9 KH Syrup",
    price: "₹350",
    qty: "300 ml",
    category: "Kidney",
    image: require("../../assets/images/NEO9-KH.jpeg"),
  },
  {
    id: 3,
    name: "Neoliv Liver Tonic",
    price: "₹480",
    qty: "500 ml",
    category: "Liver",
    image: require("../../assets/images/neo-liv.jpg"),
  },
  {
    id: 4,
    name: "NeoPainil Capsule",
    price: "₹320",
    qty: "60 Capsules",
    category: "Pain",
    image: require("../../assets/images/neo-painil.jpg"),
  },
];

const categories = ["All", "Diabetes", "Kidney", "Pain", "Liver", "Hair"];

export default function ProductsScreen() {
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { totalItems } = useCart();
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.category.toLowerCase().includes(searchText.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchText, selectedCategory]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Our Products</Text>

        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => router.push("/wishlist")}>
            <Ionicons name="heart" size={28} color="#E53935" />
          </TouchableOpacity>

          <TouchableOpacity
  style={styles.cartIconBox}
  onPress={() => router.push("/cart")}
>
  <Ionicons name="cart-outline" size={29} color="#1B5E20" />

  {totalItems > 0 && (
    <View style={styles.cartBadge}>
      <Text style={styles.cartBadgeText}>{totalItems}</Text>
    </View>
  )}
</TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color="#777" />
        <TextInput
          placeholder="Search products..."
          placeholderTextColor="#777"
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
        />

        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Ionicons name="close-circle" size={20} color="#777" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 20 }}
      >
        {categories.map((category) => (
          <Category
            key={category}
            text={category}
            active={selectedCategory === category}
            onPress={() => setSelectedCategory(category)}
          />
        ))}
      </ScrollView>

      {filteredProducts.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="search-outline" size={55} color="#1B5E20" />
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptyText}>
            Try searching with another product name or category.
          </Text>
        </View>
      ) : (
        filteredProducts.map((item) => (
          <View style={styles.card} key={item.id}>
            <Image source={item.image} style={styles.image} />

            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.qty}>{item.qty}</Text>
              <Text style={styles.categoryLabel}>{item.category}</Text>
              <Text style={styles.price}>{item.price}</Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.detailsBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/product-details",
                      params: {
                        id: item.id.toString(),
                      },
                    })
                  }
                >
                  <Text style={styles.detailsText}>View Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.wishlistBtn}
                  onPress={() =>
                    toggleWishlist({
                      id: item.id,
                      name: item.name,
                      price: item.price,
                      qty: item.qty,
                      image: item.image,
                    })
                  }
                >
                  <Ionicons
                    name={isWishlisted(item.id) ? "heart" : "heart-outline"}
                    size={21}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function Category({
  text,
  active = false,
  onPress,
}: {
  text: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.category, active && styles.activeCategory]}
    >
      <Text style={[styles.categoryText, active && styles.activeCategoryText]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cartIconBox: {
  position: "relative",
},

cartBadge: {
  position: "absolute",
  top: -8,
  right: -10,
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  backgroundColor: "#E53935",
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 5,
},

cartBadgeText: {
  color: "#fff",
  fontSize: 10,
  fontWeight: "bold",
},
  container: {
    flex: 1,
    backgroundColor: "#f4faf4",
    padding: 18,
  },
  header: {
    marginTop: 45,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1B5E20",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  searchBox: {
    backgroundColor: "#fff",
    height: 50,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    elevation: 3,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#222",
  },
  category: {
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    elevation: 2,
  },
  activeCategory: {
    backgroundColor: "#1B5E20",
  },
  categoryText: {
    fontWeight: "600",
    color: "#1B5E20",
  },
  activeCategoryText: {
    color: "#fff",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    flexDirection: "row",
    padding: 15,
    marginBottom: 18,
    elevation: 4,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 15,
    resizeMode: "contain",
    backgroundColor: "#f7f7f7",
  },
  info: {
    flex: 1,
    marginLeft: 15,
    justifyContent: "center",
  },
  name: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1B5E20",
  },
  qty: {
    color: "#777",
    marginTop: 5,
  },
  categoryLabel: {
    alignSelf: "flex-start",
    backgroundColor: "#e8f5e9",
    color: "#1B5E20",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 6,
  },
  price: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#2e7d32",
    marginTop: 6,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 12,
    alignItems: "center",
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
  wishlistBtn: {
    marginLeft: 10,
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: "#1B5E20",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyBox: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 30,
    alignItems: "center",
    elevation: 4,
  },
  emptyTitle: {
    color: "#064b16",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 12,
  },
  emptyText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
  },
});