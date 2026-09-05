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
  Image,
  ImageBackground,
  Linking,
  Modal,
  Platform,
  Pressable,
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
const BLUSH = "#F9EFF2";

type DetailBlock = {
  title: string;
  text?: string;
  bullets?: string[];
};

type BeautyTreatment = {
  key: string;
  title: string;
  short: string;
  icon: any;
  image: any;
  accent: string;
  duration: string;
  intro: string;
  blocks: DetailBlock[];
};

const treatments: BeautyTreatment[] = [
  {
    key: "facial",
    title: "Facial Treatments",
    short: "Reveal brighter, smoother-looking skin with personalized facial care created for your unique beauty goals.",
    icon: "sparkles-outline",
    image: require("../assets/images/facial.png"),
    accent: "#F9EFF2",
    duration: "30–75 min",
    intro:
      "Explore targeted facial treatments designed around glow, hydration, skin texture, pigmentation, acne care and rejuvenation.",
    blocks: [
      {
        title: "Anti-Aging Treatment",
        text:
          "Helps reduce fine lines, wrinkles and visible signs of aging while improving skin elasticity and firmness.",
        bullets: [
          "Reduces fine lines and wrinkles",
          "Improves skin elasticity",
          "Supports collagen production",
          "Restores youthful radiance",
          "Duration: 45–60 minutes",
        ],
      },
      {
        title: "Glow Peel",
        text:
          "A personalized peel treatment that gently removes dull skin and reveals a brighter, smoother complexion.",
        bullets: [
          "Brightens dull skin",
          "Improves skin texture",
          "Supports reduction of pigmentation and dark spots",
          "Promotes an even skin tone",
          "Duration: 30–45 minutes",
        ],
      },
      {
        title: "Dark Spot Treatment",
        text:
          "Designed to support the reduction of pigmentation, dark spots and uneven skin tone.",
        bullets: [
          "Helps fade dark spots",
          "Improves uneven skin tone",
          "Enhances skin clarity",
          "Supports smoother skin texture",
          "Duration: 45–60 minutes",
        ],
      },
      {
        title: "Party Facial",
        text:
          "An instant glow and hydration treatment suitable before parties, weddings and special occasions.",
        bullets: [
          "Provides instant hydration",
          "Improves glow and radiance",
          "Refreshes dull skin",
          "Enhances skin smoothness",
          "Duration: 45–60 minutes",
        ],
      },
      {
        title: "Acne Treatment",
        text:
          "A deep-cleansing facial intended for acne-prone and oily skin.",
        bullets: [
          "Helps reduce acne and breakouts",
          "Deep cleanses the pores",
          "Supports oil control",
          "Improves skin texture",
          "Duration: 45–60 minutes",
        ],
      },
      {
        title: "Skin Brightening Facial",
        text:
          "Helps brighten dull skin, improve uneven tone and support a fresh, radiant appearance.",
        bullets: [
          "Improves skin brightness",
          "Reduces dullness and tan",
          "Hydrates and softens skin",
          "Supports an even complexion",
          "Duration: 45–60 minutes",
        ],
      },
      {
        title: "Vitamin C Facial",
        text:
          "An antioxidant-rich facial that supports brighter skin and protects against environmental damage.",
        bullets: [
          "Brightens dull skin",
          "Supports antioxidant protection",
          "Improves uneven skin tone",
          "Promotes natural glow",
          "Duration: 45–60 minutes",
        ],
      },
      {
        title: "Hydra Facial",
        text:
          "A deep-cleansing and intensive hydration treatment designed for dry and dehydrated skin.",
        bullets: [
          "Deeply cleanses the skin",
          "Provides intense hydration",
          "Helps remove impurities",
          "Improves softness and radiance",
          "Duration: 45–60 minutes",
        ],
      },
      {
        title: "AHA Facial",
        text:
          "A gentle exfoliating treatment that helps remove dead skin cells and improve skin freshness.",
        bullets: [
          "Removes dead skin cells",
          "Improves skin texture",
          "Brightens dull skin",
          "Supports an even skin tone",
          "Duration: 30–45 minutes",
        ],
      },
      {
        title: "Illuminating Facial",
        text:
          "A rejuvenating facial designed to improve glow, hydration and skin clarity.",
        bullets: [
          "Provides an instant glow",
          "Improves skin clarity",
          "Supports hydration",
          "Reduces dull appearance",
          "Duration: 45–60 minutes",
        ],
      },
      {
        title: "NeoLife Signature Facial",
        text:
          "A complete rejuvenating and relaxing facial suitable for most skin types.",
        bullets: [
          "Deep cleansing",
          "Nourishes and hydrates skin",
          "Improves skin texture and tone",
          "Promotes relaxation and radiance",
          "Duration: 60–75 minutes",
        ],
      },
    ],
  },
  {
    key: "hair",
    title: "Hair Treatment",
    short:
      "Give your scalp and hair the care they deserve with a deeply nourishing wellness ritual for stronger, healthier-looking hair.",
    icon: "leaf-outline",
    image: require("../assets/images/hair-treatment.png"),
    accent: "#EEF6ED",
    duration: "90–120 min",
    intro:
      "A holistic hair wellness treatment combining traditional Ayurvedic care and acupuncture to nourish the scalp, support circulation and promote healthier-looking hair.",
    blocks: [
      {
        title: "Benefits",
        bullets: [
          "Promotes natural hair growth",
          "Reduces hair fall and thinning",
          "Supports cleaner scalp pores",
          "Strengthens hair roots",
          "Supports soft and healthy hair",
          "Improves blood circulation to the scalp",
          "Relieves stress and supports relaxation",
          "Nourishes the scalp and improves hair quality",
        ],
      },
      {
        title: "Step 1: Herbal Oil Application",
        text:
          "Herbal oil is gently applied to the scalp and followed by a relaxing scalp massage to improve circulation and nourish the roots.",
      },
      {
        title: "Step 2: Steam Therapy",
        text:
          "Steam is given to the hair and scalp to open blocked pores and help the scalp absorb the herbal oils effectively.",
      },
      {
        title: "Step 3: Acupuncture",
        text:
          "Acupuncture is performed to stimulate selected points that support circulation, stress reduction and hair wellness.",
      },
      {
        title: "Step 4: Shirodhara",
        text:
          "Warm herbal liquids are poured continuously over the forehead to calm the nervous system and provide deep relaxation.",
      },
      {
        title: "Step 5: Herbal Hair Pack",
        text:
          "A nourishing herbal hair pack is applied and covered with banana leaves and a hair cap to allow the herbs to penetrate.",
      },
      {
        title: "Step 6: Washing & Kesh Dhoopana",
        text:
          "The hair is washed and Kesh Dhoopana, a traditional herbal fumigation practice, is performed.",
      },
      {
        title: "Suitable For",
        bullets: [
          "Hair fall and thinning hair",
          "Blocked scalp pores",
          "Weak hair roots",
          "Dry and damaged hair",
          "People experiencing stress",
          "People looking for natural hair-growth support",
        ],
      },
    ],
  },
  {
    key: "lip",
    title: "Dark Lip Correction",
    short:
      "Bring back a softer, smoother and naturally brighter-looking lip tone with personalized pigmentation care.",
    icon: "heart-outline",
    image: require("../assets/images/lip.png"),
    accent: "#FCEFF1",
    duration: "45–60 min",
    intro:
      "A gentle cosmetic treatment designed to support reduction of lip pigmentation while improving hydration, softness and natural-looking tone.",
    blocks: [
      {
        title: "Benefits",
        bullets: [
          "Improves uneven lip tone and pigmentation",
          "Helps reduce dark and dull appearance",
          "Deeply hydrates dry lips",
          "Enhances natural lip brightness",
          "Improves lip texture and smoothness",
          "Supports healthy, nourished lips",
          "Gentle and non-invasive care",
        ],
      },
      {
        title: "Suitable For",
        bullets: [
          "Dark or pigmented lips",
          "Dry and rough lips",
          "Uneven lip tone",
          "People looking for naturally brighter-looking lips",
        ],
      },
    ],
  },
  {
    key: "eyebrow",
    title: "Eyebrow Correction",
    short:
      "Wake up to beautifully defined brows with customized shaping techniques designed to complement your face.",
    icon: "eye-outline",
    image: require("../assets/images/eyebrow.png"),
    accent: "#F4F0F8",
    duration: "90–120 min",
    intro:
      "Eyebrow correction treatments enhance shape, fullness and symmetry for a polished, elegant and natural-looking appearance.",
    blocks: [
      {
        title: "Microblading",
        text: "Creates fine hair-like strokes for naturally fuller eyebrows.",
        bullets: ["Natural look", "Hair-stroke effect", "Long-lasting results"],
      },
      {
        title: "Ombre Brows",
        text: "Creates a soft powdered makeup effect with smooth shading.",
        bullets: ["Soft finish", "Fuller brows", "Suitable for all skin types"],
      },
      {
        title: "Combination Brows",
        text:
          "A combination of microblading and shading techniques for improved definition.",
        bullets: ["Natural appearance", "Better definition", "Long-lasting"],
      },
      {
        title: "Eyebrow Reconstruction",
        text: "Restores thin, damaged or uneven eyebrows.",
        bullets: ["Improves symmetry", "Restores shape", "Enhances confidence"],
      },
      {
        title: "Benefits",
        bullets: [
          "Enhances facial features",
          "Creates fuller and defined eyebrows",
          "Provides natural-looking results",
          "Long-lasting effect",
          "Reduces daily makeup time",
          "Suitable for all skin types",
        ],
      },
      {
        title: "Suitable For",
        bullets: [
          "Thin eyebrows",
          "Uneven brows",
          "Sparse eyebrows",
          "People looking for fuller brows",
        ],
      },
    ],
  },
  {
    key: "pedicure",
    title: "Pedicure",
    short:
      "Step out feeling refreshed with complete foot care for softer skin, healthier-looking nails and beautifully groomed feet.",
    icon: "footsteps-outline",
    image: require("../assets/images/pedicure.png"),
    accent: "#F8F2E8",
    duration: "45–60 min",
    intro:
      "A complete foot-care treatment that cleanses, nourishes and rejuvenates the feet while supporting healthy nails and soft, refreshed skin.",
    blocks: [
      {
        title: "Benefits",
        bullets: [
          "Deep cleanses the feet and nails",
          "Removes dead skin and calluses",
          "Softens rough heels and dry skin",
          "Improves blood circulation",
          "Relieves stress and fatigue",
          "Promotes healthy nail growth",
          "Leaves feet soft and refreshed",
        ],
      },
      {
        title: "Step 1: Foot Cleansing",
        text: "The feet are gently washed and cleaned to remove dirt and impurities.",
      },
      {
        title: "Step 2: Warm Water Soak",
        text:
          "The feet are soaked in warm water with cleansing ingredients to soften the skin and relax the muscles.",
      },
      {
        title: "Step 3: Nail Care",
        text: "Nails are trimmed and shaped properly, and the cuticles are cleaned.",
      },
      {
        title: "Step 4: Exfoliation",
        text:
          "Dead skin cells and rough areas are removed using scrubs and foot-care tools.",
      },
      {
        title: "Step 5: Massage",
        text:
          "A relaxing foot massage is performed to improve circulation and relieve stress.",
      },
      {
        title: "Step 6: Moisturizing",
        text:
          "Nourishing creams are applied to hydrate the skin and leave the feet soft and smooth.",
      },
      {
        title: "Suitable For",
        bullets: [
          "Dry and cracked heels",
          "Rough skin and calluses",
          "Tired and stressed feet",
          "People looking for regular foot care",
          "Anyone wanting soft and healthy feet",
        ],
      },
    ],
  },
];

