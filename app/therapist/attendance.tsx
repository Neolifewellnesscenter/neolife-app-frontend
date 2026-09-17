// app/therapist/attendance.tsx

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

const API_BASE_URL = "http://192.168.137.1:8085/api";

const GREEN = "#123E32";
const MINT = "#EAF4EF";
const CREAM = "#F8F5ED";
const WHITE = "#FFFFFF";
const GOLD = "#B8923B";
const GOLD_LIGHT = "#F7EECF";
const TEXT = "#20342D";
const MUTED = "#718078";
const BORDER = "#DFE6E1";

const RED = "#B94B4B";
const RED_LIGHT = "#FDECEC";

const BLUE = "#356C91";
const BLUE_LIGHT = "#EAF3F8";

const ORANGE = "#B26A24";
const ORANGE_LIGHT = "#FFF2E4";

type Session = {
  id: number | string | null;

  sessionNumberCode: string;

  treatmentPlanId: number | string | null;

  patientId: number | string | null;

  patientName: string;

  patientPhone: string;

  patientAge: string | number;

  patientGender: string;

  therapyName: string;

  sessionDate: string;

  sessionTime: string;

  endTime: string;

  sessionNumber: number;

  totalSessions: number;

  attendance: string;

  status: string;

  symptoms: string;

  medicalHistory: string;

  treatmentPerformed: string;

  patientResponse: string;

  progressNotes: string;

  advice: string;

  nextSessionDate: string | null;

  missedReason: string | null;

  patientNotes: string;

  therapistNotes: string;

  rescheduleReason: string;

  approvedAt: string | null;

  completedAt: string | null;

  missedAt: string | null;

  createdAt: string | null;

  updatedAt: string | null;
};

type TherapistProfile = {
  id?: number | string | null;

  name?: string;

  therapistName?: string;

  specialization?: string;
};

/* =========================================================
   AUTH
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
      message:
        text ||
        `Invalid server response (${response.status}).`,
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

    throw new Error(
      "Therapist login required."
    );
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,

      headers: {
        Accept: "application/json",

        ...(options.body
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),

        Authorization: `Bearer ${token}`,

        ...(options.headers || {}),
      },
    }
  );

  const result =
    await readResponse(response);

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    await clearTherapistSession();

    router.replace("/" as any);

    throw new Error(
      result?.message ||
        "Therapist session expired. Please log in again."
    );
  }

  if (
    !response.ok ||
    result?.success === false
  ) {
    throw new Error(
      result?.message ||
        `Request failed (${response.status}).`
    );
  }

  return result;
}

/* =========================================================
   HELPERS
========================================================= */

function extractArray(data: any) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.sessions)) {
    return data.sessions;
  }

  if (Array.isArray(data?.content)) {
    return data.content;
  }

  return [];
}

function normalizeSession(
  item: any = {}
): Session {
  const status = String(
    item.status || "PENDING_APPROVAL"
  ).toUpperCase();

  return {
    id:
      item.id ??
      item.sessionId ??
      null,

    sessionNumberCode: `SES-${
      item.id ??
      item.sessionId ??
      "-"
    }`,

    treatmentPlanId:
      item.treatmentPlanId ?? null,

    patientId:
      item.patientId ?? null,

    patientName:
      item.patientName || "Patient",

    patientPhone:
      item.phoneNumber ||
      item.patientPhone ||
      "-",

    patientAge:
      item.age ?? "-",

    patientGender: String(
      item.gender || "-"
    ).toUpperCase(),

    therapyName:
      item.treatmentName ||
      item.therapyName ||
      "Therapy",

    sessionDate:
      item.sessionDate ||
      item.treatmentDate ||
      item.date ||
      "",

    sessionTime:
      item.startTime ||
      item.sessionTime ||
      item.treatmentTime ||
      item.time ||
      "",

    endTime:
      item.endTime || "",

    sessionNumber: Number(
      item.sessionNumber || 1
    ),

    totalSessions: Number(
      item.totalSessions || 1
    ),

    attendance:
      status === "COMPLETED"
        ? "PRESENT"
        : status === "MISSED"
        ? "ABSENT"
        : "PENDING",

    status,

    symptoms:
      item.patientNotes ||
      item.symptoms ||
      "-",

    medicalHistory:
      "Refer to patient history",

    treatmentPerformed:
      item.therapistNotes || "-",

    patientResponse: "-",

    progressNotes:
      item.therapistNotes || "-",

    advice: "-",

    nextSessionDate: null,

    missedReason:
      item.rescheduleReason || null,

    patientNotes:
      item.patientNotes || "",

    therapistNotes:
      item.therapistNotes || "",

    rescheduleReason:
      item.rescheduleReason || "",

    approvedAt:
      item.approvedAt || null,

    completedAt:
      item.completedAt || null,

    missedAt:
      item.missedAt || null,

    createdAt:
      item.createdAt || null,

    updatedAt:
      item.updatedAt || null,
  };
}

