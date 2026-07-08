import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

const products = [
  {
    name: "NeoPainil Capsule",
    desc: "Supports joint comfort and mobility.",
    qty: "60 Capsules",
    image: require("../../assets/images/neo-painil.jpg"),
  },
  {
    name: "Neodia Kashayam",
    desc: "Supports healthy blood sugar management.",
    qty: "500 ml",
    image: require("../../assets/images/neodia-kashayam.jpg"),
  },
  {
    name: "Neo9 KH Syrup",
    desc: "Supports urinary and kidney wellness.",
    qty: "300 ml",
    image: require("../../assets/images/NEO9-KH.jpeg"),
  },
];

const therapies = [
  { icon: "leaf-outline", title: "Ayurveda" },
  { icon: "pulse-outline", title: "Acupuncture" },
  { icon: "flower-outline", title: "Naturopathy" },
  { icon: "body-outline", title: "Yoga" },
  { icon: "medkit-outline", title: "Panchakarma" },
  { icon: "sparkles-outline", title: "Beauty & Cosmetics" },
];

const doctors = [
  {
    name: "Dr. N. G. Muraleedhara",
    degree: "BAMS",
    spec: "Ayurveda & Panchakarma Consultant",
    image: require("../../assets/images/doctors/Dr-murali.png"),
  },
  {
    name: "Dr. Aditi",
    degree: "BNYS",
    spec: "Yoga & Naturopathy Consultant",
    image: require("../../assets/images/doctors/Dr-adithi.png"),
  },
  {
    name: "Dr. Sibagath Ulla Sharieff R",
    degree: "BAMS, MD(Ayu)",
    spec: "Ayurveda Consultant",
    image: require("../../assets/images/doctors/Dr-sibgath.jpg"),
  },
  {
    name: "Dr. Vijay B. Negalur",
    degree: "MD(Ayu), PhD",
    spec: "Lifestyle Wellness Expert",
    image: require("../../assets/images/doctors/Dr-vijay.png"),
  },
  {
    name: "Dr. Shalmali B B",
    degree: "BAMS, MD(Ayu)",
    spec: "Rasa Shastra & Bhaishajya Kalpana",
    image: require("../../assets/images/doctors/Dr-shalmali.png"),
  },
  {
    name: "Dr. G Rajesh Rao",
    degree: "BAMS",
    spec: "Vidwan",
    image: require("../../assets/images/doctors/Dr-rajesh.png"),
  },
];

const heroSlides = [
  {
    image: require("../../assets/images/neolife.png"),
    badge: "🌿 Neolife Wellness Center",
    title: "Ayurveda • Panchakarma • Yoga",
    text: "Natural healing care for body, mind and lifestyle wellness.",
  },
  {
    image: require("../../assets/images/ayurvedapancha.png"),
    badge: "Traditional Healing",
    title: "Panchakarma & Ayurvedic Therapies",
    text: "Personalized detox and rejuvenation treatments.",
  },
  {
    image: require("../../assets/images/yoga.jpg"),
    badge: "Mind & Body Wellness",
    title: "Yoga • Acupuncture • Naturopathy",
    text: "Holistic care for stress relief and better living.",
  },
];

const offerSlides = [
  {
    label: "🎉 Festival Offer",
    title: "Diwali Wellness Offer",
    text: "Flat 30% OFF on selected Ayurvedic products.",
    code: "DIWALI30",
    discount: "30%",
  },
  {
    label: "🌿 Wellness Offer",
    title: "Ayurvedic Product Offer",
    text: "Special discount on Neoliv, Neo9 KH and Kashayam.",
    code: "NEOLIFE20",
    discount: "20%",
  },
];



