import { Ionicons } from "@expo/vector-icons";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts as useDMSans,
} from "@expo-google-fonts/dm-sans";
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  useFonts as usePlayfair,
} from "@expo-google-fonts/playfair-display";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import PatientDrawer from "../components/PatientDrawer";
import PatientHeader from "../components/PatientHeader";

const GREEN = "#0B3D2E";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_DARK = "#A98632";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#75837B";
const BORDER = "#E6EBE7";

type Doctor = {
  key: string;
  category: string;
  name: string;
  qualification: string;
  role: string;
  image: any;
  summary: string;
};

const doctors: Doctor[] = [
  {
    key: "muraleedhara",
    category: "Yoga & Naturopathy",
    name: "Dr. N. G. Muraleedhara",
    qualification: "BNYS, PGDYN, MSc (Yoga)",
    role: "Yoga & Naturopathy Consultant",
    image: require("../assets/images/doctors/Dr-murali.png"),
    summary:
      "Holistic wellness guidance through Yoga, Naturopathy, lifestyle support and preventive care.",
  },
  {
    key: "rajesh",
    category: "Ayurveda",
    name: "Dr. G Rajesh Rao",
    qualification: "BAMS",
    role: "Jyothishya Vidwan | Ayurveda",
    image: require("../assets/images/doctors/Dr-rajesh.png"),
    summary:
      "Traditional Ayurvedic consultation, preventive health and personalized wellness guidance.",
  },
  {
    key: "vijay",
    category: "Ayurveda",
    name: "Dr. Vijay B. Negalur",
    qualification: "BAMS, M.D. (Swasthavritta)",
    role: "Diet & Lifestyle Consultant",
    image: require("../assets/images/doctors/Dr-vijay.png"),
    summary:
      "Focused on diet, lifestyle correction, preventive healthcare and long-term wellness planning.",
  },
  {
    key: "sibgath",
    category: "Ayurveda",
    name: "Dr. Sibagath Ulla Sharieff R",
    qualification: "BAMS, MD (Ayu)",
    role: "Ayurveda Consultant",
    image: require("../assets/images/doctors/Dr-sibgath.jpg"),
    summary:
      "Ayurvedic consultation with support for lifestyle management and holistic wellness care.",
  },
  {
    key: "shalmali",
    category: "Ayurveda",
    name: "Dr. Shalmali B B",
    qualification: "BAMS, MD (Ayu)",
    role: "Rasa Shastra & Bhaishajya Kalpana",
    image: require("../assets/images/doctors/Dr-shalmali.png"),
    summary:
      "Specialized support in Ayurvedic pharmaceutics, Rasa Shastra and clinical care.",
  },
  {
    key: "gajender",
    category: "Naturopathy",
    name: "Dr. Gajender",
    qualification: "BAMS",
    role: "Naturopathy Consultant",
    image: require("../assets/images/doctors/Dr-gajendar.png"),
    summary:
      "Natural wellness, detoxification, lifestyle correction and integrative care.",
  },
  {
    key: "ramesh",
    category: "Ayurveda & Cancer Care",
    name: "Dr. D P Ramesh",
    qualification: "BAMS",
    role: "Ayurveda | Cancer Care",
    image: require("../assets/images/doctors/Dr-ramesh.png"),
    summary:
      "Holistic Ayurvedic healthcare with supportive cancer care guidance.",
  },
  {
    key: "aditi",
    category: "Yoga & Naturopathy",
    name: "Dr. Aditi",
    qualification: "BNYS",
    role: "Yoga & Naturopathy Consultant",
    image: require("../assets/images/doctors/Dr-adithi.png"),
    summary:
      "Natural healing, diet guidance, lifestyle correction and preventive wellness.",
  },
  {
    key: "harshitha",
    category: "Ayurvedic Surgery",
    name: "Dr. Harshitha AV",
    qualification: "BAMS, MS (Shalyatantra)",
    role: "Ayurvedic Surgeon",
    image: require("../assets/images/doctors/Dr-Harshitha.png"),
    summary:
      "Support for ano-rectal disorders, varicose veins, women's health and general Ayurvedic care.",
  },
];

