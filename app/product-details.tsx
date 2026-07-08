import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCart } from "../context/CartContext";
import { useState } from "react";
import ImageViewing from "react-native-image-viewing";
import {
  FlatList,
  Dimensions,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const products = [
  {
    id: 1,
    name: "Neodia Kashayam",
    price: "₹450",
    qty: "500 ml",
    images: [
  require("../assets/images/neodia-kashayam.jpg"),
  require("../assets/images/neodia.jpg"),
  require("../assets/images/neodia-1.jpg"),
  require("../assets/images/neodia-2.jpg"),
],
    desc: "Ayurvedic wellness formulation that supports healthy blood sugar management.",
    indication: "For diabetes wellness, tiredness, indigestion and frequent urination.",
    reviews: [
  {
    id: 1,
    name: "Raghavendra Bhat",
    rating: 5,
    comment: "Very good Ayurvedic product and helpful for wellness support.",
  },
  {
    id: 2,
    name: "Saheem Azmeen",
    rating: 5,
    comment: "Good product and nice quality.",
  },
],
  },
  {
    id: 2,
    name: "Neo9 KH Syrup",
    price: "₹350",
    qty: "300 ml",
    images: [
  require("../assets/images/NEO9-KH.jpeg"),
  require("../assets/images/NEO9-KH-1.jpg"),
  require("../assets/images/NEO9-KH-2.jpg"),
  
],
    desc: "Supports kidney wellness, urination and helps reduce edema naturally.",
    indication: "For kidney wellness, creatinine support, urination and edema.",
  reviews: [
  {
    id: 1,
    name: "Raghavendra Bhat",
    rating: 5,
    comment: "Very good Ayurvedic product and helpful for wellness support.",
  },
  {
    id: 2,
    name: "Saheem Azmeen",
    rating: 5,
    comment: "Good product and nice quality.",
  },
],
  },
  {
    id: 3,
    name: "Neoliv Liver Tonic",
    price: "₹480",
    qty: "500 ml",
    images: [
  require("../assets/images/neo-liv.jpg"),
  require("../assets/images/neo-liv-1.jpg"),
  require("../assets/images/neo-liv-2.jpg"),
],
    desc: "Ayurvedic liver tonic that supports liver health, digestion and appetite.",
    indication: "For liver wellness, digestion support, appetite and general metabolism.",
  reviews: [
  {
    id: 1,
    name: "Raghavendra Bhat",
    rating: 5,
    comment: "Very good Ayurvedic product and helpful for wellness support.",
  },
  {
    id: 2,
    name: "Saheem Azmeen",
    rating: 5,
    comment: "Good product and nice quality.",
  },
],
  },
  {
    id: 4,
    name: "NeoPainil Capsule",
    price: "₹320",
    qty: "60 Capsules",
    images: [
  require("../assets/images/neo-painil.jpg"),
  require("../assets/images/neo-painil-1.jpg"),
  require("../assets/images/neo-painil-2.jpg"),
],
    desc: "Supports joint comfort, mobility and helps manage body stiffness naturally.",
    indication: "For joint stiffness, muscular pain, inflammation and body pain.",
  reviews: [
  {
    id: 1,
    name: "Raghavendra Bhat",
    rating: 5,
    comment: "Very good Ayurvedic product and helpful for wellness support.",
  },
  {
    id: 2,
    name: "Saheem Azmeen",
    rating: 5,
    comment: "Good product and nice quality.",
  },
],
  },
];

export default function ProductDetailsScreen() {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  
 const { addToCart } = useCart();
const { id } = useLocalSearchParams();

const product = products.find(
  (item) => item.id.toString() === id?.toString()
);

if (!product) {
  return (
    <View style={styles.container}>
      <Text>Product not found</Text>
    </View>
  );
}
const zoomImages = product.images.map((img, index) => {
  const uri = Image.resolveAssetSource(img).uri;

  return {
    uri: `${uri}?zoom=${product.id}-${index}`,
  };
});
const shareProduct = async () => {
  try {
    await Share.share({
      message: `${product.name}

${product.desc}

Price: ${product.price}
Quantity: ${product.qty}

Order from Neolife Wellness Center, Udupi.

Contact: +91 9481489866
Website: https://neolifeayush.com`,
    });
  } catch (error) {
    console.log(error);
  }
};



  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
  <Text style={styles.headerTitle}>Product Details</Text>


    
</View>

        <TouchableOpacity style={styles.wishBtn}>
          <Ionicons name="heart-outline" size={24} color="#1B5E20" />
        </TouchableOpacity>
      </View>

      <View style={styles.imageCard}>

  <FlatList
    horizontal
    pagingEnabled
    showsHorizontalScrollIndicator={false}
    data={product.images}
    keyExtractor={(_, index) => `product-image-${product.id}-${index}`}
    onMomentumScrollEnd={(event) => {
      const index = Math.round(
        event.nativeEvent.contentOffset.x /
        event.nativeEvent.layoutMeasurement.width
      );
      setActiveImage(index);
    }}
    renderItem={({ item }) => (
  <TouchableOpacity onPress={() => setViewerVisible(true)}>
    <Image source={item} style={styles.productImage} />
  </TouchableOpacity>
)}
  />

  <View style={styles.dotContainer}>
  {product.images.map((_, index) => (
    <View
      key={`dot-${product.id}-${index}`}
      style={[
        styles.dot,
        activeImage === index && styles.activeDot,
      ]}
    />
  ))}
</View>

</View>

      <View style={styles.detailsCard}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.qty}>{product.qty}</Text>
        <Text style={styles.price}>{product.price}</Text>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color="#f2a900" />
          <Ionicons name="star" size={16} color="#f2a900" />
          <Ionicons name="star" size={16} color="#f2a900" />
          <Ionicons name="star" size={16} color="#f2a900" />
          <Ionicons name="star-half" size={16} color="#f2a900" />
          <Text style={styles.ratingText}>4.8</Text>
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.desc}>{product.desc}</Text>

        <Text style={styles.sectionTitle}>Indication</Text>
        <Text style={styles.desc}>{product.indication}</Text>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#1B5E20" />
          <Text style={styles.infoText}>
            Ayurvedic product. Use as directed by physician.
          </Text>
        </View>

        <View style={styles.reviewsSection}>
  <View style={styles.reviewHeader}>
    <Text style={styles.sectionTitle}>Customer Reviews</Text>
    <Text style={styles.reviewCount}>
      {product.reviews.length} Reviews
    </Text>
  </View>

  <View style={styles.overallRating}>
    <Text style={styles.ratingBig}>4.8</Text>

    <View>
      <View style={styles.ratingStars}>
        <Ionicons name="star" size={17} color="#f2a900" />
        <Ionicons name="star" size={17} color="#f2a900" />
        <Ionicons name="star" size={17} color="#f2a900" />
        <Ionicons name="star" size={17} color="#f2a900" />
        <Ionicons name="star-half" size={17} color="#f2a900" />
      </View>
      <Text style={styles.ratingSmall}>Based on customer feedback</Text>
    </View>
  </View>

  {product.reviews.map((review) => (
    <View style={styles.reviewCard} key={review.id}>
      <View style={styles.reviewTop}>
        <View style={styles.reviewAvatar}>
          <Text style={styles.reviewAvatarText}>
            {review.name.charAt(0)}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.reviewName}>{review.name}</Text>

          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= review.rating ? "star" : "star-outline"}
                size={14}
                color="#f2a900"
              />
            ))}
          </View>
        </View>
      </View>

      <Text style={styles.reviewComment}>{review.comment}</Text>
    </View>
  ))}

  <TouchableOpacity style={styles.writeReviewBtn}>
    <Ionicons name="create-outline" size={18} color="#1B5E20" />
    <Text style={styles.writeReviewText}>Write a Review</Text>
  </TouchableOpacity>