export default function BeautyCosmeticsScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<BeautyTreatment | null>(null);

 
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
  const expertAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useMemo(
    () => treatments.map(() => new Animated.Value(0)),
    []
  );



  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(expertAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(
        110,
        cardAnims.map((v) =>
          Animated.spring(v, {
            toValue: 1,
            friction: 8,
            tension: 55,
            useNativeDriver: true,
          })
        )
      ),
    ]).start();
  }, []);

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

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <PatientHeader
  onMenuPress={() => setMenuOpen(true)}
/>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <ImageBackground
          source={require("../assets/images/facial.png")}
          style={styles.hero}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay} />
          <View style={styles.heroGlow} />

          <Animated.View style={[styles.heroContent, rise(heroAnim, 24)]}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={13} color={GOLD_LIGHT} />
              <Text style={styles.heroBadgeText}>
                BEAUTY • CONFIDENCE • PERSONALIZED CARE
              </Text>
            </View>

            <Text style={styles.heroTitle}>
              Feel Beautiful.{"\n"}
              <Text style={styles.heroAccent}>Feel Confident.</Text>
            </Text>

            <Text style={styles.heroText}>
              Discover personalized beauty care designed to bring out your natural
              glow—from radiant skin and nourished hair to beautifully defined
              brows, lips and complete self-care.
            </Text>

            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => router.push("/consultation" as any)}
            >
              <Text style={styles.heroButtonText}>Discover Your Beauty Care</Text>
              <Ionicons name="arrow-forward" size={17} color={GREEN} />
            </TouchableOpacity>
          </Animated.View>
        </ImageBackground>

        {/* MEET YOUR BEAUTY EXPERT */}
        <Animated.View style={[styles.expertSection, rise(expertAnim, 18)]}>
          <View style={styles.expertCard}>
            <Image
              source={require("../assets/images/Leelavati.png")}
              style={styles.expertImage}
            />

            <View style={styles.expertContent}>
              <View style={styles.expertBadge}>
                <Ionicons name="sparkles-outline" size={12} color={GOLD_DARK} />
                <Text style={styles.expertBadgeText}>MEET YOUR BEAUTY EXPERT</Text>
              </View>

              <Text style={styles.expertName}>Leelavathi M Rao</Text>
              <Text style={styles.expertRole}>Certified Beauty Therapist</Text>

              <View style={styles.expertStats}>
                <MiniStat icon="ribbon-outline" text="5+ Years" />
                <MiniStat icon="sparkles-outline" text="Skin • Hair • Beauty" />
                <MiniStat icon="calendar-outline" text="Mon – Sat" />
              </View>

              <TouchableOpacity
                style={styles.expertButton}
                onPress={() => router.push("/consultation" as any)}
              >
                <Text style={styles.expertButtonText}>Book with Beauty Expert</Text>
                <Ionicons name="arrow-forward" size={15} color={WHITE} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* INTRO */}
        <View style={styles.intro}>
          <Text style={styles.kicker}>YOUR GLOW STARTS HERE</Text>
          <Text style={styles.sectionTitle}>Beauty Care Designed Around You</Text>
          <Text style={styles.sectionLead}>
            Whether you want brighter-looking skin, healthier-looking hair, beautifully
            shaped brows or simply time to care for yourself, explore treatments
            thoughtfully designed around your individual beauty goals.
          </Text>

          <View style={styles.treatmentCount}>
            <Text style={styles.countBig}>5</Text>
            <Text style={styles.countSmall}>ways to elevate your beauty routine</Text>
          </View>

          <View style={styles.promiseRow}>
            <View style={styles.promiseItem}>
              <Ionicons name="heart-outline" size={17} color={GREEN} />
              <Text style={styles.promiseText}>Personalized Care</Text>
            </View>
            <View style={styles.promiseItem}>
              <Ionicons name="sparkles-outline" size={17} color={GREEN} />
              <Text style={styles.promiseText}>Natural-Looking Results</Text>
            </View>
            <View style={styles.promiseItem}>
              <Ionicons name="shield-checkmark-outline" size={17} color={GREEN} />
              <Text style={styles.promiseText}>Professional Guidance</Text>
            </View>
          </View>
        </View>

        {/* CARDS */}
        <View style={styles.cards}>
          {treatments.map((item, index) => {
            const anim = cardAnims[index];

            return (
              <Animated.View
                key={item.key}
                style={{
                  opacity: anim,
                  transform: [
                    {
                      translateY: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [26, 0],
                      }),
                    },
                    {
                      scale: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.97, 1],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.treatmentCard}
                  onPress={() => setSelected(item)}
                >
                  <ImageBackground
                    source={item.image}
                    style={styles.treatmentImage}
                    resizeMode="cover"
                  >
                    <View style={styles.cardOverlay} />

                    <View style={styles.cardTop}>
                      <View
                        style={[
                          styles.cardIcon,
                          { backgroundColor: item.accent },
                        ]}
                      >
                        <Ionicons name={item.icon} size={22} color={GREEN} />
                      </View>

                      <View style={styles.durationPill}>
                        <Ionicons name="time-outline" size={12} color={WHITE} />
                        <Text style={styles.durationText}>{item.duration}</Text>
                      </View>
                    </View>

                    <View style={styles.cardBottom}>
                      <Text style={styles.treatmentTitle}>{item.title}</Text>
                      <Text style={styles.treatmentShort}>{item.short}</Text>

                      <View style={styles.exploreRow}>
                        <Text style={styles.exploreText}>Discover the treatment</Text>
                        <Ionicons name="arrow-forward" size={16} color={GOLD_LIGHT} />
                      </View>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* MARKETING */}
        <View style={styles.whySection}>
          <Text style={styles.whyKicker}>THE NEOLIFE BEAUTY EXPERIENCE</Text>
          <Text style={styles.whyTitle}>More Than a Treatment—A Beauty Experience Made for You.</Text>
          <Text style={styles.whyText}>
            Your beauty needs are personal. That is why our approach begins with
            understanding what you want to improve and creating a comfortable,
            confidence-focused experience that enhances rather than hides your
            natural features.
          </Text>

          <View style={styles.whyList}>
            <WhyItem
              icon="person-outline"
              title="Made for Your Beauty Goals"
              text="Treatment choices are guided by your individual skin, hair or cosmetic concerns."
            />
            <WhyItem
              icon="sparkles-outline"
              title="Enhance Your Natural Beauty"
              text="Our focus is a refreshed, polished and natural-looking result that still feels like you."
            />
            <WhyItem
              icon="shield-checkmark-outline"
              title="Care You Can Feel Comfortable With"
              text="Receive attentive support from an experienced beauty therapist throughout your beauty journey."
            />
          </View>
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <View style={styles.ctaIcon}>
            <Ionicons name="heart-outline" size={23} color={GOLD} />
          </View>

          <Text style={styles.ctaTitle}>Your Next Glow-Up Starts Here</Text>
          <Text style={styles.ctaText}>
            From a special occasion glow to an everyday confidence boost, tell us your
            beauty goals and let our team guide you toward a treatment that
            suits your needs.
          </Text>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push("/consultation" as any)}
          >
            <Text style={styles.ctaButtonText}>Start Your Beauty Journey</Text>
            <Ionicons name="arrow-forward" size={16} color={GREEN} />
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

      {/* BEAUTY DETAILS MODAL */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setSelected(null)}
          />

          <View style={styles.detailSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetKicker}>YOUR BEAUTY EXPERIENCE</Text>
                <Text style={styles.sheetTitle}>{selected?.title}</Text>
              </View>

              <TouchableOpacity
                style={styles.sheetClose}
                onPress={() => setSelected(null)}
              >
                <Ionicons name="close" size={21} color={GREEN} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {!!selected && (
                <>
                  <Text style={styles.sheetIntro}>{selected.intro}</Text>

                  <View style={styles.sheetDuration}>
                    <Ionicons name="time-outline" size={17} color={GOLD_DARK} />
                    <Text style={styles.sheetDurationText}>
                      Typical duration: {selected.duration}
                    </Text>
                  </View>

                  {selected.blocks.map((block, index) => (
                    <View key={`${block.title}-${index}`} style={styles.detailBlock}>
                      <Text style={styles.detailBlockTitle}>{block.title}</Text>

                      {!!block.text && (
                        <Text style={styles.detailBlockText}>{block.text}</Text>
                      )}

                      {!!block.bullets?.length &&
                        block.bullets.map((bullet) => (
                          <View key={bullet} style={styles.bulletRow}>
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color={GREEN}
                            />
                            <Text style={styles.bulletText}>{bullet}</Text>
                          </View>
                        ))}
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.sheetBookButton}
                    onPress={() => {
                      setSelected(null);
                      router.push("/consultation" as any);
                    }}
                  >
                    <Text style={styles.sheetBookText}>Start Your Beauty Journey</Text>
                    <Ionicons name="arrow-forward" size={16} color={GREEN} />
                  </TouchableOpacity>

                  <View style={{ height: 30 }} />
                </>
              )}
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

          </View>
        </View>
      </Modal>

      <PatientDrawer
  visible={menuOpen}
  onClose={() => setMenuOpen(false)}
  activeRoute="/beauty-cosmetics"
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

function MiniStat({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={15} color={GOLD_DARK} />
      <Text style={styles.miniStatText}>{text}</Text>
    </View>
  );
}

function WhyItem({
  icon,
  title,
  text,
}: {
  icon: any;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.whyItem}>
      <View style={styles.whyIcon}>
        <Ionicons name={icon} size={21} color={GREEN} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.whyItemTitle}>{title}</Text>
        <Text style={styles.whyItemText}>{text}</Text>
      </View>
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
    minHeight: 540,
    justifyContent: "flex-end",
  },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,40,27,.68)",
  },

  heroGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    right: -110,
    bottom: -100,
    borderRadius: 140,
    backgroundColor: "rgba(214,180,91,.17)",
  },

  heroContent: {
    paddingHorizontal: 22,
    paddingBottom: 58,
  },

  heroBadge: {
    alignSelf: "flex-start",
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
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 9,
    letterSpacing: 1,
  },

  heroTitle: {
    marginTop: 19,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 41,
    lineHeight: 45,
  },

  heroAccent: {
    color: GOLD_LIGHT,
  },

  heroText: {
    marginTop: 13,
    fontFamily: "DMSans_400Regular",
    color: "#E3ECE6",
    fontSize: 13,
    lineHeight: 21,
  },

  heroButton: {
    marginTop: 21,
    alignSelf: "flex-start",
    minHeight: 48,
    paddingHorizontal: 17,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: GOLD,
  },

  heroButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  expertSection: {
    marginTop: -23,
    paddingHorizontal: 15,
  },

  expertCard: {
    padding: 17,
    borderRadius: 25,
    flexDirection: "row",
    gap: 14,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E7D7AF",
    elevation: 6,
  },

  expertImage: {
    width: 105,
    height: 135,
    borderRadius: 19,
    backgroundColor: MINT,
  },

  expertContent: {
    flex: 1,
  },

  expertBadge: {
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F8F2E4",
  },

  expertBadgeText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 0.7,
  },

  expertName: {
    marginTop: 8,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 20,
  },

  expertRole: {
    marginTop: 2,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 10,
  },

  expertStats: {
    marginTop: 9,
    gap: 4,
  },

  miniStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  miniStatText: {
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 8,
  },

  expertButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: GREEN,
  },

  expertButtonText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 8,
  },

  intro: {
    paddingTop: 56,
    paddingHorizontal: 17,
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
    fontSize: 30,
    lineHeight: 35,
  },

  sectionLead: {
    marginTop: 9,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 12,
    lineHeight: 20,
  },

  treatmentCount: {
    marginTop: 18,
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: MINT,
  },

  countBig: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 22,
  },

  countSmall: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  promiseRow: {
    marginTop: 18,
    gap: 8,
  },

  promiseItem: {
    minHeight: 43,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  promiseText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  cards: {
    paddingTop: 25,
    paddingHorizontal: 15,
    gap: 15,
  },

  treatmentCard: {
    height: 310,
    overflow: "hidden",
    borderRadius: 26,
    elevation: 4,
  },

  treatmentImage: {
    flex: 1,
    padding: 18,
    justifyContent: "space-between",
  },

  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,36,23,.42)",
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  durationPill: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(11,61,46,.70)",
  },

  durationText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 8,
  },

  cardBottom: {
    paddingTop: 35,
  },

  treatmentTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 27,
  },

  treatmentShort: {
    marginTop: 6,
    maxWidth: 330,
    fontFamily: "DMSans_400Regular",
    color: "#E5EEE8",
    fontSize: 11,
    lineHeight: 17,
  },

  exploreRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  exploreText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 10,
  },

  whySection: {
    marginTop: 58,
    paddingVertical: 48,
    paddingHorizontal: 16,
    backgroundColor: GREEN,
  },

  whyKicker: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 9,
    letterSpacing: 1.2,
  },

  whyTitle: {
    marginTop: 8,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 29,
    lineHeight: 34,
  },

  whyText: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    color: "#D2E0D7",
    fontSize: 12,
    lineHeight: 19,
  },

  whyList: {
    marginTop: 22,
    gap: 10,
  },

  whyItem: {
    padding: 16,
    borderRadius: 19,
    flexDirection: "row",
    gap: 11,
    backgroundColor: "rgba(255,255,255,.09)",
  },

  whyIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },

  whyItemTitle: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 12,
  },

  whyItemText: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: "#D1DED5",
    fontSize: 9,
    lineHeight: 15,
  },

  cta: {
    marginTop: 46,
    marginHorizontal: 16,
    padding: 27,
    borderRadius: 28,
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  ctaIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  ctaTitle: {
    marginTop: 14,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 27,
    textAlign: "center",
  },

  ctaText: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
  },

  ctaButton: {
    marginTop: 18,
    minHeight: 47,
    paddingHorizontal: 17,
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

  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,.50)",
  },

  detailSheet: {
    maxHeight: "90%",
    paddingTop: 10,
    paddingHorizontal: 18,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: CREAM,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 45,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#CFD5D0",
  },

  sheetHeader: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  sheetKicker: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.2,
  },

  sheetTitle: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 27,
  },

  sheetClose: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  sheetIntro: {
    marginTop: 17,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 12,
    lineHeight: 20,
  },

  sheetDuration: {
    marginTop: 13,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5EAD0",
  },

  sheetDurationText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
  },

  detailBlock: {
    marginTop: 15,
    padding: 17,
    borderRadius: 19,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  detailBlockTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 18,
  },

  detailBlockText: {
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 11,
    lineHeight: 18,
  },

  bulletRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },

  bulletText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 10,
    lineHeight: 16,
  },

  sheetBookButton: {
    marginTop: 20,
    minHeight: 49,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: GOLD,
  },

  sheetBookText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  
});
