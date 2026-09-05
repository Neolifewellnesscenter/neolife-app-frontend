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
  Linking,
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

/* =========================================================
   TYPES
========================================================= */

type CalendarView = "MONTH" | "WEEK" | "DAY";
type AppointmentType = "ALL" | "OFFLINE" | "ONLINE";
type RecordType = "APPOINTMENT" | "CONSULTATION";

type CalendarItem = {
  recordType: RecordType;
  id: string;
  patientId?: string | number | null;
  patientName: string;
  phoneNumber: string;
  email: string;
  age: string | number;
  gender: string;
  type: "OFFLINE" | "ONLINE";
  date: string;
  time: string;
  endTime?: string | null;
  symptoms: string;
  pastMedicalHistory: string;
  status: string;
  paymentStatus: string;
  doctorName: string;
  doctorSpecialization: string;
  fee: number;
  meetingLink?: string | null;
  meetingLinkExpiresAt?: string | null;
  cancellationReason?: string | null;
  rescheduleReason?: string | null;
};

type DoctorProfile = {
  id?: number;
  name?: string;
  doctorName?: string;
};

type NoticeType = "success" | "error" | "warning" | "info";

type NoticeState = {
  visible: boolean;
  type: NoticeType;
  title: string;
  message: string;
};

type ConfirmAction =
  | "CONFIRM_APPOINTMENT"
  | "ACCEPT_CONSULTATION"
  | "LOGOUT"
  | "";

