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
const BORDER = "#E5E9E5";

const SUCCESS = "#287A4C";
const WARNING = "#A86F00";
const INFO = "#356C8C";
const DANGER = "#B44D43";
const PURPLE = "#76548F";

type FilterKey =
  | "ALL"
  | "OFFLINE"
  | "ONLINE"
  | "UPCOMING"
  | "COMPLETED"
  | "CANCELLED";

type RecordType = "APPOINTMENT" | "CONSULTATION";

type RefundData = {
  refundStatus?: string;
  paymentStatus?: string;
  refundedAmount?: number;
  refundReason?: string;
  refundRequestedAt?: string;
  refundedAt?: string;
};

type AppointmentRecord = {
  recordType: RecordType;
  id: number;
  appointmentNumber: string;
  appointmentType: string;
  doctorId?: number | null;
  doctorName: string;
  department: string;
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  appointmentTime: string;
  status: string;
  paymentStatus: any;
  paymentId?: number | string | null;
  refundData?: RefundData | null;
  symptoms?: string;
  pastMedicalHistory?: string;
  cancellationReason?: string;
  rescheduleReason?: string;
  bookingFee?: number | null;
  patientId?: number;
  patientName?: string;
  phoneNumber?: string;
  age?: number;
  gender?: string;
  createdAt?: string;
  updatedAt?: string;
  location?: string;
  meetingLink?: string | null;
  meetingLinkExpiresAt?: string | null;
  meetingCreated?: boolean;
  meetingStatus?: string;
  roomId?: string | null;
  prescriptionId?: number | null;
  reviewAllowed?: boolean;
};

type NoticeType = "success" | "error" | "info";

type NoticeState = {
  visible: boolean;
  type: NoticeType;
  title: string;
  message: string;
  action?: "LOGIN" | null;
};

type ActionModalState = {
  visible: boolean;
  type: "CANCEL_APPOINTMENT" | "CANCEL_CONSULTATION" | "RESCHEDULE" | null;
  item: AppointmentRecord | null;
};

