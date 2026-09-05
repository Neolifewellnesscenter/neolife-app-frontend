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
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
  loginRedirect?: boolean;
};

export default function WriteReviewScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const reviewId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [menuOpen, setMenuOpen] = useState(false);
 

  const [doctor, setDoctor] = useState("");
  const [therapyService, setTherapyService] = useState("");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");

  const [loadingReview, setLoadingReview] = useState(Boolean(reviewId));
  const [submitting, setSubmitting] = useState(false);

  const [notice, setNotice] = useState<NoticeState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
    loginRedirect: false,
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

  const editing = Boolean(reviewId);

  useEffect(() => {
    initialize();
  }, [reviewId]);

  async function initialize() {
    const token = await getToken();

    if (!token) {
      showNotice(
        "info",
        "Login Required",
        "Please sign in before writing a clinic review.",
        true
      );
      return;
    }

    
    if (reviewId) {
      await loadReviewForEdit(reviewId);
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

  
  async function loadReviewForEdit(id: string) {
    try {
      setLoadingReview(true);

      const result = await apiRequest(
        `/clinic-reviews/getById/${encodeURIComponent(id)}`,
        {
          method: "GET",
        }
      );

      const review = result?.data || {};

      setDoctor(review.doctor || "");
      setTherapyService(review.therapyService || "");
      setRating(Number(review.rating || 0));
      setMessage(review.message || "");
    } catch (error: any) {
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
        "Unable to Load Review",
        error?.message || "Unable to load this review."
      );
    } finally {
      setLoadingReview(false);
    }
  }

  function validateReview() {
    if (!doctor.trim()) {
      showNotice(
        "info",
        "Doctor Name Required",
        "Please enter the doctor name."
      );
      return false;
    }

    if (!therapyService.trim()) {
      showNotice(
        "info",
        "Therapy or Service Required",
        "Please enter the therapy or service."
      );
      return false;
    }

    if (!rating) {
      showNotice(
        "info",
        "Rating Required",
        "Please select a rating."
      );
      return false;
    }

    if (!message.trim()) {
      showNotice(
        "info",
        "Review Message Required",
        "Please write your review message."
      );
      return false;
    }

    return true;
  }

  async function submitReview() {
    if (!validateReview()) return;

    try {
      setSubmitting(true);

      const payload = {
        doctor: doctor.trim(),
        therapyService: therapyService.trim(),
        rating: Number(rating),
        message: message.trim(),
      };

      const endpoint = editing
        ? `/clinic-reviews/update/${reviewId}`
        : "/clinic-reviews/create";

      const method = editing ? "PUT" : "POST";

      const result = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      showNotice(
        "success",
        editing ? "Review Updated" : "Review Submitted",
        result?.message ||
          (editing
            ? "Your clinic review has been updated successfully."
            : "Thank you. Your clinic review has been submitted successfully.")
      );
    } catch (error: any) {
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
        "Unable to Save Review",
        error?.message || "Review save failed."
      );
    } finally {
      setSubmitting(false);
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
    const loginRedirect = notice.loginRedirect;
    const success = notice.type === "success";

    setNotice((current) => ({
      ...current,
      visible: false,
      loginRedirect: false,
    }));

    if (loginRedirect) {
      router.replace("/login" as any);
      return;
    }

    if (success) {
      router.replace("/profile" as any);
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
        <Text style={styles.loaderText}>Preparing review form...</Text>
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
        keyboardShouldPersistTaps="handled"
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroOrbOne} />
          <View style={styles.heroOrbTwo} />

          <View style={styles.heroIcon}>
            <Ionicons name="star-outline" size={29} color={GREEN} />
          </View>

          <Text style={styles.heroEyebrow}>
            SHARE YOUR EXPERIENCE
          </Text>

          <Text style={styles.heroTitle}>
            {editing ? "Edit Your" : "Write a"}{"\n"}
            <Text style={styles.heroAccent}>Clinic Review</Text>
          </Text>

          <Text style={styles.heroText}>
            Tell us about your consultation, therapy or treatment experience at
            NeoLife Wellness Center.
          </Text>

          <View style={styles.heroTrust}>
            <Ionicons
              name="heart-outline"
              size={17}
              color={GOLD_LIGHT}
            />
            <Text style={styles.heroTrustText}>
              Your feedback helps us improve patient care
            </Text>
          </View>
        </View>

        {/* FORM */}
        <View style={styles.section}>
          <Text style={styles.eyebrow}>YOUR EXPERIENCE MATTERS</Text>

          <Text style={styles.sectionTitle}>
            {editing ? "Update Your Review" : "Clinic Review"}
          </Text>

          <Text style={styles.sectionText}>
            Share your honest experience to help NeoLife improve care and help
            other patients understand what to expect.
          </Text>

          {loadingReview ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={GREEN} />
              <Text style={styles.loadingTitle}>
                Loading your review
              </Text>
            </View>
          ) : (
            <View style={styles.formCard}>
              <Field
                icon="medical-outline"
                label="Doctor"
                placeholder="Dr. N. G. Muraleedhara"
                value={doctor}
                onChangeText={setDoctor}
              />

              <Field
                icon="leaf-outline"
                label="Therapy / Service"
                placeholder="Panchakarma"
                value={therapyService}
                onChangeText={setTherapyService}
              />

              <Text style={styles.inputLabel}>YOUR RATING</Text>

              <View style={styles.ratingCard}>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= rating;

                    return (
                      <TouchableOpacity
                        key={star}
                        style={[
                          styles.starButton,
                          active && styles.starButtonActive,
                        ]}
                        onPress={() => setRating(star)}
                      >
                        <Ionicons
                          name={active ? "star" : "star-outline"}
                          size={27}
                          color={active ? GOLD_DARK : "#B7C0BA"}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.ratingText}>
                  {rating
                    ? `${rating}/5 · ${ratingLabel(rating)}`
                    : "Tap a star to rate your experience"}
                </Text>
              </View>

              <Text style={styles.inputLabel}>REVIEW MESSAGE</Text>

              <View style={styles.messageWrap}>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Write your consultation, therapy or treatment experience..."
                  placeholderTextColor="#98A29B"
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                  style={styles.messageInput}
                />

                <Text style={styles.characterCount}>
                  {message.length}/1000
                </Text>
              </View>

              <View style={styles.helperCard}>
                <View style={styles.helperIcon}>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={GOLD_DARK}
                  />
                </View>

                <Text style={styles.helperText}>
                  Please avoid including private medical information, phone
                  numbers or other sensitive personal details in your review.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                ]}
                onPress={submitReview}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={GREEN} />
                ) : (
                  <Ionicons
                    name={editing ? "save-outline" : "paper-plane-outline"}
                    size={18}
                    color={GREEN}
                  />
                )}

                <Text style={styles.submitButtonText}>
                  {submitting
                    ? editing
                      ? "Updating Review..."
                      : "Submitting Review..."
                    : editing
                    ? "Update Review"
                    : "Submit Review"}
                </Text>

                {!submitting && (
                  <Ionicons
                    name="arrow-forward"
                    size={17}
                    color={GREEN}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.replace("/profile" as any)}
              >
                <Ionicons name="arrow-back" size={17} color={GREEN} />
                <Text style={styles.backButtonText}>Back to Profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* WHY FEEDBACK MATTERS */}
        <View style={styles.feedbackCard}>
          <View style={styles.feedbackIcon}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={24}
              color={GOLD}
            />
          </View>

          <Text style={styles.feedbackEyebrow}>THANK YOU FOR SHARING</Text>

          <Text style={styles.feedbackTitle}>
            Your Feedback Helps Us Grow
          </Text>

          <Text style={styles.feedbackText}>
            Patient reviews help us understand what is working well and where
            we can make your care experience even better.
          </Text>
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
        onPress={() =>
          openURL(
            "https://wa.me/919481489866?text=Hello%20NeoLife%20Wellness%20Center,%20I%20need%20help."
          )
        }
      >
        <Ionicons name="logo-whatsapp" size={28} color={WHITE} />
      </TouchableOpacity>

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
                {notice.loginRedirect
                  ? "Go to Login"
                  : notice.type === "success"
                  ? "Back to Profile"
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

function Field({
  icon,
  label,
  placeholder,
  value,
  onChangeText,
}: {
  icon: any;
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.inputLabel}>{label.toUpperCase()}</Text>

      <View style={styles.inputWrap}>
        <View style={styles.inputIcon}>
          <Ionicons name={icon} size={17} color={GOLD_DARK} />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#98A29B"
          style={styles.input}
        />
      </View>
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
    <TouchableOpacity style={styles.socialButton} onPress={onPress}>
      <Ionicons name={icon} size={20} color={WHITE} />
    </TouchableOpacity>
  );
}

