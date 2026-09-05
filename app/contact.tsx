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
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  ImageBackground,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";


import PatientDrawer from "../components/PatientDrawer";
import PatientHeader from "../components/PatientHeader";

const GREEN = "#0B3D2E";
const GREEN_2 = "#155741";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_DARK = "#B78D2B";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#738179";
const BORDER = "#E8E2D3";

const PHONE_DISPLAY = "+91 94814 89866";
const PHONE_LINK = "tel:+919481489866";
const WHATSAPP_LINK = "https://wa.me/918660322365";
const EMAIL = "support@neolifeayush.com";
const MAP_LINK =
  "https://www.google.com/maps/search/?api=1&query=Neolife+Wellness+Center+Udupi";

const contactItems = [
  {
    icon: "location-outline",
    title: "Location",
    value:
      "4-1-38 Nararkere 1st Cross, Brahmagiri Post, Ambalpadi, Udupi, Karnataka 576101",
    action: MAP_LINK,
  },
  {
    icon: "call-outline",
    title: "Phone",
    value: PHONE_DISPLAY,
    action: PHONE_LINK,
  },
  {
    icon: "logo-whatsapp",
    title: "WhatsApp",
    value: "Chat with our front desk",
    action: WHATSAPP_LINK,
  },
  {
    icon: "mail-outline",
    title: "Email",
    value: EMAIL,
    action: `mailto:${EMAIL}`,
  },
  {
    icon: "time-outline",
    title: "Business Hours",
    value: "Monday–Saturday: 9:00 AM–6:00 PM\nSunday: Holiday",
    action: "",
  },
];

export default function ContactScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  
  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const heroAnim = useRef(new Animated.Value(0)).current;
  const quickAnim = useRef(new Animated.Value(0)).current;
  const infoAnim = useRef(new Animated.Value(0)).current;
  const mapAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    

    Animated.sequence([
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(quickAnim, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(infoAnim, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(mapAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);


  async function openURL(url: string) {
    if (!url) return;

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.log("Unable to open URL:", error);
    }
  }

  const rise = (value: Animated.Value, amount = 20) => ({
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [amount, 0],
        }),
      },
    ],
  });

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
    
<PatientHeader
  onMenuPress={() => setMenuOpen(true)}
