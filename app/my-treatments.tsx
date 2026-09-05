import AsyncStorage from "@react-native-async-storage/async-storage";
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
  Image,
  Linking,
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

import { API_BASE_URL } from "../services/api";
import PatientDrawer from "../components/PatientDrawer";
import PatientHeader from "../components/PatientHeader";

const GREEN = "#0B3D2E";
const GREEN_2 = "#14533D";
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
const WARNING = "#B87A12";
const SUCCESS = "#2E7D4F";
const INFO = "#39708E";
const PURPLE = "#73558B";

type TabKey = "plans" | "sessions";

type NoticeType = "success" | "error" | "info";

type NoticeState = {
  visible: boolean;
  type: NoticeType;
  title: string;
  message: string;
  loginRedirect?: boolean;
};

type TreatmentPlan = {
  id: number;
  treatmentName?: string;
  doctorName?: string;
  therapistId?: number | null;
  therapistName?: string;
  diagnosis?: string;
  startDate?: string;
  expectedEndDate?: string;
  completedSessions?: number;
  remainingSessions?: number;
  totalSessions?: number;
  instructions?: string;
  notes?: string;
  status?: string;
};

type DailySession = {
  id?: number;
  treatmentPlanId?: number;
  treatmentName?: string;
  sessionNumber?: number;
  totalSessions?: number;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  therapistId?: number;
  therapistName?: string;
  status?: string;
  patientNotes?: string;
  therapistNotes?: string;
};

type TherapistAvailability = {
  id?: number | null;
  therapistId?: number | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  active: boolean;
};

type Slot = {
  startTime: string;
  endTime: string;
  available: boolean;
  unavailableReason?: string;
};

