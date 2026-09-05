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
  View,
  useWindowDimensions,
} from "react-native";

import { API_BASE_URL } from "../services/api";

const GREEN = "#0B3D2E";
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

export default function RegisterScreen() {
  const { height } = useWindowDimensions();
  const compact = height < 780;

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  function validate() {
    const cleanName = name.trim();
    const cleanPhone = phoneNumber.trim();
    const cleanEmail = email.trim().toLowerCase();
    const ageNumber = Number(age);

    if (
      !cleanName ||
      !cleanPhone ||
      !cleanEmail ||
      !age ||
      !gender ||
      !password ||
      !confirmPassword
    ) {
      setNotice({
        type: "error",
        text: "Please complete all fields before creating your account.",
      });
      return false;
    }

    if (cleanName.length < 2) {
      setNotice({
        type: "error",
        text: "Full name must contain at least 2 characters.",
      });
      return false;
    }

    if (!/^[A-Za-zÀ-ž.'\-\s]+$/.test(cleanName)) {
      setNotice({
        type: "error",
        text: "Please enter a valid full name.",
      });
      return false;
    }

    if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      setNotice({
        type: "error",
        text: "Enter a valid 10-digit Indian mobile number.",
      });
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setNotice({
        type: "error",
        text: "Please enter a valid email address.",
      });
      return false;
    }

    if (!Number.isInteger(ageNumber) || ageNumber < 1 || ageNumber > 120) {
      setNotice({
        type: "error",
        text: "Please enter a valid age between 1 and 120.",
      });
      return false;
    }

    const passwordPattern =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

    if (!passwordPattern.test(password)) {
      setNotice({
        type: "error",
        text:
          "Password must contain at least 8 characters with uppercase, lowercase, number and special character.",
      });
      return false;
    }

    if (password !== confirmPassword) {
      setNotice({
        type: "error",
        text: "Password and confirm password do not match.",
      });
      return false;
    }

    return true;
  }

  async function register() {
    if (!validate()) return;

    try {
      setSubmitting(true);
      setNotice({ type: "", text: "" });

      const payload = {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim().toLowerCase(),
        age: Number(age),
        gender,
        password,
        confirmPassword,
      };

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
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
        throw new Error(result?.message || "Registration failed.");
      }

      await AsyncStorage.setItem("registeredEmail", payload.email);

      setNotice({
        type: "success",
        text:
          result?.message ||
          "Registration successful. Redirecting to login...",
      });

      setTimeout(() => {
        router.replace("/login" as any);
      }, 900);
    } catch (error: any) {
      console.log("Registration failed:", error);

      setNotice({
        type: "error",
        text:
          error?.message ||
          "Unable to connect. Please check your internet connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

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
          {/* TOP HEADER */}
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

          {/* REGISTER CARD */}
          <Animated.View
            style={[
              styles.card,
              compact && styles.cardCompact,
              rise(cardAnim, 28),
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
                        outputRange: [0.72, 1],
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
              START YOUR WELLNESS JOURNEY
            </Text>

            <Text style={[styles.title, compact && styles.titleCompact]}>
              Create Your Account
            </Text>

            <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
              Join NeoLife to access consultations, orders and personalized
              wellness services.
            </Text>

            <Animated.View
              style={[
                styles.formArea,
                compact && styles.formAreaCompact,
                rise(formAnim, 16),
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
                    size={17}
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

              <Field
                icon="person-outline"
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
              />

              <View style={styles.twoColumn}>
                <View style={{ flex: 1 }}>
                  <Field
                    icon="call-outline"
                    placeholder="Phone Number"
                    value={phoneNumber}
                    onChangeText={(value) =>
                      setPhoneNumber(value.replace(/[^0-9]/g, ""))
                    }
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Field
                    icon="mail-outline"
                    placeholder="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.twoColumn}>
                <View style={{ flex: 0.75 }}>
                  <Field
                    icon="calendar-outline"
                    placeholder="Age"
                    value={age}
                    onChangeText={(value) =>
                      setAge(value.replace(/[^0-9]/g, ""))
                    }
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>

                <View style={{ flex: 1.25 }}>
                  <View style={styles.genderWrap}>
                    {["MALE", "FEMALE", "OTHER"].map((item) => {
                      const active = gender === item;

                      return (
                        <Pressable
                          key={item}
                          style={[
                            styles.genderChip,
                            active && styles.genderChipActive,
                          ]}
                          onPress={() => setGender(item)}
                        >
                          <Text
                            style={[
                              styles.genderChipText,
                              active && styles.genderChipTextActive,
                            ]}
                          >
                            {item === "MALE"
                              ? "Male"
                              : item === "FEMALE"
                              ? "Female"
                              : "Other"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              <PasswordField
                placeholder="Create Password"
                value={password}
                onChangeText={setPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
              />

              <PasswordField
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                visible={showConfirmPassword}
                onToggle={() =>
                  setShowConfirmPassword((current) => !current)
                }
                onSubmitEditing={register}
              />

              <View style={styles.passwordNote}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color={GOLD_DARK}
                />
                <Text style={styles.passwordNoteText}>
                  Use 8+ characters with uppercase, lowercase, number and
                  special character.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.registerButton,
                  submitting && styles.registerButtonDisabled,
                ]}
                activeOpacity={0.86}
                disabled={submitting}
                onPress={register}
              >
                {submitting ? (
                  <>
                    <ActivityIndicator size="small" color={GREEN} />
                    <Text style={styles.registerButtonText}>
                      Creating Account...
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>
                      Create Account
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={GREEN}
                    />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.replace("/login" as any)}
              >
                <Text style={styles.loginLinkMuted}>
                  Already have an account?
                </Text>
                <Text style={styles.loginLinkStrong}> Sign In</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

function Field({
  icon,
  ...props
}: {
  icon: any;
  [key: string]: any;
}) {
  return (
    <View style={styles.inputWrap}>
      <View style={styles.inputIcon}>
        <Ionicons name={icon} size={17} color={GREEN} />
      </View>

      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor="#9CA7A0"
      />
    </View>
  );
}

function PasswordField({
  visible,
  onToggle,
  ...props
}: {
  visible: boolean;
  onToggle: () => void;
  [key: string]: any;
}) {
  return (
    <View style={styles.inputWrap}>
      <View style={styles.inputIcon}>
        <Ionicons name="lock-closed-outline" size={17} color={GREEN} />
      </View>

      <TextInput
        {...props}
        secureTextEntry={!visible}
        autoCapitalize="none"
        style={styles.input}
        placeholderTextColor="#9CA7A0"
      />

      <TouchableOpacity style={styles.eyeButton} onPress={onToggle}>
        <Ionicons
          name={visible ? "eye-off-outline" : "eye-outline"}
          size={18}
          color={GREEN}
        />
      </TouchableOpacity>
    </View>
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
    backgroundColor: "rgba(5,31,21,.78)",
  },

  goldGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -80,
    right: -110,
    backgroundColor: "rgba(214,180,91,.18)",
  },

  softGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    left: -130,
    bottom: 40,
    backgroundColor: "rgba(255,255,255,.07)",
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
    paddingHorizontal: 14,
    justifyContent: "center",
  },

  contentCompact: {
    paddingTop: Platform.OS === "web" ? 10 : 26,
    paddingBottom: 10,
  },

  topBar: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  topBrand: {
    flexDirection: "row",
    alignItems: "center",
  },

  topLogo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: GOLD,
  },

  topBrandName: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 15,
  },

  topBrandSub: {
    marginTop: 1,
    fontFamily: "DMSans_500Medium",
    color: GOLD_LIGHT,
    fontSize: 8,
    letterSpacing: 0.6,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.94)",
  },

  card: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    overflow: "hidden",
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 30,
    backgroundColor: "rgba(251,250,246,.97)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.75)",
    elevation: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
  },

  cardCompact: {
    paddingTop: 13,
    paddingBottom: 11,
    borderRadius: 25,
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

  logoWrapCompact: {
    transform: [{ scale: 0.92 }],
  },

  logoRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: GOLD,
  },

  authLogo: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },

  authLogoCompact: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },

  eyebrow: {
    marginTop: 10,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    textAlign: "center",
    fontSize: 7,
    letterSpacing: 1.35,
  },

  eyebrowCompact: {
    marginTop: 7,
  },

  title: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    textAlign: "center",
    fontSize: 29,
    lineHeight: 33,
  },

  titleCompact: {
    fontSize: 26,
    lineHeight: 29,
  },

  subtitle: {
    marginTop: 4,
    maxWidth: 350,
    alignSelf: "center",
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    textAlign: "center",
    fontSize: 10,
    lineHeight: 15,
  },

  subtitleCompact: {
    fontSize: 9,
    lineHeight: 13,
  },

  formArea: {
    marginTop: 13,
    gap: 9,
  },

  formAreaCompact: {
    marginTop: 10,
    gap: 7,
  },

  notice: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
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
    fontSize: 9,
    lineHeight: 14,
  },

  twoColumn: {
    flexDirection: "row",
    gap: 8,
  },

  inputWrap: {
    minHeight: 46,
    paddingHorizontal: 8,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E5E1D6",
  },

  inputIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  input: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 8,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 11,
  },

  eyeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  genderWrap: {
    minHeight: 46,
    padding: 4,
    borderRadius: 15,
    flexDirection: "row",
    gap: 4,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E5E1D6",
  },

  genderChip: {
    flex: 1,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F7F4",
  },

  genderChipActive: {
    backgroundColor: GREEN,
  },

  genderChipText: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 8,
  },

  genderChipTextActive: {
    color: WHITE,
  },

  passwordNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  passwordNoteText: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 7,
    lineHeight: 11,
  },

  registerButton: {
    minHeight: 48,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
  },

  registerButtonDisabled: {
    opacity: 0.67,
  },

  registerButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  loginLink: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  loginLinkMuted: {
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
  },

  loginLinkStrong: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },
});