export default function HomeScreen() {
  const therapyListRef = useRef<FlatList>(null);
const therapyScrollX = useRef(0);

const movingTherapies = [...therapies, ...therapies, ...therapies];

useEffect(() => {
  const interval = setInterval(() => {
    therapyScrollX.current += 1;

    therapyListRef.current?.scrollToOffset({
      offset: therapyScrollX.current,
      animated: false,
    });

    if (therapyScrollX.current > therapies.length * 150) {
      therapyScrollX.current = 0;
      therapyListRef.current?.scrollToOffset({
        offset: 0,
        animated: false,
      });
    }
  }, 25);

  return () => clearInterval(interval);
}, []);
  const sliderRef = useRef<FlatList>(null);
const [activeSlide, setActiveSlide] = useState(0);
const { width } = Dimensions.get("window");

useEffect(() => {
  const interval = setInterval(() => {
    const nextIndex =
      activeSlide === heroSlides.length - 1 ? 0 : activeSlide + 1;

    sliderRef.current?.scrollToIndex({
      index: nextIndex,
      animated: true,
    });

    setActiveSlide(nextIndex);
  }, 3000);

  return () => clearInterval(interval);
}, [activeSlide]);

  const [menuVisible, setMenuVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
    return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            paddingBottom: 35,
          }}
        >
          <View style={styles.topHeader}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => setMenuVisible(true)}
            >
              <Ionicons name="menu" size={28} color="#1B5E20" />
            </TouchableOpacity>

            <View style={styles.brandBox}>
              <Image
                source={require("../../assets/images/main_logo.jpeg")}
                style={styles.headerLogo}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.brand}>Neolife Wellness Center</Text>
                <Text style={styles.subBrand}>Ayush Digital Care</Text>
              </View>
            </View>

          <TouchableOpacity
  style={styles.circleBtn}
  onPress={() => router.push("/notifications")}
>
  <Ionicons
    name="notifications"
    size={24}
    color="#D4AF37"
  />

  <View style={styles.badge}>
    <Text style={styles.badgeText}>3</Text>
  </View>
</TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color="#777" />
            <Text style={styles.searchText}>
              Search products, therapies, doctors...
            </Text>
          </View>

          <FlatList
            data={offerSlides}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.title}
            renderItem={({ item }) => (
              <View style={styles.sliderPage}>
                <View style={styles.offer}>
                  <View style={styles.offerLeft}>
                    <Text style={styles.offerLabel}>{item.label}</Text>
                    <Text style={styles.offerTitle}>{item.title}</Text>
                    <Text style={styles.offerText}>{item.text}</Text>
                    <Text style={styles.code}>Use Code: {item.code}</Text>

                    <TouchableOpacity style={styles.shopBtn}>
                      <Text style={styles.shopBtnText}>Shop Now ›</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{item.discount}</Text>
                    <Text style={styles.discountSmall}>OFF</Text>
                  </View>
                </View>
              </View>
            )}
          />

          <FlatList
  ref={sliderRef}
  data={heroSlides}
  horizontal
  pagingEnabled
  showsHorizontalScrollIndicator={false}
  keyExtractor={(item) => item.title}
  onMomentumScrollEnd={(event) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / width
    );
    setActiveSlide(index);
  }}
  renderItem={({ item }) => (
    <View style={styles.sliderPage}>
      <ImageBackground
        source={item.image}
        style={styles.hero}
        imageStyle={styles.heroImage}
      >
        <View style={styles.overlay}>
          <Text style={styles.heroBadge}>{item.badge}</Text>

          <Text style={styles.heroTitle}>
            {item.title}
          </Text>

          <Text style={styles.heroText}>
            {item.text}
          </Text>

         
        </View>
      </ImageBackground>
    </View>
  )}
/>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Our Featured Products</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/products")}>
              <Text style={styles.viewAll}>View All ›</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontal}
          >
            {products.map((item) => (
              <View key={item.name} style={styles.websiteProductCard}>
                <Image source={item.image} style={styles.websiteProductImage} />
                <Text style={styles.websiteProductName}>{item.name}</Text>
                <Text style={styles.websiteProductDesc}>{item.desc}</Text>
                <Text style={styles.websiteProductQty}>{item.qty}</Text>
              </View>
            ))}
          </ScrollView>

          

         <Section title="Our Wellness Therapies" showViewAll={false} />

