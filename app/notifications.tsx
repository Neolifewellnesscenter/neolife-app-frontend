import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const notifications = [
  {
    id: 1,
    icon: "calendar-outline",
    title: "Appointment Reminder",
    message: "Book your wellness consultation with Neolife doctors.",
    time: "Today",
  },
  {
    id: 2,
    icon: "bag-outline",
    title: "Product Offer",
    message: "Special wellness offers available on selected Ayurvedic products.",
    time: "2 hours ago",
  },
  {
    id: 3,
    icon: "leaf-outline",
    title: "Health Tip",
    message: "Start your day with warm water and mindful breathing.",
    time: "Yesterday",
  },
  {
    id: 4,
    icon: "heart-outline",
    title: "Wellness Care",
    message: "Explore Panchakarma, Yoga, Naturopathy and Acupuncture therapies.",
    time: "2 days ago",
  },
];

export default function NotificationsScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>Latest updates from Neolife</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <Ionicons name="notifications-outline" size={42} color="#fff" />
        <Text style={styles.heroTitle}>Stay Updated</Text>
        <Text style={styles.heroText}>
          Get appointment reminders, product offers, order updates and wellness tips.
        </Text>
      </View>

      {notifications.map((item) => (
        <View style={styles.notificationCard} key={item.id}>
          <View style={styles.iconBox}>
            <Ionicons name={item.icon as any} size={24} color="#1B5E20" />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.row}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>

            <Text style={styles.message}>{item.message}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.clearBtn}>
        <Text style={styles.clearText}>Mark All as Read</Text>
      </TouchableOpacity>

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
    fontSize: 24,
    fontWeight: "bold",
  },
  headerSub: {
    color: "#666",
    fontSize: 13,
    marginTop: 2,
  },
  heroCard: {
    margin: 18,
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
  notificationCard: {
    marginHorizontal: 18,
    marginBottom: 14,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    gap: 13,
    elevation: 4,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    color: "#064b16",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  time: {
    color: "#777",
    fontSize: 11,
  },
  message: {
    color: "#555",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  clearBtn: {
    marginHorizontal: 18,
    marginTop: 8,
    backgroundColor: "#e8f5e9",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
  },
  clearText: {
    color: "#1B5E20",
    fontWeight: "bold",
  },
});