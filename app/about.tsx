import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { router } from "expo-router";
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const offers = [
  {
    icon: "leaf-outline",
    title: "Ayurveda",
    text: "Traditional Ayurvedic consultation and personalized health guidance.",
  },
  {
    icon: "flower-outline",
    title: "Panchakarma",
    text: "Detox and rejuvenation therapies for complete body wellness.",
  },
  {
    icon: "locate-outline",
    title: "Acupuncture",
    text: "Supportive therapy for pain relief, stress management and body balance.",
  },
  {
    icon: "nutrition-outline",
    title: "Naturopathy",
    text: "Natural therapies, healthy nutrition, yoga and drug-free wellness care.",
  },
  {
    icon: "body-outline",
    title: "Yoga",
    text: "Yoga practices for flexibility, calmness, strength and inner balance.",
  },
  {
    icon: "sparkles-outline",
    title: "Beauty Therapy",
    text: "Eyebrow reconstruction, black lip treatment and skin care.",
  },
];


export default function AboutScreen() {
  const player = useVideoPlayer(
  require("../assets/videos/neolife-video.mp4"),
  (player) => {
    player.loop = false;
  }
);
  return (
    <View style={styles.main}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1B5E20" />
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>About Us</Text>
            <Text style={styles.headerSub}>Neolife Wellness Center</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Image
            source={require("../assets/images/neolife2.png")}
            style={styles.heroImage}
          />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>About Neolife Wellness Center</Text>
            <Text style={styles.heroText}>
              Natural healing through Ayurveda, Panchakarma, Yoga, Acupuncture
              and Nature Cure.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Image
            source={require("../assets/images/main_logo.jpeg")}
            style={styles.logo}
          />

          <Text style={styles.title}>Welcome to Neolife Wellness Center</Text>

          <Text style={styles.desc}>
            Neolife Wellness Center is dedicated to promoting natural health and
            holistic wellness through Ayurveda, Panchakarma, Yoga, Acupuncture
            and Naturopathy.
          </Text>

          <Text style={styles.desc}>
            Our goal is to help individuals achieve complete physical, mental
            and emotional wellbeing through personalized care and natural healing
            therapies.
          </Text>

          <View style={styles.features}>
            <Feature icon="leaf-outline" text="Ayurveda" />
            <Feature icon="flower-outline" text="Panchakarma" />
            <Feature icon="locate-outline" text="Acupuncture" />
            <Feature icon="body-outline" text="Yoga" />
            <Feature icon="nutrition-outline" text="Naturopathy" />
            <Feature icon="sparkles-outline" text="Beauty Therapy" />
          </View>
        </View>
<View style={styles.videoSection}>
  <Text style={styles.sectionTitleNoMargin}>
    Take a Virtual Tour of Our Wellness Center
  </Text>

  <Text style={styles.videoText}>
    Experience the peaceful environment of Neolife Wellness Center,
    explore our treatment rooms, therapy facilities, consultation areas,
    yoga space and holistic healing services.
  </Text>

  <View style={styles.videoBox}>
    <VideoView
      style={styles.video}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
      nativeControls
    />
  </View>
</View>

        <Text style={styles.sectionTitle}>Our Mission & Vision</Text>

        <InfoCard
          icon="flag-outline"
          title="Our Mission"
          text="To provide natural, affordable and personalized wellness care through Ayurveda and holistic therapies."
        />

        <InfoCard
          icon="eye-outline"
          title="Our Vision"
          text="To become a trusted wellness center for families seeking natural healing and preventive healthcare."
        />

        <InfoCard
          icon="heart-outline"
          title="Our Care"
          text="We focus on complete wellness including physical health, mental peace and lifestyle balance."
        />

        <Text style={styles.sectionTitle}>What We Offer</Text>

        <View style={styles.offerGrid}>
          {offers.map((item) => (
            <View style={styles.offerCard} key={item.title}>
              <View style={styles.offerIconBox}>
                <Ionicons name={item.icon as any} size={26} color="#1B5E20" />
              </View>
              <Text style={styles.offerTitle}>{item.title}</Text>
              <Text style={styles.offerText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2026 Neolife Wellness Center. All Rights Reserved.
          </Text>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.whatsapp}
        onPress={() => Linking.openURL("https://wa.me/919481489866")}
      >
        <Ionicons name="logo-whatsapp" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function Feature({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.featurePill}>
      <Ionicons name={icon} size={16} color="#1B5E20" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: any;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIconBox}>
        <Ionicons name={icon} size={27} color="#1B5E20" />
      </View>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: "#fbfff9",
  },
  container: {
    flex: 1,
    backgroundColor: "#fbfff9",
  },
  header: {
    paddingTop: 55,
    paddingHorizontal: 18,
    paddingBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  headerTitle: {
    color: "#064b16",
    fontSize: 23,
    fontWeight: "bold",
  },
  headerSub: {
    color: "#666",
    fontSize: 13,
    marginTop: 2,
  },
  hero: {
    marginHorizontal: 18,
    height: 230,
    borderRadius: 24,
    overflow: "hidden",
    elevation: 6,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "bold",
  },
  heroText: {
    color: "#e8f5e9",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  card: {
    margin: 18,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    elevation: 5,
    alignItems: "center",
  },
  logo: {
    width: 95,
    height: 95,
    borderRadius: 48,
    marginBottom: 15,
  },
  title: {
    color: "#064b16",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  desc: {
    color: "#444",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginBottom: 10,
  },
  features: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 15,
  },
  featurePill: {
    backgroundColor: "#e8f5e9",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  featureText: {
    color: "#1B5E20",
    fontWeight: "bold",
    fontSize: 13,
  },
  videoSection: {
    marginHorizontal: 18,
    marginBottom: 18,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    elevation: 5,
  },
  sectionTitleNoMargin: {
    color: "#064b16",
    fontSize: 21,
    fontWeight: "bold",
    marginBottom: 10,
  },
  videoText: {
    color: "#555",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 15,
  },
  videoBox: {
    height: 210,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#e8f5e9",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  sectionTitle: {
    color: "#064b16",
    fontSize: 22,
    fontWeight: "bold",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 14,
  },
  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 18,
    marginBottom: 14,
    borderRadius: 20,
    padding: 20,
    elevation: 4,
  },
  infoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  infoTitle: {
    color: "#1B5E20",
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 7,
  },
  infoText: {
    color: "#555",
    fontSize: 14,
    lineHeight: 22,
  },
  offerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    justifyContent: "space-between",
  },
  offerCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    elevation: 4,
  },
  offerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  offerTitle: {
    color: "#064b16",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  offerText: {
    color: "#555",
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    paddingVertical: 25,
    paddingBottom: 45,
    alignItems: "center",
  },
  footerText: {
    color: "#777",
    fontSize: 12,
  },
  whatsapp: {
    position: "absolute",
    right: 20,
    bottom: 25,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#25D366",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
});