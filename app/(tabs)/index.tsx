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
import {
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  isSmallPhone,
  moderateScale,
  fontSize,
  horizontalPadding,
} from "../../utils/responsive";

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


  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);

  
  useEffect(() => {
    
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
    if (reviews.length <= 1) return;

    const timer = setInterval(() => {
      setReviewIndex((current) =>
        current >= reviews.length - 1 ? 0 : current + 1
      );
    }, 4500);

    return () => clearInterval(timer);
  }, [reviews]);

  

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
const GOOGLE_REVIEW_URL =
  "https://g.page/r/CYv6LV08kxDZEBM";

const googleReviews = [
  {
    id: "google-1",
    name: "shubha bangera",
    rating: 5,
    review:
      "Dr. Muralidhar Sir is one of the best doctor. His approach itself heal the pain. The staffs are friendly and v.good service. I'm thankful to Neolife wellness center Dr. Muralidhar and all the staffs for such a genuine service.",
  },
  {
    id: "google-2",
    name: "Vandana Nayak",
    rating: 5,
    review:
      "I never thought I would write this when we had decided to go to this place. My dad has suffered a lot of back pain since more that 10 years now. His disc at the back was dislocated multiple times and he had gone through severe pain. He was admitted to hospital multiple times for more than a week each time. Recently my dad heard about Dr. Muraleedhar Rao at neolife and we straight away took an appointment. Doctor told me that my father's back-pain will be gone and he will be dancing by the end of that particular day. Honestly, I didn't believe him. I just nodded my head with a smile. He did some magic for 40 minutes and my father comes out saying 'I don't feel any pain anymore'. I didn't believe my father, why would I? After all I have seen him going through unbearable pain during past years. I thought he is just joking around. But indeed, the pain is gone. It's been few days now and we don't believe this magic. If you know someone who is suffering from back pain, disc problems I would recommend you to consult this doctor without having any second thoughts. He really has got some magic in his hands. I cannot thank him enough! If this never comes back. I hope your health issues will be resolved. All the best.",
  },
  {
    id: "google-3",
    name: "Parthasarathy Roy",
    rating: 5,
    review:
      "We visited Dr Murlidhar Rao at his clinic in Udupi, while we were visiting our relatives. We were not sure how he could help since we stay at Hyderabad. Me, my wife, my mother and my daughters, all consulted him for various reasons. From an issue of snoring, to knee pain, to Psoriasis, and menstrual irregularities, Dr Murlidhar gave us the confidence that he would help us with all our issues. He was very patient in listening to each of us individually, and very understanding too. I must mention that he has a very unique way of connecting with his patients, in a very empathetic manner. He is not interested in selling medicines or forcing his treatments. He genuinely wants to help others heal and live better lives. Workouts, our medicines, and are continuing to do so for the past three months, which have been sent to us by courier without any hassles. The staff is also very, welcoming, supportive and helpful. As for the results, they are outstanding. Each of us has seen a distinct improvement in such a short time, and are truly blessed that we were introduced to Dr Murlidhar. I would highly recommend Neolife Wellness Clinic for any health concerns that anybody, of any age, might have.",
  },
  {
    id: "google-4",
    name: "hari prasad",
    rating: 5,
    review:
      "Dr Muralidhar is a rare talent, he solved my slip disc problem like magic, almost 10 years pain gone in just few sittings. After this experience i started respecting our traditional medical system. I strongly recommend to patients to visit Neolife wellness center to have personal experience.",
  },
  {
    id: "google-5",
    name: "Vinoda Poojary",
    rating: 5,
    review:
      "ನನಗೆ ತುಂಬಾ ಖುಷಿ.. ನೋವಿಲ್ಲ ಈಗ, ಆದರೆ 15 ದಿನದ ಚಿಕಿತ್ಸೆಯಿಂದ ತುಂಬಾ ಆರಾಮವಾಗಿದೆ. Thank you neolife thank doctor",
  },
  {
    id: "google-6",
    name: "Sandhya Bhat",
    rating: 5,
    review:
      "Very experienced and knowledgeable doctor. Clarifies all the doubts and explains the concept of the problem and medication. Even explains how the medication works on the patient. Thank you Dr. Rao for helping me understand diabetes.",
  },
  {
    id: "google-7",
    name: "Rashida Banu",
    rating: 5,
    review:
      "I had been suffering from joint pain for almost a year and tried treatment at different hospital they suggested surgery and then came to Neolife Wellness Centre and took Janu Basti treatment under Therapist Gowrav's care. My joint pain has been reduced, and I'm feeling much better. Thank you Therapist Gowrav and Neolife Wellness Centre team.",
  },
  {
    id: "google-8",
    name: "Raghavendra bhat",
    rating: 5,
    review:
      "Visiting since one and a half year, underwent panchakarma shirodhara, and recently treated for headache anxiety loss of concentration through acupuncture and experienced very good healing in the body, even appetite, digestion also has increased, good experienced doctor Dr. Muralidhar Rao and charges are very reasonable compared to other ayurvedic health centres.",
  },
  {
    id: "google-9",
    name: "Raghu Ballari",
    rating: 5,
    review:
      "My wife has Varicose veins problem and we had tried different hospitals and doctors for almost 5 years but there was no relief for us and one day we got to know about Dr. Muralidhar and his Ayurvedic treatment. So we visited Neolife in Udupi and within a week of treatment we could feel the difference and now my wife feels better. Doctor was so humble and listens to you very patiently and advices you like a family member. When we are speaking with him, we could feel the positive energy he spreads across. My advice to anybody out there is to go with Ayurvedic treatment and Dr. Muralidhar is the best doctor we could come across. Thank you sir.",
  },
];
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

