// app/therapist/patient-history.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
const ORANGE = "#B26A24";
const ORANGE_LIGHT = "#FFF2E4";
const BLUE = "#356C91";
const BLUE_LIGHT = "#EAF3F8";

type TherapistProfile = {
  id?: number | string | null;
  name?: string;
  therapistName?: string;
  specialization?: string;
};

type Patient = {
  patientId: number | string | null;
  patientName: string;
  phoneNumber: string;
  email: string;
  age: string | number;
  gender: string;

  treatmentPlanId: number | string | null;
  treatmentName: string;
  diagnosis: string;

  doctorId: number | string | null;
  doctorName: string;

  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  missedSessions: number;
  pendingSessions: number;
  approvedSessions: number;

  completionPercentage: number;
  planStatus: string;

  startDate: string | null;
  endDate: string | null;

  latestProgressNote: string;
  lastSessionDate: string | null;

  createdAt: string | null;
  updatedAt: string | null;
};

type TreatmentProgress = {
  treatmentPlanId: number | string | null;
  patientId: number | string | null;
  patientName: string;
  treatmentName: string;

  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  missedSessions: number;
  pendingSessions: number;
  approvedSessions: number;

  completionPercentage: number;
  status: string;
};

type TherapySession = {
  id: number | string | null;
  treatmentPlanId: number | string | null;
  patientId: number | string | null;

  patientName: string;
  treatmentName: string;

  sessionDate: string;
  startTime: string;
  endTime: string;

  sessionNumber: number;
  totalSessions: number;

  status: string;

  patientNotes: string;
  therapistNotes: string;
  rescheduleReason: string;

  completedAt: string | null;
  missedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
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
      message: text || `Invalid server response (${response.status}).`,
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
   NORMALIZATION
========================================================= */

function extractArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.patients)) return data.patients;
  if (Array.isArray(data?.progress)) return data.progress;
  if (Array.isArray(data?.sessions)) return data.sessions;
  if (Array.isArray(data?.content)) return data.content;

  return [];
}

function normalizePlanStatus(value: any) {
  const status = String(value || "ONGOING").toUpperCase();

  if (
    ["ONGOING", "ACTIVE", "COMPLETED", "CANCELLED", "PAUSED"].includes(
      status
    )
  ) {
    return status;
  }

  return "ONGOING";
}

function normalizePatient(item: any = {}): Patient {
  const totalSessions = Number(item.totalSessions || 0);
  const completedSessions = Number(item.completedSessions || 0);

  const remainingSessions = Number(
    item.remainingSessions ??
      Math.max(totalSessions - completedSessions, 0)
  );

  return {
    patientId: item.patientId ?? item.id ?? null,

    patientName: item.patientName || item.name || "Patient",

    phoneNumber: item.phoneNumber || item.phone || "-",

    email: item.email || "-",

    age: item.age ?? "-",

    gender: String(item.gender || "-").toUpperCase(),

    treatmentPlanId: item.treatmentPlanId ?? item.planId ?? null,

    treatmentName:
      item.treatmentName || item.therapyName || "Therapy",

    diagnosis: item.diagnosis || "-",

    doctorId: item.doctorId ?? null,

    doctorName: item.doctorName || item.referredByDoctor || "-",

    totalSessions,

    completedSessions,

    remainingSessions,

    missedSessions: Number(item.missedSessions || 0),

    pendingSessions: Number(item.pendingSessions || 0),

    approvedSessions: Number(item.approvedSessions || 0),

    completionPercentage: Number(
      item.completionPercentage ||
        (totalSessions > 0
          ? Math.round((completedSessions / totalSessions) * 100)
          : 0)
    ),

    planStatus: normalizePlanStatus(
      item.status || item.planStatus || "ONGOING"
    ),

    startDate: item.startDate || item.createdAt || null,

    endDate: item.endDate || null,

    latestProgressNote:
      item.latestProgressNote ||
      item.progressNotes ||
      item.therapistNotes ||
      "-",

    lastSessionDate: item.lastSessionDate || null,

    createdAt: item.createdAt || null,

    updatedAt: item.updatedAt || null,
  };
}

function normalizeProgress(item: any = {}): TreatmentProgress {
  return {
    treatmentPlanId: item.treatmentPlanId ?? item.planId ?? null,

    patientId: item.patientId ?? null,

    patientName: item.patientName || "Patient",

    treatmentName:
      item.treatmentName || item.therapyName || "Therapy",

    totalSessions: Number(item.totalSessions || 0),

    completedSessions: Number(item.completedSessions || 0),

    remainingSessions: Number(item.remainingSessions || 0),

    missedSessions: Number(item.missedSessions || 0),

    pendingSessions: Number(item.pendingSessions || 0),

    approvedSessions: Number(item.approvedSessions || 0),

    completionPercentage: Number(item.completionPercentage || 0),

    status: normalizePlanStatus(item.status || item.planStatus),
  };
}

