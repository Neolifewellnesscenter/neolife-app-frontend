import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import TherapistHeader from "../../components/TherapistHeader";
import TherapistDrawer from "../../components/TherapistDrawer";

/* =========================================================
   CONFIG
========================================================= */

const API_BASE_URL = "http://192.168.137.1:8085/api";

const GREEN = "#123E32";
const GREEN_2 = "#1A5644";
const MINT = "#EAF4EF";
const CREAM = "#F8FAF8";
const WHITE = "#FFFFFF";
const GOLD = "#B8923B";
const GOLD_LIGHT = "#F7EECF";
const TEXT = "#20342D";
const MUTED = "#718078";
const BORDER = "#E3EAE6";

const RED = "#B94B4B";
const RED_LIGHT = "#FDECEC";

const BLUE = "#356C91";
const BLUE_LIGHT = "#EAF3F8";

const ORANGE = "#B26A24";
const ORANGE_LIGHT = "#FFF2E4";

const PAGE_SIZE = 8;

const STATUS_TABS = [
  ["", "All"],
  ["PENDING_APPROVAL", "Pending"],
  ["APPROVED", "Approved"],
  ["RESCHEDULED", "Rescheduled"],
  ["REJECTED", "Rejected"],
] as const;

/* =========================================================
   TYPES
========================================================= */

type TherapistProfile = {
  id?: number | string | null;
  name?: string;
  therapistName?: string;
  specialization?: string;
};

type Booking = {
  id: number | string | null;
  bookingNumber: string;
  treatmentPlanId: number | string | null;

  patientId: number | string | null;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  patientAge: number | string;
  patientGender: string;

  therapyName: string;

  bookingDate: string;
  bookingTime: string;
  endTime: string;

  sessionNumber: number;
  totalSessions: number;

  symptoms: string;
  medicalHistory: string;

  paymentStatus: string;
  status: string;

  notes: string;
  rescheduleReason: string;

  approvedAt?: string | null;
  completedAt?: string | null;
  missedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type RescheduleForm = {
  date: string;
  time: string;
  reason: string;
};

/* =========================================================
   AUTH / API
========================================================= */

async function getToken() {
  return (
    (await AsyncStorage.getItem("therapistToken")) ||
    (await AsyncStorage.getItem("token")) ||
    (await AsyncStorage.getItem("accessToken")) ||
    ""
  );
}

async function clearTherapistSession() {
  await AsyncStorage.multiRemove([
    "therapistToken",
    "therapistRefreshToken",
    "token",
    "accessToken",
    "refreshToken",
    "role",
    "therapistId",
    "therapistName",
    "therapistProfile",
    "therapistProfileCompleted",
    "userId",
    "userName",
    "name",
    "email",
    "phoneNumber",
    "profileCompleted",
    "isLoggedIn",
  ]);
}

async function readResponse(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      message: text || `Invalid server response (${response.status}).`,
    };
  }
}

async function therapistApi(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = await getToken();

  if (!token) {
    await clearTherapistSession();
    router.replace("/" as any);
    throw new Error("Therapist login required.");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const result = await readResponse(response);

  if (response.status === 401 || response.status === 403) {
    await clearTherapistSession();

    router.replace("/" as any);

    throw new Error(
      result?.message ||
        "Therapist session expired. Please log in again."
    );
  }

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.message || `Request failed (${response.status}).`
    );
  }

  return result;
}

/* =========================================================
   HELPERS
========================================================= */

function extractArray(data: any): any[] {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.content)) return data.content;

  if (Array.isArray(data?.sessions)) return data.sessions;

  return [];
}

function normalizeBooking(item: any = {}): Booking {
  return {
    id: item.id ?? item.sessionId ?? null,

    bookingNumber: `SES-${item.id ?? item.sessionId ?? "-"}`,

    treatmentPlanId: item.treatmentPlanId ?? null,

    patientId: item.patientId ?? null,

    patientName: item.patientName || "Patient",

    patientPhone:
      item.phoneNumber ||
      item.patientPhone ||
      "-",

    patientEmail:
      item.email ||
      item.patientEmail ||
      "-",

    patientAge: item.age ?? "-",

    patientGender: String(
      item.gender || "-"
    ).toUpperCase(),

    therapyName:
      item.treatmentName ||
      item.therapyName ||
      "Therapy",

    bookingDate:
      item.sessionDate ||
      item.bookingDate ||
      item.date ||
      "",

    bookingTime:
      item.startTime ||
      item.bookingTime ||
      item.time ||
      "",

    endTime: item.endTime || "",

    sessionNumber: Number(
      item.sessionNumber || 1
    ),

    totalSessions: Number(
      item.totalSessions || 1
    ),

    symptoms:
      item.patientNotes ||
      item.symptoms ||
      "-",

    medicalHistory: "Refer to patient history",

    paymentStatus: "NOT_APPLICABLE",

    status: String(
      item.status || "PENDING_APPROVAL"
    ).toUpperCase(),

    notes:
      item.therapistNotes ||
      item.patientNotes ||
      "-",

    rescheduleReason:
      item.rescheduleReason || "",

    approvedAt: item.approvedAt || null,

    completedAt: item.completedAt || null,

    missedAt: item.missedAt || null,

    createdAt: item.createdAt || null,

    updatedAt: item.updatedAt || null,
  };
}