export default function MyAppointmentsScreen() {
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

  const [records, setRecords] = useState<AppointmentRecord[]>([]);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [details, setDetails] = useState<AppointmentRecord | null>(null);

  const [notice, setNotice] = useState<NoticeState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
    action: null,
  });

  const [actionModal, setActionModal] = useState<ActionModalState>({
    visible: false,
    type: null,
    item: null,
  });

  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  useEffect(() => {
    loadPage();
    
  }, []);

  const filteredRecords = useMemo(() => {
    let list = [...records];

    if (filter === "OFFLINE") {
      list = list.filter(
        (item) => normalize(item.appointmentType) === "OFFLINE"
      );
    }

    if (filter === "ONLINE") {
      list = list.filter(
        (item) => normalize(item.appointmentType) === "ONLINE"
      );
    }

    if (filter === "COMPLETED") {
      list = list.filter((item) => normalize(item.status) === "COMPLETED");
    }

    if (filter === "CANCELLED") {
      list = list.filter((item) =>
        ["CANCELLED", "CANCELED", "REJECTED"].includes(normalize(item.status))
      );
    }

    if (filter === "UPCOMING") {
      list = list.filter((item) => {
        const status = normalize(item.status);
        return ![
          "COMPLETED",
          "CANCELLED",
          "CANCELED",
          "REJECTED",
          "NO_SHOW",
        ].includes(status);
      });
    }

    return list.sort(
      (a, b) =>
        buildAppointmentDateTime(b).getTime() -
        buildAppointmentDateTime(a).getTime()
    );
  }, [records, filter]);

  const stats = useMemo(() => {
    const online = records.filter(
      (item) => normalize(item.appointmentType) === "ONLINE"
    ).length;

    const upcoming = records.filter((item) => {
      const status = normalize(item.status);
      return ![
        "COMPLETED",
        "CANCELLED",
        "CANCELED",
        "REJECTED",
        "NO_SHOW",
      ].includes(status);
    }).length;

    const completed = records.filter(
      (item) => normalize(item.status) === "COMPLETED"
    ).length;

    return {
      total: records.length,
      online,
      upcoming,
      completed,
    };
  }, [records]);

  function showNotice(
    type: NoticeType,
    title: string,
    message: string,
    action: "LOGIN" | null = null
  ) {
    setNotice({
      visible: true,
      type,
      title,
      message,
      action,
    });
  }

  async function getToken() {
    return AsyncStorage.getItem("token");
  }

  async function clearAuthentication() {
    await AsyncStorage.multiRemove([
      "token",
      "refreshToken",
      "userId",
      "email",
      "name",
      "role",
      "profileCompleted",
      "isLoggedIn",
    ]);
  }

  async function readResponse(response: Response) {
    const text = await response.text();

    if (!text) {
      return { text: "", result: null as any };
    }

    try {
      return {
        text,
        result: JSON.parse(text),
      };
    } catch {
      return {
        text,
        result: null as any,
      };
    }
  }

  async function authHeaders() {
    const token = await getToken();

    return {
      Accept: "application/json",
      Authorization: `Bearer ${token || ""}`,
    };
  }

  async function fetchPatientRecords(endpoint: string) {
    const headers = await authHeaders();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers,
    });

    const { text, result } = await readResponse(response);

    if (response.status === 401 || response.status === 403) {
      if (response.status === 401) {
        await clearAuthentication();
      }

      const error: any = new Error(
        result?.message || "You are not authorized to view these records."
      );
      error.auth = true;
      throw error;
    }

    if (!response.ok || result?.success === false) {
      throw new Error(
        result?.message || text || "Unable to load patient records."
      );
    }

    return Array.isArray(result?.data) ? result.data : [];
  }

  async function loadPage(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = await getToken();

      if (!token) {
        setRecords([]);
        showNotice(
          "info",
          "Login Required",
          "Please sign in to view your appointments and online consultations.",
          "LOGIN"
        );
        return;
      }

      const [appointmentResult, consultationResult] = await Promise.allSettled([
        fetchPatientRecords("/appointments/my-appointments"),
        fetchPatientRecords("/consultations/my-consultations"),
      ]);

      let appointments: any[] = [];
      let consultations: any[] = [];
      const errors: string[] = [];
      let authError = false;

      if (appointmentResult.status === "fulfilled") {
        appointments = appointmentResult.value;
      } else {
        errors.push(
          appointmentResult.reason?.message ||
            "Unable to load offline appointments."
        );
        authError = authError || Boolean(appointmentResult.reason?.auth);
      }

      if (consultationResult.status === "fulfilled") {
        consultations = consultationResult.value;
      } else {
        errors.push(
          consultationResult.reason?.message ||
            "Unable to load online consultations."
        );
        authError = authError || Boolean(consultationResult.reason?.auth);
      }

      if (authError && !appointments.length && !consultations.length) {
        showNotice(
          "error",
          "Session Expired",
          errors[0] || "Please sign in again.",
          "LOGIN"
        );
        return;
      }

      const normalizedRecords: AppointmentRecord[] = [
        ...appointments.map(normalizeAppointment),
        ...consultations.map(normalizeConsultation),
      ];

      const withMeetings = await loadMeetingStates(normalizedRecords);
      const withRefunds = await loadRefundStatuses(withMeetings);

      setRecords(withRefunds);

      if (errors.length && withRefunds.length) {
        showNotice(
          "info",
          "Some Records Could Not Load",
          errors.join(" ")
        );
      }

      if (errors.length && !withRefunds.length) {
        throw new Error(errors.join(" "));
      }
    } catch (error: any) {
      console.log("My appointments load failed:", error);
      showNotice(
        "error",
        "Unable to Load Appointments",
        error?.message ||
          "Your appointments could not be loaded. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

 

  async function loadMeetingStates(input: AppointmentRecord[]) {
    const output = input.map((item) => ({ ...item }));

    await Promise.allSettled(
      output
        .filter(
          (item) =>
            item.recordType === "CONSULTATION" &&
            isPaymentSuccessful(item.paymentStatus)
        )
        .map(async (item) => {
          try {
            const headers = await authHeaders();

            const response = await fetch(
              `${API_BASE_URL}/video-meetings/${encodeURIComponent(
                String(item.id)
              )}`,
              {
                method: "GET",
                headers,
              }
            );

            if (response.status === 404) {
              item.meetingCreated = false;
              item.meetingStatus = "";
              return;
            }

            const { result } = await readResponse(response);

            if (!response.ok || result?.success === false) {
              const message = String(result?.message || "").toLowerCase();

              if (
                message.includes("not found") ||
                message.includes("does not exist")
              ) {
                item.meetingCreated = false;
                item.meetingStatus = "";
                return;
              }

              return;
            }

            const meeting = result?.data || {};
            item.meetingCreated = true;
            item.meetingStatus = String(
              meeting.status || "CREATED"
            ).toUpperCase();
            item.roomId = meeting.roomId || null;
          } catch {
            item.meetingCreated = false;
          }
        })
    );

    return output;
  }

  async function loadRefundStatuses(input: AppointmentRecord[]) {
    const output = input.map((item) => ({ ...item }));

    await Promise.allSettled(
      output
        .filter(
          (item) =>
            item.paymentId !== null &&
            item.paymentId !== undefined &&
            String(item.paymentId).trim() !== ""
        )
        .map(async (item) => {
          item.refundData = await fetchRefundStatus(item.paymentId!);
        })
    );

    return output;
  }

  async function fetchRefundStatus(paymentId: number | string) {
    try {
      const headers = await authHeaders();

      const response = await fetch(
        `${API_BASE_URL}/payments/${encodeURIComponent(
          String(paymentId)
        )}/refund-status`,
        {
          method: "GET",
          headers,
        }
      );

      if (response.status === 404) return null;

      const { result } = await readResponse(response);

      if (!response.ok || result?.success === false) {
        return null;
      }

      return result?.data || null;
    } catch {
      return null;
    }
  }

  async function startPayment(item: AppointmentRecord) {
    try {
      setBusyId(item.id);

      const token = await getToken();

      if (!token) {
        showNotice(
          "info",
          "Login Required",
          "Please sign in before making a payment.",
          "LOGIN"
        );
        return;
      }

      const endpoint =
        item.recordType === "APPOINTMENT"
          ? `/payments/appointment/${encodeURIComponent(
              String(item.id)
            )}/initiate`
          : `/payments/consultation/${encodeURIComponent(
              String(item.id)
            )}/initiate`;

      const headers = await authHeaders();

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers,
      });

      const { text, result } = await readResponse(response);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || text || "Unable to initiate payment."
        );
      }

      const paymentData = result?.data || {};
      const checkoutUrl =
        paymentData.checkoutUrl ||
        paymentData.paymentUrl ||
        paymentData.shortUrl ||
        "";

      if (checkoutUrl) {
        await Linking.openURL(checkoutUrl);
        return;
      }

      showNotice(
        "info",
        "Payment Initiated",
        "The backend payment order was created successfully. Your website opens Razorpay using browser JavaScript; Expo Go cannot run that same checkout script directly. Connect your React Native Razorpay checkout to this returned payment data to complete payment inside the app."
      );
    } catch (error: any) {
      showNotice(
        "error",
        "Payment Could Not Start",
        error?.message || "Unable to initiate payment."
      );
    } finally {
      setBusyId(null);
    }
  }

  function openCancel(item: AppointmentRecord) {
    setReason("");
    setActionModal({
      visible: true,
      type:
        item.recordType === "CONSULTATION"
          ? "CANCEL_CONSULTATION"
          : "CANCEL_APPOINTMENT",
      item,
    });
  }

  function openReschedule(item: AppointmentRecord) {
    setNewDate(item.appointmentDate || "");
    setNewTime(item.startTime || "");
    setActionModal({
      visible: true,
      type: "RESCHEDULE",
      item,
    });
  }

  async function submitAction() {
    const item = actionModal.item;
    const type = actionModal.type;

    if (!item || !type) return;

    if (type === "RESCHEDULE") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate.trim())) {
        showNotice(
          "info",
          "Check the Date",
          "Please enter the appointment date as YYYY-MM-DD."
        );
        return;
      }

      if (!/^\d{2}:\d{2}$/.test(newTime.trim())) {
        showNotice(
          "info",
          "Check the Time",
          "Please enter the start time as HH:mm, for example 10:30."
        );
        return;
      }
    }

    try {
      setBusyId(item.id);

      const headers = await authHeaders();

      let response: Response;

      if (type === "RESCHEDULE") {
        response = await fetch(
          `${API_BASE_URL}/appointments/${item.id}/reschedule`,
          {
            method: "PUT",
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              appointmentDate: newDate.trim(),
              startTime: newTime.trim(),
            }),
          }
        );
      } else if (type === "CANCEL_APPOINTMENT") {
        response = await fetch(
          `${API_BASE_URL}/appointments/${item.id}/cancel`,
          {
            method: "PUT",
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              cancellationReason:
                reason.trim() || "Cancelled by patient",
            }),
          }
        );
      } else {
        response = await fetch(
          `${API_BASE_URL}/consultations/${encodeURIComponent(
            String(item.id)
          )}/cancel`,
          {
            method: "PUT",
            headers,
          }
        );
      }

      const { text, result } = await readResponse(response);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message ||
            text ||
            (type === "RESCHEDULE"
              ? "Unable to reschedule appointment."
              : "Unable to cancel.")
        );
      }

      setActionModal({
        visible: false,
        type: null,
        item: null,
      });

      setReason("");
      setNewDate("");
      setNewTime("");

      showNotice(
        "success",
        type === "RESCHEDULE" ? "Appointment Updated" : "Cancelled",
        result?.message ||
          (type === "RESCHEDULE"
            ? "Appointment rescheduled successfully."
            : "Your appointment has been cancelled successfully.")
      );

      await loadPage(true);
    } catch (error: any) {
      showNotice(
        "error",
        type === "RESCHEDULE"
          ? "Reschedule Failed"
          : "Cancellation Failed",
        error?.message ||
          (type === "RESCHEDULE"
            ? "Unable to reschedule appointment."
            : "Unable to cancel.")
      );
    } finally {
      setBusyId(null);
    }
  }

  function joinConsultation(item: AppointmentRecord) {
    if (!item.id) {
      showNotice(
        "error",
        "Consultation Not Available",
        "Consultation ID is missing."
      );
      return;
    }

    router.push({
      pathname: "/consultation-room" as any,
      params: {
        consultationId: String(item.id),
      },
    } as any);
  }

  function viewPrescription(item: AppointmentRecord) {
    if (!item.prescriptionId) return;

    router.push({
      pathname: "/my-prescriptions" as any,
      params: {
        id: String(item.prescriptionId),
      },
    } as any);
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

  function closeNotice() {
    const action = notice.action;

    setNotice((current) => ({
      ...current,
      visible: false,
      action: null,
    }));

    if (action === "LOGIN") {
      router.replace("/login" as any);
    }
  }

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loaderText}>Preparing your appointments...</Text>
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
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPage(true)}
            tintColor={GREEN}
          />
        }
      >
        {/* PAGE HERO */}
        <View style={styles.hero}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroIcon}>
            <Ionicons
              name="calendar-clear-outline"
              size={26}
              color={GREEN}
            />
          </View>

          <Text style={styles.heroEyebrow}>YOUR CARE JOURNEY</Text>

          <Text style={styles.heroTitle}>
            My{"\n"}
            <Text style={styles.heroAccent}>Appointments</Text>
          </Text>

          <Text style={styles.heroText}>
            Keep offline visits, online consultations, payment status,
            meeting access and prescriptions easy to find.
          </Text>

          <TouchableOpacity
            style={styles.heroButton}
            activeOpacity={0.86}
            onPress={() => router.push("/consultation" as any)}
          >
            <Ionicons name="add-circle-outline" size={18} color={GREEN} />
            <Text style={styles.heroButtonText}>Book New Appointment</Text>
            <Ionicons name="arrow-forward" size={17} color={GREEN} />
          </TouchableOpacity>

          <View style={styles.statsBar}>
            <Stat value={stats.total} label="Total" />
            <View style={styles.statLine} />
            <Stat value={stats.upcoming} label="Upcoming" />
            <View style={styles.statLine} />
            <Stat value={stats.completed} label="Completed" />
          </View>
        </View>

        <View style={styles.sectionIntro}>
          <Text style={styles.sectionEyebrow}>CONSULTATION HISTORY</Text>
          <Text style={styles.sectionTitle}>Everything in One Place</Text>
          <Text style={styles.sectionLead}>
            Filter your records and tap any card for complete appointment
            information and available actions.
          </Text>
        </View>

        {/* FILTERS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {[
            ["ALL", "All", "apps-outline"],
            ["OFFLINE", "Clinic", "business-outline"],
            ["ONLINE", "Online", "videocam-outline"],
            ["UPCOMING", "Upcoming", "time-outline"],
            ["COMPLETED", "Completed", "checkmark-circle-outline"],
            ["CANCELLED", "Cancelled", "close-circle-outline"],
          ].map(([key, label, icon]) => {
            const active = filter === key;

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterChip,
                  active && styles.filterChipActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setFilter(key as FilterKey)}
              >
                <Ionicons
                  name={icon as any}
                  size={15}
                  color={active ? WHITE : GREEN}
                />
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* RECORDS */}
        {loading ? (
          <View style={styles.messageCard}>
            <View style={styles.messageIcon}>
              <ActivityIndicator size="small" color={GREEN} />
            </View>
            <Text style={styles.messageTitle}>Loading your care history</Text>
            <Text style={styles.messageText}>
              Checking appointments, consultations, meetings and refund status...
            </Text>
          </View>
        ) : filteredRecords.length === 0 ? (
          <View style={styles.messageCard}>
            <View style={styles.messageIcon}>
              <Ionicons
                name="calendar-outline"
                size={29}
                color={GOLD_DARK}
              />
            </View>
            <Text style={styles.messageTitle}>No appointments here</Text>
            <Text style={styles.messageText}>
              There are no records for this filter yet.
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push("/consultation" as any)}
            >
              <Text style={styles.emptyButtonText}>Book Consultation</Text>
              <Ionicons name="arrow-forward" size={16} color={WHITE} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsWrap}>
            {filteredRecords.map((item) => (
              <AppointmentCard
                key={`${item.recordType}-${item.id}`}
                item={item}
                busy={busyId === item.id}
                onDetails={() => setDetails(item)}
                onPay={() => startPayment(item)}
                onJoin={() => joinConsultation(item)}
                onPrescription={() => viewPrescription(item)}
                onReschedule={() => openReschedule(item)}
                onCancel={() => openCancel(item)}
              />
            ))}
          </View>
        )}

        {/* CARE SUPPORT CTA */}
        <View style={styles.supportCard}>
          <View style={styles.supportIcon}>
            <Ionicons name="heart-outline" size={23} color={GOLD} />
          </View>
          <Text style={styles.supportEyebrow}>NEED SUPPORT?</Text>
          <Text style={styles.supportTitle}>
            Questions About Your Appointment?
          </Text>
          <Text style={styles.supportText}>
            Our NeoLife team can help with appointment timing, payment,
            consultation access and visit-related questions.
          </Text>

          <TouchableOpacity
            style={styles.supportButton}
            onPress={() =>
              openURL(
                "https://wa.me/919481489866?text=Hello%20NeoLife%20Wellness%20Center,%20I%20need%20help%20with%20my%20appointment."
              )
            }
          >
            <Ionicons name="logo-whatsapp" size={18} color={GREEN} />
            <Text style={styles.supportButtonText}>Chat With NeoLife</Text>
          </TouchableOpacity>
        </View>

        {/* SAME FULL FOOTER */}
        <View style={styles.footer}>
          <Image
            source={require("../assets/images/main_logo.jpeg")}
            style={styles.footerLogo}
          />

          <Text style={styles.footerBrand}>NeoLife Wellness Center</Text>

          <Text style={styles.footerTagline}>
            Natural healing, Ayurvedic care and trusted wellness support for a
            healthier life.
          </Text>

          <TouchableOpacity
            style={styles.footerRow}
            onPress={() => openURL("tel:+919481489866")}
          >
            <Ionicons name="call-outline" size={17} color={GOLD} />
            <Text style={styles.footerText}>+91 94814 89866</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerRow}
            onPress={() => openURL("mailto:neelavar.murali@gmail.com")}
          >
            <Ionicons name="mail-outline" size={17} color={GOLD} />
            <Text style={styles.footerText}>neelavar.murali@gmail.com</Text>
          </TouchableOpacity>

          <Text style={styles.footerAddress}>
            4-1-38, Behind Lions Bhavan Road, Nairkere 1st Cross, Brahmagiri,
            Ambalapady Post, Udupi – 576103, Karnataka, India
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
                openURL("https://www.instagram.com/neolives_global")
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
              onPress={() => openURL("https://wa.me/919481489866")}
            />
          </View>

          <Text style={styles.copyright}>
            © 2026 NeoLife Wellness Center. All Rights Reserved.
          </Text>
        </View>
      </ScrollView>

      {/* FLOATING WHATSAPP */}
      <TouchableOpacity
        style={styles.whatsapp}
        activeOpacity={0.86}
        onPress={() =>
          openURL(
            "https://wa.me/919481489866?text=Hello%20NeoLife%20Wellness%20Center,%20I%20need%20help."
          )
        }
      >
        <Ionicons name="logo-whatsapp" size={28} color={WHITE} />
      </TouchableOpacity>

      {/* SHARED PATIENT DRAWER */}
