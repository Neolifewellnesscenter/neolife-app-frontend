import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AddressScreen() {
  const [address, setAddress] = useState({
    houseNo: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
    addressType: "HOME",
    isDefault: true,
  });

  const saveAddress = () => {
    Alert.alert("Success", "Address saved successfully");
  };

  return (
    <KeyboardAvoidingView
      style={styles.main}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={23} color="#123524" />
            </TouchableOpacity>

            <View>
              <Text style={styles.headerTitle}>My Address</Text>
              <Text style={styles.headerSub}>Manage your delivery address</Text>
            </View>
          </View>

          <View style={styles.locationCircle}>
            <Ionicons name="location-outline" size={38} color="#fff" />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Address Details</Text>

          <Input
            label="House No"
            icon="home-outline"
            value={address.houseNo}
            onChangeText={(v: string) => setAddress({ ...address, houseNo: v })}
          />

          <Input
            label="Street"
            icon="map-outline"
            value={address.street}
            onChangeText={(v: string) => setAddress({ ...address, street: v })}
          />

          <Input
            label="City"
            icon="business-outline"
            value={address.city}
            onChangeText={(v: string) => setAddress({ ...address, city: v })}
          />

          <Input
            label="State"
            icon="flag-outline"
            value={address.state}
            onChangeText={(v: string) => setAddress({ ...address, state: v })}
          />

          <Input
            label="Pincode"
            icon="mail-outline"
            value={address.pincode}
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={(v: string) => setAddress({ ...address, pincode: v })}
          />

          <Input
            label="Landmark"
            icon="navigate-outline"
            value={address.landmark}
            onChangeText={(v: string) => setAddress({ ...address, landmark: v })}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address Type</Text>

            <View style={styles.pickerBox}>
              <Ionicons name="bookmark-outline" size={20} color="#1B5E20" />
              <Picker
                selectedValue={address.addressType}
                onValueChange={(value) =>
                  setAddress({ ...address, addressType: value })
                }
                style={styles.picker}
              >
                <Picker.Item label="Home" value="HOME" />
                <Picker.Item label="Work" value="WORK" />
                <Picker.Item label="Office" value="OFFICE" />
                <Picker.Item label="Other" value="OTHER" />
              </Picker>
            </View>
          </View>

          <View style={styles.defaultBox}>
            <View style={styles.defaultLeft}>
              <View style={styles.defaultIcon}>
                <Ionicons name="checkmark-circle-outline" size={23} color="#1B5E20" />
              </View>

              <View>
                <Text style={styles.defaultTitle}>Default Address</Text>
                <Text style={styles.defaultSub}>
                  Use this address for orders
                </Text>
              </View>
            </View>

            <Switch
              value={address.isDefault}
              onValueChange={(value) =>
                setAddress({ ...address, isDefault: value })
              }
              thumbColor={address.isDefault ? "#1B5E20" : "#ccc"}
              trackColor={{ false: "#ddd", true: "#b7dfba" }}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={saveAddress}>
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={styles.saveText}>Save Address</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Address Preview</Text>

          <Text style={styles.previewText}>
            {address.houseNo || "House No"}, {address.street || "Street"}
          </Text>
          <Text style={styles.previewText}>
            {address.city || "City"}, {address.state || "State"} -{" "}
            {address.pincode || "Pincode"}
          </Text>
          <Text style={styles.previewText}>
            Landmark: {address.landmark || "Not added"}
          </Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>{address.addressType}</Text>
          </View>
        </View>

        <View style={{ height: 35 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({
  label,
  value,
  onChangeText,
  icon,
  keyboardType,
  maxLength,
}: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputBox}>
        <Ionicons name={icon} size={20} color="#1B5E20" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={`Enter ${label.toLowerCase()}`}
          keyboardType={keyboardType || "default"}
          maxLength={maxLength}
          style={styles.input}
          placeholderTextColor="#999"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: "#fffaf0",
  },
  container: {
    flex: 1,
    backgroundColor: "#fffaf0",
  },
  topSection: {
    backgroundColor: "#123524",
    paddingTop: 55,
    paddingHorizontal: 18,
    paddingBottom: 55,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: "#fff7df",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  headerSub: {
    color: "#f6d76b",
    fontSize: 13,
    marginTop: 3,
  },
  locationCircle: {
    width: 82,
    height: 82,
    borderRadius: 45,
    backgroundColor: "#1B5E20",
    borderWidth: 3,
    borderColor: "#d4af37",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 26,
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 18,
    marginTop: -30,
    borderRadius: 28,
    padding: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#eadb9b",
  },
  sectionTitle: {
    color: "#123524",
    fontSize: 21,
    fontWeight: "bold",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: "#123524",
    fontWeight: "bold",
    marginBottom: 7,
    fontSize: 14,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d8c275",
    borderRadius: 15,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 9,
    fontSize: 15,
    color: "#222",
  },
  pickerBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d8c275",
    borderRadius: 15,
    paddingLeft: 12,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  picker: {
    flex: 1,
    color: "#222",
  },
  defaultBox: {
    marginTop: 5,
    marginBottom: 18,
    backgroundColor: "#fff7df",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e0c56e",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  defaultLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  defaultIcon: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  defaultTitle: {
    color: "#123524",
    fontWeight: "bold",
    fontSize: 15,
  },
  defaultSub: {
    color: "#666",
    fontSize: 12,
    marginTop: 3,
  },
  saveBtn: {
    backgroundColor: "#b8860b",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  previewCard: {
    marginHorizontal: 18,
    marginTop: 18,
    backgroundColor: "#fff7df",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e0c56e",
  },
  previewTitle: {
    color: "#123524",
    fontWeight: "bold",
    fontSize: 17,
    marginBottom: 8,
  },
  previewText: {
    color: "#555",
    lineHeight: 22,
  },
  badge: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#1B5E20",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
});