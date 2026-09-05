import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";

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

import { router } from "expo-router";
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

/* =========================================================
   COLORS
========================================================= */

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
const PURPLE = "#76548F";
const PURPLE_LIGHT = "#F5EFFB";

/* =========================================================
   TYPES
========================================================= */

type SourceType = "OFFLINE" | "ONLINE";
type TypeFilter = "" | SourceType;

type UpcomingItem = {
  sourceType: SourceType;
  id: string | number | null;
  patientId: string | number | null;
  patientName: string;
  phoneNumber: string;
  age: string | number;
  gender: string;
  doctorName: string;
  specialization: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  symptoms: string;
  pastMedicalHistory: string;
  fee: number | string | null;
  rescheduleReason: string | null;
  cancellationReason: string | null;
};

type NoticeType = "success" | "error" | "warning" | "info";

type NoticeState = {
  visible: boolean;
  type: NoticeType;
  title: string;
  message: string;
};

type MenuItem = {
  icon: any;
  label: string;
  route: string;
  section: "MAIN" | "CLINICAL" | "FINANCE";
  requiresOnline?: boolean;
  requiresOffline?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  {
    icon: "grid-outline",
    label: "Dashboard",
    route: "/doctor/dashboard",
    section: "MAIN",
  },
  {
    icon: "people-outline",
    label: "Patients",
    route: "/doctor/patients",
    section: "MAIN",
  },
  {
    icon: "calendar-outline",
    label: "Appointment Calendar",
    route: "/doctor/calendar",
    section: "MAIN",
  },
  {
    icon: "calendar-number-outline",
    label: "Upcoming Schedule",
    route: "/doctor/schedule",
    section: "MAIN",
  },
  {
    icon: "time-outline",
    label: "Manage Availability",
    route: "/doctor/availability",
    section: "MAIN",
  },
  {
    icon: "clipboard-outline",
    label: "Appointment Details",
    route: "/doctor/appointments",
    section: "CLINICAL",
    requiresOffline: true,
  },
  {
    icon: "videocam-outline",
    label: "Consultation Details",
    route: "/doctor/consultations",
    section: "CLINICAL",
    requiresOnline: true,
  },
  {
    icon: "card-outline",
    label: "Transactions",
    route: "/doctor/transactions",
    section: "FINANCE",
  },
  {
    icon: "person-circle-outline",
    label: "My Profile",
    route: "/doctor/profile",
    section: "FINANCE",
  },
];

/* =========================================================
   SCREEN
========================================================= */

