import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";

import {
  Animated,
  Image,
  ImageBackground,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { API_BASE_URL } from "../../services/api";
import PatientDrawer from "../../components/PatientDrawer";
import PatientHeader from "../../components/PatientHeader";

const GREEN = "#0B3D2E";
const GREEN_2 = "#14533D";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBFAF6";
const TEXT = "#17231D";
const MUTED = "#75837B";
const WHITE = "#FFFFFF";

const heroSlides = [
  {
    id: "1",
    image: require("../../assets/images/neolife.png"),
    kicker: "HOLISTIC WELLNESS IN UDUPI",
    title: "Feel Better.\nLive Naturally.",
    text:
      "Personalized Ayurveda, Panchakarma, Yoga, Naturopathy and wellness care in one place.",
  },
  {
    id: "2",
    image: require("../../assets/images/ayurvedapancha.png"),
    kicker: "TRADITIONAL HEALING",
    title: "Restore Your\nBody Naturally",
    text:
      "Discover time-tested therapies designed for detoxification, pain relief and rejuvenation.",
  },
  {
    id: "3",
    image: require("../../assets/images/yoga.jpg"),
    kicker: "MIND • BODY • BALANCE",
    title: "Your Wellness\nJourney Starts Here",
    text:
      "Expert-guided therapies to help you move better, feel calmer and live healthier.",
  },
];

const quickActions = [
  {
    title: "Book",
    subtitle: "Consultation",
    icon: "calendar-outline",
    route: "/consultation",
  },
  {
    title: "Shop",
    subtitle: "Products",
    icon: "bag-outline",
    route: "/(tabs)/products",
  },
  {
    title: "Explore",
    subtitle: "Therapies",
    icon: "leaf-outline",
    route: "/therapies",
  },
  {
    title: "Meet",
    subtitle: "Doctors",
    icon: "medical-outline",
    route: "/doctors",
  },
];

const benefits = [
  {
    icon: "leaf-outline",
    title: "Natural Healing",
    text: "Traditional therapies focused on root-cause wellness.",
  },
  {
    icon: "person-outline",
    title: "Personalized Care",
    text: "Guidance tailored to your individual health needs.",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Trusted Experts",
    text: "Care from experienced doctors and wellness professionals.",
  },
];

const therapies = [
  {
    title: "Ayurveda & Panchakarma",
    subtitle: "Detox • Rejuvenate • Restore",
    icon: "leaf-outline",
    routeTitle: "Panchakarma",
  },
  {
    title: "Acupuncture",
    subtitle: "Pain • Stress • Balance",
    icon: "pulse-outline",
    routeTitle: "Acupuncture",
  },
  {
    title: "Yoga Therapy",
    subtitle: "Strength • Mobility • Calm",
    icon: "body-outline",
    routeTitle: "Yoga",
  },
  {
    title: "Naturopathy",
    subtitle: "Lifestyle • Diet • Healing",
    icon: "flower-outline",
    routeTitle: "Naturopathy",
  },
  {
    title: "Beauty & Cosmetics",
    subtitle: "Skin • Brows • Lips",
    icon: "sparkles-outline",
    routeTitle: "Beauty & Cosmetics",
  },
];

const doctors = [
  {
    name: "Dr. N. G. Muraleedhara",
    qualification: "BNYS | PGDYN | MSc(Yoga)",
    specialty: "Yoga & Naturopathy Consultant",
    image: require("../../assets/images/doctors/Dr-murali.png"),
  },
  {
    name: "Dr. G Rajesh Rao",
    qualification: "BAMS",
    specialty: "Jyothishya Vidwan | Ayurveda",
    image: require("../../assets/images/doctors/Dr-rajesh.png"),
  },
  {
    name: "Dr. Vijay B. Negalur",
    qualification: "BAMS, M.D. (Swasthavritta)",
    specialty: "Ayurveda | Diet & Lifestyle Consultant",
    image: require("../../assets/images/doctors/Dr-vijay.png"),
  },
  {
    name: "Dr. Sibagath Ulla Sharieff R",
    qualification: "BAMS, MD(Ayu)",
    specialty: "Ayurveda Consultant",
    image: require("../../assets/images/doctors/Dr-sibgath.jpg"),
  },
  {
    name: "Dr. Shalmali B B",
    qualification: "BAMS, MD (Ayu)",
    specialty: "Rasa Shastra & Bhaishajya Kalpana",
    image: require("../../assets/images/doctors/Dr-shalmali.png"),
  },
  {
    name: "Dr. Gajendar",
    qualification: "BAMS",
    specialty: "Naturopathy Consultant",
    image: require("../../assets/images/doctors/Dr-gajendar.png"),
  },
  {
    name: "Dr. D P Ramesh",
    qualification: "BAMS | Ayurveda | Cancer Care",
    specialty: "Ayurvedic cancer care support",
    image: require("../../assets/images/doctors/Dr-ramesh.png"),
  },
  {
    name: "Dr. Aditi",
    qualification: "BNYS",
    specialty: "Yoga & Naturopathy Consultant",
    image: require("../../assets/images/doctors/Dr-adithi.png"),
  },
  {
    name: "Dr. Harshitha AV",
    qualification: "BAMS, MS (Shalyatantra)",
    specialty: "Ayurvedic Surgeon | Ano-rectal Disorders | Varicose Veins | Women's Health & General Ayurvedic Care",
    image: require("../../assets/images/doctors/Dr-Harshitha.png"),
  },
];

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

type Review = {
  id?: number;
  patientName?: string;
  rating?: number;
  therapyService?: string;
  message?: string;
  status?: string;
};

export default function HomeScreen() {
  const { width } = useWindowDimensions();

  const heroRef = useRef<ScrollView | null>(null);
  const heroIndexRef = useRef(0);

  const [menuOpen, setMenuOpen] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerIndex, setOfferIndex] = useState(0);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);

  
  useEffect(() => {
    loadOffers();
    loadReviews();
    
  }, []);

  



  useEffect(() => {
    const timer = setInterval(() => {
      const next =
        (heroIndexRef.current + 1) % heroSlides.length;

      heroIndexRef.current = next;

      heroRef.current?.scrollTo({
        x: next * width,
        animated: true,
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [width]);

  useEffect(() => {
    if (offers.length <= 1) return;

    const timer = setInterval(() => {
      setOfferIndex((current) =>
        current >= offers.length - 1 ? 0 : current + 1
      );
    }, 4500);

    return () => clearInterval(timer);
  }, [offers]);

  useEffect(() => {
    if (reviews.length <= 1) return;

    const timer = setInterval(() => {
      setReviewIndex((current) =>
        current >= reviews.length - 1 ? 0 : current + 1
      );
    }, 4500);

    return () => clearInterval(timer);
  }, [reviews]);

  async function loadOffers() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/offers/active/get`
      );

      const result = await response.json();

      if (result?.success && Array.isArray(result?.data)) {
        setOffers(result.data);
      }
    } catch (error) {
      console.log("Offer loading failed:", error);
    }
  }

  async function loadReviews() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/clinic-reviews/getAll`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = await response.json();

      if (result?.success && Array.isArray(result?.data)) {
        const approved = result.data.filter(
          (review: Review) => {
            const status =
              String(review.status || "").toUpperCase();

            return !review.status || status === "APPROVED";
          }
        );

        setReviews(approved);
      }
    } catch (error) {
      console.log("Review loading failed:", error);
    }
  }

  

  function getOfferImage(url?: string) {
    if (!url) {
      return require("../../assets/images/neolife.png");
    }

    if (url.startsWith("http")) {
      return { uri: url };
    }

    return {
      uri: `${API_BASE_URL}${url}`,
    };
  }

  async function openURL(url: string) {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.log("URL error:", error);
    }
  }

  function openTherapy(title: string) {
  if (title === "Beauty & Cosmetics") {
    router.push("/beauty-cosmetics" as any);
    return;
  }

  router.push({
    pathname: "/therapy-details",
    params: { title },
  } as any);
}

  const currentOffer = offers[offerIndex];
  const currentReview = reviews[reviewIndex];

  return (
    <View style={styles.screen}>
      <PatientHeader
  onMenuPress={() => setMenuOpen(true)}
/>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 0 }}
      >
        {/* HERO */}

        <ScrollView
          ref={heroRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            heroIndexRef.current = Math.round(
              event.nativeEvent.contentOffset.x / width
            );
          }}
        >
          {heroSlides.map((slide) => (
            <ImageBackground
              key={slide.id}
              source={slide.image}
              style={[styles.hero, { width }]}
            >
              <View style={styles.heroShade} />

              <View style={styles.heroContent}>
                <Text style={styles.heroKicker}>
                  {slide.kicker}
                </Text>

                <Text style={styles.heroTitle}>
                  {slide.title}
                </Text>

                <Text style={styles.heroText}>
                  {slide.text}
                </Text>

                <View style={styles.heroButtons}>
                  <TouchableOpacity
                    style={styles.primaryHeroButton}
                    onPress={() =>
                      router.push("/consultation" as any)
                    }
                  >
                    <Text style={styles.primaryHeroText}>
                      Book Consultation
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color={GREEN}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryHeroButton}
                    onPress={() =>
                      router.push("/therapies" as any)
                    }
                  >
                    <Text style={styles.secondaryHeroText}>
                      Explore Therapies
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ImageBackground>
          ))}
        </ScrollView>

        {/* QUICK ACTIONS */}

        <View style={styles.quickWrap}>
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.quickCard}
              onPress={() =>
                router.push(item.route as any)
              }
            >
              <View style={styles.quickIcon}>
                <Ionicons
                  name={item.icon as any}
                  size={22}
                  color={GREEN}
                />
              </View>

              <Text style={styles.quickTitle}>
                {item.title}
              </Text>

              <Text style={styles.quickSubtitle}>
                {item.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* PAIN POINT MARKETING */}

        <View style={styles.marketingCard}>
          <View style={styles.marketingBadge}>
            <Ionicons
              name="heart-outline"
              size={15}
              color={GOLD}
            />

            <Text style={styles.marketingBadgeText}>
              FEELING TIRED, STRESSED OR IN PAIN?
            </Text>
          </View>

          <Text style={styles.marketingTitle}>
            Don’t ignore what your body is telling you.
          </Text>

          <Text style={styles.marketingText}>
            Whether it is joint pain, digestive discomfort,
            stress, poor sleep or lifestyle imbalance, the
            right wellness support can help you feel better.
          </Text>

          <TouchableOpacity
            style={styles.marketingButton}
            onPress={() =>
              router.push("/consultation" as any)
            }
          >
            <Text style={styles.marketingButtonText}>
              Talk to a Wellness Expert
            </Text>

            <Ionicons
              name="arrow-forward"
              size={16}
              color={WHITE}
            />
          </TouchableOpacity>
        </View>

        {/* OFFER */}

        {currentOffer && (
          <View style={styles.sectionPad}>
            <ImageBackground
              source={getOfferImage(
                currentOffer.bannerImageUrl
              )}
              style={styles.offerCard}
              imageStyle={{
                borderRadius: 28,
              }}
            >
              <View style={styles.offerShade} />

              <View style={styles.offerContent}>
                <Text style={styles.offerMini}>
                  {currentOffer.offerLabel ||
                    "LIMITED TIME OFFER"}
                </Text>

                <Text style={styles.offerTitle}>
                  {currentOffer.offerTitle}
                </Text>

                {!!currentOffer.description && (
                  <Text style={styles.offerText}>
                    {currentOffer.description}
                  </Text>
                )}

                {!!currentOffer.discountText && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      {currentOffer.discountText}
                    </Text>
                  </View>
                )}

                {!!currentOffer.couponCode && (
                  <Text style={styles.couponText}>
                    Use code: {currentOffer.couponCode}
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.offerButton}
                  onPress={() =>
                    router.push(
                      "/(tabs)/products" as any
                    )
                  }
                >
                  <Text style={styles.offerButtonText}>
                    {currentOffer.buttonText ||
                      "Explore Now"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </View>
        )}

        {/* THERAPIES */}

        <SectionTitle
          eyebrow="DISCOVER WELLNESS"
          title="Choose What Your Body Needs"
          text="Explore trusted therapies designed around your health goals."
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {therapies.map((therapy) => (
            <TouchableOpacity
              key={therapy.title}
              style={styles.therapyCard}
              onPress={() =>
                openTherapy(therapy.routeTitle)
              }
            >
              <View style={styles.therapyIcon}>
                <Ionicons
                  name={therapy.icon as any}
                  size={25}
                  color={WHITE}
                />
              </View>

              <Text style={styles.therapyTitle}>
                {therapy.title}
              </Text>

              <Text style={styles.therapySub}>
                {therapy.subtitle}
              </Text>

              <View style={styles.cardLink}>
                <Text style={styles.cardLinkText}>
                  Know more
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={GOLD}
                />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* WHY US */}

        <SectionTitle
          eyebrow="WHY NEOLIFE"
          title="Wellness Care Made Personal"
          text="Everything you need to feel supported throughout your wellness journey."
        />

        <View style={styles.benefitsWrap}>
          {benefits.map((item) => (
            <View
              key={item.title}
              style={styles.benefitCard}
            >
              <View style={styles.benefitIcon}>
                <Ionicons
                  name={item.icon as any}
                  size={23}
                  color={GREEN}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>
                  {item.title}
                </Text>

                <Text style={styles.benefitText}>
                  {item.text}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* DOCTORS */}

        <SectionTitle
          eyebrow="EXPERT CARE"
          title="Meet Your Wellness Team"
          text="Experienced professionals here to guide you."
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {doctors.map((doctor, index) => (
            <AnimatedDoctorCard
              key={doctor.name}
              doctor={doctor}
              index={index}
            />
          ))}
        </ScrollView>

        <View style={styles.meetDoctorsWrap}>
          <TouchableOpacity
            style={styles.meetDoctorsButton}
            activeOpacity={0.85}
            onPress={() => router.push("/doctors" as any)}
          >
            <View style={styles.meetDoctorsIcon}>
              <Ionicons name="people-outline" size={20} color={GREEN} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.meetDoctorsButtonText}>Meet Our Doctors</Text>
              <Text style={styles.meetDoctorsButtonSub}>
                Discover our complete wellness team
              </Text>
            </View>

            <Ionicons name="arrow-forward" size={19} color={GREEN} />
          </TouchableOpacity>
        </View>

        {/* BEAUTY SPOTLIGHT */}

        <View style={styles.beautyCard}>
          <View style={styles.beautyTextWrap}>
            <Text style={styles.beautyKicker}>
              BEAUTY & SELF CARE
            </Text>

            <Text style={styles.beautyTitle}>
              Glow Naturally.
              Feel Confident.
            </Text>

            <Text style={styles.beautyText}>
              Discover personalized facial, hair, eyebrow,
              lip and beauty treatments.
            </Text>

            <TouchableOpacity
              style={styles.beautyButton}
              onPress={() =>
                openTherapy(
                  "Beauty & Cosmetics"
                )
              }
            >
              <Text style={styles.beautyButtonText}>
                Explore Beauty Care
              </Text>
            </TouchableOpacity>
          </View>

          <Image
            source={require("../../assets/images/facial.png")}
            style={styles.beautyImage}
          />
        </View>

        {/* REVIEWS */}

        {currentReview && (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewKicker}>
              REAL PATIENT STORIES
            </Text>

            <Text style={styles.reviewTitle}>
              Trusted by People Like You
            </Text>

            <View style={styles.reviewCard}>
              <Text style={styles.quoteMark}>“</Text>

              <Text style={styles.reviewMessage}>
                {currentReview.message}
              </Text>

              <View style={styles.reviewBottom}>
                <View>
                  <Text style={styles.reviewName}>
                    {currentReview.patientName ||
                      "Patient"}
                  </Text>

                  <Text style={styles.reviewService}>
                    {currentReview.therapyService ||
                      "NeoLife Wellness Center"}
                  </Text>
                </View>

                <Text style={styles.reviewStars}>
                  {"★".repeat(
                    Math.max(
                      1,
                      Math.min(
                        5,
                        Number(
                          currentReview.rating || 5
                        )
                      )
                    )
                  )}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* CTA */}

        <View style={styles.finalCta}>
          <View style={styles.finalIcon}>
            <Ionicons
              name="heart"
              size={24}
              color={GOLD}
            />
          </View>

          <Text style={styles.finalTitle}>
            Ready to Start Feeling Better?
          </Text>

          <Text style={styles.finalText}>
            Book a consultation today and take the first
            step toward better health and wellness.
          </Text>

          <TouchableOpacity
            style={styles.finalButton}
            onPress={() =>
              router.push("/consultation" as any)
            }
          >
            <Text style={styles.finalButtonText}>
              Book Consultation
            </Text>

            <Ionicons
              name="arrow-forward"
              size={17}
              color={GREEN}
            />
          </TouchableOpacity>
        </View>

        {/* CONTACT */}

        <View style={styles.contactCard}>
          <Text style={styles.contactKicker}>
            VISIT NEOLIFE
          </Text>

          <Text style={styles.contactTitle}>
            NeoLife Wellness Center
          </Text>

          <Text style={styles.contactText}>
            4-1-38 Nararkere 1st Cross, Brahmagiri,
            Ambalpadi, Udupi, Karnataka 576101
          </Text>

          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={styles.contactOutline}
              onPress={() =>
                openURL("tel:9036444282")
              }
            >
              <Ionicons
                name="call-outline"
                size={17}
                color={GREEN}
              />

              <Text style={styles.contactOutlineText}>
                Call
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactFilled}
              onPress={() =>
                openURL(
                  "https://www.google.com/maps/search/?api=1&query=Neolife+Wellness+Center+Udupi"
                )
              }
            >
              <Ionicons
                name="navigate-outline"
                size={17}
                color={WHITE}
              />

              <Text style={styles.contactFilledText}>
                Directions
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* CONTACT / FOOTER */}
<View style={styles.footer}>
  <Image
    source={require("../../assets/images/main_logo.jpeg")}
    style={styles.footerLogo}
  />

  <Text style={styles.footerBrand}>
    NeoLife Wellness Center
  </Text>

  <Text style={styles.footerTagline}>
    Natural healing, Ayurvedic care and trusted wellness support
    for a healthier life.
  </Text>

  <TouchableOpacity
    style={styles.footerRow}
    onPress={() =>
      openURL("tel:+919481489866")
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
      openURL("mailto:neelavar.murali@gmail.com")
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
    4-1-38, Behind Lions Bhavan Road, Nairkere 1st Cross,
    Brahmagiri, Ambalapady Post, Udupi – 576103,
    Karnataka, India
  </Text>

  <View style={styles.socialRow}>
    <TouchableOpacity
      style={styles.socialButton}
      onPress={() =>
        openURL(
          "https://www.facebook.com/profile.php?id=61575580360517"
        )
      }
    >
      <Ionicons
        name="logo-facebook"
        size={20}
        color={WHITE}
      />
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.socialButton}
      onPress={() =>
        openURL(
          "https://www.instagram.com/neolives_global"
        )
      }
    >
      <Ionicons
        name="logo-instagram"
        size={20}
        color={WHITE}
      />
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.socialButton}
      onPress={() =>
        openURL(
          "https://www.youtube.com/@NeolifeWellnessCenterUdupi-o7x"
        )
      }
    >
      <Ionicons
        name="logo-youtube"
        size={20}
        color={WHITE}
      />
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.socialButton}
      onPress={() =>
        openURL("https://wa.me/919481489866")
      }
    >
      <Ionicons
        name="logo-whatsapp"
        size={20}
        color={WHITE}
      />
    </TouchableOpacity>
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
            "https://wa.me/919036444282?text=Hello%20NeoLife%20Wellness%20Center,%20I%20need%20help."
          )
        }
      >
        <Ionicons
          name="logo-whatsapp"
          size={27}
          color={WHITE}
        />
      </TouchableOpacity>

      <PatientDrawer
  visible={menuOpen}
  onClose={() => setMenuOpen(false)}
  activeRoute="/(tabs)"
