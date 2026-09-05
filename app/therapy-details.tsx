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
import { router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  ImageBackground,
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

type InfoCard = {
  icon: any;
  title: string;
  text: string;
};

type TherapyData = {
  key: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  heroImage: any;
  video: any;
  overviewTitle: string;
  overviewLead: string;
  overviewCards: InfoCard[];
  featureTitle: string;
  featureLead?: string;
  features: InfoCard[];
  extraTitle?: string;
  extraLead?: string;
  extraCards?: InfoCard[];
  processTitle?: string;
  process: InfoCard[];
  highlightTitle: string;
  highlightText: string;
  ctaTitle: string;
  ctaText: string;
};

const PANCHAKARMA: TherapyData = {
  key: "Panchakarma",
  eyebrow: "NEOLIFE WELLNESS THERAPY",
  title: "Ayurveda Panchakarma Therapies",
  subtitle: "Detoxification & Rejuvenation for Holistic Wellness",
  heroImage: require("../assets/images/ayurvedapancha.png"),
  video: require("../assets/videos/panchakarma.mp4"),

  overviewTitle: "Detoxification & Rejuvenation for Holistic Wellness",
  overviewLead:
    "Discover the ancient detoxification and rejuvenation system for holistic wellness. Rebalance your mind, body, and spirit.",
  overviewCards: [
    {
      icon: "leaf-outline",
      title: "What is Panchakarma?",
      text:
        "Panchakarma, meaning “five actions” in Sanskrit, is Ayurveda’s core detoxification therapy. It uses five therapeutic procedures to eliminate toxins and restore balance to the doshas.",
    },
    {
      icon: "flask-outline",
      title: "The Science of Ama",
      text:
        "Ama is described in Ayurveda as a toxic residue that can form due to incomplete digestion and sluggish metabolism. Panchakarma aims to support cleansing and restore balance.",
    },
  ],

  featureTitle: "Preparing for Panchakarma: Purvakarma",
  featureLead:
    "Before the main cleansing procedures, the body is carefully prepared through traditional Ayurvedic therapies.",
  features: [
    {
      icon: "water-outline",
      title: "Oleation",
      text:
        "Internal or external use of therapeutic oils is traditionally used to help prepare the body for cleansing.",
    },
    {
      icon: "thermometer-outline",
      title: "Fomentation",
      text:
        "Therapeutic heat and steam may be used after oleation to support relaxation and preparation.",
    },
  ],

  extraTitle: "The Five Core Panchakarma Therapies",
  extraLead:
    "The appropriate therapy is selected only after professional Ayurvedic assessment.",
  extraCards: [
    {
      icon: "leaf-outline",
      title: "Vamana",
      text: "A classical Ayurvedic cleansing procedure selected for suitable individuals.",
    },
    {
      icon: "water-outline",
      title: "Virechana",
      text: "A traditional purgation-based cleansing approach used under professional supervision.",
    },
    {
      icon: "medical-outline",
      title: "Basti",
      text: "A classical medicated enema therapy considered important in Ayurvedic Panchakarma.",
    },
    {
      icon: "nose-outline",
      title: "Nasya",
      text: "Administration of prescribed herbal preparations through the nasal route.",
    },
    {
      icon: "fitness-outline",
      title: "Raktamokshana",
      text: "A traditional blood-letting procedure used selectively under qualified professional guidance.",
    },
  ],

  processTitle: "How Panchakarma Works",
  process: [
    {
      icon: "sparkles-outline",
      title: "Purvakarma",
      text: "The preparation stage using therapies such as oleation and fomentation.",
    },
    {
      icon: "leaf-outline",
      title: "Pradhanakarma",
      text: "The main cleansing procedure chosen according to your Ayurvedic assessment.",
    },
    {
      icon: "heart-outline",
      title: "Paschatkarma",
      text: "Post-treatment diet, rest and lifestyle guidance designed to support recovery.",
    },
  ],

  highlightTitle: "Modern Panchakarma at NeoLife Wellness Center",
  highlightText:
    "Your Panchakarma journey is planned according to your constitution, wellness goals and professional assessment. Therapy selection and duration vary from person to person.",
  ctaTitle: "Begin Your Path to Wellness Today",
  ctaText:
    "Talk to our wellness team and understand which Ayurvedic therapy may be suitable for your needs.",
};

const ACUPUNCTURE: TherapyData = {
  key: "Acupuncture",
  eyebrow: "NEOLIFE WELLNESS THERAPY",
  title: "Acupuncture Therapy",
  subtitle: "Ancient Wisdom Meets Modern Healing",
  heroImage: require("../assets/images/accupunture.png"),
  video: require("../assets/videos/acupuncture.mp4"),

  overviewTitle: "Ancient Wisdom Meets Modern Healing",
  overviewLead:
    "Discover a timeless path to well-being where traditional healing and modern understanding come together.",
  overviewCards: [
    {
      icon: "locate-outline",
      title: "What Is Acupuncture?",
      text:
        "Acupuncture is a healing therapy originating from Traditional Chinese Medicine. Fine sterile needles are inserted into specific points on the body to support balance and natural healing.",
    },
    {
      icon: "pulse-outline",
      title: "How Does Acupuncture Work?",
      text:
        "Traditionally, acupuncture is used to balance Qi along meridians. Modern explanations also focus on stimulation of nerves, muscles and connective tissues.",
    },
  ],

  featureTitle: "Conditions Commonly Managed",
  featureLead:
    "Acupuncture is commonly explored as a supportive therapy for pain, stiffness, tension and lifestyle-related concerns.",
  features: [
    {
      icon: "body-outline",
      title: "Pain & Mobility",
      text: "Back pain, neck pain, knee discomfort, sciatica, frozen shoulder and muscular stiffness.",
    },
    {
      icon: "happy-outline",
      title: "Stress & Headaches",
      text: "Stress, tension, migraine and headache-related discomfort may be supported through personalized sessions.",
    },
    {
      icon: "fitness-outline",
      title: "Recovery Support",
      text: "May support circulation, muscle relaxation and recovery from activity-related strain.",
    },
  ],

  extraTitle: "Benefits of Acupuncture",
  extraCards: [
    {
      icon: "heart-outline",
      title: "Natural Pain Relief",
      text: "Commonly chosen to support pain management and reduce muscular tension.",
    },
    {
      icon: "pulse-outline",
      title: "Improved Circulation",
      text: "Stimulation of selected points may support healthy circulation and recovery.",
    },
    {
      icon: "shield-checkmark-outline",
      title: "Immune Support",
      text: "A holistic approach aimed at supporting overall physical wellbeing.",
    },
    {
      icon: "leaf-outline",
      title: "Mind-Body Balance",
      text: "Many people experience a deep sense of relaxation during acupuncture sessions.",
    },
  ],

  processTitle: "Safety, Precautions, and What to Expect",
  process: [
    {
      icon: "shield-checkmark-outline",
      title: "Safety & Precautions",
      text:
        "Sessions should be performed by a trained professional using sterile, disposable needles.",
    },
    {
      icon: "medical-outline",
      title: "What to Expect During Treatment",
      text:
        "Fine needles are gently placed at selected points. They may remain in place while you relax comfortably.",
    },
    {
      icon: "person-outline",
      title: "Personalized Guidance",
      text:
        "Point selection, session duration and frequency depend on your condition and professional assessment.",
    },
  ],

  highlightTitle: "Why Choose Acupuncture at NeoLife Wellness Center?",
  highlightText:
    "Our focus is on a comfortable, hygienic and personalized experience with therapy selected according to your wellness goals.",
  ctaTitle: "Begin Your Healing Journey",
  ctaText:
    "Explore whether acupuncture may be a suitable supportive therapy for your pain, stress or mobility concerns.",
};

const CHIROPRACTIC: TherapyData = {
  key: "Chiropractic",
  eyebrow: "NEOLIFE WELLNESS THERAPY",
  title: "Chiropractic Therapy",
  subtitle: "Natural Care for Better Movement, Alignment, and Comfort",
  heroImage: require("../assets/images/chiropractic.jpg"),
  video: require("../assets/videos/chiropractic.mp4"),

  overviewTitle: "Natural Care for Better Movement, Alignment, and Comfort",
  overviewLead:
    "Discover a gentle, non-invasive approach focused on spinal health, posture, mobility and overall physical well-being.",
  overviewCards: [
    {
      icon: "fitness-outline",
      title: "What Is Chiropractic Therapy?",
      text:
        "Chiropractic therapy is a natural and non-invasive system of care focused on the spine, joints, muscles, nerves, posture and overall body movement.",
    },
    {
      icon: "body-outline",
      title: "The Philosophy Behind Chiropractic Care",
      text:
        "Care is planned according to symptoms, physical condition, posture, medical history and movement patterns.",
    },
  ],

  featureTitle: "Concerns Supported by Chiropractic Care",
  features: [
    {
      icon: "walk-outline",
      title: "Spinal Alignment",
      text: "Focused care for spinal movement, posture and body alignment.",
    },
    {
      icon: "body-outline",
      title: "Joint Mobility",
      text: "Supports comfortable movement where joint restriction or stiffness is present.",
    },
    {
      icon: "fitness-outline",
      title: "Muscle Relaxation",
      text: "May support reduction in muscular tension and improve ease of movement.",
    },
    {
      icon: "heart-outline",
      title: "Potential Benefits",
      text: "May support posture, flexibility, mobility and day-to-day physical comfort.",
    },
  ],

  extraTitle: "Core Chiropractic Techniques",
  extraCards: [
    {
      icon: "hand-left-outline",
      title: "Spinal Manipulation",
      text: "Controlled manual techniques may be used where clinically appropriate.",
    },
    {
      icon: "move-outline",
      title: "Joint Mobilisation",
      text: "Gentle mobilisation techniques support comfortable joint movement.",
    },
    {
      icon: "fitness-outline",
      title: "Soft Tissue Techniques",
      text: "Manual soft-tissue work may be used to help reduce tension.",
    },
    {
      icon: "body-outline",
      title: "Posture Correction",
      text: "Practical guidance may help improve body mechanics and posture awareness.",
    },
    {
      icon: "walk-outline",
      title: "Stretching & Movement Guidance",
      text: "Simple movements and stretches may be recommended to support progress.",
    },
  ],

  processTitle: "What Happens During a Chiropractic Session?",
  process: [
    {
      icon: "clipboard-outline",
      title: "Health Assessment",
      text: "Your symptoms, health history and physical concerns are reviewed.",
    },
    {
      icon: "body-outline",
      title: "Posture and Movement Check",
      text: "Posture, spinal movement, muscle tension and joint mobility are assessed.",
    },
    {
      icon: "person-outline",
      title: "Personalized Care",
      text: "Suitable manual techniques are selected according to your individual assessment.",
    },
    {
      icon: "arrow-forward-outline",
      title: "Follow-Up Guidance",
      text: "Movement, posture and lifestyle advice may be provided to support progress.",
    },
  ],

  highlightTitle: "Chiropractic Therapy at NeoLife Wellness Center",
  highlightText:
    "Our approach emphasizes personalized assessment, comfortable care and practical guidance to support better movement and daily function.",
  ctaTitle: "Improve Your Movement and Comfort",
  ctaText:
    "Speak with our wellness team to understand whether chiropractic care may be suitable for your mobility or posture concerns.",
};

const YOGA_NATUROPATHY: TherapyData = {
  key: "YogaNaturopathy",
  eyebrow: "NEOLIFE WELLNESS THERAPY",
  title: "Yoga and Naturopathy",
  subtitle: "Natural Healing for Body, Mind, and Soul",
  heroImage: require("../assets/images/yoga.jpg"),
  video: require("../assets/videos/yoga-naturopathy.mp4"),

  overviewTitle: "Natural Healing for Body, Mind, and Soul",
  overviewLead:
    "Discover the profound benefits of ancient wisdom combined with modern holistic health practices.",
  overviewCards: [
    {
      icon: "body-outline",
      title: "Yoga's Eight Limbs",
      text:
        "Yoga aims to unite body, mind and awareness through Ashtanga Yoga's eight transformative steps.",
    },
    {
      icon: "flower-outline",
      title: "Naturopathy's Elemental Harmony",
      text:
        "Naturopathy encourages living in harmony with the five great elements: earth, water, fire, air and ether.",
    },
    {
      icon: "heart-outline",
      title: "Shared Holistic Philosophy",
      text:
        "Both systems emphasize prevention, self-healing, lifestyle balance and connection with nature.",
    },
  ],

  featureTitle: "Core Naturopathic Treatments",
  features: [
    {
      icon: "water-outline",
      title: "Hydrotherapy",
      text: "Therapeutic use of water may support circulation, relaxation and natural wellbeing.",
    },
    {
      icon: "earth-outline",
      title: "Mud Therapy",
      text: "Mud packs and applications are traditionally used as part of naturopathic wellness care.",
    },
    {
      icon: "sunny-outline",
      title: "Sun & Colour Therapy",
      text: "Natural light and colour-based practices may be included within a holistic wellness plan.",
    },
    {
      icon: "leaf-outline",
      title: "Other Therapies",
      text: "Diet, massage, fasting and lifestyle practices may be recommended where appropriate.",
    },
  ],

  extraTitle: "Yoga Practices for Healing",
  extraCards: [
    {
      icon: "body-outline",
      title: "Yogic Asanas",
      text: "Guided postures support flexibility, strength, posture and movement awareness.",
    },
    {
      icon: "cloud-outline",
      title: "Pranayama",
      text: "Breathing practices help cultivate breath awareness, relaxation and calm.",
    },
    {
      icon: "eye-outline",
      title: "Meditation & Dharana",
      text: "Meditation and concentration practices support mental balance and mindfulness.",
    },
    {
      icon: "heart-outline",
      title: "Health Support",
      text: "Yoga may be personalized to suit age, ability and individual wellness goals.",
    },
  ],

  processTitle: "Modern Clinical Protocols",
  process: [
    {
      icon: "clipboard-outline",
      title: "Assessment",
      text: "Your lifestyle, health goals, mobility, diet and daily routine are reviewed.",
    },
    {
      icon: "nutrition-outline",
      title: "Diet & Lifestyle",
      text: "Natural nutrition and lifestyle guidance form an important part of naturopathic care.",
    },
    {
      icon: "body-outline",
      title: "Personalized Yoga",
      text: "Suitable postures, breathing practices and relaxation methods are selected.",
    },
    {
      icon: "leaf-outline",
      title: "Natural Therapy Plan",
      text: "A combination of appropriate natural therapies may be planned according to your needs.",
    },
  ],

  highlightTitle: "Yoga & Naturopathy at NeoLife Wellness Center",
  highlightText:
    "We combine guided movement, breathing, lifestyle practices and natural therapies to support a balanced approach to physical and mental wellbeing.",
  ctaTitle: "Begin Your Wellness Journey",
  ctaText:
    "Discover a personalized Yoga and Naturopathy approach designed around your lifestyle and wellness goals.",
};

const therapies: Record<string, TherapyData> = {
  Panchakarma: PANCHAKARMA,
  "Ayurveda & Panchakarma": PANCHAKARMA,
  "Ayurveda Panchakarma Therapies": PANCHAKARMA,
  Acupuncture: ACUPUNCTURE,
  "Acupuncture Therapy": ACUPUNCTURE,
  Chiropractic: CHIROPRACTIC,
  "Chiropractic Therapy": CHIROPRACTIC,
  Yoga: YOGA_NATUROPATHY,
  Naturopathy: YOGA_NATUROPATHY,
  "Yoga Therapy": YOGA_NATUROPATHY,
  "Yoga & Naturopathy": YOGA_NATUROPATHY,
  "Yoga and Naturopathy": YOGA_NATUROPATHY,
};

export default function TherapyDetailsScreen() {
  const { title } = useLocalSearchParams<{ title?: string }>();
  const routeTitle = title?.toString() || "Panchakarma";
  const data = therapies[routeTitle] || PANCHAKARMA;
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
  const contentAnim = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(data.video, (videoPlayer) => {
    videoPlayer.loop = false;
  });

  useEffect(() => {
    heroAnim.setValue(0);
    contentAnim.setValue(0);

    Animated.sequence([
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [data.key]);

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

  const heroIndex = useMemo(() => {
    const keys = ["Panchakarma", "Acupuncture", "YogaNaturopathy", "Chiropractic"];
    const index = keys.indexOf(data.key);
    return index >= 0 ? `0${index + 1}` : "01";
  }, [data.key]);

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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <ImageBackground
          source={data.heroImage}
          style={styles.hero}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay} />
          <View style={styles.heroGlow} />

          <Animated.View style={[styles.heroContent, rise(heroAnim, 26)]}>
            <View style={styles.heroTop}>
              <View style={styles.heroBadge}>
                <Ionicons name="leaf" size={12} color={GOLD_LIGHT} />
                <Text style={styles.heroBadgeText}>{data.eyebrow}</Text>
              </View>

              <Text style={styles.heroIndex}>{heroIndex}</Text>
            </View>

            <Text style={styles.heroTitle}>{data.title}</Text>
            <Text style={styles.heroSubtitle}>{data.subtitle}</Text>

            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push("/consultation" as any)}
              >
                <Ionicons name="calendar-outline" size={17} color={GREEN} />
                <Text style={styles.primaryButtonText}>Book Appointment</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push("/contact" as any)}
              >
                <Ionicons name="call-outline" size={16} color={WHITE} />
                <Text style={styles.secondaryButtonText}>Contact Us</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ImageBackground>

        <Animated.View style={rise(contentAnim, 24)}>
          {/* VIDEO - MATCHES WEBSITE */}
          <View style={styles.section}>
            <Text style={styles.kicker}>THERAPY OVERVIEW</Text>
            <Text style={styles.sectionTitle}>Watch and Understand the Therapy</Text>
            <Text style={styles.sectionLead}>
              Take a closer look at the therapy before exploring how it may support your wellness journey.
            </Text>

            <View style={styles.videoShell}>
              <VideoView
                style={styles.video}
                player={player}
                allowsFullscreen
                allowsPictureInPicture
                nativeControls
              />
            </View>
          </View>

          {/* OVERVIEW */}
          <View style={styles.altSection}>
            <Text style={styles.kicker}>{data.title.toUpperCase()}</Text>
            <Text style={styles.sectionTitle}>{data.overviewTitle}</Text>
            <Text style={styles.sectionLead}>{data.overviewLead}</Text>

            <View style={styles.cardList}>
              {data.overviewCards.map((card) => (
                <InfoCard key={card.title} card={card} />
              ))}
            </View>
          </View>

          {/* FEATURES */}
          <View style={styles.section}>
            <Text style={styles.kicker}>EXPLORE THE THERAPY</Text>
            <Text style={styles.sectionTitle}>{data.featureTitle}</Text>
            {!!data.featureLead && (
              <Text style={styles.sectionLead}>{data.featureLead}</Text>
            )}

            <View style={styles.cardList}>
              {data.features.map((card) => (
                <InfoCard key={card.title} card={card} />
              ))}
            </View>
          </View>

          {/* EXTRA */}
          {!!data.extraCards?.length && (
            <View style={styles.altSection}>
              <Text style={styles.kicker}>THERAPY DETAILS</Text>
              <Text style={styles.sectionTitle}>{data.extraTitle}</Text>
              {!!data.extraLead && (
                <Text style={styles.sectionLead}>{data.extraLead}</Text>
              )}

              <View style={styles.cardList}>
                {data.extraCards.map((card) => (
                  <InfoCard key={card.title} card={card} />
                ))}
              </View>
            </View>
          )}

          {/* PROCESS */}
          <View style={styles.darkSection}>
            <Text style={styles.darkKicker}>YOUR EXPERIENCE</Text>
            <Text style={styles.darkTitle}>{data.processTitle}</Text>

            <View style={styles.steps}>
              {data.process.map((card, index) => (
                <View key={card.title} style={styles.step}>
                  <View style={styles.stepLeft}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>0{index + 1}</Text>
                    </View>

                    {index !== data.process.length - 1 && (
                      <View style={styles.stepLine} />
                    )}
                  </View>

                  <View style={styles.stepContent}>
                    <View style={styles.stepTitleRow}>
                      <Ionicons name={card.icon} size={17} color={GOLD} />
                      <Text style={styles.stepTitle}>{card.title}</Text>
                    </View>

                    <Text style={styles.stepText}>{card.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* HIGHLIGHT */}
          <View style={styles.highlightWrap}>
            <View style={styles.highlightCard}>
              <View style={styles.highlightIcon}>
                <Ionicons name="sparkles-outline" size={22} color={GOLD} />
              </View>

              <Text style={styles.highlightTitle}>{data.highlightTitle}</Text>
              <Text style={styles.highlightText}>{data.highlightText}</Text>
            </View>
          </View>

          {/* CTA - ROUTES TO APP CONSULTATION, NO PAPPYJOE */}
          <View style={styles.cta}>
            <Text style={styles.ctaEyebrow}>TAKE THE NEXT STEP</Text>
            <Text style={styles.ctaTitle}>{data.ctaTitle}</Text>
            <Text style={styles.ctaText}>{data.ctaText}</Text>

            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push("/consultation" as any)}
            >
              <Ionicons name="calendar-outline" size={17} color={GREEN} />
              <Text style={styles.ctaButtonText}>Book Appointment</Text>
              <Ionicons name="arrow-forward" size={16} color={GREEN} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactLink}
              onPress={() => router.push("/contact" as any)}
            >
              <Ionicons name="call-outline" size={16} color={WHITE} />
              <Text style={styles.contactLinkText}>Contact NeoLife</Text>
            </TouchableOpacity>
          </View>

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

            <Text style={styles.copyright}>
              © 2026 NeoLife Wellness Center. All Rights Reserved.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
      <PatientDrawer
  visible={menuOpen}
  onClose={() => setMenuOpen(false)}
  activeRoute="/therapies"
/>
    </View>
  );
}

function InfoCard({ card }: { card: InfoCard }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>
        <Ionicons name={card.icon} size={21} color={GREEN} />
      </View>

      <Text style={styles.infoTitle}>{card.title}</Text>
      <Text style={styles.infoText}>{card.text}</Text>
    </View>
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

  
  hero: {
    minHeight: 515,
    justifyContent: "flex-end",
  },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,34,24,.72)",
  },

  heroGlow: {
    position: "absolute",
    right: -95,
    bottom: -105,
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: "rgba(214,180,91,.18)",
  },

  heroContent: {
    padding: 22,
    paddingBottom: 48,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroBadge: {
    maxWidth: "80%",
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,.11)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.18)",
  },

  heroBadgeText: {
    flexShrink: 1,
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 8,
    letterSpacing: 1,
  },

  heroIndex: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: "rgba(255,255,255,.28)",
    fontSize: 28,
  },

  heroTitle: {
    marginTop: 23,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 39,
    lineHeight: 43,
    letterSpacing: -0.7,
  },

  heroSubtitle: {
    marginTop: 12,
    maxWidth: 390,
    fontFamily: "DMSans_500Medium",
    color: "#DDE9E1",
    fontSize: 14,
    lineHeight: 21,
  },

  heroActions: {
    marginTop: 23,
    flexDirection: "row",
    gap: 9,
  },

  primaryButton: {
    flex: 1,
    minHeight: 49,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: GOLD,
  },

  primaryButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  secondaryButton: {
    minHeight: 49,
    paddingHorizontal: 14,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.4)",
    backgroundColor: "rgba(255,255,255,.08)",
  },

  secondaryButtonText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 10,
  },

  section: {
    paddingVertical: 46,
    paddingHorizontal: 16,
  },

  altSection: {
    paddingVertical: 46,
    paddingHorizontal: 16,
    backgroundColor: "#F1EEE4",
  },

  kicker: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    letterSpacing: 1.4,
  },

  sectionTitle: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 29,
    lineHeight: 34,
  },

  sectionLead: {
    marginTop: 9,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 12,
    lineHeight: 20,
  },

  videoShell: {
    marginTop: 22,
    padding: 7,
    borderRadius: 23,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E7D7AF",
    elevation: 5,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },

  video: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 17,
    backgroundColor: "#07170E",
  },

  cardList: {
    marginTop: 22,
    gap: 12,
  },

  infoCard: {
    padding: 20,
    borderRadius: 23,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 2,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },

  infoIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  infoTitle: {
    marginTop: 13,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 20,
    lineHeight: 25,
  },

  infoText: {
    marginTop: 7,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 12,
    lineHeight: 20,
  },

  darkSection: {
    paddingVertical: 49,
    paddingHorizontal: 16,
    backgroundColor: GREEN,
  },

  darkKicker: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 9,
    letterSpacing: 1.4,
  },

  darkTitle: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 29,
    lineHeight: 34,
  },

  steps: {
    marginTop: 27,
  },

  step: {
    flexDirection: "row",
  },

  stepLeft: {
    width: 48,
    alignItems: "center",
  },

  stepNumber: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },

  stepNumberText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  stepLine: {
    flex: 1,
    width: 1,
    minHeight: 65,
    backgroundColor: "rgba(255,255,255,.18)",
  },

  stepContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 25,
  },

  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  stepTitle: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 13,
  },

  stepText: {
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
    color: "#D0DFD5",
    fontSize: 10,
    lineHeight: 17,
  },

  highlightWrap: {
    paddingTop: 40,
    paddingHorizontal: 16,
  },

  highlightCard: {
    padding: 24,
    borderRadius: 26,
    backgroundColor: "#F5EBD0",
    borderWidth: 1,
    borderColor: "#E5D29E",
  },

  highlightIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  highlightTitle: {
    marginTop: 14,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 23,
    lineHeight: 28,
  },

  highlightText: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    color: "#5F675F",
    fontSize: 12,
    lineHeight: 20,
  },

  cta: {
    marginTop: 42,
    paddingVertical: 44,
    paddingHorizontal: 22,
    alignItems: "center",
    backgroundColor: GREEN_2,
  },

  ctaEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 9,
    letterSpacing: 1.3,
  },

  ctaTitle: {
    marginTop: 9,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 30,
    lineHeight: 35,
    textAlign: "center",
  },

  ctaText: {
    marginTop: 10,
    fontFamily: "DMSans_400Regular",
    color: "#D4E2D9",
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
  },

  ctaButton: {
    marginTop: 21,
    minHeight: 49,
    paddingHorizontal: 18,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: GOLD,
  },

  ctaButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  contactLink: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  contactLinkText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 10,
  },

  footer: {
    paddingTop: 39,
    paddingBottom: 31,
    paddingHorizontal: 22,
    alignItems: "center",
    backgroundColor: "#0A271A",
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
    fontSize: 20,
  },

  footerTagline: {
    marginTop: 8,
    maxWidth: 390,
    fontFamily: "DMSans_400Regular",
    color: "#C6D4CB",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
  },

  copyright: {
    marginTop: 22,
    fontFamily: "DMSans_400Regular",
    color: "#81978A",
    fontSize: 9,
  },
});
