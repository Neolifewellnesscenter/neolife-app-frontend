import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE_URL } from "../../services/api";

const GREEN = "#0B3D2E";
const GREEN_2 = "#14533D";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_DARK = "#A98632";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#75837B";
const BORDER = "#E6EBE7";
const DANGER = "#B95045";
const DANGER_LIGHT = "#FBECE9";
const SUCCESS = "#2E7D52";
const SUCCESS_LIGHT = "#EAF6EF";
const WARNING = "#C88723";
const WARNING_LIGHT = "#FFF6E7";
const INFO = "#397A9A";
const INFO_LIGHT = "#EDF7FC";

type PatientView = "ALL" | "REGISTERED" | "WALK_IN";
type GenderFilter = "" | "MALE" | "FEMALE" | "OTHER";
type InteractionFilter = 0 | 7 | 30 | 90;

type Patient = {
  id: string | number;
  walkInPatientId: string | number | null;
  isWalkInPatient: boolean;
  code: string;
  name: string;
  phone: string;
  email: string;
  age: string | number;
  gender: string;
  patientType: "REGISTERED" | "WALK_IN";
  visitDate: string | null;
  visitTime: string | null;
  status: string;
  totalAppointments: number;
  totalConsultations: number;
  totalInteractions: number;
  lastInteractionAt: string | null;
  symptoms: string;
  pastMedicalHistory: string;
};

type MedicalRecord = {
  patient?: any;
  patientDetails?: any;
  appointments?: any[];
  consultations?: any[];
  prescriptions?: any[];
  therapies?: any[];
  treatmentPlans?: any[];
  notes?: any[];
};

type NoticeType = "success" | "error" | "warning" | "info";

type Notice = {
  visible: boolean;
  type: NoticeType;
  title: string;
  message: string;
};

const MENU_ITEMS = [
  ["grid-outline", "Dashboard", "/doctor/dashboard", "MAIN"],
  ["people-outline", "Patients", "/doctor/patients", "MAIN"],
  ["calendar-outline", "Appointment Calendar", "/doctor/calendar", "MAIN"],
  ["calendar-number-outline", "Upcoming Schedule", "/doctor/schedule", "MAIN"],
  ["time-outline", "Manage Availability", "/doctor/availability", "MAIN"],
  ["clipboard-outline", "Appointment Details", "/doctor/appointments", "CLINICAL"],
  ["videocam-outline", "Consultation Details", "/doctor/consultations", "CLINICAL"],
  ["card-outline", "Transactions", "/doctor/transactions", "FINANCE"],
  ["person-circle-outline", "My Profile", "/doctor/profile", "FINANCE"],
] as const;

