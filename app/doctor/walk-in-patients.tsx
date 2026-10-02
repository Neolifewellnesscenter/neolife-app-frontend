import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  useWindowDimensions,
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

const PAGE_SIZE = 8;
const STATUSES = ["", "WAITING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const VIEWS = ["ACTIVE", "ALL"];

type WalkInPatient = {
  id: string | number;
  name: string;
  phoneNumber: string;
  age: string | number;
  gender: string;
  email: string;
  address: string;
  symptoms: string;
  pastMedicalHistory: string;
  doctorId: string | number | null;
  doctorName: string;
  appointmentDate: string;
  startTime: string;
  status: string;
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
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
  diagnosis?: string;
  advice?: string;
  notes?: string;
  status?: string;
  finalizedAt?: string;
  createdAt?: string;
  items?: PrescriptionItem[];
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

function normalize(item: any): WalkInPatient {
  return {
    id: item?.id ?? item?.walkInPatientId,
    name: item?.name || item?.patientName || "Walk-in Patient",
    phoneNumber: item?.phoneNumber || "—",
    age: item?.age ?? "—",
    gender: item?.gender || "—",
    email: item?.email || "—",
    address: item?.address || "—",
    symptoms: item?.symptoms || "No symptoms provided.",
    pastMedicalHistory:
      item?.pastMedicalHistory || "No past medical history provided.",
    doctorId: item?.doctorId ?? null,
    doctorName: item?.doctorName || "Doctor",
    appointmentDate: item?.appointmentDate || item?.date || "",
    startTime: item?.startTime || "",
    status: String(item?.status || "IN_PROGRESS").toUpperCase(),
    active: item?.active !== false,
    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
  };
}

function statusPalette(value: string) {
  const status = String(value || "").toUpperCase();
  if (status === "COMPLETED") return { bg: SUCCESS_LIGHT, fg: SUCCESS };
  if (status === "CANCELLED") return { bg: DANGER_LIGHT, fg: DANGER };
  if (status === "IN_PROGRESS") return { bg: INFO_LIGHT, fg: INFO };
  return { bg: WARNING_LIGHT, fg: WARNING };
}

export default function DoctorWalkInPatientsScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const small = width < 375;
  const verySmall = width <= 340;

  const [menuOpen, setMenuOpen] = useState(false);
  const [patients, setPatients] = useState<WalkInPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState("ALL");
  const [page, setPage] = useState(1);

  const [filterOpen, setFilterOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selected, setSelected] = useState<WalkInPatient | null>(null);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

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

    if (response.status === 401) {
      await clearSession();
      router.replace("/login" as any);
      const error: any = new Error(
        result?.message || "Your session expired. Please log in again."
      );
      error.status = 401;
      throw error;
    }

    if (response.status === 403) {
      const error: any = new Error(
        result?.message || "You do not have permission to access this resource."
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
    setNotice({ visible: true, type, title, message });
  }

  async function loadPatients(fullLoader = true) {
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

      const result = dateFilter
        ? await api(
            `/walk-in-patients/doctor/date/${encodeURIComponent(dateFilter)}`
          )
        : await api("/walk-in-patients/doctor/my-patients");

      const data = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.data?.content)
        ? result.data.content
        : [];

      const normalized = data
        .map(normalize)
        .filter((item: WalkInPatient) => item.id != null)
        .sort((a: WalkInPatient, b: WalkInPatient) =>
          `${b.appointmentDate || ""}T${b.startTime || ""}`.localeCompare(
            `${a.appointmentDate || ""}T${a.startTime || ""}`
          )
        );

      setPatients(normalized);
    } catch (error: any) {
      setPatients([]);
      showNotice(
        "error",
        "Unable to Load",
        error?.message || "Unable to load walk-in patients."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadPatients(true);
  }, []);

  useEffect(() => {
    if (!loading) void loadPatients(false);
  }, [dateFilter]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return patients.filter((patient) => {
      const activeMatch =
        viewMode === "ALL" ||
        (viewMode === "ACTIVE" &&
          ["WAITING", "IN_PROGRESS"].includes(patient.status));

      const statusMatch =
        !statusFilter || patient.status === statusFilter;

      const searchMatch =
        !term ||
        [
          patient.name,
          patient.phoneNumber,
          patient.email,
          patient.symptoms,
          patient.id,
        ].some((value) =>
          String(value || "").toLowerCase().includes(term)
        );

      return activeMatch && statusMatch && searchMatch;
    });
  }, [patients, search, statusFilter, viewMode]);

  useEffect(() => setPage(1), [search, dateFilter, statusFilter, viewMode]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visiblePatients = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const counts = useMemo(
    () => ({
      total: patients.length,
      waiting: patients.filter((item) => item.status === "WAITING").length,
      inProgress: patients.filter((item) => item.status === "IN_PROGRESS")
        .length,
      completed: patients.filter((item) => item.status === "COMPLETED").length,
    }),
    [patients]
  );

  async function refresh() {
    setRefreshing(true);
    await loadPatients(false);
  }

  function resetFilters() {
    setSearch("");
    setDateFilter("");
    setStatusFilter("");
    setViewMode("ALL");
    setPage(1);
  }

  function onDateChange(_: any, value?: Date) {
    if (Platform.OS === "android") setDatePickerOpen(false);
    if (!value) return;
    setDateFilter(localDateKey(value));
  }

  async function openDetails(patient: WalkInPatient) {
    setDetailsLoading(true);
    setPrescriptionLoading(true);
    setPrescription(null);

    try {
      const patientResult = await api(
        `/walk-in-patients/${encodeURIComponent(String(patient.id))}/get`
      );

      setSelected(normalize(patientResult?.data || patient));

      try {
        const prescriptionResult = await api(
          `/prescriptions/walk-in-patient/${encodeURIComponent(
            String(patient.id)
          )}`
        );
        setPrescription(prescriptionResult?.data || null);
      } catch (error: any) {
        const message = String(error?.message || "").toLowerCase();
        if (
          error?.status === 404 ||
          message.includes("prescription not found") ||
          message.includes("not found")
        ) {
          setPrescription(null);
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      showNotice(
        "error",
        "Unable to Load Details",
        error?.message || "Unable to load walk-in patient details."
      );
    } finally {
      setPrescriptionLoading(false);
      setDetailsLoading(false);
    }
  }

  function openPrescriptionPad(patient: WalkInPatient) {
    setSelected(null);
    router.push({
      pathname: "/doctor/prescription-pad" as any,
      params: {
        walkInPatientId: String(patient.id),
        ...(prescription?.id
          ? { prescriptionId: String(prescription.id) }
          : {}),
      },
    } as any);
  }

  async function downloadPrescriptionPdf(
    prescriptionId: string | number,
    action: "view" | "download"
  ) {
    setPdfBusy(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Doctor login required.");

      const safePatientName = String(selected?.name || "patient")
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const date = selected?.appointmentDate || localDateKey(new Date());
      const fileName = `${safePatientName || "patient"}-${date}-prescription.pdf`;
      const target = `${FileSystem.cacheDirectory}${fileName}`;

      const download = await FileSystem.downloadAsync(
        `${API_BASE_URL}/prescriptions/${encodeURIComponent(
          String(prescriptionId)
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
          "You do not have permission to access this prescription."
        );
      }

      if (download.status < 200 || download.status >= 300) {
        throw new Error(
          `Unable to load prescription PDF (${download.status}).`
        );
      }

      if (!(await Sharing.isAvailableAsync())) {
        throw new Error(
          "PDF sharing/viewing is not available on this device."
        );
      }

      await Sharing.shareAsync(download.uri, {
        mimeType: "application/pdf",
        dialogTitle:
          action === "view"
            ? `View ${fileName}`
            : `Save or share ${fileName}`,
        UTI: "com.adobe.pdf",
      });
    } catch (error: any) {
      showNotice(
        "error",
        action === "view" ? "Unable to View PDF" : "Unable to Download PDF",
        error?.message || "Unable to access prescription PDF."
      );
    } finally {
      setPdfBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingTitle}>Loading walk-in patients</Text>
        <Text style={styles.loadingText}>
          Fetching patients assigned to your doctor account...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <DoctorHeader
        title="Walk-in Patients"
        subtitle="View and manage assigned walk-in patients"
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
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: verySmall ? 12 : small ? 14 : 17 },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="walk-outline" size={25} color="#F5EBC9" />
          </View>

          <Text style={styles.eyebrow}>CLINICAL OPERATIONS</Text>
          <Text style={[styles.heroTitle, verySmall && { fontSize: 27 }]}>
            Walk-in Patients
          </Text>
          <Text style={styles.heroText}>
            Review patients assigned by Admin or Medical Staff and continue
            their consultation using the prescription pad.
          </Text>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => loadPatients(false)}
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
          <StatCard icon="people-outline" label="Total" value={counts.total} />
          <StatCard icon="time-outline" label="Waiting" value={counts.waiting} />
          <StatCard
            icon="pulse-outline"
            label="In Progress"
            value={counts.inProgress}
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="Completed"
            value={counts.completed}
          />
        </View>

        <View style={styles.searchPanel}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={MUTED} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Name, phone, symptoms or ID"
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
              !!(dateFilter || statusFilter || viewMode !== "ALL") &&
                styles.filterButtonActive,
            ]}
            onPress={() => setFilterOpen(true)}
          >
            <Ionicons
              name="options-outline"
              size={19}
              color={
                dateFilter || statusFilter || viewMode !== "ALL"
                  ? WHITE
                  : GREEN
              }
            />
          </TouchableOpacity>
        </View>

        {!!(dateFilter || statusFilter || viewMode !== "ALL") && (
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
            {viewMode !== "ALL" && (
              <FilterChip
                label="Current patients"
                onRemove={() => setViewMode("ALL")}
              />
            )}
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.clearFilters}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.panelEyebrow}>ASSIGNED PATIENTS</Text>
              <Text style={styles.panelTitle}>Walk-in Patient List</Text>
              <Text style={styles.panelSub}>
                All walk-in patients assigned to your doctor profile.
              </Text>
            </View>

            <View style={styles.resultPill}>
              <Text style={styles.resultText}>{filtered.length} results</Text>
            </View>
          </View>

          <View style={styles.list}>
            {visiblePatients.length ? (
              visiblePatients.map((item) => (
                <WalkInCard
                  key={String(item.id)}
                  item={item}
                  detailsLoading={detailsLoading}
                  onView={() => openDetails(item)}
                  onPrescription={() => openPrescriptionPad(item)}
                />
              ))
            ) : (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={31} color={GOLD_DARK} />
                <Text style={styles.emptyTitle}>No walk-in patients found</Text>
                <Text style={styles.emptyText}>
                  There are no patients matching the selected filters.
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
                : "Showing 0 patients"}
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
        bottomInset={insets.bottom}
        onClose={() => setFilterOpen(false)}
        date={dateFilter}
        status={statusFilter}
        viewMode={viewMode}
        setStatus={setStatusFilter}
        setViewMode={setViewMode}
        chooseDate={() => setDatePickerOpen(true)}
        clearDate={() => setDateFilter("")}
        setToday={() => setDateFilter(localDateKey(new Date()))}
        reset={resetFilters}
      />

      {datePickerOpen && (
        <DateTimePicker
          value={
            dateFilter
              ? new Date(`${dateFilter}T00:00:00`)
              : new Date()
          }
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChange}
        />
      )}

      <WalkInDetailsModal
        patient={selected}
        prescription={prescription}
        prescriptionLoading={prescriptionLoading}
        pdfBusy={pdfBusy}
        bottomInset={insets.bottom}
        onClose={() => {
          setSelected(null);
          setPrescription(null);
        }}
        onPrescription={() => selected && openPrescriptionPad(selected)}
        onViewPdf={(id) => downloadPrescriptionPdf(id, "view")}
        onDownloadPdf={(id) => downloadPrescriptionPdf(id, "download")}
      />

      <DoctorDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeRoute="/doctor/walk-in-patients"
      />
    </View>
  );
}

function WalkInCard({
  item,
  detailsLoading,
  onView,
  onPrescription,
}: {
  item: WalkInPatient;
  detailsLoading: boolean;
  onView: () => void;
  onPrescription: () => void;
}) {
  const palette = statusPalette(item.status);
  const canPrescribe = ["WAITING", "IN_PROGRESS"].includes(item.status);

  return (
    <View style={styles.patientCard}>
      <View style={styles.cardTop}>
        <View style={styles.patientBlock}>
          <View style={styles.patientAvatar}>
            <Text style={styles.patientAvatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.patientName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.patientPhone}>{item.phoneNumber}</Text>
            <Text style={styles.patientId}>WALK-{item.id}</Text>
          </View>
        </View>

        <View style={[styles.badge, { backgroundColor: palette.bg }]}>
          <Text style={[styles.badgeText, { color: palette.fg }]}>
            {titleCase(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <InfoItem
          icon="calendar-outline"
          label="Date"
          value={formatDate(item.appointmentDate)}
        />
        <InfoItem
          icon="time-outline"
          label="Time"
          value={formatTime(item.startTime)}
        />
      </View>

      <View style={styles.symptomBox}>
        <Text style={styles.symptomLabel}>SYMPTOMS</Text>
        <Text style={styles.symptomText} numberOfLines={3}>
          {item.symptoms}
        </Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={onView}
          disabled={detailsLoading}
        >
          {detailsLoading ? (
            <ActivityIndicator size="small" color={GREEN} />
          ) : (
            <Ionicons name="eye-outline" size={17} color={GREEN} />
          )}
          <Text style={styles.viewButtonText}>View details</Text>
        </TouchableOpacity>

        {canPrescribe && (
          <TouchableOpacity
            style={styles.prescriptionButton}
            onPress={onPrescription}
          >
            <Ionicons name="document-text-outline" size={17} color={WHITE} />
            <Text style={styles.prescriptionButtonText}>Rx Prescription</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function WalkInDetailsModal({
  patient,
  prescription,
  prescriptionLoading,
  pdfBusy,
  bottomInset,
  onClose,
  onPrescription,
  onViewPdf,
  onDownloadPdf,
}: {
  patient: WalkInPatient | null;
  prescription: Prescription | null;
  prescriptionLoading: boolean;
  pdfBusy: boolean;
  bottomInset: number;
  onClose: () => void;
  onPrescription: () => void;
  onViewPdf: (id: string | number) => void;
  onDownloadPdf: (id: string | number) => void;
}) {
  if (!patient) return null;

  const canPrescribe = ["WAITING", "IN_PROGRESS"].includes(patient.status);
  const medicines = Array.isArray(prescription?.items)
    ? prescription!.items!
    : [];

  return (
    <Modal
      visible={Boolean(patient)}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.detailsSheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.detailsHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.detailsEyebrow}>WALK-IN PATIENT</Text>
              <Text style={styles.detailsTitle} numberOfLines={1}>
                {patient.name}
              </Text>
              <Text style={styles.detailsSub}>WALK-{patient.id}</Text>
            </View>

            <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
              <Ionicons name="close" size={20} color={GREEN} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailsBody}
          >
            <View style={styles.modalStatusRow}>
              <StatusBadge status={patient.status} />
              <Text style={styles.modalDate}>
                {formatDate(patient.appointmentDate)} ·{" "}
                {formatTime(patient.startTime)}
              </Text>
            </View>

            <View style={styles.detailsGrid}>
              <Detail label="Phone number" value={patient.phoneNumber} />
              <Detail label="Age" value={String(patient.age)} />
              <Detail label="Gender" value={titleCase(patient.gender)} />
              <Detail label="Email" value={patient.email} />
              <Detail label="Assigned doctor" value={patient.doctorName} />
              <Detail
                label="Active record"
                value={patient.active ? "Yes" : "No"}
              />
              <Detail wide label="Address" value={patient.address} />
              <Detail wide label="Symptoms" value={patient.symptoms} />
              <Detail
                wide
                label="Past medical history"
                value={patient.pastMedicalHistory}
              />
            </View>

            <View style={styles.prescriptionSection}>
              <View style={styles.sectionHeadingRow}>
                <View style={styles.sectionIcon}>
                  <Ionicons
                    name="document-text-outline"
                    size={19}
                    color={GREEN}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionEyebrow}>PRESCRIPTION</Text>
                  <Text style={styles.sectionTitle}>Clinical Prescription</Text>
                </View>
              </View>

              {prescriptionLoading ? (
                <View style={styles.inlineLoading}>
                  <ActivityIndicator size="small" color={GREEN} />
                  <Text style={styles.inlineLoadingText}>
                    Loading prescription…
                  </Text>
                </View>
              ) : prescription ? (
                <>
                  <View style={styles.detailsGrid}>
                    <Detail
                      label="Prescription ID"
                      value={`#${prescription.id}`}
                    />
                    <Detail
                      label="Status"
                      value={titleCase(prescription.status)}
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

                  {!!medicines.length && (
                    <View style={styles.medicineSection}>
                      <Text style={styles.medicineSectionTitle}>
                        Medicines ({medicines.length})
                      </Text>
                      {medicines.map((medicine, index) => (
                        <View
                          key={String(medicine.id ?? index)}
                          style={styles.medicineCard}
                        >
                          <Text style={styles.medicineName}>
                            {medicine.medicineName ||
                              medicine.productName ||
                              "Medicine"}
                          </Text>
                          <Text style={styles.medicineMeta}>
                            {medicine.dosage || "—"} ·{" "}
                            {medicine.frequency || "—"} ·{" "}
                            {medicine.durationDays ?? "—"} day(s)
                          </Text>
                          <Text style={styles.medicineInstruction}>
                            {medicine.instructions || "No instructions"}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.pdfActions}>
                    <TouchableOpacity
                      style={styles.pdfViewButton}
                      onPress={() => onViewPdf(prescription.id)}
                      disabled={pdfBusy}
                    >
                      {pdfBusy ? (
                        <ActivityIndicator size="small" color={GREEN} />
                      ) : (
                        <Ionicons name="eye-outline" size={17} color={GREEN} />
                      )}
                      <Text style={styles.pdfViewText}>View PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.pdfDownloadButton}
                      onPress={() => onDownloadPdf(prescription.id)}
                      disabled={pdfBusy}
                    >
                      <Ionicons
                        name="download-outline"
                        size={17}
                        color={WHITE}
                      />
                      <Text style={styles.pdfDownloadText}>Download PDF</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.noPrescription}>
                  <Ionicons
                    name="document-outline"
                    size={24}
                    color={GOLD_DARK}
                  />
                  <Text style={styles.noPrescriptionTitle}>
                    No prescription created
                  </Text>
                  <Text style={styles.noPrescriptionText}>
                    No prescription has been created for this walk-in patient.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View
            style={[
              styles.detailsActions,
              {
                paddingBottom: Math.max(bottomInset, 12) + 8,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={onClose}
            >
              <Text style={styles.secondaryActionText}>Close</Text>
            </TouchableOpacity>

            {canPrescribe && (
              <TouchableOpacity
                style={styles.primaryAction}
                onPress={onPrescription}
              >
                <Ionicons
                  name="document-text-outline"
                  size={17}
                  color={WHITE}
                />
                <Text style={styles.primaryActionText}>
                  Open Prescription Pad
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FilterSheet({
  visible,
  bottomInset,
  onClose,
  date,
  status,
  viewMode,
  setStatus,
  setViewMode,
  chooseDate,
  clearDate,
  setToday,
  reset,
}: {
  visible: boolean;
  bottomInset: number;
  onClose: () => void;
  date: string;
  status: string;
  viewMode: string;
  setStatus: (value: string) => void;
  setViewMode: (value: string) => void;
  chooseDate: () => void;
  clearDate: () => void;
  setToday: () => void;
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
              <Text style={styles.detailsTitle}>Filter Walk-in Patients</Text>
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

            <TouchableOpacity style={styles.todayButton} onPress={setToday}>
              <Ionicons name="today-outline" size={16} color={GREEN} />
              <Text style={styles.todayButtonText}>Use Today</Text>
            </TouchableOpacity>

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

            <FieldLabel label="View" top />
            <View style={styles.optionGrid}>
              {VIEWS.map((value) => (
                <OptionChip
                  key={value}
                  label={
                    value === "ACTIVE"
                      ? "Current Patients"
                      : "All Returned Patients"
                  }
                  active={viewMode === value}
                  onPress={() => setViewMode(value)}
                />
              ))}
            </View>
          </ScrollView>

          <View
            style={[
              styles.detailsActions,
              {
                paddingBottom: Math.max(bottomInset, 12) + 8,
              },
            ]}
          >
            <TouchableOpacity style={styles.secondaryAction} onPress={reset}>
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
      <Ionicons name={palette.icon as any} size={20} color={palette.fg} />
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
  icon: any;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={19} color={GREEN} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={GREEN} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const palette = statusPalette(status);
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>
        {titleCase(status)}
      </Text>
    </View>
  );
}

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.detailCard, wide && styles.detailWide]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "—"}</Text>
    </View>
  );
}

function FieldLabel({
  label,
  top = false,
}: {
  label: string;
  top?: boolean;
}) {
  return (
    <Text style={[styles.fieldLabel, top && { marginTop: 20 }]}>{label}</Text>
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
        style={[
          styles.optionChipText,
          active && styles.optionChipTextActive,
        ]}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  content: { paddingTop: 16, paddingBottom: 42 },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: CREAM,
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 19,
    fontWeight: "800",
    color: GREEN,
    textAlign: "center",
  },
  loadingText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
    textAlign: "center",
  },

  hero: {
    padding: 20,
    borderRadius: 25,
    backgroundColor: GREEN,
    overflow: "hidden",
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.09)",
    marginBottom: 18,
  },
  eyebrow: {
    color: GOLD,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  heroTitle: {
    marginTop: 6,
    color: WHITE,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: "900",
  },
  heroText: {
    marginTop: 9,
    maxWidth: 520,
    color: "#DCE8E2",
    fontSize: 13,
    lineHeight: 20,
  },
  refreshButton: {
    marginTop: 18,
    alignSelf: "flex-start",
    minHeight: 42,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: GREEN_2,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.12)",
  },
  refreshText: { color: WHITE, fontSize: 12, fontWeight: "800" },

  notice: {
    marginTop: 14,
    padding: 14,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  noticeTitle: { fontSize: 13, fontWeight: "900" },
  noticeText: {
    marginTop: 2,
    color: TEXT,
    fontSize: 12,
    lineHeight: 18,
  },

  statsGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "48%",
    minWidth: 135,
    flexGrow: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  statValue: {
    marginTop: 10,
    color: GREEN,
    fontSize: 22,
    fontWeight: "900",
  },
  statLabel: {
    marginTop: 2,
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },

  searchPanel: {
    marginTop: 14,
    flexDirection: "row",
    gap: 9,
  },
  searchBox: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: TEXT,
    fontSize: 13,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterButtonActive: { backgroundColor: GREEN, borderColor: GREEN },
  chips: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  },
  filterChip: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: MINT,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  filterChipText: { color: GREEN, fontSize: 10, fontWeight: "800" },
  clearFilters: {
    paddingHorizontal: 4,
    color: DANGER,
    fontSize: 11,
    fontWeight: "800",
  },

  panel: {
    marginTop: 14,
    padding: 14,
    borderRadius: 23,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 14,
  },
  panelEyebrow: {
    color: GOLD_DARK,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  panelTitle: {
    marginTop: 4,
    color: GREEN,
    fontSize: 20,
    fontWeight: "900",
  },
  panelSub: {
    marginTop: 4,
    color: MUTED,
    fontSize: 11,
    lineHeight: 16,
  },
  resultPill: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: MINT,
  },
  resultText: { color: GREEN, fontSize: 9, fontWeight: "900" },
  list: { gap: 11 },

  patientCard: {
    padding: 14,
    borderRadius: 19,
    backgroundColor: "#FEFFFE",
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  patientBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  patientAvatar: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },
  patientAvatarText: {
    color: WHITE,
    fontSize: 17,
    fontWeight: "900",
  },
  patientName: { color: TEXT, fontSize: 14, fontWeight: "900" },
  patientPhone: { marginTop: 2, color: MUTED, fontSize: 11 },
  patientId: {
    marginTop: 2,
    color: GOLD_DARK,
    fontSize: 9,
    fontWeight: "800",
  },
  badge: {
    maxWidth: 110,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 8.5,
    fontWeight: "900",
    textAlign: "center",
  },
  infoGrid: {
    marginTop: 13,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  infoItem: {
    flex: 1,
    minWidth: 125,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#F8FAF8",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  infoLabel: { color: MUTED, fontSize: 8.5, fontWeight: "700" },
  infoValue: {
    marginTop: 2,
    color: TEXT,
    fontSize: 10.5,
    fontWeight: "800",
  },
  symptomBox: {
    marginTop: 11,
    padding: 11,
    borderRadius: 14,
    backgroundColor: "#FBFAF6",
  },
  symptomLabel: {
    color: GOLD_DARK,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  symptomText: {
    marginTop: 4,
    color: TEXT,
    fontSize: 11,
    lineHeight: 17,
  },
  cardActions: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  viewButton: {
    flexGrow: 1,
    minWidth: 125,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: MINT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  viewButtonText: { color: GREEN, fontSize: 11, fontWeight: "900" },
  prescriptionButton: {
    flexGrow: 1,
    minWidth: 145,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  prescriptionButtonText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "900",
  },

  empty: {
    paddingVertical: 34,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 10,
    color: GREEN,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 5,
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },

  pagination: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  paginationText: { color: MUTED, fontSize: 10.5 },
  paginationButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pageButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  pageDisabled: { opacity: 0.35 },
  currentPage: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },
  currentPageText: { color: WHITE, fontSize: 11, fontWeight: "900" },
  pageOf: { color: MUTED, fontSize: 10 },

  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(5,18,13,.25)",
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  detailsSheet: {
    maxHeight: "91%",
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    backgroundColor: WHITE,
    overflow: "hidden",
  },
  filterSheet: {
    maxHeight: "82%",
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    backgroundColor: WHITE,
    overflow: "hidden",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    marginTop: 9,
    borderRadius: 10,
    backgroundColor: "#D6DDD8",
  },
  detailsHeader: {
    paddingHorizontal: 17,
    paddingTop: 14,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailsEyebrow: {
    color: GOLD_DARK,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },
  detailsTitle: {
    color: GREEN,
    fontSize: 20,
    fontWeight: "900",
  },
  detailsSub: {
    marginTop: 2,
    color: MUTED,
    fontSize: 9.5,
    fontWeight: "700",
  },
  closeCircle: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  detailsBody: { padding: 17, paddingBottom: 24 },
  modalStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 13,
  },
  modalDate: { color: MUTED, fontSize: 10.5, fontWeight: "700" },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  detailCard: {
    width: "48%",
    flexGrow: 1,
    minWidth: 135,
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: BORDER,
  },
  detailWide: { width: "100%" },
  detailLabel: {
    color: MUTED,
    fontSize: 8.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  detailValue: {
    marginTop: 5,
    color: TEXT,
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "800",
  },

  prescriptionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  sectionEyebrow: {
    color: GOLD_DARK,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sectionTitle: {
    marginTop: 2,
    color: GREEN,
    fontSize: 15,
    fontWeight: "900",
  },
  inlineLoading: {
    padding: 18,
    borderRadius: 15,
    backgroundColor: "#F8FAF8",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  inlineLoadingText: { color: MUTED, fontSize: 11.5 },
  noPrescription: {
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#FBFAF6",
  },
  noPrescriptionTitle: {
    marginTop: 8,
    color: GREEN,
    fontSize: 13,
    fontWeight: "900",
  },
  noPrescriptionText: {
    marginTop: 4,
    color: MUTED,
    fontSize: 10.5,
    lineHeight: 16,
    textAlign: "center",
  },

  medicineSection: { marginTop: 14, gap: 8 },
  medicineSectionTitle: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "900",
  },
  medicineCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FBFAF6",
    borderWidth: 1,
    borderColor: BORDER,
  },
  medicineName: { color: TEXT, fontSize: 12, fontWeight: "900" },
  medicineMeta: {
    marginTop: 4,
    color: MUTED,
    fontSize: 10,
    lineHeight: 15,
  },
  medicineInstruction: {
    marginTop: 5,
    color: GREEN_2,
    fontSize: 10,
    fontWeight: "700",
  },

  pdfActions: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pdfViewButton: {
    flexGrow: 1,
    minWidth: 120,
    minHeight: 43,
    borderRadius: 13,
    backgroundColor: MINT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pdfViewText: { color: GREEN, fontSize: 11, fontWeight: "900" },
  pdfDownloadButton: {
    flexGrow: 1,
    minWidth: 135,
    minHeight: 43,
    borderRadius: 13,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pdfDownloadText: { color: WHITE, fontSize: 11, fontWeight: "900" },

  detailsActions: {
    paddingTop: 13,
    paddingHorizontal: 13,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: WHITE,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  secondaryAction: {
    flexGrow: 1,
    minWidth: 100,
    minHeight: 45,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: "#F3F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: { color: GREEN, fontSize: 11.5, fontWeight: "900" },
  primaryAction: {
    flexGrow: 2,
    minWidth: 160,
    minHeight: 45,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryActionText: { color: WHITE, fontSize: 11.5, fontWeight: "900" },

  filterBody: { padding: 17, paddingBottom: 25 },
  fieldLabel: {
    marginBottom: 8,
    color: GREEN,
    fontSize: 11,
    fontWeight: "900",
  },
  filterDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterDateButton: {
    flex: 1,
    minHeight: 47,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterDateText: { color: TEXT, fontSize: 11.5, fontWeight: "700" },
  clearDateButton: {
    width: 47,
    height: 47,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DANGER_LIGHT,
  },
  todayButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    minHeight: 35,
    paddingHorizontal: 11,
    borderRadius: 11,
    backgroundColor: MINT,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  todayButtonText: { color: GREEN, fontSize: 10, fontWeight: "800" },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: BORDER,
  },
  optionChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  optionChipText: { color: TEXT, fontSize: 10.5, fontWeight: "800" },
  optionChipTextActive: { color: WHITE },
});