</View>
      </View>

     <View style={styles.actionRow}>
  <TouchableOpacity
    style={styles.cartBtn}
    onPress={() => {
      addToCart({
        id: product.id,
        name: product.name,
        price: Number(product.price.replace("₹", "")),
        qty: product.qty,
        image: product.images[0],
      });

      router.push("/cart");
    }}
  >
    <Ionicons name="cart-outline" size={20} color="#1B5E20" />
    <Text style={styles.cartText}>Add to Cart</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.shareBtn} onPress={shareProduct}>
    <Ionicons name="share-social-outline" size={20} color="#fff" />
    <Text style={styles.shareText}>Share</Text>
  </TouchableOpacity>
</View>
  

     <ImageViewing
  images={zoomImages}
  imageIndex={activeImage}
  visible={viewerVisible}
  onRequestClose={() => setViewerVisible(false)}
/>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  reviewsSection: {
  marginTop: 20,
},

reviewHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

reviewCount: {
  color: "#777",
  fontSize: 13,
  fontWeight: "600",
},

overallRating: {
  backgroundColor: "#e8f5e9",
  borderRadius: 18,
  padding: 15,
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
  marginTop: 10,
  marginBottom: 15,
},

ratingBig: {
  color: "#1B5E20",
  fontSize: 32,
  fontWeight: "bold",
},

