import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
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

/* =====================================================
   THEME
===================================================== */

const GREEN = "#0B3D2E";
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
const SUCCESS = "#287146";
const SUCCESS_LIGHT = "#EBF7EF";
const INFO = "#31708F";
const INFO_LIGHT = "#EDF6FB";
const WARNING = "#946300";
const WARNING_LIGHT = "#FFF6E8";

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

type Appointment = {
  id: string | number;
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
  mode: string;
  status: string;
  symptoms: string;
  history: string;
  bookingFee: number;
  paymentStatus: string;
  cancellationReason: string;
  rescheduleReason: string;
  createdAt: string;
};

type Therapist = {
  id: string | number;
  name?: string;
  therapistName?: string;
  specialization?: string;
  qualification?: string;
  active?: boolean;
};

type NoticeType = "success" | "error" | "info";

type Notice = {
  visible: boolean;
  type: NoticeType;
  title: string;
  message: string;
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

type PrescriptionRecord = {
  id: string | number;
  patientId?: string | number | null;
  appointmentId?: string | number | null;
  consultationId?: string | number | null;
  diagnosis?: string;
  advice?: string;
  notes?: string;
  status?: string;
  finalizedAt?: string;
  createdAt?: string;
  items?: Array<{
    id?: string | number;
    medicineName?: string;
    dosage?: string;
    frequency?: string;
    durationDays?: number;
    quantity?: number;
    instructions?: string;
  }>;
};

type TreatmentPlanRecord = {
  id: string | number;
  patientId?: string | number | null;
  patientName?: string;
  doctorId?: string | number | null;
  doctorName?: string;
  therapistId?: string | number | null;
  therapistName?: string;
  treatmentName?: string;
  diagnosis?: string;
  totalSessions?: number;
  completedSessions?: number;
  remainingSessions?: number;
  startDate?: string;
  expectedEndDate?: string;
  instructions?: string;
  notes?: string;
  status?: string;
  createdAt?: string;
};

const MENU = [
  {
    section: "MAIN",
    icon: "grid-outline",
    label: "Dashboard",
    route: "/doctor/dashboard",
    mode: null,
  },
  {
    section: "MAIN",
    icon: "people-outline",
    label: "Patients",
    route: "/doctor/patients",
    mode: null,
  },
  {
    section: "MAIN",
    icon: "calendar-outline",
    label: "Appointment Calendar",
    route: "/doctor/calendar",
    mode: null,
  },
  {
    section: "MAIN",
    icon: "calendar-number-outline",
    label: "Upcoming Schedule",
    route: "/doctor/schedule",
    mode: null,
  },
  {
    section: "MAIN",
    icon: "time-outline",
    label: "Manage Availability",
    route: "/doctor/availability",
    mode: null,
  },
  {
    section: "CLINICAL",
    icon: "clipboard-outline",
    label: "Appointment Details",
    route: "/doctor/appointments",
    mode: "OFFLINE",
  },
  {
    section: "CLINICAL",
    icon: "videocam-outline",
    label: "Consultation Details",
    route: "/doctor/consultations",
    mode: "ONLINE",
  },
  {
    section: "FINANCE",
    icon: "card-outline",
    label: "Transactions",
    route: "/doctor/transactions",
    mode: null,
  },
  {
    section: "FINANCE",
    icon: "person-circle-outline",
    label: "My Profile",
    route: "/doctor/profile",
    mode: null,
  },
] as const;

export default function DoctorAppointmentsScreen() {
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

  const [doctorName, setDoctorName] = useState("Doctor");
  const [doctorId, setDoctorId] = useState<number | null>(null);

  const [hasOnline, setHasOnline] = useState<boolean | null>(null);
  const [hasOffline, setHasOffline] = useState<boolean | null>(null);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);

  const [prescriptionByAppointment, setPrescriptionByAppointment] =
    useState<Record<string, PrescriptionRecord | null>>({});
  const [treatmentPlansByPatient, setTreatmentPlansByPatient] =
    useState<Record<string, TreatmentPlanRecord[]>>({});
  const [viewPrescription, setViewPrescription] =
    useState<PrescriptionRecord | null>(null);
  const [viewTreatmentPlans, setViewTreatmentPlans] =
    useState<TreatmentPlanRecord[]>([]);
  const [viewTreatmentPatientName, setViewTreatmentPatientName] =
    useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [details, setDetails] = useState<Appointment | null>(null);

  const [completeTarget, setCompleteTarget] =
    useState<Appointment | null>(null);
  const [completing, setCompleting] = useState(false);

  const [workflowTarget, setWorkflowTarget] =
    useState<Appointment | null>(null);

  const [treatmentTarget, setTreatmentTarget] =
    useState<Appointment | null>(null);

  const [savingPlan, setSavingPlan] = useState(false);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(1);

  const [filterChoiceOpen, setFilterChoiceOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [therapistChoiceOpen, setTherapistChoiceOpen] = useState(false);

  const [logoutOpen, setLogoutOpen] = useState(false);

  const [notice, setNotice] = useState<Notice>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const [planDatePicker, setPlanDatePicker] =
    useState<null | "start" | "end">(null);

  const today = localDateKey(new Date());

  const [plan, setPlan] = useState<TreatmentPlanForm>({
    therapistId: "",
    treatmentName: "",
    diagnosis: "",
    totalSessions: "",
    startDate: today,
    expectedEndDate: today,
    instructions: "",
    notes: "",
  });

  const doctorInitial = useMemo(() => {
    return (
      doctorName
        .replace(/^Dr\.?\s*/i, "")
        .trim()
        .charAt(0)
        .toUpperCase() || "D"
    );
  }, [doctorName]);

  /* =====================================================
     AUTH / API
  ===================================================== */

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
      "doctorHasOnline",
      "doctorHasOffline",
    ]);
  }

  async function api(path: string, options: any = {}) {
    const token = await getToken();

    if (!token) {
      await clearSession();
      router.replace("/login" as any);
      throw new Error("Doctor login required.");
    }

    const headers: any = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    };

    if (options.body) {
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
      result = {
        success: false,
        message: text || `Request failed (${response.status})`,
      };
    }

    if (response.status === 401) {
      await clearSession();
      router.replace("/login" as any);
      throw new Error(result?.message || "Doctor session expired.");
    }

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
        result?.message || `Request failed (${response.status})`
      );
      error.status = response.status;
      throw error;
    }

    return result;
  }

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

  function extractArray(result: any) {
    if (Array.isArray(result)) {
      return result;
    }

    if (Array.isArray(result?.data)) {
      return result.data;
    }

    if (Array.isArray(result?.data?.content)) {
      return result.data.content;
    }

    if (Array.isArray(result?.content)) {
      return result.content;
    }

    return [];
  }

  function normalizeAppointment(raw: any): Appointment {
    return {
      id: raw.id ?? raw.appointmentId ?? "",
      patientId:
        raw.patientId ??
        raw.patient?.id ??
        raw.userId ??
        null,
      patientName:
        raw.patientName ??
        raw.patient?.name ??
        raw.name ??
        "Patient",
      phoneNumber:
        raw.phoneNumber ??
        raw.patient?.phoneNumber ??
        raw.patient?.phone ??
        "—",
      age:
        raw.age ??
        raw.patient?.age ??
        "—",
      gender:
        raw.gender ??
        raw.patient?.gender ??
        "—",
      doctorName:
        raw.doctorName ??
        raw.doctor?.name ??
        raw.doctor?.user?.name ??
        "—",
      specialization:
        raw.doctorSpecialization ??
        raw.specialization ??
        raw.doctor?.specialization ??
        "—",
      date:
        raw.appointmentDate ??
        raw.date ??
        "",
      startTime:
        raw.startTime ??
        raw.time ??
        "",
      endTime:
        raw.endTime ??
        "",
      mode: String(
        raw.appointmentMode ??
          raw.mode ??
          "OFFLINE"
      ).toUpperCase(),
      status: String(
        raw.status ??
          "PENDING"
      ).toUpperCase(),
      symptoms:
        raw.symptoms ??
        "—",
      history:
        raw.pastMedicalHistory ??
        raw.history ??
        "—",
      bookingFee: Number(
        raw.bookingFee ??
          0
      ),
      paymentStatus: String(
        raw.paymentStatus ??
          "PENDING"
      ).toUpperCase(),
      cancellationReason:
        raw.cancellationReason ??
        "",
      rescheduleReason:
        raw.rescheduleReason ??
        "",
      createdAt:
        raw.createdAt ??
        "",
    };
  }

  /* =====================================================
     LOAD DATA
  ===================================================== */

  async function loadProfile() {
    const savedName =
      (await AsyncStorage.getItem("doctorName")) ||
      "Doctor";

    const result = await api("/doctors/my-profile");
    const doctor = result?.data || {};

    const name =
      doctor.name ||
      doctor.doctorName ||
      savedName;

    const storedDoctorId =
      await AsyncStorage.getItem("doctorId");

    const id =
      Number(
        doctor.id ??
          doctor.doctorId ??
          storedDoctorId
      ) || null;

    setDoctorName(name);
    setDoctorId(id);

    const values: [string, string][] = [
      ["doctorName", name],
      ["doctor", JSON.stringify(doctor)],
    ];

    if (id) {
      values.push([
        "doctorId",
        String(id),
      ]);
    }

    await AsyncStorage.multiSet(values);

    return id;
  }

  async function loadDoctorModes(id: number | null) {
    if (!id) {
      return;
    }

    try {
      const result = await api(
        `/doctor-availability/doctor/${id}`
      );

      const activeSlots = extractArray(result).filter(
        (slot: any) =>
          slot &&
          slot.active !== false
      );

      const online = activeSlots.some(
        (slot: any) =>
          String(
            slot.appointmentMode ||
              slot.mode ||
              ""
          ).toUpperCase() === "ONLINE"
      );

      const offline = activeSlots.some(
        (slot: any) =>
          String(
            slot.appointmentMode ||
              slot.mode ||
              ""
          ).toUpperCase() === "OFFLINE"
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

      /*
       * If the doctor is online-only, Appointment Details
       * should not remain open.
       */
      if (online && !offline) {
        router.replace("/doctor/consultations" as any);
      }
    } catch {
      const storedOnline =
        await AsyncStorage.getItem("doctorHasOnline");

      const storedOffline =
        await AsyncStorage.getItem("doctorHasOffline");

      setHasOnline(
        storedOnline === null
          ? null
          : storedOnline === "true"
      );

      setHasOffline(
        storedOffline === null
          ? null
          : storedOffline === "true"
      );
    }
  }

  async function loadAppointments() {
    const result = await api(
      "/appointments/doctor/my-appointments"
    );

    const normalized = extractArray(result).map(
      normalizeAppointment
    );

    setAppointments(normalized);

    await loadExistingClinicalRecords(normalized);
  }

  async function loadExistingClinicalRecords(
    appointmentList: Appointment[]
  ) {
    const completed = appointmentList.filter(
      (appointment) =>
        appointment.status === "COMPLETED" &&
        appointment.patientId
    );

    const uniquePatientIds = Array.from(
      new Set(
        completed
          .map((appointment) =>
            String(appointment.patientId || "")
          )
          .filter(Boolean)
      )
    );

    const prescriptionMap: Record<
      string,
      PrescriptionRecord | null
    > = {};

    const treatmentMap: Record<
      string,
      TreatmentPlanRecord[]
    > = {};

    await Promise.allSettled(
      uniquePatientIds.map(async (patientId) => {
        try {
          const prescriptionResult = await api(
            `/patient-records/patient/${patientId}/prescriptions`
          );

          const prescriptions = extractArray(
            prescriptionResult
          ) as PrescriptionRecord[];

          completed
            .filter(
              (appointment) =>
                String(appointment.patientId) ===
                String(patientId)
            )
            .forEach((appointment) => {
              const match =
                prescriptions.find(
                  (prescription) =>
                    String(
                      prescription.appointmentId || ""
                    ) ===
                    String(appointment.id)
                ) || null;

              prescriptionMap[
                String(appointment.id)
              ] = match;
            });
        } catch {
          completed
            .filter(
              (appointment) =>
                String(appointment.patientId) ===
                String(patientId)
            )
            .forEach((appointment) => {
              prescriptionMap[
                String(appointment.id)
              ] = null;
            });
        }

        try {
          const recordResult = await api(
            `/patient-records/patient/${patientId}`
          );

          const data = recordResult?.data || {};

          const plans = Array.isArray(
            data.treatmentPlans
          )
            ? data.treatmentPlans
            : Array.isArray(data.therapies)
            ? data.therapies
            : [];

          treatmentMap[String(patientId)] =
            plans;
        } catch {
          treatmentMap[String(patientId)] = [];
        }
      })
    );

    setPrescriptionByAppointment(
      prescriptionMap
    );

    setTreatmentPlansByPatient(
      treatmentMap
    );
  }

  async function loadTherapists() {
    try {
      const result = await api(
        "/therapists/getAll"
      );

      setTherapists(
        extractArray(result)
      );
    } catch (error: any) {
      setTherapists([]);

      showNotice(
        "error",
        "Therapists Unavailable",
        error?.message ||
          "Unable to load therapists."
      );
    }
  }

  async function loadPage(showFullLoader = true) {
    try {
      if (showFullLoader) {
        setLoading(true);
      }

      const role = String(
        (await AsyncStorage.getItem("role")) || ""
      )
        .replace(/^ROLE_/i, "")
        .toUpperCase();

      if (role && role !== "DOCTOR") {
        await clearSession();
        router.replace("/login" as any);
        return;
      }

      const profileCompleted =
        await AsyncStorage.getItem(
          "profileCompleted"
        );

      if (profileCompleted === "false") {
        router.replace(
          "/doctor/profile" as any
        );
        return;
      }

      const id = await loadProfile();

      await Promise.all([
        loadDoctorModes(id),
        loadAppointments(),
        loadTherapists(),
      ]);
    } catch (error: any) {
      showNotice(
        "error",
        "Unable to Load",
        error?.message ||
          "Could not load appointments."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPage(true);
  }, []);

  /* =====================================================
     FILTERS / STATS
  ===================================================== */

  const offlineAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      return (
        String(
          appointment.mode ||
            "OFFLINE"
        ).toUpperCase() === "OFFLINE"
      );
    });
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return offlineAppointments.filter(
      (appointment) => {
        const matchesSearch =
          !query ||
          [
            appointment.patientName,
            appointment.phoneNumber,
            appointment.symptoms,
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(query)
          );

        const matchesDate =
          !dateFilter ||
          appointment.date === dateFilter;

        const matchesStatus =
          !statusFilter ||
          appointment.status === statusFilter;

        return (
          matchesSearch &&
          matchesDate &&
          matchesStatus
        );
      }
    );
  }, [
    offlineAppointments,
    search,
    dateFilter,
    statusFilter,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    dateFilter,
    statusFilter,
  ]);

  const pageCount = Math.max(
    1,
    Math.ceil(
      filteredAppointments.length /
        PAGE_SIZE
    )
  );

  const safePage = Math.min(
    page,
    pageCount
  );

  const visibleAppointments =
    filteredAppointments.slice(
      (safePage - 1) * PAGE_SIZE,
      safePage * PAGE_SIZE
    );

  const stats = [
    {
      icon: "list-outline",
      label: "Total",
      value: offlineAppointments.length,
    },
    {
      icon: "calendar-outline",
      label: "Today",
      value: offlineAppointments.filter(
        (appointment) =>
          appointment.date === today
      ).length,
    },
    {
      icon: "hourglass-outline",
      label: "Pending",
      value: offlineAppointments.filter(
        (appointment) =>
          [
            "PENDING",
            "PAYMENT_PENDING",
            "RESCHEDULED",
          ].includes(
            appointment.status
          )
      ).length,
    },
    {
      icon: "checkmark-circle-outline",
      label: "Completed",
      value: offlineAppointments.filter(
        (appointment) =>
          appointment.status ===
          "COMPLETED"
      ).length,
    },
    {
      icon: "wallet-outline",
      label: "Paid",
      value: offlineAppointments.filter(
        (appointment) =>
          [
            "SUCCESS",
            "PAID",
          ].includes(
            appointment.paymentStatus
          )
      ).length,
    },
  ];

  function resetFilters() {
    setSearch("");
    setDateFilter("");
    setStatusFilter("");
    setPage(1);
  }

  /* =====================================================
     COMPLETE APPOINTMENT
  ===================================================== */

  function openComplete(
    appointment: Appointment
  ) {
    if (
      ![
        "SUCCESS",
        "PAID",
      ].includes(
        appointment.paymentStatus
      )
    ) {
      showNotice(
        "error",
        "Payment Required",
        "The appointment can be completed only after successful payment."
      );
      return;
    }

    if (
      appointment.status ===
      "COMPLETED"
    ) {
      showNotice(
        "info",
        "Already Completed",
        "This appointment is already completed."
      );
      return;
    }

    if (
      [
        "CANCELLED",
        "REJECTED",
      ].includes(
        appointment.status
      )
    ) {
      showNotice(
        "error",
        "Cannot Complete",
        "A cancelled or rejected appointment cannot be completed."
      );
      return;
    }

    setCompleteTarget(
      appointment
    );
  }

  async function completeAppointment() {
    if (!completeTarget) {
      return;
    }

    const appointmentSnapshot = {
      ...completeTarget,
    };

    setCompleting(true);

    try {
      let result: any;

      try {
        result = await api(
          `/appointments/${encodeURIComponent(
            String(
              appointmentSnapshot.id
            )
          )}/complete`,
          {
            method: "PUT",
          }
        );
      } catch (error: any) {
        const message = String(
          error?.message || ""
        ).toLowerCase();

        /*
         * Keep this fallback because the older
         * website code used it for servers where
         * complete was exposed as GET.
         */
        if (
          error?.status === 404 ||
          error?.status === 405 ||
          message.includes(
            "method not allowed"
          )
        ) {
          result = await api(
            `/appointments/${encodeURIComponent(
              String(
                appointmentSnapshot.id
              )
            )}/complete`
          );
        } else {
          throw error;
        }
      }

      const completedAppointment =
        normalizeAppointment({
          ...appointmentSnapshot,
          ...(result?.data || {}),
          status: "COMPLETED",
        });

      setCompleteTarget(null);

      setWorkflowTarget(
        completedAppointment
      );

      showNotice(
        "success",
        "Appointment Completed",
        result?.message ||
          "Appointment completed successfully."
      );

      await loadAppointments();
    } catch (error: any) {
      showNotice(
        "error",
        "Completion Failed",
        error?.message ||
          "Unable to complete the appointment."
      );
    } finally {
      setCompleting(false);
    }
  }

  /* =====================================================
     PRESCRIPTION
  ===================================================== */

  function openPrescription(
    appointment: Appointment
  ) {
    if (
      appointment.status !==
      "COMPLETED"
    ) {
      showNotice(
        "error",
        "Complete Appointment First",
        "Complete the appointment before creating the prescription."
      );
      return;
    }

    const existing =
      prescriptionByAppointment[
        String(appointment.id)
      ];

    setDetails(null);
    setWorkflowTarget(null);

    if (existing) {
      setViewPrescription(existing);
      return;
    }

    router.push({
      pathname:
        "/doctor/prescription-pad" as any,
      params: {
        appointmentId: String(
          appointment.id
        ),
        patientId: String(
          appointment.patientId || ""
        ),
      },
    } as any);
  }

  function hasPrescription(
    appointment: Appointment
  ) {
    return Boolean(
      prescriptionByAppointment[
        String(appointment.id)
      ]
    );
  }

  function getTreatmentPlans(
    appointment: Appointment
  ) {
    if (!appointment.patientId) {
      return [];
    }

    return (
      treatmentPlansByPatient[
        String(appointment.patientId)
      ] || []
    );
  }

  function hasTreatmentPlan(
    appointment: Appointment
  ) {
    return (
      getTreatmentPlans(appointment)
        .length > 0
    );
  }

  function openTreatmentAction(
    appointment: Appointment
  ) {
    const existingPlans =
      getTreatmentPlans(appointment);

    if (existingPlans.length > 0) {
      setDetails(null);
      setWorkflowTarget(null);
      setViewTreatmentPatientName(
        appointment.patientName
      );
      setViewTreatmentPlans(
        existingPlans
      );
      return;
    }

    openTreatmentPlan(appointment);
  }

  /* =====================================================
     TREATMENT PLAN
  ===================================================== */

  function openTreatmentPlan(
    appointment: Appointment
  ) {
    if (
      appointment.status !==
      "COMPLETED"
    ) {
      showNotice(
        "error",
        "Complete Appointment First",
        "Treatment plans can be created after the appointment is completed."
      );
      return;
    }

    setDetails(null);
    setWorkflowTarget(null);
    setTreatmentTarget(
      appointment
    );

    setPlan({
      therapistId: "",
      treatmentName: "",
      diagnosis:
        appointment.symptoms === "—"
          ? ""
          : appointment.symptoms,
      totalSessions: "",
      startDate: today,
      expectedEndDate: today,
      instructions: "",
      notes: "",
    });
  }

  async function saveTreatmentPlan() {
    if (!treatmentTarget) {
      return;
    }

    const patientId = Number(
      treatmentTarget.patientId
    );

    const therapistId = Number(
      plan.therapistId
    );

    const totalSessions = Number(
      plan.totalSessions
    );

    if (!patientId) {
      showNotice(
        "error",
        "Patient Missing",
        "Patient ID is missing."
      );
      return;
    }

    if (!therapistId) {
      showNotice(
        "error",
        "Therapist Required",
        "Please select a therapist."
      );
      return;
    }

    if (
      !plan.treatmentName.trim()
    ) {
      showNotice(
        "error",
        "Treatment Required",
        "Please enter the treatment name."
      );
      return;
    }

    if (!plan.diagnosis.trim()) {
      showNotice(
        "error",
        "Diagnosis Required",
        "Please enter the diagnosis."
      );
      return;
    }

    if (
      !totalSessions ||
      totalSessions < 1
    ) {
      showNotice(
        "error",
        "Invalid Sessions",
        "Total sessions must be at least 1."
      );
      return;
    }

    if (
      !plan.startDate ||
      !plan.expectedEndDate
    ) {
      showNotice(
        "error",
        "Dates Required",
        "Please select the start and expected end dates."
      );
      return;
    }

    if (
      plan.expectedEndDate <
      plan.startDate
    ) {
      showNotice(
        "error",
        "Invalid Dates",
        "Expected end date cannot be before the start date."
      );
      return;
    }

    setSavingPlan(true);

    try {
      const result = await api(
        "/treatment-plans/create",
        {
          method: "POST",
          body: JSON.stringify({
            patientId,
            therapistId,
            treatmentName:
              plan.treatmentName.trim(),
            diagnosis:
              plan.diagnosis.trim(),
            totalSessions,
            startDate:
              plan.startDate,
            expectedEndDate:
              plan.expectedEndDate,
            instructions:
              plan.instructions.trim(),
            notes:
              plan.notes.trim(),
          }),
        }
      );

      setTreatmentTarget(null);

      await loadAppointments();

      showNotice(
        "success",
        "Treatment Plan Created",
        result?.message ||
          "Treatment plan created successfully."
      );
    } catch (error: any) {
      showNotice(
        "error",
        "Unable to Create Plan",
        error?.message ||
          "Unable to create treatment plan."
      );
    } finally {
      setSavingPlan(false);
    }
  }

  /* =====================================================
     DRAWER
  ===================================================== */

  const visibleMenu = MENU.filter(
    (item) => {
      if (
        item.mode === "ONLINE" &&
        hasOnline === false
      ) {
        return false;
      }

      if (
        item.mode === "OFFLINE" &&
        hasOffline === false
      ) {
        return false;
      }

      return true;
    }
  );

  async function logout() {
    setLogoutOpen(false);
    await clearSession();
    router.replace("/login" as any);
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (
    !dmLoaded ||
    !playfairLoaded ||
    loading
  ) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator
          size="large"
          color={GREEN}
        />
        <Text style={styles.loaderText}>
          Loading appointments...
        </Text>
      </View>
    );
  }

  /* =====================================================
     SCREEN
  ===================================================== */

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() =>
            setMenuOpen(true)
          }
        >
          <Ionicons
            name="menu-outline"
            size={25}
            color={GREEN}
          />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>
            DOCTOR PORTAL
          </Text>

          <Text style={styles.headerTitle}>
            Appointment Details
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() =>
            loadPage(false)
          }
        >
          <Ionicons
            name="refresh-outline"
            size={20}
            color={GREEN}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatar}
          onPress={() =>
            router.push(
              "/doctor/profile" as any
            )
          }
        >
          <Text style={styles.avatarText}>
            {doctorInitial}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom: 35,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPage(false);
            }}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View
            style={styles.heroOrb}
          />

          <View
            style={styles.heroIcon}
          >
            <Ionicons
              name="calendar-outline"
              size={24}
              color={GOLD_LIGHT}
            />
          </View>

          <Text style={styles.heroTag}>
            APPOINTMENT MANAGEMENT
          </Text>

          <Text style={styles.heroTitle}>
            Your Appointments
          </Text>

          <Text style={styles.heroText}>
            Search appointments, review
            patient information and continue
            the clinical workflow from your
            phone.
          </Text>
        </View>

        {/* STATS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.stats
          }
        >
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={styles.statCard}
            >
              <View
                style={
                  styles.statIcon
                }
              >
                <Ionicons
                  name={
                    stat.icon as any
                  }
                  size={18}
                  color={GREEN}
                />
              </View>

              <Text
                style={
                  styles.statValue
                }
              >
                {stat.value}
              </Text>

              <Text
                style={
                  styles.statLabel
                }
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* FILTERS */}
        <View style={styles.filters}>
          <View
            style={styles.searchBox}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={GOLD_DARK}
            />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search patient, phone or symptoms"
              placeholderTextColor="#99A39D"
              style={
                styles.searchInput
              }
            />

            {Boolean(search) && (
              <TouchableOpacity
                onPress={() =>
                  setSearch("")
                }
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={MUTED}
                />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filterRow
            }
          >
            <FilterChip
              icon="calendar-outline"
              text={
                dateFilter
                  ? formatDate(
                      dateFilter
                    )
                  : "Date"
              }
              active={Boolean(
                dateFilter
              )}
              onPress={() =>
                setDatePickerOpen(
                  true
                )
              }
            />

            <FilterChip
              icon="options-outline"
              text={
                statusFilter
                  ? label(
                      statusFilter
                    )
                  : "Status"
              }
              active={Boolean(
                statusFilter
              )}
              onPress={() =>
                setFilterChoiceOpen(
                  true
                )
              }
            />

            {Boolean(
              search ||
                dateFilter ||
                statusFilter
            ) && (
              <FilterChip
                icon="refresh-outline"
                text="Reset"
                active={false}
                onPress={
                  resetFilters
                }
              />
            )}
          </ScrollView>
        </View>

        {/* SECTION TITLE */}
        <View
          style={styles.sectionHeader}
        >
          <View>
            <Text style={styles.eyebrow}>
              PATIENT APPOINTMENTS
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Appointment List
            </Text>
          </View>

          <View
            style={styles.countBadge}
          >
            <Text
              style={
                styles.countText
              }
            >
              {
                filteredAppointments.length
              }{" "}
              results
            </Text>
          </View>
        </View>

        {/* CARDS */}
        <View style={styles.cards}>
          {visibleAppointments.length ===
          0 ? (
            <EmptyState />
          ) : (
            visibleAppointments.map(
              (appointment) => (
                <AppointmentCard
                  key={String(
                    appointment.id
                  )}
                  appointment={
                    appointment
                  }
                  onView={() =>
                    setDetails(
                      appointment
                    )
                  }
                  onComplete={() =>
                    openComplete(
                      appointment
                    )
                  }
                  onPrescription={() =>
                    openPrescription(
                      appointment
                    )
                  }
                  prescriptionExists={hasPrescription(
                    appointment
                  )}
                  treatmentPlanExists={hasTreatmentPlan(
                    appointment
                  )}
                  onTreatment={() =>
                    openTreatmentAction(
                      appointment
                    )
                  }
                />
              )
            )
          )}
        </View>

        {/* PAGINATION */}
        {filteredAppointments.length >
          PAGE_SIZE && (
          <View
            style={
              styles.pagination
            }
          >
            <TouchableOpacity
              disabled={
                safePage === 1
              }
              style={[
                styles.pageButton,
                safePage === 1 && {
                  opacity: 0.35,
                },
              ]}
              onPress={() =>
                setPage((current) =>
                  Math.max(
                    1,
                    current - 1
                  )
                )
              }
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={GREEN}
              />
            </TouchableOpacity>

            <Text
              style={
                styles.pageInfo
              }
            >
              Page {safePage} of{" "}
              {pageCount}
            </Text>

            <TouchableOpacity
              disabled={
                safePage ===
                pageCount
              }
              style={[
                styles.pageButton,
                safePage ===
                  pageCount && {
                  opacity: 0.35,
                },
              ]}
              onPress={() =>
                setPage((current) =>
                  Math.min(
                    pageCount,
                    current + 1
                  )
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
        )}
      </ScrollView>

      {/* DRAWER */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setMenuOpen(false)
        }
      >
        <View
          style={styles.drawerRoot}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() =>
              setMenuOpen(false)
            }
          />

          <View style={styles.drawer}>
            <View
              style={
                styles.drawerBrand
              }
            >
              <View
                style={styles.brandIcon}
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
                    styles.brandTitle
                  }
                >
                  NeoLife
                </Text>

                <Text
                  style={
                    styles.brandSub
                  }
                >
                  DOCTOR PORTAL
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
                styles.drawerDoctor
              }
            >
              <View
                style={
                  styles.drawerAvatar
                }
              >
                <Text
                  style={
                    styles.drawerAvatarText
                  }
                >
                  {doctorInitial}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={
                    styles.drawerName
                  }
                >
                  {doctorName}
                </Text>

                <Text
                  style={
                    styles.drawerRole
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
            >
              {[
                "MAIN",
                "CLINICAL",
                "FINANCE",
              ].map((section) => {
                const sectionItems =
                  visibleMenu.filter(
                    (item) =>
                      item.section ===
                      section
                  );

                if (
                  sectionItems.length === 0
                ) {
                  return null;
                }

                return (
                  <View
                    key={section}
                    style={{
                      marginTop: 13,
                    }}
                  >
                    <Text
                      style={
                        styles.menuLabel
                      }
                    >
                      {section}
                    </Text>

                    {sectionItems.map(
                      (item) => {
                        const active =
                          item.label ===
                          "Appointment Details";

                        return (
                          <TouchableOpacity
                            key={
                              item.label
                            }
                            style={[
                              styles.menuItem,
                              active &&
                                styles.menuActive,
                            ]}
                            onPress={() => {
                              setMenuOpen(
                                false
                              );

                              if (!active) {
                                router.push(
                                  item.route as any
                                );
                              }
                            }}
                          >
                            <View
                              style={[
                                styles.menuIcon,
                                active && {
                                  backgroundColor:
                                    MINT,
                                },
                              ]}
                            >
                              <Ionicons
                                name={
                                  item.icon as any
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
                                styles.menuText,
                                active && {
                                  color:
                                    GREEN,
                                },
                              ]}
                            >
                              {
                                item.label
                              }
                            </Text>

                            <Ionicons
                              name="chevron-forward"
                              size={15}
                              color={
                                active
                                  ? GREEN
                                  : "#AFC0B6"
                              }
                            />
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.logout}
              onPress={() => {
                setMenuOpen(false);
                setLogoutOpen(true);
              }}
            >
              <Ionicons
                name="log-out-outline"
                size={19}
                color={WHITE}
              />

              <Text
                style={
                  styles.logoutText
                }
              >
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DETAILS SHEET */}
      <BottomSheet
        visible={Boolean(details)}
        title="Appointment Details"
        eyebrow="PATIENT APPOINTMENT"
        onClose={() =>
          setDetails(null)
        }
      >
        {details && (
          <>
            <PatientHeader
              appointment={details}
            />

            <View
              style={
                styles.detailGrid
              }
            >
              <DetailCard
                label="Appointment ID"
                value={`#${details.id}`}
              />

              <DetailCard
                label="Date & Time"
                value={`${formatDate(
                  details.date
                )} · ${formatTime(
                  details.startTime
                )}`}
              />

              <DetailCard
                label="Mode"
                value={label(
                  details.mode
                )}
              />

              <DetailCard
                label="Status"
                value={label(
                  details.status
                )}
              />

              <DetailCard
                label="Booking Fee"
                value={`₹${details.bookingFee.toLocaleString(
                  "en-IN"
                )}`}
              />

              <DetailCard
                label="Payment"
                value={label(
                  details.paymentStatus
                )}
              />
            </View>

            <DetailLong
              label="Symptoms"
              value={details.symptoms}
            />

            <DetailLong
              label="Past Medical History"
              value={details.history}
            />

            {Boolean(
              details.rescheduleReason
            ) && (
              <DetailLong
                label="Reschedule Reason"
                value={
                  details.rescheduleReason
                }
              />
            )}

            {Boolean(
              details.cancellationReason
            ) && (
              <DetailLong
                label="Cancellation Reason"
                value={
                  details.cancellationReason
                }
              />
            )}

            {details.status ===
              "COMPLETED" && (
              <View
                style={
                  styles.sheetActions
                }
              >
                <TouchableOpacity
                  style={
                    styles.secondaryButton
                  }
                  onPress={() =>
                    openTreatmentAction(
                      details
                    )
                  }
                >
                  <Ionicons
                    name="medkit-outline"
                    size={17}
                    color={GREEN}
                  />
                  <Text
                    style={
                      styles.secondaryButtonText
                    }
                  >
                    {hasTreatmentPlan(details)
                      ? "View Treatment Plans"
                      : "Create Treatment Plan"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.primaryButton
                  }
                  onPress={() =>
                    openPrescription(
                      details
                    )
                  }
                >
                  <Ionicons
                    name="document-text-outline"
                    size={17}
                    color={WHITE}
                  />
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    {hasPrescription(details)
                      ? "View Prescription"
                      : "Create Prescription"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </BottomSheet>

      {/* COMPLETE CONFIRMATION */}
      <ConfirmCompleteModal
        appointment={completeTarget}
        busy={completing}
        onCancel={() =>
          setCompleteTarget(null)
        }
        onConfirm={
          completeAppointment
        }
      />

      {/* POST-COMPLETION WORKFLOW */}
      <WorkflowModal
        appointment={workflowTarget}
        onClose={() =>
          setWorkflowTarget(null)
        }
        onPrescription={() => {
          if (workflowTarget) {
            openPrescription(
              workflowTarget
            );
          }
        }}
        onTreatment={() => {
          if (workflowTarget) {
            openTreatmentAction(
              workflowTarget
            );
          }
        }}
      />

      {/* TREATMENT PLAN SHEET */}
      <BottomSheet
        visible={Boolean(
          treatmentTarget
        )}
        title="Create Treatment Plan"
        eyebrow="THERAPY PLAN"
        onClose={() =>
          setTreatmentTarget(null)
        }
      >
        {treatmentTarget && (
          <>
            <PatientHeader
              appointment={
                treatmentTarget
              }
            />

            <Field label="THERAPIST">
              <TouchableOpacity
                style={styles.inputBox}
                onPress={() =>
                  setTherapistChoiceOpen(
                    true
                  )
                }
              >
                <Ionicons
                  name="person-outline"
                  size={17}
                  color={GOLD_DARK}
                />

                <Text
                  style={
                    styles.inputBoxText
                  }
                >
                  {therapistLabel(
                    therapists,
                    plan.therapistId
                  ) ||
                    "Select therapist"}
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={MUTED}
                />
              </TouchableOpacity>
            </Field>

            <Field label="TREATMENT NAME">
              <TextInput
                value={
                  plan.treatmentName
                }
                onChangeText={(value) =>
                  setPlan(
                    (current) => ({
                      ...current,
                      treatmentName:
                        value,
                    })
                  )
                }
                placeholder="Example: Panchakarma Therapy"
                placeholderTextColor="#9AA59E"
                style={
                  styles.textInput
                }
              />
            </Field>

            <Field label="DIAGNOSIS">
              <TextInput
                value={plan.diagnosis}
                onChangeText={(value) =>
                  setPlan(
                    (current) => ({
                      ...current,
                      diagnosis:
                        value,
                    })
                  )
                }
                placeholder="Enter diagnosis"
                placeholderTextColor="#9AA59E"
                style={
                  styles.textInput
                }
              />
            </Field>

            <Field label="TOTAL SESSIONS">
              <TextInput
                value={
                  plan.totalSessions
                }
                onChangeText={(value) =>
                  setPlan(
                    (current) => ({
                      ...current,
                      totalSessions:
                        value.replace(
                          /[^0-9]/g,
                          ""
                        ),
                    })
                  )
                }
                keyboardType="number-pad"
                placeholder="Example: 14"
                placeholderTextColor="#9AA59E"
                style={
                  styles.textInput
                }
              />
            </Field>

            <View
              style={
                styles.dateRow
              }
            >
              <View
                style={{ flex: 1 }}
              >
                <Field label="START DATE">
                  <DateButton
                    value={
                      plan.startDate
                    }
                    onPress={() =>
                      setPlanDatePicker(
                        "start"
                      )
                    }
                  />
                </Field>
              </View>

              <View
                style={{ flex: 1 }}
              >
                <Field label="EXPECTED END">
                  <DateButton
                    value={
                      plan.expectedEndDate
                    }
                    onPress={() =>
                      setPlanDatePicker(
                        "end"
                      )
                    }
                  />
                </Field>
              </View>
            </View>

            <Field label="INSTRUCTIONS">
              <TextInput
                value={
                  plan.instructions
                }
                onChangeText={(value) =>
                  setPlan(
                    (current) => ({
                      ...current,
                      instructions:
                        value,
                    })
                  )
                }
                multiline
                textAlignVertical="top"
                placeholder="Therapy instructions"
                placeholderTextColor="#9AA59E"
                style={styles.textArea}
              />
            </Field>

            <Field label="NOTES">
              <TextInput
                value={plan.notes}
                onChangeText={(value) =>
                  setPlan(
                    (current) => ({
                      ...current,
                      notes: value,
                    })
                  )
                }
                multiline
                textAlignVertical="top"
                placeholder="Clinical notes or precautions"
                placeholderTextColor="#9AA59E"
                style={styles.textArea}
              />
            </Field>

            <View style={styles.note}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={GOLD_DARK}
              />

              <Text
                style={
                  styles.noteText
                }
              >
                The logged-in doctor is
                automatically connected by
                the backend.
              </Text>
            </View>

            <TouchableOpacity
              disabled={savingPlan}
              style={[
                styles.primaryButton,
                {
                  width: "100%",
                  marginTop: 16,
                },
              ]}
              onPress={
                saveTreatmentPlan
              }
            >
              {savingPlan ? (
                <ActivityIndicator
                  color={WHITE}
                />
              ) : (
                <>
                  <Ionicons
                    name="add"
                    size={18}
                    color={WHITE}
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Create Plan
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </BottomSheet>

      {/* STATUS CHOICE */}
      <ChoiceModal
        visible={
          filterChoiceOpen
        }
        title="Appointment Status"
        onClose={() =>
          setFilterChoiceOpen(false)
        }
      >
        {STATUSES.map((status) => (
          <ChoiceRow
            key={status || "all"}
            text={
              status
                ? label(status)
                : "All"
            }
            onPress={() => {
              setStatusFilter(status);
              setFilterChoiceOpen(false);
            }}
          />
        ))}
      </ChoiceModal>

      {/* THERAPIST CHOICE */}
      <ChoiceModal
        visible={
          therapistChoiceOpen
        }
        title="Select Therapist"
        onClose={() =>
          setTherapistChoiceOpen(
            false
          )
        }
      >
        {therapists
          .filter(
            (therapist) =>
              therapist.active !== false
          )
          .map((therapist) => (
            <ChoiceRow
              key={String(
                therapist.id
              )}
              text={[
                therapist.name ||
                  therapist.therapistName ||
                  "Therapist",
                therapist.specialization ||
                  therapist.qualification ||
                  "",
              ]
                .filter(Boolean)
                .join(" — ")}
              onPress={() => {
                setPlan(
                  (current) => ({
                    ...current,
                    therapistId:
                      String(
                        therapist.id
                      ),
                  })
                );

                setTherapistChoiceOpen(
                  false
                );
              }}
            />
          ))}
      </ChoiceModal>

      {/* DATE FILTER */}
      {datePickerOpen && (
        <DateTimePicker
          value={
            dateFilter
              ? parseDate(dateFilter)
              : new Date()
          }
          mode="date"
          display={
            Platform.OS === "android"
              ? "calendar"
              : "spinner"
          }
          onChange={(
            event,
            selectedDate
          ) => {
            if (
              Platform.OS === "android"
            ) {
              setDatePickerOpen(
                false
              );
            }

            if (
              event.type !==
                "dismissed" &&
              selectedDate
            ) {
              setDateFilter(
                localDateKey(
                  selectedDate
                )
              );
            }
          }}
        />
      )}

      {/* TREATMENT DATE PICKER */}
      {planDatePicker && (
        <DateTimePicker
          value={parseDate(
            planDatePicker === "start"
              ? plan.startDate
              : plan.expectedEndDate
          )}
          mode="date"
          minimumDate={startToday()}
          display={
            Platform.OS === "android"
              ? "calendar"
              : "spinner"
          }
          onChange={(
            event,
            selectedDate
          ) => {
            const field =
              planDatePicker;

            if (
              Platform.OS === "android"
            ) {
              setPlanDatePicker(null);
            }

            if (
              event.type !==
                "dismissed" &&
              selectedDate &&
              field
            ) {
              setPlan(
                (current) => ({
                  ...current,
                  [field === "start"
                    ? "startDate"
                    : "expectedEndDate"]:
                    localDateKey(
                      selectedDate
                    ),
                })
              );
            }
          }}
        />
      )}

      {/* VIEW PRESCRIPTION */}
      <BottomSheet
        visible={Boolean(viewPrescription)}
        title="Prescription"
        eyebrow="PATIENT PRESCRIPTION"
        onClose={() =>
          setViewPrescription(null)
        }
      >
        {viewPrescription && (
          <>
            <View style={styles.viewSummary}>
              <DetailCard
                label="Prescription ID"
                value={`#${viewPrescription.id}`}
              />
              <DetailCard
                label="Status"
                value={label(
                  viewPrescription.status || "—"
                )}
              />
            </View>

            <DetailLong
              label="Diagnosis"
              value={
                viewPrescription.diagnosis || "—"
              }
            />

            <DetailLong
              label="Advice"
              value={
                viewPrescription.advice || "—"
              }
            />

            {Boolean(viewPrescription.notes) && (
              <DetailLong
                label="Notes"
                value={
                  viewPrescription.notes || "—"
                }
              />
            )}

            <Text style={styles.recordSectionTitle}>
              Medicines
            </Text>

            {Array.isArray(
              viewPrescription.items
            ) &&
            viewPrescription.items.length > 0 ? (
              viewPrescription.items.map(
                (item, index) => (
                  <View
                    key={String(
                      item.id || index
                    )}
                    style={styles.medicineCard}
                  >
                    <Text
                      style={
                        styles.medicineName
                      }
                    >
                      {item.medicineName ||
                        "Medicine"}
                    </Text>

                    <Text
                      style={
                        styles.medicineMeta
                      }
                    >
                      Dosage:{" "}
                      {item.dosage || "—"}
                    </Text>

                    <Text
                      style={
                        styles.medicineMeta
                      }
                    >
                      Frequency:{" "}
                      {item.frequency || "—"}
                    </Text>

                    <Text
                      style={
                        styles.medicineMeta
                      }
                    >
                      Duration:{" "}
                      {item.durationDays
                        ? `${item.durationDays} days`
                        : "—"}
                    </Text>

                    <Text
                      style={
                        styles.medicineMeta
                      }
                    >
                      Quantity:{" "}
                      {item.quantity ?? "—"}
                    </Text>

                    {Boolean(
                      item.instructions
                    ) && (
                      <Text
                        style={
                          styles.medicineInstructions
                        }
                      >
                        {
                          item.instructions
                        }
                      </Text>
                    )}
                  </View>
                )
              )
            ) : (
              <Text style={styles.emptyInline}>
                No medicine items available.
              </Text>
            )}
          </>
        )}
      </BottomSheet>

      {/* VIEW TREATMENT PLANS */}
      <BottomSheet
        visible={
          viewTreatmentPlans.length > 0
        }
        title="Treatment Plans"
        eyebrow="PATIENT TREATMENT HISTORY"
        onClose={() => {
          setViewTreatmentPlans([]);
          setViewTreatmentPatientName("");
        }}
      >
        <Text style={styles.viewPatientTitle}>
          {viewTreatmentPatientName}
        </Text>

        {viewTreatmentPlans.map(
          (treatmentPlan, index) => (
            <View
              key={String(
                treatmentPlan.id || index
              )}
              style={styles.treatmentViewCard}
            >
              <View style={styles.treatmentViewHeader}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={
                      styles.treatmentViewTitle
                    }
                  >
                    {treatmentPlan.treatmentName ||
                      "Treatment Plan"}
                  </Text>

                  <Text
                    style={
                      styles.treatmentViewMeta
                    }
                  >
                    {treatmentPlan.therapistName
                      ? `Therapist: ${treatmentPlan.therapistName}`
                      : "Therapist not assigned"}
                  </Text>
                </View>

                <StatusBadge
                  text={label(
                    treatmentPlan.status ||
                      "PENDING"
                  )}
                  kind={statusKind(
                    treatmentPlan.status ||
                      "PENDING"
                  )}
                />
              </View>

              <DetailLong
                label="Diagnosis"
                value={
                  treatmentPlan.diagnosis || "—"
                }
              />

              <View style={styles.viewSummary}>
                <DetailCard
                  label="Sessions"
                  value={`${treatmentPlan.completedSessions ?? 0}/${treatmentPlan.totalSessions ?? 0}`}
                />

                <DetailCard
                  label="Remaining"
                  value={String(
                    treatmentPlan.remainingSessions ??
                      Math.max(
                        (treatmentPlan.totalSessions || 0) -
                          (treatmentPlan.completedSessions || 0),
                        0
                      )
                  )}
                />

                <DetailCard
                  label="Start Date"
                  value={formatDate(
                    treatmentPlan.startDate || ""
                  )}
                />

                <DetailCard
                  label="Expected End"
                  value={formatDate(
                    treatmentPlan.expectedEndDate || ""
                  )}
                />
              </View>

              {Boolean(
                treatmentPlan.instructions
              ) && (
                <DetailLong
                  label="Instructions"
                  value={
                    treatmentPlan.instructions || "—"
                  }
                />
              )}

              {Boolean(
                treatmentPlan.notes
              ) && (
                <DetailLong
                  label="Notes"
                  value={
                    treatmentPlan.notes || "—"
                  }
                />
              )}
            </View>
          )
        )}
      </BottomSheet>

      {/* NOTICE */}
      <NoticeModal
        notice={notice}
        onClose={() =>
          setNotice((current) => ({
            ...current,
            visible: false,
          }))
        }
      />

      {/* LOGOUT */}
      <LogoutModal
        visible={logoutOpen}
        onCancel={() =>
          setLogoutOpen(false)
        }
        onConfirm={logout}
      />
    </View>
  );
}

/* =====================================================
   APPOINTMENT CARD
===================================================== */

function AppointmentCard({
  appointment,
  prescriptionExists,
  treatmentPlanExists,
  onView,
  onComplete,
  onPrescription,
  onTreatment,
}: {
  appointment: Appointment;
  prescriptionExists: boolean;
  treatmentPlanExists: boolean;
  onView: () => void;
  onComplete: () => void;
  onPrescription: () => void;
  onTreatment: () => void;
}) {
  const canComplete =
    [
      "SUCCESS",
      "PAID",
    ].includes(
      appointment.paymentStatus
    ) &&
    appointment.status !==
      "COMPLETED" &&
    ![
      "CANCELLED",
      "REJECTED",
    ].includes(
      appointment.status
    );

  const completed =
    appointment.status ===
    "COMPLETED";

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
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
            {appointment.patientName
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
              appointment.patientName
            }
          </Text>

          <Text
            style={
              styles.patientMeta
            }
          >
            {
              appointment.phoneNumber
            }{" "}
            • #{appointment.id}
          </Text>
        </View>

        <StatusBadge
          text="Offline"
          kind="success"
        />
      </View>

      <View style={styles.timeBox}>
        <Ionicons
          name="calendar-outline"
          size={17}
          color={GREEN}
        />

        <View style={{ flex: 1 }}>
          <Text
            style={styles.dateText}
          >
            {formatDate(
              appointment.date
            )}
          </Text>

          <Text
            style={styles.timeText}
          >
            {formatTime(
              appointment.startTime
            )}
            {appointment.endTime
              ? ` - ${formatTime(
                  appointment.endTime
                )}`
              : ""}
          </Text>
        </View>
      </View>

      <Text
        style={
          styles.symptomLabel
        }
      >
        SYMPTOMS
      </Text>

      <Text
        numberOfLines={2}
        style={styles.symptoms}
      >
        {appointment.symptoms}
      </Text>

      <View style={styles.badges}>
        <StatusBadge
          text={label(
            appointment.status
          )}
          kind={statusKind(
            appointment.status
          )}
        />

        <StatusBadge
          text={`Payment: ${label(
            appointment.paymentStatus
          )}`}
          kind={statusKind(
            appointment.paymentStatus
          )}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onView}
        >
          <Ionicons
            name="eye-outline"
            size={17}
            color={GREEN}
          />
          <Text
            style={
              styles.actionButtonText
            }
          >
            View
          </Text>
        </TouchableOpacity>

        {canComplete && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor:
                  SUCCESS_LIGHT,
              },
            ]}
            onPress={onComplete}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={17}
              color={SUCCESS}
            />
            <Text
              style={[
                styles.actionButtonText,
                {
                  color: SUCCESS,
                },
              ]}
            >
              Mark Done
            </Text>
          </TouchableOpacity>
        )}

        {completed && (
          <View style={styles.clinicalActions}>
            <TouchableOpacity
              style={[
                styles.clinicalActionButton,
                {
                  backgroundColor:
                    "#FFF7DF",
                },
              ]}
              onPress={onPrescription}
            >
              <Ionicons
                name={
                  prescriptionExists
                    ? "eye-outline"
                    : "document-text-outline"
                }
                size={17}
                color={GOLD_DARK}
              />
              <Text
                style={[
                  styles.clinicalActionText,
                  { color: GOLD_DARK },
                ]}
              >
                {prescriptionExists
                  ? "View Prescription"
                  : "Create Prescription"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.clinicalActionButton,
                {
                  backgroundColor:
                    INFO_LIGHT,
                },
              ]}
              onPress={onTreatment}
            >
              <Ionicons
                name={
                  treatmentPlanExists
                    ? "eye-outline"
                    : "medkit-outline"
                }
                size={17}
                color={INFO}
              />
              <Text
                style={[
                  styles.clinicalActionText,
                  { color: INFO },
                ]}
              >
                {treatmentPlanExists
                  ? "View Treatment Plans"
                  : "Create Treatment Plan"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

/* =====================================================
   REUSABLE UI
===================================================== */

function BottomSheet({
  visible,
  title,
  eyebrow,
  onClose,
  children,
}: any) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={styles.sheetRoot}
      >
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <View
            style={styles.handle}
          />

          <View
            style={
              styles.sheetHeader
            }
          >
            <View style={{ flex: 1 }}>
              <Text
                style={
                  styles.eyebrow
                }
              >
                {eyebrow}
              </Text>

              <Text
                style={
                  styles.sheetTitle
                }
              >
                {title}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons
                name="close"
                size={21}
                color={GREEN}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PatientHeader({
  appointment,
}: {
  appointment: Appointment;
}) {
  return (
    <View
      style={styles.patientHeader}
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
          {appointment.patientName
            .charAt(0)
            .toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={styles.patientName}
        >
          {appointment.patientName}
        </Text>

        <Text
          style={styles.patientMeta}
        >
          {appointment.phoneNumber} ·{" "}
          {appointment.age} years ·{" "}
          {label(
            appointment.gender
          )}
        </Text>
      </View>
    </View>
  );
}

function DetailCard({
  label: title,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailCard}>
      <Text
        style={styles.detailLabel}
      >
        {title}
      </Text>

      <Text
        style={styles.detailValue}
      >
        {value || "—"}
      </Text>
    </View>
  );
}

function DetailLong({
  label: title,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailLong}>
      <Text
        style={styles.detailLabel}
      >
        {title}
      </Text>

      <Text
        style={
          styles.detailParagraph
        }
      >
        {value || "—"}
      </Text>
    </View>
  );
}

function Field({
  label: title,
  children,
}: any) {
  return (
    <View>
      <Text
        style={styles.fieldLabel}
      >
        {title}
      </Text>
      {children}
    </View>
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
    <TouchableOpacity
      style={styles.inputBox}
      onPress={onPress}
    >
      <Ionicons
        name="calendar-outline"
        size={17}
        color={GOLD_DARK}
      />

      <Text
        numberOfLines={1}
        style={styles.inputBoxText}
      >
        {formatDate(value)}
      </Text>
    </TouchableOpacity>
  );
}

function FilterChip({
  icon,
  text,
  active,
  onPress,
}: any) {
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        active &&
          styles.filterChipActive,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={15}
        color={
          active
            ? WHITE
            : GREEN
        }
      />

      <Text
        style={[
          styles.filterChipText,
          active && {
            color: WHITE,
          },
        ]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
}

function StatusBadge({
  text,
  kind,
}: any) {
  let backgroundColor =
    "#F1F3F1";
  let color = MUTED;

  if (kind === "success") {
    backgroundColor =
      SUCCESS_LIGHT;
    color = SUCCESS;
  } else if (
    kind === "danger"
  ) {
    backgroundColor =
      DANGER_LIGHT;
    color = DANGER;
  } else if (
    kind === "warning"
  ) {
    backgroundColor =
      WARNING_LIGHT;
    color = WARNING;
  } else if (kind === "info") {
    backgroundColor =
      INFO_LIGHT;
    color = INFO;
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <View
        style={styles.emptyIcon}
      >
        <Ionicons
          name="calendar-outline"
          size={29}
          color={GREEN}
        />
      </View>

      <Text
        style={styles.emptyTitle}
      >
        No appointments found
      </Text>

      <Text
        style={styles.emptyText}
      >
        Try changing the search or
        filter options.
      </Text>
    </View>
  );
}

function ChoiceModal({
  visible,
  title,
  onClose,
  children,
}: any) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.center}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />

        <View style={styles.choiceCard}>
          <Text
            style={styles.modalTitle}
          >
            {title}
          </Text>

          <ScrollView>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ChoiceRow({
  text,
  onPress,
}: {
  text: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.choiceRow}
      onPress={onPress}
    >
      <Text
        style={styles.choiceText}
      >
        {text}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={16}
        color={GOLD_DARK}
      />
    </TouchableOpacity>
  );
}

/* =====================================================
   MODALS
===================================================== */

function ConfirmCompleteModal({
  appointment,
  busy,
  onCancel,
  onConfirm,
}: {
  appointment: Appointment | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={Boolean(
        appointment
      )}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.center}>
        <Pressable
          style={styles.backdrop}
          onPress={onCancel}
        />

        {appointment && (
          <View
            style={styles.modalCard}
          >
            <View
              style={styles.modalIcon}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={31}
                color={SUCCESS}
              />
            </View>

            <Text
              style={styles.eyebrow}
            >
              CLINICAL WORKFLOW
            </Text>

            <Text
              style={styles.modalTitle}
            >
              Mark Appointment as Done
            </Text>

            <PatientHeader
              appointment={
                appointment
              }
            />

            <View
              style={
                styles.completeNote
              }
            >
              <Text
                style={
                  styles.completeNoteText
                }
              >
                The appointment will be
                marked as COMPLETED.
                After that, create the
                prescription and a
                treatment plan only when
                clinically required.
              </Text>
            </View>

            <View
              style={
                styles.sheetActions
              }
            >
              <TouchableOpacity
                style={
                  styles.secondaryButton
                }
                onPress={onCancel}
              >
                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={busy}
                style={
                  styles.primaryButton
                }
                onPress={onConfirm}
              >
                {busy ? (
                  <ActivityIndicator
                    color={WHITE}
                  />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={17}
                      color={WHITE}
                    />

                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      Mark Done
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function WorkflowModal({
  appointment,
  onClose,
  onPrescription,
  onTreatment,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onPrescription: () => void;
  onTreatment: () => void;
}) {
  return (
    <Modal
      visible={Boolean(
        appointment
      )}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.center}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />

        {appointment && (
          <View
            style={styles.modalCard}
          >
            <View
              style={styles.modalIcon}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={31}
                color={SUCCESS}
              />
            </View>

            <Text
              style={styles.eyebrow}
            >
              APPOINTMENT COMPLETED
            </Text>

            <Text
              style={styles.modalTitle}
            >
              Select Next Action
            </Text>

            <Text
              style={styles.modalText}
            >
              Continue the patient's
              clinical workflow now, or
              complete it later.
            </Text>

            <TouchableOpacity
              style={
                styles.workflowOption
              }
              onPress={
                onPrescription
              }
            >
              <View
                style={[
                  styles.workflowIcon,
                  {
                    backgroundColor:
                      INFO_LIGHT,
                  },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={22}
                  color={INFO}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={
                    styles.workflowTitle
                  }
                >
                  Create Prescription
                </Text>

                <Text
                  style={
                    styles.workflowText
                  }
                >
                  Enter diagnosis, advice
                  and prescribed medicines.
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={MUTED}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.workflowOption
              }
              onPress={onTreatment}
            >
              <View
                style={[
                  styles.workflowIcon,
                  {
                    backgroundColor:
                      "#FFF7DF",
                  },
                ]}
              >
                <Ionicons
                  name="medkit-outline"
                  size={22}
                  color={GOLD_DARK}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={
                    styles.workflowTitle
                  }
                >
                  Create Treatment Plan
                </Text>

                <Text
                  style={
                    styles.workflowText
                  }
                >
                  Assign a therapist when
                  therapy is required.
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={MUTED}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  marginTop: 12,
                  width: "100%",
                },
              ]}
              onPress={onClose}
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                Do Later
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

function NoticeModal({
  notice,
  onClose,
}: {
  notice: Notice;
  onClose: () => void;
}) {
  const success =
    notice.type === "success";
  const error =
    notice.type === "error";

  return (
    <Modal
      visible={notice.visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.center}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />

        <View
          style={styles.modalCard}
        >
          <View
            style={[
              styles.modalIcon,
              {
                backgroundColor: success
                  ? SUCCESS_LIGHT
                  : error
                  ? DANGER_LIGHT
                  : INFO_LIGHT,
              },
            ]}
          >
            <Ionicons
              name={
                success
                  ? "checkmark-circle-outline"
                  : error
                  ? "close-circle-outline"
                  : "information-circle-outline"
              }
              size={32}
              color={
                success
                  ? SUCCESS
                  : error
                  ? DANGER
                  : INFO
              }
            />
          </View>

          <Text
            style={styles.eyebrow}
          >
            NEOLIFE DOCTOR PORTAL
          </Text>

          <Text
            style={styles.modalTitle}
          >
            {notice.title}
          </Text>

          <Text
            style={styles.modalText}
          >
            {notice.message}
          </Text>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                width: "100%",
                marginTop: 18,
                backgroundColor: GOLD,
              },
            ]}
            onPress={onClose}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: GREEN },
              ]}
            >
              Okay
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function LogoutModal({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.center}>
        <Pressable
          style={styles.backdrop}
          onPress={onCancel}
        />

        <View
          style={styles.modalCard}
        >
          <View
            style={styles.modalIcon}
          >
            <Ionicons
              name="log-out-outline"
              size={30}
              color={GREEN}
            />
          </View>

          <Text
            style={styles.eyebrow}
          >
            NEOLIFE DOCTOR PORTAL
          </Text>

          <Text
            style={styles.modalTitle}
          >
            Log Out?
          </Text>

          <Text
            style={styles.modalText}
          >
            Are you sure you want to
            leave your doctor workspace?
          </Text>

          <View
            style={
              styles.sheetActions
            }
          >
            <TouchableOpacity
              style={
                styles.secondaryButton
              }
              onPress={onCancel}
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.primaryButton
              }
              onPress={onConfirm}
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* =====================================================
   HELPERS
===================================================== */

function label(value: string) {
  return String(value || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function statusKind(value: string) {
  const status = String(
    value || ""
  ).toUpperCase();

  if (
    [
      "COMPLETED",
      "CONFIRMED",
      "PAID",
      "SUCCESS",
    ].includes(status)
  ) {
    return "success";
  }

  if (
    [
      "PENDING",
      "PAYMENT_PENDING",
      "RESCHEDULED",
    ].includes(status)
  ) {
    return "warning";
  }

  if (
    [
      "CANCELLED",
      "REJECTED",
      "FAILED",
    ].includes(status)
  ) {
    return "danger";
  }

  return "muted";
}

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  const parts = value
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (parts.length !== 3) {
    return value;
  }

  return new Date(
    parts[0],
    parts[1] - 1,
    parts[2]
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTime(value: string) {
  if (!value) {
    return "—";
  }

  const [hourText, minuteText] =
    String(value).split(":");

  let hour = Number(hourText);
  const suffix =
    hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${
    minuteText || "00"
  } ${suffix}`;
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function parseDate(value: string) {
  if (!value) {
    return new Date();
  }

  const parts = value
    .split("-")
    .map(Number);

  return new Date(
    parts[0],
    parts[1] - 1,
    parts[2]
  );
}

function startToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function therapistLabel(
  therapists: Therapist[],
  id: string
) {
  const therapist =
    therapists.find(
      (item) =>
        String(item.id) ===
        String(id)
    );

  if (!therapist) {
    return "";
  }

  return [
    therapist.name ||
      therapist.therapistName ||
      "Therapist",
    therapist.specialization ||
      therapist.qualification ||
      "",
  ]
    .filter(Boolean)
    .join(" — ");
}

/* =====================================================
   STYLES
===================================================== */

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: CREAM,
    },

    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: CREAM,
    },

    loaderText: {
      marginTop: 10,
      fontFamily:
        "DMSans_500Medium",
      fontSize: 11,
      color: MUTED,
    },

    header: {
      minHeight: 75,
      paddingTop:
        Platform.OS === "web"
          ? 12
          : 43,
      paddingBottom: 11,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      backgroundColor: WHITE,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
    },

    headerButton: {
      width: 43,
      height: 43,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: MINT,
    },

    eyebrow: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 7,
      color: GOLD_DARK,
      letterSpacing: 1,
    },

    headerTitle: {
      marginTop: 2,
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 18,
      color: GREEN,
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
      fontFamily:
        "DMSans_700Bold",
      fontSize: 17,
      color: WHITE,
    },

    hero: {
      margin: 15,
      marginBottom: 0,
      padding: 22,
      borderRadius: 28,
      overflow: "hidden",
      backgroundColor: GREEN,
    },

    heroOrb: {
      position: "absolute",
      width: 180,
      height: 180,
      borderRadius: 90,
      right: -60,
      top: -95,
      backgroundColor:
        "rgba(255,255,255,.06)",
    },

    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(255,255,255,.09)",
    },

    heroTag: {
      marginTop: 14,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 7,
      color: GOLD_LIGHT,
      letterSpacing: 1.1,
    },

    heroTitle: {
      marginTop: 5,
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 27,
      color: WHITE,
    },

    heroText: {
      marginTop: 7,
      fontFamily:
        "DMSans_400Regular",
      fontSize: 9,
      lineHeight: 15,
      color: "#D3E1D8",
    },

    stats: {
      paddingHorizontal: 15,
      paddingTop: 13,
      gap: 8,
    },

    statCard: {
      width: 105,
      minHeight: 105,
      padding: 11,
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
      marginTop: 7,
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 18,
      color: GREEN,
    },

    statLabel: {
      fontFamily:
        "DMSans_500Medium",
      fontSize: 7,
      color: MUTED,
    },

    filters: {
      margin: 15,
      marginBottom: 0,
      padding: 12,
      borderRadius: 19,
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
    },

    searchBox: {
      height: 49,
      paddingHorizontal: 12,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: CREAM,
      borderWidth: 1,
      borderColor: BORDER,
    },

    searchInput: {
      flex: 1,
      fontFamily:
        "DMSans_500Medium",
      fontSize: 9,
      color: TEXT,
    },

    filterRow: {
      paddingTop: 9,
      gap: 7,
    },

    filterChip: {
      height: 38,
      paddingHorizontal: 11,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: MINT,
    },

    filterChipActive: {
      backgroundColor: GREEN,
    },

    filterChipText: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 7.5,
      color: GREEN,
    },

    sectionHeader: {
      margin: 15,
      marginTop: 22,
      marginBottom: 9,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    sectionTitle: {
      marginTop: 3,
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 21,
      color: GREEN,
    },

    countBadge: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: MINT,
    },

    countText: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 7,
      color: GREEN,
    },

    cards: {
      marginHorizontal: 15,
      gap: 10,
    },

    card: {
      padding: 14,
      borderRadius: 20,
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
    },

    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },

    patientAvatar: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: GREEN,
    },

    patientAvatarText: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 16,
      color: WHITE,
    },

    patientName: {
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 15,
      color: GREEN,
    },

    patientMeta: {
      marginTop: 2,
      fontFamily:
        "DMSans_400Regular",
      fontSize: 7,
      color: MUTED,
    },

    timeBox: {
      marginTop: 11,
      padding: 10,
      borderRadius: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: MINT,
    },

    dateText: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 8.5,
      color: GREEN,
    },

    timeText: {
      marginTop: 2,
      fontFamily:
        "DMSans_400Regular",
      fontSize: 7,
      color: MUTED,
    },

    symptomLabel: {
      marginTop: 11,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 6.5,
      color: GOLD_DARK,
      letterSpacing: 0.8,
    },

    symptoms: {
      marginTop: 3,
      fontFamily:
        "DMSans_400Regular",
      fontSize: 8,
      lineHeight: 13,
      color: MUTED,
    },

    badges: {
      marginTop: 10,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 5,
    },

    badge: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 20,
    },

    badgeText: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 6.3,
    },

    actions: {
      marginTop: 11,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: BORDER,
      flexDirection: "row",
      gap: 7,
    },

    actionButton: {
      minHeight: 38,
      paddingHorizontal: 11,
      borderRadius: 11,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      backgroundColor: MINT,
    },

    actionButtonText: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 7.5,
      color: GREEN,
    },

    iconAction: {
      width: 40,
      height: 38,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },

    clinicalActions: {
      width: "100%",
      marginTop: 8,
      gap: 7,
    },

    clinicalActionButton: {
      minHeight: 42,
      paddingHorizontal: 12,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },

    clinicalActionText: {
      fontFamily: "DMSans_700Bold",
      fontSize: 8,
    },

    viewSummary: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 8,
    },

    recordSectionTitle: {
      marginTop: 16,
      marginBottom: 8,
      fontFamily: "PlayfairDisplay_700Bold",
      fontSize: 18,
      color: GREEN,
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
      fontFamily: "DMSans_700Bold",
      fontSize: 10,
      color: GREEN,
      marginBottom: 5,
    },

    medicineMeta: {
      marginTop: 2,
      fontFamily: "DMSans_400Regular",
      fontSize: 8,
      color: MUTED,
    },

    medicineInstructions: {
      marginTop: 7,
      padding: 8,
      borderRadius: 9,
      backgroundColor: MINT,
      fontFamily: "DMSans_400Regular",
      fontSize: 8,
      lineHeight: 13,
      color: TEXT,
    },

    emptyInline: {
      paddingVertical: 12,
      fontFamily: "DMSans_400Regular",
      fontSize: 9,
      color: MUTED,
      textAlign: "center",
    },

    viewPatientTitle: {
      marginBottom: 12,
      fontFamily: "PlayfairDisplay_700Bold",
      fontSize: 18,
      color: GREEN,
    },

    treatmentViewCard: {
      marginBottom: 12,
      padding: 13,
      borderRadius: 16,
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
    },

    treatmentViewHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
    },

    treatmentViewTitle: {
      fontFamily: "DMSans_700Bold",
      fontSize: 11,
      color: GREEN,
    },

    treatmentViewMeta: {
      marginTop: 3,
      fontFamily: "DMSans_400Regular",
      fontSize: 8,
      color: MUTED,
    },

    pagination: {
      margin: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
    },

    pageButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
    },

    pageInfo: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 8,
      color: MUTED,
    },

    empty: {
      minHeight: 190,
      padding: 22,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
    },

    emptyIcon: {
      width: 57,
      height: 57,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: MINT,
    },

    emptyTitle: {
      marginTop: 10,
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 17,
      color: GREEN,
    },

    emptyText: {
      marginTop: 4,
      fontFamily:
        "DMSans_400Regular",
      fontSize: 8,
      color: MUTED,
    },

    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor:
        "rgba(5,28,19,.72)",
    },

    drawerRoot: {
      flex: 1,
      flexDirection: "row",
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

    drawerBrand: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    brandIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(255,255,255,.10)",
    },

    brandTitle: {
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 24,
      color: WHITE,
    },

    brandSub: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 8,
      color: GOLD_LIGHT,
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
      backgroundColor:
        "rgba(255,255,255,.08)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,.10)",
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
      fontFamily:
        "DMSans_700Bold",
      fontSize: 16,
      color: GREEN,
    },

    drawerName: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 11,
      color: WHITE,
    },

    drawerRole: {
      marginTop: 2,
      fontFamily:
        "DMSans_400Regular",
      fontSize: 7.5,
      color: "#C5D7CC",
    },

    menuLabel: {
      marginLeft: 11,
      marginBottom: 6,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 7,
      color: "#7E9C8C",
      letterSpacing: 1.2,
    },

    menuItem: {
      minHeight: 50,
      paddingHorizontal: 9,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },

    menuActive: {
      backgroundColor: WHITE,
    },

    menuIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(255,255,255,.07)",
    },

    menuText: {
      flex: 1,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 10.5,
      color: "#E4ECE7",
    },

    logout: {
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

    logoutText: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 11,
      color: WHITE,
    },

    sheetRoot: {
      flex: 1,
      justifyContent: "flex-end",
    },

    sheet: {
      maxHeight: "92%",
      paddingTop: 10,
      paddingHorizontal: 18,
      paddingBottom:
        Platform.OS === "ios"
          ? 30
          : 20,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      backgroundColor: CREAM,
    },

    handle: {
      alignSelf: "center",
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: "#CDD4CF",
    },

    sheetHeader: {
      marginTop: 14,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
    },

    sheetTitle: {
      marginTop: 3,
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 24,
      color: GREEN,
    },

    closeButton: {
      width: 39,
      height: 39,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: MINT,
    },

    patientHeader: {
      marginVertical: 8,
      padding: 12,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      backgroundColor: MINT,
    },

    detailGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    detailCard: {
      width: "48.5%",
      padding: 11,
      borderRadius: 13,
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
    },

    detailLong: {
      marginTop: 8,
      padding: 12,
      borderRadius: 13,
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
    },

    detailLabel: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 6.5,
      color: MUTED,
      letterSpacing: 0.6,
    },

    detailValue: {
      marginTop: 5,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 8.5,
      color: GREEN,
    },

    detailParagraph: {
      marginTop: 5,
      fontFamily:
        "DMSans_400Regular",
      fontSize: 8,
      lineHeight: 13,
      color: TEXT,
    },

    sheetActions: {
      marginTop: 17,
      flexDirection: "row",
      gap: 8,
    },

    secondaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
    },

    secondaryButtonText: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 8.5,
      color: GREEN,
    },

    primaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: GREEN,
    },

    primaryButtonText: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 8.5,
      color: WHITE,
    },

    center: {
      flex: 1,
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
    },

    modalCard: {
      width: "100%",
      maxWidth: 390,
      padding: 21,
      borderRadius: 28,
      alignItems: "center",
      backgroundColor: CREAM,
      borderWidth: 1,
      borderColor:
        "rgba(214,180,91,.42)",
      elevation: 18,
    },

    modalIcon: {
      width: 65,
      height: 65,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: MINT,
    },

    modalTitle: {
      marginTop: 6,
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 22,
      color: GREEN,
      textAlign: "center",
    },

    modalText: {
      marginTop: 8,
      fontFamily:
        "DMSans_400Regular",
      fontSize: 9,
      lineHeight: 15,
      color: MUTED,
      textAlign: "center",
    },

    completeNote: {
      marginTop: 9,
      padding: 12,
      borderRadius: 13,
      backgroundColor:
        SUCCESS_LIGHT,
    },

    completeNoteText: {
      fontFamily:
        "DMSans_400Regular",
      fontSize: 8,
      lineHeight: 14,
      color: SUCCESS,
    },

    workflowOption: {
      width: "100%",
      marginTop: 10,
      padding: 12,
      borderRadius: 15,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
    },

    workflowIcon: {
      width: 45,
      height: 45,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },

    workflowTitle: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 9,
      color: GREEN,
    },

    workflowText: {
      marginTop: 3,
      fontFamily:
        "DMSans_400Regular",
      fontSize: 7,
      lineHeight: 12,
      color: MUTED,
    },

    fieldLabel: {
      marginTop: 11,
      marginBottom: 6,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 7,
      color: GREEN,
      letterSpacing: 0.8,
    },

    inputBox: {
      minHeight: 50,
      paddingHorizontal: 12,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
    },

    inputBoxText: {
      flex: 1,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 8,
      color: TEXT,
    },

    textInput: {
      minHeight: 50,
      paddingHorizontal: 12,
      borderRadius: 14,
      fontFamily:
        "DMSans_500Medium",
      fontSize: 9,
      color: TEXT,
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
    },

    textArea: {
      minHeight: 88,
      padding: 12,
      borderRadius: 14,
      fontFamily:
        "DMSans_500Medium",
      fontSize: 9,
      color: TEXT,
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
    },

    dateRow: {
      flexDirection: "row",
      gap: 8,
    },

    note: {
      marginTop: 12,
      padding: 11,
      borderRadius: 13,
      flexDirection: "row",
      gap: 7,
      backgroundColor: "#FFF7E2",
    },

    noteText: {
      flex: 1,
      fontFamily:
        "DMSans_400Regular",
      fontSize: 7.5,
      lineHeight: 12,
      color: MUTED,
    },

    choiceCard: {
      width: "100%",
      maxWidth: 390,
      maxHeight: "80%",
      padding: 17,
      borderRadius: 25,
      backgroundColor: CREAM,
    },

    choiceRow: {
      minHeight: 49,
      paddingHorizontal: 12,
      borderRadius: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      backgroundColor: WHITE,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
    },

    choiceText: {
      flex: 1,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 8.5,
      color: TEXT,
    },
  });
