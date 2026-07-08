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
    icon: "flower-outline",
    subtitle: "Traditional detox and rejuvenation therapy",
    about:
      "Panchakarma is a classical Ayurvedic detoxification and rejuvenation approach that helps support body cleansing, relaxation and wellness restoration.",
    benefits: [
      "Supports detoxification",
      "Promotes relaxation",
      "Improves overall wellness",
      "Supports body rejuvenation",
    ],
    procedure: [
      "Doctor consultation",
      "Preparation therapies",
      "Main Panchakarma procedure",
      "Post-therapy diet and care guidance",
    ],
  },
  Acupuncture: {
    icon: "locate-outline",
    subtitle: "Supportive therapy for pain and stress",
    about:
      "Acupuncture is a supportive wellness therapy that may help with pain relief, stress reduction, body balance and relaxation.",
    benefits: [
      "Pain relief support",
      "Stress reduction",
      "Muscle relaxation",
      "Energy balance support",
    ],
    procedure: [
      "Consultation and assessment",
      "Point selection",
      "Needle application by trained professional",
      "Relaxation and follow-up guidance",
    ],
  },
  Naturopathy: {
    icon: "nutrition-outline",
    subtitle: "Drug-free natural wellness care",
    about:
      "Naturopathy focuses on natural healing through diet, lifestyle, yoga, hydrotherapy and preventive health practices.",
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
      "Yoga supports flexibility, strength, breathing, calmness and mental balance through guided practices.",
    benefits: [
      "Improves flexibility",
      "Supports mental calmness",
      "Enhances strength",
      "Supports breathing and relaxation",
    ],
    procedure: [
      "Initial assessment",
      "Guided yoga practice",
      "Breathing exercises",
      "Home practice guidance",
    ],
  },
  "Beauty Therapy": {
    icon: "sparkles-outline",
    subtitle: "Natural beauty and cosmetic wellness care",
    about:
      "Beauty therapy at Neolife includes natural cosmetic care such as eyebrow reconstruction, black lip treatment and skin care.",
    benefits: [
      "Natural skin care",
      "Cosmetic wellness",
      "Personalized beauty care",
      "Confidence and appearance support",
    ],
    procedure: [
      "Skin or cosmetic concern assessment",
      "Therapy planning",
      "Professional treatment",
      "After-care guidance",
    ],
  },
};

export default function TherapyDetailsScreen() {
  const { title } = useLocalSearchParams();
  const therapyTitle = title?.toString() || "Ayurvedic Consultation";
  const data = therapyDetails[therapyTitle] || therapyDetails["Ayurvedic Consultation"];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Therapy Details</Text>
      </View>

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

      <TouchableOpacity
  style={styles.bookBtn}
  onPress={() =>
    Linking.openURL("https://cloud.pappyjoe.com/widget/index/UjhcZVAxCz0DYgNjAzUIYw%3D%3DK")
  }
>
        <Text style={styles.bookText}>Book Appointment</Text>
        
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
});