import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ProfileScreen() {
  const user = {
    name: "Neolife User",
    email: "customer@example.com",
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.topSection}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Account</Text>

          <TouchableOpacity onPress={() => router.push("/settings")}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.avatarBox}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
          </View>

          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </View>

      <View style={styles.menuCard}>
        <MenuItem
          icon="person-outline"
          title="My Profile"
          onPress={() => router.push("/edit-profile")}
        />

        <MenuItem
          icon="location-outline"
          title="My Address"
          onPress={() => router.push("/address")}
        />

        <MenuItem
          icon="bag-outline"
          title="My Orders"
          onPress={() => router.push("/my-orders")}
        />

        

        <View style={styles.divider} />

        <MenuItem
          icon="settings-outline"
          title="Settings"
          onPress={() => router.push("/settings")}
        />

        <MenuItem
          icon="call-outline"
          title="Contact Support"
          onPress={() => router.push("/contact")}
        />

        <MenuItem
          icon="information-circle-outline"
          title="About App"
          onPress={() =>
            Alert.alert("Neolife Wellness Center", "Version 1.0.0")
          }
        />

        <View style={styles.divider} />

        <MenuItem
          icon="log-out-outline"
          title="Logout"
          danger
          onPress={() => Alert.alert("Logout", "Logged out successfully")}
        />
      </View>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  title,
  onPress,
  danger,
}: {
  icon: any;
  title: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.iconBox, danger && styles.dangerIconBox]}>
        <Ionicons name={icon} size={21} color={danger ? "#b00020" : "#1B5E20"} />
      </View>

      <Text style={[styles.menuText, danger && styles.dangerText]}>
        {title}
      </Text>

      {!danger && <Ionicons name="chevron-forward" size={19} color="#999" />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8f5e9",
  },
  topSection: {
    backgroundColor: "#07150d",
    paddingTop: 55,
    paddingBottom: 45,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  avatarBox: {
    alignItems: "center",
    marginTop: 22,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#1B5E20",
    borderWidth: 3,
    borderColor: "#d4af37",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "bold",
  },
  name: {
    color: "#fff",
    marginTop: 12,
    fontSize: 19,
    fontWeight: "bold",
  },
  email: {
    color: "#c8d6c8",
    fontSize: 12,
    marginTop: 4,
  },
  menuCard: {
    backgroundColor: "#fff",
    marginHorizontal: 18,
    marginTop: -25,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 12,
    elevation: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dangerIconBox: {
    backgroundColor: "#ffe9e9",
  },
  menuText: {
    flex: 1,
    color: "#222",
    fontSize: 15,
    fontWeight: "600",
  },
  dangerText: {
    color: "#b00020",
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 5,
  },
});