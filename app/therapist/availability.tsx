// app/therapist/availability.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
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

/* =========================================================
   CONFIG
========================================================= */

const API_BASE_URL = "http://192.168.137.1:8085/api";

const GREEN = "#123E32";
const GREEN_2 = "#1A5644";
const MINT = "#EAF4EF";
const CREAM = "#F8FAF8";
const WHITE = "#FFFFFF";
const GOLD = "#B8923B";
const GOLD_LIGHT = "#F7EECF";
const TEXT = "#20342D";
const MUTED = "#718078";
const BORDER = "#E3EAE6";
const RED = "#B94B4B";
const RED_LIGHT = "#FDECEC";

const DAYS = [
  ["MONDAY", "Monday"],
  ["TUESDAY", "Tuesday"],
  ["WEDNESDAY", "Wednesday"],
  ["THURSDAY", "Thursday"],
  ["FRIDAY", "Friday"],
  ["SATURDAY", "Saturday"],
  ["SUNDAY", "Sunday"],
] as const;

const DURATIONS = [15, 20, 30, 45, 60];

type Availability = {
  id: number | string | null;
  therapistId?: number | string | null;
  therapistName?: string;
  specialization?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type TherapistProfile = {
  id?: number | string | null;
  name?: string;
  therapistName?: string;
  specialization?: string;
};

type FormState = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  dayOfWeek: "",
  startTime: "09:00",
  endTime: "13:00",
  slotDurationMinutes: 30,
  active: true,
};

/* =========================================================
   AUTH / API
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
      message: text,
    };
  }
}

async function therapistApi(endpoint: string, options: RequestInit = {}) {
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

  if (response.status === 401 || response.status === 403) {
    await clearTherapistSession();
    router.replace("/" as any);

    throw new Error(
      result?.message ||
        "Therapist session expired. Please log in again."
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
   HELPERS
========================================================= */

function extractArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