type ConfirmState = {
  visible: boolean;
  action: ConfirmAction;
  title: string;
  message: string;
  itemId: string;
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

export default function DoctorAppointmentCalendarScreen() {
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [doctor, setDoctor] = useState<DoctorProfile>({});
  const [doctorName, setDoctorName] = useState("Doctor");
  const [doctorInitial, setDoctorInitial] = useState("D");

  const [hasOnline, setHasOnline] = useState<boolean | null>(null);
  const [hasOffline, setHasOffline] = useState<boolean | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>("MONTH");
  const [selectedType, setSelectedType] = useState<AppointmentType>("ALL");

  const [appointments, setAppointments] = useState<CalendarItem[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<CalendarItem | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [rescheduleTime, setRescheduleTime] = useState(new Date());
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [notice, setNotice] = useState<NoticeState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const [confirm, setConfirm] = useState<ConfirmState>({
    visible: false,
    action: "",
    title: "",
    message: "",
    itemId: "",
  });

  /* =======================================================
     SESSION / API
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

  async function doctorApiRequest(
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
    };

    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    headers.Authorization = `Bearer ${token}`;

    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
      }
    );

    const responseText = await response.text();

    let result: any = {};

    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch {
        result = {
          success: false,
          message:
            responseText ||
            `Invalid server response (${response.status}).`,
        };
      }
    }

    if (response.status === 401 || response.status === 403) {
      await clearDoctorSession();

      showNotice(
        "error",
        "Session Expired",
        result?.message ||
          "Your doctor session has expired. Please sign in again."
      );

      setTimeout(() => {
        router.replace("/login" as any);
      }, 900);

      throw new Error(
        result?.message ||
          "Doctor session expired."
      );
    }

    if (!response.ok || result?.success === false) {
      throw new Error(
        result?.message || "Request failed."
      );
    }

    return result;
  }

  async function validateDoctorAccess() {
    const token = await getDoctorToken();
    const role = String(
      (await AsyncStorage.getItem("role")) || ""
    ).toUpperCase();

    if (!token) {
      router.replace("/login" as any);
      return false;
    }

    if (role && role !== "DOCTOR") {
      await clearDoctorSession();

      showNotice(
        "error",
        "Doctor Access Only",
        "Only doctors can access the appointment calendar."
      );

      setTimeout(() => {
        router.replace("/login" as any);
      }, 900);

      return false;
    }

    return true;
  }

  /* =======================================================
     PROFILE / MENU AVAILABILITY
  ======================================================= */

  function doctorInitialFromName(name: string) {
    const clean = String(name || "Doctor")
      .replace(/^Dr\.?\s*/i, "")
      .trim();

    return clean.charAt(0).toUpperCase() || "D";
  }

  async function loadDoctorProfile() {
    const storedName =
      (await AsyncStorage.getItem("doctorName")) ||
      "Doctor";

    setDoctorName(storedName);
    setDoctorInitial(
      doctorInitialFromName(storedName)
    );

    try {
      const result = await doctorApiRequest(
        "/doctors/my-profile"
      );

      const profile: DoctorProfile =
        result?.data || {};

      const name =
        profile.name ||
        profile.doctorName ||
        storedName;

      setDoctor(profile);
      setDoctorName(name);
      setDoctorInitial(
        doctorInitialFromName(name)
      );

      await AsyncStorage.setItem(
        "doctorName",
        name
      );

      await AsyncStorage.setItem(
        "doctor",
        JSON.stringify(profile)
      );

      if (profile.id != null) {
        await AsyncStorage.setItem(
          "doctorId",
          String(profile.id)
        );
      }

      return profile;
    } catch (error: any) {
      showNotice(
        "warning",
        "Profile Not Loaded",
        error?.message ||
          "Doctor profile could not be loaded."
      );

      return {};
    }
  }

  async function loadDoctorConsultationModes(
    profile?: DoctorProfile
  ) {
    let doctorId =
      profile?.id ||
      Number(
        await AsyncStorage.getItem("doctorId")
      );

    if (!doctorId) {
      setHasOnline(null);
      setHasOffline(null);
      return;
    }

    try {
      const result = await doctorApiRequest(
        `/doctor-availability/doctor/${encodeURIComponent(
          String(doctorId)
        )}`
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

        await AsyncStorage.multiRemove([
          "doctorHasOnline",
          "doctorHasOffline",
        ]);

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

      if (
        storedOnline !== null ||
        storedOffline !== null
      ) {
        setHasOnline(storedOnline === "true");
        setHasOffline(storedOffline === "true");
      } else {
        setHasOnline(null);
        setHasOffline(null);
      }
    }
  }

  /* =======================================================
     NORMALIZATION
  ======================================================= */

  function extractAppointmentArray(result: any) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.data?.content))
      return result.data.content;
    if (Array.isArray(result?.data?.appointments))
      return result.data.appointments;
    if (Array.isArray(result?.appointments))
      return result.appointments;
    return [];
  }

  function extractConsultationArray(result: any) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.data?.content))
      return result.data.content;
    if (Array.isArray(result?.data?.consultations))
      return result.data.consultations;
    if (Array.isArray(result?.consultations))
      return result.consultations;
    return [];
  }

  function normalizeAppointmentDate(value: any) {
    if (!value) return "";

    const text = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.substring(0, 10);
    }

    const parts = text.split(/[/-]/);

    if (
      parts.length === 3 &&
      parts[0].length <= 2 &&
      parts[2].length === 4
    ) {
      return `${parts[2]}-${String(
        parts[1]
      ).padStart(2, "0")}-${String(
        parts[0]
      ).padStart(2, "0")}`;
    }

    return "";
  }

  function normalizeAppointmentTime(value: any) {
    if (!value) return "";

    const text = String(value).trim();

    if (text.includes("T")) {
      return text
        .split("T")[1]
        .substring(0, 5);
    }

    if (/^\d{1,2}:\d{2}/.test(text)) {
      const pieces = text.split(":");

      return `${String(pieces[0]).padStart(
        2,
        "0"
      )}:${String(pieces[1]).padStart(
        2,
        "0"
      )}`;
    }

    return "";
  }

  function normalizeAppointment(item: any): CalendarItem {
    return {
      recordType: "APPOINTMENT",
      id: String(
        item.id ?? item.appointmentId ?? ""
      ),
      patientId:
        item.patientId ??
        item.patient?.id ??
        null,
      patientName:
        item.patientName ||
        item.patient?.name ||
        "Patient",
      phoneNumber:
        item.phoneNumber ||
        item.patient?.phoneNumber ||
        "-",
      email: item.email || "-",
      age: item.age ?? "-",
      gender: item.gender || "-",
      type: String(
        item.appointmentMode ||
        item.appointmentType ||
        "OFFLINE"
      ).toUpperCase() as "OFFLINE" | "ONLINE",
      date: normalizeAppointmentDate(
        item.appointmentDate || item.date
      ),
      time: normalizeAppointmentTime(
        item.startTime ||
        item.appointmentTime
      ),
      endTime: normalizeAppointmentTime(
        item.endTime
      ),
      symptoms:
        item.symptoms ||
        "General consultation",
      pastMedicalHistory:
        item.pastMedicalHistory || "-",
      status: String(
        item.status || "PENDING"
      ).toUpperCase(),
      paymentStatus: String(
        item.paymentStatus || "PENDING"
      ).toUpperCase(),
      doctorName:
        item.doctorName || "-",
      doctorSpecialization:
        item.doctorSpecialization || "-",
      fee: Number(item.bookingFee ?? 50),
      meetingLink: null,
      meetingLinkExpiresAt: null,
    };
  }

  function normalizeConsultation(item: any): CalendarItem {
    return {
      recordType: "CONSULTATION",
      id: String(
        item.id ?? item.consultationId ?? ""
      ),
      patientId:
        item.patientId ??
        item.patient?.id ??
        null,
      patientName:
        item.patientName ||
        item.patient?.name ||
        "Patient",
      phoneNumber:
        item.phoneNumber ||
        item.patient?.phoneNumber ||
        "-",
      email: item.email || "-",
      age: item.age ?? "-",
      gender: item.gender || "-",
      type: "ONLINE",
      date: normalizeAppointmentDate(
        item.consultationDate ||
        item.date
      ),
      time: normalizeAppointmentTime(
        item.startTime ||
        item.consultationTime ||
        item.time
      ),
      endTime: normalizeAppointmentTime(
        item.endTime
      ),
      symptoms:
        item.symptoms ||
        "Online consultation",
      pastMedicalHistory:
        item.pastMedicalHistory || "-",
      status: String(
        item.status ||
        "PENDING_DOCTOR_CONFIRMATION"
      ).toUpperCase(),
      paymentStatus: String(
        item.paymentStatus ||
        "NOT_REQUIRED_YET"
      ).toUpperCase(),
      doctorName:
        item.doctorName || "-",
      doctorSpecialization:
        item.doctorSpecialization || "-",
      fee: Number(
        item.consultationFee ?? 200
      ),
      meetingLink:
        item.meetingLink || null,
      meetingLinkExpiresAt:
        item.meetingLinkExpiresAt || null,
      cancellationReason:
        item.cancellationReason || null,
      rescheduleReason:
        item.rescheduleReason || null,
    };
  }

  /* =======================================================
     LOAD CALENDAR DATA
  ======================================================= */

  async function loadAppointments() {
    const results =
      await Promise.allSettled([
        doctorApiRequest(
          "/appointments/doctor/my-appointments"
        ),
        doctorApiRequest(
          "/consultations/doctor/my-consultations"
        ),
        doctorApiRequest(
          "/consultations/doctor/requests"
        ),
      ]);

    const errors: string[] = [];

    let offlineAppointments: any[] = [];
    let upcomingConsultations: any[] = [];
    let pendingConsultations: any[] = [];

    if (results[0].status === "fulfilled") {
      offlineAppointments =
        extractAppointmentArray(
          results[0].value
        );
    } else {
      errors.push(
        results[0].reason?.message ||
          "Offline appointments could not be loaded."
      );
    }

    if (results[1].status === "fulfilled") {
      upcomingConsultations =
        extractConsultationArray(
          results[1].value
        );
    } else {
      errors.push(
        results[1].reason?.message ||
          "Online consultations could not be loaded."
      );
    }

    if (results[2].status === "fulfilled") {
      pendingConsultations =
        extractConsultationArray(
          results[2].value
        );
    } else {
      errors.push(
        results[2].reason?.message ||
          "Pending online requests could not be loaded."
      );
    }

    const normalizedAppointments =
      offlineAppointments
        .map(normalizeAppointment)
        .filter(
          (item) =>
            item.id &&
            item.date &&
            item.time
        );

    const consultationMap = new Map<
      string,
      CalendarItem
    >();

    [
      ...pendingConsultations,
      ...upcomingConsultations,
    ].forEach((item) => {
      const normalized =
        normalizeConsultation(item);

      if (
        normalized.id &&
        normalized.date &&
        normalized.time
      ) {
        consultationMap.set(
          normalized.id,
          normalized
        );
      }
    });

    const combined = [
      ...normalizedAppointments,
      ...Array.from(
        consultationMap.values()
      ),
    ].sort((first, second) => {
      return (
        new Date(
          `${first.date}T${first.time}:00`
        ).getTime() -
        new Date(
          `${second.date}T${second.time}:00`
        ).getTime()
      );
    });

    setAppointments(combined);

    if (errors.length && combined.length) {
      showNotice(
        "warning",
        "Some Records Could Not Load",
        "Some calendar records could not be loaded."
      );
    } else if (
      errors.length &&
      !combined.length
    ) {
      showNotice(
        "error",
        "Calendar Could Not Load",
        errors.join(" ")
      );
    }
  }

  async function refreshPage(
    initial = false
  ) {
    try {
      if (initial) setLoading(true);

      const allowed =
        await validateDoctorAccess();

      if (!allowed) return;

      const profile =
        await loadDoctorProfile();

      await loadDoctorConsultationModes(
        profile
      );

      await loadAppointments();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refreshPage(true);
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await refreshPage(false);
  }

  /* =======================================================
     FILTERS / SUMMARY
  ======================================================= */

  const filteredAppointments =
    useMemo(() => {
      if (selectedType === "ALL") {
        return appointments;
      }

      return appointments.filter(
        (item) =>
          item.type === selectedType
      );
    }, [appointments, selectedType]);

  const summary = useMemo(() => {
    return {
      total: appointments.length,
      offline: appointments.filter(
        (item) => item.type === "OFFLINE"
      ).length,
      online: appointments.filter(
        (item) => item.type === "ONLINE"
      ).length,
      pending: appointments.filter(
        (item) =>
          [
            "PENDING",
            "PAYMENT_PENDING",
            "PENDING_DOCTOR_CONFIRMATION",
          ].includes(item.status)
      ).length,
    };
  }, [appointments]);

  /* =======================================================
     DATE HELPERS
  ======================================================= */

  function formatDateForInput(date: Date) {
    const y = date.getFullYear();
    const m = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const d = String(
      date.getDate()
    ).padStart(2, "0");

    return `${y}-${m}-${d}`;
  }

  function formatTime(value?: string | null) {
    if (!value) return "--:--";

    const [h, m] =
      String(value).split(":");

    const date = new Date();
    date.setHours(
      Number(h),
      Number(m || 0),
      0,
      0
    );

    return date.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    );
  }

  function formatLongDate(value: string) {
    if (!value) return "-";

    const date = new Date(
      `${value}T00:00:00`
    );

    return date.toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  }

  function formatShortDate(date: Date) {
    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
      }
    );
  }

  function getWeekDates(date: Date) {
    const start = new Date(date);

    start.setDate(
      date.getDate() - date.getDay()
    );

    return Array.from(
      { length: 7 },
      (_, index) => {
        const next = new Date(start);
        next.setDate(
          start.getDate() + index
        );
        return next;
      }
    );
  }

  function isSameDate(
    first: Date,
    second: Date
  ) {
    return (
      first.getFullYear() ===
        second.getFullYear() &&
      first.getMonth() ===
        second.getMonth() &&
      first.getDate() ===
        second.getDate()
    );
  }

  function getPeriodTitle() {
    if (calendarView === "MONTH") {
      return currentDate.toLocaleDateString(
        "en-IN",
        {
          month: "long",
          year: "numeric",
        }
      );
    }

    if (calendarView === "DAY") {
      return currentDate.toLocaleDateString(
        "en-IN",
        {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      );
    }

    const week = getWeekDates(
      currentDate
    );

    return `${formatShortDate(
      week[0]
    )} - ${formatShortDate(
      week[6]
    )}`;
  }

  function movePrevious() {
    const next = new Date(currentDate);

    if (calendarView === "MONTH") {
      next.setMonth(
        next.getMonth() - 1
      );
    } else if (
      calendarView === "WEEK"
    ) {
      next.setDate(
        next.getDate() - 7
      );
    } else {
      next.setDate(
        next.getDate() - 1
      );
    }

    setCurrentDate(next);
  }

  function moveNext() {
    const next = new Date(currentDate);

    if (calendarView === "MONTH") {
      next.setMonth(
        next.getMonth() + 1
      );
    } else if (
      calendarView === "WEEK"
    ) {
      next.setDate(
        next.getDate() + 7
      );
    } else {
      next.setDate(
        next.getDate() + 1
      );
    }

    setCurrentDate(next);
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  /* =======================================================
     ACTIONS
  ======================================================= */

  async function performConfirmAction() {
    try {
      setActionLoading(true);

      if (confirm.action === "LOGOUT") {
        await clearDoctorSession();

        setConfirm({
          visible: false,
          action: "",
          title: "",
          message: "",
          itemId: "",
        });

        router.replace("/login" as any);
        return;
      }

      if (
        confirm.action ===
        "CONFIRM_APPOINTMENT"
      ) {
        const result =
          await doctorApiRequest(
            `/appointments/${encodeURIComponent(
              confirm.itemId
            )}/confirm`,
            {
              method: "PUT",
            }
          );

        setDetailsOpen(false);

        showNotice(
          "success",
          "Appointment Confirmed",
          result?.message ||
            "Appointment confirmed successfully."
        );
      }

      if (
        confirm.action ===
        "ACCEPT_CONSULTATION"
      ) {
        const result =
          await doctorApiRequest(
            `/consultations/${encodeURIComponent(
              confirm.itemId
            )}/accept`,
            {
              method: "PUT",
            }
          );

        setDetailsOpen(false);

        showNotice(
          "success",
          "Consultation Accepted",
          result?.message ||
            "Consultation accepted successfully."
        );
      }

      setConfirm({
        visible: false,
        action: "",
        title: "",
        message: "",
        itemId: "",
      });

      await loadAppointments();
    } catch (error: any) {
      showNotice(
        "error",
        "Action Failed",
        error?.message ||
          "The requested action could not be completed."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectConsultation() {
    if (!selectedAppointment) return;

    const reason =
      rejectReason.trim();

    if (!reason) {
      showNotice(
        "warning",
        "Reason Required",
        "Please enter a reason for rejecting this consultation."
      );
      return;
    }

    try {
      setActionLoading(true);

      const result =
        await doctorApiRequest(
          `/consultations/${encodeURIComponent(
            selectedAppointment.id
          )}/reject`,
          {
            method: "PUT",
            body: JSON.stringify({
              reason,
            }),
          }
        );

      setRejectOpen(false);
      setRejectReason("");
      setDetailsOpen(false);

      showNotice(
        "success",
        "Consultation Rejected",
        result?.message ||
          "Consultation rejected successfully."
      );

      await loadAppointments();
    } catch (error: any) {
      showNotice(
        "error",
        "Unable to Reject",
        error?.message ||
          "Consultation could not be rejected."
      );
    } finally {
      setActionLoading(false);
    }
  }

  function openReschedule(
    item: CalendarItem
  ) {
    setSelectedAppointment(item);

    const date =
      item.date
        ? new Date(
            `${item.date}T00:00:00`
          )
        : new Date();

    const [h, m] =
      (item.time || "09:00").split(":");

    const time = new Date();
    time.setHours(
      Number(h || 9),
      Number(m || 0),
      0,
      0
    );

    setRescheduleDate(date);
    setRescheduleTime(time);
    setRescheduleReason("");

    setDetailsOpen(false);
    setRescheduleOpen(true);
  }

  async function submitReschedule() {
    if (!selectedAppointment) return;

    try {
      setActionLoading(true);

      const appointmentDate =
        formatDateForInput(
          rescheduleDate
        );

      const selectedTime =
        `${String(
          rescheduleTime.getHours()
        ).padStart(2, "0")}:${String(
          rescheduleTime.getMinutes()
        ).padStart(2, "0")}:00`;

      const isConsultation =
        selectedAppointment.recordType ===
        "CONSULTATION";

      const endpoint =
        isConsultation
          ? `/consultations/${encodeURIComponent(
              selectedAppointment.id
            )}/reschedule`
          : `/appointments/${encodeURIComponent(
              selectedAppointment.id
            )}/reschedule`;

      const requestBody =
        isConsultation
          ? {
              newDate:
                appointmentDate,
              newTime:
                selectedTime,
              reason:
                rescheduleReason.trim() ||
                "Rescheduled by doctor",
            }
          : {
              appointmentDate:
                appointmentDate,
              startTime:
                selectedTime,
              reason:
                rescheduleReason.trim() ||
                "Rescheduled by doctor",
            };

      const result =
        await doctorApiRequest(
          endpoint,
          {
            method: "PUT",
            body: JSON.stringify(
              requestBody
            ),
          }
        );

      setRescheduleOpen(false);

      showNotice(
        "success",
        isConsultation
          ? "Consultation Rescheduled"
          : "Appointment Rescheduled",
        result?.message ||
          (isConsultation
            ? "Consultation rescheduled successfully."
            : "Appointment rescheduled successfully.")
      );

      await loadAppointments();
    } catch (error: any) {
      showNotice(
        "error",
        "Reschedule Failed",
        error?.message ||
          "The booking could not be rescheduled."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function joinConsultation() {
    const link =
      selectedAppointment?.meetingLink;

    if (!link) {
      showNotice(
        "warning",
        "Meeting Link Unavailable",
        "The meeting link is not available yet."
      );
      return;
    }

    const supported =
      await Linking.canOpenURL(link);

    if (!supported) {
      showNotice(
        "error",
        "Unable to Open Link",
        "This meeting link cannot be opened on this device."
      );
      return;
    }

    await Linking.openURL(link);
  }

  function openFullDetails(
    item: CalendarItem
  ) {
    setDetailsOpen(false);

    if (
      item.recordType ===
      "CONSULTATION"
    ) {
      router.push({
        pathname:
          "/doctor/consultations" as any,
        params: {
          consultationId: item.id,
        },
      });
      return;
    }

    router.push({
      pathname:
        "/doctor/appointments" as any,
      params: {
        appointmentId: item.id,
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

  /* =======================================================
     MONTH / WEEK / DAY DATA
  ======================================================= */

  const monthCells = useMemo(() => {
    const year =
      currentDate.getFullYear();

    const month =
      currentDate.getMonth();

    const firstDay =
      new Date(year, month, 1);

    const gridStart =
      new Date(firstDay);

    gridStart.setDate(
      firstDay.getDate() -
        firstDay.getDay()
    );

    return Array.from(
      { length: 42 },
      (_, index) => {
        const date =
          new Date(gridStart);

        date.setDate(
          gridStart.getDate() + index
        );

        const dateString =
          formatDateForInput(date);

        const events =
          filteredAppointments.filter(
            (item) =>
              item.date === dateString
          );

        return {
          date,
          dateString,
          events,
          otherMonth:
            date.getMonth() !== month,
          today: isSameDate(
            date,
            new Date()
          ),
        };
      }
    );
  }, [
    currentDate,
    filteredAppointments,
  ]);

  const weekDates = useMemo(
    () => getWeekDates(currentDate),
    [currentDate]
  );

  const dayAppointments = useMemo(() => {
    const dateString =
      formatDateForInput(currentDate);

    return filteredAppointments.filter(
      (item) =>
        item.date === dateString
    );
  }, [
    currentDate,
    filteredAppointments,
  ]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.fullLoader}>
        <ActivityIndicator
          size="large"
          color={GREEN}
        />

        <Text style={styles.loaderText}>
          Preparing appointment calendar...
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
            style={
              styles.headerEyebrow
            }
          >
            DOCTOR PORTAL
          </Text>

          <Text
            style={styles.headerTitle}
            numberOfLines={1}
          >
            Appointment Calendar
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
            Loading your appointments...
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

          <View style={styles.heroCard}>
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
                name="calendar-outline"
                size={14}
                color={GOLD_LIGHT}
              />

              <Text
                style={
                  styles.heroBadgeText
                }
              >
                APPOINTMENT CALENDAR
              </Text>
            </View>

            <Text
              style={styles.heroTitle}
            >
              Your schedule,
              {"\n"}
              <Text
                style={styles.heroGold}
              >
                organized clearly.
              </Text>
            </Text>

            <Text
              style={styles.heroText}
            >
              Review offline appointments
              and online consultations in
              month, week or day view.
            </Text>
          </View>

          {/* SUMMARY */}

          <View
            style={styles.summaryGrid}
          >
            <SummaryCard
              icon="calendar-outline"
              label="Total Bookings"
              value={summary.total}
              tone="all"
            />

            <SummaryCard
              icon="business-outline"
              label="Offline"
              value={summary.offline}
              tone="offline"
            />

            <SummaryCard
              icon="videocam-outline"
              label="Online"
              value={summary.online}
              tone="online"
            />

            <SummaryCard
              icon="time-outline"
              label="Pending"
              value={summary.pending}
              tone="pending"
            />
          </View>

          {/* CONTROLS */}

          <View
            style={styles.controlCard}
          >
            <Text
              style={
                styles.controlEyebrow
              }
            >
              FILTER BOOKINGS
            </Text>

            <View
              style={styles.segmentRow}
            >
              {(
                [
                  "ALL",
                  "OFFLINE",
                  "ONLINE",
                ] as AppointmentType[]
              ).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.segmentButton,
                    selectedType === type &&
                      styles.segmentButtonActive,
                  ]}
                  onPress={() =>
                    setSelectedType(type)
                  }
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      selectedType ===
                        type &&
                        styles.segmentButtonTextActive,
                    ]}
                  >
                    {type === "ALL"
                      ? "All"
                      : type ===
                        "OFFLINE"
                      ? "Offline"
                      : "Online"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={[
                styles.controlEyebrow,
                { marginTop: 16 },
              ]}
            >
              CALENDAR VIEW
            </Text>

            <View
              style={styles.segmentRow}
            >
              {(
                [
                  "MONTH",
                  "WEEK",
                  "DAY",
                ] as CalendarView[]
              ).map((view) => (
                <TouchableOpacity
                  key={view}
                  style={[
                    styles.segmentButton,
                    calendarView ===
                      view &&
                      styles.segmentButtonActive,
                  ]}
                  onPress={() =>
                    setCalendarView(view)
                  }
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      calendarView ===
                        view &&
                        styles.segmentButtonTextActive,
                    ]}
                  >
                    {view.charAt(0) +
                      view
                        .slice(1)
                        .toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View
              style={
                styles.navigationRow
              }
            >
              <TouchableOpacity
                style={
                  styles.navIconButton
                }
                onPress={movePrevious}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={GREEN}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.todayButton
                }
                onPress={goToToday}
              >
                <Ionicons
                  name="locate-outline"
                  size={16}
                  color={GREEN}
                />

                <Text
                  style={
                    styles.todayButtonText
                  }
                >
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.navIconButton
                }
                onPress={moveNext}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={GREEN}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* CALENDAR PANEL */}

          <View
            style={styles.calendarCard}
          >
            <View
              style={
                styles.calendarCardHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.calendarEyebrow
                  }
                >
                  CURRENT PERIOD
                </Text>

                <Text
                  style={
                    styles.periodTitle
                  }
                >
                  {getPeriodTitle()}
                </Text>
              </View>
            </View>

            <View
              style={styles.legendRow}
            >
              <Legend
                tone="offline"
                text="Offline"
              />
              <Legend
                tone="online"
                text="Online"
              />
              <Legend
                tone="pending"
                text="Pending"
              />
            </View>

            {calendarView === "MONTH" && (
              <MonthView
                cells={monthCells}
                onOpen={(item) => {
                  setSelectedAppointment(
                    item
                  );
                  setDetailsOpen(true);
                }}
              />
            )}

            {calendarView === "WEEK" && (
              <WeekView
                dates={weekDates}
                appointments={
                  filteredAppointments
                }
                onOpen={(item) => {
                  setSelectedAppointment(
                    item
                  );
                  setDetailsOpen(true);
                }}
              />
            )}

            {calendarView === "DAY" && (
              <DayView
                date={currentDate}
                appointments={
                  dayAppointments
                }
                onOpen={(item) => {
                  setSelectedAppointment(
                    item
                  );
                  setDetailsOpen(true);
                }}
              />
            )}
          </View>

          <View style={styles.bottomHint}>
            <Ionicons
              name="information-circle-outline"
              size={17}
              color={GOLD_DARK}
            />

            <Text
              style={
                styles.bottomHintText
              }
            >
              Tap any booking to view patient
              details and available actions.
            </Text>
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
            style={styles.drawerBackdrop}
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
              showsVerticalScrollIndicator={
                false
              }
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
                        "Appointment Calendar";

                      return (
                        <TouchableOpacity
                          key={item.label}
                          style={[
                            styles.drawerItem,
                            active &&
                              styles.drawerItemActive,
                          ]}
                          activeOpacity={
                            0.85
                          }
                          onPress={() => {
                            setMenuOpen(
                              false
                            );

                            if (
                              active
                            ) {
                              return;
                            }

                            router.push(
                              item.route as any
                            );
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
              style={styles.logoutButton}
              onPress={() => {
                setMenuOpen(false);

                setConfirm({
                  visible: true,
                  action: "LOGOUT",
                  title: "Log Out?",
                  message:
                    "Are you sure you want to leave the doctor portal?",
                  itemId: "",
                });
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
          BOOKING DETAILS
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

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={{
                paddingBottom: 20,
              }}
            >
              {selectedAppointment && (
                <>
                  <View
                    style={
                      styles.detailsHeader
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.sheetEyebrow
                        }
                      >
                        {selectedAppointment.recordType ===
                        "CONSULTATION"
                          ? "ONLINE CONSULTATION"
                          : "APPOINTMENT"}
                      </Text>

                      <Text
                        style={
                          styles.sheetTitle
                        }
                      >
                        Booking Details
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={
                        styles.sheetClose
                      }
                      onPress={() =>
                        setDetailsOpen(
                          false
                        )
                      }
                    >
                      <Ionicons
                        name="close"
                        size={21}
                        color={GREEN}
                      />
                    </TouchableOpacity>
                  </View>

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
                        {selectedAppointment.patientName
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={
                          styles.patientName
                        }
                      >
                        {
                          selectedAppointment.patientName
                        }
                      </Text>

                      <Text
                        style={
                          styles.patientSubtitle
                        }
                      >
                        {selectedAppointment.recordType ===
                        "CONSULTATION"
                          ? "Online Consultation"
                          : `${selectedAppointment.type} Appointment`}
                      </Text>
                    </View>

                    <StatusBadge
                      status={
                        selectedAppointment.status
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
                      value={formatLongDate(
                        selectedAppointment.date
                      )}
                    />

                    <DetailBox
                      icon="time-outline"
                      label="Time"
                      value={
                        selectedAppointment.endTime
                          ? `${formatTime(
                              selectedAppointment.time
                            )} - ${formatTime(
                              selectedAppointment.endTime
                            )}`
                          : formatTime(
                              selectedAppointment.time
                            )
                      }
                    />

                    <DetailBox
                      icon="call-outline"
                      label="Phone"
                      value={
                        selectedAppointment.phoneNumber
                      }
                    />

                    <DetailBox
                      icon="person-outline"
                      label="Age / Gender"
                      value={`${selectedAppointment.age} / ${selectedAppointment.gender}`}
                    />

                    <DetailBox
                      icon="card-outline"
                      label="Payment"
                      value={
                        selectedAppointment.paymentStatus
                      }
                    />

                    <DetailBox
                      icon="cash-outline"
                      label={
                        selectedAppointment.recordType ===
                        "CONSULTATION"
                          ? "Consultation Fee"
                          : "Booking Fee"
                      }
                      value={`₹${Number(
                        selectedAppointment.fee ||
                          0
                      ).toLocaleString(
                        "en-IN"
                      )}`}
                    />
                  </View>

                  <LongDetail
                    label="Doctor"
                    value={`${selectedAppointment.doctorName}${
                      selectedAppointment.doctorSpecialization !==
                      "-"
                        ? ` · ${selectedAppointment.doctorSpecialization}`
                        : ""
                    }`}
                  />

                  <LongDetail
                    label="Symptoms"
                    value={
                      selectedAppointment.symptoms
                    }
                  />

                  <LongDetail
                    label="Past Medical History"
                    value={
                      selectedAppointment.pastMedicalHistory
                    }
                  />

                  <View
                    style={
                      styles.actionList
                    }
                  >
                    {selectedAppointment.recordType ===
                      "APPOINTMENT" &&
                      ![
                        "CONFIRMED",
                        "COMPLETED",
                        "CANCELLED",
                        "REJECTED",
                      ].includes(
                        selectedAppointment.status
                      ) && (
                        <PrimaryAction
                          icon="checkmark-circle-outline"
                          label="Confirm Appointment"
                          tone="success"
                          onPress={() =>
                            setConfirm({
                              visible:
                                true,
                              action:
                                "CONFIRM_APPOINTMENT",
                              title:
                                "Confirm Appointment?",
                              message: `Confirm the appointment for ${selectedAppointment.patientName}?`,
                              itemId:
                                selectedAppointment.id,
                            })
                          }
                        />
                      )}

                    {selectedAppointment.recordType ===
                      "CONSULTATION" &&
                      selectedAppointment.status ===
                        "PENDING_DOCTOR_CONFIRMATION" && (
                        <>
                          <PrimaryAction
                            icon="checkmark-circle-outline"
                            label="Accept Consultation"
                            tone="success"
                            onPress={() =>
                              setConfirm({
                                visible:
                                  true,
                                action:
                                  "ACCEPT_CONSULTATION",
                                title:
                                  "Accept Consultation?",
                                message: `Accept the online consultation request from ${selectedAppointment.patientName}?`,
                                itemId:
                                  selectedAppointment.id,
                              })
                            }
                          />

                          <PrimaryAction
                            icon="close-circle-outline"
                            label="Reject Consultation"
                            tone="danger"
                            onPress={() => {
                              setDetailsOpen(
                                false
                              );
                              setRejectReason(
                                ""
                              );
                              setRejectOpen(
                                true
                              );
                            }}
                          />
                        </>
                      )}

                    {![
                      "COMPLETED",
                      "CANCELLED",
                      "REJECTED",
                      "NO_SHOW",
                    ].includes(
                      selectedAppointment.status
                    ) && (
                      <PrimaryAction
                        icon="calendar-outline"
                        label="Reschedule"
                        tone="warning"
                        onPress={() =>
                          openReschedule(
                            selectedAppointment
                          )
                        }
                      />
                    )}

                    {selectedAppointment.recordType ===
                      "CONSULTATION" &&
                      selectedAppointment.meetingLink &&
                      [
                        "SUCCESS",
                        "PAID",
                      ].includes(
                        selectedAppointment.paymentStatus
                      ) && (
                        <PrimaryAction
                          icon="videocam-outline"
                          label="Join Consultation"
                          tone="info"
                          onPress={
                            joinConsultation
                          }
                        />
                      )}

                    <PrimaryAction
                      icon="open-outline"
                      label="View Full Details"
                      tone="dark"
                      onPress={() =>
                        openFullDetails(
                          selectedAppointment
                        )
                      }
                    />
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          RESCHEDULE
      =================================================== */}

      <Modal
        visible={rescheduleOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() =>
          !actionLoading &&
          setRescheduleOpen(false)
        }
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() =>
              !actionLoading &&
              setRescheduleOpen(false)
            }
          />

          <View
            style={styles.actionSheet}
          >
            <View
              style={styles.sheetHandle}
            />

            <View
              style={styles.detailsHeader}
            >
              <View>
                <Text
                  style={
                    styles.sheetEyebrow
                  }
                >
                  CHANGE BOOKING TIME
                </Text>

                <Text
                  style={
                    styles.sheetTitle
                  }
                >
                  Reschedule
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.sheetClose
                }
                disabled={actionLoading}
                onPress={() =>
                  setRescheduleOpen(
                    false
                  )
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
              NEW DATE
            </Text>

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() =>
                setShowDatePicker(true)
              }
            >
              <Ionicons
                name="calendar-outline"
                size={19}
                color={GOLD_DARK}
              />

              <Text
                style={
                  styles.pickerValue
                }
              >
                {rescheduleDate.toLocaleDateString(
                  "en-IN",
                  {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                )}
              </Text>

              <Ionicons
                name="chevron-down"
                size={17}
                color={GREEN}
              />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={rescheduleDate}
                mode="date"
                minimumDate={new Date()}
                display={
                  Platform.OS === "android"
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
                    setShowDatePicker(
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
                    setRescheduleDate(
                      selected
                    );
                  }
                }}
              />
            )}

            <Text
              style={styles.fieldLabel}
            >
              NEW TIME
            </Text>

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() =>
                setShowTimePicker(true)
              }
            >
              <Ionicons
                name="time-outline"
                size={19}
                color={GOLD_DARK}
              />

              <Text
                style={
                  styles.pickerValue
                }
              >
                {rescheduleTime.toLocaleTimeString(
                  "en-IN",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  }
                )}
              </Text>

              <Ionicons
                name="chevron-down"
                size={17}
                color={GREEN}
              />
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={rescheduleTime}
                mode="time"
                display={
                  Platform.OS === "android"
                    ? "clock"
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
                    setShowTimePicker(
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
                    setRescheduleTime(
                      selected
                    );
                  }
                }}
              />
            )}

            <Text
              style={styles.fieldLabel}
            >
              MESSAGE TO PATIENT
            </Text>

            <TextInput
              value={rescheduleReason}
              onChangeText={
                setRescheduleReason
              }
              multiline
              textAlignVertical="top"
              placeholder="Explain the reason for rescheduling..."
              placeholderTextColor="#9AA59E"
              style={styles.textArea}
            />

            <TouchableOpacity
              style={
                styles.goldPrimaryButton
              }
              disabled={actionLoading}
              onPress={
                submitReschedule
              }
            >
              {actionLoading ? (
                <ActivityIndicator
                  size="small"
                  color={GREEN}
                />
              ) : (
                <>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={GREEN}
                  />

                  <Text
                    style={
                      styles.goldPrimaryButtonText
                    }
                  >
                    Confirm Reschedule
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          REJECT
      =================================================== */}

      <Modal
        visible={rejectOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() =>
          !actionLoading &&
          setRejectOpen(false)
        }
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() =>
              !actionLoading &&
              setRejectOpen(false)
            }
          />

          <View
            style={styles.actionSheet}
          >
            <View
              style={styles.sheetHandle}
            />

            <View
              style={styles.detailsHeader}
            >
              <View>
                <Text
                  style={
                    styles.sheetEyebrow
                  }
                >
                  CONSULTATION REQUEST
                </Text>

                <Text
                  style={
                    styles.sheetTitle
                  }
                >
                  Reject Consultation
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.sheetClose
                }
                onPress={() =>
                  setRejectOpen(false)
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
              REASON FOR REJECTION
            </Text>

            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              textAlignVertical="top"
              placeholder="Enter a clear reason for the patient..."
              placeholderTextColor="#9AA59E"
              style={styles.textArea}
            />

            <TouchableOpacity
              style={
                styles.dangerPrimaryButton
              }
              disabled={actionLoading}
              onPress={
                rejectConsultation
              }
            >
              {actionLoading ? (
                <ActivityIndicator
                  size="small"
                  color={WHITE}
                />
              ) : (
                <>
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={WHITE}
                  />

                  <Text
                    style={
                      styles.dangerPrimaryButtonText
                    }
                  >
                    Reject Consultation
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          CONFIRM
      =================================================== */}

      <Modal
        visible={confirm.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          !actionLoading &&
          setConfirm({
            visible: false,
            action: "",
            title: "",
            message: "",
            itemId: "",
          })
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
              !actionLoading &&
              setConfirm({
                visible: false,
                action: "",
                title: "",
                message: "",
                itemId: "",
              })
            }
          />

          <View
            style={styles.confirmCard}
          >
            <View
              style={styles.confirmIcon}
            >
              <Ionicons
                name={
                  confirm.action ===
                  "LOGOUT"
                    ? "log-out-outline"
                    : "checkmark-circle-outline"
                }
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
              {confirm.title}
            </Text>

            <Text
              style={
                styles.noticeMessage
              }
            >
              {confirm.message}
            </Text>

            <View
              style={
                styles.confirmActions
              }
            >
              <TouchableOpacity
                style={
                  styles.cancelButton
                }
                disabled={actionLoading}
                onPress={() =>
                  setConfirm({
                    visible: false,
                    action: "",
                    title: "",
                    message: "",
                    itemId: "",
                  })
                }
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.confirmButton
                }
                disabled={actionLoading}
                onPress={
                  performConfirmAction
                }
              >
                {actionLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={GREEN}
                  />
                ) : (
                  <>
                    <Text
                      style={
                        styles.confirmButtonText
                      }
                    >
                      Confirm
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color={GREEN}
                    />
                  </>
                )}
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
                styles.noticeIconOuter,
                notice.type === "success" &&
                  styles.noticeSuccess,
                notice.type === "error" &&
                  styles.noticeError,
                notice.type === "warning" &&
                  styles.noticeWarning,
                notice.type === "info" &&
                  styles.noticeInfo,
              ]}
            >
              <View
                style={
                  styles.noticeIconInner
                }
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
                  size={31}
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
  tone,
}: {
  icon: any;
  label: string;
  value: number;
  tone: "all" | "offline" | "online" | "pending";
}) {
  const toneStyle =
    tone === "offline"
      ? styles.summaryOffline
      : tone === "online"
      ? styles.summaryOnline
      : tone === "pending"
      ? styles.summaryPending
      : styles.summaryAll;

  const iconColor =
    tone === "offline"
      ? SUCCESS
      : tone === "online"
      ? INFO
      : tone === "pending"
      ? WARNING
      : GREEN;

  return (
    <View style={styles.summaryCard}>
      <View
        style={[
          styles.summaryIcon,
          toneStyle,
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={iconColor}
        />
      </View>

      <Text
        style={styles.summaryLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.summaryValue}
      >
        {value}
      </Text>
    </View>
  );
}

function Legend({
  tone,
  text,
}: {
  tone: "offline" | "online" | "pending";
  text: string;
}) {
  const backgroundColor =
    tone === "offline"
      ? SUCCESS
      : tone === "online"
      ? INFO
      : WARNING;

  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          { backgroundColor },
        ]}
      />

      <Text
        style={styles.legendText}
      >
        {text}
      </Text>
    </View>
  );
}

function EventPill({
  item,
  compact = false,
  onPress,
}: {
  item: CalendarItem;
  compact?: boolean;
  onPress: () => void;
}) {
  const pending =
    item.status ===
      "PENDING_DOCTOR_CONFIRMATION" ||
    item.status === "PENDING" ||
    item.status === "PAYMENT_PENDING";

  const toneStyle = pending
    ? styles.eventPending
    : item.type === "ONLINE"
    ? styles.eventOnline
    : styles.eventOffline;

  const textColor = pending
    ? WARNING
    : item.type === "ONLINE"
    ? INFO
    : SUCCESS;

  return (
    <TouchableOpacity
      style={[
        styles.eventPill,
        toneStyle,
        compact &&
          styles.eventPillCompact,
      ]}
      activeOpacity={0.86}
      onPress={onPress}
    >
      <Text
        style={[
          styles.eventTime,
          { color: textColor },
        ]}
        numberOfLines={1}
      >
        {formatEventTime(item.time)}
      </Text>

      {!compact && (
        <Text
          style={[
            styles.eventName,
            { color: textColor },
          ]}
          numberOfLines={1}
        >
          {item.patientName}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function MonthView({
  cells,
  onOpen,
}: {
  cells: {
    date: Date;
    dateString: string;
    events: CalendarItem[];
    otherMonth: boolean;
    today: boolean;
  }[];
  onOpen: (item: CalendarItem) => void;
}) {
  const dayNames = [
    "S",
    "M",
    "T",
    "W",
    "T",
    "F",
    "S",
  ];

  return (
    <View style={styles.monthWrap}>
      <View
        style={styles.monthHeader}
      >
        {dayNames.map(
          (day, index) => (
            <Text
              key={`${day}-${index}`}
              style={styles.monthDayName}
            >
              {day}
            </Text>
          )
        )}
      </View>

      <View style={styles.monthGrid}>
        {cells.map(
          (cell, index) => (
            <View
              key={`${cell.dateString}-${index}`}
              style={[
                styles.monthCell,
                cell.otherMonth &&
                  styles.monthCellOther,
              ]}
            >
              <View
                style={[
                  styles.dayNumberCircle,
                  cell.today &&
                    styles.dayNumberToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    cell.otherMonth &&
                      styles.dayNumberOther,
                    cell.today &&
                      styles.dayNumberTodayText,
                  ]}
                >
                  {cell.date.getDate()}
                </Text>
              </View>

              {cell.events
                .slice(0, 2)
                .map((item) => (
                  <EventPill
                    key={`${cell.dateString}-${item.recordType}-${item.id}`}
                    item={item}
                    compact
                    onPress={() =>
                      onOpen(item)
                    }
                  />
                ))}

              {cell.events.length > 2 && (
                <Text
                  style={
                    styles.moreEventsText
                  }
                >
                  +
                  {cell.events.length -
                    2}
                </Text>
              )}
            </View>
          )
        )}
      </View>
    </View>
  );
}

function WeekView({
  dates,
  appointments,
  onOpen,
}: {
  dates: Date[];
  appointments: CalendarItem[];
  onOpen: (item: CalendarItem) => void;
}) {
  return (
    <View style={styles.weekWrap}>
      {dates.map((date) => {
        const dateString =
          formatDateKey(date);

        const events =
          appointments.filter(
            (item) =>
              item.date === dateString
          );

        const isToday =
          sameDateSimple(
            date,
            new Date()
          );

        return (
          <View
            key={dateString}
            style={[
              styles.weekDayCard,
              isToday &&
                styles.weekDayCardToday,
            ]}
          >
            <View
              style={
                styles.weekDayHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.weekWeekday
                  }
                >
                  {date.toLocaleDateString(
                    "en-IN",
                    {
                      weekday: "long",
                    }
                  )}
                </Text>

                <Text
                  style={
                    styles.weekDate
                  }
                >
                  {date.toLocaleDateString(
                    "en-IN",
                    {
                      day: "2-digit",
                      month: "short",
                    }
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.bookingCountBadge
                }
              >
                <Text
                  style={
                    styles.bookingCountText
                  }
                >
                  {events.length} booking
                  {events.length === 1
                    ? ""
                    : "s"}
                </Text>
              </View>
            </View>

            {events.length ? (
              <View
                style={styles.listGap}
              >
                {events.map((item) => (
                  <AppointmentListCard
                    key={`${item.recordType}-${item.id}`}
                    item={item}
                    onPress={() =>
                      onOpen(item)
                    }
                  />
                ))}
              </View>
            ) : (
              <Text
                style={
                  styles.noBookingText
                }
              >
                No bookings
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function DayView({
  date,
  appointments,
  onOpen,
}: {
  date: Date;
  appointments: CalendarItem[];
  onOpen: (item: CalendarItem) => void;
}) {
  return (
    <View style={styles.dayWrap}>
      <View style={styles.dayHero}>
        <View
          style={styles.dayHeroIcon}
        >
          <Ionicons
            name="today-outline"
            size={23}
            color={GREEN}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={styles.dayHeroTitle}
          >
            {date.toLocaleDateString(
              "en-IN",
              {
                weekday: "long",
              }
            )}
          </Text>

          <Text
            style={styles.dayHeroDate}
          >
            {date.toLocaleDateString(
              "en-IN",
              {
                day: "2-digit",
                month: "long",
                year: "numeric",
              }
            )}
          </Text>
        </View>

        <Text
          style={
            styles.dayHeroCount
          }
        >
          {appointments.length}
        </Text>
      </View>

      {appointments.length ? (
        <View style={styles.listGap}>
          {appointments.map(
            (item) => (
              <AppointmentListCard
                key={`${item.recordType}-${item.id}`}
                item={item}
                onPress={() =>
                  onOpen(item)
                }
              />
            )
          )}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View
            style={styles.emptyIcon}
          >
            <Ionicons
              name="calendar-clear-outline"
              size={27}
              color={GREEN}
            />
          </View>

          <Text
            style={styles.emptyTitle}
          >
            No bookings today
          </Text>

          <Text
            style={styles.emptyText}
          >
            Your schedule is clear for
            this day.
          </Text>
        </View>
      )}
    </View>
  );
}

function AppointmentListCard({
  item,
  onPress,
}: {
  item: CalendarItem;
  onPress: () => void;
}) {
  const pending =
    [
      "PENDING",
      "PAYMENT_PENDING",
      "PENDING_DOCTOR_CONFIRMATION",
    ].includes(item.status);

  const color =
    pending
      ? WARNING
      : item.type === "ONLINE"
      ? INFO
      : SUCCESS;

  return (
    <TouchableOpacity
      style={styles.listCard}
      activeOpacity={0.86}
      onPress={onPress}
    >
      <View
        style={[
          styles.listTimeBox,
          {
            backgroundColor:
              pending
                ? WARNING_LIGHT
                : item.type ===
                  "ONLINE"
                ? INFO_LIGHT
                : SUCCESS_LIGHT,
          },
        ]}
      >
        <Text
          style={[
            styles.listTime,
            { color },
          ]}
        >
          {formatEventTime(item.time)}
        </Text>

        <Text
          style={[
            styles.listType,
            { color },
          ]}
        >
          {item.type}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={styles.listPatient}
        >
          {item.patientName}
        </Text>

        <Text
          style={styles.listSymptoms}
          numberOfLines={1}
        >
          {item.symptoms}
        </Text>

        <Text
          style={styles.listStatus}
        >
          {formatStatusLabel(
            item.status
          )}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={GREEN}
      />
    </TouchableOpacity>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const formatted =
    formatStatusLabel(status);

  const cancelled =
    ["CANCELLED", "REJECTED"].includes(
      status
    );

  const pending =
    [
      "PENDING",
      "PAYMENT_PENDING",
      "PENDING_DOCTOR_CONFIRMATION",
    ].includes(status);

  const backgroundColor =
    cancelled
      ? DANGER_LIGHT
      : pending
      ? WARNING_LIGHT
      : SUCCESS_LIGHT;

  const color =
    cancelled
      ? DANGER
      : pending
      ? WARNING
      : SUCCESS;

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
        {formatted}
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
        {value}
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
        style={styles.longDetailValue}
      >
        {value || "-"}
      </Text>
    </View>
  );
}

function PrimaryAction({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: any;
  label: string;
  tone:
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "dark";
  onPress: () => void;
}) {
  const backgroundColor =
    tone === "success"
      ? SUCCESS
      : tone === "danger"
      ? DANGER
      : tone === "warning"
      ? WARNING_LIGHT
      : tone === "info"
      ? INFO
      : GREEN;

  const color =
    tone === "warning"
      ? GOLD_DARK
      : WHITE;

  return (
    <TouchableOpacity
      style={[
        styles.primaryAction,
        { backgroundColor },
      ]}
      activeOpacity={0.86}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color={color}
      />

      <Text
        style={[
          styles.primaryActionText,
          { color },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function formatEventTime(
  value?: string
) {
  if (!value) return "--";

  const [h, m] =
    value.split(":");

  const date = new Date();
  date.setHours(
    Number(h),
    Number(m || 0),
    0,
    0
  );

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  );
}

function formatStatusLabel(
  value: string
) {
  return String(value || "PENDING")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) =>
      c.toUpperCase()
    );
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const d = String(
    date.getDate()
  ).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function sameDateSimple(
  a: Date,
  b: Date
) {
  return (
    a.getFullYear() ===
      b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
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
    marginTop: 12,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 12,
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

  heroCard: {
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

  summaryAll: {
    backgroundColor: MINT,
  },

  summaryOffline: {
    backgroundColor: SUCCESS_LIGHT,
  },

  summaryOnline: {
    backgroundColor: INFO_LIGHT,
  },

  summaryPending: {
    backgroundColor: WARNING_LIGHT,
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
    fontSize: 23,
  },

  /* CONTROLS */

  controlCard: {
    marginHorizontal: 15,
    marginTop: 15,
    padding: 14,
    borderRadius: 22,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  controlEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1,
  },

  segmentRow: {
    marginTop: 8,
    flexDirection: "row",
    padding: 4,
    borderRadius: 13,
    backgroundColor: "#F4F7F4",
    gap: 4,
  },

  segmentButton: {
    flex: 1,
    minHeight: 39,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  segmentButtonActive: {
    backgroundColor: GREEN,
  },

  segmentButtonText: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 8,
  },

  segmentButtonTextActive: {
    color: WHITE,
  },

  navigationRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  navIconButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  todayButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF7E2",
  },

  todayButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  /* CALENDAR */

  calendarCard: {
    marginHorizontal: 15,
    marginTop: 15,
    paddingBottom: 14,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  calendarCardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  calendarEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1,
  },

  periodTitle: {
    marginTop: 4,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 22,
  },

  legendRow: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 13,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  legendText: {
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 7,
  },

  /* MONTH */

  monthWrap: {
    paddingHorizontal: 10,
  },

  monthHeader: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: BORDER,
  },

  monthDayName: {
    width: "14.285%",
    paddingVertical: 9,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    textAlign: "center",
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 7,
  },

  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderLeftWidth: 1,
    borderColor: BORDER,
  },

  monthCell: {
    width: "14.285%",
    minHeight: 77,
    padding: 3,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
  },

  monthCellOther: {
    backgroundColor: "#FAFBFA",
  },

  dayNumberCircle: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },

  dayNumberToday: {
    backgroundColor: GOLD,
  },

  dayNumber: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 7.5,
  },

  dayNumberOther: {
    color: "#ADB6B0",
  },

  dayNumberTodayText: {
    color: WHITE,
  },

  eventPill: {
    minHeight: 34,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    borderLeftWidth: 3,
  },

  eventPillCompact: {
    minHeight: 16,
    marginTop: 2,
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 4,
    borderLeftWidth: 2,
  },

  eventOffline: {
    backgroundColor: SUCCESS_LIGHT,
    borderLeftColor: SUCCESS,
  },

  eventOnline: {
    backgroundColor: INFO_LIGHT,
    borderLeftColor: INFO,
  },

  eventPending: {
    backgroundColor: WARNING_LIGHT,
    borderLeftColor: WARNING,
  },

  eventTime: {
    fontFamily: "DMSans_700Bold",
    fontSize: 6.5,
  },

  eventName: {
    marginTop: 2,
    fontFamily: "DMSans_500Medium",
    fontSize: 7,
  },

  moreEventsText: {
    marginTop: 1,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 6,
  },

  /* WEEK / DAY */

  weekWrap: {
    paddingHorizontal: 12,
    gap: 10,
  },

  weekDayCard: {
    padding: 12,
    borderRadius: 17,
    backgroundColor: "#FBFCFA",
    borderWidth: 1,
    borderColor: BORDER,
  },

  weekDayCardToday: {
    borderColor: GOLD,
    backgroundColor: "#FFFCF2",
  },

  weekDayHeader: {
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  weekWeekday: {
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 16,
  },

  weekDate: {
    marginTop: 2,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 7,
  },

  bookingCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: MINT,
  },

  bookingCountText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 6.5,
  },

  noBookingText: {
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },

  dayWrap: {
    paddingHorizontal: 12,
  },

  dayHero: {
    marginBottom: 11,
    minHeight: 76,
    padding: 12,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: MINT,
  },

  dayHeroIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  dayHeroTitle: {
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 17,
  },

  dayHeroDate: {
    marginTop: 2,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 7,
  },

  dayHeroCount: {
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 24,
  },

  listGap: {
    gap: 8,
  },

  listCard: {
    minHeight: 78,
    padding: 9,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  listTimeBox: {
    width: 76,
    minHeight: 58,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  listTime: {
    fontFamily: "DMSans_700Bold",
    fontSize: 8,
    textAlign: "center",
  },

  listType: {
    marginTop: 4,
    fontFamily: "DMSans_700Bold",
    fontSize: 5.5,
  },

  listPatient: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  listSymptoms: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 7,
  },

  listStatus: {
    marginTop: 5,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 6,
  },

  emptyState: {
    paddingVertical: 30,
    alignItems: "center",
  },

  emptyIcon: {
    width: 54,
    height: 54,
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
    fontSize: 16,
  },

  emptyText: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },

  bottomHint: {
    marginHorizontal: 15,
    marginTop: 15,
    minHeight: 46,
    paddingHorizontal: 13,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF7E2",
  },

  bottomHintText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    color: "#6E643E",
    fontSize: 8,
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
      Platform.OS === "web" ? 35 : 58,
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
    fontFamily: "DMSans_400Regular",
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

  /* SHEETS / MODALS */

  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(5, 28, 19, .72)",
  },

  detailsSheet: {
    maxHeight: "92%",
    paddingTop: 10,
    paddingHorizontal: 17,
    paddingBottom:
      Platform.OS === "ios" ? 30 : 19,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: CREAM,
  },

  actionSheet: {
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom:
      Platform.OS === "ios" ? 30 : 20,
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

  detailsHeader: {
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
    fontSize: 25,
  },

  sheetClose: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  patientHero: {
    minHeight: 76,
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

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },

  statusBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 5.5,
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
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 9,
    lineHeight: 15,
  },

  actionList: {
    marginTop: 14,
    gap: 8,
  },

  primaryAction: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  primaryActionText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 9,
  },

  fieldLabel: {
    marginTop: 8,
    marginBottom: 7,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 7.5,
    letterSpacing: 0.8,
  },

  pickerButton: {
    minHeight: 54,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  pickerValue: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  textArea: {
    minHeight: 108,
    padding: 13,
    borderRadius: 16,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 10,
    lineHeight: 17,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  goldPrimaryButton: {
    minHeight: 50,
    marginTop: 18,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: GOLD,
  },

  goldPrimaryButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  dangerPrimaryButton: {
    minHeight: 50,
    marginTop: 18,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: DANGER,
  },

  dangerPrimaryButtonText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 10,
  },

  /* CONFIRM / NOTICE */

  modalCenterRoot: {
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
    borderColor:
      "rgba(214,180,91,.42)",
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

  cancelButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
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

  confirmButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  noticeCard: {
    width: "100%",
    maxWidth: 380,
    paddingTop: 27,
    paddingBottom: 21,
    paddingHorizontal: 21,
    borderRadius: 28,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor:
      "rgba(214,180,91,.42)",
    elevation: 18,
  },

  noticeIconOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  noticeSuccess: {
    backgroundColor: SUCCESS_LIGHT,
  },

  noticeError: {
    backgroundColor: DANGER_LIGHT,
  },

  noticeWarning: {
    backgroundColor: WARNING_LIGHT,
  },

  noticeInfo: {
    backgroundColor: INFO_LIGHT,
  },

  noticeIconInner: {
    width: 57,
    height: 57,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  noticeEyebrow: {
    marginTop: 15,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7.5,
    letterSpacing: 1.2,
  },

  noticeTitle: {
    marginTop: 6,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 24,
    textAlign: "center",
  },

  noticeMessage: {
    marginTop: 8,
    maxWidth: 310,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 17,
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
    fontSize: 10,
  },
});
