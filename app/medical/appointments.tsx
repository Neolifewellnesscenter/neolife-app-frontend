import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
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

import MedicalDrawer from "../../components/MedicalDrawer";
import MedicalHeader from "../../components/MedicalHeader";
import { API_BASE_URL } from "../../services/api";

const C = {
  green: "#0B3D2E",
  green2: "#14533D",
  gold: "#D6B45B",
  cream: "#FBFAF6",
  white: "#FFFFFF",
  text: "#17231D",
  muted: "#75837B",
  border: "#E5EBE7",
  success: "#2E7D52",
  successBg: "#EAF6EF",
  warning: "#C88723",
  warningBg: "#FFF6E7",
  danger: "#B95045",
  dangerBg: "#FBECEA",
  info: "#397A9A",
  infoBg: "#EDF7FC",
  purple: "#76548F",
  purpleBg: "#F5EFFB",
};

const PAGE_SIZE = 8;

type Appointment = {
  id: any;
  appointmentNumber: string;
  patientId: any;
  patientName: string;
  phoneNumber: string;
  age: any;
  gender: string;
  doctorName: string;
  specialization: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  bookingFee: number;
  symptoms: string;
  history: string;
  cancellationReason: string;
  rescheduleReason: string;
  prescriptionId: any;
  prescriptionStatus: string | null;
  diagnosis: string;
  advice: string;
};

const STATUS_OPTIONS = [
  ["All statuses", ""],
  ["Payment Pending", "PAYMENT_PENDING"],
  ["Pending", "PENDING"],
  ["Confirmed", "CONFIRMED"],
  ["Rescheduled", "RESCHEDULED"],
  ["Completed", "COMPLETED"],
  ["Cancelled", "CANCELLED"],
  ["Rejected", "REJECTED"],
  ["No Show", "NO_SHOW"],
] as const;

const PAYMENT_OPTIONS = [
  ["All payments", ""],
  ["Success", "SUCCESS"],
  ["Paid", "PAID"],
  ["Pending", "PENDING"],
  ["Failed", "FAILED"],
] as const;

