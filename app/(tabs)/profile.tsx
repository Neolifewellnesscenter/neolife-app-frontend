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
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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

import { API_BASE_URL } from "../../services/api";
import PatientDrawer from "../../components/PatientDrawer";
import PatientHeader from "../../components/PatientHeader";

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
const BORDER = "#E8E2D3";
const DANGER = "#B42318";

type UserProfile = {
  name?: string;
  email?: string;
  phoneNumber?: string;
  age?: number | null;
  gender?: string | null;
};

export default function ProfileScreen() {
  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const [profile, setProfile] = useState<UserProfile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
const [menuOpen, setMenuOpen] = useState(false);
const [logoutOpen, setLogoutOpen] = useState(false);

const [profileNotice, setProfileNotice] = useState({
  visible: false,
  type: "success" as "success" | "error" | "warning",
  title: "",
  message: "",
});

function showProfileNotice(
  type: "success" | "error" | "warning",
  title: string,
  message: string
) {
  setProfileNotice({
    visible: true,
    type,
    title,
    message,
  });
}

  const [authNotice, setAuthNotice] = useState({
    visible: false,
    title: "Login Required",
    message: "Please sign in to access your NeoLife profile and wellness activity.",
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");

  
  const cardAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;

  const profileLetter = useMemo(() => {
    const n = profile.name?.trim();
    return n ? n.charAt(0).toUpperCase() : "U";
  }, [profile.name]);

  useEffect(() => {
    loadProfile();

    Animated.sequence([
      
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(menuAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const rise = (value: Animated.Value, amount = 18) => ({
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

  async function loadProfile() {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        setAuthNotice({
          visible: true,
          title: "Welcome Back",
          message:
            "Sign in to view your profile, appointments, orders, treatments and personalized wellness activity.",
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/getProfile`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        await clearAuth();
        setAuthNotice({
          visible: true,
          title: "Session Expired",
          message:
            "Your session has ended for security. Please sign in again to continue.",
        });
        return;
      }

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success !== true) {
        Alert.alert("Profile", result?.message || "Unable to load profile.");
        return;
      }

      const user = result?.data || {};

      const loaded: UserProfile = {
        name: user.name || "Neolife User",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        age: user.age ?? null,
        gender: user.gender || "",
      };

      setProfile(loaded);

      setName(loaded.name || "");
      setEmail(loaded.email || "");
      setPhoneNumber(loaded.phoneNumber || "");
      setAge(loaded.age != null ? String(loaded.age) : "");
      setGender(loaded.gender || "");

      await AsyncStorage.setItem("name", loaded.name || "");
      await AsyncStorage.setItem("email", loaded.email || "");
    } catch (error) {
      console.log("Profile load failed:", error);
      Alert.alert(
        "Unable to load profile",
        "Please check your internet connection and backend."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedPhone = phoneNumber.trim();

  if (!trimmedName) {
    showProfileNotice(
      "warning",
      "Name Required",
      "Please enter your full name before saving your profile."
    );
    return;
  }

  if (!trimmedEmail) {
    showProfileNotice(
      "warning",
      "Email Required",
      "Please enter your email address before continuing."
    );
    return;
  }

  if (
    trimmedPhone &&
    !/^[0-9]{10}$/.test(trimmedPhone)
  ) {
    showProfileNotice(
      "warning",
      "Check Your Phone Number",
      "Please enter a valid 10-digit mobile number."
    );
    return;
  }

  if (age && (Number(age) < 1 || Number(age) > 120)) {
    showProfileNotice(
      "warning",
      "Check Your Age",
      "Please enter a valid age between 1 and 120."
    );
    return;
  }

  try {
    setSaving(true);

    const token = await AsyncStorage.getItem("token");

    if (!token) {
      setEditOpen(false);

      setProfileNotice({
        visible: true,
        type: "error",
        title: "Login Required",
        message:
          "Your login session is no longer available. Please sign in again.",
      });

      return;
    }

    const payload = {
      name: trimmedName,
      email: trimmedEmail,
      phoneNumber: trimmedPhone,
      age: age ? Number(age) : null,
      gender: gender || null,
    };

    console.log("Updating profile:", payload);

    const response = await fetch(
      `${API_BASE_URL}/users/updateProfile`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      await clearAuth();

      setEditOpen(false);

      setProfileNotice({
        visible: true,
        type: "error",
        title: "Session Expired",
        message:
          "Your session has expired. Please sign in again to continue.",
      });

      return;
    }

    const responseText = await response.text();

    let result: any = {};

    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch {
        result = {};
      }
    }

    if (!response.ok || result?.success === false) {
      showProfileNotice(
        "error",
        "Update Failed",
        result?.message ||
          "We couldn't update your profile. Please check your details and try again."
      );

      return;
    }

    const updatedProfile: UserProfile = {
      name: trimmedName,
      email: trimmedEmail,
      phoneNumber: trimmedPhone,
      age: age ? Number(age) : null,
      gender: gender || "",
    };

    setProfile(updatedProfile);

    await AsyncStorage.setItem(
      "name",
      trimmedName
    );

    await AsyncStorage.setItem(
      "email",
      trimmedEmail
    );

    setEditOpen(false);

    setTimeout(() => {
      showProfileNotice(
        "success",
        "Profile Updated",
        result?.message ||
          "Your personal information has been saved successfully."
      );
    }, 250);

    await loadProfile();
  } catch (error) {
    console.log("Profile update failed:", error);

    showProfileNotice(
      "error",
      "Unable to Update Profile",
      "We couldn't connect to NeoLife right now. Please check your internet connection and try again."
    );
  } finally {
    setSaving(false);
  }
}

  async function clearAuth() {
    const keys = [
      "token",
      "refreshToken",
      "userId",
      "email",
      "name",
      "role",
      "profileCompleted",
      "isLoggedIn",
    ];

    await AsyncStorage.multiRemove(keys);
  }

  function logout() {
  setLogoutOpen(true);
}

async function confirmLogout() {
  setLogoutOpen(false);

  await clearAuth();

  router.replace("/login" as any);
}

  async function openURL(url: string) {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.log("Unable to open URL:", error);
    }
  }

  if (!dmLoaded || !playfairLoaded || loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loaderText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <PatientHeader
  onMenuPress={() => setMenuOpen(true)}
/>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 0 }}
      >
        {/* PROFILE HERO CARD */}
        <Animated.View style={[styles.profileHeroWrap, rise(cardAnim, 20)]}>
          <View style={styles.profileHero}>
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />

            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profileLetter}</Text>
            </View>

            <Text style={styles.profileName}>
              {profile.name || "Neolife User"}
            </Text>

            <Text style={styles.profileEmail}>
              {profile.email || "No email added"}
            </Text>

            {!!profile.phoneNumber && (
              <View style={styles.inlineMeta}>
                <Ionicons name="call-outline" size={14} color={GOLD_LIGHT} />
                <Text style={styles.inlineMetaText}>{profile.phoneNumber}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditOpen(true)}
            >
              <Ionicons name="create-outline" size={17} color={GREEN} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
          {/* PROFILE UPDATE / VALIDATION NOTICE */}
<Modal
  visible={profileNotice.visible}
  transparent
  animationType="fade"
  statusBarTranslucent
  onRequestClose={() =>
    setProfileNotice((current) => ({
      ...current,
      visible: false,
    }))
  }
>
  <View style={styles.profileNoticeRoot}>
    <Pressable
      style={styles.profileNoticeBackdrop}
      onPress={() =>
        setProfileNotice((current) => ({
          ...current,
          visible: false,
        }))
      }
    />

    <View style={styles.profileNoticeCard}>
      <View
        style={[
          styles.profileNoticeIconOuter,

          profileNotice.type === "success" &&
            styles.profileNoticeSuccessOuter,

          profileNotice.type === "error" &&
            styles.profileNoticeErrorOuter,

          profileNotice.type === "warning" &&
            styles.profileNoticeWarningOuter,
        ]}
      >
        <View style={styles.profileNoticeIconInner}>
          <Ionicons
            name={
              profileNotice.type === "success"
                ? "checkmark-circle-outline"
                : profileNotice.type === "warning"
                ? "alert-circle-outline"
                : "close-circle-outline"
            }
            size={32}
            color={
              profileNotice.type === "success"
                ? GREEN
                : profileNotice.type === "warning"
                ? GOLD_DARK
                : DANGER
            }
          />
        </View>
      </View>

      <Text style={styles.profileNoticeEyebrow}>
        NEOLIFE WELLNESS
      </Text>

      <Text style={styles.profileNoticeTitle}>
        {profileNotice.title}
      </Text>

      <Text style={styles.profileNoticeMessage}>
        {profileNotice.message}
      </Text>

      {profileNotice.type === "success" && (
        <View style={styles.profileNoticeInfo}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={GREEN}
          />

          <Text style={styles.profileNoticeInfoText}>
            Your latest details are now available
            across your NeoLife account.
          </Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.profileNoticeButton,
          profileNotice.type === "error" &&
            styles.profileNoticeErrorButton,
        ]}
        onPress={() => {
          const shouldLogin =
            profileNotice.title ===
              "Session Expired" ||
            profileNotice.title ===
              "Login Required";

          setProfileNotice((current) => ({
            ...current,
            visible: false,
          }));

          if (shouldLogin) {
            router.replace("/login" as any);
          }
        }}
      >
        <Text
          style={[
            styles.profileNoticeButtonText,
            profileNotice.type === "error" &&
              styles.profileNoticeErrorButtonText,
          ]}
        >
          {profileNotice.title === "Session Expired" ||
          profileNotice.title === "Login Required"
            ? "Sign In Again"
            : profileNotice.type === "success"
            ? "Great, Thanks"
            : "Okay, I'll Check"}
        </Text>

        <Ionicons
          name={
            profileNotice.title ===
              "Session Expired" ||
            profileNotice.title ===
              "Login Required"
              ? "log-in-outline"
              : profileNotice.type === "success"
              ? "checkmark"
              : "arrow-back-outline"
          }
          size={18}
          color={
            profileNotice.type === "error"
              ? WHITE
              : GREEN
          }
        />
      </TouchableOpacity>
    </View>
  </View>
</Modal>

        {/* WELLNESS MENU */}
        <Animated.View style={[styles.section, rise(menuAnim, 20)]}>
          <Text style={styles.eyebrow}>MY WELLNESS</Text>
          <Text style={styles.sectionTitle}>Your Health, All in One Place</Text>
          <Text style={styles.sectionLead}>
            Quickly access your orders, consultations and wellness activity.
          </Text>

          <View style={styles.menuCard}>
            <ProfileMenuItem
              icon="bag-handle-outline"
              title="My Orders"
              subtitle="Track products and previous orders"
              onPress={() => router.push("/my-orders" as any)}
            />

            <ProfileMenuItem
              icon="cart-outline"
              title="My Cart"
              subtitle="Review products before checkout"
              onPress={() => router.push("/cart" as any)}
            />

            <ProfileMenuItem
              icon="calendar-outline"
              title="My Appointments"
              subtitle="View your scheduled consultations"
              onPress={() => router.push("/my-appointments" as any)}
            />

            <ProfileMenuItem
              icon="leaf-outline"
              title="My Treatments"
              subtitle="Access your therapy and treatment history"
              onPress={() => router.push("/my-treatments" as any)}
              isLast
            />
          </View>
        </Animated.View>

        {/* ACCOUNT */}
        <View style={styles.accountSection}>
          <Text style={styles.eyebrow}>ACCOUNT</Text>
          <Text style={styles.sectionTitle}>Manage Your Account</Text>

          <View style={styles.menuCard}>
            <ProfileMenuItem
              icon="location-outline"
              title="Saved Addresses"
              subtitle="Manage delivery and contact addresses"
              onPress={() => router.push("/addresses" as any)}
            />

            <ProfileMenuItem
              icon="star-outline"
              title="Clinic Reviews"
              subtitle="Share and manage your clinic feedback"
              onPress={() => router.push("/clinic-reviews" as any)}
            />

            <ProfileMenuItem
              icon="card-outline"
              title="My Transactions"
              subtitle="View payment and transaction history"
              onPress={() => router.push("/my-transactions" as any)}
              isLast
            />
          </View>
        </View>

        {/* SUPPORT */}
        <View style={styles.supportCard}>
          <View style={styles.supportIcon}>
            <Ionicons name="headset-outline" size={22} color={GOLD} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.supportTitle}>Need Help?</Text>
            <Text style={styles.supportText}>
              Our wellness team is available to assist you.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.supportArrow}
            onPress={() =>
              openURL(
                "https://wa.me/919481489866?text=Hello%20NeoLife%20Wellness%20Center,%20I%20need%20help."
              )
            }
          >
            <Ionicons name="arrow-forward" size={18} color={GREEN} />
          </TouchableOpacity>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={19} color={DANGER} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* SAME FOOTER STYLE AS ABOUT/HOME */}
        <View style={styles.footer}>
          <Image
            source={require("../../assets/images/main_logo.jpeg")}
            style={styles.footerLogo}
          />

          <Text style={styles.footerBrand}>NeoLife Wellness Center</Text>

          <Text style={styles.footerTagline}>
            Natural healing, Ayurvedic care and trusted wellness support for a healthier life.
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
      {/* PREMIUM LOGOUT CONFIRMATION */}
<Modal
  visible={logoutOpen}
  transparent
  animationType="fade"
  statusBarTranslucent
  onRequestClose={() => setLogoutOpen(false)}
>
  <View style={styles.logoutModalRoot}>
    <Pressable
      style={styles.logoutModalBackdrop}
      onPress={() => setLogoutOpen(false)}
    />

    <View style={styles.logoutDialog}>
      {/* ICON */}
      <View style={styles.logoutIconOuter}>
        <View style={styles.logoutIconInner}>
          <Ionicons
            name="log-out-outline"
            size={30}
            color={DANGER}
          />
        </View>
      </View>

      <Text style={styles.logoutEyebrow}>
        NEOLIFE WELLNESS
      </Text>

      <Text style={styles.logoutModalTitle}>
        Leaving so soon?
      </Text>

      <Text style={styles.logoutModalMessage}>
        Are you sure you want to sign out of your NeoLife account?
      </Text>

      <View style={styles.logoutInfoBox}>
        <Ionicons
          name="shield-checkmark-outline"
          size={19}
          color={GREEN}
        />

        <Text style={styles.logoutInfoText}>
          You can sign back in anytime to access your appointments,
          orders and wellness activity.
        </Text>
      </View>

      {/* LOGOUT */}
      <TouchableOpacity
        style={styles.logoutConfirmButton}
        activeOpacity={0.85}
        onPress={confirmLogout}
      >
        <Ionicons
          name="log-out-outline"
          size={18}
          color={WHITE}
        />

        <Text style={styles.logoutConfirmText}>
          Yes, Logout
        </Text>
      </TouchableOpacity>

      {/* CANCEL */}
      <TouchableOpacity
        style={styles.logoutCancelButton}
        activeOpacity={0.8}
        onPress={() => setLogoutOpen(false)}
      >
        <Text style={styles.logoutCancelText}>
          Stay Logged In
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

      {/* PREMIUM LOGIN / SESSION NOTICE */}
      <Modal
        visible={authNotice.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setAuthNotice((current) => ({ ...current, visible: false }));
          router.replace("/login" as any);
        }}
      >
        <View style={styles.authModalRoot}>
          <View style={styles.authModalBackdrop} />

          <Animated.View style={styles.authDialog}>
            <View style={styles.authIconWrap}>
              <View style={styles.authIconInner}>
                <Ionicons
                  name={
                    authNotice.title === "Session Expired"
                      ? "time-outline"
                      : "person-outline"
                  }
                  size={30}
                  color={GREEN}
                />
              </View>
            </View>

            <Text style={styles.authEyebrow}>NEOLIFE WELLNESS</Text>

            <Text style={styles.authTitle}>{authNotice.title}</Text>

            <Text style={styles.authMessage}>{authNotice.message}</Text>

            <View style={styles.authBenefitBox}>
              <AuthBenefit icon="calendar-outline" text="Manage appointments" />
              <AuthBenefit icon="bag-handle-outline" text="Track your orders" />
              <AuthBenefit icon="leaf-outline" text="Access wellness activity" />
            </View>

            <TouchableOpacity
              style={styles.authPrimaryButton}
              activeOpacity={0.86}
              onPress={() => {
                setAuthNotice((current) => ({ ...current, visible: false }));
                router.replace("/login" as any);
              }}
            >
              <Text style={styles.authPrimaryText}>Sign In to Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={GREEN} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.authHomeButton}
              activeOpacity={0.78}
              onPress={() => {
                setAuthNotice((current) => ({ ...current, visible: false }));
                router.replace("/(tabs)" as any);
              }}
            >
              <Ionicons name="home-outline" size={16} color={MUTED} />
              <Text style={styles.authHomeText}>Back to Home</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={editOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEditOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setEditOpen(false)}
          />

          <View style={styles.editSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.editSheetHeader}>
              <View>
                <Text style={styles.editEyebrow}>PROFILE DETAILS</Text>
                <Text style={styles.editTitle}>Edit Profile</Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setEditOpen(false)}
              >
                <Ionicons name="close" size={21} color={GREEN} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Field
                label="Full Name"
                icon="person-outline"
                value={name}
                onChangeText={setName}
                placeholder="Enter full name"
              />

              <Field
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Field
                label="Phone Number"
                icon="call-outline"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="10-digit mobile number"
                keyboardType="number-pad"
                maxLength={10}
              />

              <Field
                label="Age"
                icon="calendar-outline"
                value={age}
                onChangeText={setAge}
                placeholder="Enter age"
                keyboardType="number-pad"
                maxLength={3}
              />

              <Text style={styles.inputLabel}>Gender</Text>

              <View style={styles.genderRow}>
                {["MALE", "FEMALE", "OTHER"].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.genderChip,
                      gender === item && styles.genderChipActive,
                    ]}
                    onPress={() => setGender(item)}
                  >
                    <Text
                      style={[
                        styles.genderChipText,
                        gender === item && styles.genderChipTextActive,
                      ]}
                    >
                      {item === "MALE"
                        ? "Male"
                        : item === "FEMALE"
                        ? "Female"
                        : "Other"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  saving && styles.saveButtonDisabled,
                ]}
                disabled={saving}
                onPress={saveProfile}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={GREEN} />
                ) : (
                  <>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                    <Ionicons name="checkmark" size={18} color={GREEN} />
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <PatientDrawer
  visible={menuOpen}
  onClose={() => setMenuOpen(false)}
/>
    </View>
  );
}

function AuthBenefit({
  icon,
  text,
}: {
  icon: any;
  text: string;
}) {
  return (
    <View style={styles.authBenefitItem}>
      <View style={styles.authBenefitIcon}>
        <Ionicons name={icon} size={15} color={GREEN} />
      </View>
      <Text style={styles.authBenefitText}>{text}</Text>
    </View>
  );
}

function ProfileMenuItem({
  icon,
  title,
  subtitle,
  onPress,
  isLast = false,
}: {
  icon: any;
  title: string;
  subtitle: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  const press = useRef(new Animated.Value(1)).current;

  function down() {
    Animated.spring(press, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  }

  function up() {
    Animated.spring(press, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale: press }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={down}
        onPressOut={up}
        style={[styles.menuItem, isLast && styles.menuItemLast]}
      >
        <View style={styles.menuIcon}>
          <Ionicons name={icon} size={21} color={GREEN} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.menuTitle}>{title}</Text>
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#AEBBB3" />
      </Pressable>
    </Animated.View>
  );
}

function Field({
  label,
  icon,
  ...props
}: {
  label: string;
  icon: any;
  [key: string]: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>{label}</Text>

      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={18} color={GREEN} />
        <TextInput
          {...props}
          style={styles.input}
          placeholderTextColor="#A0AAA4"
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

  

  profileHeroWrap: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },

  profileHero: {
    overflow: "hidden",
    minHeight: 315,
    padding: 24,
    borderRadius: 30,
    alignItems: "center",
    backgroundColor: GREEN,
  },

  heroGlowOne: {
    position: "absolute",
    width: 210,
    height: 210,
    top: -90,
    right: -70,
    borderRadius: 105,
    backgroundColor: "rgba(214,180,91,.13)",
  },

  heroGlowTwo: {
    position: "absolute",
    width: 170,
    height: 170,
    left: -70,
    bottom: -80,
    borderRadius: 85,
    backgroundColor: "rgba(255,255,255,.05)",
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: GOLD,
    backgroundColor: GREEN_2,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 40,
  },

  profileName: {
    marginTop: 16,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 26,
    textAlign: "center",
  },

  profileEmail: {
    marginTop: 5,
    fontFamily: "DMSans_400Regular",
    color: "#D8E6DD",
    fontSize: 12,
  },

  inlineMeta: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  inlineMetaText: {
    fontFamily: "DMSans_500Medium",
    color: GOLD_LIGHT,
    fontSize: 11,
  },

  editButton: {
    marginTop: 18,
    minHeight: 45,
    paddingHorizontal: 17,
    borderRadius: 14,
    backgroundColor: GOLD,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  editButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 12,
  },

  section: {
    paddingTop: 48,
    paddingHorizontal: 16,
  },

  accountSection: {
    paddingTop: 42,
    paddingHorizontal: 16,
  },

  eyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 10,
    letterSpacing: 1.5,
  },

  sectionTitle: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 28,
    lineHeight: 33,
  },

  sectionLead: {
    marginTop: 7,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
  },

  menuCard: {
    marginTop: 19,
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  menuItem: {
    minHeight: 78,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0EC",
  },

  menuItemLast: {
    borderBottomWidth: 0,
  },

  menuIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  menuTitle: {
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 13,
  },

  menuSubtitle: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 15,
  },

  supportCard: {
    marginTop: 38,
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F5EDDA",
    borderWidth: 1,
    borderColor: "#E8D6A8",
  },

  supportIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },

  supportTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 14,
  },

  supportText: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 15,
  },

  supportArrow: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },
  profileNoticeRoot: {
  flex: 1,
  paddingHorizontal: 22,
  alignItems: "center",
  justifyContent: "center",
},

profileNoticeBackdrop: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "rgba(5, 28, 19, 0.74)",
},

profileNoticeCard: {
  width: "100%",
  maxWidth: 380,
  paddingTop: 30,
  paddingBottom: 22,
  paddingHorizontal: 22,
  borderRadius: 30,
  alignItems: "center",

  backgroundColor: CREAM,

  borderWidth: 1,
  borderColor: "rgba(214,180,91,0.42)",

  elevation: 20,

  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 12,
  },
  shadowOpacity: 0.23,
  shadowRadius: 25,
},

profileNoticeIconOuter: {
  width: 84,
  height: 84,
  borderRadius: 42,
  alignItems: "center",
  justifyContent: "center",
},

profileNoticeSuccessOuter: {
  backgroundColor: "#E1F1E8",
},

profileNoticeErrorOuter: {
  backgroundColor: "#FCE8E5",
},

profileNoticeWarningOuter: {
  backgroundColor: "#F7EDCF",
},

profileNoticeIconInner: {
  width: 64,
  height: 64,
  borderRadius: 32,

  alignItems: "center",
  justifyContent: "center",

  backgroundColor: WHITE,

  borderWidth: 1,
  borderColor: BORDER,
},

profileNoticeEyebrow: {
  marginTop: 18,

  fontFamily: "DMSans_700Bold",
  color: GOLD_DARK,

  fontSize: 9,
  letterSpacing: 1.6,
},

profileNoticeTitle: {
  marginTop: 7,

  fontFamily: "PlayfairDisplay_700Bold",
  color: GREEN,

  fontSize: 28,
  lineHeight: 34,

  textAlign: "center",
},

profileNoticeMessage: {
  marginTop: 9,
  maxWidth: 310,

  fontFamily: "DMSans_400Regular",
  color: MUTED,

  fontSize: 12,
  lineHeight: 19,

  textAlign: "center",
},

profileNoticeInfo: {
  width: "100%",

  marginTop: 20,
  padding: 14,

  borderRadius: 17,

  flexDirection: "row",
  alignItems: "center",
  gap: 10,

  backgroundColor: MINT,

  borderWidth: 1,
  borderColor: "#DDEBE3",
},

profileNoticeInfoText: {
  flex: 1,

  fontFamily: "DMSans_500Medium",
  color: TEXT,

  fontSize: 10,
  lineHeight: 16,
},

profileNoticeButton: {
  width: "100%",
  minHeight: 51,

  marginTop: 20,
  paddingHorizontal: 16,

  borderRadius: 16,

  backgroundColor: GOLD,

  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
},

profileNoticeButtonText: {
  fontFamily: "DMSans_700Bold",
  color: GREEN,
  fontSize: 12,
},

profileNoticeErrorButton: {
  backgroundColor: DANGER,
},

profileNoticeErrorButtonText: {
  color: WHITE,
},

  logoutButton: {
    marginTop: 28,
    marginHorizontal: 16,
    minHeight: 49,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF2F0",
    borderWidth: 1,
    borderColor: "#F3CBC5",
  },

  logoutText: {
    fontFamily: "DMSans_700Bold",
    color: DANGER,
    fontSize: 12,
  },
  logoutModalRoot: {
  flex: 1,
  paddingHorizontal: 22,
  alignItems: "center",
  justifyContent: "center",
},

logoutModalBackdrop: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "rgba(5, 28, 19, 0.74)",
},

logoutDialog: {
  width: "100%",
  maxWidth: 380,
  paddingTop: 30,
  paddingBottom: 22,
  paddingHorizontal: 22,
  borderRadius: 30,
  alignItems: "center",

  backgroundColor: CREAM,

  borderWidth: 1,
  borderColor: "rgba(214,180,91,0.45)",

  elevation: 20,

  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 12,
  },
  shadowOpacity: 0.24,
  shadowRadius: 25,
},

logoutIconOuter: {
  width: 82,
  height: 82,
  borderRadius: 41,

  alignItems: "center",
  justifyContent: "center",

  backgroundColor: "#FCE8E5",
},

logoutIconInner: {
  width: 62,
  height: 62,
  borderRadius: 31,

  alignItems: "center",
  justifyContent: "center",

  backgroundColor: WHITE,

  borderWidth: 1,
  borderColor: "#F2CBC5",
},

logoutEyebrow: {
  marginTop: 18,

  fontFamily: "DMSans_700Bold",
  color: GOLD_DARK,

  fontSize: 9,
  letterSpacing: 1.6,
},

logoutModalTitle: {
  marginTop: 7,

  fontFamily: "PlayfairDisplay_700Bold",
  color: GREEN,

  fontSize: 28,
  lineHeight: 34,

  textAlign: "center",
},

logoutModalMessage: {
  marginTop: 9,

  maxWidth: 310,

  fontFamily: "DMSans_400Regular",
  color: MUTED,

  fontSize: 12,
  lineHeight: 19,

  textAlign: "center",
},

logoutInfoBox: {
  width: "100%",

  marginTop: 20,
  padding: 14,

  borderRadius: 17,

  flexDirection: "row",
  alignItems: "flex-start",
  gap: 10,

  backgroundColor: MINT,

  borderWidth: 1,
  borderColor: "#DDEBE3",
},

logoutInfoText: {
  flex: 1,

  fontFamily: "DMSans_400Regular",
  color: TEXT,

  fontSize: 10,
  lineHeight: 16,
},

logoutConfirmButton: {
  width: "100%",
  minHeight: 51,

  marginTop: 20,

  borderRadius: 16,

  backgroundColor: DANGER,

  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",

  gap: 8,
},

logoutConfirmText: {
  fontFamily: "DMSans_700Bold",
  color: WHITE,
  fontSize: 12,
},

logoutCancelButton: {
  width: "100%",
  minHeight: 48,

  marginTop: 9,

  borderRadius: 16,

  alignItems: "center",
  justifyContent: "center",

  backgroundColor: WHITE,

  borderWidth: 1,
  borderColor: BORDER,
},

logoutCancelText: {
  fontFamily: "DMSans_700Bold",
  color: GREEN,
  fontSize: 12,
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

  authModalRoot: {
    flex: 1,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  authModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 28, 19, .72)",
  },

  authDialog: {
    width: "100%",
    maxWidth: 390,
    paddingTop: 30,
    paddingBottom: 23,
    paddingHorizontal: 22,
    borderRadius: 30,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "rgba(214,180,91,.45)",
    elevation: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
  },

  authIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5E8BD",
  },

  authIconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E9D79D",
  },

  authEyebrow: {
    marginTop: 18,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    letterSpacing: 1.6,
  },

  authTitle: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 29,
    lineHeight: 34,
    textAlign: "center",
  },

  authMessage: {
    marginTop: 9,
    maxWidth: 320,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
  },

  authBenefitBox: {
    width: "100%",
    marginTop: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: MINT,
    borderWidth: 1,
    borderColor: "#DDEBE3",
  },

  authBenefitItem: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  authBenefitIcon: {
    width: 29,
    height: 29,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  authBenefitText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 10,
  },

  authPrimaryButton: {
    width: "100%",
    minHeight: 51,
    marginTop: 20,
    paddingHorizontal: 17,
    borderRadius: 16,
    backgroundColor: GOLD,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  authPrimaryText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 12,
  },

  authHomeButton: {
    minHeight: 43,
    marginTop: 8,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  authHomeText: {
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 10,
  },

  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,.46)",
  },

  editSheet: {
    maxHeight: "88%",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: CREAM,
  },

  sheetHandle: {
    width: 45,
    height: 5,
    alignSelf: "center",
    borderRadius: 3,
    backgroundColor: "#D9DDD8",
  },

  editSheetHeader: {
    marginTop: 15,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  editEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    letterSpacing: 1.4,
  },

  editTitle: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 27,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  fieldWrap: {
    marginBottom: 15,
  },

  inputLabel: {
    marginBottom: 7,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  inputWrap: {
    minHeight: 50,
    paddingHorizontal: 13,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  input: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 13,
  },

  genderRow: {
    flexDirection: "row",
    gap: 8,
  },

  genderChip: {
    flex: 1,
    minHeight: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  genderChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  genderChipText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  genderChipTextActive: {
    color: WHITE,
  },

  saveButton: {
    marginTop: 22,
    marginBottom: 15,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: GOLD,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

  saveButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 12,
  },

  drawerRoot: {
    flex: 1,
    flexDirection: "row",
  },

  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,.45)",
  },

  drawer: {
    width: "82%",
    maxWidth: 330,
    height: "100%",
    paddingTop: Platform.OS === "web" ? 35 : 60,
    paddingHorizontal: 18,
    backgroundColor: GREEN,
  },

  drawerTop: {
    marginBottom: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  drawerBrand: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 28,
  },

  drawerSub: {
    marginTop: 2,
    fontFamily: "DMSans_500Medium",
    color: GOLD_LIGHT,
    fontSize: 11,
  },

  drawerClose: {
    width: 41,
    height: 41,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  drawerItem: {
    minHeight: 53,
    paddingHorizontal: 13,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  drawerText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 13,
  },
});