/>
    </View>
  );
}

function AnimatedDoctorCard({
  doctor,
  index,
}: {
  doctor: (typeof doctors)[number];
  index: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(Math.min(index, 4) * 90),
      Animated.spring(progress, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
        tension: 55,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [index, progress]);

  return (
    <Animated.View
      style={[
        styles.doctorCard,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.96, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Image source={doctor.image} style={styles.doctorImage} />

      <Text style={styles.doctorName}>{doctor.name}</Text>
      <Text style={styles.doctorQualification}>{doctor.qualification}</Text>
      <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
    </Animated.View>
  );
}

function SectionTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.eyebrow}>
        {eyebrow}
      </Text>

      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <Text style={styles.sectionText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  

  hero: {
    height: 545,
    justifyContent: "flex-end",
  },

  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,31,22,.59)",
  },

  heroContent: {
    paddingHorizontal: 22,
    paddingBottom: 62,
  },

  heroKicker: {
    color: GOLD_LIGHT,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.8,
  },

  heroTitle: {
    marginTop: 12,
    color: WHITE,
    fontSize: 42,
    lineHeight: 45,
    fontWeight: "900",
    letterSpacing: -1.4,
  },

  heroText: {
    marginTop: 15,
    maxWidth: 360,
    color: "#E5EFEA",
    fontSize: 15,
    lineHeight: 23,
  },

  heroButtons: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  primaryHeroButton: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: GOLD,
  },

  primaryHeroText: {
    color: GREEN,
    fontWeight: "900",
    fontSize: 13,
  },

  secondaryHeroButton: {
    minHeight: 49,
    justifyContent: "center",
    paddingHorizontal: 17,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.4)",
  },

  secondaryHeroText: {
    color: WHITE,
    fontWeight: "800",
    fontSize: 13,
  },

  quickWrap: {
    marginTop: -27,
    marginHorizontal: 15,
    padding: 10,
    flexDirection: "row",
    borderRadius: 24,
    backgroundColor: WHITE,
    elevation: 8,
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
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  quickTitle: {
    marginTop: 7,
    color: GREEN,
    fontWeight: "900",
    fontSize: 12,
  },

  quickSubtitle: {
    marginTop: 1,
    color: MUTED,
    fontSize: 9,
  },

  marketingCard: {
    marginTop: 48,
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 28,
    backgroundColor: GREEN,
  },

  marketingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  marketingBadgeText: {
    color: GOLD_LIGHT,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  marketingTitle: {
    marginTop: 12,
    color: WHITE,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "900",
    letterSpacing: -0.6,
  },

  marketingText: {
    marginTop: 11,
    color: "#CEDDD5",
    lineHeight: 21,
    fontSize: 13,
  },

  marketingButton: {
    marginTop: 20,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: GREEN_2,
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 15,
  },

  marketingButtonText: {
    color: WHITE,
    fontWeight: "800",
    fontSize: 12,
  },

  sectionPad: {
    marginTop: 50,
    paddingHorizontal: 16,
  },

  offerCard: {
    minHeight: 320,
    justifyContent: "flex-end",
    overflow: "hidden",
    borderRadius: 28,
  },

  offerShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12,51,38,.72)",
  },

  offerContent: {
    padding: 24,
  },

  offerMini: {
    color: GOLD_LIGHT,
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 1.3,
  },

  offerTitle: {
    marginTop: 9,
    color: WHITE,
    fontWeight: "900",
    fontSize: 28,
    lineHeight: 32,
  },

  offerText: {
    marginTop: 9,
    color: "#E5EFEA",
    lineHeight: 20,
  },

  discountBadge: {
    alignSelf: "flex-start",
    marginTop: 13,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: GOLD,
  },

  discountText: {
    color: GREEN,
    fontSize: 17,
    fontWeight: "900",
  },

  couponText: {
    marginTop: 10,
    color: WHITE,
    fontWeight: "700",
  },

  offerButton: {
    marginTop: 16,
    alignSelf: "flex-start",
    backgroundColor: WHITE,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },

  offerButtonText: {
    color: GREEN,
    fontWeight: "900",
  },

  sectionTitleWrap: {
    marginTop: 62,
    paddingHorizontal: 20,
  },

  eyebrow: {
    color: GOLD,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  sectionTitle: {
    marginTop: 8,
    color: TEXT,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "900",
    letterSpacing: -0.6,
  },

  sectionText: {
    marginTop: 7,
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
  },

  horizontalList: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 13,
  },

  therapyCard: {
    width: 210,
    minHeight: 196,
    padding: 19,
    borderRadius: 24,
    backgroundColor: WHITE,
    elevation: 3,
  },

  therapyIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  therapyTitle: {
    marginTop: 15,
    color: TEXT,
    fontWeight: "900",
    fontSize: 16,
    lineHeight: 20,
  },

  therapySub: {
    marginTop: 6,
    color: MUTED,
    fontSize: 11,
  },

  cardLink: {
    marginTop: "auto",
    paddingTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  cardLinkText: {
    color: GOLD,
    fontWeight: "900",
    fontSize: 11,
  },

  benefitsWrap: {
    marginTop: 20,
    paddingHorizontal: 16,
    gap: 11,
  },

  benefitCard: {
    flexDirection: "row",
    gap: 14,
    padding: 17,
    borderRadius: 20,
    backgroundColor: WHITE,
  },

  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  benefitTitle: {
    color: TEXT,
    fontWeight: "900",
    fontSize: 15,
  },

  benefitText: {
    marginTop: 4,
    color: MUTED,
    lineHeight: 18,
    fontSize: 12,
  },

  doctorCard: {
    width: 235,
    padding: 18,
    borderRadius: 25,
    alignItems: "center",
    backgroundColor: WHITE,
    elevation: 3,
  },

  doctorImage: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: MINT,
  },

  doctorName: {
    marginTop: 14,
    textAlign: "center",
    color: TEXT,
    fontWeight: "900",
    fontSize: 16,
  },

  doctorQualification: {
    marginTop: 5,
    textAlign: "center",
    color: GOLD,
    fontWeight: "800",
    fontSize: 11,
  },

  doctorSpecialty: {
    marginTop: 5,
    color: MUTED,
    fontSize: 11,
    textAlign: "center",
  },



  meetDoctorsWrap: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  meetDoctorsButton: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: GOLD_LIGHT,
    borderWidth: 1,
    borderColor: "#E4CC83",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  meetDoctorsIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  meetDoctorsButtonText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "900",
  },

  meetDoctorsButtonSub: {
    marginTop: 2,
    color: "#6F684F",
    fontSize: 10,
    lineHeight: 14,
  },

  beautyCard: {
    marginTop: 62,
    marginHorizontal: 16,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#F7EFE8",
  },

  beautyTextWrap: {
    padding: 23,
  },

  beautyKicker: {
    color: "#9B6D45",
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 1.4,
  },

  beautyTitle: {
    marginTop: 9,
    color: "#513928",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
  },

  beautyText: {
    marginTop: 9,
    color: "#806B5C",
    lineHeight: 20,
    fontSize: 13,
  },

  beautyButton: {
    marginTop: 17,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: "#513928",
  },

  beautyButtonText: {
    color: WHITE,
    fontWeight: "800",
    fontSize: 12,
  },

  beautyImage: {
    width: "100%",
    height: 220,
    resizeMode: "cover",
  },

  reviewSection: {
    marginTop: 62,
    paddingVertical: 45,
    paddingHorizontal: 16,
    backgroundColor: GREEN,
  },

  reviewKicker: {
    color: GOLD_LIGHT,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  reviewTitle: {
    marginTop: 8,
    color: WHITE,
    fontSize: 28,
    fontWeight: "900",
  },

  reviewCard: {
    marginTop: 20,
    padding: 21,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,.09)",
  },

  quoteMark: {
    color: GOLD,
    fontSize: 45,
    lineHeight: 45,
  },

  reviewMessage: {
    marginTop: 2,
    color: WHITE,
    lineHeight: 22,
    fontSize: 14,
  },

  reviewBottom: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  reviewName: {
    color: WHITE,
    fontWeight: "900",
  },

  reviewService: {
    marginTop: 3,
    color: "#C6D7CE",
    fontSize: 10,
  },

  reviewStars: {
    color: GOLD,
  },

  finalCta: {
    marginTop: 60,
    marginHorizontal: 16,
    padding: 28,
    alignItems: "center",
    borderRadius: 28,
    backgroundColor: GREEN,
  },

  finalIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  finalTitle: {
    marginTop: 15,
    color: WHITE,
    textAlign: "center",
    fontSize: 26,
    fontWeight: "900",
  },

  finalText: {
    marginTop: 9,
    color: "#CEDDD5",
    textAlign: "center",
    lineHeight: 20,
  },

  finalButton: {
    marginTop: 19,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: GOLD,
  },

  finalButtonText: {
    color: GREEN,
    fontWeight: "900",
  },

  contactCard: {
    marginTop: 35,
    marginHorizontal: 16,
    padding: 23,
    borderRadius: 25,
    backgroundColor: WHITE,
  },

  contactKicker: {
    color: GOLD,
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 1.2,
  },

  contactTitle: {
    marginTop: 7,
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
  },

  contactText: {
    marginTop: 7,
    color: MUTED,
    lineHeight: 19,
    fontSize: 12,
  },

  contactButtons: {
    marginTop: 17,
    flexDirection: "row",
    gap: 10,
  },

  contactOutline: {
    flex: 1,
    minHeight: 45,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  contactOutlineText: {
    color: GREEN,
    fontWeight: "800",
  },

  contactFilled: {
    flex: 1,
    minHeight: 45,
    borderRadius: 14,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  contactFilledText: {
    color: WHITE,
    fontWeight: "800",
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
  color: WHITE,
  fontSize: 20,
  fontWeight: "900",
},

footerTagline: {
  marginTop: 8,
  maxWidth: 420,
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
  color: "#E1EAE4",
  fontSize: 12,
  fontWeight: "600",
},

footerAddress: {
  marginTop: 15,
  maxWidth: 390,
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
  color: "#81978A",
  fontSize: 10,
  textAlign: "center",
},

  whatsapp: {
    position: "absolute",
    right: 18,
    bottom:
      Platform.OS === "web" ? 20 : 82,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#20C764",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },


});