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
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import PatientDrawer from "../../components/PatientDrawer";
import PatientHeader from "../../components/PatientHeader";

const GREEN = "#0B3D2E";
const GREEN_2 = "#155741";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_DARK = "#B78D2B";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const MUTED = "#738179";
const BORDER = "#E8E2D3";

type Therapy = {
  id: string;
  title: string;
  short: string;
  icon: any;
  image: any;
  accent: string;
  focus: string;
  routeTitle: string;
};

const therapies: Therapy[] = [
  {
    id: "ayurveda",
    title: "Ayurveda & Panchakarma",
    short:
      "Reconnect with your body's natural balance through personalized Ayurvedic care and traditional Panchakarma therapies.",
    icon: "leaf-outline",
    image: require("../../assets/images/ayurvedapancha.png"),
    accent: "#F4F1E8",
    focus: "Detox • Rejuvenate",
    routeTitle: "Panchakarma",
  },
  {
    id: "acupuncture",
    title: "Acupuncture",
    short:
      "A focused supportive therapy for pain management, muscle relaxation, circulation and overall body balance.",
    icon: "pulse-outline",
    image: require("../../assets/images/accupunture.png"),
    accent: "#EEF6F8",
    focus: "Pain • Stress • Balance",
    routeTitle: "Acupuncture",
  },
  {
    id: "yoga",
    title: "Yoga Therapy",
    short:
      "Build flexibility, strength and calm through guided movement, breathing and relaxation practices.",
    icon: "body-outline",
    image: require("../../assets/images/yoga.jpg"),
    accent: "#F2F1FA",
    focus: "Move • Breathe • Relax",
    routeTitle: "Yoga",
  },
  {
    id: "naturopathy",
    title: "Naturopathy",
    short:
      "Support your body's natural healing ability through lifestyle guidance, diet support and gentle natural therapies.",
    icon: "flower-outline",
    image: require("../../assets/images/yoga.jpg"),
    accent: "#F4F7E8",
    focus: "Nature • Lifestyle • Healing",
    routeTitle: "Naturopathy",
  },
  {
    id: "chiropractic",
    title: "Chiropractic Therapy",
    short:
      "Support better movement, posture and joint mobility through gentle manual care focused on the musculoskeletal system.",
    icon: "fitness-outline",
    image: require("../../assets/images/chiropractic.jpg"),
    accent: "#F7EFEA",
    focus: "Posture • Mobility • Alignment",
    routeTitle: "Chiropractic",
  },
];

