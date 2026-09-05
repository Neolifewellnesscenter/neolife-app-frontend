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
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { router } from "expo-router";
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
const SOFT_GOLD = "#FFF7DE";

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
  id?: number | string;
  appointmentSlotId?: number | string;
  startTime?: string;
  time?: string;
  slotTime?: string;
  endTime?: string;
  toTime?: string;
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

  const stepTitles = [
    "Choose Doctor",
    "Date & Time",
    "Health Details",
    "Review Request",
  ];

  useEffect(() => {
    initialize();
  }, []);

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
      "userName",
      "role",
      "profileCompleted",
      "isLoggedIn",
    ]);
  }

  async function apiRequest(endpoint: string, options: RequestInit = {}) {
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
        gender: String(user?.gender || "").toUpperCase(),
        phoneNumber: String(user?.phoneNumber || user?.phone || ""),
      }));
    } catch {
      // Prefill is optional.
    }
  }

  // SAME API
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
        "Choose a Doctor",
        "Please select the doctor you want to consult."
      );
      return;
    }

    setStep(2);

    // Automatically select today the first time Date & Time opens.
    if (!preferredDate) {
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
  async function loadAvailableSlots(date: string) {
    setPreferredDate(date);
    setSelectedSlot(null);
    setSlots([]);

    if (!selectedDoctor?.id) {
      showNotice(
        "info",
        "Choose Doctor First",
        "Please choose a doctor before selecting the consultation date."
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
        "Unable to Load Times",
        error?.message || "Unable to load available online consultation times."
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
        "Choose a Date",
        "Please select your preferred consultation date."
      );
      return;
    }

    if (!selectedSlot || !selectedStartTime) {
      showNotice(
        "info",
        "Choose a Time",
        "Please select one available consultation time."
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
        "Please briefly describe the symptoms or health concern."
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

      const picked: MedicalFile[] = result.assets.map((asset) => ({
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

  // SAME CONSULTATION REQUEST API + SAME MULTIPART STRUCTURE
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
        "Please complete the doctor, date, time and patient details."
      );
      return;
    }

    try {
      setSubmitting(true);

      const consultationRequest = {
        doctorId: Number(selectedDoctor.id),
        consultationDate: preferredDate,
        startTime: normalizeApiTime(selectedStartTime),
        patientName: patient.patientName.trim(),
        phoneNumber: patient.phoneNumber.trim(),
        age: Number(patient.age),
        gender: patient.gender,
        symptoms: patient.symptoms.trim(),
        pastMedicalHistory: buildPastMedicalHistory(),
      };

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

      const response = await fetch(
        `${API_BASE_URL}/consultations/request`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: formData,
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
          result?.message || "Unable to send consultation request."
        );
      }

      const consultation = result?.data || {};
      const consultationId =
        consultation?.id || consultation?.consultationId;

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

      if (paymentAllowed) {
        await initiateConsultationPayment(
          consultationId,
          consultation
        );
        return;
      }

      showNotice(
        "success",
        "Request Sent",
        result?.message ||
          "Your request has been sent to the doctor. You will be asked to pay ₹200 only after the doctor confirms or reschedules the consultation.",
        "appointments"
      );
    } catch (error: any) {
      showNotice(
        "error",
        "Request Could Not Be Sent",
        error?.message || "Unable to create the online consultation."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // SAME PAYMENT INITIATION API / BEHAVIOUR FROM YOUR CURRENT FILE
  async function initiateConsultationPayment(
    consultationId: string | number,
    consultation: any
  ) {
    try {
      const result = await apiRequest(
        `/payments/consultation/${encodeURIComponent(
          String(consultationId)
        )}/initiate`,
        {
          method: "POST",
        }
      );

      const paymentData = result?.data || {};

      const paymentUrl =
        paymentData.checkoutUrl ||
        paymentData.paymentUrl ||
        paymentData.shortUrl ||
        paymentData.razorpayPaymentLink ||
        "";

      if (paymentUrl) {
        await Linking.openURL(paymentUrl);

        showNotice(
          "info",
          "₹200 Payment Opened",
          "Complete the secure payment, then return to the app and open My Appointments to check your consultation status.",
          "appointments"
        );
        return;
      }

      showNotice(
        "info",
        "Consultation Confirmed",
        "The doctor has confirmed your consultation and payment is ready. Open My Appointments to continue the ₹200 payment.",
        "appointments"
      );
    } catch (error: any) {
      showNotice(
        "error",
        "Payment Could Not Start",
        error?.message ||
          "Your request was created, but payment could not be initiated."
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
          {/* COMPACT MOBILE HEADER */}
          <View style={styles.pageIntro}>
            <TouchableOpacity
              style={styles.backLink}
              onPress={() => router.replace("/consultation" as any)}
            >
              <Ionicons name="chevron-back" size={20} color={GREEN} />
              <Text style={styles.backLinkText}>Consultation</Text>
            </TouchableOpacity>

            <View style={styles.introRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>ONLINE CONSULTATION</Text>
                <Text style={styles.pageTitle}>Consult from home</Text>
                <Text style={styles.pageSubtitle}>
                  Choose a doctor and send your request in four simple steps.
                </Text>
              </View>

              <View style={styles.priceBadge}>
                <Text style={styles.priceTop}>AFTER CONFIRMATION</Text>
                <Text style={styles.price}>₹200</Text>
              </View>
            </View>

            <View style={styles.noPayStrip}>
              <Ionicons name="information-circle-outline" size={17} color={GREEN} />
              <Text style={styles.noPayText}>
                No payment now. The doctor confirms or reschedules first.
              </Text>
            </View>
          </View>

          {/* PROGRESS */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressStep}>Step {step} of 4</Text>
              <Text style={styles.progressName}>{stepTitles[step - 1]}</Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${step * 25}%` },
                ]}
              />
            </View>

            <View style={styles.progressDots}>
              {[1, 2, 3, 4].map((item) => {
                const done = item < step;
                const active = item === step;

                return (
                  <TouchableOpacity
                    key={item}
                    disabled={item > step}
                    onPress={() => item < step && setStep(item)}
                    style={styles.progressDotWrap}
                  >
                    <View
                      style={[
                        styles.progressDot,
                        done && styles.progressDotDone,
                        active && styles.progressDotActive,
                      ]}
                    >
                      {done ? (
                        <Ionicons name="checkmark" size={12} color={WHITE} />
                      ) : (
                        <Text
                          style={[
                            styles.progressDotText,
                            active && styles.progressDotTextActive,
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

          {/* ACTIVE STEP */}
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
                preferredDate={preferredDate}
                showDatePicker={showDatePicker}
                onOpenDatePicker={() => setShowDatePicker(true)}
                onDateSelected={handleDateSelected}
                onSelectQuickDate={loadAvailableSlots}
                slots={slots}
                loading={slotLoading}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                slotIsAvailable={slotIsAvailable}
              />
            )}

            {step === 3 && (
              <PatientStep
                patient={patient}
                medicalReports={medicalReports}
                onUpdate={updatePatient}
                onPickReports={pickMedicalReports}
                onRemoveReport={removeMedicalReport}
              />
            )}

            {step === 4 && (
              <ReviewStep
                doctor={selectedDoctor}
                date={preferredDate}
                startTime={selectedStartTime}
                endTime={selectedEndTime}
                patient={patient}
                reportCount={medicalReports.length}
              />
            )}
          </View>

          {/* BOTTOM NAV */}
          <View style={styles.bottomActions}>
            {step > 1 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep(step - 1)}
              >
                <Ionicons name="arrow-back" size={17} color={GREEN} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.88}
              disabled={submitting}
              style={[
                styles.continueButton,
                step === 1 && styles.continueButtonFull,
                submitting && styles.buttonDisabled,
              ]}
              onPress={() => {
                if (step === 1) nextFromDoctor();
                else if (step === 2) nextFromSlot();
                else if (step === 3) nextFromPatient();
                else submitOnlineConsultation();
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={GREEN} />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>
                    {step === 4 ? "Send Request to Doctor" : "Continue"}
                  </Text>
                  <Ionicons
                    name={step === 4 ? "paper-plane-outline" : "arrow-forward"}
                    size={18}
                    color={GREEN}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.safeStrip}>
            <Ionicons name="shield-checkmark-outline" size={17} color={GREEN} />
            <Text style={styles.safeText}>
              Your health information is sent securely with this request.
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
        title="Choose your doctor"
        text="Select one doctor available for online consultation."
      />

      {loading ? (
        <InlineState loading text="Loading online doctors..." />
      ) : !doctors.length ? (
        <InlineState
          icon="videocam-off-outline"
          title="No doctors available"
          text="No online consultation doctors are available right now."
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
                  active && styles.doctorCardSelected,
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

                  <View style={styles.onlineBadge}>
                    <Ionicons name="videocam-outline" size={11} color={SUCCESS} />
                    <Text style={styles.onlineBadgeText}>Online available</Text>
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
  preferredDate,
  showDatePicker,
  onOpenDatePicker,
  onDateSelected,
  onSelectQuickDate,
  slots,
  loading,
  selectedSlot,
  onSelectSlot,
  slotIsAvailable,
}: {
  doctor: Doctor | null;
  preferredDate: string;
  showDatePicker: boolean;
  onOpenDatePicker: () => void;
  onDateSelected: (event: any, selectedDate?: Date) => void;
  onSelectQuickDate: (date: string) => void;
  slots: Slot[];
  loading: boolean;
  selectedSlot: Slot | null;
  onSelectSlot: (slot: Slot) => void;
  slotIsAvailable: (slot: Slot) => boolean;
}) {
  const availableCount = slots.filter(slotIsAvailable).length;

  const today = getLocalDateString(0);
  const tomorrow = getLocalDateString(1);

  const isToday = preferredDate === today;
  const isTomorrow = preferredDate === tomorrow;
  const isCustom =
    !!preferredDate && !isToday && !isTomorrow;

  return (
    <View>
      <StepHeading
        title="Choose date & time"
        text="Today is selected automatically. Choose tomorrow or use the calendar for another date."
      />

      {!!doctor && (
        <View style={styles.selectedDoctorMini}>
          <DoctorImage doctor={doctor} small />

          <View style={{ flex: 1 }}>
            <Text style={styles.selectedDoctorLabel}>YOUR DOCTOR</Text>
            <Text style={styles.selectedDoctorName}>
              {doctor.name || "Doctor"}
            </Text>
          </View>

          <Ionicons name="videocam" size={19} color={SUCCESS} />
        </View>
      )}

      <Text style={styles.fieldLabel}>CONSULTATION DATE</Text>

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
            isCustom && styles.quickDateCardActive,
          ]}
          onPress={onOpenDatePicker}
        >
          <View
            style={[
              styles.quickDateIcon,
              isCustom && styles.quickDateIconActive,
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={isCustom ? WHITE : GREEN}
            />
          </View>

          <Text
            style={[
              styles.quickDateTitle,
              isCustom && styles.quickDateTitleActive,
            ]}
          >
            Calendar
          </Text>

          <Text
            style={[
              styles.quickDateValue,
              isCustom && styles.quickDateValueActive,
            ]}
          >
            Other date
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.selectedDateBar}>
        <View style={styles.selectedDateIcon}>
          <Ionicons
            name="calendar-clear-outline"
            size={18}
            color={GREEN}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.selectedDateLabel}>SELECTED DATE</Text>
          <Text style={styles.selectedDateValue}>
            {preferredDate
              ? formatDateWithDay(preferredDate)
              : "Selecting today..."}
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
          value={
            preferredDate
              ? new Date(`${preferredDate}T12:00:00`)
              : new Date()
          }
          mode="date"
          display={Platform.OS === "android" ? "calendar" : "spinner"}
          minimumDate={new Date()}
          onChange={onDateSelected}
        />
      )}

      <View style={styles.slotTitleRow}>
        <Text style={styles.fieldLabel}>AVAILABLE TIMES</Text>

        {!!preferredDate && !loading && (
          <Text style={styles.slotCount}>
            {availableCount} available
          </Text>
        )}
      </View>

      {loading ? (
        <InlineState
          loading
          text="Checking available consultation times..."
          compact
        />
      ) : !preferredDate ? (
        <InlineState
          icon="calendar-outline"
          text="Today's available consultation times will appear here."
          compact
        />
      ) : availableCount === 0 ? (
        <InlineState
          icon="time-outline"
          title="No times available"
          text="No online consultation times are available for this date. Try tomorrow or choose another date."
          compact
        />
      ) : (
        <View style={styles.slotGrid}>
          {slots.map((slot, index) => {
            const available = slotIsAvailable(slot);
            if (!available) return null;

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
              normalizeApiTime(
                selectedSlot?.startTime ||
                  selectedSlot?.time ||
                  selectedSlot?.slotTime ||
                  ""
              ) === normalizeApiTime(start);

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
                  active && styles.slotButtonSelected,
                ]}
                onPress={() => onSelectSlot(slot)}
              >
                <Ionicons
                  name="videocam-outline"
                  size={14}
                  color={active ? WHITE : GREEN}
                />

                <Text
                  style={[
                    styles.slotText,
                    active && styles.slotTextSelected,
                  ]}
                >
                  {formatTime(start)}
                </Text>

                {!!end && (
                  <Text
                    style={[
                      styles.slotEndText,
                      active && styles.slotEndTextSelected,
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
  medicalReports,
  onUpdate,
  onPickReports,
  onRemoveReport,
}: {
  patient: PatientForm;
  medicalReports: MedicalFile[];
  onUpdate: <K extends keyof PatientForm>(
    key: K,
    value: PatientForm[K]
  ) => void;
  onPickReports: () => void;
  onRemoveReport: (index: number) => void;
}) {
  return (
    <View>
      <StepHeading
        title="Tell the doctor about your concern"
        text="Your saved profile details are prefilled when available."
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
                active && styles.genderButtonSelected,
              ]}
              onPress={() => onUpdate("gender", value)}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  active && styles.genderButtonTextSelected,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.fieldLabel}>SYMPTOMS / HEALTH CONCERN</Text>

      <TextArea
        value={patient.symptoms}
        placeholder="Briefly describe the main concern"
        onChangeText={(value) => onUpdate("symptoms", value)}
      />

      <Text style={styles.fieldLabel}>PAST MEDICAL HISTORY · OPTIONAL</Text>

      <TextArea
        value={patient.pastMedicalHistory}
        placeholder="Previous illness, surgery or treatment"
        onChangeText={(value) =>
          onUpdate("pastMedicalHistory", value)
        }
      />

      <Text style={styles.fieldLabel}>CURRENT MEDICATION · OPTIONAL</Text>

      <TextArea
        value={patient.currentMedication}
        placeholder="Medicines currently being taken"
        onChangeText={(value) =>
          onUpdate("currentMedication", value)
        }
        compact
      />

      <View style={styles.reportHeader}>
        <View>
          <Text style={styles.fieldLabel}>MEDICAL REPORTS · OPTIONAL</Text>
          <Text style={styles.reportHint}>
            PDF, JPG or PNG · up to 10 files
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          style={styles.addReportButton}
          onPress={onPickReports}
        >
          <Ionicons name="add" size={17} color={GREEN} />
          <Text style={styles.addReportText}>Add</Text>
        </TouchableOpacity>
      </View>

      {!!medicalReports.length && (
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
                style={styles.removeFileButton}
                onPress={() => onRemoveReport(index)}
              >
                <Ionicons name="close" size={16} color={DANGER} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ReviewStep({
  doctor,
  date,
  startTime,
  endTime,
  patient,
  reportCount,
}: {
  doctor: Doctor | null;
  date: string;
  startTime: string;
  endTime: string;
  patient: PatientForm;
  reportCount: number;
}) {
  return (
    <View>
      <StepHeading
        title="Review your request"
        text="Check everything before sending it to the doctor."
      />

      <View style={styles.reviewDoctor}>
        {doctor && <DoctorImage doctor={doctor} small />}

        <View style={{ flex: 1 }}>
          <Text style={styles.reviewLabel}>DOCTOR</Text>
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
          icon="videocam-outline"
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

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Medical reports</Text>
        <Text style={styles.reviewLongText}>
          {reportCount
            ? `${reportCount} file${reportCount > 1 ? "s" : ""} attached`
            : "No files attached"}
        </Text>
      </View>

      <View style={styles.requestInfoCard}>
        <View style={styles.requestInfoIcon}>
          <Ionicons name="time-outline" size={20} color={GREEN} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.requestInfoTitle}>
            No payment required now
          </Text>
          <Text style={styles.requestInfoText}>
            The doctor will first accept or reschedule your request. You pay ₹200
            only after confirmation.
          </Text>
        </View>
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
        compact && styles.textAreaWrapCompact,
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
          compact && styles.textAreaCompact,
        ]}
      />
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
        style={[
          styles.doctorImage,
          small && styles.doctorImageSmall,
        ]}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[
        styles.doctorImage,
        small && styles.doctorImageSmall,
      ]}
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

  const origin = API_BASE_URL.replace(/\/api\/?$/, "");

  if (value.startsWith("/uploads/")) {
    return `${origin}${value}`;
  }

  if (value.startsWith("uploads/")) {
    return `${origin}/${value}`;
  }

  if (value.startsWith("/")) {
    return `${origin}${value}`;
  }

  return `${origin}/${value}`;
}

function normalizeApiTime(value: string) {
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

function formatFileSize(size?: number | null) {
  if (!size) return "File attached";

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function guessMimeType(name: string) {
  const lower = String(name || "").toLowerCase();

  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  return "application/octet-stream";
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

  if (Number.isNaN(date.getTime())) return value;

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

  backLink: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -5,
  },

  backLinkText: {
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
    maxWidth: 300,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
  },

  priceBadge: {
    width: 88,
    paddingHorizontal: 7,
    paddingVertical: 9,
    borderRadius: 17,
    alignItems: "center",
    backgroundColor: "#FFF5D8",
    borderWidth: 1,
    borderColor: "#E9D9A7",
  },

  priceTop: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 5,
    letterSpacing: 0.5,
    textAlign: "center",
  },

  price: {
    marginTop: 2,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 23,
  },

  noPayStrip: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: MINT,
  },

  noPayText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    color: GREEN_2,
    fontSize: 9,
    lineHeight: 14,
  },

  progressCard: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 19,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressStep: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  progressName: {
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

  progressDots: {
    marginTop: 11,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  progressDotWrap: {
    flex: 1,
    alignItems: "center",
  },

  progressDot: {
    width: 25,
    height: 25,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  progressDotDone: {
    backgroundColor: GREEN,
  },

  progressDotActive: {
    backgroundColor: GOLD,
  },

  progressDotText: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 9,
  },

  progressDotTextActive: {
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

  doctorCardSelected: {
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

  onlineBadge: {
    alignSelf: "flex-start",
    marginTop: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAF7EE",
  },

  onlineBadgeText: {
    fontFamily: "DMSans_700Bold",
    color: SUCCESS,
    fontSize: 7,
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

  selectedDoctorLabel: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 0.7,
  },

  selectedDoctorName: {
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

  dateSmallLabel: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 0.6,
  },

  dateValue: {
    marginTop: 3,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  datePlaceholder: {
    color: MUTED,
    fontFamily: "DMSans_400Regular",
  },

  slotTitleRow: {
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
    minHeight: 66,
    paddingHorizontal: 7,
    paddingVertical: 8,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: BORDER,
  },

  slotButtonSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  slotText: {
    marginTop: 3,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  slotTextSelected: {
    color: WHITE,
  },

  slotEndText: {
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 7,
  },

  slotEndTextSelected: {
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

  genderButtonSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  genderButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  genderButtonTextSelected: {
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

  textAreaWrapCompact: {
    minHeight: 82,
  },

  textArea: {
    minHeight: 82,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 11,
    lineHeight: 17,
  },

  textAreaCompact: {
    minHeight: 64,
  },

  reportHeader: {
    marginTop: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  reportHint: {
    marginTop: -3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },

  addReportButton: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: SOFT_GOLD,
    borderWidth: 1,
    borderColor: "#EAD8A2",
  },

  addReportText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },

  fileList: {
    marginTop: 12,
    gap: 8,
  },

  fileItem: {
    padding: 9,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: BORDER,
  },

  fileIcon: {
    width: 36,
    height: 36,
    marginRight: 9,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  fileName: {
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 9,
  },

  fileSize: {
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 7,
  },

  removeFileButton: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBECE9",
  },

  reviewDoctor: {
    padding: 11,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: MINT,
  },

  reviewLabel: {
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
    fontSize: 9,
    lineHeight: 14,
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

  requestInfoCard: {
    marginTop: 13,
    padding: 13,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SOFT_GOLD,
    borderWidth: 1,
    borderColor: "#EBD9A4",
  },

  requestInfoIcon: {
    width: 40,
    height: 40,
    marginRight: 10,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  requestInfoTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  requestInfoText: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
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

  backButton: {
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

  backButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  continueButton: {
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

  continueButtonFull: {
    flex: 1,
  },

  continueButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  safeStrip: {
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

  safeText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    color: GREEN_2,
    fontSize: 8,
    lineHeight: 13,
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
