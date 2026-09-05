import { Ionicons } from "@expo/vector-icons";

import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts as useDMSans,
} from "@expo-google-fonts/dm-sans";

import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  useFonts as usePlayfair,
} from "@expo-google-fonts/playfair-display";

import { router } from "expo-router";
import PatientDrawer from "../../components/PatientDrawer";
import PatientHeader from "../../components/PatientHeader";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

/* =========================================================
   COLORS
========================================================= */

const GREEN = "#0B3D2E";
const GREEN_2 = "#14533D";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_DARK = "#A98632";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#75837B";
const BORDER = "#E6EBE7";

/* =========================================================
   SHOP WEBSITE
========================================================= */

const SHOP_URL = "https://www.neolifeayush.com/";

/* =========================================================
   STATIC PRODUCTS
   Change image filenames based on your assets/images folder
========================================================= */

const PRODUCTS = [
  {
    id: 1,
    name: "Neodia Kashayam",
    category: "Ayurvedic Wellness",
    quantity: "500 ml",
    description:
      "A carefully prepared NeoLife Ayurvedic formulation for everyday wellness support.",
    image: require("../../assets/images/neodia-kashayam.jpg"),
  },

  {
    id: 2,
    name: "Neo9 KH Syrup",
    category: "Ayurvedic Syrup",
    quantity: "300 ml",
    description:
      "A herbal wellness formulation prepared with carefully selected Ayurvedic ingredients.",
    image: require("../../assets/images/NEO9-KH.jpeg"),
  },

  {
    id: 3,
    name: "Neoliv Liver Tonic",
    category: "Liver Wellness",
    quantity: "500 ml",
    description:
      "Ayurvedic wellness support formulated for liver care and digestive wellbeing.",
    image: require("../../assets/images/neo-liv.jpg"),
  },

  {
    id: 4,
    name: "NeoPainil Capsule",
    category: "Joint Wellness",
    quantity: "60 Capsules",
    description:
      "Natural Ayurvedic wellness support for joint comfort, mobility and an active lifestyle.",
    image: require("../../assets/images/neo-painil.jpg"),
  },

  {
    id: 5,
    name: "NeoLife Special Hair Oil",
    category: "Hair Care",
    quantity: "",
    description:
      "Traditional herbal hair care formulated to support healthy-looking hair and scalp wellness.",
    image: require("../../assets/images/Products/neolife_special_hairoil.webp"),
  },

  {
    id: 6,
    name: "Vatahara Kashaya",
    category: "Ayurvedic Wellness",
    quantity: "",
    description:
      "Traditional NeoLife Ayurvedic formulation prepared for digestive and Vata wellness support.",
    image: require("../../assets/images/Products/vatahara_kashayam.webp"),
  },

  {
    id: 7,
    name: "Weight Loss Churna",
    category: "Wellness Support",
    quantity: "",
    description:
      "Traditional herbal wellness formulation designed to complement healthy lifestyle habits.",
    image: require("../../assets/images/Products/weightlosschurna.webp"),
  },

  {
    id: 8,
    name: "Mulavyadi Churna",
    category: "Ayurvedic Wellness",
    quantity: "",
    description:
      "A traditional Ayurvedic formulation from NeoLife prepared for digestive wellness support.",
    image: require("../../assets/images/Products/mulavyadi_churna.jpeg"),
  },
];

/* =========================================================
   SCREEN
========================================================= */