export default function TherapiesScreen() {
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

  const cardAnims = useMemo(
    () => therapies.map(() => new Animated.Value(0)),
    []
  );

  useEffect(() => {
    Animated.stagger(
      90,
      cardAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  function openTherapy(title: string) {
    router.push({
      pathname: "/therapy-details",
      params: { title },
    } as any);
  }

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <PatientHeader onMenuPress={() => setMenuOpen(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* SIMPLE INTRO */}
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>OUR THERAPIES</Text>

          <Text style={styles.pageTitle}>
            Natural care for{"\n"}better wellbeing
          </Text>

          <Text style={styles.pageText}>
            Explore NeoLife therapies designed to support movement, balance,
            relaxation and long-term wellness.
          </Text>
        </View>

        {/* IMAGE CARDS - SAME VISUAL STYLE AS BEAUTY & COSMETICS */}
        <View style={styles.cards}>
          {therapies.map((therapy, index) => {
            const anim = cardAnims[index];

            return (
              <Animated.View
                key={therapy.id}
                style={{
                  opacity: anim,
                  transform: [
                    {
                      translateY: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [24, 0],
                      }),
                    },
                    {
                      scale: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.therapyCard}
                  onPress={() => openTherapy(therapy.routeTitle)}
                >
                  <ImageBackground
                    source={therapy.image}
                    style={styles.therapyImage}
                    imageStyle={styles.therapyImageStyle}
                    resizeMode="cover"
                  >
                    <View style={styles.overlayTop} />
                    <View style={styles.overlayBottom} />

                    {/* TOP ROW */}
                    <View style={styles.cardTop}>
                      <View
                        style={[
                          styles.iconBox,
                          { backgroundColor: therapy.accent },
                        ]}
                      >
                        <Ionicons
                          name={therapy.icon}
                          size={27}
                          color={GREEN}
                        />
                      </View>

                      <View style={styles.focusPill}>
                        <Ionicons
                          name="leaf-outline"
                          size={13}
                          color={WHITE}
                        />

                        <Text style={styles.focusText}>
                          {therapy.focus}
                        </Text>
                      </View>
                    </View>

                    {/* BOTTOM COPY */}
                    <View style={styles.cardBottom}>
                      <Text style={styles.therapyTitle}>
                        {therapy.title}
                      </Text>

                      <Text style={styles.therapyShort}>
                        {therapy.short}
                      </Text>

                      <View style={styles.discoverRow}>
                        <Text style={styles.discoverText}>
                          Discover the therapy
                        </Text>

                        <Ionicons
                          name="arrow-forward"
                          size={19}
                          color={GOLD_LIGHT}
                        />
                      </View>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* SIMPLE BOTTOM NOTE */}
        <View style={styles.bottomNote}>
          <View style={styles.bottomIcon}>
            <Ionicons
              name="heart-outline"
              size={22}
              color={GREEN}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.bottomTitle}>
              Personalized wellness support
            </Text>

            <Text style={styles.bottomText}>
              Therapy recommendations can be planned according to your health
              concerns, comfort and wellness goals.
            </Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      <PatientDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeRoute="/therapies"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },

  scrollContent: {
    paddingBottom: 4,
  },

  intro: {
    paddingHorizontal: 20,
    paddingTop: 27,
    paddingBottom: 20,
  },

  eyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    letterSpacing: 1.5,
  },

  pageTitle: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: -0.5,
  },

  pageText: {
    marginTop: 9,
    maxWidth: 380,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
  },

  cards: {
    paddingHorizontal: 16,
    gap: 16,
  },

  therapyCard: {
    height: 460,
    borderRadius: 29,
    overflow: "hidden",
    backgroundColor: GREEN,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 4,
    shadowColor: GREEN,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.09,
    shadowRadius: 11,
  },

  therapyImage: {
    flex: 1,
    justifyContent: "space-between",
  },

  therapyImageStyle: {
    borderRadius: 28,
  },

  overlayTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,32,22,0.12)",
  },

  overlayBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "62%",
    backgroundColor: "rgba(3,29,20,0.58)",
  },

  cardTop: {
    paddingTop: 22,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
  },

  focusPill: {
    maxWidth: 180,
    minHeight: 47,
    paddingHorizontal: 13,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(5,69,50,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  focusText: {
    flexShrink: 1,
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 8,
    lineHeight: 12,
  },

  cardBottom: {
    paddingHorizontal: 21,
    paddingBottom: 23,
  },

  therapyTitle: {
    maxWidth: 390,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 32,
    lineHeight: 37,
    letterSpacing: -0.5,
  },

  therapyShort: {
    marginTop: 9,
    maxWidth: 390,
    fontFamily: "DMSans_400Regular",
    color: "#F1F4F2",
    fontSize: 12,
    lineHeight: 19,
  },

  discoverRow: {
    marginTop: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  discoverText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 11,
  },

  bottomNote: {
    marginTop: 24,
    marginHorizontal: 16,
    padding: 15,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MINT,
    borderWidth: 1,
    borderColor: "#D8E7DE",
  },

  bottomIcon: {
    width: 45,
    height: 45,
    marginRight: 11,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  bottomTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  bottomText: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: GREEN_2,
    fontSize: 8,
    lineHeight: 13,
  },
});