ratingStars: {
  flexDirection: "row",
  alignItems: "center",
  gap: 2,
},

ratingSmall: {
  color: "#555",
  fontSize: 12,
  marginTop: 4,
},

reviewCard: {
  backgroundColor: "#f7faf7",
  borderRadius: 16,
  padding: 14,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: "#e2eee2",
},

reviewTop: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
},

reviewAvatar: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "#1B5E20",
  justifyContent: "center",
  alignItems: "center",
},

reviewAvatarText: {
  color: "#fff",
  fontWeight: "bold",
  fontSize: 16,
},

reviewName: {
  color: "#064b16",
  fontSize: 14,
  fontWeight: "bold",
},

reviewComment: {
  color: "#555",
  fontSize: 13,
  lineHeight: 20,
  marginTop: 10,
},

writeReviewBtn: {
  marginTop: 5,
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "#1B5E20",
  borderRadius: 22,
  paddingVertical: 12,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 7,
},

writeReviewText: {
  color: "#1B5E20",
  fontWeight: "bold",
},
  dotContainer: {
  flexDirection: "row",
  justifyContent: "center",
  marginTop: 15,
},

dot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: "#cfcfcf",
  marginHorizontal: 5,
},

activeDot: {
  width: 24,
  backgroundColor: "#1B5E20",
},
  shareBtn: {
  flex: 1,
  backgroundColor: "#1B5E20",
  paddingVertical: 15,
  borderRadius: 25,
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "row",
  gap: 7,
},

shareText: {
  color: "#fff",
  fontWeight: "bold",
  fontSize: 15,
},
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
    justifyContent: "space-between",
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
  wishBtn: {
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
    fontSize: 22,
    fontWeight: "bold",
  },
  imageCard: {
    margin: 18,
    backgroundColor: "#fff",
    borderRadius: 26,
    padding: 18,
    elevation: 5,
    alignItems: "center",
  },
  productImage: {
  width: Dimensions.get("window").width - 72,
  height: 260,
  resizeMode: "contain",
  borderRadius: 20,
},
  detailsCard: {
    marginHorizontal: 18,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    elevation: 5,
  },
  name: {
    color: "#064b16",
    fontSize: 24,
    fontWeight: "bold",
  },
  qty: {
    color: "#666",
    fontSize: 14,
    marginTop: 6,
  },
  price: {
    color: "#1B5E20",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 10,
  },
  ratingText: {
    color: "#555",
    fontWeight: "bold",
    marginLeft: 6,
  },
  sectionTitle: {
    color: "#064b16",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
  },
  desc: {
    color: "#555",
    fontSize: 14,
    lineHeight: 22,
  },
  infoBox: {
    marginTop: 20,
    backgroundColor: "#e8f5e9",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    color: "#1B5E20",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    margin: 18,
  },
  cartBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#1B5E20",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  cartText: {
    color: "#1B5E20",
    fontWeight: "bold",
    fontSize: 15,
  },
  buyBtn: {
    flex: 1,
    backgroundColor: "#1B5E20",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  buyText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});