/>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HERO */}
        <ImageBackground
          source={require("../assets/images/neolife2.png")}
          style={styles.hero}
          resizeMode="cover"
        >
          <View style={styles.heroShade} />
          <View style={styles.heroGlow} />

          <Animated.View style={[styles.heroContent, rise(heroAnim, 24)]}>
            <View style={styles.heroLabel}>
              <Ionicons name="leaf" size={13} color={GOLD_LIGHT} />
              <Text style={styles.heroLabelText}>WE ARE HERE TO HELP</Text>
            </View>

            <Text style={styles.heroTitle}>Let’s Talk About Your Wellness</Text>

            <Text style={styles.heroText}>
              Reach our team for consultations, therapies, beauty treatments,
              product enquiries and appointment support.
            </Text>

            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.heroPrimary}
                onPress={() => openURL(PHONE_LINK)}
              >
                <Ionicons name="call-outline" size={17} color={GREEN} />
                <Text style={styles.heroPrimaryText}>Call Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroSecondary}
                onPress={() => openURL(WHATSAPP_LINK)}
              >
                <Ionicons name="logo-whatsapp" size={17} color={WHITE} />
                <Text style={styles.heroSecondaryText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ImageBackground>

        {/* QUICK CONTACT */}
        <Animated.View style={[styles.quickWrap, rise(quickAnim, 16)]}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => openURL(PHONE_LINK)}
          >
            <View style={styles.quickIcon}>
              <Ionicons name="call-outline" size={22} color={GREEN} />
            </View>
            <Text style={styles.quickTitle}>Call Us</Text>
            <Text style={styles.quickText}>9481489866</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => openURL(WHATSAPP_LINK)}
          >
            <View style={styles.quickIcon}>
              <Ionicons name="logo-whatsapp" size={22} color={GREEN} />
            </View>
            <Text style={styles.quickTitle}>WhatsApp</Text>
            <Text style={styles.quickText}>Front desk</Text>
          </TouchableOpacity>

          <View style={styles.quickCard}>
            <View style={styles.quickIcon}>
              <Ionicons name="time-outline" size={22} color={GREEN} />
            </View>
            <Text style={styles.quickTitle}>Hours</Text>
            <Text style={styles.quickText}>9 AM–6 PM</Text>
          </View>
        </Animated.View>

        {/* CONTACT DETAILS */}
        <Animated.View style={[styles.section, rise(infoAnim, 18)]}>
          <Text style={styles.eyebrow}>GET IN TOUCH</Text>

          <Text style={styles.sectionTitle}>
            We Would Love to Hear from You
          </Text>

          <Text style={styles.sectionLead}>
            Contact us for appointments, therapy information, beauty services
            or product enquiries.
          </Text>

          <View style={styles.contactInfoCard}>
            <View style={styles.contactCardTop}>
              <Text style={styles.contactCardEyebrow}>CONTACT DETAILS</Text>
              <Text style={styles.contactCardTitle}>
                Connect With NeoLife
              </Text>
              <Text style={styles.contactCardSubtitle}>
                Choose whichever option is most convenient for you.
              </Text>
            </View>

            {contactItems.map((item, index) => (
              <TouchableOpacity
                key={item.title}
                activeOpacity={item.action ? 0.82 : 1}
                onPress={() => openURL(item.action)}
                style={[
                  styles.contactItem,
                  index === contactItems.length - 1 && styles.contactItemLast,
                ]}
              >
                <View style={styles.contactIcon}>
                  <Ionicons
                    name={item.icon as any}
                    size={21}
                    color={GOLD_LIGHT}
                  />
                </View>

                <View style={styles.contactCopy}>
                  <Text style={styles.contactItemTitle}>{item.title}</Text>
                  <Text style={styles.contactItemText}>{item.value}</Text>
                </View>

                {!!item.action && (
                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color="#C9DACF"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* MARKETING / SUPPORT CTA */}
        <View style={styles.supportSection}>
          <View style={styles.supportIcon}>
            <Ionicons name="heart-outline" size={23} color={GOLD} />
          </View>

          <Text style={styles.supportTitle}>Not Sure Where to Start?</Text>

          <Text style={styles.supportText}>
            Tell us what you are looking for. Our team can guide you toward the
            right consultation, therapy or wellness service.
          </Text>

          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => router.push("/consultation" as any)}
          >
            <Text style={styles.supportButtonText}>Book a Consultation</Text>
            <Ionicons name="arrow-forward" size={16} color={GREEN} />
          </TouchableOpacity>
        </View>

        {/* MAP */}
        <Animated.View style={[styles.mapSection, rise(mapAnim, 18)]}>
          <Text style={styles.eyebrow}>VISIT OUR CENTER</Text>

          <Text style={styles.sectionTitle}>Find Us in Udupi</Text>

          <Text style={styles.sectionLead}>
            NeoLife Wellness Center is located in Ambalpadi, Udupi.
          </Text>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openURL(MAP_LINK)}
            style={styles.mapCard}
          >
            <ImageBackground
              source={require("../assets/images/neolife2.png")}
              style={styles.mapImage}
              imageStyle={styles.mapImageStyle}
            >
              <View style={styles.mapShade} />

              <View style={styles.mapPin}>
                <Ionicons name="location" size={24} color={WHITE} />
              </View>

              <Text style={styles.mapTitle}>NeoLife Wellness Center</Text>

              <Text style={styles.mapAddress}>
                4-1-38 Nararkere 1st Cross, Brahmagiri Post, Ambalpadi,
                Udupi, Karnataka 576101
              </Text>

              <View style={styles.mapButton}>
                <Ionicons name="navigate-outline" size={17} color={GREEN} />
                <Text style={styles.mapButtonText}>Open Google Maps</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </Animated.View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Image
            source={require("../assets/images/main_logo.jpeg")}
            style={styles.footerLogo}
          />

          <Text style={styles.footerBrand}>NeoLife Wellness Center</Text>

          <Text style={styles.footerTagline}>
            Natural healing, Ayurvedic care and trusted wellness support for a healthier life.
          </Text>

          <TouchableOpacity
            style={styles.footerRow}
            onPress={() => openURL("tel:9036444282")}
          >
            <Ionicons name="call-outline" size={17} color={GOLD} />
            <Text style={styles.footerText}>9036444282</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerRow}
            onPress={() => openURL(`mailto:${EMAIL}`)}
          >
            <Ionicons name="mail-outline" size={17} color={GOLD} />
            <Text style={styles.footerText}>{EMAIL}</Text>
          </TouchableOpacity>

          <View style={styles.socialRow}>
            <Social
              icon="logo-facebook"
              onPress={() =>
                openURL("https://www.facebook.com/profile.php?id=61575580360517")
              }
            />
            <Social
              icon="logo-instagram"
              onPress={() =>
                openURL("https://www.instagram.com/neolives_global")
              }
            />
            <Social
              icon="logo-youtube"
              onPress={() =>
                openURL("https://www.youtube.com/@NeolifeWellnessCenterUdupi-o7x")
              }
            />
            <Social
              icon="logo-whatsapp"
              onPress={() => openURL("https://wa.me/919036444282")}
            />
          </View>

          <Text style={styles.copyright}>
            © 2026 NeoLife Wellness Center. All Rights Reserved.
          </Text>
        </View>
      </ScrollView>

      {/* FLOATING WHATSAPP */}
      <TouchableOpacity
        style={styles.whatsapp}
        onPress={() => openURL(WHATSAPP_LINK)}
      >
        <Ionicons name="logo-whatsapp" size={28} color={WHITE} />
      </TouchableOpacity>

      <PatientDrawer
  visible={menuOpen}
  onClose={() => setMenuOpen(false)}
  activeRoute="/contact"
/>
    </View>
  );
}