<View style={styles.reviewSection}>
  <Text style={styles.reviewKicker}>
    REAL PATIENT STORIES
  </Text>

  <Text style={styles.reviewTitle}>
    Trusted by People Like You
  </Text>

  {/* =========================
      CLINIC REVIEW
  ========================= */}

  {currentReview && (
    <View style={styles.reviewCard}>
      <View style={styles.reviewSourceRow}>
        <View style={styles.reviewSourceBadge}>
          <Ionicons
            name="heart"
            size={13}
            color={GREEN}
          />

          <Text style={styles.reviewSourceBadgeText}>
            NEOLIFE REVIEW
          </Text>
        </View>
      </View>

      <Text style={styles.quoteMark}>“</Text>

      <Text style={styles.reviewMessage}>
        {currentReview.message}
      </Text>

      <View style={styles.reviewBottom}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewName}>
            {currentReview.patientName || "Patient"}
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
                Number(currentReview.rating || 5)
              )
            )
          )}
        </Text>
      </View>
    </View>
  )}

  {/* =========================
      GOOGLE REVIEWS
  ========================= */}

  <View style={styles.googleHeadingRow}>
    <View style={styles.googleHeadingIcon}>
      <Ionicons
        name="logo-google"
        size={20}
        color={GREEN}
      />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.googleHeadingTitle}>
        Google Reviews
      </Text>

      <Text style={styles.googleHeadingSub}>
        More experiences shared by our patients
      </Text>
    </View>
  </View>

  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.googleReviewList}
  >
    {googleReviews.map((review) => (
      <View
        key={review.id}
        style={styles.googleReviewCard}
      >
        <View style={styles.googleReviewTop}>
          <View style={styles.googleAvatar}>
            <Text style={styles.googleAvatarText}>
              {review.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.googleReviewerName}>
              {review.name}
            </Text>

            <View style={styles.googleSourceRow}>
              <Ionicons
                name="logo-google"
                size={12}
                color={GREEN}
              />

              <Text style={styles.googleSourceText}>
                Google Review
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.googleStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name="star"
              size={15}
              color={GOLD}
            />
          ))}
        </View>

        <Text
          style={styles.googleReviewMessage}
          numberOfLines={8}
        >
          {review.review}
        </Text>

        <TouchableOpacity
          style={styles.googleViewLink}
          activeOpacity={0.8}
          onPress={() =>
            openURL(GOOGLE_REVIEW_URL)
          }
        >
          <Text style={styles.googleViewLinkText}>
            View on Google
          </Text>

          <Ionicons
            name="open-outline"
            size={14}
            color={GREEN}
          />
        </TouchableOpacity>
      </View>
    ))}
  </ScrollView>

  <TouchableOpacity
    style={styles.allGoogleButton}
    activeOpacity={0.85}
    onPress={() =>
      openURL(GOOGLE_REVIEW_URL)
    }
  >
    <Ionicons
      name="logo-google"
      size={18}
      color={GREEN}
    />

    <Text style={styles.allGoogleButtonText}>
      View All Google Reviews
    </Text>

    <Ionicons
      name="arrow-forward"
      size={16}
      color={GREEN}
    />
  </TouchableOpacity>
