import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts as useDMSans,
} from "@expo-google-fonts/dm-sans";
import {
  PlayfairDisplay_700Bold,
  useFonts as usePlayfair,
} from "@expo-google-fonts/playfair-display";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import * as FileSystem from "expo-file-system";
import DateTimePicker from "@react-native-community/datetimepicker";
import RazorpayCheckout from "react-native-razorpay";

import { API_BASE_URL } from "../services/api";
import PatientDrawer from "../components/PatientDrawer";

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
const DANGER_LIGHT = "#FBECE9";
const SUCCESS = "#287146";
const SUCCESS_LIGHT = "#EAF7EE";
const INFO = "#356C8C";
const INFO_LIGHT = "#EDF6FB";

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
  imageUrl?: string;
  profileImage?: string;
  profileImageUrl?: string;
  photoUrl?: string;
  active?: boolean;
};

type Slot = {
  id?: number | string;
  startTime?: string;
  endTime?: string;
  available?: boolean;
  booked?: boolean;
  status?: string;
};

type MedicalFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

type PatientForm = {
  patientName: string;
  age: string;
  gender: string;
  phoneNumber: string;
  symptoms: string;
  pastMedicalHistory: string;
  currentMedication: string;
};

const EMPTY_PATIENT: PatientForm = {
  patientName: "",
  age: "",
  gender: "",
  phoneNumber: "",
  symptoms: "",
  pastMedicalHistory: "",
  currentMedication: "",
};