<PatientDrawer
  visible={menuOpen}
  onClose={() => setMenuOpen(false)}
/>

      {/* DETAILS MODAL */}
      <Modal
        visible={Boolean(details)}
        transparent
        animationType="slide"
        onRequestClose={() => setDetails(null)}
      >
        <View style={styles.bottomModalRoot}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setDetails(null)}
          />

          <View style={styles.detailsSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetEyebrow}>
                  {details?.recordType === "CONSULTATION"
                    ? "ONLINE CONSULTATION"
                    : "CLINIC APPOINTMENT"}
                </Text>
                <Text style={styles.sheetTitle}>Appointment Details</Text>
              </View>

              <TouchableOpacity
                style={styles.sheetClose}
                onPress={() => setDetails(null)}
              >
                <Ionicons name="close" size={21} color={GREEN} />
              </TouchableOpacity>
            </View>

            {details && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailGrid}>
                  <DetailBox
                    icon="receipt-outline"
                    label="Appointment No."
                    value={details.appointmentNumber}
                  />
                  <DetailBox
                    icon="videocam-outline"
                    label="Type"
                    value={formatStatus(details.appointmentType)}
                  />
                  <DetailBox
                    icon="person-outline"
                    label="Doctor"
                    value={details.doctorName}
                  />
                  <DetailBox
                    icon="medical-outline"
                    label="Department"
                    value={details.department}
                  />
                  <DetailBox
                    icon="calendar-outline"
                    label="Date"
                    value={formatDate(details.appointmentDate)}
                  />
                  <DetailBox
                    icon="time-outline"
                    label="Time"
                    value={details.appointmentTime || "-"}
                  />
                  <DetailBox
                    icon="pulse-outline"
                    label="Status"
                    value={formatStatus(details.status)}
                  />
                  <DetailBox
                    icon="card-outline"
                    label="Payment"
                    value={displayPaymentStatus(details.paymentStatus)}
                  />
                </View>

                <WideDetail
                  icon="document-text-outline"
                  label="Symptoms / Notes"
                  value={details.symptoms || "No symptoms or notes provided."}
                />

                <WideDetail
                  icon="location-outline"
                  label="Location / Meeting"
                  value={
                    details.location ||
                    "NeoLife Wellness Center, Udupi"
                  }
                />

                {hasMeaningfulRefund(details.refundData) && (
                  <RefundCard refund={details.refundData!} />
                )}

                <View style={{ height: 25 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* CANCEL / RESCHEDULE MODAL */}
      <Modal
        visible={actionModal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setActionModal({
            visible: false,
            type: null,
            item: null,
          })
        }
      >
        <View style={styles.centerModalRoot}>
          <Pressable
            style={styles.centerBackdrop}
            onPress={() =>
              setActionModal({
                visible: false,
                type: null,
                item: null,
              })
            }
          />

          <View style={styles.actionDialog}>
            <View
              style={[
                styles.actionDialogIcon,
                actionModal.type === "RESCHEDULE"
                  ? styles.rescheduleIcon
                  : styles.cancelIcon,
              ]}
            >
              <Ionicons
                name={
                  actionModal.type === "RESCHEDULE"
                    ? "calendar-outline"
                    : "close-circle-outline"
                }
                size={30}
                color={
                  actionModal.type === "RESCHEDULE"
                    ? GOLD_DARK
                    : DANGER
                }
              />
            </View>

            <Text style={styles.dialogEyebrow}>
              {actionModal.type === "RESCHEDULE"
                ? "CHANGE APPOINTMENT"
                : "CANCEL APPOINTMENT"}
            </Text>

            <Text style={styles.dialogTitle}>
              {actionModal.type === "RESCHEDULE"
                ? "Choose a New Time"
                : "Are You Sure?"}
            </Text>

            <Text style={styles.dialogMessage}>
              {actionModal.type === "RESCHEDULE"
                ? "Enter the new appointment date and preferred starting time."
                : actionModal.type === "CANCEL_CONSULTATION"
                ? "This will cancel your online consultation request."
                : "Tell us why you would like to cancel this clinic appointment."}
            </Text>

            {actionModal.type === "RESCHEDULE" ? (
              <>
                <Text style={styles.inputLabel}>NEW DATE</Text>
                <TextInput
                  value={newDate}
                  onChangeText={setNewDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9AA59E"
                  style={styles.actionInput}
                />

                <Text style={styles.inputLabel}>START TIME</Text>
                <TextInput
                  value={newTime}
                  onChangeText={setNewTime}
                  placeholder="HH:mm"
                  placeholderTextColor="#9AA59E"
                  style={styles.actionInput}
                />
              </>
            ) : actionModal.type === "CANCEL_APPOINTMENT" ? (
              <>
                <Text style={styles.inputLabel}>CANCELLATION REASON</Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  textAlignVertical="top"
                  maxLength={300}
                  placeholder="Enter a short reason..."
                  placeholderTextColor="#9AA59E"
                  style={styles.reasonInput}
                />
              </>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryDialogButton,
                actionModal.type === "RESCHEDULE"
                  ? styles.rescheduleButton
                  : styles.cancelButton,
              ]}
              activeOpacity={0.85}
              disabled={busyId === actionModal.item?.id}
              onPress={submitAction}
            >
              {busyId === actionModal.item?.id ? (
                <ActivityIndicator size="small" color={WHITE} />
              ) : (
                <>
                  <Ionicons
                    name={
                      actionModal.type === "RESCHEDULE"
                        ? "calendar-outline"
                        : "close-outline"
                    }
                    size={17}
                    color={WHITE}
                  />
                  <Text style={styles.primaryDialogText}>
                    {actionModal.type === "RESCHEDULE"
                      ? "Reschedule Appointment"
                      : "Confirm Cancellation"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryDialogButton}
              onPress={() =>
                setActionModal({
                  visible: false,
                  type: null,
                  item: null,
                })
              }
            >
              <Text style={styles.secondaryDialogText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* BRANDED NOTICE - NO NATIVE ALERT */}
      <Modal
        visible={notice.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeNotice}
      >
        <View style={styles.centerModalRoot}>
          <Pressable
            style={styles.centerBackdrop}
            onPress={closeNotice}
          />

          <View style={styles.noticeDialog}>
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

            <Text style={styles.dialogEyebrow}>NEOLIFE WELLNESS</Text>
            <Text style={styles.dialogTitle}>{notice.title}</Text>
            <Text style={styles.dialogMessage}>{notice.message}</Text>

            <TouchableOpacity
              style={styles.noticeButton}
              onPress={closeNotice}
            >
              <Text style={styles.noticeButtonText}>
                {notice.action === "LOGIN" ? "Go to Login" : "Okay"}
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

function AppointmentCard({
  item,
  busy,
  onDetails,
  onPay,
  onJoin,
  onPrescription,
  onReschedule,
  onCancel,
}: {
  item: AppointmentRecord;
  busy: boolean;
  onDetails: () => void;
  onPay: () => void;
  onJoin: () => void;
  onPrescription: () => void;
  onReschedule: () => void;
  onCancel: () => void;
}) {
  const online = item.recordType === "CONSULTATION";
  const status = normalize(item.status);
  const paymentStatus = normalizePaymentStatus(item.paymentStatus);
  const past = buildAppointmentDateTime(item).getTime() < Date.now();

  const closed = [
    "CANCELLED",
    "CANCELED",
    "REJECTED",
    "COMPLETED",
    "NO_SHOW",
  ].includes(status);

  const showPay =
    !past &&
    !closed &&
    (status === "PAYMENT_PENDING" || isPaymentPending(paymentStatus));

  const showJoin =
    !closed &&
    online &&
    isPaymentSuccessful(paymentStatus) &&
    item.meetingCreated &&
    !["ENDED", "EXPIRED", "CANCELLED"].includes(
      normalize(item.meetingStatus)
    );

  const waitingForDoctor =
    !closed &&
    online &&
    isPaymentSuccessful(paymentStatus) &&
    !item.meetingCreated;

  const showPrescription =
    status === "COMPLETED" && Boolean(item.prescriptionId);

  const showReschedule = !closed && !online;
  const showCancel = !closed;

  const theme = getStatusTheme(item.status);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View
          style={[
            styles.typeIcon,
            online ? styles.typeIconOnline : styles.typeIconOffline,
          ]}
        >
          <Ionicons
            name={online ? "videocam-outline" : "business-outline"}
            size={23}
            color={online ? PURPLE : GREEN}
          />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.typeRow}>
            <View
              style={[
                styles.typePill,
                online ? styles.onlinePill : styles.offlinePill,
              ]}
            >
              <Ionicons
                name={online ? "videocam-outline" : "location-outline"}
                size={12}
                color={online ? PURPLE : GREEN}
              />
              <Text
                style={[
                  styles.typePillText,
                  { color: online ? PURPLE : GREEN },
                ]}
              >
                {online ? "ONLINE" : "CLINIC"}
              </Text>
            </View>

            <Text style={styles.appointmentNumber}>
              #{item.appointmentNumber}
            </Text>
          </View>

          <Text style={styles.doctorName}>{item.doctorName}</Text>
          <Text style={styles.department}>{item.department}</Text>
        </View>
      </View>

      <View style={styles.dateTimeStrip}>
        <View style={styles.dateTimeCell}>
          <Ionicons name="calendar-outline" size={15} color={GOLD_DARK} />
          <View>
            <Text style={styles.metaLabel}>DATE</Text>
            <Text style={styles.metaValue}>
              {formatDate(item.appointmentDate)}
            </Text>
          </View>
        </View>

        <View style={styles.stripDivider} />

        <View style={styles.dateTimeCell}>
          <Ionicons name="time-outline" size={15} color={GOLD_DARK} />
          <View>
            <Text style={styles.metaLabel}>TIME</Text>
            <Text style={styles.metaValue}>
              {item.appointmentTime || "-"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: theme.soft },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: theme.color },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: theme.color },
            ]}
          >
            {formatStatus(item.status)}
          </Text>
        </View>

        <View style={styles.paymentMini}>
          <Ionicons name="card-outline" size={14} color={MUTED} />
          <Text style={styles.paymentMiniText}>
            {displayPaymentStatus(item.paymentStatus)}
          </Text>
        </View>
      </View>

      <View style={styles.feeRow}>
        <View>
          <Text style={styles.feeLabel}>
            {online ? "CONSULTATION FEE" : "BOOKING FEE"}
          </Text>
          <Text style={styles.feeValue}>
            {item.bookingFee != null
              ? `₹${formatMoney(item.bookingFee)}`
              : "-"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.detailsButton}
          onPress={onDetails}
        >
          <Ionicons name="eye-outline" size={15} color={GREEN} />
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>

      {hasMeaningfulRefund(item.refundData) && (
        <RefundCard refund={item.refundData!} compact />
      )}

      <View style={styles.cardActions}>
        {showPay && (
          <CardAction
            icon="card-outline"
            label={`Pay ₹${formatMoney(item.bookingFee || (online ? 200 : 50))}`}
            background={GOLD}
            color={GREEN}
            loading={busy}
            onPress={onPay}
          />
        )}

        {showJoin && (
          <CardAction
            icon="videocam-outline"
            label="Join Consultation"
            background={INFO}
            color={WHITE}
            onPress={onJoin}
          />
        )}

        {waitingForDoctor && (
          <View style={styles.waitingButton}>
            <Ionicons name="time-outline" size={16} color={MUTED} />
            <Text style={styles.waitingText}>Waiting for Doctor</Text>
          </View>
        )}

        {showPrescription && (
          <CardAction
            icon="document-text-outline"
            label="View Prescription"
            background={PURPLE}
            color={WHITE}
            onPress={onPrescription}
          />
        )}

        {showReschedule && (
          <CardAction
            icon="calendar-outline"
            label="Reschedule"
            background="#F4E6B7"
            color={GREEN}
            onPress={onReschedule}
          />
        )}

        {showCancel && (
          <CardAction
            icon="close-circle-outline"
            label={online ? "Cancel Consultation" : "Cancel"}
            background="#FCECEA"
            color={DANGER}
            onPress={onCancel}
          />
        )}
      </View>
    </View>
  );
}