export default function MyTreatmentsScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  

  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [sessions, setSessions] = useState<DailySession[]>([]);
  const [tab, setTab] = useState<TabKey>("plans");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedPlanDetails, setSelectedPlanDetails] =
    useState<TreatmentPlan | null>(null);

  const [bookPlan, setBookPlan] =
    useState<TreatmentPlan | null>(null);

  const [sessionDate, setSessionDate] = useState("");
  const [patientNotes, setPatientNotes] = useState("");
  const [availability, setAvailability] =
    useState<TherapistAvailability[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] =
    useState<Slot | null>(null);
  const [slotLoading, setSlotLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  const [filteredPlanId, setFilteredPlanId] =
    useState<number | null>(null);

  const [notice, setNotice] = useState<NoticeState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
    loginRedirect: false,
  });

  useEffect(() => {
    initializePage();
  }, []);

  const displayedSessions = useMemo(() => {
    if (!filteredPlanId) return sessions;

    return sessions.filter(
      (session) =>
        Number(session.treatmentPlanId) === Number(filteredPlanId)
    );
  }, [sessions, filteredPlanId]);

  const summary = useMemo(() => {
    return {
      totalPlans: plans.length,
      activePlans: plans.filter(
        (plan) => normalize(plan.status) === "ACTIVE"
      ).length,
      bookedSessions: sessions.length,
      completedSessions: sessions.filter(
        (session) => normalize(session.status) === "COMPLETED"
      ).length,
    };
  }, [plans, sessions]);

  async function initializePage() {
    try {
      setLoading(true);

      const allowed = await requirePatientLogin();

      if (!allowed) return;

      

      await Promise.allSettled([
        loadTreatmentPlans(),
        loadDailySessions(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    setRefreshing(true);

    try {
      await Promise.allSettled([
        loadTreatmentPlans(),
        loadDailySessions(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  async function getToken() {
    return (
      (await AsyncStorage.getItem("token")) ||
      (await AsyncStorage.getItem("accessToken")) ||
      ""
    );
  }

  async function clearSession() {
    await AsyncStorage.multiRemove([
      "token",
      "accessToken",
      "refreshToken",
      "userId",
      "email",
      "name",
      "role",
      "profileCompleted",
      "isLoggedIn",
    ]);
  }

  async function requirePatientLogin() {
    const token = await getToken();
    const role = String(
      (await AsyncStorage.getItem("role")) || ""
    ).toUpperCase();

    if (!token) {
      showNotice(
        "info",
        "Login Required",
        "Please sign in to view your treatment plans.",
        true
      );
      return false;
    }

    if (role && role !== "USER") {
      showNotice(
        "error",
        "Patient Access Only",
        "Only patients can access My Treatments.",
        true
      );
      return false;
    }

    return true;
  }

  async function apiRequest(
    endpoint: string,
    options: RequestInit = {}
  ) {
    const token = await getToken();

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...((options.headers as Record<string, string>) || {}),
    };

    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
      }
    );

    const text = await response.text();

    let result: any = {};

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      result = {
        success: false,
        message: text || "Invalid server response.",
      };
    }

    if (response.status === 401 || response.status === 403) {
      await clearSession();

      const error: any = new Error(
        result?.message ||
          "Your login session has expired."
      );

      error.auth = true;
      throw error;
    }

    if (!response.ok || result?.success === false) {
      throw new Error(
        result?.message ||
          `Request failed (${response.status})`
      );
    }

    return result;
  }

  

  async function loadTreatmentPlans() {
    try {
      const result = await apiRequest(
        "/treatment-plans/my-plans",
        {
          method: "GET",
        }
      );

      setPlans(
        Array.isArray(result?.data) ? result.data : []
      );
    } catch (error: any) {
      setPlans([]);

      if (error?.auth) {
        showNotice(
          "error",
          "Session Expired",
          error.message,
          true
        );
        return;
      }

      showNotice(
        "error",
        "Unable to Load Plans",
        error?.message ||
          "Unable to load treatment plans."
      );
    }
  }

  async function loadDailySessions() {
    try {
      const result = await apiRequest(
        "/daily-treatments/my-sessions",
        {
          method: "GET",
        }
      );

      setSessions(
        Array.isArray(result?.data) ? result.data : []
      );
    } catch (error: any) {
      setSessions([]);

      if (error?.auth) {
        showNotice(
          "error",
          "Session Expired",
          error.message,
          true
        );
        return;
      }

      showNotice(
        "error",
        "Unable to Load Sessions",
        error?.message ||
          "Unable to load daily treatment sessions."
      );
    }
  }

  function showNotice(
    type: NoticeType,
    title: string,
    message: string,
    loginRedirect = false
  ) {
    setNotice({
      visible: true,
      type,
      title,
      message,
      loginRedirect,
    });
  }

  function closeNotice() {
    const redirect = notice.loginRedirect;

    setNotice((current) => ({
      ...current,
      visible: false,
      loginRedirect: false,
    }));

    if (redirect) {
      router.replace("/login" as any);
    }
  }

  function openPlanDetails(plan: TreatmentPlan) {
    setSelectedPlanDetails(plan);
  }

  function showSessionsForPlan(planId: number) {
    setFilteredPlanId(planId);
    setTab("sessions");

    const planSessions = sessions.filter(
      (session) =>
        Number(session.treatmentPlanId) === Number(planId)
    );

    if (!planSessions.length) {
      showNotice(
        "info",
        "No Sessions Yet",
        "No sessions are booked for this treatment plan."
      );
    }
  }

  async function openBookSession(plan: TreatmentPlan) {
    if (normalize(plan.status) !== "ACTIVE") {
      showNotice(
        "error",
        "Plan Not Active",
        "Only active treatment plans can be booked."
      );
      return;
    }

    if (!plan.therapistId) {
      showNotice(
        "error",
        "Therapist Not Assigned",
        "A therapist is not assigned to this treatment plan."
      );
      return;
    }

    setBookPlan(plan);
    setSessionDate("");
    setPatientNotes("");
    setAvailability([]);
    setSlots([]);
    setSelectedSlot(null);

    try {
      await loadTherapistAvailability(plan);
    } catch (error: any) {
      showNotice(
        "error",
        "Availability Unavailable",
        error?.message ||
          "Unable to load therapist availability."
      );
    }
  }

  async function loadTherapistAvailability(
    plan: TreatmentPlan
  ) {
    if (!plan.therapistId) {
      throw new Error("Therapist information is missing.");
    }

    const result = await apiRequest(
      `/therapist-availability/therapist/${encodeURIComponent(
        String(plan.therapistId)
      )}`,
      {
        method: "GET",
      }
    );

    const list: TherapistAvailability[] =
      Array.isArray(result?.data)
        ? result.data
            .map((item: any) => ({
              id:
                item.id ??
                item.availabilityId ??
                null,
              therapistId:
                item.therapistId ??
                plan.therapistId ??
                null,
              dayOfWeek: String(
                item.dayOfWeek || ""
              ).toUpperCase(),
              startTime: item.startTime || "",
              endTime: item.endTime || "",
              slotDurationMinutes: Number(
                item.slotDurationMinutes || 30
              ),
              active: item.active !== false,
            }))
            .filter(
              (item: TherapistAvailability) =>
                item.active
            )
        : [];

    setAvailability(list);

    if (!list.length) {
      throw new Error(
        "The therapist has not added any active availability."
      );
    }

    return list;
  }

  async function loadSlotsForDate(value: string) {
    setSessionDate(value);
    setSelectedSlot(null);
    setSlots([]);

    if (!value) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return;
    }

    if (!bookPlan?.therapistId) return;

    try {
      setSlotLoading(true);

      let currentAvailability = availability;

      if (!currentAvailability.length) {
        currentAvailability =
          await loadTherapistAvailability(bookPlan);
      }

      const dayOfWeek = getDayOfWeek(value);

      const dayAvailability =
        currentAvailability.find(
          (item) =>
            item.dayOfWeek === dayOfWeek
        );

      if (!dayAvailability) {
        showNotice(
          "info",
          "Therapist Not Available",
          `${
            bookPlan.therapistName || "The therapist"
          } is not available on ${formatLabel(
            dayOfWeek
          )}. Please choose another date.`
        );
        return;
      }

      const generated = generateSlots(
        dayAvailability,
        value,
        bookPlan
      );

      setSlots(generated);
    } catch (error: any) {
      showNotice(
        "error",
        "Unable to Load Slots",
        error?.message ||
          "Unable to load available slots."
      );
    } finally {
      setSlotLoading(false);
    }
  }

  function generateSlots(
    item: TherapistAvailability,
    selectedDate: string,
    plan: TreatmentPlan
  ) {
    const startMinutes =
      timeToMinutes(item.startTime);

    const endMinutes =
      timeToMinutes(item.endTime);

    const duration = Math.max(
      Number(item.slotDurationMinutes) || 30,
      1
    );

    if (
      !Number.isFinite(startMinutes) ||
      !Number.isFinite(endMinutes) ||
      endMinutes <= startMinutes
    ) {
      return [];
    }

    const generated: Slot[] = [];

    for (
      let current = startMinutes;
      current + duration <= endMinutes;
      current += duration
    ) {
      const startTime =
        minutesToApiTime(current);

      const endTime =
        minutesToApiTime(current + duration);

      const alreadyBookedByPatient =
        sessions.some(
          (session) =>
            Number(session.therapistId) ===
              Number(plan.therapistId) &&
            String(
              session.sessionDate || ""
            ).substring(0, 10) === selectedDate &&
            normalizeApiTime(
              String(
                session.startTime || ""
              ).substring(0, 5)
            ) === startTime &&
            ![
              "CANCELLED",
              "REJECTED",
              "MISSED",
            ].includes(normalize(session.status))
        );

      const past = isPastSlot(
        selectedDate,
        startTime
      );

      generated.push({
        startTime,
        endTime,
        available:
          !alreadyBookedByPatient && !past,
        unavailableReason: past
          ? "Past time"
          : alreadyBookedByPatient
          ? "Already booked"
          : "",
      });
    }

    return generated;
  }

  async function submitBookSession() {
    if (!bookPlan?.id) {
      showNotice(
        "error",
        "Plan Missing",
        "Treatment plan ID is missing."
      );
      return;
    }

    if (!sessionDate || !selectedSlot) {
      showNotice(
        "info",
        "Select Date and Time",
        "Please select the session date and one available time slot."
      );
      return;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        sessionDate
      )
    ) {
      showNotice(
        "info",
        "Check the Date",
        "Please enter the session date as YYYY-MM-DD."
      );
      return;
    }

    try {
      setBooking(true);

      const result = await apiRequest(
        "/daily-treatments/book-session",
        {
          method: "POST",
          body: JSON.stringify({
            treatmentPlanId: Number(bookPlan.id),
            sessionDate,
            startTime: normalizeApiTime(
              selectedSlot.startTime
            ),
            patientNotes:
              patientNotes.trim(),
          }),
        }
      );

      setBookPlan(null);
      setSessionDate("");
      setPatientNotes("");
      setSelectedSlot(null);
      setSlots([]);
      setAvailability([]);

      showNotice(
        "success",
        "Session Booked",
        result?.message ||
          "Daily treatment session booked successfully."
      );

      await Promise.allSettled([
        loadTreatmentPlans(),
        loadDailySessions(),
      ]);

      setFilteredPlanId(null);
      setTab("sessions");
    } catch (error: any) {
      showNotice(
        "error",
        "Booking Failed",
        error?.message ||
          "Unable to book the treatment session."
      );
    } finally {
      setBooking(false);
    }
  }

  async function openURL(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      showNotice(
        "error",
        "Unable to Open",
        "This link could not be opened on your device."
      );
    }
  }

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loaderText}>
          Preparing your wellness journey...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      
        
       <PatientHeader
  onMenuPress={() => setMenuOpen(true)}
/>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 0,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAll}
            tintColor={GREEN}
          />
        }
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroOrbOne} />
          <View style={styles.heroOrbTwo} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="flower-outline"
                size={26}
                color={GREEN}
              />
            </View>

            <View style={styles.heroMiniTag}>
              <Ionicons
                name="sparkles-outline"
                size={12}
                color={GOLD_LIGHT}
              />
              <Text style={styles.heroMiniTagText}>
                YOUR PERSONAL CARE PATH
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            My Treatment{"\n"}
            <Text style={styles.heroAccent}>
              Journey
            </Text>
          </Text>

          <Text style={styles.heroText}>
            Follow your treatment plans, track progress,
            book daily sessions and stay connected with
            therapist updates in one simple place.
          </Text>

          <View style={styles.heroStats}>
            <HeroStat
              value={summary.totalPlans}
              label="Plans"
            />
            <View style={styles.heroStatDivider} />
            <HeroStat
              value={summary.activePlans}
              label="Active"
            />
            <View style={styles.heroStatDivider} />
            <HeroStat
              value={summary.completedSessions}
              label="Completed"
            />
          </View>
        </View>

        {/* SUMMARY */}
        <View style={styles.summarySection}>
          <Text style={styles.eyebrow}>
            YOUR WELLNESS AT A GLANCE
          </Text>

          <Text style={styles.sectionTitle}>
            Care Progress
          </Text>

          <View style={styles.summaryGrid}>
            <SummaryCard
              icon="document-text-outline"
              label="Total Plans"
              value={summary.totalPlans}
              accent={GREEN}
              soft={MINT}
            />

            <SummaryCard
              icon="play-circle-outline"
              label="Active Plans"
              value={summary.activePlans}
              accent={GOLD_DARK}
              soft="#FFF6DC"
            />

            <SummaryCard
              icon="calendar-outline"
              label="Booked Sessions"
              value={summary.bookedSessions}
              accent={INFO}
              soft="#EDF5FA"
            />

            <SummaryCard
              icon="checkmark-circle-outline"
              label="Completed"
              value={summary.completedSessions}
              accent={SUCCESS}
              soft="#EAF7EE"
            />
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabShell}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              tab === "plans" &&
                styles.tabButtonActive,
            ]}
            onPress={() => {
              setFilteredPlanId(null);
              setTab("plans");
            }}
          >
            <Ionicons
              name="reader-outline"
              size={17}
              color={
                tab === "plans" ? WHITE : GREEN
              }
            />
            <Text
              style={[
                styles.tabText,
                tab === "plans" &&
                  styles.tabTextActive,
              ]}
            >
              Treatment Plans
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              tab === "sessions" &&
                styles.tabButtonActive,
            ]}
            onPress={() => {
              setFilteredPlanId(null);
              setTab("sessions");
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={17}
              color={
                tab === "sessions"
                  ? WHITE
                  : GREEN
              }
            />
            <Text
              style={[
                styles.tabText,
                tab === "sessions" &&
                  styles.tabTextActive,
              ]}
            >
              Daily Sessions
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <LoadingCard />
        ) : tab === "plans" ? (
          <View style={styles.contentSection}>
            <View style={styles.contentHeadingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>
                  DOCTOR-CREATED CARE
                </Text>
                <Text style={styles.sectionTitle}>
                  Your Treatment Plans
                </Text>
              </View>

              <View style={styles.countPill}>
                <Text style={styles.countPillText}>
                  {plans.length}
                </Text>
              </View>
            </View>

            {!plans.length ? (
              <EmptyState
                icon="document-text-outline"
                title="No Treatment Plans Yet"
                text="Your doctor-created treatment plans will appear here."
              />
            ) : (
              <View style={styles.planList}>
                {plans.map((plan) => (
                  <PlanCard
                    key={String(plan.id)}
                    plan={plan}
                    onDetails={() =>
                      openPlanDetails(plan)
                    }
                    onBook={() =>
                      openBookSession(plan)
                    }
                    onSessions={() =>
                      showSessionsForPlan(plan.id)
                    }
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.contentSection}>
            <View style={styles.contentHeadingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>
                  DAILY CARE SCHEDULE
                </Text>
                <Text style={styles.sectionTitle}>
                  Treatment Sessions
                </Text>
              </View>

              <View style={styles.countPill}>
                <Text style={styles.countPillText}>
                  {displayedSessions.length}
                </Text>
              </View>
            </View>

            {filteredPlanId && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() =>
                  setFilteredPlanId(null)
                }
              >
                <Ionicons
                  name="close-circle-outline"
                  size={15}
                  color={GREEN}
                />
                <Text style={styles.clearFilterText}>
                  Showing one treatment plan — View all
                </Text>
              </TouchableOpacity>
            )}

            {!displayedSessions.length ? (
              <EmptyState
                icon="calendar-outline"
                title="No Sessions Found"
                text="Booked daily treatment sessions will appear here."
              />
            ) : (
              <View style={styles.sessionList}>
                {displayedSessions.map(
                  (session, index) => (
                    <SessionCard
                      key={`${
                        session.id ||
                        session.treatmentPlanId ||
                        "session"
                      }-${index}`}
                      session={session}
                    />
                  )
                )}
              </View>
            )}
          </View>
        )}

        {/* SUPPORT CTA */}
        <View style={styles.supportCard}>
          <View style={styles.supportIcon}>
            <Ionicons
              name="heart-outline"
              size={23}
              color={GOLD}
            />
          </View>

          <Text style={styles.supportEyebrow}>
            PERSONAL WELLNESS SUPPORT
          </Text>

          <Text style={styles.supportTitle}>
            Need Help With Your Treatment Plan?
          </Text>

          <Text style={styles.supportText}>
            Connect with NeoLife for help with your
            treatment schedule, therapist sessions or
            wellness journey.
          </Text>

          <TouchableOpacity
            style={styles.supportButton}
            onPress={() =>
              openURL(
                "https://wa.me/919481489866?text=Hello%20NeoLife%20Wellness%20Center,%20I%20need%20help%20with%20my%20treatment%20plan."
              )
            }
          >
            <Ionicons
              name="logo-whatsapp"
              size={18}
              color={GREEN}
            />
            <Text style={styles.supportButtonText}>
              Chat With NeoLife
            </Text>
          </TouchableOpacity>
        </View>

        {/* SAME FOOTER AS ABOUT PAGE */}
        <View style={styles.footer}>
          <Image
            source={require("../assets/images/main_logo.jpeg")}
            style={styles.footerLogo}
          />

          <Text style={styles.footerBrand}>
            NeoLife Wellness Center
          </Text>

          <Text style={styles.footerTagline}>
            Natural healing, Ayurvedic care and trusted
            wellness support for a healthier life.
          </Text>

          <TouchableOpacity
            style={styles.footerRow}
            onPress={() =>
              openURL("tel:+919481489866")
            }
          >
            <Ionicons
              name="call-outline"
              size={17}
              color={GOLD}
            />
            <Text style={styles.footerText}>
              +91 94814 89866
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerRow}
            onPress={() =>
              openURL(
                "mailto:neelavar.murali@gmail.com"
              )
            }
          >
            <Ionicons
              name="mail-outline"
              size={17}
              color={GOLD}
            />
            <Text style={styles.footerText}>
              neelavar.murali@gmail.com
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerAddress}>
            4-1-38, Behind Lions Bhavan Road, Nairkere
            1st Cross, Brahmagiri, Ambalapady Post,
            Udupi – 576103, Karnataka, India
          </Text>

          <View style={styles.socialRow}>
            <SocialButton
              icon="logo-facebook"
              onPress={() =>
                openURL(
                  "https://www.facebook.com/profile.php?id=61575580360517"
                )
              }
            />

            <SocialButton
              icon="logo-instagram"
              onPress={() =>
                openURL(
                  "https://www.instagram.com/neolives_global"
                )
              }
            />

            <SocialButton
              icon="logo-youtube"
              onPress={() =>
                openURL(
                  "https://www.youtube.com/@NeolifeWellnessCenterUdupi-o7x"
                )
              }
            />

            <SocialButton
              icon="logo-whatsapp"
              onPress={() =>
                openURL(
                  "https://wa.me/919481489866"
                )
              }
            />
          </View>

          <Text style={styles.copyright}>
            © 2026 NeoLife Wellness Center. All Rights
            Reserved.
          </Text>
        </View>
      </ScrollView>

      {/* FLOATING WHATSAPP */}
      <TouchableOpacity
        style={styles.whatsapp}
        onPress={() =>
          openURL(
            "https://wa.me/919481489866?text=Hello%20NeoLife%20Wellness%20Center,%20I%20need%20help."
          )
        }
      >
        <Ionicons
          name="logo-whatsapp"
          size={28}
          color={WHITE}
        />
      </TouchableOpacity>

      {/* SHARED PATIENT DRAWER */}
<PatientDrawer
  visible={menuOpen}
  onClose={() => setMenuOpen(false)}
/>

      {/* PLAN DETAILS MODAL */}
      <Modal
        visible={Boolean(selectedPlanDetails)}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSelectedPlanDetails(null)
        }
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() =>
              setSelectedPlanDetails(null)
            }
          />

          <View style={styles.detailsSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetEyebrow}>
                  TREATMENT PLAN
                </Text>
                <Text style={styles.sheetTitle}>
                  Plan Details
                </Text>
              </View>

              <TouchableOpacity
                style={styles.sheetClose}
                onPress={() =>
                  setSelectedPlanDetails(null)
                }
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={GREEN}
                />
              </TouchableOpacity>
            </View>

            {selectedPlanDetails && (
              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
              >
                <WideDetail
                  icon="flower-outline"
                  label="Treatment Name"
                  value={
                    selectedPlanDetails.treatmentName ||
                    "-"
                  }
                />

                <View style={styles.detailGrid}>
                  <DetailBox
                    icon="medical-outline"
                    label="Doctor"
                    value={
                      selectedPlanDetails.doctorName ||
                      "-"
                    }
                  />

                  <DetailBox
                    icon="person-outline"
                    label="Therapist"
                    value={
                      selectedPlanDetails.therapistName ||
                      "-"
                    }
                  />

                  <DetailBox
                    icon="calendar-outline"
                    label="Start Date"
                    value={formatDate(
                      selectedPlanDetails.startDate
                    )}
                  />

                  <DetailBox
                    icon="calendar-number-outline"
                    label="Expected End"
                    value={formatDate(
                      selectedPlanDetails.expectedEndDate
                    )}
                  />

                  <DetailBox
                    icon="checkmark-done-outline"
                    label="Completed"
                    value={String(
                      Number(
                        selectedPlanDetails.completedSessions ||
                          0
                      )
                    )}
                  />

                  <DetailBox
                    icon="hourglass-outline"
                    label="Remaining"
                    value={String(
                      Number(
                        selectedPlanDetails.remainingSessions ||
                          0
                      )
                    )}
                  />
                </View>

                <WideDetail
                  icon="pulse-outline"
                  label="Diagnosis"
                  value={
                    selectedPlanDetails.diagnosis ||
                    "-"
                  }
                />

                <WideDetail
                  icon="information-circle-outline"
                  label="Instructions"
                  value={
                    selectedPlanDetails.instructions ||
                    "-"
                  }
                />

                <WideDetail
                  icon="document-text-outline"
                  label="Doctor Notes"
                  value={
                    selectedPlanDetails.notes || "-"
                  }
                />

                <View style={styles.statusDetail}>
                  <Text style={styles.statusDetailLabel}>
                    PLAN STATUS
                  </Text>
                  <StatusBadge
                    status={
                      selectedPlanDetails.status
                    }
                  />
                </View>

                <View style={{ height: 25 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* BOOK SESSION MODAL */}
      <Modal
        visible={Boolean(bookPlan)}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setBookPlan(null)
        }
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() =>
              setBookPlan(null)
            }
          />

          <View style={styles.bookingSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetEyebrow}>
                  SCHEDULE DAILY CARE
                </Text>
                <Text style={styles.sheetTitle}>
                  Book Next Session
                </Text>
              </View>

              <TouchableOpacity
                style={styles.sheetClose}
                onPress={() =>
                  setBookPlan(null)
                }
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={GREEN}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.planMiniCard}>
                <View style={styles.planMiniIcon}>
                  <Ionicons
                    name="flower-outline"
                    size={19}
                    color={GREEN}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.planMiniLabel}>
                    TREATMENT PLAN
                  </Text>
                  <Text style={styles.planMiniTitle}>
                    {bookPlan?.treatmentName ||
                      "Treatment Plan"}
                  </Text>
                  <Text style={styles.planMiniSub}>
                    {bookPlan?.therapistName ||
                      "Therapist"}
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>
                SESSION DATE
              </Text>

              <View style={styles.inputWrap}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={GOLD_DARK}
                />

                <TextInput
                  value={sessionDate}
                  onChangeText={
                    loadSlotsForDate
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9AA59E"
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  style={styles.input}
                />
              </View>

              <Text style={styles.inputHint}>
                Enter a future date in YYYY-MM-DD
                format.
              </Text>

              <View style={styles.slotHeadingRow}>
                <Text style={styles.inputLabel}>
                  AVAILABLE TIME SLOTS
                </Text>

                {slots.length > 0 && (
                  <Text style={styles.slotCount}>
                    {
                      slots.filter(
                        (slot) =>
                          slot.available
                      ).length
                    }{" "}
                    available
                  </Text>
                )}
              </View>

              <View style={styles.slotGrid}>
                {slotLoading ? (
                  <View style={styles.slotMessage}>
                    <ActivityIndicator
                      size="small"
                      color={GREEN}
                    />
                    <Text
                      style={
                        styles.slotMessageText
                      }
                    >
                      Checking therapist
                      availability...
                    </Text>
                  </View>
                ) : !sessionDate ? (
                  <View style={styles.slotMessage}>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={GOLD_DARK}
                    />
                    <Text
                      style={
                        styles.slotMessageText
                      }
                    >
                      Select a session date to
                      view available slots.
                    </Text>
                  </View>
                ) : !slots.length ? (
                  <View style={styles.slotMessage}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={MUTED}
                    />
                    <Text
                      style={
                        styles.slotMessageText
                      }
                    >
                      No selectable slots are
                      available for this date.
                    </Text>
                  </View>
                ) : (
                  slots.map((slot) => {
                    const selected =
                      selectedSlot?.startTime ===
                      slot.startTime;

                    return (
                      <TouchableOpacity
                        key={`${slot.startTime}-${slot.endTime}`}
                        style={[
                          styles.slotButton,
                          selected &&
                            styles.slotButtonSelected,
                          !slot.available &&
                            styles.slotButtonDisabled,
                        ]}
                        disabled={!slot.available}
                        onPress={() =>
                          setSelectedSlot(slot)
                        }
                      >
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={
                            selected
                              ? WHITE
                              : slot.available
                              ? GREEN
                              : "#A6AEA8"
                          }
                        />

                        <Text
                          style={[
                            styles.slotButtonText,
                            selected &&
                              styles.slotButtonTextSelected,
                            !slot.available &&
                              styles.slotButtonTextDisabled,
                          ]}
                        >
                          {formatTime(
                            slot.startTime
                          )}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              {selectedSlot && (
                <View
                  style={styles.selectedSlotCard}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={SUCCESS}
                  />
                  <Text
                    style={
                      styles.selectedSlotText
                    }
                  >
                    Selected:{" "}
                    {formatTime(
                      selectedSlot.startTime
                    )}{" "}
                    -{" "}
                    {formatTime(
                      selectedSlot.endTime
                    )}
                  </Text>
                </View>
              )}

              <Text style={styles.inputLabel}>
                PATIENT NOTES
              </Text>

              <View
                style={styles.notesInputWrap}
              >
                <TextInput
                  value={patientNotes}
                  onChangeText={setPatientNotes}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                  placeholder="Mention symptoms, pain level or any information for the therapist"
                  placeholderTextColor="#9AA59E"
                  style={styles.notesInput}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.bookButton,
                  booking &&
                    styles.bookButtonDisabled,
                ]}
                disabled={booking}
                onPress={submitBookSession}
              >
                {booking ? (
                  <ActivityIndicator
                    size="small"
                    color={GREEN}
                  />
                ) : (
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={GREEN}
                  />
                )}

                <Text style={styles.bookButtonText}>
                  {booking
                    ? "Booking Session..."
                    : "Book Session"}
                </Text>

                {!booking && (
                  <Ionicons
                    name="arrow-forward"
                    size={17}
                    color={GREEN}
                  />
                )}
              </TouchableOpacity>

              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* BRANDED NOTICE */}
      <Modal
        visible={notice.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeNotice}
      >
        <View style={styles.noticeRoot}>
          <Pressable
            style={styles.noticeBackdrop}
            onPress={closeNotice}
          />

          <View style={styles.noticeCard}>
            <View
              style={[
                styles.noticeIcon,
                notice.type === "success"
                  ? styles.noticeSuccess
                  : notice.type === "error"
                  ? styles.noticeError
                  : styles.noticeInfo,
              ]}
            >
              <Ionicons
                name={
                  notice.type === "success"
                    ? "checkmark-circle-outline"
                    : notice.type === "error"
                    ? "alert-circle-outline"
                    : "information-circle-outline"
                }
                size={31}
                color={
                  notice.type === "success"
                    ? SUCCESS
                    : notice.type === "error"
                    ? DANGER
                    : INFO
                }
              />
            </View>

            <Text style={styles.noticeEyebrow}>
              NEOLIFE WELLNESS
            </Text>

            <Text style={styles.noticeTitle}>
              {notice.title}
            </Text>

            <Text style={styles.noticeMessage}>
              {notice.message}
            </Text>

            <TouchableOpacity
              style={styles.noticeButton}
              onPress={closeNotice}
            >
              <Text
                style={styles.noticeButtonText}
              >
                {notice.loginRedirect
                  ? "Go to Login"
                  : "Okay"}
              </Text>

              <Ionicons
                name="arrow-forward"
                size={17}
                color={GREEN}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PlanCard({
  plan,
  onDetails,
  onBook,
  onSessions,
}: {
  plan: TreatmentPlan;
  onDetails: () => void;
  onBook: () => void;
  onSessions: () => void;
}) {
  const completed = Number(
    plan.completedSessions || 0
  );

  const total = Number(
    plan.totalSessions || 0
  );

  const remaining = Number(
    plan.remainingSessions || 0
  );

  const percentage =
    total > 0
      ? Math.min(
          100,
          Math.round((completed / total) * 100)
        )
      : 0;

  const canBook =
    normalize(plan.status) === "ACTIVE" &&
    remaining > 0;

  return (
    <View style={styles.planCard}>
      <View style={styles.planCardTop}>
        <View style={styles.planIcon}>
          <Ionicons
            name="flower-outline"
            size={23}
            color={GREEN}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.planKicker}>
            PERSONAL TREATMENT PLAN
          </Text>

          <Text style={styles.planTitle}>
            {plan.treatmentName ||
              "Treatment Plan"}
          </Text>

          <Text style={styles.planDoctor}>
            Created by{" "}
            {plan.doctorName || "Doctor"}
          </Text>
        </View>

        <StatusBadge status={plan.status} />
      </View>

      <View style={styles.planInfoGrid}>
        <MiniInfo
          icon="person-outline"
          label="Therapist"
          value={plan.therapistName || "-"}
        />

        <MiniInfo
          icon="pulse-outline"
          label="Diagnosis"
          value={plan.diagnosis || "-"}
        />

        <MiniInfo
          icon="calendar-outline"
          label="Start Date"
          value={formatDate(plan.startDate)}
        />

        <MiniInfo
          icon="flag-outline"
          label="Expected End"
          value={formatDate(
            plan.expectedEndDate
          )}
        />
      </View>

      <View style={styles.progressHeader}>
        <View>
          <Text style={styles.progressLabel}>
            TREATMENT PROGRESS
          </Text>
          <Text style={styles.progressValue}>
            {completed} of {total} sessions
          </Text>
        </View>

        <Text style={styles.progressPercent}>
          {percentage}%
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${percentage}%`,
            },
          ]}
        />
      </View>

      <View style={styles.sessionSummaryRow}>
        <View style={styles.sessionSummaryItem}>
          <Text
            style={
              styles.sessionSummaryNumber
            }
          >
            {completed}
          </Text>
          <Text
            style={styles.sessionSummaryLabel}
          >
            Completed
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.sessionSummaryItem}>
          <Text
            style={
              styles.sessionSummaryNumber
            }
          >
            {remaining}
          </Text>
          <Text
            style={styles.sessionSummaryLabel}
          >
            Remaining
          </Text>
        </View>
      </View>

      <View style={styles.planActions}>
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={onDetails}
        >
          <Ionicons
            name="eye-outline"
            size={15}
            color={GREEN}
          />
          <Text
            style={
              styles.secondaryActionText
            }
          >
            Details
          </Text>
        </TouchableOpacity>

        {canBook && (
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={onBook}
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color={GREEN}
            />
            <Text
              style={styles.primaryActionText}
            >
              Book Next
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.infoAction}
          onPress={onSessions}
        >
          <Ionicons
            name="list-outline"
            size={15}
            color={INFO}
          />
          <Text style={styles.infoActionText}>
            Sessions
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SessionCard({
  session,
}: {
  session: DailySession;
}) {
  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionTop}>
        <View style={styles.sessionNumberIcon}>
          <Text style={styles.sessionNumberText}>
            {Number(session.sessionNumber || 0)}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.sessionEyebrow}>
            SESSION{" "}
            {Number(session.sessionNumber || 0)}{" "}
            OF{" "}
            {Number(session.totalSessions || 0)}
          </Text>

          <Text style={styles.sessionTitle}>
            {session.treatmentName ||
              "Treatment"}
          </Text>
        </View>

        <StatusBadge
          status={session.status}
        />
      </View>

      <View style={styles.sessionDateRow}>
        <View style={styles.sessionDateItem}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={GOLD_DARK}
          />
          <View>
            <Text style={styles.sessionMetaLabel}>
              DATE
            </Text>
            <Text style={styles.sessionMetaValue}>
              {formatDate(
                session.sessionDate
              )}
            </Text>
          </View>
        </View>

        <View style={styles.sessionDateItem}>
          <Ionicons
            name="time-outline"
            size={16}
            color={GOLD_DARK}
          />
          <View>
            <Text style={styles.sessionMetaLabel}>
              TIME
            </Text>
            <Text style={styles.sessionMetaValue}>
              {formatTime(session.startTime)}
              {session.endTime
                ? ` - ${formatTime(
                    session.endTime
                  )}`
                : ""}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.therapistRow}>
        <View style={styles.therapistAvatar}>
          <Ionicons
            name="person-outline"
            size={17}
            color={GREEN}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.therapistLabel}>
            THERAPIST
          </Text>
          <Text style={styles.therapistName}>
            {session.therapistName || "-"}
          </Text>
        </View>
      </View>

      <View style={styles.notesSection}>
        <NoteBlock
          icon="chatbubble-ellipses-outline"
          label="Your Notes"
          value={session.patientNotes || "-"}
        />

        <NoteBlock
          icon="clipboard-outline"
          label="Therapist Notes"
          value={
            session.therapistNotes || "-"
          }
        />
      </View>
    </View>
  );
}

function StatusBadge({
  status,
}: {
  status?: string;
}) {
  const theme = getStatusTheme(status);

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: theme.soft,
        },
      ]}
    >
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: theme.color,
          },
        ]}
      />

      <Text
        style={[
          styles.statusText,
          {
            color: theme.color,
          },
        ]}
      >
        {formatLabel(status)}
      </Text>
    </View>
  );
}

function HeroStat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>
        {value}
      </Text>
      <Text style={styles.heroStatLabel}>
        {label}
      </Text>
    </View>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
  soft,
}: {
  icon: any;
  label: string;
  value: number;
  accent: string;
  soft: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View
        style={[
          styles.summaryIcon,
          { backgroundColor: soft },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={accent}
        />
      </View>

      <Text style={styles.summaryLabel}>
        {label}
      </Text>

      <Text style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

function MiniInfo({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.miniInfo}>
      <Ionicons
        name={icon}
        size={14}
        color={GOLD_DARK}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.miniInfoLabel}>
          {label}
        </Text>
        <Text
          style={styles.miniInfoValue}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function DetailBox({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailBox}>
      <View style={styles.detailIcon}>
        <Ionicons
          name={icon}
          size={16}
          color={GREEN}
        />
      </View>

      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value || "-"}
      </Text>
    </View>
  );
}

function WideDetail({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.wideDetail}>
      <View style={styles.wideDetailIcon}>
        <Ionicons
          name={icon}
          size={17}
          color={GREEN}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>
          {label}
        </Text>

        <Text style={styles.wideDetailValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function NoteBlock({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.noteBlock}>
      <View style={styles.noteIcon}>
        <Ionicons
          name={icon}
          size={15}
          color={GREEN}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.noteLabel}>
          {label}
        </Text>
        <Text style={styles.noteValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function LoadingCard() {
  return (
    <View style={styles.loadingCard}>
      <ActivityIndicator
        size="large"
        color={GREEN}
      />
      <Text style={styles.loadingTitle}>
        Loading your treatment journey
      </Text>
      <Text style={styles.loadingText}>
        Checking plans, sessions and treatment
        progress...
      </Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: any;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={icon}
          size={28}
          color={GOLD_DARK}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {title}
      </Text>

      <Text style={styles.emptyText}>
        {text}
      </Text>
    </View>
  );
}

function SocialButton({
  icon,
  onPress,
}: {
  icon: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.socialButton}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={20}
        color={WHITE}
      />
    </TouchableOpacity>
  );
}

function normalize(value: any) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/ /g, "_");
}

function formatLabel(value: any) {
  const text = String(value || "-")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );

  return text || "-";
}

function formatDate(value?: string) {
  if (!value) return "-";

  const dateValue = String(value).substring(
    0,
    10
  );

  const date = new Date(
    `${dateValue}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "-";

  const parts = String(value).split(":");

  if (parts.length < 2) {
    return String(value);
  }

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return String(value);
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(
    minute
  ).padStart(2, "0")} ${period}`;
}

function normalizeApiTime(value: string) {
  const parts = String(value || "").split(":");

  if (parts.length < 2) return value;

  return `${String(parts[0]).padStart(
    2,
    "0"
  )}:${String(parts[1]).padStart(
    2,
    "0"
  )}:00`;
}

function getDayOfWeek(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ][date.getDay()];
}

function timeToMinutes(value: string) {
  const parts = String(value || "").split(":");

  if (parts.length < 2) return NaN;

  return (
    Number(parts[0]) * 60 +
    Number(parts[1])
  );
}

function minutesToApiTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(mins).padStart(2, "0")}:00`;
}

function isPastSlot(
  dateValue: string,
  timeValue: string
) {
  return (
    new Date(
      `${dateValue}T${timeValue}`
    ).getTime() <= Date.now()
  );
}

function getStatusTheme(value?: string) {
  const status = normalize(value);

  if (
    [
      "ACTIVE",
      "APPROVED",
      "COMPLETED",
    ].includes(status)
  ) {
    return {
      color: SUCCESS,
      soft: "#EAF6ED",
    };
  }

  if (
    ["PENDING", "RESCHEDULED"].includes(
      status
    )
  ) {
    return {
      color: WARNING,
      soft: "#FFF6E8",
    };
  }

  if (
    [
      "CANCELLED",
      "CANCELED",
      "MISSED",
      "REJECTED",
    ].includes(status)
  ) {
    return {
      color: DANGER,
      soft: "#FFF0F0",
    };
  }

  return {
    color: MUTED,
    soft: "#F1F3F1",
  };
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },

  loaderText: {
    marginTop: 11,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 11,
  },

  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  

  /* HERO */
  hero: {
    margin: 16,
    padding: 24,
    minHeight: 395,
    overflow: "hidden",
    borderRadius: 31,
    justifyContent: "flex-end",
    backgroundColor: GREEN,
  },

  heroOrbOne: {
    position: "absolute",
    width: 240,
    height: 240,
    right: -95,
    top: -95,
    borderRadius: 120,
    backgroundColor:
      "rgba(214,180,91,.15)",
  },

  heroOrbTwo: {
    position: "absolute",
    width: 180,
    height: 180,
    left: -70,
    bottom: -80,
    borderRadius: 90,
    backgroundColor:
      "rgba(255,255,255,.05)",
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },

  heroMiniTag: {
    maxWidth: 185,
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor:
      "rgba(255,255,255,.08)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,.10)",
  },

  heroMiniTagText: {
    flexShrink: 1,
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 7,
    letterSpacing: 0.8,
  },

  heroTitle: {
    marginTop: 23,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 39,
    lineHeight: 43,
    letterSpacing: -0.8,
  },

  heroAccent: {
    color: GOLD_LIGHT,
  },

  heroText: {
    marginTop: 12,
    maxWidth: 340,
    fontFamily: "DMSans_400Regular",
    color: "#D8E6DD",
    fontSize: 11,
    lineHeight: 18,
  },

  heroStats: {
    marginTop: 24,
    minHeight: 70,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      "rgba(255,255,255,.08)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,.08)",
  },

  heroStat: {
    flex: 1,
    alignItems: "center",
  },

  heroStatValue: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 22,
  },

  heroStatLabel: {
    marginTop: 2,
    fontFamily: "DMSans_500Medium",
    color: "#C5D6CC",
    fontSize: 8,
  },

  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor:
      "rgba(255,255,255,.14)",
  },

  /* SUMMARY */
  summarySection: {
    paddingTop: 25,
    paddingHorizontal: 16,
  },

  eyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    letterSpacing: 1.4,
  },

  sectionTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 28,
    lineHeight: 33,
  },

  summaryGrid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  summaryCard: {
    width: "48%",
    minHeight: 130,
    padding: 14,
    borderRadius: 21,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryLabel: {
    marginTop: 13,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 8,
  },

  summaryValue: {
    marginTop: 2,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 24,
  },

  /* TABS */
  tabShell: {
    marginTop: 30,
    marginHorizontal: 16,
    padding: 6,
    borderRadius: 18,
    flexDirection: "row",
    gap: 6,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  tabButton: {
    flex: 1,
    minHeight: 47,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  tabButtonActive: {
    backgroundColor: GREEN,
  },

  tabText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  tabTextActive: {
    color: WHITE,
  },

  contentSection: {
    paddingTop: 30,
    paddingHorizontal: 16,
  },

  contentHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  countPill: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  countPillText: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 18,
  },

  planList: {
    marginTop: 18,
    gap: 15,
  },

  /* PLAN CARD */
  planCard: {
    padding: 16,
    borderRadius: 26,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 3,
    shadowColor: GREEN,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },

  planCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  planIcon: {
    width: 49,
    height: 49,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  planKicker: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 0.9,
  },

  planTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 20,
    lineHeight: 24,
  },

  planDoctor: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },

  statusBadge: {
    minHeight: 27,
    maxWidth: 100,
    paddingHorizontal: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusText: {
    flexShrink: 1,
    fontFamily: "DMSans_700Bold",
    fontSize: 7,
  },

  planInfoGrid: {
    marginTop: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  miniInfo: {
    width: "48%",
    minHeight: 58,
    padding: 9,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#F8F9F6",
  },

  miniInfoLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 6,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  miniInfoValue: {
    marginTop: 2,
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 8,
    lineHeight: 12,
  },

  progressHeader: {
    marginTop: 17,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  progressLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 7,
    letterSpacing: 0.8,
  },

  progressValue: {
    marginTop: 3,
    fontFamily: "DMSans_500Medium",
    color: GREEN,
    fontSize: 8,
  },

  progressPercent: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GOLD_DARK,
    fontSize: 17,
  },

  progressTrack: {
    height: 8,
    marginTop: 8,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#E7ECE8",
  },

  progressFill: {
    height: "100%",
    borderRadius: 8,
    backgroundColor: GOLD,
  },

  sessionSummaryRow: {
    marginTop: 13,
    minHeight: 55,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MINT,
  },

  sessionSummaryItem: {
    flex: 1,
    alignItems: "center",
  },

  sessionSummaryNumber: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 17,
  },

  sessionSummaryLabel: {
    marginTop: 1,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 7,
  },

  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#CDDED3",
  },

  planActions: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  secondaryAction: {
    minHeight: 41,
    paddingHorizontal: 11,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  secondaryActionText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },

  primaryAction: {
    flexGrow: 1,
    minHeight: 41,
    paddingHorizontal: 11,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: GOLD,
  },

  primaryActionText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },

  infoAction: {
    minHeight: 41,
    paddingHorizontal: 11,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EDF5FA",
  },

  infoActionText: {
    fontFamily: "DMSans_700Bold",
    color: INFO,
    fontSize: 8,
  },

  /* SESSIONS */
  sessionList: {
    marginTop: 18,
    gap: 14,
  },

  sessionCard: {
    padding: 16,
    borderRadius: 25,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  sessionTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  sessionNumberIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  sessionNumberText: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GOLD_LIGHT,
    fontSize: 20,
  },

  sessionEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 0.8,
  },

  sessionTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 19,
  },

  sessionDateRow: {
    marginTop: 15,
    padding: 11,
    borderRadius: 15,
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#F8F9F6",
  },

  sessionDateItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  sessionMetaLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 6,
    letterSpacing: 0.7,
  },

  sessionMetaValue: {
    marginTop: 2,
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 8,
  },

  therapistRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  therapistAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  therapistLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 6,
    letterSpacing: 0.7,
  },

  therapistName: {
    marginTop: 2,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  notesSection: {
    marginTop: 13,
    gap: 8,
  },

  noteBlock: {
    padding: 10,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    backgroundColor: MINT,
  },

  noteIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  noteLabel: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 0.6,
  },

  noteValue: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 8,
    lineHeight: 13,
  },

  clearFilterButton: {
    marginTop: 12,
    minHeight: 38,
    paddingHorizontal: 11,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: MINT,
  },

  clearFilterText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },

  /* LOADING / EMPTY */
  loadingCard: {
    margin: 16,
    marginTop: 25,
    padding: 28,
    borderRadius: 25,
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  loadingTitle: {
    marginTop: 14,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 20,
    textAlign: "center",
  },

  loadingText: {
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
    lineHeight: 15,
    textAlign: "center",
  },

  emptyCard: {
    marginTop: 18,
    padding: 28,
    borderRadius: 25,
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7E3",
  },

  emptyTitle: {
    marginTop: 13,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 20,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 6,
    maxWidth: 280,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
    lineHeight: 15,
    textAlign: "center",
  },

  /* SUPPORT */
  supportCard: {
    marginTop: 48,
    marginHorizontal: 16,
    padding: 25,
    borderRadius: 28,
    alignItems: "center",
    backgroundColor: "#F2E5C0",
    borderWidth: 1,
    borderColor: "#E5D09A",
  },

  supportIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  supportEyebrow: {
    marginTop: 14,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.3,
  },

  supportTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 24,
    lineHeight: 29,
    textAlign: "center",
  },

  supportText: {
    marginTop: 7,
    maxWidth: 310,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
    lineHeight: 15,
    textAlign: "center",
  },

  supportButton: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: GOLD,
  },

  supportButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  /* SAME FOOTER */
  footer: {
    marginTop: 55,
    paddingTop: 42,
    paddingBottom: 34,
    paddingHorizontal: 22,
    alignItems: "center",
    backgroundColor: "#0A271A",
  },

  footerLogo: {
    width: 62,
    height: 62,
    borderRadius: 21,
  },

  footerBrand: {
    marginTop: 13,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 20,
  },

  footerTagline: {
    marginTop: 8,
    maxWidth: 420,
    fontFamily: "DMSans_400Regular",
    color: "#C6D4CB",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 19,
  },

  footerRow: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  footerText: {
    fontFamily: "DMSans_500Medium",
    color: "#E1EAE4",
    fontSize: 12,
  },

  footerAddress: {
    marginTop: 15,
    maxWidth: 390,
    fontFamily: "DMSans_400Regular",
    color: "#AFC0B6",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
  },

  socialRow: {
    marginTop: 20,
    flexDirection: "row",
    gap: 10,
  },

  socialButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor:
      "rgba(255,255,255,.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  copyright: {
    marginTop: 25,
    fontFamily: "DMSans_400Regular",
    color: "#81978A",
    fontSize: 10,
    textAlign: "center",
  },

  whatsapp: {
    position: "absolute",
    right: 18,
    bottom:
      Platform.OS === "web" ? 20 : 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#20C764",
    elevation: 8,
    zIndex: 100,
  },

 /*SHEETS */
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(5,28,19,.72)",
  },

  detailsSheet: {
    maxHeight: "88%",
    paddingHorizontal: 17,
    paddingTop: 10,
    paddingBottom:
      Platform.OS === "ios" ? 34 : 21,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: CREAM,
  },

  bookingSheet: {
    maxHeight: "92%",
    paddingHorizontal: 17,
    paddingTop: 10,
    paddingBottom:
      Platform.OS === "ios" ? 34 : 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: CREAM,
  },

  sheetHandle: {
    width: 44,
    height: 5,
    alignSelf: "center",
    borderRadius: 3,
    backgroundColor: "#D7DDD8",
  },

  sheetHeader: {
    marginTop: 15,
    marginBottom: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  sheetEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.2,
  },

  sheetTitle: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 27,
  },

  sheetClose: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  detailGrid: {
    marginTop: 9,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  detailBox: {
    width: "48%",
    minHeight: 104,
    padding: 12,
    borderRadius: 17,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  detailLabel: {
    marginTop: 8,
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 7,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },

  detailValue: {
    marginTop: 4,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
    lineHeight: 14,
  },

  wideDetail: {
    marginTop: 9,
    padding: 13,
    borderRadius: 17,
    flexDirection: "row",
    gap: 10,
    backgroundColor: MINT,
  },

  wideDetailIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  wideDetailValue: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 9,
    lineHeight: 15,
  },

  statusDetail: {
    marginTop: 10,
    padding: 13,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  statusDetailLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 7,
    letterSpacing: 0.8,
  },

  /* BOOKING */
  planMiniCard: {
    padding: 13,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: MINT,
  },

  planMiniIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  planMiniLabel: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 0.7,
  },

  planMiniTitle: {
    marginTop: 3,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 16,
  },

  planMiniSub: {
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },

  inputLabel: {
    marginTop: 17,
    marginBottom: 7,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
    letterSpacing: 1,
  },

  inputWrap: {
    minHeight: 50,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  input: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 10,
  },

  inputHint: {
    marginTop: 5,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 7,
  },

  slotHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  slotCount: {
    marginBottom: 7,
    fontFamily: "DMSans_700Bold",
    color: SUCCESS,
    fontSize: 7,
  },

  slotGrid: {
    minHeight: 84,
    padding: 10,
    borderRadius: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  slotMessage: {
    flex: 1,
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  slotMessageText: {
    maxWidth: 250,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
    textAlign: "center",
  },

  slotButton: {
    width: "31%",
    minHeight: 44,
    paddingHorizontal: 7,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: MINT,
    borderWidth: 1,
    borderColor: "#CFE0D4",
  },

  slotButtonSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  slotButtonDisabled: {
    backgroundColor: "#F1F2F1",
    borderColor: "#E4E7E5",
  },

  slotButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 7,
  },

  slotButtonTextSelected: {
    color: WHITE,
  },

  slotButtonTextDisabled: {
    color: "#9B9F9C",
    textDecorationLine: "line-through",
  },

  selectedSlotCard: {
    marginTop: 9,
    padding: 10,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#EAF6ED",
  },

  selectedSlotText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: SUCCESS,
    fontSize: 8,
  },

  notesInputWrap: {
    minHeight: 105,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  notesInput: {
    minHeight: 105,
    padding: 12,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 10,
    lineHeight: 16,
  },

  bookButton: {
    minHeight: 52,
    marginTop: 17,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
  },

  bookButtonDisabled: {
    opacity: 0.65,
  },

  bookButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  /* NOTICE */
  noticeRoot: {
    flex: 1,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  noticeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(5,28,19,.75)",
  },

  noticeCard: {
    width: "100%",
    maxWidth: 370,
    padding: 22,
    borderRadius: 29,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor:
      "rgba(214,180,91,.40)",
    elevation: 18,
  },

  noticeIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  noticeSuccess: {
    backgroundColor: "#E8F5EC",
  },

  noticeError: {
    backgroundColor: "#FCECEA",
  },

  noticeInfo: {
    backgroundColor: "#EAF4F9",
  },

  noticeEyebrow: {
    marginTop: 15,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.4,
  },

  noticeTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 25,
    textAlign: "center",
  },

  noticeMessage: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
  },

  noticeButton: {
    width: "100%",
    minHeight: 48,
    marginTop: 18,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: GOLD,
  },

  noticeButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },
});
