import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { API_BASE_URL } from "../services/api";
import PatientDrawer from "../components/PatientDrawer";
import PatientHeader from "../components/PatientHeader";

const GREEN = "#0B3D2E";
const GREEN_2 = "#14533D";
const GOLD = "#D6B45B";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#75837B";

type Offer = {
  id?: number;
  offerLabel?: string;
  offerTitle?: string;
  description?: string;
  couponCode?: string;
  discountText?: string;
  buttonText?: string;
  buttonLink?: string;
  bannerImageUrl?: string;
};

export default function OffersScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOffers();
  }, []);

  async function loadOffers(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      console.log(
        "Loading offers:",
        `${API_BASE_URL}/offers/active/get`
      );

      const response = await fetch(
        `${API_BASE_URL}/offers/active/get`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = await response.json();

      console.log(
        "OFFERS RESPONSE:",
        JSON.stringify(result, null, 2)
      );

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || "Unable to load offers."
        );
      }

      if (!Array.isArray(result?.data)) {
        setOffers([]);
        return;
      }

      // Same behavior as website:
      // only display offers having a banner image.
      const validOffers = result.data.filter(
        (offer: Offer) =>
          typeof offer?.bannerImageUrl === "string" &&
          offer.bannerImageUrl.trim().length > 0
      );

      setOffers(validOffers);
    } catch (err: any) {
      console.log("Offer loading failed:", err);

      setError(
        err?.message ||
          "Unable to load offers right now."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getOfferImageUrl(value?: string) {
    if (!value?.trim()) {
      return null;
    }

    const image = value.trim();

    // Already complete backend URL
    if (
      image.startsWith("http://") ||
      image.startsWith("https://")
    ) {
      return image;
    }

    /*
     * API_BASE_URL:
     * http://192.168.137.1:8085/api
     *
     * Convert it to:
     * http://192.168.137.1:8085
     */
    const apiOrigin = API_BASE_URL.replace(
      /\/api\/?$/,
      ""
    );

    if (image.startsWith("/")) {
      return `${apiOrigin}${image}`;
    }

    return `${apiOrigin}/${image}`;
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)" as any);
    }
  }

  return (
    <View style={styles.screen}>
      
    <PatientHeader
      onMenuPress={() => setMenuOpen(true)}
    />

      {loading ? (
        <View style={styles.centerState}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator
              size="large"
              color={GREEN}
            />
          </View>

          <Text style={styles.stateTitle}>
            Loading Offers
          </Text>

          <Text style={styles.stateText}>
            Please wait while we find our latest offers.
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <View style={styles.stateIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={31}
              color={GREEN}
            />
          </View>

          <Text style={styles.stateTitle}>
            Unable to Load Offers
          </Text>

          <Text style={styles.stateText}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadOffers()}
            activeOpacity={0.85}
          >
            <Ionicons
              name="refresh"
              size={17}
              color={WHITE}
            />

            <Text style={styles.retryText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : offers.length === 0 ? (
        <View style={styles.centerState}>
          <View style={styles.stateIcon}>
            <Ionicons
              name="gift-outline"
              size={34}
              color={GREEN}
            />
          </View>

          <Text style={styles.stateTitle}>
            No Offers Right Now
          </Text>

          <Text style={styles.stateText}>
            New wellness offers will appear here when
            they become available.
          </Text>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() =>
              router.replace("/(tabs)" as any)
            }
            activeOpacity={0.85}
          >
            <Text style={styles.homeButtonText}>
              Go to Home
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadOffers(true)}
              tintColor={GREEN}
              colors={[GREEN]}
            />
          }
        >
          {/* INTRO */}
          <View style={styles.intro}>
            <View style={styles.introBadge}>
              <Ionicons
                name="sparkles"
                size={14}
                color={GOLD}
              />

              <Text style={styles.introBadgeText}>
                EXCLUSIVE WELLNESS OFFERS
              </Text>
            </View>

            <Text style={styles.introTitle}>
              A Little More Care,
              {"\n"}
              For a Little Less.
            </Text>

            <Text style={styles.introText}>
              Explore our latest wellness and beauty
              offers from NeoLife Wellness Center.
            </Text>
          </View>

          {/* OFFER CARDS */}
          <View style={styles.offerList}>
            {offers.map((offer, index) => {
              const imageUrl = getOfferImageUrl(
                offer.bannerImageUrl
              );

              if (!imageUrl) {
                return null;
              }

              return (
                <View
                  key={
                    offer.id
                      ? String(offer.id)
                      : `offer-${index}`
                  }
                  style={styles.offerCard}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.offerImage}
                    resizeMode="cover"
                    onError={(event) => {
                      console.log(
                        "OFFER IMAGE FAILED:",
                        imageUrl,
                        event.nativeEvent.error
                      );
                    }}
                  />
                </View>
              );
            })}
          </View>

          {/* INFO */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="information-circle-outline"
                size={23}
                color={GREEN}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                Interested in an offer?
              </Text>

              <Text style={styles.infoText}>
                Contact NeoLife Wellness Center or book
                your consultation to know more.
              </Text>
            </View>
          </View>

          {/* CTA */}
          <View style={styles.cta}>
            <Ionicons
              name="heart-outline"
              size={29}
              color={GOLD}
            />

            <Text style={styles.ctaTitle}>
              Begin Your Wellness Journey
            </Text>

            <Text style={styles.ctaText}>
              Our team is here to help you choose the
              right care for your needs.
            </Text>

            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() =>
                router.push("/consultation" as any)
              }
              activeOpacity={0.85}
            >
              <Text style={styles.ctaButtonText}>
                Book Consultation
              </Text>

              <Ionicons
                name="arrow-forward"
                size={17}
                color={GREEN}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
       <PatientDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeRoute="/offers"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  

  content: {
    paddingBottom: 50,
  },

  intro: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 25,
  },

  introBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  introBadgeText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  introTitle: {
    marginTop: 12,
    color: TEXT,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: "900",
    letterSpacing: -0.7,
  },

  introText: {
    marginTop: 10,
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
  },

  offerList: {
    paddingHorizontal: 16,
    gap: 18,
  },

  offerCard: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: WHITE,

    elevation: 4,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },

  offerImage: {
    width: "100%",
    aspectRatio: 1.45,
    backgroundColor: "#EAEDEA",
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  loadingIcon: {
    marginBottom: 18,
  },

  stateIcon: {
    width: 70,
    height: 70,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF5EF",
    marginBottom: 17,
  },

  stateTitle: {
    color: TEXT,
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },

  stateText: {
    marginTop: 8,
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },

  retryButton: {
    marginTop: 20,
    minHeight: 47,
    paddingHorizontal: 20,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: GREEN,
  },

  retryText: {
    color: WHITE,
    fontWeight: "900",
  },

  homeButton: {
    marginTop: 20,
    minHeight: 47,
    paddingHorizontal: 22,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },

  homeButtonText: {
    color: GREEN,
    fontWeight: "900",
  },

  infoCard: {
    marginTop: 28,
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 20,
    flexDirection: "row",
    gap: 13,
    backgroundColor: WHITE,
  },

  infoIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF5EF",
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },

  infoText: {
    marginTop: 4,
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
  },

  cta: {
    marginTop: 35,
    marginHorizontal: 16,
    padding: 27,
    borderRadius: 27,
    alignItems: "center",
    backgroundColor: GREEN,
  },

  ctaTitle: {
    marginTop: 12,
    color: WHITE,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },

  ctaText: {
    marginTop: 8,
    color: "#CEDDD5",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
  },

  ctaButton: {
    marginTop: 19,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: GOLD,
  },

  ctaButtonText: {
    color: GREEN,
    fontWeight: "900",
  },
});