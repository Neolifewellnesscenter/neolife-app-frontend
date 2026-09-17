import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import DoctorDrawer from "../../components/DoctorDrawer";
import DoctorHeader from "../../components/DoctorHeader";
import { API_BASE_URL } from "../../services/api";

const GREEN = "#0B3D2E";
const GREEN_2 = "#14533D";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_DARK = "#A98632";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#75837B";
const BORDER = "#E6EBE7";
const DANGER = "#B95045";
const DANGER_LIGHT = "#FBECE9";
const SUCCESS = "#287146";
const SUCCESS_LIGHT = "#EBF7EF";
const INFO = "#31708F";
const INFO_LIGHT = "#EDF6FB";
const WARNING = "#946300";
const WARNING_LIGHT = "#FFF6E8";
const PURPLE = "#76548F";
const PURPLE_LIGHT = "#F5EFFB";

const PAGE_SIZE = 8;

const STATUSES = [
  "",
  "PAYMENT_PENDING",
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
];

const MODES = ["", "OFFLINE", "ONLINE"];

type Appointment = {
  id: string | number;
  patientId: string | number | null;
  patientName: string;
  phoneNumber: string;
  age: string | number;
  gender: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: string;
  status: string;
  symptoms: string;
  history: string;
  bookingFee: number;
  paymentStatus: string;
  cancellationReason: string;
  rescheduleReason: string;
};

type Therapist = {
  id: string | number;
  name?: string;
  therapistName?: string;
  specialization?: string;
  active?: boolean;
};

type PrescriptionItem = {
  id?: string | number;
  medicineName?: string;
  productName?: string;
  dosage?: string;
  frequency?: string;
  durationDays?: number;
  quantity?: number;
  instructions?: string;
};

type Prescription = {
  id: string | number;
  patientId?: string | number | null;
  patientName?: string;
  appointmentId?: string | number | null;
  diagnosis?: string;
  advice?: string;
  notes?: string;
  status?: string;
  finalizedAt?: string;
  createdAt?: string;
  items?: PrescriptionItem[];
};

type TreatmentPlanForm = {
  therapistId: string;
  treatmentName: string;
  diagnosis: string;
  totalSessions: string;
  startDate: string;
  expectedEndDate: string;
  instructions: string;
  notes: string;
};

type Notice = {
  visible: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
};

function localDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function titleCase(value: any) {
  return String(value || "—")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "—";
  const [hours, minutes] = String(value).split(":").map(Number);
  if (!Number.isFinite(hours)) return String(value);

  return new Date(2000, 0, 1, hours, minutes || 0).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tone(value: string) {
  const normalized = String(value || "").toUpperCase();

  if (["COMPLETED", "CONFIRMED", "SUCCESS", "PAID"].includes(normalized)) {
    return { backgroundColor: SUCCESS_LIGHT, color: SUCCESS };
  }

  if (["CANCELLED", "REJECTED", "FAILED"].includes(normalized)) {
    return { backgroundColor: DANGER_LIGHT, color: DANGER };
  }

  if (["PENDING", "PAYMENT_PENDING", "RESCHEDULED"].includes(normalized)) {
    return { backgroundColor: WARNING_LIGHT, color: WARNING };
  }

  return { backgroundColor: INFO_LIGHT, color: INFO };
}

function normalizeAppointment(item: any): Appointment {
  return {
    id: item?.id,
    patientId: item?.patientId,
    patientName: item?.patientName || item?.name || "Patient",
    phoneNumber: item?.phoneNumber || "—",
    age: item?.age ?? "—",
    gender: item?.gender || "—",
    date: item?.appointmentDate || item?.date || "",
    startTime: item?.startTime || item?.time || "",
    endTime: item?.endTime || "",
    mode: String(item?.appointmentMode || "OFFLINE").toUpperCase(),
    status: String(item?.status || "PENDING").toUpperCase(),
    symptoms: item?.symptoms || "—",
    history: item?.pastMedicalHistory || "—",
    bookingFee: Number(item?.bookingFee ?? 0),
    paymentStatus: String(item?.paymentStatus || "PENDING").toUpperCase(),
    cancellationReason: item?.cancellationReason || "",
    rescheduleReason: item?.rescheduleReason || "",
  };
}

function mergePrescriptionData(
  summary: Prescription | null,
  details: any
): Prescription | null {
  if (!summary && !details) return null;

  const base: any = summary || {};
  const full: any = details || {};
  const detailItems = Array.isArray(full.items) ? full.items : [];
  const summaryItems = Array.isArray(base.items) ? base.items : [];

  return {
    ...base,
    ...full,
    items: detailItems.length ? detailItems : summaryItems,
  };
}

export default function DoctorAppointmentsScreen() {
  const today = localDateKey(new Date());

  const [menuOpen, setMenuOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [doctorName, setDoctorName] = useState("Doctor");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [selected, setSelected] = useState<Appointment | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Appointment | null>(null);
  const [planTarget, setPlanTarget] = useState<Appointment | null>(null);

  const [plan, setPlan] = useState<TreatmentPlanForm>({
    therapistId: "",
    treatmentName: "",
    diagnosis: "",
    totalSessions: "",
    startDate: "",
    expectedEndDate: "",
    instructions: "",
    notes: "",
  });

  const [planDatePicker, setPlanDatePicker] =
    useState<null | "start" | "end">(null);
  const [therapistPickerOpen, setTherapistPickerOpen] = useState(false);

  const [notice, setNotice] = useState<Notice>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  async function getToken() {
    return (
      (await AsyncStorage.getItem("doctorToken")) ||
      (await AsyncStorage.getItem("token")) ||
      ""
    );
  }

  async function clearSession() {
    await AsyncStorage.multiRemove([
      "doctorToken",
      "doctorRefreshToken",
      "token",
      "refreshToken",
      "role",
      "doctorId",
      "doctorName",
      "doctor",
      "userId",
      "email",
      "profileCompleted",
      "isLoggedIn",
    ]);
  }

  async function api(path: string, options: RequestInit = {}) {
    const token = await getToken();

    if (!token) {
      await clearSession();
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

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const text = await response.text();
    let result: any = {};

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      result = { message: text };
    }

    // 401 = authentication/session problem: clear the doctor session.
    if (response.status === 401) {
      await clearSession();
      router.replace("/login" as any);

      const error: any = new Error(
        result?.message || "Your session expired. Please log in again."
      );
      error.status = 401;
      throw error;
    }

    // 403 = authenticated, but this particular API is forbidden.
    // Do NOT clear the doctor token or send the doctor to Login.
    if (response.status === 403) {
      const error: any = new Error(
        result?.message ||
          "You do not have permission to access this resource."
      );
      error.status = 403;
      throw error;
    }

    if (!response.ok || result?.success === false) {
      const error: any = new Error(
        result?.message || `Request failed (${response.status}).`
      );
      error.status = response.status;
      throw error;
    }

    return result;
  }

  function showNotice(
    type: Notice["type"],
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

  function extractArray(result: any) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.data?.content)) return result.data.content;
    if (Array.isArray(result?.content)) return result.content;
    return [];
  }

  async function loadAppointments() {
    const result = await api("/appointments/doctor/my-appointments");

    const data = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result?.data?.content)
      ? result.data.content
      : [];

    setAppointments(data.map(normalizeAppointment));
  }

  async function loadProfile() {
    const result = await api("/doctors/my-profile");
    const value = result?.data || {};
    const name = value?.name || value?.doctorName || "Doctor";

    setDoctorName(name);

    await AsyncStorage.multiSet([
      ["doctorName", name],
      ["doctor", JSON.stringify(value)],
    ]);

    if (value?.id != null) {
      await AsyncStorage.setItem("doctorId", String(value.id));
    }
  }

  async function loadTherapists() {
    const result = await api("/therapists/getAll");

    const list = Array.isArray(result?.data)
      ? result.data.filter((item: Therapist) => item?.active !== false)
      : [];

    setTherapists(list);
  }

  async function loadPage(fullLoader = true) {
    try {
      if (fullLoader) setLoading(true);

      const role = String((await AsyncStorage.getItem("role")) || "")
        .replace(/^ROLE_/i, "")
        .toUpperCase();

      if (role && role !== "DOCTOR") {
        await clearSession();
        router.replace("/login" as any);
        return;
      }

      const profileCompleted = await AsyncStorage.getItem("profileCompleted");

      if (profileCompleted === "false") {
        router.replace("/doctor/profile" as any);
        return;
      }

      await Promise.allSettled([
        loadAppointments(),
        loadProfile(),
        loadTherapists(),
      ]);
    } catch (error: any) {
      showNotice(
        "error",
        "Unable to Load",
        error?.message || "Could not load appointments."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadPage(true);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return appointments.filter(
      (item) =>
        (!query ||
          [item.patientName, item.phoneNumber, item.symptoms].some((value) =>
            String(value).toLowerCase().includes(query)
          )) &&
        (!dateFilter || item.date === dateFilter) &&
        (!statusFilter || item.status === statusFilter) &&
        (!modeFilter || item.mode === modeFilter)
    );
  }, [appointments, search, dateFilter, statusFilter, modeFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFilter, statusFilter, modeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const visibleAppointments = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const summary = useMemo(
    () => ({
      total: appointments.length,
      today: appointments.filter((item) => item.date === today).length,
      pending: appointments.filter((item) =>
        ["PENDING", "PAYMENT_PENDING", "RESCHEDULED"].includes(item.status)
      ).length,
      completed: appointments.filter((item) => item.status === "COMPLETED")
        .length,
      paid: appointments.filter((item) =>
        ["SUCCESS", "PAID"].includes(item.paymentStatus)
      ).length,
    }),
    [appointments, today]
  );

  function resetFilters() {
    setSearch("");
    setDateFilter("");
    setStatusFilter("");
    setModeFilter("");
    setPage(1);
  }

  function openComplete(item: Appointment) {
    const paid = ["SUCCESS", "PAID"].includes(item.paymentStatus);

    if (!paid) {
      showNotice(
        "error",
        "Payment Required",
        "The appointment can be completed only after successful payment."
      );
      return;
    }

    if (item.status === "COMPLETED") {
      showNotice(
        "info",
        "Already Completed",
        "This appointment is already completed."
      );
      return;
    }

    if (["CANCELLED", "REJECTED"].includes(item.status)) {
      showNotice(
        "error",
        "Cannot Complete",
        "A cancelled or rejected appointment cannot be completed."
      );
      return;
    }

    setCompleteTarget(item);
  }

  async function completeAppointment() {
    if (!completeTarget) return;

    setBusy(true);

    try {
      let result: any;

      try {
        result = await api(
          `/appointments/${encodeURIComponent(
            String(completeTarget.id)
          )}/complete`,
          { method: "PUT" }
        );
      } catch (error: any) {
        const message = String(error?.message || "").toLowerCase();

        if (
          error?.status === 404 ||
          error?.status === 405 ||
          message.includes("method not allowed")
        ) {
          result = await api(
            `/appointments/${encodeURIComponent(
              String(completeTarget.id)
            )}/complete`
          );
        } else {
          throw error;
        }
      }

      setCompleteTarget(null);

      showNotice(
        "success",
        "Appointment Completed",
        result?.message || "Appointment marked as completed."
      );

      await loadAppointments();
    } catch (error: any) {
      showNotice(
        "error",
        "Completion Failed",
        error?.message || "Unable to complete appointment."
      );
    } finally {
      setBusy(false);
    }
  }

  function openPlan(item: Appointment) {
    setSelected(null);
    setPlanTarget(item);

    setPlan({
      therapistId: "",
      treatmentName: "",
      diagnosis: "",
      totalSessions: "",
      startDate: "",
      expectedEndDate: "",
      instructions: "",
      notes: "",
    });
  }

  async function submitPlan() {
    if (!planTarget) return;

    if (
      !plan.therapistId ||
      !plan.treatmentName.trim() ||
      !plan.diagnosis.trim() ||
      !plan.totalSessions ||
      !plan.startDate ||
      !plan.expectedEndDate
    ) {
      showNotice(
        "error",
        "Required Fields",
        "Please complete all required treatment plan fields."
      );
      return;
    }

    const sessions = Number(plan.totalSessions);

    if (!Number.isFinite(sessions) || sessions < 1 || sessions > 365) {
      showNotice(
        "error",
        "Invalid Sessions",
        "Total sessions must be between 1 and 365."
      );
      return;
    }

    if (plan.startDate < today) {
      showNotice(
        "error",
        "Invalid Start Date",
        "Start date cannot be before today."
      );
      return;
    }

    if (plan.expectedEndDate < plan.startDate) {
      showNotice(
        "error",
        "Invalid Dates",
        "Expected end date cannot be before the start date."
      );
      return;
    }

    setBusy(true);

    try {
      const payload = {
        ...plan,
        patientId: Number(planTarget.patientId),
        therapistId: Number(plan.therapistId),
        totalSessions: Number(plan.totalSessions),
      };

      const result = await api("/treatment-plans/create", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setPlanTarget(null);

      showNotice(
        "success",
        "Treatment Plan Created",
        result?.message || "Treatment plan created successfully."
      );
    } catch (error: any) {
      showNotice(
        "error",
        "Unable to Create Plan",
        error?.message || "Unable to create treatment plan."
      );
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await loadPage(false);
  }

  function onFilterDateChange(_: any, value?: Date) {
    if (Platform.OS === "android") setDatePickerOpen(false);
    if (!value) return;
    setDateFilter(localDateKey(value));
  }

  function onPlanDateChange(_: any, value?: Date) {
    const target = planDatePicker;

    if (Platform.OS === "android") setPlanDatePicker(null);
    if (!target || !value) return;

    const key = localDateKey(value);

    setPlan((current) => ({
      ...current,
      [target === "start" ? "startDate" : "expectedEndDate"]: key,
    }));
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingTitle}>Loading appointments</Text>
        <Text style={styles.loadingText}>
          Fetching your assigned patient appointments...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <DoctorHeader
        title="Appointment Details"
        subtitle="View and manage your assigned patient appointments"
        onMenuPress={() => setMenuOpen(true)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="calendar-outline" size={25} color="#F5EBC9" />
          </View>

          <Text style={styles.eyebrow}>PATIENT CARE</Text>
          <Text style={styles.heroTitle}>Your Appointments</Text>
          <Text style={styles.heroText}>
            Search appointments, review patient information and continue
            clinical actions from one workspace.
          </Text>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => loadPage(false)}
          >
            <Ionicons name="refresh-outline" size={17} color={WHITE} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {notice.visible && (
          <NoticeCard
            notice={notice}
            onClose={() =>
              setNotice((current) => ({ ...current, visible: false }))
            }
          />
        )}

        <View style={styles.statsGrid}>
          <StatCard icon="list-outline" label="Total" value={summary.total} />
          <StatCard icon="calendar-outline" label="Today" value={summary.today} />
          <StatCard
            icon="hourglass-outline"
            label="Pending"
            value={summary.pending}
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="Completed"
            value={summary.completed}
          />
          <StatCard icon="wallet-outline" label="Paid" value={summary.paid} />
        </View>

        <View style={styles.searchPanel}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={MUTED} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Name, phone or symptoms"
              placeholderTextColor="#9AA59E"
              style={styles.searchInput}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color={MUTED} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.filterButton,
              !!(dateFilter || statusFilter || modeFilter) &&
                styles.filterButtonActive,
            ]}
            onPress={() => setFilterOpen(true)}
          >
            <Ionicons
              name="options-outline"
              size={19}
              color={
                dateFilter || statusFilter || modeFilter ? WHITE : GREEN
              }
            />
          </TouchableOpacity>
        </View>

        {!!(dateFilter || statusFilter || modeFilter) && (
          <View style={styles.chips}>
            {!!dateFilter && (
              <FilterChip
                label={formatDate(dateFilter)}
                onRemove={() => setDateFilter("")}
              />
            )}

            {!!statusFilter && (
              <FilterChip
                label={titleCase(statusFilter)}
                onRemove={() => setStatusFilter("")}
              />
            )}

            {!!modeFilter && (
              <FilterChip
                label={titleCase(modeFilter)}
                onRemove={() => setModeFilter("")}
              />
            )}

            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.clearFilters}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelEyebrow}>CLINICAL SCHEDULE</Text>
              <Text style={styles.panelTitle}>Appointment List</Text>
              <Text style={styles.panelSub}>
                Appointments assigned to your doctor account.
              </Text>
            </View>

            <View style={styles.resultPill}>
              <Text style={styles.resultText}>{filtered.length} results</Text>
            </View>
          </View>

          <View style={styles.list}>
            {visibleAppointments.length ? (
              visibleAppointments.map((item) => (
                <AppointmentCard
                  key={String(item.id)}
                  item={item}
                  onView={() => setSelected(item)}
                  onComplete={() => openComplete(item)}
                  onPlan={() => openPlan(item)}
                />
              ))
            ) : (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={30} color={GOLD_DARK} />
                <Text style={styles.emptyTitle}>No appointments found</Text>
                <Text style={styles.emptyText}>
                  Try changing or resetting your filters.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.pagination}>
            <Text style={styles.paginationText}>
              {filtered.length
                ? `Showing ${(safePage - 1) * PAGE_SIZE + 1}-${Math.min(
                    safePage * PAGE_SIZE,
                    filtered.length
                  )} of ${filtered.length}`
                : "Showing 0 appointments"}
            </Text>

            <View style={styles.paginationButtons}>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  safePage === 1 && styles.pageDisabled,
                ]}
                disabled={safePage === 1}
                onPress={() => setPage((value) => Math.max(1, value - 1))}
              >
                <Ionicons name="chevron-back" size={17} color={GREEN} />
              </TouchableOpacity>

              <View style={styles.currentPage}>
                <Text style={styles.currentPageText}>{safePage}</Text>
              </View>

              <Text style={styles.pageOf}>of {pageCount}</Text>

              <TouchableOpacity
                style={[
                  styles.pageButton,
                  safePage === pageCount && styles.pageDisabled,
                ]}
                disabled={safePage === pageCount}
                onPress={() =>
                  setPage((value) => Math.min(pageCount, value + 1))
                }
              >
                <Ionicons name="chevron-forward" size={17} color={GREEN} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        date={dateFilter}
        status={statusFilter}
        mode={modeFilter}
        setStatus={setStatusFilter}
        setMode={setModeFilter}
        chooseDate={() => setDatePickerOpen(true)}
        clearDate={() => setDateFilter("")}
        reset={resetFilters}
      />

      {datePickerOpen && (
        <DateTimePicker
          value={
            dateFilter ? new Date(`${dateFilter}T00:00:00`) : new Date()
          }
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onFilterDateChange}
        />
      )}

      <AppointmentDetailsModal
        item={selected}
        api={api}
        getToken={getToken}
        clearSession={clearSession}
        onClose={() => setSelected(null)}
        onPlan={(item) => openPlan(item)}
        onNotice={showNotice}
      />

      <ConfirmCompleteModal
        item={completeTarget}
        busy={busy}
        onClose={() => !busy && setCompleteTarget(null)}
        onConfirm={completeAppointment}
      />

      <TreatmentPlanModal
        item={planTarget}
        plan={plan}
        setPlan={setPlan}
        therapists={therapists}
        busy={busy}
        onClose={() => !busy && setPlanTarget(null)}
        onSubmit={submitPlan}
        onChooseTherapist={() => setTherapistPickerOpen(true)}
        onChooseDate={setPlanDatePicker}
      />

      {planDatePicker && (
        <DateTimePicker
          value={
            new Date(
              `${
                planDatePicker === "start"
                  ? plan.startDate || today
                  : plan.expectedEndDate || plan.startDate || today
              }T00:00:00`
            )
          }
          mode="date"
          minimumDate={
            new Date(
              `${
                planDatePicker === "start"
                  ? today
                  : plan.startDate || today
              }T00:00:00`
            )
          }
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPlanDateChange}
        />
      )}

      <TherapistPicker
        visible={therapistPickerOpen}
        therapists={therapists}
        selectedId={plan.therapistId}
        onClose={() => setTherapistPickerOpen(false)}
        onSelect={(id) => {
          setPlan((current) => ({
            ...current,
            therapistId: String(id),
          }));
          setTherapistPickerOpen(false);
        }}
      />

      <DoctorDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeRoute="/doctor/appointments"
      />
    </View>
  );
}