<FlatList
  ref={therapyListRef}
  data={movingTherapies}
  horizontal
  showsHorizontalScrollIndicator={false}
  keyExtractor={(item, index) => `${item.title}-${index}`}
  scrollEnabled={false}
  contentContainerStyle={styles.therapyMarquee}
  renderItem={({ item }) => (
    <View style={styles.therapyBrandCard}>
      <Ionicons name={item.icon as any} size={26} color="#1B5E20" />
      <Text style={styles.therapyBrandText}>{item.title}</Text>
    </View>
  )}
/>

          <Section title="Our Doctors ✚" showViewAll={false} />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontal}
          >
            {doctors.map((doctor) => (
              <View style={styles.doctorCard} key={doctor.name}>
                <Image source={doctor.image} style={styles.doctorPhoto} />
                <Text style={styles.doctorName}>{doctor.name}</Text>
                <Text style={styles.degree}>{doctor.degree}</Text>
                <Text style={styles.spec}>{doctor.spec}</Text>
                <Text style={styles.rating}>⭐⭐⭐⭐⭐ 4.9</Text>

                <TouchableOpacity style={styles.bookDoctorBtn}>
                  <Text style={styles.bookDoctorText}>View Profile</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <View style={styles.cta}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Need Health Guidance?</Text>
              <Text style={styles.ctaText}>
                Talk to our wellness experts today.
              </Text>
            </View>

            <TouchableOpacity style={styles.contactBtn}>
              <Text style={styles.contactText}>Contact Us</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.drawerOverlay}>
  <View style={styles.drawer}>

    <TouchableOpacity
      style={styles.closeIcon}
      onPress={() => setMenuVisible(false)}
    >
      <Ionicons name="close" size={30} color="#1B5E20" />
    </TouchableOpacity>

    <View style={styles.drawerHeader}>
      <Image
        source={require("../../assets/images/main_logo.jpeg")}
        style={styles.drawerLogo}
      />
      <Text style={styles.drawerTitle}>Neolife Wellness Center</Text>
      <Text style={styles.drawerSubtitle}>Your Health, Our Priority</Text>
    </View>

    <DrawerItem
      icon="home-outline"
      title="Home"
      onPress={() => {
        setMenuVisible(false);
        router.replace("/(tabs)");
      }}
    />

    <DrawerItem
      icon="information-circle-outline"
      title="About Us"
      onPress={() => {
        setMenuVisible(false);
        router.push("/about");
      }}
    />

    <DrawerItem
      icon="medkit-outline"
      title="Our Doctors"
      onPress={() => {
        setMenuVisible(false);
        router.push("/doctors");
      }}
    />

    <DrawerItem
      icon="leaf-outline"
      title="Therapies"
      onPress={() => {
        setMenuVisible(false);
        router.push("/(tabs)/therapies");
      }}
    />

    <DrawerItem
      icon="bag-outline"
      title="Products"
      onPress={() => {
        setMenuVisible(false);
        router.push("/(tabs)/products");
      }}
    />

    <DrawerItem
      icon="calendar-outline"
      title="Book Appointment"
      onPress={() => {
        setMenuVisible(false);
        router.push("/(tabs)/appointment");
      }}
    />

    <DrawerItem
      icon="call-outline"
      title="Contact Us"
      onPress={() => {
        setMenuVisible(false);
        router.push("/contact");
      }}
    />

    <DrawerItem
      icon="logo-whatsapp"
      title="WhatsApp Support"
      onPress={() => {
        setMenuVisible(false);
        Linking.openURL("https://wa.me/919481489866");
      }}
    />

    <DrawerItem
      icon="settings-outline"
      title="Settings"
      onPress={() => {
        setMenuVisible(false);
        router.push("/settings");
      }}
    />

           
  </View>
</View>
  </Modal>
</>
);
}

