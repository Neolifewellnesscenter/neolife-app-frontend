import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const doctors = [
  {
    id: 1,
    name: "Dr. N. G. Muraleedhara",
    degree: "BAMS",
    spec: "Ayurveda & Panchakarma Consultant",
    experience: "20+",
    patients: "5000+",
    specialist: "Ayurveda",
    image: require("../assets/images/doctors/Dr-murali.png"),
    about:
      "Dr. N. G. Muraleedhara is an experienced Ayurveda and Panchakarma consultant, providing personalized wellness guidance through natural healing, lifestyle correction and traditional Ayurvedic therapies.",
    expertise: [
      "Ayurvedic Consultation",
      "Panchakarma Therapies",
      "Lifestyle Wellness Guidance",
      "Stress & Pain Management",
      "Digestive and Metabolic Wellness",
    ],
  },
  {
    id: 2,
    name: "Dr. Aditi",
    degree: "BNYS",
    spec: "Yoga & Naturopathy Consultant",
    experience: "5+",
    patients: "1000+",
    specialist: "Naturopathy",
    image: require("../assets/images/doctors/Dr-adithi.png"),
    about:
      "Dr. Aditi specializes in Yoga and Naturopathy, helping patients improve wellness through natural therapies, lifestyle correction, yoga practices and preventive health guidance.",
    expertise: [
      "Yoga Therapy",
      "Naturopathy Care",
      "Lifestyle Wellness",
      "Stress Management",
      "Preventive Healthcare",
    ],
  },
  {
    id: 3,
    name: "Dr. Sibagath Ulla Sharieff R",
    degree: "BAMS, MD(Ayu)",
    spec: "Ayurveda Consultant",
    experience: "Senior",
    patients: "3000+",
    specialist: "Ayurveda",
    image: require("../assets/images/doctors/Dr-sibgath.jpg"),
    about:
      "Dr. Sibagath Ulla Sharieff R is a senior Ayurvedic physician with strong clinical knowledge in traditional Ayurvedic care and patient-centered wellness treatment.",
    expertise: [
      "Ayurvedic Medicine",
      "Clinical Ayurveda",
      "Wellness Consultation",
      "Digestive Health",
      "Chronic Condition Support",
    ],
  },
  {
    id: 4,
    name: "Dr. Vijay B. Negalur",
    degree: "MD(Ayu), PhD",
    spec: "Lifestyle Wellness Expert",
    experience: "Expert",
    patients: "4000+",
    specialist: "Lifestyle",
    image: require("../assets/images/doctors/Dr-vijay.png"),
    about:
      "Dr. Vijay B. Negalur focuses on lifestyle wellness, preventive healthcare and holistic guidance using Ayurvedic principles for long-term health improvement.",
    expertise: [
      "Lifestyle Wellness",
      "Preventive Health",
      "Ayurvedic Guidance",
      "Metabolic Wellness",
      "Health Education",
    ],
  },
  {
    id: 5,
    name: "Dr. Shalmali B B",
    degree: "BAMS, MD(Ayu)",
    spec: "Rasa Shastra & Bhaishajya Kalpana",
    experience: "Specialist",
    patients: "2000+",
    specialist: "Ayurveda",
    image: require("../assets/images/doctors/Dr-shalmali.png"),
    about:
      "Dr. Shalmali B B specializes in Rasa Shastra and Bhaishajya Kalpana, with expertise in Ayurvedic formulations, medicine preparation principles and therapeutic guidance.",
    expertise: [
      "Ayurvedic Formulations",
      "Rasa Shastra",
      "Bhaishajya Kalpana",
      "Ayurvedic Medicine Guidance",
      "Traditional Wellness Care",
    ],
  },
  {
    id: 6,
    name: "Dr. G Rajesh Rao",
    degree: "BAMS",
    spec: "Vidwan",
    experience: "Expert",
    patients: "3000+",
    specialist: "Ayurveda",
    image: require("../assets/images/doctors/Dr-rajesh.png"),
    about:
      "Dr. G Rajesh Rao is an Ayurveda consultant with experience in traditional wellness care, patient guidance and holistic healing support.",
    expertise: [
      "Ayurvedic Consultation",
      "Traditional Wellness",
      "Health Guidance",
      "Natural Healing Support",
      "Lifestyle Care",
    ],
  },
];