function CardAction({
  icon,
  label,
  background,
  color,
  onPress,
  loading = false,
}: {
  icon: any;
  label: string;
  background: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.cardActionButton,
        { backgroundColor: background },
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.82}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon} size={16} color={color} />
      )}

      <Text
        style={[
          styles.cardActionText,
          { color },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
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
        <Ionicons name={icon} size={16} color={GREEN} />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "-"}</Text>
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
        <Ionicons name={icon} size={18} color={GREEN} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.wideDetailValue}>{value}</Text>
      </View>
    </View>
  );
}

function RefundCard({
  refund,
  compact = false,
}: {
  refund: RefundData;
  compact?: boolean;
}) {
  const theme = getRefundTheme(refund.refundStatus);

  return (
    <View
      style={[
        styles.refundCard,
        compact && styles.refundCardCompact,
      ]}
    >
      <View style={styles.refundTop}>
        <View style={styles.refundIcon}>
          <Ionicons name="refresh-outline" size={16} color={theme} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.refundLabel}>REFUND STATUS</Text>
          <Text style={[styles.refundStatus, { color: theme }]}>
            {formatStatus(refund.refundStatus || "PENDING")}
          </Text>
        </View>

        {refund.refundedAmount != null && (
          <Text style={styles.refundAmount}>
            ₹{formatMoney(refund.refundedAmount)}
          </Text>
        )}
      </View>

      {!compact && refund.refundReason ? (
        <Text style={styles.refundDescription}>
          Reason: {refund.refundReason}
        </Text>
      ) : null}
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
      activeOpacity={0.82}
    >
      <Ionicons name={icon} size={20} color={WHITE} />
    </TouchableOpacity>
  );
}

