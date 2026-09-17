import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
const WARNING = "#946300";
const WARNING_LIGHT = "#FFF6E8";
const INFO = "#31708F";
const INFO_LIGHT = "#EDF6FB";

const PAGE_SIZE = 8;

type GenderFilter = "" | "MALE" | "FEMALE" | "OTHER";
type InteractionFilter = 0 | 7 | 30 | 90;

type Patient = {
  id: string | number;
  code: string;
  name: string;
  phone: string;
  email: string;
  age: string | number;
  gender: string;
  status: string;
  totalAppointments: number;
  totalConsultations: number;
  totalInteractions: number;
  lastInteractionAt: string | null;
  visitDate: string | null;
  symptoms: string;
  pastMedicalHistory: string;
};

type Notice = {
  visible: boolean;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
};

function titleCase(value: any) {
  return String(value || "—")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const datePart = String(value).slice(0, 10);
  const date = new Date(`${datePart}T00:00:00`);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "—";
  const [hour, minute] = String(value).split(":").map(Number);

  if (!Number.isFinite(hour)) return String(value);

  return new Date(2000, 0, 1, hour, minute || 0).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractList(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.content)) return result.data.content;
  if (Array.isArray(result?.content)) return result.content;
  return [];
}

function normalizePatient(patient: any): Patient {
  const id = patient?.patientId ?? patient?.id ?? patient?.userId ?? "";

  const totalAppointments = Number(patient?.totalAppointments || 0);
  const totalConsultations = Number(patient?.totalConsultations || 0);

  return {
    id,
    code: id !== "" ? `NL-P-${id}` : "—",
    name: patient?.patientName || patient?.name || "Patient",
    phone: patient?.phoneNumber || patient?.phone || "—",
    email: patient?.email || "—",
    age: patient?.age ?? "—",
    gender: String(patient?.gender || "—").toUpperCase(),
    status: String(patient?.status || "REGISTERED").toUpperCase(),
    totalAppointments,
    totalConsultations,
    totalInteractions: totalAppointments + totalConsultations,
    lastInteractionAt:
      patient?.lastInteractionAt ||
      patient?.visitDate ||
      patient?.updatedAt ||
      patient?.createdAt ||
      null,
    visitDate:
      patient?.visitDate ||
      patient?.lastInteractionAt ||
      patient?.appointmentDate ||
      patient?.consultationDate ||
      null,
    symptoms: patient?.symptoms || "",
    pastMedicalHistory: patient?.pastMedicalHistory || "",
  };
}

