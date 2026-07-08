import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const sections = [
  {
    title: "1. Wellness Information Only",
    text: "The information provided through Neolife Wellness Center's app, website, videos, product pages, therapy pages and consultation-related content is intended for general wellness awareness and educational purposes only.",
  },
  {
    title: "2. Not Emergency Medical Care",
    text: "This platform does not provide emergency medical services. In case of emergency, severe symptoms, sudden illness, injury or life-threatening condition, users must contact emergency medical services or visit the nearest hospital immediately.",
  },
  {
    title: "3. Ayurvedic Consultation",
    text: "Ayurvedic consultation and wellness guidance are based on information voluntarily provided by users. Results may vary depending on individual body constitution, health condition, lifestyle, diet and compliance with professional advice.",
  },
  {
    title: "4. No Guaranteed Cure",
    text: "Neolife Wellness Center does not guarantee cure, complete recovery, disease prevention, treatment success or specific health outcomes from any consultation, therapy, product or wellness recommendation.",
  },
  {
    title: "5. Products & Usage",
    text: "Ayurvedic products, herbal products, oils, supplements and wellness products should be used according to label instructions or professional guidance. Users should check dosage, precautions, allergy warnings and product information before use.",
  },
  {
    title: "6. Individual Results May Vary",
    text: "Ayurvedic and wellness product effectiveness may differ from person to person. Factors such as age, lifestyle, diet, existing diseases, medications, allergies and body constitution may affect results.",
  },
  {
    title: "7. Pregnancy & Chronic Conditions",
    text: "Users who are pregnant, breastfeeding, elderly, children, or those with chronic illness, severe medical conditions, allergies, or ongoing medication should consult a qualified healthcare professional before using any product or therapy.",
  },
  {
    title: "8. User Responsibility",
    text: "Users are responsible for providing accurate health information, medical history, allergies, existing conditions and current medications during consultation. Incomplete or incorrect information may affect guidance quality.",
  },
  {
    title: "9. Online Consultation Limitations",
    text: "Online or video consultation may be affected by internet issues, technical errors, incomplete communication or limited physical examination. Users should seek in-person medical evaluation when necessary.",
  },
  {
    title: "10. Liability Limitation",
    text: "Neolife Wellness Center shall not be responsible for self-medication, misuse of products, overdose, allergic reactions, delayed medical attention, incomplete disclosure of health information or reliance on wellness information against professional medical advice.",
  },
  {
    title: "11. Professional Advice",
    text: "Nothing in this app should be considered a substitute for direct medical examination, emergency care, diagnosis or treatment from a qualified healthcare professional where required.",
  },
  {
    title: "12. Contact",
    text: "For wellness guidance, product usage clarification or appointment support, users may contact Neolife Wellness Center, Udupi, Karnataka.\n\nPhone: +91 9481489866\nWebsite: neolifeayush.com",
  },
];

export default function MedicalDisclaimerScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Medical Disclaimer</Text>
          <Text style={styles.headerSub}>Important health information</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Ionicons name="medkit-outline" size={44} color="#fff" />
        <Text style={styles.heroTitle}>Health & Wellness Disclaimer</Text>
        <Text style={styles.heroText}>
          Please read this disclaimer carefully before using Neolife Wellness
          Center's app, consultations, therapies or Ayurvedic products.
        </Text>
      </View>

      <View style={styles.warningBox}>
        <Ionicons name="warning-outline" size={24} color="#ef6c00" />
        <Text style={styles.warningText}>
          This app does not provide emergency medical care. In emergencies,
          contact emergency services or visit the nearest hospital immediately.
        </Text>
      </View>

      {sections.map((item) => (
        <View style={styles.card} key={item.title}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          <Text style={styles.sectionText}>{item.text}</Text>
        </View>
      ))}

      <View style={{ height: 35 }} />
    </ScrollView>
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
    paddingBottom: 16,
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
  headerSub: {
    color: "#666",
    fontSize: 13,
    marginTop: 2,
  },
  hero: {
    marginHorizontal: 18,
    marginBottom: 16,
    backgroundColor: "#1B5E20",
    borderRadius: 24,
    padding: 22,
    elevation: 5,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "bold",
    marginTop: 12,
  },
  heroText: {
    color: "#e8f5e9",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  warningBox: {
    marginHorizontal: 18,
    marginBottom: 16,
    backgroundColor: "#fff3e0",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    gap: 10,
    elevation: 3,
  },
  warningText: {
    color: "#5d4037",
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
    fontWeight: "600",
  },
  card: {
    marginHorizontal: 18,
    marginBottom: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    elevation: 3,
  },
  sectionTitle: {
    color: "#064b16",
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 8,
  },
  sectionText: {
    color: "#555",
    fontSize: 14,
    lineHeight: 23,
  },
});