export default function ProductsScreen() {
  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const [notice, setNotice] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const pageAnim = useRef(
    new Animated.Value(0)
  ).current;

  useEffect(() => {
  

  Animated.timing(pageAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  


  /* =======================================================
     SEARCH STATIC PRODUCTS
  ======================================================= */

  const filteredProducts = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return PRODUCTS;
    }

    return PRODUCTS.filter((product) => {
      const searchable = [
        product.name,
        product.category,
        product.quantity,
        product.description,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(value);
    });
  }, [search]);

  /* =======================================================
     OPEN SHOP
  ======================================================= */

  async function openShop() {
    try {
      await Linking.openURL(SHOP_URL);
    } catch (error) {
      console.log("Unable to open shop:", error);

      setNotice({
        visible: true,
        title: "Unable to Open Store",
        message:
          "We couldn't open the NeoLife online store. Please check your internet connection and try again.",
      });
    }
  }

  async function openURL(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setNotice({
        visible: true,
        title: "Unable to Open",
        message:
          "This link could not be opened on your device.",
      });
    }
  }

  /* =======================================================
     LOADER
  ======================================================= */

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator
          size="large"
          color={GREEN}
        />

        <Text style={styles.loaderText}>
          Preparing NeoLife products...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
     <PatientHeader
  onMenuPress={() => setMenuOpen(true)}
/>

      {/* ===================================================
          PAGE
      =================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 0,
        }}
      >
        {/* HERO */}

        <Animated.View
          style={[
            styles.hero,
            {
              opacity: pageAnim,
              transform: [
                {
                  translateY:
                    pageAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                },
              ],
            },
          ]}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroBadge}>
            <Ionicons
              name="leaf-outline"
              size={14}
              color={GOLD}
            />

            <Text style={styles.heroBadgeText}>
              NEOLIFE WELLNESS PRODUCTS
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            Discover Wellness,
            {"\n"}
            <Text style={styles.heroGold}>
              The NeoLife Way.
            </Text>
          </Text>

          <Text style={styles.heroText}>
            Explore our wellness products
            and continue to the NeoLife
            online store whenever you're
            ready to order.
          </Text>

          <TouchableOpacity
            style={styles.heroShopButton}
            activeOpacity={0.85}
            onPress={openShop}
          >
            <Ionicons
              name="storefront-outline"
              size={18}
              color={GREEN}
            />

            <Text
              style={
                styles.heroShopButtonText
              }
            >
              Visit Online Store
            </Text>

            <Ionicons
              name="arrow-forward"
              size={17}
              color={GREEN}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* SEARCH */}

        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={20}
              color={GREEN}
            />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search our products..."
              placeholderTextColor="#9AA59E"
              style={styles.searchInput}
            />

            {!!search && (
              <TouchableOpacity
                onPress={() => setSearch("")}
              >
                <Ionicons
                  name="close-circle"
                  size={19}
                  color={MUTED}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* PRODUCTS SECTION */}

        <View style={styles.section}>
          <Text style={styles.eyebrow}>
            OUR COLLECTION
          </Text>

          <Text style={styles.sectionTitle}>
            NeoLife Products
          </Text>

          <Text style={styles.sectionLead}>
            Explore our wellness range.
            Tap Shop Now on any product to
            continue to the NeoLife
            ecommerce store.
          </Text>

          <View style={styles.productCountRow}>
            <View
              style={styles.productCountBadge}
            >
              <Ionicons
                name="bag-handle-outline"
                size={15}
                color={GREEN}
              />

              <Text
                style={
                  styles.productCountText
                }
              >
                {filteredProducts.length}{" "}
                Products
              </Text>
            </View>
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="search-outline"
                  size={28}
                  color={GREEN}
                />
              </View>

              <Text style={styles.emptyTitle}>
                No Products Found
              </Text>

              <Text style={styles.emptyText}>
                Try searching with another
                product name or category.
              </Text>
            </View>
          ) : (
            <View style={styles.productGrid}>
              {filteredProducts.map(
                (product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onShop={openShop}
                  />
                )
              )}
            </View>
          )}
        </View>

        {/* STORE CTA */}

        <View style={styles.storeCTA}>
          <View style={styles.storeIcon}>
            <Ionicons
              name="storefront-outline"
              size={27}
              color={GOLD}
            />
          </View>

          <Text style={styles.storeEyebrow}>
            NEOLIFE ONLINE STORE
          </Text>

          <Text style={styles.storeTitle}>
            Ready to Order?
          </Text>

          <Text style={styles.storeText}>
            Visit our ecommerce website to
            view the complete shopping
            experience and place your order
            securely.
          </Text>

          <TouchableOpacity
            style={styles.storeButton}
            activeOpacity={0.85}
            onPress={openShop}
          >
            <Ionicons
              name="bag-handle-outline"
              size={18}
              color={GREEN}
            />

            <Text
              style={styles.storeButtonText}
            >
              Shop NeoLife Products
            </Text>

            <Ionicons
              name="arrow-forward"
              size={18}
              color={GREEN}
            />
          </TouchableOpacity>
        </View>

        {/* SAME FOOTER */}

        <View style={styles.footer}>
          <Image
            source={require("../../assets/images/main_logo.jpeg")}
            style={styles.footerLogo}
          />

          <Text style={styles.footerBrand}>
            NeoLife Wellness Center
          </Text>

          <Text style={styles.footerTagline}>
            Natural healing, Ayurvedic care
            and trusted wellness support
            for a healthier life.
          </Text>

          <TouchableOpacity
            style={styles.footerRow}
            onPress={() =>
              openURL(
                "tel:+919481489866"
              )
            }
          >
            <Ionicons
              name="call-outline"
              size={17}
              color={GOLD}
            />

            <Text style={styles.footerText}>
              +91 94814 89866
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerRow}
            onPress={() =>
              openURL(
                "mailto:neelavar.murali@gmail.com"
              )
            }
          >
            <Ionicons
              name="mail-outline"
              size={17}
              color={GOLD}
            />

            <Text style={styles.footerText}>
              neelavar.murali@gmail.com
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerAddress}>
            4-1-38, Behind Lions Bhavan
            Road, Nairkere 1st Cross,
            Brahmagiri, Ambalapady Post,
            Udupi – 576103, Karnataka,
            India
          </Text>

          <View style={styles.socialRow}>
            <SocialButton
              icon="logo-facebook"
              onPress={() =>
                openURL(
                  "https://www.facebook.com/profile.php?id=61575580360517"
                )
              }
            />

            <SocialButton
              icon="logo-instagram"
              onPress={() =>
                openURL(
                  "https://www.instagram.com/neolives_global"
                )
              }
            />

            <SocialButton
              icon="logo-youtube"
              onPress={() =>
                openURL(
                  "https://www.youtube.com/@NeolifeWellnessCenterUdupi-o7x"
                )
              }
            />

            <SocialButton
              icon="logo-whatsapp"
              onPress={() =>
                openURL(
                  "https://wa.me/919481489866"
                )
              }
            />
          </View>

          <Text style={styles.copyright}>
            © 2026 NeoLife Wellness Center.
            All Rights Reserved.
          </Text>
        </View>
      </ScrollView>

      {/* ===================================================
          FLOATING CART
      =================================================== */}

      <TouchableOpacity
        style={styles.floatingCart}
        activeOpacity={0.88}
        onPress={() =>
          router.push("/cart" as any)
        }
      >
        <Ionicons
          name="cart"
          size={23}
          color={WHITE}
        />

        <View style={styles.cartTextWrap}>
          <Text style={styles.cartSmallText}>
            MY
          </Text>

          <Text style={styles.cartMainText}>
            Cart
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={16}
          color={GOLD_LIGHT}
        />
      </TouchableOpacity>

      <PatientDrawer
  visible={menuOpen}
  onClose={() => setMenuOpen(false)}
  activeRoute="/(tabs)/products"