export default function DoctorsScreen() {
  const [menuOpen, setMenuOpen] = useState(false);

  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <PatientHeader onMenuPress={() => setMenuOpen(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>OUR WELLNESS TEAM</Text>
          <Text style={styles.pageTitle}>Meet Our Doctors</Text>
          <Text style={styles.pageText}>
            Our team brings together Ayurveda, Yoga, Naturopathy and
            specialized wellness care with a patient-first approach.
          </Text>
        </View>

        <View style={styles.teamCount}>
          <View style={styles.teamCountIcon}>
            <Ionicons name="people-outline" size={21} color={GREEN} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.teamCountTitle}>
              {doctors.length} Wellness Experts
            </Text>
            <Text style={styles.teamCountText}>
              One team focused on personalized, holistic care.
            </Text>
          </View>
        </View>

        <View style={styles.doctorList}>
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.key} doctor={doctor} />
          ))}
        </View>

        <View style={styles.endNote}>
          <View style={styles.endIcon}>
            <Ionicons name="heart-outline" size={21} color={GREEN} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.endTitle}>Personal care, one team</Text>
            <Text style={styles.endText}>
              Every doctor brings a different area of expertise while sharing
              the same goal: helping you move toward better health and wellness.
            </Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      <PatientDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeRoute="/doctors"
      />
    </View>
  );
}

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <View style={styles.doctorCard}>
      <View style={styles.photoWrap}>
        <Image
          source={
            imageFailed
              ? require("../assets/images/main_logo.jpeg")
              : doctor.image
          }
          style={styles.doctorImage}
          resizeMode="contain"
          onError={() => setImageFailed(true)}
        />
      </View>

      <View style={styles.doctorContent}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{doctor.category}</Text>
        </View>

        <Text style={styles.doctorName}>{doctor.name}</Text>

        <Text style={styles.qualification}>
          {doctor.qualification}
        </Text>

        <View style={styles.roleRow}>
          <View style={styles.roleIcon}>
            <Ionicons name="medical-outline" size={13} color={GREEN} />
          </View>
          <Text style={styles.role}>{doctor.role}</Text>
        </View>

        <Text style={styles.summary}>{doctor.summary}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },

  scrollContent: {
    paddingBottom: 4,
  },

  intro: {
    paddingHorizontal: 20,
    paddingTop: 26,
  },

  eyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    letterSpacing: 1.3,
  },

  pageTitle: {
    marginTop: 6,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 34,
    lineHeight: 40,
  },

  pageText: {
    marginTop: 8,
    maxWidth: 370,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
  },

  teamCount: {
    marginTop: 19,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 19,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MINT,
    borderWidth: 1,
    borderColor: "#D7E7DD",
  },

  teamCountIcon: {
    width: 43,
    height: 43,
    marginRight: 11,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  teamCountTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  teamCountText: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
    lineHeight: 13,
  },

  doctorList: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 13,
  },

  doctorCard: {
    padding: 12,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 2,
    shadowColor: GREEN,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  photoWrap: {
    width: 112,
    height: 138,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  doctorImage: {
    width: 104,
    height: 132,
  },

  doctorContent: {
    flex: 1,
    paddingLeft: 13,
    paddingVertical: 3,
  },

  categoryPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#FFF5D9",
  },

  categoryText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
  },

  doctorName: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 19,
    lineHeight: 23,
  },

  qualification: {
    marginTop: 4,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    lineHeight: 13,
  },

  roleRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  roleIcon: {
    width: 24,
    height: 24,
    marginRight: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  role: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 8,
    lineHeight: 12,
  },

  summary: {
    marginTop: 7,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 12,
  },

  endNote: {
    marginTop: 24,
    marginHorizontal: 16,
    padding: 15,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MINT,
    borderWidth: 1,
    borderColor: "#D7E7DD",
  },

  endIcon: {
    width: 44,
    height: 44,
    marginRight: 11,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  endTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  endText: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
  },
});