function Stat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function normalizeAppointment(item: any): AppointmentRecord {
  return {
    recordType: "APPOINTMENT",
    id: Number(item.id),
    appointmentNumber:
      item.appointmentNumber || `APT-${item.id || ""}`,
    appointmentType:
      item.appointmentMode ||
      item.appointmentType ||
      "OFFLINE",
    doctorId: item.doctorId,
    doctorName:
      item.doctorName ||
      item.doctor ||
      "Doctor",
    department:
      item.doctorSpecialization ||
      item.department ||
      item.specialization ||
      "Consultation",
    appointmentDate: item.appointmentDate,
    startTime:
      item.startTime ||
      item.appointmentTime ||
      item.time,
    endTime: item.endTime || "",
    appointmentTime: formatTimeRange(
      item.startTime ||
        item.appointmentTime ||
        item.time,
      item.endTime
    ),
    status: item.status || "PENDING",
    paymentStatus: normalizePaymentStatus(
      item.paymentStatus || "PENDING"
    ),
    paymentId:
      item.paymentId ??
      item.payment?.id ??
      null,
    refundData: null,
    symptoms: item.symptoms || "",
    pastMedicalHistory: item.pastMedicalHistory || "",
    cancellationReason: item.cancellationReason || "",
    rescheduleReason: item.rescheduleReason || "",
    bookingFee: item.bookingFee,
    patientId: item.patientId,
    patientName: item.patientName,
    phoneNumber: item.phoneNumber,
    age: item.age,
    gender: item.gender,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    location:
      item.location ||
      "NeoLife Wellness Center, Udupi",
    meetingLink: item.meetingLink || null,
    prescriptionId: item.prescriptionId || null,
    reviewAllowed: Boolean(item.reviewAllowed),
  };
}