export default function DoctorPatientsScreen() {
  const [menuOpen, setMenuOpen] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<GenderFilter>("");
  const [interactionDays, setInteractionDays] =
    useState<InteractionFilter>(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordLoading, setRecordLoading] = useState(false);
  const [medicalRecord, setMedicalRecord] = useState<any | null>(null);

  const [prescriptionView, setPrescriptionView] = useState<any | null>(null);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState("");

  // Same flow as website Patient Dashboard:
  // first load the patient's complete record, then let the doctor select
  // the exact prescription from record.prescriptions.
  const [prescriptionListOpen, setPrescriptionListOpen] = useState(false);
  const [prescriptionListPatient, setPrescriptionListPatient] =
    useState<Patient | null>(null);
  const [prescriptionList, setPrescriptionList] = useState<any[]>([]);
  const [prescriptionListLoading, setPrescriptionListLoading] = useState(false);

  const [prescriptionsByPatient, setPrescriptionsByPatient] = useState<
    Record<string, any[]>
  >({});
  const [latestCompletedAppointmentByPatient, setLatestCompletedAppointmentByPatient] =
    useState<Record<string, any | null>>({});
  const [prescriptionCheckComplete, setPrescriptionCheckComplete] = useState<
    Record<string, boolean>
  >({});

  const [notice, setNotice] = useState<Notice>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

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

  async function getToken() {
    return (
      (await AsyncStorage.getItem("doctorToken")) ||
      (await AsyncStorage.getItem("token")) ||
      ""
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
        message: text || `Invalid server response (${response.status}).`,
      };
    }

    if (response.status === 401) {
      await clearDoctorSession();
      router.replace("/login" as any);

      throw new Error(
        result?.message || "Your session expired. Please log in again."
      );
    }

    // 403 is a resource permission error. Do not destroy a valid doctor session.
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

  async function validateDoctor() {
    const token = await getToken();
    const role = String((await AsyncStorage.getItem("role")) || "")
      .replace(/^ROLE_/i, "")
      .toUpperCase();

    if (!token || (role && role !== "DOCTOR")) {
      await clearDoctorSession();
      router.replace("/login" as any);
      return false;
    }

    return true;
  }

  async function loadDoctorProfile() {
    try {
      const result = await apiRequest("/doctors/my-profile");
      const profile = result?.data || {};

      const name = profile?.name || profile?.doctorName || "Doctor";

      await AsyncStorage.multiSet([
        ["doctorName", name],
        ["doctor", JSON.stringify(profile)],
      ]);

      if (profile?.id != null) {
        await AsyncStorage.setItem("doctorId", String(profile.id));
      }
    } catch {
      // Patient listing can still load even if profile refresh fails.
    }
  }

  /**
   * Registered-patient list.
   *
   * IMPORTANT:
   * PatientRecordController does NOT expose:
   *   GET /patient-records/doctor/patients
   *
   * The existing doctor dashboard patient-list API is therefore used here.
   * No walk-in API is called on this page.
   */
  async function loadPatients() {
    const result = await apiRequest("/doctor-dashboard/patients");

    const regularPatients = extractList(result)
      .map(normalizePatient)
      .filter(
        (patient) =>
          patient.id !== null &&
          patient.id !== undefined &&
          String(patient.id) !== ""
      );

    setPatients(regularPatients);

    // Secondary prescription/appointment checks are independent of the list.
    void loadPrescriptionAvailability(regularPatients);
  }

  /**
   * The backend PatientRecordController/Service supports both endpoints below
   * for DOCTOR role.
   *
   * We use them to determine whether the latest completed appointment already
   * has a prescription.
   */
  async function loadPrescriptionAvailability(registeredPatients: Patient[]) {
    if (!registeredPatients.length) {
      setPrescriptionsByPatient({});
      setLatestCompletedAppointmentByPatient({});
      setPrescriptionCheckComplete({});
      return;
    }

    const checks = await Promise.allSettled(
      registeredPatients.map(async (patient) => {
        const patientId = String(patient.id);

        const [appointmentsResult, prescriptionsResult] = await Promise.all([
          apiRequest(
            `/patient-records/patient/${encodeURIComponent(
              patientId
            )}/appointments`
          ),
          apiRequest(
            `/patient-records/patient/${encodeURIComponent(
              patientId
            )}/prescriptions`
          ),
        ]);

        const appointments = extractList(appointmentsResult);
        const prescriptions = extractList(prescriptionsResult);

        const completedAppointments = appointments
          .filter(
            (appointment: any) =>
              String(appointment?.status || "").toUpperCase() === "COMPLETED"
          )
          .sort((a: any, b: any) => {
            const aKey = `${
              a?.appointmentDate || String(a?.createdAt || "").slice(0, 10)
            }T${a?.startTime || "00:00:00"}`;

            const bKey = `${
              b?.appointmentDate || String(b?.createdAt || "").slice(0, 10)
            }T${b?.startTime || "00:00:00"}`;

            return bKey.localeCompare(aKey);
          });

        const latestCompletedAppointment = completedAppointments[0] || null;

        const appointmentId =
          latestCompletedAppointment?.id ??
          latestCompletedAppointment?.appointmentId ??
          null;

        const matchingPrescriptions = appointmentId
          ? prescriptions
              .filter(
                (prescription: any) =>
                  String(
                    prescription?.appointmentId ??
                      prescription?.appointment?.id ??
                      ""
                  ) === String(appointmentId)
              )
              .sort((a: any, b: any) =>
                String(b?.createdAt || "").localeCompare(
                  String(a?.createdAt || "")
                )
              )
          : [];

        return {
          patientId,
          latestCompletedAppointment,
          prescriptions: matchingPrescriptions,
        };
      })
    );

    const prescriptionMap: Record<string, any[]> = {};
    const appointmentMap: Record<string, any | null> = {};
    const completeMap: Record<string, boolean> = {};

    checks.forEach((check, index) => {
      const patientId = String(registeredPatients[index].id);
      completeMap[patientId] = true;

      if (check.status === "fulfilled") {
        prescriptionMap[patientId] = check.value.prescriptions;
        appointmentMap[patientId] =
          check.value.latestCompletedAppointment;
      } else {
        prescriptionMap[patientId] = [];
        appointmentMap[patientId] = null;
      }
    });

    setPrescriptionsByPatient(prescriptionMap);
    setLatestCompletedAppointmentByPatient(appointmentMap);
    setPrescriptionCheckComplete(completeMap);
  }

  async function loadPage(initial = false) {
    try {
      if (initial) setLoading(true);

      const valid = await validateDoctor();
      if (!valid) return;

      await Promise.all([loadDoctorProfile(), loadPatients()]);
    } catch (error: any) {
      showNotice(
        "error",
        "Unable to Load Patients",
        error?.message || "Unable to load registered patients."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadPage(true);
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadPage(false);
  }

  function isWithinDays(value: string | null, days: number) {
    if (!value) return false;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;

    const difference =
      (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);

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

      return matchesSearch && matchesGender && matchesDate;
    });
  }, [patients, search, gender, interactionDays]);

  useEffect(() => {
    setPage(1);
  }, [search, gender, interactionDays]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredPatients.length / PAGE_SIZE)
  );

  const safePage = Math.min(page, pageCount);

  const visiblePatients = filteredPatients.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const summary = useMemo(
    () => ({
      patients: patients.length,
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
    setRecordOpen(true);
    setRecordLoading(true);
    setMedicalRecord(null);

    try {
      // Existing backend:
      // GET /api/patient-records/patient/{patientId}
      const result = await apiRequest(
        `/patient-records/patient/${encodeURIComponent(
          String(patient.id)
        )}`
      );

      setMedicalRecord(result?.data || {});
    } catch (error: any) {
      setRecordOpen(false);

      showNotice(
        "error",
        "Medical Record Unavailable",
        error?.message || "Unable to load patient medical record."
      );
    } finally {
      setRecordLoading(false);
    }
  }

  async function viewPrescription(summary: any) {
    if (!summary?.id) return;

    setPrescriptionLoading(true);
    setPrescriptionError("");
    setPrescriptionView(null);

    try {
      // Current PrescriptionController:
      // GET /api/prescriptions/{id}
      const result = await apiRequest(
        `/prescriptions/${encodeURIComponent(String(summary.id))}`
      );

      setPrescriptionView(result?.data || summary);
    } catch (error: any) {
      setPrescriptionError(
        error?.message || "Unable to load prescription."
      );

      // Keep the summary so the modal can still display the error.
      setPrescriptionView({
        ...summary,
        __loadError: true,
      });
    } finally {
      setPrescriptionLoading(false);
    }
  }

  async function openRegisteredPrescription(patient: Patient) {
  setPrescriptionListPatient(patient);
  setPrescriptionList([]);
  setPrescriptionListOpen(true);
  setPrescriptionListLoading(true);

  try {
    const result = await apiRequest(
      `/patient-records/patient/${encodeURIComponent(
        String(patient.id)
      )}`
    );

    const record = result?.data || {};

    const prescriptions = Array.isArray(record?.prescriptions)
      ? record.prescriptions
      : [];

    const doctorId = await AsyncStorage.getItem("doctorId");

    const doctorPrescriptions = prescriptions.filter(
      (prescription: any) =>
        String(prescription?.doctorId || "") ===
        String(doctorId || "")
    );

    const sorted = [...doctorPrescriptions].sort(
      (a: any, b: any) =>
        String(b?.createdAt || "").localeCompare(
          String(a?.createdAt || "")
        )
    );

    setPrescriptionList(sorted);
  } catch (error: any) {
    setPrescriptionListOpen(false);

    showNotice(
      "error",
      "Unable to Load Prescriptions",
      error?.message || "Unable to load patient prescriptions."
    );
  } finally {
    setPrescriptionListLoading(false);
  }
}

  if (loading) {
    return (
      <View style={styles.loaderPage}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loaderTitle}>Loading patients</Text>
        <Text style={styles.loaderText}>
          Fetching your registered patient records...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <DoctorHeader
        title="Patients"
        subtitle="Registered patient records"
        onMenuPress={() => setMenuOpen(true)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="people-outline" size={25} color="#F5EBC9" />
          </View>

          <Text style={styles.eyebrow}>PATIENT CARE</Text>
          <Text style={styles.heroTitle}>Registered Patients</Text>

          <Text style={styles.heroText}>
            Review patient history, appointments, consultations,
            prescriptions, therapies and clinical notes.
          </Text>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <Ionicons name="refresh-outline" size={17} color={WHITE} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {notice.visible && (
          <NoticeCard
            notice={notice}
            onClose={() =>
              setNotice((current) => ({
                ...current,
                visible: false,
              }))
            }
          />
        )}

        <View style={styles.summaryGrid}>
          <SummaryCard
            icon="people-outline"
            label="Patients"
            value={summary.patients}
          />

          <SummaryCard
            icon="calendar-outline"
            label="Appointments"
            value={summary.appointments}
          />

          <SummaryCard
            icon="videocam-outline"
            label="Consultations"
            value={summary.consultations}
          />

          <SummaryCard
            icon="time-outline"
            label="Recent 30 Days"
            value={summary.recent}
          />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={MUTED} />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Name, phone, email or patient ID"
              placeholderTextColor="#9AA59E"
              style={styles.searchInput}
            />

            {!!search && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={MUTED}
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.filterButton,
              Boolean(gender || interactionDays) &&
                styles.filterButtonActive,
            ]}
            onPress={() => setFilterOpen(true)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={
                gender || interactionDays ? WHITE : GREEN
              }
            />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionEyebrow}>
              REGISTERED PATIENTS
            </Text>
            <Text style={styles.sectionTitle}>Patient Directory</Text>
            <Text style={styles.sectionSub}>
              {filteredPatients.length} matching patient(s)
            </Text>
          </View>
        </View>

        <View style={styles.list}>
          {visiblePatients.length ? (
            visiblePatients.map((patient) => (
              <PatientCard
                key={String(patient.id)}
                patient={patient}
                onRecord={() => openPatientRecord(patient)}
                onPrescription={() =>
                  openRegisteredPrescription(patient)
                }
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons
                name="people-outline"
                size={32}
                color={GOLD_DARK}
              />
              <Text style={styles.emptyTitle}>
                No registered patients found
              </Text>
              <Text style={styles.emptyText}>
                Try changing the search or filter options.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.pagination}>
          <Text style={styles.paginationText}>
            {filteredPatients.length
              ? `Showing ${
                  (safePage - 1) * PAGE_SIZE + 1
                }-${Math.min(
                  safePage * PAGE_SIZE,
                  filteredPatients.length
                )} of ${filteredPatients.length}`
              : "Showing 0 patients"}
          </Text>

          <View style={styles.pageButtons}>
            <TouchableOpacity
              style={[
                styles.pageButton,
                safePage === 1 && styles.pageDisabled,
              ]}
              disabled={safePage === 1}
              onPress={() =>
                setPage((value) => Math.max(1, value - 1))
              }
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={GREEN}
              />
            </TouchableOpacity>

            <View style={styles.currentPage}>
              <Text style={styles.currentPageText}>
                {safePage}
              </Text>
            </View>

            <Text style={styles.pageOf}>of {pageCount}</Text>

            <TouchableOpacity
              style={[
                styles.pageButton,
                safePage === pageCount && styles.pageDisabled,
              ]}
              disabled={safePage === pageCount}
              onPress={() =>
                setPage((value) =>
                  Math.min(pageCount, value + 1)
                )
              }
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={GREEN}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <FilterSheet
        visible={filterOpen}
        gender={gender}
        interactionDays={interactionDays}
        onClose={() => setFilterOpen(false)}
        setGender={setGender}
        setInteractionDays={setInteractionDays}
        onReset={() => {
          setGender("");
          setInteractionDays(0);
          setSearch("");
        }}
      />

      <PatientRecordModal
        visible={recordOpen}
        patient={selectedPatient}
        record={medicalRecord}
        loading={recordLoading}
        onClose={() => {
          setRecordOpen(false);
          setSelectedPatient(null);
          setMedicalRecord(null);
        }}
        onPrescription={viewPrescription}
      />

      <PrescriptionListModal
        visible={prescriptionListOpen}
        patient={prescriptionListPatient}
        prescriptions={prescriptionList}
        loading={prescriptionListLoading}
        onClose={() => {
          setPrescriptionListOpen(false);
          setPrescriptionListPatient(null);
          setPrescriptionList([]);
        }}
        onSelect={async (prescription) => {
          await viewPrescription(prescription);
        }}
      />

      <PrescriptionModal
        prescription={prescriptionView}
        loading={prescriptionLoading}
        error={prescriptionError}
        onClose={() => {
          setPrescriptionView(null);
          setPrescriptionError("");
        }}
      />

      <DoctorDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeRoute="/doctor/patients"
      />
    </View>
  );
}

function PatientCard({
  patient,
  onRecord,
  onPrescription,
}: {
  patient: Patient;
  onRecord: () => void;
  onPrescription: () => void;
}) {
  return (
    <View style={styles.patientCard}>
      <View style={styles.patientTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {patient.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.patientName}>{patient.name}</Text>
          <Text style={styles.patientCode}>
            {patient.code} · {patient.phone}
          </Text>
        </View>

        <View style={styles.registeredBadge}>
          <Text style={styles.registeredBadgeText}>
            REGISTERED
          </Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <InfoItem
          icon="person-outline"
          label="Age / Gender"
          value={`${patient.age} / ${titleCase(patient.gender)}`}
        />

        <InfoItem
          icon="calendar-outline"
          label="Appointments"
          value={String(patient.totalAppointments)}
        />

        <InfoItem
          icon="videocam-outline"
          label="Consultations"
          value={String(patient.totalConsultations)}
        />

        <InfoItem
          icon="time-outline"
          label="Last Interaction"
          value={formatDate(patient.lastInteractionAt)}
        />
      </View>

      {!!patient.email && patient.email !== "—" && (
        <View style={styles.emailBox}>
          <Ionicons name="mail-outline" size={16} color={MUTED} />
          <Text style={styles.emailText}>{patient.email}</Text>
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.recordButton}
          onPress={onRecord}
        >
          <Ionicons name="folder-open-outline" size={17} color={GREEN} />
          <Text style={styles.recordButtonText}>
            View Record
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.prescriptionButton}
          onPress={onPrescription}
        >
          <Ionicons
            name="document-text-outline"
            size={17}
            color={INFO}
          />
          <Text style={styles.prescriptionButtonText}>
            View Prescriptions
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PatientRecordModal({
  visible,
  patient,
  record,
  loading,
  onClose,
  onPrescription,
}: {
  visible: boolean;
  patient: Patient | null;
  record: any;
  loading: boolean;
  onClose: () => void;
  onPrescription: (prescription: any) => void;
}) {
  if (!visible || !patient) return null;

  const patientData =
    record?.patient ||
    record?.patientDetails ||
    record?.selectedPatient ||
    {};

  const appointments = Array.isArray(record?.appointments)
    ? record.appointments
    : [];

  const consultations = Array.isArray(record?.consultations)
    ? record.consultations
    : [];

  const prescriptions = Array.isArray(record?.prescriptions)
    ? record.prescriptions
    : [];

  const therapies = Array.isArray(record?.therapies)
    ? record.therapies
    : Array.isArray(record?.treatmentPlans)
    ? record.treatmentPlans
    : [];

  const notes = Array.isArray(record?.notes)
    ? record.notes
    : [];

  return (
    <Modal
      visible
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.recordScreen}>
        <View style={styles.recordHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={20} color={GREEN} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.recordEyebrow}>
              COMPLETE PATIENT RECORD
            </Text>
            <Text style={styles.recordTitle}>
              {patientData?.name ||
                patientData?.patientName ||
                patient.name}
            </Text>
            <Text style={styles.recordSub}>
              Patient #{patient.id}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.modalLoader}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.loaderText}>
              Loading patient medical record...
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.recordBody}
          >
            <RecordSection title="Patient Profile">
              <View style={styles.detailGrid}>
                <Detail
                  label="Patient"
                  value={
                    patientData?.name ||
                    patientData?.patientName ||
                    patient.name
                  }
                />

                <Detail
                  label="Phone"
                  value={
                    patientData?.phoneNumber ||
                    patientData?.phone ||
                    patient.phone
                  }
                />

                <Detail
                  label="Email"
                  value={patientData?.email || patient.email}
                />

                <Detail
                  label="Age / Gender"
                  value={`${
                    patientData?.age ?? patient.age
                  } / ${titleCase(
                    patientData?.gender || patient.gender
                  )}`}
                />
              </View>
            </RecordSection>

            <HistorySection
              title="Appointments"
              icon="calendar-outline"
              records={appointments}
              render={(item) => ({
                title: `${formatDate(
                  item?.appointmentDate
                )} · ${formatTime(item?.startTime)}`,
                subtitle: `${titleCase(
                  item?.appointmentMode || "OFFLINE"
                )} · ${titleCase(item?.status)}`,
                meta:
                  item?.symptoms ||
                  item?.pastMedicalHistory ||
                  "",
              })}
            />

            <HistorySection
              title="Consultations"
              icon="videocam-outline"
              records={consultations}
              render={(item) => ({
                title: `${formatDate(
                  item?.consultationDate
                )} · ${formatTime(item?.startTime)}`,
                subtitle: `Online · ${titleCase(item?.status)}`,
                meta: item?.symptoms || "",
              })}
            />

            <HistorySection
              title="Prescriptions"
              icon="document-text-outline"
              records={prescriptions}
              onPress={onPrescription}
              render={(item) => ({
                title: item?.diagnosis || `Prescription #${item?.id}`,
                subtitle: `${titleCase(item?.status)}${
                  item?.createdAt
                    ? ` · ${formatDate(
                        String(item.createdAt).slice(0, 10)
                      )}`
                    : ""
                }`,
                meta: item?.advice || "",
              })}
            />

            <HistorySection
              title="Therapies"
              icon="medkit-outline"
              records={therapies}
              render={(item) => ({
                title:
                  item?.treatmentName ||
                  item?.therapyName ||
                  item?.serviceName ||
                  "Therapy",
                subtitle: titleCase(item?.status),
                meta:
                  item?.diagnosis ||
                  item?.instructions ||
                  "",
              })}
            />

            <HistorySection
              title="Doctor Notes"
              icon="clipboard-outline"
              records={notes}
              render={(item) => ({
                title: item?.title || "Clinical Note",
                subtitle:
                  item?.doctorName ||
                  item?.createdByName ||
                  "",
                meta:
                  item?.note ||
                  item?.content ||
                  item?.notes ||
                  "",
              })}
            />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function PrescriptionListModal({
  visible,
  patient,
  prescriptions,
  loading,
  onClose,
  onSelect,
}: {
  visible: boolean;
  patient: Patient | null;
  prescriptions: any[];
  loading: boolean;
  onClose: () => void;
  onSelect: (prescription: any) => void;
}) {
  if (!visible || !patient) return null;

  return (
    <Modal
      visible
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.recordScreen}>
        <View style={styles.recordHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={20} color={GREEN} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.recordEyebrow}>
              PATIENT PRESCRIPTIONS
            </Text>
            <Text style={styles.recordTitle}>
              {patient.name}
            </Text>
            <Text style={styles.recordSub}>
              Patient #{patient.id} · {prescriptions.length} prescription(s)
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.modalLoader}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.loaderText}>
              Loading prescriptions...
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.recordBody}
          >
            <RecordSection title={`Prescriptions (${prescriptions.length})`}>
              {prescriptions.length ? (
                prescriptions.map((item: any, index: number) => (
                  <TouchableOpacity
                    key={String(item?.id ?? index)}
                    style={styles.historyCard}
                    onPress={() => onSelect(item)}
                  >
                    <View style={styles.historyIcon}>
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color={GREEN}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>
                        Prescription #{item?.id}
                      </Text>

                      <Text style={styles.historySubtitle}>
                        {item?.diagnosis || "Prescription"}
                      </Text>

                      <Text style={styles.historyMeta}>
                        {titleCase(item?.status)}
                        {item?.appointmentId
                          ? ` · Appointment #${item.appointmentId}`
                          : item?.consultationId
                          ? ` · Consultation #${item.consultationId}`
                          : ""}
                        {item?.createdAt
                          ? ` · ${formatDate(
                              String(item.createdAt).slice(0, 10)
                            )}`
                          : ""}
                      </Text>
                    </View>

                    <View style={styles.viewRxBadge}>
                      <Text style={styles.viewRxBadgeText}>View</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={15}
                        color={INFO}
                      />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noPrescriptionBox}>
                  <Ionicons
                    name="document-text-outline"
                    size={30}
                    color={GOLD_DARK}
                  />
                  <Text style={styles.emptyTitle}>
                    No prescriptions found
                  </Text>
                  <Text style={styles.emptyText}>
                    No prescription has been created for this registered patient yet.
                  </Text>
                </View>
              )}
            </RecordSection>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function PrescriptionModal({
  prescription,
  loading,
  error,
  onClose,
}: {
  prescription: any | null;
  loading: boolean;
  error: string;
  onClose: () => void;
}) {
  if (!prescription && !loading) return null;

  const data = prescription || {};

  const medicines = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.medicines)
    ? data.medicines
    : Array.isArray(data?.prescriptionItems)
    ? data.prescriptionItems
    : [];

  return (
    <Modal
      visible
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.recordScreen}>
        <View style={styles.recordHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={20} color={GREEN} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.recordEyebrow}>
              PRESCRIPTION DETAILS
            </Text>
            <Text style={styles.recordTitle}>
              Prescription #{data?.id || "—"}
            </Text>
            <Text style={styles.recordSub}>
              {titleCase(data?.status)}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.modalLoader}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.loaderText}>
              Loading prescription...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.modalLoader}>
            <Ionicons
              name="alert-circle-outline"
              size={38}
              color={DANGER}
            />
            <Text style={styles.emptyTitle}>
              Unable to load prescription
            </Text>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.recordBody}
          >
            <RecordSection title="Prescription Summary">
              <View style={styles.detailGrid}>
                <Detail
                  label="Patient"
                  value={data?.patientName || "—"}
                />

                <Detail
                  label="Doctor"
                  value={data?.doctorName || "—"}
                />

                <Detail
                  label="Status"
                  value={titleCase(data?.status)}
                />

                <Detail
                  label="Finalized"
                  value={
                    data?.finalizedAt
                      ? formatDate(
                          String(data.finalizedAt).slice(0, 10)
                        )
                      : "Not finalized"
                  }
                />

                <Detail
                  wide
                  label="Diagnosis"
                  value={data?.diagnosis || "—"}
                />

                <Detail
                  wide
                  label="Advice"
                  value={data?.advice || "—"}
                />

                <Detail
                  wide
                  label="Additional Notes"
                  value={data?.notes || "—"}
                />
              </View>
            </RecordSection>

            <RecordSection
              title={`Medicines (${medicines.length})`}
            >
              {medicines.length ? (
                medicines.map((medicine: any, index: number) => (
                  <View
                    style={styles.medicineCard}
                    key={String(
                      medicine?.id ??
                        medicine?.productId ??
                        index
                    )}
                  >
                    <Text style={styles.medicineName}>
                      {index + 1}.{" "}
                      {medicine?.medicineName ||
                        medicine?.productName ||
                        medicine?.name ||
                        "Medicine"}
                    </Text>

                    <View style={styles.detailGrid}>
                      <Detail
                        label="Dosage"
                        value={medicine?.dosage || "—"}
                      />

                      <Detail
                        label="Frequency"
                        value={medicine?.frequency || "—"}
                      />

                      <Detail
                        label="Duration"
                        value={
                          medicine?.durationDays != null
                            ? `${medicine.durationDays} days`
                            : medicine?.duration || "—"
                        }
                      />

                      <Detail
                        label="Quantity"
                        value={String(
                          medicine?.quantity ?? "—"
                        )}
                      />

                      <Detail
                        wide
                        label="Instructions"
                        value={
                          medicine?.instructions ||
                          medicine?.instruction ||
                          "—"
                        }
                      />
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  No medicine items were added.
                </Text>
              )}
            </RecordSection>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function FilterSheet({
  visible,
  gender,
  interactionDays,
  setGender,
  setInteractionDays,
  onClose,
  onReset,
}: {
  visible: boolean;
  gender: GenderFilter;
  interactionDays: InteractionFilter;
  setGender: (value: GenderFilter) => void;
  setInteractionDays: (value: InteractionFilter) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.filterSheet}>
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetEyebrow}>
            REFINE PATIENTS
          </Text>
          <Text style={styles.sheetTitle}>Patient Filters</Text>

          <Text style={styles.filterLabel}>GENDER</Text>

          <View style={styles.optionsWrap}>
            {[
              { value: "", label: "All" },
              { value: "MALE", label: "Male" },
              { value: "FEMALE", label: "Female" },
              { value: "OTHER", label: "Other" },
            ].map((option) => {
              const active = gender === option.value;

              return (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    styles.optionButton,
                    active && styles.optionButtonActive,
                  ]}
                  onPress={() =>
                    setGender(option.value as GenderFilter)
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.filterLabel}>
            LAST INTERACTION
          </Text>

          <View style={styles.optionsWrap}>
            {[
              { value: 0, label: "Any time" },
              { value: 7, label: "7 days" },
              { value: 30, label: "30 days" },
              { value: 90, label: "90 days" },
            ].map((option) => {
              const active =
                interactionDays === option.value;

              return (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    styles.optionButton,
                    active && styles.optionButtonActive,
                  ]}
                  onPress={() =>
                    setInteractionDays(
                      option.value as InteractionFilter
                    )
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={onReset}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={onClose}
            >
              <Text style={styles.applyButtonText}>
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={20} color={GREEN_2} />
      </View>

      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
      <Ionicons name={icon} size={16} color={GOLD_DARK} />

      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>
          {label.toUpperCase()}
        </Text>

        <Text style={styles.infoValue}>
          {value || "—"}
        </Text>
      </View>
    </View>
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
    notice.type === "error"
      ? {
          background: DANGER_LIGHT,
          border: "#EFC2BC",
          color: DANGER,
          icon: "alert-circle-outline" as const,
        }
      : notice.type === "warning"
      ? {
          background: WARNING_LIGHT,
          border: "#EBD49A",
          color: WARNING,
          icon: "warning-outline" as const,
        }
      : notice.type === "success"
      ? {
          background: SUCCESS_LIGHT,
          border: "#BFE0CA",
          color: SUCCESS,
          icon: "checkmark-circle-outline" as const,
        }
      : {
          background: INFO_LIGHT,
          border: "#C5DFEC",
          color: INFO,
          icon: "information-circle-outline" as const,
        };

  return (
    <View
      style={[
        styles.noticeCard,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
      ]}
    >
      <Ionicons
        name={palette.icon}
        size={21}
        color={palette.color}
      />

      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.noticeTitle,
            { color: palette.color },
          ]}
        >
          {notice.title}
        </Text>

        <Text style={styles.noticeMessage}>
          {notice.message}
        </Text>
      </View>

      <TouchableOpacity onPress={onClose}>
        <Ionicons name="close" size={18} color={MUTED} />
      </TouchableOpacity>
    </View>
  );
}

function RecordSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.recordSection}>
      <View style={styles.recordSectionHeader}>
        <Text style={styles.recordSectionTitle}>
          {title}
        </Text>
      </View>

      <View style={styles.recordSectionBody}>
        {children}
      </View>
    </View>
  );
}

function HistorySection({
  title,
  icon,
  records,
  render,
  onPress,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  records: any[];
  render: (item: any) => {
    title: string;
    subtitle: string;
    meta?: string;
  };
  onPress?: (item: any) => void;
}) {
  return (
    <RecordSection title={`${title} (${records.length})`}>
      {records.length ? (
        records.map((item, index) => {
          const content = render(item);

          return (
            <TouchableOpacity
              key={String(item?.id ?? index)}
              disabled={!onPress}
              activeOpacity={onPress ? 0.7 : 1}
              style={styles.historyCard}
              onPress={() => onPress?.(item)}
            >
              <View style={styles.historyIcon}>
                <Ionicons
                  name={icon}
                  size={18}
                  color={GREEN}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle}>
                  {content.title}
                </Text>

                <Text style={styles.historySubtitle}>
                  {content.subtitle}
                </Text>

                {!!content.meta && (
                  <Text
                    style={styles.historyMeta}
                    numberOfLines={2}
                  >
                    {content.meta}
                  </Text>
                )}
              </View>

              {onPress && (
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={MUTED}
                />
              )}
            </TouchableOpacity>
          );
        })
      ) : (
        <Text style={styles.emptyText}>
          No records available.
        </Text>
      )}
    </RecordSection>
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
    <View
      style={[
        styles.detailItem,
        wide && styles.detailItemWide,
      ]}
    >
      <Text style={styles.detailLabel}>
        {label.toUpperCase()}
      </Text>

      <Text style={styles.detailValue}>
        {value || "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  content: {
    padding: 16,
    paddingBottom: 36,
  },

  loaderPage: {
    flex: 1,
    backgroundColor: CREAM,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 9,
  },

  loaderTitle: {
    marginTop: 8,
    color: GREEN,
    fontSize: 20,
    fontWeight: "900",
  },

  loaderText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
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
    backgroundColor: "#FFFFFF12",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  eyebrow: {
    color: GOLD,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  heroTitle: {
    marginTop: 5,
    color: WHITE,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "900",
  },

  heroText: {
    marginTop: 7,
    color: "#DDEAE4",
    fontSize: 13,
    lineHeight: 20,
  },

  refreshButton: {
    marginTop: 16,
    alignSelf: "flex-start",
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFFFFF38",
    backgroundColor: "#FFFFFF12",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  refreshText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "800",
  },

  noticeCard: {
    marginBottom: 14,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },

  noticeTitle: {
    fontSize: 12,
    fontWeight: "900",
  },

  noticeMessage: {
    marginTop: 3,
    color: TEXT,
    fontSize: 11,
    lineHeight: 17,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginBottom: 14,
  },

  summaryCard: {
    width: "48.5%",
    minHeight: 112,
    padding: 14,
    borderRadius: 18,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  summaryLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },

  summaryValue: {
    marginTop: 3,
    color: GREEN,
    fontSize: 25,
    fontWeight: "900",
  },

  searchRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 17,
  },

  searchBox: {
    flex: 1,
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
  },

  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  filterButtonActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  sectionHeader: {
    marginBottom: 10,
  },

  sectionEyebrow: {
    color: GOLD_DARK,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  sectionTitle: {
    marginTop: 3,
    color: GREEN,
    fontSize: 20,
    fontWeight: "900",
  },

  sectionSub: {
    marginTop: 3,
    color: MUTED,
    fontSize: 11,
  },

  list: {
    gap: 11,
  },

  patientCard: {
    padding: 15,
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

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: WHITE,
    fontSize: 20,
    fontWeight: "900",
  },

  patientName: {
    color: GREEN,
    fontSize: 17,
    fontWeight: "900",
  },

  patientCode: {
    marginTop: 3,
    color: MUTED,
    fontSize: 11,
  },

  registeredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: MINT,
  },

  registeredBadgeText: {
    color: GREEN,
    fontSize: 8,
    fontWeight: "900",
  },

  infoGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 9,
  },

  infoItem: {
    width: "48.5%",
    minHeight: 68,
    padding: 10,
    borderRadius: 13,
    backgroundColor: "#FCFDFB",
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  infoLabel: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  infoValue: {
    marginTop: 4,
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
  },

  emailBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#FAFCFA",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  emailText: {
    flex: 1,
    color: MUTED,
    fontSize: 11,
  },

  cardActions: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },

  recordButton: {
    flex: 1,
    minHeight: 47,
    borderRadius: 14,
    backgroundColor: MINT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  recordButtonText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "900",
  },

  prescriptionButton: {
    flex: 1.1,
    minHeight: 47,
    borderRadius: 14,
    backgroundColor: INFO_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },

  prescriptionButtonText: {
    color: INFO,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },

  actionDisabled: {
    backgroundColor: "#F2F4F2",
  },

  disabledActionText: {
    color: MUTED,
  },

  emptyCard: {
    minHeight: 180,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 10,
    color: GREEN,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 5,
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  pagination: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 11,
  },

  paginationText: {
    color: MUTED,
    fontSize: 11,
    textAlign: "center",
  },

  pageButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  pageButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  pageDisabled: {
    opacity: 0.35,
  },

  currentPage: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },

  currentPageText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "900",
  },

  pageOf: {
    color: MUTED,
    fontSize: 11,
  },

  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#06261DAE",
  },

  filterSheet: {
    padding: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: WHITE,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D5DDD8",
    marginBottom: 18,
  },

  sheetEyebrow: {
    color: GOLD_DARK,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  sheetTitle: {
    marginTop: 4,
    color: GREEN,
    fontSize: 22,
    fontWeight: "900",
  },

  filterLabel: {
    marginTop: 20,
    marginBottom: 8,
    color: MUTED,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  optionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  optionButton: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  optionButtonActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  optionText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "800",
  },

  optionTextActive: {
    color: WHITE,
  },

  filterActions: {
    marginTop: 22,
    flexDirection: "row",
    gap: 9,
  },

  resetButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  resetButtonText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "900",
  },

  applyButton: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },

  applyButtonText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "900",
  },

  recordScreen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  recordHeader: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  recordEyebrow: {
    color: GOLD_DARK,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  recordTitle: {
    marginTop: 3,
    color: GREEN,
    fontSize: 20,
    fontWeight: "900",
  },

  recordSub: {
    marginTop: 2,
    color: MUTED,
    fontSize: 11,
  },

  recordBody: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },

  modalLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 8,
  },

  recordSection: {
    overflow: "hidden",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
  },

  recordSectionHeader: {
    padding: 13,
    backgroundColor: "#F2F7F4",
  },

  recordSectionTitle: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "900",
  },

  recordSectionBody: {
    padding: 12,
  },

  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 9,
  },

  detailItem: {
    width: "48.5%",
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FCFDFB",
  },

  detailItemWide: {
    width: "100%",
  },

  detailLabel: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  detailValue: {
    marginTop: 5,
    color: TEXT,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },

  historyCard: {
    minHeight: 68,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF1EE",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  historyIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  historyTitle: {
    color: TEXT,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
  },

  historySubtitle: {
    marginTop: 3,
    color: GREEN_2,
    fontSize: 10,
    fontWeight: "700",
  },

  historyMeta: {
    marginTop: 4,
    color: MUTED,
    fontSize: 10,
    lineHeight: 15,
  },

  viewRxBadge: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: INFO_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  viewRxBadgeText: {
    color: INFO,
    fontSize: 10,
    fontWeight: "900",
  },

  noPrescriptionBox: {
    minHeight: 150,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  medicineCard: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FCFDFB",
  },

  medicineName: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },
});