export default function DoctorUpcomingScheduleScreen() {
  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const [doctorName, setDoctorName] = useState("Doctor");
  const [doctorInitial, setDoctorInitial] = useState("D");
  const [doctorId, setDoctorId] = useState<number | null>(null);

  const [hasOnline, setHasOnline] = useState<boolean | null>(null);
  const [hasOffline, setHasOffline] = useState<boolean | null>(null);

  const [allUpcoming, setAllUpcoming] = useState<UpcomingItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<UpcomingItem | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [notice, setNotice] = useState<NoticeState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  /* =======================================================
     SESSION
  ======================================================= */

  function showNotice(
    type: NoticeType,
    title: string,
    message: string
  ) {
    setNotice({
      visible: true,
      type,
      title,
      message,
    });
  }

  async function getDoctorToken() {
    return (
      (await AsyncStorage.getItem("doctorToken")) ||
      (await AsyncStorage.getItem("token")) ||
      (await AsyncStorage.getItem("accessToken")) ||
      ""
    );
  }

  async function clearDoctorSession() {
    await AsyncStorage.multiRemove([
      "doctorToken",
      "doctorRefreshToken",
      "token",
      "refreshToken",
      "accessToken",
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

  async function apiRequest(
    endpoint: string,
    options: RequestInit = {}
  ) {
    const token = await getDoctorToken();

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

    const responseText = await response.text();

    let result: any = {};

    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      result = {
        success: false,
        message:
          responseText ||
          `Invalid server response (${response.status}).`,
      };
    }

    if (response.status === 401) {
      await clearDoctorSession();
      router.replace("/login" as any);

      throw new Error(
        result?.message ||
          "Doctor session expired. Please login again."
      );
    }

    /*
     * Do NOT clear the session for 403.
     * The doctor may simply not have permission for one endpoint.
     */
    if (response.status === 403) {
      throw new Error(
        result?.message ||
          "You do not have permission to access this resource."
      );
    }

    if (!response.ok || result?.success === false) {
      throw new Error(
        result?.message ||
          `Request failed (${response.status}).`
      );
    }

    return result;
  }

  async function validateDoctorAccess() {
    const token = await getDoctorToken();

    const role = String(
      (await AsyncStorage.getItem("role")) || ""
    )
      .replace(/^ROLE_/i, "")
      .toUpperCase();

    if (!token) {
      router.replace("/login" as any);
      return false;
    }

    if (role && role !== "DOCTOR") {
      await clearDoctorSession();
      router.replace("/login" as any);
      return false;
    }

    return true;
  }

  /* =======================================================
     DOCTOR PROFILE
  ======================================================= */

  function getDoctorInitial(name: string) {
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
    setDoctorInitial(getDoctorInitial(storedName));

    try {
      const result = await apiRequest("/doctors/my-profile");
      const profile = result?.data || {};

      const id =
        profile.id != null
          ? Number(profile.id)
          : Number(await AsyncStorage.getItem("doctorId")) || null;

      const name =
        profile.name ||
        profile.doctorName ||
        storedName;

      setDoctorId(id);
      setDoctorName(name);
      setDoctorInitial(getDoctorInitial(name));

      await AsyncStorage.setItem("doctorName", name);
      await AsyncStorage.setItem("doctor", JSON.stringify(profile));

      if (id != null) {
        await AsyncStorage.setItem("doctorId", String(id));
      }

      return {
        ...profile,
        id,
      };
    } catch {
      const storedId =
        Number(await AsyncStorage.getItem("doctorId")) || null;

      setDoctorId(storedId);

      return {
        id: storedId,
        name: storedName,
      };
    }
  }

  /* =======================================================
     DOCTOR AVAILABILITY / MENU
  ======================================================= */

  async function loadDoctorConsultationModes(profile?: any) {
    const id =
      profile?.id ||
      doctorId ||
      Number(await AsyncStorage.getItem("doctorId")) ||
      null;

    if (!id) {
      setHasOnline(null);
      setHasOffline(null);
      return;
    }

    try {
      const result = await apiRequest(
        `/doctor-availability/doctor/${encodeURIComponent(
          String(id)
        )}`
      );

      const slots = extractFlexibleArray(result);

      const activeSlots = slots.filter(
        (slot: any) =>
          slot && slot.active !== false
      );

      const online = activeSlots.some(
        (slot: any) =>
          String(slot.appointmentMode || "")
            .trim()
            .toUpperCase() === "ONLINE"
      );

      const offline = activeSlots.some(
        (slot: any) =>
          String(slot.appointmentMode || "")
            .trim()
            .toUpperCase() === "OFFLINE"
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
      const storedOnline =
        await AsyncStorage.getItem("doctorHasOnline");

      const storedOffline =
        await AsyncStorage.getItem("doctorHasOffline");

      if (storedOnline !== null || storedOffline !== null) {
        setHasOnline(storedOnline === "true");
        setHasOffline(storedOffline === "true");
      } else {
        setHasOnline(null);
        setHasOffline(null);
      }
    }
  }

  /* =======================================================
     UPCOMING DATA
  ======================================================= */

  function firstNonEmpty(...values: any[]) {
    for (const value of values) {
      if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== "" &&
        String(value).trim() !== "-"
      ) {
        return value;
      }
    }

    return values.length
      ? values[values.length - 1]
      : null;
  }

  function normalizeAppointment(item: any): UpcomingItem {
    return {
      sourceType: "OFFLINE",

      id:
        item.id ??
        item.appointmentId ??
        null,

      patientId:
        item.patientId ??
        item.patient?.id ??
        null,

      patientName:
        firstNonEmpty(
          item.patientName,
          item.patient?.name,
          item.userName,
          "Patient"
        ) || "Patient",

      phoneNumber:
        firstNonEmpty(
          item.phoneNumber,
          item.patientPhone,
          item.patient?.phoneNumber,
          "-"
        ) || "-",

      age:
        firstNonEmpty(
          item.age,
          item.patientAge,
          item.patient?.age,
          "-"
        ) ?? "-",

      gender:
        firstNonEmpty(
          item.gender,
          item.patientGender,
          item.patient?.gender,
          "-"
        ) || "-",

      doctorName:
        firstNonEmpty(
          item.doctorName,
          item.doctor?.name,
          doctorName,
          "Doctor"
        ) || "Doctor",

      specialization:
        firstNonEmpty(
          item.doctorSpecialization,
          item.specialization,
          "-"
        ) || "-",

      date:
        firstNonEmpty(
          item.appointmentDate,
          item.date,
          ""
        ) || "",

      startTime:
        item.startTime || "",

      endTime:
        item.endTime || "",

      status:
        String(
          item.status || "SCHEDULED"
        ).toUpperCase(),

      paymentStatus:
        String(
          item.paymentStatus || "-"
        ).toUpperCase(),

      symptoms:
        firstNonEmpty(
          item.symptoms,
          "-"
        ) || "-",

      pastMedicalHistory:
        firstNonEmpty(
          item.pastMedicalHistory,
          "-"
        ) || "-",

      fee:
        firstNonEmpty(
          item.bookingFee,
          item.amount,
          null
        ),

      rescheduleReason:
        item.rescheduleReason || null,

      cancellationReason:
        item.cancellationReason || null,
    };
  }

  function normalizeConsultation(item: any): UpcomingItem {
    return {
      sourceType: "ONLINE",

      id:
        item.id ??
        item.consultationId ??
        null,

      patientId:
        item.patientId ??
        item.patient?.id ??
        null,

      patientName:
        firstNonEmpty(
          item.patientName,
          item.patient?.name,
          item.userName,
          "Patient"
        ) || "Patient",

      phoneNumber:
        firstNonEmpty(
          item.phoneNumber,
          item.patientPhone,
          item.patient?.phoneNumber,
          "-"
        ) || "-",

      age:
        firstNonEmpty(
          item.age,
          item.patientAge,
          item.patient?.age,
          "-"
        ) ?? "-",

      gender:
        firstNonEmpty(
          item.gender,
          item.patientGender,
          item.patient?.gender,
          "-"
        ) || "-",

      doctorName:
        firstNonEmpty(
          item.doctorName,
          item.doctor?.name,
          doctorName,
          "Doctor"
        ) || "Doctor",

      specialization:
        firstNonEmpty(
          item.doctorSpecialization,
          item.specialization,
          "-"
        ) || "-",

      date:
        firstNonEmpty(
          item.consultationDate,
          item.appointmentDate,
          item.date,
          ""
        ) || "",

      startTime:
        item.startTime || "",

      endTime:
        item.endTime || "",

      status:
        String(
          item.status || "SCHEDULED"
        ).toUpperCase(),

      paymentStatus:
        String(
          item.paymentStatus || "-"
        ).toUpperCase(),

      symptoms:
        firstNonEmpty(
          item.symptoms,
          "-"
        ) || "-",

      pastMedicalHistory:
        firstNonEmpty(
          item.pastMedicalHistory,
          "-"
        ) || "-",

      fee:
        firstNonEmpty(
          item.consultationFee,
          item.amount,
          null
        ),

      rescheduleReason:
        item.rescheduleReason || null,

      cancellationReason:
        item.cancellationReason || null,
    };
  }

  async function loadUpcomingSchedule() {
    try {
      const result = await apiRequest(
        "/doctor-dashboard/upcoming"
      );

      const appointments = Array.isArray(
        result?.data?.appointments
      )
        ? result.data.appointments
        : [];

      const consultations = Array.isArray(
        result?.data?.consultations
      )
        ? result.data.consultations
        : [];

      const combined: UpcomingItem[] = [
        ...appointments.map(normalizeAppointment),
        ...consultations.map(normalizeConsultation),
      ].sort(
        (first, second) =>
          getScheduleDate(first).getTime() -
          getScheduleDate(second).getTime()
      );

      setAllUpcoming(combined);
    } catch (error: any) {
      setAllUpcoming([]);

      showNotice(
        "error",
        "Unable to Load Schedule",
        error?.message ||
          "Unable to load upcoming schedule."
      );
    }
  }

  async function loadPage(initial = false) {
    try {
      if (initial) {
        setLoading(true);
      }

      const allowed = await validateDoctorAccess();

      if (!allowed) return;

      const profile = await loadDoctorProfile();

      await loadDoctorConsultationModes(profile);

      await loadUpcomingSchedule();
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

  /* =======================================================
     FILTERS
  ======================================================= */

  const availableStatuses = useMemo(() => {
    return Array.from(
      new Set(
        allUpcoming
          .map((item) => item.status)
          .filter(Boolean)
      )
    ).sort();
  }, [allUpcoming]);

  const filteredUpcoming = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allUpcoming.filter((item) => {
      const matchesSearch =
        !query ||
        String(item.patientName)
          .toLowerCase()
          .includes(query) ||
        String(item.phoneNumber)
          .toLowerCase()
          .includes(query) ||
        String(item.id ?? "")
          .toLowerCase()
          .includes(query);

      const matchesType =
        !typeFilter ||
        item.sourceType === typeFilter;

      const matchesStatus =
        !statusFilter ||
        item.status === statusFilter;

      const matchesDate =
        !dateFilter ||
        String(item.date)
          .substring(0, 10) === dateFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesDate
      );
    });
  }, [
    allUpcoming,
    search,
    typeFilter,
    statusFilter,
    dateFilter,
  ]);

  function resetFilters() {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setDateFilter("");
  }

  const summary = useMemo(() => {
    const offline = allUpcoming.filter(
      (item) =>
        item.sourceType === "OFFLINE"
    );

    const online = allUpcoming.filter(
      (item) =>
        item.sourceType === "ONLINE"
    );

    return {
      total: allUpcoming.length,
      offline: offline.length,
      online: online.length,
      next: allUpcoming[0]
        ? formatShortDate(allUpcoming[0].date)
        : "—",
    };
  }, [allUpcoming]);

  const activeFilterCount =
    (typeFilter ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (dateFilter ? 1 : 0);

  /* =======================================================
     DETAILS / NAVIGATION
  ======================================================= */

  function openDetails(item: UpcomingItem) {
    setSelectedItem(item);
    setDetailsOpen(true);
  }

  function openFullDetails(item: UpcomingItem) {
    setDetailsOpen(false);

    if (item.sourceType === "ONLINE") {
      router.push({
        pathname:
          "/doctor/consultations" as any,
        params: {
          consultationId:
            String(item.id ?? ""),
        },
      });

      return;
    }

    router.push({
      pathname:
        "/doctor/appointments" as any,
      params: {
        appointmentId:
          String(item.id ?? ""),
      },
    });
  }

  /* =======================================================
     MENU
  ======================================================= */

  const visibleMenu = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      if (
        item.requiresOnline &&
        hasOnline === false
      ) {
        return false;
      }

      if (
        item.requiresOffline &&
        hasOffline === false
      ) {
        return false;
      }

      return true;
    });
  }, [hasOnline, hasOffline]);

  async function logoutDoctor() {
    await clearDoctorSession();
    setLogoutOpen(false);
    router.replace("/login" as any);
  }

  /* =======================================================
     LOADER
  ======================================================= */

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.fullLoader}>
        <ActivityIndicator
          size="large"
          color={GREEN}
        />

        <Text style={styles.loaderText}>
          Preparing upcoming schedule...
        </Text>
      </View>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <View style={styles.screen}>
      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() =>
            setMenuOpen(true)
          }
          activeOpacity={0.85}
        >
          <Ionicons
            name="menu-outline"
            size={25}
            color={GREEN}
          />
        </TouchableOpacity>

        <View
          style={styles.headerTextWrap}
        >
          <Text
            style={styles.headerEyebrow}
          >
            DOCTOR PORTAL
          </Text>

          <Text
            numberOfLines={1}
            style={styles.headerTitle}
          >
            Upcoming Schedule
          </Text>
        </View>

        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() =>
            router.replace(
              "/doctor/dashboard" as any
            )
          }
          activeOpacity={0.85}
        >
          <Ionicons
            name="grid-outline"
            size={20}
            color={GREEN}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.doctorAvatar}
          onPress={() =>
            router.push(
              "/doctor/profile" as any
            )
          }
          activeOpacity={0.85}
        >
          <Text
            style={
              styles.doctorAvatarText
            }
          >
            {doctorInitial}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.bodyLoader}>
          <ActivityIndicator
            size="large"
            color={GREEN}
          />

          <Text style={styles.loaderText}>
            Loading upcoming schedule...
          </Text>
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
          contentContainerStyle={{
            paddingBottom: 35,
          }}
        >
          {/* HERO */}

          <View style={styles.hero}>
            <View
              style={styles.heroGlowOne}
            />

            <View
              style={styles.heroGlowTwo}
            />

            <View
              style={styles.heroBadge}
            >
              <Ionicons
                name="calendar-number-outline"
                size={14}
                color={GOLD_LIGHT}
              />

              <Text
                style={
                  styles.heroBadgeText
                }
              >
                UPCOMING SCHEDULE
              </Text>
            </View>

            <Text
              style={styles.heroTitle}
            >
              Your upcoming
              {"\n"}
              <Text
                style={styles.heroGold}
              >
                patient schedule.
              </Text>
            </Text>

            <Text
              style={styles.heroText}
            >
              View future offline
              appointments and online
              consultations with patient,
              status, payment and timing
              information.
            </Text>
          </View>

          {/* SUMMARY */}

          <View
            style={styles.summaryGrid}
          >
            <SummaryCard
              icon="list-outline"
              label="Total Upcoming"
              value={String(summary.total)}
              background={MINT}
              color={GREEN}
            />

            <SummaryCard
              icon="business-outline"
              label="Offline Appointments"
              value={String(
                summary.offline
              )}
              background={
                SUCCESS_LIGHT
              }
              color={SUCCESS}
            />

            <SummaryCard
              icon="videocam-outline"
              label="Online Consultations"
              value={String(
                summary.online
              )}
              background={INFO_LIGHT}
              color={INFO}
            />

            <SummaryCard
              icon="time-outline"
              label="Next Scheduled"
              value={summary.next}
              background={
                WARNING_LIGHT
              }
              color={GOLD_DARK}
            />
          </View>

          {/* SEARCH / FILTER */}

          <View
            style={styles.filterCard}
          >
            <View
              style={styles.searchWrap}
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={GOLD_DARK}
              />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Patient name, phone or ID"
                placeholderTextColor="#9AA59E"
                style={styles.searchInput}
              />

              {Boolean(search) && (
                <TouchableOpacity
                  onPress={() =>
                    setSearch("")
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={19}
                    color={MUTED}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View
              style={
                styles.filterActionsRow
              }
            >
              <TouchableOpacity
                style={
                  styles.filterButton
                }
                onPress={() =>
                  setFilterOpen(true)
                }
              >
                <Ionicons
                  name="options-outline"
                  size={17}
                  color={GREEN}
                />

                <Text
                  style={
                    styles.filterButtonText
                  }
                >
                  Filters
                </Text>

                {Boolean(
                  activeFilterCount
                ) && (
                  <View
                    style={
                      styles.filterCount
                    }
                  >
                    <Text
                      style={
                        styles.filterCountText
                      }
                    >
                      {activeFilterCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.resetButton
                }
                onPress={resetFilters}
              >
                <Ionicons
                  name="refresh-outline"
                  size={17}
                  color={GOLD_DARK}
                />

                <Text
                  style={
                    styles.resetButtonText
                  }
                >
                  Reset
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* LIST HEADER */}

          <View
            style={styles.sectionHeader}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                UPCOMING VISITS
              </Text>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Scheduled Visits
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Offline appointments and
                online consultations returned
                by the doctor dashboard.
              </Text>
            </View>

            <View
              style={styles.resultBadge}
            >
              <Text
                style={
                  styles.resultBadgeText
                }
              >
                {filteredUpcoming.length}
              </Text>
            </View>
          </View>

          {/* SCHEDULE LIST */}

          <View
            style={styles.scheduleList}
          >
            {!filteredUpcoming.length ? (
              <View
                style={styles.emptyCard}
              >
                <View
                  style={styles.emptyIcon}
                >
                  <Ionicons
                    name="calendar-clear-outline"
                    size={28}
                    color={GREEN}
                  />
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  No upcoming schedule found
                </Text>

                <Text
                  style={styles.emptyText}
                >
                  No appointment or consultation
                  matches the selected filters.
                </Text>
              </View>
            ) : (
              filteredUpcoming.map(
                (item, index) => (
                  <ScheduleCard
                    key={`${item.sourceType}-${item.id ?? index}`}
                    item={item}
                    onPress={() =>
                      openDetails(item)
                    }
                  />
                )
              )
            )}
          </View>
        </ScrollView>
      )}

      {/* ===================================================
          DRAWER - SAME AS DASHBOARD
      =================================================== */}

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setMenuOpen(false)
        }
      >
        <View style={styles.drawerRoot}>
          <Pressable
            style={
              styles.drawerBackdrop
            }
            onPress={() =>
              setMenuOpen(false)
            }
          />

          <View style={styles.drawer}>
            <View
              style={
                styles.drawerBrandWrap
              }
            >
              <View
                style={styles.drawerLogo}
              >
                <Ionicons
                  name="medical"
                  size={25}
                  color={GOLD}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={
                    styles.drawerBrand
                  }
                >
                  NeoLife
                </Text>

                <Text
                  style={
                    styles.drawerPortal
                  }
                >
                  Doctor Portal
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.drawerClose
                }
                onPress={() =>
                  setMenuOpen(false)
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={GREEN}
                />
              </TouchableOpacity>
            </View>

            <View
              style={
                styles.drawerDoctorCard
              }
            >
              <View
                style={
                  styles.drawerDoctorAvatar
                }
              >
                <Text
                  style={
                    styles.drawerDoctorAvatarText
                  }
                >
                  {doctorInitial}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={
                    styles.drawerDoctorName
                  }
                >
                  {doctorName}
                </Text>

                <Text
                  style={
                    styles.drawerDoctorRole
                  }
                >
                  Doctor
                </Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: 20,
              }}
            >
              {(
                [
                  "MAIN",
                  "CLINICAL",
                  "FINANCE",
                ] as const
              ).map((section) => {
                const items =
                  visibleMenu.filter(
                    (item) =>
                      item.section ===
                      section
                  );

                if (!items.length) {
                  return null;
                }

                return (
                  <View
                    key={section}
                    style={
                      styles.drawerSection
                    }
                  >
                    <Text
                      style={
                        styles.drawerSectionLabel
                      }
                    >
                      {section}
                    </Text>

                    {items.map((item) => {
                      const active =
                        item.label ===
                        "Upcoming Schedule";

                      return (
                        <TouchableOpacity
                          key={item.label}
                          style={[
                            styles.drawerItem,
                            active &&
                              styles.drawerItemActive,
                          ]}
                          onPress={() => {
                            setMenuOpen(false);

                            if (!active) {
                              router.push(
                                item.route as any
                              );
                            }
                          }}
                        >
                          <View
                            style={[
                              styles.drawerItemIcon,
                              active &&
                                styles.drawerItemIconActive,
                            ]}
                          >
                            <Ionicons
                              name={
                                item.icon
                              }
                              size={19}
                              color={
                                active
                                  ? GREEN
                                  : GOLD
                              }
                            />
                          </View>

                          <Text
                            style={[
                              styles.drawerItemText,
                              active &&
                                styles.drawerItemTextActive,
                            ]}
                          >
                            {item.label}
                          </Text>

                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={
                              active
                                ? GREEN
                                : "#AFC0B6"
                            }
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={
                styles.logoutButton
              }
              onPress={() => {
                setMenuOpen(false);
                setLogoutOpen(true);
              }}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={WHITE}
              />

              <Text
                style={
                  styles.logoutButtonText
                }
              >
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          FILTER SHEET
      =================================================== */}

      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() =>
          setFilterOpen(false)
        }
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() =>
              setFilterOpen(false)
            }
          />

          <View
            style={styles.filterSheet}
          >
            <View
              style={styles.sheetHandle}
            />

            <View
              style={styles.sheetHeader}
            >
              <View>
                <Text
                  style={
                    styles.sheetEyebrow
                  }
                >
                  REFINE SCHEDULE
                </Text>

                <Text
                  style={
                    styles.sheetTitle
                  }
                >
                  Schedule Filters
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.sheetClose
                }
                onPress={() =>
                  setFilterOpen(false)
                }
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={GREEN}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={styles.fieldLabel}
            >
              SCHEDULE TYPE
            </Text>

            <View
              style={styles.optionWrap}
            >
              {[
                ["", "All Types"],
                ["OFFLINE", "Offline"],
                ["ONLINE", "Online"],
              ].map(([value, label]) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.optionChip,
                    typeFilter ===
                      value &&
                      styles.optionChipActive,
                  ]}
                  onPress={() =>
                    setTypeFilter(
                      value as TypeFilter
                    )
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      typeFilter ===
                        value &&
                        styles.optionTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={styles.fieldLabel}
            >
              STATUS
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 7,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.optionChip,
                  !statusFilter &&
                    styles.optionChipActive,
                ]}
                onPress={() =>
                  setStatusFilter("")
                }
              >
                <Text
                  style={[
                    styles.optionText,
                    !statusFilter &&
                      styles.optionTextActive,
                  ]}
                >
                  All Statuses
                </Text>
              </TouchableOpacity>

              {availableStatuses.map(
                (status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.optionChip,
                      statusFilter ===
                        status &&
                        styles.optionChipActive,
                    ]}
                    onPress={() =>
                      setStatusFilter(
                        status
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        statusFilter ===
                          status &&
                          styles.optionTextActive,
                      ]}
                    >
                      {formatStatus(status)}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>

            <Text
              style={styles.fieldLabel}
            >
              DATE
            </Text>

            <TouchableOpacity
              style={
                styles.dateFilterButton
              }
              onPress={() =>
                setDatePickerOpen(true)
              }
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={GOLD_DARK}
              />

              <Text
                style={
                  styles.dateFilterText
                }
              >
                {dateFilter
                  ? formatDate(dateFilter)
                  : "Any date"}
              </Text>

              {Boolean(dateFilter) && (
                <TouchableOpacity
                  onPress={() =>
                    setDateFilter("")
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={19}
                    color={MUTED}
                  />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {datePickerOpen && (
              <DateTimePicker
                value={
                  dateFilter
                    ? new Date(
                        `${dateFilter}T00:00:00`
                      )
                    : new Date()
                }
                mode="date"
                display={
                  Platform.OS ===
                  "android"
                    ? "calendar"
                    : "spinner"
                }
                onChange={(
                  event,
                  selected
                ) => {
                  if (
                    Platform.OS ===
                    "android"
                  ) {
                    setDatePickerOpen(
                      false
                    );
                  }

                  if (
                    event?.type ===
                    "dismissed"
                  ) {
                    return;
                  }

                  if (selected) {
                    setDateFilter(
                      formatDateKey(
                        selected
                      )
                    );
                  }
                }}
              />
            )}

            <View
              style={
                styles.filterSheetActions
              }
            >
              <TouchableOpacity
                style={
                  styles.clearFiltersButton
                }
                onPress={resetFilters}
              >
                <Text
                  style={
                    styles.clearFiltersText
                  }
                >
                  Clear
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.applyFiltersButton
                }
                onPress={() =>
                  setFilterOpen(false)
                }
              >
                <Text
                  style={
                    styles.applyFiltersText
                  }
                >
                  Apply Filters
                </Text>

                <Ionicons
                  name="checkmark"
                  size={18}
                  color={GREEN}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          DETAILS SHEET
      =================================================== */}

      <Modal
        visible={detailsOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() =>
          setDetailsOpen(false)
        }
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() =>
              setDetailsOpen(false)
            }
          />

          <View
            style={styles.detailsSheet}
          >
            <View
              style={styles.sheetHandle}
            />

            <View
              style={styles.sheetHeader}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={
                    styles.sheetEyebrow
                  }
                >
                  SCHEDULE DETAILS
                </Text>

                <Text
                  style={
                    styles.sheetTitle
                  }
                >
                  Upcoming Visit
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.sheetClose
                }
                onPress={() =>
                  setDetailsOpen(false)
                }
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={GREEN}
                />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: 25,
                }}
              >
                <View
                  style={
                    styles.patientHero
                  }
                >
                  <View
                    style={
                      styles.patientAvatar
                    }
                  >
                    <Text
                      style={
                        styles.patientAvatarText
                      }
                    >
                      {selectedItem.patientName
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={
                        styles.patientName
                      }
                    >
                      {
                        selectedItem.patientName
                      }
                    </Text>

                    <Text
                      style={
                        styles.patientSubtitle
                      }
                    >
                      {selectedItem.sourceType ===
                      "ONLINE"
                        ? `Online Consultation #${selectedItem.id ?? "-"}`
                        : `Offline Appointment #${selectedItem.id ?? "-"}`}
                    </Text>
                  </View>

                  <TypeBadge
                    type={
                      selectedItem.sourceType
                    }
                  />
                </View>

                <View
                  style={
                    styles.detailsGrid
                  }
                >
                  <DetailBox
                    icon="calendar-outline"
                    label="Date"
                    value={formatDate(
                      selectedItem.date
                    )}
                  />

                  <DetailBox
                    icon="time-outline"
                    label="Time"
                    value={formatTimeRange(
                      selectedItem.startTime,
                      selectedItem.endTime
                    )}
                  />

                  <DetailBox
                    icon="call-outline"
                    label="Phone Number"
                    value={
                      selectedItem.phoneNumber
                    }
                  />

                  <DetailBox
                    icon="person-outline"
                    label="Age / Gender"
                    value={`${selectedItem.age ?? "-"} / ${formatStatus(
                      selectedItem.gender
                    )}`}
                  />

                  <DetailBox
                    icon="medical-outline"
                    label="Doctor"
                    value={
                      selectedItem.doctorName
                    }
                  />

                  <DetailBox
                    icon="medkit-outline"
                    label="Specialization"
                    value={
                      selectedItem.specialization
                    }
                  />

                  <DetailBox
                    icon="card-outline"
                    label="Payment Status"
                    value={formatStatus(
                      selectedItem.paymentStatus
                    )}
                  />

                  <DetailBox
                    icon="cash-outline"
                    label="Fee"
                    value={
                      selectedItem.fee !==
                        null &&
                      selectedItem.fee !==
                        undefined
                        ? `₹${Number(
                            selectedItem.fee
                          ).toLocaleString(
                            "en-IN"
                          )}`
                        : "—"
                    }
                  />
                </View>

                <LongDetail
                  label="Status"
                  value={formatStatus(
                    selectedItem.status
                  )}
                />

                <LongDetail
                  label="Symptoms"
                  value={
                    selectedItem.symptoms ||
                    "-"
                  }
                />

                <LongDetail
                  label="Past Medical History"
                  value={
                    selectedItem.pastMedicalHistory ||
                    "-"
                  }
                />

                {Boolean(
                  selectedItem.rescheduleReason
                ) && (
                  <LongDetail
                    label="Reschedule Reason"
                    value={
                      selectedItem.rescheduleReason ||
                      "-"
                    }
                  />
                )}

                {Boolean(
                  selectedItem.cancellationReason
                ) && (
                  <LongDetail
                    label="Cancellation Reason"
                    value={
                      selectedItem.cancellationReason ||
                      "-"
                    }
                  />
                )}

                <TouchableOpacity
                  style={
                    styles.fullDetailsButton
                  }
                  onPress={() =>
                    openFullDetails(
                      selectedItem
                    )
                  }
                >
                  <Ionicons
                    name="open-outline"
                    size={18}
                    color={GREEN}
                  />

                  <Text
                    style={
                      styles.fullDetailsButtonText
                    }
                  >
                    View Full Details
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ===================================================
          LOGOUT
      =================================================== */}

      <Modal
        visible={logoutOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setLogoutOpen(false)
        }
      >
        <View
          style={
            styles.modalCenterRoot
          }
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() =>
              setLogoutOpen(false)
            }
          />

          <View
            style={styles.logoutCard}
          >
            <View
              style={styles.logoutIcon}
            >
              <Ionicons
                name="log-out-outline"
                size={31}
                color={GREEN}
              />
            </View>

            <Text
              style={
                styles.noticeEyebrow
              }
            >
              NEOLIFE DOCTOR PORTAL
            </Text>

            <Text
              style={styles.noticeTitle}
            >
              Log Out?
            </Text>

            <Text
              style={
                styles.noticeMessage
              }
            >
              Are you sure you want to
              leave your doctor workspace?
            </Text>

            <View
              style={
                styles.logoutActions
              }
            >
              <TouchableOpacity
                style={
                  styles.logoutCancel
                }
                onPress={() =>
                  setLogoutOpen(false)
                }
              >
                <Text
                  style={
                    styles.logoutCancelText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.logoutConfirm
                }
                onPress={logoutDoctor}
              >
                <Text
                  style={
                    styles.logoutConfirmText
                  }
                >
                  Log Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          NOTICE
      =================================================== */}

      <Modal
        visible={notice.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setNotice((current) => ({
            ...current,
            visible: false,
          }))
        }
      >
        <View
          style={
            styles.modalCenterRoot
          }
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() =>
              setNotice((current) => ({
                ...current,
                visible: false,
              }))
            }
          />

          <View
            style={styles.noticeCard}
          >
            <View
              style={[
                styles.noticeIcon,
                {
                  backgroundColor:
                    notice.type ===
                    "success"
                      ? SUCCESS_LIGHT
                      : notice.type ===
                        "error"
                      ? DANGER_LIGHT
                      : notice.type ===
                        "warning"
                      ? WARNING_LIGHT
                      : INFO_LIGHT,
                },
              ]}
            >
              <Ionicons
                name={
                  notice.type ===
                  "success"
                    ? "checkmark-circle-outline"
                    : notice.type ===
                      "error"
                    ? "close-circle-outline"
                    : notice.type ===
                      "warning"
                    ? "alert-circle-outline"
                    : "information-circle-outline"
                }
                size={32}
                color={
                  notice.type ===
                  "success"
                    ? SUCCESS
                    : notice.type ===
                      "error"
                    ? DANGER
                    : notice.type ===
                      "warning"
                    ? WARNING
                    : INFO
                }
              />
            </View>

            <Text
              style={
                styles.noticeEyebrow
              }
            >
              NEOLIFE DOCTOR PORTAL
            </Text>

            <Text
              style={styles.noticeTitle}
            >
              {notice.title}
            </Text>

            <Text
              style={
                styles.noticeMessage
              }
            >
              {notice.message}
            </Text>

            <TouchableOpacity
              style={styles.noticeButton}
              onPress={() =>
                setNotice((current) => ({
                  ...current,
                  visible: false,
                }))
              }
            >
              <Text
                style={
                  styles.noticeButtonText
                }
              >
                Okay
              </Text>

              <Ionicons
                name="checkmark"
                size={18}
                color={GREEN}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function SummaryCard({
  icon,
  label,
  value,
  background,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  background: string;
  color: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor:
              background,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={color}
        />
      </View>

      <Text
        style={styles.summaryLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.summaryValue}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function ScheduleCard({
  item,
  onPress,
}: {
  item: UpcomingItem;
  onPress: () => void;
}) {
  const date =
    parseLocalDate(item.date);

  const day = date
    ? String(date.getDate()).padStart(
        2,
        "0"
      )
    : "--";

  const month = date
    ? date
        .toLocaleDateString("en-IN", {
          month: "short",
        })
        .toUpperCase()
    : "---";

  return (
    <View style={styles.scheduleCard}>
      <View style={styles.dateBox}>
        <Text style={styles.dateDay}>
          {day}
        </Text>

        <Text style={styles.dateMonth}>
          {month}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <View
          style={
            styles.scheduleTop
          }
        >
          <Text
            style={
              styles.schedulePatientName
            }
            numberOfLines={1}
          >
            {item.patientName}
          </Text>

          <TypeBadge
            type={item.sourceType}
          />

          <StatusBadge
            status={item.status}
          />

          {!isMissingValue(
            item.paymentStatus
          ) && (
            <View
              style={
                styles.paymentBadge
              }
            >
              <Ionicons
                name="cash-outline"
                size={11}
                color={PURPLE}
              />

              <Text
                style={
                  styles.paymentBadgeText
                }
              >
                {formatStatus(
                  item.paymentStatus
                )}
              </Text>
            </View>
          )}
        </View>

        <View
          style={styles.metaRow}
        >
          <MetaItem
            icon="calendar-outline"
            text={formatDate(item.date)}
          />

          <MetaItem
            icon="time-outline"
            text={formatTimeRange(
              item.startTime,
              item.endTime
            )}
          />
        </View>

        <View
          style={styles.metaRow}
        >
          <MetaItem
            icon="call-outline"
            text={item.phoneNumber}
          />

          <MetaItem
            icon="id-card-outline"
            text={`${
              item.sourceType ===
              "ONLINE"
                ? "Consultation"
                : "Appointment"
            } #${item.id ?? "-"}`}
          />
        </View>

        <Text
          style={styles.symptomsText}
          numberOfLines={2}
        >
          <Text
            style={
              styles.symptomsLabel
            }
          >
            Symptoms:{" "}
          </Text>

          {item.symptoms || "-"}
        </Text>

        <TouchableOpacity
          style={styles.viewButton}
          onPress={onPress}
          activeOpacity={0.86}
        >
          <Ionicons
            name="eye-outline"
            size={17}
            color={GREEN}
          />

          <Text
            style={
              styles.viewButtonText
            }
          >
            View Details
          </Text>

          <Ionicons
            name="chevron-forward"
            size={16}
            color={GREEN}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TypeBadge({
  type,
}: {
  type: SourceType;
}) {
  const online =
    type === "ONLINE";

  return (
    <View
      style={[
        styles.typeBadge,
        {
          backgroundColor:
            online
              ? INFO_LIGHT
              : SUCCESS_LIGHT,
        },
      ]}
    >
      <Ionicons
        name={
          online
            ? "videocam-outline"
            : "business-outline"
        }
        size={11}
        color={
          online ? INFO : SUCCESS
        }
      />

      <Text
        style={[
          styles.typeBadgeText,
          {
            color:
              online
                ? INFO
                : SUCCESS,
          },
        ]}
      >
        {online
          ? "ONLINE"
          : "OFFLINE"}
      </Text>
    </View>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    String(
      status || "SCHEDULED"
    ).toUpperCase();

  const isDanger = [
    "CANCELLED",
    "REJECTED",
    "NO_SHOW",
  ].includes(normalized);

  const isWarning = [
    "PENDING",
    "PAYMENT_PENDING",
    "PENDING_DOCTOR_CONFIRMATION",
    "RESCHEDULED",
  ].includes(normalized);

  const isInfo = [
    "IN_PROGRESS",
    "STARTED",
  ].includes(normalized);

  const color = isDanger
    ? DANGER
    : isWarning
    ? WARNING
    : isInfo
    ? INFO
    : SUCCESS;

  const backgroundColor =
    isDanger
      ? DANGER_LIGHT
      : isWarning
      ? WARNING_LIGHT
      : isInfo
      ? INFO_LIGHT
      : SUCCESS_LIGHT;

  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor },
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          { color },
        ]}
      >
        {formatStatus(normalized)}
      </Text>
    </View>
  );
}

function MetaItem({
  icon,
  text,
}: {
  icon: any;
  text: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Ionicons
        name={icon}
        size={13}
        color={GOLD_DARK}
      />

      <Text
        style={styles.metaText}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

function DetailBox({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailBox}>
      <View
        style={styles.detailIcon}
      >
        <Ionicons
          name={icon}
          size={17}
          color={GREEN}
        />
      </View>

      <Text
        style={styles.detailLabel}
      >
        {label.toUpperCase()}
      </Text>

      <Text
        style={styles.detailValue}
      >
        {value || "—"}
      </Text>
    </View>
  );
}

function LongDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.longDetail}>
      <Text
        style={styles.detailLabel}
      >
        {label.toUpperCase()}
      </Text>

      <Text
        style={
          styles.longDetailValue
        }
      >
        {value || "—"}
      </Text>
    </View>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function extractFlexibleArray(
  result: any
) {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  if (
    Array.isArray(
      result?.data?.content
    )
  ) {
    return result.data.content;
  }

  if (
    Array.isArray(result?.content)
  ) {
    return result.content;
  }

  return [];
}

function isMissingValue(
  value: any
) {
  return (
    value === null ||
    value === undefined ||
    String(value).trim() === "" ||
    String(value).trim() === "-"
  );
}

function getScheduleDate(
  item: UpcomingItem
) {
  const date =
    item.date || "2999-12-31";

  const time =
    item.startTime || "23:59:59";

  const parsed = new Date(
    `${String(date).substring(
      0,
      10
    )}T${String(time).substring(
      0,
      8
    )}`
  );

  return Number.isNaN(
    parsed.getTime()
  )
    ? new Date(
        "2999-12-31T23:59:59"
      )
    : parsed;
}

function parseLocalDate(
  value?: string | null
) {
  if (!value) {
    return null;
  }

  const parts = String(value)
    .substring(0, 10)
    .split("-")
    .map(Number);

  if (
    parts.length !== 3 ||
    parts.some(Number.isNaN)
  ) {
    return null;
  }

  return new Date(
    parts[0],
    parts[1] - 1,
    parts[2]
  );
}

function formatDate(
  value?: string | null
) {
  const date =
    parseLocalDate(value);

  if (!date) {
    return value || "-";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatShortDate(
  value?: string | null
) {
  const date =
    parseLocalDate(value);

  if (!date) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
    }
  );
}

function formatTime(
  value?: string | null
) {
  if (!value) {
    return "-";
  }

  const clean =
    String(value).substring(0, 5);

  const parts =
    clean.split(":");

  if (parts.length < 2) {
    return clean;
  }

  let hour =
    Number(parts[0]);

  const minute =
    parts[1];

  const period =
    hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}

function formatTimeRange(
  start?: string | null,
  end?: string | null
) {
  if (start && end) {
    return `${formatTime(
      start
    )} - ${formatTime(end)}`;
  }

  return formatTime(
    start || end
  );
}

function formatStatus(
  value?: string | null
) {
  return String(value || "-")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatDateKey(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(date.getDate()).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  fullLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },

  bodyLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loaderText: {
    marginTop: 11,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 11,
  },

  /* HEADER */

  header: {
    minHeight: 75,
    paddingTop:
      Platform.OS === "web" ? 12 : 43,
    paddingBottom: 11,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  menuButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  headerTextWrap: {
    flex: 1,
  },

  headerEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1,
  },

  headerTitle: {
    marginTop: 2,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 18,
  },

  dashboardButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  doctorAvatar: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  doctorAvatarText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 17,
  },

  /* HERO */

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
    backgroundColor:
      "rgba(255,255,255,.06)",
  },

  heroGlowTwo: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    left: -80,
    bottom: -110,
    backgroundColor:
      "rgba(214,180,91,.15)",
  },

  heroBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor:
      "rgba(255,255,255,.09)",
  },

  heroBadgeText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 7.5,
    letterSpacing: 1,
  },

  heroTitle: {
    marginTop: 17,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 27,
    lineHeight: 33,
  },

  heroGold: {
    color: GOLD_LIGHT,
  },

  heroText: {
    marginTop: 10,
    maxWidth: 330,
    fontFamily:
      "DMSans_400Regular",
    color: "#D3E1D8",
    fontSize: 11,
    lineHeight: 18,
  },

  /* SUMMARY */

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
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 21,
  },

  /* FILTER */

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
    fontFamily:
      "DMSans_500Medium",
    color: TEXT,
    fontSize: 10,
  },

  filterActionsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },

  filterButton: {
    flex: 1,
    minHeight: 43,
    paddingHorizontal: 12,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: MINT,
  },

  filterButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8.5,
  },

  filterCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },

  filterCountText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 6.5,
  },

  resetButton: {
    flex: 1,
    minHeight: 43,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#FFF7E2",
  },

  resetButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8.5,
  },

  /* SECTION */

  sectionHeader: {
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  sectionEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1,
  },

  sectionTitle: {
    marginTop: 3,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 21,
  },

  sectionSubtitle: {
    marginTop: 3,
    fontFamily:
      "DMSans_400Regular",
    color: MUTED,
    fontSize: 7.5,
    lineHeight: 12,
  },

  resultBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  resultBadgeText: {
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 16,
  },

  /* SCHEDULE */

  scheduleList: {
    marginHorizontal: 15,
    gap: 10,
  },

  scheduleCard: {
    padding: 13,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  dateBox: {
    width: 58,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  dateDay: {
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 22,
    lineHeight: 25,
  },

  dateMonth: {
    marginTop: 2,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 0.6,
  },

  scheduleTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 5,
  },

  schedulePatientName: {
    width: "100%",
    marginBottom: 2,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 16,
  },

  typeBadge: {
    minHeight: 25,
    paddingHorizontal: 7,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  typeBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 5.7,
  },

  statusBadge: {
    minHeight: 25,
    paddingHorizontal: 7,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  statusBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 5.7,
  },

  paymentBadge: {
    minHeight: 25,
    paddingHorizontal: 7,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: PURPLE_LIGHT,
  },

  paymentBadgeText: {
    fontFamily: "DMSans_700Bold",
    color: PURPLE,
    fontSize: 5.7,
  },

  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  metaItem: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  metaText: {
    maxWidth: 180,
    fontFamily:
      "DMSans_500Medium",
    color: MUTED,
    fontSize: 7,
  },

  symptomsText: {
    marginTop: 9,
    fontFamily:
      "DMSans_400Regular",
    color: MUTED,
    fontSize: 7.5,
    lineHeight: 12,
  },

  symptomsLabel: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
  },

  viewButton: {
    minHeight: 40,
    marginTop: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: MINT,
  },

  viewButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },

  emptyCard: {
    minHeight: 210,
    padding: 25,
    alignItems: "center",
    justifyContent: "center",
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
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 17,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 4,
    fontFamily:
      "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
    textAlign: "center",
  },

  /* DRAWER */

  drawerRoot: {
    flex: 1,
    flexDirection: "row",
  },

  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(5, 28, 19, .68)",
  },

  drawer: {
    width: "86%",
    maxWidth: 350,
    height: "100%",
    paddingTop:
      Platform.OS === "web"
        ? 35
        : 58,
    paddingHorizontal: 15,
    paddingBottom: 20,
    backgroundColor: GREEN,
  },

  drawerBrandWrap: {
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
    backgroundColor:
      "rgba(255,255,255,.10)",
  },

  drawerBrand: {
    fontFamily:
      "PlayfairDisplay_700Bold",
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

  drawerDoctorCard: {
    marginTop: 18,
    marginBottom: 8,
    padding: 11,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor:
      "rgba(255,255,255,.08)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,.10)",
  },

  drawerDoctorAvatar: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },

  drawerDoctorAvatarText: {
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
    fontFamily:
      "DMSans_400Regular",
    color: "#C5D7CC",
    fontSize: 7.5,
  },

  drawerSection: {
    marginTop: 14,
  },

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

  drawerItemActive: {
    backgroundColor: WHITE,
  },

  drawerItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,.07)",
  },

  drawerItemIconActive: {
    backgroundColor: MINT,
  },

  drawerItemText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: "#E4ECE7",
    fontSize: 10.5,
  },

  drawerItemTextActive: {
    color: GREEN,
  },

  logoutButton: {
    minHeight: 49,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor:
      "rgba(255,255,255,.10)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,.16)",
  },

  logoutButtonText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 11,
  },

  /* SHEETS */

  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(5, 28, 19, .72)",
  },

  filterSheet: {
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom:
      Platform.OS === "ios"
        ? 30
        : 21,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: CREAM,
  },

  detailsSheet: {
    maxHeight: "92%",
    paddingTop: 10,
    paddingHorizontal: 17,
    paddingBottom:
      Platform.OS === "ios"
        ? 30
        : 18,
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
    justifyContent: "space-between",
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
    fontFamily:
      "PlayfairDisplay_700Bold",
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

  optionWrap: {
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

  optionText: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 7.5,
  },

  optionTextActive: {
    color: WHITE,
  },

  dateFilterButton: {
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  dateFilterText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  filterSheetActions: {
    marginTop: 20,
    flexDirection: "row",
    gap: 8,
  },

  clearFiltersButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  clearFiltersText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  applyFiltersButton: {
    flex: 1.5,
    minHeight: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: GOLD,
  },

  applyFiltersText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  /* DETAILS */

  patientHero: {
    minHeight: 78,
    padding: 12,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: MINT,
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
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 17,
  },

  patientSubtitle: {
    marginTop: 2,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 7,
  },

  detailsGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },

  detailBox: {
    width: "48.7%",
    minHeight: 91,
    padding: 10,
    borderRadius: 15,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  detailLabel: {
    marginTop: 7,
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 6,
    letterSpacing: 0.7,
  },

  detailValue: {
    marginTop: 4,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
    lineHeight: 12,
  },

  longDetail: {
    marginTop: 9,
    padding: 12,
    borderRadius: 15,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  longDetailValue: {
    marginTop: 5,
    fontFamily:
      "DMSans_500Medium",
    color: TEXT,
    fontSize: 9,
    lineHeight: 15,
  },

  fullDetailsButton: {
    minHeight: 49,
    marginTop: 13,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: GOLD,
  },

  fullDetailsButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  /* MODALS */

  modalCenterRoot: {
    flex: 1,
    paddingHorizontal: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  logoutCard: {
    width: "100%",
    maxWidth: 380,
    padding: 22,
    borderRadius: 27,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor:
      "rgba(214,180,91,.42)",
    elevation: 18,
  },

  logoutIcon: {
    width: 67,
    height: 67,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  logoutActions: {
    width: "100%",
    marginTop: 19,
    flexDirection: "row",
    gap: 8,
  },

  logoutCancel: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  logoutCancelText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  logoutConfirm: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DANGER,
  },

  logoutConfirmText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
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
    borderColor:
      "rgba(214,180,91,.42)",
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
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 23,
    textAlign: "center",
  },

  noticeMessage: {
    marginTop: 8,
    fontFamily:
      "DMSans_400Regular",
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
