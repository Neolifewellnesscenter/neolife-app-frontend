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
import { useVideoPlayer, VideoView } from "expo-video";
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
const GREEN_3 = "#1D6A4C";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_DARK = "#B78D2B";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBFAF6";
const SAND = "#F3EEE2";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#738179";
const BORDER = "#E8E2D3";

const whyCards = [
  {
    icon: "leaf-outline",
    title: "Personalized Ayurvedic Consultation",
    text: "Every patient receives an individual health assessment and customized treatment plan.",
  },
  {
    icon: "medical-outline",
    title: "Experienced Healthcare Professionals",
    text: "Our team is committed to safe, ethical and patient-centered wellness care.",
  },
  {
    icon: "flower-outline",
    title: "Holistic Healing",
    text: "Ayurveda, Panchakarma, Acupuncture, Yoga, Naturopathy and wellness therapies under one roof.",
  },
  {
    icon: "heart-outline",
    title: "Patient-First Approach",
    text: "We listen, understand and support every patient throughout their wellness journey.",
  },
  {
    icon: "nutrition-outline",
    title: "Natural Wellness",
    text: "Our treatments emphasize natural healing methods and healthier lifestyle practices.",
  },
  {
    icon: "home-outline",
    title: "Peaceful Environment",
    text: "A calm, hygienic and welcoming center where patients can relax and focus on healing.",
  },
];

const services = [
  ["leaf-outline", "Ayurvedic Consultation"],
  ["flower-outline", "Panchakarma Therapies"],
  ["locate-outline", "Acupuncture"],
  ["nutrition-outline", "Naturopathy"],
  ["body-outline", "Yoga Therapy"],
  ["sparkles-outline", "Beauty & Cosmetic Wellness"],
  ["medkit-outline", "Herbal Ayurvedic Medicines"],
  ["videocam-outline", "Online & In-Clinic Consultation"],
];