function normalizeSession(item: any = {}): TherapySession {
  return {
    id: item.id ?? item.sessionId ?? null,

    treatmentPlanId: item.treatmentPlanId ?? null,

    patientId: item.patientId ?? null,

    patientName: item.patientName || "Patient",

    treatmentName:
      item.treatmentName || item.therapyName || "Therapy",

    sessionDate: item.sessionDate || item.date || "",

    startTime:
      item.startTime || item.sessionTime || item.time || "",

    endTime: item.endTime || "",

    sessionNumber: Number(item.sessionNumber || 1),

    totalSessions: Number(item.totalSessions || 1),

    status: String(item.status || "PENDING_APPROVAL").toUpperCase(),

    patientNotes: item.patientNotes || "",

    therapistNotes: item.therapistNotes || "",

    rescheduleReason: item.rescheduleReason || "",

    completedAt: item.completedAt || null,

    missedAt: item.missedAt || null,

    createdAt: item.createdAt || null,

    updatedAt: item.updatedAt || null,
  };
}

/* =========================================================
   PATIENT ENRICHMENT
========================================================= */

function createSessionDate(session: TherapySession) {
  return new Date(
    `${session.sessionDate || "1970-01-01"}T${
      session.startTime || "00:00:00"
    }`
  );
}

function getPatientSessions(
  patient: Patient,
  allSessions: TherapySession[]
) {
  return allSessions
    .filter(
      (session) =>
        (patient.treatmentPlanId &&
          String(session.treatmentPlanId) ===
            String(patient.treatmentPlanId)) ||
        (patient.patientId &&
          String(session.patientId) === String(patient.patientId))
    )
    .sort(
      (first, second) =>
        createSessionDate(second).getTime() -
        createSessionDate(first).getTime()
    );
}

function enrichPatient(
  patient: Patient,
  progressRecords: TreatmentProgress[],
  allSessions: TherapySession[]
): Patient {
  const next = { ...patient };

  const progress = progressRecords.find(
    (item) =>
      (next.treatmentPlanId &&
        String(item.treatmentPlanId) ===
          String(next.treatmentPlanId)) ||
      (next.patientId &&
        String(item.patientId) === String(next.patientId))
  );

  const patientSessions = getPatientSessions(next, allSessions);

  if (progress) {
    next.totalSessions = progress.totalSessions || next.totalSessions;
    next.completedSessions = progress.completedSessions;
    next.remainingSessions = progress.remainingSessions;
    next.missedSessions = progress.missedSessions;
    next.pendingSessions = progress.pendingSessions;
    next.approvedSessions = progress.approvedSessions;
    next.completionPercentage = progress.completionPercentage;
    next.planStatus = progress.status;
  }

  if (patientSessions.length) {
    const completedCount = patientSessions.filter(
      (session) => session.status === "COMPLETED"
    ).length;

    const missedCount = patientSessions.filter(
      (session) => session.status === "MISSED"
    ).length;

    if (!next.totalSessions) {
      next.totalSessions = Math.max(
        ...patientSessions.map((session) =>
          Number(session.totalSessions || 1)
        ),
        patientSessions.length
      );
    }

    if (!progress) {
      next.completedSessions = completedCount;
      next.missedSessions = missedCount;

      next.remainingSessions = Math.max(
        next.totalSessions - completedCount,
        0
      );

      next.completionPercentage =
        next.totalSessions > 0
          ? Math.round((completedCount / next.totalSessions) * 100)
          : 0;
    }

    const latestSession = patientSessions[0];

    next.lastSessionDate = latestSession.sessionDate || null;

    next.latestProgressNote =
      latestSession.therapistNotes ||
      latestSession.patientNotes ||
      next.latestProgressNote;
  }

  return next;
}

/* =========================================================
   FORMAT
========================================================= */