/>

      {/* ===================================================
          STYLED NOTICE
      =================================================== */}

      <Modal
        visible={notice.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setNotice((current) => ({
            ...current,
            visible: false,
          }))
        }
      >
        <View style={styles.noticeRoot}>
          <Pressable
            style={styles.noticeBackdrop}
            onPress={() =>
              setNotice((current) => ({
                ...current,
                visible: false,
              }))
            }
          />

          <View style={styles.noticeCard}>
            <View
              style={styles.noticeIconOuter}
            >
              <View
                style={styles.noticeIconInner}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={32}
                  color={GREEN}
                />
              </View>
            </View>

            <Text style={styles.noticeEyebrow}>
              NEOLIFE WELLNESS
            </Text>

            <Text style={styles.noticeTitle}>
              {notice.title}
            </Text>

            <Text
              style={styles.noticeMessage}
            >
              {notice.message}
            </Text>

            <TouchableOpacity
              style={styles.noticeButton}
              onPress={() =>
                setNotice((current) => ({
                  ...current,
                  visible: false,
                }))
              }
            >
              <Text
                style={
                  styles.noticeButtonText
                }
              >
                Okay
              </Text>

              <Ionicons
                name="checkmark"
                size={18}
                color={GREEN}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   PRODUCT CARD
========================================================= */

