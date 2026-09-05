import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  Easing,
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
  useWindowDimensions,
  View,
} from "react-native";

import { API_BASE_URL } from "../services/api";

const GREEN = "#0B3D2E";
const GREEN_2 = "#155741";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_DARK = "#B78D2B";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#738179";
const DANGER = "#A7322A";
const SUCCESS = "#277A4E";

type Notice = {
  type: "error" | "success" | "";
  text: string;
};

export default function LoginScreen() {
  const { height } = useWindowDimensions();
  const compact = height < 760;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [notice, setNotice] = useState<Notice>({ type: "", text: "" });

  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    restoreRememberedEmail();

    Animated.sequence([
      Animated.spring(logoAnim, {
        toValue: 1,
        friction: 7,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 430,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  async function restoreRememberedEmail() {
    try {
      const rememberedEmail = await AsyncStorage.getItem(
        "rememberedLoginEmail"
      );

      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }
    } catch (error) {
      console.log("Remembered email restore failed:", error);
    }
  }

  async function saveLoginSession(data: any) {
    const role = String(data?.role || "USER").toUpperCase();

    await AsyncStorage.multiSet([
      ["token", data?.token || ""],
      ["refreshToken", data?.refreshToken || ""],
      ["userId", String(data?.id || "")],
      ["email", data?.email || email.trim()],
      ["role", role],
      ["profileCompleted", String(Boolean(data?.profileCompleted))],
      ["isLoggedIn", "true"],
    ]);
  }

  async function saveRememberedEmail() {
    if (rememberMe) {
      await AsyncStorage.setItem("rememberedLoginEmail", email.trim());
    } else {
      await AsyncStorage.removeItem("rememberedLoginEmail");
    }
  }

  async function login() {
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setNotice({
        type: "error",
        text: "Please enter your email address and password.",
      });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setNotice({
        type: "error",
        text: "Please enter a valid email address.",
      });
      return;
    }

    try {
      setLoggingIn(true);
      setNotice({ type: "", text: "" });

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const responseText = await response.text();

      let result: any = {};
      if (responseText) {
        try {
          result = JSON.parse(responseText);
        } catch {
          result = {
            success: false,
            message: responseText,
          };
        }
      }

      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || "Invalid email or password.");
      }

      const data = result?.data || {};

      if (!data?.token) {
        throw new Error("Login token was not returned by the server.");
      }

      await saveLoginSession(data);
      await saveRememberedEmail();

      setNotice({
        type: "success",
        text: result?.message || "Welcome back. Login successful.",
      });

      const role = String(data?.role || "USER").toUpperCase();
const profileCompleted = Boolean(data?.profileCompleted);

setTimeout(() => {
  if (role === "DOCTOR") {
    if (profileCompleted) {
      router.replace("/doctor/dashboard" as any);
    } else {
      router.replace("/doctor/profile" as any);
    }
    return;
  }

  if (role === "ADMIN") {
    router.replace("/admin/dashboard" as any);
    return;
  }

  if (role === "MEDICAL_STAFF") {
    router.replace("/medical/dashboard" as any);
    return;
  }

  if (role === "THERAPIST") {
    router.replace("/therapist/dashboard" as any);
    return;
  }

  // Normal patient
  router.replace("/(tabs)" as any);
}, 650);
    } catch (error: any) {
      console.log("Login failed:", error);

      setNotice({
        type: "error",
        text:
          error?.message ||
          "Unable to connect. Please check your internet connection and try again.",
      });
    } finally {
      setLoggingIn(false);
    }
  }

  const rise = (value: Animated.Value, amount = 24) => ({
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [amount, 0],
        }),
      },
    ],
  });

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/neolife2.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.backgroundShade} />
      <View style={styles.goldGlow} />
      <View style={styles.softGlow} />

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
          <View style={[styles.content, compact && styles.contentCompact]}>
          {/* MINI HEADER */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.topBrand}
              activeOpacity={0.82}
              onPress={() => router.replace("/(tabs)" as any)}
            >
              <Image
                source={require("../assets/images/main_logo.jpeg")}
                style={styles.topLogo}
              />

              <View>
                <Text style={styles.topBrandName}>NeoLife</Text>
                <Text style={styles.topBrandSub}>Wellness Center</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.replace("/(tabs)" as any)}
            >
              <Ionicons name="close" size={21} color={GREEN} />
            </TouchableOpacity>
          </View>

          {/* AUTH CARD */}
          <Animated.View
            style={[
              styles.card,
              compact && styles.cardCompact,
              rise(cardAnim, 30),
            ]}
          >
            <View style={styles.cardGlowOne} />
            <View style={styles.cardGlowTwo} />

            <Animated.View
              style={[
                styles.logoWrap,
                compact && styles.logoWrapCompact,
                {
                  opacity: logoAnim,
                  transform: [
                    {
                      scale: logoAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.logoRing}>
                <Image
                  source={require("../assets/images/main_logo.jpeg")}
                  style={[
                    styles.authLogo,
                    compact && styles.authLogoCompact,
                  ]}
                />
              </View>
            </Animated.View>

            <Text style={[styles.eyebrow, compact && styles.eyebrowCompact]}>
              YOUR WELLNESS, YOUR SPACE
            </Text>

            <Text style={[styles.title, compact && styles.titleCompact]}>
              Welcome Back
            </Text>

            <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
              Sign in to continue your NeoLife wellness journey.
            </Text>

            <Animated.View
              style={[
                styles.formArea,
                compact && styles.formAreaCompact,
                rise(formAnim, 18),
              ]}
            >
              {!!notice.text && (
                <View
                  style={[
                    styles.notice,
                    notice.type === "success"
                      ? styles.noticeSuccess
                      : styles.noticeError,
                  ]}
                >
                  <Ionicons
                    name={
                      notice.type === "success"
                        ? "checkmark-circle-outline"
                        : "alert-circle-outline"
                    }
                    size={18}
                    color={notice.type === "success" ? SUCCESS : DANGER}
                  />

                  <Text
                    style={[
                      styles.noticeText,
                      {
                        color:
                          notice.type === "success" ? SUCCESS : DANGER,
                      },
                    ]}
                  >
                    {notice.text}
                  </Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Email Address</Text>

              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}>
                  <Ionicons name="mail-outline" size={18} color={GREEN} />
                </View>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA7A0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>

              <Text style={[styles.inputLabel, { marginTop: 15 }]}>
                Password
              </Text>

              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={GREEN}
                  />
                </View>

                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA7A0"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={styles.input}
                  onSubmitEditing={login}
                />

                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((current) => !current)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={19}
                    color={GREEN}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsRow}>
                <Pressable
                  style={styles.rememberRow}
                  onPress={() => setRememberMe((current) => !current)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      rememberMe && styles.checkboxActive,
                    ]}
                  >
                    {rememberMe && (
                      <Ionicons name="checkmark" size={14} color={WHITE} />
                    )}
                  </View>

                  <Text style={styles.rememberText}>Remember me</Text>
                </Pressable>

                <TouchableOpacity
  onPress={() => router.push("/forgot-password" as any)}
>
  <Text style={styles.forgotText}>Forgot Password?</Text>
</TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.loginButton,
                  loggingIn && styles.loginButtonDisabled,
                ]}
                disabled={loggingIn}
                activeOpacity={0.86}
                onPress={login}
              >
                {loggingIn ? (
                  <>
                    <ActivityIndicator size="small" color={GREEN} />
                    <Text style={styles.loginButtonText}>Signing in...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={GREEN}
                    />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.secureRow}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color={GOLD_DARK}
                />
                <Text style={styles.secureText}>
                  Your account information is securely protected.
                </Text>
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>NEW TO NEOLIFE?</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity
                style={[
                  styles.registerButton,
                  compact && styles.registerButtonCompact,
                ]}
                activeOpacity={0.84}
                onPress={() => router.push("/register" as any)}
              >
                <View style={styles.registerIcon}>
                  <Ionicons
                    name="person-add-outline"
                    size={18}
                    color={GREEN}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.registerTitle}>
                    Create Your Account
                  </Text>
                  <Text style={styles.registerSub}>
                    Join NeoLife and manage your wellness in one place.
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={GREEN}
                />
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* BACK HOME */}
          <TouchableOpacity
            style={[
              styles.homeLink,
              compact && styles.homeLinkCompact,
            ]}
            onPress={() => router.replace("/(tabs)" as any)}
          >
            <Ionicons name="home-outline" size={16} color={GOLD_LIGHT} />
            <Text style={styles.homeLinkText}>Continue exploring as guest</Text>
          </TouchableOpacity>
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
    backgroundColor: CREAM,
  },

  background: {
    flex: 1,
  },

  backgroundShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 31, 21, .77)",
  },

  goldGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -80,
    right: -110,
    backgroundColor: "rgba(214, 180, 91, .18)",
  },

  softGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    left: -130,
    bottom: 50,
    backgroundColor: "rgba(255, 255, 255, .07)",
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

  content: {
    flex: 1,
    paddingTop: Platform.OS === "web" ? 18 : 38,
    paddingBottom: 18,
    paddingHorizontal: 16,
    justifyContent: "center",
  },

  contentCompact: {
    paddingTop: Platform.OS === "web" ? 10 : 26,
    paddingBottom: 10,
  },

  topBar: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  topBrand: {
    flexDirection: "row",
    alignItems: "center",
  },

  topLogo: {
    width: 44,
    height: 44,
    borderRadius: 15,
    marginRight: 9,
    borderWidth: 1,
    borderColor: GOLD,
  },

  topBrandName: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 16,
  },

  topBrandSub: {
    marginTop: 1,
    fontFamily: "DMSans_500Medium",
    color: GOLD_LIGHT,
    fontSize: 9,
    letterSpacing: 0.6,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.94)",
  },

  card: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    overflow: "hidden",
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderRadius: 31,
    backgroundColor: "rgba(251,250,246,.97)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.75)",
    elevation: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
  },

  cardCompact: {
    paddingTop: 16,
    paddingBottom: 13,
    paddingHorizontal: 16,
    borderRadius: 26,
  },

  cardGlowOne: {
    position: "absolute",
    width: 190,
    height: 190,
    top: -95,
    right: -75,
    borderRadius: 95,
    backgroundColor: "rgba(214,180,91,.13)",
  },

  cardGlowTwo: {
    position: "absolute",
    width: 170,
    height: 170,
    left: -90,
    bottom: -90,
    borderRadius: 85,
    backgroundColor: "rgba(11,61,46,.06)",
  },

  logoWrap: {
    alignItems: "center",
  },

  logoRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: GOLD,
  },

  authLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },

  logoWrapCompact: {
    transform: [{ scale: 0.9 }],
  },

  authLogoCompact: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },

  eyebrow: {
    marginTop: 8,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    textAlign: "center",
    fontSize: 8,
    letterSpacing: 1.45,
  },

  title: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    textAlign: "center",
    fontSize: 30,
    lineHeight: 34,
  },

  titleCompact: {
    fontSize: 27,
    lineHeight: 31,
  },

  subtitle: {
    marginTop: 4,
    maxWidth: 300,
    alignSelf: "center",
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
  },

  formArea: {
    marginTop: 16,
  },

  formAreaCompact: {
    marginTop: 12,
  },

  eyebrowCompact: {
    marginTop: 8,
    fontSize: 7,
  },

  subtitleCompact: {
    fontSize: 10,
    lineHeight: 15,
  },

  notice: {
    marginBottom: 10,
    minHeight: 42,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  noticeError: {
    backgroundColor: "#FFF1EF",
    borderWidth: 1,
    borderColor: "#F3C6C1",
  },

  noticeSuccess: {
    backgroundColor: "#EDF8F1",
    borderWidth: 1,
    borderColor: "#BFE1CB",
  },

  noticeText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    lineHeight: 15,
  },

  inputLabel: {
    marginBottom: 7,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  inputWrap: {
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E5E1D6",
  },

  inputIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  input: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 10,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 13,
  },

  eyeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  optionsRow: {
    marginTop: 9,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rememberRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#AAB6AF",
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  rememberText: {
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 10,
  },

  forgotText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  loginButton: {
    minHeight: 48,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
  },

  loginButtonDisabled: {
    opacity: 0.67,
  },

  loginButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 12,
  },

  secureRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  secureText: {
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },

  dividerRow: {
    marginTop: 15,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2DDD0",
  },

  dividerText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1,
  },

  registerButton: {
    minHeight: 58,
    padding: 11,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: MINT,
    borderWidth: 1,
    borderColor: "#D8E8DE",
  },

  registerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  registerTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  registerSub: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
  },

  registerButtonCompact: {
    minHeight: 52,
    paddingVertical: 8,
  },

  homeLink: {
    alignSelf: "center",
    marginTop: 17,
    minHeight: 42,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  homeLinkText: {
    fontFamily: "DMSans_500Medium",
    color: WHITE,
    fontSize: 10,
  },

  homeLinkCompact: {
    marginTop: 8,
    minHeight: 34,
  },
});
