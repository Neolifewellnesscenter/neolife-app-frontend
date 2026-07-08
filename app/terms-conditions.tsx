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
    title: "1. Introduction",
    text: "These Terms & Conditions govern your access to and use of Neolife Wellness Center's website, mobile application, online consultation services, appointment booking, Ayurvedic therapies, wellness programs and e-commerce platform.",
  },
  {
    title: "2. Eligibility",
    text: "Users must be legally competent to enter into agreements. Users below 18 years must access the platform under lawful parental or guardian supervision.",
  },
  {
    title: "3. User Account Registration",
    text: "Users are responsible for providing accurate information, maintaining the confidentiality of their login credentials and all activities performed using their account.",
  },
  {
    title: "4. Ayurvedic Consultation Services",
    text: "Online and offline consultations are intended for wellness guidance and Ayurvedic consultation. Consultation outcomes vary between individuals and do not guarantee cure or treatment success.",
  },
  {
    title: "5. Video Consultation",
    text: "Video consultations depend on internet connectivity and technical availability. Users should not record or misuse consultation sessions without authorization.",
  },
  {
    title: "6. Appointment Booking",
    text: "Appointments are subject to doctor availability. Timing may change due to operational reasons. Missed appointments may not qualify for refunds according to applicable policies.",
  },
  {
    title: "7. Ayurvedic Products",
    text: "Product descriptions are provided for informational purposes only. Results may vary from person to person. Please follow dosage instructions and consult a qualified practitioner when required.",
  },
  {
    title: "8. Payments",
    text: "Payments are processed through secure third-party payment gateways. Prices, taxes, shipping charges and convenience fees may change without prior notice.",
  },
  {
    title: "9. Shipping & Returns",
    text: "Delivery timelines are estimates. Returns, replacements and refunds are governed by the applicable Return & Refund Policy. Certain consumable products may not be eligible for return.",
  },
  {
    title: "10. User Responsibilities",
    text: "Users agree not to misuse the platform, upload false or unlawful information, interfere with platform security or engage in fraudulent activities.",
  },
  {
    title: "11. Health Disclaimer",
    text: "The platform provides wellness-oriented Ayurvedic guidance and does not replace emergency medical care. Users should seek immediate medical attention during emergencies.",
  },
  {
    title: "12. Intellectual Property",
    text: "All logos, trademarks, content, designs, graphics, product information, software and platform materials remain the intellectual property of Neolife Wellness Center or their respective owners.",
  },
  {
    title: "13. Privacy",
    text: "Personal information is collected and processed according to our Privacy Policy. Continued use of the platform indicates your acceptance of these practices.",
  },
  {
    title: "14. Limitation of Liability",
    text: "Neolife Wellness Center is not responsible for indirect damages, internet failures, third-party payment failures, delivery delays, allergic reactions due to misuse or incomplete health information provided by users.",
  },
  {
    title: "15. Suspension & Termination",
    text: "We reserve the right to suspend or terminate accounts involved in fraudulent activity, misuse of services, legal violations or operational security risks.",
  },
  {
    title: "16. Governing Law",
    text: "These Terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of competent courts located in Udupi, Karnataka.",
  },
  {
    title: "17. Contact Information",
    text: "Neolife Wellness Center\nDoor No. 4-1-38, Dr. Muraleedhara N G Building,\nBehind Lions Bhavan Road,\nUdupi, Karnataka – 576103\n\nPhone: +91 9481489866\nEmail: neelavar.murali@gmail.com\nWebsite: neolifeayush.com",
  },
];

export default function TermsConditionsScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Terms & Conditions</Text>
          <Text style={styles.headerSub}>Last Updated: 16/05/2026</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Ionicons name="document-text-outline" size={44} color="#fff" />
        <Text style={styles.heroTitle}>Terms & Conditions</Text>
        <Text style={styles.heroText}>
          These terms explain the rules, responsibilities, rights and obligations
          governing your use of Neolife Wellness Center's app, website,
          consultations, appointments and Ayurvedic products.
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