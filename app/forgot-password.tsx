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
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
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

const GREEN = "#0B3D2E";
const GREEN_2 = "#14533D";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_DARK = "#A98632";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBF8EF";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#75837B";
const BORDER = "#E4E9E4";
const DANGER = "#B64C43";
const DANGER_BG = "#FCECEA";
const SUCCESS = "#287A4C";
const SUCCESS_BG = "#E9F7ED";

type MessageState = {
  visible: boolean;
  type: "success" | "error";
  text: string;
};

export default function ForgotPasswordScreen() {
  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState<MessageState>({
    visible: false,
    type: "error",
    text: "",
  });

  const cardAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadStoredEmail();

    Animated.parallel([
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2400,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2400,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  async function loadStoredEmail() {
    try {
      const storedEmail = await AsyncStorage.getItem("resetEmail");

      if (storedEmail) {
        setEmail(storedEmail);
      }
    } catch {
      // Prefill is optional.
    }
  }

  function showMessage(
    text: string,
    type: "success" | "error" = "error"
  ) {
    setMessage({
      visible: true,
      type,
      text,
    });
  }

  function clearMessage() {
    setMessage({
      visible: false,
      type: "error",
      text: "",
    });
  }

  async function safelyReadResponse(response: Response) {
    const responseText = await response.text();

    if (!responseText) {
      return {};
    }

    try {
      return JSON.parse(responseText);
    } catch {
      return {
        success: false,
        message:
          responseText ||
          `Invalid server response (${response.status}).`,
      };
    }
  }

  async function sendResetCode() {
    clearMessage();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      showMessage("Please enter your email address.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      showMessage("Please enter a valid email address.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email: cleanEmail,
          }),
        }
      );

      const result: any = await safelyReadResponse(response);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message ||
            "Unable to send verification code."
        );
      }

      await AsyncStorage.multiSet([
        ["resetEmail", cleanEmail],
        [
          "resetEmailMasked",
          String(result?.data?.email || cleanEmail),
        ],
        [
          "resetCodeExpiresInMinutes",
          String(result?.data?.expiresInMinutes || 10),
        ],
      ]);

      await AsyncStorage.removeItem("resetSessionToken");

      showMessage(
        result?.message ||
          "Verification code sent successfully.",
        "success"
      );

      setTimeout(() => {
        router.replace("/verify-otp" as any);
      }, 900);
    } catch (error: any) {
      console.log("Forgot password failed:", error);

      showMessage(
        error?.message ||
          "Unable to connect to the server. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const cardStyle = {
    opacity: cardAnim,
    transform: [
      {
        translateY: cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [30, 0],
        }),
      },
      {
        scale: cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.97, 1],
        }),
      },
    ],
  };

  const glowStyle = {
    opacity: glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.38, 0.85],
    }),
    transform: [
      {
        scale: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1.08],
        }),
      },
    ],
  };

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/neolife2.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.darkOverlay} />

      <Animated.View
        pointerEvents="none"
        style={[styles.goldGlow, glowStyle]}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* AUTH HEADER - MATCHES LOGIN / REGISTER STYLE */}
          <View style={styles.authHeader}>
            <TouchableOpacity
              style={styles.headerBrand}
              activeOpacity={0.85}
              onPress={() => router.replace("/(tabs)" as any)}
            >
              <Image
                source={require("../assets/images/main_logo.jpeg")}
                style={styles.headerLogo}
              />

              <View>
                <Text style={styles.headerBrandName}>NeoLife</Text>
                <Text style={styles.headerBrandSub}>
                  AYUSH DIGITAL CARE
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginHeaderButton}
              activeOpacity={0.82}
              onPress={() => router.replace("/login" as any)}
            >
              <Ionicons
                name="log-in-outline"
                size={16}
                color={WHITE}
              />
              <Text style={styles.loginHeaderText}>Login</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Animated.View style={[styles.card, cardStyle]}>
              <View style={styles.cardGlowOne} />
              <View style={styles.cardGlowTwo} />

              <TouchableOpacity
                style={styles.closeButton}
                activeOpacity={0.8}
                onPress={() => router.replace("/login" as any)}
              >
                <Ionicons name="close" size={20} color={WHITE} />
              </TouchableOpacity>

              <View style={styles.logoOuter}>
                <View style={styles.logoRing}>
                  <Image
                    source={require("../assets/images/main_logo.jpeg")}
                    style={styles.logo}
                  />
                </View>
              </View>

              <Text style={styles.eyebrow}>
                SECURE ACCOUNT RECOVERY
              </Text>

              <Text style={styles.title}>
                Forgot Your{"\n"}
                <Text style={styles.titleAccent}>Password?</Text>
              </Text>

              <Text style={styles.subtitle}>
                Enter your registered email address. We’ll send a
                six-digit verification code so you can safely reset
                your NeoLife password.
              </Text>

              {/* STEP INDICATOR */}
              <View style={styles.steps}>
                <View style={styles.stepActive}>
                  <Text style={styles.stepNumberActive}>1</Text>
                </View>

                <View style={styles.stepLine} />

                <View style={styles.stepInactive}>
                  <Text style={styles.stepNumberInactive}>2</Text>
                </View>

                <View style={styles.stepLine} />

                <View style={styles.stepInactive}>
                  <Text style={styles.stepNumberInactive}>3</Text>
                </View>
              </View>

              <View style={styles.stepLabels}>
                <Text style={styles.stepLabelActive}>Email</Text>
                <Text style={styles.stepLabel}>Verify</Text>
                <Text style={styles.stepLabel}>Reset</Text>
              </View>

              {/* EMAIL FIELD */}
              <Text style={styles.inputLabel}>
                REGISTERED EMAIL
              </Text>

              <View
                style={[
                  styles.inputWrap,
                  message.visible &&
                    message.type === "error" &&
                    styles.inputWrapError,
                ]}
              >
                <View style={styles.inputIcon}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={GOLD_DARK}
                  />
                </View>

                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (message.visible) {
                      clearMessage();
                    }
                  }}
                  placeholder="Enter your email address"
                  placeholderTextColor="#929E96"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={150}
                  returnKeyType="send"
                  onSubmitEditing={sendResetCode}
                  editable={!submitting}
                  style={styles.input}
                />
              </View>

              {/* INLINE BRANDED MESSAGE */}
              {message.visible && (
                <View
                  style={[
                    styles.messageBox,
                    message.type === "success"
                      ? styles.messageSuccess
                      : styles.messageError,
                  ]}
                >
                  <View
                    style={[
                      styles.messageIcon,
                      message.type === "success"
                        ? styles.messageIconSuccess
                        : styles.messageIconError,
                    ]}
                  >
                    <Ionicons
                      name={
                        message.type === "success"
                          ? "checkmark-circle-outline"
                          : "alert-circle-outline"
                      }
                      size={17}
                      color={
                        message.type === "success"
                          ? SUCCESS
                          : DANGER
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.messageText,
                      {
                        color:
                          message.type === "success"
                            ? SUCCESS
                            : DANGER,
                      },
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>
              )}

              {/* SUBMIT */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                ]}
                activeOpacity={0.86}
                disabled={submitting}
                onPress={sendResetCode}
              >
                {submitting ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={GREEN}
                    />
                    <Text style={styles.submitText}>
                      Sending Code...
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={styles.submitIcon}>
                      <Ionicons
                        name="send-outline"
                        size={17}
                        color={GREEN}
                      />
                    </View>

                    <Text style={styles.submitText}>
                      Send Verification Code
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={GREEN}
                    />
                  </>
                )}
              </TouchableOpacity>

              {/* SECURITY NOTE */}
              <View style={styles.securityNote}>
                <View style={styles.securityIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={19}
                    color={GOLD_DARK}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.securityTitle}>
                    Protected Password Reset
                  </Text>

                  <Text style={styles.securityText}>
                    The verification code is valid for 10 minutes
                    and is used only to reset your NeoLife account
                    password.
                  </Text>
                </View>
              </View>

              {/* BACK TO LOGIN */}
              <View style={styles.loginRow}>
                <Text style={styles.loginPrompt}>
                  Remember your password?
                </Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.replace("/login" as any)}
                >
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <View style={styles.bottomTrust}>
              <Ionicons
                name="lock-closed-outline"
                size={13}
                color={GOLD_LIGHT}
              />
              <Text style={styles.bottomTrustText}>
                Your account information stays private and secure
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  background: {
    flex: 1,
  },

  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6,31,21,.74)",
  },

  goldGlow: {
    position: "absolute",
    top: 90,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(214,180,91,.15)",
  },

  keyboardView: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  /* AUTH HEADER */
  authHeader: {
    minHeight: Platform.OS === "web" ? 76 : 96,
    paddingTop: Platform.OS === "web" ? 12 : 35,
    paddingBottom: 11,
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(7,38,26,.48)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,.10)",
  },

  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerLogo: {
    width: 43,
    height: 43,
    marginRight: 9,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: GOLD,
  },

  headerBrandName: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 17,
  },

  headerBrandSub: {
    marginTop: 2,
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 7,
    letterSpacing: 1.1,
  },

  loginHeaderButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.16)",
  },

  loginHeaderText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 9,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 30,
    justifyContent: "center",
  },

  /* CARD */
  card: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    paddingHorizontal: 21,
    paddingTop: 31,
    paddingBottom: 24,
    borderRadius: 31,
    overflow: "hidden",
    backgroundColor: "rgba(251,248,239,.97)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.66)",
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 25,
  },

  cardGlowOne: {
    position: "absolute",
    width: 190,
    height: 190,
    right: -75,
    top: -78,
    borderRadius: 95,
    backgroundColor: "rgba(214,180,91,.13)",
  },

  cardGlowTwo: {
    position: "absolute",
    width: 150,
    height: 150,
    left: -70,
    bottom: -70,
    borderRadius: 75,
    backgroundColor: "rgba(11,61,46,.07)",
  },

  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    width: 37,
    height: 37,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    zIndex: 5,
  },

  logoOuter: {
    width: 86,
    height: 86,
    alignSelf: "center",
    borderRadius: 27,
    padding: 5,
    backgroundColor: GOLD_LIGHT,
  },

  logoRing: {
    flex: 1,
    padding: 3,
    borderRadius: 23,
    backgroundColor: WHITE,
  },

  logo: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },

  eyebrow: {
    marginTop: 16,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.6,
    textAlign: "center",
  },

  title: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 31,
    lineHeight: 35,
    textAlign: "center",
    letterSpacing: -0.7,
  },

  titleAccent: {
    color: GOLD_DARK,
  },

  subtitle: {
    marginTop: 10,
    paddingHorizontal: 4,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 17,
    textAlign: "center",
  },

  /* STEPS */
  steps: {
    marginTop: 22,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
  },

  stepActive: {
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  stepInactive: {
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF1ED",
    borderWidth: 1,
    borderColor: BORDER,
  },

  stepNumberActive: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 9,
  },

  stepNumberInactive: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 9,
  },

  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E3E7E3",
  },

  stepLabels: {
    marginTop: 6,
    paddingHorizontal: 19,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  stepLabelActive: {
    width: 40,
    textAlign: "center",
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 7,
  },

  stepLabel: {
    width: 40,
    textAlign: "center",
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 7,
  },

  /* INPUT */
  inputLabel: {
    marginTop: 22,
    marginBottom: 7,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
    letterSpacing: 1.2,
  },

  inputWrap: {
    minHeight: 55,
    paddingHorizontal: 7,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  inputWrapError: {
    borderColor: "#E6B6B0",
  },

  inputIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8E7",
  },

  input: {
    flex: 1,
    paddingHorizontal: 11,
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 11,
  },

  /* MESSAGE */
  messageBox: {
    marginTop: 10,
    padding: 11,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
  },

  messageError: {
    backgroundColor: DANGER_BG,
    borderColor: "#EDC5C0",
  },

  messageSuccess: {
    backgroundColor: SUCCESS_BG,
    borderColor: "#C9E5D2",
  },

  messageIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  messageIconError: {
    backgroundColor: WHITE,
  },

  messageIconSuccess: {
    backgroundColor: WHITE,
  },

  messageText: {
    flex: 1,
    paddingTop: 4,
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
    lineHeight: 14,
  },

  /* BUTTON */
  submitButton: {
    minHeight: 55,
    marginTop: 17,
    paddingHorizontal: 10,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GOLD,
    elevation: 3,
  },

  submitButtonDisabled: {
    opacity: 0.7,
  },

  submitIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.50)",
  },

  submitText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
    textAlign: "center",
  },

  /* SECURITY */
  securityNote: {
    marginTop: 16,
    padding: 13,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: MINT,
    borderWidth: 1,
    borderColor: "#D5E6DA",
  },

  securityIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  securityTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  securityText: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
  },

  loginRow: {
    marginTop: 19,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },

  loginPrompt: {
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
  },

  loginLink: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  bottomTrust: {
    marginTop: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  bottomTrustText: {
    fontFamily: "DMSans_500Medium",
    color: "#DFE9E3",
    fontSize: 8,
  },
});