function sortByScheduleDescending(
  first: Booking,
  second: Booking
) {
  const firstDate = new Date(
    `${first.bookingDate || "1970-01-01"}T${
      first.bookingTime || "00:00:00"
    }`
  );

  const secondDate = new Date(
    `${second.bookingDate || "1970-01-01"}T${
      second.bookingTime || "00:00:00"
    }`
  );

  return secondDate.getTime() - firstDate.getTime();
}

function formatLabel(value: string) {
  if (!value) return "-";

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(
    String(value).includes("T")
      ? value
      : `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  if (!value) return "-";

  const parts = String(value).split(":");

  if (parts.length < 2) {
    return String(value);
  }

  const date = new Date();

  date.setHours(
    Number(parts[0]),
    Number(parts[1]),
    0,
    0
  );

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTimeRange(start: string, end: string) {
  const formattedStart = formatTime(start);
  const formattedEnd = formatTime(end);

  if (end && formattedEnd !== "-") {
    return `${formattedStart} - ${formattedEnd}`;
  }

  return formattedStart;
}

function normalizeTimeForApi(value: string) {
  if (!value) return value;

  return String(value).length === 5
    ? `${value}:00`
    : value;
}

function getStatusStyle(status: string) {
  switch (String(status || "").toUpperCase()) {
    case "APPROVED":
      return {
        background: MINT,
        text: GREEN,
        icon: "checkmark-circle-outline" as const,
      };

    case "RESCHEDULED":
      return {
        background: BLUE_LIGHT,
        text: BLUE,
        icon: "calendar-outline" as const,
      };

    case "REJECTED":
    case "MISSED":
      return {
        background: RED_LIGHT,
        text: RED,
        icon: "close-circle-outline" as const,
      };

    default:
      return {
        background: ORANGE_LIGHT,
        text: ORANGE,
        icon: "time-outline" as const,
      };
  }
}

/* =========================================================
   SCREEN
========================================================= */

export default function TherapistBookingRequestsScreen() {
  const [drawerVisible, setDrawerVisible] =
    useState(false);

  const [therapist, setTherapist] =
    useState<TherapistProfile>({
      name: "Therapist",
      specialization: "Therapist",
    });

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState("");

  const [selectedStatus, setSelectedStatus] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [therapyFilter, setTherapyFilter] =
    useState("");

  const [detailsBooking, setDetailsBooking] =
    useState<Booking | null>(null);

  const [rescheduleBooking, setRescheduleBooking] =
    useState<Booking | null>(null);

  const [rescheduleForm, setRescheduleForm] =
    useState<RescheduleForm>({
      date: "",
      time: "",
      reason: "",
    });

  const [currentPage, setCurrentPage] =
    useState(1);

  /* =====================================================
     LOAD PROFILE
  ===================================================== */

  const loadProfile = useCallback(async () => {
    const savedName =
      (await AsyncStorage.getItem("therapistName")) ||
      (await AsyncStorage.getItem("userName")) ||
      (await AsyncStorage.getItem("name")) ||
      "Therapist";

    try {
      const result =
        await therapistApi("/therapists/me");

      const profile = result?.data || {};

      const next: TherapistProfile = {
        ...profile,

        name:
          profile.name ||
          profile.therapistName ||
          savedName,

        specialization:
          profile.specialization ||
          "Therapist",
      };

      setTherapist(next);

      if (
        next.id !== null &&
        next.id !== undefined
      ) {
        await AsyncStorage.setItem(
          "therapistId",
          String(next.id)
        );
      }

      await AsyncStorage.setItem(
        "therapistName",
        next.name || "Therapist"
      );

      await AsyncStorage.setItem(
        "therapistProfile",
        JSON.stringify(next)
      );
    } catch (error: any) {
      console.log(
        "Therapist profile loading failed:",
        error
      );
    }
  }, []);

  /* =====================================================
     LOAD BOOKINGS
  ===================================================== */

  const loadBookings = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      try {
        const result = await therapistApi(
          "/daily-treatments/therapist/my-sessions"
        );

        const nextBookings =
          extractArray(result?.data)
            .map(normalizeBooking)
            .sort(sortByScheduleDescending);

        setBookings(nextBookings);
      } catch (error: any) {
        setBookings([]);

        Alert.alert(
          "Booking Requests",
          error?.message ||
            "Unable to load booking requests."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /* =====================================================
     INITIALIZE
  ===================================================== */

  useEffect(() => {
    const initialize = async () => {
      const token = await getToken();

      if (!token) {
        router.replace("/" as any);
        return;
      }

      const role = String(
        (await AsyncStorage.getItem("role")) || ""
      ).toUpperCase();

      if (role && role !== "THERAPIST") {
        router.replace("/" as any);
        return;
      }

      await Promise.allSettled([
        loadProfile(),
        loadBookings(),
      ]);
    };

    initialize();
  }, [loadProfile, loadBookings]);

  /* =====================================================
     REFRESH
  ===================================================== */

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await Promise.allSettled([
        loadProfile(),
        loadBookings(false),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  /* =====================================================
     SUMMARY
  ===================================================== */

  const summary = useMemo(
    () => ({
      pending: bookings.filter(
        (booking) =>
          booking.status === "PENDING_APPROVAL"
      ).length,

      approved: bookings.filter(
        (booking) =>
          booking.status === "APPROVED"
      ).length,

      rescheduled: bookings.filter(
        (booking) =>
          booking.status === "RESCHEDULED"
      ).length,

      rejected: bookings.filter(
        (booking) =>
          booking.status === "REJECTED"
      ).length,
    }),
    [bookings]
  );

  /* =====================================================
     THERAPIES
  ===================================================== */

  const therapies = useMemo(() => {
    return [
      ...new Set(
        bookings
          .map((booking) => booking.therapyName)
          .filter(Boolean)
      ),
    ].sort();
  }, [bookings]);

  /* =====================================================
     FILTER
  ===================================================== */

  const filteredBookings = useMemo(() => {
    const cleanSearch =
      search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesSearch =
        !cleanSearch ||
        booking.patientName
          .toLowerCase()
          .includes(cleanSearch) ||
        booking.bookingNumber
          .toLowerCase()
          .includes(cleanSearch) ||
        booking.therapyName
          .toLowerCase()
          .includes(cleanSearch);

      const matchesTherapy =
        !therapyFilter ||
        booking.therapyName === therapyFilter;

      const matchesStatus =
        !selectedStatus ||
        booking.status === selectedStatus;

      return (
        matchesSearch &&
        matchesTherapy &&
        matchesStatus
      );
    });
  }, [
    bookings,
    search,
    therapyFilter,
    selectedStatus,
  ]);

  /* =====================================================
     PAGINATION
  ===================================================== */

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    therapyFilter,
    selectedStatus,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredBookings.length / PAGE_SIZE
    )
  );

  const safePage = Math.min(
    currentPage,
    totalPages
  );

  const pageBookings =
    filteredBookings.slice(
      (safePage - 1) * PAGE_SIZE,
      safePage * PAGE_SIZE
    );

  /* =====================================================
     APPROVE
  ===================================================== */

  const performApprove = async (
    booking: Booking
  ) => {
    if (!booking.id) return;

    setActionLoading(
      `approve-${booking.id}`
    );

    try {
      const result = await therapistApi(
        `/daily-treatments/${encodeURIComponent(
          String(booking.id)
        )}/approve`,
        {
          method: "PUT",
        }
      );

      setDetailsBooking(null);

      await loadBookings(false);

      Alert.alert(
        "Session Approved",
        result?.message ||
          "Daily treatment session approved successfully."
      );
    } catch (error: any) {
      Alert.alert(
        "Unable to Approve",
        error?.message ||
          "Unable to approve the session."
      );
    } finally {
      setActionLoading("");
    }
  };

  const approveBooking = (
    booking: Booking
  ) => {
    Alert.alert(
      "Approve Session",
      `Approve session ${booking.bookingNumber}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Approve",
          onPress: () =>
            performApprove(booking),
        },
      ]
    );
  };

  /* =====================================================
     RESCHEDULE
  ===================================================== */

  const openReschedule = (
    booking: Booking
  ) => {
    setDetailsBooking(null);

    setRescheduleBooking(booking);

    setRescheduleForm({
      date: booking.bookingDate || "",

      time: String(
        booking.bookingTime || ""
      ).substring(0, 5),

      reason:
        booking.rescheduleReason || "",
    });
  };

  const submitReschedule = async () => {
    if (!rescheduleBooking?.id) return;

    const sessionDate =
      rescheduleForm.date.trim();

    const startTime =
      rescheduleForm.time.trim();

    const reason =
      rescheduleForm.reason.trim();

    if (
      !sessionDate ||
      !startTime ||
      !reason
    ) {
      Alert.alert(
        "Details Required",
        "Enter the new date, time and reschedule reason."
      );

      return;
    }

    setActionLoading(
      `reschedule-${rescheduleBooking.id}`
    );

    try {
      const result = await therapistApi(
        `/daily-treatments/${encodeURIComponent(
          String(rescheduleBooking.id)
        )}/reschedule`,
        {
          method: "PUT",

          body: JSON.stringify({
            sessionDate,

            startTime:
              normalizeTimeForApi(
                startTime
              ),

            reason,
          }),
        }
      );

      setRescheduleBooking(null);

      await loadBookings(false);

      Alert.alert(
        "Session Rescheduled",
        result?.message ||
          "Daily treatment session rescheduled successfully."
      );
    } catch (error: any) {
      Alert.alert(
        "Unable to Reschedule",
        error?.message ||
          "Unable to reschedule the session."
      );
    } finally {
      setActionLoading("");
    }
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <SafeAreaView style={styles.screen}>
      <TherapistHeader
        title="Booking Requests"
        subtitle="Review and manage therapy requests."
        therapistName={
          therapist.name ||
          therapist.therapistName ||
          "Therapist"
        }
        onMenuPress={() =>
          setDrawerVisible(true)
        }
        onRefresh={onRefresh}
        refreshing={refreshing}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
      >
        {/* HERO */}

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>
                THERAPY REQUESTS
              </Text>

              <Text style={styles.heroTitle}>
                Booking Requests
              </Text>

              <Text style={styles.heroText}>
                Review patients who selected you for therapy.
                Approve suitable slots or suggest an alternative
                date and time.
              </Text>
            </View>

            <View style={styles.heroIcon}>
              <Ionicons
                name="file-tray-full-outline"
                size={26}
                color={GOLD_LIGHT}
              />
            </View>
          </View>
        </View>

        {/* SUMMARY */}

        <View style={styles.summaryGrid}>
          <SummaryCard
            title="Pending"
            value={summary.pending}
            icon="time-outline"
            background={ORANGE_LIGHT}
            iconColor={ORANGE}
          />

          <SummaryCard
            title="Approved"
            value={summary.approved}
            icon="checkmark-circle-outline"
            background={MINT}
            iconColor={GREEN}
          />

          <SummaryCard
            title="Rescheduled"
            value={summary.rescheduled}
            icon="calendar-outline"
            background={BLUE_LIGHT}
            iconColor={BLUE}
          />

          <SummaryCard
            title="Rejected"
            value={summary.rejected}
            icon="close-circle-outline"
            background={RED_LIGHT}
            iconColor={RED}
          />
        </View>

        {/* STATUS */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.statusTabs
          }
        >
          {STATUS_TABS.map(
            ([value, label]) => {
              const selected =
                selectedStatus === value;

              return (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.statusTab,
                    selected &&
                      styles.statusTabSelected,
                  ]}
                  onPress={() =>
                    setSelectedStatus(value)
                  }
                >
                  <Text
                    style={[
                      styles.statusTabText,
                      selected &&
                        styles.statusTabTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>

        {/* SEARCH */}

        <View style={styles.filterCard}>
          <Text style={styles.filterLabel}>
            Search Requests
          </Text>

          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={18}
              color={MUTED}
            />

            <TextInput
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              placeholder="Patient, booking ID or therapy"
              placeholderTextColor="#9AA49F"
            />

            {search.length > 0 && (
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

          {/* THERAPY FILTER */}

          {therapies.length > 0 && (
            <>
              <Text style={styles.filterLabel}>
                Therapy
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
              >
                <TouchableOpacity
                  style={[
                    styles.therapyChip,
                    !therapyFilter &&
                      styles.therapyChipSelected,
                  ]}
                  onPress={() =>
                    setTherapyFilter("")
                  }
                >
                  <Text
                    style={[
                      styles.therapyChipText,
                      !therapyFilter &&
                        styles.therapyChipTextSelected,
                    ]}
                  >
                    All Therapies
                  </Text>
                </TouchableOpacity>

                {therapies.map((therapy) => {
                  const selected =
                    therapyFilter === therapy;

                  return (
                    <TouchableOpacity
                      key={therapy}
                      style={[
                        styles.therapyChip,
                        selected &&
                          styles.therapyChipSelected,
                      ]}
                      onPress={() =>
                        setTherapyFilter(
                          selected
                            ? ""
                            : therapy
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.therapyChipText,
                          selected &&
                            styles.therapyChipTextSelected,
                        ]}
                      >
                        {therapy}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>

        {/* HEADING */}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>
              Therapy Requests
            </Text>

            <Text style={styles.sectionSubtitle}>
              Approve or reschedule patient sessions.
            </Text>
          </View>

          <View style={styles.requestCount}>
            <Text
              style={styles.requestCountText}
            >
              {filteredBookings.length}
            </Text>
          </View>
        </View>

        {/* LIST */}

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="small"
              color={GREEN}
            />

            <Text style={styles.loadingText}>
              Loading booking requests...
            </Text>
          </View>
        ) : pageBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="file-tray-outline"
                size={29}
                color={GOLD}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No Therapy Sessions
            </Text>

            <Text style={styles.emptyText}>
              No booking requests match your current filters.
            </Text>
          </View>
        ) : (
          pageBookings.map((booking) => {
            const status =
              getStatusStyle(
                booking.status
              );

            const pending =
              booking.status ===
              "PENDING_APPROVAL";

            const approved =
              booking.status ===
              "APPROVED";

            return (
              <View
                key={String(booking.id)}
                style={styles.bookingCard}
              >
                {/* TOP */}

                <View style={styles.cardTop}>
                  <View
                    style={styles.patientAvatar}
                  >
                    <Text
                      style={
                        styles.patientAvatarText
                      }
                    >
                      {booking.patientName
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
                      {booking.patientName}
                    </Text>

                    <Text
                      style={
                        styles.bookingNumber
                      }
                    >
                      {booking.bookingNumber}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          status.background,
                      },
                    ]}
                  >
                    <Ionicons
                      name={status.icon}
                      size={12}
                      color={status.text}
                    />

                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            status.text,
                        },
                      ]}
                    >
                      {formatLabel(
                        booking.status
                      )}
                    </Text>
                  </View>
                </View>

                {/* THERAPY */}

                <View style={styles.therapyBox}>
                  <View
                    style={
                      styles.therapyIcon
                    }
                  >
                    <Ionicons
                      name="sparkles-outline"
                      size={17}
                      color={GOLD}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={
                        styles.therapyLabel
                      }
                    >
                      THERAPY
                    </Text>

                    <Text
                      style={
                        styles.therapyName
                      }
                    >
                      {booking.therapyName}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.sessionBadge
                    }
                  >
                    <Text
                      style={
                        styles.sessionBadgeText
                      }
                    >
                      {booking.sessionNumber}/
                      {booking.totalSessions}
                    </Text>
                  </View>
                </View>

                {/* DATE / TIME */}

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={GREEN}
                    />

                    <View>
                      <Text
                        style={
                          styles.infoLabel
                        }
                      >
                        Date
                      </Text>

                      <Text
                        style={
                          styles.infoValue
                        }
                      >
                        {formatDate(
                          booking.bookingDate
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={GREEN}
                    />

                    <View>
                      <Text
                        style={
                          styles.infoLabel
                        }
                      >
                        Time
                      </Text>

                      <Text
                        style={
                          styles.infoValue
                        }
                      >
                        {formatTimeRange(
                          booking.bookingTime,
                          booking.endTime
                        )}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* NOTES */}

                {booking.symptoms !== "-" && (
                  <View style={styles.notesBox}>
                    <Text
                      style={
                        styles.notesLabel
                      }
                    >
                      Patient Notes
                    </Text>

                    <Text
                      style={
                        styles.notesText
                      }
                      numberOfLines={2}
                    >
                      {booking.symptoms}
                    </Text>
                  </View>
                )}

                {/* ACTIONS */}

                <View
                  style={styles.actions}
                >
                  <TouchableOpacity
                    style={
                      styles.viewButton
                    }
                    onPress={() =>
                      setDetailsBooking(
                        booking
                      )
                    }
                  >
                    <Ionicons
                      name="eye-outline"
                      size={16}
                      color={GREEN}
                    />

                    <Text
                      style={
                        styles.viewButtonText
                      }
                    >
                      Details
                    </Text>
                  </TouchableOpacity>

                  {pending && (
                    <TouchableOpacity
                      style={
                        styles.approveButton
                      }
                      disabled={
                        Boolean(
                          actionLoading
                        )
                      }
                      onPress={() =>
                        approveBooking(
                          booking
                        )
                      }
                    >
                      {actionLoading ===
                      `approve-${booking.id}` ? (
                        <ActivityIndicator
                          size="small"
                          color={WHITE}
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-outline"
                            size={16}
                            color={WHITE}
                          />

                          <Text
                            style={
                              styles.approveButtonText
                            }
                          >
                            Approve
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {(pending ||
                    approved) && (
                    <TouchableOpacity
                      style={
                        styles.rescheduleButton
                      }
                      disabled={
                        Boolean(
                          actionLoading
                        )
                      }
                      onPress={() =>
                        openReschedule(
                          booking
                        )
                      }
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={BLUE}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* PAGINATION */}

        {filteredBookings.length >
          PAGE_SIZE && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[
                styles.pageButton,
                safePage <= 1 &&
                  styles.pageButtonDisabled,
              ]}
              disabled={safePage <= 1}
              onPress={() =>
                setCurrentPage((page) =>
                  Math.max(
                    1,
                    page - 1
                  )
                )
              }
            >
              <Ionicons
                name="chevron-back"
                size={17}
                color={GREEN}
              />
            </TouchableOpacity>

            <Text
              style={styles.pageText}
            >
              Page {safePage} of{" "}
              {totalPages}
            </Text>

            <TouchableOpacity
              style={[
                styles.pageButton,
                safePage >= totalPages &&
                  styles.pageButtonDisabled,
              ]}
              disabled={
                safePage >= totalPages
              }
              onPress={() =>
                setCurrentPage((page) =>
                  Math.min(
                    totalPages,
                    page + 1
                  )
                )
              }
            >
              <Ionicons
                name="chevron-forward"
                size={17}
                color={GREEN}
              />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* DRAWER */}

      <TherapistDrawer
        visible={drawerVisible}
        onClose={() =>
          setDrawerVisible(false)
        }
        activeRoute="/therapist/booking-requests"
      />

      {/* DETAILS MODAL */}

      <Modal
        visible={Boolean(detailsBooking)}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setDetailsBooking(null)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {detailsBooking && (
              <>
                <View
                  style={
                    styles.modalHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.modalTitle
                      }
                    >
                      Booking Details
                    </Text>

                    <Text
                      style={
                        styles.modalSubtitle
                      }
                    >
                      {
                        detailsBooking.bookingNumber
                      }
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.modalClose
                    }
                    onPress={() =>
                      setDetailsBooking(
                        null
                      )
                    }
                  >
                    <Ionicons
                      name="close"
                      size={21}
                      color={TEXT}
                    />
                  </TouchableOpacity>
                </View>

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
                        styles.detailAvatar
                      }
                    >
                      <Text
                        style={
                          styles.detailAvatarText
                        }
                      >
                        {detailsBooking.patientName
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={
                          styles.detailPatientName
                        }
                      >
                        {
                          detailsBooking.patientName
                        }
                      </Text>

                      <Text
                        style={
                          styles.detailPatientId
                        }
                      >
                        Patient ID:{" "}
                        {detailsBooking.patientId ??
                          "-"}
                      </Text>
                    </View>
                  </View>

                  <DetailRow
                    icon="sparkles-outline"
                    label="Therapy"
                    value={
                      detailsBooking.therapyName
                    }
                  />

                  <DetailRow
                    icon="calendar-outline"
                    label="Session Date"
                    value={formatDate(
                      detailsBooking.bookingDate
                    )}
                  />

                  <DetailRow
                    icon="time-outline"
                    label="Session Time"
                    value={formatTimeRange(
                      detailsBooking.bookingTime,
                      detailsBooking.endTime
                    )}
                  />

                  <DetailRow
                    icon="layers-outline"
                    label="Session"
                    value={`${detailsBooking.sessionNumber} of ${detailsBooking.totalSessions}`}
                  />

                  <DetailRow
                    icon="call-outline"
                    label="Phone"
                    value={
                      detailsBooking.patientPhone
                    }
                  />

                  <DetailRow
                    icon="mail-outline"
                    label="Email"
                    value={
                      detailsBooking.patientEmail
                    }
                  />

                  <DetailRow
                    icon="person-outline"
                    label="Age / Gender"
                    value={`${detailsBooking.patientAge} / ${formatLabel(
                      detailsBooking.patientGender
                    )}`}
                  />

                  <View
                    style={
                      styles.detailNotes
                    }
                  >
                    <Text
                      style={
                        styles.detailNotesTitle
                      }
                    >
                      Patient Notes
                    </Text>

                    <Text
                      style={
                        styles.detailNotesText
                      }
                    >
                      {
                        detailsBooking.symptoms
                      }
                    </Text>
                  </View>

                  {detailsBooking.rescheduleReason ? (
                    <View
                      style={
                        styles.rescheduleReason
                      }
                    >
                      <Text
                        style={
                          styles.rescheduleReasonTitle
                        }
                      >
                        Reschedule Reason
                      </Text>

                      <Text
                        style={
                          styles.rescheduleReasonText
                        }
                      >
                        {
                          detailsBooking.rescheduleReason
                        }
                      </Text>
                    </View>
                  ) : null}

                  {detailsBooking.status ===
                    "PENDING_APPROVAL" && (
                    <TouchableOpacity
                      style={
                        styles.modalApprove
                      }
                      onPress={() =>
                        approveBooking(
                          detailsBooking
                        )
                      }
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color={WHITE}
                      />

                      <Text
                        style={
                          styles.modalApproveText
                        }
                      >
                        Approve Session
                      </Text>
                    </TouchableOpacity>
                  )}

                  {(detailsBooking.status ===
                    "PENDING_APPROVAL" ||
                    detailsBooking.status ===
                      "APPROVED") && (
                    <TouchableOpacity
                      style={
                        styles.modalReschedule
                      }
                      onPress={() =>
                        openReschedule(
                          detailsBooking
                        )
                      }
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={BLUE}
                      />

                      <Text
                        style={
                          styles.modalRescheduleText
                        }
                      >
                        Reschedule
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* RESCHEDULE MODAL */}

      <Modal
        visible={Boolean(
          rescheduleBooking
        )}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setRescheduleBooking(null)
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={
              styles.rescheduleSheet
            }
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Reschedule Session
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  {rescheduleBooking
                    ?.bookingNumber || ""}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={() =>
                  setRescheduleBooking(
                    null
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={TEXT}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>
              New Date
            </Text>

            <TextInput
              style={styles.modalInput}
              value={
                rescheduleForm.date
              }
              onChangeText={(value) =>
                setRescheduleForm(
                  (current) => ({
                    ...current,
                    date: value,
                  })
                )
              }
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9AA49F"
            />

            <Text style={styles.inputLabel}>
              New Time
            </Text>

            <TextInput
              style={styles.modalInput}
              value={
                rescheduleForm.time
              }
              onChangeText={(value) =>
                setRescheduleForm(
                  (current) => ({
                    ...current,
                    time: value,
                  })
                )
              }
              placeholder="HH:MM"
              placeholderTextColor="#9AA49F"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <Text style={styles.inputLabel}>
              Reschedule Reason
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                styles.reasonInput,
              ]}
              value={
                rescheduleForm.reason
              }
              onChangeText={(value) =>
                setRescheduleForm(
                  (current) => ({
                    ...current,
                    reason: value,
                  })
                )
              }
              multiline
              textAlignVertical="top"
              placeholder="Enter reason for rescheduling..."
              placeholderTextColor="#9AA49F"
            />

            <TouchableOpacity
              style={[
                styles.confirmReschedule,
                Boolean(actionLoading) &&
                  styles.disabledButton,
              ]}
              disabled={
                Boolean(actionLoading)
              }
              onPress={
                submitReschedule
              }
            >
              {actionLoading.startsWith(
                "reschedule-"
              ) ? (
                <ActivityIndicator
                  size="small"
                  color={WHITE}
                />
              ) : (
                <>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={WHITE}
                  />

                  <Text
                    style={
                      styles.confirmRescheduleText
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
    </SafeAreaView>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  title,
  value,
  icon,
  background,
  iconColor,
}: {
  title: string;
  value: number;
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  background: string;
  iconColor: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View
        style={[
          styles.summaryIcon,
          { backgroundColor: background },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={iconColor}
        />
      </View>

      <View>
        <Text
          style={styles.summaryLabel}
        >
          {title}
        </Text>

        <Text
          style={styles.summaryValue}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   DETAIL ROW
========================================================= */

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailRowIcon}>
        <Ionicons
          name={icon}
          size={17}
          color={GREEN}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={styles.detailRowLabel}
        >
          {label}
        </Text>

        <Text
          style={styles.detailRowValue}
        >
          {value || "-"}
        </Text>
      </View>
    </View>
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

  scroll: {
    flex: 1,
  },

  content: {
    padding: 14,
    paddingBottom: 40,
  },

  hero: {
    backgroundColor: GREEN,
    borderRadius: 22,
    padding: 20,
    marginBottom: 12,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  eyebrow: {
    color: GOLD_LIGHT,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  heroTitle: {
    marginTop: 5,
    color: WHITE,
    fontSize: 22,
    fontWeight: "900",
  },

  heroText: {
    marginTop: 7,
    color: "rgba(255,255,255,0.78)",
    fontSize: 10,
    lineHeight: 17,
  },

  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor:
      "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  summaryCard: {
    width: "48.7%",
    minHeight: 82,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  summaryIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryLabel: {
    color: MUTED,
    fontSize: 8.5,
    fontWeight: "700",
  },

  summaryValue: {
    marginTop: 2,
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
  },

  statusTabs: {
    gap: 7,
    paddingBottom: 12,
  },

  statusTab: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  statusTabSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  statusTabText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "800",
  },

  statusTabTextSelected: {
    color: WHITE,
  },

  filterCard: {
    padding: 13,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  filterLabel: {
    color: TEXT,
    fontSize: 9,
    fontWeight: "800",
    marginBottom: 7,
    marginTop: 3,
  },

  searchBox: {
    minHeight: 46,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },

  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 10,
  },

  therapyChip: {
    minHeight: 35,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#F8FAF8",
    justifyContent: "center",
    marginRight: 6,
  },

  therapyChipSelected: {
    backgroundColor: MINT,
    borderColor: "#B8D4C7",
  },

  therapyChipText: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "700",
  },

  therapyChipTextSelected: {
    color: GREEN,
  },

  sectionHeading: {
    marginTop: 20,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    color: GREEN,
    fontSize: 16,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 8.5,
    marginTop: 3,
  },

  requestCount: {
    minWidth: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  requestCountText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "900",
  },

  loadingCard: {
    padding: 25,
    borderRadius: 17,
    backgroundColor: WHITE,
    alignItems: "center",
    gap: 8,
  },

  loadingText: {
    color: MUTED,
    fontSize: 9,
  },

  emptyCard: {
    padding: 30,
    borderRadius: 18,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },

  emptyIcon: {
    width: 55,
    height: 55,
    borderRadius: 17,
    backgroundColor: GOLD_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 12,
    color: GREEN,
    fontSize: 13,
    fontWeight: "900",
  },

  emptyText: {
    marginTop: 5,
    color: MUTED,
    fontSize: 9,
    textAlign: "center",
  },

  bookingCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 9,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  patientAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },

  patientAvatarText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
  },

  patientName: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900",
  },

  bookingNumber: {
    marginTop: 2,
    color: MUTED,
    fontSize: 8,
  },

  statusBadge: {
    maxWidth: 110,
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  statusBadgeText: {
    fontSize: 6.5,
    fontWeight: "900",
  },

  therapyBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 13,
    backgroundColor: "#F8FAF8",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  therapyIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: GOLD_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  therapyLabel: {
    color: MUTED,
    fontSize: 6.5,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  therapyName: {
    marginTop: 2,
    color: TEXT,
    fontSize: 10,
    fontWeight: "800",
  },

  sessionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: MINT,
  },

  sessionBadgeText: {
    color: GREEN,
    fontSize: 8,
    fontWeight: "900",
  },

  infoRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  infoItem: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
  },

  infoLabel: {
    color: MUTED,
    fontSize: 7,
  },

  infoValue: {
    marginTop: 2,
    color: TEXT,
    fontSize: 8.5,
    fontWeight: "800",
  },

  notesBox: {
    marginTop: 9,
    padding: 10,
    borderRadius: 11,
    backgroundColor: "#FBFAF5",
  },

  notesLabel: {
    color: GOLD,
    fontSize: 7,
    fontWeight: "900",
  },

  notesText: {
    marginTop: 3,
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
  },

  actions: {
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EDF1EE",
    flexDirection: "row",
    gap: 7,
  },

  viewButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: MINT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  viewButtonText: {
    color: GREEN,
    fontSize: 8.5,
    fontWeight: "900",
  },

  approveButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  approveButtonText: {
    color: WHITE,
    fontSize: 8.5,
    fontWeight: "900",
  },

  rescheduleButton: {
    width: 42,
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: BLUE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  pagination: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
  },

  pageButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  pageButtonDisabled: {
    opacity: 0.35,
  },

  pageText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,31,25,0.55)",
    justifyContent: "flex-end",
  },

  modalSheet: {
    maxHeight: "86%",
    backgroundColor: WHITE,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 18,
    paddingBottom: 30,
  },

  rescheduleSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 18,
    paddingBottom: 30,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },

  modalTitle: {
    color: GREEN,
    fontSize: 17,
    fontWeight: "900",
  },

  modalSubtitle: {
    marginTop: 2,
    color: MUTED,
    fontSize: 8,
  },

  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F3F5F3",
    alignItems: "center",
    justifyContent: "center",
  },

  detailPatient: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: MINT,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  detailAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },

  detailAvatarText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "900",
  },

  detailPatientName: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "900",
  },

  detailPatientId: {
    marginTop: 2,
    color: MUTED,
    fontSize: 8,
  },

  detailRow: {
    minHeight: 57,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF1EE",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  detailRowIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#F5F8F6",
    alignItems: "center",
    justifyContent: "center",
  },

  detailRowLabel: {
    color: MUTED,
    fontSize: 7.5,
  },

  detailRowValue: {
    marginTop: 2,
    color: TEXT,
    fontSize: 9.5,
    fontWeight: "800",
  },

  detailNotes: {
    marginTop: 12,
    padding: 12,
    borderRadius: 13,
    backgroundColor: "#F8FAF8",
  },

  detailNotesTitle: {
    color: GREEN,
    fontSize: 9,
    fontWeight: "900",
  },

  detailNotesText: {
    marginTop: 5,
    color: MUTED,
    fontSize: 9,
    lineHeight: 15,
  },

  rescheduleReason: {
    marginTop: 9,
    padding: 12,
    borderRadius: 13,
    backgroundColor: BLUE_LIGHT,
  },

  rescheduleReasonTitle: {
    color: BLUE,
    fontSize: 9,
    fontWeight: "900",
  },

  rescheduleReasonText: {
    marginTop: 4,
    color: MUTED,
    fontSize: 9,
    lineHeight: 14,
  },

  modalApprove: {
    marginTop: 15,
    minHeight: 47,
    borderRadius: 13,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  modalApproveText: {
    color: WHITE,
    fontSize: 9.5,
    fontWeight: "900",
  },

  modalReschedule: {
    marginTop: 8,
    minHeight: 47,
    borderRadius: 13,
    backgroundColor: BLUE_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  modalRescheduleText: {
    color: BLUE,
    fontSize: 9.5,
    fontWeight: "900",
  },

  inputLabel: {
    color: TEXT,
    fontSize: 9,
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 5,
  },

  modalInput: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    fontSize: 10,
    marginBottom: 10,
  },

  reasonInput: {
    height: 95,
    paddingTop: 12,
  },

  confirmReschedule: {
    marginTop: 5,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  confirmRescheduleText: {
    color: WHITE,
    fontSize: 9.5,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.55,
  },
});