</View>

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
            MAIN BRANCH
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
        
{/* SECOND CLINIC */}

<View style={styles.contactCard}>
  <Text style={styles.contactKicker}>
    OUR ANOTHER BRANCH
  </Text>

  <Text style={styles.contactTitle}>
   NeoLife Wellness Center - Bramhavara
  </Text>

  <Text style={styles.contactText}>
    1st Floor, Vinyas Cloth Store, Bramhavara, Varambally, Chanthar, Udupi.
  </Text>

  <View style={styles.contactButtons}>
    <TouchableOpacity
      style={styles.contactOutline}
      onPress={() => openURL("tel:+918970969969")}
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
        openURL("https://maps.google.com/maps?q=13.4373756%2C74.7454709&z=17&hl=en")
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
  /* =========================
     SCREEN
  ========================= */

  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  /* =========================
     HERO
  ========================= */

  hero: {
    minHeight: isSmallPhone ? 500 : 520,
    height: SCREEN_HEIGHT * 0.64,
    maxHeight: 620,
    justifyContent: "flex-end",
  },

  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,31,22,.59)",
  },

  heroContent: {
    paddingHorizontal: horizontalPadding,
    paddingBottom: isSmallPhone ? 48 : 62,
  },

  heroKicker: {
    color: GOLD_LIGHT,
    fontSize: fontSize(isSmallPhone ? 9 : 11),
    fontWeight: "900",
    letterSpacing: isSmallPhone ? 1.2 : 1.8,
  },

  heroTitle: {
    marginTop: 12,
    color: WHITE,
    fontSize: fontSize(isSmallPhone ? 34 : 40),
    lineHeight: fontSize(isSmallPhone ? 39 : 45),
    fontWeight: "900",
    letterSpacing: isSmallPhone ? -0.8 : -1.4,
  },

  heroText: {
    marginTop: 15,
    width: "100%",
    maxWidth: 420,
    color: "#E5EFEA",
    fontSize: fontSize(isSmallPhone ? 13 : 15),
    lineHeight: fontSize(isSmallPhone ? 20 : 23),
  },

  heroButtons: {
    marginTop: isSmallPhone ? 18 : 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  primaryHeroButton: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: isSmallPhone ? 14 : 18,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: GOLD,
  },

  primaryHeroText: {
    color: GREEN,
    fontWeight: "900",
    fontSize: fontSize(isSmallPhone ? 11 : 13),
  },

  secondaryHeroButton: {
    minHeight: 49,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: isSmallPhone ? 14 : 17,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.4)",
  },

  secondaryHeroText: {
    color: WHITE,
    fontWeight: "800",
    fontSize: fontSize(isSmallPhone ? 11 : 13),
  },

  /* =========================
     QUICK ACTIONS
  ========================= */

  quickWrap: {
    marginTop: -27,
    marginHorizontal: horizontalPadding,
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 24,
    backgroundColor: WHITE,
    elevation: 8,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },

  quickCard: {
    width: isSmallPhone ? "50%" : "25%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 3,
  },

  quickIcon: {
    width: isSmallPhone ? 39 : 42,
    height: isSmallPhone ? 39 : 42,
    borderRadius: 14,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  quickTitle: {
    marginTop: 7,
    color: GREEN,
    fontWeight: "900",
    fontSize: fontSize(isSmallPhone ? 11 : 12),
    textAlign: "center",
  },

  quickSubtitle: {
    marginTop: 1,
    color: MUTED,
    fontSize: fontSize(isSmallPhone ? 8 : 9),
    textAlign: "center",
  },

  /* =========================
     MARKETING
  ========================= */

  marketingCard: {
    marginTop: isSmallPhone ? 38 : 48,
    marginHorizontal: horizontalPadding,
    padding: isSmallPhone ? 19 : 24,
    borderRadius: 28,
    backgroundColor: GREEN,
  },

  marketingBadge: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  marketingBadgeText: {
    flexShrink: 1,
    color: GOLD_LIGHT,
    fontSize: fontSize(isSmallPhone ? 9 : 10),
    fontWeight: "900",
    letterSpacing: isSmallPhone ? 0.5 : 0.8,
  },

  marketingTitle: {
    marginTop: 12,
    color: WHITE,
    fontSize: fontSize(isSmallPhone ? 23 : 27),
    lineHeight: fontSize(isSmallPhone ? 28 : 32),
    fontWeight: "900",
    letterSpacing: -0.6,
  },

  marketingText: {
    marginTop: 11,
    color: "#CEDDD5",
    lineHeight: fontSize(isSmallPhone ? 19 : 21),
    fontSize: fontSize(isSmallPhone ? 12 : 13),
  },

  marketingButton: {
    marginTop: 20,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: GREEN_2,
    paddingHorizontal: isSmallPhone ? 14 : 17,
    paddingVertical: 12,
    borderRadius: 15,
    maxWidth: "100%",
  },

  marketingButtonText: {
    flexShrink: 1,
    color: WHITE,
    fontWeight: "800",
    fontSize: fontSize(isSmallPhone ? 11 : 12),
  },

  /* =========================
     SECTION HEADINGS
  ========================= */

  sectionTitleWrap: {
    marginTop: isSmallPhone ? 48 : 58,
    paddingHorizontal: horizontalPadding,
  },

  eyebrow: {
    color: GOLD,
    fontSize: fontSize(isSmallPhone ? 9 : 10),
    fontWeight: "900",
    letterSpacing: isSmallPhone ? 1.1 : 1.4,
  },

  sectionTitle: {
    marginTop: 8,
    color: TEXT,
    fontSize: fontSize(isSmallPhone ? 23 : 27),
    lineHeight: fontSize(isSmallPhone ? 28 : 32),
    fontWeight: "900",
    letterSpacing: -0.6,
  },

  sectionText: {
    marginTop: 7,
    color: MUTED,
    fontSize: fontSize(isSmallPhone ? 12 : 13),
    lineHeight: fontSize(isSmallPhone ? 18 : 20),
  },

  horizontalList: {
    paddingHorizontal: horizontalPadding,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 13,
  },

  /* =========================
     THERAPIES
  ========================= */

  therapyCard: {
    width: Math.min(
      SCREEN_WIDTH * (isSmallPhone ? 0.68 : 0.56),
      230
    ),
    minWidth: isSmallPhone ? 180 : 195,
    minHeight: 196,
    padding: isSmallPhone ? 16 : 19,
    borderRadius: 24,
    backgroundColor: WHITE,
    elevation: 3,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },

  therapyIcon: {
    width: isSmallPhone ? 47 : 52,
    height: isSmallPhone ? 47 : 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  therapyTitle: {
    marginTop: 15,
    color: TEXT,
    fontWeight: "900",
    fontSize: fontSize(isSmallPhone ? 14 : 16),
    lineHeight: fontSize(isSmallPhone ? 18 : 20),
  },

  therapySub: {
    marginTop: 6,
    color: MUTED,
    fontSize: fontSize(isSmallPhone ? 10 : 11),
    lineHeight: fontSize(isSmallPhone ? 15 : 17),
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
    fontSize: fontSize(isSmallPhone ? 10 : 11),
  },

  /* =========================
     BENEFITS
  ========================= */

  benefitsWrap: {
    marginTop: 20,
    paddingHorizontal: horizontalPadding,
    gap: 11,
  },

  benefitCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: isSmallPhone ? 10 : 14,
    padding: isSmallPhone ? 14 : 17,
    borderRadius: 20,
    backgroundColor: WHITE,
  },

  benefitIcon: {
    width: isSmallPhone ? 43 : 48,
    height: isSmallPhone ? 43 : 48,
    borderRadius: 15,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  benefitTitle: {
    color: TEXT,
    fontWeight: "900",
    fontSize: fontSize(isSmallPhone ? 14 : 15),
  },

  benefitText: {
    marginTop: 4,
    color: MUTED,
    lineHeight: fontSize(isSmallPhone ? 17 : 18),
    fontSize: fontSize(isSmallPhone ? 11 : 12),
  },

  /* =========================
     DOCTORS
  ========================= */

  doctorCard: {
    width: Math.min(
      SCREEN_WIDTH * (isSmallPhone ? 0.72 : 0.62),
      250
    ),
    minWidth: isSmallPhone ? 205 : 220,
    padding: isSmallPhone ? 15 : 18,
    borderRadius: 25,
    alignItems: "center",
    backgroundColor: WHITE,
    elevation: 3,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },

  doctorImage: {
    width: isSmallPhone ? 100 : 118,
    height: isSmallPhone ? 100 : 118,
    borderRadius: isSmallPhone ? 50 : 59,
    backgroundColor: MINT,
    resizeMode: "cover",
  },

  doctorName: {
    marginTop: 14,
    textAlign: "center",
    color: TEXT,
    fontWeight: "900",
    fontSize: fontSize(isSmallPhone ? 14 : 16),
  },

  doctorQualification: {
    marginTop: 5,
    textAlign: "center",
    color: GOLD,
    fontWeight: "800",
    fontSize: fontSize(isSmallPhone ? 10 : 11),
  },

  doctorSpecialty: {
    marginTop: 5,
    color: MUTED,
    fontSize: fontSize(isSmallPhone ? 10 : 11),
    lineHeight: fontSize(isSmallPhone ? 15 : 17),
    textAlign: "center",
  },

  /* =========================
     MEET DOCTORS
  ========================= */

  meetDoctorsWrap: {
    paddingHorizontal: horizontalPadding,
    paddingTop: 18,
  },

  meetDoctorsButton: {
    minHeight: 72,
    paddingHorizontal: isSmallPhone ? 13 : 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: GOLD_LIGHT,
    borderWidth: 1,
    borderColor: "#E4CC83",
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallPhone ? 9 : 12,
  },

  meetDoctorsIcon: {
    width: isSmallPhone ? 41 : 45,
    height: isSmallPhone ? 41 : 45,
    borderRadius: 15,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  meetDoctorsButtonText: {
    color: GREEN,
    fontSize: fontSize(isSmallPhone ? 13 : 14),
    fontWeight: "900",
  },

  meetDoctorsButtonSub: {
    marginTop: 2,
    color: "#6F684F",
    fontSize: fontSize(isSmallPhone ? 9 : 10),
    lineHeight: fontSize(isSmallPhone ? 13 : 14),
  },

  /* =========================
     BEAUTY
  ========================= */

  beautyCard: {
    marginTop: isSmallPhone ? 48 : 62,
    marginHorizontal: horizontalPadding,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#F7EFE8",
  },

  beautyTextWrap: {
    padding: isSmallPhone ? 18 : 23,
  },

  beautyKicker: {
    color: "#9B6D45",
    fontWeight: "900",
    fontSize: fontSize(isSmallPhone ? 9 : 10),
    letterSpacing: isSmallPhone ? 1.1 : 1.4,
  },

  beautyTitle: {
    marginTop: 9,
    color: "#513928",
    fontSize: fontSize(isSmallPhone ? 24 : 28),
    lineHeight: fontSize(isSmallPhone ? 29 : 32),
    fontWeight: "900",
  },

  beautyText: {
    marginTop: 9,
    color: "#806B5C",
    lineHeight: fontSize(isSmallPhone ? 18 : 20),
    fontSize: fontSize(isSmallPhone ? 12 : 13),
  },

  beautyButton: {
    marginTop: 17,
    alignSelf: "flex-start",
    paddingHorizontal: isSmallPhone ? 14 : 16,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: "#513928",
    maxWidth: "100%",
  },

  beautyButtonText: {
    color: WHITE,
    fontWeight: "800",
    fontSize: fontSize(isSmallPhone ? 11 : 12),
  },

  beautyImage: {
  width: "100%",
  height: isSmallPhone ? 190 : 220,
  resizeMode: "cover",
},

  /* =========================
     REVIEWS
  ========================= */

  reviewSection: {
    marginTop: isSmallPhone ? 48 : 62,
    paddingVertical: isSmallPhone ? 35 : 45,
    paddingHorizontal: horizontalPadding,
    backgroundColor: GREEN,
  },

  reviewKicker: {
    color: GOLD_LIGHT,
    fontSize: fontSize(isSmallPhone ? 9 : 10),
    fontWeight: "900",
    letterSpacing: isSmallPhone ? 1.1 : 1.4,
  },

  reviewTitle: {
    marginTop: 8,
    color: WHITE,
    fontSize: fontSize(isSmallPhone ? 24 : 28),
    lineHeight: fontSize(isSmallPhone ? 29 : 34),
    fontWeight: "900",
  },

  reviewCard: {
    marginTop: 20,
    padding: isSmallPhone ? 17 : 21,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,.09)",
  },

  quoteMark: {
    color: GOLD,
    fontSize: fontSize(isSmallPhone ? 38 : 45),
    lineHeight: fontSize(isSmallPhone ? 38 : 45),
  },

  reviewMessage: {
    marginTop: 2,
    color: WHITE,
    lineHeight: fontSize(isSmallPhone ? 20 : 22),
    fontSize: fontSize(isSmallPhone ? 13 : 14),
  },

  reviewBottom: {
    marginTop: 20,
    flexDirection: isSmallPhone ? "column" : "row",
    justifyContent: "space-between",
    alignItems: isSmallPhone ? "flex-start" : "center",
    gap: 10,
  },

  reviewName: {
    color: WHITE,
    fontWeight: "900",
    fontSize: fontSize(isSmallPhone ? 13 : 14),
  },

  reviewService: {
    marginTop: 3,
    color: "#C6D7CE",
    fontSize: fontSize(isSmallPhone ? 9 : 10),
  },

  reviewStars: {
    color: GOLD,
    fontSize: fontSize(isSmallPhone ? 14 : 16),
  },
  /* =========================
   GOOGLE REVIEWS
========================= */

googleHeadingRow: {
  marginTop: 28,
  flexDirection: "row",
  alignItems: "center",
  gap: 11,
},

googleHeadingIcon: {
  width: 42,
  height: 42,
  borderRadius: 14,

  backgroundColor: GOLD_LIGHT,

  alignItems: "center",
  justifyContent: "center",

  flexShrink: 0,
},

googleHeadingTitle: {
  color: WHITE,

  fontSize: fontSize(
    isSmallPhone ? 16 : 18
  ),

  fontWeight: "900",
},

googleHeadingSub: {
  marginTop: 3,

  color: "#C7D9D0",

  fontSize: fontSize(
    isSmallPhone ? 9 : 10
  ),

  lineHeight: fontSize(
    isSmallPhone ? 13 : 15
  ),
},

googleReviewList: {
  paddingTop: 17,
  paddingBottom: 8,

  paddingRight: horizontalPadding,

  gap: 12,
},

googleReviewCard: {
  width: Math.min(
    SCREEN_WIDTH *
      (isSmallPhone ? 0.78 : 0.72),
    310
  ),

  minHeight: isSmallPhone ? 270 : 285,

  padding: isSmallPhone ? 16 : 18,

  borderRadius: 22,

  backgroundColor: WHITE,

  borderWidth: 1,
  borderColor: "#EFE9D8",

  elevation: 4,

  shadowColor: "#000",

  shadowOffset: {
    width: 0,
    height: 3,
  },

  shadowOpacity: 0.1,

  shadowRadius: 7,
},

googleReviewTop: {
  flexDirection: "row",

  alignItems: "center",

  gap: 10,
},

googleAvatar: {
  width: isSmallPhone ? 40 : 44,

  height: isSmallPhone ? 40 : 44,

  borderRadius: isSmallPhone ? 20 : 22,

  backgroundColor: GREEN,

  alignItems: "center",

  justifyContent: "center",

  flexShrink: 0,
},

googleAvatarText: {
  color: WHITE,

  fontSize: fontSize(
    isSmallPhone ? 14 : 16
  ),

  fontWeight: "900",
},

googleReviewerName: {
  color: TEXT,

  fontSize: fontSize(
    isSmallPhone ? 12 : 13
  ),

  fontWeight: "900",
},

googleSourceRow: {
  marginTop: 3,

  flexDirection: "row",

  alignItems: "center",

  gap: 4,
},

googleSourceText: {
  color: MUTED,

  fontSize: fontSize(
    isSmallPhone ? 8 : 9
  ),

  fontWeight: "700",
},

googleStars: {
  marginTop: 13,

  flexDirection: "row",

  alignItems: "center",

  gap: 2,
},

googleReviewMessage: {
  marginTop: 12,

  flex: 1,

  color: TEXT,

  fontSize: fontSize(
    isSmallPhone ? 11 : 12
  ),

  lineHeight: fontSize(
    isSmallPhone ? 17 : 19
  ),
},

googleViewLink: {
  marginTop: 15,

  paddingTop: 12,

  borderTopWidth: 1,

  borderTopColor: "#EEE9DC",

  flexDirection: "row",

  alignItems: "center",

  gap: 5,
},

googleViewLinkText: {
  color: GREEN,

  fontSize: fontSize(
    isSmallPhone ? 10 : 11
  ),

  fontWeight: "900",
},

allGoogleButton: {
  marginTop: 16,

  minHeight: 49,

  paddingHorizontal: 15,

  paddingVertical: 11,

  borderRadius: 16,

  backgroundColor: GOLD,

  flexDirection: "row",

  alignItems: "center",

  justifyContent: "center",

  gap: 8,

  elevation: 2,

  shadowColor: "#000",

  shadowOffset: {
    width: 0,
    height: 2,
  },

  shadowOpacity: 0.08,

  shadowRadius: 4,
},

allGoogleButtonText: {
  flexShrink: 1,

  color: GREEN,

  fontSize: fontSize(
    isSmallPhone ? 11 : 12
  ),

  fontWeight: "900",

  textAlign: "center",
},

reviewSourceRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 12,
},

reviewSourceBadge: {
  alignSelf: "flex-start",

  flexDirection: "row",
  alignItems: "center",

  gap: 6,

  paddingHorizontal: 11,
  paddingVertical: 7,

  borderRadius: 20,

  backgroundColor: GOLD_LIGHT,

  borderWidth: 1,
  borderColor: "rgba(214,180,91,0.55)",
},

reviewSourceBadgeText: {
  color: GREEN,

  fontSize: fontSize(
    isSmallPhone ? 9 : 10
  ),

  fontWeight: "900",

  letterSpacing: 0.7,
},
  /* =========================
     FINAL CTA
  ========================= */

  finalCta: {
    marginTop: isSmallPhone ? 48 : 60,
    marginHorizontal: horizontalPadding,
    padding: isSmallPhone ? 21 : 28,
    alignItems: "center",
    borderRadius: 28,
    backgroundColor: GREEN,
  },

  finalIcon: {
    width: isSmallPhone ? 47 : 52,
    height: isSmallPhone ? 47 : 52,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  finalTitle: {
    marginTop: 15,
    color: WHITE,
    textAlign: "center",
    fontSize: fontSize(isSmallPhone ? 22 : 26),
    lineHeight: fontSize(isSmallPhone ? 27 : 31),
    fontWeight: "900",
  },

  finalText: {
    marginTop: 9,
    color: "#CEDDD5",
    textAlign: "center",
    fontSize: fontSize(isSmallPhone ? 12 : 14),
    lineHeight: fontSize(isSmallPhone ? 18 : 20),
  },

  finalButton: {
    marginTop: 19,
    minHeight: 48,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: isSmallPhone ? 16 : 20,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: GOLD,
  },

  finalButtonText: {
    color: GREEN,
    fontWeight: "900",
    fontSize: fontSize(isSmallPhone ? 12 : 14),
  },

  /* =========================
     CONTACT CARDS
  ========================= */

  contactCard: {
    marginTop: 35,
    marginHorizontal: horizontalPadding,
    padding: isSmallPhone ? 18 : 23,
    borderRadius: 25,
    backgroundColor: WHITE,
  },

  contactKicker: {
    color: GOLD,
    fontWeight: "900",
    fontSize: fontSize(isSmallPhone ? 9 : 10),
    letterSpacing: isSmallPhone ? 1 : 1.2,
  },

  contactTitle: {
    marginTop: 7,
    color: TEXT,
    fontSize: fontSize(isSmallPhone ? 17 : 20),
    lineHeight: fontSize(isSmallPhone ? 22 : 25),
    fontWeight: "900",
  },

  contactText: {
    marginTop: 7,
    color: MUTED,
    lineHeight: fontSize(isSmallPhone ? 18 : 19),
    fontSize: fontSize(isSmallPhone ? 11 : 12),
  },

  contactButtons: {
    marginTop: 17,
    flexDirection: isSmallPhone ? "column" : "row",
    gap: 10,
  },

  contactOutline: {
    flex: isSmallPhone ? undefined : 1,
    width: isSmallPhone ? "100%" : undefined,
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
    fontSize: fontSize(isSmallPhone ? 12 : 14),
  },

  contactFilled: {
    flex: isSmallPhone ? undefined : 1,
    width: isSmallPhone ? "100%" : undefined,
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
    fontSize: fontSize(isSmallPhone ? 12 : 14),
  },

  /* =========================
     FOOTER
  ========================= */

  footer: {
    marginTop: isSmallPhone ? 45 : 58,
    paddingTop: isSmallPhone ? 34 : 42,
    paddingBottom: 34,
    paddingHorizontal: horizontalPadding,
    alignItems: "center",
    backgroundColor: "#0A271A",
  },

  footerLogo: {
    width: isSmallPhone ? 56 : 62,
    height: isSmallPhone ? 56 : 62,
    borderRadius: isSmallPhone ? 18 : 21,
  },

  footerBrand: {
    marginTop: 13,
    color: WHITE,
    fontSize: fontSize(isSmallPhone ? 18 : 20),
    fontWeight: "900",
    textAlign: "center",
  },

  footerTagline: {
    marginTop: 8,
    width: "100%",
    maxWidth: 420,
    color: "#C6D4CB",
    textAlign: "center",
    fontSize: fontSize(isSmallPhone ? 11 : 12),
    lineHeight: fontSize(isSmallPhone ? 17 : 19),
  },

  footerRow: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 7,
  },

  footerText: {
    flexShrink: 1,
    color: "#E1EAE4",
    fontSize: fontSize(isSmallPhone ? 11 : 12),
    fontWeight: "600",
    textAlign: "center",
  },

  footerAddress: {
    marginTop: 15,
    width: "100%",
    maxWidth: 390,
    color: "#AFC0B6",
    textAlign: "center",
    fontSize: fontSize(isSmallPhone ? 10 : 11),
    lineHeight: fontSize(isSmallPhone ? 16 : 18),
  },

  socialRow: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },

  socialButton: {
    width: isSmallPhone ? 39 : 42,
    height: isSmallPhone ? 39 : 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  copyright: {
    marginTop: 25,
    color: "#81978A",
    fontSize: fontSize(isSmallPhone ? 9 : 10),
    lineHeight: fontSize(15),
    textAlign: "center",
  },

  /* =========================
     FLOATING WHATSAPP
  ========================= */

  whatsapp: {
    position: "absolute",
    right: isSmallPhone ? 14 : 18,
    bottom: Platform.OS === "web" ? 20 : 82,
    width: isSmallPhone ? 52 : 56,
    height: isSmallPhone ? 52 : 56,
    borderRadius: isSmallPhone ? 17 : 18,
    backgroundColor: "#20C764",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
});