function ProductCard({
  product,
  onShop,
}: {
  product: (typeof PRODUCTS)[number];
  onShop: () => void;
}) {
  return (
    <View style={styles.productCard}>
      <View style={styles.productImageBox}>
        <Image
          source={product.image}
          style={styles.productImage}
          resizeMode="contain"
        />

        <View style={styles.categoryBadge}>
          <Text
            numberOfLines={1}
            style={styles.categoryBadgeText}
          >
            {product.category}
          </Text>
        </View>
      </View>

      <View style={styles.productBody}>
        <Text
          style={styles.productName}
          numberOfLines={2}
        >
          {product.name}
        </Text>

        {!!product.quantity && (
          <Text style={styles.productQty}>
            {product.quantity}
          </Text>
        )}

        <Text
          style={styles.productDesc}
          numberOfLines={4}
        >
          {product.description}
        </Text>

        <TouchableOpacity
          style={styles.shopButton}
          activeOpacity={0.85}
          onPress={onShop}
        >
          <Ionicons
            name="bag-handle-outline"
            size={16}
            color={GREEN}
          />

          <Text style={styles.shopButtonText}>
            Shop Now
          </Text>

          <Ionicons
            name="arrow-forward"
            size={16}
            color={GREEN}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* =========================================================
   SOCIAL
========================================================= */

function SocialButton({
  icon,
  onPress,
}: {
  icon: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.socialButton}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={20}
        color={WHITE}
      />
    </TouchableOpacity>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },

  loaderText: {
    marginTop: 12,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 12,
  },

  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  

  /* HERO */

  hero: {
    overflow: "hidden",
    marginHorizontal: 16,
    marginTop: 22,
    paddingHorizontal: 22,
    paddingTop: 27,
    paddingBottom: 27,
    borderRadius: 30,
    backgroundColor: GREEN,
  },

  heroGlowOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    top: -85,
    right: -65,
    backgroundColor:
      "rgba(214,180,91,.13)",
  },

  heroGlowTwo: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    left: -70,
    bottom: -90,
    backgroundColor:
      "rgba(255,255,255,.05)",
  },

  heroBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor:
      "rgba(255,255,255,.09)",
  },

  heroBadgeText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 8,
    letterSpacing: 1.2,
  },

  heroTitle: {
    marginTop: 18,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 32,
    lineHeight: 39,
  },

  heroGold: {
    color: GOLD,
  },

  heroText: {
    marginTop: 12,
    maxWidth: 330,
    fontFamily:
      "DMSans_400Regular",
    color: "#D5E1D9",
    fontSize: 12,
    lineHeight: 19,
  },

  heroShopButton: {
    alignSelf: "flex-start",
    minHeight: 48,
    marginTop: 20,
    paddingHorizontal: 16,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GOLD,
  },

  heroShopButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  /* SEARCH */

  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  searchBox: {
    minHeight: 54,
    paddingHorizontal: 15,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  searchInput: {
    flex: 1,
    fontFamily:
      "DMSans_400Regular",
    color: TEXT,
    fontSize: 12,
  },

  /* SECTION */

  section: {
    paddingHorizontal: 16,
    paddingTop: 35,
  },

  eyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    letterSpacing: 1.5,
  },

  sectionTitle: {
    marginTop: 7,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 29,
    lineHeight: 34,
  },

  sectionLead: {
    marginTop: 7,
    maxWidth: 380,
    fontFamily:
      "DMSans_400Regular",
    color: MUTED,
    fontSize: 11,
    lineHeight: 18,
  },

  productCountRow: {
    marginTop: 15,
    flexDirection: "row",
  },

  productCountBadge: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: MINT,
  },

  productCountText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  /* PRODUCT GRID */

  productGrid: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },

  productCard: {
    width: "48.2%",
    overflow: "hidden",
    borderRadius: 21,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  productImageBox: {
    height: 160,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F8F5",
  },

  productImage: {
    width: "90%",
    height: "90%",
  },

  categoryBadge: {
    position: "absolute",
    top: 9,
    left: 9,
    maxWidth: "83%",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: GREEN,
  },

  categoryBadgeText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 6.5,
  },

  productBody: {
    padding: 12,
  },

  productName: {
    minHeight: 36,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 15,
    lineHeight: 18,
  },

  productQty: {
    marginTop: 4,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
  },

  productDesc: {
    minHeight: 54,
    marginTop: 7,
    fontFamily:
      "DMSans_400Regular",
    color: MUTED,
    fontSize: 8.5,
    lineHeight: 14,
  },

  shopButton: {
    minHeight: 41,
    marginTop: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    backgroundColor: GOLD,
  },

  shopButtonText: {
    flex: 1,
    marginLeft: 6,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  /* EMPTY */

  emptyCard: {
    marginTop: 20,
    padding: 35,
    borderRadius: 24,
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  emptyTitle: {
    marginTop: 14,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 20,
  },

  emptyText: {
    marginTop: 5,
    fontFamily:
      "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    textAlign: "center",
  },

  /* STORE CTA */

  storeCTA: {
    marginHorizontal: 16,
    marginTop: 48,
    padding: 25,
    borderRadius: 28,
    alignItems: "center",
    backgroundColor: "#F5EDDA",
    borderWidth: 1,
    borderColor: "#E8D6A8",
  },

  storeIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  storeEyebrow: {
    marginTop: 15,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.4,
  },

  storeTitle: {
    marginTop: 6,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 25,
  },

  storeText: {
    marginTop: 8,
    maxWidth: 330,
    fontFamily:
      "DMSans_400Regular",
    color: MUTED,
    textAlign: "center",
    fontSize: 10,
    lineHeight: 17,
  },

  storeButton: {
    minHeight: 49,
    marginTop: 18,
    paddingHorizontal: 17,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GOLD,
  },

  storeButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  /* FLOATING CART */

  floatingCart: {
    position: "absolute",
    right: 0,
    bottom: 105,
    minHeight: 58,
    paddingLeft: 14,
    paddingRight: 10,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GREEN,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },

  cartTextWrap: {
    paddingRight: 2,
  },

  cartSmallText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 6,
    letterSpacing: 1,
  },

  cartMainText: {
    marginTop: -1,
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 11,
  },

  /* FOOTER */

  footer: {
    marginTop: 55,
    paddingTop: 42,
    paddingBottom: 34,
    paddingHorizontal: 22,
    alignItems: "center",
    backgroundColor: "#0A271A",
  },

  footerLogo: {
    width: 62,
    height: 62,
    borderRadius: 21,
  },

  footerBrand: {
    marginTop: 13,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 20,
  },

  footerTagline: {
    marginTop: 8,
    maxWidth: 420,
    fontFamily:
      "DMSans_400Regular",
    color: "#C6D4CB",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 19,
  },

  footerRow: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  footerText: {
    fontFamily:
      "DMSans_500Medium",
    color: "#E1EAE4",
    fontSize: 12,
  },

  footerAddress: {
    marginTop: 15,
    maxWidth: 390,
    fontFamily:
      "DMSans_400Regular",
    color: "#AFC0B6",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
  },

  socialRow: {
    marginTop: 20,
    flexDirection: "row",
    gap: 10,
  },

  socialButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor:
      "rgba(255,255,255,.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  copyright: {
    marginTop: 25,
    fontFamily:
      "DMSans_400Regular",
    color: "#81978A",
    fontSize: 10,
    textAlign: "center",
  },

 

  /* NOTICE */

  noticeRoot: {
    flex: 1,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  noticeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(5, 28, 19, 0.74)",
  },

  noticeCard: {
    width: "100%",
    maxWidth: 380,
    paddingTop: 30,
    paddingBottom: 22,
    paddingHorizontal: 22,
    borderRadius: 30,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor:
      "rgba(214,180,91,.45)",
    elevation: 20,
  },

  noticeIconOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5E8BD",
  },

  noticeIconInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  noticeEyebrow: {
    marginTop: 18,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    letterSpacing: 1.6,
  },

  noticeTitle: {
    marginTop: 7,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 27,
    textAlign: "center",
  },

  noticeMessage: {
    marginTop: 9,
    maxWidth: 310,
    fontFamily:
      "DMSans_400Regular",
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
  },

  noticeButton: {
    width: "100%",
    minHeight: 51,
    marginTop: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
  },

  noticeButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 12,
  },
  

});