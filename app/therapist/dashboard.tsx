import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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

const API_BASE_URL =
  "http://192.168.137.1:8085/api";

const GREEN = "#123E32";
const GREEN_2 = "#1A5644";
const MINT = "#EAF4EF";

const CREAM = "#F8FAF8";
const WHITE = "#FFFFFF";

const GOLD = "#B8923B";
const GOLD_LIGHT = "#F6EBCB";

const TEXT = "#20342D";
const MUTED = "#718078";
const BORDER = "#E3EAE6";

const RED = "#B94B4B";
const RED_LIGHT = "#FDECEC";

const BLUE = "#4076A8";
const BLUE_LIGHT = "#EBF3FA";

const PURPLE = "#795C9E";
const PURPLE_LIGHT = "#F2EDF8";

/* =========================================================
   TYPES
========================================================= */

type TherapistProfile = {
  id?: number | string | null;
  name?: string;
  therapistName?: string;
  specialization?: string;
};

type Session = {
  id: number | string | null;

  treatmentPlanId?: number | string | null;

  patientId?: number | string | null;
  patientName: string;

  phoneNumber?: string;

  therapyName: string;

  sessionDate: string;

  startTime: string;
  endTime?: string;

  sessionNumber: number;
  totalSessions: number;

  status: string;

  therapistNotes?: string;
  patientNotes?: string;
};

type Progress = {
  treatmentPlanId?: number | string | null;

  patientId?: number | string | null;

  patientName: string;

  therapyName: string;

  completedSessions: number;
  totalSessions: number;

  remainingSessions: number;
  missedSessions: number;

  completionPercentage: number;

  status: string;
};

type DashboardData = {
  summary: any;
  today: Session[];
  upcoming: Session[];
  requests: Session[];
  progress: Progress[];
};

const EMPTY_DATA: DashboardData = {
  summary: {},
  today: [],
  upcoming: [],
  requests: [],
  progress: [],
};

/* =========================================================
   SESSION
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

/* =========================================================
   API
========================================================= */

async function readResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      message: text,
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

function extractArray(data: any): any[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.content)) {
    return data.content;
  }

  if (Array.isArray(data?.sessions)) {
    return data.sessions;
  }

  return [];
}

function normalizeSession(
  item: any = {}
): Session {
  return {
    id:
      item.id ??
      item.sessionId ??
      null,

    treatmentPlanId:
      item.treatmentPlanId ?? null,

    patientId:
      item.patientId ?? null,

    patientName:
      item.patientName ||
      item.name ||
      "Patient",

    phoneNumber:
      item.phoneNumber ||
      item.patientPhone ||
      "",

    therapyName:
      item.treatmentName ||
      item.therapyName ||
      item.treatment ||
      "Therapy",

    sessionDate:
      item.sessionDate ||
      item.treatmentDate ||
      item.date ||
      "",

    startTime:
      item.startTime ||
      item.sessionTime ||
      item.treatmentTime ||
      item.time ||
      "",

    endTime:
      item.endTime || "",

    sessionNumber:
      Number(
        item.sessionNumber || 1
      ),

    totalSessions:
      Number(
        item.totalSessions || 1
      ),

    status: String(
      item.status ||
        "PENDING_APPROVAL"
    ).toUpperCase(),

    therapistNotes:
      item.therapistNotes || "",

    patientNotes:
      item.patientNotes || "",
  };
}

function normalizeProgress(
  item: any = {}
): Progress {
  return {
    treatmentPlanId:
      item.treatmentPlanId ??
      item.id ??
      null,

    patientId:
      item.patientId ?? null,

    patientName:
      item.patientName ||
      "Patient",

    therapyName:
      item.treatmentName ||
      item.therapyName ||
      item.treatment ||
      "Therapy",

    completedSessions:
      Number(
        item.completedSessions || 0
      ),

    totalSessions:
      Number(
        item.totalSessions || 1
      ),

    remainingSessions:
      Number(
        item.remainingSessions || 0
      ),

    missedSessions:
      Number(
        item.missedSessions || 0
      ),

    completionPercentage:
      Number(
        item.completionPercentage || 0
      ),

    status: String(
      item.status ||
        item.planStatus ||
        "ACTIVE"
    ).toUpperCase(),
  };
}