export default function AboutScreen() {
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

  const introAnim = useRef(new Animated.Value(0)).current;
  const imageAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;
  const founderAnim = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(
    require("../assets/images/neolife-video.mp4"),
    (playerInstance) => {
      playerInstance.loop = false;
    }
  );

  useEffect(() => {
    

    Animated.sequence([
      Animated.timing(introAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(imageAnim, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardsAnim, {
          toValue: 1,
          duration: 750,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(founderAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);


  async function openURL(url: string) {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.log("Unable to open URL:", error);
    }
  }

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  const rise = (value: Animated.Value, amount = 22) => ({
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

  return (
    <View style={styles.screen}>
      
<PatientHeader onMenuPress={() => setMenuOpen(true)} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* HERO */}
        <ImageBackground
          source={require("../assets/images/neolife2.png")}
          style={styles.hero}
          resizeMode="cover"
        >
          <View style={styles.heroShade} />
          <View style={styles.heroGlow} />

          <Animated.View style={[styles.heroContent, rise(introAnim, 28)]}>
            <View style={styles.heroBadge}>
              <Ionicons name="leaf" size={14} color={GOLD_LIGHT} />
              <Text style={styles.heroBadgeText}>NATURAL HEALING • COMPLETE WELLNESS</Text>
            </View>

            <Text style={styles.heroTitle}>
              About{"\n"}
              <Text style={styles.heroTitleAccent}>NeoLife</Text>
            </Text>

            <Text style={styles.heroSubtitle}>Healing Naturally. Living Fully.</Text>

            <Text style={styles.heroText}>
              Personalized Ayurveda, Panchakarma, Acupuncture, Yoga, Naturopathy
              and holistic wellness care for complete well-being.
            </Text>

            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.heroPrimary}
                onPress={() => router.push("/consultation" as any)}
              >
                <Text style={styles.heroPrimaryText}>Start Your Wellness Journey</Text>
                <Ionicons name="arrow-forward" size={17} color={GREEN} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroSecondary}
                onPress={() => router.push("/therapies" as any)}
              >
                <Text style={styles.heroSecondaryText}>Explore Therapies</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ImageBackground>

        {/* MINI TRUST STRIP */}
        <Animated.View style={[styles.trustStrip, rise(imageAnim, 18)]}>
          <TrustMini icon="leaf-outline" title="Natural" text="Root-cause care" />
          <TrustMini icon="heart-outline" title="Personal" text="Patient-first" />
          <TrustMini icon="shield-checkmark-outline" title="Trusted" text="Ethical care" />
        </Animated.View>

        {/* WHO WE ARE */}
        <Animated.View style={[styles.section, rise(imageAnim, 22)]}>
          <SectionHeading
            eyebrow="WHO WE ARE"
            title="Natural Care for Complete Wellness"
            text="At NeoLife, wellness is not only about treating symptoms. It is about restoring balance across body, mind and lifestyle."
          />

          <View style={styles.aboutImageWrap}>
            <Image
              source={require("../assets/images/neolife2.png")}
              style={styles.aboutImage}
            />
            <View style={styles.imageBadge}>
              <Ionicons name="sparkles-outline" size={16} color={GREEN} />
              <Text style={styles.imageBadgeText}>
                Personalized • Natural • Compassionate
              </Text>
            </View>
          </View>

          <Text style={styles.bodyText}>
            At Neolife Wellness Center, we believe that true health is more than
            the absence of disease—it is the balance of body, mind, and lifestyle.
            Our approach combines the timeless wisdom of Ayurveda with personalized
            care to help every patient achieve long-lasting wellness.
          </Text>

          <Text style={styles.bodyText}>
            Whether you are seeking relief from chronic pain, lifestyle disorders,
            stress, digestive concerns, joint problems, or simply looking to improve
            your overall well-being, our experienced team focuses on understanding
            the root cause rather than just managing symptoms.
          </Text>

          <View style={styles.philosophyCard}>
            <View style={styles.philosophyIcon}>
              <Ionicons name="leaf" size={22} color={WHITE} />
            </View>
            <Text style={styles.philosophyKicker}>OUR PHILOSOPHY</Text>
            <Text style={styles.philosophyTitle}>
              Healing should feel personal.
            </Text>
            <Text style={styles.philosophyText}>
              Every individual is unique, and so is every treatment plan. We carefully
              assess your health, lifestyle and wellness goals before recommending
              therapies that best suit your needs.
            </Text>
          </View>
        </Animated.View>

        {/* CLINIC TOUR */}
        <View style={styles.tourSection}>
          <SectionHeading
            eyebrow="EXPLORE OUR CENTER"
            title="Step Inside NeoLife"
            text="Explore our consultation areas, treatment rooms, therapy facilities and yoga space before your visit."
            light
          />

          <View style={styles.videoCard}>
            <VideoView
              player={player}
              style={styles.video}
              nativeControls
              contentFit="cover"
            />
          </View>
        </View>

        {/* WHY NEOLIFE */}
        <Animated.View style={[styles.section, { backgroundColor: SAND }, rise(cardsAnim, 25)]}>
          <SectionHeading
            eyebrow="WHY NEOLIFE"
            title="Care Designed Around You"
            text="Your comfort, health needs, lifestyle and wellness goals guide every recommendation we make."
          />

          <View style={styles.whyGrid}>
            {whyCards.map((item, index) => (
              <View
                key={item.title}
                style={[
                  styles.whyCard,
                  index % 2 === 1 && styles.whyCardAlt,
                ]}
              >
                <View style={styles.whyIcon}>
                  <Ionicons name={item.icon as any} size={23} color={WHITE} />
                </View>
                <Text style={styles.whyTitle}>{item.title}</Text>
                <Text style={styles.whyText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* SERVICES */}
        <View style={styles.section}>
          <SectionHeading
            eyebrow="COMPLETE WELLNESS CARE"
            title="Everything You Need, In One Place"
            text="A comprehensive range of natural wellness services for healing, prevention and long-term health."
          />

          <View style={styles.serviceGrid}>
            {services.map(([icon, label], index) => (
              <TouchableOpacity
                key={label}
                style={styles.serviceCard}
                activeOpacity={0.86}
                onPress={() => router.push("/therapies" as any)}
              >
                <View style={styles.serviceNumber}>
                  <Text style={styles.serviceNumberText}>
                    {(index + 1).toString().padStart(2, "0")}
                  </Text>
                </View>

                <View style={styles.serviceIcon}>
                  <Ionicons name={icon as any} size={21} color={GREEN} />
                </View>

                <Text style={styles.serviceText}>{label}</Text>

                <Ionicons name="arrow-forward" size={17} color={GOLD_DARK} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

       
        <View style={styles.mvSection}>
          <ImageBackground
            source={require("../assets/images/neolife2.png")}
            style={styles.mvBackground}
            imageStyle={styles.mvImage}
          >
            <View style={styles.mvShade} />

            <View style={styles.mvIntro}>
              <Text style={styles.mvEyebrow}>OUR PURPOSE</Text>
              <Text style={styles.mvMainTitle}>Mission & Vision</Text>
            </View>

            <View style={styles.mvCard}>
              <View style={styles.mvIcon}>
                <Ionicons name="compass-outline" size={24} color={GREEN} />
              </View>
              <Text style={styles.mvTitle}>Mission</Text>
              <View style={styles.goldLine} />
              <Text style={styles.mvText}>
                To make authentic Ayurvedic and holistic healthcare accessible through
                personalized treatment, ethical practice, and compassionate care while
                helping individuals achieve healthier and happier lives.
              </Text>
            </View>

            <View style={styles.mvCard}>
              <View style={styles.mvIcon}>
                <Ionicons name="eye-outline" size={24} color={GREEN} />
              </View>
              <Text style={styles.mvTitle}>Vision</Text>
              <View style={styles.goldLine} />
              <Text style={styles.mvText}>
                To become one of the most trusted wellness centers by promoting
                preventive healthcare, natural healing, and holistic wellness for
                individuals and families.
              </Text>
            </View>
          </ImageBackground>
        </View>

        {/* PROMISE */}
        <View style={styles.promiseWrap}>
          <View style={styles.promiseIcon}>
            <Ionicons name="heart" size={23} color={GOLD} />
          </View>
          <Text style={styles.promiseEyebrow}>OUR PROMISE</Text>
          <Text style={styles.promiseTitle}>Every Patient Matters.</Text>
          <Text style={styles.promiseText}>
            Every patient is treated with respect, compassion and individual attention.
            We are committed to honest guidance, personalized care and natural wellness
            solutions that support your journey toward better health.
          </Text>
        </View>

        {/* FOUNDER */}
        <Animated.View style={[styles.founderSection, rise(founderAnim, 24)]}>
          <Text style={styles.founderEyebrow}>FOUNDERS MESSAGE</Text>
          <Text style={styles.founderHeadline}>Healing Is a Responsibility</Text>

          <View style={styles.founderProfile}>
            <View style={styles.founderImageRing}>
              <Image
                source={require("../assets/images/doctors/Dr-murali.png")}
                style={styles.founderImage}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.founderName}>Dr. N. G. Muraleedhara</Text>
              <Text style={styles.founderRole}>Founder, NeoLife Wellness Center</Text>
            </View>
          </View>

          <Text style={styles.founderText}>
            “Healing has always been more than a profession to us—it is a responsibility.
            At Neolife Wellness Center, we believe that treating patients is not merely
            a business; it is a service to humanity. Every person who walks through our
            doors deserves compassion, honest guidance, and personalized care.
          </Text>

          <Text style={styles.founderText}>
            Our greatest reward is seeing our patients regain their health, confidence,
            and quality of life. We are committed to serving with integrity, empathy,
            and dedication, always placing the well-being of our patients at the heart
            of everything we do.”
          </Text>

          <View style={styles.quoteBox}>
            <Text style={styles.quoteMark}>“</Text>
            <Text style={styles.quoteText}>
              Treating patients is not just about earning a livelihood; it is about
              serving people with compassion, honesty, and dedication. When our patients
              heal, we feel we have fulfilled our purpose.
            </Text>
            <Text style={styles.quoteAuthor}>
              — Dr. N. G. Muraleedhara, Founder
            </Text>
          </View>
        </Animated.View>

        {/* FINAL CTA */}
        <View style={styles.finalCta}>
          <View style={styles.finalCtaIcon}>
            <Ionicons name="leaf" size={23} color={GOLD} />
          </View>

          <Text style={styles.finalCtaTitle}>
            Your Better Health Journey Can Start Today.
          </Text>

          <Text style={styles.finalCtaText}>
            Speak with our wellness team and discover a personalized path toward
            better health, balance and confidence.
          </Text>

          <TouchableOpacity
            style={styles.finalButton}
            onPress={() => router.push("/consultation" as any)}
          >
            <Text style={styles.finalButtonText}>Book Consultation</Text>
            <Ionicons name="arrow-forward" size={17} color={GREEN} />
          </TouchableOpacity>
        </View>

        {/* CONTACT / FOOTER */}
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
            onPress={() => openURL("tel:+919481489866")}
          >
            <Ionicons name="call-outline" size={17} color={GOLD} />
            <Text style={styles.footerText}>+91 94814 89866</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerRow}
            onPress={() => openURL("mailto:neelavar.murali@gmail.com")}
          >
            <Ionicons name="mail-outline" size={17} color={GOLD} />
            <Text style={styles.footerText}>neelavar.murali@gmail.com</Text>
          </TouchableOpacity>

          <Text style={styles.footerAddress}>
            4-1-38, Behind Lions Bhavan Road, Nairkere 1st Cross, Brahmagiri,
            Ambalapady Post, Udupi – 576103, Karnataka, India
          </Text>

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
              onPress={() => openURL("https://wa.me/919481489866")}
            />
          </View>

          <Text style={styles.copyright}>
            © 2026 NeoLife Wellness Center. All Rights Reserved.
          </Text>
        </View>
      </ScrollView>

      {/* WHATSAPP */}
      <TouchableOpacity
        style={styles.whatsapp}
        onPress={() =>
          openURL(
            "https://wa.me/919481489866?text=Hello%20NeoLife%20Wellness%20Center,%20I%20need%20help."
          )
        }
      >
        <Ionicons name="logo-whatsapp" size={28} color={WHITE} />
      </TouchableOpacity>

      <PatientDrawer
  visible={menuOpen}
  onClose={() => setMenuOpen(false)}
  activeRoute="/about"
/>
    </View>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
  light = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  light?: boolean;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={[styles.eyebrow, light && { color: GOLD_LIGHT }]}>
        {eyebrow}
      </Text>

      <Text style={[styles.sectionTitle, light && { color: WHITE }]}>
        {title}
      </Text>

      <Text style={[styles.sectionLead, light && { color: "#DCE8E1" }]}>
        {text}
      </Text>
    </View>
  );
}

function TrustMini({
  icon,
  title,
  text,
}: {
  icon: any;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.trustMini}>
      <View style={styles.trustMiniIcon}>
        <Ionicons name={icon} size={20} color={GREEN} />
      </View>
      <Text style={styles.trustMiniTitle}>{title}</Text>
      <Text style={styles.trustMiniText}>{text}</Text>
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

  scroll: {
    paddingBottom: 0,
  },

  

  hero: {
    minHeight: 590,
    justifyContent: "flex-end",
  },

  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,34,24,.68)",
  },

  heroGlow: {
    position: "absolute",
    width: 310,
    height: 310,
    right: -120,
    bottom: -80,
    borderRadius: 155,
    backgroundColor: "rgba(214,180,91,.16)",
  },

  heroContent: {
    paddingHorizontal: 22,
    paddingBottom: 72,
  },

  heroBadge: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,.11)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.18)",
  },

  heroBadgeText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 9,
    letterSpacing: 1,
  },

  heroTitle: {
    marginTop: 19,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 49,
    lineHeight: 52,
    letterSpacing: -1,
  },

  heroTitleAccent: {
    color: GOLD_LIGHT,
  },

  heroSubtitle: {
    marginTop: 10,
    fontFamily: "DMSans_700Bold",
    color: GOLD,
    fontSize: 18,
  },

  heroText: {
    marginTop: 13,
    maxWidth: 390,
    fontFamily: "DMSans_400Regular",
    color: "#E7F0EA",
    fontSize: 14,
    lineHeight: 22,
  },

  heroActions: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  heroPrimary: {
    minHeight: 49,
    paddingHorizontal: 17,
    borderRadius: 16,
    backgroundColor: GOLD,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  heroPrimaryText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 12,
  },

  heroSecondary: {
    minHeight: 49,
    paddingHorizontal: 17,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.40)",
    backgroundColor: "rgba(255,255,255,.08)",
    justifyContent: "center",
  },

  heroSecondaryText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 12,
  },

  trustStrip: {
    marginTop: -28,
    marginHorizontal: 15,
    padding: 10,
    borderRadius: 23,
    backgroundColor: WHITE,
    flexDirection: "row",
    elevation: 7,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },

  trustMini: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
  },

  trustMiniIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  trustMiniTitle: {
    marginTop: 6,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  trustMiniText: {
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    textAlign: "center",
  },

  section: {
    paddingVertical: 66,
    paddingHorizontal: 17,
    backgroundColor: CREAM,
  },

  sectionHeading: {
    marginBottom: 24,
  },

  eyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 10,
    letterSpacing: 1.7,
  },

  sectionTitle: {
    marginTop: 8,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 31,
    lineHeight: 36,
    letterSpacing: -0.6,
  },

  sectionLead: {
    marginTop: 9,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 13,
    lineHeight: 21,
  },

  aboutImageWrap: {
    position: "relative",
    marginTop: 8,
    marginBottom: 26,
  },

  aboutImage: {
    width: "100%",
    height: 310,
    borderRadius: 27,
    resizeMode: "cover",
  },

  imageBadge: {
    position: "absolute",
    left: 15,
    right: 15,
    bottom: 15,
    minHeight: 50,
    paddingHorizontal: 13,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,.93)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  imageBadgeText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  bodyText: {
    marginBottom: 15,
    fontFamily: "DMSans_400Regular",
    color: "#56645C",
    fontSize: 14,
    lineHeight: 23,
  },

  philosophyCard: {
    marginTop: 18,
    padding: 23,
    borderRadius: 25,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  philosophyIcon: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },

  philosophyKicker: {
    marginTop: 16,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    letterSpacing: 1.3,
  },

  philosophyTitle: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 25,
  },

  philosophyText: {
    marginTop: 9,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 13,
    lineHeight: 21,
  },

  tourSection: {
    paddingVertical: 66,
    paddingHorizontal: 17,
    backgroundColor: GREEN,
  },

  videoCard: {
    overflow: "hidden",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(214,180,91,.35)",
    backgroundColor: "#071D15",
  },

  video: {
    width: "100%",
    height: 235,
  },

  whyGrid: {
    gap: 12,
  },

  whyCard: {
    padding: 21,
    borderRadius: 23,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  whyCardAlt: {
    backgroundColor: "#F8FBF9",
  },

  whyIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },

  whyTitle: {
    marginTop: 14,
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 16,
    lineHeight: 21,
  },

  whyText: {
    marginTop: 7,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
  },

  serviceGrid: {
    gap: 10,
  },

  serviceCard: {
    minHeight: 72,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
  },

  serviceNumber: {
    width: 31,
  },

  serviceNumberText: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#C9B477",
    fontSize: 12,
  },

  serviceIcon: {
    width: 43,
    height: 43,
    marginRight: 12,
    borderRadius: 14,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  serviceText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 12,
  },

  mvSection: {
    paddingVertical: 30,
    paddingHorizontal: 16,
    backgroundColor: CREAM,
  },

  mvBackground: {
    overflow: "hidden",
    borderRadius: 29,
    padding: 20,
  },

  mvImage: {
    borderRadius: 29,
  },

  mvShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,42,29,.85)",
  },

  mvIntro: {
    marginBottom: 22,
  },

  mvEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 10,
    letterSpacing: 1.6,
  },

  mvMainTitle: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 34,
  },

  mvCard: {
    marginBottom: 13,
    padding: 21,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.15)",
  },

  mvIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,.88)",
    alignItems: "center",
    justifyContent: "center",
  },

  mvTitle: {
    marginTop: 14,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 27,
  },

  goldLine: {
    width: 43,
    height: 2,
    marginTop: 11,
    marginBottom: 13,
    backgroundColor: GOLD,
  },

  mvText: {
    fontFamily: "DMSans_400Regular",
    color: "#E4EEE8",
    fontSize: 13,
    lineHeight: 21,
  },

  promiseWrap: {
    marginTop: 43,
    marginHorizontal: 16,
    padding: 25,
    borderRadius: 27,
    backgroundColor: GREEN,
  },

  promiseIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  promiseEyebrow: {
    marginTop: 15,
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 9,
    letterSpacing: 1.4,
  },

  promiseTitle: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 28,
  },

  promiseText: {
    marginTop: 9,
    fontFamily: "DMSans_400Regular",
    color: "#D6E3DB",
    fontSize: 13,
    lineHeight: 21,
  },

  founderSection: {
    marginTop: 58,
    paddingHorizontal: 17,
  },

  founderEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 10,
    letterSpacing: 1.5,
  },

  founderHeadline: {
    marginTop: 8,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 31,
    lineHeight: 36,
  },

  founderProfile: {
    marginTop: 22,
    padding: 16,
    borderRadius: 22,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },

  founderImageRing: {
    width: 91,
    height: 91,
    marginRight: 14,
    borderRadius: 46,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  founderImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
    resizeMode: "cover",
  },

  founderName: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 19,
  },

  founderRole: {
    marginTop: 5,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 10,
  },

  founderText: {
    marginTop: 18,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 13,
    lineHeight: 22,
  },

  quoteBox: {
    marginTop: 23,
    padding: 22,
    borderRadius: 22,
    backgroundColor: "#F5EDDA",
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
  },

  quoteMark: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GOLD,
    fontSize: 52,
    lineHeight: 45,
  },

  quoteText: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    color: GREEN,
    fontSize: 17,
    lineHeight: 27,
  },

  quoteAuthor: {
    marginTop: 14,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 10,
  },

  finalCta: {
    marginTop: 65,
    marginHorizontal: 16,
    padding: 28,
    borderRadius: 29,
    backgroundColor: GREEN,
    alignItems: "center",
  },

  finalCtaIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  finalCtaTitle: {
    marginTop: 16,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    textAlign: "center",
    fontSize: 27,
    lineHeight: 32,
  },

  finalCtaText: {
    marginTop: 9,
    fontFamily: "DMSans_400Regular",
    color: "#D3E1D8",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
  },

  finalButton: {
    marginTop: 20,
    minHeight: 49,
    paddingHorizontal: 21,
    borderRadius: 16,
    backgroundColor: GOLD,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  finalButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 12,
  },

  footer: {
    marginTop: 58,
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
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 20,
  },

  footerTagline: {
    marginTop: 8,
    maxWidth: 420,
    fontFamily: "DMSans_400Regular",
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
    fontFamily: "DMSans_500Medium",
    color: "#E1EAE4",
    fontSize: 12,
  },

  footerAddress: {
    marginTop: 15,
    maxWidth: 390,
    fontFamily: "DMSans_400Regular",
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
    backgroundColor: "rgba(255,255,255,.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  copyright: {
    marginTop: 25,
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
    backgroundColor: "#20C764",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    zIndex: 100,
  },
});
