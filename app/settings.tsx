import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "../context/ThemeContext";

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const { theme, toggleTheme, isDark } = useAppTheme();

  return (
    <ScrollView
      style={[styles.container, isDark && styles.darkContainer]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <View>
          <Text style={[styles.headerTitle, isDark && styles.darkTitle]}>
            Settings
          </Text>
          <Text style={[styles.headerSub, isDark && styles.darkSub]}>
            Manage app preferences
          </Text>
        </View>
      </View>

      <View style={[styles.card, isDark && styles.darkCard]}>
        <Text style={[styles.sectionTitle, isDark && styles.darkTitle]}>
          Preferences
        </Text>

        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Ionicons name="notifications-outline" size={22} color="#1B5E20" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, isDark && styles.darkTitle]}>
              Notifications
            </Text>
            <Text style={[styles.rowSub, isDark && styles.darkSub]}>
              Product offers and wellness updates
            </Text>
          </View>

          <Switch
            value={notifications}
            onValueChange={setNotifications}
            thumbColor={notifications ? "#1B5E20" : "#ccc"}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Ionicons name="moon-outline" size={22} color="#1B5E20" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, isDark && styles.darkTitle]}>
              Dark Mode
            </Text>
            <Text style={[styles.rowSub, isDark && styles.darkSub]}>
              Current theme: {theme === "dark" ? "Dark" : "Light"}
            </Text>
          </View>

          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            thumbColor={isDark ? "#1B5E20" : "#ccc"}
          />
        </View>
      </View>

      <View style={[styles.card, isDark && styles.darkCard]}>
        <Text style={[styles.sectionTitle, isDark && styles.darkTitle]}>
          Legal & Policies
        </Text>

        <SettingsItem
          icon="shield-checkmark-outline"
          title="Privacy Policy"
          subtitle="How we protect your data"
          isDark={isDark}
          onPress={() => router.push("/privacy-policy")}
        />

        <SettingsItem
          icon="document-text-outline"
          title="Terms & Conditions"
          subtitle="App usage terms"
          isDark={isDark}
          onPress={() => router.push("/terms-conditions")}
        />

        <SettingsItem
          icon="medkit-outline"
          title="Medical Disclaimer"
          subtitle="Important health information"
          isDark={isDark}
          onPress={() => router.push("/medical-disclaimer")}
        />
      </View>

      <View style={[styles.card, isDark && styles.darkCard]}>
        <Text style={[styles.sectionTitle, isDark && styles.darkTitle]}>
          Support
        </Text>

        <SettingsItem
          icon="call-outline"
          title="Contact Support"
          subtitle="Get help from Neolife"
          isDark={isDark}
          onPress={() => router.push("/contact")}
        />

        <SettingsItem
          icon="information-circle-outline"
          title="About App"
          subtitle="Neolife Wellness Center"
          isDark={isDark}
          onPress={() =>
            Alert.alert(
              "Neolife Wellness Center",
              "Version 1.0.0\nAyush Digital Care"
            )
          }
        />
      </View>

      <View style={styles.versionBox}>
        <Text style={[styles.versionText, isDark && styles.darkTitle]}>
          Neolife Wellness Center
        </Text>
        <Text style={[styles.versionSub, isDark && styles.darkSub]}>
          Version 1.0.0
        </Text>
      </View>

      <View style={{ height: 35 }} />
    </ScrollView>
  );
}

function SettingsItem({
  icon,
  title,
  subtitle,
  onPress,
  isDark,
}: {
  icon: any;
  title: string;
  subtitle: string;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={22} color="#1B5E20" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, isDark && styles.darkTitle]}>
          {title}
        </Text>
        <Text style={[styles.rowSub, isDark && styles.darkSub]}>
          {subtitle}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#777" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fbfff9",
  },
  darkContainer: {
    backgroundColor: "#101510",
  },
  header: {
    paddingTop: 55,
    paddingHorizontal: 18,
    paddingBottom: 18,
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
  card: {
    marginHorizontal: 18,
    marginBottom: 18,
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    elevation: 4,
  },
  darkCard: {
    backgroundColor: "#1b241b",
  },
  sectionTitle: {
    color: "#064b16",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eef3ee",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eef3ee",
  },
  iconBox: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },
  rowTitle: {
    color: "#222",
    fontSize: 15,
    fontWeight: "bold",
  },
  rowSub: {
    color: "#777",
    fontSize: 12,
    marginTop: 3,
  },
  versionBox: {
    alignItems: "center",
    marginTop: 5,
  },
  versionText: {
    color: "#064b16",
    fontWeight: "bold",
  },
  versionSub: {
    color: "#777",
    fontSize: 12,
    marginTop: 4,
  },
  darkTitle: {
    color: "#e8f5e9",
  },
  darkSub: {
    color: "#b9c4b9",
  },
});