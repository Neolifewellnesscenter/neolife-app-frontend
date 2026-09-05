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
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
const GREEN_2 = "#155741";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_DARK = "#A98632";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#738179";
const BORDER = "#E6EBE7";
const DANGER = "#B95045";
const DANGER_LIGHT = "#FBECE9";
const WARNING = "#B77C16";
const WARNING_LIGHT = "#FFF5DD";
const INFO = "#2F6E8D";
const INFO_LIGHT = "#EDF6FB";
const SUCCESS = "#287146";
const SUCCESS_LIGHT = "#EBF7EF";

type Summary = {
  todayAppointments: number;
  pendingConsultationRequests: number;
  totalPatients: number;
  completedConsultations: number;
  upcomingAppointments: number;
};

type ScheduleItem = {
  id?: number | string;
  appointmentId?: number | string;
  consultationId?: number | string;
  patientId?: number | string;
  patientName?: string;
  userName?: string;
  name?: string;
  appointmentDate?: string;
  consultationDate?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  appointmentTime?: string;
  consultationTime?: string;
  symptoms?: string;
  reason?: string;
  healthConcern?: string;
  appointmentMode?: string;
  appointmentType?: string;
  type?: string;
  status?: string;
  consultationStatus?: string;
  scheduleKind?: "APPOINTMENT" | "CONSULTATION" | "WALK_IN" | string;
};

type ConsultationRequest = ScheduleItem & {
  preferredDate?: string;
  preferredTime?: string;
};

type RecentPatient = {
  id?: number | string;
  patientId?: number | string;
  name?: string;
  patientName?: string;
  patientCode?: string;
  lastVisit?: string;
  totalVisits?: number;
  visits?: number;
};

type Transaction = {
  id?: number | string;
  patientName?: string;
  amount?: number;
  status?: string;
  paymentStatus?: string;
  type?: string;
};

type NoticeState = {
  visible: boolean;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
};

const EMPTY_SUMMARY: Summary = {
  todayAppointments: 0,
  pendingConsultationRequests: 0,
  totalPatients: 0,
  completedConsultations: 0,
  upcomingAppointments: 0,
};