function Social({
  icon,
  onPress,
}: {
  icon: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.socialButton} onPress={onPress}>
      <Ionicons name={icon} size={20} color={WHITE} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },

  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  scrollContent: {
    paddingBottom: 0,
  },

  

  hero: {
    minHeight: 500,
    justifyContent: "center",
  },

  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,34,24,.67)",
  },

  heroGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    right: -110,
    bottom: -90,
    borderRadius: 140,
    backgroundColor: "rgba(214,180,91,.15)",
  },

  heroContent: {
    paddingHorizontal: 22,
    paddingVertical: 64,
  },

  heroLabel: {
    alignSelf: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,.11)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.18)",
  },

  heroLabelText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 9,
    letterSpacing: 1,
  },

  heroTitle: {
    marginTop: 17,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 40,
    lineHeight: 45,
    letterSpacing: -0.8,
  },

  heroText: {
    marginTop: 13,
    maxWidth: 390,
    fontFamily: "DMSans_400Regular",
    color: "#E5EFEA",
    fontSize: 14,
    lineHeight: 21,
  },

  heroActions: {
    marginTop: 23,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  heroPrimary: {
    minHeight: 48,
    paddingHorizontal: 17,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: GOLD,
  },

  heroPrimaryText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 12,
  },

  heroSecondary: {
    minHeight: 48,
    paddingHorizontal: 17,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.38)",
    backgroundColor: "rgba(255,255,255,.08)",
  },

  heroSecondaryText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 12,
  },

  quickWrap: {
    marginTop: -28,
    marginHorizontal: 14,
    padding: 9,
    borderRadius: 23,
    flexDirection: "row",
    backgroundColor: WHITE,
    elevation: 7,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },

  quickCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },

  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  quickTitle: {
    marginTop: 7,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  quickText: {
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    textAlign: "center",
  },

  section: {
    paddingTop: 62,
    paddingBottom: 58,
    paddingHorizontal: 17,
    backgroundColor: CREAM,
  },

  eyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 10,
    letterSpacing: 1.6,
  },

  sectionTitle: {
    marginTop: 8,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 29,
    lineHeight: 34,
    letterSpacing: -0.5,
  },

  sectionLead: {
    marginTop: 9,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
  },

  contactInfoCard: {
    marginTop: 24,
    overflow: "hidden",
    borderRadius: 26,
    backgroundColor: GREEN,
  },

  contactCardTop: {
    padding: 22,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,.10)",
  },

  contactCardEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 9,
    letterSpacing: 1.4,
  },

  contactCardTitle: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 27,
  },

  contactCardSubtitle: {
    marginTop: 7,
    fontFamily: "DMSans_400Regular",
    color: "#D5E3DA",
    fontSize: 12,
    lineHeight: 18,
  },

  contactItem: {
    minHeight: 78,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,.10)",
  },

  contactItemLast: {
    borderBottomWidth: 0,
  },

  contactIcon: {
    width: 46,
    height: 46,
    marginRight: 13,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.12)",
  },

  contactCopy: {
    flex: 1,
  },

  contactItemTitle: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 12,
  },

  contactItemText: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    color: "#EDF5EF",
    fontSize: 12,
    lineHeight: 18,
  },

  supportSection: {
    marginHorizontal: 16,
    padding: 25,
    borderRadius: 27,
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  supportIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  supportTitle: {
    marginTop: 15,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 26,
    textAlign: "center",
  },

  supportText: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },

  supportButton: {
    marginTop: 18,
    minHeight: 47,
    paddingHorizontal: 19,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: GOLD,
  },

  supportButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 12,
  },

  mapSection: {
    paddingVertical: 60,
    paddingHorizontal: 17,
    backgroundColor: CREAM,
  },

  mapCard: {
    marginTop: 22,
    overflow: "hidden",
    borderRadius: 26,
  },

  mapImage: {
    minHeight: 315,
    justifyContent: "flex-end",
    padding: 22,
  },

  mapImageStyle: {
    borderRadius: 26,
  },

  mapShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,43,29,.71)",
  },

  mapPin: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD_DARK,
  },

  mapTitle: {
    marginTop: 15,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 25,
  },

  mapAddress: {
    marginTop: 7,
    fontFamily: "DMSans_400Regular",
    color: "#E4EEE8",
    fontSize: 12,
    lineHeight: 19,
  },

  mapButton: {
    marginTop: 17,
    alignSelf: "flex-start",
    minHeight: 45,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: GOLD,
  },

  mapButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  footer: {
    paddingTop: 40,
    paddingBottom: 34,
    paddingHorizontal: 21,
    alignItems: "center",
    backgroundColor: "#0D281B",
  },

  footerLogo: {
    width: 60,
    height: 60,
    borderRadius: 20,
  },

  footerBrand: {
    marginTop: 12,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 19,
  },

  footerTagline: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    color: "#C8D6CD",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  footerRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  footerText: {
    fontFamily: "DMSans_500Medium",
    color: "#E1EAE4",
    fontSize: 12,
  },

  socialRow: {
    marginTop: 20,
    flexDirection: "row",
    gap: 10,
  },

  socialButton: {
    width: 41,
    height: 41,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.10)",
  },

  copyright: {
    marginTop: 24,
    fontFamily: "DMSans_400Regular",
    color: "#81978A",
    fontSize: 10,
    textAlign: "center",
  },

  whatsapp: {
    position: "absolute",
    right: 18,
    bottom: Platform.OS === "web" ? 20 : 82,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#20C764",
    elevation: 8,
    zIndex: 100,
  },

  
});
