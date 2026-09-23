import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DoctorDrawer from "../../components/DoctorDrawer";
import DoctorHeader from "../../components/DoctorHeader";
import { API_BASE_URL } from "../../services/api";


const GREEN = "#0B3D2E";
const GREEN2 = "#14533D";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#75837B";
const BORDER = "#E6EBE7";
const SUCCESS = "#287146";
const SUCCESS_LIGHT = "#EBF7EF";
const WARNING = "#D88B18";
const WARNING_LIGHT = "#FFF6E8";
const DANGER = "#C74747";
const DANGER_LIGHT = "#FFF0F0";
const INFO = "#31708F";
const INFO_LIGHT = "#EDF6FB";
const PURPLE = "#76548F";
const PURPLE_LIGHT = "#F5EFFB";


const PAID_STATUSES = [
  "SUCCESS",
  "PAID",
  "PAYMENT_SUCCESS",
  "PAYMENT_SUCCESSFUL",
  "COMPLETED",
];

const CLOSED_STATUSES = [
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "NO_SHOW",
];

const TABS = [
  ["ALL", "All"],
  ["REQUESTS", "New Requests"],
  ["UPCOMING", "Upcoming"],
  ["IN_PROGRESS", "In Progress"],
  ["COMPLETED", "Completed"],
  ["CLOSED", "Closed"],
] as const;

type TabKey = (typeof TABS)[number][0];
type NoticeType = "success" | "error" | "info";

