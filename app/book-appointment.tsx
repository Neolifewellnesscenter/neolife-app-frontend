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
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { WebView } from "react-native-webview";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import PatientDrawer from "../components/PatientDrawer";
import PatientHeader from "../components/PatientHeader";
import { API_BASE_URL } from "../services/api";

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
const SUCCESS = "#287146";
const INFO = "#356C8C";

type NoticeType = "success" | "error" | "info";

type NoticeState = {
  visible: boolean;
  type: NoticeType;
  title: string;
  message: string;
  action?: "none" | "login" | "appointments";
};

type Doctor = {
  id: number;
  name?: string;
  qualification?: string;
  specialization?: string;
  experience?: string | number;
  experienceYears?: string | number;
  imageUrl?: string;
  profileImage?: string;
  profileImageUrl?: string;
  photoUrl?: string;
  active?: boolean;
};

type Slot = {
  id?: string | number;
  appointmentSlotId?: string | number;
  startTime?: string;
  time?: string;
  slotTime?: string;
  endTime?: string;
  toTime?: string;
  available?: boolean;
};

type RazorpayPaymentData = {
  paymentId?: number | string;
  referenceId?: number | string;
  paymentType?: string;
  razorpayOrderId?: string;
  keyId?: string;
  amount?: number | string;
  currency?: string;
  name?: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
};

type PendingAppointment = Record<string, any>;

type PatientForm = {
  patientName: string;
  age: string;
  gender: string;
  phoneNumber: string;
  symptoms: string;
  pastMedicalHistory: string;
};

const EMPTY_PATIENT: PatientForm = {
  patientName: "",
  age: "",
  gender: "",
  phoneNumber: "",
  symptoms: "",
  pastMedicalHistory: "",
};