function AppointmentCard({
  item,
  onView,
  onComplete,
  onPlan,
}: {
  item: Appointment;
  onView: () => void;
  onComplete: () => void;
  onPlan: () => void;
}) {
  const paid = ["SUCCESS", "PAID"].includes(item.paymentStatus);
  const completed = item.status === "COMPLETED";

  return (
    <View style={styles.appointmentCard}>
      <View style={styles.cardTop}>
        <View style={styles.patientBlock}>
          <View style={styles.patientAvatar}>
            <Text style={styles.patientAvatarText}>
              {item.patientName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <Text style={styles.patientPhone}>{item.phoneNumber}</Text>
          </View>
        </View>

        <Badge value={item.status} />
      </View>

      <View style={styles.infoGrid}>
        <InfoItem
          icon="calendar-outline"
          label="Date"
          value={formatDate(item.date)}
        />
        <InfoItem
          icon="time-outline"
          label="Time"
          value={`${formatTime(item.startTime)}${
            item.endTime ? ` - ${formatTime(item.endTime)}` : ""
          }`}
        />
        <InfoItem
          icon="videocam-outline"
          label="Mode"
          value={titleCase(item.mode)}
        />
        <InfoItem
          icon="wallet-outline"
          label="Payment"
          value={titleCase(item.paymentStatus)}
        />
      </View>

      <View style={styles.symptomBox}>
        <Text style={styles.symptomLabel}>SYMPTOMS</Text>
        <Text style={styles.symptomText} numberOfLines={3}>
          {item.symptoms}
        </Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.viewButton} onPress={onView}>
          <Ionicons name="eye-outline" size={17} color={GREEN} />
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>

        {paid &&
          !completed &&
          !["CANCELLED", "REJECTED"].includes(item.status) && (
            <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
              <Ionicons
                name="checkmark-circle-outline"
                size={17}
                color={SUCCESS}
              />
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          )}

        {completed && (
          <TouchableOpacity style={styles.planButton} onPress={onPlan}>
            <Ionicons name="medkit-outline" size={17} color={GOLD_DARK} />
            <Text style={styles.planButtonText}>Plan</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function AppointmentDetailsModal({
  item,
  api,
  getToken,
  clearSession,
  onClose,
  onPlan,
  onNotice,
}: {
  item: Appointment | null;
  api: (path: string, options?: RequestInit) => Promise<any>;
  getToken: () => Promise<string>;
  clearSession: () => Promise<void>;
  onClose: () => void;
  onPlan: (item: Appointment) => void;
  onNotice: (
    type: "success" | "error" | "info",
    title: string,
    message: string
  ) => void;
}) {
  const completed = item?.status === "COMPLETED";

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [prescriptionView, setPrescriptionView] =
    useState<Prescription | null>(null);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [prescriptionBusy, setPrescriptionBusy] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState("");

  useEffect(() => {
    setPrescription(null);
    setPrescriptionView(null);
    setPrescriptionError("");

    if (!item || !completed) {
      setPrescriptionLoading(false);
      return;
    }

    let active = true;
    setPrescriptionLoading(true);

    api(
      `/prescriptions/appointment/${encodeURIComponent(String(item.id))}`
    )
      .then((result) => {
        if (!active) return;

        const existing = result?.data || null;
        setPrescription(existing?.id ? existing : null);
      })
      .catch((error: any) => {
        if (active) {
          setPrescriptionError(
            error?.message || "Unable to check prescription status."
          );
        }
      })
      .finally(() => active && setPrescriptionLoading(false));

    return () => {
      active = false;
    };
  }, [item?.id, item?.patientId, completed]);

  if (!item) return null;

  const prescriptionStatus = String(prescription?.status || "").toUpperCase();

  function openPrescriptionPad() {
    onClose();

    router.push({
      pathname: "/doctor/prescription-pad" as any,
      params: {
        appointmentId: String(item.id),
        patientId: String(item.patientId || ""),
        ...(prescription?.id
          ? { prescriptionId: String(prescription.id) }
          : {}),
      },
    } as any);
  }

  async function viewPrescription() {
  if (!prescription?.id) return;

  setPrescriptionBusy(true);
  setPrescriptionError("");

  try {
    const doctorToken = await AsyncStorage.getItem("doctorToken");
    const normalToken = await AsyncStorage.getItem("token");
    const role = await AsyncStorage.getItem("role");
    const doctorId = await AsyncStorage.getItem("doctorId");
    const userId = await AsyncStorage.getItem("userId");
    const email = await AsyncStorage.getItem("email");

    console.log("====== MOBILE DOCTOR DEBUG ======");
    console.log("ROLE:", role);
    console.log("DOCTOR ID:", doctorId);
    console.log("USER ID:", userId);
    console.log("EMAIL:", email);
    console.log("DOCTOR TOKEN EXISTS:", Boolean(doctorToken));
    console.log("NORMAL TOKEN EXISTS:", Boolean(normalToken));
    console.log("SAME TOKEN:", doctorToken === normalToken);
    console.log("PRESCRIPTION ID:", prescription.id);
    console.log("APPOINTMENT ID:", item.id);
    console.log("PATIENT ID:", item.patientId);
    console.log("API BASE URL:", API_BASE_URL);
    console.log("===============================");

    console.log(
  "PRESCRIPTION SUMMARY:",
  JSON.stringify(prescription, null, 2)
);

    const result = await api(
  `/prescriptions/${encodeURIComponent(
    String(prescription.id)
  )}`
);

    console.log("PRESCRIPTION API SUCCESS:", result);

    setPrescriptionView(
      mergePrescriptionData(prescription, result?.data)
    );
  } catch (error: any) {
    console.log("VIEW PRESCRIPTION ERROR STATUS:", error?.status);
    console.log(
      "VIEW PRESCRIPTION ERROR:",
      error?.message || error
    );

    setPrescriptionError(
      error?.message || "Unable to load prescription."
    );
  } finally {
    setPrescriptionBusy(false);
  }
}

  async function finalizePrescription() {
    if (!prescription?.id || prescriptionStatus !== "DRAFT") return;

    setPrescriptionBusy(true);
    setPrescriptionError("");

    try {
      await api(
        `/prescriptions/${encodeURIComponent(
          String(prescription.id)
        )}/finalize`,
        { method: "PUT" }
      );

      const result = await api(
  `/prescriptions/${encodeURIComponent(
    String(prescription.id)
  )}`
);

      const finalized = mergePrescriptionData(
        {
          ...prescription,
          status: "FINALIZED",
        },
        result?.data
      );

      setPrescription(finalized);
      setPrescriptionView(finalized);

      onNotice(
        "success",
        "Prescription Finalized",
        "The prescription was finalized successfully."
      );
    } catch (error: any) {
      setPrescriptionError(
        error?.message || "Unable to finalize prescription."
      );
    } finally {
      setPrescriptionBusy(false);
    }
  }

  async function downloadPrescription() {
    if (!prescription?.id) return;

    setPrescriptionBusy(true);
    setPrescriptionError("");

    try {
      const token = await getToken();

      const target = `${FileSystem.cacheDirectory}prescription-${prescription.id}.pdf`;

      const download = await FileSystem.downloadAsync(
        `${API_BASE_URL}/prescriptions/${encodeURIComponent(
          String(prescription.id)
        )}/download`,
        target,
        {
          headers: {
            Accept: "application/pdf",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (download.status === 401) {
        await clearSession();
        router.replace("/login" as any);
        return;
      }

      if (download.status === 403) {
        throw new Error(
          "You do not have permission to download this prescription."
        );
      }

      if (download.status < 200 || download.status >= 300) {
        throw new Error(
          `Unable to download prescription (${download.status}).`
        );
      }

      if (!(await Sharing.isAvailableAsync())) {
        throw new Error(
          "Sharing is not available on this device. The prescription was downloaded to the app cache."
        );
      }

      await Sharing.shareAsync(download.uri, {
        mimeType: "application/pdf",
        dialogTitle: `Prescription #${prescription.id}`,
        UTI: "com.adobe.pdf",
      });
    } catch (error: any) {
      setPrescriptionError(
        error?.message || "Unable to download prescription."
      );
    } finally {
      setPrescriptionBusy(false);
    }
  }

  return (
    <>
      <Modal
        visible={Boolean(item) && !prescriptionView}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={onClose} />

          <View style={styles.detailsSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.detailsHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailsTitle}>Appointment Details</Text>
                <Text style={styles.detailsSub}>#{item.id}</Text>
              </View>

              <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
                <Ionicons name="close" size={20} color={GREEN} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.detailsBody}
            >
              <PatientHeader item={item} />

              <View style={styles.detailsGrid}>
                <Detail label="Appointment ID" value={`#${item.id}`} />
                <Detail
                  label="Date & time"
                  value={`${formatDate(item.date)} · ${formatTime(
                    item.startTime
                  )}`}
                />
                <Detail label="Mode" value={titleCase(item.mode)} />
                <Detail label="Status" value={titleCase(item.status)} />
                <Detail
                  label="Booking fee"
                  value={`₹${Number(item.bookingFee || 0).toLocaleString(
                    "en-IN"
                  )}`}
                />
                <Detail
                  label="Payment"
                  value={titleCase(item.paymentStatus)}
                />
                <Detail wide label="Symptoms" value={item.symptoms} />
                <Detail
                  wide
                  label="Past medical history"
                  value={item.history}
                />

                {!!item.rescheduleReason && (
                  <Detail
                    wide
                    label="Reschedule reason"
                    value={item.rescheduleReason}
                  />
                )}

                {!!item.cancellationReason && (
                  <Detail
                    wide
                    label="Cancellation reason"
                    value={item.cancellationReason}
                  />
                )}
              </View>

              {!!prescriptionError && (
                <View style={styles.errorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={DANGER}
                  />
                  <Text style={styles.errorText}>{prescriptionError}</Text>
                </View>
              )}

              {completed &&
                !prescriptionLoading &&
                prescription && (
                  <View style={styles.prescriptionState}>
                    <Text style={styles.prescriptionLabel}>PRESCRIPTION</Text>
                    <Text style={styles.prescriptionTitle}>
                      #{prescription.id} · {titleCase(prescription.status)}
                    </Text>
                    <Text style={styles.prescriptionMeta}>
                      {Array.isArray(prescription.items)
                        ? prescription.items.length
                        : 0}{" "}
                      medicine item(s)
                    </Text>
                    <Text style={styles.prescriptionHelp}>
                      {prescriptionStatus === "DRAFT"
                        ? "The prescription is saved as a draft. You can edit it or finalize it."
                        : "The prescription is finalized and read-only."}
                    </Text>
                  </View>
                )}
            </ScrollView>

            <View style={styles.detailsActions}>
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={onClose}
              >
                <Text style={styles.secondaryActionText}>Close</Text>
              </TouchableOpacity>

              {completed && (
                <TouchableOpacity
                  style={styles.planAction}
                  onPress={() => onPlan(item)}
                >
                  <Ionicons name="medkit-outline" size={17} color={GOLD_DARK} />
                  <Text style={styles.planActionText}>Treatment Plan</Text>
                </TouchableOpacity>
              )}

              {completed && prescriptionLoading && (
                <View style={styles.disabledAction}>
                  <ActivityIndicator size="small" color={GREEN} />
                  <Text style={styles.disabledActionText}>
                    Checking prescription…
                  </Text>
                </View>
              )}

              {completed &&
                !prescriptionLoading &&
                !prescription && (
                  <TouchableOpacity
                    style={styles.primaryAction}
                    onPress={openPrescriptionPad}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={17}
                      color={WHITE}
                    />
                    <Text style={styles.primaryActionText}>
                      Create Prescription
                    </Text>
                  </TouchableOpacity>
                )}

              {completed && prescriptionStatus === "DRAFT" && (
                <>
                  <TouchableOpacity
                    style={styles.editAction}
                    onPress={openPrescriptionPad}
                    disabled={prescriptionBusy}
                  >
                    <Ionicons
                      name="create-outline"
                      size={17}
                      color={INFO}
                    />
                    <Text style={styles.editActionText}>
                      Edit / Save Draft
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryAction}
                    onPress={finalizePrescription}
                    disabled={prescriptionBusy}
                  >
                    {prescriptionBusy ? (
                      <ActivityIndicator size="small" color={WHITE} />
                    ) : (
                      <Ionicons
                        name="checkmark-done-outline"
                        size={17}
                        color={WHITE}
                      />
                    )}
                    <Text style={styles.primaryActionText}>
                      {prescriptionBusy
                        ? "Finalizing…"
                        : "Finalize Prescription"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {completed && prescriptionStatus === "FINALIZED" && (
                <>
                  <TouchableOpacity
                    style={styles.primaryAction}
                    onPress={viewPrescription}
                    disabled={prescriptionBusy}
                  >
                    {prescriptionBusy ? (
                      <ActivityIndicator size="small" color={WHITE} />
                    ) : (
                      <Ionicons
                        name="eye-outline"
                        size={17}
                        color={WHITE}
                      />
                    )}
                    <Text style={styles.primaryActionText}>
                      View Prescription
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.downloadAction}
                    onPress={downloadPrescription}
                    disabled={prescriptionBusy}
                  >
                    <Ionicons
                      name="download-outline"
                      size={17}
                      color={PURPLE}
                    />
                    <Text style={styles.downloadActionText}>
                      Download PDF
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <PrescriptionViewModal
        prescription={prescriptionView}
        onClose={() => setPrescriptionView(null)}
      />
    </>
  );
}

function PrescriptionViewModal({
  prescription,
  onClose,
}: {
  prescription: Prescription | null;
  onClose: () => void;
}) {
  if (!prescription) return null;

  const medicines = Array.isArray(prescription.items)
    ? prescription.items
    : [];

  return (
    <Modal
      visible
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.prescriptionScreen}>
        <View style={styles.prescriptionScreenHeader}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={20} color={GREEN} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.prescriptionScreenEyebrow}>
              FINALIZED PRESCRIPTION
            </Text>
            <Text style={styles.prescriptionScreenTitle}>
              Prescription #{prescription.id}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.prescriptionScreenBody}>
          <View style={styles.detailsGrid}>
            <Detail
              label="Patient"
              value={prescription.patientName || "—"}
            />
            <Detail
              label="Finalized"
              value={
                prescription.finalizedAt
                  ? formatDate(String(prescription.finalizedAt).slice(0, 10))
                  : "—"
              }
            />
            <Detail
              wide
              label="Diagnosis"
              value={prescription.diagnosis || "—"}
            />
            <Detail
              wide
              label="Advice"
              value={prescription.advice || "—"}
            />
            <Detail
              wide
              label="Notes"
              value={prescription.notes || "—"}
            />
          </View>

          <View style={styles.medicineSection}>
            <View style={styles.medicineHeader}>
              <Text style={styles.medicineTitle}>Medicines</Text>
              <View style={styles.medicineCount}>
                <Text style={styles.medicineCountText}>
                  {medicines.length} items
                </Text>
              </View>
            </View>

            {medicines.length ? (
              medicines.map((medicine, index) => (
                <View
                  style={styles.medicineCard}
                  key={String(medicine.id ?? index)}
                >
                  <Text style={styles.medicineName}>
                    {medicine.medicineName ||
                      medicine.productName ||
                      "Medicine"}
                  </Text>

                  <View style={styles.medicineGrid}>
                    <MedicineValue
                      label="Dosage"
                      value={medicine.dosage || "—"}
                    />
                    <MedicineValue
                      label="Frequency"
                      value={medicine.frequency || "—"}
                    />
                    <MedicineValue
                      label="Days"
                      value={String(medicine.durationDays ?? "—")}
                    />
                    <MedicineValue
                      label="Quantity"
                      value={String(medicine.quantity ?? "—")}
                    />
                  </View>

                  <View style={styles.instructionBox}>
                    <Text style={styles.instructionLabel}>INSTRUCTIONS</Text>
                    <Text style={styles.instructionText}>
                      {medicine.instructions || "—"}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No medicines were added.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function ConfirmCompleteModal({
  item,
  busy,
  onClose,
  onConfirm,
}: {
  item: Appointment | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={Boolean(item)}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        {item && (
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons
                name="checkmark-circle-outline"
                size={30}
                color={SUCCESS}
              />
            </View>

            <Text style={styles.confirmTitle}>Mark Appointment as Done</Text>

            <PatientHeader item={item} />

            <Text style={styles.confirmText}>
              The appointment will be marked as Completed. You can then create
              the prescription or a treatment plan.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={onClose}
                disabled={busy}
              >
                <Text style={styles.secondaryActionText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryAction}
                onPress={onConfirm}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={WHITE} />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={17}
                    color={WHITE}
                  />
                )}
                <Text style={styles.primaryActionText}>
                  {busy ? "Completing…" : "Mark as Done"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function TreatmentPlanModal({
  item,
  plan,
  setPlan,
  therapists,
  busy,
  onClose,
  onSubmit,
  onChooseTherapist,
  onChooseDate,
}: {
  item: Appointment | null;
  plan: TreatmentPlanForm;
  setPlan: React.Dispatch<React.SetStateAction<TreatmentPlanForm>>;
  therapists: Therapist[];
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onChooseTherapist: () => void;
  onChooseDate: (type: "start" | "end") => void;
}) {
  return (
    <Modal
      visible={Boolean(item)}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        {item && (
          <View style={styles.planSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.detailsHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailsTitle}>Create Treatment Plan</Text>
                <Text style={styles.detailsSub}>THERAPY PLAN</Text>
              </View>

              <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
                <Ionicons name="close" size={20} color={GREEN} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.planBody}
            >
              <PatientHeader item={item} />

              <FieldLabel label="Therapist" required />
              <TouchableOpacity
                style={styles.inputBox}
                onPress={onChooseTherapist}
              >
                <Ionicons name="person-outline" size={17} color={GOLD_DARK} />
                <Text
                  style={[
                    styles.inputBoxText,
                    !plan.therapistId && styles.placeholder,
                  ]}
                >
                  {therapistLabel(therapists, plan.therapistId) ||
                    "Select therapist"}
                </Text>
                <Ionicons name="chevron-down" size={16} color={MUTED} />
              </TouchableOpacity>

              <FieldLabel label="Treatment name" required top />
              <TextInput
                value={plan.treatmentName}
                onChangeText={(value) =>
                  setPlan((current) => ({
                    ...current,
                    treatmentName: value,
                  }))
                }
                placeholder="Enter treatment name"
                placeholderTextColor="#9AA59E"
                style={styles.textInput}
              />

              <FieldLabel label="Diagnosis" required top />
              <TextInput
                value={plan.diagnosis}
                onChangeText={(value) =>
                  setPlan((current) => ({
                    ...current,
                    diagnosis: value,
                  }))
                }
                placeholder="Enter diagnosis"
                placeholderTextColor="#9AA59E"
                style={styles.textInput}
              />

              <FieldLabel label="Total sessions" required top />
              <TextInput
                value={plan.totalSessions}
                onChangeText={(value) =>
                  setPlan((current) => ({
                    ...current,
                    totalSessions: value.replace(/[^0-9]/g, ""),
                  }))
                }
                keyboardType="number-pad"
                placeholder="1 - 365"
                placeholderTextColor="#9AA59E"
                style={styles.textInput}
              />

              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <FieldLabel label="Start date" required top />
                  <DateButton
                    value={plan.startDate}
                    onPress={() => onChooseDate("start")}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <FieldLabel label="Expected end" required top />
                  <DateButton
                    value={plan.expectedEndDate}
                    onPress={() => onChooseDate("end")}
                  />
                </View>
              </View>

              <FieldLabel label="Instructions" top />
              <TextInput
                value={plan.instructions}
                onChangeText={(value) =>
                  setPlan((current) => ({
                    ...current,
                    instructions: value,
                  }))
                }
                multiline
                textAlignVertical="top"
                placeholder="Optional instructions"
                placeholderTextColor="#9AA59E"
                style={[styles.textInput, styles.textArea]}
              />

              <FieldLabel label="Clinical notes" top />
              <TextInput
                value={plan.notes}
                onChangeText={(value) =>
                  setPlan((current) => ({
                    ...current,
                    notes: value,
                  }))
                }
                multiline
                textAlignVertical="top"
                placeholder="Optional clinical notes"
                placeholderTextColor="#9AA59E"
                style={[styles.textInput, styles.textArea]}
              />
            </ScrollView>

            <View style={styles.detailsActions}>
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={onClose}
                disabled={busy}
              >
                <Text style={styles.secondaryActionText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryAction}
                onPress={onSubmit}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={WHITE} />
                ) : (
                  <Ionicons name="add-outline" size={18} color={WHITE} />
                )}
                <Text style={styles.primaryActionText}>
                  {busy ? "Creating…" : "Create Plan"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function TherapistPicker({
  visible,
  therapists,
  selectedId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  therapists: Therapist[];
  selectedId: string;
  onClose: () => void;
  onSelect: (id: string | number) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.choiceSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.detailsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailsTitle}>Select Therapist</Text>
              <Text style={styles.detailsSub}>ACTIVE THERAPISTS</Text>
            </View>
            <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
              <Ionicons name="close" size={20} color={GREEN} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.choiceList}>
            {therapists.length ? (
              therapists.map((person) => {
                const active = String(person.id) === String(selectedId);

                return (
                  <TouchableOpacity
                    key={String(person.id)}
                    style={[
                      styles.choiceRow,
                      active && styles.choiceRowActive,
                    ]}
                    onPress={() => onSelect(person.id)}
                  >
                    <View style={styles.choiceAvatar}>
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color={GREEN}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.choiceName}>
                        {person.name ||
                          person.therapistName ||
                          "Therapist"}
                      </Text>
                      {!!person.specialization && (
                        <Text style={styles.choiceMeta}>
                          {person.specialization}
                        </Text>
                      )}
                    </View>

                    {active && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={SUCCESS}
                      />
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No therapists available</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function FilterSheet({
  visible,
  onClose,
  date,
  status,
  mode,
  setStatus,
  setMode,
  chooseDate,
  clearDate,
  reset,
}: {
  visible: boolean;
  onClose: () => void;
  date: string;
  status: string;
  mode: string;
  setStatus: (value: string) => void;
  setMode: (value: string) => void;
  chooseDate: () => void;
  clearDate: () => void;
  reset: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.filterSheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.detailsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailsTitle}>Filter Appointments</Text>
              <Text style={styles.detailsSub}>SEARCH OPTIONS</Text>
            </View>

            <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
              <Ionicons name="close" size={20} color={GREEN} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.filterBody}>
            <FieldLabel label="Date" />
            <View style={styles.filterDateRow}>
              <TouchableOpacity
                style={styles.filterDateButton}
                onPress={chooseDate}
              >
                <Ionicons name="calendar-outline" size={17} color={GREEN} />
                <Text style={styles.filterDateText}>
                  {date ? formatDate(date) : "All dates"}
                </Text>
              </TouchableOpacity>

              {!!date && (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={clearDate}
                >
                  <Ionicons name="close" size={17} color={DANGER} />
                </TouchableOpacity>
              )}
            </View>

            <FieldLabel label="Status" top />
            <View style={styles.optionGrid}>
              {STATUSES.map((value) => (
                <OptionChip
                  key={value || "ALL"}
                  label={value ? titleCase(value) : "All Statuses"}
                  active={status === value}
                  onPress={() => setStatus(value)}
                />
              ))}
            </View>

            <FieldLabel label="Mode" top />
            <View style={styles.optionGrid}>
              {MODES.map((value) => (
                <OptionChip
                  key={value || "ALL"}
                  label={value ? titleCase(value) : "All Modes"}
                  active={mode === value}
                  onPress={() => setMode(value)}
                />
              ))}
            </View>
          </ScrollView>

          <View style={styles.detailsActions}>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={reset}
            >
              <Text style={styles.secondaryActionText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryAction} onPress={onClose}>
              <Ionicons name="checkmark-outline" size={17} color={WHITE} />
              <Text style={styles.primaryActionText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NoticeCard({
  notice,
  onClose,
}: {
  notice: Notice;
  onClose: () => void;
}) {
  const palette =
    notice.type === "success"
      ? { bg: SUCCESS_LIGHT, fg: SUCCESS, icon: "checkmark-circle-outline" }
      : notice.type === "error"
      ? { bg: DANGER_LIGHT, fg: DANGER, icon: "alert-circle-outline" }
      : { bg: INFO_LIGHT, fg: INFO, icon: "information-circle-outline" };

  return (
    <View style={[styles.notice, { backgroundColor: palette.bg }]}>
      <Ionicons
        name={palette.icon as any}
        size={20}
        color={palette.fg}
      />

      <View style={{ flex: 1 }}>
        <Text style={[styles.noticeTitle, { color: palette.fg }]}>
          {notice.title}
        </Text>
        <Text style={styles.noticeText}>{notice.message}</Text>
      </View>

      <TouchableOpacity onPress={onClose}>
        <Ionicons name="close" size={18} color={palette.fg} />
      </TouchableOpacity>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={19} color={GREEN_2} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Badge({ value }: { value: string }) {
  const palette = tone(value);

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: palette.color }]}>
        {titleCase(value)}
      </Text>
    </View>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoItem}>
      <Ionicons name={icon} size={15} color={GOLD_DARK} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>
          {value || "—"}
        </Text>
      </View>
    </View>
  );
}

function PatientHeader({ item }: { item: Appointment }) {
  return (
    <View style={styles.patientHeader}>
      <View style={styles.patientAvatar}>
        <Text style={styles.patientAvatarText}>
          {item.patientName.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.patientHeaderName}>{item.patientName}</Text>
        <Text style={styles.patientHeaderMeta}>
          {item.phoneNumber} · {item.age} years · {titleCase(item.gender)}
        </Text>
      </View>
    </View>
  );
}

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: any;
  wide?: boolean;
}) {
  return (
    <View style={[styles.detailBox, wide && styles.detailWide]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "—"}</Text>
    </View>
  );
}

function MedicineValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.medicineValue}>
      <Text style={styles.medicineValueLabel}>{label}</Text>
      <Text style={styles.medicineValueText}>{value}</Text>
    </View>
  );
}

function FieldLabel({
  label,
  required = false,
  top = false,
}: {
  label: string;
  required?: boolean;
  top?: boolean;
}) {
  return (
    <Text style={[styles.fieldLabel, top && styles.fieldLabelTop]}>
      {label}
      {required && <Text style={{ color: DANGER }}> *</Text>}
    </Text>
  );
}

function DateButton({
  value,
  onPress,
}: {
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.dateButton} onPress={onPress}>
      <Ionicons name="calendar-outline" size={16} color={GREEN} />
      <Text style={[styles.dateButtonText, !value && styles.placeholder]}>
        {value ? formatDate(value) : "Select date"}
      </Text>
    </TouchableOpacity>
  );
}

function OptionChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionChip, active && styles.optionChipActive]}
      onPress={onPress}
    >
      <Text
        style={[styles.optionChipText, active && styles.optionChipTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <View style={styles.filterChip}>
      <Text style={styles.filterChipText}>{label}</Text>
      <TouchableOpacity onPress={onRemove}>
        <Ionicons name="close" size={14} color={GREEN} />
      </TouchableOpacity>
    </View>
  );
}

function therapistLabel(therapists: Therapist[], id: string) {
  if (!id) return "";

  const therapist = therapists.find(
    (item) => String(item.id) === String(id)
  );

  if (!therapist) return "";

  return `${therapist.name || therapist.therapistName || "Therapist"}${
    therapist.specialization ? ` — ${therapist.specialization}` : ""
  }`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: CREAM,
  },
  loadingTitle: {
    marginTop: 14,
    color: GREEN,
    fontSize: 17,
    fontWeight: "800",
  },
  loadingText: {
    marginTop: 5,
    color: MUTED,
    fontSize: 10,
    textAlign: "center",
  },
  content: {
    padding: 14,
    paddingBottom: 34,
  },

  hero: {
    padding: 20,
    marginBottom: 14,
    borderRadius: 21,
    backgroundColor: GREEN,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.10)",
    marginBottom: 12,
  },
  eyebrow: {
    color: "#F5EBC9",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: WHITE,
    fontSize: 23,
    fontWeight: "800",
    marginTop: 5,
  },
  heroText: {
    color: "rgba(255,255,255,.78)",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },
  refreshButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,.12)",
  },
  refreshText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "800",
  },

  notice: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  noticeTitle: {
    fontSize: 11,
    fontWeight: "800",
  },
  noticeText: {
    marginTop: 2,
    color: TEXT,
    fontSize: 9,
    lineHeight: 14,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 14,
  },
  statCard: {
    width: "48.6%",
    minHeight: 106,
    padding: 13,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
    marginBottom: 8,
  },
  statLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "700",
  },
  statValue: {
    marginTop: 3,
    color: GREEN,
    fontSize: 22,
    fontWeight: "800",
  },

  searchPanel: {
    padding: 10,
    marginBottom: 9,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchBox: {
    flex: 1,
    minHeight: 47,
    paddingHorizontal: 11,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchInput: {
    flex: 1,
    minHeight: 45,
    color: TEXT,
    fontSize: 11,
  },
  filterButton: {
    width: 47,
    height: 47,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterButtonActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  chips: {
    marginBottom: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  },
  filterChip: {
    minHeight: 31,
    paddingHorizontal: 9,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: MINT,
  },
  filterChipText: {
    color: GREEN,
    fontSize: 9,
    fontWeight: "700",
  },
  clearFilters: {
    color: DANGER,
    fontSize: 9,
    fontWeight: "800",
  },

  panel: {
    overflow: "hidden",
    borderRadius: 19,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  panelHeader: {
    minHeight: 72,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  panelEyebrow: {
    color: GOLD_DARK,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  panelTitle: {
    marginTop: 2,
    color: GREEN,
    fontSize: 15,
    fontWeight: "800",
  },
  panelSub: {
    marginTop: 2,
    color: MUTED,
    fontSize: 9,
  },
  resultPill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: MINT,
  },
  resultText: {
    color: GREEN,
    fontSize: 9,
    fontWeight: "800",
  },

  list: {
    padding: 11,
    gap: 10,
  },
  appointmentCard: {
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#FCFDFB",
    borderWidth: 1,
    borderColor: "#E7ECE8",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  patientBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },
  patientAvatarText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "800",
  },
  patientName: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "800",
  },
  patientPhone: {
    marginTop: 2,
    color: MUTED,
    fontSize: 9,
  },
  badge: {
    alignSelf: "flex-start",
    maxWidth: 130,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "800",
  },

  infoGrid: {
  marginTop: 14,
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  rowGap: 10,
},

infoItem: {
  width: "48%",
  minHeight: 72,
  paddingHorizontal: 12,
  paddingVertical: 11,
  borderRadius: 14,
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 9,
  backgroundColor: WHITE,
  borderWidth: 1,
  borderColor: "#E3E9E5",
},
  infoLabel: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "700",
  },
  infoValue: {
    marginTop: 2,
    color: TEXT,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "700",
  },

  symptomBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 11,
    backgroundColor: "#F7F9F7",
  },
  symptomLabel: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "800",
  },
  symptomText: {
    marginTop: 4,
    color: TEXT,
    fontSize: 10,
    lineHeight: 15,
  },

  cardActions: {
    marginTop: 11,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  viewButton: {
    flex: 1,
    minWidth: 85,
    minHeight: 42,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: MINT,
  },
  viewButtonText: {
    color: GREEN,
    fontSize: 9,
    fontWeight: "800",
  },
  completeButton: {
    flex: 1,
    minWidth: 100,
    minHeight: 42,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: SUCCESS_LIGHT,
  },
  completeButtonText: {
    color: SUCCESS,
    fontSize: 9,
    fontWeight: "800",
  },
  planButton: {
    flex: 1,
    minWidth: 85,
    minHeight: 42,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#FFF7DF",
  },
  planButtonText: {
    color: GOLD_DARK,
    fontSize: 9,
    fontWeight: "800",
  },

  empty: {
    minHeight: 170,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyTitle: {
    marginTop: 8,
    color: GREEN,
    fontSize: 13,
    fontWeight: "800",
  },
  emptyText: {
    marginTop: 4,
    color: MUTED,
    fontSize: 9,
    textAlign: "center",
  },

  pagination: {
    minHeight: 64,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  paginationText: {
    flex: 1,
    color: MUTED,
    fontSize: 9,
  },
  paginationButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pageButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  pageDisabled: {
    opacity: 0.35,
  },
  currentPage: {
    minWidth: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },
  currentPageText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "800",
  },
  pageOf: {
    color: MUTED,
    fontSize: 9,
  },

  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,25,17,.56)",
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: "#DDE4DF",
  },
  detailsSheet: {
    height: "91%",
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: WHITE,
  },
  planSheet: {
    height: "91%",
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: WHITE,
  },
  filterSheet: {
    maxHeight: "90%",
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: WHITE,
  },
  choiceSheet: {
    maxHeight: "72%",
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: WHITE,
  },
  detailsHeader: {
    minHeight: 61,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  detailsTitle: {
    color: GREEN,
    fontSize: 17,
    fontWeight: "800",
  },
  detailsSub: {
    marginTop: 2,
    color: GOLD_DARK,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  closeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F7F4",
  },
  detailsBody: {
    padding: 14,
    paddingBottom: 22,
  },
  planBody: {
    padding: 14,
    paddingBottom: 26,
  },
  filterBody: {
    padding: 14,
    paddingBottom: 20,
  },

  patientHeader: {
    marginBottom: 12,
    padding: 13,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: MINT,
  },
  patientHeaderName: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "800",
  },
  patientHeaderMeta: {
    marginTop: 3,
    color: MUTED,
    fontSize: 9,
  },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailBox: {
    width: "48.6%",
    minHeight: 63,
    padding: 10,
    borderRadius: 11,
    backgroundColor: "#FCFDFB",
    borderWidth: 1,
    borderColor: BORDER,
  },
  detailWide: {
    width: "100%",
  },
  detailLabel: {
    marginBottom: 4,
    color: MUTED,
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  detailValue: {
    color: GREEN,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
  },

  errorBox: {
    marginTop: 11,
    padding: 11,
    borderRadius: 11,
    flexDirection: "row",
    gap: 8,
    backgroundColor: DANGER_LIGHT,
  },
  errorText: {
    flex: 1,
    color: DANGER,
    fontSize: 9,
    lineHeight: 14,
  },

  prescriptionState: {
    marginTop: 12,
    padding: 13,
    borderRadius: 13,
    backgroundColor: INFO_LIGHT,
  },
  prescriptionLabel: {
    color: INFO,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  prescriptionTitle: {
    marginTop: 4,
    color: GREEN,
    fontSize: 12,
    fontWeight: "800",
  },
  prescriptionMeta: {
    marginTop: 3,
    color: MUTED,
    fontSize: 9,
  },
  prescriptionHelp: {
    marginTop: 7,
    color: TEXT,
    fontSize: 9,
    lineHeight: 14,
  },

  detailsActions: {
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: WHITE,
  },
  secondaryAction: {
    flex: 1,
    minWidth: 90,
    minHeight: 47,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
  },
  secondaryActionText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: "800",
  },
  primaryAction: {
    flex: 1,
    minWidth: 145,
    minHeight: 47,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: GREEN,
  },
  primaryActionText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "800",
  },
  planAction: {
    flex: 1,
    minWidth: 125,
    minHeight: 47,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF7DF",
  },
  planActionText: {
    color: GOLD_DARK,
    fontSize: 10,
    fontWeight: "800",
  },
  editAction: {
    flex: 1,
    minWidth: 140,
    minHeight: 47,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: INFO_LIGHT,
  },
  editActionText: {
    color: INFO,
    fontSize: 10,
    fontWeight: "800",
  },
  downloadAction: {
    flex: 1,
    minWidth: 120,
    minHeight: 47,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: PURPLE_LIGHT,
  },
  downloadActionText: {
    color: PURPLE,
    fontSize: 10,
    fontWeight: "800",
  },
  disabledAction: {
    flex: 1,
    minWidth: 150,
    minHeight: 47,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#F3F5F3",
  },
  disabledActionText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "700",
  },

  confirmCard: {
    margin: 18,
    padding: 17,
    borderRadius: 20,
    backgroundColor: WHITE,
  },
  confirmIcon: {
    width: 54,
    height: 54,
    alignSelf: "center",
    marginBottom: 10,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SUCCESS_LIGHT,
  },
  confirmTitle: {
    marginBottom: 13,
    color: GREEN,
    fontSize: 17,
    textAlign: "center",
    fontWeight: "800",
  },
  confirmText: {
    marginVertical: 10,
    color: TEXT,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
  },
  confirmActions: {
    marginTop: 7,
    flexDirection: "row",
    gap: 8,
  },

  fieldLabel: {
    marginBottom: 7,
    color: GREEN,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  fieldLabelTop: {
    marginTop: 14,
  },
  textInput: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 11,
    color: TEXT,
    fontSize: 11,
    backgroundColor: "#FCFDFB",
    borderWidth: 1,
    borderColor: BORDER,
  },
  textArea: {
    minHeight: 88,
    paddingTop: 11,
  },
  inputBox: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FCFDFB",
    borderWidth: 1,
    borderColor: BORDER,
  },
  inputBoxText: {
    flex: 1,
    color: TEXT,
    fontSize: 10,
    fontWeight: "600",
  },
  placeholder: {
    color: "#9AA59E",
  },
  dateRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateButton: {
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FCFDFB",
    borderWidth: 1,
    borderColor: BORDER,
  },
  dateButtonText: {
    flex: 1,
    color: TEXT,
    fontSize: 9,
    fontWeight: "600",
  },

  filterDateRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterDateButton: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 11,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterDateText: {
    flex: 1,
    color: TEXT,
    fontSize: 10,
    fontWeight: "600",
  },
  clearDateButton: {
    width: 46,
    height: 46,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DANGER_LIGHT,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  optionChip: {
    minHeight: 35,
    paddingHorizontal: 10,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
  },
  optionChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  optionChipText: {
    color: TEXT,
    fontSize: 9,
    fontWeight: "700",
  },
  optionChipTextActive: {
    color: WHITE,
  },

  choiceList: {
    padding: 12,
    gap: 7,
  },
  choiceRow: {
    minHeight: 58,
    padding: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#FCFDFB",
    borderWidth: 1,
    borderColor: BORDER,
  },
  choiceRowActive: {
    backgroundColor: SUCCESS_LIGHT,
    borderColor: "#CFE5D8",
  },
  choiceAvatar: {
    width: 37,
    height: 37,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  choiceName: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "800",
  },
  choiceMeta: {
    marginTop: 2,
    color: MUTED,
    fontSize: 9,
  },

  prescriptionScreen: {
    flex: 1,
    backgroundColor: CREAM,
    paddingTop: Platform.OS === "android" ? 28 : 44,
  },
  prescriptionScreenHeader: {
    minHeight: 70,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  prescriptionScreenEyebrow: {
    color: GOLD_DARK,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  prescriptionScreenTitle: {
    marginTop: 2,
    color: GREEN,
    fontSize: 17,
    fontWeight: "800",
  },
  prescriptionScreenBody: {
    padding: 14,
    paddingBottom: 30,
  },

  medicineSection: {
    marginTop: 14,
  },
  medicineHeader: {
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  medicineTitle: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "800",
  },
  medicineCount: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 13,
    backgroundColor: MINT,
  },
  medicineCountText: {
    color: GREEN,
    fontSize: 8,
    fontWeight: "800",
  },
  medicineCard: {
    marginBottom: 9,
    padding: 12,
    borderRadius: 14,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  medicineName: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "800",
  },
  medicineGrid: {
    marginTop: 9,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  medicineValue: {
    width: "48.7%",
    padding: 8,
    borderRadius: 9,
    backgroundColor: "#F7F9F7",
  },
  medicineValueLabel: {
    color: MUTED,
    fontSize: 7,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  medicineValueText: {
    marginTop: 2,
    color: TEXT,
    fontSize: 9,
    fontWeight: "700",
  },
  instructionBox: {
    marginTop: 8,
    padding: 9,
    borderRadius: 9,
    backgroundColor: INFO_LIGHT,
  },
  instructionLabel: {
    color: INFO,
    fontSize: 7,
    fontWeight: "800",
  },
  instructionText: {
    marginTop: 3,
    color: TEXT,
    fontSize: 9,
    lineHeight: 14,
  },
});
