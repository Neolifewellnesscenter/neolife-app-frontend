import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const doctors = [
  {
    id: 1,
    name: "Dr. N. G. Muraleedhara",
    degree: "BAMS",
    spec: "Ayurveda & Panchakarma Consultant",
    experience: "20+ Years Experience",
    image: require("../assets/images/doctors/Dr-murali.png"),
  },
  {
    id: 2,
    name: "Dr. Aditi",
    degree: "BNYS",
    spec: "Yoga & Naturopathy Consultant",
    experience: "Wellness Consultant",
    image: require("../assets/images/doctors/Dr-adithi.png"),
  },
  {
    id: 3,
    name: "Dr. Sibagath Ulla Sharieff R",
    degree: "BAMS, MD(Ayu)",
    spec: "Ayurveda Consultant",
    experience: "Senior Ayurvedic Physician",
    image: require("../assets/images/doctors/Dr-sibgath.jpg"),
  },
  {
    id: 4,
    name: "Dr. Vijay B. Negalur",
    degree: "MD(Ayu), PhD",
    spec: "Lifestyle Wellness Expert",
    experience: "Ayurveda & Lifestyle Care",
    image: require("../assets/images/doctors/Dr-vijay.png"),
  },
  {
    id: 5,
    name: "Dr. Shalmali B B",
    degree: "BAMS, MD(Ayu)",
    spec: "Rasa Shastra & Bhaishajya Kalpana",
    experience: "Ayurveda Specialist",
    image: require("../assets/images/doctors/Dr-shalmali.png"),
  },
  {
    id: 6,
    name: "Dr. G Rajesh Rao",
    degree: "BAMS",
    spec: "Vidwan",
    experience: "Ayurveda Consultant",
    image: require("../assets/images/doctors/Dr-rajesh.png"),
  },
];

export default function DoctorsScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <View>
          <Text style={styles.headerTitle}>Our Doctors</Text>
          <Text style={styles.headerSub}>Expert wellness consultants</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color="#777" />
        <TextInput
          placeholder="Search doctors, specialization..."
          placeholderTextColor="#777"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Consult With Our Specialists</Text>
        <Text style={styles.heroText}>
          Meet experienced Ayurveda, Panchakarma, Yoga, Naturopathy and wellness
          consultants at Neolife Wellness Center.
        </Text>
      </View>

      {doctors.map((doctor) => (
        <View style={styles.doctorCard} key={doctor.name}>
          <Image source={doctor.image} style={styles.doctorImage} />

          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{doctor.name}</Text>
            <Text style={styles.degree}>{doctor.degree}</Text>
            <Text style={styles.spec}>{doctor.spec}</Text>

            <View style={styles.expRow}>
              <Ionicons name="briefcase-outline" size={15} color="#1B5E20" />
              <Text style={styles.experience}>{doctor.experience}</Text>
            </View>

            <View style={styles.ratingRow}>
              <Ionicons name="star" size={15} color="#f2a900" />
              <Ionicons name="star" size={15} color="#f2a900" />
              <Ionicons name="star" size={15} color="#f2a900" />
              <Ionicons name="star" size={15} color="#f2a900" />
              <Ionicons name="star" size={15} color="#f2a900" />
              <Text style={styles.ratingText}>4.9</Text>
            </View>

            <TouchableOpacity
  style={styles.profileBtn}
  onPress={() =>
    router.push({
      pathname: "/doctor-profile",
      params: {
        id: doctor.id.toString(),
      },
    })
  }
>
  <Text style={styles.profileText}>View Profile</Text>
  <Ionicons name="arrow-forward" size={16} color="#fff" />
</TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={styles.footerSpace} />
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
  searchBox: {
    marginHorizontal: 18,
    marginBottom: 16,
    backgroundColor: "#ffffff",
    borderRadius: 28,
    paddingHorizontal: 16,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#222",
  },
  heroCard: {
    marginHorizontal: 18,
    marginBottom: 18,
    backgroundColor: "#1B5E20",
    borderRadius: 22,
    padding: 22,
    elevation: 5,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "bold",
  },
  heroText: {
    color: "#e8f5e9",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  doctorCard: {
    marginHorizontal: 18,
    marginBottom: 16,
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    elevation: 5,
  },
  doctorImage: {
    width: 105,
    height: 125,
    borderRadius: 18,
    resizeMode: "cover",
    backgroundColor: "#e8f5e9",
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 14,
  },
  doctorName: {
    color: "#111",
    fontSize: 16,
    fontWeight: "bold",
  },
  degree: {
    color: "#1B5E20",
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 4,
  },
  spec: {
    color: "#555",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  expRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  experience: {
    color: "#444",
    fontSize: 12,
    fontWeight: "600",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 8,
  },
  ratingText: {
    color: "#555",
    fontSize: 12,
    marginLeft: 5,
    fontWeight: "bold",
  },
  profileBtn: {
    marginTop: 12,
    backgroundColor: "#1B5E20",
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 20,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profileText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  footerSpace: {
    height: 35,
  },
});