export default function DoctorProfileScreen() {
  const { id } = useLocalSearchParams();

  const doctor =
    doctors.find((item) => item.id.toString() === id?.toString()) || doctors[0];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Doctor Profile</Text>
      </View>

      <View style={styles.profileCard}>
        <Image source={doctor.image} style={styles.doctorImage} />

        <Text style={styles.name}>{doctor.name}</Text>
        <Text style={styles.degree}>{doctor.degree}</Text>
        <Text style={styles.spec}>{doctor.spec}</Text>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={17} color="#f2a900" />
          <Ionicons name="star" size={17} color="#f2a900" />
          <Ionicons name="star" size={17} color="#f2a900" />
          <Ionicons name="star" size={17} color="#f2a900" />
          <Ionicons name="star" size={17} color="#f2a900" />
          <Text style={styles.ratingText}>4.9 Rating</Text>
        </View>
      </View>

      <View style={styles.quickInfo}>
        <InfoBox
          icon="briefcase-outline"
          value={doctor.experience}
          label="Years Exp."
        />
        <InfoBox icon="people-outline" value={doctor.patients} label="Patients" />
        <InfoBox
          icon="medkit-outline"
          value={doctor.specialist}
          label="Specialist"
        />
      </View>

      <Section title="About Doctor">
        <Text style={styles.text}>{doctor.about}</Text>
      </Section>

      <Section title="Areas of Expertise">
        {doctor.expertise.map((item) => (
          <Bullet key={item} text={item} />
        ))}
      </Section>

      <Section title="Consultation Timings">
        <TimeRow day="Monday - Saturday" time="10:00 AM - 6:00 PM" />
        <TimeRow day="Sunday" time="By Appointment Only" />
      </Section>

      <TouchableOpacity
        style={styles.bookBtn}
        onPress={() =>
  Linking.openURL("https://cloud.pappyjoe.com/widget/index/UjhcZVAxCz0DYgNjAzUIYw%3D%3DK")
}
      >
        <Text style={styles.bookText}>Book Consultation</Text>
        <Ionicons name="calendar-outline" size={20} color="#fff" />
      </TouchableOpacity>

      <View style={{ height: 35 }} />
    </ScrollView>
  );
}

function InfoBox({
  icon,
  value,
  label,
}: {
  icon: any;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.infoBox}>
      <Ionicons name={icon} size={24} color="#1B5E20" />
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
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

function TimeRow({ day, time }: { day: string; time: string }) {
  return (
    <View style={styles.timeRow}>
      <Text style={styles.day}>{day}</Text>
      <Text style={styles.time}>{time}</Text>
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
  profileCard: {
    margin: 18,
    backgroundColor: "#fff",
    borderRadius: 26,
    padding: 24,
    alignItems: "center",
    elevation: 5,
  },
  doctorImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 15,
    borderWidth: 4,
    borderColor: "#1B5E20",
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#064b16",
    textAlign: "center",
  },
  degree: {
    fontSize: 15,
    color: "#1B5E20",
    fontWeight: "bold",
    marginTop: 5,
  },
  spec: {
    fontSize: 14,
    color: "#555",
    marginTop: 6,
    textAlign: "center",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 3,
  },
  ratingText: {
    marginLeft: 6,
    color: "#555",
    fontWeight: "bold",
  },
  quickInfo: {
    flexDirection: "row",
    marginHorizontal: 18,
    justifyContent: "space-between",
  },
  infoBox: {
    width: "31%",
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 4,
  },
  infoValue: {
    color: "#064b16",
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 6,
  },
  infoLabel: {
    color: "#666",
    fontSize: 11,
    marginTop: 3,
  },
  section: {
    marginHorizontal: 18,
    marginTop: 18,
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
  timeRow: {
    backgroundColor: "#e8f5e9",
    padding: 13,
    borderRadius: 14,
    marginBottom: 10,
  },
  day: {
    color: "#064b16",
    fontWeight: "bold",
    fontSize: 14,
  },
  time: {
    color: "#555",
    fontSize: 13,
    marginTop: 3,
  },
  bookBtn: {
    margin: 18,
    backgroundColor: "#1B5E20",
    paddingVertical: 15,
    borderRadius: 25,
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