// app/therapist/profile.tsx

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import TherapistHeader from "../../components/TherapistHeader";
import TherapistDrawer from "../../components/TherapistDrawer";

const API_BASE_URL = "http://192.168.137.1:8085/api";

const GREEN = "#123E32";
const MINT = "#EAF4EF";
const CREAM = "#F8F5ED";
const WHITE = "#FFFFFF";
const GOLD = "#B8923B";
const GOLD_LIGHT = "#F7EECF";
const TEXT = "#20342D";
const MUTED = "#718078";
const BORDER = "#DFE6E1";
const RED = "#B94B4B";
const RED_LIGHT = "#FDECEC";

type TherapistProfile = {
  id: number | string | "";
  userId: number | string | "";
  name: string;
  email: string;
  phoneNumber: string;
  age: number | string;
  gender: string;
  qualification: string;
  specialization: string;
  experienceYears: number | string;
  about: string;
  active: boolean;
  profileCompleted: boolean;
};

const emptyProfile: TherapistProfile = {
  id: "",
  userId: "",
  name: "Therapist",
  email: "",
  phoneNumber: "",
  age: "",
  gender: "",
  qualification: "",
  specialization: "",
  experienceYears: "",
  about: "",
  active: true,
  profileCompleted: false,
};

/* =========================================================
   AUTH
========================================================= */

async function getToken() {
  return (
    (await AsyncStorage.getItem("therapistToken")) ||
    (await AsyncStorage.getItem("token")) ||
    (await AsyncStorage.getItem("accessToken")) ||
    ""
  );
}

async function clearTherapistSession() {
  await AsyncStorage.multiRemove([
    "therapistToken",
    "therapistRefreshToken",
    "token",
    "accessToken",
    "refreshToken",
    "role",
    "therapistId",
    "therapistName",
    "therapistProfile",
    "therapistProfileCompleted",
    "userId",
    "userName",
    "name",
    "email",
    "phoneNumber",
    "profileCompleted",
    "isLoggedIn",
  ]);
}

async function readResponse(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      message: text || `Invalid server response (${response.status}).`,
    };
  }
}

async function therapistApi(
  endpoint: string,
  options: RequestInit = {},
  config: { allowNotFound?: boolean } = {}
) {
  const token = await getToken();

  if (!token) {
    await clearTherapistSession();
    router.replace("/" as any);
    throw new Error("Therapist login required.");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const result = await readResponse(response);

  if (response.status === 404 && config.allowNotFound) {
    return {
      notFound: true,
      data: null,
    };
  }

  if (response.status === 401 || response.status === 403) {
    await clearTherapistSession();
    router.replace("/" as any);

    throw new Error(
      result?.message ||
        "Your session has expired. Please log in again."
    );
  }

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.message || `Request failed (${response.status}).`
    );
  }

  return result;
}

/* =========================================================
   LOCAL PROFILE
========================================================= */

async function parseStoredProfile() {
  try {
    const value = await AsyncStorage.getItem("therapistProfile");

    if (!value) return {};

    return JSON.parse(value);
  } catch {
    return {};
  }
}

async function normalizeProfile(
  remote: any = null
): Promise<TherapistProfile> {
  const stored = await parseStoredProfile();

  const [
    storedUserId,
    storedName,
    fallbackName,
    storedEmail,
    storedPhone,
    storedAge,
    storedGender,
  ] = await Promise.all([
    AsyncStorage.getItem("userId"),
    AsyncStorage.getItem("therapistName"),
    AsyncStorage.getItem("name"),
    AsyncStorage.getItem("email"),
    AsyncStorage.getItem("phoneNumber"),
    AsyncStorage.getItem("age"),
    AsyncStorage.getItem("gender"),
  ]);

  const source = {
    ...stored,
    ...(remote || {}),
  };

  return {
    ...emptyProfile,
    ...source,

    id: source.id ?? source.therapistId ?? "",

    userId: source.userId || storedUserId || "",

    name:
      source.name ||
      source.therapistName ||
      storedName ||
      fallbackName ||
      "Therapist",

    email: source.email || storedEmail || "",

    phoneNumber:
      source.phoneNumber ||
      source.phone ||
      storedPhone ||
      "",

    age:
      source.age ||
      source.user?.age ||
      storedAge ||
      "",

    gender:
      source.gender ||
      source.user?.gender ||
      storedGender ||
      "",

    qualification: source.qualification || "",

    specialization: source.specialization || "",

    experienceYears:
      source.experienceYears ??
      source.experience ??
      "",

    about: source.about || "",

    active: source.active ?? true,

    profileCompleted: source.profileCompleted === true,
  };
}