export default function DoctorPatientsScreen() {
  const params = useLocalSearchParams<{ view?: string; walkInPatientId?: string }>();

  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [doctorName, setDoctorName] = useState("Doctor");
  const [doctorInitial, setDoctorInitial] = useState("D");
  const [hasOnline, setHasOnline] = useState<boolean | null>(null);
  const [hasOffline, setHasOffline] = useState<boolean | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [patientView, setPatientView] = useState<PatientView>(
    String(params.view || "").toLowerCase() === "walkin" ? "WALK_IN" : "ALL"
  );
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<GenderFilter>("");
  const [interactionDays, setInteractionDays] = useState<InteractionFilter>(0);
  const [filterOpen, setFilterOpen] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordMode, setRecordMode] = useState<"RECORD" | "APPOINTMENTS" | "WALK_IN">("RECORD");
  const [recordLoading, setRecordLoading] = useState(false);
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null);
  const [appointmentHistory, setAppointmentHistory] = useState<any[]>([]);

  const [notice, setNotice] = useState<Notice>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const [logoutOpen, setLogoutOpen] = useState(false);

  function showNotice(type: NoticeType, title: string, message: string) {
    setNotice({ visible: true, type, title, message });
  }

  async function getToken() {
    return (
      (await AsyncStorage.getItem("doctorToken")) ||
      (await AsyncStorage.getItem("token"))
    );
  }

  async function clearDoctorSession() {
    await AsyncStorage.multiRemove([
      "doctorToken",
      "doctorRefreshToken",
      "token",
      "refreshToken",
      "role",
      "doctorId",
      "doctorName",
      "doctorHasOnline",
      "doctorHasOffline",
      "doctor",
      "userId",
      "email",
      "profileCompleted",
      "isLoggedIn",
    ]);
  }

  async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const token = await getToken();

    if (!token) {
      await clearDoctorSession();
      router.replace("/login" as any);
      throw new Error("Doctor login required.");
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    };

    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const text = await response.text();
    let result: any = {};

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      result = {
        success: false,
        message: text || `Invalid server response (${response.status}).`,
      };
    }

    if (response.status === 401) {
      await clearDoctorSession();
      router.replace("/login" as any);
      throw new Error(result?.message || "Doctor session expired. Please login again.");
    }

    if (response.status === 403) {
      throw new Error(
        result?.message || "You do not have permission to access this resource."
      );
    }

    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || "Request failed.");
    }

    return result;
  }

  async function validateDoctor() {
    const token = await getToken();
    const role = String((await AsyncStorage.getItem("role")) || "").toUpperCase();

    if (!token || (role && role !== "DOCTOR")) {
      await clearDoctorSession();
      router.replace("/login" as any);
      return false;
    }

    return true;
  }

  function getInitial(name: string) {
    return (
      String(name || "Doctor")
        .replace(/^Dr\.?\s*/i, "")
        .trim()
        .charAt(0)
        .toUpperCase() || "D"
    );
  }

  async function loadDoctorProfile() {
    const storedName =
      (await AsyncStorage.getItem("doctorName")) ||
      (await AsyncStorage.getItem("name")) ||
      "Doctor";

    setDoctorName(storedName);
    setDoctorInitial(getInitial(storedName));

    try {
      const result = await apiRequest("/doctors/my-profile");
      const profile = result?.data || {};
      const name = profile.name || profile.doctorName || storedName;

      setDoctorName(name);
      setDoctorInitial(getInitial(name));
      await AsyncStorage.setItem("doctorName", name);

      if (profile.id != null) {
        await AsyncStorage.setItem("doctorId", String(profile.id));
      }

      return profile;
    } catch {
      return {};
    }
  }

  async function loadConsultationModes(profile?: any) {
    const doctorId =
      profile?.id || Number(await AsyncStorage.getItem("doctorId"));

    if (!doctorId) return;

    try {
      const result = await apiRequest(
        `/doctor-availability/doctor/${encodeURIComponent(String(doctorId))}`
      );

      const slots = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.data?.content)
        ? result.data.content
        : Array.isArray(result?.content)
        ? result.content
        : [];

      const active = slots.filter((slot: any) => slot?.active !== false);

      const online = active.some(
        (slot: any) =>
          String(slot.appointmentMode || "").toUpperCase() === "ONLINE"
      );

      const offline = active.some(
        (slot: any) =>
          String(slot.appointmentMode || "").toUpperCase() === "OFFLINE"
      );

      if (!online && !offline) {
        setHasOnline(null);
        setHasOffline(null);
        return;
      }

      setHasOnline(online);
      setHasOffline(offline);

      await AsyncStorage.multiSet([
        ["doctorHasOnline", String(online)],
        ["doctorHasOffline", String(offline)],
      ]);
    } catch {
      const online = await AsyncStorage.getItem("doctorHasOnline");
      const offline = await AsyncStorage.getItem("doctorHasOffline");

      if (online !== null || offline !== null) {
        setHasOnline(online === "true");
        setHasOffline(offline === "true");
      }
    }
  }

  function normalizePatient(patient: any): Patient {
    const id = patient.patientId ?? patient.id ?? patient.userId ?? "";

    const appointments = Number(patient.totalAppointments || 0);
    const consultations = Number(patient.totalConsultations || 0);

    return {
      id,
      walkInPatientId: null,
      isWalkInPatient: false,
      code: id !== "" ? `NL-P-${id}` : "-",
      name: patient.patientName || patient.name || "Patient",
      phone: patient.phoneNumber || patient.phone || "-",
      email: patient.email || "-",
      age: patient.age ?? "-",
      gender: String(patient.gender || "-").toUpperCase(),
      patientType: "REGISTERED",
      visitDate: patient.lastInteractionAt || null,
      visitTime: patient.startTime || null,
      status: String(patient.status || "REGISTERED").toUpperCase(),
      totalAppointments: appointments,
      totalConsultations: consultations,
      totalInteractions: appointments + consultations,
      lastInteractionAt: patient.lastInteractionAt || null,
      symptoms: patient.symptoms || "",
      pastMedicalHistory: patient.pastMedicalHistory || "",
    };
  }

  function normalizeWalkInPatient(patient: any): Patient {
    const id = patient.id ?? patient.walkInPatientId ?? "";

    return {
      id: `WALK-${id}`,
      walkInPatientId: id,
      isWalkInPatient: true,
      code: id !== "" ? `WALK-${id}` : "-",
      name: patient.name || patient.patientName || "Walk-in Patient",
      phone: patient.phoneNumber || "-",
      email: "-",
      age: patient.age ?? "-",
      gender: String(patient.gender || "-").toUpperCase(),
      patientType: "WALK_IN",
      visitDate: patient.appointmentDate || null,
      visitTime: patient.startTime || null,
      status: String(patient.status || "WAITING").toUpperCase(),
      totalAppointments: 0,
      totalConsultations: 0,
      totalInteractions: 1,
      lastInteractionAt: patient.appointmentDate || null,
      symptoms: patient.symptoms || "",
      pastMedicalHistory: patient.pastMedicalHistory || "",
    };
  }

  async function loadPatients() {
    const results = await Promise.allSettled([
      apiRequest("/doctor-dashboard/patients"),
      apiRequest("/walk-in-patients/doctor/my-patients"),
    ]);

    const regular =
      results[0].status === "fulfilled" && Array.isArray(results[0].value?.data)
        ? results[0].value.data.map(normalizePatient)
        : [];

    const walkIns =
      results[1].status === "fulfilled" && Array.isArray(results[1].value?.data)
        ? results[1].value.data.map(normalizeWalkInPatient)
        : [];

    const combined = [...regular, ...walkIns].filter(
      (patient) =>
        patient.isWalkInPatient
          ? patient.walkInPatientId !== null && patient.walkInPatientId !== ""
          : patient.id !== null && patient.id !== ""
    );

    setPatients(combined);

    if (results.every((result) => result.status === "rejected")) {
      throw new Error("Unable to load patient records.");
    }

    if (results.some((result) => result.status === "rejected")) {
      showNotice(
        "warning",
        "Some Patients Could Not Load",
        "Part of the patient list could not be loaded. Pull down to try again."
      );
    }

    const walkInId = String(params.walkInPatientId || "");
    if (walkInId) {
      const patient = combined.find(
        (item) =>
          item.isWalkInPatient &&
          String(item.walkInPatientId) === walkInId
      );

      if (patient) {
        setSelectedPatient(patient);
        setRecordMode("WALK_IN");
        setMedicalRecord(null);
        setAppointmentHistory([]);
        setRecordOpen(true);
      }
    }
  }

  async function loadPage(initial = false) {
    try {
      if (initial) setLoading(true);

      const valid = await validateDoctor();
      if (!valid) return;

      const profile = await loadDoctorProfile();
      await loadConsultationModes(profile);
      await loadPatients();
    } catch (error: any) {
      showNotice(
        "error",
        "Unable to Load Patients",
        error?.message || "Unable to load patients."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPage(true);
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadPage(false);
  }

  function isWithinDays(value: string | null, days: number) {
    if (!value) return false;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;

    const difference = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    return difference >= 0 && difference <= days;
  }

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return patients.filter((patient) => {
      const matchesSearch =
        !query ||
        patient.name.toLowerCase().includes(query) ||
        String(patient.phone).toLowerCase().includes(query) ||
        String(patient.email).toLowerCase().includes(query) ||
        String(patient.code).toLowerCase().includes(query);

      const matchesGender = !gender || patient.gender === gender;

      const matchesDate =
        !interactionDays ||
        isWithinDays(
          patient.visitDate || patient.lastInteractionAt,
          interactionDays
        );

      const matchesView =
        patientView === "ALL" ||
        (patientView === "WALK_IN" && patient.isWalkInPatient) ||
        (patientView === "REGISTERED" && !patient.isWalkInPatient);

      return matchesSearch && matchesGender && matchesDate && matchesView;
    });
  }, [patients, search, gender, interactionDays, patientView]);

  const summary = useMemo(
    () => ({
      total: patients.length,
      appointments: patients.reduce(
        (sum, patient) => sum + patient.totalAppointments,
        0
      ),
      consultations: patients.reduce(
        (sum, patient) => sum + patient.totalConsultations,
        0
      ),
      recent: patients.filter((patient) =>
        isWithinDays(patient.lastInteractionAt, 30)
      ).length,
    }),
    [patients]
  );

  async function openPatientRecord(patient: Patient) {
    setSelectedPatient(patient);
    setRecordMode("RECORD");
    setRecordOpen(true);
    setRecordLoading(true);
    setMedicalRecord(null);
    setAppointmentHistory([]);

    try {
      const result = await apiRequest(
        `/patient-records/patient/${encodeURIComponent(String(patient.id))}`
      );
      setMedicalRecord(result?.data || {});
    } catch (error: any) {
      showNotice(
        "error",
        "Medical Record Unavailable",
        error?.message || "Unable to load patient medical record."
      );
      setRecordOpen(false);
    } finally {
      setRecordLoading(false);
    }
  }

  async function openAppointmentHistory(patient: Patient) {
    setSelectedPatient(patient);
    setRecordMode("APPOINTMENTS");
    setRecordOpen(true);
    setRecordLoading(true);
    setMedicalRecord(null);
    setAppointmentHistory([]);

    try {
      const result = await apiRequest(
        `/patient-records/patient/${encodeURIComponent(
          String(patient.id)
        )}/appointments`
      );

      const list = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.data?.content)
        ? result.data.content
        : [];

      setAppointmentHistory(list);
    } catch (error: any) {
      showNotice(
        "error",
        "History Unavailable",
        error?.message || "Unable to load appointment history."
      );
      setRecordOpen(false);
    } finally {
      setRecordLoading(false);
    }
  }

  function openWalkInPatient(patient: Patient) {
    setSelectedPatient(patient);
    setRecordMode("WALK_IN");
    setMedicalRecord(null);
    setAppointmentHistory([]);
    setRecordOpen(true);
  }

  function openPrescription(patient: Patient, startVisit = false) {
    if (!patient.walkInPatientId) {
      showNotice("error", "Patient Not Found", "Walk-in patient ID is missing.");
      return;
    }

    if (patient.status === "COMPLETED" && startVisit) {
      showNotice(
        "info",
        "Visit Completed",
        "This walk-in visit is already completed."
      );
      return;
    }

    setRecordOpen(false);

    router.push({
      pathname: "/doctor/prescription-pad" as any,
      params: {
        walkInPatientId: String(patient.walkInPatientId),
        source: "walkin",
        ...(startVisit ? { startVisit: "true" } : {}),
      },
    });
  }

  function visibleMenuItem(label: string) {
    if (label === "Appointment Details" && hasOffline === false) return false;
    if (label === "Consultation Details" && hasOnline === false) return false;
    return true;
  }

  async function logout() {
    await clearDoctorSession();
    setLogoutOpen(false);
    router.replace("/login" as any);
  }

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.loaderPage}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loaderText}>Preparing patient dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => setMenuOpen(true)}
        >
          <Ionicons name="menu-outline" size={25} color={GREEN} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerEyebrow}>DOCTOR PORTAL</Text>
          <Text style={styles.headerTitle}>Patients</Text>
        </View>

        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => router.replace("/doctor/dashboard" as any)}
        >
          <Ionicons name="grid-outline" size={20} color={GREEN} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatar}
          onPress={() => router.push("/doctor/profile" as any)}
        >
          <Text style={styles.avatarText}>{doctorInitial}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderPage}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loaderText}>Loading patients...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={GREEN}
              colors={[GREEN]}
            />
          }
          contentContainerStyle={{ paddingBottom: 35 }}
        >
          {/* HERO */}
          <View style={styles.hero}>
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />

            <View style={styles.heroBadge}>
              <Ionicons name="people-outline" size={14} color={GOLD_LIGHT} />
              <Text style={styles.heroBadgeText}>PATIENT DASHBOARD</Text>
            </View>

            <Text style={styles.heroTitle}>
              Your patients,{"\n"}
              <Text style={styles.heroGold}>one clear clinical view.</Text>
            </Text>

            <Text style={styles.heroText}>
              Review registered and walk-in patients, medical records,
              appointment history and active visits.
            </Text>
          </View>

          {/* SUMMARY */}
          <View style={styles.summaryGrid}>
            <SummaryCard
              icon="people-outline"
              label="Total Patients"
              value={summary.total}
              background={MINT}
              color={GREEN}
            />
            <SummaryCard
              icon="calendar-outline"
              label="Appointments"
              value={summary.appointments}
              background={SUCCESS_LIGHT}
              color={SUCCESS}
            />
            <SummaryCard
              icon="videocam-outline"
              label="Consultations"
              value={summary.consultations}
              background={INFO_LIGHT}
              color={INFO}
            />
            <SummaryCard
              icon="pulse-outline"
              label="Recent Interactions"
              value={summary.recent}
              background={WARNING_LIGHT}
              color={WARNING}
            />
          </View>

          {/* SEARCH + TABS */}
          <View style={styles.filterCard}>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={19} color={GOLD_DARK} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search name, phone, email or patient ID"
                placeholderTextColor="#97A29B"
                style={styles.searchInput}
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={18} color={MUTED} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.tabRow}>
              {(["ALL", "REGISTERED", "WALK_IN"] as PatientView[]).map(
                (view) => (
                  <TouchableOpacity
                    key={view}
                    style={[
                      styles.tabButton,
                      patientView === view && styles.tabButtonActive,
                    ]}
                    onPress={() => setPatientView(view)}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        patientView === view && styles.tabTextActive,
                      ]}
                    >
                      {view === "ALL"
                        ? "All"
                        : view === "REGISTERED"
                        ? "Registered"
                        : "Walk-in"}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <TouchableOpacity
              style={styles.moreFilterButton}
              onPress={() => setFilterOpen(true)}
            >
              <Ionicons name="options-outline" size={17} color={GREEN} />
              <Text style={styles.moreFilterText}>More Filters</Text>

              {Boolean(gender || interactionDays) && (
  <View style={styles.filterDot}>
    <Text style={styles.filterDotText}>
      {(gender ? 1 : 0) + (interactionDays ? 1 : 0)}
    </Text>
  </View>
)}
            </TouchableOpacity>
          </View>

          {/* PATIENT LIST */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>MY PATIENTS</Text>
              <Text style={styles.sectionTitle}>Patient Records</Text>
            </View>

            <View style={styles.resultBadge}>
              <Text style={styles.resultText}>
                {filteredPatients.length}{" "}
                {filteredPatients.length === 1 ? "Patient" : "Patients"}
              </Text>
            </View>
          </View>

          <View style={styles.patientList}>
            {!filteredPatients.length ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="person-remove-outline" size={28} color={GREEN} />
                </View>
                <Text style={styles.emptyTitle}>No patients found</Text>
                <Text style={styles.emptyText}>
                  Try changing the search or patient filters.
                </Text>
              </View>
            ) : (
              filteredPatients.map((patient) => (
                <PatientCard
                  key={`${patient.patientType}-${patient.id}`}
                  patient={patient}
                  onView={() =>
                    patient.isWalkInPatient
                      ? openWalkInPatient(patient)
                      : openPatientRecord(patient)
                  }
                  onAppointments={() => openAppointmentHistory(patient)}
                  onPrescription={() =>
                    openPrescription(patient, patient.status === "WAITING")
                  }
                />
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* DRAWER */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.drawerRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setMenuOpen(false)}
          />

          <View style={styles.drawer}>
            <View style={styles.drawerBrandRow}>
              <View style={styles.drawerLogo}>
                <Ionicons name="medical" size={25} color={GOLD} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.drawerBrand}>NeoLife</Text>
                <Text style={styles.drawerPortal}>Doctor Portal</Text>
              </View>

              <TouchableOpacity
                style={styles.drawerClose}
                onPress={() => setMenuOpen(false)}
              >
                <Ionicons name="close" size={22} color={GREEN} />
              </TouchableOpacity>
            </View>

            <View style={styles.drawerDoctor}>
              <View style={styles.drawerAvatar}>
                <Text style={styles.drawerAvatarText}>{doctorInitial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.drawerDoctorName} numberOfLines={1}>
                  {doctorName}
                </Text>
                <Text style={styles.drawerDoctorRole}>Doctor</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(["MAIN", "CLINICAL", "FINANCE"] as const).map((section) => (
                <View key={section} style={styles.drawerSection}>
                  <Text style={styles.drawerSectionLabel}>{section}</Text>

                  {MENU_ITEMS.filter(
                    (item) =>
                      item[3] === section && visibleMenuItem(item[1])
                  ).map(([icon, label, route]) => {
                    const active = label === "Patients";

                    return (
                      <TouchableOpacity
                        key={label}
                        style={[
                          styles.drawerItem,
                          active && styles.drawerItemActive,
                        ]}
                        onPress={() => {
                          setMenuOpen(false);
                          if (!active) router.push(route as any);
                        }}
                      >
                        <View
                          style={[
                            styles.drawerItemIcon,
                            active && styles.drawerItemIconActive,
                          ]}
                        >
                          <Ionicons
                            name={icon as any}
                            size={19}
                            color={active ? GREEN : GOLD}
                          />
                        </View>

                        <Text
                          style={[
                            styles.drawerItemText,
                            active && styles.drawerItemTextActive,
                          ]}
                        >
                          {label}
                        </Text>

                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={active ? GREEN : "#AFC0B6"}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                setMenuOpen(false);
                setLogoutOpen(true);
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={WHITE} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FILTER MODAL */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setFilterOpen(false)}
      >
        <View style={styles.sheetRoot}>
          <Pressable style={styles.backdrop} onPress={() => setFilterOpen(false)} />

          <View style={styles.filterSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>REFINE PATIENT LIST</Text>
                <Text style={styles.sheetTitle}>Patient Filters</Text>
              </View>

              <TouchableOpacity
                style={styles.sheetClose}
                onPress={() => setFilterOpen(false)}
              >
                <Ionicons name="close" size={21} color={GREEN} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>GENDER</Text>
            <View style={styles.optionRow}>
              {[
                ["", "All"],
                ["MALE", "Male"],
                ["FEMALE", "Female"],
                ["OTHER", "Other"],
              ].map(([value, label]) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.optionChip,
                    gender === value && styles.optionChipActive,
                  ]}
                  onPress={() => setGender(value as GenderFilter)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      gender === value && styles.optionChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>LAST INTERACTION</Text>
            <View style={styles.optionRow}>
              {[
                [0, "Any Time"],
                [7, "7 Days"],
                [30, "30 Days"],
                [90, "3 Months"],
              ].map(([value, label]) => (
                <TouchableOpacity
                  key={String(value)}
                  style={[
                    styles.optionChip,
                    interactionDays === value && styles.optionChipActive,
                  ]}
                  onPress={() =>
                    setInteractionDays(Number(value) as InteractionFilter)
                  }
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      interactionDays === value && styles.optionChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setGender("");
                  setInteractionDays(0);
                }}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setFilterOpen(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
                <Ionicons name="checkmark" size={18} color={GREEN} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PATIENT RECORD / WALK-IN / APPOINTMENTS */}
      <Modal
        visible={recordOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setRecordOpen(false)}
      >
        <View style={styles.sheetRoot}>
          <Pressable style={styles.backdrop} onPress={() => setRecordOpen(false)} />

          <View style={styles.recordSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetEyebrow}>
                  {recordMode === "WALK_IN"
                    ? "WALK-IN PATIENT"
                    : recordMode === "APPOINTMENTS"
                    ? "APPOINTMENT HISTORY"
                    : "MEDICAL RECORD"}
                </Text>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {selectedPatient?.name || "Patient"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.sheetClose}
                onPress={() => setRecordOpen(false)}
              >
                <Ionicons name="close" size={21} color={GREEN} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {recordLoading ? (
                <View style={styles.recordLoader}>
                  <ActivityIndicator size="large" color={GREEN} />
                  <Text style={styles.loaderText}>Loading patient record...</Text>
                </View>
              ) : recordMode === "WALK_IN" && selectedPatient ? (
                <WalkInDetails
                  patient={selectedPatient}
                  onAction={() =>
                    openPrescription(
                      selectedPatient,
                      selectedPatient.status === "WAITING"
                    )
                  }
                />
              ) : recordMode === "APPOINTMENTS" ? (
                <AppointmentHistory items={appointmentHistory} />
              ) : (
                <MedicalRecordView
                  record={medicalRecord}
                  fallbackPatient={selectedPatient}
                />
              )}

              {recordMode === "RECORD" && selectedPatient && !recordLoading && (
                <TouchableOpacity
                  style={styles.recordPrimaryButton}
                  onPress={() => openAppointmentHistory(selectedPatient)}
                >
                  <Ionicons name="calendar-outline" size={18} color={GREEN} />
                  <Text style={styles.recordPrimaryButtonText}>
                    View Appointment History
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* LOGOUT */}
      <Modal
        visible={logoutOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLogoutOpen(false)}
      >
        <View style={styles.centerModal}>
          <Pressable style={styles.backdrop} onPress={() => setLogoutOpen(false)} />
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="log-out-outline" size={31} color={GREEN} />
            </View>
            <Text style={styles.noticeEyebrow}>NEOLIFE DOCTOR PORTAL</Text>
            <Text style={styles.noticeTitle}>Log Out?</Text>
            <Text style={styles.noticeMessage}>
              Are you sure you want to leave the doctor portal?
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setLogoutOpen(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={logout}>
                <Text style={styles.confirmText}>Logout</Text>
                <Ionicons name="arrow-forward" size={17} color={GREEN} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* STYLED NOTICE */}
      <Modal
        visible={notice.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setNotice((current) => ({ ...current, visible: false }))
        }
      >
        <View style={styles.centerModal}>
          <Pressable
            style={styles.backdrop}
            onPress={() =>
              setNotice((current) => ({ ...current, visible: false }))
            }
          />

          <View style={styles.noticeCard}>
            <View
              style={[
                styles.noticeIcon,
                notice.type === "success"
                  ? { backgroundColor: SUCCESS_LIGHT }
                  : notice.type === "error"
                  ? { backgroundColor: DANGER_LIGHT }
                  : notice.type === "warning"
                  ? { backgroundColor: WARNING_LIGHT }
                  : { backgroundColor: INFO_LIGHT },
              ]}
            >
              <Ionicons
                name={
                  notice.type === "success"
                    ? "checkmark-circle-outline"
                    : notice.type === "error"
                    ? "close-circle-outline"
                    : notice.type === "warning"
                    ? "alert-circle-outline"
                    : "information-circle-outline"
                }
                size={32}
                color={
                  notice.type === "success"
                    ? SUCCESS
                    : notice.type === "error"
                    ? DANGER
                    : notice.type === "warning"
                    ? WARNING
                    : INFO
                }
              />
            </View>

            <Text style={styles.noticeEyebrow}>NEOLIFE DOCTOR PORTAL</Text>
            <Text style={styles.noticeTitle}>{notice.title}</Text>
            <Text style={styles.noticeMessage}>{notice.message}</Text>

            <TouchableOpacity
              style={styles.noticeButton}
              onPress={() =>
                setNotice((current) => ({ ...current, visible: false }))
              }
            >
              <Text style={styles.noticeButtonText}>Okay</Text>
              <Ionicons name="checkmark" size={18} color={GREEN} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  background,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  background: string;
  color: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={21} color={color} />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function PatientCard({
  patient,
  onView,
  onAppointments,
  onPrescription,
}: {
  patient: Patient;
  onView: () => void;
  onAppointments: () => void;
  onPrescription: () => void;
}) {
  const walkIn = patient.isWalkInPatient;

  return (
    <View style={styles.patientCard}>
      <View style={styles.patientTop}>
        <View
          style={[
            styles.patientAvatar,
            walkIn && { backgroundColor: GOLD },
          ]}
        >
          <Text
            style={[
              styles.patientAvatarText,
              walkIn && { color: GREEN },
            ]}
          >
            {patient.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.patientName}>{patient.name}</Text>
          <Text style={styles.patientCode}>{patient.code}</Text>
        </View>

        <View
          style={[
            styles.typeBadge,
            walkIn ? styles.walkInBadge : styles.registeredBadge,
          ]}
        >
          <Text
            style={[
              styles.typeBadgeText,
              { color: walkIn ? GOLD_DARK : SUCCESS },
            ]}
          >
            {walkIn ? "WALK-IN" : "REGISTERED"}
          </Text>
        </View>
      </View>

      <View style={styles.patientInfoGrid}>
        <InfoItem icon="call-outline" label="Phone" value={patient.phone} />
        <InfoItem
          icon="person-outline"
          label="Age / Gender"
          value={`${patient.age} / ${formatLabel(patient.gender)}`}
        />
        <InfoItem
          icon="calendar-outline"
          label="Visit Date"
          value={formatDate(patient.visitDate)}
        />
        <InfoItem
          icon="time-outline"
          label="Visit Time"
          value={formatTime(patient.visitTime)}
        />
      </View>

      <View style={styles.patientBottom}>
        <StatusBadge status={patient.status} />

        {!walkIn && (
          <Text style={styles.interactionText}>
            {patient.totalInteractions} interaction
            {patient.totalInteractions === 1 ? "" : "s"}
          </Text>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.viewButton} onPress={onView}>
          <Ionicons
            name={walkIn ? "eye-outline" : "document-text-outline"}
            size={17}
            color={GREEN}
          />
          <Text style={styles.viewButtonText}>
            {walkIn ? "View Details" : "Medical Record"}
          </Text>
        </TouchableOpacity>

        {walkIn ? (
          <TouchableOpacity style={styles.goldButton} onPress={onPrescription}>
            <Ionicons
              name={
                patient.status === "WAITING"
                  ? "play-outline"
                  : "document-text-outline"
              }
              size={17}
              color={GREEN}
            />
            <Text style={styles.goldButtonText}>
              {patient.status === "WAITING"
                ? "Start Visit"
                : patient.status === "IN_PROGRESS"
                ? "Continue"
                : "Prescription"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.goldButton} onPress={onAppointments}>
            <Ionicons name="calendar-outline" size={17} color={GREEN} />
            <Text style={styles.goldButtonText}>Appointments</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoItem}>
      <Ionicons name={icon} size={15} color={GOLD_DARK} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value || "-"}
        </Text>
      </View>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || "").toUpperCase();

  const color =
    normalized === "COMPLETED"
      ? SUCCESS
      : normalized === "IN_PROGRESS"
      ? INFO
      : normalized === "WAITING"
      ? WARNING
      : GREEN;

  const background =
    normalized === "COMPLETED"
      ? SUCCESS_LIGHT
      : normalized === "IN_PROGRESS"
      ? INFO_LIGHT
      : normalized === "WAITING"
      ? WARNING_LIGHT
      : MINT;

  return (
    <View style={[styles.statusBadge, { backgroundColor: background }]}>
      <Text style={[styles.statusText, { color }]}>
        {formatLabel(normalized)}
      </Text>
    </View>
  );
}

function WalkInDetails({
  patient,
  onAction,
}: {
  patient: Patient;
  onAction: () => void;
}) {
  return (
    <>
      <View style={styles.walkInHero}>
        <View style={styles.walkInHeroAvatar}>
          <Text style={styles.walkInHeroAvatarText}>
            {patient.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.walkInName}>{patient.name}</Text>
          <Text style={styles.walkInCode}>{patient.code}</Text>
        </View>
        <StatusBadge status={patient.status} />
      </View>

      <View style={styles.recordInfoGrid}>
        <RecordInfo label="Phone" value={patient.phone} />
        <RecordInfo
          label="Age / Gender"
          value={`${patient.age} / ${formatLabel(patient.gender)}`}
        />
        <RecordInfo label="Visit Date" value={formatDate(patient.visitDate)} />
        <RecordInfo label="Visit Time" value={formatTime(patient.visitTime)} />
      </View>

      <RecordSection
        title="Symptoms"
        items={[patient.symptoms || "No symptoms recorded."]}
        render={(item) => String(item)}
      />

      <RecordSection
        title="Past Medical History"
        items={[patient.pastMedicalHistory || "No past medical history recorded."]}
        render={(item) => String(item)}
      />

      <TouchableOpacity style={styles.recordPrimaryButton} onPress={onAction}>
        <Ionicons
          name={
            patient.status === "WAITING"
              ? "play-outline"
              : patient.status === "IN_PROGRESS"
              ? "create-outline"
              : "eye-outline"
          }
          size={18}
          color={GREEN}
        />
        <Text style={styles.recordPrimaryButtonText}>
          {patient.status === "WAITING"
            ? "Start Visit"
            : patient.status === "IN_PROGRESS"
            ? "Continue Prescription"
            : "View Prescription"}
        </Text>
      </TouchableOpacity>
    </>
  );
}

function MedicalRecordView({
  record,
  fallbackPatient,
}: {
  record: MedicalRecord | null;
  fallbackPatient: Patient | null;
}) {
  if (!record) {
    return (
      <View style={styles.emptyRecord}>
        <Text style={styles.emptyTitle}>No medical record available</Text>
      </View>
    );
  }

  const patient = record.patient || record.patientDetails || {};
  const appointments = Array.isArray(record.appointments)
    ? record.appointments
    : [];
  const consultations = Array.isArray(record.consultations)
    ? record.consultations
    : [];
  const prescriptions = Array.isArray(record.prescriptions)
    ? record.prescriptions
    : [];
  const therapies = Array.isArray(record.therapies)
    ? record.therapies
    : Array.isArray(record.treatmentPlans)
    ? record.treatmentPlans
    : [];
  const notes = Array.isArray(record.notes) ? record.notes : [];

  return (
    <>
      <View style={styles.recordInfoGrid}>
        <RecordInfo
          label="Patient"
          value={patient.name || fallbackPatient?.name || "Patient"}
        />
        <RecordInfo
          label="Phone"
          value={patient.phoneNumber || fallbackPatient?.phone || "-"}
        />
        <RecordInfo
          label="Age / Gender"
          value={`${patient.age ?? fallbackPatient?.age ?? "-"} / ${formatLabel(
            patient.gender || fallbackPatient?.gender || "-"
          )}`}
        />
        <RecordInfo
          label="Patient ID"
          value={String(
            patient.patientId ?? fallbackPatient?.id ?? "-"
          )}
        />
      </View>

      <RecordSection
        title="Appointments"
        items={appointments}
        render={(item) =>
          `${formatDate(item.appointmentDate)} · ${formatTime(
            item.startTime
          )}\n${formatLabel(item.appointmentMode)} · ${formatLabel(item.status)}`
        }
      />

      <RecordSection
        title="Consultations"
        items={consultations}
        render={(item) =>
          `${item.doctorName || "Consultation"}\n${formatLabel(item.status)}${
            item.consultationDate ? ` · ${formatDate(item.consultationDate)}` : ""
          }`
        }
      />

      <RecordSection
        title="Prescriptions"
        items={prescriptions}
        render={(item) =>
          `${item.diagnosis || "Prescription"}\n${formatLabel(item.status)}${
            item.createdAt ? ` · ${formatDateTime(item.createdAt)}` : ""
          }`
        }
      />

      <RecordSection
        title="Therapies"
        items={therapies}
        render={(item) =>
          `${item.therapyName ||
            item.serviceName ||
            item.treatmentName ||
            "Therapy"}\n${formatLabel(item.status)}`
        }
      />

      <RecordSection
        title="Doctor Notes"
        items={notes}
        render={(item) =>
          `${item.title || "Clinical Note"}\n${
            item.note || item.content || item.notes || "-"
          }`
        }
      />
    </>
  );
}

function AppointmentHistory({ items }: { items: any[] }) {
  if (!items.length) {
    return (
      <View style={styles.emptyRecord}>
        <View style={styles.emptyIcon}>
          <Ionicons name="calendar-clear-outline" size={28} color={GREEN} />
        </View>
        <Text style={styles.emptyTitle}>No appointments found</Text>
        <Text style={styles.emptyText}>
          This patient has no appointment history available.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.historyList}>
      {items.map((item, index) => (
        <View key={String(item.id || item.appointmentId || index)} style={styles.historyCard}>
          <View style={styles.historyIcon}>
            <Ionicons
              name={
                String(item.appointmentMode || "").toUpperCase() === "ONLINE"
                  ? "videocam-outline"
                  : "business-outline"
              }
              size={19}
              color={GREEN}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.historyDate}>
              {formatDate(item.appointmentDate)}
            </Text>
            <Text style={styles.historyMeta}>
              {formatTime(item.startTime)} ·{" "}
              {formatLabel(item.appointmentMode || "OFFLINE")}
            </Text>
            <Text style={styles.historyStatus}>
              {formatLabel(item.status)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function RecordInfo({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.recordInfo}>
      <Text style={styles.recordInfoLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.recordInfoValue}>{value || "-"}</Text>
    </View>
  );
}

function RecordSection({
  title,
  items,
  render,
}: {
  title: string;
  items: any[];
  render: (item: any) => string;
}) {
  return (
    <View style={styles.recordSection}>
      <Text style={styles.recordSectionTitle}>{title}</Text>

      {!items.length ? (
        <Text style={styles.recordEmpty}>No records available.</Text>
      ) : (
        items.map((item, index) => (
          <View key={String(item?.id || index)} style={styles.recordItem}>
            <Text style={styles.recordItemText}>{render(item)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const clean = String(value).split("T")[0];
  const date = new Date(`${clean}T00:00:00`);

  if (Number.isNaN(date.getTime())) return clean;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "-";

  const parts = String(value).split(":");
  if (parts.length < 2) return String(value);

  const date = new Date();
  date.setHours(Number(parts[0]), Number(parts[1]), 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLabel(value?: string | null) {
  if (!value || value === "-") return "-";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  loaderPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },
  loaderText: {
    marginTop: 11,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 11,
  },

  header: {
    minHeight: 75,
    paddingTop: Platform.OS === "web" ? 12 : 43,
    paddingBottom: 11,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  headerTitleWrap: { flex: 1 },
  headerEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1,
  },
  headerTitle: {
    marginTop: 2,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 19,
  },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },
  avatarText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 17,
  },

  hero: {
    overflow: "hidden",
    marginHorizontal: 15,
    marginTop: 19,
    padding: 22,
    borderRadius: 28,
    backgroundColor: GREEN,
  },
  heroGlowOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -65,
    top: -95,
    backgroundColor: "rgba(255,255,255,.06)",
  },
  heroGlowTwo: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    left: -80,
    bottom: -110,
    backgroundColor: "rgba(214,180,91,.15)",
  },
  heroBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,.09)",
  },
  heroBadgeText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 7.5,
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 17,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 27,
    lineHeight: 33,
  },
  heroGold: { color: GOLD_LIGHT },
  heroText: {
    marginTop: 10,
    maxWidth: 330,
    fontFamily: "DMSans_400Regular",
    color: "#D3E1D8",
    fontSize: 11,
    lineHeight: 18,
  },

  summaryGrid: {
    marginTop: 15,
    marginHorizontal: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  summaryCard: {
    width: "48.6%",
    minHeight: 108,
    padding: 13,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    marginTop: 9,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 8,
  },
  summaryValue: {
    marginTop: 3,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 23,
  },

  filterCard: {
    marginHorizontal: 15,
    marginTop: 15,
    padding: 13,
    borderRadius: 21,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchWrap: {
    minHeight: 51,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F7F9F7",
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchInput: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 10,
  },
  tabRow: {
    marginTop: 10,
    padding: 4,
    flexDirection: "row",
    gap: 4,
    borderRadius: 13,
    backgroundColor: "#F4F7F4",
  },
  tabButton: {
    flex: 1,
    minHeight: 39,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: { backgroundColor: GREEN },
  tabText: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 7.5,
  },
  tabTextActive: { color: WHITE },
  moreFilterButton: {
    marginTop: 10,
    minHeight: 43,
    paddingHorizontal: 12,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FFF7E2",
  },
  moreFilterText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8.5,
  },
  filterDot: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },
  filterDotText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 7,
  },

  sectionHeader: {
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  sectionEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1,
  },
  sectionTitle: {
    marginTop: 3,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 21,
  },
  resultBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: MINT,
  },
  resultText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 6.5,
  },

  patientList: { marginHorizontal: 15, gap: 10 },
  patientCard: {
    padding: 13,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  patientTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },
  patientAvatarText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 17,
  },
  patientName: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 16,
  },
  patientCode: {
    marginTop: 2,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 7,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
  },
  registeredBadge: { backgroundColor: SUCCESS_LIGHT },
  walkInBadge: { backgroundColor: WARNING_LIGHT },
  typeBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 5.8,
  },
  patientInfoGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 7,
  },
  infoItem: {
    width: "48.8%",
    minHeight: 54,
    padding: 9,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#F9FAF8",
  },
  infoLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 5.5,
    letterSpacing: 0.5,
  },
  infoValue: {
    marginTop: 3,
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 7.5,
  },
  patientBottom: {
    marginTop: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 5.8,
  },
  interactionText: {
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 6.5,
  },
  cardActions: {
    marginTop: 11,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: "row",
    gap: 8,
  },
  viewButton: {
    flex: 1,
    minHeight: 43,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: MINT,
  },
  viewButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 7.5,
  },
  goldButton: {
    flex: 1,
    minHeight: 43,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: GOLD,
  },
  goldButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 7.5,
  },

  emptyCard: {
    paddingVertical: 35,
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  emptyTitle: {
    marginTop: 10,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 17,
  },
  emptyText: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    textAlign: "center",
  },

  drawerRoot: { flex: 1, flexDirection: "row" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 28, 19, .70)",
  },
  drawer: {
    width: "86%",
    maxWidth: 350,
    height: "100%",
    paddingTop: Platform.OS === "web" ? 35 : 58,
    paddingHorizontal: 15,
    paddingBottom: 20,
    backgroundColor: GREEN,
  },
  drawerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  drawerLogo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.10)",
  },
  drawerBrand: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 24,
  },
  drawerPortal: {
    marginTop: 1,
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 8,
    letterSpacing: 1,
  },
  drawerClose: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  drawerDoctor: {
    marginTop: 18,
    marginBottom: 8,
    padding: 11,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "rgba(255,255,255,.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.10)",
  },
  drawerAvatar: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },
  drawerAvatarText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 16,
  },
  drawerDoctorName: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 11,
  },
  drawerDoctorRole: {
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
    color: "#C5D7CC",
    fontSize: 7.5,
  },
  drawerSection: { marginTop: 14 },
  drawerSectionLabel: {
    marginLeft: 11,
    marginBottom: 6,
    fontFamily: "DMSans_700Bold",
    color: "#7E9C8C",
    fontSize: 7,
    letterSpacing: 1.2,
  },
  drawerItem: {
    minHeight: 50,
    paddingHorizontal: 9,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  drawerItemActive: { backgroundColor: WHITE },
  drawerItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.07)",
  },
  drawerItemIconActive: { backgroundColor: MINT },
  drawerItemText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: "#E4ECE7",
    fontSize: 10.5,
  },
  drawerItemTextActive: { color: GREEN },
  logoutButton: {
    minHeight: 49,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.16)",
  },
  logoutText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 11,
  },

  sheetRoot: { flex: 1, justifyContent: "flex-end" },
  filterSheet: {
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === "ios" ? 30 : 21,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: CREAM,
  },
  recordSheet: {
    maxHeight: "92%",
    paddingTop: 10,
    paddingHorizontal: 17,
    paddingBottom: Platform.OS === "ios" ? 30 : 18,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: CREAM,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#CDD4CF",
  },
  sheetHeader: {
    marginTop: 14,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sheetEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1,
  },
  sheetTitle: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 24,
  },
  sheetClose: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  fieldLabel: {
    marginTop: 9,
    marginBottom: 7,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 7,
    letterSpacing: 0.8,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  optionChip: {
    minHeight: 39,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  optionChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  optionChipText: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 7.5,
  },
  optionChipTextActive: { color: WHITE },
  filterActions: {
    marginTop: 20,
    flexDirection: "row",
    gap: 8,
  },
  clearButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  clearButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },
  applyButton: {
    flex: 1.5,
    minHeight: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: GOLD,
  },
  applyButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  recordLoader: {
    minHeight: 230,
    alignItems: "center",
    justifyContent: "center",
  },
  walkInHero: {
    padding: 12,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: MINT,
  },
  walkInHeroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },
  walkInHeroAvatarText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 17,
  },
  walkInName: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 17,
  },
  walkInCode: {
    marginTop: 2,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 7,
  },
  recordInfoGrid: {
    marginTop: 11,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  recordInfo: {
    width: "48.7%",
    minHeight: 74,
    padding: 11,
    borderRadius: 15,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  recordInfoLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 6,
    letterSpacing: 0.7,
  },
  recordInfoValue: {
    marginTop: 6,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
    lineHeight: 14,
  },
  recordSection: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  recordSectionTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 15,
  },
  recordItem: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#F7F9F7",
  },
  recordItemText: {
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 8.5,
    lineHeight: 14,
  },
  recordEmpty: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },
  recordPrimaryButton: {
    minHeight: 49,
    marginTop: 13,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: GOLD,
  },
  recordPrimaryButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },
  emptyRecord: {
    minHeight: 210,
    alignItems: "center",
    justifyContent: "center",
  },
  historyList: { gap: 8 },
  historyCard: {
    padding: 11,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  historyIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  historyDate: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },
  historyMeta: {
    marginTop: 3,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 7,
  },
  historyStatus: {
    marginTop: 4,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 6,
  },

  centerModal: {
    flex: 1,
    paddingHorizontal: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCard: {
    width: "100%",
    maxWidth: 380,
    padding: 22,
    borderRadius: 27,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "rgba(214,180,91,.42)",
    elevation: 18,
  },
  confirmIcon: {
    width: 67,
    height: 67,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  confirmActions: {
    width: "100%",
    marginTop: 19,
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cancelText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },
  confirmButton: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: GOLD,
  },
  confirmText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  noticeCard: {
    width: "100%",
    maxWidth: 380,
    padding: 22,
    borderRadius: 28,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "rgba(214,180,91,.42)",
    elevation: 18,
  },
  noticeIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeEyebrow: {
    marginTop: 14,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1.1,
  },
  noticeTitle: {
    marginTop: 6,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 23,
    textAlign: "center",
  },
  noticeMessage: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9.5,
    lineHeight: 16,
    textAlign: "center",
  },
  noticeButton: {
    width: "100%",
    minHeight: 48,
    marginTop: 18,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: GOLD,
  },
  noticeButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },
});
