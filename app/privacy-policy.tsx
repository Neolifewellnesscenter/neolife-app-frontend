import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const sections = [
  {
    title: "1. Introduction",
    text: "This Privacy Policy explains how Neolife Wellness Center, operating under the brand name NEOLIFEAYUSH, collects, stores, uses, processes, shares and protects user information when using the website, mobile app, wellness services, consultation systems and e-commerce services.",
  },
  {
    title: "2. Information We Collect",
    text: "We may collect personal details such as name, age, gender, phone number, email, address, login details, identity details, appointment details, product order details, payment references, technical information and device information.",
  },
  {
    title: "3. Health & Wellness Information",
    text: "For consultation and wellness services, we may collect medical history, lifestyle information, symptoms, consultation records, prescriptions, wellness assessments, uploaded medical documents and related communication records.",
  },
  {
    title: "4. Purpose of Use",
    text: "Information is used to provide Ayurvedic consultations, schedule appointments, process product orders, deliver products, manage accounts, send reminders, improve services, prevent fraud and comply with legal obligations.",
  },
  {
    title: "5. Video Consultation",
    text: "Video consultations are intended for wellness guidance and non-emergency consultation purposes. Technical interruptions may occur, and emergency medical conditions should not rely only on online consultation.",
  },
  {
    title: "6. Product Sales",
    text: "Ayurvedic product results may vary from person to person. Users should read labels, dosage instructions, allergy warnings and product information before use.",
  },
  {
    title: "7. Data Sharing",
    text: "Information may be shared with doctors, therapists, payment gateways, logistics partners, hosting providers, analytics providers, auditors, legal consultants and authorities where legally required.",
  },
  {
    title: "8. Data Retention",
    text: "Information is retained as long as necessary for service delivery, consultation continuity, legal compliance, taxation, accounting, fraud prevention, dispute resolution and operational requirements.",
  },
  {
    title: "9. User Rights",
    text: "Users may request access, correction, update, deletion, withdrawal of consent or restriction of specific processing activities, subject to applicable law and operational requirements.",
  },
  {
    title: "10. Security Practices",
    text: "Neolife Wellness Center follows reasonable security practices including encrypted systems, password protection, secure infrastructure, access restrictions and confidentiality obligations.",
  },
  {
    title: "11. Children’s Privacy",
    text: "The platform is not intended for persons below 18 years of age without lawful parental or guardian supervision.",
  },
  {
    title: "12. Third-Party Services",
    text: "The platform may contain third-party services such as payment gateways, communication platforms or external links. Users access third-party services at their own discretion.",
  },
  {
    title: "13. Policy Updates",
    text: "Neolife Wellness Center may update this Privacy Policy from time to time. Users are encouraged to review the policy periodically.",
  },
  {
    title: "14. Contact Information",
    text: "Neolife Wellness Center, Door No: 4-1-38, Dr. Muraleedhara N G Building, Udupi-Town, Amalapady Block, Behind Lions Bhavan Road, Udupi, Karnataka - 576103.\n\nMobile: 9481489866\nEmail: neelavar.murali@gmail.com\nWebsite: neolifeayush.com",
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <View>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <Text style={styles.headerSub}>Last Updated: 16/05/2026</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Ionicons name="shield-checkmark-outline" size={44} color="#fff" />
        <Text style={styles.heroTitle}>Your Privacy Matters</Text>
        <Text style={styles.heroText}>
          This policy explains how Neolife Wellness Center protects your personal,
          health, appointment and order information.
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
    fontSize: 24,
    fontWeight: "bold",
  },
  headerSub: {
    color: "#666",
    fontSize: 13,
    marginTop: 2,
  },
  hero: {
    marginHorizontal: 18,
    marginBottom: 18,
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