type Consultation = {
  id: string | number | null;
  patientId: string | number | null;
  doctorId: string | number | null;
  patientName: string;
  phoneNumber: string;
  age: string | number;
  gender: string;
  doctorName: string;
  specialization: string;
  date: string;
  startTime: string;
  endTime: string;
  symptoms: string;
  history: string;
  status: string;
  paymentStatus: string;
  consultationFee: number;
  cancellationReason: string;
  rescheduleReason: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type Meeting = {
  roomId?: string | null;
  status?: string | null;
  meetingLink?: string | null;
  doctorJoinedAt?: string | null;
  patientJoinedAt?: string | null;
};

type Prescription = {
  id?: string | number | null;
  status?: string | null;
  patientName?: string | null;
  doctorName?: string | null;
  diagnosis?: string | null;
  advice?: string | null;
  notes?: string | null;
  finalizedAt?: string | null;
  items?: any[];
};

type ConfirmType = "accept" | "room" | "start" | "complete" | "";

const normalizeDate = (value: any) =>
  value ? String(value).substring(0, 10) : "";

const normalizeTime = (value: any) =>
  value ? String(value).substring(0, 8) : "";

const apiTime = (value: string) =>
  value && value.length === 5 ? `${value}:00` : value;

const label = (value: any) =>
  String(value || "—")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(
    String(value).includes("T")
      ? String(value)
      : `${String(value).substring(0, 10)}T00:00:00`
  );

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function formatTime(value?: string | null) {
  if (!value) return "—";

  const [hour, minute] = String(value).split(":").map(Number);
  const date = new Date(2000, 0, 1, hour, minute || 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isPaid(value: any) {
  return PAID_STATUSES.includes(
    String(value || "").trim().toUpperCase()
  );
}
function canRejoinConsultation(
  item: Consultation,
  meeting?: Meeting | null
) {
  if (
    !item.id ||
    item.status !== "IN_PROGRESS" ||
    !item.date ||
    !item.endTime
  ) {
    return false;
  }

  if (
    !meeting ||
    ["ENDED", "EXPIRED", "CANCELLED"].includes(
      String(meeting.status || "").toUpperCase()
    )
  ) {
    return false;
  }

  const endTime = new Date(
    `${item.date}T${apiTime(item.endTime)}`
  );

  return (
    !Number.isNaN(endTime.getTime()) &&
    Date.now() < endTime.getTime()
  );
}

function normalizeConsultation(item: any): Consultation {
  return {
    id: item?.id ?? item?.consultationId ?? null,
    patientId: item?.patientId ?? item?.patient?.id ?? null,
    doctorId: item?.doctorId ?? item?.doctor?.id ?? null,

    patientName:
      item?.patientName ||
      item?.patient?.name ||
      "Patient",

    phoneNumber:
      item?.phoneNumber ||
      item?.patient?.phoneNumber ||
      "—",

    age:
      item?.age ??
      item?.patient?.age ??
      "—",

    gender:
      item?.gender ||
      item?.patient?.gender ||
      "—",

    doctorName:
      item?.doctorName ||
      item?.doctor?.name ||
      "Doctor",

    specialization:
      item?.doctorSpecialization ||
      item?.specialization ||
      "Online Consultation",

    date: normalizeDate(
      item?.consultationDate ||
      item?.date
    ),

    startTime: normalizeTime(
      item?.startTime ||
      item?.consultationTime ||
      item?.time
    ),

    endTime: normalizeTime(item?.endTime),

    symptoms:
      item?.symptoms ||
      "No symptoms provided.",

    history:
      item?.pastMedicalHistory ||
      item?.history ||
      "No past medical history provided.",

    status: String(
      item?.status ||
      "PENDING_DOCTOR_CONFIRMATION"
    ).toUpperCase(),

    paymentStatus: String(
      item?.paymentStatus ||
      "NOT_REQUIRED_YET"
    ).toUpperCase(),

    consultationFee: Number(
      item?.consultationFee ?? 200
    ),

    cancellationReason:
      item?.cancellationReason || "",

    rescheduleReason:
      item?.rescheduleReason || "",

    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
  };
}

function scheduledDateTime(item: Consultation) {
  if (!item?.date) return null;

  const rawTime = item.startTime
    ? String(item.startTime).trim().slice(0, 8)
    : "23:59:59";

  const normalizedTime =
    /^\d{2}:\d{2}$/.test(rawTime)
      ? `${rawTime}:00`
      : rawTime;

  const value = new Date(
    `${item.date}T${normalizedTime}`
  );

  return Number.isNaN(value.getTime())
    ? null
    : value;
}

function getDisplayStatus(
  item: Consultation,
  now = new Date()
) {
  const backendStatus = String(
    item?.status || ""
  ).toUpperCase();

  const scheduledAt = scheduledDateTime(item);

  const expiresAfterScheduledTime = [
    "DOCTOR_CONFIRMED",
    "PAYMENT_PENDING",
    "PAYMENT_SUCCESS",
    "SCHEDULED",
    "RESCHEDULED",
  ].includes(backendStatus);

  if (
    expiresAfterScheduledTime &&
    scheduledAt &&
    scheduledAt.getTime() < now.getTime()
  ) {
    return "EXPIRED";
  }

  return backendStatus;
}

function theme(status: string) {
  const value = String(
    status || ""
  ).toUpperCase();

  if (
    [
      "REJECTED",
      "CANCELLED",
      "FAILED",
      "REFUNDED",
      "EXPIRED",
      "ENDED",
      "NO_SHOW",
    ].includes(value)
  ) {
    return {
      c: DANGER,
      b: DANGER_LIGHT,
    };
  }

  if (
    [
      "IN_PROGRESS",
      "RESCHEDULED",
    ].includes(value)
  ) {
    return {
      c: INFO,
      b: INFO_LIGHT,
    };
  }

  if (
    [
      "CONFIRMED",
      "DOCTOR_CONFIRMED",
      "SUCCESS",
      "PAID",
      "PAYMENT_SUCCESS",
      "COMPLETED",
      "ACTIVE",
      "CREATED",
    ].includes(value)
  ) {
    return {
      c: SUCCESS,
      b: SUCCESS_LIGHT,
    };
  }

  return {
    c: WARNING,
    b: WARNING_LIGHT,
  };
}

function extractArray(result: any): any[] {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  if (Array.isArray(result?.data?.content)) {
    return result.data.content;
  }

  return [];
}

export default function DoctorConsultationsScreen() {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const [
    consultations,
    setConsultations,
  ] = useState<Consultation[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [search, setSearch] =
    useState("");

  const [
    dateFilter,
    setDateFilter,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [
    activeTab,
    setActiveTab,
  ] = useState<TabKey>("ALL");

  const [
    filterOpen,
    setFilterOpen,
  ] = useState(false);

  const [
    detailsOpen,
    setDetailsOpen,
  ] = useState(false);

  const [
    selected,
    setSelected,
  ] = useState<Consultation | null>(null);

  const [
    selectedMeeting,
    setSelectedMeeting,
  ] = useState<Meeting | null>(null);

  const [
    selectedPrescription,
    setSelectedPrescription,
  ] = useState<Prescription | null>(null);

  const [
    prescriptionView,
    setPrescriptionView,
  ] = useState<Prescription | null>(null);

  const [
    prescriptionLoading,
    setPrescriptionLoading,
  ] = useState(false);

  const [
    rescheduleOpen,
    setRescheduleOpen,
  ] = useState(false);

  const [
    reschedule,
    setReschedule,
  ] = useState({
    id: "",
    date: "",
    time: "",
    reason: "",
  });

  const [
    rejectOpen,
    setRejectOpen,
  ] = useState(false);

  const [
    rejectReason,
    setRejectReason,
  ] = useState("");

  const [
    confirm,
    setConfirm,
  ] = useState<{
    visible: boolean;
    type: ConfirmType;
    item: Consultation | null;
  }>({
    visible: false,
    type: "",
    item: null,
  });

  const [
    notice,
    setNotice,
  ] = useState({
    visible: false,
    type: "info" as NoticeType,
    title: "",
    message: "",
  });


  const notify = useCallback(
    (
      type: NoticeType,
      title: string,
      message: string
    ) => {
      setNotice({
        visible: true,
        type,
        title,
        message,
      });
    },
    []
  );

  const getToken = useCallback(
    async () =>
      (await AsyncStorage.getItem(
        "doctorToken"
      )) ||
      (await AsyncStorage.getItem(
        "token"
      )) ||
      "",
    []
  );

  const clearSession = useCallback(
    async () => {
      await AsyncStorage.multiRemove([
        "token",
        "doctorToken",
        "refreshToken",
        "doctorRefreshToken",
        "role",
        "doctorId",
        "doctorName",
        "doctor",
        "userId",
        "email",
        "profileCompleted",
        "isLoggedIn",
      ]);
    },
    []
  );

  const api = useCallback(
    async (
      path: string,
      options: RequestInit = {}
    ) => {
      const token = await getToken();

      if (!token) {
        await clearSession();

        router.replace(
          "/login" as any
        );

        throw new Error(
          "Doctor login required."
        );
      }

      const headers: Record<
        string,
        string
      > = {
        Accept: "application/json",
        ...((options.headers as any) ||
          {}),
        Authorization: `Bearer ${token}`,
      };

      if (
        options.body &&
        !(
          options.body instanceof FormData
        )
      ) {
        headers["Content-Type"] =
          "application/json";
      }

      const response = await fetch(
        `${API_BASE_URL}${path}`,
        {
          ...options,
          headers,
        }
      );

      const text =
        await response.text();

      let result: any = {};

      try {
        result = text
          ? JSON.parse(text)
          : {};
      } catch {
        result = {
          success: false,
          message:
            text ||
            "Invalid server response.",
        };
      }

      if (response.status === 401) {
        await clearSession();

        router.replace(
          "/login" as any
        );

        throw new Error(
          result?.message ||
            "Doctor session expired."
        );
      }

      if (response.status === 403) {
        throw new Error(
          result?.message ||
            "You do not have permission to access this resource."
        );
      }

      if (
        !response.ok ||
        result?.success === false
      ) {
        throw new Error(
          result?.message ||
            `Request failed (${response.status})`
        );
      }

      return result;
    },
    [clearSession, getToken]
  );

  const loadProfile =
    useCallback(async () => {
      const role = String(
        (await AsyncStorage.getItem(
          "role"
        )) || ""
      )
        .replace(/^ROLE_/i, "")
        .toUpperCase();

      if (
        role &&
        role !== "DOCTOR"
      ) {
        await clearSession();

        router.replace(
          "/login" as any
        );

        return 0;
      }

      try {
        const result = await api(
          "/doctors/my-profile"
        );

        const profile =
          result?.data || {};

        const savedName =
          (await AsyncStorage.getItem(
            "doctorName"
          )) || "Doctor";

        const values: [
          string,
          string
        ][] = [
          [
            "doctorName",
            String(
              profile.name ||
                profile.doctorName ||
                savedName
            ),
          ],
          [
            "doctor",
            JSON.stringify(profile),
          ],
        ];

        if (profile.id) {
          values.push([
            "doctorId",
            String(profile.id),
          ]);
        }

        if (profile.specialization) {
          values.push([
            "doctorSpecialization",
            String(
              profile.specialization
            ),
          ]);
        }

        if (profile.imageUrl) {
          values.push([
            "doctorProfileImageUrl",
            String(profile.imageUrl),
          ]);
        }

        await AsyncStorage.multiSet(
          values
        );

        return Number(
          profile.id ||
            (await AsyncStorage.getItem(
              "doctorId"
            ))
        ) || 0;
      } catch (error: any) {
        notify(
          "error",
          "Profile Error",
          error?.message ||
            "Unable to load doctor profile."
        );

        return Number(
          await AsyncStorage.getItem(
            "doctorId"
          )
        ) || 0;
      }
    }, [
      api,
      clearSession,
      notify,
    ]);

  const loadConsultations =
    useCallback(
      async (
        {
          silent = false,
        }: {
          silent?: boolean;
        } = {}
      ) => {
        if (!silent) {
          setLoading(true);
        }

        try {
          const result = await api(
            "/consultations/doctor/my-consultations"
          );

          const list = extractArray(
            result
          )
            .map(
              normalizeConsultation
            )
            .filter(
              (
                item: Consultation
              ) => item.id != null
            );

          const priority:
            Record<
              string,
              number
            > = {
              PENDING_DOCTOR_CONFIRMATION: 0,
              IN_PROGRESS: 1,
              PAYMENT_PENDING: 2,
              PAYMENT_SUCCESS: 3,
              SCHEDULED: 4,
              RESCHEDULED: 5,
              DOCTOR_CONFIRMED: 6,
              COMPLETED: 7,
              CANCELLED: 8,
              REJECTED: 9,
              NO_SHOW: 10,
              EXPIRED: 11,
            };

          list.sort(
            (
              first:
                Consultation,
              second:
                Consultation
            ) => {
              const firstStatus =
                getDisplayStatus(
                  first
                );

              const secondStatus =
                getDisplayStatus(
                  second
                );

              return (
                (priority[
                  firstStatus
                ] ?? 99) -
                  (priority[
                    secondStatus
                  ] ?? 99) ||
                `${second.date}T${second.startTime}`.localeCompare(
                  `${first.date}T${first.startTime}`
                )
              );
            }
          );

          setConsultations(
            list
          );
        } catch (error: any) {
          if (!silent) {
            setConsultations(
              []
            );

            notify(
              "error",
              "Unable to Load Consultations",
              error?.message ||
                "Unable to load online consultations."
            );
          }
        } finally {
          if (!silent) {
            setLoading(false);
          }

          setRefreshing(
            false
          );
        }
      },
      [api, notify]
    );

  const loadOptionalPrescription =
    useCallback(
      async (
        consultation:
          Consultation
      ) => {
        if (
          !consultation.id ||
          ![
            "IN_PROGRESS",
            "COMPLETED",
          ].includes(
            consultation.status
          )
        ) {
          return null;
        }

        try {
          const result =
            await api(
              `/prescriptions/consultation/${encodeURIComponent(
                String(
                  consultation.id
                )
              )}`
            );

          return (
            result?.data ||
            null
          );
        } catch (error: any) {
          if (
            !/404|not found/i.test(
              String(
                error?.message ||
                  ""
              )
            )
          ) {
            console.warn(
              "Unable to load consultation prescription:",
              error
            );
          }

          return null;
        }
      },
      [api]
    );

  const loadOptionalMeeting =
    useCallback(
      async (
        consultation:
          Consultation
      ) => {
        if (
          !consultation.id ||
          !isPaid(
            consultation.paymentStatus
          )
        ) {
          return null;
        }

        try {
          const result =
            await api(
              `/video-meetings/${encodeURIComponent(
                String(
                  consultation.id
                )
              )}`
            );

          return (
            result?.data ||
            null
          );
        } catch (error: any) {
          if (
            !/404|not found|does not exist/i.test(
              String(
                error?.message ||
                  ""
              )
            )
          ) {
            console.warn(
              "Unable to load meeting:",
              error
            );
          }

          return null;
        }
      },
      [api]
    );

  const refreshSelectedDetails =
    useCallback(
      async (
        item:
          Consultation
      ) => {
        if (!item.id) {
          return;
        }

        setActionLoading(
          true
        );

        try {
          const detailResult =
            await api(
              `/consultations/${encodeURIComponent(
                String(item.id)
              )}/get`
            );

          const detail =
            normalizeConsultation(
              detailResult?.data ||
                {}
            );

          const [
            prescription,
            meeting,
          ] =
            await Promise.all([
              loadOptionalPrescription(
                detail
              ),
              loadOptionalMeeting(
                detail
              ),
            ]);

          setSelected(
            detail
          );

          setSelectedPrescription(
            prescription
          );

          setSelectedMeeting(
            meeting
          );
        } catch (error: any) {
          notify(
            "error",
            "Unable to Load Consultation",
            error?.message ||
              "Unable to load consultation details."
          );
        } finally {
          setActionLoading(
            false
          );
        }
      },
      [
        api,
        loadOptionalMeeting,
        loadOptionalPrescription,
        notify,
      ]
    );

  const initialLoad =
    useCallback(async () => {
      setLoading(true);

      try {
        const token =
          await getToken();

        if (!token) {
          router.replace(
            "/login" as any
          );

          return;
        }

        await loadProfile();

        await loadConsultations();
      } finally {
        setLoading(false);
      }
    }, [
      getToken,
      loadConsultations,
      loadProfile,
    ]);

  useFocusEffect(
    useCallback(() => {
      initialLoad();
    }, [initialLoad])
  );

  const refresh =
    useCallback(async () => {
      setRefreshing(true);

      await Promise.allSettled(
        [
          loadProfile(),
          loadConsultations(
            {
              silent: true,
            }
          ),
        ]
      );

      setRefreshing(false);
    }, [
      loadConsultations,
      loadProfile,
    ]);

  const matchesTab =
    useCallback(
      (
        item:
          Consultation
      ) => {
        const displayStatus =
          getDisplayStatus(
            item
          );

        if (
          activeTab ===
          "REQUESTS"
        ) {
          return (
            displayStatus ===
            "PENDING_DOCTOR_CONFIRMATION"
          );
        }

        if (
          activeTab ===
          "UPCOMING"
        ) {
          // Upcoming statuses are shown here only while their
          // scheduled date/time has not expired. Past scheduled records
          // are converted to EXPIRED by getDisplayStatus() and move to Closed.
          return [
            "DOCTOR_CONFIRMED",
            "PAYMENT_PENDING",
            "PAYMENT_SUCCESS",
            "SCHEDULED",
            "RESCHEDULED",
          ].includes(
            displayStatus
          );
        }

        if (
          activeTab ===
          "IN_PROGRESS"
        ) {
          return (
            displayStatus ===
            "IN_PROGRESS"
          );
        }

        if (
          activeTab ===
          "COMPLETED"
        ) {
          return (
            displayStatus ===
            "COMPLETED"
          );
        }

        if (
          activeTab ===
          "CLOSED"
        ) {
          return [
            "EXPIRED",
            "CANCELLED",
            "REJECTED",
            "NO_SHOW",
          ].includes(
            displayStatus
          );
        }

        return true;
      },
      [activeTab]
    );

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return consultations.filter(
        (item) => {
          const displayStatus =
            getDisplayStatus(
              item
            );

          const searchMatch =
            !query ||
            [
              item.patientName,
              item.phoneNumber,
              item.symptoms,
              item.id,
            ].some(
              (value) =>
                String(
                  value || ""
                )
                  .toLowerCase()
                  .includes(
                    query
                  )
            );

          const dateMatch =
            !dateFilter ||
            item.date ===
              dateFilter;

          const statusMatch =
            !statusFilter ||
            displayStatus ===
              statusFilter;

          return (
            matchesTab(
              item
            ) &&
            searchMatch &&
            dateMatch &&
            statusMatch
          );
        }
      );
    }, [
      consultations,
      dateFilter,
      matchesTab,
      search,
      statusFilter,
    ]);

  const counts =
    useMemo(() => {
      const statuses =
        consultations.map(
          (item) =>
            getDisplayStatus(
              item
            )
        );

      return {
        total:
          consultations.length,

        requests:
          statuses.filter(
            (status) =>
              status ===
              "PENDING_DOCTOR_CONFIRMATION"
          ).length,

        upcoming:
          statuses.filter(
            (status) =>
              [
                "DOCTOR_CONFIRMED",
                "PAYMENT_PENDING",
                "PAYMENT_SUCCESS",
                "SCHEDULED",
                "RESCHEDULED",
              ].includes(
                status
              )
          ).length,

        inProgress:
          statuses.filter(
            (status) =>
              status ===
              "IN_PROGRESS"
          ).length,

        completed:
          statuses.filter(
            (status) =>
              status ===
              "COMPLETED"
          ).length,

        closed:
          statuses.filter(
            (status) =>
              [
                "EXPIRED",
                "CANCELLED",
                "REJECTED",
                "NO_SHOW",
              ].includes(
                status
              )
          ).length,
      };
    }, [consultations]);

  const tabCount =
    useCallback(
      (tab: TabKey) => {
        if (tab === "ALL") {
          return counts.total;
        }

        if (
          tab === "REQUESTS"
        ) {
          return counts.requests;
        }

        if (
          tab === "UPCOMING"
        ) {
          return counts.upcoming;
        }

        if (
          tab ===
          "IN_PROGRESS"
        ) {
          return counts.inProgress;
        }

        if (
          tab === "COMPLETED"
        ) {
          return counts.completed;
        }

        return counts.closed;
      },
      [counts]
    );

  const viewDetails =
    useCallback(
      async (
        item:
          Consultation
      ) => {
        setSelected(
          item
        );

        setSelectedMeeting(
          null
        );

        setSelectedPrescription(
          null
        );

        setDetailsOpen(
          true
        );

        await refreshSelectedDetails(
          item
        );
      },
      [
        refreshSelectedDetails,
      ]
    );

  const acceptConsultation =
    useCallback(
      async (
        item:
          Consultation
      ) => {
        if (!item.id) {
          return;
        }

        setActionLoading(
          true
        );

        try {
          const result =
            await api(
              `/consultations/${encodeURIComponent(
                String(
                  item.id
                )
              )}/accept`,
              {
                method: "PUT",
              }
            );

          notify(
            "success",
            "Consultation Accepted",
            result?.message ||
              "Consultation accepted successfully."
          );

          await loadConsultations(
            {
              silent: true,
            }
          );

          await refreshSelectedDetails(
            item
          );
        } catch (error: any) {
          notify(
            "error",
            "Unable to Accept",
            error?.message ||
              "Unable to accept consultation."
          );
        } finally {
          setActionLoading(
            false
          );
        }
      },
      [
        api,
        loadConsultations,
        notify,
        refreshSelectedDetails,
      ]
    );

  const submitReject =
    useCallback(async () => {
      if (!selected?.id) {
        return;
      }

      const reason =
        rejectReason.trim();

      if (!reason) {
        notify(
          "error",
          "Reason Required",
          "Please enter a rejection reason."
        );

        return;
      }

      setActionLoading(
        true
      );

      try {
        const result =
          await api(
            `/consultations/${encodeURIComponent(
              String(
                selected.id
              )
            )}/reject`,
            {
              method: "PUT",
              body: JSON.stringify(
                {
                  reason,
                }
              ),
            }
          );

        setRejectOpen(
          false
        );

        setDetailsOpen(
          false
        );

        notify(
          "success",
          "Consultation Rejected",
          result?.message ||
            "Consultation rejected successfully."
        );

        await loadConsultations(
          {
            silent: true,
          }
        );
      } catch (error: any) {
        notify(
          "error",
          "Unable to Reject",
          error?.message ||
            "Unable to reject consultation."
        );
      } finally {
        setActionLoading(
          false
        );
      }
    }, [
      api,
      loadConsultations,
      notify,
      rejectReason,
      selected,
    ]);

  const openReschedule =
    useCallback(
      (
        item:
          Consultation
      ) => {
        setSelected(
          item
        );

        setDetailsOpen(
          false
        );

        setReschedule({
          id: String(
            item.id || ""
          ),
          date:
            item.date || "",
          time:
            item.startTime
              ? item.startTime.substring(
                  0,
                  5
                )
              : "",
          reason: "",
        });

        setRescheduleOpen(
          true
        );
      },
      []
    );

  const submitReschedule =
    useCallback(async () => {
      if (
        !reschedule.id ||
        !reschedule.date ||
        !reschedule.time
      ) {
        notify(
          "error",
          "Date & Time Required",
          "Please select the new date and time."
        );

        return;
      }

      setActionLoading(
        true
      );

      try {
        const result =
          await api(
            `/consultations/${encodeURIComponent(
              reschedule.id
            )}/reschedule`,
            {
              method: "PUT",
              body: JSON.stringify(
                {
                  consultationDate:
                    reschedule.date,
                  startTime:
                    apiTime(
                      reschedule.time
                    ),
                  reason:
                    reschedule.reason.trim() ||
                    "Rescheduled by doctor",
                }
              ),
            }
          );

        setRescheduleOpen(
          false
        );

        notify(
          "success",
          "Consultation Rescheduled",
          result?.message ||
            "Consultation rescheduled successfully."
        );

        await loadConsultations(
          {
            silent: true,
          }
        );
      } catch (error: any) {
        notify(
          "error",
          "Unable to Reschedule",
          error?.message ||
            "Unable to reschedule consultation."
        );
      } finally {
        setActionLoading(
          false
        );
      }
    }, [
      api,
      loadConsultations,
      notify,
      reschedule,
    ]);

  const createVideoRoom =
    useCallback(
      async (
        item:
          Consultation
      ) => {
        if (
          !item.id ||
          !isPaid(
            item.paymentStatus
          )
        ) {
          notify(
            "error",
            "Payment Pending",
            "The patient must complete payment before creating the room."
          );

          return;
        }

        setActionLoading(
          true
        );

        try {
          const result =
            await api(
              `/video-meetings/create/${encodeURIComponent(
                String(
                  item.id
                )
              )}`,
              {
                method: "POST",
              }
            );

          setSelectedMeeting(
            result?.data ||
              null
          );

          notify(
            "success",
            "Video Room Ready",
            result?.message ||
              "Secure video room created."
          );

          await loadConsultations(
            {
              silent: true,
            }
          );

          await refreshSelectedDetails(
            item
          );
        } catch (error: any) {
          notify(
            "error",
            "Unable to Create Room",
            error?.message ||
              "Unable to create video room."
          );
        } finally {
          setActionLoading(
            false
          );
        }
      },
      [
        api,
        loadConsultations,
        notify,
        refreshSelectedDetails,
      ]
    );

  const startConsultation =
    useCallback(
      async (
        item:
          Consultation
      ) => {
        if (
          !item.id ||
          !isPaid(
            item.paymentStatus
          )
        ) {
          notify(
            "error",
            "Payment Pending",
            "The patient must complete payment before starting the consultation."
          );

          return;
        }

        if (
          !selectedMeeting
        ) {
          notify(
            "error",
            "Video Room Required",
            "Create the video room before starting the consultation."
          );

          return;
        }

        setActionLoading(
          true
        );

        try {
          const result =
            await api(
              `/consultations/${encodeURIComponent(
                String(
                  item.id
                )
              )}/start`,
              {
                method: "PUT",
              }
            );

          notify(
            "success",
            "Consultation Started",
            result?.message ||
              "Consultation started successfully."
          );

          await loadConsultations(
            {
              silent: true,
            }
          );

          setDetailsOpen(false);

router.push({
  pathname: "/consultation-room" as any,
  params: {
    consultationId: String(item.id),
  },
});

        
        } catch (error: any) {
          notify(
            "error",
            "Unable to Start Consultation",
            error?.message ||
              "Unable to start consultation."
          );
        } finally {
          setActionLoading(
            false
          );
        }
      },
      [
        api,
        loadConsultations,
        notify,
        selectedMeeting,
      ]
    );

      const rejoinConsultation = useCallback(
    (item: Consultation) => {
      if (!canRejoinConsultation(item, selectedMeeting)) {
        notify(
          "error",
          "Cannot Rejoin",
          "The consultation has ended, the room is unavailable, or the scheduled end time has passed."
        );
        return;
      }

      setDetailsOpen(false);

      router.push({
        pathname: "/consultation-room" as any,
        params: {
          consultationId: String(item.id),
        },
      });
    },
    [notify, selectedMeeting]
  );

  const completeConsultation =
    useCallback(
      async (
        item:
          Consultation
      ) => {
        if (!item.id) {
          return;
        }

        setActionLoading(
          true
        );

        try {
          const result =
            await api(
              `/consultations/${encodeURIComponent(
                String(
                  item.id
                )
              )}/complete`,
              {
                method: "PUT",
              }
            );

          notify(
            "success",
            "Consultation Completed",
            result?.message ||
              "Consultation completed."
          );

          await loadConsultations(
            {
              silent: true,
            }
          );

          await refreshSelectedDetails(
            item
          );
        } catch (error: any) {
          notify(
            "error",
            "Unable to Complete Consultation",
            error?.message ||
              "Unable to complete consultation."
          );
        } finally {
          setActionLoading(
            false
          );
        }
      },
      [
        api,
        loadConsultations,
        notify,
        refreshSelectedDetails,
      ]
    );

  const openPrescriptionPad =
    useCallback(
      (
        item:
          Consultation
      ) => {
        setDetailsOpen(
          false
        );

        router.push({
          pathname:
            "/doctor/prescription-pad" as any,
          params: {
            consultationId:
              String(
                item.id || ""
              ),
            patientId:
              String(
                item.patientId ||
                  ""
              ),
            ...(selectedPrescription?.id
              ? {
                  prescriptionId:
                    String(
                      selectedPrescription.id
                    ),
                }
              : {}),
          },
        });
      },
      [selectedPrescription]
    );

  const viewPrescription =
    useCallback(async () => {
      if (
        !selectedPrescription?.id
      ) {
        notify(
          "error",
          "Prescription Not Found",
          "No prescription was found for this consultation."
        );

        return;
      }

      setPrescriptionLoading(
        true
      );

      try {
        const result = await api(
          `/prescriptions/doctor/${encodeURIComponent(
            String(
              selectedPrescription.id
            )
          )}`
        );

        setPrescriptionView({
          ...selectedPrescription,
          ...(result?.data ||
            {}),
          items:
            Array.isArray(
              result?.data?.items
            )
              ? result.data.items
              : Array.isArray(
                  selectedPrescription.items
                )
              ? selectedPrescription.items
              : [],
        });
      } catch (error: any) {
        notify(
          "error",
          "Unable to Load Prescription",
          error?.message ||
            "Unable to load the prescription."
        );
      } finally {
        setPrescriptionLoading(
          false
        );
      }
    }, [
      api,
      notify,
      selectedPrescription,
    ]);

  const runConfirm =
    useCallback(async () => {
      const item =
        confirm.item;

      const type =
        confirm.type;

      setConfirm({
        visible: false,
        type: "",
        item: null,
      });

      if (!item) {
        return;
      }

      if (
        type === "accept"
      ) {
        await acceptConsultation(
          item
        );
      }

      if (
        type === "room"
      ) {
        await createVideoRoom(
          item
        );
      }

      if (
        type === "start"
      ) {
        await startConsultation(
          item
        );
      }

      if (
        type === "complete"
      ) {
        await completeConsultation(
          item
        );
      }
    }, [
      acceptConsultation,
      completeConsultation,
      confirm,
      createVideoRoom,
      startConsultation,
    ]);

  const renderItem =
    useCallback(
      ({
        item,
      }: {
        item: Consultation;
      }) => {
        const displayStatus =
          getDisplayStatus(
            item
          );

        const statusTheme =
          theme(
            displayStatus
          );

        const paymentTheme =
          theme(
            item.paymentStatus
          );

        return (
          <Pressable
            style={({
              pressed,
            }) => [
              styles.card,
              pressed && {
                opacity: 0.88,
              },
            ]}
            onPress={() =>
              viewDetails(
                item
              )
            }
          >
            <View
              style={
                styles.cardTop
              }
            >
              <View
                style={
                  styles.patientRow
                }
              >
                <View
                  style={
                    styles.avatar
                  }
                >
                  <Text
                    style={
                      styles.avatarText
                    }
                  >
                    {item.patientName
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      styles.patientName
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {
                      item.patientName
                    }
                  </Text>

                  <Text
                    style={
                      styles.meta
                    }
                  >
                    {
                      item.phoneNumber
                    }{" "}
                    · CON-
                    {item.id ??
                      "-"}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      statusTheme.b,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        statusTheme.c,
                    },
                  ]}
                >
                  {label(
                    displayStatus
                  )}
                </Text>
              </View>
            </View>

            <View
              style={
                styles.sep
              }
            />

            <View
              style={
                styles.grid
              }
            >
              <Info
                icon="calendar-outline"
                label="Date"
                value={formatDate(
                  item.date
                )}
              />

              <Info
                icon="time-outline"
                label="Time"
                value={`${formatTime(
                  item.startTime
                )}${
                  item.endTime
                    ? ` - ${formatTime(
                        item.endTime
                      )}`
                    : ""
                }`}
              />

              <Info
                icon="medkit-outline"
                label="Symptoms"
                value={
                  item.symptoms
                }
              />

              <Info
                icon="wallet-outline"
                label="Payment"
                value={label(
                  item.paymentStatus
                )}
              />
            </View>

            <View
              style={
                styles.cardFooter
              }
            >
              <View
                style={[
                  styles.fee,
                  {
                    backgroundColor:
                      paymentTheme.b,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.feeText,
                    {
                      color:
                        paymentTheme.c,
                    },
                  ]}
                >
                  ₹
                  {item.consultationFee.toLocaleString(
                    "en-IN"
                  )}
                </Text>
              </View>

              <Action
                icon="open-outline"
                text="View Details"
                bg={MINT}
                color={GREEN}
                onPress={() =>
                  viewDetails(
                    item
                  )
                }
              />
            </View>
          </Pressable>
        );
      },
      [viewDetails]
    );

  return (
    <SafeAreaView
      style={styles.safe}
      edges={[
        "left",
        "right",
      ]}
    >
      <View
        style={
          styles.screen
        }
      >
        <DoctorHeader
          title="Online Consultation Details"
          onMenuPress={() =>
            setMenuOpen(
              true
            )
          }
        />

        <FlatList
          data={filtered}
          renderItem={
            renderItem
          }
          keyExtractor={(
            item,
            index
          ) =>
            `${String(
              item.id
            )}-${index}`
          }
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                refresh
              }
              tintColor={
                GREEN
              }
              colors={[
                GREEN,
              ]}
            />
          }
          ListHeaderComponent={
            <>
              <View
                style={
                  styles.hero
                }
              >
                <View
                  style={
                    styles.heroGlow
                  }
                />

                <View
                  style={
                    styles.heroTag
                  }
                >
                  <Ionicons
                    name="videocam-outline"
                    size={15}
                    color={
                      GOLD_LIGHT
                    }
                  />

                  <Text
                    style={
                      styles.heroTagText
                    }
                  >
                    VIRTUAL
                    CARE
                  </Text>
                </View>

                <Text
                  style={
                    styles.heroTitle
                  }
                >
                  Online
                  {"\n"}
                  Consultations
                </Text>

                <Text
                  style={
                    styles.heroText
                  }
                >
                  Review
                  patient
                  requests,
                  payment
                  progress,
                  scheduled
                  online
                  consultations,
                  video room
                  status and
                  prescriptions.
                </Text>
              </View>

              <Text
                style={
                  styles.eyebrow
                }
              >
                OVERVIEW
              </Text>

              <Text
                style={
                  styles.heading
                }
              >
                Consultation
                Summary
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.summaryRow
                }
              >
                <Summary
                  label="Total Consultations"
                  value={
                    counts.total
                  }
                  icon="list-outline"
                />

                <Summary
                  label="New Requests"
                  value={
                    counts.requests
                  }
                  icon="hourglass-outline"
                />

                <Summary
                  label="Upcoming"
                  value={
                    counts.upcoming
                  }
                  icon="calendar-outline"
                />

                <Summary
                  label="In Progress"
                  value={
                    counts.inProgress
                  }
                  icon="pulse-outline"
                />

                <Summary
                  label="Completed"
                  value={
                    counts.completed
                  }
                  icon="checkmark-done-outline"
                />

                <Summary
                  label="Closed"
                  value={
                    counts.closed
                  }
                  icon="archive-outline"
                />
              </ScrollView>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.tabsRow
                }
              >
                {TABS.map(
                  ([
                    value,
                    title,
                  ]) => {
                    const active =
                      activeTab ===
                      value;

                    return (
                      <Pressable
                        key={
                          value
                        }
                        style={[
                          styles.tab,
                          active &&
                            styles.tabActive,
                        ]}
                        onPress={() =>
                          setActiveTab(
                            value
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.tabText,
                            active &&
                              styles.tabTextActive,
                          ]}
                        >
                          {
                            title
                          }
                        </Text>

                        <View
                          style={[
                            styles.tabCount,
                            active &&
                              styles.tabCountActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.tabCountText,
                              active &&
                                styles.tabCountTextActive,
                            ]}
                          >
                            {tabCount(
                              value
                            )}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  }
                )}
              </ScrollView>

              <View
                style={
                  styles.searchRow
                }
              >
                <View
                  style={
                    styles.searchBox
                  }
                >
                  <Ionicons
                    name="search-outline"
                    size={20}
                    color={
                      MUTED
                    }
                  />

                  <TextInput
                    value={
                      search
                    }
                    onChangeText={
                      setSearch
                    }
                    placeholder="Patient, phone, symptoms or ID"
                    placeholderTextColor="#9AA59F"
                    style={
                      styles.searchInput
                    }
                  />
                </View>

                <Pressable
                  style={
                    styles.filterBtn
                  }
                  onPress={() =>
                    setFilterOpen(
                      true
                    )
                  }
                >
                  <Ionicons
                    name="options-outline"
                    size={21}
                    color={
                      GREEN
                    }
                  />

                  {dateFilter ||
                  statusFilter ? (
                    <View
                      style={
                        styles.dot
                      }
                    />
                  ) : null}
                </Pressable>
              </View>

              <View
                style={
                  styles.recordsHead
                }
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      styles.eyebrow
                    }
                  >
                    PATIENT
                    REQUESTS
                  </Text>

                  <Text
                    style={
                      styles.heading
                    }
                  >
                    Consultation
                    List
                  </Text>

                  <Text
                    style={
                      styles.sub
                    }
                  >
                    Consultations
                    assigned
                    to your
                    doctor
                    account.
                  </Text>
                </View>

                <View
                  style={
                    styles.count
                  }
                >
                  <Text
                    style={
                      styles.countText
                    }
                  >
                    {
                      filtered.length
                    }{" "}
                    results
                  </Text>
                </View>
              </View>
            </>
          }
          ListEmptyComponent={
            loading ? (
              <View
                style={
                  styles.empty
                }
              >
                <ActivityIndicator
                  color={
                    GREEN
                  }
                />

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  Loading
                  consultations...
                </Text>
              </View>
            ) : (
              <View
                style={
                  styles.empty
                }
              >
                <Ionicons
                  name="calendar-outline"
                  size={30}
                  color={
                    GOLD
                  }
                />

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  No
                  consultations
                  found
                </Text>

                <Text
                  style={
                    styles.sub
                  }
                >
                  Pull down
                  to refresh
                  or change
                  your search,
                  tab and
                  filters.
                </Text>
              </View>
            )
          }
        />

        <DoctorDrawer
          visible={
            menuOpen
          }
          onClose={() =>
            setMenuOpen(
              false
            )
          }
          activeRoute="/doctor/consultations"
        />

        <FilterModal
          visible={
            filterOpen
          }
          date={
            dateFilter
          }
          status={
            statusFilter
          }
          onDate={
            setDateFilter
          }
          onStatus={
            setStatusFilter
          }
          onReset={() => {
            setSearch("");
            setDateFilter(
              ""
            );
            setStatusFilter(
              ""
            );
          }}
          onClose={() =>
            setFilterOpen(
              false
            )
          }
        />

        <DetailsModal
          visible={
            detailsOpen
          }
          item={
            selected
          }
          meeting={
            selectedMeeting
          }
          prescription={
            selectedPrescription
          }
          prescriptionLoading={
            prescriptionLoading
          }
          loading={
            actionLoading
          }
          onClose={() =>
            setDetailsOpen(
              false
            )
          }
          onAccept={() => {
            if (
              selected
            ) {
              setConfirm({
                visible:
                  true,
                type:
                  "accept",
                item:
                  selected,
              });
            }
          }}
          onReject={() => {
            if (
              selected
            ) {
              setRejectReason(
                ""
              );

              setRejectOpen(
                true
              );

              setDetailsOpen(
                false
              );
            }
          }}
          onReschedule={() => {
            if (
              selected
            ) {
              openReschedule(
                selected
              );
            }
          }}
          onCreateRoom={() => {
            if (
              selected
            ) {
              setConfirm({
                visible:
                  true,
                type:
                  "room",
                item:
                  selected,
              });
            }
          }}
          onStart={() => {
            if (
              selected
            ) {
              setConfirm({
                visible:
                  true,
                type:
                  "start",
                item:
                  selected,
              });
            }
          }}
          onRejoin={() => {
  if (selected) {
    rejoinConsultation(selected);
  }
}}
          onComplete={() => {
            if (
              selected
            ) {
              setConfirm({
                visible:
                  true,
                type:
                  "complete",
                item:
                  selected,
              });
            }
          }}
          onPrescriptionPad={() => {
            if (
              selected
            ) {
              openPrescriptionPad(
                selected
              );
            }
          }}
          onViewPrescription={
            viewPrescription
          }
        />

        <RejectModal
          visible={
            rejectOpen
          }
          reason={
            rejectReason
          }
          loading={
            actionLoading
          }
          onChange={
            setRejectReason
          }
          onClose={() =>
            setRejectOpen(
              false
            )
          }
          onSubmit={
            submitReject
          }
        />

        <RescheduleModal
          visible={
            rescheduleOpen
          }
          value={
            reschedule
          }
          loading={
            actionLoading
          }
          onChange={
            setReschedule
          }
          onClose={() =>
            setRescheduleOpen(
              false
            )
          }
          onSubmit={
            submitReschedule
          }
        />

        <ConfirmModal
          visible={
            confirm.visible
          }
          type={
            confirm.type
          }
          loading={
            actionLoading
          }
          onClose={() =>
            setConfirm({
              visible:
                false,
              type: "",
              item:
                null,
            })
          }
          onConfirm={
            runConfirm
          }
        />

        <PrescriptionModal
          visible={
            Boolean(
              prescriptionView
            )
          }
          prescription={
            prescriptionView
          }
          onClose={() =>
            setPrescriptionView(
              null
            )
          }
        />

        <NoticeModal
          {...notice}
          onClose={() =>
            setNotice(
              (current) => ({
                ...current,
                visible:
                  false,
              })
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}

function Summary({
  label: title,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View
      style={
        styles.summary
      }
    >
      <View
        style={
          styles.summaryIcon
        }
      >
        <Ionicons
          name={icon}
          size={21}
          color={
            GREEN2
          }
        />
      </View>

      <Text
        style={
          styles.summaryValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.summaryLabel
        }
      >
        {title}
      </Text>
    </View>
  );
}

function Info({
  icon,
  label: title,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View
      style={
        styles.info
      }
    >
      <View
        style={
          styles.infoIcon
        }
      >
        <Ionicons
          name={icon}
          size={15}
          color={
            GREEN2
          }
        />
      </View>

      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={
            styles.infoLabel
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.infoValue
          }
          numberOfLines={
            2
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function Action({
  icon,
  text,
  bg,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  bg: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.action,
        {
          backgroundColor:
            bg,
        },
      ]}
      onPress={(
        event
      ) => {
        event.stopPropagation();
        onPress();
      }}
    >
      <Ionicons
        name={icon}
        size={16}
        color={
          color
        }
      />

      <Text
        style={[
          styles.actionText,
          {
            color,
          },
        ]}
      >
        {text}
      </Text>
    </Pressable>
  );
}

function Field({
  label: title,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (
    value: string
  ) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View
      style={{
        marginBottom: 15,
      }}
    >
      <Text
        style={
          styles.formLabel
        }
      >
        {title}
      </Text>

      <TextInput
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor="#9AA59F"
        multiline={
          multiline
        }
        style={[
          styles.input,
          multiline &&
            styles.multiline,
        ]}
      />
    </View>
  );
}

function SheetHeader({
  eyebrow,
  title,
  onClose,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <>
      <View
        style={
          styles.handle
        }
      />

      <View
        style={
          styles.sheetHead
        }
      >
        <View
          style={{
            flex: 1,
          }}
        >
          <Text
            style={
              styles.sheetEyebrow
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

        <Pressable
          style={
            styles.close
          }
          onPress={
            onClose
          }
        >
          <Ionicons
            name="close"
            size={22}
            color={
              GREEN
            }
          />
        </Pressable>
      </View>
    </>
  );
}

function DetailBox({
  label: title,
  value,
  full = false,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailBox,
        full && {
          width: "100%",
        },
      ]}
    >
      <Text
        style={
          styles.detailLabel
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.detailValue
        }
      >
        {value || "—"}
      </Text>
    </View>
  );
}

function FilterModal({
  visible,
  date,
  status,
  onDate,
  onStatus,
  onReset,
  onClose,
}: {
  visible: boolean;
  date: string;
  status: string;
  onDate: (
    value: string
  ) => void;
  onStatus: (
    value: string
  ) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const options = [
    "",
    "PENDING_DOCTOR_CONFIRMATION",
    "PAYMENT_PENDING",
    "PAYMENT_SUCCESS",
    "SCHEDULED",
    "DOCTOR_CONFIRMED",
    "RESCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    "REJECTED",
    "CANCELLED",
    "EXPIRED",
  ];

  return (
    <Modal
      visible={
        visible
      }
      transparent
      animationType="slide"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.backdrop
        }
      >
        <View
          style={
            styles.sheet
          }
        >
          <SheetHeader
            eyebrow="REFINE RESULTS"
            title="Filters"
            onClose={
              onClose
            }
          />

          <ScrollView>
            <Field
              label="Consultation Date"
              value={date}
              onChangeText={
                onDate
              }
              placeholder="YYYY-MM-DD"
            />

            <Text
              style={
                styles.formLabel
              }
            >
              Status
            </Text>

            <View
              style={
                styles.choiceWrap
              }
            >
              {options.map(
                (option) => (
                  <Pressable
                    key={
                      option ||
                      "all"
                    }
                    style={[
                      styles.choice,
                      status ===
                        option &&
                        styles.choiceOn,
                    ]}
                    onPress={() =>
                      onStatus(
                        option
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        status ===
                          option &&
                          styles.choiceTextOn,
                      ]}
                    >
                      {option
                        ? label(
                            option
                          )
                        : "All Statuses"}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          </ScrollView>

          <View
            style={
              styles.todayRow
            }
          >
            <Pressable
              style={
                styles.todayButton
              }
              onPress={() =>
                onDate(
                  localDateKey()
                )
              }
            >
              <Ionicons
                name="today-outline"
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
            </Pressable>
          </View>

          <View
            style={
              styles.sheetActions
            }
          >
            <Pressable
              style={
                styles.secondary
              }
              onPress={
                onReset
              }
            >
              <Text
                style={
                  styles.secondaryText
                }
              >
                Reset
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.primary
              }
              onPress={
                onClose
              }
            >
              <Text
                style={
                  styles.primaryText
                }
              >
                Show
                Results
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailsModal({
  visible,
  item,
  meeting,
  prescription,
  prescriptionLoading,
  loading,
  onClose,
  onAccept,
  onReject,
  onReschedule,
  onCreateRoom,
  onStart,
  onRejoin,
  onComplete,
  onPrescriptionPad,
  onViewPrescription,
}: {
  visible: boolean;
  item: Consultation | null;
  meeting: Meeting | null;
  prescription: Prescription | null;
  prescriptionLoading: boolean;
  loading: boolean;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  onReschedule: () => void;
  onCreateRoom: () => void;
  onStart: () => void;
  onRejoin: () => void;
  onComplete: () => void;
  onPrescriptionPad: () => void;
  onViewPrescription: () => void;
}) {
  if (!item) {
    return null;
  }

  const paid =
    isPaid(
      item.paymentStatus
    );

  const closed =
    CLOSED_STATUSES.includes(
      item.status
    );

  const roomActive =
    meeting &&
    ![
      "ENDED",
      "EXPIRED",
      "CANCELLED",
    ].includes(
      String(
        meeting.status ||
          ""
      ).toUpperCase()
    );

  const prescriptionStatus =
    String(
      prescription?.status ||
        ""
    ).toUpperCase();

  const canUsePrescriptionPad =
    item.status ===
    "IN_PROGRESS";

  return (
    <Modal
      visible={
        visible
      }
      transparent
      animationType="slide"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.backdrop
        }
      >
        <View
          style={
            styles.detailsSheet
          }
        >
          <SheetHeader
            eyebrow="ONLINE CONSULTATION"
            title="Consultation Details"
            onClose={
              onClose
            }
          />

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
          >
            <View
              style={
                styles.detailPatient
              }
            >
              <View
                style={
                  styles.avatar
                }
              >
                <Text
                  style={
                    styles.avatarText
                  }
                >
                  {item.patientName
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.patientName
                  }
                >
                  {
                    item.patientName
                  }
                </Text>

                <Text
                  style={
                    styles.meta
                  }
                >
                  {
                    item.phoneNumber
                  }{" "}
                  · {
                    item.age
                  }{" "}
                  years ·{" "}
                  {label(
                    item.gender
                  )}
                </Text>
              </View>
            </View>

            <View
              style={
                styles.detailGrid
              }
            >
              <DetailBox
                label="Consultation ID"
                value={`CON-${String(
                  item.id ||
                    "-"
                )}`}
              />

              <DetailBox
                label="Date & Time"
                value={`${formatDate(
                  item.date
                )} · ${formatTime(
                  item.startTime
                )}`}
              />

              <DetailBox
                label="Doctor"
                value={
                  item.doctorName
                }
              />

              <DetailBox
                label="Specialization"
                value={
                  item.specialization
                }
              />

              <DetailBox
                label="Status"
                value={label(
                  item.status
                )}
              />

              <DetailBox
                label="Payment"
                value={label(
                  item.paymentStatus
                )}
              />

              <DetailBox
                label="Consultation Fee"
                value={`₹${item.consultationFee.toLocaleString(
                  "en-IN"
                )}`}
              />

              <DetailBox
                label="Room Status"
                value={
                  meeting
                    ? label(
                        meeting.status ||
                          "CREATED"
                      )
                    : paid
                    ? "Room Not Created"
                    : "Waiting For Payment"
                }
              />

              <DetailBox
                label="Room ID"
                value={
                  meeting?.roomId ||
                  "—"
                }
              />

              <DetailBox
                label="Doctor Joined"
                value={formatDateTime(
                  meeting?.doctorJoinedAt
                )}
              />

              <DetailBox
                label="Patient Joined"
                value={formatDateTime(
                  meeting?.patientJoinedAt
                )}
              />

              <DetailBox
                label="Created"
                value={formatDateTime(
                  item.createdAt
                )}
              />

              <DetailBox
                label="Last Updated"
                value={formatDateTime(
                  item.updatedAt
                )}
              />

              <DetailBox
                label="Symptoms"
                value={
                  item.symptoms
                }
                full
              />

              <DetailBox
                label="Past Medical History"
                value={
                  item.history
                }
                full
              />

              {item.rescheduleReason ? (
                <DetailBox
                  label="Reschedule Reason"
                  value={
                    item.rescheduleReason
                  }
                  full
                />
              ) : null}

              {item.cancellationReason ? (
                <DetailBox
                  label="Cancellation Reason"
                  value={
                    item.cancellationReason
                  }
                  full
                />
              ) : null}
            </View>

            {!paid ? (
              <View
                style={
                  styles.helper
                }
              >
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={
                    INFO
                  }
                />

                <Text
                  style={[
                    styles.meta,
                    {
                      color:
                        INFO,
                      flex: 1,
                      marginTop:
                        0,
                    },
                  ]}
                >
                  The secure
                  video room
                  can be
                  created
                  after
                  payment is
                  successful.
                </Text>
              </View>
            ) : null}

            <Text
              style={
                styles.actionSectionTitle
              }
            >
              Available Actions
            </Text>

            <View
              style={
                styles.actions
              }
            >
              {item.status ===
              "PENDING_DOCTOR_CONFIRMATION" ? (
                <>
                  <Action
                    icon="checkmark-outline"
                    text="Accept Consultation"
                    bg={
                      SUCCESS_LIGHT
                    }
                    color={
                      SUCCESS
                    }
                    onPress={
                      onAccept
                    }
                  />

                  <Action
                    icon="close-outline"
                    text="Reject Consultation"
                    bg={
                      DANGER_LIGHT
                    }
                    color={
                      DANGER
                    }
                    onPress={
                      onReject
                    }
                  />
                </>
              ) : null}

              {paid &&
              !meeting &&
              !closed ? (
                <Action
                  icon="videocam-outline"
                  text="Create Video Room"
                  bg={
                    INFO_LIGHT
                  }
                  color={
                    INFO
                  }
                  onPress={
                    onCreateRoom
                  }
                />
              ) : null}

              {paid &&
              roomActive &&
              [
                "SCHEDULED",
                "PAYMENT_SUCCESS",
              ].includes(
                item.status
              ) ? (
                <Action
                  icon="play-circle-outline"
                  text="Start Consultation"
                  bg={
                    SUCCESS_LIGHT
                  }
                  color={
                    SUCCESS
                  }
                  onPress={
                    onStart
                  }
                />
              ) : null}

              {canRejoinConsultation(item, meeting) ? (
  <Action
    icon="videocam-outline"
    text="Rejoin Consultation"
    bg={SUCCESS_LIGHT}
    color={SUCCESS}
    onPress={onRejoin}
  />
) : null}

              {!closed &&
               item.status !==  
                "IN_PROGRESS" ? (
                <Action
                  icon="calendar-outline"
                  text="Reschedule"
                  bg={
                    WARNING_LIGHT
                  }
                  color={
                    WARNING
                  }
                  onPress={
                    onReschedule
                  }
                />
              ) : null}

              {canUsePrescriptionPad &&
              !prescription ? (
                <Action
                  icon="document-text-outline"
                  text="Create Prescription"
                  bg={
                    GOLD_LIGHT
                  }
                  color={
                    GREEN
                  }
                  onPress={
                    onPrescriptionPad
                  }
                />
              ) : null}

              {canUsePrescriptionPad &&
              prescriptionStatus ===
                "DRAFT" ? (
                <Action
                  icon="create-outline"
                  text="Continue / Edit Draft"
                  bg={
                    GOLD_LIGHT
                  }
                  color={
                    GREEN
                  }
                  onPress={
                    onPrescriptionPad
                  }
                />
              ) : null}

              {canUsePrescriptionPad &&
              prescriptionStatus ===
                "FINALIZED" ? (
                <Action
                  icon="eye-outline"
                  text={
                    prescriptionLoading
                      ? "Loading..."
                      : "View Prescription"
                  }
                  bg={
                    SUCCESS_LIGHT
                  }
                  color={
                    SUCCESS
                  }
                  onPress={
                    onViewPrescription
                  }
                />
              ) : null}

              {item.status ===
                "COMPLETED" &&
              prescription ? (
                <Action
                  icon="eye-outline"
                  text={
                    prescriptionLoading
                      ? "Loading..."
                      : "View Prescription"
                  }
                  bg={
                    SUCCESS_LIGHT
                  }
                  color={
                    SUCCESS
                  }
                  onPress={
                    onViewPrescription
                  }
                />
              ) : null}

              {item.status ===
              "IN_PROGRESS" ? (
                <Action
                  icon="checkmark-done-outline"
                  text="Complete Consultation"
                  bg={
                    GREEN
                  }
                  color={
                    WHITE
                  }
                  onPress={
                    onComplete
                  }
                />
              ) : null}
            </View>

            {item.status ===
              "COMPLETED" &&
            !prescription ? (
              <View
                style={
                  styles.noActionCard
                }
              >
                <Text
                  style={
                    styles.noActionText
                  }
                >
                  No
                  prescription
                  was created
                  for this
                  consultation.
                </Text>
              </View>
            ) : null}

            {closed &&
            item.status !==
              "COMPLETED" ? (
              <View
                style={
                  styles.noActionCard
                }
              >
                <Text
                  style={
                    styles.noActionText
                  }
                >
                  No additional
                  actions are
                  available
                  for this
                  consultation.
                </Text>
              </View>
            ) : null}

            {loading ? (
              <ActivityIndicator
                color={
                  GREEN
                }
                style={{
                  marginTop:
                    16,
                }}
              />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function RejectModal({
  visible,
  reason,
  loading,
  onChange,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  reason: string;
  loading: boolean;
  onChange: (
    value: string
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      visible={
        visible
      }
      transparent
      animationType="fade"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.centerBackdrop
        }
      >
        <View
          style={
            styles.noticeCard
          }
        >
          <View
            style={[
              styles.noticeIcon,
              {
                backgroundColor:
                  DANGER_LIGHT,
              },
            ]}
          >
            <Ionicons
              name="close-circle-outline"
              size={31}
              color={
                DANGER
              }
            />
          </View>

          <Text
            style={
              styles.noticeTitle
            }
          >
            Reject
            Consultation?
          </Text>

          <Text
            style={
              styles.noticeText
            }
          >
            Enter the
            reason for
            rejecting this
            consultation
            request.
          </Text>

          <TextInput
            value={
              reason
            }
            onChangeText={
              onChange
            }
            multiline
            placeholder="Enter rejection reason"
            placeholderTextColor="#9AA59F"
            style={
              styles.rejectInput
            }
          />

          <View
            style={
              styles.sheetActions
            }
          >
            <Pressable
              style={
                styles.secondary
              }
              onPress={
                onClose
              }
            >
              <Text
                style={
                  styles.secondaryText
                }
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.primary,
                {
                  backgroundColor:
                    DANGER,
                },
              ]}
              onPress={
                onSubmit
              }
            >
              {loading ? (
                <ActivityIndicator
                  color={
                    WHITE
                  }
                />
              ) : (
                <Text
                  style={
                    styles.primaryText
                  }
                >
                  Reject
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RescheduleModal({
  visible,
  value,
  loading,
  onChange,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  value: any;
  loading: boolean;
  onChange: (
    value: any
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      visible={
        visible
      }
      transparent
      animationType="slide"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.backdrop
        }
      >
        <View
          style={
            styles.sheet
          }
        >
          <SheetHeader
            eyebrow="UPDATE SCHEDULE"
            title="Reschedule Consultation"
            onClose={
              onClose
            }
          />

          <ScrollView>
            <Field
              label="New Date *"
              value={
                value.date
              }
              onChangeText={(
                date
              ) =>
                onChange({
                  ...value,
                  date,
                })
              }
              placeholder="YYYY-MM-DD"
            />

            <Field
              label="New Time *"
              value={
                value.time
              }
              onChangeText={(
                time
              ) =>
                onChange({
                  ...value,
                  time,
                })
              }
              placeholder="HH:MM"
            />

            <Field
              label="Reason"
              value={
                value.reason
              }
              onChangeText={(
                reason
              ) =>
                onChange({
                  ...value,
                  reason,
                })
              }
              placeholder="Explain the revised date and time"
              multiline
            />
          </ScrollView>

          <View
            style={
              styles.sheetActions
            }
          >
            <Pressable
              style={
                styles.secondary
              }
              onPress={
                onClose
              }
            >
              <Text
                style={
                  styles.secondaryText
                }
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.primary
              }
              onPress={
                onSubmit
              }
            >
              {loading ? (
                <ActivityIndicator
                  color={
                    WHITE
                  }
                />
              ) : (
                <Text
                  style={
                    styles.primaryText
                  }
                >
                  Confirm
                  Reschedule
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmModal({
  visible,
  type,
  loading,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  type: ConfirmType;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const config = {
    accept: {
      title:
        "Accept Consultation?",
      text:
        "The patient will be able to continue to payment.",
      icon:
        "checkmark-circle-outline" as const,
      color:
        SUCCESS,
      background:
        SUCCESS_LIGHT,
    },

    room: {
      title:
        "Create Video Room?",
      text:
        "A secure room will be created for this consultation.",
      icon:
        "videocam-outline" as const,
      color:
        INFO,
      background:
        INFO_LIGHT,
    },

    start: {
      title:
        "Start Consultation?",
      text:
        "The consultation status will change to In Progress and the secure room will open.",
      icon:
        "play-circle-outline" as const,
      color:
        SUCCESS,
      background:
        SUCCESS_LIGHT,
    },

    complete: {
      title:
        "Complete Consultation?",
      text:
        "This will mark the online consultation as completed.",
      icon:
        "checkmark-done-outline" as const,
      color:
        GREEN,
      background:
        MINT,
    },
  }[
    type ||
      "accept"
  ];

  return (
    <Modal
      visible={
        visible
      }
      transparent
      animationType="fade"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.centerBackdrop
        }
      >
        <View
          style={
            styles.noticeCard
          }
        >
          <View
            style={[
              styles.noticeIcon,
              {
                backgroundColor:
                  config.background,
              },
            ]}
          >
            <Ionicons
              name={
                config.icon
              }
              size={31}
              color={
                config.color
              }
            />
          </View>

          <Text
            style={
              styles.noticeTitle
            }
          >
            {
              config.title
            }
          </Text>

          <Text
            style={
              styles.noticeText
            }
          >
            {
              config.text
            }
          </Text>

          <View
            style={
              styles.sheetActions
            }
          >
            <Pressable
              style={
                styles.secondary
              }
              onPress={
                onClose
              }
            >
              <Text
                style={
                  styles.secondaryText
                }
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.primary
              }
              onPress={
                onConfirm
              }
            >
              {loading ? (
                <ActivityIndicator
                  color={
                    WHITE
                  }
                />
              ) : (
                <Text
                  style={
                    styles.primaryText
                  }
                >
                  Confirm
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PrescriptionModal({
  visible,
  prescription,
  onClose,
}: {
  visible: boolean;
  prescription: Prescription | null;
  onClose: () => void;
}) {
  const medicines =
    Array.isArray(
      prescription?.items
    )
      ? prescription?.items ||
        []
      : [];

  return (
    <Modal
      visible={
        visible
      }
      transparent
      animationType="slide"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.backdrop
        }
      >
        <View
          style={
            styles.prescriptionSheet
          }
        >
          <SheetHeader
            eyebrow="PRESCRIPTION"
            title={`Prescription #${
              prescription?.id ||
              "—"
            }`}
            onClose={
              onClose
            }
          />

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
          >
            <View
              style={
                styles.detailGrid
              }
            >
              <DetailBox
                label="Patient"
                value={
                  prescription?.patientName ||
                  "Patient"
                }
              />

              <DetailBox
                label="Doctor"
                value={
                  prescription?.doctorName ||
                  "—"
                }
              />

              <DetailBox
                label="Status"
                value={label(
                  prescription?.status
                )}
              />

              <DetailBox
                label="Finalized"
                value={formatDateTime(
                  prescription?.finalizedAt
                )}
              />

              <DetailBox
                label="Diagnosis"
                value={
                  prescription?.diagnosis ||
                  "—"
                }
                full
              />

              <DetailBox
                label="Advice"
                value={
                  prescription?.advice ||
                  "—"
                }
                full
              />

              <DetailBox
                label="Notes"
                value={
                  prescription?.notes ||
                  "—"
                }
                full
              />
            </View>

            <Text
              style={
                styles.actionSectionTitle
              }
            >
              Medicines (
              {
                medicines.length
              }
              )
            </Text>

            {medicines.length ? (
              medicines.map(
                (
                  medicine,
                  index
                ) => (
                  <View
                    key={
                      medicine?.id ||
                      index
                    }
                    style={
                      styles.medicineCard
                    }
                  >
                    <Text
                      style={
                        styles.medicineName
                      }
                    >
                      {medicine?.medicineName ||
                        medicine?.productName ||
                        "Medicine"}
                    </Text>

                    <View
                      style={
                        styles.medicineGrid
                      }
                    >
                      <MiniDetail
                        label="Dosage"
                        value={
                          medicine?.dosage ||
                          "—"
                        }
                      />

                      <MiniDetail
                        label="Frequency"
                        value={
                          medicine?.frequency ||
                          "—"
                        }
                      />

                      <MiniDetail
                        label="Days"
                        value={String(
                          medicine?.durationDays ??
                            "—"
                        )}
                      />

                      <MiniDetail
                        label="Quantity"
                        value={String(
                          medicine?.quantity ??
                            "—"
                        )}
                      />

                      <MiniDetail
                        label="Instructions"
                        value={
                          medicine?.instructions ||
                          "—"
                        }
                        full
                      />
                    </View>
                  </View>
                )
              )
            ) : (
              <View
                style={
                  styles.noActionCard
                }
              >
                <Text
                  style={
                    styles.noActionText
                  }
                >
                  No medicines
                  were added.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function MiniDetail({
  label: title,
  value,
  full = false,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <View
      style={[
        styles.miniDetail,
        full && {
          width: "100%",
        },
      ]}
    >
      <Text
        style={
          styles.miniLabel
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.miniValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

function NoticeModal({
  visible,
  type,
  title,
  message,
  onClose,
}: {
  visible: boolean;
  type: NoticeType;
  title: string;
  message: string;
  onClose: () => void;
}) {
  const color =
    type === "success"
      ? SUCCESS
      : type === "error"
      ? DANGER
      : INFO;

  const background =
    type === "success"
      ? SUCCESS_LIGHT
      : type === "error"
      ? DANGER_LIGHT
      : INFO_LIGHT;

  const icon =
    type === "success"
      ? "checkmark-circle-outline"
      : type === "error"
      ? "alert-circle-outline"
      : "information-circle-outline";

  return (
    <Modal
      visible={
        visible
      }
      transparent
      animationType="fade"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.centerBackdrop
        }
      >
        <View
          style={
            styles.noticeCard
          }
        >
          <View
            style={[
              styles.noticeIcon,
              {
                backgroundColor:
                  background,
              },
            ]}
          >
            <Ionicons
              name={
                icon as any
              }
              size={31}
              color={
                color
              }
            />
          </View>

          <Text
            style={
              styles.noticeTitle
            }
          >
            {title}
          </Text>

          <Text
            style={
              styles.noticeText
            }
          >
            {message}
          </Text>

          <Pressable
            style={
              styles.noticeButton
            }
            onPress={
              onClose
            }
          >
            <Text
              style={
                styles.primaryText
              }
            >
              Okay
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor:
        CREAM,
    },

    screen: {
      flex: 1,
      backgroundColor:
        CREAM,
    },

    list: {
      paddingHorizontal:
        16,
      paddingBottom:
        42,
    },

    hero: {
      marginTop: 18,
      marginBottom: 24,
      padding: 22,
      borderRadius: 28,
      backgroundColor:
        GREEN,
      overflow: "hidden",
    },

    heroGlow: {
      position:
        "absolute",
      width: 190,
      height: 190,
      borderRadius: 95,
      top: -88,
      right: -56,
      backgroundColor:
        "rgba(255,255,255,.07)",
    },

    heroTag: {
      alignSelf:
        "flex-start",
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
      paddingHorizontal:
        12,
      paddingVertical:
        8,
      borderRadius: 999,
      backgroundColor:
        "rgba(255,255,255,.10)",
      marginBottom: 20,
    },

    heroTagText: {
      color:
        GOLD_LIGHT,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 10,
      letterSpacing:
        1.4,
    },

    heroTitle: {
      color: WHITE,
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 31,
      lineHeight: 37,
      marginBottom: 12,
    },

    heroText: {
      color:
        "rgba(255,255,255,.78)",
      fontFamily:
        "DMSans_400Regular",
      fontSize: 13,
      lineHeight: 20,
    },

    eyebrow: {
      color: GOLD,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 9,
      letterSpacing:
        1.5,
      marginBottom: 4,
    },

    heading: {
      color: GREEN,
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 25,
    },

    sub: {
      color: MUTED,
      fontFamily:
        "DMSans_400Regular",
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },

    summaryRow: {
      gap: 11,
      paddingRight: 8,
      paddingBottom: 4,
      marginBottom: 18,
    },

    summary: {
      width: 126,
      minHeight: 132,
      padding: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        BORDER,
      backgroundColor:
        WHITE,
    },

    summaryIcon: {
      width: 41,
      height: 41,
      borderRadius: 13,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        MINT,
      marginBottom: 12,
    },

    summaryValue: {
      color: GREEN,
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 27,
    },

    summaryLabel: {
      color: MUTED,
      fontFamily:
        "DMSans_500Medium",
      fontSize: 10,
      lineHeight: 14,
      marginTop: 3,
    },

    tabsRow: {
      gap: 8,
      paddingRight: 8,
      paddingBottom: 4,
      marginBottom: 18,
    },

    tab: {
      minHeight: 42,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 7,
      paddingHorizontal:
        12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        BORDER,
      backgroundColor:
        WHITE,
    },

    tabActive: {
      borderColor:
        GREEN,
      backgroundColor:
        GREEN,
    },

    tabText: {
      color: MUTED,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 10,
    },

    tabTextActive: {
      color: WHITE,
    },

    tabCount: {
      minWidth: 22,
      height: 22,
      paddingHorizontal:
        6,
      borderRadius: 11,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        MINT,
    },

    tabCountActive: {
      backgroundColor:
        "rgba(255,255,255,.16)",
    },

    tabCountText: {
      color: GREEN,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 9,
    },

    tabCountTextActive: {
      color:
        GOLD_LIGHT,
    },

    searchRow: {
      flexDirection:
        "row",
      gap: 10,
      marginBottom: 27,
    },

    searchBox: {
      flex: 1,
      minHeight: 52,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 9,
      paddingHorizontal:
        14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        BORDER,
      backgroundColor:
        WHITE,
    },

    searchInput: {
      flex: 1,
      color: TEXT,
      fontFamily:
        "DMSans_400Regular",
      fontSize: 13,
    },

    filterBtn: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor:
        MINT,
      borderWidth: 1,
      borderColor:
        BORDER,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    dot: {
      position:
        "absolute",
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor:
        GOLD,
    },

    recordsHead: {
      flexDirection:
        "row",
      alignItems:
        "flex-end",
      justifyContent:
        "space-between",
      gap: 10,
      marginBottom: 13,
    },

    count: {
      paddingHorizontal:
        11,
      paddingVertical:
        7,
      borderRadius: 999,
      backgroundColor:
        MINT,
    },

    countText: {
      color: GREEN,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 9,
    },

    card: {
      marginBottom: 13,
      padding: 15,
      borderRadius: 22,
      borderWidth: 1,
      borderColor:
        BORDER,
      backgroundColor:
        WHITE,
    },

    cardTop: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      gap: 10,
    },

    patientRow: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
    },

    avatar: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        GREEN,
    },

    avatarText: {
      color: WHITE,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 17,
    },

    patientName: {
      color: GREEN,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 14,
    },

    meta: {
      color: MUTED,
      fontFamily:
        "DMSans_400Regular",
      fontSize: 10,
      marginTop: 3,
    },

    badge: {
      maxWidth: 130,
      paddingHorizontal:
        8,
      paddingVertical:
        6,
      borderRadius: 999,
    },

    badgeText: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 8,
    },

    sep: {
      height: 1,
      backgroundColor:
        BORDER,
      marginVertical: 13,
    },

    grid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      rowGap: 12,
    },

    info: {
      width: "50%",
      flexDirection:
        "row",
      paddingRight: 8,
    },

    infoIcon: {
      width: 31,
      height: 31,
      borderRadius: 10,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        MINT,
      marginRight: 8,
    },

    infoLabel: {
      color: MUTED,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 7.5,
      textTransform:
        "uppercase",
    },

    infoValue: {
      color: TEXT,
      fontFamily:
        "DMSans_600SemiBold",
      fontSize: 9.5,
      lineHeight: 13,
      marginTop: 2,
    },

    cardFooter: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
      gap: 10,
      marginTop: 14,
      paddingTop: 13,
      borderTopWidth:
        1,
      borderTopColor:
        BORDER,
    },

    fee: {
      minWidth: 76,
      minHeight: 40,
      borderRadius: 12,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        10,
    },

    feeText: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 11,
    },

    actions: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap: 8,
      marginTop: 10,
      paddingBottom: 12,
    },

    action: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
      paddingHorizontal:
        11,
      minHeight: 40,
      borderRadius: 11,
    },

    actionText: {
      fontFamily:
        "DMSans_700Bold",
      fontSize: 9,
    },

    empty: {
      alignItems:
        "center",
      padding: 35,
      borderRadius: 22,
      borderWidth: 1,
      borderColor:
        BORDER,
      backgroundColor:
        WHITE,
    },

    emptyTitle: {
      color: GREEN,
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 19,
      textAlign:
        "center",
      marginTop: 12,
    },

    backdrop: {
      flex: 1,
      justifyContent:
        "flex-end",
      backgroundColor:
        "rgba(8,31,23,.64)",
    },

    centerBackdrop: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      padding: 24,
      backgroundColor:
        "rgba(8,31,23,.68)",
    },

    sheet: {
      maxHeight: "88%",
      paddingHorizontal:
        18,
      paddingTop: 8,
      paddingBottom: 20,
      borderTopLeftRadius:
        30,
      borderTopRightRadius:
        30,
      backgroundColor:
        CREAM,
    },

    detailsSheet: {
      maxHeight: "95%",
      paddingHorizontal:
        18,
      paddingTop: 8,
      paddingBottom: 18,
      borderTopLeftRadius:
        30,
      borderTopRightRadius:
        30,
      backgroundColor:
        CREAM,
    },

    prescriptionSheet: {
      maxHeight: "95%",
      paddingHorizontal:
        18,
      paddingTop: 8,
      paddingBottom: 18,
      borderTopLeftRadius:
        30,
      borderTopRightRadius:
        30,
      backgroundColor:
        CREAM,
    },

    handle: {
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor:
        "#D3DAD5",
      alignSelf:
        "center",
      marginBottom: 14,
    },

    sheetHead: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom: 17,
      gap: 12,
    },

    sheetEyebrow: {
      color: GOLD,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 8,
      letterSpacing:
        1.4,
      marginBottom: 4,
    },

    sheetTitle: {
      color: GREEN,
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 24,
      lineHeight: 28,
    },

    close: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor:
        MINT,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    formLabel: {
      color: GREEN,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 10,
      marginBottom: 8,
    },

    input: {
      minHeight: 50,
      paddingHorizontal:
        13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        BORDER,
      backgroundColor:
        WHITE,
      color: TEXT,
      fontFamily:
        "DMSans_500Medium",
      fontSize: 12,
    },

    multiline: {
      minHeight: 94,
      paddingTop: 12,
      textAlignVertical:
        "top",
    },

    choiceWrap: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap: 7,
    },

    choice: {
      paddingHorizontal:
        11,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        BORDER,
      backgroundColor:
        WHITE,
    },

    choiceOn: {
      backgroundColor:
        GREEN,
      borderColor:
        GREEN,
    },

    choiceText: {
      color: MUTED,
      fontFamily:
        "DMSans_600SemiBold",
      fontSize: 9,
    },

    choiceTextOn: {
      color: WHITE,
    },

    todayRow: {
      flexDirection:
        "row",
      justifyContent:
        "flex-start",
      marginTop: 14,
    },

    todayButton: {
      minHeight: 42,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 7,
      paddingHorizontal:
        14,
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        BORDER,
      backgroundColor:
        MINT,
    },

    todayButtonText: {
      color: GREEN,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 10,
    },

    sheetActions: {
      flexDirection:
        "row",
      gap: 10,
      paddingTop: 12,
    },

    secondary: {
      flex: 1,
      minHeight: 49,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        BORDER,
      backgroundColor:
        WHITE,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    secondaryText: {
      color: GREEN,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 11,
    },

    primary: {
      flex: 1.25,
      minHeight: 49,
      borderRadius: 15,
      backgroundColor:
        GREEN,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    primaryText: {
      color: WHITE,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 11,
    },

    detailPatient: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 11,
      padding: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        BORDER,
      backgroundColor:
        WHITE,
    },

    detailGrid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap: 9,
      marginTop: 12,
    },

    detailBox: {
      width: "48.6%",
      minHeight: 74,
      padding: 11,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        BORDER,
      backgroundColor:
        WHITE,
    },

    detailLabel: {
      color: MUTED,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 7.5,
      textTransform:
        "uppercase",
      marginBottom: 6,
    },

    detailValue: {
      color: GREEN,
      fontFamily:
        "DMSans_600SemiBold",
      fontSize: 10,
      lineHeight: 16,
    },

    helper: {
      flexDirection:
        "row",
      gap: 8,
      padding: 12,
      borderRadius: 14,
      backgroundColor:
        INFO_LIGHT,
      marginTop: 12,
    },

    actionSectionTitle: {
      color: GREEN,
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 19,
      marginTop: 20,
      marginBottom: 2,
    },

    noActionCard: {
      marginTop: 12,
      padding: 14,
      borderRadius: 14,
      backgroundColor:
        "#F2F6F3",
    },

    noActionText: {
      color: MUTED,
      fontFamily:
        "DMSans_500Medium",
      fontSize: 11,
      lineHeight: 17,
      textAlign:
        "center",
    },

    noticeCard: {
      width: "100%",
      maxWidth: 370,
      padding: 24,
      borderRadius: 27,
      backgroundColor:
        CREAM,
      alignItems:
        "center",
    },

    noticeIcon: {
      width: 64,
      height: 64,
      borderRadius: 22,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 15,
    },

    noticeTitle: {
      color: GREEN,
      fontFamily:
        "PlayfairDisplay_700Bold",
      fontSize: 23,
      textAlign:
        "center",
    },

    noticeText: {
      color: MUTED,
      fontFamily:
        "DMSans_400Regular",
      fontSize: 11.5,
      lineHeight: 18,
      textAlign:
        "center",
      marginTop: 8,
    },

    rejectInput: {
      width: "100%",
      minHeight: 96,
      marginTop: 16,
      padding: 13,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        BORDER,
      backgroundColor:
        WHITE,
      color: TEXT,
      fontFamily:
        "DMSans_400Regular",
      fontSize: 12,
      textAlignVertical:
        "top",
    },

    noticeButton: {
      width: "100%",
      minHeight: 49,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginTop: 20,
      borderRadius: 15,
      backgroundColor:
        GREEN,
    },

    medicineCard: {
      marginTop: 10,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        BORDER,
      backgroundColor:
        WHITE,
    },

    medicineName: {
      color: GREEN,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 13,
      marginBottom: 10,
    },

    medicineGrid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap: 8,
    },

    miniDetail: {
      width: "48%",
      padding: 9,
      borderRadius: 10,
      backgroundColor:
        MINT,
    },

    miniLabel: {
      color: MUTED,
      fontFamily:
        "DMSans_700Bold",
      fontSize: 7,
      textTransform:
        "uppercase",
      marginBottom: 4,
    },

    miniValue: {
      color: GREEN,
      fontFamily:
        "DMSans_600SemiBold",
      fontSize: 9.5,
      lineHeight: 14,
    },
  });
