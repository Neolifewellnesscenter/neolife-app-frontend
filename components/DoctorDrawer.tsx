import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useFocusEffect,
  usePathname,
} from "expo-router";
import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE_URL } from "../services/api";

const GREEN = "#0B3D2E";
const GREEN_2 = "#14533D";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const MUTED = "#75837B";
const BORDER = "#E6EBE7";
const DANGER = "#B95045";
const DANGER_LIGHT = "#FBECE9";

type DoctorDrawerProps = {
  visible: boolean;
  onClose: () => void;
  activeRoute?: string;
};

type MenuItem = {
  section: "MAIN" | "CLINICAL" | "FINANCE";
  icon: any;
  label: string;
  route: string;
  requiresOnline?: boolean;
  requiresOffline?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  {
    section: "MAIN",
    icon: "grid-outline",
    label: "Dashboard",
    route: "/doctor/dashboard",
  },
  {
    section: "MAIN",
    icon: "people-outline",
    label: "Patients",
    route: "/doctor/patients",
  },
  {
    section: "MAIN",
    icon: "calendar-outline",
    label: "Appointment Calendar",
    route: "/doctor/calendar",
  },
  {
    section: "MAIN",
    icon: "calendar-number-outline",
    label: "Upcoming Schedule",
    route: "/doctor/schedule",
  },
  {
    section: "MAIN",
    icon: "time-outline",
    label: "Manage Availability",
    route: "/doctor/availability",
  },

  {
    section: "CLINICAL",
    icon: "clipboard-outline",
    label: "Appointment Details",
    route: "/doctor/appointments",
    requiresOffline: true,
  },
  {
    section: "CLINICAL",
    icon: "videocam-outline",
    label: "Consultation Details",
    route: "/doctor/consultations",
    requiresOnline: true,
  },
  

  {
    section: "FINANCE",
    icon: "card-outline",
    label: "Transactions",
    route: "/doctor/transactions",
  },
  {
    section: "FINANCE",
    icon: "person-circle-outline",
    label: "My Profile",
    route: "/doctor/profile",
  },
];