export default function DoctorDashboardScreen() {
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
  const [doctorName, setDoctorName] = useState("Doctor");
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [hasOnline, setHasOnline] = useState<boolean | null>(null);
  const [hasOffline, setHasOffline] = useState<boolean | null>(null);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [todaySchedule, setTodaySchedule] = useState<ScheduleItem[]>([]);
  const [upcoming, setUpcoming] = useState<ScheduleItem[]>([]);
  const [onlineRequests, setOnlineRequests] = useState<ConsultationRequest[]>([]);
  const [recentPatients, setRecentPatients] = useState<RecentPatient[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [notice, setNotice] = useState<NoticeState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const [confirmAction, setConfirmAction] = useState<{
    visible: boolean;
    id: string;
    action: "accept" | "logout" | null;
  }>({ visible: false, id: "", action: null });

  const [rejectModal, setRejectModal] = useState({ visible: false, id: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [rescheduleModal, setRescheduleModal] = useState({ visible: false, id: "" });
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const doctorInitial = useMemo(() => {
    const clean = doctorName.replace(/^Dr\.?\s*/i, "").trim();
    return (clean || doctorName || "D").charAt(0).toUpperCase();
  }, [doctorName]);

  const currentDate = useMemo(() => {
    const now = new Date();
    return {
      day: now.toLocaleDateString("en-IN", { weekday: "long" }),
      date: now.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    };
  }, []);

  const showNotice = useCallback(
    (type: NoticeState["type"], title: string, message: string) => {
      setNotice({ visible: true, type, title, message });
    },
    []
  );

  const clearAuth = useCallback(async () => {
    await AsyncStorage.multiRemove([
      "doctorToken",
      "doctorRefreshToken",
      "token",
      "refreshToken",
      "doctorId",
      "doctorName",
      "doctorHasOnline",
      "doctorHasOffline",
      "role",
      "userId",
      "email",
      "profileCompleted",
      "isLoggedIn",
    ]);
  }, []);

  const doctorApiRequest = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const doctorToken = await AsyncStorage.getItem("doctorToken");
      const token = doctorToken || (await AsyncStorage.getItem("token"));

      if (!token) {
        await clearAuth();
        router.replace("/login" as any);
        throw new Error("Doctor login required.");
      }

      const headers: Record<string, string> = {
        Accept: "application/json",
        ...((options.headers as Record<string, string>) || {}),
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

      if (text) {
        try {
          result = JSON.parse(text);
        } catch {
          result = { success: false, message: `Invalid response from server (${response.status}).` };
        }
      }

      if (response.status === 401 || response.status === 403) {
        await clearAuth();
        router.replace("/login" as any);
        throw new Error(result?.message || "Doctor session expired.");
      }

      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || "Request failed.");
      }

      return result;
    },
    [clearAuth]
  );

  const requireDoctorLogin = useCallback(async () => {
    const token =
      (await AsyncStorage.getItem("doctorToken")) ||
      (await AsyncStorage.getItem("token"));
    const role = String((await AsyncStorage.getItem("role")) || "").toUpperCase();

    if (!token || role !== "DOCTOR") {
      await clearAuth();
      router.replace("/login" as any);
      return false;
    }
    return true;
  }, [clearAuth]);

  const loadDoctorProfile = useCallback(async () => {
    try {
      const result = await doctorApiRequest("/doctors/my-profile");
      const doctor = result?.data || {};
      const name = doctor.name || doctor.doctorName || "Doctor";

      setDoctorName(name);
      await AsyncStorage.setItem("doctorName", name);

      if (doctor.id != null) {
        const value = String(doctor.id);
        setDoctorId(value);
        await AsyncStorage.setItem("doctorId", value);
      }
    } catch (error: any) {
      const savedName = (await AsyncStorage.getItem("doctorName")) || "Doctor";
      setDoctorName(savedName);
      showNotice("error", "Profile Unavailable", error?.message || "Unable to load doctor profile.");
    }
  }, [doctorApiRequest, showNotice]);

  const loadDoctorModes = useCallback(async () => {
    let id = doctorId;
    if (!id) id = await AsyncStorage.getItem("doctorId");
    if (!id) return;

    try {
      const result = await doctorApiRequest(`/doctor-availability/doctor/${encodeURIComponent(id)}`);
      const raw = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.data?.content)
        ? result.data.content
        : [];

      const active = raw.filter((slot: any) => slot?.active !== false && slot?.isActive !== false);
      const modes = active.map((slot: any) =>
        String(slot?.appointmentMode || slot?.mode || slot?.consultationMode || "").toUpperCase()
      );
      const online = modes.includes("ONLINE");
      const offline = modes.includes("OFFLINE");
      setHasOnline(online);
      setHasOffline(offline);
      await AsyncStorage.setItem("doctorHasOnline", String(online));
      await AsyncStorage.setItem("doctorHasOffline", String(offline));
    } catch {
      setHasOnline(null);
      setHasOffline(null);
    }
  }, [doctorApiRequest, doctorId]);

  const loadSummary = useCallback(async () => {
    const result = await doctorApiRequest("/doctor-dashboard/summary");
    const data = result?.data || {};
    setSummary({
      todayAppointments: Number(data.todayAppointments || 0),
      pendingConsultationRequests: Number(data.pendingConsultationRequests || 0),
      totalPatients: Number(data.totalPatients || 0),
      completedConsultations: Number(data.completedConsultations || 0),
      upcomingAppointments: Number(data.upcomingAppointments || 0),
    });
  }, [doctorApiRequest]);

  const loadToday = useCallback(async () => {
    const today = toApiDate(new Date());
    const [dashboardResult, walkInResult] = await Promise.allSettled([
      doctorApiRequest("/doctor-dashboard/today"),
      doctorApiRequest(`/walk-in-patients/doctor/date/${encodeURIComponent(today)}`),
    ]);

    if (dashboardResult.status === "rejected") throw dashboardResult.reason;

    const data = dashboardResult.value?.data || {};
    const appointments = Array.isArray(data.appointments) ? data.appointments : [];
    const consultations = Array.isArray(data.consultations) ? data.consultations : [];
    const walkIns =
      walkInResult.status === "fulfilled" && Array.isArray(walkInResult.value?.data)
        ? walkInResult.value.data
        : [];

    const merged: ScheduleItem[] = [
      ...appointments.map((a: any) => ({
        ...a,
        scheduleKind: "APPOINTMENT",
        appointmentType: a.appointmentMode || a.appointmentType || "OFFLINE",
      })),
      ...consultations.map((c: any) => ({
        ...c,
        scheduleKind: "CONSULTATION",
        appointmentType: "ONLINE",
      })),
      ...walkIns.map((w: any) => ({
        ...w,
        patientName: w.name || w.patientName || "Walk-in Patient",
        scheduleKind: "WALK_IN",
        appointmentType: "WALK-IN",
      })),
    ];

    merged.sort((a, b) => getItemTime(a).localeCompare(getItemTime(b)));
    setTodaySchedule(merged.slice(0, 6));
  }, [doctorApiRequest]);

  const loadUpcoming = useCallback(async () => {
    const result = await doctorApiRequest("/doctor-dashboard/upcoming");
    const data = result?.data;
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.appointments)
      ? data.appointments
      : Array.isArray(data?.items)
      ? data.items
      : [];
    setUpcoming(list.slice(0, 6));
  }, [doctorApiRequest]);

  const loadOnlineRequests = useCallback(async () => {
    const result = await doctorApiRequest("/consultations/doctor/requests");
    setOnlineRequests(Array.isArray(result?.data) ? result.data.slice(0, 4) : []);
  }, [doctorApiRequest]);

  const loadPatients = useCallback(async () => {
    const result = await doctorApiRequest("/doctor-dashboard/patients");
    setRecentPatients(Array.isArray(result?.data) ? result.data.slice(0, 5) : []);
  }, [doctorApiRequest]);

  const loadTransactions = useCallback(async () => {
    const result = await doctorApiRequest("/doctor-dashboard/transactions");
    setTransactions(Array.isArray(result?.data) ? result.data.slice(0, 5) : []);
  }, [doctorApiRequest]);

  const refreshDashboard = useCallback(async () => {
    const results = await Promise.allSettled([
      loadSummary(),
      loadToday(),
      loadUpcoming(),
      loadOnlineRequests(),
      loadPatients(),
      loadTransactions(),
    ]);

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0 && failed.length === results.length) {
      showNotice("error", "Dashboard Unavailable", "We couldn't load the doctor dashboard. Pull down to try again.");
    }
  }, [loadOnlineRequests, loadPatients, loadSummary, loadToday, loadTransactions, loadUpcoming, showNotice]);

  const initialize = useCallback(async () => {
    setLoading(true);
    const allowed = await requireDoctorLogin();
    if (!allowed) return;
    await loadDoctorProfile();
    await loadDoctorModes();
    await refreshDashboard();
    setLoading(false);
  }, [loadDoctorModes, loadDoctorProfile, refreshDashboard, requireDoctorLogin]);

  useEffect(() => {
    initialize();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDashboard();
    setRefreshing(false);
  }, [refreshDashboard]);

  async function acceptConsultation(id: string) {
    setActionLoading(true);
    try {
      const result = await doctorApiRequest(`/consultations/${encodeURIComponent(id)}/accept`, {
        method: "PUT",
      });
      setConfirmAction({ visible: false, id: "", action: null });
      showNotice("success", "Request Accepted", result?.message || "Consultation accepted successfully.");
      await Promise.allSettled([loadSummary(), loadToday(), loadUpcoming(), loadOnlineRequests()]);
    } catch (error: any) {
      showNotice("error", "Unable to Accept", error?.message || "Consultation could not be accepted.");
    } finally {
      setActionLoading(false);
    }
  }

  async function submitReschedule() {
    if (!rescheduleDate) {
      showNotice("warning", "Date Required", "Please select a new consultation date.");
      return;
    }
    if (!rescheduleTime) {
      showNotice("warning", "Time Required", "Please select a new consultation time.");
      return;
    }
    if (!rescheduleReason.trim()) {
      showNotice("warning", "Message Required", "Please enter a message for the patient.");
      return;
    }

    setActionLoading(true);
    try {
      const result = await doctorApiRequest(
        `/consultations/${encodeURIComponent(rescheduleModal.id)}/reschedule`,
        {
          method: "PUT",
          body: JSON.stringify({
            newDate: rescheduleDate,
            newTime: normalizeApiTime(rescheduleTime),
            reason: rescheduleReason.trim(),
          }),
        }
      );
      setRescheduleModal({ visible: false, id: "" });
      setRescheduleDate("");
      setRescheduleTime("");
      setRescheduleReason("");
      showNotice("success", "Consultation Rescheduled", result?.message || "Consultation rescheduled successfully.");
      await Promise.allSettled([loadSummary(), loadToday(), loadUpcoming(), loadOnlineRequests()]);
    } catch (error: any) {
      showNotice("error", "Unable to Reschedule", error?.message || "Consultation could not be rescheduled.");
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectConsultation() {
    const reason = rejectReason.trim();
    if (!reason) {
      showNotice("warning", "Reason Required", "Please enter the reason for rejecting this consultation.");
      return;
    }

    setActionLoading(true);
    try {
      const result = await doctorApiRequest(`/consultations/${encodeURIComponent(rejectModal.id)}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      });
      setRejectModal({ visible: false, id: "" });
      setRejectReason("");
      showNotice("success", "Request Rejected", result?.message || "Consultation rejected successfully.");
      await Promise.allSettled([loadSummary(), loadToday(), loadUpcoming(), loadOnlineRequests()]);
    } catch (error: any) {
      showNotice("error", "Unable to Reject", error?.message || "Consultation could not be rejected.");
    } finally {
      setActionLoading(false);
    }
  }

  async function logoutDoctor() {
    await clearAuth();
    setConfirmAction({ visible: false, id: "", action: null });
    router.replace("/login" as any);
  }

  function openDoctorRoute(route: string) {
    setMenuOpen(false);
    router.push(route as any);
  }

  function openScheduleItem(item: ScheduleItem) {
    const id = String(item.id || item.appointmentId || item.consultationId || "");
    if (!id) return;

    if (String(item.scheduleKind || "").toUpperCase() === "CONSULTATION") {
      router.push({ pathname: "/doctor/consultations" as any, params: { consultationId: id } } as any);
    } else {
      router.push({ pathname: "/doctor/appointments" as any, params: { appointmentId: id } } as any);
    }
  }

  if (!dmLoaded || !playfairLoaded || loading) {
    return (
      <View style={styles.loader}>
        <View style={styles.loaderLogoWrap}>
          <Image source={require("../../assets/images/main_logo.jpeg")} style={styles.loaderLogo} />
        </View>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loaderTitle}>Doctor Workspace</Text>
        <Text style={styles.loaderText}>Preparing your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerMenu} onPress={() => setMenuOpen(true)}>
          <Ionicons name="menu-outline" size={25} color={GREEN} />
        </TouchableOpacity>

        <View style={styles.headerBrand}>
          <Image source={require("../../assets/images/main_logo.jpeg")} style={styles.headerLogo} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Doctor Portal</Text>
            <Text style={styles.headerSub}>NeoLife Wellness Center</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push("/doctor/notifications" as any)}>
          <Ionicons name="notifications-outline" size={20} color={GREEN} />
          {summary.pendingConsultationRequests > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {summary.pendingConsultationRequests > 9 ? "9+" : summary.pendingConsultationRequests}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.avatar} onPress={() => router.push("/doctor/profile" as any)}>
          <Text style={styles.avatarText}>{doctorInitial}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} colors={[GREEN]} />}
        contentContainerStyle={{ paddingBottom: 38 }}
      >
        <View style={styles.hero}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="medical-outline" size={13} color={GOLD_LIGHT} />
              <Text style={styles.heroBadgeText}>DOCTOR WORKSPACE</Text>
            </View>
            <View style={styles.datePill}>
              <Text style={styles.dateDay}>{currentDate.day}</Text>
              <Text style={styles.dateText}>{currentDate.date}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Welcome back,{"\n"}{doctorName}</Text>
          <Text style={styles.heroText}>
            Your day at a glance. Review appointments, respond to online requests and stay on top of patient care.
          </Text>
        </View>

        <View style={styles.quickActionsWrap}>
          <QuickAction icon="calendar-outline" title="Appointments" onPress={() => router.push("/doctor/appointments" as any)} />
          <QuickAction icon="videocam-outline" title="Consultations" onPress={() => router.push("/doctor/consultations" as any)} />
          <QuickAction icon="people-outline" title="Patients" onPress={() => router.push("/doctor/patients" as any)} />
          <QuickAction icon="time-outline" title="Availability" onPress={() => router.push("/doctor/availability" as any)} />
        </View>

        <SectionHeader eyebrow="TODAY AT A GLANCE" title="Your Dashboard" text="The most important numbers for your clinical day." />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryRow}>
          <SummaryCard icon="calendar" label="Today's Appointments" value={summary.todayAppointments} tone="green" />
          <SummaryCard icon="videocam" label="Pending Online" value={summary.pendingConsultationRequests} tone="warning" />
          <SummaryCard icon="people" label="Total Patients" value={summary.totalPatients} tone="blue" />
          <SummaryCard icon="checkmark-circle" label="Completed Consults" value={summary.completedConsultations} tone="gold" />
          <SummaryCard icon="calendar-number" label="Upcoming" value={summary.upcomingAppointments} tone="red" />
        </ScrollView>

        <DashboardPanel
          eyebrow="TODAY"
          title="Today's Schedule"
          subtitle="Appointments, consultations and walk-ins arranged by time."
          actionLabel="View All"
          onAction={() => router.push("/doctor/appointments" as any)}
        >
          {todaySchedule.length === 0 ? (
            <EmptyState icon="calendar-outline" title="No appointments today" text="Your schedule is currently clear." />
          ) : (
            todaySchedule.map((item, index) => (
              <ScheduleCard key={`${item.scheduleKind}-${item.id || index}`} item={item} onPress={() => openScheduleItem(item)} />
            ))
          )}
        </DashboardPanel>

        <DashboardPanel
          eyebrow="ACTION NEEDED"
          title="Online Consultation Requests"
          subtitle="Requests waiting for your confirmation."
          actionLabel="View All"
          onAction={() => router.push("/doctor/consultations" as any)}
        >
          {onlineRequests.length === 0 ? (
            <EmptyState icon="videocam-off-outline" title="No pending requests" text="New consultation requests will appear here." />
          ) : (
            onlineRequests.map((request, index) => {
              const id = String(request.id || request.consultationId || "");
              return (
                <RequestCard
                  key={id || String(index)}
                  request={request}
                  onAccept={() => setConfirmAction({ visible: true, id, action: "accept" })}
                  onReschedule={() => {
                    setRescheduleDate("");
                    setRescheduleTime("");
                    setRescheduleReason("");
                    setRescheduleModal({ visible: true, id });
                  }}
                  onReject={() => {
                    setRejectReason("");
                    setRejectModal({ visible: true, id });
                  }}
                />
              );
            })
          )}
        </DashboardPanel>

        <DashboardPanel
          eyebrow="NEXT UP"
          title="Upcoming Schedule"
          subtitle="Your next appointments and consultations."
          actionLabel="Full Schedule"
          onAction={() => router.push("/doctor/schedule" as any)}
        >
          {upcoming.length === 0 ? (
            <EmptyState icon="time-outline" title="No upcoming schedule" text="Upcoming confirmed and pending visits will appear here." />
          ) : (
            upcoming.map((item, index) => (
              <ScheduleCard key={`upcoming-${item.id || index}`} item={item} showDate onPress={() => openScheduleItem(item)} />
            ))
          )}
        </DashboardPanel>

        <DashboardPanel
          eyebrow="PATIENT CARE"
          title="Recent Patients"
          subtitle="Quick access to recently consulted patients."
          actionLabel="All Patients"
          onAction={() => router.push("/doctor/patients" as any)}
        >
          {recentPatients.length === 0 ? (
            <EmptyState icon="people-outline" title="No recent patients" text="Recent patient activity will appear here." />
          ) : (
            recentPatients.map((patient, index) => (
              <PatientRow
                key={String(patient.id || patient.patientId || index)}
                patient={patient}
                onPress={() =>
                  router.push({
                    pathname: "/doctor/patients" as any,
                    params: { patientId: String(patient.id || patient.patientId || "") },
                  } as any)
                }
              />
            ))
          )}
        </DashboardPanel>

        <DashboardPanel
          eyebrow="FINANCE"
          title="Recent Transactions"
          subtitle="Latest consultation and appointment payments."
          actionLabel="View Transactions"
          onAction={() => router.push("/doctor/transactions" as any)}
        >
          {transactions.length === 0 ? (
            <EmptyState icon="wallet-outline" title="No recent transactions" text="Recent payment activity will appear here." />
          ) : (
            transactions.map((transaction, index) => (
              <TransactionRow key={String(transaction.id || index)} transaction={transaction} />
            ))
          )}
        </DashboardPanel>
      </ScrollView>

      <Modal visible={menuOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.drawerRoot}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setMenuOpen(false)} />
          <View style={styles.drawer}>
            <View style={styles.drawerBrandRow}>
              <Image source={require("../../assets/images/main_logo.jpeg")} style={styles.drawerLogo} />
              <View style={{ flex: 1 }}>
                <Text style={styles.drawerBrand}>NeoLife</Text>
                <Text style={styles.drawerSub}>Doctor Portal</Text>
              </View>
              <TouchableOpacity style={styles.drawerClose} onPress={() => setMenuOpen(false)}>
                <Ionicons name="close" size={22} color={GREEN} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              <Text style={styles.drawerLabel}>MAIN</Text>
              <DrawerItem icon="grid-outline" label="Dashboard" active onPress={() => setMenuOpen(false)} />
              <DrawerItem icon="people-outline" label="Patient Dashboard" onPress={() => openDoctorRoute("/doctor/patients")} />
              <DrawerItem icon="calendar-outline" label="Appointment Calendar" onPress={() => openDoctorRoute("/doctor/calendar")} />
              <DrawerItem icon="calendar-number-outline" label="Upcoming Schedule" onPress={() => openDoctorRoute("/doctor/schedule")} />
              <DrawerItem icon="time-outline" label="Manage Availability" onPress={() => openDoctorRoute("/doctor/availability")} />

              <Text style={styles.drawerLabel}>CLINICAL</Text>
              {(hasOffline !== false || hasOffline === null) && (
                <DrawerItem icon="clipboard-outline" label="Appointment Details" onPress={() => openDoctorRoute("/doctor/appointments")} />
              )}
              {(hasOnline !== false || hasOnline === null) && (
                <DrawerItem icon="videocam-outline" label="Consultation Details" onPress={() => openDoctorRoute("/doctor/consultations")} />
              )}

              <Text style={styles.drawerLabel}>ACCOUNT</Text>
              <DrawerItem icon="wallet-outline" label="Transactions" onPress={() => openDoctorRoute("/doctor/transactions")} />
              <DrawerItem icon="person-circle-outline" label="My Profile" onPress={() => openDoctorRoute("/doctor/profile")} />

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                  setMenuOpen(false);
                  setConfirmAction({ visible: true, id: "", action: "logout" });
                }}
              >
                <Ionicons name="log-out-outline" size={20} color={WHITE} />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={confirmAction.visible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.centerModalRoot}>
          <Pressable
            style={styles.centerModalBackdrop}
            onPress={() => !actionLoading && setConfirmAction({ visible: false, id: "", action: null })}
          />
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons
                name={confirmAction.action === "logout" ? "log-out-outline" : "checkmark-circle-outline"}
                size={30}
                color={confirmAction.action === "logout" ? DANGER : SUCCESS}
              />
            </View>
            <Text style={styles.modalEyebrow}>NEOLIFE DOCTOR PORTAL</Text>
            <Text style={styles.modalTitle}>{confirmAction.action === "logout" ? "Logout?" : "Accept Consultation?"}</Text>
            <Text style={styles.modalMessage}>
              {confirmAction.action === "logout"
                ? "You will need to sign in again to access your doctor workspace."
                : "Confirm that you want to accept this online consultation request."}
            </Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.secondaryModalButton}
                disabled={actionLoading}
                onPress={() => setConfirmAction({ visible: false, id: "", action: null })}
              >
                <Text style={styles.secondaryModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryModalButton, confirmAction.action === "logout" && { backgroundColor: DANGER }]}
                disabled={actionLoading}
                onPress={() =>
                  confirmAction.action === "logout" ? logoutDoctor() : acceptConsultation(confirmAction.id)
                }
              >
                {actionLoading ? <ActivityIndicator size="small" color={WHITE} /> : <Text style={styles.primaryModalButtonText}>{confirmAction.action === "logout" ? "Logout" : "Accept"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      <Modal visible={rescheduleModal.visible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setRescheduleModal({ visible: false, id: "" })}>
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={() => !actionLoading && setRescheduleModal({ visible: false, id: "" })} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>CONSULTATION REQUEST</Text>
                <Text style={styles.sheetTitle}>Reschedule Consultation</Text>
              </View>
              <TouchableOpacity style={styles.sheetClose} onPress={() => setRescheduleModal({ visible: false, id: "" })}>
                <Ionicons name="close" size={21} color={GREEN} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>NEW CONSULTATION DATE</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={19} color={GOLD_DARK} />
              <Text style={[styles.pickerValue, !rescheduleDate && { color: "#98A39D" }]}>
                {rescheduleDate ? formatDate(rescheduleDate) : "Choose a date"}
              </Text>
              <Ionicons name="chevron-down" size={17} color={GREEN} />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={rescheduleDate ? new Date(`${rescheduleDate}T12:00:00`) : new Date()}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === "android" ? "calendar" : "spinner"}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === "android") setShowDatePicker(false);
                  if (event?.type === "dismissed" || !selectedDate) return;
                  setRescheduleDate(toApiDate(selectedDate));
                }}
              />
            )}

            <Text style={styles.inputLabel}>NEW CONSULTATION TIME</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
              <Ionicons name="time-outline" size={19} color={GOLD_DARK} />
              <Text style={[styles.pickerValue, !rescheduleTime && { color: "#98A39D" }]}>
                {rescheduleTime ? formatTime(rescheduleTime) : "Choose a time"}
              </Text>
              <Ionicons name="chevron-down" size={17} color={GREEN} />
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={timeStringToDate(rescheduleTime)}
                mode="time"
                display={Platform.OS === "android" ? "clock" : "spinner"}
                onChange={(event, selectedTime) => {
                  if (Platform.OS === "android") setShowTimePicker(false);
                  if (event?.type === "dismissed" || !selectedTime) return;
                  const hh = String(selectedTime.getHours()).padStart(2, "0");
                  const mm = String(selectedTime.getMinutes()).padStart(2, "0");
                  setRescheduleTime(`${hh}:${mm}`);
                }}
              />
            )}

            <Text style={styles.inputLabel}>MESSAGE TO PATIENT</Text>
            <TextInput
              value={rescheduleReason}
              onChangeText={setRescheduleReason}
              multiline
              textAlignVertical="top"
              placeholder="Explain the revised date and time..."
              placeholderTextColor="#98A39D"
              style={styles.reasonInput}
            />

            <TouchableOpacity style={styles.rescheduleSubmit} disabled={actionLoading} onPress={submitReschedule}>
              {actionLoading ? (
                <ActivityIndicator color={GREEN} />
              ) : (
                <>
                  <Text style={styles.rescheduleSubmitText}>Confirm Reschedule</Text>
                  <Ionicons name="calendar-outline" size={18} color={GREEN} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={rejectModal.visible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setRejectModal({ visible: false, id: "" })}>
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={() => !actionLoading && setRejectModal({ visible: false, id: "" })} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>CONSULTATION REQUEST</Text>
                <Text style={styles.sheetTitle}>Reject Consultation</Text>
              </View>
              <TouchableOpacity style={styles.sheetClose} onPress={() => setRejectModal({ visible: false, id: "" })}>
                <Ionicons name="close" size={21} color={GREEN} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>REASON FOR REJECTION</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              textAlignVertical="top"
              placeholder="Explain the reason to the patient..."
              placeholderTextColor="#98A39D"
              style={styles.reasonInput}
            />
            <TouchableOpacity style={styles.rejectSubmit} disabled={actionLoading} onPress={rejectConsultation}>
              {actionLoading ? <ActivityIndicator color={WHITE} /> : <><Text style={styles.rejectSubmitText}>Reject Request</Text><Ionicons name="close-circle-outline" size={18} color={WHITE} /></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={notice.visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setNotice((n) => ({ ...n, visible: false }))}>
        <View style={styles.centerModalRoot}>
          <Pressable style={styles.centerModalBackdrop} onPress={() => setNotice((n) => ({ ...n, visible: false }))} />
          <View style={styles.noticeCard}>
            <View style={[styles.noticeIcon, { backgroundColor: noticeTone(notice.type).bg }]}>
              <Ionicons name={noticeTone(notice.type).icon as any} size={31} color={noticeTone(notice.type).fg} />
            </View>
            <Text style={styles.modalEyebrow}>NEOLIFE DOCTOR PORTAL</Text>
            <Text style={styles.modalTitle}>{notice.title}</Text>
            <Text style={styles.modalMessage}>{notice.message}</Text>
            <TouchableOpacity style={styles.noticeButton} onPress={() => setNotice((n) => ({ ...n, visible: false }))}>
              <Text style={styles.noticeButtonText}>Okay</Text>
              <Ionicons name="checkmark" size={18} color={GREEN} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SectionHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

function QuickAction({ icon, title, onPress }: { icon: any; title: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickAction} activeOpacity={0.86} onPress={onPress}>
      <View style={styles.quickActionIcon}><Ionicons name={icon} size={21} color={GREEN} /></View>
      <Text style={styles.quickActionText} numberOfLines={2}>{title}</Text>
    </TouchableOpacity>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: any; label: string; value: number; tone: "green" | "warning" | "blue" | "gold" | "red" }) {
  const palette = {
    green: { bg: SUCCESS_LIGHT, fg: SUCCESS },
    warning: { bg: WARNING_LIGHT, fg: WARNING },
    blue: { bg: INFO_LIGHT, fg: INFO },
    gold: { bg: "#FFF7DD", fg: GOLD_DARK },
    red: { bg: DANGER_LIGHT, fg: DANGER },
  }[tone];

  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: palette.bg }]}><Ionicons name={icon} size={22} color={palette.fg} /></View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function DashboardPanel({ eyebrow, title, subtitle, actionLabel, onAction, children }: any) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.panelEyebrow}>{eyebrow}</Text>
          <Text style={styles.panelTitle}>{title}</Text>
          <Text style={styles.panelSub}>{subtitle}</Text>
        </View>
        <TouchableOpacity style={styles.panelAction} onPress={onAction}>
          <Text style={styles.panelActionText}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={14} color={GOLD_DARK} />
        </TouchableOpacity>
      </View>
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

function ScheduleCard({ item, onPress, showDate = false }: { item: ScheduleItem; onPress: () => void; showDate?: boolean }) {
  const mode = String(item.appointmentType || item.appointmentMode || item.type || (item.scheduleKind === "CONSULTATION" ? "ONLINE" : "OFFLINE")).toUpperCase();
  const name = item.patientName || item.userName || item.name || "Patient";
  const symptoms = item.symptoms || item.reason || item.healthConcern || "General consultation";
  const date = item.appointmentDate || item.consultationDate || item.date;
  const start = item.startTime || item.appointmentTime || item.consultationTime;
  const end = item.endTime;
  return (
    <TouchableOpacity style={styles.scheduleCard} activeOpacity={0.86} onPress={onPress}>
      <View style={styles.scheduleTimeBox}>
        <Text style={styles.scheduleTime}>{formatTime(start)}</Text>
        {end ? <Text style={styles.scheduleTimeEnd}>to {formatTime(end)}</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.scheduleName} numberOfLines={1}>{name}</Text>
        {showDate && date ? <Text style={styles.scheduleDate}>{formatDate(date)}</Text> : null}
        <Text style={styles.scheduleSymptoms} numberOfLines={1}>{symptoms}</Text>
      </View>
      <View style={[styles.modePill, mode === "ONLINE" ? styles.modeOnline : mode === "WALK-IN" ? styles.modeWalkin : styles.modeOffline]}>
        <Text style={[styles.modeText, mode === "ONLINE" ? { color: INFO } : mode === "WALK-IN" ? { color: GOLD_DARK } : { color: SUCCESS }]}>{mode}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={GREEN} />
    </TouchableOpacity>
  );
}

function RequestCard({ request, onAccept, onReschedule, onReject }: { request: ConsultationRequest; onAccept: () => void; onReschedule: () => void; onReject: () => void }) {
  const name = request.patientName || request.userName || "Patient";
  const date = request.consultationDate || request.preferredDate || request.date;
  const time = request.startTime || request.preferredTime || request.consultationTime;
  const symptoms = request.symptoms || request.healthConcern || "General consultation";
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.requestName}>{name}</Text>
          <Text style={styles.requestType}>Online Consultation</Text>
        </View>
        <View style={styles.pendingPill}><Text style={styles.pendingText}>PENDING</Text></View>
      </View>
      <View style={styles.requestInfoRow}>
        <InfoChip icon="calendar-outline" text={formatDate(date)} />
        <InfoChip icon="time-outline" text={formatTime(time)} />
      </View>
      <Text style={styles.requestSymptoms}><Text style={styles.requestSymptomsStrong}>Symptoms: </Text>{symptoms}</Text>
      <View style={styles.requestButtons}>
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}><Ionicons name="checkmark" size={16} color={WHITE} /><Text style={styles.acceptText}>Accept</Text></TouchableOpacity>
        <TouchableOpacity style={styles.rescheduleBtn} onPress={onReschedule}><Ionicons name="calendar-outline" size={16} color={WARNING} /><Text style={styles.rescheduleText}>Reschedule</Text></TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={onReject}><Ionicons name="close" size={16} color={DANGER} /><Text style={styles.rejectText}>Reject</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function InfoChip({ icon, text }: { icon: any; text: string }) {
  return <View style={styles.infoChip}><Ionicons name={icon} size={14} color={GREEN} /><Text style={styles.infoChipText}>{text}</Text></View>;
}

function PatientRow({ patient, onPress }: { patient: RecentPatient; onPress: () => void }) {
  const name = patient.name || patient.patientName || "Patient";
  return (
    <TouchableOpacity style={styles.simpleRow} onPress={onPress}>
      <View style={styles.patientAvatar}><Text style={styles.patientAvatarText}>{name.charAt(0).toUpperCase()}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.simpleRowTitle}>{name}</Text>
        <Text style={styles.simpleRowSub}>{patient.patientCode || "Patient record"}</Text>
      </View>
      <View style={styles.visitPill}><Text style={styles.visitPillText}>{Number(patient.totalVisits ?? patient.visits ?? 0)} visits</Text></View>
      <Ionicons name="chevron-forward" size={17} color={GREEN} />
    </TouchableOpacity>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const status = String(transaction.status || transaction.paymentStatus || "PENDING").toUpperCase();
  const paid = status === "SUCCESS" || status === "PAID";
  return (
    <View style={styles.simpleRow}>
      <View style={[styles.transactionIcon, { backgroundColor: paid ? SUCCESS_LIGHT : WARNING_LIGHT }]}><Ionicons name="wallet-outline" size={19} color={paid ? SUCCESS : WARNING} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.simpleRowTitle}>{transaction.patientName || "Patient"}</Text>
        <Text style={styles.simpleRowSub}>{transaction.type || "Consultation"}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.transactionAmount}>₹{Number(transaction.amount || 0).toLocaleString("en-IN")}</Text>
        <Text style={[styles.transactionStatus, { color: paid ? SUCCESS : WARNING }]}>{status}</Text>
      </View>
    </View>
  );
}

function EmptyState({ icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={26} color={GREEN} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function DrawerItem({ icon, label, onPress, active = false }: { icon: any; label: string; onPress: () => void; active?: boolean }) {
  return (
    <TouchableOpacity style={[styles.drawerItem, active && styles.drawerItemActive]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={active ? GREEN : GOLD} />
      <Text style={[styles.drawerItemText, active && { color: GREEN }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={active ? GREEN : "#ADC0B4"} style={{ marginLeft: "auto" }} />
    </TouchableOpacity>
  );
}

function getItemTime(item: ScheduleItem) {
  return String(item.startTime || item.appointmentTime || item.consultationTime || "23:59:59");
}

function formatTime(value?: string) {
  if (!value) return "--:--";
  const parts = String(value).split(":");
  const hour = Number(parts[0]);
  const minute = parts[1] || "00";
  if (!Number.isFinite(hour)) return String(value);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${minute} ${suffix}`;
}

function formatDate(value?: string) {
  if (!value) return "Date unavailable";
  const raw = String(value).substring(0, 10);
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function normalizeApiTime(value: string) {
  if (!value) return value;
  const parts = value.split(":");
  if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`;
  return value;
}

function timeStringToDate(value: string) {
  const date = new Date();
  if (!value) return date;
  const [h, m] = value.split(":").map(Number);
  if (Number.isFinite(h)) date.setHours(h);
  if (Number.isFinite(m)) date.setMinutes(m);
  date.setSeconds(0, 0);
  return date;
}

function toApiDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function noticeTone(type: NoticeState["type"]) {
  if (type === "success") return { bg: SUCCESS_LIGHT, fg: SUCCESS, icon: "checkmark-circle-outline" };
  if (type === "error") return { bg: DANGER_LIGHT, fg: DANGER, icon: "close-circle-outline" };
  if (type === "warning") return { bg: WARNING_LIGHT, fg: WARNING, icon: "alert-circle-outline" };
  return { bg: INFO_LIGHT, fg: INFO, icon: "information-circle-outline" };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: CREAM, paddingHorizontal: 24 },
  loaderLogoWrap: { width: 78, height: 78, borderRadius: 25, backgroundColor: WHITE, alignItems: "center", justifyContent: "center", marginBottom: 18, borderWidth: 1, borderColor: BORDER },
  loaderLogo: { width: 62, height: 62, borderRadius: 20 },
  loaderTitle: { marginTop: 14, fontFamily: "PlayfairDisplay_700Bold", color: GREEN, fontSize: 23 },
  loaderText: { marginTop: 5, fontFamily: "DMSans_400Regular", color: MUTED, fontSize: 11 },

  header: { minHeight: 74, paddingTop: Platform.OS === "web" ? 12 : 44, paddingBottom: 10, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER, zIndex: 50 },
  headerMenu: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: MINT },
  headerBrand: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  headerLogo: { width: 38, height: 38, borderRadius: 13 },
  headerTitle: { fontFamily: "DMSans_700Bold", color: GREEN, fontSize: 14 },
  headerSub: { marginTop: 1, fontFamily: "DMSans_500Medium", color: MUTED, fontSize: 8.5 },
  notificationBtn: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAF8", borderWidth: 1, borderColor: BORDER },
  notificationBadge: { position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: DANGER, borderWidth: 2, borderColor: WHITE },
  notificationBadgeText: { fontFamily: "DMSans_700Bold", color: WHITE, fontSize: 7 },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: GREEN },
  avatarText: { fontFamily: "DMSans_700Bold", color: WHITE, fontSize: 16 },

  hero: { margin: 15, padding: 21, borderRadius: 28, overflow: "hidden", backgroundColor: GREEN },
  heroGlowOne: { position: "absolute", width: 190, height: 190, borderRadius: 95, top: -90, right: -55, backgroundColor: "rgba(255,255,255,.07)" },
  heroGlowTwo: { position: "absolute", width: 140, height: 140, borderRadius: 70, right: 90, bottom: -100, backgroundColor: "rgba(214,180,91,.18)" },
  heroTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,.09)" },
  heroBadgeText: { fontFamily: "DMSans_700Bold", color: GOLD_LIGHT, fontSize: 7.5, letterSpacing: 1 },
  datePill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 13, backgroundColor: "rgba(255,255,255,.08)", borderWidth: 1, borderColor: "rgba(255,255,255,.13)", alignItems: "flex-end" },
  dateDay: { fontFamily: "DMSans_700Bold", color: GOLD_LIGHT, fontSize: 8.5 },
  dateText: { marginTop: 2, fontFamily: "DMSans_400Regular", color: "#D8E4DC", fontSize: 7.5 },
  heroTitle: { marginTop: 18, fontFamily: "PlayfairDisplay_700Bold", color: WHITE, fontSize: 29, lineHeight: 34 },
  heroText: { marginTop: 9, maxWidth: 360, fontFamily: "DMSans_400Regular", color: "#D2E0D7", fontSize: 11, lineHeight: 18 },

  quickActionsWrap: { marginHorizontal: 15, marginTop: -1, padding: 8, flexDirection: "row", gap: 7, borderRadius: 22, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER },
  quickAction: { flex: 1, minHeight: 78, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  quickActionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: MINT },
  quickActionText: { marginTop: 6, fontFamily: "DMSans_700Bold", color: GREEN, fontSize: 7.5, lineHeight: 10, textAlign: "center" },

  sectionHeader: { marginTop: 33, paddingHorizontal: 17 },
  sectionEyebrow: { fontFamily: "DMSans_700Bold", color: GOLD_DARK, fontSize: 8, letterSpacing: 1.2 },
  sectionTitle: { marginTop: 5, fontFamily: "PlayfairDisplay_700Bold", color: TEXT, fontSize: 26 },
  sectionText: { marginTop: 5, fontFamily: "DMSans_400Regular", color: MUTED, fontSize: 10, lineHeight: 16 },
  summaryRow: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 6, gap: 10 },
  summaryCard: { width: 132, minHeight: 145, padding: 14, borderRadius: 21, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER },
  summaryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  summaryValue: { marginTop: 13, fontFamily: "PlayfairDisplay_700Bold", color: GREEN, fontSize: 27 },
  summaryLabel: { marginTop: 4, fontFamily: "DMSans_500Medium", color: MUTED, fontSize: 8.5, lineHeight: 12 },

  panel: { marginHorizontal: 15, marginTop: 19, overflow: "hidden", borderRadius: 24, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER },
  panelHeader: { padding: 17, flexDirection: "row", alignItems: "flex-start", gap: 8, borderBottomWidth: 1, borderBottomColor: "#EEF1EE" },
  panelEyebrow: { fontFamily: "DMSans_700Bold", color: GOLD_DARK, fontSize: 7.5, letterSpacing: 1 },
  panelTitle: { marginTop: 4, fontFamily: "PlayfairDisplay_700Bold", color: GREEN, fontSize: 20 },
  panelSub: { marginTop: 4, maxWidth: 250, fontFamily: "DMSans_400Regular", color: MUTED, fontSize: 8.5, lineHeight: 13 },
  panelAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 11, backgroundColor: "#FFF8E6" },
  panelActionText: { fontFamily: "DMSans_700Bold", color: GOLD_DARK, fontSize: 7.5 },
  panelBody: { padding: 13, gap: 9 },

  scheduleCard: { minHeight: 72, padding: 10, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 17, backgroundColor: "#FBFCFA", borderWidth: 1, borderColor: "#E8ECE8" },
  scheduleTimeBox: { width: 66, minHeight: 49, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: MINT, paddingHorizontal: 4 },
  scheduleTime: { fontFamily: "DMSans_700Bold", color: GREEN, fontSize: 8.5, textAlign: "center" },
  scheduleTimeEnd: { marginTop: 2, fontFamily: "DMSans_400Regular", color: MUTED, fontSize: 6.5 },
  scheduleName: { fontFamily: "DMSans_700Bold", color: TEXT, fontSize: 10.5 },
  scheduleDate: { marginTop: 2, fontFamily: "DMSans_500Medium", color: GOLD_DARK, fontSize: 7.5 },
  scheduleSymptoms: { marginTop: 3, fontFamily: "DMSans_400Regular", color: MUTED, fontSize: 7.5 },
  modePill: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 10 },
  modeOnline: { backgroundColor: INFO_LIGHT },
  modeOffline: { backgroundColor: SUCCESS_LIGHT },
  modeWalkin: { backgroundColor: "#FFF7DD" },
  modeText: { fontFamily: "DMSans_700Bold", fontSize: 6.5 },

  requestCard: { padding: 14, borderRadius: 18, backgroundColor: "#FBFCFA", borderWidth: 1, borderColor: BORDER },
  requestTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  requestName: { fontFamily: "DMSans_700Bold", color: GREEN, fontSize: 12 },
  requestType: { marginTop: 2, fontFamily: "DMSans_400Regular", color: MUTED, fontSize: 8 },
  pendingPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: WARNING_LIGHT },
  pendingText: { fontFamily: "DMSans_700Bold", color: WARNING, fontSize: 6.5, letterSpacing: .5 },
  requestInfoRow: { marginTop: 11, flexDirection: "row", gap: 7 },
  infoChip: { flex: 1, minHeight: 35, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 11, backgroundColor: MINT },
  infoChipText: { flex: 1, fontFamily: "DMSans_500Medium", color: GREEN, fontSize: 7.5 },
  requestSymptoms: { marginTop: 11, fontFamily: "DMSans_400Regular", color: MUTED, fontSize: 8.5, lineHeight: 14 },
  requestSymptomsStrong: { fontFamily: "DMSans_700Bold", color: TEXT },
  requestButtons: { marginTop: 12, flexDirection: "row", gap: 6 },
  acceptBtn: { flex: 1, minHeight: 37, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: SUCCESS },
  acceptText: { fontFamily: "DMSans_700Bold", color: WHITE, fontSize: 7.5 },
  rescheduleBtn: { flex: 1.25, minHeight: 37, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: WARNING_LIGHT, borderWidth: 1, borderColor: "#E7C875" },
  rescheduleText: { fontFamily: "DMSans_700Bold", color: WARNING, fontSize: 7.2 },
  rejectBtn: { flex: 1, minHeight: 37, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: DANGER_LIGHT, borderWidth: 1, borderColor: "#E9B4AE" },
  rejectText: { fontFamily: "DMSans_700Bold", color: DANGER, fontSize: 7.5 },

  simpleRow: { minHeight: 61, padding: 9, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 15, backgroundColor: "#FBFCFA", borderWidth: 1, borderColor: "#E9EDE9" },
  patientAvatar: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: GREEN },
  patientAvatarText: { fontFamily: "DMSans_700Bold", color: WHITE, fontSize: 14 },
  transactionIcon: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  simpleRowTitle: { fontFamily: "DMSans_700Bold", color: TEXT, fontSize: 9.5 },
  simpleRowSub: { marginTop: 2, fontFamily: "DMSans_400Regular", color: MUTED, fontSize: 7 },
  visitPill: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 9, backgroundColor: MINT },
  visitPillText: { fontFamily: "DMSans_700Bold", color: GREEN, fontSize: 6.5 },
  transactionAmount: { fontFamily: "DMSans_700Bold", color: TEXT, fontSize: 9.5 },
  transactionStatus: { marginTop: 2, fontFamily: "DMSans_700Bold", fontSize: 6.5 },

  emptyState: { paddingVertical: 25, paddingHorizontal: 15, alignItems: "center" },
  emptyIcon: { width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: MINT },
  emptyTitle: { marginTop: 10, fontFamily: "PlayfairDisplay_700Bold", color: GREEN, fontSize: 17 },
  emptyText: { marginTop: 4, fontFamily: "DMSans_400Regular", color: MUTED, fontSize: 8.5, textAlign: "center" },

  drawerRoot: { flex: 1, flexDirection: "row" },
  drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(5,28,19,.58)" },
  drawer: { width: "84%", maxWidth: 340, height: "100%", paddingTop: Platform.OS === "web" ? 30 : 58, paddingHorizontal: 15, backgroundColor: GREEN },
  drawerBrandRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 17, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,.10)" },
  drawerLogo: { width: 49, height: 49, borderRadius: 16 },
  drawerBrand: { fontFamily: "PlayfairDisplay_700Bold", color: WHITE, fontSize: 23 },
  drawerSub: { marginTop: 1, fontFamily: "DMSans_700Bold", color: GOLD_LIGHT, fontSize: 8, letterSpacing: 1 },
  drawerClose: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: WHITE },
  drawerLabel: { marginTop: 20, marginBottom: 7, marginLeft: 9, fontFamily: "DMSans_700Bold", color: "rgba(255,255,255,.48)", fontSize: 7, letterSpacing: 1.2 },
  drawerItem: { minHeight: 49, paddingHorizontal: 12, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  drawerItemActive: { backgroundColor: WHITE },
  drawerItemText: { fontFamily: "DMSans_700Bold", color: WHITE, fontSize: 10.5 },
  logoutButton: { minHeight: 48, marginTop: 25, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(255,255,255,.09)", borderWidth: 1, borderColor: "rgba(255,255,255,.16)" },
  logoutText: { fontFamily: "DMSans_700Bold", color: WHITE, fontSize: 11 },

  centerModalRoot: { flex: 1, paddingHorizontal: 22, alignItems: "center", justifyContent: "center" },
  centerModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(5,28,19,.72)" },
  confirmCard: { width: "100%", maxWidth: 380, padding: 22, borderRadius: 28, alignItems: "center", backgroundColor: CREAM },
  noticeCard: { width: "100%", maxWidth: 380, padding: 22, borderRadius: 28, alignItems: "center", backgroundColor: CREAM },
  confirmIcon: { width: 67, height: 67, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER },
  noticeIcon: { width: 67, height: 67, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  modalEyebrow: { marginTop: 15, fontFamily: "DMSans_700Bold", color: GOLD_DARK, fontSize: 7.5, letterSpacing: 1.2 },
  modalTitle: { marginTop: 5, fontFamily: "PlayfairDisplay_700Bold", color: GREEN, fontSize: 24, textAlign: "center" },
  modalMessage: { marginTop: 7, fontFamily: "DMSans_400Regular", color: MUTED, fontSize: 10, lineHeight: 16, textAlign: "center" },
  modalButtonRow: { width: "100%", marginTop: 19, flexDirection: "row", gap: 8 },
  secondaryModalButton: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER },
  secondaryModalButtonText: { fontFamily: "DMSans_700Bold", color: GREEN, fontSize: 10 },
  primaryModalButton: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: SUCCESS },
  primaryModalButtonText: { fontFamily: "DMSans_700Bold", color: WHITE, fontSize: 10 },
  noticeButton: { width: "100%", minHeight: 47, marginTop: 19, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: GOLD },
  noticeButtonText: { fontFamily: "DMSans_700Bold", color: GREEN, fontSize: 10 },

  sheetRoot: { flex: 1, justifyContent: "flex-end" },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(5,28,19,.66)" },
  sheet: { paddingTop: 9, paddingHorizontal: 18, paddingBottom: Platform.OS === "ios" ? 34 : 22, borderTopLeftRadius: 29, borderTopRightRadius: 29, backgroundColor: CREAM },
  sheetHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: "#CDD4CF" },
  sheetHeader: { marginTop: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  sheetTitle: { marginTop: 4, fontFamily: "PlayfairDisplay_700Bold", color: GREEN, fontSize: 24 },
  sheetClose: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: MINT },
  inputLabel: { marginTop: 20, marginBottom: 7, fontFamily: "DMSans_700Bold", color: GREEN, fontSize: 8, letterSpacing: .8 },
  pickerButton: { minHeight: 51, paddingHorizontal: 13, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER },
  pickerValue: { flex: 1, fontFamily: "DMSans_700Bold", color: GREEN, fontSize: 10 },
  reasonInput: { minHeight: 115, padding: 13, borderRadius: 15, fontFamily: "DMSans_400Regular", color: TEXT, fontSize: 11, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER },
  rescheduleSubmit: { minHeight: 49, marginTop: 15, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: GOLD },
  rescheduleSubmitText: { fontFamily: "DMSans_700Bold", color: GREEN, fontSize: 10.5 },
  rejectSubmit: { minHeight: 49, marginTop: 15, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: DANGER },
  rejectSubmitText: { fontFamily: "DMSans_700Bold", color: WHITE, fontSize: 10.5 },
});
