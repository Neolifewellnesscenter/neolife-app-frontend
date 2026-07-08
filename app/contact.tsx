import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PHONE = "9481489866";
const EMAIL = "neolifewellnesscenter@gmail.com";
const WEBSITE = "https://neolifeayush.com";
const PAPPYJOE_URL = "YOUR_PAPPYJOE_BOOKING_LINK";

export default function ContactScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const openMap = () => {
    Linking.openURL(
      "https://www.google.com/maps/search/?api=1&query=Neolife%20Wellness%20Center%20Udupi"
    );
  };

  const sendMessage = () => {
    if (!name || !email || !message) {
      Alert.alert("Missing Details", "Please fill all fields.");
      return;
    }

    Alert.alert(
      "Message Sent",
      "Thank you for contacting Neolife Wellness Center. We will get back to you soon."
    );

    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Contact Us</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroSmall}>NEOLIFE WELLNESS CENTER</Text>
        <Text style={styles.heroTitle}>We’re Here to Help You</Text>
        <Text style={styles.heroText}>
          Ayurveda • Panchakarma • Yoga • Naturopathy • Acupuncture
        </Text>
        <View style={styles.locationPill}>
          <Ionicons name="location-outline" size={16} color="#1B5E20" />
          <Text style={styles.locationText}>Udupi, Karnataka</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <ActionButton
          icon="call-outline"
          label="Call"
          onPress={() => Linking.openURL(`tel:+91${PHONE}`)}
        />
        <ActionButton
          icon="logo-whatsapp"
          label="WhatsApp"
          onPress={() => Linking.openURL(`https://wa.me/91${PHONE}`)}
        />
        <ActionButton
          icon="navigate-outline"
          label="Map"
          onPress={openMap}
        />
        <ActionButton
          icon="calendar-outline"
          label="Book"
          onPress={() => Linking.openURL("https://cloud.pappyjoe.com/widget/index/UjhcZVAxCz0DYgNjAzUIYw%3D%3D")}
        />
      </View>

      <View style={styles.mapCard}>
        <View>
          <Text style={styles.sectionTitle}>Clinic Location</Text>
          <Text style={styles.addressText}>
            Neolife Wellness Center{"\n"}4-1-38 Nararkere 1st Cross Brahmagiri, Post, Ambalpadi, Udupi, Karnataka 576101
          </Text>
        </View>

        <TouchableOpacity style={styles.mapPreview} onPress={openMap}>
          <Ionicons name="map-outline" size={42} color="#1B5E20" />
          <Text style={styles.mapText}>Tap to open Google Maps</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Opening Hours</Text>

        <HourRow day="Monday - Saturday" time="10:00 AM - 6:00 PM" />
        <HourRow day="Sunday" time="By Appointment Only" />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Contact Information</Text>

        <InfoRow icon="call-outline" title="Phone" value={`+91 ${PHONE}`} />
        <InfoRow icon="mail-outline" title="Email" value={EMAIL} />
        <InfoRow icon="globe-outline" title="Website" value="neolifeayush.com" />
      </View>

      <View style={styles.helpCard}>
        <Text style={styles.helpTitle}>Need Help?</Text>
        <Text style={styles.helpText}>
          Our wellness experts are ready to assist you with consultation,
          therapies and product guidance.
        </Text>

        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => Linking.openURL("https://cloud.pappyjoe.com/widget/index/UjhcZVAxCz0DYgNjAzUIYw%3D%3D")}
        >
          <Ionicons name="calendar-outline" size={20} color="#fff" />
          <Text style={styles.helpBtnText}>Book Consultation</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Send Us a Message</Text>

        <TextInput
          placeholder="Full Name"
          placeholderTextColor="#777"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <TextInput
          placeholder="Email Address"
          placeholderTextColor="#777"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          style={styles.input}
        />

        <TextInput
          placeholder="Message"
          placeholderTextColor="#777"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          style={styles.messageInput}
        />

        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>Send Message</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color="#1B5E20" />
      </View>
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

function HourRow({ day, time }: { day: string; time: string }) {
  return (
    <View style={styles.hourRow}>
      <Text style={styles.hourDay}>{day}</Text>
      <Text style={styles.hourTime}>{time}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  title,
  value,
}: {
  icon: any;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Ionicons name={icon} size={20} color="#1B5E20" />
      </View>

      <View>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
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
    fontSize: 25,
    fontWeight: "bold",
  },
  hero: {
    marginHorizontal: 18,
    backgroundColor: "#1B5E20",
    borderRadius: 28,
    padding: 24,
    elevation: 6,
  },
  heroSmall: {
    color: "#c8e6c9",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 10,
  },
  heroText: {
    color: "#e8f5e9",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  locationPill: {
    marginTop: 18,
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationText: {
    color: "#1B5E20",
    fontWeight: "bold",
    fontSize: 13,
  },
  quickActions: {
    flexDirection: "row",
    marginHorizontal: 18,
    marginTop: 18,
    marginBottom: 18,
    justifyContent: "space-between",
  },
  actionBtn: {
    width: "23%",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    elevation: 4,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 7,
  },
  actionText: {
    color: "#1B5E20",
    fontSize: 12,
    fontWeight: "bold",
  },
  mapCard: {
    marginHorizontal: 18,
    marginBottom: 18,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    elevation: 4,
  },
  sectionTitle: {
    color: "#064b16",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  addressText: {
    color: "#555",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  mapPreview: {
    height: 150,
    borderRadius: 20,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  mapText: {
    color: "#1B5E20",
    fontWeight: "bold",
    marginTop: 8,
  },
  infoCard: {
    marginHorizontal: 18,
    marginBottom: 18,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    elevation: 4,
  },
  hourRow: {
    backgroundColor: "#e8f5e9",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  hourDay: {
    color: "#064b16",
    fontSize: 14,
    fontWeight: "bold",
  },
  hourTime: {
    color: "#555",
    fontSize: 13,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#eef3ee",
  },
  infoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoTitle: {
    color: "#064b16",
    fontSize: 14,
    fontWeight: "bold",
  },
  infoValue: {
    color: "#555",
    fontSize: 13,
    marginTop: 3,
  },
  helpCard: {
    marginHorizontal: 18,
    marginBottom: 18,
    backgroundColor: "#0b7a24",
    borderRadius: 24,
    padding: 22,
    elevation: 5,
  },
  helpTitle: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "bold",
  },
  helpText: {
    color: "#e8f5e9",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  helpBtn: {
    marginTop: 18,
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  helpBtnText: {
    color: "#1B5E20",
    fontWeight: "bold",
    fontSize: 15,
  },
  formCard: {
    marginHorizontal: 18,
    marginBottom: 18,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    elevation: 5,
  },
  formTitle: {
    color: "#064b16",
    fontSize: 21,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    height: 50,
    backgroundColor: "#f7faf7",
    borderRadius: 14,
    paddingHorizontal: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#dce8dc",
    color: "#222",
  },
  messageInput: {
    minHeight: 115,
    backgroundColor: "#f7faf7",
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingTop: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#dce8dc",
    color: "#222",
    textAlignVertical: "top",
  },
  sendBtn: {
    backgroundColor: "#111",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});