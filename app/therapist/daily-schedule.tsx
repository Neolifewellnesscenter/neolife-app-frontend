// app/therapist/daily-schedule.tsx

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
  startTime: string;
  endTime: string;
  sessionNumber: number;
  totalSessions: number;
  status: string;
  attendance: string;
  patientNotes: string;
  therapistNotes: string;
};

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

async function therapistApi(endpoint: string, options: RequestInit = {}) {
  const token = await getToken();

  if (!token) {
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

  const text = await response.text();

  let result: any = {};

  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      result = { message: text };
    }
  }

  if (response.status === 401 || response.status === 403) {
    await clearTherapistSession();
    router.replace("/" as any);

    throw new Error(
      result?.message || "Your session has expired. Please log in again."
    );
  }

  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || `Request failed (${response.status}).`);
  }

  return result;
}

function extractArray(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.sessions)) return data.sessions;
  return [];
}

function normalizeSession(item: any = {}): Session {
  const status = String(item.status || "PENDING_APPROVAL").toUpperCase();

  let attendance = String(item.attendance || "").toUpperCase();

  if (!attendance) {
    if (status === "COMPLETED") attendance = "PRESENT";
    else if (status === "MISSED") attendance = "ABSENT";
    else if (status === "CANCELLED") attendance = "CANCELLED";
    else attendance = "PENDING";
  }

  return {
    id: item.id ?? item.sessionId ?? null,

    sessionNumberCode: `SES-${item.id ?? item.sessionId ?? "-"}`,

    treatmentPlanId: item.treatmentPlanId ?? null,

    patientId: item.patientId ?? null,

    patientName: item.patientName || "Patient",

    patientPhone: item.phoneNumber || item.patientPhone || "-",

    patientAge: item.age ?? "-",

    patientGender: String(item.gender || "-").toUpperCase(),

    therapyName: item.treatmentName || item.therapyName || "Therapy",

    sessionDate:
      item.sessionDate || item.bookingDate || item.date || "",

    startTime:
      item.startTime || item.bookingTime || item.time || "",

    endTime: item.endTime || "",

    sessionNumber: Number(item.sessionNumber || 1),

    totalSessions: Number(item.totalSessions || 1),

    status,

    attendance,

    patientNotes: item.patientNotes || item.symptoms || "-",

    therapistNotes: item.therapistNotes || "-",
  };
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(
    value.includes("T") ? value : `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  if (!value) return "-";

  const parts = value.split(":");

  if (parts.length < 2) return value;

  const date = new Date();

  date.setHours(Number(parts[0]), Number(parts[1]), 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function todayString() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function isActionable(session: Session) {
  return (
    session.status === "APPROVED" ||
    session.status === "RESCHEDULED" ||
    session.status === "IN_PROGRESS"
  );
}

export default function TherapistDailyScheduleScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const [therapistName, setTherapistName] = useState("Therapist");

  const [sessions, setSessions] = useState<Session[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [selectedRange, setSelectedRange] = useState("TODAY");
  const [search, setSearch] = useState("");
  const [therapyFilter, setTherapyFilter] = useState("");

  const [detailsSession, setDetailsSession] = useState<Session | null>(null);
  const [completeSession, setCompleteSession] = useState<Session | null>(null);
  const [missedSession, setMissedSession] = useState<Session | null>(null);

  const loadProfile = useCallback(async () => {
    const storedName =
      (await AsyncStorage.getItem("therapistName")) ||
      (await AsyncStorage.getItem("userName")) ||
      (await AsyncStorage.getItem("name")) ||
      "Therapist";

    try {
      const result = await therapistApi("/therapists/me");

      const profile = result?.data || {};

      const name =
        profile.name ||
        profile.therapistName ||
        storedName;

      setTherapistName(name);

      await AsyncStorage.setItem("therapistName", name);

      if (profile.id !== null && profile.id !== undefined) {
        await AsyncStorage.setItem("therapistId", String(profile.id));
      }

      await AsyncStorage.setItem(
        "therapistProfile",
        JSON.stringify(profile)
      );
    } catch (error) {
      console.log("Profile load error:", error);
    }
  }, []);

  const loadSchedule = useCallback(async () => {
    try {
      const result = await therapistApi(
        "/daily-treatments/therapist/my-sessions"
      );

      const next = extractArray(result?.data)
        .map(normalizeSession)
        .sort((a, b) => {
          const first = new Date(
            `${a.sessionDate || "2099-01-01"}T${a.startTime || "00:00:00"}`
          );

          const second = new Date(
            `${b.sessionDate || "2099-01-01"}T${b.startTime || "00:00:00"}`
          );

          return first.getTime() - second.getTime();
        });

      setSessions(next);
    } catch (error: any) {
      setSessions([]);

      Alert.alert(
        "Daily Schedule",
        error?.message || "Unable to load your schedule."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.allSettled([loadProfile(), loadSchedule()]);
  }, [loadProfile, loadSchedule]);

  const onRefresh = async () => {
    setRefreshing(true);

    await Promise.allSettled([loadProfile(), loadSchedule()]);

    setRefreshing(false);
  };

  const therapies = useMemo(
    () =>
      [...new Set(sessions.map((session) => session.therapyName))]
        .filter(Boolean)
        .sort(),
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sessions.filter((session) => {
      const searchMatch =
        !query ||
        session.patientName.toLowerCase().includes(query) ||
        session.sessionNumberCode.toLowerCase().includes(query) ||
        session.therapyName.toLowerCase().includes(query);

      const therapyMatch =
        !therapyFilter || session.therapyName === therapyFilter;

      let rangeMatch = true;

      if (selectedRange === "TODAY") {
        rangeMatch = session.sessionDate === todayString();
      }

      if (selectedRange === "UPCOMING") {
        rangeMatch =
          session.sessionDate >= todayString() &&
          !["COMPLETED", "MISSED", "CANCELLED"].includes(session.status);
      }

      if (selectedRange === "COMPLETED") {
        rangeMatch = session.status === "COMPLETED";
      }

      if (selectedRange === "MISSED") {
        rangeMatch = session.status === "MISSED";
      }

      return searchMatch && therapyMatch && rangeMatch;
    });
  }, [sessions, search, therapyFilter, selectedRange]);

  const completeTreatment = async () => {
    if (!completeSession?.id) return;

    setActionLoading(`complete-${completeSession.id}`);

    try {
      const result = await therapistApi(
        `/daily-treatments/${encodeURIComponent(
          String(completeSession.id)
        )}/complete`,
        {
          method: "PUT",
        }
      );

      setCompleteSession(null);
      setDetailsSession(null);

      await loadSchedule();

      Alert.alert(
        "Session Completed",
        result?.message ||
          "Daily treatment session completed successfully."
      );
    } catch (error: any) {
      Alert.alert(
        "Unable to Complete",
        error?.message || "Session could not be completed."
      );
    } finally {
      setActionLoading("");
    }
  };

  const markMissed = async () => {
    if (!missedSession?.id) return;

    setActionLoading(`missed-${missedSession.id}`);

    try {
      const result = await therapistApi(
        `/daily-treatments/${encodeURIComponent(
          String(missedSession.id)
        )}/mark-missed`,
        {
          method: "PUT",
        }
      );

      setMissedSession(null);
      setDetailsSession(null);

      await loadSchedule();

      Alert.alert(
        "Session Updated",
        result?.message || "Daily treatment session marked as missed."
      );
    } catch (error: any) {
      Alert.alert(
        "Unable to Update",
        error?.message || "Unable to mark the session as missed."
      );
    } finally {
      setActionLoading("");
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <TherapistHeader
        title="Daily Schedule"
        subtitle="Manage today's therapy sessions."
        therapistName={therapistName}
        onMenuPress={() => setDrawerVisible(true)}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
      >
        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>TREATMENT SCHEDULE</Text>

            <Text style={styles.heroTitle}>Daily Schedule</Text>

            <Text style={styles.heroText}>
              Review assigned therapy sessions and update each session after
              treatment.
            </Text>
          </View>

          <View style={styles.heroIcon}>
            <Ionicons name="calendar-outline" size={25} color={GOLD_LIGHT} />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {[
            ["TODAY", "Today"],
            ["UPCOMING", "Upcoming"],
            ["COMPLETED", "Completed"],
            ["MISSED", "Missed"],
            ["ALL", "All Sessions"],
          ].map(([value, label]) => {
            const selected = selectedRange === value;

            return (
              <TouchableOpacity
                key={value}
                style={[styles.tab, selected && styles.tabSelected]}
                onPress={() => setSelectedRange(value)}
              >
                <Text
                  style={[
                    styles.tabText,
                    selected && styles.tabTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.filterCard}>
          <View style={styles.search}>
            <Ionicons name="search-outline" size={18} color={MUTED} />

            <TextInput
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              placeholder="Search patient, session or therapy"
              placeholderTextColor="#98A39D"
            />
          </View>

          {therapies.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 10 }}
            >
              <TouchableOpacity
                style={[
                  styles.therapyChip,
                  !therapyFilter && styles.therapyChipSelected,
                ]}
                onPress={() => setTherapyFilter("")}
              >
                <Text
                  style={[
                    styles.therapyText,
                    !therapyFilter && styles.therapyTextSelected,
                  ]}
                >
                  All Therapies
                </Text>
              </TouchableOpacity>

              {therapies.map((therapy) => {
                const selected = therapyFilter === therapy;

                return (
                  <TouchableOpacity
                    key={therapy}
                    style={[
                      styles.therapyChip,
                      selected && styles.therapyChipSelected,
                    ]}
                    onPress={() =>
                      setTherapyFilter(selected ? "" : therapy)
                    }
                  >
                    <Text
                      style={[
                        styles.therapyText,
                        selected && styles.therapyTextSelected,
                      ]}
                    >
                      {therapy}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.heading}>
          <View>
            <Text style={styles.headingTitle}>
              {selectedRange === "TODAY"
                ? "Today's Sessions"
                : selectedRange === "UPCOMING"
                ? "Upcoming Sessions"
                : selectedRange === "COMPLETED"
                ? "Completed Sessions"
                : selectedRange === "MISSED"
                ? "Missed Sessions"
                : "All Sessions"}
            </Text>

            <Text style={styles.headingSub}>
              {filteredSessions.length} session
              {filteredSessions.length === 1 ? "" : "s"}
            </Text>
          </View>

          <View style={styles.count}>
            <Text style={styles.countText}>{filteredSessions.length}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={GREEN} />

            <Text style={styles.emptyText}>Loading schedule...</Text>
          </View>
        ) : filteredSessions.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={27} color={GOLD} />
            </View>

            <Text style={styles.emptyTitle}>No Sessions Found</Text>

            <Text style={styles.emptyText}>
              There are no therapy sessions matching this selection.
            </Text>
          </View>
        ) : (
          filteredSessions.map((session) => (
            <View key={String(session.id)} style={styles.sessionCard}>
              <View style={styles.sessionTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {session.patientName.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.patient}>{session.patientName}</Text>

                  <Text style={styles.sessionId}>
                    {session.sessionNumberCode}
                  </Text>
                </View>

                <StatusBadge status={session.status} />
              </View>

              <View style={styles.therapyBox}>
                <Ionicons name="sparkles-outline" size={17} color={GOLD} />

                <View style={{ flex: 1 }}>
                  <Text style={styles.smallLabel}>THERAPY</Text>

                  <Text style={styles.therapyName}>{session.therapyName}</Text>
                </View>

                <Text style={styles.sessionProgress}>
                  {session.sessionNumber}/{session.totalSessions}
                </Text>
              </View>

              <View style={styles.scheduleRow}>
                <View style={styles.scheduleItem}>
                  <Ionicons name="calendar-outline" size={15} color={GREEN} />

                  <Text style={styles.scheduleText}>
                    {formatDate(session.sessionDate)}
                  </Text>
                </View>

                <View style={styles.scheduleItem}>
                  <Ionicons name="time-outline" size={15} color={GREEN} />

                  <Text style={styles.scheduleText}>
                    {formatTime(session.startTime)}
                    {session.endTime ? ` - ${formatTime(session.endTime)}` : ""}
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={() => setDetailsSession(session)}
                >
                  <Ionicons name="eye-outline" size={16} color={GREEN} />

                  <Text style={styles.detailsText}>Details</Text>
                </TouchableOpacity>

                {isActionable(session) && (
                  <>
                    <TouchableOpacity
                      style={styles.completeButton}
                      onPress={() => setCompleteSession(session)}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={16}
                        color={WHITE}
                      />

                      <Text style={styles.completeText}>Complete</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.missedButton}
                      onPress={() => setMissedSession(session)}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={17}
                        color={RED}
                      />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TherapistDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeRoute="/therapist/daily-schedule"
      />

      <Modal
        transparent
        animationType="slide"
        visible={Boolean(detailsSession)}
        onRequestClose={() => setDetailsSession(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {detailsSession && (
              <>
                <ModalHeader
                  title="Session Details"
                  subtitle={detailsSession.sessionNumberCode}
                  onClose={() => setDetailsSession(null)}
                />

                <ScrollView showsVerticalScrollIndicator={false}>
                  <DetailRow
                    icon="person-outline"
                    label="Patient"
                    value={detailsSession.patientName}
                  />

                  <DetailRow
                    icon="sparkles-outline"
                    label="Therapy"
                    value={detailsSession.therapyName}
                  />

                  <DetailRow
                    icon="calendar-outline"
                    label="Date"
                    value={formatDate(detailsSession.sessionDate)}
                  />

                  <DetailRow
                    icon="time-outline"
                    label="Time"
                    value={`${formatTime(detailsSession.startTime)}${
                      detailsSession.endTime
                        ? ` - ${formatTime(detailsSession.endTime)}`
                        : ""
                    }`}
                  />

                  <DetailRow
                    icon="layers-outline"
                    label="Treatment Progress"
                    value={`Session ${detailsSession.sessionNumber} of ${detailsSession.totalSessions}`}
                  />

                  

                  <DetailRow
                    icon="checkmark-circle-outline"
                    label="Status"
                    value={detailsSession.status.replaceAll("_", " ")}
                  />

                  {detailsSession.patientNotes !== "-" && (
                    <View style={styles.notes}>
                      <Text style={styles.notesTitle}>Patient Notes</Text>

                      <Text style={styles.notesText}>
                        {detailsSession.patientNotes}
                      </Text>
                    </View>
                  )}

                  {isActionable(detailsSession) && (
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={styles.completeButton}
                        onPress={() => {
                          const current = detailsSession;
                          setDetailsSession(null);
                          setCompleteSession(current);
                        }}
                      >
                        <Text style={styles.completeText}>Complete Session</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.modalMissed}
                        onPress={() => {
                          const current = detailsSession;
                          setDetailsSession(null);
                          setMissedSession(current);
                        }}
                      >
                        <Text style={styles.modalMissedText}>Mark Missed</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(completeSession)}
        onRequestClose={() => setCompleteSession(null)}
      >
        <View style={styles.centerOverlay}>
          <View style={styles.confirmCard}>
            <View style={[styles.confirmIcon, { backgroundColor: MINT }]}>
              <Ionicons
                name="checkmark-circle-outline"
                size={30}
                color={GREEN}
              />
            </View>

            <Text style={styles.confirmTitle}>Complete Session?</Text>

            <Text style={styles.confirmText}>
              Mark {completeSession?.patientName}'s{" "}
              {completeSession?.therapyName} session as completed?
            </Text>

            <TouchableOpacity
              style={styles.confirmComplete}
              disabled={Boolean(actionLoading)}
              onPress={completeTreatment}
            >
              {actionLoading.startsWith("complete-") ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.confirmCompleteText}>
                  Yes, Complete Session
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setCompleteSession(null)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(missedSession)}
        onRequestClose={() => setMissedSession(null)}
      >
        <View style={styles.centerOverlay}>
          <View style={styles.confirmCard}>
            <View style={[styles.confirmIcon, { backgroundColor: RED_LIGHT }]}>
              <Ionicons name="close-circle-outline" size={30} color={RED} />
            </View>

            <Text style={styles.confirmTitle}>Mark Session Missed?</Text>

            <Text style={styles.confirmText}>
              This will mark {missedSession?.patientName}'s therapy session as
              missed.
            </Text>

            <TouchableOpacity
              style={styles.confirmMissed}
              disabled={Boolean(actionLoading)}
              onPress={markMissed}
            >
              {actionLoading.startsWith("missed-") ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.confirmCompleteText}>Mark as Missed</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setMissedSession(null)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: string }) {
  const value = String(status || "").toUpperCase();

  let background = ORANGE_LIGHT;
  let color = ORANGE;

  if (value === "COMPLETED") {
    background = MINT;
    color = GREEN;
  } else if (value === "MISSED" || value === "CANCELLED") {
    background = RED_LIGHT;
    color = RED;
  } else if (value === "APPROVED" || value === "RESCHEDULED") {
    background = BLUE_LIGHT;
    color = BLUE;
  }

  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.badgeText, { color }]}>
        {value.replaceAll("_", " ")}
      </Text>
    </View>
  );
}

function ModalHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.modalHeader}>
      <View>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalSubtitle}>{subtitle}</Text>
      </View>

      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={21} color={TEXT} />
      </TouchableOpacity>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={17} color={GREEN} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || "-"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  content: { padding: 14, paddingBottom: 40 },

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
    fontSize: 22,
    fontWeight: "900",
    marginTop: 5,
  },

  heroText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 9,
    lineHeight: 15,
    marginTop: 6,
  },

  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  tabs: { gap: 7, paddingVertical: 12 },

  tab: {
    paddingHorizontal: 14,
    minHeight: 38,
    borderRadius: 11,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: "center",
  },

  tabSelected: { backgroundColor: GREEN, borderColor: GREEN },

  tabText: { color: MUTED, fontSize: 8.5, fontWeight: "800" },

  tabTextSelected: { color: WHITE },

  filterCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 12,
  },

  search: {
    height: 45,
    borderRadius: 12,
    backgroundColor: "#F7F9F7",
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    gap: 7,
  },

  searchInput: { flex: 1, color: TEXT, fontSize: 10 },

  therapyChip: {
    paddingHorizontal: 11,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F7F9F7",
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: "center",
    marginRight: 6,
  },

  therapyChipSelected: { backgroundColor: MINT },

  therapyText: { color: MUTED, fontSize: 8, fontWeight: "700" },

  therapyTextSelected: { color: GREEN },

  heading: {
    marginTop: 18,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headingTitle: { color: GREEN, fontSize: 15, fontWeight: "900" },

  headingSub: { color: MUTED, fontSize: 8, marginTop: 2 },

  count: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  countText: { color: GREEN, fontSize: 11, fontWeight: "900" },

  empty: {
    backgroundColor: WHITE,
    borderRadius: 17,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },

  emptyIcon: {
    width: 53,
    height: 53,
    borderRadius: 16,
    backgroundColor: GOLD_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: { color: GREEN, fontSize: 13, fontWeight: "900" },

  emptyText: { color: MUTED, fontSize: 9, textAlign: "center" },

  sessionCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
    marginBottom: 9,
  },

  sessionTop: {
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

  avatarText: { color: WHITE, fontWeight: "900", fontSize: 15 },

  patient: { color: TEXT, fontSize: 12, fontWeight: "900" },

  sessionId: { color: MUTED, fontSize: 8, marginTop: 2 },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
  },

  badgeText: { fontSize: 6.5, fontWeight: "900" },

  therapyBox: {
    marginTop: 11,
    backgroundColor: "#F8FAF8",
    borderRadius: 12,
    padding: 10,
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

  therapyName: { color: TEXT, fontSize: 10, fontWeight: "800" },

  sessionProgress: {
    color: GREEN,
    fontSize: 8,
    fontWeight: "900",
    backgroundColor: MINT,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },

  scheduleRow: { flexDirection: "row", gap: 7, marginTop: 9 },

  scheduleItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 11,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  scheduleText: { color: TEXT, fontSize: 7.5, fontWeight: "700" },

  actions: {
    flexDirection: "row",
    gap: 7,
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EDF1EE",
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

  detailsText: { color: GREEN, fontSize: 8.5, fontWeight: "900" },

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

  completeText: { color: WHITE, fontSize: 8.5, fontWeight: "900" },

  missedButton: {
    width: 42,
    height: 40,
    borderRadius: 11,
    backgroundColor: RED_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,31,25,0.55)",
    justifyContent: "flex-end",
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  modalTitle: { color: GREEN, fontSize: 17, fontWeight: "900" },

  modalSubtitle: { color: MUTED, fontSize: 8, marginTop: 2 },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F3F5F3",
    alignItems: "center",
    justifyContent: "center",
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF1EE",
  },

  detailIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: MINT,
    alignItems: "center",
    justifyContent: "center",
  },

  detailLabel: { color: MUTED, fontSize: 7.5 },

  detailValue: { color: TEXT, fontSize: 9.5, fontWeight: "800", marginTop: 2 },

  notes: {
    marginTop: 12,
    padding: 12,
    borderRadius: 13,
    backgroundColor: "#F8FAF8",
  },

  notesTitle: { color: GREEN, fontSize: 9, fontWeight: "900" },

  notesText: { color: MUTED, fontSize: 9, lineHeight: 15, marginTop: 5 },

  modalActions: { flexDirection: "row", gap: 8, marginTop: 15 },

  modalMissed: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: RED_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  modalMissedText: { color: RED, fontSize: 8.5, fontWeight: "900" },

  centerOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,31,25,0.55)",
    justifyContent: "center",
    padding: 22,
  },

  confirmCard: {
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 20,
    alignItems: "center",
  },

  confirmIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
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

  confirmCompleteText: { color: WHITE, fontSize: 9, fontWeight: "900" },

  cancelButton: {
    width: "100%",
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  cancelText: { color: MUTED, fontSize: 9, fontWeight: "800" },
});