function ratingLabel(rating: number) {
  if (rating === 5) return "Excellent";
  if (rating === 4) return "Very Good";
  if (rating === 3) return "Good";
  if (rating === 2) return "Fair";
  return "Poor";
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

  
  hero: {
    margin: 16,
    minHeight: 365,
    padding: 24,
    borderRadius: 31,
    overflow: "hidden",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  heroOrbOne: {
    position: "absolute",
    width: 230,
    height: 230,
    right: -90,
    top: -95,
    borderRadius: 115,
    backgroundColor: "rgba(214,180,91,.16)",
  },

  heroOrbTwo: {
    position: "absolute",
    width: 170,
    height: 170,
    left: -65,
    bottom: -75,
    borderRadius: 85,
    backgroundColor: "rgba(255,255,255,.06)",
  },

  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },

  heroEyebrow: {
    marginTop: 18,
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 8,
    letterSpacing: 1.5,
  },

  heroTitle: {
    marginTop: 6,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 38,
    lineHeight: 43,
    letterSpacing: -0.8,
  },

  heroAccent: {
    color: GOLD_LIGHT,
  },

  heroText: {
    marginTop: 11,
    maxWidth: 335,
    fontFamily: "DMSans_400Regular",
    color: "#D7E5DC",
    fontSize: 11,
    lineHeight: 18,
  },

  heroTrust: {
    marginTop: 22,
    padding: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,.08)",
  },

  heroTrustText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 8,
  },

  section: {
    paddingHorizontal: 16,
    paddingTop: 29,
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

  sectionText: {
    marginTop: 7,
    maxWidth: 345,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
  },

  loadingCard: {
    marginTop: 18,
    padding: 30,
    borderRadius: 25,
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  loadingTitle: {
    marginTop: 12,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 20,
  },

  formCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 26,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  fieldBlock: {
    marginBottom: 15,
  },

  inputLabel: {
    marginBottom: 7,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 7,
    letterSpacing: 1,
  },

  inputWrap: {
    minHeight: 53,
    paddingHorizontal: 8,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FBFCFA",
    borderWidth: 1,
    borderColor: BORDER,
  },

  inputIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7E3",
  },

  input: {
    flex: 1,
    paddingHorizontal: 9,
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 10,
  },

  ratingCard: {
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: MINT,
    borderWidth: 1,
    borderColor: "#D6E5DA",
  },

  ratingStars: {
    flexDirection: "row",
    gap: 6,
  },

  starButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  starButtonActive: {
    backgroundColor: "#FFF7E3",
    borderColor: "#E7CF8A",
  },

  ratingText: {
    marginTop: 10,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },

  messageWrap: {
    minHeight: 165,
    borderRadius: 17,
    backgroundColor: "#FBFCFA",
    borderWidth: 1,
    borderColor: BORDER,
  },

  messageInput: {
    minHeight: 140,
    padding: 13,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 10,
    lineHeight: 16,
  },

  characterCount: {
    paddingHorizontal: 12,
    paddingBottom: 9,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 7,
    textAlign: "right",
  },

  helperCard: {
    marginTop: 15,
    padding: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: MINT,
  },

  helperIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  helperText: {
    flex: 1,
    paddingTop: 2,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
  },

  submitButton: {
    minHeight: 53,
    marginTop: 18,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GOLD,
  },

  submitButtonDisabled: {
    opacity: 0.65,
  },

  submitButtonText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
    textAlign: "center",
  },

  backButton: {
    minHeight: 46,
    marginTop: 9,
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
    fontSize: 9,
  },

  feedbackCard: {
    marginTop: 48,
    marginHorizontal: 16,
    padding: 25,
    borderRadius: 28,
    alignItems: "center",
    backgroundColor: "#F2E5C0",
    borderWidth: 1,
    borderColor: "#E5D09A",
  },

  feedbackIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  feedbackEyebrow: {
    marginTop: 14,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.3,
  },

  feedbackTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 23,
    lineHeight: 28,
    textAlign: "center",
  },

  feedbackText: {
    marginTop: 7,
    maxWidth: 310,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
    lineHeight: 15,
    textAlign: "center",
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
