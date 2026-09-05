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
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
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

export default function VerifyOtpScreen() {
  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [email, setEmail] = useState("");
  const [expiresIn, setExpiresIn] = useState(10);

  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const [message, setMessage] = useState<MessageState>({
    visible: false,
    type: "error",
    text: "",
  });

  const inputRefs = useRef<Array<TextInput | null>>([]);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadResetData();

    Animated.parallel([
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1600,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const code = useMemo(() => otp.join(""), [otp]);

  async function loadResetData() {
    try {
      const values = await AsyncStorage.multiGet([
        "resetEmail",
        "resetEmailMasked",
        "resetCodeExpiresInMinutes",
      ]);

      const map = Object.fromEntries(values);

      const storedEmail = map.resetEmail || "";
      const storedMasked = map.resetEmailMasked || storedEmail;
      const minutes = Number(map.resetCodeExpiresInMinutes || 10);

      setEmail(storedEmail);
      setMaskedEmail(storedMasked);
      setExpiresIn(Number.isFinite(minutes) ? minutes : 10);

      if (!storedEmail) {
        showMessage(
          "Your password reset session is missing. Please enter your email again."
        );
      }
    } catch {
      showMessage(
        "Unable to load your password reset information. Please try again."
      );
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

  function updateOtp(value: string, index: number) {
    clearMessage();

    const digit = value.replace(/\D/g, "").slice(-1);

    setOtp((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleBackspace(index: number) {
    if (otp[index]) {
      setOtp((current) => {
        const next = [...current];
        next[index] = "";
        return next;
      });

      return;
    }

    if (index > 0) {
      inputRefs.current[index - 1]?.focus();

      setOtp((current) => {
        const next = [...current];
        next[index - 1] = "";
        return next;
      });
    }
  }

  function handlePaste(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6);

    if (digits.length <= 1) return false;

    const next = ["", "", "", "", "", ""];

    digits.split("").forEach((digit, index) => {
      next[index] = digit;
    });

    setOtp(next);

    const nextFocusIndex = Math.min(digits.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();

    return true;
  }

  async function verifyOtp() {
    clearMessage();

    if (!email) {
      showMessage(
        "Your email is missing. Please go back and request a new verification code."
      );
      return;
    }

    if (code.length !== 6) {
      showMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      setVerifying(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/verify-reset-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email,
            code: Number(code),
          }),
        }
      );

      const result: any = await safelyReadResponse(response);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || "Verification failed."
        );
      }

      const resetSessionToken =
        result?.data?.resetSessionToken;

      if (!resetSessionToken) {
        throw new Error(
          "Verification succeeded, but the reset session token is missing."
        );
      }

      await AsyncStorage.setItem(
        "resetSessionToken",
        String(resetSessionToken)
      );

      showMessage(
        result?.message || "Verification successful.",
        "success"
      );

      setTimeout(() => {
        router.replace("/reset-password" as any);
      }, 850);
    } catch (error: any) {
      showMessage(
        error?.message ||
          "Unable to verify the code. Please try again."
      );
    } finally {
      setVerifying(false);
    }
  }

  async function resendOtp() {
    if (countdown > 0 || resending) return;

    clearMessage();

    if (!email) {
      showMessage(
        "Your email is missing. Please go back and enter it again."
      );
      return;
    }

    try {
      setResending(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );

      const result: any = await safelyReadResponse(response);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || "Unable to resend verification code."
        );
      }

      await AsyncStorage.multiSet([
        [
          "resetEmailMasked",
          String(result?.data?.email || maskedEmail || email),
        ],
        [
          "resetCodeExpiresInMinutes",
          String(result?.data?.expiresInMinutes || 10),
        ],
      ]);

      await AsyncStorage.removeItem("resetSessionToken");

      setMaskedEmail(
        String(result?.data?.email || maskedEmail || email)
      );
      setExpiresIn(
        Number(result?.data?.expiresInMinutes || 10)
      );
      setOtp(["", "", "", "", "", ""]);
      setCountdown(30);

      showMessage(
        result?.message || "A new verification code has been sent.",
        "success"
      );

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    } catch (error: any) {
      showMessage(
        error?.message || "Unable to resend verification code."
      );
    } finally {
      setResending(false);
    }
  }

  const cardStyle = {
    opacity: cardAnim,
    transform: [
      {
        translateY: cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
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

  const pulseStyle = {
    opacity: pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.55, 1],
    }),
    transform: [
      {
        scale: pulseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1.04],
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

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* AUTH HEADER */}
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
                style={styles.backButton}
                activeOpacity={0.8}
                onPress={() => router.replace("/forgot-password" as any)}
              >
                <Ionicons
                  name="arrow-back"
                  size={19}
                  color={WHITE}
                />
              </TouchableOpacity>

              <Animated.View
                style={[styles.otpHeroIcon, pulseStyle]}
              >
                <View style={styles.otpHeroInner}>
                  <Ionicons
                    name="keypad-outline"
                    size={31}
                    color={GREEN}
                  />
                </View>
              </Animated.View>

              <Text style={styles.eyebrow}>
                VERIFY YOUR IDENTITY
              </Text>

              <Text style={styles.title}>
                Enter Your{"\n"}
                <Text style={styles.titleAccent}>
                  Verification Code
                </Text>
              </Text>

              <Text style={styles.subtitle}>
                We sent a 6-digit code to
              </Text>

              <View style={styles.emailChip}>
                <Ionicons
                  name="mail-outline"
                  size={14}
                  color={GOLD_DARK}
                />

                <Text
                  style={styles.emailChipText}
                  numberOfLines={1}
                >
                  {maskedEmail || email || "your registered email"}
                </Text>
              </View>

              {/* STEP INDICATOR */}
              <View style={styles.steps}>
                <View style={styles.stepDone}>
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color={WHITE}
                  />
                </View>

                <View style={styles.stepLineActive} />

                <View style={styles.stepActive}>
                  <Text style={styles.stepNumberActive}>2</Text>
                </View>

                <View style={styles.stepLine} />

                <View style={styles.stepInactive}>
                  <Text style={styles.stepNumberInactive}>3</Text>
                </View>
              </View>

              <View style={styles.stepLabels}>
                <Text style={styles.stepLabelDone}>Email</Text>
                <Text style={styles.stepLabelActive}>Verify</Text>
                <Text style={styles.stepLabel}>Reset</Text>
              </View>

              {/* OTP INPUTS */}
              <Text style={styles.inputLabel}>
                6-DIGIT VERIFICATION CODE
              </Text>

              <View style={styles.otpRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    value={digit}
                    onChangeText={(value) => {
                      if (handlePaste(value)) return;
                      updateOtp(value, index);
                    }}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === "Backspace") {
                        handleBackspace(index);
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    selectTextOnFocus
                    editable={!verifying}
                    style={[
                      styles.otpInput,
                      digit && styles.otpInputFilled,
                      message.visible &&
                        message.type === "error" &&
                        styles.otpInputError,
                    ]}
                    returnKeyType={
                      index === 5 ? "done" : "next"
                    }
                    onSubmitEditing={() => {
                      if (index === 5) {
                        verifyOtp();
                      }
                    }}
                  />
                ))}
              </View>

              {/* MESSAGE */}
              {message.visible && (
                <View
                  style={[
                    styles.messageBox,
                    message.type === "success"
                      ? styles.messageSuccess
                      : styles.messageError,
                  ]}
                >
                  <View style={styles.messageIcon}>
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

              {/* TIMER / RESEND */}
              <View style={styles.resendCard}>
                <View style={styles.resendIcon}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={GOLD_DARK}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.resendTitle}>
                    Didn't receive the code?
                  </Text>

                  {countdown > 0 ? (
                    <Text style={styles.resendText}>
                      You can resend it in{" "}
                      <Text style={styles.countdownText}>
                        {countdown}s
                      </Text>
                    </Text>
                  ) : (
                    <TouchableOpacity
                      disabled={resending}
                      onPress={resendOtp}
                    >
                      <Text style={styles.resendLink}>
                        {resending
                          ? "Sending a new code..."
                          : "Resend Verification Code"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* VERIFY BUTTON */}
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  (verifying || code.length !== 6) &&
                    styles.verifyButtonDisabled,
                ]}
                activeOpacity={0.86}
                disabled={verifying || code.length !== 6}
                onPress={verifyOtp}
              >
                {verifying ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={GREEN}
                    />
                    <Text style={styles.verifyText}>
                      Verifying...
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={styles.verifyButtonIcon}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color={GREEN}
                      />
                    </View>

                    <Text style={styles.verifyText}>
                      Verify Code
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
                    name="lock-closed-outline"
                    size={18}
                    color={GREEN}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.securityTitle}>
                    Your Code Expires Soon
                  </Text>

                  <Text style={styles.securityText}>
                    This verification code is valid for approximately{" "}
                    {expiresIn} minute{expiresIn === 1 ? "" : "s"} and can
                    only be used for password recovery.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.changeEmailButton}
                activeOpacity={0.8}
                onPress={() =>
                  router.replace("/forgot-password" as any)
                }
              >
                <Ionicons
                  name="create-outline"
                  size={15}
                  color={GREEN}
                />
                <Text style={styles.changeEmailText}>
                  Change Email Address
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.bottomTrust}>
              <Ionicons
                name="shield-checkmark-outline"
                size={13}
                color={GOLD_LIGHT}
              />
              <Text style={styles.bottomTrustText}>
                Secure verification powered by NeoLife
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
    backgroundColor: "rgba(6,31,21,.76)",
  },

  keyboardView: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

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
    paddingTop: 28,
    paddingBottom: 30,
    justifyContent: "center",
  },

  card: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: 20,
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

  backButton: {
    position: "absolute",
    top: 15,
    left: 15,
    width: 37,
    height: 37,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    zIndex: 5,
  },

  otpHeroIcon: {
    width: 88,
    height: 88,
    alignSelf: "center",
    borderRadius: 29,
    padding: 6,
    backgroundColor: GOLD_LIGHT,
  },

  otpHeroInner: {
    flex: 1,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E7D7A7",
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
    fontSize: 30,
    lineHeight: 34,
    textAlign: "center",
    letterSpacing: -0.7,
  },

  titleAccent: {
    color: GOLD_DARK,
  },

  subtitle: {
    marginTop: 10,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    textAlign: "center",
  },

  emailChip: {
    alignSelf: "center",
    maxWidth: "90%",
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF8E7",
    borderWidth: 1,
    borderColor: "#EADCB0",
  },

  emailChipText: {
    flexShrink: 1,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  steps: {
    marginTop: 22,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
  },

  stepDone: {
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SUCCESS,
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

  stepLineActive: {
    flex: 1,
    height: 2,
    backgroundColor: SUCCESS,
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

  stepLabelDone: {
    width: 40,
    textAlign: "center",
    fontFamily: "DMSans_700Bold",
    color: SUCCESS,
    fontSize: 7,
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

  inputLabel: {
    marginTop: 22,
    marginBottom: 8,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
    letterSpacing: 1.2,
    textAlign: "center",
  },

  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },

  otpInput: {
    flex: 1,
    minWidth: 42,
    maxWidth: 52,
    height: 58,
    borderRadius: 17,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
    textAlign: "center",
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 21,
    elevation: 1,
  },

  otpInputFilled: {
    borderColor: GOLD_DARK,
    backgroundColor: "#FFF9EA",
  },

  otpInputError: {
    borderColor: "#E3A69E",
  },

  messageBox: {
    marginTop: 12,
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
    backgroundColor: WHITE,
  },

  messageText: {
    flex: 1,
    paddingTop: 4,
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
    lineHeight: 14,
  },

  resendCard: {
    marginTop: 15,
    padding: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: MINT,
    borderWidth: 1,
    borderColor: "#D5E6DA",
  },

  resendIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  resendTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  resendText: {
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },

  countdownText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
  },

  resendLink: {
    marginTop: 3,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
  },

  verifyButton: {
    minHeight: 55,
    marginTop: 16,
    paddingHorizontal: 10,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GOLD,
    elevation: 3,
  },

  verifyButtonDisabled: {
    opacity: 0.55,
  },

  verifyButtonIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.50)",
  },

  verifyText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
    textAlign: "center",
  },

  securityNote: {
    marginTop: 15,
    padding: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: "#F7F6F1",
    borderWidth: 1,
    borderColor: BORDER,
  },

  securityIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
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

  changeEmailButton: {
    marginTop: 16,
    minHeight: 42,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  changeEmailText: {
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