export default function DoctorDrawer({
  visible,
  onClose,
  activeRoute,
}: DoctorDrawerProps) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const [doctorName, setDoctorName] =
    useState("Doctor");

  const [specialization, setSpecialization] =
    useState("Doctor");

  const [profileImage, setProfileImage] =
    useState("");

  const [hasOnline, setHasOnline] =
    useState<boolean | null>(null);

  const [hasOffline, setHasOffline] =
    useState<boolean | null>(null);

  const [logoutOpen, setLogoutOpen] =
    useState(false);

  /* =========================================================
     IMAGE URL
  ========================================================= */

  const resolveImageUrl = useCallback(
    (url?: string | null) => {
      if (!url) {
        return "";
      }

      const value = String(url).trim();

      if (!value) {
        return "";
      }

      const backendRoot =
        API_BASE_URL.replace(/\/api\/?$/, "");

      if (
        value.startsWith("http://") ||
        value.startsWith("https://")
      ) {
        if (
          value.includes("localhost:8085") ||
          value.includes("127.0.0.1:8085")
        ) {
          return value.replace(
            /^https?:\/\/(localhost|127\.0\.0\.1):8085/i,
            backendRoot
          );
        }

        return value;
      }

      return `${backendRoot}${
        value.startsWith("/") ? "" : "/"
      }${value}`;
    },
    []
  );

  /* =========================================================
     LOAD DOCTOR
  ========================================================= */

  const loadDoctorContext =
    useCallback(async () => {
      try {
        const [
          savedName,
          savedSpecialization,
          savedImage,
          savedDoctor,
          savedOnline,
          savedOffline,
        ] = await Promise.all([
          AsyncStorage.getItem("doctorName"),
          AsyncStorage.getItem(
            "doctorSpecialization"
          ),
          AsyncStorage.getItem(
            "doctorProfileImageUrl"
          ),
          AsyncStorage.getItem("doctor"),
          AsyncStorage.getItem(
            "doctorHasOnline"
          ),
          AsyncStorage.getItem(
            "doctorHasOffline"
          ),
        ]);

        let name =
          savedName || "Doctor";

        let spec =
          savedSpecialization || "Doctor";

        let image =
          savedImage || "";

        if (savedDoctor) {
          try {
            const doctor =
              JSON.parse(savedDoctor);

            name =
              doctor?.name ||
              doctor?.doctorName ||
              name;

            spec =
              doctor?.specialization ||
              spec;

            image =
              doctor?.imageUrl ||
              doctor?.profileImageUrl ||
              doctor?.profileImage ||
              image;
          } catch (error) {
            console.log(
              "DoctorDrawer parse error:",
              error
            );
          }
        }

        setDoctorName(
          String(name || "Doctor")
        );

        setSpecialization(
          String(spec || "Doctor")
        );

        setProfileImage(
          resolveImageUrl(image)
        );

        setHasOnline(
          savedOnline === null
            ? null
            : savedOnline === "true"
        );

        setHasOffline(
          savedOffline === null
            ? null
            : savedOffline === "true"
        );
      } catch (error) {
        console.log(
          "DoctorDrawer load error:",
          error
        );

        setDoctorName("Doctor");
        setSpecialization("Doctor");
        setProfileImage("");
        setHasOnline(null);
        setHasOffline(null);
      }
    }, [resolveImageUrl]);

  useFocusEffect(
    useCallback(() => {
      if (visible) {
        loadDoctorContext();
      }
    }, [
      visible,
      loadDoctorContext,
    ])
  );

  /* =========================================================
     DOCTOR INITIAL
  ========================================================= */

  const cleanName = String(
    doctorName || "Doctor"
  )
    .replace(/^Dr\.?\s*/i, "")
    .trim();

  const initial =
    cleanName.charAt(0).toUpperCase() ||
    "D";

  /* =========================================================
     MENU FILTER
  ========================================================= */

  const visibleMenu =
    useMemo(() => {
      return MENU_ITEMS.filter(
        (item) => {
          if (
            item.requiresOnline &&
            hasOnline === false
          ) {
            return false;
          }

          if (
            item.requiresOffline &&
            hasOffline === false
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      hasOnline,
      hasOffline,
    ]);

  const currentRoute =
    activeRoute || pathname;

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function openRoute(route: string) {
    onClose();

    if (
      currentRoute === route ||
      pathname === route
    ) {
      return;
    }

    router.push(route as any);
  }

  /* =========================================================
     LOGOUT
  ========================================================= */

  async function logoutDoctor() {
    await AsyncStorage.multiRemove([
      "doctorToken",
      "doctorRefreshToken",
      "token",
      "refreshToken",
      "accessToken",

      "userId",
      "email",
      "name",
      "role",

      "doctorId",
      "doctor",
      "doctorName",
      "doctorSpecialization",

      "doctorHasOnline",
      "doctorHasOffline",

      "doctorProfileImageUrl",
      "doctorProfileImageId",

      "profileCompleted",
      "isLoggedIn",
    ]);

    setLogoutOpen(false);

    onClose();

    router.replace(
      "/login" as any
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.root}>
          <Pressable
            style={styles.backdrop}
            onPress={onClose}
          />

          <View
            style={[
              styles.drawer,
              {
                paddingTop:
                  Math.max(
                    insets.top,
                    8
                  ) + 8,

                paddingBottom:
                  Math.max(
                    insets.bottom,
                    8
                  ) + 4,
              },
            ]}
          >
            {/* ==============================
                BRAND HEADER
            ============================== */}

            <View style={styles.brandRow}>
              <Image
                source={require("../assets/images/main_logo.jpeg")}
                style={styles.logo}
                resizeMode="cover"
              />

              <View
                style={
                  styles.brandTextWrap
                }
              >
                <Text
                  style={styles.brand}
                >
                  NeoLife
                </Text>

                <Text
                  style={styles.portal}
                >
                  DOCTOR PORTAL
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.closeButton
                }
                activeOpacity={0.8}
                onPress={onClose}
              >
                <Ionicons
                  name="close"
                  size={27}
                  color={GREEN}
                />
              </TouchableOpacity>
            </View>

            {/* ==============================
                DOCTOR CARD
            ============================== */}

            <TouchableOpacity
              style={styles.doctorCard}
              activeOpacity={0.85}
              onPress={() =>
                openRoute(
                  "/doctor/profile"
                )
              }
            >
              <View
                style={styles.avatar}
              >
                {profileImage ? (
                  <Image
                    source={{
                      uri: profileImage,
                    }}
                    style={
                      styles.avatarImage
                    }
                    resizeMode="cover"
                    onError={(event) => {
                      console.log(
                        "Drawer doctor image failed:",
                        event.nativeEvent
                          .error
                      );

                      console.log(
                        "Drawer image URL:",
                        profileImage
                      );

                      setProfileImage(
                        ""
                      );
                    }}
                  />
                ) : (
                  <Text
                    style={
                      styles.avatarText
                    }
                  >
                    {initial}
                  </Text>
                )}
              </View>

              <View
                style={
                  styles.doctorInfo
                }
              >
                <Text
                  numberOfLines={1}
                  style={
                    styles.doctorName
                  }
                >
                  {doctorName}
                </Text>

                <Text
                  numberOfLines={1}
                  style={
                    styles.doctorRole
                  }
                >
                  {specialization ||
                    "Doctor"}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#A7B2AC"
              />
            </TouchableOpacity>

            {/* ==============================
                SCROLLABLE MENU
            ============================== */}

            <View
              style={
                styles.menuArea
              }
            >
              <ScrollView
                style={
                  styles.menuScroll
                }
                showsVerticalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.menuContent
                }
                keyboardShouldPersistTaps="handled"
              >
                {(
                  [
                    "MAIN",
                    "CLINICAL",
                    "FINANCE",
                  ] as const
                ).map(
                  (section) => {
                    const items =
                      visibleMenu.filter(
                        (item) =>
                          item.section ===
                          section
                      );

                    if (
                      items.length === 0
                    ) {
                      return null;
                    }

                    return (
                      <View
                        key={
                          section
                        }
                        style={
                          styles.section
                        }
                      >
                        <Text
                          style={
                            styles.sectionLabel
                          }
                        >
                          {section}
                        </Text>

                        {items.map(
                          (item) => {
                            const active =
                              currentRoute ===
                                item.route ||
                              pathname ===
                                item.route;

                            return (
                              <TouchableOpacity
                                key={
                                  item.route
                                }
                                style={[
                                  styles.menuItem,

                                  active &&
                                    styles.menuItemActive,
                                ]}
                                activeOpacity={
                                  0.82
                                }
                                onPress={() =>
                                  openRoute(
                                    item.route
                                  )
                                }
                              >
                                <View
                                  style={[
                                    styles.menuIcon,

                                    active &&
                                      styles.menuIconActive,
                                  ]}
                                >
                                  <Ionicons
                                    name={
                                      item.icon
                                    }
                                    size={
                                      21
                                    }
                                    color={
                                      active
                                        ? GREEN
                                        : GOLD
                                    }
                                  />
                                </View>

                                <Text
                                  style={[
                                    styles.menuText,

                                    active &&
                                      styles.menuTextActive,
                                  ]}
                                  numberOfLines={
                                    1
                                  }
                                >
                                  {
                                    item.label
                                  }
                                </Text>

                                <Ionicons
                                  name="chevron-forward"
                                  size={
                                    18
                                  }
                                  color={
                                    active
                                      ? GREEN
                                      : "#AAB4AE"
                                  }
                                />
                              </TouchableOpacity>
                            );
                          }
                        )}
                      </View>
                    );
                  }
                )}

                {/* extra space so finance
                    is never hidden */}
                <View
                  style={{
                    height: 18,
                  }}
                />
              </ScrollView>
            </View>

            {/* ==============================
                LOGOUT - FIXED
            ============================== */}

            <View
              style={
                styles.logoutArea
              }
            >
              <TouchableOpacity
                style={
                  styles.logoutButton
                }
                activeOpacity={0.88}
                onPress={() =>
                  setLogoutOpen(true)
                }
              >
                <Ionicons
                  name="log-out-outline"
                  size={22}
                  color={WHITE}
                />

                <Text
                  style={
                    styles.logoutText
                  }
                >
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          LOGOUT CONFIRMATION
      ===================================================== */}

      <Modal
        visible={logoutOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setLogoutOpen(false)
        }
      >
        <View
          style={
            styles.confirmRoot
          }
        >
          <Pressable
            style={
              styles.confirmBackdrop
            }
            onPress={() =>
              setLogoutOpen(false)
            }
          />

          <View
            style={
              styles.confirmCard
            }
          >
            <View
              style={
                styles.confirmIcon
              }
            >
              <Ionicons
                name="log-out-outline"
                size={31}
                color={DANGER}
              />
            </View>

            <Text
              style={
                styles.confirmEyebrow
              }
            >
              NEOLIFE DOCTOR PORTAL
            </Text>

            <Text
              style={
                styles.confirmTitle
              }
            >
              Log Out?
            </Text>

            <Text
              style={
                styles.confirmText
              }
            >
              Are you sure you want to
              leave your doctor workspace?
            </Text>

            <View
              style={
                styles.confirmActions
              }
            >
              <TouchableOpacity
                style={
                  styles.cancelButton
                }
                activeOpacity={0.85}
                onPress={() =>
                  setLogoutOpen(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.cancelText
                  }
                >
                  Stay Logged In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.confirmButton
                }
                activeOpacity={0.85}
                onPress={
                  logoutDoctor
                }
              >
                <Text
                  style={
                    styles.confirmButtonText
                  }
                >
                  Log Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(5, 30, 22, 0.55)",
  },

  drawer: {
    width: "86%",
    maxWidth: 370,
    height: "100%",

    paddingHorizontal: 16,

    backgroundColor: CREAM,

    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,

    overflow: "hidden",
  },

  /* BRAND */

  brandRow: {
    minHeight: 62,

    flexDirection: "row",
    alignItems: "center",

    gap: 11,

    marginBottom: 14,
  },

  logo: {
    width: 52,
    height: 52,

    borderRadius: 15,

    borderWidth: 1,
    borderColor: BORDER,
  },

  brandTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  brand: {
    fontFamily:
      "PlayfairDisplay_700Bold",

    color: GREEN,

    fontSize: 23,
    lineHeight: 27,
  },

  portal: {
    marginTop: 1,

    fontFamily:
      "DMSans_700Bold",

    color: GOLD,

    fontSize: 8,

    letterSpacing: 1.5,
  },

  closeButton: {
    width: 46,
    height: 46,

    borderRadius: 15,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: MINT,
  },

  /* DOCTOR CARD */

  doctorCard: {
    minHeight: 92,

    padding: 13,

    borderRadius: 22,

    flexDirection: "row",
    alignItems: "center",

    gap: 12,

    backgroundColor: WHITE,

    borderWidth: 1,
    borderColor: BORDER,
  },

  avatar: {
    width: 58,
    height: 58,

    borderRadius: 18,

    overflow: "hidden",

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: GREEN,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarText: {
    fontFamily:
      "DMSans_700Bold",

    color: WHITE,

    fontSize: 21,
  },

  doctorInfo: {
    flex: 1,
    minWidth: 0,
  },

  doctorName: {
    fontFamily:
      "DMSans_700Bold",

    color: GREEN,

    fontSize: 14,
    lineHeight: 18,
  },

  doctorRole: {
    marginTop: 4,

    fontFamily:
      "DMSans_400Regular",

    color: MUTED,

    fontSize: 11,
  },

  /* MENU */

  menuArea: {
    flex: 1,
    minHeight: 0,
  },

  menuScroll: {
    flex: 1,
  },

  menuContent: {
    paddingTop: 7,
    paddingBottom: 18,
  },

  section: {
    marginTop: 14,
  },

  sectionLabel: {
    marginBottom: 6,

    paddingHorizontal: 8,

    fontFamily:
      "DMSans_700Bold",

    color: GOLD,

    fontSize: 8,

    letterSpacing: 1.5,
  },

  menuItem: {
    minHeight: 52,

    marginBottom: 2,

    paddingHorizontal: 9,

    borderRadius: 16,

    flexDirection: "row",
    alignItems: "center",

    gap: 11,
  },

  menuItemActive: {
    backgroundColor: MINT,
  },

  menuIcon: {
    width: 39,
    height: 39,

    borderRadius: 12,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#F4F6F2",
  },

  menuIconActive: {
    backgroundColor: WHITE,

    borderWidth: 1,
    borderColor: "#D8E6DE",
  },

  menuText: {
    flex: 1,

    fontFamily:
      "DMSans_500Medium",

    color: GREEN_2,

    fontSize: 12.5,
  },

  menuTextActive: {
    fontFamily:
      "DMSans_700Bold",

    color: GREEN,
  },

  /* LOGOUT */

  logoutArea: {
    paddingTop: 10,

    borderTopWidth: 1,
    borderTopColor: BORDER,

    backgroundColor: CREAM,
  },

  logoutButton: {
    minHeight: 54,

    borderRadius: 18,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 10,

    backgroundColor: GREEN,
  },

  logoutText: {
    fontFamily:
      "DMSans_700Bold",

    color: WHITE,

    fontSize: 13,
  },

  /* CONFIRM MODAL */

  confirmRoot: {
    flex: 1,

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 24,
  },

  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      "rgba(5,30,22,0.68)",
  },

  confirmCard: {
    width: "100%",
    maxWidth: 360,

    padding: 24,

    borderRadius: 28,

    alignItems: "center",

    backgroundColor: CREAM,
  },

  confirmIcon: {
    width: 62,
    height: 62,

    borderRadius: 20,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: DANGER_LIGHT,
  },

  confirmEyebrow: {
    marginTop: 14,

    fontFamily:
      "DMSans_700Bold",

    color: GOLD,

    fontSize: 8,

    letterSpacing: 1.3,
  },

  confirmTitle: {
    marginTop: 7,

    fontFamily:
      "PlayfairDisplay_700Bold",

    color: GREEN,

    fontSize: 27,
  },

  confirmText: {
    marginTop: 8,

    maxWidth: 280,

    fontFamily:
      "DMSans_400Regular",

    color: MUTED,

    textAlign: "center",

    fontSize: 12,

    lineHeight: 18,
  },

  confirmActions: {
    width: "100%",

    marginTop: 22,

    flexDirection: "row",

    gap: 10,
  },

  cancelButton: {
    flex: 1,

    minHeight: 49,

    paddingHorizontal: 8,

    borderRadius: 15,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: WHITE,

    borderWidth: 1,
    borderColor: BORDER,
  },

  cancelText: {
    fontFamily:
      "DMSans_700Bold",

    color: GREEN,

    fontSize: 10,
  },

  confirmButton: {
    flex: 1,

    minHeight: 49,

    borderRadius: 15,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: DANGER,
  },

  confirmButtonText: {
    fontFamily:
      "DMSans_700Bold",

    color: WHITE,

    fontSize: 11,
  },
});