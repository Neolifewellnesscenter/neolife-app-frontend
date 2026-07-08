import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PAPPYJOE_URL =
  "https://cloud.pappyjoe.com/widget/index/UjhcZVAxCz0DYgNjAzUIYw%3D%3D";

const therapyDetails: any = {
  "Ayurvedic Consultation": {
    icon: "leaf-outline",
    subtitle: "Personalized Ayurvedic health guidance",
    about:
      "Ayurvedic consultation focuses on understanding body constitution, lifestyle, diet, digestion, sleep and overall wellness. Guidance is personalized according to individual health needs.",
    benefits: [
      "Personalized wellness advice",
      "Diet and lifestyle guidance",
      "Natural health support",
      "Preventive care approach",
    ],
    procedure: [
      "Health history discussion",
      "Lifestyle and diet assessment",
      "Ayurvedic wellness guidance",
      "Follow-up care suggestions",
    ],
  },

  Panchakarma: {
    icon: "medkit-outline",
    subtitle: "Traditional detox and rejuvenation therapy",
    about:
      "Panchakarma is a classical Ayurvedic detox and rejuvenation therapy that supports cleansing, relaxation and wellness restoration.",
    benefits: [
      "Supports detoxification",
      "Body rejuvenation",
      "Improves wellness",
      "Promotes relaxation",
    ],
    procedure: [
      "Doctor consultation",
      "Preparation therapies",
      "Main Panchakarma procedure",
      "Post-therapy diet and care",
    ],
  },

  Acupuncture: {
    icon: "pulse-outline",
    subtitle: "Supportive therapy for pain and stress",
    about:
      "Acupuncture is a supportive therapy that helps with pain relief, stress reduction, relaxation and body balance.",
    benefits: [
      "Pain relief support",
      "Stress reduction",
      "Muscle relaxation",
      "Energy balance support",
    ],
    procedure: [
      "Consultation and assessment",
      "Point selection",
      "Professional needle application",
      "Relaxation and follow-up care",
    ],
  },

  Naturopathy: {
    icon: "flower-outline",
    subtitle: "Drug-free natural wellness care",
    about:
      "Naturopathy focuses on natural healing through diet, lifestyle correction, yoga, hydrotherapy and preventive wellness practices.",
    benefits: [
      "Natural healing support",
      "Healthy lifestyle improvement",
      "Preventive wellness",
      "Diet and nutrition guidance",
    ],
    procedure: [
      "Lifestyle assessment",
      "Diet and wellness planning",
      "Natural therapy guidance",
      "Progress follow-up",
    ],
  },

  Yoga: {
    icon: "body-outline",
    subtitle: "Mind and body wellness practice",
    about:
      "Yoga supports flexibility, strength, breathing, mental calmness and inner balance through guided practices.",
    benefits: [
      "Improves flexibility",
      "Supports mental calmness",
      "Enhances strength",
      "Supports breathing",
    ],
    procedure: [
      "Initial assessment",
      "Guided yoga practice",
      "Breathing exercises",
      "Home practice guidance",
    ],
  },
};

const beautyServices = [
  {
    icon: "sparkles-outline",
    title: "Facials",
    desc: "Professional facial care for skin cleansing, glow, hydration and rejuvenation.",
    items: ["Hydra Facial", "Gold Facial", "Oxy Facial", "Fruit Facial", "Anti-Aging Facial"],
  },
  {
    icon: "color-wand-outline",
    title: "Lip Treatments",
    desc: "Natural cosmetic lip care for dark lips and lip tone correction.",
    items: ["Dark Lip Correction", "Lip Neutralization"],
  },
  {
    icon: "eye-outline",
    title: "Eyebrow Treatments",
    desc: "Eyebrow shaping and enhancement treatments for a defined natural look.",
    items: ["Ombre Eyebrows", "Combination Eyebrows", "Eyebrow Reconstruction"],
  },
  {
    icon: "leaf-outline",
    title: "Hair Treatment",
    desc: "Hair wellness therapy to support scalp care, hair roots and natural hair growth.",
    items: ["Hair Growth Therapy", "Scalp Rejuvenation", "Hair Pack Treatment"],
  },
  {
    icon: "hand-left-outline",
    title: "Manicure",
    desc: "Complete hand, nail and cuticle care for clean and healthy hands.",
    items: ["Nail Care", "Hand Massage", "Cuticle Care"],
  },
  {
    icon: "walk-outline",
    title: "Pedicure",
    desc: "Foot cleansing, nail trimming, exfoliation, massage and complete foot care.",
    items: ["Foot Cleansing", "Nail Trimming", "Exfoliation", "Foot Massage"],
  },
];