function formatLabel(value: any) {
  if (!value) return "-";

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: any) {
  if (!value) return "-";

  const date = new Date(
    String(value).includes("T") ? value : `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: any) {
  if (!value) return "-";

  const [hours, minutes] = String(value).split(":");

  const date = new Date();

  date.setHours(Number(hours), Number(minutes || 0), 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTimeRange(start: any, end: any) {
  return end
    ? `${formatTime(start)} - ${formatTime(end)}`
    : formatTime(start);
}

function safePercent(value: any) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function statusColors(status: string) {
  switch (String(status).toUpperCase()) {
    case "COMPLETED":
      return {
        background: MINT,
        color: GREEN,
      };

    case "CANCELLED":
      return {
        background: RED_LIGHT,
        color: RED,
      };

    case "PAUSED":
      return {
        background: ORANGE_LIGHT,
        color: ORANGE,
      };

    default:
      return {
        background: BLUE_LIGHT,
        color: BLUE,
      };
  }
}

/* =========================================================
   SCREEN
========================================================= */

export default function TherapistPatientHistoryScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const [therapist, setTherapist] = useState<TherapistProfile>({
    name: "Therapist",
    specialization: "Therapist",
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<TherapySession[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState("");
  const [search, setSearch] = useState("");
  const [therapyFilter, setTherapyFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [progressFilter, setProgressFilter] = useState("");

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    null
  );

  /* =====================================================
     PROFILE
  ===================================================== */

  const loadProfile = useCallback(async () => {
    const storedName =
      (await AsyncStorage.getItem("therapistName")) ||
      (await AsyncStorage.getItem("userName")) ||
      (await AsyncStorage.getItem("name")) ||
      "Therapist";

    try {
      const result = await therapistApi("/therapists/me");

      const profile = result?.data || {};

      const next = {
        ...profile,

        name:
          profile.name ||
          profile.therapistName ||
          storedName,

        specialization:
          profile.specialization || "Therapist",
      };

      setTherapist(next);

      if (next.id !== null && next.id !== undefined) {
        await AsyncStorage.setItem("therapistId", String(next.id));
      }

      await AsyncStorage.setItem("therapistName", next.name);

      await AsyncStorage.setItem(
        "therapistProfile",
        JSON.stringify(next)
      );
    } catch (error: any) {
      console.log("Profile:", error?.message);
    }
  }, []);

  /* =====================================================
     PATIENT HISTORY
  ===================================================== */

  const loadPatientHistory = useCallback(async () => {
    setLoading(true);

    try {
      const results = await Promise.allSettled([
        therapistApi("/therapist-dashboard/patients"),
        therapistApi("/therapist-dashboard/treatment-progress"),
        therapistApi("/daily-treatments/therapist/my-sessions"),
      ]);

      const patientsResult = results[0];
      const progressResult = results[1];
      const sessionsResult = results[2];

      if (patientsResult.status !== "fulfilled") {
        throw patientsResult.reason;
      }

      const patientData = extractArray(patientsResult.value?.data);

      const progressRecords =
        progressResult.status === "fulfilled"
          ? extractArray(progressResult.value?.data).map(normalizeProgress)
          : [];

      const nextSessions =
        sessionsResult.status === "fulfilled"
          ? extractArray(sessionsResult.value?.data).map(normalizeSession)
          : [];

      const nextPatients = patientData
        .map(normalizePatient)
        .map((patient) =>
          enrichPatient(patient, progressRecords, nextSessions)
        )
        .sort((first, second) =>
          String(first.patientName).localeCompare(
            String(second.patientName)
          )
        );

      setSessions(nextSessions);
      setPatients(nextPatients);

      const failures = results.filter(
        (result) => result.status === "rejected"
      );

      if (failures.length) {
        Alert.alert(
          "Patient History",
          "Patient records loaded, but some progress or session details could not be loaded."
        );
      }
    } catch (error: any) {
      setPatients([]);
      setSessions([]);

      Alert.alert(
        "Patient History",
        error?.message || "Unable to load patient history."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const token = await getToken();

      if (!token) {
        router.replace("/" as any);
        return;
      }

      await Promise.allSettled([loadProfile(), loadPatientHistory()]);
    };

    initialize();
  }, [loadProfile, loadPatientHistory]);

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await Promise.allSettled([loadProfile(), loadPatientHistory()]);
    } finally {
      setRefreshing(false);
    }
  };

  /* =====================================================
     SUMMARY
  ===================================================== */

  const summary = useMemo(
    () => ({
      totalPatients: patients.length,

      ongoingPlans: patients.filter((patient) =>
        ["ONGOING", "ACTIVE"].includes(patient.planStatus)
      ).length,

      completedPlans: patients.filter(
        (patient) => patient.planStatus === "COMPLETED"
      ).length,

      completedSessions: patients.reduce(
        (sum, patient) => sum + Number(patient.completedSessions || 0),
        0
      ),

      cancelledPlans: patients.filter(
        (patient) => patient.planStatus === "CANCELLED"
      ).length,
    }),
    [patients]
  );

  const therapies = useMemo(
    () =>
      [
        ...new Set(
          patients
            .map((patient) => patient.treatmentName)
            .filter(Boolean)
        ),
      ].sort(),
    [patients]
  );

  const doctors = useMemo(
    () =>
      [
        ...new Set(
          patients
            .map((patient) => patient.doctorName)
            .filter((doctor) => doctor && doctor !== "-")
        ),
      ].sort(),
    [patients]
  );

  /* =====================================================
     FILTERING
  ===================================================== */

  const filteredPatients = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return patients.filter((patient) => {
      const matchesSearch =
        !cleanSearch ||
        patient.patientName.toLowerCase().includes(cleanSearch) ||
        String(patient.phoneNumber).toLowerCase().includes(cleanSearch) ||
        String(patient.patientId ?? "").toLowerCase().includes(cleanSearch);

      const matchesTherapy =
        !therapyFilter || patient.treatmentName === therapyFilter;

      const matchesDoctor =
        !doctorFilter || patient.doctorName === doctorFilter;

      const progress = safePercent(patient.completionPercentage);

      const matchesProgress =
        !progressFilter ||
        (progressFilter === "LOW" && progress < 25) ||
        (progressFilter === "MEDIUM" &&
          progress >= 25 &&
          progress < 75) ||
        (progressFilter === "HIGH" && progress >= 75);

      const matchesStatus =
        !selectedStatus ||
        patient.planStatus === selectedStatus ||
        (selectedStatus === "ONGOING" &&
          patient.planStatus === "ACTIVE");

      return (
        matchesSearch &&
        matchesTherapy &&
        matchesDoctor &&
        matchesProgress &&
        matchesStatus
      );
    });
  }, [
    patients,
    search,
    therapyFilter,
    doctorFilter,
    progressFilter,
    selectedStatus,
  ]);

  const resetFilters = () => {
    setSearch("");
    setTherapyFilter("");
    setDoctorFilter("");
    setProgressFilter("");
    setSelectedStatus("");
  };

  const selectedPatientSessions = useMemo(() => {
    if (!selectedPatient) return [];

    return getPatientSessions(selectedPatient, sessions);
  }, [selectedPatient, sessions]);

  return (
    <SafeAreaView style={styles.screen}>
      <TherapistHeader
        title="Patient History"
        subtitle="Treatment progress & session history"
        therapistName={
          therapist.name ||
          therapist.therapistName ||
          "Therapist"
        }
        onMenuPress={() => setDrawerVisible(true)}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />

      <ScrollView
        style={styles.scroll}
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
          <View style={styles.heroContent}>
            <Text style={styles.eyebrow}>PATIENT CARE</Text>

            <Text style={styles.heroTitle}>Patient Treatment History</Text>

            <Text style={styles.heroText}>
              Review assigned patients, treatment plans, therapy progress
              and completed sessions.
            </Text>
          </View>

          <View style={styles.heroIcon}>
            <Ionicons
              name="people-outline"
              size={28}
              color={GOLD_LIGHT}
            />
          </View>
        </View>

        {/* SUMMARY */}

        <View style={styles.summaryGrid}>
          <SummaryCard
            label="Patients"
            value={summary.totalPatients}
            icon="people-outline"
            background={BLUE_LIGHT}
            color={BLUE}
          />

          <SummaryCard
            label="Ongoing Plans"
            value={summary.ongoingPlans}
            icon="pulse-outline"
            background={GOLD_LIGHT}
            color={GOLD}
          />

          <SummaryCard
            label="Completed Plans"
            value={summary.completedPlans}
            icon="checkmark-circle-outline"
            background={MINT}
            color={GREEN}
          />

          <SummaryCard
            label="Sessions Completed"
            value={summary.completedSessions}
            icon="shield-checkmark-outline"
            background={MINT}
            color={GREEN}
          />

          <SummaryCard
            label="Cancelled"
            value={summary.cancelledPlans}
            icon="close-circle-outline"
            background={RED_LIGHT}
            color={RED}
          />
        </View>

        {/* STATUS */}

        <Text style={styles.sectionLabel}>Treatment Status</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalFilters}
        >
          {[
            ["", "All"],
            ["ONGOING", "Ongoing"],
            ["COMPLETED", "Completed"],
            ["PAUSED", "Paused"],
            ["CANCELLED", "Cancelled"],
          ].map(([value, label]) => {
            const active = selectedStatus === value;

            return (
              <TouchableOpacity
                key={label}
                style={[
                  styles.statusFilter,
                  active && styles.statusFilterActive,
                ]}
                onPress={() => setSelectedStatus(value)}
              >
                <Text
                  style={[
                    styles.statusFilterText,
                    active && styles.statusFilterTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* SEARCH */}

        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>Find Patient</Text>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={MUTED} />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Patient name, phone or ID"
              placeholderTextColor="#9AA49F"
              style={styles.searchInput}
            />

            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={MUTED}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* THERAPY */}

          {therapies.length > 0 && (
            <>
              <Text style={styles.filterLabel}>Therapy</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                <FilterChip
                  label="All Therapies"
                  selected={!therapyFilter}
                  onPress={() => setTherapyFilter("")}
                />

                {therapies.map((therapy) => (
                  <FilterChip
                    key={therapy}
                    label={therapy}
                    selected={therapyFilter === therapy}
                    onPress={() =>
                      setTherapyFilter(
                        therapyFilter === therapy ? "" : therapy
                      )
                    }
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* DOCTOR */}

          {doctors.length > 0 && (
            <>
              <Text style={styles.filterLabel}>Doctor</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                <FilterChip
                  label="All Doctors"
                  selected={!doctorFilter}
                  onPress={() => setDoctorFilter("")}
                />

                {doctors.map((doctor) => (
                  <FilterChip
                    key={doctor}
                    label={doctor}
                    selected={doctorFilter === doctor}
                    onPress={() =>
                      setDoctorFilter(
                        doctorFilter === doctor ? "" : doctor
                      )
                    }
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* PROGRESS */}

          <Text style={styles.filterLabel}>Progress</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <FilterChip
              label="All Progress"
              selected={!progressFilter}
              onPress={() => setProgressFilter("")}
            />

            <FilterChip
              label="Below 25%"
              selected={progressFilter === "LOW"}
              onPress={() =>
                setProgressFilter(progressFilter === "LOW" ? "" : "LOW")
              }
            />

            <FilterChip
              label="25% - 74%"
              selected={progressFilter === "MEDIUM"}
              onPress={() =>
                setProgressFilter(
                  progressFilter === "MEDIUM" ? "" : "MEDIUM"
                )
              }
            />

            <FilterChip
              label="75% & Above"
              selected={progressFilter === "HIGH"}
              onPress={() =>
                setProgressFilter(
                  progressFilter === "HIGH" ? "" : "HIGH"
                )
              }
            />
          </ScrollView>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetFilters}
          >
            <Ionicons name="refresh-outline" size={16} color={GREEN} />

            <Text style={styles.resetText}>Reset Filters</Text>
          </TouchableOpacity>
        </View>

        {/* RESULTS */}

        <View style={styles.resultHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.resultTitle}>
              Patient Treatment Records
            </Text>

            <Text style={styles.resultSubtitle}>
              Therapy plan progress and session history.
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {filteredPatients.length}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={GREEN} />

            <Text style={styles.emptyText}>
              Loading patient history...
            </Text>
          </View>
        ) : filteredPatients.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="people-outline"
                size={29}
                color={GOLD}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No Patient History Found
            </Text>

            <Text style={styles.emptyText}>
              No patient records match the selected filters.
            </Text>
          </View>
        ) : (
          filteredPatients.map((patient, index) => (
            <PatientCard
              key={`${patient.treatmentPlanId || "patient"}-${
                patient.patientId
              }-${index}`}
              patient={patient}
              onView={() => setSelectedPatient(patient)}
            />
          ))
        )}
      </ScrollView>

      <TherapistDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeRoute="/therapist/patient-history"
      />

      {/* PATIENT DETAIL MODAL */}

      <Modal
        transparent
        visible={Boolean(selectedPatient)}
        animationType="slide"
        onRequestClose={() => setSelectedPatient(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {selectedPatient && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalPatient}>
                    <View style={styles.modalAvatar}>
                      <Text style={styles.modalAvatarText}>
                        {selectedPatient.patientName
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle}>
                        {selectedPatient.patientName}
                      </Text>

                      <Text style={styles.modalSubtitle}>
                        Patient ID: {selectedPatient.patientId ?? "-"}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedPatient(null)}
                  >
                    <Ionicons name="close" size={21} color={TEXT} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.patientInfoGrid}>
                    <InfoBox
                      label="Age"
                      value={String(selectedPatient.age)}
                    />

                    <InfoBox
                      label="Gender"
                      value={formatLabel(selectedPatient.gender)}
                    />

                    <InfoBox
                      label="Phone"
                      value={selectedPatient.phoneNumber}
                    />

                  </View>

                  <View style={styles.planBox}>
                    <View style={styles.planHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planLabel}>
                          TREATMENT PLAN
                        </Text>

                        <Text style={styles.planName}>
                          {selectedPatient.treatmentName}
                        </Text>
                      </View>

                      <StatusBadge status={selectedPatient.planStatus} />
                    </View>

                    <Text style={styles.diagnosisLabel}>Diagnosis</Text>

                    <Text style={styles.diagnosis}>
                      {selectedPatient.diagnosis}
                    </Text>

                    <View style={styles.progressHeading}>
                      <Text style={styles.progressLabel}>
                        Treatment Progress
                      </Text>

                      <Text style={styles.progressPercent}>
                        {safePercent(
                          selectedPatient.completionPercentage
                        )}
                        %
                      </Text>
                    </View>

                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${safePercent(
                              selectedPatient.completionPercentage
                            )}%`,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.sessionStats}>
                      <SmallStat
                        value={selectedPatient.totalSessions}
                        label="Total"
                      />

                      <SmallStat
                        value={selectedPatient.completedSessions}
                        label="Completed"
                      />

                      <SmallStat
                        value={selectedPatient.remainingSessions}
                        label="Remaining"
                      />

                      <SmallStat
                        value={selectedPatient.missedSessions}
                        label="Missed"
                      />
                    </View>
                  </View>

                  <View style={styles.dateGrid}>
                    <DetailItem
                      icon="calendar-outline"
                      label="Started On"
                      value={formatDate(selectedPatient.startDate)}
                    />

                    <DetailItem
                      icon="time-outline"
                      label="Last Session"
                      value={formatDate(selectedPatient.lastSessionDate)}
                    />
                  </View>

                  <View style={styles.notesBox}>
                    <Text style={styles.notesHeading}>
                      Latest Progress Note
                    </Text>

                    <Text style={styles.notesText}>
                      {selectedPatient.latestProgressNote || "-"}
                    </Text>
                  </View>

                  <View style={styles.historyHeader}>
                    <Text style={styles.historyTitle}>
                      Session History
                    </Text>

                    <Text style={styles.historyCount}>
                      {selectedPatientSessions.length} Sessions
                    </Text>
                  </View>

                  {selectedPatientSessions.length === 0 ? (
                    <View style={styles.noSessions}>
                      <Ionicons
                        name="calendar-outline"
                        size={24}
                        color={MUTED}
                      />

                      <Text style={styles.noSessionsText}>
                        No session history available.
                      </Text>
                    </View>
                  ) : (
                    selectedPatientSessions.map((session) => (
                      <SessionHistoryCard
                        key={String(session.id)}
                        session={session}
                      />
                    ))
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function SummaryCard({
  label,
  value,
  icon,
  background,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  background: string;
  color: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        selected && styles.filterChipSelected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          selected && styles.filterChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PatientCard({
  patient,
  onView,
}: {
  patient: Patient;
  onView: () => void;
}) {
  const progress = safePercent(patient.completionPercentage);

  return (
    <View style={styles.patientCard}>
      <View style={styles.patientTop}>
        <View style={styles.patientAvatar}>
          <Text style={styles.patientAvatarText}>
            {patient.patientName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.patientName}>{patient.patientName}</Text>

          <Text style={styles.patientId}>
            ID: {patient.patientId ?? "-"} • {patient.phoneNumber}
          </Text>
        </View>

        <StatusBadge status={patient.planStatus} />
      </View>

      <View style={styles.therapyBox}>
        <View style={styles.therapyIcon}>
          <Ionicons name="leaf-outline" size={17} color={GOLD} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.miniLabel}>THERAPY</Text>

          <Text style={styles.therapyName}>{patient.treatmentName}</Text>

          
        </View>
      </View>

      <View style={styles.progressArea}>
        <View style={styles.progressHeading}>
          <Text style={styles.progressLabel}>Plan Progress</Text>

          <Text style={styles.progressPercent}>{progress}%</Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.cardStats}>
        <SmallStat
          value={patient.completedSessions}
          label="Completed"
        />

        <SmallStat
          value={patient.remainingSessions}
          label="Remaining"
        />

        <SmallStat
          value={patient.missedSessions}
          label="Missed"
        />
      </View>

      <View style={styles.lastSession}>
        <Ionicons name="calendar-outline" size={15} color={GREEN} />

        <Text style={styles.lastSessionText}>
          Last Session: {formatDate(patient.lastSessionDate)}
        </Text>
      </View>

      {patient.latestProgressNote &&
        patient.latestProgressNote !== "-" && (
          <View style={styles.latestNote}>
            <Text style={styles.latestNoteLabel}>LATEST NOTE</Text>

            <Text style={styles.latestNoteText} numberOfLines={2}>
              {patient.latestProgressNote}
            </Text>
          </View>
        )}

      <TouchableOpacity style={styles.viewButton} onPress={onView}>
        <Ionicons name="eye-outline" size={16} color={WHITE} />

        <Text style={styles.viewButtonText}>
          View Patient History
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = statusColors(status);

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          {
            color: colors.color,
          },
        ]}
      >
        {formatLabel(status)}
      </Text>
    </View>
  );
}

function SmallStat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <View style={styles.smallStat}>
      <Text style={styles.smallStatValue}>{value}</Text>
      <Text style={styles.smallStatLabel}>{label}</Text>
    </View>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "-"}</Text>
    </View>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailItem}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={17} color={GREEN} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function SessionHistoryCard({ session }: { session: TherapySession }) {
  const completed = session.status === "COMPLETED";
  const missed = session.status === "MISSED";

  const badgeBackground = completed
    ? MINT
    : missed
    ? RED_LIGHT
    : ORANGE_LIGHT;

  const badgeColor = completed ? GREEN : missed ? RED : ORANGE;

  return (
    <View style={styles.sessionHistoryCard}>
      <View style={styles.sessionHistoryTop}>
        <View>
          <Text style={styles.sessionNumber}>
            Session {session.sessionNumber}
          </Text>

          <Text style={styles.sessionTherapy}>
            {session.treatmentName}
          </Text>
        </View>

        <View
          style={[
            styles.sessionStatus,
            {
              backgroundColor: badgeBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.sessionStatusText,
              {
                color: badgeColor,
              },
            ]}
          >
            {formatLabel(session.status)}
          </Text>
        </View>
      </View>

      <View style={styles.sessionDateRow}>
        <Ionicons name="calendar-outline" size={14} color={GREEN} />

        <Text style={styles.sessionDateText}>
          {formatDate(session.sessionDate)}
        </Text>

        <Ionicons name="time-outline" size={14} color={GREEN} />

        <Text style={styles.sessionDateText}>
          {formatTimeRange(session.startTime, session.endTime)}
        </Text>
      </View>

      {session.therapistNotes ? (
        <View style={styles.sessionNote}>
          <Text style={styles.sessionNoteLabel}>Therapist Note</Text>

          <Text style={styles.sessionNoteText}>
            {session.therapistNotes}
          </Text>
        </View>
      ) : null}

      {session.patientNotes ? (
        <View style={styles.sessionNote}>
          <Text style={styles.sessionNoteLabel}>Patient Note</Text>

          <Text style={styles.sessionNoteText}>
            {session.patientNotes}
          </Text>
        </View>
      ) : null}

      {session.rescheduleReason ? (
        <View style={styles.rescheduleBox}>
          <Text style={styles.rescheduleLabel}>Reschedule Reason</Text>

          <Text style={styles.rescheduleText}>
            {session.rescheduleReason}
          </Text>
        </View>
      ) : null}
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

  scroll: {
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

  heroContent: {
    flex: 1,
    paddingRight: 12,
  },

  eyebrow: {
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
  },

  heroText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 9,
    lineHeight: 15,
    marginTop: 6,
  },

  heroIcon: {
    width: 53,
    height: 53,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  summaryCard: {
    width: "48.7%",
    minHeight: 78,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryLabel: {
    color: MUTED,
    fontSize: 7.5,
    fontWeight: "700",
  },

  summaryValue: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
  },

  sectionLabel: {
    color: TEXT,
    fontSize: 9,
    fontWeight: "900",
    marginTop: 17,
    marginBottom: 8,
  },

  horizontalFilters: {
    gap: 7,
    paddingRight: 10,
  },

  statusFilter: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    justifyContent: "center",
  },

  statusFilterActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  statusFilterText: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "800",
  },

  statusFilterTextActive: {
    color: WHITE,
  },

  filterCard: {
    marginTop: 12,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 13,
  },

  filterTitle: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 8,
  },

  searchBox: {
    height: 45,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: "#F8FAF8",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    gap: 7,
  },

  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 9.5,
  },

  filterLabel: {
    color: TEXT,
    fontSize: 8,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 7,
  },

  filterChip: {
    height: 34,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: "center",
    marginRight: 6,
  },

  filterChipSelected: {
    backgroundColor: MINT,
    borderColor: "#BBD7C9",
  },

  filterChipText: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "700",
  },

  filterChipTextSelected: {
    color: GREEN,
    fontWeight: "900",
  },

  resetButton: {
    marginTop: 14,
    height: 40,
    borderRadius: 11,
    backgroundColor: MINT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  resetText: {
    color: GREEN,
    fontSize: 8.5,
    fontWeight: "900",
  },

  resultHeader: {
    marginTop: 19,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  resultTitle: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "900",
  },

  resultSubtitle: {
    color: MUTED,
    fontSize: 8,
    marginTop: 3,
  },

  countBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "900",
  },

  emptyCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    gap: 8,
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
    color: GREEN,
    fontSize: 13,
    fontWeight: "900",
  },

  emptyText: {
    color: MUTED,
    fontSize: 8.5,
    textAlign: "center",
  },

  patientCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },

  patientTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  patientAvatar: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },

  patientAvatarText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "900",
  },

  patientName: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900",
  },

  patientId: {
    color: MUTED,
    fontSize: 7.5,
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusBadgeText: {
    fontSize: 6.5,
    fontWeight: "900",
  },

  therapyBox: {
    marginTop: 11,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#F8FAF8",
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
  },

  therapyIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: GOLD_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  miniLabel: {
    color: MUTED,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  therapyName: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
  },

  doctorName: {
    color: MUTED,
    fontSize: 7.5,
    marginTop: 2,
  },

  progressArea: {
    marginTop: 11,
  },

  progressHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  progressLabel: {
    color: MUTED,
    fontSize: 7.5,
    fontWeight: "700",
  },

  progressPercent: {
    color: GREEN,
    fontSize: 8,
    fontWeight: "900",
  },

  progressTrack: {
    height: 7,
    backgroundColor: "#E9EEEB",
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: GREEN,
    borderRadius: 999,
  },

  cardStats: {
    flexDirection: "row",
    gap: 7,
    marginTop: 11,
  },

  smallStat: {
    flex: 1,
    minHeight: 54,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FBFCFB",
    alignItems: "center",
    justifyContent: "center",
  },

  smallStatValue: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "900",
  },

  smallStatLabel: {
    color: MUTED,
    fontSize: 6.5,
    marginTop: 2,
  },

  lastSession: {
    marginTop: 10,
    minHeight: 37,
    borderRadius: 10,
    backgroundColor: MINT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 6,
  },

  lastSessionText: {
    color: GREEN,
    fontSize: 7.5,
    fontWeight: "700",
  },

  latestNote: {
    marginTop: 9,
    padding: 10,
    borderRadius: 11,
    backgroundColor: "#F8FAF8",
  },

  latestNoteLabel: {
    color: MUTED,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  latestNoteText: {
    color: TEXT,
    fontSize: 8,
    lineHeight: 13,
    marginTop: 4,
  },

  viewButton: {
    height: 41,
    borderRadius: 11,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 11,
  },

  viewButtonText: {
    color: WHITE,
    fontSize: 8.5,
    fontWeight: "900",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,31,25,0.56)",
    justifyContent: "flex-end",
  },

  sheet: {
    maxHeight: "90%",
    backgroundColor: WHITE,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 18,
    paddingBottom: 30,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  modalPatient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  modalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },

  modalAvatarText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "900",
  },

  modalTitle: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "900",
  },

  modalSubtitle: {
    color: MUTED,
    fontSize: 7.5,
    marginTop: 2,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F3F5F3",
    alignItems: "center",
    justifyContent: "center",
  },

  patientInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  infoBox: {
    width: "48.7%",
    minHeight: 57,
    borderRadius: 12,
    backgroundColor: "#F8FAF8",
    padding: 10,
    justifyContent: "center",
  },

  infoLabel: {
    color: MUTED,
    fontSize: 7,
  },

  infoValue: {
    color: TEXT,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 3,
  },

  planBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 13,
  },

  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  planLabel: {
    color: MUTED,
    fontSize: 6.5,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  planName: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3,
  },

  diagnosisLabel: {
    color: MUTED,
    fontSize: 7,
    fontWeight: "800",
    marginTop: 12,
  },

  diagnosis: {
    color: TEXT,
    fontSize: 9,
    marginTop: 3,
  },

  sessionStats: {
    flexDirection: "row",
    gap: 5,
    marginTop: 11,
  },

  dateGrid: {
    flexDirection: "row",
    gap: 7,
    marginTop: 11,
  },

  detailItem: {
    flex: 1,
    minHeight: 62,
    borderRadius: 12,
    backgroundColor: "#F8FAF8",
    flexDirection: "row",
    alignItems: "center",
    padding: 9,
    gap: 7,
  },

  detailIcon: {
    width: 31,
    height: 31,
    borderRadius: 9,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  detailLabel: {
    color: MUTED,
    fontSize: 6.5,
  },

  detailValue: {
    color: TEXT,
    fontSize: 8,
    fontWeight: "800",
    marginTop: 2,
  },

  notesBox: {
    marginTop: 11,
    padding: 12,
    borderRadius: 13,
    backgroundColor: MINT,
  },

  notesHeading: {
    color: GREEN,
    fontSize: 8,
    fontWeight: "900",
  },

  notesText: {
    color: TEXT,
    fontSize: 8.5,
    lineHeight: 14,
    marginTop: 5,
  },

  historyHeader: {
    marginTop: 18,
    marginBottom: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  historyTitle: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "900",
  },

  historyCount: {
    color: MUTED,
    fontSize: 7.5,
    fontWeight: "700",
  },

  noSessions: {
    padding: 22,
    borderRadius: 14,
    backgroundColor: "#F8FAF8",
    alignItems: "center",
    gap: 7,
  },

  noSessionsText: {
    color: MUTED,
    fontSize: 8,
  },

  sessionHistoryCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },

  sessionHistoryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sessionNumber: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "900",
  },

  sessionTherapy: {
    color: MUTED,
    fontSize: 7.5,
    marginTop: 2,
  },

  sessionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },

  sessionStatusText: {
    fontSize: 6.5,
    fontWeight: "900",
  },

  sessionDateRow: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },

  sessionDateText: {
    color: MUTED,
    fontSize: 7.5,
    marginRight: 6,
  },

  sessionNote: {
    marginTop: 9,
    backgroundColor: "#F8FAF8",
    borderRadius: 10,
    padding: 9,
  },

  sessionNoteLabel: {
    color: GREEN,
    fontSize: 7,
    fontWeight: "900",
  },

  sessionNoteText: {
    color: TEXT,
    fontSize: 8,
    lineHeight: 13,
    marginTop: 3,
  },

  rescheduleBox: {
    marginTop: 8,
    backgroundColor: ORANGE_LIGHT,
    borderRadius: 10,
    padding: 9,
  },

  rescheduleLabel: {
    color: ORANGE,
    fontSize: 7,
    fontWeight: "900",
  },

  rescheduleText: {
    color: TEXT,
    fontSize: 8,
    marginTop: 3,
  },
});