function isProfileComplete(profile: TherapistProfile) {
  return Boolean(
    profile.profileCompleted ||
      (profile.id &&
        profile.qualification &&
        profile.specialization &&
        profile.about &&
        profile.experienceYears !== "")
  );
}

async function saveLocally(profile: TherapistProfile) {
  await AsyncStorage.setItem(
    "therapistProfile",
    JSON.stringify(profile)
  );

  if (profile.id !== "" && profile.id !== null) {
    await AsyncStorage.setItem(
      "therapistId",
      String(profile.id)
    );
  }

  if (profile.name) {
    await AsyncStorage.setItem(
      "therapistName",
      profile.name
    );
  }

  if (profile.email) {
    await AsyncStorage.setItem("email", profile.email);
  }

  if (profile.phoneNumber) {
    await AsyncStorage.setItem(
      "phoneNumber",
      profile.phoneNumber
    );
  }
}

function formatLabel(value: any) {
  if (!value) return "-";

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/* =========================================================
   SCREEN
========================================================= */

export default function TherapistProfileScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const [profile, setProfile] =
    useState<TherapistProfile>(emptyProfile);

  const [form, setForm] =
    useState<TherapistProfile>(emptyProfile);

  const [profileExists, setProfileExists] = useState(false);
  const [editing, setEditing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  /* =====================================================
     LOAD PROFILE
  ===================================================== */

  const loadProfile = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      try {
        const token = await getToken();

        if (!token) {
          router.replace("/" as any);
          return;
        }

        const role = String(
          (await AsyncStorage.getItem("role")) || ""
        ).toUpperCase();

        if (role && role !== "THERAPIST") {
          router.replace("/" as any);
          return;
        }

        const result = await therapistApi(
          "/therapists/me",
          {},
          {
            allowNotFound: true,
          }
        );

        if (result?.notFound || !result?.data) {
          const fallback = await normalizeProfile();

          setProfile(fallback);
          setForm(fallback);

          setProfileExists(false);
          setEditing(true);

          await AsyncStorage.setItem(
            "therapistProfileCompleted",
            "false"
          );

          return;
        }

        const next = await normalizeProfile(result.data);

        setProfile(next);
        setForm(next);

        const exists = Boolean(next.id);
        const complete = isProfileComplete(next);

        setProfileExists(exists);
        setEditing(!complete);

        await saveLocally(next);

        await AsyncStorage.setItem(
          "therapistProfileCompleted",
          String(complete)
        );
      } catch (error: any) {
        const messageText = String(
          error?.message || ""
        ).toLowerCase();

        if (
          messageText.includes("profile not found") ||
          messageText.includes("therapist not found") ||
          messageText.includes("complete profile")
        ) {
          const fallback = await normalizeProfile();

          setProfile(fallback);
          setForm(fallback);

          setProfileExists(false);
          setEditing(true);

          await AsyncStorage.setItem(
            "therapistProfileCompleted",
            "false"
          );

          return;
        }

        Alert.alert(
          "Profile",
          error?.message ||
            "Unable to load therapist profile."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await loadProfile(false);
    } finally {
      setRefreshing(false);
    }
  };

  /* =====================================================
     FORM
  ===================================================== */

  const updateField = (
    field: keyof TherapistProfile,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validate = () => {
    if (
      String(form.qualification || "").trim().length < 2
    ) {
      return "Enter a valid qualification.";
    }

    if (
      String(form.specialization || "").trim().length < 2
    ) {
      return "Enter a valid specialization.";
    }

    if (
      form.experienceYears === "" ||
      Number(form.experienceYears) < 0 ||
      Number(form.experienceYears) > 60
    ) {
      return "Experience must be between 0 and 60 years.";
    }

    if (String(form.about || "").trim().length < 10) {
      return "Professional introduction must contain at least 10 characters.";
    }

    return "";
  };

  /* =====================================================
     SAVE
  ===================================================== */

  const submitProfile = async () => {
    const validationError = validate();

    if (validationError) {
      Alert.alert("Check Profile", validationError);
      return;
    }

    setSaving(true);

    try {
      const payload = {
        qualification: String(
          form.qualification
        ).trim(),

        specialization: String(
          form.specialization
        ).trim(),

        experienceYears: Number(
          form.experienceYears
        ),

        about: String(form.about).trim(),
      };

      const endpoint =
        profileExists && profile.id
          ? `/therapists/update/${encodeURIComponent(
              String(profile.id)
            )}`
          : "/therapists/complete-profile";

      const method =
        profileExists && profile.id
          ? "PUT"
          : "POST";

      const result = await therapistApi(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      const next = await normalizeProfile({
        ...profile,
        ...form,
        ...payload,
        ...(result?.data || {}),
        profileCompleted: true,
      });

      setProfile(next);
      setForm(next);

      setProfileExists(Boolean(next.id));
      setEditing(false);

      await saveLocally(next);

      await AsyncStorage.multiSet([
        ["therapistProfileCompleted", "true"],
        ["profileCompleted", "true"],
      ]);

      Alert.alert(
        "Profile Updated",
        profileExists
          ? "Your therapist profile has been updated successfully."
          : "Your therapist profile has been completed successfully."
      );
    } catch (error: any) {
      Alert.alert(
        "Unable to Save",
        error?.message ||
          "Unable to save therapist profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    setForm(profile);
    setEditing(true);
  };

  const cancelEditing = () => {
    if (!profileExists) {
      return;
    }

    setForm(profile);
    setEditing(false);
  };

  /* =====================================================
     LOGOUT
  ===================================================== */

  const logout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await clearTherapistSession();
            router.replace("/" as any);
          },
        },
      ]
    );
  };

  const therapistName =
    profile.name || "Therapist";

  const initial = therapistName
    .charAt(0)
    .toUpperCase();

  /* =====================================================
     UI
  ===================================================== */

  return (
    <SafeAreaView style={styles.screen}>
      <TherapistHeader
        title="My Profile"
        subtitle="Professional information"
        therapistName={therapistName}
        onMenuPress={() =>
          setDrawerVisible(true)
        }
        onRefresh={onRefresh}
        refreshing={refreshing}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[GREEN]}
              tintColor={GREEN}
            />
          }
        >
          {/* HERO */}

          <View style={styles.hero}>
            <View style={styles.heroTextArea}>
              <Text style={styles.heroEyebrow}>
                THERAPIST PROFILE
              </Text>

              <Text style={styles.heroTitle}>
                {profileExists
                  ? "Your Professional Profile"
                  : "Complete Your Professional Profile"}
              </Text>

              <Text style={styles.heroDescription}>
                {profileExists
                  ? "Keep your qualification, specialization, experience and professional introduction up to date."
                  : "Enter your professional information to complete your therapist profile."}
              </Text>
            </View>

            <View style={styles.heroIcon}>
              <Ionicons
                name="person-outline"
                size={28}
                color={GOLD_LIGHT}
              />
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator
                size="small"
                color={GREEN}
              />

              <Text style={styles.loadingText}>
                Loading therapist profile...
              </Text>
            </View>
          ) : (
            <>
              {/* PROFILE CARD */}

              <View style={styles.profileCard}>
                <View style={styles.cover}>
                  <View style={styles.coverDecoration1} />
                  <View style={styles.coverDecoration2} />
                </View>

                <View style={styles.profileBody}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {initial}
                    </Text>
                  </View>

                  <Text style={styles.profileName}>
                    {profile.name ||
                      "Therapist"}
                  </Text>

                  <Text style={styles.specialization}>
                    {form.specialization ||
                      profile.specialization ||
                      "Therapist"}
                  </Text>

                  <View
                    style={[
                      styles.activeBadge,
                      !profile.active &&
                        styles.inactiveBadge,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        !profile.active &&
                          styles.inactiveDot,
                      ]}
                    />

                    <Text
                      style={[
                        styles.activeText,
                        !profile.active &&
                          styles.inactiveText,
                      ]}
                    >
                      {profile.active
                        ? "Active Therapist"
                        : "Inactive"}
                    </Text>
                  </View>

                  <View style={styles.profileInfo}>
                    <ProfileInfoRow
                      icon="card-outline"
                      label="Therapist ID"
                      value={
                        profile.id
                          ? String(profile.id)
                          : "Not created"
                      }
                    />

                    <ProfileInfoRow
                      icon="mail-outline"
                      label="Email"
                      value={
                        profile.email ||
                        "Not provided"
                      }
                    />

                    <ProfileInfoRow
                      icon="call-outline"
                      label="Phone"
                      value={
                        profile.phoneNumber ||
                        "Not provided"
                      }
                    />

                    <ProfileInfoRow
                      icon="school-outline"
                      label="Qualification"
                      value={
                        form.qualification ||
                        "Not provided"
                      }
                    />

                    <ProfileInfoRow
                      icon="briefcase-outline"
                      label="Experience"
                      value={
                        form.experienceYears !== ""
                          ? `${form.experienceYears} years`
                          : "Not provided"
                      }
                      last
                    />
                  </View>
                </View>
              </View>

              {/* ACCOUNT DETAILS */}

              <View style={styles.sectionCard}>
                <View style={styles.sectionHeading}>
                  <View style={styles.sectionIcon}>
                    <Ionicons
                      name="person-circle-outline"
                      size={20}
                      color={GREEN}
                    />
                  </View>

                  <View style={styles.sectionHeadingText}>
                    <Text style={styles.sectionTitle}>
                      Account Information
                    </Text>

                    <Text style={styles.sectionSubtitle}>
                      Personal account details
                    </Text>
                  </View>
                </View>

                <View style={styles.accountGrid}>
                  <AccountBox
                    label="Full Name"
                    value={profile.name}
                  />

                  <AccountBox
                    label="Email"
                    value={profile.email}
                  />

                  <AccountBox
                    label="Phone"
                    value={profile.phoneNumber}
                  />

                  <AccountBox
                    label="Gender"
                    value={formatLabel(
                      profile.gender
                    )}
                  />

                  <AccountBox
                    label="Age"
                    value={
                      profile.age
                        ? `${profile.age} years`
                        : "-"
                    }
                  />

                  <AccountBox
                    label="User ID"
                    value={
                      profile.userId
                        ? String(profile.userId)
                        : "-"
                    }
                  />
                </View>

                <View style={styles.readOnlyNotice}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={15}
                    color={MUTED}
                  />

                  <Text style={styles.readOnlyText}>
                    Account details are read-only here.
                    Professional details can be edited below.
                  </Text>
                </View>
              </View>

              {/* PROFESSIONAL DETAILS */}

              <View style={styles.sectionCard}>
                <View style={styles.formHeader}>
                  <View style={styles.sectionHeadingText}>
                    <Text style={styles.formEyebrow}>
                      {profileExists
                        ? "PROFESSIONAL DETAILS"
                        : "PROFILE SETUP"}
                    </Text>

                    <Text style={styles.sectionTitle}>
                      {profileExists
                        ? "Profile Information"
                        : "Complete Professional Profile"}
                    </Text>

                    <Text style={styles.sectionSubtitle}>
                      {editing
                        ? "Update the editable professional fields below."
                        : "Your saved therapist profile information."}
                    </Text>
                  </View>

                  {profileExists &&
                    !editing && (
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={startEditing}
                      >
                        <Ionicons
                          name="create-outline"
                          size={15}
                          color={GREEN}
                        />

                        <Text
                          style={
                            styles.editButtonText
                          }
                        >
                          Edit
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>

                {!profileExists && (
                  <View style={styles.setupNotice}>
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color={GOLD}
                    />

                    <Text style={styles.setupNoticeText}>
                      Complete your professional
                      information to create your
                      therapist profile.
                    </Text>
                  </View>
                )}

                <ProfileField
                  label="Qualification"
                  value={form.qualification}
                  placeholder="e.g. BPT, MPT, Diploma in Therapy"
                  icon="school-outline"
                  editable={editing}
                  onChangeText={(value) =>
                    updateField(
                      "qualification",
                      value
                    )
                  }
                />

                <ProfileField
                  label="Specialization"
                  value={form.specialization}
                  placeholder="e.g. Physiotherapy, Panchakarma"
                  icon="medkit-outline"
                  editable={editing}
                  onChangeText={(value) =>
                    updateField(
                      "specialization",
                      value
                    )
                  }
                />

                <ProfileField
                  label="Experience"
                  value={String(
                    form.experienceYears ?? ""
                  )}
                  placeholder="Years of experience"
                  icon="briefcase-outline"
                  editable={editing}
                  keyboardType="number-pad"
                  suffix="Years"
                  onChangeText={(value) => {
                    const clean =
                      value.replace(
                        /[^0-9]/g,
                        ""
                      );

                    updateField(
                      "experienceYears",
                      clean
                    );
                  }}
                />

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Professional Introduction
                  </Text>

                  <View
                    style={[
                      styles.aboutContainer,
                      !editing &&
                        styles.disabledField,
                    ]}
                  >
                    <TextInput
                      style={styles.aboutInput}
                      value={form.about}
                      editable={editing}
                      onChangeText={(value) =>
                        updateField(
                          "about",
                          value
                        )
                      }
                      placeholder="Write a short professional introduction about your experience, treatment approach and expertise..."
                      placeholderTextColor="#9CA8A1"
                      multiline
                      textAlignVertical="top"
                      maxLength={1000}
                    />
                  </View>

                  <Text style={styles.characterCount}>
                    {String(
                      form.about || ""
                    ).length}
                    /1000
                  </Text>
                </View>

                {editing && (
                  <View style={styles.formActions}>
                    {profileExists && (
                      <TouchableOpacity
                        style={
                          styles.cancelButton
                        }
                        disabled={saving}
                        onPress={cancelEditing}
                      >
                        <Text
                          style={
                            styles.cancelButtonText
                          }
                        >
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        saving &&
                          styles.disabledButton,
                      ]}
                      disabled={saving}
                      onPress={submitProfile}
                    >
                      {saving ? (
                        <ActivityIndicator
                          size="small"
                          color={WHITE}
                        />
                      ) : (
                        <>
                          <Ionicons
                            name={
                              profileExists
                                ? "save-outline"
                                : "checkmark-circle-outline"
                            }
                            size={17}
                            color={WHITE}
                          />

                          <Text
                            style={
                              styles.saveButtonText
                            }
                          >
                            {profileExists
                              ? "Save Changes"
                              : "Complete Profile"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* PROFILE STATUS */}

              <View style={styles.statusCard}>
                <View style={styles.statusIcon}>
                  <Ionicons
                    name={
                      isProfileComplete(profile)
                        ? "checkmark-circle-outline"
                        : "alert-circle-outline"
                    }
                    size={23}
                    color={
                      isProfileComplete(profile)
                        ? GREEN
                        : GOLD
                    }
                  />
                </View>

                <View style={styles.statusContent}>
                  <Text style={styles.statusTitle}>
                    {isProfileComplete(profile)
                      ? "Profile Complete"
                      : "Profile Incomplete"}
                  </Text>

                  <Text style={styles.statusDescription}>
                    {isProfileComplete(profile)
                      ? "Your professional profile is complete and ready for therapist operations."
                      : "Complete all required professional fields to finish setting up your profile."}
                  </Text>
                </View>
              </View>

              {/* LOGOUT */}

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={logout}
              >
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color={RED}
                />

                <Text style={styles.logoutText}>
                  Logout
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <TherapistDrawer
        visible={drawerVisible}
        onClose={() =>
          setDrawerVisible(false)
        }
        activeRoute="/therapist/profile"
      />
    </SafeAreaView>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function ProfileInfoRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.profileInfoRow,
        last && {
          borderBottomWidth: 0,
        },
      ]}
    >
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={15}
          color={GREEN}
        />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        <Text
          style={styles.infoValue}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function AccountBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.accountBox}>
      <Text style={styles.accountLabel}>
        {label}
      </Text>

      <Text
        style={styles.accountValue}
        numberOfLines={2}
      >
        {value || "-"}
      </Text>
    </View>
  );
}

function ProfileField({
  label,
  value,
  placeholder,
  icon,
  editable,
  keyboardType = "default",
  suffix,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  editable: boolean;
  keyboardType?: any;
  suffix?: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      <View
        style={[
          styles.inputContainer,
          !editable &&
            styles.disabledField,
        ]}
      >
        <Ionicons
          name={icon}
          size={17}
          color={editable ? GREEN : MUTED}
        />

        <TextInput
          style={styles.input}
          value={value}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor="#9CA8A1"
          keyboardType={keyboardType}
          onChangeText={onChangeText}
        />

        {suffix ? (
          <Text style={styles.inputSuffix}>
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  flex: {
    flex: 1,
  },

  content: {
    padding: 14,
    paddingBottom: 45,
  },

  hero: {
    backgroundColor: GREEN,
    borderRadius: 22,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  heroTextArea: {
    flex: 1,
    paddingRight: 12,
  },

  heroEyebrow: {
    color: GOLD_LIGHT,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  heroTitle: {
    color: WHITE,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 5,
    lineHeight: 26,
  },

  heroDescription: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 9,
    lineHeight: 15,
    marginTop: 7,
  },

  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor:
      "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingCard: {
    marginTop: 12,
    minHeight: 110,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  loadingText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
  },

  profileCard: {
    marginTop: 12,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    overflow: "hidden",
  },

  cover: {
    height: 88,
    backgroundColor: GREEN,
    overflow: "hidden",
  },

  coverDecoration1: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor:
      "rgba(255,255,255,0.06)",
    right: -35,
    top: -50,
  },

  coverDecoration2: {
    position: "absolute",
    width: 85,
    height: 85,
    borderRadius: 43,
    backgroundColor:
      "rgba(184,146,59,0.18)",
    left: -25,
    bottom: -45,
  },

  profileBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: "center",
  },

  avatar: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: GREEN,
    borderWidth: 5,
    borderColor: WHITE,
    marginTop: -37,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: WHITE,
    fontSize: 27,
    fontWeight: "900",
  },

  profileName: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 9,
    textAlign: "center",
  },

  specialization: {
    color: MUTED,
    fontSize: 9,
    marginTop: 3,
    textAlign: "center",
  },

  activeBadge: {
    marginTop: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: MINT,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  inactiveBadge: {
    backgroundColor: RED_LIGHT,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
  },

  inactiveDot: {
    backgroundColor: RED,
  },

  activeText: {
    color: GREEN,
    fontSize: 7,
    fontWeight: "900",
  },

  inactiveText: {
    color: RED,
  },

  profileInfo: {
    width: "100%",
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  profileInfoRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 10,
  },

  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    color: MUTED,
    fontSize: 7,
  },

  infoValue: {
    color: TEXT,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 2,
  },

  sectionCard: {
    marginTop: 12,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 13,
  },

  sectionIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeadingText: {
    flex: 1,
  },

  sectionTitle: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 7.5,
    lineHeight: 12,
    marginTop: 3,
  },

  accountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  accountBox: {
    width: "48.7%",
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: "#F8FAF8",
    padding: 10,
    justifyContent: "center",
  },

  accountLabel: {
    color: MUTED,
    fontSize: 7,
  },

  accountValue: {
    color: TEXT,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 4,
  },

  readOnlyNotice: {
    marginTop: 11,
    borderRadius: 11,
    backgroundColor: "#F5F7F5",
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },

  readOnlyText: {
    flex: 1,
    color: MUTED,
    fontSize: 7.5,
    lineHeight: 12,
  },

  formHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  formEyebrow: {
    color: GOLD,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginBottom: 3,
  },

  editButton: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: MINT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  editButtonText: {
    color: GREEN,
    fontSize: 8,
    fontWeight: "900",
  },

  setupNotice: {
    marginTop: 8,
    marginBottom: 5,
    padding: 11,
    borderRadius: 11,
    backgroundColor: GOLD_LIGHT,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },

  setupNoticeText: {
    flex: 1,
    color: TEXT,
    fontSize: 8,
    lineHeight: 13,
  },

  fieldGroup: {
    marginTop: 13,
  },

  fieldLabel: {
    color: TEXT,
    fontSize: 8,
    fontWeight: "800",
    marginBottom: 6,
  },

  inputContainer: {
    minHeight: 47,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: WHITE,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  disabledField: {
    backgroundColor: "#F5F7F5",
  },

  input: {
    flex: 1,
    color: TEXT,
    fontSize: 9.5,
    paddingVertical: 10,
  },

  inputSuffix: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "700",
  },

  aboutContainer: {
    minHeight: 125,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: WHITE,
    padding: 10,
  },

  aboutInput: {
    minHeight: 100,
    color: TEXT,
    fontSize: 9.5,
    lineHeight: 16,
  },

  characterCount: {
    color: MUTED,
    fontSize: 7,
    textAlign: "right",
    marginTop: 4,
  },

  formActions: {
    marginTop: 17,
    flexDirection: "row",
    gap: 8,
  },

  cancelButton: {
    flex: 1,
    height: 45,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: TEXT,
    fontSize: 9,
    fontWeight: "800",
  },

  saveButton: {
    flex: 2,
    height: 45,
    borderRadius: 12,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  saveButtonText: {
    color: WHITE,
    fontSize: 9,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.6,
  },

  statusCard: {
    marginTop: 12,
    padding: 13,
    borderRadius: 16,
    backgroundColor: MINT,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  statusContent: {
    flex: 1,
  },

  statusTitle: {
    color: GREEN,
    fontSize: 10,
    fontWeight: "900",
  },

  statusDescription: {
    color: MUTED,
    fontSize: 7.5,
    lineHeight: 12,
    marginTop: 3,
  },

  logoutButton: {
    marginTop: 12,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#F0CACA",
    backgroundColor: RED_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  logoutText: {
    color: RED,
    fontSize: 9,
    fontWeight: "900",
  },
});