function todayString() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(
      today.getMonth() + 1
    ).padStart(2, "0"),
    String(
      today.getDate()
    ).padStart(2, "0"),
  ].join("-");
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(
    value.includes("T")
      ? value
      : `${value}T00:00:00`
  );

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTime(value: string) {
  if (!value) return "-";

  const parts =
    String(value).split(":");

  if (parts.length < 2) {
    return value;
  }

  const date = new Date();

  date.setHours(
    Number(parts[0]),
    Number(parts[1]),
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

function formatLabel(value: string) {
  if (!value) return "-";

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function progressPercent(
  session: Session
) {
  if (!session.totalSessions) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (Number(
        session.sessionNumber || 0
      ) /
        Number(
          session.totalSessions || 1
        )) *
        100
    )
  );
}

function canUpdateAttendance(
  session: Session
) {
  return [
    "APPROVED",
    "RESCHEDULED",
    "SCHEDULED",
    "IN_PROGRESS",
  ].includes(session.status);
}

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function TherapistAttendanceScreen() {
  const [
    drawerVisible,
    setDrawerVisible,
  ] = useState(false);

  const [
    therapist,
    setTherapist,
  ] =
    useState<TherapistProfile>({
      name: "Therapist",
      specialization: "Therapist",
    });

  const [
    sessions,
    setSessions,
  ] = useState<Session[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState("");

  const [
    selectedMainFilter,
    setSelectedMainFilter,
  ] = useState("TODAY");

  const [search, setSearch] =
    useState("");

  const [
    therapyFilter,
    setTherapyFilter,
  ] = useState("");

  const [
    customDate,
    setCustomDate,
  ] = useState("");

  const [
    detailsSession,
    setDetailsSession,
  ] = useState<Session | null>(
    null
  );

  const [
    completeSession,
    setCompleteSession,
  ] = useState<Session | null>(
    null
  );

  const [
    missedSession,
    setMissedSession,
  ] = useState<Session | null>(
    null
  );

  /* =====================================================
     LOAD PROFILE
  ===================================================== */

  const loadProfile =
    useCallback(async () => {
      const storedName =
        (await AsyncStorage.getItem(
          "therapistName"
        )) ||
        (await AsyncStorage.getItem(
          "userName"
        )) ||
        (await AsyncStorage.getItem(
          "name"
        )) ||
        "Therapist";

      try {
        const result =
          await therapistApi(
            "/therapists/me"
          );

        const profile =
          result?.data || {};

        const next = {
          ...profile,

          name:
            profile.name ||
            profile.therapistName ||
            storedName,

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
          next.name
        );

        await AsyncStorage.setItem(
          "therapistProfile",
          JSON.stringify(next)
        );
      } catch (error: any) {
        console.log(
          "Therapist profile:",
          error?.message
        );
      }
    }, []);

  /* =====================================================
     LOAD ATTENDANCE
  ===================================================== */

  const loadSchedule =
    useCallback(async () => {
      try {
        const result =
          await therapistApi(
            "/daily-treatments/therapist/my-sessions"
          );

        const next =
          extractArray(result?.data)
            .map(normalizeSession)
            .sort(
              (
                first: Session,
                second: Session
              ) => {
                const a =
                  new Date(
                    `${
                      first.sessionDate ||
                      "2099-01-01"
                    }T${
                      first.sessionTime ||
                      "00:00:00"
                    }`
                  );

                const b =
                  new Date(
                    `${
                      second.sessionDate ||
                      "2099-01-01"
                    }T${
                      second.sessionTime ||
                      "00:00:00"
                    }`
                  );

                return (
                  a.getTime() -
                  b.getTime()
                );
              }
            );

        setSessions(next);
      } catch (error: any) {
        setSessions([]);

        Alert.alert(
          "Attendance",
          error?.message ||
            "Unable to load attendance sessions."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    const initialize =
      async () => {
        const token =
          await getToken();

        if (!token) {
          router.replace(
            "/" as any
          );

          return;
        }

        await Promise.allSettled([
          loadProfile(),
          loadSchedule(),
        ]);
      };

    initialize();
  }, [
    loadProfile,
    loadSchedule,
  ]);

  /* =====================================================
     REFRESH
  ===================================================== */

  const onRefresh =
    async () => {
      setRefreshing(true);

      try {
        await Promise.allSettled([
          loadProfile(),
          loadSchedule(),
        ]);
      } finally {
        setRefreshing(false);
      }
    };

  /* =====================================================
     SUMMARY
  ===================================================== */

  const summary =
    useMemo(() => {
      const today =
        todayString();

      return {
        today:
          sessions.filter(
            (session) =>
              session.sessionDate ===
              today
          ).length,

        present:
          sessions.filter(
            (session) =>
              session.attendance ===
              "PRESENT"
          ).length,

        pending:
          sessions.filter(
            (session) =>
              session.attendance ===
              "PENDING"
          ).length,

        completed:
          sessions.filter(
            (session) =>
              session.status ===
              "COMPLETED"
          ).length,

        missed:
          sessions.filter(
            (session) =>
              session.status ===
              "MISSED"
          ).length,
      };
    }, [sessions]);

  /* =====================================================
     THERAPIES
  ===================================================== */

  const therapies =
    useMemo(
      () =>
        [
          ...new Set(
            sessions
              .map(
                (session) =>
                  session.therapyName
              )
              .filter(Boolean)
          ),
        ].sort(),
      [sessions]
    );

  /* =====================================================
     FILTER
  ===================================================== */

  const filteredSessions =
    useMemo(() => {
      const cleanSearch =
        search
          .trim()
          .toLowerCase();

      return sessions.filter(
        (session) => {
          const matchesSearch =
            !cleanSearch ||
            session.patientName
              .toLowerCase()
              .includes(
                cleanSearch
              ) ||
            session.sessionNumberCode
              .toLowerCase()
              .includes(
                cleanSearch
              ) ||
            session.therapyName
              .toLowerCase()
              .includes(
                cleanSearch
              );

          const matchesTherapy =
            !therapyFilter ||
            session.therapyName ===
              therapyFilter;

          let matchesMain = true;

          if (customDate) {
            matchesMain =
              session.sessionDate ===
              customDate;
          } else {
            switch (
              selectedMainFilter
            ) {
              case "TODAY":
                matchesMain =
                  session.sessionDate ===
                  todayString();

                break;

              case "PENDING":
                matchesMain =
                  session.attendance ===
                  "PENDING";

                break;

              case "PRESENT":
                matchesMain =
                  session.attendance ===
                  "PRESENT";

                break;

              case "COMPLETED":
                matchesMain =
                  session.status ===
                  "COMPLETED";

                break;

              case "MISSED":
                matchesMain =
                  session.status ===
                  "MISSED";

                break;

              case "ALL":
              default:
                matchesMain = true;
            }
          }

          return (
            matchesSearch &&
            matchesTherapy &&
            matchesMain
          );
        }
      );
    }, [
      sessions,
      search,
      therapyFilter,
      selectedMainFilter,
      customDate,
    ]);

  /* =====================================================
     COMPLETE
  ===================================================== */

  const completeTreatment =
    async () => {
      if (
        !completeSession?.id
      ) {
        return;
      }

      setActionLoading(
        `complete-${completeSession.id}`
      );

      try {
        const result =
          await therapistApi(
            `/daily-treatments/${encodeURIComponent(
              String(
                completeSession.id
              )
            )}/complete`,
            {
              method: "PUT",
            }
          );

        setCompleteSession(
          null
        );

        setDetailsSession(null);

        await loadSchedule();

        Alert.alert(
          "Attendance Updated",
          result?.message ||
            "Session completed and attendance marked present."
        );
      } catch (error: any) {
        Alert.alert(
          "Unable to Complete",
          error?.message ||
            "Session could not be completed."
        );
      } finally {
        setActionLoading("");
      }
    };

  /* =====================================================
     MISSED
  ===================================================== */

  const markMissed =
    async () => {
      if (!missedSession?.id) {
        return;
      }

      setActionLoading(
        `missed-${missedSession.id}`
      );

      try {
        const result =
          await therapistApi(
            `/daily-treatments/${encodeURIComponent(
              String(
                missedSession.id
              )
            )}/mark-missed`,
            {
              method: "PUT",
            }
          );

        setMissedSession(null);

        setDetailsSession(null);

        await loadSchedule();

        Alert.alert(
          "Attendance Updated",
          result?.message ||
            "Session marked as missed."
        );
      } catch (error: any) {
        Alert.alert(
          "Unable to Update",
          error?.message ||
            "Unable to mark session as missed."
        );
      } finally {
        setActionLoading("");
      }
    };

  /* =====================================================
     HEADING
  ===================================================== */

  const heading =
    useMemo(() => {
      if (customDate) {
        return {
          title: `Attendance for ${formatDate(
            customDate
          )}`,

          subtitle:
            "Therapy sessions scheduled for the selected date.",
        };
      }

      switch (
        selectedMainFilter
      ) {
        case "PENDING":
          return {
            title:
              "Pending Attendance",

            subtitle:
              "Sessions waiting to be completed or marked missed.",
          };

        case "PRESENT":
          return {
            title:
              "Present Sessions",

            subtitle:
              "Sessions whose attendance is recorded as present.",
          };

        case "COMPLETED":
          return {
            title:
              "Completed Therapy Sessions",

            subtitle:
              "Therapy sessions already marked completed.",
          };

        case "MISSED":
          return {
            title:
              "Missed Therapy Sessions",

            subtitle:
              "Therapy sessions recorded as missed.",
          };

        case "ALL":
          return {
            title:
              "All Attendance & Sessions",

            subtitle:
              "Every therapy session assigned to you.",
          };

        case "TODAY":
        default:
          return {
            title:
              "Today's Attendance",

            subtitle:
              "Update attendance and complete today's therapy sessions.",
          };
      }
    }, [
      selectedMainFilter,
      customDate,
    ]);

  return (
    <SafeAreaView
      style={styles.screen}
    >
      <TherapistHeader
        title="Attendance & Sessions"
        subtitle="Track treatment attendance."
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
        style={{ flex: 1 }}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={onRefresh}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
      >
        {/* HERO */}

        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text
              style={styles.eyebrow}
            >
              TREATMENT OPERATIONS
            </Text>

            <Text
              style={
                styles.heroTitle
              }
            >
              Attendance & Sessions
            </Text>

            <Text
              style={
                styles.heroText
              }
            >
              Track patient attendance
              and update therapy
              sessions after treatment.
            </Text>
          </View>

          <View
            style={styles.heroIcon}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={27}
              color={GOLD_LIGHT}
            />
          </View>
        </View>

        {/* SUMMARY */}

        <View
          style={
            styles.summaryGrid
          }
        >
          <SummaryCard
            title="Today's Sessions"
            value={summary.today}
            icon="calendar-outline"
            background={
              BLUE_LIGHT
            }
            color={BLUE}
          />

          <SummaryCard
            title="Present"
            value={summary.present}
            icon="checkmark-circle-outline"
            background={MINT}
            color={GREEN}
          />

          <SummaryCard
            title="Pending"
            value={summary.pending}
            icon="time-outline"
            background={
              ORANGE_LIGHT
            }
            color={ORANGE}
          />

          <SummaryCard
            title="Completed"
            value={
              summary.completed
            }
            icon="shield-checkmark-outline"
            background={MINT}
            color={GREEN}
          />

          <SummaryCard
            title="Missed"
            value={summary.missed}
            icon="close-circle-outline"
            background={
              RED_LIGHT
            }
            color={RED}
          />
        </View>

        {/* MAIN FILTER */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.tabs
          }
        >
          {[
            ["TODAY", "Today"],
            ["PENDING", "Pending"],
            ["PRESENT", "Present"],
            [
              "COMPLETED",
              "Completed",
            ],
            ["MISSED", "Missed"],
            ["ALL", "All"],
          ].map(
            ([value, label]) => {
              const selected =
                selectedMainFilter ===
                  value &&
                !customDate;

              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.tab,
                    selected &&
                      styles.tabSelected,
                  ]}
                  onPress={() => {
                    setSelectedMainFilter(
                      value
                    );

                    setCustomDate("");
                  }}
                >
                  <Text
                    style={[
                      styles.tabText,
                      selected &&
                        styles.tabTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>

        {/* FILTER PANEL */}

        <View
          style={
            styles.filterPanel
          }
        >
          <Text
            style={
              styles.filterLabel
            }
          >
            Search
          </Text>

          <View
            style={styles.searchBox}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={MUTED}
            />

            <TextInput
              value={search}
              onChangeText={setSearch}
              style={
                styles.searchInput
              }
              placeholder="Patient, therapy or session ID"
              placeholderTextColor="#9BA59F"
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

          <Text
            style={
              styles.filterLabel
            }
          >
            Date
          </Text>

          <TextInput
            value={customDate}
            onChangeText={
              setCustomDate
            }
            style={
              styles.dateInput
            }
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9BA59F"
          />

          {therapies.length >
            0 && (
            <>
              <Text
                style={
                  styles.filterLabel
                }
              >
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
                      styles.therapySelected,
                  ]}
                  onPress={() =>
                    setTherapyFilter(
                      ""
                    )
                  }
                >
                  <Text
                    style={[
                      styles.therapyText,
                      !therapyFilter &&
                        styles.therapyTextSelected,
                    ]}
                  >
                    All Therapies
                  </Text>
                </TouchableOpacity>

                {therapies.map(
                  (therapy) => {
                    const selected =
                      therapyFilter ===
                      therapy;

                    return (
                      <TouchableOpacity
                        key={therapy}
                        style={[
                          styles.therapyChip,
                          selected &&
                            styles.therapySelected,
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
                            styles.therapyText,
                            selected &&
                              styles.therapyTextSelected,
                          ]}
                        >
                          {therapy}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </ScrollView>
            </>
          )}
        </View>

        {/* HEADING */}

        <View
          style={styles.heading}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={
                styles.headingTitle
              }
            >
              {heading.title}
            </Text>

            <Text
              style={
                styles.headingText
              }
            >
              {heading.subtitle}
            </Text>
          </View>

          <View
            style={styles.count}
          >
            <Text
              style={
                styles.countText
              }
            >
              {
                filteredSessions.length
              }
            </Text>
          </View>
        </View>

        {/* SESSION LIST */}

        {loading ? (
          <View
            style={styles.emptyCard}
          >
            <ActivityIndicator
              color={GREEN}
            />

            <Text
              style={
                styles.emptyText
              }
            >
              Loading attendance...
            </Text>
          </View>
        ) : filteredSessions.length ===
          0 ? (
          <View
            style={styles.emptyCard}
          >
            <View
              style={styles.emptyIcon}
            >
              <Ionicons
                name="clipboard-outline"
                size={28}
                color={GOLD}
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No Sessions Found
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              No therapy sessions
              match the selected
              attendance filters.
            </Text>
          </View>
        ) : (
          filteredSessions.map(
            (session) => (
              <AttendanceCard
                key={String(
                  session.id
                )}
                session={session}
                onDetails={() =>
                  setDetailsSession(
                    session
                  )
                }
                onComplete={() =>
                  setCompleteSession(
                    session
                  )
                }
                onMissed={() =>
                  setMissedSession(
                    session
                  )
                }
              />
            )
          )
        )}
      </ScrollView>

      <TherapistDrawer
        visible={drawerVisible}
        onClose={() =>
          setDrawerVisible(false)
        }
        activeRoute="/therapist/attendance"
      />

      {/* DETAILS */}

      <Modal
        transparent
        animationType="slide"
        visible={Boolean(
          detailsSession
        )}
        onRequestClose={() =>
          setDetailsSession(null)
        }
      >
        <View
          style={styles.overlay}
        >
          <View
            style={styles.sheet}
          >
            {detailsSession && (
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
                      Session Details
                    </Text>

                    <Text
                      style={
                        styles.modalSub
                      }
                    >
                      {
                        detailsSession.sessionNumberCode
                      }
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.closeButton
                    }
                    onPress={() =>
                      setDetailsSession(
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
                  <DetailRow
                    icon="person-outline"
                    label="Patient"
                    value={
                      detailsSession.patientName
                    }
                  />

                  <DetailRow
                    icon="sparkles-outline"
                    label="Therapy"
                    value={
                      detailsSession.therapyName
                    }
                  />

                  <DetailRow
                    icon="calendar-outline"
                    label="Date"
                    value={formatDate(
                      detailsSession.sessionDate
                    )}
                  />

                  <DetailRow
                    icon="time-outline"
                    label="Time"
                    value={`${formatTime(
                      detailsSession.sessionTime
                    )}${
                      detailsSession.endTime
                        ? ` - ${formatTime(
                            detailsSession.endTime
                          )}`
                        : ""
                    }`}
                  />

                  <DetailRow
                    icon="layers-outline"
                    label="Progress"
                    value={`Session ${detailsSession.sessionNumber} of ${detailsSession.totalSessions}`}
                  />

                  <DetailRow
                    icon="checkmark-circle-outline"
                    label="Attendance"
                    value={
                      detailsSession.attendance
                    }
                  />

                  <DetailRow
                    icon="information-circle-outline"
                    label="Session Status"
                    value={formatLabel(
                      detailsSession.status
                    )}
                  />

                  <DetailRow
                    icon="call-outline"
                    label="Phone"
                    value={
                      detailsSession.patientPhone
                    }
                  />

                  {detailsSession.patientNotes ? (
                    <View
                      style={
                        styles.notesBox
                      }
                    >
                      <Text
                        style={
                          styles.notesTitle
                        }
                      >
                        Patient Notes
                      </Text>

                      <Text
                        style={
                          styles.notesText
                        }
                      >
                        {
                          detailsSession.patientNotes
                        }
                      </Text>
                    </View>
                  ) : null}

                  {detailsSession.therapistNotes ? (
                    <View
                      style={
                        styles.notesBox
                      }
                    >
                      <Text
                        style={
                          styles.notesTitle
                        }
                      >
                        Therapist Notes
                      </Text>

                      <Text
                        style={
                          styles.notesText
                        }
                      >
                        {
                          detailsSession.therapistNotes
                        }
                      </Text>
                    </View>
                  ) : null}

                  {canUpdateAttendance(
                    detailsSession
                  ) && (
                    <View
                      style={
                        styles.modalActions
                      }
                    >
                      <TouchableOpacity
                        style={
                          styles.completeButton
                        }
                        onPress={() => {
                          const current =
                            detailsSession;

                          setDetailsSession(
                            null
                          );

                          setCompleteSession(
                            current
                          );
                        }}
                      >
                        <Text
                          style={
                            styles.completeButtonText
                          }
                        >
                          Complete
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={
                          styles.missedAction
                        }
                        onPress={() => {
                          const current =
                            detailsSession;

                          setDetailsSession(
                            null
                          );

                          setMissedSession(
                            current
                          );
                        }}
                      >
                        <Text
                          style={
                            styles.missedActionText
                          }
                        >
                          Mark Missed
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* COMPLETE CONFIRMATION */}

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(
          completeSession
        )}
        onRequestClose={() =>
          setCompleteSession(null)
        }
      >
        <View
          style={
            styles.centerOverlay
          }
        >
          <View
            style={
              styles.confirmCard
            }
          >
            <View
              style={[
                styles.confirmIcon,
                {
                  backgroundColor:
                    MINT,
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={32}
                color={GREEN}
              />
            </View>

            <Text
              style={
                styles.confirmTitle
              }
            >
              Complete Session?
            </Text>

            <Text
              style={
                styles.confirmText
              }
            >
              This will mark{" "}
              {
                completeSession?.patientName
              }
              's session as completed
              and attendance as present.
            </Text>

            <TouchableOpacity
              style={
                styles.confirmComplete
              }
              disabled={Boolean(
                actionLoading
              )}
              onPress={
                completeTreatment
              }
            >
              {actionLoading.startsWith(
                "complete-"
              ) ? (
                <ActivityIndicator
                  color={WHITE}
                />
              ) : (
                <Text
                  style={
                    styles.confirmCompleteText
                  }
                >
                  Complete Session
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.cancelButton
              }
              onPress={() =>
                setCompleteSession(
                  null
                )
              }
            >
              <Text
                style={
                  styles.cancelText
                }
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MISSED CONFIRMATION */}

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(
          missedSession
        )}
        onRequestClose={() =>
          setMissedSession(null)
        }
      >
        <View
          style={
            styles.centerOverlay
          }
        >
          <View
            style={
              styles.confirmCard
            }
          >
            <View
              style={[
                styles.confirmIcon,
                {
                  backgroundColor:
                    RED_LIGHT,
                },
              ]}
            >
              <Ionicons
                name="close-circle-outline"
                size={32}
                color={RED}
              />
            </View>

            <Text
              style={
                styles.confirmTitle
              }
            >
              Mark Session Missed?
            </Text>

            <Text
              style={
                styles.confirmText
              }
            >
              This will record{" "}
              {
                missedSession?.patientName
              }
              's attendance as absent
              for this therapy session.
            </Text>

            <TouchableOpacity
              style={
                styles.confirmMissed
              }
              disabled={Boolean(
                actionLoading
              )}
              onPress={markMissed}
            >
              {actionLoading.startsWith(
                "missed-"
              ) ? (
                <ActivityIndicator
                  color={WHITE}
                />
              ) : (
                <Text
                  style={
                    styles.confirmCompleteText
                  }
                >
                  Mark as Missed
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.cancelButton
              }
              onPress={() =>
                setMissedSession(
                  null
                )
              }
            >
              <Text
                style={
                  styles.cancelText
                }
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* =========================================================
   ATTENDANCE CARD
========================================================= */

function AttendanceCard({
  session,
  onDetails,
  onComplete,
  onMissed,
}: {
  session: Session;

  onDetails: () => void;

  onComplete: () => void;

  onMissed: () => void;
}) {
  const progress =
    progressPercent(session);

  const present =
    session.attendance ===
    "PRESENT";

  const absent =
    session.attendance ===
    "ABSENT";

  const attendanceBackground =
    present
      ? MINT
      : absent
      ? RED_LIGHT
      : ORANGE_LIGHT;

  const attendanceColor =
    present
      ? GREEN
      : absent
      ? RED
      : ORANGE;

  return (
    <View
      style={styles.sessionCard}
    >
      <View
        style={styles.cardTop}
      >
        <View
          style={styles.avatar}
        >
          <Text
            style={
              styles.avatarText
            }
          >
            {session.patientName
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
            {session.patientName}
          </Text>

          <Text
            style={
              styles.sessionCode
            }
          >
            {
              session.sessionNumberCode
            }
          </Text>
        </View>

        <View
          style={[
            styles.attendanceBadge,
            {
              backgroundColor:
                attendanceBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.attendanceText,
              {
                color:
                  attendanceColor,
              },
            ]}
          >
            {session.attendance}
          </Text>
        </View>
      </View>

      <View
        style={styles.therapyBox}
      >
        <Ionicons
          name="sparkles-outline"
          size={17}
          color={GOLD}
        />

        <View style={{ flex: 1 }}>
          <Text
            style={
              styles.smallLabel
            }
          >
            THERAPY
          </Text>

          <Text
            style={
              styles.therapyName
            }
          >
            {session.therapyName}
          </Text>
        </View>

        <Text
          style={
            styles.progressNumber
          }
        >
          {session.sessionNumber}/
          {session.totalSessions}
        </Text>
      </View>

      <View
        style={styles.progressArea}
      >
        <View
          style={
            styles.progressHeader
          }
        >
          <Text
            style={
              styles.progressLabel
            }
          >
            Treatment Progress
          </Text>

          <Text
            style={
              styles.progressValue
            }
          >
            {progress}%
          </Text>
        </View>

        <View
          style={styles.progressTrack}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
              },
            ]}
          />
        </View>
      </View>

      <View
        style={styles.scheduleRow}
      >
        <View
          style={styles.scheduleItem}
        >
          <Ionicons
            name="calendar-outline"
            size={15}
            color={GREEN}
          />

          <Text
            style={
              styles.scheduleText
            }
          >
            {formatDate(
              session.sessionDate
            )}
          </Text>
        </View>

        <View
          style={styles.scheduleItem}
        >
          <Ionicons
            name="time-outline"
            size={15}
            color={GREEN}
          />

          <Text
            style={
              styles.scheduleText
            }
          >
            {formatTime(
              session.sessionTime
            )}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={
            styles.detailsButton
          }
          onPress={onDetails}
        >
          <Ionicons
            name="eye-outline"
            size={16}
            color={GREEN}
          />

          <Text
            style={
              styles.detailsButtonText
            }
          >
            Details
          </Text>
        </TouchableOpacity>

        {canUpdateAttendance(
          session
        ) && (
          <>
            <TouchableOpacity
              style={
                styles.completeButton
              }
              onPress={onComplete}
            >
              <Ionicons
                name="checkmark-outline"
                size={16}
                color={WHITE}
              />

              <Text
                style={
                  styles.completeButtonText
                }
              >
                Complete
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.missedButton
              }
              onPress={onMissed}
            >
              <Ionicons
                name="close-outline"
                size={18}
                color={RED}
              />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
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
  color,
}: {
  title: string;

  value: number;

  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];

  background: string;

  color: string;
}) {
  return (
    <View
      style={styles.summaryCard}
    >
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor:
              background,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={color}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={
            styles.summaryLabel
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.summaryValue
          }
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
    <View
      style={styles.detailRow}
    >
      <View
        style={styles.detailIcon}
      >
        <Ionicons
          name={icon}
          size={17}
          color={GREEN}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={
            styles.detailLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.detailValue
          }
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

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: CREAM,
    },

    content: {
      padding: 14,
      paddingBottom: 40,
    },

    hero: {
      backgroundColor: GREEN,
      borderRadius: 22,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    eyebrow: {
      color: GOLD_LIGHT,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.1,
    },

    heroTitle: {
      color: WHITE,
      fontSize: 21,
      fontWeight: "900",
      marginTop: 5,
    },

    heroText: {
      color:
        "rgba(255,255,255,0.78)",
      fontSize: 9,
      lineHeight: 15,
      marginTop: 6,
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
      marginTop: 12,
    },

    summaryCard: {
      width: "48.7%",
      minHeight: 79,
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 16,
      padding: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },

    summaryIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },

    summaryLabel: {
      color: MUTED,
      fontSize: 7.5,
      fontWeight: "700",
    },

    summaryValue: {
      color: TEXT,
      fontSize: 17,
      fontWeight: "900",
      marginTop: 2,
    },

    tabs: {
      gap: 7,
      paddingVertical: 12,
    },

    tab: {
      minHeight: 38,
      paddingHorizontal: 14,
      borderRadius: 11,
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
      justifyContent: "center",
    },

    tabSelected: {
      backgroundColor: GREEN,
      borderColor: GREEN,
    },

    tabText: {
      color: MUTED,
      fontSize: 8.5,
      fontWeight: "800",
    },

    tabTextSelected: {
      color: WHITE,
    },

    filterPanel: {
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 16,
      padding: 12,
    },

    filterLabel: {
      color: TEXT,
      fontSize: 8,
      fontWeight: "800",
      marginBottom: 6,
      marginTop: 5,
    },

    searchBox: {
      minHeight: 45,
      backgroundColor:
        "#F8FAF8",
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 11,
    },

    searchInput: {
      flex: 1,
      color: TEXT,
      fontSize: 9.5,
    },

    dateInput: {
      height: 44,
      backgroundColor:
        "#F8FAF8",
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 12,
      paddingHorizontal: 11,
      color: TEXT,
      fontSize: 9.5,
      marginBottom: 5,
    },

    therapyChip: {
      height: 34,
      paddingHorizontal: 11,
      borderRadius: 10,
      backgroundColor:
        "#F8FAF8",
      borderWidth: 1,
      borderColor: BORDER,
      justifyContent: "center",
      marginRight: 6,
    },

    therapySelected: {
      backgroundColor: MINT,
      borderColor: "#BBD7C9",
    },

    therapyText: {
      color: MUTED,
      fontSize: 8,
      fontWeight: "700",
    },

    therapyTextSelected: {
      color: GREEN,
    },

    heading: {
      marginTop: 19,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    headingTitle: {
      color: GREEN,
      fontSize: 15,
      fontWeight: "900",
    },

    headingText: {
      color: MUTED,
      fontSize: 8,
      lineHeight: 13,
      marginTop: 3,
    },

    count: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: MINT,
      alignItems: "center",
      justifyContent: "center",
    },

    countText: {
      color: GREEN,
      fontSize: 11,
      fontWeight: "900",
    },

    emptyCard: {
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 18,
      padding: 29,
      alignItems: "center",
      gap: 8,
    },

    emptyIcon: {
      width: 53,
      height: 53,
      borderRadius: 16,
      backgroundColor:
        GOLD_LIGHT,
      alignItems: "center",
      justifyContent: "center",
    },

    emptyTitle: {
      color: GREEN,
      fontSize: 13,
      fontWeight: "900",
    },

    emptyText: {
      color: MUTED,
      fontSize: 8.5,
      textAlign: "center",
    },

    sessionCard: {
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 18,
      padding: 14,
      marginBottom: 9,
    },

    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },

    avatar: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: GREEN,
      alignItems: "center",
      justifyContent: "center",
    },

    avatarText: {
      color: WHITE,
      fontSize: 15,
      fontWeight: "900",
    },

    patientName: {
      color: TEXT,
      fontSize: 12,
      fontWeight: "900",
    },

    sessionCode: {
      color: MUTED,
      fontSize: 8,
      marginTop: 2,
    },

    attendanceBadge: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 999,
    },

    attendanceText: {
      fontSize: 6.5,
      fontWeight: "900",
    },

    therapyBox: {
      marginTop: 11,
      padding: 10,
      borderRadius: 12,
      backgroundColor:
        "#F8FAF8",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    smallLabel: {
      color: MUTED,
      fontSize: 6,
      fontWeight: "900",
      letterSpacing: 0.5,
    },

    therapyName: {
      color: TEXT,
      fontSize: 10,
      fontWeight: "800",
      marginTop: 2,
    },

    progressNumber: {
      color: GREEN,
      fontSize: 8,
      fontWeight: "900",
      backgroundColor: MINT,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
    },

    progressArea: {
      marginTop: 10,
    },

    progressHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      marginBottom: 5,
    },

    progressLabel: {
      color: MUTED,
      fontSize: 7,
      fontWeight: "700",
    },

    progressValue: {
      color: GREEN,
      fontSize: 7,
      fontWeight: "900",
    },

    progressTrack: {
      height: 6,
      backgroundColor:
        "#E9EEEB",
      borderRadius: 999,
      overflow: "hidden",
    },

    progressFill: {
      height: "100%",
      backgroundColor: GREEN,
      borderRadius: 999,
    },

    scheduleRow: {
      flexDirection: "row",
      gap: 7,
      marginTop: 10,
    },

    scheduleItem: {
      flex: 1,
      minHeight: 38,
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 9,
    },

    scheduleText: {
      color: TEXT,
      fontSize: 7.5,
      fontWeight: "700",
    },

    actions: {
      flexDirection: "row",
      gap: 7,
      marginTop: 11,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor:
        "#EDF1EE",
    },

    detailsButton: {
      flex: 1,
      height: 40,
      borderRadius: 11,
      backgroundColor: MINT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },

    detailsButtonText: {
      color: GREEN,
      fontSize: 8.5,
      fontWeight: "900",
    },

    completeButton: {
      flex: 1,
      minHeight: 40,
      borderRadius: 11,
      backgroundColor: GREEN,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },

    completeButtonText: {
      color: WHITE,
      fontSize: 8.5,
      fontWeight: "900",
    },

    missedButton: {
      width: 42,
      height: 40,
      borderRadius: 11,
      backgroundColor:
        RED_LIGHT,
      alignItems: "center",
      justifyContent: "center",
    },

    overlay: {
      flex: 1,
      backgroundColor:
        "rgba(15,31,25,0.55)",
      justifyContent:
        "flex-end",
    },

    sheet: {
      maxHeight: "86%",
      backgroundColor: WHITE,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      padding: 18,
      paddingBottom: 30,
    },

    modalHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginBottom: 15,
    },

    modalTitle: {
      color: GREEN,
      fontSize: 17,
      fontWeight: "900",
    },

    modalSub: {
      color: MUTED,
      fontSize: 8,
      marginTop: 2,
    },

    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor:
        "#F3F5F3",
      alignItems: "center",
      justifyContent: "center",
    },

    detailRow: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor:
        "#EDF1EE",
    },

    detailIcon: {
      width: 35,
      height: 35,
      borderRadius: 11,
      backgroundColor: MINT,
      alignItems: "center",
      justifyContent: "center",
    },

    detailLabel: {
      color: MUTED,
      fontSize: 7.5,
    },

    detailValue: {
      color: TEXT,
      fontSize: 9.5,
      fontWeight: "800",
      marginTop: 2,
    },

    notesBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 13,
      backgroundColor:
        "#F8FAF8",
    },

    notesTitle: {
      color: GREEN,
      fontSize: 9,
      fontWeight: "900",
    },

    notesText: {
      color: MUTED,
      fontSize: 9,
      lineHeight: 15,
      marginTop: 5,
    },

    modalActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 15,
    },

    missedAction: {
      flex: 1,
      minHeight: 40,
      borderRadius: 11,
      backgroundColor:
        RED_LIGHT,
      alignItems: "center",
      justifyContent: "center",
    },

    missedActionText: {
      color: RED,
      fontSize: 8.5,
      fontWeight: "900",
    },

    centerOverlay: {
      flex: 1,
      backgroundColor:
        "rgba(15,31,25,0.55)",
      justifyContent:
        "center",
      padding: 22,
    },

    confirmCard: {
      backgroundColor: WHITE,
      borderRadius: 22,
      padding: 20,
      alignItems: "center",
    },

    confirmIcon: {
      width: 60,
      height: 60,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },

    confirmTitle: {
      color: GREEN,
      fontSize: 16,
      fontWeight: "900",
      marginTop: 13,
    },

    confirmText: {
      color: MUTED,
      fontSize: 9,
      lineHeight: 15,
      textAlign: "center",
      marginTop: 6,
    },

    confirmComplete: {
      width: "100%",
      minHeight: 47,
      borderRadius: 12,
      backgroundColor: GREEN,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 17,
    },

    confirmMissed: {
      width: "100%",
      minHeight: 47,
      borderRadius: 12,
      backgroundColor: RED,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 17,
    },

    confirmCompleteText: {
      color: WHITE,
      fontSize: 9,
      fontWeight: "900",
    },

    cancelButton: {
      width: "100%",
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 5,
    },

    cancelText: {
      color: MUTED,
      fontSize: 9,
      fontWeight: "800",
    },
  });