export default function MedicalAppointmentsScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);

  useEffect(() => {
    void init();
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
      "staffId",
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

  async function logout() {
    await clearStaffSession();
    router.replace("/login" as any);
  }

  async function guard() {
    const token = await getStaffToken();
    const role = String((await AsyncStorage.getItem("role")) || "").toUpperCase();

    if (!token) {
      router.replace("/login" as any);
      return false;
    }

    if (role && role !== "MEDICAL_STAFF" && role !== "STAFF") {
      Alert.alert("Access Denied", "Only medical staff can access this page.");
      await logout();
      return false;
    }

    return true;
  }

  async function api(path: string, options: RequestInit = {}) {
    const token = await getStaffToken();

    if (!token) {
      await logout();
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

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const text = await response.text();
    let result: any = {};

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      result = { success: false, message: text || "Invalid server response" };
    }

    if (response.status === 401) {
      await logout();
      throw new Error(result?.message || "Session expired");
    }

    if (response.status === 403) {
      throw new Error(
        result?.message || "You do not have permission to access this API."
      );
    }

    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || `Request failed (${response.status})`);
    }

    return result;
  }

  async function init() {
    const ok = await guard();
    if (!ok) return;

    await Promise.allSettled([loadProfile(), loadAppointments()]);
    setLoading(false);
  }

  async function loadProfile() {
    try {
      const r = await api("/medical-staff/me");
      const staff = r?.data || {};
      const name = staff?.name || "Medical Staff";

      const pairs: [string, string][] = [
        ["staffName", name],
        ["staffProfile", JSON.stringify(staff)],
      ];

      if (staff?.id != null) {
        pairs.push(["medicalStaffId", String(staff.id)]);
      }

      await AsyncStorage.multiSet(pairs);
    } catch (e) {
      console.log("Profile loading failed:", e);
    }
  }

  async function loadAppointments() {
    try {
      const prescriptionResult = await api("/medical-staff/prescriptions");
      const prescriptions = extractArray(prescriptionResult?.data);
      const prescriptionMap = buildPrescriptionMap(prescriptions);

      const patientIds = [
        ...new Set(
          prescriptions
            .map((x: any) => x?.patientId)
            .filter((x: any) => x !== null && x !== undefined)
        ),
      ];

      if (!patientIds.length) {
        setAppointments([]);
        return;
      }

      const results = await Promise.allSettled(
        patientIds.map((id: any) =>
          api(
            `/patient-records/patient/${encodeURIComponent(
              id
            )}/appointments`
          )
        )
      );

      const rows: Appointment[] = [];

      results.forEach((r) => {
        if (r.status === "fulfilled") {
          extractArray(r.value?.data).forEach((a: any) =>
            rows.push(normalize(a, prescriptionMap))
          );
        }
      });

      const unique = new Map<string, Appointment>();
      rows.forEach((a, index) => unique.set(String(a.id ?? index), a));

      setAppointments(
        [...unique.values()].sort(
          (a, b) => appointmentDate(b) - appointmentDate(a)
        )
      );

      if (results.some((r) => r.status === "rejected")) {
        Alert.alert(
          "Partial Results",
          "Some patient appointment records could not be loaded."
        );
      }
    } catch (e: any) {
      setAppointments([]);
      Alert.alert(
        "Unable to Load Appointments",
        e?.message || "Unable to load appointment records."
      );
    }
  }

  function extractArray(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.appointments)) return data.appointments;
    return [];
  }

  function buildPrescriptionMap(list: any[]) {
    const map = new Map<string, any>();

    list.forEach((p) => {
      if (p?.appointmentId == null) return;

      const key = String(p.appointmentId);
      const existing = map.get(key);

      if (!existing || String(p?.status || "").toUpperCase() === "FINALIZED") {
        map.set(key, p);
      }
    });

    return map;
  }

  function normalize(a: any, prescriptionMap: Map<string, any>): Appointment {
    const id = a?.id ?? a?.appointmentId ?? null;
    const p = prescriptionMap.get(String(id)) || null;

    return {
      id,
      appointmentNumber:
        a?.appointmentNumber ||
        a?.bookingNumber ||
        (id !== null ? `APT-${id}` : "-"),
      patientId: a?.patientId ?? a?.userId ?? a?.patient?.id ?? null,
      patientName:
        a?.patientName || a?.userName || a?.patient?.name || "Patient",
      phoneNumber:
        a?.phoneNumber ||
        a?.patientPhone ||
        a?.patient?.phoneNumber ||
        "-",
      age: a?.age ?? a?.patientAge ?? a?.patient?.age ?? "-",
      gender: String(
        a?.gender || a?.patientGender || a?.patient?.gender || "-"
      ).toUpperCase(),
      doctorName: a?.doctorName || a?.doctor?.name || "-",
      specialization:
        a?.doctorSpecialization ||
        a?.specialization ||
        a?.doctor?.specialization ||
        "-",
      date: String(a?.appointmentDate || a?.date || "").substring(0, 10),
      startTime: a?.startTime || a?.time || "",
      endTime: a?.endTime || "",
      status: String(a?.status || "PENDING").toUpperCase(),
      paymentStatus: String(a?.paymentStatus || "PENDING").toUpperCase(),
      bookingFee: Number(a?.bookingFee || 0),
      symptoms: a?.symptoms || "-",
      history: a?.pastMedicalHistory || a?.history || "-",
      cancellationReason: a?.cancellationReason || "",
      rescheduleReason: a?.rescheduleReason || "",
      prescriptionId: p?.id ?? null,
      prescriptionStatus: p?.status || null,
      diagnosis: p?.diagnosis || "",
      advice: p?.advice || "",
    };
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return appointments.filter((a) => {
      const searchMatch =
        !q ||
        [
          a.appointmentNumber,
          a.id,
          a.patientName,
          a.phoneNumber,
          a.doctorName,
          a.symptoms,
        ].some((v) => String(v ?? "").toLowerCase().includes(q));

      return (
        searchMatch &&
        (!dateFilter || a.date === dateFilter) &&
        (!statusFilter || a.status === statusFilter) &&
        (!paymentFilter || a.paymentStatus === paymentFilter)
      );
    });
  }, [appointments, search, dateFilter, statusFilter, paymentFilter]);

  useEffect(() => setPage(1), [
    search,
    dateFilter,
    statusFilter,
    paymentFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const summary = useMemo(
    () => ({
      total: appointments.length,
      pending: appointments.filter((a) =>
        ["PENDING", "PAYMENT_PENDING", "RESCHEDULED"].includes(a.status)
      ).length,
      confirmed: appointments.filter((a) => a.status === "CONFIRMED").length,
      completed: appointments.filter((a) => a.status === "COMPLETED").length,
      cancelled: appointments.filter((a) =>
        ["CANCELLED", "REJECTED", "NO_SHOW"].includes(a.status)
      ).length,
    }),
    [appointments]
  );

  function resetFilters() {
    setSearch("");
    setDateFilter("");
    setStatusFilter("");
    setPaymentFilter("");
    setPage(1);
  }

  async function refresh() {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  }

  function openPrescription(a: Appointment) {
    if (!a.prescriptionId) {
      Alert.alert("Prescription", "Prescription is not available.");
      return;
    }

    router.push({
      pathname: "/medical/prescriptions" as any,
      params: {
        prescriptionId: String(a.prescriptionId),
        patientId: a.patientId != null ? String(a.patientId) : "",
      },
    } as any);
  }

  function onDateChange(_: any, date?: Date) {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (!date) return;

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    setDateFilter(`${y}-${m}-${d}`);
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={C.green} />
        <Text style={styles.loadingTitle}>Loading appointments</Text>
        <Text style={styles.loadingText}>
          Fetching medical staff appointment records...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <MedicalHeader
        title="Appointment Details"
        subtitle="Offline clinic appointments"
        onMenuPress={() => setMenuOpen(true)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[C.green]}
            tintColor={C.green}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="calendar-outline" size={25} color="#F5EBC9" />
          </View>
          <Text style={styles.eyebrow}>CLINICAL OPERATIONS</Text>
          <Text style={styles.heroTitle}>Offline Appointment Records</Text>
          <Text style={styles.heroText}>
            Review patient information, doctor details, appointment status,
            payment and prescriptions.
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard label="Total" value={summary.total} icon="list-outline" />
          <SummaryCard
            label="Pending"
            value={summary.pending}
            icon="hourglass-outline"
          />
          <SummaryCard
            label="Confirmed"
            value={summary.confirmed}
            icon="checkmark-circle-outline"
          />
          <SummaryCard
            label="Completed"
            value={summary.completed}
            icon="clipboard-outline"
          />
          <SummaryCard
            label="Cancelled"
            value={summary.cancelled}
            icon="close-circle-outline"
          />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={19} color={C.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Patient, doctor or appointment ID"
              placeholderTextColor="#A1ACA5"
              style={styles.searchInput}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={19} color={C.muted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.filterButton,
              !!(dateFilter || statusFilter || paymentFilter) &&
                styles.filterButtonActive,
            ]}
            onPress={() => setFilterOpen(true)}
          >
            <Ionicons
              name="options-outline"
              size={19}
              color={
                dateFilter || statusFilter || paymentFilter
                  ? C.white
                  : C.green
              }
            />
          </TouchableOpacity>
        </View>

        {!!(dateFilter || statusFilter || paymentFilter) && (
          <View style={styles.filterChips}>
            {!!dateFilter && (
              <Chip
                label={formatDate(dateFilter)}
                onRemove={() => setDateFilter("")}
              />
            )}
            {!!statusFilter && (
              <Chip
                label={label(statusFilter)}
                onRemove={() => setStatusFilter("")}
              />
            )}
            {!!paymentFilter && (
              <Chip
                label={label(paymentFilter)}
                onRemove={() => setPaymentFilter("")}
              />
            )}
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <View>
              <Text style={styles.panelTitle}>Appointment Records</Text>
              <Text style={styles.panelSub}>Offline appointments only.</Text>
            </View>
            <View style={styles.resultPill}>
              <Text style={styles.resultText}>{filtered.length} results</Text>
            </View>
          </View>

          <View style={styles.list}>
            {pageItems.length ? (
              pageItems.map((a) => (
                <AppointmentCard
                  key={String(a.id)}
                  a={a}
                  onView={() => setSelected(a)}
                  onPrescription={() => openPrescription(a)}
                />
              ))
            ) : (
              <View style={styles.empty}>
                <Ionicons
                  name="calendar-outline"
                  size={30}
                  color={C.gold}
                />
                <Text style={styles.emptyTitle}>No appointment records found</Text>
                <Text style={styles.emptyText}>
                  Try changing your search or filters.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.pagination}>
            <Text style={styles.pageInfo}>
              {filtered.length
                ? `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(
                    page * PAGE_SIZE,
                    filtered.length
                  )} of ${filtered.length}`
                : "Showing 0 appointments"}
            </Text>

            <View style={styles.pageControls}>
              <TouchableOpacity
                disabled={page === 1}
                style={[styles.pageBtn, page === 1 && { opacity: 0.35 }]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              >
                <Ionicons name="chevron-back" size={17} color={C.green} />
              </TouchableOpacity>

              <View style={styles.pageCurrent}>
                <Text style={styles.pageCurrentText}>{page}</Text>
              </View>

              <Text style={styles.pageOf}>of {totalPages}</Text>

              <TouchableOpacity
                disabled={page === totalPages}
                style={[
                  styles.pageBtn,
                  page === totalPages && { opacity: 0.35 },
                ]}
                onPress={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
              >
                <Ionicons name="chevron-forward" size={17} color={C.green} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        dateFilter={dateFilter}
        statusFilter={statusFilter}
        paymentFilter={paymentFilter}
        setStatusFilter={setStatusFilter}
        setPaymentFilter={setPaymentFilter}
        chooseDate={() => setShowDatePicker(true)}
        clearDate={() => setDateFilter("")}
        reset={resetFilters}
      />

      {showDatePicker && (
        <DateTimePicker
          value={dateFilter ? new Date(`${dateFilter}T00:00:00`) : new Date()}
          mode="date"
          onChange={onDateChange}
        />
      )}

      <DetailsModal
        appointment={selected}
        onClose={() => setSelected(null)}
        onPrescription={() => selected && openPrescription(selected)}
      />

      <MedicalDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeRoute="/medical/appointments"
      />
    </View>
  );
}

function SummaryCard({
  label: text,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={19} color={C.green2} />
      </View>
      <Text style={styles.summaryLabel}>{text}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function AppointmentCard({
  a,
  onView,
  onPrescription,
}: {
  a: Appointment;
  onView: () => void;
  onPrescription: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.patient}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {a.patientName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{a.patientName}</Text>
            <Text style={styles.patientPhone}>{a.phoneNumber}</Text>
          </View>
        </View>
        <Badge value={a.status} kind="status" />
      </View>

      <View style={styles.idRow}>
        <Text style={styles.appNo}>{a.appointmentNumber}</Text>
        <Text style={styles.appId}>ID: {String(a.id ?? "-")}</Text>
      </View>

      <View style={styles.detailGrid}>
        <Mini label="Doctor" value={a.doctorName} icon="person-outline" />
        <Mini
          label="Specialization"
          value={a.specialization}
          icon="medkit-outline"
        />
        <Mini label="Date" value={formatDate(a.date)} icon="calendar-outline" />
        <Mini
          label="Time"
          value={formatTimeRange(a.startTime, a.endTime)}
          icon="time-outline"
        />
      </View>

      <View style={styles.paymentRow}>
        <View>
          <Text style={styles.metaLabel}>Payment</Text>
          <Badge value={a.paymentStatus} kind="payment" />
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.metaLabel}>Booking Fee</Text>
          <Text style={styles.fee}>
            ₹{Number(a.bookingFee || 0).toLocaleString("en-IN")}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.viewBtn} onPress={onView}>
          <Ionicons name="eye-outline" size={18} color={C.green} />
          <Text style={styles.viewText}>View Details</Text>
        </TouchableOpacity>

        {a.prescriptionId ? (
          <TouchableOpacity style={styles.rxBtn} onPress={onPrescription}>
            <Ionicons
              name="document-text-outline"
              size={18}
              color={C.purple}
            />
            <Text style={styles.rxText}>Prescription</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.noRx}>
            <Text style={styles.noRxText}>No Prescription</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function Mini({
  label: title,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.mini}>
      <Ionicons name={icon} size={15} color={C.gold} />
      <View style={{ flex: 1 }}>
        <Text style={styles.miniLabel}>{title}</Text>
        <Text style={styles.miniValue} numberOfLines={2}>
          {value || "-"}
        </Text>
      </View>
    </View>
  );
}

function Badge({
  value,
  kind,
}: {
  value: string;
  kind: "status" | "payment";
}) {
  const s = String(value || "").toUpperCase();

  let bg = C.warningBg;
  let color = C.warning;

  if (kind === "payment") {
    if (["SUCCESS", "PAID"].includes(s)) {
      bg = C.successBg;
      color = C.success;
    } else if (["FAILED", "PAYMENT_FAILED"].includes(s)) {
      bg = C.dangerBg;
      color = C.danger;
    }
  } else {
    if (["CONFIRMED", "COMPLETED"].includes(s)) {
      bg = C.successBg;
      color = C.success;
    } else if (["CANCELLED", "REJECTED", "NO_SHOW"].includes(s)) {
      bg = C.dangerBg;
      color = C.danger;
    } else if (s === "RESCHEDULED") {
      bg = C.infoBg;
      color = C.info;
    }
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label(s)}</Text>
    </View>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
      <TouchableOpacity onPress={onRemove}>
        <Ionicons name="close" size={14} color={C.green} />
      </TouchableOpacity>
    </View>
  );
}

function FilterSheet(props: {
  visible: boolean;
  onClose: () => void;
  dateFilter: string;
  statusFilter: string;
  paymentFilter: string;
  setStatusFilter: (v: string) => void;
  setPaymentFilter: (v: string) => void;
  chooseDate: () => void;
  clearDate: () => void;
  reset: () => void;
}) {
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="fade"
      onRequestClose={props.onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={props.onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Filter Appointments</Text>
              <Text style={styles.sheetSub}>Narrow the appointment list.</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={props.onClose}>
              <Ionicons name="close" size={20} color={C.green} />
            </TouchableOpacity>
          </View>

          <Text style={styles.filterLabel}>Date</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.dateBtn} onPress={props.chooseDate}>
              <Ionicons name="calendar-outline" size={18} color={C.green} />
              <Text style={styles.dateBtnText}>
                {props.dateFilter
                  ? formatDate(props.dateFilter)
                  : "Select date"}
              </Text>
            </TouchableOpacity>
            {!!props.dateFilter && (
              <TouchableOpacity style={styles.clearDate} onPress={props.clearDate}>
                <Ionicons name="close" size={18} color={C.danger} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.filterLabel}>Appointment Status</Text>
          <View style={styles.options}>
            {STATUS_OPTIONS.map(([text, value]) => (
              <Option
                key={text}
                text={text}
                active={props.statusFilter === value}
                onPress={() => props.setStatusFilter(value)}
              />
            ))}
          </View>

          <Text style={styles.filterLabel}>Payment Status</Text>
          <View style={styles.options}>
            {PAYMENT_OPTIONS.map(([text, value]) => (
              <Option
                key={text}
                text={text}
                active={props.paymentFilter === value}
                onPress={() => props.setPaymentFilter(value)}
              />
            ))}
          </View>

          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.resetBtn} onPress={props.reset}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={props.onClose}>
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Option({
  text,
  active,
  onPress,
}: {
  text: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.option, active && styles.optionActive]}
      onPress={onPress}
    >
      <Text style={[styles.optionText, active && styles.optionTextActive]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

function DetailsModal({
  appointment,
  onClose,
  onPrescription,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onPrescription: () => void;
}) {
  if (!appointment) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.detailsModal}>
          <View style={styles.handle} />
          <View style={styles.detailsHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Appointment Details</Text>
              <Text style={styles.sheetSub}>{appointment.appointmentNumber}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={C.green} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.detailsBody}>
            <View style={styles.patientHero}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {appointment.patientName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{appointment.patientName}</Text>
                <Text style={styles.patientPhone}>
                  {appointment.phoneNumber} · {appointment.age} years ·{" "}
                  {appointment.gender}
                </Text>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <Box label="Appointment ID" value={appointment.appointmentNumber} />
              <Box label="Doctor" value={appointment.doctorName} />
              <Box label="Specialization" value={appointment.specialization} />
              <Box label="Date" value={formatDate(appointment.date)} />
              <Box
                label="Time"
                value={formatTimeRange(
                  appointment.startTime,
                  appointment.endTime
                )}
              />
              <Box
                label="Booking Fee"
                value={`₹${Number(
                  appointment.bookingFee || 0
                ).toLocaleString("en-IN")}`}
              />
              <Box label="Payment" value={label(appointment.paymentStatus)} />
              <Box label="Status" value={label(appointment.status)} />
              <Box label="Symptoms" value={appointment.symptoms} full />
              <Box
                label="Past Medical History"
                value={appointment.history}
                full
              />
              {!!appointment.rescheduleReason && (
                <Box
                  label="Reschedule Reason"
                  value={appointment.rescheduleReason}
                  full
                />
              )}
              {!!appointment.cancellationReason && (
                <Box
                  label="Cancellation Reason"
                  value={appointment.cancellationReason}
                  full
                />
              )}
              {!!appointment.diagnosis && (
                <Box
                  label="Prescription Diagnosis"
                  value={appointment.diagnosis}
                  full
                />
              )}
              {!!appointment.advice && (
                <Box
                  label="Prescription Advice"
                  value={appointment.advice}
                  full
                />
              )}
            </View>
          </ScrollView>

          <View style={styles.detailsActions}>
            <TouchableOpacity style={styles.detailsClose} onPress={onClose}>
              <Text style={styles.detailsCloseText}>Close</Text>
            </TouchableOpacity>

            {!!appointment.prescriptionId && (
              <TouchableOpacity
                style={styles.detailsRx}
                onPress={onPrescription}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={C.white}
                />
                <Text style={styles.detailsRxText}>View Prescription</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Box({
  label,
  value,
  full,
}: {
  label: string;
  value: any;
  full?: boolean;
}) {
  return (
    <View style={[styles.box, full && { width: "100%" }]}>
      <Text style={styles.boxLabel}>{label}</Text>
      <Text style={styles.boxValue}>{value || "-"}</Text>
    </View>
  );
}

function appointmentDate(a: Appointment) {
  const d = new Date(
    `${a.date || "1970-01-01"}T${a.startTime || "00:00:00"}`
  );
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatDate(v?: string) {
  if (!v) return "-";
  const d = new Date(`${String(v).substring(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function formatTime(v?: string) {
  if (!v) return "-";
  const p = String(v).split(":");
  if (p.length < 2) return v;
  const d = new Date();
  d.setHours(Number(p[0]), Number(p[1]), 0, 0);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTimeRange(start?: string, end?: string) {
  return end ? `${formatTime(start)} - ${formatTime(end)}` : formatTime(start);
}

function label(v: string) {
  return String(v || "-")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.cream,
    padding: 24,
  },
  loadingTitle: {
    marginTop: 14,
    color: C.green,
    fontSize: 17,
    fontWeight: "800",
  },
  loadingText: { marginTop: 5, color: C.muted, fontSize: 10 },
  content: { padding: 14, paddingBottom: 34 },
  hero: {
    padding: 20,
    marginBottom: 14,
    borderRadius: 21,
    backgroundColor: C.green,
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
    color: C.white,
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
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 14,
  },
  summaryCard: {
    width: "48.6%",
    minHeight: 108,
    padding: 13,
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDF5EF",
    marginBottom: 9,
  },
  summaryLabel: { color: C.muted, fontSize: 10, fontWeight: "700" },
  summaryValue: {
    color: C.green,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 3,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    marginBottom: 9,
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchBox: {
    flex: 1,
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, minHeight: 45, color: C.text, fontSize: 11 },
  filterButton: {
    width: 47,
    height: 47,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  filterButtonActive: { backgroundColor: C.green, borderColor: C.green },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    alignItems: "center",
    marginBottom: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    minHeight: 31,
    borderRadius: 16,
    backgroundColor: "#EDF5EF",
  },
  chipText: { color: C.green, fontSize: 9, fontWeight: "700" },
  clearText: { color: C.danger, fontSize: 9, fontWeight: "800" },
  panel: {
    borderRadius: 19,
    overflow: "hidden",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  panelHead: {
    minHeight: 66,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  panelTitle: { color: C.green, fontSize: 15, fontWeight: "800" },
  panelSub: { marginTop: 2, color: C.muted, fontSize: 9 },
  resultPill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#EDF5EF",
  },
  resultText: { color: C.green, fontSize: 9, fontWeight: "800" },
  list: { padding: 11, gap: 10 },
  card: {
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#FCFDFB",
    borderWidth: 1,
    borderColor: "#E7ECE8",
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  patient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.green,
  },
  avatarText: { color: C.white, fontSize: 14, fontWeight: "800" },
  patientName: { color: C.green, fontSize: 12, fontWeight: "800" },
  patientPhone: { color: C.muted, fontSize: 9, marginTop: 2 },
  idRow: {
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#EDF0ED",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  appNo: { color: C.green, fontSize: 10, fontWeight: "800" },
  appId: { color: C.muted, fontSize: 9 },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  mini: {
    width: "48.6%",
    minHeight: 55,
    padding: 9,
    borderRadius: 11,
    flexDirection: "row",
    gap: 7,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  miniLabel: { color: C.muted, fontSize: 8, fontWeight: "700" },
  miniValue: {
    color: C.text,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  paymentRow: {
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EDF0ED",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: { color: C.muted, fontSize: 8, marginBottom: 5 },
  fee: { color: C.green, fontSize: 13, fontWeight: "800" },
  badge: {
    alignSelf: "flex-start",
    maxWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  badgeText: { fontSize: 8, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  viewBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EDF5EF",
  },
  viewText: { color: C.green, fontSize: 10, fontWeight: "800" },
  rxBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.purpleBg,
  },
  rxText: { color: C.purple, fontSize: 10, fontWeight: "800" },
  noRx: {
    flex: 1,
    minHeight: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F5F3",
  },
  noRxText: { color: C.muted, fontSize: 9, fontWeight: "700" },
  empty: {
    minHeight: 170,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: C.green,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 9,
  },
  emptyText: { color: C.muted, fontSize: 9, marginTop: 3 },
  pagination: {
    minHeight: 64,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageInfo: { flex: 1, color: C.muted, fontSize: 9 },
  pageControls: { flexDirection: "row", alignItems: "center", gap: 6 },
  pageBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  pageCurrent: {
    minWidth: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.green,
  },
  pageCurrentText: { color: C.white, fontSize: 10, fontWeight: "800" },
  pageOf: { color: C.muted, fontSize: 9 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,25,17,.56)",
  },
  sheet: {
    maxHeight: "90%",
    padding: 14,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: C.white,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    backgroundColor: "#DDE4DF",
    marginBottom: 10,
  },
  sheetHead: { flexDirection: "row", alignItems: "center", minHeight: 56 },
  sheetTitle: { color: C.green, fontSize: 17, fontWeight: "800" },
  sheetSub: { color: C.muted, fontSize: 9, marginTop: 2 },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F7F4",
  },
  filterLabel: {
    color: C.green,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 13,
    marginBottom: 7,
  },
  dateBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: C.border,
  },
  dateBtnText: { color: C.text, fontSize: 10, fontWeight: "600" },
  clearDate: {
    width: 46,
    height: 46,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.dangerBg,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  option: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  optionActive: { backgroundColor: C.green, borderColor: C.green },
  optionText: { color: C.text, fontSize: 9, fontWeight: "700" },
  optionTextActive: { color: C.white },
  sheetActions: { flexDirection: "row", gap: 8, marginTop: 18 },
  resetBtn: {
    flex: 0.4,
    minHeight: 48,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  resetText: { color: C.green, fontSize: 10, fontWeight: "800" },
  applyBtn: {
    flex: 0.6,
    minHeight: 48,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.green,
  },
  applyText: { color: C.white, fontSize: 10, fontWeight: "800" },
  detailsModal: {
    height: "88%",
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    paddingTop: 8,
  },
  detailsHead: {
    minHeight: 64,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  detailsBody: { padding: 14, paddingBottom: 20 },
  patientHero: {
    padding: 13,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EDF5EF",
    marginBottom: 12,
  },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  box: {
    width: "48.6%",
    minHeight: 62,
    padding: 10,
    borderRadius: 11,
    backgroundColor: "#FCFDFB",
    borderWidth: 1,
    borderColor: C.border,
  },
  boxLabel: {
    color: C.muted,
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  boxValue: {
    color: C.green,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
  },
  detailsActions: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  detailsClose: {
    flex: 0.4,
    minHeight: 48,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  detailsCloseText: { color: C.green, fontSize: 10, fontWeight: "800" },
  detailsRx: {
    flex: 0.6,
    minHeight: 48,
    borderRadius: 11,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.green,
  },
  detailsRxText: { color: C.white, fontSize: 10, fontWeight: "800" },
});