export default function BookAppointmentScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [step, setStep] = useState(1);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const [appointmentDate, setAppointmentDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [patient, setPatient] = useState<PatientForm>(EMPTY_PATIENT);
  const [paying, setPaying] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paymentData, setPaymentData] = useState<RazorpayPaymentData | null>(null);
  const [pendingAppointment, setPendingAppointment] = useState<PendingAppointment | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const [notice, setNotice] = useState<NoticeState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
    action: "none",
  });

  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const selectedStartTime =
    selectedSlot?.startTime ||
    selectedSlot?.time ||
    selectedSlot?.slotTime ||
    "";

  const selectedEndTime =
    selectedSlot?.endTime ||
    selectedSlot?.toTime ||
    "";

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    const token = await getToken();

    if (!token) {
      showNotice(
        "info",
        "Login Required",
        "Please sign in before booking a clinic appointment.",
        "login"
      );
      setDoctorLoading(false);
      return;
    }

    await Promise.allSettled([loadDoctors(), loadPatientProfile()]);
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

  async function apiRequest(
    endpoint: string,
    options: RequestInit = {}
  ) {
    const token = await getToken();

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...((options.headers as Record<string, string>) || {}),
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
        success: false,
        message: text || "Invalid server response.",
      };
    }

    if (response.status === 401 || response.status === 403) {
      await clearSession();

      const error: any = new Error(
        result?.message || "Your login session has expired."
      );

      error.auth = true;
      throw error;
    }

    if (!response.ok || result?.success === false) {
      throw new Error(
        result?.message || `Request failed (${response.status})`
      );
    }

    return result;
  }

  // SAME API
  async function loadDoctors() {
    try {
      setDoctorLoading(true);

      const result = await apiRequest("/doctors/offline/getAll", {
        method: "GET",
      });

      const list: Doctor[] = Array.isArray(result?.data)
        ? result.data.filter((doctor: Doctor) => doctor.active !== false)
        : [];

      setDoctors(list);
    } catch (error: any) {
      if (error?.auth) {
        showNotice(
          "error",
          "Session Expired",
          error.message,
          "login"
        );
        return;
      }

      showNotice(
        "error",
        "Unable to Load Doctors",
        error?.message || "Unable to load available doctors."
      );

      setDoctors([]);
    } finally {
      setDoctorLoading(false);
    }
  }

  // SAME API
  async function loadPatientProfile() {
    try {
      const result = await apiRequest("/users/getProfile", {
        method: "GET",
      });

      const user = result?.data || {};

      setPatient((current) => ({
        ...current,
        patientName: String(user?.name || ""),
        age:
          user?.age === null || user?.age === undefined
            ? ""
            : String(user.age),
        gender: String(user?.gender || ""),
        phoneNumber: String(
          user?.phoneNumber || user?.phone || ""
        ),
      }));
    } catch {
      // Prefill is optional.
    }
  }

  function selectDoctor(doctor: Doctor) {
    setSelectedDoctor(doctor);
    setAppointmentDate("");
    setSlots([]);
    setSelectedSlot(null);
  }

  function goNextFromDoctor() {
    if (!selectedDoctor) {
      showNotice(
        "info",
        "Select a Doctor",
        "Please choose a doctor before continuing."
      );
      return;
    }

    setStep(2);

    // Automatically show today's available slots the first time
    // the patient opens Date & Time.
    if (!appointmentDate) {
      loadAvailableSlots(getLocalDateString(0));
    }
  }

  function handleDateSelected(event: any, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event?.type === "dismissed" || !selectedDate) {
      return;
    }

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");

    loadAvailableSlots(`${year}-${month}-${day}`);
  }

  // SAME API
  async function loadAvailableSlots(value: string) {
    setAppointmentDate(value);
    setSelectedSlot(null);
    setSlots([]);

    if (!selectedDoctor?.id) {
      showNotice(
        "info",
        "Select Doctor First",
        "Please choose a doctor before selecting a date."
      );
      setStep(1);
      return;
    }

    if (!value) return;

    if (new Date(`${value}T00:00:00`).getTime() < startOfToday()) {
      showNotice(
        "info",
        "Choose a Future Date",
        "Please select today or a future appointment date."
      );
      return;
    }

    try {
      setSlotLoading(true);

      const result = await apiRequest(
        `/appointment-slots/appointments/available?doctorId=${encodeURIComponent(
          String(selectedDoctor.id)
        )}&date=${encodeURIComponent(value)}`,
        { method: "GET" }
      );

      setSlots(Array.isArray(result?.data) ? result.data : []);
    } catch (error: any) {
      if (error?.auth) {
        showNotice(
          "error",
          "Session Expired",
          error.message,
          "login"
        );
        return;
      }

      showNotice(
        "error",
        "Unable to Load Slots",
        error?.message || "Unable to load available appointment slots."
      );
    } finally {
      setSlotLoading(false);
    }
  }

  function goNextFromSlot() {
    if (!appointmentDate) {
      showNotice(
        "info",
        "Choose a Date",
        "Please choose your appointment date."
      );
      return;
    }

    if (!selectedSlot || !selectedStartTime) {
      showNotice(
        "info",
        "Choose a Time",
        "Please select one available appointment time."
      );
      return;
    }

    setStep(3);
  }

  function updatePatient<K extends keyof PatientForm>(
    key: K,
    value: PatientForm[K]
  ) {
    setPatient((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validatePatient() {
    if (!patient.patientName.trim()) {
      showNotice(
        "info",
        "Patient Name Required",
        "Please enter the patient name."
      );
      return false;
    }

    const age = Number(patient.age);

    if (!patient.age || age < 1 || age > 120) {
      showNotice(
        "info",
        "Check Age",
        "Please enter a valid age between 1 and 120."
      );
      return false;
    }

    if (!patient.gender) {
      showNotice(
        "info",
        "Gender Required",
        "Please select gender."
      );
      return false;
    }

    if (!/^[0-9]{10}$/.test(patient.phoneNumber.trim())) {
      showNotice(
        "info",
        "Check Phone Number",
        "Please enter a valid 10-digit phone number."
      );
      return false;
    }

    if (!patient.symptoms.trim()) {
      showNotice(
        "info",
        "Symptoms Required",
        "Please briefly describe the symptoms or health concern."
      );
      return false;
    }

    return true;
  }

  function goNextFromPatient() {
    if (!validatePatient()) return;
    setStep(4);
  }

  // SAME API
  async function verifySelectedSlotAvailability() {
    if (
      !selectedDoctor?.id ||
      !appointmentDate ||
      !selectedStartTime
    ) {
      return false;
    }

    try {
      const result = await apiRequest(
        `/appointment-slots/appointments/available?doctorId=${encodeURIComponent(
          String(selectedDoctor.id)
        )}&date=${encodeURIComponent(appointmentDate)}`,
        { method: "GET" }
      );

      const latestSlots: Slot[] = Array.isArray(result?.data)
        ? result.data
        : [];

      const match = latestSlots.find((slot) => {
        const start =
          slot.startTime ||
          slot.time ||
          slot.slotTime ||
          "";

        return normalizeTime(start) === normalizeTime(selectedStartTime);
      });

      if (!match || match.available === false) {
        showNotice(
          "error",
          "Time Slot No Longer Available",
          "This appointment slot was just booked by someone else. Please choose another time."
        );

        setSelectedSlot(null);
        setSlots(latestSlots);
        setStep(2);
        return false;
      }

      return true;
    } catch (error: any) {
      showNotice(
        "error",
        "Unable to Confirm Slot",
        error?.message ||
          "We could not re-check this slot. Please try again."
      );
      return false;
    }
  }

  // SAME BOOKING + PAYMENT APIs
  async function createAppointment() {
    const token = await getToken();

    if (!token) {
      showNotice(
        "info",
        "Login Required",
        "Please sign in before booking an appointment.",
        "login"
      );
      return;
    }

    if (
      !validatePatient() ||
      !selectedDoctor?.id ||
      !appointmentDate ||
      !selectedStartTime
    ) {
      showNotice(
        "info",
        "Complete Appointment Details",
        "Please complete all appointment details before payment."
      );
      return;
    }

    try {
      setPaying(true);

      const stillAvailable = await verifySelectedSlotAvailability();

      if (!stillAvailable) return;

      const requestBody = {
        doctorId: Number(selectedDoctor.id),
        appointmentDate,
        startTime: normalizeTime(selectedStartTime).substring(0, 5),
        appointmentMode: "OFFLINE",
        patientName: patient.patientName.trim(),
        phoneNumber: patient.phoneNumber.trim(),
        age: Number(patient.age),
        gender: patient.gender,
        symptoms: patient.symptoms.trim(),
        pastMedicalHistory: patient.pastMedicalHistory.trim(),
      };

      const appointmentResult = await apiRequest(
        "/appointments/book",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        }
      );

      const appointment = appointmentResult?.data || {};

      const appointmentId =
        appointment?.id || appointment?.appointmentId;

      if (!appointmentId) {
        throw new Error(
          "Appointment was created, but no appointment ID was returned."
        );
      }

      await AsyncStorage.setItem(
        "pendingAppointmentId",
        String(appointmentId)
      );

      await AsyncStorage.setItem(
        "pendingAppointment",
        JSON.stringify(appointment)
      );

      setPendingAppointment(appointment);

      const paymentResult = await apiRequest(
        `/payments/appointment/${encodeURIComponent(
          String(appointmentId)
        )}/initiate`,
        { method: "POST" }
      );

      const razorpayData: RazorpayPaymentData =
        paymentResult?.data || {};

      const missingField = [
        "keyId",
        "razorpayOrderId",
        "amount",
        "currency",
      ].find((field) => {
        const value = (razorpayData as any)[field];
        return value === null || value === undefined || value === "";
      });

      if (missingField) {
        throw new Error(
          `Payment response is missing ${missingField}.`
        );
      }

      setPaymentData(razorpayData);
      setPaymentVisible(true);
    } catch (error: any) {
      if (error?.auth) {
        showNotice(
          "error",
          "Session Expired",
          error.message,
          "login"
        );
        return;
      }

      showNotice(
        "error",
        "Booking Could Not Be Completed",
        error?.message || "Unable to create the appointment."
      );
    } finally {
      setPaying(false);
    }
  }

  function closePaymentCheckout() {
    if (verifyingPayment) return;

    setPaymentVisible(false);
    setPaymentData(null);

    showNotice(
      "info",
      "Payment Not Completed",
      "The appointment is saved as pending payment. You can complete payment from My Appointments."
    );
  }

  async function verifyAppointmentPayment(
    razorpayResponse: any
  ) {
    if (!pendingAppointment) {
      showNotice(
        "error",
        "Appointment Missing",
        "The appointment details are unavailable. Please open My Appointments before trying payment again."
      );
      setPaymentVisible(false);
      return;
    }

    try {
      setVerifyingPayment(true);

      const result = await apiRequest(
        "/payments/razorpay/verify",
        {
          method: "POST",
          body: JSON.stringify({
            razorpayPaymentId:
              razorpayResponse?.razorpay_payment_id,
            razorpayOrderId:
              razorpayResponse?.razorpay_order_id,
            razorpaySignature:
              razorpayResponse?.razorpay_signature,
          }),
        }
      );

      if (result?.data?.signatureVerified === false) {
        throw new Error(
          "Payment signature verification failed."
        );
      }

      const appointmentId =
        pendingAppointment?.id ||
        pendingAppointment?.appointmentId;

      await AsyncStorage.multiRemove([
        "pendingAppointmentId",
        "pendingAppointment",
      ]);

      setPaymentVisible(false);
      setPaymentData(null);
      setPendingAppointment(null);

      showNotice(
        "success",
        "Payment Successful",
        "Your ₹50 payment was verified successfully. Your appointment is being confirmed.",
        "appointments"
      );

      console.log(
        "APPOINTMENT PAYMENT VERIFIED:",
        appointmentId
      );
    } catch (error: any) {
      console.log(
        "APPOINTMENT PAYMENT VERIFY ERROR:",
        error
      );

      setPaymentVisible(false);

      showNotice(
        "error",
        "Payment Verification Failed",
        error?.message ||
          "Payment completed, but verification failed. Please do not pay again. Check My Appointments or contact support."
      );
    } finally {
      setVerifyingPayment(false);
    }
  }

  function handleRazorpayMessage(event: any) {
    try {
      const raw = event?.nativeEvent?.data || "";
      const message = JSON.parse(raw);

      if (message?.type === "payment_success") {
        verifyAppointmentPayment(message?.data || {});
        return;
      }

      if (message?.type === "payment_failed") {
        setPaymentVisible(false);
        setPaymentData(null);

        showNotice(
          "error",
          "Payment Failed",
          message?.message ||
            "The payment could not be completed. Your appointment remains pending payment."
        );
        return;
      }

      if (message?.type === "payment_dismissed") {
        closePaymentCheckout();
        return;
      }

      if (message?.type === "checkout_error") {
        setPaymentVisible(false);
        setPaymentData(null);

        showNotice(
          "error",
          "Unable to Open Payment",
          message?.message ||
            "Razorpay Checkout could not be opened. Please try again."
        );
      }
    } catch (error) {
      console.log("RAZORPAY MESSAGE ERROR:", error);
    }
  }

  function handlePaymentNavigation(request: any) {
    const url = String(request?.url || "");

    if (
      !url ||
      url === "about:blank" ||
      url.startsWith("https://") ||
      url.startsWith("http://")
    ) {
      return true;
    }

    Linking.openURL(url).catch((error) => {
      console.log("PAYMENT EXTERNAL URL ERROR:", error);
    });

    return false;
  }

  function buildRazorpayHtml() {
    if (!paymentData || !pendingAppointment) return "";

    const appointmentId =
      pendingAppointment?.id ||
      pendingAppointment?.appointmentId ||
      "";

    const options = {
      key: paymentData.keyId,
      amount: Number(paymentData.amount),
      currency: paymentData.currency || "INR",
      name:
        paymentData.name ||
        "Neolife Wellness Center",
      description:
        paymentData.description ||
        "Offline appointment booking",
      order_id: paymentData.razorpayOrderId,
      prefill: {
        name:
          paymentData.customerName ||
          pendingAppointment?.patientName ||
          patient.patientName,
        email: paymentData.customerEmail || "",
        contact:
          paymentData.customerPhone ||
          pendingAppointment?.phoneNumber ||
          patient.phoneNumber,
      },
      notes: {
        appointmentId: String(appointmentId),
        appointmentType: "OFFLINE",
      },
      theme: {
        color: "#0B3D2E",
      },
    };

    const safeOptions = JSON.stringify(options).replace(
      /</g,
      "\\u003c"
    );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: #FBFAF6;
            font-family: Arial, sans-serif;
          }

          .loading {
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #0B3D2E;
          }

          .spinner {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: 4px solid #EAF5EF;
            border-top-color: #D6B45B;
            animation: spin .8s linear infinite;
            margin-bottom: 14px;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>

      <body>
        <div class="loading" id="loading">
          <div class="spinner"></div>
          <div>Opening secure payment...</div>
        </div>

        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <script>
          (function () {
            function send(message) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify(message)
              );
            }

            if (typeof Razorpay === "undefined") {
              send({
                type: "checkout_error",
                message: "Razorpay Checkout could not be loaded. Please check your internet connection."
              });
              return;
            }

            var options = ${safeOptions};

            options.handler = function (response) {
              send({
                type: "payment_success",
                data: response
              });
            };

            options.modal = {
              ondismiss: function () {
                send({ type: "payment_dismissed" });
              }
            };

            try {
              var razorpay = new Razorpay(options);

              razorpay.on("payment.failed", function (response) {
                send({
                  type: "payment_failed",
                  message:
                    response &&
                    response.error &&
                    response.error.description
                      ? response.error.description
                      : "Payment failed. Please try again."
                });
              });

              document.getElementById("loading").style.display = "none";
              razorpay.open();
            } catch (error) {
              send({
                type: "checkout_error",
                message:
                  error && error.message
                    ? error.message
                    : "Unable to open Razorpay Checkout."
              });
            }
          })();
        </script>
      </body>
      </html>
    `;
  }

  function showNotice(
    type: NoticeType,
    title: string,
    message: string,
    action: NoticeState["action"] = "none"
  ) {
    setNotice({
      visible: true,
      type,
      title,
      message,
      action,
    });
  }

  function closeNotice() {
    const action = notice.action;

    setNotice((current) => ({
      ...current,
      visible: false,
      action: "none",
    }));

    if (action === "login") {
      router.replace("/login" as any);
    } else if (action === "appointments") {
      router.replace("/my-appointments" as any);
    }
  }

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loaderText}>Preparing your appointment...</Text>
      </View>
    );
  }

  const stepTitles = [
    "Choose Doctor",
    "Date & Time",
    "Your Details",
    "Review & Pay",
  ];

  return (
    <View style={styles.screen}>
      <PatientHeader onMenuPress={() => setMenuOpen(true)} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* COMPACT APP HEADER */}
          <View style={styles.pageIntro}>
            <TouchableOpacity
              style={styles.backToConsultation}
              onPress={() => router.replace("/consultation" as any)}
            >
              <Ionicons name="chevron-back" size={20} color={GREEN} />
              <Text style={styles.backToConsultationText}>Consultation</Text>
            </TouchableOpacity>

            <View style={styles.introRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>CLINIC APPOINTMENT</Text>
                <Text style={styles.pageTitle}>Book your visit</Text>
                <Text style={styles.pageSubtitle}>
                  Complete only four short steps.
                </Text>
              </View>

              <View style={styles.feeBadge}>
                <Text style={styles.feeLabel}>BOOKING</Text>
                <Text style={styles.feeValue}>₹50</Text>
              </View>
            </View>
          </View>

          {/* SIMPLE PROGRESS */}
          <View style={styles.progressWrap}>
            <View style={styles.progressTop}>
              <Text style={styles.progressTitle}>
                Step {step} of 4
              </Text>
              <Text style={styles.progressStepName}>
                {stepTitles[step - 1]}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${step * 25}%` },
                ]}
              />
            </View>

            <View style={styles.stepDotsRow}>
              {[1, 2, 3, 4].map((item) => {
                const done = item < step;
                const active = item === step;

                return (
                  <TouchableOpacity
                    key={item}
                    disabled={item > step}
                    onPress={() => item < step && setStep(item)}
                    style={styles.stepDotItem}
                  >
                    <View
                      style={[
                        styles.stepDot,
                        done && styles.stepDotDone,
                        active && styles.stepDotActive,
                      ]}
                    >
                      {done ? (
                        <Ionicons name="checkmark" size={12} color={WHITE} />
                      ) : (
                        <Text
                          style={[
                            styles.stepDotText,
                            active && styles.stepDotTextActive,
                          ]}
                        >
                          {item}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* STEP CONTENT */}
          <View style={styles.mainCard}>
            {step === 1 && (
              <DoctorStep
                doctors={doctors}
                loading={doctorLoading}
                selected={selectedDoctor}
                onSelect={selectDoctor}
                onRetry={loadDoctors}
              />
            )}

            {step === 2 && (
              <ScheduleStep
                doctor={selectedDoctor}
                date={appointmentDate}
                showDatePicker={showDatePicker}
                onOpenDatePicker={() => setShowDatePicker(true)}
                onDateSelected={handleDateSelected}
                onSelectQuickDate={loadAvailableSlots}
                slots={slots}
                loading={slotLoading}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
              />
            )}

            {step === 3 && (
              <PatientStep
                patient={patient}
                onUpdate={updatePatient}
              />
            )}

            {step === 4 && (
              <ReviewStep
                doctor={selectedDoctor}
                date={appointmentDate}
                startTime={selectedStartTime}
                endTime={selectedEndTime}
                patient={patient}
              />
            )}
          </View>

          {/* BOTTOM ACTIONS */}
          <View style={styles.bottomActions}>
            {step > 1 && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setStep(step - 1)}
              >
                <Ionicons name="arrow-back" size={17} color={GREEN} />
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                step === 1 && styles.primaryButtonFull,
                paying && styles.primaryButtonDisabled,
              ]}
              disabled={paying}
              onPress={() => {
                if (step === 1) goNextFromDoctor();
                else if (step === 2) goNextFromSlot();
                else if (step === 3) goNextFromPatient();
                else createAppointment();
              }}
            >
              {paying ? (
                <ActivityIndicator size="small" color={GREEN} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {step === 4 ? "Pay ₹50 & Confirm" : "Continue"}
                  </Text>
                  <Ionicons
                    name={step === 4 ? "card-outline" : "arrow-forward"}
                    size={18}
                    color={GREEN}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.safeNote}>
            <Ionicons name="shield-checkmark-outline" size={17} color={GREEN} />
            <Text style={styles.safeNoteText}>
              Your booking details are handled securely.
            </Text>
          </View>

          <View style={{ height: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <PatientDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <Modal
        visible={paymentVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePaymentCheckout}
      >
        <View style={styles.paymentScreen}>
          <View style={styles.paymentHeader}>
            <TouchableOpacity
              style={styles.paymentCloseButton}
              onPress={closePaymentCheckout}
              disabled={verifyingPayment}
            >
              <Ionicons name="close" size={21} color={GREEN} />
            </TouchableOpacity>

            <View style={styles.paymentHeaderCopy}>
              <Text style={styles.paymentHeaderTitle}>Secure Payment</Text>
              <Text style={styles.paymentHeaderSubtitle}>
                NeoLife Wellness Center · ₹50
              </Text>
            </View>

            <View style={styles.paymentSecureIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={SUCCESS}
              />
            </View>
          </View>

          {verifyingPayment ? (
            <View style={styles.paymentVerifyState}>
              <ActivityIndicator size="large" color={GOLD_DARK} />
              <Text style={styles.paymentVerifyTitle}>
                Verifying payment
              </Text>
              <Text style={styles.paymentVerifyText}>
                Please wait. Do not close the app or pay again.
              </Text>
            </View>
          ) : paymentData && pendingAppointment ? (
            <WebView
              originWhitelist={["*"]}
              source={{ html: buildRazorpayHtml() }}
              onMessage={handleRazorpayMessage}
              onShouldStartLoadWithRequest={handlePaymentNavigation}
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoader}>
                  <ActivityIndicator size="large" color={GREEN} />
                  <Text style={styles.webviewLoaderText}>
                    Loading Razorpay...
                  </Text>
                </View>
              )}
              style={styles.paymentWebView}
            />
          ) : (
            <View style={styles.paymentVerifyState}>
              <Ionicons
                name="alert-circle-outline"
                size={38}
                color={DANGER}
              />
              <Text style={styles.paymentVerifyTitle}>
                Payment information unavailable
              </Text>
            </View>
          )}
        </View>
      </Modal>

      <Modal
        visible={notice.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeNotice}
      >
        <View style={styles.noticeRoot}>
          <Pressable style={styles.noticeBackdrop} onPress={closeNotice} />

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

            <Text style={styles.noticeEyebrow}>NEOLIFE WELLNESS</Text>
            <Text style={styles.noticeTitle}>{notice.title}</Text>
            <Text style={styles.noticeMessage}>{notice.message}</Text>

            <TouchableOpacity style={styles.noticeButton} onPress={closeNotice}>
              <Text style={styles.noticeButtonText}>
                {notice.action === "login"
                  ? "Go to Login"
                  : notice.action === "appointments"
                  ? "My Appointments"
                  : "Okay"}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={GREEN} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DoctorStep({
  doctors,
  loading,
  selected,
  onSelect,
  onRetry,
}: {
  doctors: Doctor[];
  loading: boolean;
  selected: Doctor | null;
  onSelect: (doctor: Doctor) => void;
  onRetry: () => void;
}) {
  return (
    <View>
      <StepHeading
        title="Who would you like to see?"
        text="Tap a doctor to select them."
      />

      {loading ? (
        <InlineState loading text="Loading available doctors..." />
      ) : !doctors.length ? (
        <InlineState
          icon="medical-outline"
          title="No doctors available"
          text="No clinic doctors are available right now."
          action="Try Again"
          onAction={onRetry}
        />
      ) : (
        <View style={styles.doctorList}>
          {doctors.map((doctor) => {
            const active = selected?.id === doctor.id;
            const experience =
              doctor.experience ?? doctor.experienceYears;

            return (
              <TouchableOpacity
                key={String(doctor.id)}
                activeOpacity={0.88}
                style={[
                  styles.doctorCard,
                  active && styles.doctorCardActive,
                ]}
                onPress={() => onSelect(doctor)}
              >
                <DoctorImage doctor={doctor} />

                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>
                    {doctor.name || "Doctor"}
                  </Text>

                  {!!doctor.specialization && (
                    <Text style={styles.doctorSpecialization}>
                      {doctor.specialization}
                    </Text>
                  )}

                  <View style={styles.doctorMetaRow}>
                    {!!doctor.qualification && (
                      <Text style={styles.doctorMeta}>
                        {doctor.qualification}
                      </Text>
                    )}

                    {!!experience && (
                      <>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.doctorMeta}>
                          {String(experience).toLowerCase().includes("year")
                            ? String(experience)
                            : `${experience} yrs`}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                <View
                  style={[
                    styles.selectCircle,
                    active && styles.selectCircleActive,
                  ]}
                >
                  {active && (
                    <Ionicons name="checkmark" size={15} color={WHITE} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function ScheduleStep({
  doctor,
  date,
  showDatePicker,
  onOpenDatePicker,
  onDateSelected,
  onSelectQuickDate,
  slots,
  loading,
  selectedSlot,
  onSelectSlot,
}: {
  doctor: Doctor | null;
  date: string;
  showDatePicker: boolean;
  onOpenDatePicker: () => void;
  onDateSelected: (event: any, selectedDate?: Date) => void;
  onSelectQuickDate: (value: string) => void;
  slots: Slot[];
  loading: boolean;
  selectedSlot: Slot | null;
  onSelectSlot: (slot: Slot) => void;
}) {
  const availableSlots = slots.filter((slot) => slot.available !== false);

  const today = getLocalDateString(0);
  const tomorrow = getLocalDateString(1);

  const isToday = date === today;
  const isTomorrow = date === tomorrow;

  return (
    <View>
      <StepHeading
        title="When would you like to visit?"
        text="Today's date is selected automatically. Choose tomorrow or use the calendar for another day."
      />

      {!!doctor && (
        <View style={styles.selectedDoctorMini}>
          <DoctorImage doctor={doctor} small />

          <View style={{ flex: 1 }}>
            <Text style={styles.selectedMiniLabel}>YOUR DOCTOR</Text>
            <Text style={styles.selectedMiniName}>
              {doctor.name || "Doctor"}
            </Text>
          </View>

          <Ionicons name="checkmark-circle" size={20} color={SUCCESS} />
        </View>
      )}

      <Text style={styles.fieldLabel}>CHOOSE DATE</Text>

      <View style={styles.quickDateRow}>
        <TouchableOpacity
          activeOpacity={0.86}
          style={[
            styles.quickDateCard,
            isToday && styles.quickDateCardActive,
          ]}
          onPress={() => onSelectQuickDate(today)}
        >
          <View
            style={[
              styles.quickDateIcon,
              isToday && styles.quickDateIconActive,
            ]}
          >
            <Ionicons
              name="today-outline"
              size={18}
              color={isToday ? WHITE : GREEN}
            />
          </View>

          <Text
            style={[
              styles.quickDateTitle,
              isToday && styles.quickDateTitleActive,
            ]}
          >
            Today
          </Text>

          <Text
            style={[
              styles.quickDateValue,
              isToday && styles.quickDateValueActive,
            ]}
          >
            {formatQuickDate(today)}
          </Text>

          {isToday && (
            <View style={styles.quickSelectedBadge}>
              <Ionicons name="checkmark" size={10} color={GREEN} />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.86}
          style={[
            styles.quickDateCard,
            isTomorrow && styles.quickDateCardActive,
          ]}
          onPress={() => onSelectQuickDate(tomorrow)}
        >
          <View
            style={[
              styles.quickDateIcon,
              isTomorrow && styles.quickDateIconActive,
            ]}
          >
            <Ionicons
              name="arrow-forward-outline"
              size={18}
              color={isTomorrow ? WHITE : GREEN}
            />
          </View>

          <Text
            style={[
              styles.quickDateTitle,
              isTomorrow && styles.quickDateTitleActive,
            ]}
          >
            Tomorrow
          </Text>

          <Text
            style={[
              styles.quickDateValue,
              isTomorrow && styles.quickDateValueActive,
            ]}
          >
            {formatQuickDate(tomorrow)}
          </Text>

          {isTomorrow && (
            <View style={styles.quickSelectedBadge}>
              <Ionicons name="checkmark" size={10} color={GREEN} />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.86}
          style={[
            styles.quickDateCard,
            !isToday && !isTomorrow && !!date && styles.quickDateCardActive,
          ]}
          onPress={onOpenDatePicker}
        >
          <View
            style={[
              styles.quickDateIcon,
              !isToday &&
                !isTomorrow &&
                !!date &&
                styles.quickDateIconActive,
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={!isToday && !isTomorrow && !!date ? WHITE : GREEN}
            />
          </View>

          <Text
            style={[
              styles.quickDateTitle,
              !isToday &&
                !isTomorrow &&
                !!date &&
                styles.quickDateTitleActive,
            ]}
          >
            Calendar
          </Text>

          <Text
            style={[
              styles.quickDateValue,
              !isToday &&
                !isTomorrow &&
                !!date &&
                styles.quickDateValueActive,
            ]}
          >
            Other date
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.selectedDateBar}>
        <View style={styles.selectedDateIcon}>
          <Ionicons name="calendar-clear-outline" size={18} color={GREEN} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.selectedDateLabel}>SELECTED DATE</Text>
          <Text style={styles.selectedDateValue}>
            {date ? formatDateWithDay(date) : "Selecting today..."}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.calendarEditButton}
          onPress={onOpenDatePicker}
        >
          <Ionicons name="create-outline" size={16} color={GREEN} />
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={date ? new Date(`${date}T12:00:00`) : new Date()}
          mode="date"
          display={Platform.OS === "android" ? "calendar" : "spinner"}
          minimumDate={new Date()}
          onChange={onDateSelected}
        />
      )}

      <View style={styles.slotHeader}>
        <Text style={styles.fieldLabel}>AVAILABLE TIMES</Text>

        {!!date && !loading && (
          <Text style={styles.slotCount}>
            {availableSlots.length} available
          </Text>
        )}
      </View>

      {loading ? (
        <InlineState loading text="Checking available times..." compact />
      ) : !date ? (
        <InlineState
          icon="calendar-outline"
          text="Today's available time slots will appear here."
          compact
        />
      ) : !availableSlots.length ? (
        <InlineState
          icon="time-outline"
          title="No slots available"
          text="No appointment times are available for this date. Try tomorrow or choose another date."
          compact
        />
      ) : (
        <View style={styles.slotGrid}>
          {availableSlots.map((slot, index) => {
            const start =
              slot.startTime ||
              slot.time ||
              slot.slotTime ||
              "";

            const end =
              slot.endTime ||
              slot.toTime ||
              "";

            const active =
              normalizeTime(
                selectedSlot?.startTime ||
                  selectedSlot?.time ||
                  selectedSlot?.slotTime ||
                  ""
              ) === normalizeTime(start);

            return (
              <TouchableOpacity
                key={String(
                  slot.id ||
                    slot.appointmentSlotId ||
                    `${start}-${index}`
                )}
                activeOpacity={0.86}
                style={[
                  styles.slotButton,
                  active && styles.slotButtonActive,
                ]}
                onPress={() => onSelectSlot(slot)}
              >
                <Text
                  style={[
                    styles.slotTime,
                    active && styles.slotTimeActive,
                  ]}
                >
                  {formatTime(start)}
                </Text>

                {!!end && (
                  <Text
                    style={[
                      styles.slotEnd,
                      active && styles.slotEndActive,
                    ]}
                  >
                    to {formatTime(end)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function PatientStep({
  patient,
  onUpdate,
}: {
  patient: PatientForm;
  onUpdate: <K extends keyof PatientForm>(
    key: K,
    value: PatientForm[K]
  ) => void;
}) {
  return (
    <View>
      <StepHeading
        title="Tell us about the patient"
        text="We prefilled what we could. Please check and complete the details."
      />

      <FormField
        label="Patient name"
        icon="person-outline"
        value={patient.patientName}
        placeholder="Enter patient name"
        onChangeText={(value) => onUpdate("patientName", value)}
      />

      <View style={styles.twoColumn}>
        <View style={{ flex: 1 }}>
          <FormField
            label="Age"
            icon="calendar-number-outline"
            value={patient.age}
            placeholder="Age"
            keyboardType="number-pad"
            maxLength={3}
            onChangeText={(value) =>
              onUpdate("age", value.replace(/\D/g, ""))
            }
          />
        </View>

        <View style={{ flex: 1 }}>
          <FormField
            label="Phone"
            icon="call-outline"
            value={patient.phoneNumber}
            placeholder="10 digits"
            keyboardType="phone-pad"
            maxLength={10}
            onChangeText={(value) =>
              onUpdate(
                "phoneNumber",
                value.replace(/\D/g, "").slice(0, 10)
              )
            }
          />
        </View>
      </View>

      <Text style={styles.fieldLabel}>GENDER</Text>

      <View style={styles.genderRow}>
        {[
          ["MALE", "Male"],
          ["FEMALE", "Female"],
          ["OTHER", "Other"],
        ].map(([value, label]) => {
          const active = patient.gender === value;

          return (
            <TouchableOpacity
              key={value}
              activeOpacity={0.86}
              style={[
                styles.genderButton,
                active && styles.genderButtonActive,
              ]}
              onPress={() => onUpdate("gender", value)}
            >
              <Text
                style={[
                  styles.genderText,
                  active && styles.genderTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.fieldLabel}>SYMPTOMS / HEALTH CONCERN</Text>

      <View style={styles.textAreaWrap}>
        <TextInput
          value={patient.symptoms}
          onChangeText={(value) => onUpdate("symptoms", value)}
          placeholder="Briefly describe the main health concern"
          placeholderTextColor="#9AA59E"
          multiline
          textAlignVertical="top"
          style={styles.textArea}
        />
      </View>

      <Text style={styles.fieldLabel}>PAST MEDICAL HISTORY · OPTIONAL</Text>

      <View style={styles.textAreaWrap}>
        <TextInput
          value={patient.pastMedicalHistory}
          onChangeText={(value) =>
            onUpdate("pastMedicalHistory", value)
          }
          placeholder="Previous illnesses, surgery or ongoing treatment"
          placeholderTextColor="#9AA59E"
          multiline
          textAlignVertical="top"
          style={styles.textArea}
        />
      </View>
    </View>
  );
}

function ReviewStep({
  doctor,
  date,
  startTime,
  endTime,
  patient,
}: {
  doctor: Doctor | null;
  date: string;
  startTime: string;
  endTime: string;
  patient: PatientForm;
}) {
  return (
    <View>
      <StepHeading
        title="Review your appointment"
        text="Check the details before continuing to payment."
      />

      <View style={styles.reviewDoctor}>
        {doctor && <DoctorImage doctor={doctor} small />}
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewDoctorLabel}>DOCTOR</Text>
          <Text style={styles.reviewDoctorName}>
            {doctor?.name || "Doctor"}
          </Text>
          {!!doctor?.specialization && (
            <Text style={styles.reviewDoctorSpec}>
              {doctor.specialization}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.reviewGrid}>
        <ReviewTile
          icon="calendar-outline"
          label="DATE"
          value={formatDate(date)}
        />
        <ReviewTile
          icon="time-outline"
          label="TIME"
          value={
            endTime
              ? `${formatTime(startTime)} - ${formatTime(endTime)}`
              : formatTime(startTime)
          }
        />
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Patient</Text>
        <ReviewRow label="Name" value={patient.patientName} />
        <ReviewRow label="Phone" value={patient.phoneNumber} />
        <ReviewRow label="Age" value={patient.age} />
        <ReviewRow label="Gender" value={patient.gender} />
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Health concern</Text>
        <Text style={styles.reviewLongText}>{patient.symptoms}</Text>
      </View>

      <View style={styles.paymentSummary}>
        <View>
          <Text style={styles.paymentLabel}>BOOKING FEE</Text>
          <Text style={styles.paymentSmall}>Secure Razorpay payment</Text>
        </View>
        <Text style={styles.paymentAmount}>₹50</Text>
      </View>
    </View>
  );
}

function StepHeading({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <View style={styles.stepHeading}>
      <Text style={styles.stepHeadingTitle}>{title}</Text>
      <Text style={styles.stepHeadingText}>{text}</Text>
    </View>
  );
}

function InlineState({
  loading = false,
  icon = "information-circle-outline",
  title,
  text,
  action,
  onAction,
  compact = false,
}: {
  loading?: boolean;
  icon?: any;
  title?: string;
  text: string;
  action?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.inlineState, compact && styles.inlineStateCompact]}>
      {loading ? (
        <ActivityIndicator size="small" color={GREEN} />
      ) : (
        <View style={styles.inlineStateIcon}>
          <Ionicons name={icon} size={22} color={GREEN} />
        </View>
      )}

      {!!title && <Text style={styles.inlineStateTitle}>{title}</Text>}
      <Text style={styles.inlineStateText}>{text}</Text>

      {!!action && !!onAction && (
        <TouchableOpacity style={styles.inlineAction} onPress={onAction}>
          <Text style={styles.inlineActionText}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function FormField({
  label,
  icon,
  value,
  placeholder,
  onChangeText,
  keyboardType,
  maxLength,
}: {
  label: string;
  icon: any;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  keyboardType?: any;
  maxLength?: number;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>

      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={18} color={GOLD_DARK} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA59E"
          keyboardType={keyboardType}
          maxLength={maxLength}
          style={styles.input}
        />
      </View>
    </View>
  );
}

function ReviewTile({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.reviewTile}>
      <Ionicons name={icon} size={19} color={GREEN} />
      <Text style={styles.reviewTileLabel}>{label}</Text>
      <Text style={styles.reviewTileValue}>{value}</Text>
    </View>
  );
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewRowLabel}>{label}</Text>
      <Text style={styles.reviewRowValue}>{value || "-"}</Text>
    </View>
  );
}

function DoctorImage({
  doctor,
  small = false,
}: {
  doctor: Doctor;
  small?: boolean;
}) {
  const uri = getDoctorImageUrl(doctor);

  if (!uri) {
    return (
      <Image
        source={require("../assets/images/main_logo.jpeg")}
        style={[styles.doctorImage, small && styles.doctorImageSmall]}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.doctorImage, small && styles.doctorImageSmall]}
      defaultSource={require("../assets/images/main_logo.jpeg")}
    />
  );
}

function getDoctorImageUrl(doctor: Doctor) {
  const value = String(
    doctor.imageUrl ||
      doctor.profileImage ||
      doctor.profileImageUrl ||
      doctor.photoUrl ||
      ""
  ).trim();

  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");

  if (value.startsWith("/")) {
    return `${apiOrigin}${value}`;
  }

  return `${apiOrigin}/${value}`;
}

function normalizeTime(value: string) {
  if (!value) return "";

  const parts = String(value).split(":");
  if (parts.length < 2) return value;

  return `${String(parts[0]).padStart(2, "0")}:${String(
    parts[1]
  ).padStart(2, "0")}`;
}

function formatTime(value?: string) {
  if (!value) return "-";

  const parts = String(value).split(":");
  if (parts.length < 2) return value;

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getLocalDateString(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatQuickDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatDateWithDay(value: string) {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function startOfToday() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
}

const styles = StyleSheet.create({
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
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 11,
  },

  scrollContent: {
    flexGrow: 1,
  },

  pageIntro: {
    paddingHorizontal: 18,
    paddingTop: 17,
  },

  backToConsultation: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -5,
  },

  backToConsultationText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  introRow: {
    marginTop: 17,
    flexDirection: "row",
    alignItems: "center",
  },

  eyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.1,
  },

  pageTitle: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 30,
    lineHeight: 35,
  },

  pageSubtitle: {
    marginTop: 5,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 11,
  },

  feeBadge: {
    minWidth: 75,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 17,
    alignItems: "center",
    backgroundColor: "#FFF5D8",
    borderWidth: 1,
    borderColor: "#E9D9A7",
  },

  feeLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 6,
    letterSpacing: 0.7,
  },

  feeValue: {
    marginTop: 2,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 23,
  },

  progressWrap: {
    marginTop: 19,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 19,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  progressStepName: {
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 9,
  },

  progressTrack: {
    marginTop: 10,
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: MINT,
  },

  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: GOLD,
  },

  stepDotsRow: {
    marginTop: 11,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  stepDotItem: {
    flex: 1,
    alignItems: "center",
  },

  stepDot: {
    width: 25,
    height: 25,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  stepDotActive: {
    backgroundColor: GOLD,
  },

  stepDotDone: {
    backgroundColor: GREEN,
  },

  stepDotText: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 9,
  },

  stepDotTextActive: {
    color: GREEN,
  },

  mainCard: {
    marginTop: 15,
    marginHorizontal: 16,
    padding: 17,
    borderRadius: 23,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 2,
    shadowColor: GREEN,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  stepHeading: {
    marginBottom: 17,
  },

  stepHeadingTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 24,
    lineHeight: 29,
  },

  stepHeadingText: {
    marginTop: 5,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
  },

  doctorList: {
    gap: 10,
  },

  doctorCard: {
    padding: 11,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: BORDER,
  },

  doctorCardActive: {
    backgroundColor: MINT,
    borderColor: GREEN,
  },

  doctorImage: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: MINT,
  },

  doctorImageSmall: {
    width: 45,
    height: 45,
    borderRadius: 14,
  },

  doctorInfo: {
    flex: 1,
    marginLeft: 11,
  },

  doctorName: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 12,
  },

  doctorSpecialization: {
    marginTop: 2,
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 9,
  },

  doctorMetaRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
  },

  doctorMeta: {
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },

  metaDot: {
    marginHorizontal: 5,
    color: GOLD_DARK,
    fontSize: 8,
  },

  selectCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#CCD6D0",
    alignItems: "center",
    justifyContent: "center",
  },

  selectCircleActive: {
    borderColor: GREEN,
    backgroundColor: GREEN,
  },

  selectedDoctorMini: {
    marginBottom: 16,
    padding: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: MINT,
  },

  selectedMiniLabel: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 0.7,
  },

  selectedMiniName: {
    marginTop: 2,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  fieldGroup: {
    marginBottom: 14,
  },

  fieldLabel: {
    marginBottom: 7,
    fontFamily: "DMSans_700Bold",
    color: "#6E7A73",
    fontSize: 8,
    letterSpacing: 0.75,
  },

  quickDateRow: {
    flexDirection: "row",
    gap: 8,
  },

  quickDateCard: {
    flex: 1,
    minHeight: 104,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: BORDER,
  },

  quickDateCardActive: {
    backgroundColor: MINT,
    borderColor: GREEN,
  },

  quickDateIcon: {
    width: 34,
    height: 34,
    marginBottom: 7,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  quickDateIconActive: {
    backgroundColor: GREEN,
  },

  quickDateTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
    textAlign: "center",
  },

  quickDateTitleActive: {
    color: GREEN,
  },

  quickDateValue: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 7,
    textAlign: "center",
  },

  quickDateValueActive: {
    color: GREEN_2,
  },

  quickSelectedBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },

  selectedDateBar: {
    marginTop: 11,
    minHeight: 61,
    paddingHorizontal: 11,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  selectedDateIcon: {
    width: 38,
    height: 38,
    marginRight: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  selectedDateLabel: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 0.7,
  },

  selectedDateValue: {
    marginTop: 3,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  calendarEditButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  dateButton: {
    minHeight: 62,
    paddingHorizontal: 11,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: BORDER,
  },

  dateIcon: {
    width: 39,
    height: 39,
    marginRight: 10,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  dateButtonSmall: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 0.6,
  },

  dateButtonValue: {
    marginTop: 3,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  datePlaceholder: {
    color: MUTED,
    fontFamily: "DMSans_400Regular",
  },

  slotHeader: {
    marginTop: 19,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  slotCount: {
    fontFamily: "DMSans_500Medium",
    color: SUCCESS,
    fontSize: 8,
  },

  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  slotButton: {
    width: "31%",
    minHeight: 57,
    paddingHorizontal: 7,
    paddingVertical: 9,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: BORDER,
  },

  slotButtonActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  slotTime: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  slotTimeActive: {
    color: WHITE,
  },

  slotEnd: {
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 7,
  },

  slotEndActive: {
    color: "#D5E5DB",
  },

  inputWrap: {
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: BORDER,
  },

  input: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 11,
  },

  twoColumn: {
    flexDirection: "row",
    gap: 10,
  },

  genderRow: {
    marginBottom: 15,
    flexDirection: "row",
    gap: 8,
  },

  genderButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: BORDER,
  },

  genderButtonActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  genderText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  genderTextActive: {
    color: WHITE,
  },

  textAreaWrap: {
    marginBottom: 15,
    minHeight: 100,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderRadius: 15,
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: BORDER,
  },

  textArea: {
    minHeight: 82,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 11,
    lineHeight: 17,
  },

  reviewDoctor: {
    padding: 11,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: MINT,
  },

  reviewDoctorLabel: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 0.7,
  },

  reviewDoctorName: {
    marginTop: 2,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 12,
  },

  reviewDoctorSpec: {
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },

  reviewGrid: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },

  reviewTile: {
    flex: 1,
    minHeight: 91,
    padding: 12,
    borderRadius: 16,
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: BORDER,
  },

  reviewTileLabel: {
    marginTop: 8,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 0.7,
  },

  reviewTileValue: {
    marginTop: 3,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
    lineHeight: 15,
  },

  reviewSection: {
    marginTop: 13,
    padding: 13,
    borderRadius: 16,
    backgroundColor: CREAM,
  },

  reviewSectionTitle: {
    marginBottom: 8,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  reviewRow: {
    paddingVertical: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  reviewRowLabel: {
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
  },

  reviewRowValue: {
    flex: 1,
    textAlign: "right",
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 9,
  },

  reviewLongText: {
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 10,
    lineHeight: 16,
  },

  paymentSummary: {
    marginTop: 13,
    padding: 14,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: GREEN,
  },

  paymentLabel: {
    fontFamily: "DMSans_700Bold",
    color: "#D7E4DB",
    fontSize: 7,
    letterSpacing: 0.8,
  },

  paymentSmall: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: "#BFD0C5",
    fontSize: 8,
  },

  paymentAmount: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GOLD,
    fontSize: 27,
  },

  inlineState: {
    minHeight: 165,
    padding: 20,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },

  inlineStateCompact: {
    minHeight: 110,
  },

  inlineStateIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  inlineStateTitle: {
    marginTop: 10,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  inlineStateText: {
    marginTop: 5,
    maxWidth: 260,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
    lineHeight: 14,
    textAlign: "center",
  },

  inlineAction: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: GREEN,
  },

  inlineActionText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 9,
  },

  bottomActions: {
    marginTop: 14,
    marginHorizontal: 16,
    flexDirection: "row",
    gap: 10,
  },

  secondaryButton: {
    minHeight: 51,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  secondaryButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  primaryButton: {
    flex: 1,
    minHeight: 51,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
  },

  primaryButtonFull: {
    flex: 1,
  },

  primaryButtonDisabled: {
    opacity: 0.65,
  },

  primaryButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  safeNote: {
    marginTop: 13,
    marginHorizontal: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: MINT,
  },

  safeNoteText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    color: GREEN_2,
    fontSize: 8,
  },

  paymentScreen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  paymentHeader: {
    minHeight: 76,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
  },

  paymentCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  paymentHeaderCopy: {
    flex: 1,
    marginLeft: 11,
  },

  paymentHeaderTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 19,
  },

  paymentHeaderSubtitle: {
    marginTop: 2,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 9,
  },

  paymentSecureIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF7EE",
  },

  paymentWebView: {
    flex: 1,
    backgroundColor: CREAM,
  },

  webviewLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },

  webviewLoaderText: {
    marginTop: 10,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 10,
  },

  paymentVerifyState: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },

  paymentVerifyTitle: {
    marginTop: 14,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 24,
    textAlign: "center",
  },

  paymentVerifyText: {
    marginTop: 7,
    maxWidth: 300,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
  },

  noticeRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },

  noticeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,31,21,0.72)",
  },

  noticeCard: {
    width: "100%",
    maxWidth: 390,
    padding: 25,
    borderRadius: 27,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "#E8D8A7",
  },

  noticeIcon: {
    width: 62,
    height: 62,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  noticeSuccess: {
    backgroundColor: "#EAF7EE",
  },

  noticeError: {
    backgroundColor: "#FBECE9",
  },

  noticeInfo: {
    backgroundColor: "#EDF5FA",
  },

  noticeEyebrow: {
    marginTop: 14,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    letterSpacing: 1.2,
  },

  noticeTitle: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 24,
    textAlign: "center",
  },

  noticeMessage: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
  },

  noticeButton: {
    marginTop: 19,
    minHeight: 47,
    paddingHorizontal: 18,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GOLD,
  },

  noticeButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },
});