function normalizeAvailability(
  item: any = {},
  therapist: TherapistProfile = {}
): Availability {
  return {
    id: item.id ?? item.availabilityId ?? null,
    therapistId: item.therapistId ?? therapist.id ?? null,
    therapistName:
      item.therapistName || therapist.name || "Therapist",
    specialization:
      item.specialization || therapist.specialization || "Therapist",
    dayOfWeek: String(item.dayOfWeek || "").toUpperCase(),
    startTime: item.startTime || "",
    endTime: item.endTime || "",
    slotDurationMinutes: Number(item.slotDurationMinutes || 30),
    active: item.active !== false,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

function compareAvailability(first: Availability, second: Availability) {
  const order: Record<string, number> = {
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
    SUNDAY: 7,
  };

  return (
    (order[first.dayOfWeek] || 99) -
    (order[second.dayOfWeek] || 99)
  );
}

function apiTime(value: string) {
  return value && value.length === 5 ? `${value}:00` : value;
}

function toMinutes(value: string) {
  const [hours = "0", minutes = "0"] = String(value || "").split(":");
  return Number(hours) * 60 + Number(minutes);
}

function displayTime(value: string) {
  if (!value) return "-";

  const [hours = "0", minutes = "0"] = String(value).split(":");

  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function displayMinutes(minutes: number) {
  return displayTime(
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
      minutes % 60
    ).padStart(2, "0")}`
  );
}

function formatStatus(value: string) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/* =========================================================
   SCREEN
========================================================= */

export default function TherapistAvailabilityScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const [therapist, setTherapist] = useState<TherapistProfile>({
    name: "Therapist",
    specialization: "Therapist",
  });

  const [availability, setAvailability] = useState<Availability[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [editingId, setEditingId] = useState<number | string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

  /* =====================================================
     GENERATED SLOT PREVIEW
  ===================================================== */

  const generatedSlots = useMemo(() => {
    const {
      dayOfWeek,
      startTime,
      endTime,
      slotDurationMinutes,
    } = form;

    if (
      !dayOfWeek ||
      !startTime ||
      !endTime ||
      !slotDurationMinutes
    ) {
      return {
        valid: false,
        reason: "Select a day and time range.",
        slots: [] as string[],
      };
    }

    const start = toMinutes(startTime);
    const end = toMinutes(endTime);

    if (end <= start) {
      return {
        valid: false,
        reason: "End time must be later than start time.",
        slots: [] as string[],
      };
    }

    const slots: string[] = [];

    for (
      let time = start;
      time + Number(slotDurationMinutes) <= end;
      time += Number(slotDurationMinutes)
    ) {
      slots.push(
        `${displayMinutes(time)} - ${displayMinutes(
          time + Number(slotDurationMinutes)
        )}`
      );
    }

    return {
      valid: true,
      reason: "",
      slots,
    };
  }, [form]);

  /* =====================================================
     LOAD AVAILABILITY
  ===================================================== */

  const loadAvailability = useCallback(
    async (profile: TherapistProfile) => {
      const therapistId =
        profile?.id || (await AsyncStorage.getItem("therapistId"));

      if (!therapistId) {
        throw new Error("Therapist ID is missing.");
      }

      const result = await therapistApi(
        `/therapist-availability/therapist/${encodeURIComponent(
          String(therapistId)
        )}`
      );

      const items = extractArray(result?.data)
        .map((item) => normalizeAvailability(item, profile))
        .sort(compareAvailability);

      setAvailability(items);
    },
    []
  );

  const loadPage = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);

      try {
        const profileResult = await therapistApi("/therapists/me");

        const profile = profileResult?.data || {};

        const storedName =
          (await AsyncStorage.getItem("therapistName")) || "Therapist";

        const therapistName =
          profile.name || profile.therapistName || storedName;

        const nextProfile: TherapistProfile = {
          ...profile,
          name: therapistName,
          specialization: profile.specialization || "Therapist",
        };

        if (
          nextProfile.id === null ||
          nextProfile.id === undefined
        ) {
          throw new Error(
            "Therapist ID was not returned by the profile API."
          );
        }

        setTherapist(nextProfile);

        await AsyncStorage.setItem(
          "therapistId",
          String(nextProfile.id)
        );

        await AsyncStorage.setItem(
          "therapistName",
          therapistName
        );

        await AsyncStorage.setItem(
          "therapistProfile",
          JSON.stringify(nextProfile)
        );

        await loadAvailability(nextProfile);
      } catch (error: any) {
        Alert.alert(
          "Manage Availability",
          error?.message || "Unable to load therapist details."
        );

        setAvailability([]);
      } finally {
        setLoading(false);
      }
    },
    [loadAvailability]
  );

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    const initialize = async () => {
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

      await loadPage();
    };

    initialize();
  }, [loadPage]);

  /* =====================================================
     REFRESH
  ===================================================== */

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await loadPage(false);
    } finally {
      setRefreshing(false);
    }
  };

  /* =====================================================
     FORM
  ===================================================== */

  const updateForm = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const validate = () => {
    if (!form.dayOfWeek) {
      Alert.alert("Day Required", "Please select a day.");
      return false;
    }

    if (!form.startTime || !form.endTime) {
      Alert.alert(
        "Time Required",
        "Please enter the start and end time."
      );
      return false;
    }

    const start = toMinutes(form.startTime);
    const end = toMinutes(form.endTime);

    if (end <= start) {
      Alert.alert(
        "Invalid Time",
        "End time must be later than start time."
      );
      return false;
    }

    if (end - start < Number(form.slotDurationMinutes)) {
      Alert.alert(
        "Invalid Time Range",
        "Time range must contain at least one complete slot."
      );
      return false;
    }

    const duplicate = availability.find(
      (item) =>
        item.dayOfWeek === form.dayOfWeek &&
        String(item.id) !== String(editingId)
    );

    if (duplicate) {
      Alert.alert(
        "Availability Already Exists",
        `Availability for ${formatStatus(
          form.dayOfWeek
        )} already exists. Edit the existing entry instead.`
      );

      return false;
    }

    return true;
  };

  /* =====================================================
     CREATE / UPDATE
  ===================================================== */

  const submitAvailability = async () => {
    if (!validate()) return;

    const payload = {
      dayOfWeek: form.dayOfWeek,
      startTime: apiTime(form.startTime),
      endTime: apiTime(form.endTime),
      slotDurationMinutes: Number(form.slotDurationMinutes),
      active: Boolean(form.active),
    };

    setSaving(true);

    try {
      const isEditing = editingId !== null;

      const endpoint = isEditing
        ? `/therapist-availability/update/${encodeURIComponent(
            String(editingId)
          )}`
        : "/therapist-availability/create";

      const result = await therapistApi(endpoint, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      Alert.alert(
        isEditing ? "Availability Updated" : "Availability Created",
        result?.message ||
          (isEditing
            ? "Therapist availability updated successfully."
            : "Therapist availability created successfully.")
      );

      resetForm();

      await loadAvailability(therapist);
    } catch (error: any) {
      Alert.alert(
        editingId !== null
          ? "Unable to Update"
          : "Unable to Create",
        error?.message ||
          (editingId !== null
            ? "Unable to update availability."
            : "Unable to create availability.")
      );
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     EDIT
  ===================================================== */

  const editAvailability = (item: Availability) => {
    setEditingId(item.id);

    setForm({
      dayOfWeek: item.dayOfWeek,

      startTime: String(item.startTime || "").substring(0, 5),

      endTime: String(item.endTime || "").substring(0, 5),

      slotDurationMinutes: Number(item.slotDurationMinutes || 30),

      active: item.active !== false,
    });
  };

  /* =====================================================
     DELETE
  ===================================================== */

  const performDelete = async (item: Availability) => {
    if (!item.id) return;

    setDeletingId(item.id);

    try {
      const result = await therapistApi(
        `/therapist-availability/delete/${encodeURIComponent(
          String(item.id)
        )}`,
        {
          method: "DELETE",
        }
      );

      if (String(editingId) === String(item.id)) {
        resetForm();
      }

      await loadAvailability(therapist);

      Alert.alert(
        "Availability Deleted",
        result?.message ||
          "Therapist availability deleted successfully."
      );
    } catch (error: any) {
      Alert.alert(
        "Unable to Delete",
        error?.message || "Unable to delete availability."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (item: Availability) => {
    Alert.alert(
      "Delete Availability",
      `Delete ${formatStatus(item.dayOfWeek)} availability?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDelete(item),
        },
      ]
    );
  };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <SafeAreaView style={styles.screen}>
      <TherapistHeader
        title="Manage Availability"
        subtitle="Set your weekly therapy schedule and treatment slots."
        therapistName={
          therapist.name || therapist.therapistName || "Therapist"
        }
        onMenuPress={() => setDrawerVisible(true)}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
          <View style={styles.heroIcon}>
            <Ionicons
              name="time-outline"
              size={25}
              color={GOLD_LIGHT}
            />
          </View>

          <Text style={styles.eyebrow}>WEEKLY AVAILABILITY</Text>

          <Text style={styles.heroTitle}>
            Manage Your Therapy Hours
          </Text>

          <Text style={styles.heroText}>
            Define the days and times when patients can be assigned
            therapy sessions with you.
          </Text>

          <View style={styles.heroStat}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={GOLD_LIGHT}
            />

            <Text style={styles.heroStatText}>
              {availability.length} weekly{" "}
              {availability.length === 1 ? "schedule" : "schedules"}
            </Text>
          </View>
        </View>

        {/* FORM */}

        <View style={styles.formCard}>
          <View style={styles.formHeading}>
            <View style={styles.formHeadingIcon}>
              <Ionicons
                name={editingId !== null ? "create-outline" : "add-outline"}
                size={21}
                color={GREEN}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.formTitle}>
                {editingId !== null
                  ? "Edit Availability"
                  : "Add Availability"}
              </Text>

              <Text style={styles.formSubtitle}>
                Choose one day and configure its treatment slots.
              </Text>
            </View>
          </View>

          {/* DAY */}

          <Text style={styles.label}>Day of Week</Text>

          <View style={styles.dayGrid}>
            {DAYS.map(([value, label]) => {
              const selected = form.dayOfWeek === value;

              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.dayChip,
                    selected && styles.dayChipSelected,
                  ]}
                  onPress={() => updateForm("dayOfWeek", value)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      selected && styles.dayChipTextSelected,
                    ]}
                  >
                    {label.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* TIME */}

          <View style={styles.twoColumns}>
            <View style={styles.fieldColumn}>
              <Text style={styles.label}>Start Time</Text>

              <View style={styles.inputBox}>
                <Ionicons
                  name="time-outline"
                  size={17}
                  color={GOLD}
                />

                <TextInput
                  style={styles.input}
                  value={form.startTime}
                  onChangeText={(value) =>
                    updateForm("startTime", value)
                  }
                  placeholder="09:00"
                  placeholderTextColor="#9BA59F"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </View>

            <View style={styles.fieldColumn}>
              <Text style={styles.label}>End Time</Text>

              <View style={styles.inputBox}>
                <Ionicons
                  name="time-outline"
                  size={17}
                  color={GOLD}
                />

                <TextInput
                  style={styles.input}
                  value={form.endTime}
                  onChangeText={(value) =>
                    updateForm("endTime", value)
                  }
                  placeholder="13:00"
                  placeholderTextColor="#9BA59F"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </View>
          </View>

          {/* DURATION */}

          <Text style={styles.label}>Slot Duration</Text>

          <View style={styles.durationRow}>
            {DURATIONS.map((duration) => {
              const selected =
                form.slotDurationMinutes === duration;

              return (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.durationChip,
                    selected && styles.durationChipSelected,
                  ]}
                  onPress={() =>
                    updateForm("slotDurationMinutes", duration)
                  }
                >
                  <Text
                    style={[
                      styles.durationText,
                      selected && styles.durationTextSelected,
                    ]}
                  >
                    {duration}m
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ACTIVE */}

          <View style={styles.activeRow}>
            <View style={styles.activeIcon}>
              <Ionicons
                name={
                  form.active
                    ? "checkmark-circle-outline"
                    : "pause-circle-outline"
                }
                size={21}
                color={form.active ? GREEN : MUTED}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.activeTitle}>
                Availability Active
              </Text>

              <Text style={styles.activeSubtitle}>
                Patients can be scheduled during this time.
              </Text>
            </View>

            <Switch
              value={form.active}
              onValueChange={(value) => updateForm("active", value)}
              trackColor={{
                false: "#DDE3DF",
                true: "#9FC9B6",
              }}
              thumbColor={form.active ? GREEN : "#F4F4F4"}
            />
          </View>

          {/* SLOT PREVIEW */}

          <View style={styles.preview}>
            <View style={styles.previewHeader}>
              <Ionicons
                name="grid-outline"
                size={18}
                color={GREEN}
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle}>
                  Slot Preview
                </Text>

                <Text style={styles.previewSubtitle}>
                  Slots generated from your selected time range.
                </Text>
              </View>

              {generatedSlots.valid && (
                <View style={styles.slotCount}>
                  <Text style={styles.slotCountText}>
                    {generatedSlots.slots.length}
                  </Text>
                </View>
              )}
            </View>

            {!generatedSlots.valid ? (
              <Text style={styles.previewMessage}>
                {generatedSlots.reason}
              </Text>
            ) : generatedSlots.slots.length ? (
              <View style={styles.slotGrid}>
                {generatedSlots.slots.map((slot) => (
                  <View key={slot} style={styles.slotChip}>
                    <Text style={styles.slotText}>{slot}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.previewMessage}>
                The selected time range does not contain a complete slot.
              </Text>
            )}
          </View>

          {/* BUTTONS */}

          <TouchableOpacity
            style={[
              styles.saveButton,
              saving && styles.disabledButton,
            ]}
            disabled={saving}
            onPress={submitAvailability}
          >
            {saving ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <>
                <Ionicons
                  name={
                    editingId !== null
                      ? "save-outline"
                      : "add-circle-outline"
                  }
                  size={18}
                  color={WHITE}
                />

                <Text style={styles.saveButtonText}>
                  {editingId !== null
                    ? "Update Availability"
                    : "Create Availability"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {editingId !== null && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={resetForm}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>
                Cancel Editing
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* EXISTING SCHEDULE */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Weekly Schedule</Text>

            <Text style={styles.sectionSubtitle}>
              Your currently configured availability.
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {availability.length}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={GREEN} />

            <Text style={styles.loadingText}>
              Loading therapist availability...
            </Text>
          </View>
        ) : availability.length ? (
          availability.map((item) => (
            <View key={String(item.id)} style={styles.availabilityCard}>
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.dayIcon,
                    !item.active && styles.inactiveDayIcon,
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={item.active ? GREEN : MUTED}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.cardDay}>
                    {formatStatus(item.dayOfWeek)}
                  </Text>

                  <Text style={styles.cardTime}>
                    {displayTime(item.startTime)} –{" "}
                    {displayTime(item.endTime)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    item.active
                      ? styles.activeBadge
                      : styles.inactiveBadge,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: item.active ? GREEN : MUTED,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: item.active ? GREEN : MUTED,
                      },
                    ]}
                  >
                    {item.active ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailBox}>
                  <Ionicons
                    name="timer-outline"
                    size={17}
                    color={GOLD}
                  />

                  <Text style={styles.detailValue}>
                    {item.slotDurationMinutes} min
                  </Text>

                  <Text style={styles.detailLabel}>Slot Duration</Text>
                </View>

                <View style={styles.detailBox}>
                  <Ionicons
                    name="apps-outline"
                    size={17}
                    color={GOLD}
                  />

                  <Text style={styles.detailValue}>
                    {Math.max(
                      0,
                      Math.floor(
                        (toMinutes(item.endTime) -
                          toMinutes(item.startTime)) /
                          item.slotDurationMinutes
                      )
                    )}
                  </Text>

                  <Text style={styles.detailLabel}>Possible Slots</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => editAvailability(item)}
                >
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color={GREEN}
                  />

                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  disabled={deletingId === item.id}
                  onPress={() => confirmDelete(item)}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color={RED} />
                  ) : (
                    <>
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={RED}
                      />

                      <Text style={styles.deleteText}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-clear-outline"
                size={27}
                color={GOLD}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No Availability Added
            </Text>

            <Text style={styles.emptyText}>
              Configure your first weekly availability using the form
              above.
            </Text>
          </View>
        )}
      </ScrollView>

      <TherapistDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeRoute="/therapist/availability"
      />
    </SafeAreaView>
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

  scroll: {
    flex: 1,
  },

  content: {
    padding: 14,
    paddingBottom: 40,
  },

  hero: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: GREEN,
    marginBottom: 14,
  },

  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  eyebrow: {
    color: GOLD_LIGHT,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  heroTitle: {
    marginTop: 5,
    color: WHITE,
    fontSize: 22,
    fontWeight: "900",
  },

  heroText: {
    marginTop: 7,
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    lineHeight: 18,
  },

  heroStat: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 37,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  heroStatText: {
    color: WHITE,
    fontSize: 9,
    fontWeight: "800",
  },

  formCard: {
    padding: 15,
    borderRadius: 19,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  formHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },

  formHeadingIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  formTitle: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "900",
  },

  formSubtitle: {
    marginTop: 3,
    color: MUTED,
    fontSize: 9,
    lineHeight: 13,
  },

  label: {
    marginBottom: 7,
    color: TEXT,
    fontSize: 10,
    fontWeight: "800",
  },

  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 17,
  },

  dayChip: {
    minWidth: 54,
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: "#F4F6F4",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  dayChipSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  dayChipText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "800",
  },

  dayChipTextSelected: {
    color: WHITE,
  },

  twoColumns: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 17,
  },

  fieldColumn: {
    flex: 1,
  },

  inputBox: {
    minHeight: 47,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: "#FAFBFA",
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  input: {
    flex: 1,
    color: TEXT,
    fontSize: 11,
    fontWeight: "700",
  },

  durationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 17,
  },

  durationChip: {
    minWidth: 53,
    minHeight: 38,
    paddingHorizontal: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#F7F9F7",
    alignItems: "center",
    justifyContent: "center",
  },

  durationChipSelected: {
    backgroundColor: MINT,
    borderColor: "#B9D5C7",
  },

  durationText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "800",
  },

  durationTextSelected: {
    color: GREEN,
  },

  activeRow: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F7FAF8",
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 15,
  },

  activeIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  activeTitle: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "800",
  },

  activeSubtitle: {
    marginTop: 2,
    color: MUTED,
    fontSize: 8,
  },

  preview: {
    padding: 13,
    borderRadius: 15,
    backgroundColor: MINT,
    marginBottom: 15,
  },

  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  previewTitle: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "900",
  },

  previewSubtitle: {
    marginTop: 2,
    color: MUTED,
    fontSize: 8,
  },

  slotCount: {
    minWidth: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },

  slotCountText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "900",
  },

  previewMessage: {
    marginTop: 11,
    color: MUTED,
    fontSize: 9,
    lineHeight: 14,
  },

  slotGrid: {
    marginTop: 11,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  slotChip: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: WHITE,
  },

  slotText: {
    color: GREEN,
    fontSize: 8,
    fontWeight: "700",
  },

  saveButton: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  saveButtonText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.6,
  },

  cancelButton: {
    marginTop: 8,
    minHeight: 43,
    borderRadius: 12,
    backgroundColor: "#F3F5F3",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "800",
  },

  sectionHeader: {
    marginTop: 22,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    color: GREEN,
    fontSize: 16,
    fontWeight: "900",
  },

  sectionSubtitle: {
    marginTop: 3,
    color: MUTED,
    fontSize: 9,
  },

  countBadge: {
    minWidth: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  countBadgeText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "900",
  },

  loadingCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: WHITE,
    alignItems: "center",
    gap: 8,
  },

  loadingText: {
    color: MUTED,
    fontSize: 9,
  },

  availabilityCard: {
    padding: 14,
    marginBottom: 9,
    borderRadius: 17,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  dayIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  inactiveDayIcon: {
    backgroundColor: "#F0F2F0",
  },

  cardDay: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },

  cardTime: {
    marginTop: 3,
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  activeBadge: {
    backgroundColor: MINT,
  },

  inactiveBadge: {
    backgroundColor: "#F0F2F0",
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 7.5,
    fontWeight: "900",
  },

  cardDetails: {
    marginTop: 13,
    flexDirection: "row",
    gap: 8,
  },

  detailBox: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#F8FAF8",
  },

  detailValue: {
    marginTop: 6,
    color: TEXT,
    fontSize: 11,
    fontWeight: "900",
  },

  detailLabel: {
    marginTop: 2,
    color: MUTED,
    fontSize: 7.5,
  },

  cardActions: {
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#EDF1EE",
    flexDirection: "row",
    gap: 8,
  },

  editButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: MINT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  editText: {
    color: GREEN,
    fontSize: 9,
    fontWeight: "900",
  },

  deleteButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: RED_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  deleteText: {
    color: RED,
    fontSize: 9,
    fontWeight: "900",
  },

  emptyCard: {
    padding: 28,
    borderRadius: 18,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },

  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: GOLD_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 12,
    color: GREEN,
    fontSize: 13,
    fontWeight: "900",
  },

  emptyText: {
    marginTop: 5,
    maxWidth: 260,
    color: MUTED,
    fontSize: 9,
    lineHeight: 14,
    textAlign: "center",
  },
});