export default function OnlineConsultationScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileLetter, setProfileLetter] = useState("");

  const [step, setStep] = useState(1);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const [preferredDate, setPreferredDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [patient, setPatient] = useState<PatientForm>(EMPTY_PATIENT);
  const [medicalReports, setMedicalReports] = useState<MedicalFile[]>([]);

  const [submitting, setSubmitting] = useState(false);

  const [notice, setNotice] = useState<NoticeState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
    action: "none",
  });

  const heroAnim = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(1)).current;

  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_700Bold,
  });

  const selectedStartTime = selectedSlot?.startTime || "";
  const selectedEndTime = selectedSlot?.endTime || "";

  const completed = useMemo(
    () => [1, 2, 3, 4].map((item) => item < step),
    [step]
  );

  useEffect(() => {
    initialize();

    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    stepAnim.setValue(0);

    Animated.timing(stepAnim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [step]);

  async function initialize() {
    const token = await getToken();

    if (!token) {
      setDoctorLoading(false);
      showNotice(
        "info",
        "Login Required",
        "Please sign in before requesting an online consultation.",
        "login"
      );
      return;
    }

    await Promise.allSettled([
      loadDoctors(),
      loadPatientProfile(),
      loadProfileLetter(),
    ]);
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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  async function loadProfileLetter() {
    try {
      const savedName =
        (await AsyncStorage.getItem("name")) ||
        (await AsyncStorage.getItem("userName")) ||
        "";

      setProfileLetter(savedName.trim().charAt(0).toUpperCase());
    } catch {
      setProfileLetter("");
    }
  }

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
        gender: String(user?.gender || "").toUpperCase(),
        phoneNumber: String(user?.phoneNumber || user?.phone || ""),
      }));

      const name = String(user?.name || "").trim();

      if (name) {
        setProfileLetter(name.charAt(0).toUpperCase());
      }
    } catch {
      // Prefill is optional.
    }
  }

  async function loadDoctors() {
    try {
      setDoctorLoading(true);

      const result = await apiRequest("/doctors/online/getAll", {
        method: "GET",
      });

      const list: Doctor[] = Array.isArray(result?.data)
        ? result.data.filter((doctor: Doctor) => doctor.active !== false)
        : [];

      setDoctors(list);
    } catch (error: any) {
      setDoctors([]);

      if (error?.auth) {
        showNotice("error", "Session Expired", error.message, "login");
        return;
      }

      showNotice(
        "error",
        "Unable to Load Doctors",
        error?.message || "Unable to load online consultation doctors."
      );
    } finally {
      setDoctorLoading(false);
    }
  }

  function selectDoctor(doctor: Doctor) {
    setSelectedDoctor(doctor);
    setPreferredDate("");
    setSlots([]);
    setSelectedSlot(null);
  }

  function nextFromDoctor() {
    if (!selectedDoctor) {
      showNotice(
        "info",
        "Select a Doctor",
        "Please choose the doctor you want to consult online."
      );
      return;
    }

    setStep(2);
  }

  function handleDateSelected(
  event: any,
  selectedDate?: Date
) {
  // Android calendar closes after selection
  if (Platform.OS === "android") {
    setShowDatePicker(false);
  }

  if (event?.type === "dismissed") {
    return;
  }

  if (!selectedDate) {
    return;
  }

  const year = selectedDate.getFullYear();

  const month = String(
    selectedDate.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    selectedDate.getDate()
  ).padStart(2, "0");

  const formattedDate =
    `${year}-${month}-${day}`;

  loadAvailableSlots(formattedDate);
}

  async function loadAvailableSlots(date: string) {
    setPreferredDate(date);
    setSelectedSlot(null);
    setSlots([]);

    if (!selectedDoctor?.id) {
      showNotice(
        "info",
        "Select Doctor First",
        "Please choose a doctor before selecting a consultation date."
      );
      setStep(1);
      return;
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return;
    }

    if (new Date(`${date}T00:00:00`).getTime() < startOfToday()) {
      showNotice(
        "info",
        "Choose a Future Date",
        "Please select today or a future consultation date."
      );
      return;
    }

    try {
      setSlotLoading(true);

      const result = await apiRequest(
        `/appointment-slots/consultation/available?doctorId=${encodeURIComponent(
          String(selectedDoctor.id)
        )}&date=${encodeURIComponent(date)}`,
        { method: "GET" }
      );

      setSlots(Array.isArray(result?.data) ? result.data : []);
    } catch (error: any) {
      if (error?.auth) {
        showNotice("error", "Session Expired", error.message, "login");
        return;
      }

      showNotice(
        "error",
        "Unable to Load Slots",
        error?.message || "Unable to load available online consultation slots."
      );
    } finally {
      setSlotLoading(false);
    }
  }

  function slotIsAvailable(slot: Slot) {
    const status = String(slot.status || "").toUpperCase();

    return (
      slot.available !== false &&
      slot.booked !== true &&
      status !== "BOOKED" &&
      status !== "UNAVAILABLE"
    );
  }

  function nextFromSlot() {
    if (!preferredDate) {
      showNotice(
        "info",
        "Select Consultation Date",
        "Please enter your preferred consultation date."
      );
      return;
    }

    if (!selectedSlot?.startTime) {
      showNotice(
        "info",
        "Select Time Slot",
        "Please choose one available consultation time."
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
      showNotice("info", "Gender Required", "Please select gender.");
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(patient.phoneNumber.trim())) {
      showNotice(
        "info",
        "Check Phone Number",
        "Please enter a valid 10-digit Indian mobile number."
      );
      return false;
    }

    if (!patient.symptoms.trim()) {
      showNotice(
        "info",
        "Symptoms Required",
        "Please describe the patient’s symptoms or health concern."
      );
      return false;
    }

    return true;
  }

  function nextFromPatient() {
    if (!validatePatient()) return;
    setStep(4);
  }

  async function pickMedicalReports() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const picked = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
      }));

      const combined = [...medicalReports, ...picked];

      if (combined.length > 10) {
        showNotice(
          "info",
          "Maximum 10 Reports",
          "You can attach up to 10 medical report files."
        );
        return;
      }

      const oversized = combined.find(
        (file) => Number(file.size || 0) > 10 * 1024 * 1024
      );

      if (oversized) {
        showNotice(
          "error",
          "File Too Large",
          `${oversized.name} is larger than 10 MB.`
        );
        return;
      }

      setMedicalReports(combined);
    } catch {
      showNotice(
        "error",
        "Unable to Choose Files",
        "Medical reports could not be selected."
      );
    }
  }

  function removeMedicalReport(index: number) {
    setMedicalReports((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function buildPastMedicalHistory() {
    const parts: string[] = [];

    if (patient.pastMedicalHistory.trim()) {
      parts.push(patient.pastMedicalHistory.trim());
    }

    if (patient.currentMedication.trim()) {
      parts.push(
        `Current medication: ${patient.currentMedication.trim()}`
      );
    }

    return parts.join("\n") || "No past medical history provided";
  }

  async function submitOnlineConsultation() {
    const token = await getToken();

    if (!token) {
      showNotice(
        "info",
        "Login Required",
        "Please sign in before sending the consultation request.",
        "login"
      );
      return;
    }

    if (
      !validatePatient() ||
      !selectedDoctor?.id ||
      !preferredDate ||
      !selectedStartTime
    ) {
      showNotice(
        "info",
        "Complete Consultation Details",
        "Please complete the doctor, slot and patient details."
      );
      return;
    }

    try {
      setSubmitting(true);

      // Match the working website request payload exactly.
      const consultationRequest = {
        doctorId: Number(selectedDoctor.id),
        consultationDate: preferredDate,
        startTime: normalizeApiTime(selectedStartTime).slice(0, 5),
        patientName: patient.patientName.trim(),
        phoneNumber: patient.phoneNumber.trim(),
        age: Number(patient.age),
        gender: String(patient.gender).toUpperCase(),
        symptoms: patient.symptoms.trim(),
        pastMedicalHistory:
          patient.pastMedicalHistory.trim() ||
          "No past medical history provided",
      };

      // React Native cannot append a browser Blob in the same way as the website,
      // so create a temporary JSON file and upload it as the multipart
      // `consultation` part with application/json content type.
      const jsonFile = new FileSystem.File(
        FileSystem.Paths.cache,
        `consultation-${Date.now()}.json`
      );
      jsonFile.write(JSON.stringify(consultationRequest));

      const formData = new FormData();
      formData.append(
        "consultation",
        {
          uri: jsonFile.uri,
          name: "consultation.json",
          type: "application/json",
        } as any
      );

      medicalReports.forEach((file) => {
        formData.append(
          "medicalReports",
          {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || guessMimeType(file.name),
          } as any
        );
      });

      const response = await fetch(`${API_BASE_URL}/consultations/request`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
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
        showNotice(
          "error",
          "Session Expired",
          result?.message || "Please sign in again.",
          "login"
        );
        return;
      }

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || `Request failed (${response.status}).`
        );
      }

      const consultation = result?.data || {};
      const consultationId = consultation?.id || consultation?.consultationId;

      if (!consultationId) {
        throw new Error(
          "Consultation was created, but no consultation ID was returned."
        );
      }

      await AsyncStorage.setItem(
        "pendingConsultationId",
        String(consultationId)
      );
      await AsyncStorage.setItem(
        "onlineConsultation",
        JSON.stringify(consultation)
      );

      const status = String(
        consultation?.status || consultation?.consultationStatus || ""
      ).toUpperCase();

      const paymentAllowed = [
        "CONFIRMED",
        "ACCEPTED",
        "DOCTOR_CONFIRMED",
        "PAYMENT_PENDING",
        "PENDING_PAYMENT",
      ].includes(status);

      // Same behavior as the website: payment opens only when the backend
      // says the consultation is already confirmed/payment-pending.
      if (paymentAllowed) {
        await initiateConsultationPayment(consultation);
        return;
      }

      showNotice(
        "success",
        "Request Sent to Doctor",
        result?.message ||
          "Consultation request sent. Payment will be available after doctor confirmation.",
        "appointments"
      );
    } catch (error: any) {
      showNotice(
        "error",
        "Request Could Not Be Sent",
        error?.message || "Unable to send consultation request."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyConsultationPayment(
    razorpayResponse: any,
    consultation: any
  ) {
    try {
      const paymentId = razorpayResponse?.razorpay_payment_id;
      const orderId = razorpayResponse?.razorpay_order_id;
      const signature = razorpayResponse?.razorpay_signature;

      if (!paymentId || !orderId || !signature) {
        throw new Error("Razorpay did not return complete payment details.");
      }

      const result = await apiRequest("/payments/razorpay/verify", {
        method: "POST",
        body: JSON.stringify({
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
          razorpaySignature: signature,
        }),
      });

      if (result?.data?.signatureVerified === false) {
        throw new Error("Payment signature verification failed.");
      }

      await AsyncStorage.removeItem("pendingConsultationId");
      await AsyncStorage.removeItem("onlineConsultation");

      showNotice(
        "success",
        "Payment Successful",
        "Payment verified successfully. Your online consultation is confirmed.",
        "appointments"
      );
    } catch (error: any) {
      showNotice(
        "error",
        "Payment Verification Failed",
        error?.message ||
          "Payment completed, but verification failed. Please contact support before paying again.",
        "appointments"
      );
    }
  }

  async function initiateConsultationPayment(consultation: any) {
    const consultationId = consultation?.id || consultation?.consultationId;

    try {
      if (!consultationId) {
        throw new Error("Consultation ID is missing.");
      }

      const result = await apiRequest(
        `/payments/consultation/${encodeURIComponent(
          String(consultationId)
        )}/initiate`,
        { method: "POST" }
      );

      const paymentData = result?.data || {};

      for (const field of ["keyId", "razorpayOrderId", "amount", "currency"]) {
        if (paymentData?.[field] == null || paymentData?.[field] === "") {
          throw new Error(`Payment response is missing ${field}.`);
        }
      }

      const options: any = {
        key: String(paymentData.keyId),
        amount: Number(paymentData.amount),
        currency: paymentData.currency || "INR",
        name: paymentData.name || "NeoLife Wellness Center",
        description:
          paymentData.description || "Online consultation payment",
        order_id: String(paymentData.razorpayOrderId),
        prefill: {
          name: paymentData.customerName || patient.patientName,
          email:
            paymentData.customerEmail ||
            (await AsyncStorage.getItem("email")) ||
            "",
          contact: paymentData.customerPhone || patient.phoneNumber,
        },
        notes: {
          consultationId: String(consultationId),
          consultationType: "ONLINE",
        },
        theme: { color: "#143d29" },
      };

      const razorpayResponse = await RazorpayCheckout.open(options);
      await verifyConsultationPayment(razorpayResponse, consultation);
    } catch (error: any) {
      const message =
        error?.description ||
        error?.message ||
        "Payment was cancelled or could not be completed.";

      showNotice(
        "error",
        "Payment Not Completed",
        `${message} You can retry from My Appointments.`,
        "appointments"
      );
    }
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
          Preparing online consultation...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* SAME HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setMenuOpen(true)}
        >
          <Ionicons name="menu-outline" size={25} color={GREEN} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.brandWrap}
          onPress={() => router.replace("/(tabs)" as any)}
        >
          <Image
            source={require("../assets/images/main_logo.jpeg")}
            style={styles.logo}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.brandName}>NeoLife</Text>
            <Text style={styles.brandSmall}>Wellness Center</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push("/profile" as any)}
        >
          {profileLetter ? (
            <Text style={styles.profileLetter}>{profileLetter}</Text>
          ) : (
            <Ionicons name="person-outline" size={20} color={WHITE} />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* HERO */}
          <Animated.View
            style={[
              styles.hero,
              {
                opacity: heroAnim,
                transform: [
                  {
                    translateY: heroAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.heroOrb1} />
            <View style={styles.heroOrb2} />

            <View style={styles.heroBadge}>
              <Ionicons name="videocam-outline" size={14} color={GOLD_LIGHT} />
              <Text style={styles.heroBadgeText}>ONLINE CONSULTATION</Text>
            </View>

            <Text style={styles.heroTitle}>
              Consult Our Doctors{"\n"}
              <Text style={styles.heroAccent}>From Home</Text>
            </Text>

            <Text style={styles.heroText}>
              Choose a doctor, select a convenient online slot and send your
              health details securely. You pay ₹200 only after the doctor
              confirms your request.
            </Text>

            <View style={styles.heroInfo}>
              <View style={styles.heroInfoIcon}>
                <Ionicons name="information-circle-outline" size={18} color={GOLD} />
              </View>
              <Text style={styles.heroInfoText}>
                No payment now · Doctor confirms first · ₹200 after confirmation
              </Text>
            </View>
          </Animated.View>

          {/* STEPPER */}
          <View style={styles.stepperCard}>
            {[
              ["medical-outline", "Doctor"],
              ["calendar-outline", "Date & Time"],
              ["person-outline", "Details"],
              ["checkmark-done-outline", "Review"],
            ].map(([icon, label], index) => {
              const item = index + 1;
              const active = item === step;
              const done = completed[index];

              return (
                <React.Fragment key={label}>
                  <TouchableOpacity
                    style={styles.stepperItem}
                    disabled={item > step}
                    onPress={() => item < step && setStep(item)}
                  >
                    <View
                      style={[
                        styles.stepCircle,
                        active && styles.stepCircleActive,
                        done && styles.stepCircleDone,
                      ]}
                    >
                      {done ? (
                        <Ionicons name="checkmark" size={15} color={WHITE} />
                      ) : (
                        <Ionicons
                          name={icon as any}
                          size={15}
                          color={active ? GREEN : "#87928B"}
                        />
                      )}
                    </View>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.stepLabel,
                        active && styles.stepLabelActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>

                  {index < 3 && (
                    <View
                      style={[
                        styles.stepLine,
                        done && styles.stepLineDone,
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* ACTIVE STEP */}
          <Animated.View
            style={[
              styles.panel,
              {
                opacity: stepAnim,
                transform: [
                  {
                    translateX: stepAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {step === 1 && (
              <View>
                <SectionHeading
                  eyebrow="STEP 1 OF 4"
                  title="Choose Your Doctor"
                  text="Select a doctor who is available for online consultation."
                />

                {doctorLoading ? (
                  <LoadingBox text="Loading online consultation doctors..." />
                ) : !doctors.length ? (
                  <EmptyCard
                    icon="videocam-off-outline"
                    title="No Doctors Available"
                    text="No online consultation doctors are currently available."
                    onRetry={loadDoctors}
                  />
                ) : (
                  <View style={styles.doctorList}>
                    {doctors.map((doctor) => (
                      <DoctorCard
                        key={String(doctor.id)}
                        doctor={doctor}
                        selected={selectedDoctor?.id === doctor.id}
                        onPress={() => selectDoctor(doctor)}
                      />
                    ))}
                  </View>
                )}

                <NavigationButtons
                  backText="Back"
                  nextText="Continue"
                  onBack={() => router.replace("/consultation" as any)}
                  onNext={nextFromDoctor}
                />
              </View>
            )}

            {step === 2 && (
              <View>
                <SectionHeading
                  eyebrow="STEP 2 OF 4"
                  title="Choose Date & Time"
                  text="Select your preferred date to view the doctor’s available online consultation slots."
                />

                {selectedDoctor && (
                  <View style={styles.selectedDoctorCard}>
                    <DoctorImage doctor={selectedDoctor} />

                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedEyebrow}>SELECTED DOCTOR</Text>
                      <Text style={styles.selectedName}>
                        {selectedDoctor.name || "Doctor"}
                      </Text>
                      <Text style={styles.selectedSpec}>
                        {selectedDoctor.specialization ||
                          selectedDoctor.qualification ||
                          "Online Consultation"}
                      </Text>
                    </View>

                    <Ionicons
                      name="videocam"
                      size={21}
                      color={SUCCESS}
                    />
                  </View>
                )}

                <Text style={styles.fieldLabel}>
  CONSULTATION DATE
</Text>

<TouchableOpacity
  style={styles.datePickerButton}
  activeOpacity={0.85}
  onPress={() => setShowDatePicker(true)}
>
  <View style={styles.dateIconBox}>
    <Ionicons
      name="calendar-outline"
      size={20}
      color={GOLD_DARK}
    />
  </View>

  <View style={{ flex: 1 }}>
    <Text style={styles.dateSmallLabel}>
      PREFERRED DATE
    </Text>

    <Text
      style={[
        styles.dateValue,
        !preferredDate &&
          styles.datePlaceholder,
      ]}
    >
      {preferredDate
        ? formatDate(preferredDate)
        : "Tap to choose a date"}
    </Text>
  </View>

  <Ionicons
    name="chevron-down"
    size={18}
    color={GREEN}
  />
</TouchableOpacity>

{preferredDate ? (
  <View style={styles.selectedDateInfo}>
    <Ionicons
      name="checkmark-circle"
      size={16}
      color={SUCCESS}
    />

    <Text style={styles.selectedDateText}>
      {formatDate(preferredDate)} selected
    </Text>
  </View>
) : (
  <Text style={styles.dateHelpText}>
    Choose today or any future date
  </Text>
)}

{showDatePicker && (
  <DateTimePicker
    value={
      preferredDate
        ? new Date(
            `${preferredDate}T12:00:00`
          )
        : new Date()
    }
    mode="date"
    display={
      Platform.OS === "android"
        ? "calendar"
        : "spinner"
    }
    minimumDate={new Date()}
    onChange={handleDateSelected}
  />
)}

                <View style={styles.slotHeader}>
                  <Text style={styles.fieldLabel}>AVAILABLE TIME SLOTS</Text>

                  {slots.length > 0 && (
                    <Text style={styles.slotCount}>
                      {slots.filter(slotIsAvailable).length} available
                    </Text>
                  )}
                </View>

                <View style={styles.slotGrid}>
                  {slotLoading ? (
                    <LoadingBox text="Checking online slots..." compact />
                  ) : !preferredDate ? (
                    <EmptyInline
                      icon="calendar-outline"
                      text="Enter a consultation date to view available slots."
                    />
                  ) : !slots.length ? (
                    <EmptyInline
                      icon="time-outline"
                      text="No online consultation slots are available for this date."
                    />
                  ) : (
                    slots.map((slot, index) => {
                      const available = slotIsAvailable(slot);
                      const selected =
                        normalizeApiTime(selectedSlot?.startTime || "") ===
                        normalizeApiTime(slot.startTime || "");

                      return (
                        <TouchableOpacity
                          key={String(slot.id || `${slot.startTime}-${index}`)}
                          disabled={!available}
                          style={[
                            styles.slotButton,
                            selected && styles.slotSelected,
                            !available && styles.slotDisabled,
                          ]}
                          onPress={() => setSelectedSlot(slot)}
                        >
                          <Ionicons
                            name="videocam-outline"
                            size={14}
                            color={
                              selected
                                ? WHITE
                                : available
                                ? GREEN
                                : "#A1AAA4"
                            }
                          />

                          <Text
                            style={[
                              styles.slotText,
                              selected && styles.slotTextSelected,
                              !available && styles.slotTextDisabled,
                            ]}
                          >
                            {formatTime(slot.startTime)}
                            {slot.endTime
                              ? `\n${formatTime(slot.endTime)}`
                              : ""}
                          </Text>

                          {!available && (
                            <Text style={styles.unavailableText}>
                              Unavailable
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                <NavigationButtons
                  backText="Previous"
                  nextText="Continue"
                  onBack={() => setStep(1)}
                  onNext={nextFromSlot}
                />
              </View>
            )}

            {step === 3 && (
              <View>
                <SectionHeading
                  eyebrow="STEP 3 OF 4"
                  title="Patient Details"
                  text="Your saved profile details are filled automatically when available."
                />

                <FormField
                  icon="person-outline"
                  label="Patient Name"
                  placeholder="Enter patient name"
                  value={patient.patientName}
                  onChangeText={(value) =>
                    updatePatient("patientName", value)
                  }
                />

                <FormField
                  icon="calendar-number-outline"
                  label="Age"
                  placeholder="Enter age"
                  value={patient.age}
                  keyboardType="number-pad"
                  maxLength={3}
                  onChangeText={(value) =>
                    updatePatient("age", value.replace(/\D/g, ""))
                  }
                />

                <Text style={styles.fieldLabel}>GENDER</Text>

                <View style={styles.genderRow}>
                  {[
                    ["MALE", "Male", "male-outline"],
                    ["FEMALE", "Female", "female-outline"],
                    ["OTHER", "Other", "person-outline"],
                  ].map(([value, label, icon]) => {
                    const active = patient.gender === value;

                    return (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.genderChip,
                          active && styles.genderChipActive,
                        ]}
                        onPress={() => updatePatient("gender", value)}
                      >
                        <Ionicons
                          name={icon as any}
                          size={15}
                          color={active ? WHITE : GREEN}
                        />
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

                <FormField
                  icon="call-outline"
                  label="Phone Number"
                  placeholder="Enter 10-digit mobile number"
                  value={patient.phoneNumber}
                  keyboardType="phone-pad"
                  maxLength={10}
                  onChangeText={(value) =>
                    updatePatient(
                      "phoneNumber",
                      value.replace(/\D/g, "").slice(0, 10)
                    )
                  }
                />

                <Text style={styles.fieldLabel}>SYMPTOMS / HEALTH CONCERN</Text>

                <TextArea
                  value={patient.symptoms}
                  placeholder="Describe symptoms and health concerns"
                  onChangeText={(value) =>
                    updatePatient("symptoms", value)
                  }
                />

                <Text style={styles.fieldLabel}>PAST MEDICAL HISTORY</Text>

                <TextArea
                  value={patient.pastMedicalHistory}
                  placeholder="Previous illnesses, surgeries or treatments (optional)"
                  onChangeText={(value) =>
                    updatePatient("pastMedicalHistory", value)
                  }
                />

                <Text style={styles.fieldLabel}>CURRENT MEDICATION</Text>

                <TextArea
                  value={patient.currentMedication}
                  placeholder="Mention any medicines you are currently taking (optional)"
                  onChangeText={(value) =>
                    updatePatient("currentMedication", value)
                  }
                  compact
                />

                <Text style={styles.fieldLabel}>MEDICAL REPORTS</Text>

                <View style={styles.uploadCard}>
                  <View style={styles.uploadIcon}>
                    <Ionicons
                      name="document-attach-outline"
                      size={26}
                      color={GOLD_DARK}
                    />
                  </View>

                  <Text style={styles.uploadTitle}>
                    Add Previous Medical Reports
                  </Text>

                  <Text style={styles.uploadText}>
                    PDF, JPG or PNG · Maximum 10 files · Up to 10 MB each
                  </Text>

                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={pickMedicalReports}
                  >
                    <Ionicons name="add-outline" size={17} color={GREEN} />
                    <Text style={styles.uploadButtonText}>
                      Choose Reports
                    </Text>
                  </TouchableOpacity>
                </View>

                {medicalReports.length > 0 && (
                  <View style={styles.fileList}>
                    {medicalReports.map((file, index) => (
                      <View key={`${file.uri}-${index}`} style={styles.fileItem}>
                        <View style={styles.fileIcon}>
                          <Ionicons
                            name={
                              String(file.mimeType).includes("pdf")
                                ? "document-text-outline"
                                : "image-outline"
                            }
                            size={17}
                            color={GREEN}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.fileName} numberOfLines={1}>
                            {file.name}
                          </Text>
                          <Text style={styles.fileSize}>
                            {formatFileSize(file.size)}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.fileRemove}
                          onPress={() => removeMedicalReport(index)}
                        >
                          <Ionicons name="close" size={16} color={DANGER} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.privacyCard}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={19}
                    color={GREEN}
                  />
                  <Text style={styles.privacyText}>
                    Your health details are sent only with this consultation
                    request so the doctor can understand your concern better.
                  </Text>
                </View>

                <NavigationButtons
                  backText="Previous"
                  nextText="Review Request"
                  onBack={() => setStep(2)}
                  onNext={nextFromPatient}
                />
              </View>
            )}

            {step === 4 && (
              <View>
                <SectionHeading
                  eyebrow="STEP 4 OF 4"
                  title="Review Your Request"
                  text="Check the details before sending your consultation request to the doctor."
                />

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryHeading}>
                    Consultation Summary
                  </Text>

                  <SummaryRow
                    label="Type"
                    value="Online Consultation"
                  />
                  <SummaryRow
                    label="Doctor"
                    value={
                      selectedDoctor?.specialization
                        ? `${selectedDoctor?.name} · ${selectedDoctor?.specialization}`
                        : selectedDoctor?.name || "-"
                    }
                  />
                  <SummaryRow
                    label="Date"
                    value={formatDate(preferredDate)}
                  />
                  <SummaryRow
                    label="Time"
                    value={
                      selectedEndTime
                        ? `${formatTime(selectedStartTime)} - ${formatTime(
                            selectedEndTime
                          )}`
                        : formatTime(selectedStartTime)
                    }
                  />
                  <SummaryRow
                    label="Patient"
                    value={patient.patientName}
                  />
                  <SummaryRow
                    label="Phone"
                    value={patient.phoneNumber}
                  />
                  <SummaryRow
                    label="Symptoms"
                    value={patient.symptoms}
                  />
                  <SummaryRow
                    label="Reports"
                    value={
                      medicalReports.length
                        ? `${medicalReports.length} file(s) selected`
                        : "No files selected"
                    }
                    last
                  />

                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setStep(3)}
                  >
                    <Ionicons name="create-outline" size={16} color={GREEN} />
                    <Text style={styles.editButtonText}>Edit Details</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <View>
                      <Text style={styles.requestEyebrow}>REQUEST STATUS</Text>
                      <Text style={styles.requestTitle}>Send to Doctor</Text>
                    </View>

                    <View style={styles.videoCircle}>
                      <Ionicons name="videocam" size={22} color={GOLD} />
                    </View>
                  </View>

                  <View style={styles.pendingBadge}>
                    <Ionicons name="time-outline" size={15} color={GOLD_LIGHT} />
                    <Text style={styles.pendingText}>
                      Pending Doctor Confirmation
                    </Text>
                  </View>

                  <Text style={styles.requestText}>
                    The doctor can accept your requested slot or reschedule the
                    online consultation.
                  </Text>

                  <View style={styles.paymentLaterCard}>
                    <Ionicons name="wallet-outline" size={19} color={GOLD} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentLaterTitle}>
                        No payment required now
                      </Text>
                      <Text style={styles.paymentLaterText}>
                        After doctor confirmation, you will be asked to pay ₹200.
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      submitting && styles.submitButtonDisabled,
                    ]}
                    onPress={submitOnlineConsultation}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={GREEN} />
                    ) : (
                      <Ionicons
                        name="paper-plane-outline"
                        size={18}
                        color={GREEN}
                      />
                    )}

                    <Text style={styles.submitButtonText}>
                      {submitting
                        ? "Sending Request..."
                        : "Send Request to Doctor"}
                    </Text>

                    {!submitting && (
                      <Ionicons
                        name="arrow-forward"
                        size={17}
                        color={GREEN}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>

          {/* REASSURANCE */}
          <View style={styles.helpCard}>
            <View style={styles.helpIcon}>
              <Ionicons name="heart-circle-outline" size={25} color={GOLD} />
            </View>

            <Text style={styles.helpEyebrow}>COMFORTABLE CARE FROM HOME</Text>

            <Text style={styles.helpTitle}>
              Need Help With Your Request?
            </Text>

            <Text style={styles.helpText}>
              Our team can help you choose a doctor, slot or understand the
              online consultation process.
            </Text>

            <TouchableOpacity
              style={styles.helpButton}
              onPress={() =>
                openURL(
                  "https://wa.me/919481489866?text=Hello%20NeoLife%20Wellness%20Center,%20I%20need%20help%20with%20online%20consultation."
                )
              }
            >
              <Ionicons name="logo-whatsapp" size={18} color={GREEN} />
              <Text style={styles.helpButtonText}>Chat With NeoLife</Text>
            </TouchableOpacity>
          </View>

          {/* SAME FOOTER */}
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
              onPress={() =>
                openURL("mailto:neelavar.murali@gmail.com")
              }
            >
              <Ionicons name="mail-outline" size={17} color={GOLD} />
              <Text style={styles.footerText}>
                neelavar.murali@gmail.com
              </Text>
            </TouchableOpacity>

            <Text style={styles.footerAddress}>
              4-1-38, Behind Lions Bhavan Road, Nairkere 1st Cross,
              Brahmagiri, Ambalapady Post, Udupi – 576103, Karnataka, India
            </Text>

            <View style={styles.socialRow}>
              <Social
                icon="logo-facebook"
                onPress={() =>
                  openURL(
                    "https://www.facebook.com/profile.php?id=61575580360517"
                  )
                }
              />
              <Social
                icon="logo-instagram"
                onPress={() =>
                  openURL("https://www.instagram.com/neolives_global")
                }
              />
              <Social
                icon="logo-youtube"
                onPress={() =>
                  openURL(
                    "https://www.youtube.com/@NeolifeWellnessCenterUdupi-o7x"
                  )
                }
              />
              <Social
                icon="logo-whatsapp"
                onPress={() => openURL("https://wa.me/919481489866")}
              />
            </View>

            <Text style={styles.copyright}>
              © 2026 NeoLife Wellness Center. All Rights Reserved.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FLOATING WHATSAPP */}
      <TouchableOpacity
        style={styles.whatsapp}
        onPress={() => openURL("https://wa.me/919481489866")}
      >
        <Ionicons name="logo-whatsapp" size={28} color={WHITE} />
      </TouchableOpacity>

      {/* SHARED PATIENT DRAWER */}
<PatientDrawer
  visible={menuOpen}
  onClose={() => setMenuOpen(false)}
/>

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

            <Text style={styles.noticeEyebrow}>NEOLIFE WELLNESS</Text>
            <Text style={styles.noticeTitle}>{notice.title}</Text>
            <Text style={styles.noticeMessage}>{notice.message}</Text>

            <TouchableOpacity
              style={styles.noticeButton}
              onPress={closeNotice}
            >
              <Text style={styles.noticeButtonText}>
                {notice.action === "login"
                  ? "Go to Login"
                  : notice.action === "appointments"
                  ? "My Appointments"
                  : "Okay"}
              </Text>

              <Ionicons name="arrow-forward" size={17} color={GREEN} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DoctorCard({
  doctor,
  selected,
  onPress,
}: {
  doctor: Doctor;
  selected: boolean;
  onPress: () => void;
}) {
  const experience = doctor.experience;

  return (
    <TouchableOpacity
      style={[
        styles.doctorCard,
        selected && styles.doctorCardSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <DoctorImage doctor={doctor} />

      <View style={{ flex: 1 }}>
        <Text style={styles.doctorName}>
          {doctor.name || "Doctor"}
        </Text>

        {!!doctor.qualification && (
          <Text style={styles.doctorMeta}>{doctor.qualification}</Text>
        )}

        {!!doctor.specialization && (
          <Text style={styles.doctorSpecialization}>
            {doctor.specialization}
          </Text>
        )}

        {!!experience && (
          <Text style={styles.doctorExperience}>
            {`${experience}${
              String(experience).toLowerCase().includes("year")
                ? ""
                : " Years Experience"
            }`}
          </Text>
        )}

        <View style={styles.onlineBadge}>
          <Ionicons name="videocam-outline" size={12} color={SUCCESS} />
          <Text style={styles.onlineBadgeText}>
            Online Consultation Available
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.selectCircle,
          selected && styles.selectCircleSelected,
        ]}
      >
        {selected && (
          <Ionicons name="checkmark" size={15} color={WHITE} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function DoctorImage({ doctor }: { doctor: Doctor }) {
  const uri = getDoctorImageUrl(doctor);

  if (!uri) {
    return (
      <Image
        source={require("../assets/images/main_logo.jpeg")}
        style={styles.doctorImage}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.doctorImage}
      defaultSource={require("../assets/images/main_logo.jpeg")}
    />
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

function FormField({
  icon,
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  maxLength,
}: {
  icon: any;
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: any;
  maxLength?: number;
}) {
  return (
    <View style={{ marginBottom: 15 }}>
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

function TextArea({
  value,
  placeholder,
  onChangeText,
  compact = false,
}: {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.textAreaWrap,
        compact && { minHeight: 90 },
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA59E"
        multiline
        textAlignVertical="top"
        style={[
          styles.textArea,
          compact && { minHeight: 90 },
        ]}
      />
    </View>
  );
}

function NavigationButtons({
  backText,
  nextText,
  onBack,
  onNext,
}: {
  backText: string;
  nextText: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.navButtons}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={17} color={GREEN} />
        <Text style={styles.backButtonText}>{backText}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.nextButton} onPress={onNext}>
        <Text style={styles.nextButtonText}>{nextText}</Text>
        <Ionicons name="arrow-forward" size={17} color={GREEN} />
      </TouchableOpacity>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.summaryRow,
        last && { borderBottomWidth: 0 },
      ]}
    >
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value || "-"}</Text>
    </View>
  );
}

function LoadingBox({
  text,
  compact = false,
}: {
  text: string;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.loadingBox,
        compact && { minHeight: 90 },
      ]}
    >
      <ActivityIndicator size="small" color={GREEN} />
      <Text style={styles.loadingBoxText}>{text}</Text>
    </View>
  );
}

function EmptyCard({
  icon,
  title,
  text,
  onRetry,
}: {
  icon: any;
  title: string;
  text: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.emptyCard}>
      <Ionicons name={icon} size={30} color={GOLD_DARK} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>

      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyInline({
  icon,
  text,
}: {
  icon: any;
  text: string;
}) {
  return (
    <View style={styles.emptyInline}>
      <Ionicons name={icon} size={20} color={GOLD_DARK} />
      <Text style={styles.emptyInlineText}>{text}</Text>
    </View>
  );
}

function Social({
  icon,
  onPress,
}: {
  icon: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.socialButton} onPress={onPress}>
      <Ionicons name={icon} size={20} color={WHITE} />
    </TouchableOpacity>
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

  if (value.startsWith("/uploads/")) {
    return `${apiOrigin}${value}`;
  }

  if (value.startsWith("uploads/")) {
    return `${apiOrigin}/${value}`;
  }

  if (value.startsWith("/")) {
    return `${API_BASE_URL}${value}`;
  }

  return `${API_BASE_URL}/${value}`;
}

function normalizeApiTime(value?: string) {
  if (!value) return "";

  const parts = String(value).split(":");

  if (parts.length < 2) return value;

  const hh = String(parts[0]).padStart(2, "0");
  const mm = String(parts[1]).padStart(2, "0");
  const ss = String(parts[2] || "00").padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
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

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
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

function guessMimeType(name: string) {
  const lower = name.toLowerCase();

  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";

  return "image/jpeg";
}

function formatFileSize(size?: number | null) {
  if (!size) return "Selected file";

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
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
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  header: {
    minHeight: 72,
    paddingTop: Platform.OS === "web" ? 12 : 44,
    paddingBottom: 11,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEDE9",
    zIndex: 50,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  brandWrap: {
    flex: 1,
    marginHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 9,
    borderRadius: 14,
  },
  brandName: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 17,
  },
  brandSmall: {
    marginTop: 1,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },
  profileLetter: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 15,
  },

  hero: {
    margin: 16,
    minHeight: 390,
    padding: 24,
    borderRadius: 31,
    overflow: "hidden",
    justifyContent: "center",
    backgroundColor: GREEN,
  },
  heroOrb1: {
    position: "absolute",
    width: 245,
    height: 245,
    right: -100,
    top: -100,
    borderRadius: 123,
    backgroundColor: "rgba(214,180,91,.16)",
  },
  heroOrb2: {
    position: "absolute",
    width: 170,
    height: 170,
    left: -65,
    bottom: -75,
    borderRadius: 85,
    backgroundColor: "rgba(255,255,255,.06)",
  },
  heroBadge: {
    alignSelf: "flex-start",
    minHeight: 35,
    paddingHorizontal: 11,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,.08)",
  },
  heroBadgeText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 8,
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 20,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 38,
    lineHeight: 43,
  },
  heroAccent: {
    color: GOLD_LIGHT,
  },
  heroText: {
    marginTop: 12,
    maxWidth: 335,
    fontFamily: "DMSans_400Regular",
    color: "#D8E6DD",
    fontSize: 11,
    lineHeight: 18,
  },
  heroInfo: {
    marginTop: 20,
    padding: 11,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,.08)",
  },
  heroInfoIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.08)",
  },
  heroInfoText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 7,
    lineHeight: 12,
  },

  stepperCard: {
    marginHorizontal: 16,
    minHeight: 86,
    paddingHorizontal: 10,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  stepperItem: {
    width: 55,
    alignItems: "center",
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF1EF",
  },
  stepCircleActive: {
    backgroundColor: GOLD,
  },
  stepCircleDone: {
    backgroundColor: GREEN,
  },
  stepLabel: {
    marginTop: 5,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 6,
    textAlign: "center",
  },
  stepLabelActive: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 1,
    marginBottom: 18,
    backgroundColor: "#E1E6E2",
  },
  stepLineDone: {
    backgroundColor: GREEN,
  },

  panel: {
    marginTop: 22,
    marginHorizontal: 16,
    padding: 17,
    borderRadius: 27,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  eyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.3,
  },
  sectionTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 27,
    lineHeight: 32,
  },
  sectionText: {
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
    lineHeight: 15,
  },

  doctorList: {
    gap: 10,
  },
  doctorCard: {
    padding: 12,
    borderRadius: 19,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "#FBFCFA",
    borderWidth: 1,
    borderColor: BORDER,
  },
  doctorCardSelected: {
    backgroundColor: "#FFF9E8",
    borderColor: GOLD,
  },
  doctorImage: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: MINT,
  },
  doctorName: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 16,
  },
  doctorMeta: {
    marginTop: 3,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 7,
  },
  doctorSpecialization: {
    marginTop: 2,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
  },
  doctorExperience: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 7,
  },
  onlineBadge: {
    alignSelf: "flex-start",
    marginTop: 5,
    minHeight: 24,
    paddingHorizontal: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: SUCCESS_LIGHT,
  },
  onlineBadgeText: {
    fontFamily: "DMSans_700Bold",
    color: SUCCESS,
    fontSize: 6,
  },
  selectCircle: {
    width: 25,
    height: 25,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#CCD6CF",
  },
  selectCircleSelected: {
    borderColor: GOLD,
    backgroundColor: GOLD,
  },

  selectedDoctorCard: {
    marginBottom: 17,
    padding: 12,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: MINT,
  },
  selectedEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 6,
    letterSpacing: 0.8,
  },
  selectedName: {
    marginTop: 3,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 16,
  },
  selectedSpec: {
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 7,
  },

  fieldLabel: {
    marginTop: 14,
    marginBottom: 7,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 7,
    letterSpacing: 1,
  },
  inputWrap: {
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FBFCFA",
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
  datePickerButton: {
  minHeight: 68,
  padding: 10,
  borderRadius: 17,
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  backgroundColor: "#FBFCFA",
  borderWidth: 1,
  borderColor: BORDER,
},

dateIconBox: {
  width: 44,
  height: 44,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#FFF7E3",
},

dateSmallLabel: {
  fontFamily: "DMSans_700Bold",
  color: GOLD_DARK,
  fontSize: 6.5,
  letterSpacing: 0.8,
},

dateValue: {
  marginTop: 4,
  fontFamily: "DMSans_700Bold",
  color: GREEN,
  fontSize: 11,
},

datePlaceholder: {
  color: "#929D96",
  fontFamily: "DMSans_500Medium",
},

selectedDateInfo: {
  alignSelf: "flex-start",
  marginTop: 8,
  minHeight: 31,
  paddingHorizontal: 10,
  borderRadius: 10,
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  backgroundColor: SUCCESS_LIGHT,
},

selectedDateText: {
  fontFamily: "DMSans_700Bold",
  color: SUCCESS,
  fontSize: 7.5,
},

dateHelpText: {
  marginTop: 7,
  fontFamily: "DMSans_400Regular",
  color: MUTED,
  fontSize: 7,
},

  slotHeader: {
    marginTop: 5,
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
    minHeight: 110,
    padding: 10,
    borderRadius: 17,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#F8F9F6",
  },
  slotButton: {
    width: "31%",
    minHeight: 62,
    padding: 7,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#D9E3DC",
  },
  slotSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  slotDisabled: {
    backgroundColor: "#ECEFED",
    borderColor: "#DEE3E0",
  },
  slotText: {
    marginTop: 3,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 7,
    textAlign: "center",
    lineHeight: 10,
  },
  slotTextSelected: {
    color: WHITE,
  },
  slotTextDisabled: {
    color: "#9AA29D",
  },
  unavailableText: {
    marginTop: 2,
    fontFamily: "DMSans_700Bold",
    color: DANGER,
    fontSize: 5.5,
  },

  genderRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 5,
  },
  genderChip: {
    flex: 1,
    minHeight: 45,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#F6F8F5",
    borderWidth: 1,
    borderColor: BORDER,
  },
  genderChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  genderText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },
  genderTextActive: {
    color: WHITE,
  },

  textAreaWrap: {
    minHeight: 110,
    borderRadius: 16,
    backgroundColor: "#FBFCFA",
    borderWidth: 1,
    borderColor: BORDER,
  },
  textArea: {
    minHeight: 110,
    padding: 12,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 10,
    lineHeight: 16,
  },

  uploadCard: {
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "#FAFCF9",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#CBD9CF",
  },
  uploadIcon: {
    width: 53,
    height: 53,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7E3",
  },
  uploadTitle: {
    marginTop: 10,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 17,
  },
  uploadText: {
    marginTop: 5,
    maxWidth: 260,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 7,
    lineHeight: 12,
    textAlign: "center",
  },
  uploadButton: {
    minHeight: 40,
    marginTop: 12,
    paddingHorizontal: 13,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: GOLD,
  },
  uploadButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },

  fileList: {
    marginTop: 10,
    gap: 7,
  },
  fileItem: {
    minHeight: 52,
    padding: 8,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: MINT,
  },
  fileIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  fileName: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },
  fileSize: {
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 6.5,
  },
  fileRemove: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DANGER_LIGHT,
  },

  privacyCard: {
    marginTop: 15,
    padding: 11,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: MINT,
  },
  privacyText: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
  },

  navButtons: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: "row",
    gap: 8,
  },
  backButton: {
    minHeight: 47,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: MINT,
  },
  backButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },
  nextButton: {
    flex: 1,
    minHeight: 47,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: GOLD,
  },
  nextButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  loadingBox: {
    minHeight: 150,
    width: "100%",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9F6",
  },
  loadingBoxText: {
    marginTop: 8,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 8,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "#F8F9F6",
  },
  emptyTitle: {
    marginTop: 10,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 18,
  },
  emptyText: {
    marginTop: 5,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 40,
    marginTop: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: "center",
    backgroundColor: GOLD,
  },
  retryText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },
  emptyInline: {
    width: "100%",
    minHeight: 85,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyInlineText: {
    marginTop: 6,
    maxWidth: 235,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    textAlign: "center",
  },

  summaryCard: {
    padding: 15,
    borderRadius: 21,
    backgroundColor: "#F8F9F6",
    borderWidth: 1,
    borderColor: BORDER,
  },
  summaryHeading: {
    marginBottom: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 19,
  },
  summaryRow: {
    paddingVertical: 11,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECE9",
  },
  summaryLabel: {
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 8,
  },
  summaryValue: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
    textAlign: "right",
  },
  editButton: {
    minHeight: 43,
    marginTop: 12,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: MINT,
  },
  editButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },

  requestCard: {
    marginTop: 13,
    padding: 17,
    borderRadius: 22,
    backgroundColor: GREEN,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  requestEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 7,
    letterSpacing: 0.9,
  },
  requestTitle: {
    marginTop: 3,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 20,
  },
  videoCircle: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.09)",
  },
  pendingBadge: {
    marginTop: 15,
    minHeight: 40,
    paddingHorizontal: 11,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,.08)",
  },
  pendingText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 8,
  },
  requestText: {
    marginTop: 12,
    fontFamily: "DMSans_400Regular",
    color: "#CBDACF",
    fontSize: 8,
    lineHeight: 13,
  },
  paymentLaterCard: {
    marginTop: 12,
    padding: 11,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255,255,255,.08)",
  },
  paymentLaterTitle: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 8,
  },
  paymentLaterText: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: "#CBDACF",
    fontSize: 7,
    lineHeight: 12,
  },
  submitButton: {
    minHeight: 50,
    marginTop: 15,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: GOLD,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
    textAlign: "center",
  },

  helpCard: {
    marginTop: 45,
    marginHorizontal: 16,
    padding: 25,
    borderRadius: 28,
    alignItems: "center",
    backgroundColor: "#F2E5C0",
    borderWidth: 1,
    borderColor: "#E5D09A",
  },
  helpIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },
  helpEyebrow: {
    marginTop: 14,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.2,
  },
  helpTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 23,
    textAlign: "center",
  },
  helpText: {
    marginTop: 7,
    maxWidth: 310,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
    lineHeight: 15,
    textAlign: "center",
  },
  helpButton: {
    minHeight: 44,
    marginTop: 16,
    paddingHorizontal: 15,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: GOLD,
  },
  helpButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

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

  

  noticeRoot: {
    flex: 1,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,28,19,.75)",
  },
  noticeCard: {
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
    backgroundColor: SUCCESS_LIGHT,
  },
  noticeError: {
    backgroundColor: DANGER_LIGHT,
  },
  noticeInfo: {
    backgroundColor: INFO_LIGHT,
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
