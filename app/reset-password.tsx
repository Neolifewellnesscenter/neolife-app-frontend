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

export default function ResetPasswordScreen() {
  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const [resetSessionToken, setResetSessionToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState<MessageState>({
    visible: false,
    type: "error",
    text: "",
  });

  const cardAnim = useRef(new Animated.Value(0)).current;
  const shieldAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadResetSession();

    Animated.parallel([
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(shieldAnim, {
            toValue: 1,
            duration: 1700,
            useNativeDriver: true,
          }),
          Animated.timing(shieldAnim, {
            toValue: 0,
            duration: 1700,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  async function loadResetSession() {
    try {
      const token = await AsyncStorage.getItem("resetSessionToken");

      if (!token) {
        showMessage(
          "Your password reset session has expired. Please start Forgot Password again."
        );
        return;
      }

      setResetSessionToken(token);
    } catch {
      showMessage(
        "Unable to load your password reset session. Please try again."
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

  const requirements = useMemo(
    () => ({
      length: newPassword.length >= 8 && newPassword.length <= 72,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /\d/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword),
    }),
    [newPassword]
  );

  const passwordValid =
    requirements.length &&
    requirements.uppercase &&
    requirements.lowercase &&
    requirements.number &&
    requirements.special;

  const passwordsMatch =
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const strengthScore = [
    requirements.length,
    requirements.uppercase,
    requirements.lowercase,
    requirements.number,
    requirements.special,
  ].filter(Boolean).length;

  const strengthLabel =
    strengthScore <= 2
      ? "Weak"
      : strengthScore <= 4
      ? "Good"
      : "Strong";

  async function resetPassword() {
    clearMessage();

    if (!resetSessionToken) {
      showMessage(
        "Your password reset session has expired. Please start Forgot Password again."
      );
      return;
    }

    if (!newPassword || !confirmPassword) {
      showMessage("Please fill both password fields.");
      return;
    }

    if (!passwordValid) {
      showMessage(
        "Password must contain uppercase, lowercase, number, special character and be 8–72 characters long."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            resetSessionToken,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const result: any = await safelyReadResponse(response);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || "Password reset failed."
        );
      }

      await AsyncStorage.multiRemove([
        "resetSessionToken",
        "resetEmail",
        "resetEmailMasked",
        "resetCodeExpiresInMinutes",
      ]);

      showMessage(
        result?.message || "Password reset successfully.",
        "success"
      );

      setTimeout(() => {
        router.replace("/login" as any);
      }, 950);
    } catch (error: any) {
      showMessage(
        error?.message || "Unable to connect to the server."
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

  const shieldStyle = {
    transform: [
      {
        scale: shieldAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1.05],
        }),
      },
    ],
    opacity: shieldAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 1],
    }),
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
                style={styles.closeButton}
                onPress={() => router.replace("/login" as any)}
              >
                <Ionicons name="close" size={20} color={WHITE} />
              </TouchableOpacity>

              <Animated.View
                style={[styles.shieldWrap, shieldStyle]}
              >
                <View style={styles.shieldInner}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={34}
                    color={GREEN}
                  />
                </View>
              </Animated.View>

              <Text style={styles.eyebrow}>
                FINAL SECURITY STEP
              </Text>

              <Text style={styles.title}>
                Create a{"\n"}
                <Text style={styles.titleAccent}>
                  New Password
                </Text>
              </Text>

              <Text style={styles.subtitle}>
                Choose a strong password you have not used before to
                keep your NeoLife account secure.
              </Text>

              {/* STEP INDICATOR */}
              <View style={styles.steps}>
                <View style={styles.stepDone}>
                  <Ionicons name="checkmark" size={13} color={WHITE} />
                </View>

                <View style={styles.stepLineDone} />

                <View style={styles.stepDone}>
                  <Ionicons name="checkmark" size={13} color={WHITE} />
                </View>

                <View style={styles.stepLineDone} />

                <View style={styles.stepActive}>
                  <Text style={styles.stepNumberActive}>3</Text>
                </View>
              </View>

              <View style={styles.stepLabels}>
                <Text style={styles.stepLabelDone}>Email</Text>
                <Text style={styles.stepLabelDone}>Verify</Text>
                <Text style={styles.stepLabelActive}>Reset</Text>
              </View>

              {/* NEW PASSWORD */}
              <Text style={styles.inputLabel}>NEW PASSWORD</Text>

              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={GOLD_DARK}
                  />
                </View>

                <TextInput
                  value={newPassword}
                  onChangeText={(value) => {
                    setNewPassword(value);
                    clearMessage();
                  }}
                  secureTextEntry={!showNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#929E96"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={72}
                  editable={!submitting}
                  style={styles.input}
                />

                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() =>
                    setShowNewPassword((current) => !current)
                  }
                >
                  <Ionicons
                    name={
                      showNewPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={19}
                    color={MUTED}
                  />
                </TouchableOpacity>
              </View>

              {/* STRENGTH */}
              <View style={styles.strengthRow}>
                {[1, 2, 3, 4, 5].map((item) => (
                  <View
                    key={item}
                    style={[
                      styles.strengthBar,
                      item <= strengthScore &&
                        (strengthScore <= 2
                          ? styles.strengthWeak
                          : strengthScore <= 4
                          ? styles.strengthGood
                          : styles.strengthStrong),
                    ]}
                  />
                ))}
              </View>

              <View style={styles.strengthTextRow}>
                <Text style={styles.strengthLabel}>
                  Password strength
                </Text>
                <Text
                  style={[
                    styles.strengthValue,
                    {
                      color:
                        strengthScore <= 2
                          ? DANGER
                          : strengthScore <= 4
                          ? GOLD_DARK
                          : SUCCESS,
                    },
                  ]}
                >
                  {strengthLabel}
                </Text>
              </View>

              {/* CONFIRM PASSWORD */}
              <Text style={styles.inputLabel}>
                CONFIRM PASSWORD
              </Text>

              <View
                style={[
                  styles.inputWrap,
                  confirmPassword.length > 0 &&
                    !passwordsMatch &&
                    styles.inputWrapError,
                  passwordsMatch && styles.inputWrapSuccess,
                ]}
              >
                <View style={styles.inputIcon}>
                  <Ionicons
                    name="shield-outline"
                    size={18}
                    color={GOLD_DARK}
                  />
                </View>

                <TextInput
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    clearMessage();
                  }}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#929E96"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={72}
                  editable={!submitting}
                  returnKeyType="done"
                  onSubmitEditing={resetPassword}
                  style={styles.input}
                />

                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() =>
                    setShowConfirmPassword((current) => !current)
                  }
                >
                  <Ionicons
                    name={
                      showConfirmPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={19}
                    color={MUTED}
                  />
                </TouchableOpacity>
              </View>

              {confirmPassword.length > 0 && (
                <View style={styles.matchRow}>
                  <Ionicons
                    name={
                      passwordsMatch
                        ? "checkmark-circle-outline"
                        : "close-circle-outline"
                    }
                    size={14}
                    color={passwordsMatch ? SUCCESS : DANGER}
                  />

                  <Text
                    style={[
                      styles.matchText,
                      {
                        color: passwordsMatch
                          ? SUCCESS
                          : DANGER,
                      },
                    ]}
                  >
                    {passwordsMatch
                      ? "Passwords match"
                      : "Passwords do not match"}
                  </Text>
                </View>
              )}

              {/* REQUIREMENTS */}
              <View style={styles.requirementsCard}>
                <Text style={styles.requirementsTitle}>
                  Your password should include
                </Text>

                <Requirement
                  label="8–72 characters"
                  valid={requirements.length}
                />
                <Requirement
                  label="At least one uppercase letter"
                  valid={requirements.uppercase}
                />
                <Requirement
                  label="At least one lowercase letter"
                  valid={requirements.lowercase}
                />
                <Requirement
                  label="At least one number"
                  valid={requirements.number}
                />
                <Requirement
                  label="At least one special character"
                  valid={requirements.special}
                />
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

              {/* RESET BUTTON */}
              <TouchableOpacity
                style={[
                  styles.resetButton,
                  (submitting ||
                    !passwordValid ||
                    !passwordsMatch) &&
                    styles.resetButtonDisabled,
                ]}
                activeOpacity={0.86}
                disabled={
                  submitting ||
                  !passwordValid ||
                  !passwordsMatch
                }
                onPress={resetPassword}
              >
                {submitting ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={GREEN}
                    />
                    <Text style={styles.resetText}>
                      Resetting Password...
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={styles.resetButtonIcon}>
                      <Ionicons
                        name="key-outline"
                        size={18}
                        color={GREEN}
                      />
                    </View>

                    <Text style={styles.resetText}>
                      Reset Password
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={GREEN}
                    />
                  </>
                )}
              </TouchableOpacity>

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
                    Keep Your Account Protected
                  </Text>

                  <Text style={styles.securityText}>
                    Avoid using names, phone numbers or passwords you
                    already use on other accounts.
                  </Text>
                </View>
              </View>

              <View style={styles.loginRow}>
                <Text style={styles.loginPrompt}>
                  Remember your password?
                </Text>

                <TouchableOpacity
                  onPress={() => router.replace("/login" as any)}
                >
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <View style={styles.bottomTrust}>
              <Ionicons
                name="shield-checkmark-outline"
                size={13}
                color={GOLD_LIGHT}
              />
              <Text style={styles.bottomTrustText}>
                Secure password recovery with NeoLife
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

function Requirement({
  label,
  valid,
}: {
  label: string;
  valid: boolean;
}) {
  return (
    <View style={styles.requirementRow}>
      <View
        style={[
          styles.requirementIcon,
          valid && styles.requirementIconValid,
        ]}
      >
        <Ionicons
          name={valid ? "checkmark" : "ellipse-outline"}
          size={11}
          color={valid ? WHITE : MUTED}
        />
      </View>

      <Text
        style={[
          styles.requirementText,
          valid && styles.requirementTextValid,
        ]}
      >
        {label}
      </Text>
    </View>
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

  shieldWrap: {
    width: 88,
    height: 88,
    alignSelf: "center",
    borderRadius: 29,
    padding: 6,
    backgroundColor: GOLD_LIGHT,
  },

  shieldInner: {
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
    lineHeight: 16,
    textAlign: "center",
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

  stepLineDone: {
    flex: 1,
    height: 2,
    backgroundColor: SUCCESS,
  },

  stepNumberActive: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 9,
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

  inputLabel: {
    marginTop: 21,
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
    borderColor: "#E5A59D",
  },

  inputWrapSuccess: {
    borderColor: "#BFDCC8",
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
    paddingHorizontal: 10,
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 11,
  },

  eyeButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  strengthRow: {
    marginTop: 9,
    flexDirection: "row",
    gap: 5,
  },

  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E3E7E3",
  },

  strengthWeak: {
    backgroundColor: DANGER,
  },

  strengthGood: {
    backgroundColor: GOLD_DARK,
  },

  strengthStrong: {
    backgroundColor: SUCCESS,
  },

  strengthTextRow: {
    marginTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  strengthLabel: {
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 7,
  },

  strengthValue: {
    fontFamily: "DMSans_700Bold",
    fontSize: 7,
  },

  matchRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  matchText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 7,
  },

  requirementsCard: {
    marginTop: 15,
    padding: 13,
    borderRadius: 17,
    backgroundColor: MINT,
    borderWidth: 1,
    borderColor: "#D5E6DA",
  },

  requirementsTitle: {
    marginBottom: 8,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  requirementRow: {
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  requirementIcon: {
    width: 19,
    height: 19,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  requirementIconValid: {
    backgroundColor: SUCCESS,
    borderColor: SUCCESS,
  },

  requirementText: {
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },

  requirementTextValid: {
    fontFamily: "DMSans_700Bold",
    color: SUCCESS,
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

  resetButton: {
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

  resetButtonDisabled: {
    opacity: 0.55,
  },

  resetButtonIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.50)",
  },

  resetText: {
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

  loginRow: {
    marginTop: 18,
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
