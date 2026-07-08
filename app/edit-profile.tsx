import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function EditProfileScreen() {
  const [profile, setProfile] = useState({
  fullName: "Neolife User",
  email: "customer@example.com",
  phone: "",
  dob: new Date(),
  gender: "",
});

 const [showDatePicker, setShowDatePicker] = useState(false);


  const saveProfile = () => {
    Alert.alert("Success", "Profile saved successfully");
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <View style={styles.avatarBox}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.fullName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.changePhoto}>Profile Information</Text>
      </View>

      <View style={styles.card}>
        <Input
          label="Full Name"
          value={profile.fullName}
          onChangeText={(v: string) => setProfile({ ...profile, fullName: v })}
        />
<Input
  label="Email"
  value={profile.email}
  keyboardType="email-address"
  onChangeText={(v: string) => setProfile({ ...profile, email: v })}
/>

<Input
  label="Phone Number"
  value={profile.phone}
  keyboardType="phone-pad"
  onChangeText={(v: string) => setProfile({ ...profile, phone: v })}
/>

        <View style={styles.inputGroup}>
  <Text style={styles.label}>Date of Birth</Text>

  <TouchableOpacity
    style={styles.input}
    onPress={() => setShowDatePicker(true)}
  >
    <Text>
      {profile.dob.toLocaleDateString()}
    </Text>
  </TouchableOpacity>

  {showDatePicker && (
    <DateTimePicker
      value={profile.dob}
      mode="date"
      display="default"
      maximumDate={new Date()}
      onChange={(event, selectedDate) => {
        setShowDatePicker(false);

        if (selectedDate) {
          setProfile({
            ...profile,
            dob: selectedDate,
          });
        }
      }}
    />
  )}
</View>

        <View style={styles.inputGroup}>
  <Text style={styles.label}>Gender</Text>

  <View style={styles.pickerContainer}>
    <Picker
      selectedValue={profile.gender}
      onValueChange={(itemValue) =>
        setProfile({ ...profile, gender: itemValue })
      }
    >
      <Picker.Item label="Select Gender" value="" />
      <Picker.Item label="Male" value="Male" />
      <Picker.Item label="Female" value="Female" />
      <Picker.Item label="Other" value="Other" />
    </Picker>
  </View>
</View>

        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
          <Text style={styles.saveText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        keyboardType={keyboardType || "default"}
        style={styles.input}
        placeholderTextColor="#999"
      />
    </View>
  );
}

const styles = StyleSheet.create({
    pickerContainer: {
  borderWidth: 1,
  borderColor: "#d8c275",
  borderRadius: 14,
  backgroundColor: "#fff",
  overflow: "hidden",
},
  container: {
    flex: 1,
    backgroundColor: "#fffaf0",
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#123524",
  },
  avatarBox: {
    alignItems: "center",
    marginBottom: 18,
  },
  avatar: {
    width: 95,
    height: 95,
    borderRadius: 50,
    backgroundColor: "#1B5E20",
    borderWidth: 4,
    borderColor: "#d4af37",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "bold",
  },
  changePhoto: {
    marginTop: 10,
    color: "#123524",
    fontWeight: "bold",
  },
  card: {
    marginHorizontal: 18,
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#eadb9b",
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    color: "#123524",
    fontWeight: "bold",
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d8c275",
    borderRadius: 14,
    padding: 13,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  saveBtn: {
    marginTop: 10,
    backgroundColor: "#b8860b",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});