function normalizeConsultation(item: any): AppointmentRecord {
  return {
    recordType: "CONSULTATION",
    id: Number(item.id),
    appointmentNumber:
      item.consultationNumber ||
      `CON-${item.id || ""}`,
    appointmentType: "ONLINE",
    doctorId: item.doctorId,
    doctorName:
      item.doctorName ||
      item.doctor ||
      "Doctor",
    department:
      item.doctorSpecialization ||
      item.specialization ||
      "Online Consultation",
    appointmentDate: item.consultationDate,
    startTime:
      item.startTime ||
      item.consultationTime ||
      item.time,
    endTime: item.endTime || "",
    appointmentTime: formatTimeRange(
      item.startTime ||
        item.consultationTime ||
        item.time,
      item.endTime
    ),
    status:
      item.status ||
      "PENDING_DOCTOR_CONFIRMATION",
    paymentStatus: normalizePaymentStatus(
      item.paymentStatus || "PENDING"
    ),
    paymentId:
      item.paymentId ??
      item.payment?.id ??
      null,
    refundData: null,
    symptoms: item.symptoms || "",
    pastMedicalHistory: item.pastMedicalHistory || "",
    cancellationReason: item.cancellationReason || "",
    rescheduleReason: item.rescheduleReason || "",
    bookingFee: item.consultationFee ?? 200,
    patientId: item.patientId,
    patientName: item.patientName,
    phoneNumber: item.phoneNumber,
    age: item.age,
    gender: item.gender,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    location: isPaymentSuccessful(item.paymentStatus)
      ? "Secure online consultation room"
      : "Consultation room will be available after payment",
    meetingLink: item.meetingLink || null,
    meetingLinkExpiresAt: item.meetingLinkExpiresAt || null,
    meetingCreated: Boolean(
      item.meetingCreated ||
        item.videoMeetingId ||
        item.roomId ||
        item.meetingStatus ||
        item.videoMeetingStatus
    ),
    meetingStatus: String(
      item.meetingStatus ||
        item.videoMeetingStatus ||
        ""
    ).toUpperCase(),
    roomId: item.roomId || null,
    prescriptionId: item.prescriptionId || null,
    reviewAllowed: Boolean(item.reviewAllowed),
  };
}