function Section({
  title,
  showViewAll = true,
}: {
  title: string;
  showViewAll?: boolean;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {showViewAll && (
        <Text style={styles.viewAll}>View All ›</Text>
      )}
    </View>
  );
}

function DrawerItem({
  icon,
  title,
  onPress,
}: {
  icon: any;
  title: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.drawerItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color="#1B5E20" />
      <Text style={styles.drawerItemText}>{title}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  therapyMarquee: {
  paddingLeft: 20,
  paddingRight: 20,
},

therapyBrandCard: {
  width: 140,
  height: 82,
  backgroundColor: "#ffffff",
  borderRadius: 18,
  marginRight: 16,
  justifyContent: "center",
  alignItems: "center",
  elevation: 4,
},

therapyBrandText: {
  color: "#064b16",
  fontSize: 14,
  fontWeight: "bold",
  marginTop: 8,
  textAlign: "center",
},
  badge: {
  position: "absolute",
  top: -2,
  right: -2,
  width: 18,
  height: 18,
  borderRadius: 9,
  backgroundColor: "#E53935",
  justifyContent: "center",
  alignItems: "center",
},

badgeText: {
  color: "#fff",
  fontSize: 10,
  fontWeight: "bold",
},
  container: {
    flex: 1,
    backgroundColor: "#fbfff9",
  },
  sliderPage: {
    width,
  },

  topHeader: {
    paddingTop: 55,
    paddingHorizontal: 18,
    paddingBottom: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  brandBox: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginHorizontal: 10,
    gap: 8,
  },
  headerLogo: {
    width: 55,
    height: 55,
    borderRadius: 28,
  },
  brand: {
    color: "#064b16",
    fontWeight: "bold",
    fontSize: 17,
  },
  subBrand: {
    color: "#555",
    fontSize: 12,
    marginTop: 2,
  },

  searchBox: {
    marginHorizontal: 18,
    marginBottom: 15,
    backgroundColor: "#ffffff",
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    gap: 10,
  },
  searchText: {
    color: "#777",
    fontSize: 14,
  },

  offer: {
    marginHorizontal: 18,
    backgroundColor: "#fff1c7",
    borderRadius: 20,
    padding: 17,
    flexDirection: "row",
    justifyContent: "space-between",
    elevation: 5,
  },
  offerLeft: {
    width: "68%",
  },
  offerLabel: {
    backgroundColor: "#c0392b",
    color: "#fff",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    fontWeight: "bold",
    fontSize: 12,
  },
  offerTitle: {
    color: "#5c240c",
    fontSize: 23,
    fontWeight: "bold",
    marginTop: 12,
  },
  offerText: {
    color: "#5c240c",
    marginTop: 6,
    lineHeight: 19,
  },
  code: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#c0392b",
    padding: 8,
    borderRadius: 10,
    color: "#9b2c18",
    fontWeight: "bold",
    alignSelf: "flex-start",
  },
  shopBtn: {
    marginTop: 12,
    backgroundColor: "#1B5E20",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  shopBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  discountBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#b32113",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
  },
  discountText: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "bold",
  },
  discountSmall: {
    color: "#fff",
    fontWeight: "bold",
  },

  hero: {
    marginHorizontal: 18,
    marginTop: 18,
    borderRadius: 22,
    minHeight: 230,
    overflow: "hidden",
    elevation: 6,
  },
  heroImage: {
    borderRadius: 22,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 22,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.20)",
    color: "#fff",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontWeight: "bold",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "bold",
    marginTop: 14,
  },
  heroText: {
    color: "#e8f5e9",
    fontSize: 15,
    marginTop: 9,
    lineHeight: 22,
  },
  heroButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    flexWrap: "wrap",
  },
  bookBtn: {
    backgroundColor: "#2eaf43",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  bookText: {
    color: "#fff",
    fontWeight: "bold",
  },
  exploreBtn: {
    borderWidth: 1,
    borderColor: "#fff",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  exploreText: {
    color: "#fff",
    fontWeight: "bold",
  },

  sectionRow: {
    marginTop: 24,
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#064b16",
    fontSize: 21,
    fontWeight: "bold",
  },
  viewAll: {
    color: "#0b7a24",
    fontWeight: "bold",
  },
  horizontal: {
    paddingLeft: 20,
    paddingRight: 10,
  },

  websiteProductCard: {
    width: 220,
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 16,
    marginRight: 18,
    elevation: 5,
    alignItems: "center",
  },
  websiteProductImage: {
    width: "100%",
    height: 145,
    borderRadius: 18,
    resizeMode: "cover",
    marginBottom: 14,
  },
  websiteProductName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B5E20",
    textAlign: "center",
  },
  websiteProductDesc: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 21,
  },
  websiteProductQty: {
    color: "#333",
    fontSize: 14,
    marginTop: 14,
  },

  therapyItem: {
    width: 105,
    alignItems: "center",
    marginRight: 18,
  },
  therapyIconBox: {
    width: 88,
    height: 74,
    borderRadius: 18,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  therapyIcon: {
    fontSize: 33,
  },
  therapyTitle: {
    textAlign: "center",
    fontWeight: "bold",
    marginTop: 9,
    color: "#111",
    fontSize: 13,
  },

  doctorCard: {
    width: width * 0.5,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginRight: 14,
    elevation: 4,
  },
  doctorPhoto: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignSelf: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#1B5E20",
  },
  doctorName: {
    color: "#111",
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
  degree: {
    color: "#1B5E20",
    fontWeight: "bold",
    marginTop: 5,
    fontSize: 12,
    textAlign: "center",
  },
  spec: {
    color: "#555",
    marginTop: 5,
    fontSize: 12,
    textAlign: "center",
  },
  rating: {
    marginTop: 8,
    color: "#f2a900",
    fontSize: 12,
    textAlign: "center",
  },
  bookDoctorBtn: {
    marginTop: 12,
    backgroundColor: "#1B5E20",
    paddingVertical: 10,
    borderRadius: 20,
  },
  bookDoctorText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },

  cta: {
    margin: 20,
    backgroundColor: "#0b7a24",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ctaTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 17,
  },
  ctaText: {
    color: "#e8f5e9",
    marginTop: 5,
  },
  contactBtn: {
    backgroundColor: "#fff",
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: 25,
  },
  contactText: {
    color: "#1B5E20",
    fontWeight: "bold",
  },

  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  drawer: {
    width: "80%",
    height: "100%",
    backgroundColor: "#ffffff",
    paddingTop: 45,
    paddingHorizontal: 18,
  },
  drawerHeader: {
    backgroundColor: "#1B5E20",
    borderRadius: 22,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  drawerLogo: {
    width: 85,
    height: 85,
    borderRadius: 43,
    marginBottom: 10,
  },
  drawerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  drawerSubtitle: {
    color: "#dcedc8",
    marginTop: 5,
    fontSize: 13,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eef3ee",
  },
  drawerItemText: {
    marginLeft: 14,
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  closeBtn: {
    marginTop: 25,
    backgroundColor: "#1B5E20",
    padding: 13,
    borderRadius: 25,
    alignItems: "center",
  },
  closeText: {
    color: "#fff",
    fontWeight: "bold",
  },
  closeIcon: {
  position: "absolute",
  top: 45,
  right: 15,
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "#ffffff",
  justifyContent: "center",
  alignItems: "center",
  elevation: 8,      // Android
  zIndex: 999,       // Keep above all views
  shadowColor: "#000",
  shadowOpacity: 0.25,
  shadowRadius: 6,
  shadowOffset: {
    width: 0,
    height: 3,
  },
},
});
