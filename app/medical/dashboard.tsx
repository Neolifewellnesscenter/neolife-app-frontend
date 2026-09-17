import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE_URL } from "../../services/api";
import MedicalDrawer from "../../components/MedicalDrawer";
import MedicalHeader from "../../components/MedicalHeader";

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
const SUCCESS = "#2E7D52";
const SUCCESS_LIGHT = "#EAF6EF";
const WARNING = "#C88723";
const WARNING_LIGHT = "#FFF6E7";
const DANGER = "#B95045";
const DANGER_LIGHT = "#FBECE9";
const INFO = "#397A9A";
const INFO_LIGHT = "#EDF7FC";
const PURPLE = "#76548F";
const PURPLE_LIGHT = "#F5EFFB";

type Summary = {
  totalPatients: number;
  totalPrescriptions: number;
  pendingOrders: number;
  activeConsultations: number;
  todayDailyTreatments: number;
  pendingDailyTreatments: number;
};

const EMPTY_SUMMARY: Summary = {
  totalPatients: 0,
  totalPrescriptions: 0,
  pendingOrders: 0,
  activeConsultations: 0,
  todayDailyTreatments: 0,
  pendingDailyTreatments: 0,
};

export default function MedicalDashboardScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffName, setStaffName] = useState("Medical Staff");
  const [designation, setDesignation] = useState("Medical Staff");
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const notificationCount =
    Number(summary.pendingOrders || 0) +
    Number(summary.pendingDailyTreatments || 0);

  useEffect(() => {
    void loadPage(true);
  }, []);

  async function getStaffToken() {
    return (
      (await AsyncStorage.getItem("staffToken")) ||
      (await AsyncStorage.getItem("token")) ||
      (await AsyncStorage.getItem("accessToken")) ||
      ""
    );
  }

  async function clearStaffSession() {
    await AsyncStorage.multiRemove([
      "staffToken",
      "staffRefreshToken",
      "token",
      "accessToken",
      "refreshToken",
      "role",
      "medicalStaffId",
      "staffName",
      "staffProfile",
      "userId",
      "userName",
      "name",
      "email",
      "phoneNumber",
      "profileCompleted",
      "isLoggedIn",
    ]);
  }

  async function validateStaff() {
    const token = await getStaffToken();
    const role = String((await AsyncStorage.getItem("role")) || "").toUpperCase();

    if (
      !token ||
      (role &&
        role !== "MEDICAL_STAFF" &&
        role !== "STAFF" &&
        role !== "ADMIN")
    ) {
      await clearStaffSession();
      router.replace("/login" as any);
      return false;
    }

    return true;
  }

  async function staffApiRequest(
    endpoint: string,
    options: RequestInit = {}
  ) {
    const token = await getStaffToken();

    if (!token) {
      await clearStaffSession();
      router.replace("/login" as any);
      throw new Error("Medical staff login required.");
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

    if (response.status === 401 || response.status === 403) {
      await clearStaffSession();
      router.replace("/login" as any);
      throw new Error(
        result?.message || "Your medical staff session has expired."
      );
    }

    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || `Request failed (${response.status}).`);
    }

    return result;
  }

  function extractArray(value: any): any[] {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.content)) return value.content;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.data?.content)) return value.data.content;
    return [];
  }

  async function loadPage(initial = false) {
    try {
      if (initial) setLoading(true);
      setErrorMessage("");

      const valid = await validateStaff();
      if (!valid) return;

      const results = await Promise.allSettled([
        loadStaffProfile(),
        loadDashboardSummary(),
        loadRecentPrescriptions(),
        loadUpcomingAppointments(),
        loadActiveConsultations(),
        loadTodayTreatments(),
      ]);

      const failed = results.filter((item) => item.status === "rejected");
      if (failed.length === results.length) {
        setErrorMessage("Unable to load the medical staff dashboard.");
      } else if (failed.length > 0) {
        setErrorMessage(
          "Some dashboard information could not be loaded. Pull down to retry."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadStaffProfile() {
    try {
      const result = await staffApiRequest("/medical-staff/me");
      const staff = result?.data || {};

      const name = staff.name || "Medical Staff";
      const roleText =
        staff.designation || staff.department || "Medical Staff";

      setStaffName(name);
      setDesignation(roleText);

      const pairs: [string, string][] = [
        ["staffName", name],
        ["staffProfile", JSON.stringify(staff)],
      ];

      if (staff.id !== null && staff.id !== undefined) {
        pairs.push(["medicalStaffId", String(staff.id)]);
      }

      await AsyncStorage.multiSet(pairs);
    } catch (error) {
      const storedName =
        (await AsyncStorage.getItem("staffName")) || "Medical Staff";
      setStaffName(storedName);
      throw error;
    }
  }

  async function loadDashboardSummary() {
    const result = await staffApiRequest("/medical-staff/dashboard");
    const data = result?.data || {};

    setSummary({
      totalPatients: Number(data.totalPatients || 0),
      totalPrescriptions: Number(data.totalPrescriptions || 0),
      pendingOrders: Number(data.pendingOrders || 0),
      activeConsultations: Number(data.activeConsultations || 0),
      todayDailyTreatments: Number(data.todayDailyTreatments || 0),
      pendingDailyTreatments: Number(data.pendingDailyTreatments || 0),
    });
  }

  async function loadRecentPrescriptions() {
    const result = await staffApiRequest("/medical-staff/prescriptions");

    const list = extractArray(result?.data)
      .map((item: any) => ({
        id: item.id ?? item.prescriptionId ?? null,
        patientName: item.patientName || "Patient",
        doctorName: item.doctorName || "Doctor",
        diagnosis: item.diagnosis || "Diagnosis not added",
        itemCount: Array.isArray(item.items) ? item.items.length : 0,
        status: String(item.status || "FINALIZED").toUpperCase(),
        finalizedAt: item.finalizedAt || null,
        createdAt: item.createdAt || null,
      }))
      .sort((a: any, b: any) => {
        const ad = new Date(a.finalizedAt || a.createdAt || 0).getTime();
        const bd = new Date(b.finalizedAt || b.createdAt || 0).getTime();
        return bd - ad;
      })
      .slice(0, 5);

    setPrescriptions(list);
  }

  async function loadUpcomingAppointments() {
    const result = await staffApiRequest("/appointments/admin/getAll");
    const activeStatuses = new Set([
      "PENDING",
      "PAYMENT_PENDING",
      "CONFIRMED",
      "RESCHEDULED",
    ]);

    const list = extractArray(result?.data)
      .filter((item: any) =>
        activeStatuses.has(String(item?.status || "").toUpperCase())
      )
      .sort(
        (a: any, b: any) =>
          createDate(a.appointmentDate, a.startTime) -
          createDate(b.appointmentDate, b.startTime)
      )
      .slice(0, 6);

    setAppointments(list);
  }

  async function loadActiveConsultations() {
    const result = await staffApiRequest("/consultations/admin/getAll");
    const activeStatuses = new Set([
      "PAYMENT_PENDING",
      "SCHEDULED",
      "CONFIRMED",
      "RESCHEDULED",
      "MEETING_CREATED",
      "MEETING_LINK_SENT",
      "IN_PROGRESS",
    ]);

    const list = extractArray(result?.data)
      .filter((item: any) =>
        activeStatuses.has(String(item?.status || "").toUpperCase())
      )
      .sort(
        (a: any, b: any) =>
          createDate(a.consultationDate, a.startTime) -
          createDate(b.consultationDate, b.startTime)
      )
      .slice(0, 6);

    setConsultations(list);
  }

  async function loadTodayTreatments() {
    const result = await staffApiRequest("/daily-treatments/admin/getAll");
    const today = getTodayString();

    const list = extractArray(result?.data)
      .filter(
        (item: any) =>
          String(item?.sessionDate || "").substring(0, 10) === today
      )
      .sort((a: any, b: any) =>
        String(a?.startTime || "").localeCompare(String(b?.startTime || ""))
      )
      .slice(0, 6);

    setTreatments(list);
  }

  function createDate(date?: string, time?: string) {
    const value = `${date || "2999-12-31"}T${time || "23:59:59"}`;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadPage(false);
  }

  const dateInfo = useMemo(() => {
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

  if (loading) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loaderText}>Preparing medical staff dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <MedicalHeader
        title="Dashboard"
        subtitle="Manage patients, treatments, inventory and orders"
        onMenuPress={() => setMenuOpen(true)}
        notificationCount={notificationCount}
      />

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
        contentContainerStyle={styles.content}
      >
        {!!errorMessage && (
          <View style={styles.warningBanner}>
            <Ionicons name="alert-circle-outline" size={19} color={WARNING} />
            <Text style={styles.warningText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.hero}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroBadge}>
            <Ionicons name="medical-outline" size={14} color={GOLD_LIGHT} />
            <Text style={styles.heroBadgeText}>OPERATIONS WORKSPACE</Text>
          </View>

          <Text style={styles.heroTitle}>
            Welcome back,{"\n"}
            <Text style={styles.heroGold}>{staffName}</Text>
          </Text>

          <Text style={styles.heroText}>
            Monitor patients, prescriptions, consultations, daily treatments
            and operational activity from one clear dashboard.
          </Text>

          <View style={styles.dateCard}>
            <Ionicons name="calendar-outline" size={19} color={GOLD_LIGHT} />
            <View>
              <Text style={styles.dateDay}>{dateInfo.day}</Text>
              <Text style={styles.dateText}>{dateInfo.date}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.eyebrow}>OVERVIEW</Text>
        <Text style={styles.sectionTitle}>Today at a glance</Text>

        <View style={styles.summaryGrid}>
          <SummaryCard
            icon="people-outline"
            label="Total Patients"
            value={summary.totalPatients}
            tint={MINT}
            iconColor={SUCCESS}
            onPress={() => router.push("/medical/patients" as any)}
          />
          <SummaryCard
            icon="document-text-outline"
            label="Prescriptions"
            value={summary.totalPrescriptions}
            tint={INFO_LIGHT}
            iconColor={INFO}
            onPress={() => router.push("/medical/prescriptions" as any)}
          />
          <SummaryCard
            icon="cart-outline"
            label="Pending Orders"
            value={summary.pendingOrders}
            tint={WARNING_LIGHT}
            iconColor={WARNING}
            onPress={() => router.push("/medical/orders" as any)}
          />
          <SummaryCard
            icon="videocam-outline"
            label="Active Consultations"
            value={summary.activeConsultations}
            tint={INFO_LIGHT}
            iconColor={INFO}
            onPress={() => router.push("/medical/consultations" as any)}
          />
          <SummaryCard
            icon="leaf-outline"
            label="Today's Treatments"
            value={summary.todayDailyTreatments}
            tint={PURPLE_LIGHT}
            iconColor={PURPLE}
            onPress={() => router.push("/medical/daily-treatment" as any)}
          />
          <SummaryCard
            icon="hourglass-outline"
            label="Pending Treatments"
            value={summary.pendingDailyTreatments}
            tint={WARNING_LIGHT}
            iconColor={GOLD_DARK}
            onPress={() => router.push("/medical/daily-treatment" as any)}
          />
        </View>

        <Text style={[styles.eyebrow, { marginTop: 10 }]}>QUICK ACTIONS</Text>
        <Text style={styles.sectionTitle}>Common tasks</Text>

        <View style={styles.quickGrid}>
          <QuickAction
            icon="add-circle-outline"
            title="Add Product"
            text="Create a new product"
            onPress={() => router.push("/medical/add-product" as any)}
          />
          <QuickAction
            icon="layers-outline"
            title="Restock"
            text="Update inventory stock"
            onPress={() => router.push("/medical/inventory" as any)}
          />
          <QuickAction
            icon="document-text-outline"
            title="Prescriptions"
            text="Open patient prescriptions"
            onPress={() => router.push("/medical/prescriptions" as any)}
          />
          <QuickAction
            icon="medkit-outline"
            title="Consultations"
            text="Review online consultations"
            onPress={() => router.push("/medical/consultations" as any)}
          />
        </View>

        <DashboardSection
          title="Recent Prescriptions"
          subtitle="Latest finalized prescriptions"
          actionLabel="View all"
          onAction={() => router.push("/medical/prescriptions" as any)}
        >
          {prescriptions.length ? (
            prescriptions.map((item) => (
              <PrescriptionCard key={String(item.id)} item={item} />
            ))
          ) : (
            <EmptyState
              icon="document-text-outline"
              text="No prescriptions found."
            />
          )}
        </DashboardSection>

        <DashboardSection
          title="Upcoming Appointments"
          subtitle="Current and upcoming offline appointments"
          actionLabel="Appointments"
          onAction={() => router.push("/medical/appointments" as any)}
        >
          {appointments.length ? (
            appointments.map((item, index) => (
              <ClinicalRow
                key={String(item.id ?? index)}
                patientName={item.patientName || "Patient"}
                subtitle={item.doctorName || "Doctor"}
                date={formatDate(item.appointmentDate)}
                time={formatTimeRange(item.startTime, item.endTime)}
                status={item.status || "PENDING"}
              />
            ))
          ) : (
            <EmptyState
              icon="calendar-outline"
              text="No upcoming appointments found."
            />
          )}
        </DashboardSection>

        <DashboardSection
          title="Active Consultations"
          subtitle="Current and upcoming online consultations"
          actionLabel="Consultations"
          onAction={() => router.push("/medical/consultations" as any)}
        >
          {consultations.length ? (
            consultations.map((item, index) => (
              <ClinicalRow
                key={String(item.id ?? index)}
                patientName={item.patientName || "Patient"}
                subtitle={item.doctorName || "Doctor"}
                date={formatDate(item.consultationDate)}
                time={formatTimeRange(item.startTime, item.endTime)}
                status={item.status || "SCHEDULED"}
              />
            ))
          ) : (
            <EmptyState
              icon="videocam-outline"
              text="No active consultations found."
            />
          )}
        </DashboardSection>

        <DashboardSection
          title="Today's Treatments"
          subtitle="Therapy sessions scheduled for today"
          actionLabel="Treatments"
          onAction={() => router.push("/medical/daily-treatment" as any)}
        >
          {treatments.length ? (
            treatments.map((item, index) => (
              <ClinicalRow
                key={String(item.id ?? index)}
                patientName={item.patientName || "Patient"}
                subtitle={item.treatmentName || "Treatment"}
                date={`Session ${item.sessionNumber ?? "-"} of ${
                  item.totalSessions ?? "-"
                }`}
                time={formatTimeRange(item.startTime, item.endTime)}
                status={item.status || "PENDING_APPROVAL"}
              />
            ))
          ) : (
            <EmptyState
              icon="leaf-outline"
              text="No daily treatments scheduled today."
            />
          )}
        </DashboardSection>
      </ScrollView>

      <MedicalDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeRoute="/medical/dashboard"
      />
    </View>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tint,
  iconColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  tint: string;
  iconColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.summaryCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.summaryIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={21} color={iconColor} />
      </View>
      <Text style={styles.summaryLabel} numberOfLines={2}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </TouchableOpacity>
  );
}

function QuickAction({
  icon,
  title,
  text,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={21} color={GOLD_LIGHT} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickText}>{text}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={GOLD_DARK} />
    </TouchableOpacity>
  );
}

function DashboardSection({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.panelTitle}>{title}</Text>
          <Text style={styles.panelSubtitle}>{subtitle}</Text>
        </View>
        <TouchableOpacity style={styles.viewAll} onPress={onAction}>
          <Text style={styles.viewAllText}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={14} color={GOLD_DARK} />
        </TouchableOpacity>
      </View>
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

function PrescriptionCard({ item }: { item: any }) {
  return (
    <TouchableOpacity
      style={styles.prescriptionCard}
      onPress={() =>
        router.push({
          pathname: "/medical/prescriptions" as any,
          params: item.id != null ? { id: String(item.id) } : {},
        } as any)
      }
      activeOpacity={0.85}
    >
      <View style={styles.rxIcon}>
        <Ionicons name="document-text-outline" size={20} color={SUCCESS} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{item.patientName}</Text>
        <Text style={styles.rowSub} numberOfLines={2}>
          {item.doctorName} · {item.itemCount} medicine(s)
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {item.diagnosis}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowDate}>
          {formatDate(item.finalizedAt || item.createdAt)}
        </Text>
        <StatusPill status={item.status} />
      </View>
    </TouchableOpacity>
  );
}

function ClinicalRow({
  patientName,
  subtitle,
  date,
  time,
  status,
}: {
  patientName: string;
  subtitle: string;
  date: string;
  time: string;
  status: string;
}) {
  return (
    <View style={styles.clinicalRow}>
      <View style={styles.patientAvatar}>
        <Text style={styles.patientAvatarText}>
          {patientName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowName} numberOfLines={1}>{patientName}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{subtitle}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {date} · {time}
        </Text>
      </View>
      <StatusPill status={status} />
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = String(status || "").toUpperCase();

  const success = ["PAID", "READY", "COMPLETED", "CONFIRMED", "FINALIZED"].includes(normalized);
  const warning = ["PENDING", "PAYMENT_PENDING", "PENDING_APPROVAL", "RESCHEDULED"].includes(normalized);
  const info = ["PROCESSING", "SCHEDULED", "MEETING_CREATED", "MEETING_LINK_SENT", "IN_PROGRESS"].includes(normalized);

  const background = success
    ? SUCCESS_LIGHT
    : warning
    ? WARNING_LIGHT
    : info
    ? INFO_LIGHT
    : DANGER_LIGHT;

  const color = success
    ? SUCCESS
    : warning
    ? WARNING
    : info
    ? INFO
    : DANGER;

  return (
    <View style={[styles.statusPill, { backgroundColor: background }]}>
      <Text style={[styles.statusText, { color }]} numberOfLines={1}>
        {formatLabel(normalized)}
      </Text>
    </View>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={26} color={GOLD_DARK} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  const parts = String(value).split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1] || 0);

  if (Number.isNaN(hour)) return String(value);

  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "-";
  if (!end) return formatTime(start);
  return `${formatTime(start)} - ${formatTime(end)}`;
}

function formatLabel(value: string) {
  return String(value || "-")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  content: { padding: 15, paddingBottom: 38 },
  loaderScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
    gap: 12,
  },
  loaderText: { color: MUTED, fontSize: 13, fontWeight: "600" },
  warningBanner: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: WARNING_LIGHT,
    borderWidth: 1,
    borderColor: "#F1DCB5",
  },
  warningText: {
    flex: 1,
    color: "#875C18",
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "600",
  },
  hero: {
    marginBottom: 21,
    padding: 21,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: GREEN,
  },
  heroGlowOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -50,
    top: -90,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  heroGlowTwo: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    right: 90,
    bottom: -90,
    backgroundColor: "rgba(214,180,91,0.16)",
  },
  heroBadge: {
    alignSelf: "flex-start",
    marginBottom: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  heroBadgeText: {
    color: GOLD_LIGHT,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  heroTitle: {
    color: WHITE,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "800",
  },
  heroGold: { color: GOLD_LIGHT },
  heroText: {
    marginTop: 9,
    maxWidth: 670,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 19,
  },
  dateCard: {
    alignSelf: "flex-start",
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
  },
  dateDay: { color: GOLD_LIGHT, fontSize: 12, fontWeight: "800" },
  dateText: {
    marginTop: 1,
    color: "rgba(255,255,255,0.7)",
    fontSize: 9,
  },
  eyebrow: {
    color: GOLD_DARK,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  sectionTitle: {
    marginTop: 2,
    marginBottom: 11,
    color: GREEN,
    fontSize: 20,
    fontWeight: "800",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    width: "48.4%",
    minHeight: 124,
    padding: 14,
    borderRadius: 17,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    marginBottom: 11,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    minHeight: 30,
    color: MUTED,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
  },
  summaryValue: {
    marginTop: 3,
    color: GREEN,
    fontSize: 24,
    fontWeight: "800",
  },
  quickGrid: { gap: 9, marginBottom: 20 },
  quickCard: {
    minHeight: 72,
    padding: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  quickIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },
  quickTitle: { color: GREEN, fontSize: 13, fontWeight: "800" },
  quickText: { marginTop: 2, color: MUTED, fontSize: 9, lineHeight: 13 },
  panel: {
    marginBottom: 15,
    overflow: "hidden",
    borderRadius: 19,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  panelHeader: {
    minHeight: 66,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF0ED",
  },
  panelTitle: { color: GREEN, fontSize: 15, fontWeight: "800" },
  panelSubtitle: {
    marginTop: 3,
    color: MUTED,
    fontSize: 9,
    lineHeight: 13,
  },
  viewAll: {
    minHeight: 34,
    paddingHorizontal: 9,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF9E9",
  },
  viewAllText: { color: GOLD_DARK, fontSize: 9, fontWeight: "800" },
  panelBody: { padding: 12, gap: 9 },
  prescriptionCard: {
    padding: 11,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FCFDFB",
    borderWidth: 1,
    borderColor: "#E7ECE8",
  },
  rxIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SUCCESS_LIGHT,
  },
  rowName: { color: GREEN, fontSize: 12, fontWeight: "800" },
  rowSub: { marginTop: 2, color: MUTED, fontSize: 9, lineHeight: 13 },
  rowMeta: { marginTop: 4, color: TEXT, fontSize: 9, fontWeight: "600" },
  rowRight: { alignItems: "flex-end", gap: 6 },
  rowDate: { color: MUTED, fontSize: 8, fontWeight: "600" },
  clinicalRow: {
    padding: 11,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FCFDFB",
    borderWidth: 1,
    borderColor: "#E7ECE8",
  },
  patientAvatar: {
    width: 39,
    height: 39,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },
  patientAvatarText: { color: WHITE, fontSize: 13, fontWeight: "800" },
  statusPill: {
    maxWidth: 105,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statusText: { fontSize: 8, fontWeight: "800" },
  emptyState: {
    minHeight: 92,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  emptyText: { color: MUTED, fontSize: 10, fontWeight: "600" },
});