function normalizePaymentStatus(value: any) {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") {
    return normalize(value);
  }

  if (typeof value === "object") {
    return normalize(
      value.name ??
        value.value ??
        value.status ??
        value.code ??
        ""
    );
  }

  return normalize(String(value));
}

function isPaymentSuccessful(value: any) {
  return [
    "SUCCESS",
    "PAID",
    "PAYMENT_SUCCESS",
  ].includes(normalizePaymentStatus(value));
}

function isPaymentPending(value: any) {
  return [
    "PENDING",
    "INITIATED",
    "PAYMENT_PENDING",
  ].includes(normalizePaymentStatus(value));
}

function displayPaymentStatus(value: any) {
  const status = normalizePaymentStatus(value);

  if (!status) return "Pending";

  if (
    status === "SUCCESS" ||
    status === "PAID" ||
    status === "PAYMENT_SUCCESS"
  ) {
    return "Payment Success";
  }

  if (status === "INITIATED") {
    return "Payment Initiated";
  }

  if (
    status === "PENDING" ||
    status === "PAYMENT_PENDING"
  ) {
    return "Payment Pending";
  }

  if (
    status === "FAILED" ||
    status === "PAYMENT_FAILED"
  ) {
    return "Payment Failed";
  }

  if (status === "REFUNDED") {
    return "Refunded";
  }

  if (status === "PARTIALLY_REFUNDED") {
    return "Partially Refunded";
  }

  return formatStatus(status);
}

function normalize(value: any) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/ /g, "_");
}