function mergeSessions(
  first: any[] = [],
  second: any[] = []
) {
  const map = new Map<
    string,
    Session
  >();

  [...first, ...second].forEach(
    (item) => {
      const normalized =
        normalizeSession(item);

      if (
        normalized.id !== null &&
        normalized.id !== undefined
      ) {
        map.set(
          String(normalized.id),
          normalized
        );
      }
    }
  );

  return Array.from(
    map.values()
  );
}

function todayKey() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(
    String(value).includes("T")
      ? value
      : `${String(value).slice(
          0,
          10
        )}T00:00:00`
  );

  if (
    Number.isNaN(date.getTime())
  ) {
    return String(value);
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

function formatTime(value?: string) {
  if (!value) {
    return "-";
  }

  const [
    hourValue,
    minute = "00",
  ] = String(value)
    .slice(0, 5)
    .split(":");

  const hour =
    Number(hourValue);

  return `${
    hour % 12 || 12
  }:${minute} ${
    hour >= 12 ? "PM" : "AM"
  }`;
}

function formatStatus(
  value?: string
) {
  return String(value || "-")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function calculateProgress(
  item: Progress
) {
  if (
    Number(
      item.completionPercentage
    ) > 0
  ) {
    return Math.min(
      100,
      Number(
        item.completionPercentage
      )
    );
  }

  if (
    Number(
      item.totalSessions
    ) <= 0
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (Number(
        item.completedSessions
      ) /
        Number(
          item.totalSessions
        )) *
        100
    )
  );
}

/* =========================================================
   SCREEN
========================================================= */

export default function TherapistDashboardScreen() {
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
      specialization:
        "Therapist",
    });

  const [data, setData] =
    useState<DashboardData>(
      EMPTY_DATA
    );

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

  /* =====================================================
     LOAD DASHBOARD
  ===================================================== */

  const loadDashboard =
    useCallback(
      async (
        showLoader = true
      ) => {
        if (showLoader) {
          setLoading(true);
        }

        try {
          const calls =
            await Promise.allSettled(
              [
                therapistApi(
                  "/therapists/me"
                ),

                therapistApi(
                  "/therapist-dashboard/summary"
                ),

                therapistApi(
                  "/daily-treatments/therapist/my-sessions"
                ),

                therapistApi(
                  "/therapist-dashboard/today"
                ),

                therapistApi(
                  "/therapist-dashboard/upcoming"
                ),

                therapistApi(
                  "/therapist-dashboard/treatment-progress"
                ),
              ]
            );

          const value = (
            index: number,
            fallback: any
          ) => {
            const result =
              calls[index];

            if (
              result.status ===
              "fulfilled"
            ) {
              return (
                result.value?.data ??
                fallback
              );
            }

            return fallback;
          };

          /* PROFILE */

          const profile =
            value(0, {});

          if (
            profile?.name ||
            profile?.therapistName
          ) {
            const name =
              profile.name ||
              profile.therapistName;

            const nextProfile = {
              ...profile,

              name,

              specialization:
                profile.specialization ||
                "Therapist",
            };

            setTherapist(
              nextProfile
            );

            await AsyncStorage.setItem(
              "therapistName",
              name
            );

            if (
              profile.id !==
                null &&
              profile.id !==
                undefined
            ) {
              await AsyncStorage.setItem(
                "therapistId",
                String(
                  profile.id
                )
              );
            }

            await AsyncStorage.setItem(
              "therapistProfile",
              JSON.stringify(
                nextProfile
              )
            );
          }

          /* ALL SESSIONS */

          const allSessions =
            extractArray(
              value(2, [])
            ).map(
              normalizeSession
            );

          /* TODAY */

          let todaySessions =
            extractArray(
              value(3, [])
            ).map(
              normalizeSession
            );

          if (
            !todaySessions.length
          ) {
            todaySessions =
              allSessions.filter(
                (session) =>
                  String(
                    session.sessionDate ||
                      ""
                  ).slice(
                    0,
                    10
                  ) ===
                  todayKey()
              );
          }

          /* UPCOMING */

          const upcomingSessions =
            mergeSessions(
              [],
              extractArray(
                value(4, [])
              )
            );

          /* REQUESTS */

          const requests =
            allSessions.filter(
              (session) =>
                session.status ===
                "PENDING_APPROVAL"
            );

          /* PROGRESS */

          const progress =
            extractArray(
              value(5, [])
            ).map(
              normalizeProgress
            );

          setData({
            summary:
              value(1, {}),

            today:
              todaySessions.sort(
                (a, b) =>
                  String(
                    a.startTime ||
                      "23:59"
                  ).localeCompare(
                    String(
                      b.startTime ||
                        "23:59"
                    )
                  )
              ),

            upcoming:
              upcomingSessions.sort(
                (a, b) => {
                  const aKey = `${a.sessionDate} ${a.startTime}`;
                  const bKey = `${b.sessionDate} ${b.startTime}`;

                  return aKey.localeCompare(
                    bKey
                  );
                }
              ),

            requests,

            progress,
          });

          const failed =
            calls.filter(
              (item) =>
                item.status ===
                "rejected"
            );

          if (
            failed.length ===
            calls.length
          ) {
            throw new Error(
              "Unable to load therapist dashboard."
            );
          }
        } catch (error: any) {
          Alert.alert(
            "Dashboard",
            error?.message ||
              "Unable to load therapist dashboard."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  /* =====================================================
     INITIAL AUTH CHECK
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

        const role = String(
          (await AsyncStorage.getItem(
            "role"
          )) || ""
        ).toUpperCase();

        if (
          role &&
          role !== "THERAPIST"
        ) {
          router.replace(
            "/" as any
          );
          return;
        }

        const therapistCompleted =
          await AsyncStorage.getItem(
            "therapistProfileCompleted"
          );

        const profileCompleted =
          await AsyncStorage.getItem(
            "profileCompleted"
          );

        if (
          therapistCompleted ===
            "false" ||
          profileCompleted ===
            "false"
        ) {
          router.replace(
            "/therapist/profile" as any
          );
          return;
        }

        const storedName =
          (await AsyncStorage.getItem(
            "therapistName"
          )) ||
          (await AsyncStorage.getItem(
            "name"
          ));

        if (storedName) {
          setTherapist(
            (previous) => ({
              ...previous,
              name: storedName,
            })
          );
        }

        const storedProfile =
          await AsyncStorage.getItem(
            "therapistProfile"
          );

        if (storedProfile) {
          try {
            const parsed =
              JSON.parse(
                storedProfile
              );

            setTherapist(
              (previous) => ({
                ...previous,
                ...parsed,
              })
            );
          } catch {
            // Ignore invalid cache.
          }
        }

        await loadDashboard();
      };

    initialize();
  }, [loadDashboard]);

  /* =====================================================
     REFRESH
  ===================================================== */

  const refreshDashboard =
    async () => {
      setRefreshing(true);

      await loadDashboard(
        false
      );

      setRefreshing(false);
    };

  /* =====================================================
     APPROVE
  ===================================================== */

  const approveSession =
    async (
      sessionId:
        | string
        | number
        | null
    ) => {
      if (!sessionId) {
        return;
      }

      setActionLoading(
        `approve-${sessionId}`
      );

      try {
        const result =
          await therapistApi(
            `/daily-treatments/${encodeURIComponent(
              String(
                sessionId
              )
            )}/approve`,
            {
              method: "PUT",
            }
          );

        Alert.alert(
          "Approved",
          result?.message ||
            "Session approved successfully."
        );

        await loadDashboard(
          false
        );
      } catch (error: any) {
        Alert.alert(
          "Unable to Approve",
          error?.message ||
            "Unable to approve session."
        );
      } finally {
        setActionLoading("");
      }
    };

  /* =====================================================
     SUMMARY
  ===================================================== */

  const summary =
    data.summary || {};

  const pending =
    Number(
      summary.pendingApprovalSessions
    ) ||
    data.requests.length;

  const todaySessions =
    Number(
      summary.todaySessions
    ) ||
    data.today.length;

  const approved =
    Number(
      summary.approvedSessions
    ) ||
    data.upcoming.filter(
      (item) =>
        [
          "APPROVED",
          "RESCHEDULED",
          "SCHEDULED",
        ].includes(
          item.status
        )
    ).length;

  const completed =
    Number(
      summary.completedSessions
    ) ||
    data.progress.reduce(
      (total, item) =>
        total +
        Number(
          item.completedSessions ||
            0
        ),
      0
    );

  const missed =
    Number(
      summary.missedSessions
    ) ||
    data.progress.reduce(
      (total, item) =>
        total +
        Number(
          item.missedSessions ||
            0
        ),
      0
    );

  const totalPatients =
    Number(
      summary.totalPatients
    ) ||
    new Set(
      data.progress
        .map(
          (item) =>
            item.patientId
        )
        .filter(
          (id) =>
            id !== null &&
            id !== undefined
        )
        .map(String)
    ).size;

  const currentDate =
    useMemo(
      () =>
        new Date().toLocaleDateString(
          "en-IN",
          {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          }
        ),
      []
    );

  /* =====================================================
     UI
  ===================================================== */

  return (
    <SafeAreaView
      style={styles.screen}
    >
      <TherapistHeader
        title="Therapist Dashboard"
        subtitle="Manage therapy requests, sessions and patient progress."
        therapistName={
          therapist.name ||
          therapist.therapistName ||
          "Therapist"
        }
        onMenuPress={() =>
          setDrawerVisible(
            true
          )
        }
        onRefresh={
          refreshDashboard
        }
        refreshing={
          refreshing
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              refreshDashboard
            }
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
      >
        {/* WELCOME */}

        <View
          style={
            styles.welcomeCard
          }
        >
          <View
            style={
              styles.welcomeIcon
            }
          >
            <Ionicons
              name="leaf-outline"
              size={25}
              color={
                GOLD_LIGHT
              }
            />
          </View>

          <Text
            style={
              styles.eyebrow
            }
          >
            THERAPIST WORKSPACE
          </Text>

          <Text
            style={
              styles.welcomeTitle
            }
          >
            Welcome back,{" "}
            {therapist.name ||
              therapist.therapistName ||
              "Therapist"}
          </Text>

          <Text
            style={
              styles.welcomeText
            }
          >
            Review therapy
            requests, manage
            today's treatment
            sessions and monitor
            patient progress from
            one place.
          </Text>

          <View
            style={
              styles.dateBox
            }
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={
                GOLD_LIGHT
              }
            />

            <Text
              style={
                styles.dateText
              }
            >
              {currentDate}
            </Text>
          </View>
        </View>

        {/* SUMMARY */}

        <View
          style={
            styles.summaryGrid
          }
        >
          <SummaryCard
            title="Pending Requests"
            value={pending}
            icon="time-outline"
            iconBackground="#FFF3D9"
            iconColor="#B78120"
          />

          <SummaryCard
            title="Today's Sessions"
            value={todaySessions}
            icon="calendar-outline"
            iconBackground={
              BLUE_LIGHT
            }
            iconColor={BLUE}
          />

          <SummaryCard
            title="Approved Bookings"
            value={approved}
            icon="checkmark-circle-outline"
            iconBackground={MINT}
            iconColor={GREEN}
          />

          <SummaryCard
            title="Completed Sessions"
            value={completed}
            icon="checkmark-done-outline"
            iconBackground={
              GOLD_LIGHT
            }
            iconColor={GOLD}
          />

          <SummaryCard
            title="Missed Sessions"
            value={missed}
            icon="close-circle-outline"
            iconBackground={
              RED_LIGHT
            }
            iconColor={RED}
          />

          <SummaryCard
            title="Total Patients"
            value={totalPatients}
            icon="people-outline"
            iconBackground={
              PURPLE_LIGHT
            }
            iconColor={PURPLE}
          />
        </View>

        {loading ? (
          <View
            style={
              styles.loadingCard
            }
          >
            <ActivityIndicator
              size="small"
              color={GREEN}
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Refreshing therapist
              dashboard...
            </Text>
          </View>
        ) : null}

        {/* TODAY */}

        <SectionHeader
          title="Today's Schedule"
          subtitle="Therapy sessions assigned to you today."
          onPress={() =>
            router.push(
              "/therapist/daily-schedule" as any
            )
          }
        />

        {data.today.length ? (
          data.today
            .slice(0, 6)
            .map(
              (session) => (
                <SessionCard
                  key={String(
                    session.id
                  )}
                  session={
                    session
                  }
                  onPress={() =>
                    router.push(
                      {
                        pathname:
                          "/therapist/daily-schedule",
                        params: {
                          sessionId:
                            String(
                              session.id ||
                                ""
                            ),
                        },
                      } as any
                    )
                  }
                />
              )
            )
        ) : (
          <EmptyState
            icon="calendar-outline"
            text="No therapy sessions scheduled for today."
          />
        )}

        {/* BOOKING REQUESTS */}

        <SectionHeader
          title="Booking Requests"
          subtitle="Sessions waiting for your approval."
          onPress={() =>
            router.push(
              "/therapist/booking-requests" as any
            )
          }
        />

        {data.requests.length ? (
          data.requests
            .slice(0, 4)
            .map(
              (request) => (
                <View
                  key={String(
                    request.id
                  )}
                  style={
                    styles.requestCard
                  }
                >
                  <View
                    style={
                      styles.cardTop
                    }
                  >
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
                          request.patientName
                        }
                      </Text>

                      <Text
                        style={
                          styles.therapyName
                        }
                      >
                        {
                          request.therapyName
                        }
                      </Text>
                    </View>

                    <StatusBadge
                      status={
                        request.status
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.sessionInfo
                    }
                  >
                    <InfoItem
                      icon="calendar-outline"
                      text={formatDate(
                        request.sessionDate
                      )}
                    />

                    <InfoItem
                      icon="time-outline"
                      text={formatTime(
                        request.startTime
                      )}
                    />
                  </View>

                  <Text
                    style={
                      styles.sessionNumber
                    }
                  >
                    Session{" "}
                    {
                      request.sessionNumber
                    }{" "}
                    of{" "}
                    {
                      request.totalSessions
                    }
                  </Text>

                  <View
                    style={
                      styles.requestActions
                    }
                  >
                    <TouchableOpacity
                      style={
                        styles.approveButton
                      }
                      disabled={Boolean(
                        actionLoading
                      )}
                      onPress={() =>
                        approveSession(
                          request.id
                        )
                      }
                    >
                      {actionLoading ===
                      `approve-${request.id}` ? (
                        <ActivityIndicator
                          size="small"
                          color={
                            WHITE
                          }
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-outline"
                            size={17}
                            color={
                              WHITE
                            }
                          />

                          <Text
                            style={
                              styles.approveText
                            }
                          >
                            Approve
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.detailsButton
                      }
                      onPress={() =>
                        router.push(
                          {
                            pathname:
                              "/therapist/booking-requests",
                            params: {
                              sessionId:
                                String(
                                  request.id ||
                                    ""
                                ),
                            },
                          } as any
                        )
                      }
                    >
                      <Text
                        style={
                          styles.detailsText
                        }
                      >
                        View Details
                      </Text>

                      <Ionicons
                        name="arrow-forward-outline"
                        size={15}
                        color={
                          GREEN
                        }
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )
            )
        ) : (
          <EmptyState
            icon="file-tray-full-outline"
            text="No pending therapy booking requests."
          />
        )}

        {/* UPCOMING */}

        <SectionHeader
          title="Upcoming Schedule"
          subtitle="Your upcoming therapy sessions."
          onPress={() =>
            router.push(
              "/therapist/daily-schedule" as any
            )
          }
        />

        {data.upcoming.length ? (
          data.upcoming
            .slice(0, 8)
            .map(
              (session) => (
                <SessionCard
                  key={String(
                    session.id
                  )}
                  session={
                    session
                  }
                  onPress={() =>
                    router.push(
                      {
                        pathname:
                          "/therapist/daily-schedule",
                        params: {
                          sessionId:
                            String(
                              session.id ||
                                ""
                            ),
                        },
                      } as any
                    )
                  }
                />
              )
            )
        ) : (
          <EmptyState
            icon="calendar-clear-outline"
            text="No upcoming therapy sessions."
          />
        )}

        {/* PATIENT PROGRESS */}

        <SectionHeader
          title="Patient Progress"
          subtitle="Active treatment plans and session completion."
          onPress={() =>
            router.push(
              "/therapist/patient-history" as any
            )
          }
        />

        {data.progress.filter(
          (item) =>
            item.status !==
            "COMPLETED"
        ).length ? (
          data.progress
            .filter(
              (item) =>
                item.status !==
                "COMPLETED"
            )
            .slice(0, 5)
            .map(
              (
                item,
                index
              ) => (
                <ProgressCard
                  key={String(
                    item.treatmentPlanId ||
                      `${item.patientId}-${index}`
                  )}
                  item={item}
                />
              )
            )
        ) : (
          <EmptyState
            icon="analytics-outline"
            text="No active patient treatment plans."
          />
        )}

        {/* QUICK ACTIONS */}

        <Text
          style={
            styles.quickHeading
          }
        >
          Quick Actions
        </Text>

        <View
          style={
            styles.quickGrid
          }
        >
          <QuickAction
            title="Booking Requests"
            icon="file-tray-full-outline"
            onPress={() =>
              router.push(
                "/therapist/booking-requests" as any
              )
            }
          />

          <QuickAction
            title="Daily Schedule"
            icon="calendar-outline"
            onPress={() =>
              router.push(
                "/therapist/daily-schedule" as any
              )
            }
          />

          <QuickAction
            title="Attendance"
            icon="checkmark-circle-outline"
            onPress={() =>
              router.push(
                "/therapist/attendance" as any
              )
            }
          />

          <QuickAction
            title="Patient History"
            icon="people-outline"
            onPress={() =>
              router.push(
                "/therapist/patient-history" as any
              )
            }
          />
        </View>
      </ScrollView>

      {/* COMMON DRAWER */}

      <TherapistDrawer
        visible={
          drawerVisible
        }
        onClose={() =>
          setDrawerVisible(
            false
          )
        }
        activeRoute="/therapist/dashboard"
      />
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
  iconBackground,
  iconColor,
}: {
  title: string;
  value: number;
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  iconBackground: string;
  iconColor: string;
}) {
  return (
    <View
      style={
        styles.summaryCard
      }
    >
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={iconColor}
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

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <View
      style={
        styles.sectionHeader
      }
    >
      <View style={{ flex: 1 }}>
        <Text
          style={
            styles.sectionTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.sectionSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>

      <TouchableOpacity
        style={
          styles.viewAllButton
        }
        onPress={onPress}
      >
        <Text
          style={
            styles.viewAllText
          }
        >
          View All
        </Text>

        <Ionicons
          name="arrow-forward-outline"
          size={14}
          color={GREEN}
        />
      </TouchableOpacity>
    </View>
  );
}

/* =========================================================
   SESSION CARD
========================================================= */

function SessionCard({
  session,
  onPress,
}: {
  session: Session;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={
        styles.sessionCard
      }
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View
        style={
          styles.cardTop
        }
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
            {String(
              session.patientName ||
                "P"
            )
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
              session.patientName
            }
          </Text>

          <Text
            style={
              styles.therapyName
            }
          >
            {
              session.therapyName
            }
          </Text>
        </View>

        <StatusBadge
          status={
            session.status
          }
        />
      </View>

      <View
        style={
          styles.sessionInfo
        }
      >
        <InfoItem
          icon="calendar-outline"
          text={formatDate(
            session.sessionDate
          )}
        />

        <InfoItem
          icon="time-outline"
          text={formatTime(
            session.startTime
          )}
        />
      </View>

      <View
        style={
          styles.cardBottom
        }
      >
        <Text
          style={
            styles.sessionNumber
          }
        >
          Session{" "}
          {
            session.sessionNumber
          }{" "}
          of{" "}
          {
            session.totalSessions
          }
        </Text>

        <Ionicons
          name="chevron-forward-outline"
          size={17}
          color={MUTED}
        />
      </View>
    </TouchableOpacity>
  );
}

/* =========================================================
   STATUS
========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    String(
      status || ""
    ).toUpperCase();

  let background =
    "#FFF3D9";

  let color =
    "#9A6B17";

  if (
    [
      "APPROVED",
      "COMPLETED",
    ].includes(normalized)
  ) {
    background =
      "#E5F4EA";

    color = GREEN;
  }

  if (
    normalized ===
    "RESCHEDULED"
  ) {
    background =
      BLUE_LIGHT;

    color = BLUE;
  }

  if (
    [
      "MISSED",
      "REJECTED",
      "CANCELLED",
    ].includes(normalized)
  ) {
    background =
      RED_LIGHT;

    color = RED;
  }

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor:
            background,
        },
      ]}
    >
      <Text
        style={[
          styles.statusText,
          { color },
        ]}
      >
        {formatStatus(
          status
        )}
      </Text>
    </View>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  icon,
  text,
}: {
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  text: string;
}) {
  return (
    <View
      style={
        styles.infoItem
      }
    >
      <Ionicons
        name={icon}
        size={14}
        color={GOLD}
      />

      <Text
        style={
          styles.infoText
        }
      >
        {text}
      </Text>
    </View>
  );
}

/* =========================================================
   PROGRESS
========================================================= */

function ProgressCard({
  item,
}: {
  item: Progress;
}) {
  const percent =
    calculateProgress(item);

  return (
    <View
      style={
        styles.progressCard
      }
    >
      <View
        style={
          styles.progressTop
        }
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
            {String(
              item.patientName ||
                "P"
            )
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
              styles.therapyName
            }
          >
            {
              item.therapyName
            }
          </Text>
        </View>

        <Text
          style={
            styles.progressCount
          }
        >
          {
            item.completedSessions
          }
          /
          {
            item.totalSessions
          }
        </Text>
      </View>

      <View
        style={
          styles.progressTrack
        }
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${percent}%`,
            },
          ]}
        />
      </View>

      <View
        style={
          styles.progressFooter
        }
      >
        <Text
          style={
            styles.progressText
          }
        >
          {percent}% complete
        </Text>

        <Text
          style={
            styles.progressText
          }
        >
          {
            item.remainingSessions
          }{" "}
          remaining
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={
        styles.quickCard
      }
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View
        style={
          styles.quickIcon
        }
      >
        <Ionicons
          name={icon}
          size={22}
          color={GREEN}
        />
      </View>

      <Text
        style={
          styles.quickTitle
        }
      >
        {title}
      </Text>

      <Ionicons
        name="arrow-forward-outline"
        size={16}
        color={GOLD}
      />
    </TouchableOpacity>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyState({
  icon,
  text,
}: {
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  text: string;
}) {
  return (
    <View
      style={
        styles.emptyCard
      }
    >
      <View
        style={
          styles.emptyIcon
        }
      >
        <Ionicons
          name={icon}
          size={24}
          color={GOLD}
        />
      </View>

      <Text
        style={
          styles.emptyText
        }
      >
        {text}
      </Text>
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
      backgroundColor:
        CREAM,
    },

    scroll: {
      flex: 1,
    },

    content: {
      padding: 14,
      paddingBottom: 40,
    },

    /* WELCOME */

    welcomeCard: {
      padding: 20,

      borderRadius: 22,

      backgroundColor:
        GREEN,

      marginBottom: 14,
    },

    welcomeIcon: {
      width: 46,
      height: 46,

      borderRadius: 14,

      backgroundColor:
        "rgba(255,255,255,0.10)",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 14,
    },

    eyebrow: {
      color: GOLD_LIGHT,

      fontSize: 9,
      fontWeight: "900",

      letterSpacing: 1.2,
    },

    welcomeTitle: {
      marginTop: 6,

      color: WHITE,

      fontSize: 23,
      fontWeight: "900",

      lineHeight: 29,
    },

    welcomeText: {
      marginTop: 8,

      color:
        "rgba(255,255,255,0.78)",

      fontSize: 11,
      lineHeight: 18,
    },

    dateBox: {
      alignSelf:
        "flex-start",

      marginTop: 15,

      minHeight: 38,

      paddingHorizontal: 11,

      borderRadius: 11,

      backgroundColor:
        "rgba(255,255,255,0.10)",

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 7,
    },

    dateText: {
      color: WHITE,

      fontSize: 10,
      fontWeight: "700",
    },

    /* SUMMARY */

    summaryGrid: {
      flexDirection:
        "row",

      flexWrap: "wrap",

      justifyContent:
        "space-between",

      rowGap: 10,

      marginBottom: 5,
    },

    summaryCard: {
      width: "48.5%",

      minHeight: 132,

      padding: 14,

      borderRadius: 18,

      backgroundColor:
        WHITE,

      borderWidth: 1,
      borderColor:
        BORDER,
    },

    summaryIcon: {
      width: 39,
      height: 39,

      borderRadius: 12,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    summaryValue: {
      marginTop: 12,

      color: GREEN,

      fontSize: 24,
      fontWeight: "900",
    },

    summaryLabel: {
      marginTop: 3,

      color: MUTED,

      fontSize: 9,
      fontWeight: "700",

      lineHeight: 13,
    },

    loadingCard: {
      marginTop: 10,

      padding: 13,

      borderRadius: 14,

      backgroundColor:
        MINT,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,
    },

    loadingText: {
      color: GREEN,

      fontSize: 10,
      fontWeight: "700",
    },

    /* SECTION */

    sectionHeader: {
      marginTop: 22,
      marginBottom: 10,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 10,
    },

    sectionTitle: {
      color: GREEN,

      fontSize: 16,
      fontWeight: "900",
    },

    sectionSubtitle: {
      marginTop: 3,

      color: MUTED,

      fontSize: 9,
      lineHeight: 13,
    },

    viewAllButton: {
      minHeight: 36,

      paddingHorizontal: 10,

      borderRadius: 11,

      backgroundColor:
        MINT,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 4,
    },

    viewAllText: {
      color: GREEN,

      fontSize: 9,
      fontWeight: "800",
    },

    /* CARDS */

    sessionCard: {
      padding: 14,

      marginBottom: 9,

      borderRadius: 17,

      backgroundColor:
        WHITE,

      borderWidth: 1,
      borderColor:
        BORDER,
    },

    requestCard: {
      padding: 14,

      marginBottom: 9,

      borderRadius: 17,

      backgroundColor:
        WHITE,

      borderWidth: 1,
      borderColor:
        BORDER,
    },

    cardTop: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 10,
    },

    patientAvatar: {
      width: 40,
      height: 40,

      borderRadius: 13,

      backgroundColor:
        MINT,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    patientAvatarText: {
      color: GREEN,

      fontSize: 14,
      fontWeight: "900",
    },

    patientName: {
      color: TEXT,

      fontSize: 13,
      fontWeight: "900",
    },

    therapyName: {
      marginTop: 3,

      color: MUTED,

      fontSize: 10,
      fontWeight: "500",
    },

    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 6,

      borderRadius: 999,
    },

    statusText: {
      fontSize: 7.5,
      fontWeight: "900",
    },

    sessionInfo: {
      marginTop: 12,

      flexDirection:
        "row",

      flexWrap: "wrap",

      gap: 12,
    },

    infoItem: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,
    },

    infoText: {
      color: TEXT,

      fontSize: 9,
      fontWeight: "600",
    },

    cardBottom: {
      marginTop: 12,

      paddingTop: 10,

      borderTopWidth: 1,
      borderTopColor:
        "#EEF1EF",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    sessionNumber: {
      color: MUTED,

      fontSize: 9,
      fontWeight: "600",
    },

    /* REQUEST */

    requestActions: {
      marginTop: 13,

      flexDirection:
        "row",

      gap: 8,
    },

    approveButton: {
      flex: 1,

      minHeight: 42,

      borderRadius: 12,

      backgroundColor:
        GREEN,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 5,
    },

    approveText: {
      color: WHITE,

      fontSize: 9,
      fontWeight: "900",
    },

    detailsButton: {
      flex: 1,

      minHeight: 42,

      borderRadius: 12,

      backgroundColor:
        MINT,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 5,
    },

    detailsText: {
      color: GREEN,

      fontSize: 9,
      fontWeight: "900",
    },

    /* PROGRESS */

    progressCard: {
      padding: 14,

      marginBottom: 9,

      borderRadius: 17,

      backgroundColor:
        WHITE,

      borderWidth: 1,
      borderColor:
        BORDER,
    },

    progressTop: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 10,
    },

    progressCount: {
      color: GREEN,

      fontSize: 11,
      fontWeight: "900",
    },

    progressTrack: {
      height: 7,

      marginTop: 14,

      borderRadius: 999,

      overflow:
        "hidden",

      backgroundColor:
        "#E9EEEB",
    },

    progressFill: {
      height: "100%",

      borderRadius: 999,

      backgroundColor:
        GREEN_2,
    },

    progressFooter: {
      marginTop: 7,

      flexDirection:
        "row",

      justifyContent:
        "space-between",
    },

    progressText: {
      color: MUTED,

      fontSize: 8.5,
      fontWeight: "600",
    },

    /* QUICK */

    quickHeading: {
      marginTop: 23,
      marginBottom: 10,

      color: GREEN,

      fontSize: 16,
      fontWeight: "900",
    },

    quickGrid: {
      flexDirection:
        "row",

      flexWrap: "wrap",

      justifyContent:
        "space-between",

      rowGap: 9,
    },

    quickCard: {
      width: "48.5%",

      minHeight: 118,

      padding: 14,

      borderRadius: 17,

      backgroundColor:
        WHITE,

      borderWidth: 1,
      borderColor:
        BORDER,

      justifyContent:
        "space-between",
    },

    quickIcon: {
      width: 40,
      height: 40,

      borderRadius: 12,

      backgroundColor:
        MINT,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    quickTitle: {
      marginTop: 10,

      color: TEXT,

      fontSize: 11,
      fontWeight: "800",
    },

    /* EMPTY */

    emptyCard: {
      padding: 22,

      borderRadius: 17,

      backgroundColor:
        WHITE,

      borderWidth: 1,
      borderColor:
        BORDER,

      alignItems:
        "center",
    },

    emptyIcon: {
      width: 46,
      height: 46,

      borderRadius: 15,

      backgroundColor:
        "#FAF3DF",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    emptyText: {
      marginTop: 9,

      color: MUTED,

      fontSize: 10,

      textAlign:
        "center",

      lineHeight: 15,
    },
  });