export default function TherapyDetailsScreen() {
  const { title } = useLocalSearchParams();
  const therapyTitle = title?.toString() || "Ayurvedic Consultation";

  const isBeauty =
    therapyTitle === "Beauty Therapy" || therapyTitle === "Beauty & Cosmetics";

  const data =
    therapyDetails[therapyTitle] || therapyDetails["Ayurvedic Consultation"];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Therapy Details</Text>
      </View>

      {isBeauty ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles-outline" size={42} color="#1B5E20" />
            </View>

            <Text style={styles.title}>Beauty & Cosmetics</Text>
            <Text style={styles.subtitle}>
              Professional skin, lip, eyebrow, hair, hand and foot care services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Beauty Services</Text>
            <Text style={styles.text}>
              Explore our professional beauty and cosmetic treatments designed
              for natural beauty enhancement and complete personal care.
            </Text>
          </View>

          {beautyServices.map((service) => (
            <View style={styles.beautyCard} key={service.title}>
              <View style={styles.beautyTop}>
                <View style={styles.beautyIconBox}>
                  <Ionicons
                    name={service.icon as any}
                    size={28}
                    color="#1B5E20"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.beautyTitle}>{service.title}</Text>
                  <Text style={styles.beautyDesc}>{service.desc}</Text>
                </View>
              </View>

              <View style={styles.serviceList}>
                {service.items.map((item) => (
                  <View style={styles.servicePill} key={item}>
                    <Ionicons name="checkmark-circle" size={15} color="#1B5E20" />
                    <Text style={styles.serviceText}>{item}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.beautyBookBtn}
                onPress={() => Linking.openURL(PAPPYJOE_URL)}
              >
                <Text style={styles.beautyBookText}>Book Appointment</Text>
                <Ionicons name="calendar-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </>
      ) : (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name={data.icon as any} size={42} color="#1B5E20" />
            </View>

            <Text style={styles.title}>{therapyTitle}</Text>
            <Text style={styles.subtitle}>{data.subtitle}</Text>
          </View>

          <Section title="About Therapy">
            <Text style={styles.text}>{data.about}</Text>
          </Section>

          <Section title="Benefits">
            {data.benefits.map((item: string) => (
              <Bullet key={item} text={item} />
            ))}
          </Section>

          <Section title="Procedure">
            {data.procedure.map((item: string, index: number) => (
              <View style={styles.stepRow} key={item}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepNo}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{item}</Text>
              </View>
            ))}
          </Section>
        </>
      )}

      <TouchableOpacity
        style={styles.bookBtn}
        onPress={() => Linking.openURL(PAPPYJOE_URL)}
      >
        <Text style={styles.bookText}>Book Appointment</Text>
        <Ionicons name="calendar-outline" size={21} color="#fff" />
      </TouchableOpacity>

      <View style={{ height: 35 }} />
    </ScrollView>
  );
}

function Section({ title, children }: any) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name="checkmark-circle" size={18} color="#1B5E20" />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  headerTitle: {
    color: "#064b16",
    fontSize: 23,
    fontWeight: "bold",
  },
  heroCard: {
    margin: 18,
    backgroundColor: "#1B5E20",
    borderRadius: 26,
    padding: 24,
    alignItems: "center",
    elevation: 5,
  },
  heroIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: "#e8f5e9",
    fontSize: 14,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 21,
  },
  section: {
    marginHorizontal: 18,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 20,
    elevation: 4,
  },
  sectionTitle: {
    color: "#064b16",
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 10,
  },
  text: {
    color: "#555",
    fontSize: 14,
    lineHeight: 23,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 10,
  },
  bulletText: {
    color: "#444",
    fontSize: 14,
    flex: 1,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1B5E20",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNo: {
    color: "#fff",
    fontWeight: "bold",
  },
  stepText: {
    color: "#444",
    fontSize: 14,
    flex: 1,
    lineHeight: 21,
  },
  bookBtn: {
    marginHorizontal: 18,
    backgroundColor: "#1B5E20",
    paddingVertical: 16,
    borderRadius: 28,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 5,
  },
  bookText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  beautyCard: {
    marginHorizontal: 18,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    elevation: 4,
  },
  beautyTop: {
    flexDirection: "row",
    gap: 14,
  },
  beautyIconBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
  },
  beautyTitle: {
    color: "#064b16",
    fontSize: 18,
    fontWeight: "bold",
  },
  beautyDesc: {
    color: "#555",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
  },
  serviceList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 15,
  },
  servicePill: {
    backgroundColor: "#e8f5e9",
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  serviceText: {
    color: "#1B5E20",
    fontSize: 12,
    fontWeight: "600",
  },
  beautyBookBtn: {
    marginTop: 16,
    backgroundColor: "#1B5E20",
    paddingVertical: 13,
    borderRadius: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  beautyBookText: {
    color: "#fff",
    fontWeight: "bold",
  },
});