function formatStatus(value: any) {
  return String(value || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMoney(value: any) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "";

  const [hourValue, minuteValue] = String(value).split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue || 0);

  if (Number.isNaN(hour)) {
    return String(value);
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function formatTimeRange(start?: string, end?: string) {
  const startFormatted = formatTime(start);

  if (!startFormatted) return "-";

  const endFormatted = formatTime(end);

  return endFormatted
    ? `${startFormatted} - ${endFormatted}`
    : startFormatted;
}

function buildAppointmentDateTime(item: AppointmentRecord) {
  const date = item.appointmentDate || "1970-01-01";
  const time = item.startTime || "00:00";

  const result = new Date(`${date}T${time}`);

  if (Number.isNaN(result.getTime())) {
    return new Date(0);
  }

  return result;
}

function hasMeaningfulRefund(refund?: RefundData | null) {
  if (!refund) return false;

  const status = normalize(refund.refundStatus);

  return (
    Boolean(status && status !== "NOT_REQUESTED") ||
    Number(refund.refundedAmount || 0) > 0 ||
    Boolean(
      refund.refundRequestedAt ||
        refund.refundedAt ||
        refund.refundReason
    )
  );
}

function getStatusTheme(value: any) {
  const status = normalize(value);

  if (
    [
      "CONFIRMED",
      "DOCTOR_CONFIRMED",
      "APPROVED",
      "PAID",
    ].includes(status)
  ) {
    return {
      color: SUCCESS,
      soft: "#E9F7ED",
    };
  }

  if (status === "COMPLETED") {
    return {
      color: INFO,
      soft: "#EAF4F9",
    };
  }

  if (
    [
      "CANCELLED",
      "CANCELED",
      "REJECTED",
      "NO_SHOW",
    ].includes(status)
  ) {
    return {
      color: DANGER,
      soft: "#FCECEA",
    };
  }

  if (status === "RESCHEDULED") {
    return {
      color: PURPLE,
      soft: "#F4EFF8",
    };
  }

  if (status.includes("PAYMENT")) {
    return {
      color: WARNING,
      soft: "#FFF5DD",
    };
  }

  return {
    color: WARNING,
    soft: "#FFF5DD",
  };
}

function getRefundTheme(value: any) {
  const status = normalize(value);

  if (
    [
      "REFUNDED",
      "COMPLETED",
      "FULLY_REFUNDED",
    ].includes(status)
  ) {
    return SUCCESS;
  }

  if (
    [
      "REQUESTED",
      "PENDING",
      "PROCESSING",
      "REFUND_PENDING",
    ].includes(status)
  ) {
    return WARNING;
  }

  if (
    ["FAILED", "REJECTED"].includes(status)
  ) {
    return DANGER;
  }

  return INFO;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },

  loaderText: {
    marginTop: 12,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 12,
  },

  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

 

  scrollContent: {
    paddingBottom: 0,
  },

  /* CREATIVE APPOINTMENT HERO */
  hero: {
    margin: 16,
    minHeight: 410,
    padding: 23,
    borderRadius: 31,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: GREEN,
  },

  heroGlowOne: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(214,180,91,.14)",
  },

  heroGlowTwo: {
    position: "absolute",
    left: -70,
    bottom: -85,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,.05)",
  },

  heroIcon: {
    width: 57,
    height: 57,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },

  heroEyebrow: {
    marginTop: 18,
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 9,
    letterSpacing: 1.7,
  },

  heroTitle: {
    marginTop: 7,
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
    maxWidth: 335,
    fontFamily: "DMSans_400Regular",
    color: "#D8E5DD",
    fontSize: 12,
    lineHeight: 19,
  },

  heroButton: {
    marginTop: 19,
    alignSelf: "flex-start",
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: GOLD,
  },

  heroButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  statsBar: {
    marginTop: 22,
    minHeight: 68,
    borderRadius: 19,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.08)",
  },

  stat: {
    flex: 1,
    alignItems: "center",
  },

  statValue: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 22,
  },

  statLabel: {
    marginTop: 2,
    fontFamily: "DMSans_500Medium",
    color: "#C4D4CA",
    fontSize: 8,
  },

  statLine: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,.14)",
  },

  sectionIntro: {
    paddingTop: 29,
    paddingHorizontal: 17,
  },

  sectionEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    letterSpacing: 1.5,
  },

  sectionTitle: {
    marginTop: 6,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 29,
    lineHeight: 34,
  },

  sectionLead: {
    marginTop: 7,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 11,
    lineHeight: 18,
  },

  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 19,
    paddingBottom: 7,
    gap: 8,
  },

  filterChip: {
    minHeight: 41,
    paddingHorizontal: 13,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  filterChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  filterText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  filterTextActive: {
    color: WHITE,
  },

  cardsWrap: {
    paddingTop: 11,
    paddingHorizontal: 16,
    gap: 15,
  },

  card: {
    padding: 16,
    borderRadius: 25,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 3,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  typeIcon: {
    width: 49,
    height: 49,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  typeIconOnline: {
    backgroundColor: "#F2ECF8",
  },

  typeIconOffline: {
    backgroundColor: MINT,
  },

  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  typePill: {
    minHeight: 25,
    paddingHorizontal: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  onlinePill: {
    backgroundColor: "#F2ECF8",
  },

  offlinePill: {
    backgroundColor: MINT,
  },

  typePillText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 7,
    letterSpacing: 0.8,
  },

  appointmentNumber: {
    flexShrink: 1,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 8,
  },

  doctorName: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 19,
    lineHeight: 23,
  },

  department: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
    lineHeight: 14,
  },

  dateTimeStrip: {
    marginTop: 15,
    paddingVertical: 11,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9F6",
  },

  dateTimeCell: {
    flex: 1,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  stripDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E3E7E2",
  },

  metaLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 6,
    letterSpacing: 0.8,
  },

  metaValue: {
    marginTop: 2,
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 8,
  },

  statusRow: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  statusBadge: {
    minHeight: 29,
    paddingHorizontal: 9,
    borderRadius: 11,
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
    fontFamily: "DMSans_700Bold",
    fontSize: 7,
  },

  paymentMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  paymentMiniText: {
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 8,
  },

  feeRow: {
    marginTop: 14,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#EEF0ED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  feeLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 6,
    letterSpacing: 0.8,
  },

  feeValue: {
    marginTop: 2,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 17,
  },

  detailsButton: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: MINT,
  },

  detailsButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },

  cardActions: {
    marginTop: 13,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  cardActionButton: {
    minHeight: 42,
    minWidth: "47%",
    flexGrow: 1,
    paddingHorizontal: 10,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  cardActionText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 8,
  },

  waitingButton: {
    minHeight: 42,
    minWidth: "47%",
    flexGrow: 1,
    paddingHorizontal: 10,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F2F3F1",
  },

  waitingText: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 8,
  },

  messageCard: {
    margin: 16,
    marginTop: 19,
    padding: 28,
    borderRadius: 25,
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  messageIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  messageTitle: {
    marginTop: 15,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 21,
    textAlign: "center",
  },

  messageText: {
    marginTop: 7,
    maxWidth: 300,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
  },

  emptyButton: {
    marginTop: 17,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: GREEN,
  },

  emptyButtonText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 9,
  },

  refundCard: {
    marginTop: 13,
    padding: 13,
    borderRadius: 16,
    backgroundColor: "#F8FAF7",
    borderWidth: 1,
    borderColor: "#DDE7DE",
  },

  refundCardCompact: {
    padding: 11,
  },

  refundTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  refundIcon: {
    width: 33,
    height: 33,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  refundLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 6,
    letterSpacing: 0.8,
  },

  refundStatus: {
    marginTop: 2,
    fontFamily: "DMSans_700Bold",
    fontSize: 8,
  },

  refundAmount: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 15,
  },

  refundDescription: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
  },

  supportCard: {
    marginTop: 45,
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 27,
    alignItems: "center",
    backgroundColor: "#F3E8C8",
    borderWidth: 1,
    borderColor: "#E6D4A0",
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
    letterSpacing: 1.4,
  },

  supportTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 24,
    textAlign: "center",
  },

  supportText: {
    marginTop: 7,
    maxWidth: 320,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
  },

  supportButton: {
    marginTop: 17,
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
    backgroundColor: "rgba(255,255,255,.10)",
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
    bottom: Platform.OS === "web" ? 20 : 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#20C764",
    elevation: 8,
    zIndex: 100,
  },

  
  /* DETAILS SHEET */
  bottomModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,28,19,.72)",
  },

  detailsSheet: {
    maxHeight: "88%",
    paddingHorizontal: 17,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 34 : 21,
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
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  sheetEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.3,
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  detailBox: {
    width: "48%",
    minHeight: 105,
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
    letterSpacing: 0.8,
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
    marginTop: 10,
    padding: 13,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "flex-start",
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

  /* ACTION / NOTICE DIALOGS */
  centerModalRoot: {
    flex: 1,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  centerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,28,19,.75)",
  },

  actionDialog: {
    width: "100%",
    maxWidth: 385,
    padding: 22,
    borderRadius: 29,
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "rgba(214,180,91,.40)",
    elevation: 18,
  },

  actionDialogIcon: {
    width: 70,
    height: 70,
    alignSelf: "center",
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
  },

  rescheduleIcon: {
    backgroundColor: "#FFF5DD",
  },

  cancelIcon: {
    backgroundColor: "#FCECEA",
  },

  dialogEyebrow: {
    marginTop: 15,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.4,
    textAlign: "center",
  },

  dialogTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 25,
    textAlign: "center",
  },

  dialogMessage: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
  },

  inputLabel: {
    marginTop: 16,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1,
  },

  actionInput: {
    minHeight: 48,
    marginTop: 6,
    paddingHorizontal: 13,
    borderRadius: 15,
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 11,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  reasonInput: {
    minHeight: 105,
    marginTop: 6,
    padding: 13,
    borderRadius: 15,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 11,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  primaryDialogButton: {
    width: "100%",
    minHeight: 49,
    marginTop: 18,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  rescheduleButton: {
    backgroundColor: GOLD_DARK,
  },

  cancelButton: {
    backgroundColor: DANGER,
  },

  primaryDialogText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 10,
  },

  secondaryDialogButton: {
    width: "100%",
    minHeight: 46,
    marginTop: 9,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  secondaryDialogText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  noticeDialog: {
    width: "100%",
    maxWidth: 370,
    padding: 22,
    borderRadius: 29,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "rgba(214,180,91,.40)",
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
