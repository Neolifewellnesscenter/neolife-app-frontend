import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

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
import React, { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { API_BASE_URL } from "../../services/api";

/* =========================================================
   COLORS
========================================================= */

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
const SUCCESS = "#2E7D52";
const SUCCESS_LIGHT = "#EAF6EF";
const WARNING = "#C88723";
const WARNING_LIGHT = "#FFF6E7";
const INFO = "#397A9A";
const INFO_LIGHT = "#EDF7FC";

/* =========================================================
   TYPES
========================================================= */

type DoctorProfile = {
  id?: number;
  userId?: number | string;
  name?: string;
  doctorName?: string;
  email?: string;
  phoneNumber?: string;
  phone?: string;
  qualification?: string;
  specialization?: string;
  experience?: number | string;
  registrationNumber?: string;
  about?: string;
  imageUrl?: string | null;
  imageId?: number | string;
  active?: boolean;
};

type NoticeType = "success" | "error" | "warning" | "info";

type NoticeState = {
  visible: boolean;
  type: NoticeType;
  title: string;
  message: string;
  goToDashboard?: boolean;
};

type SelectedImage = {
  uri: string;
  name: string;
  type: string;
  size?: number;
};

type MenuItem = {
  icon: any;
  label: string;
  route: string;
  section: "MAIN" | "CLINICAL" | "FINANCE";
  requiresOnline?: boolean;
  requiresOffline?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  {
    icon: "grid-outline",
    label: "Dashboard",
    route: "/doctor/dashboard",
    section: "MAIN",
  },
  {
    icon: "people-outline",
    label: "Patients",
    route: "/doctor/patients",
    section: "MAIN",
  },
  {
    icon: "calendar-outline",
    label: "Appointment Calendar",
    route: "/doctor/calendar",
    section: "MAIN",
  },
  {
    icon: "calendar-number-outline",
    label: "Upcoming Schedule",
    route: "/doctor/schedule",
    section: "MAIN",
  },
  {
    icon: "time-outline",
    label: "Manage Availability",
    route: "/doctor/availability",
    section: "MAIN",
  },
  {
    icon: "clipboard-outline",
    label: "Appointment Details",
    route: "/doctor/appointments",
    section: "CLINICAL",
    requiresOffline: true,
  },
  {
    icon: "videocam-outline",
    label: "Consultation Details",
    route: "/doctor/consultations",
    section: "CLINICAL",
    requiresOnline: true,
  },
  {
    icon: "card-outline",
    label: "Transactions",
    route: "/doctor/transactions",
    section: "FINANCE",
  },
  {
    icon: "person-circle-outline",
    label: "My Profile",
    route: "/doctor/profile",
    section: "FINANCE",
  },
];

/* =========================================================
   SCREEN
========================================================= */

export default function DoctorProfileScreen() {
  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const [profile, setProfile] = useState<DoctorProfile>({});
  const [profileExists, setProfileExists] = useState(false);
  const [editing, setEditing] = useState(false);

  const [hasOnline, setHasOnline] = useState<boolean | null>(null);
  const [hasOffline, setHasOffline] = useState<boolean | null>(null);

  const [qualification, setQualification] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experience, setExperience] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [about, setAbout] = useState("");

  const [selectedImage, setSelectedImage] =
    useState<SelectedImage | null>(null);

  const [removeExistingImage, setRemoveExistingImage] =
    useState(false);

  const [notice, setNotice] = useState<NoticeState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  /* =======================================================
     HELPERS
  ======================================================= */

  function showNotice(
    type: NoticeType,
    title: string,
    message: string,
    goToDashboard = false
  ) {
    setNotice({
      visible: true,
      type,
      title,
      message,
      goToDashboard,
    });
  }

  async function getToken() {
    return (
      (await AsyncStorage.getItem("doctorToken")) ||
      (await AsyncStorage.getItem("token")) ||
      ""
    );
  }

  async function clearSession() {
    await AsyncStorage.multiRemove([
      "doctorToken",
      "doctorRefreshToken",
      "token",
      "refreshToken",
      "doctorId",
      "doctorName",
      "doctorHasOnline",
      "doctorHasOffline",
      "doctorRegistrationNumber",
      "doctorProfileImageUrl",
      "doctorProfileImageId",
      "doctor",
      "role",
      "userId",
      "email",
      "profileCompleted",
      "isLoggedIn",
    ]);
  }

  async function apiRequest(
    endpoint: string,
    options: RequestInit = {}
  ) {
    const token = await getToken();

    if (!token) {
      await clearSession();
      router.replace("/login" as any);
      throw new Error("Doctor login required.");
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers as Record<string, string> | undefined),
    };

    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    headers.Authorization = `Bearer ${token}`;

    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
      }
    );

    const text = await response.text();

    let result: any = {};

    if (text) {
      try {
        result = JSON.parse(text);
      } catch {
        result = {
          success: false,
          message:
            text ||
            `Invalid server response (${response.status}).`,
        };
      }
    }

    if (response.status === 401 || response.status === 403) {
      await clearSession();

      showNotice(
        "error",
        "Session Expired",
        result?.message ||
          "Your doctor session has expired. Please sign in again."
      );

      setTimeout(() => {
        router.replace("/login" as any);
      }, 900);

      throw new Error(
        result?.message ||
          "Doctor session expired."
      );
    }

    if (!response.ok || result?.success === false) {
      throw new Error(
        result?.message ||
          `Request failed (${response.status}).`
      );
    }

    return result;
  }

  function doctorNameOf(value: DoctorProfile) {
    return (
      value.name ||
      value.doctorName ||
      "Doctor"
    );
  }

  function doctorInitialOf(value: DoctorProfile) {
    const clean = doctorNameOf(value)
      .replace(/^Dr\.?\s*/i, "")
      .trim();

    return (
      clean.charAt(0).toUpperCase() || "D"
    );
  }

  function resolveImageUrl(
    url?: string | null
  ) {
    if (!url) {
      return "";
    }

    const value = String(url).trim();

    if (!value) {
      return "";
    }

    /*
     * API_BASE_URL in the mobile app is usually:
     * http://<LAN-IP>:8085/api
     *
     * Image APIs may return:
     * 1. a complete http/https URL
     * 2. a localhost URL
     * 3. a relative path such as /uploads/...
     *
     * A physical phone cannot use localhost from the computer,
     * so replace localhost with the host already used by API_BASE_URL.
     */
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
  }

  function profileImageOf(
    value: DoctorProfile
  ) {
    return resolveImageUrl(
      value.imageUrl
    );
  }

  async function validateDoctorAccess() {
    const token = await getToken();

    const role = String(
      (await AsyncStorage.getItem("role")) ||
        ""
    ).toUpperCase();

    if (!token) {
      router.replace("/login" as any);
      return false;
    }

    if (role && role !== "DOCTOR") {
      await clearSession();

      showNotice(
        "error",
        "Doctor Access Only",
        "This page is available only for doctor accounts."
      );

      setTimeout(() => {
        router.replace("/login" as any);
      }, 900);

      return false;
    }

    return true;
  }

  function applyForm(profileValue: DoctorProfile) {
    setQualification(
      String(profileValue.qualification || "")
    );

    setSpecialization(
      String(profileValue.specialization || "")
    );

    setExperience(
      profileValue.experience != null
        ? String(profileValue.experience)
        : ""
    );

    setRegistrationNumber(
      String(
        profileValue.registrationNumber ||
          ""
      )
    );

    setAbout(
      String(profileValue.about || "")
    );
  }

  /* =======================================================
     LOAD PROFILE
  ======================================================= */

  async function loadDoctorProfile() {
    try {
      const result = await apiRequest(
        "/doctors/my-profile"
      );

      const doctor: DoctorProfile =
        result?.data || {};

      const exists = Boolean(doctor?.id);

      setProfile(doctor);
      setProfileExists(exists);
      setEditing(!exists);

      applyForm(doctor);

      setSelectedImage(null);
      setRemoveExistingImage(false);

      const doctorName =
        doctorNameOf(doctor);

      await AsyncStorage.setItem(
        "doctorName",
        doctorName
      );

      await AsyncStorage.setItem(
        "doctor",
        JSON.stringify(doctor)
      );

      await AsyncStorage.setItem(
        "profileCompleted",
        exists ? "true" : "false"
      );

      if (doctor.id != null) {
        await AsyncStorage.setItem(
          "doctorId",
          String(doctor.id)
        );
      }

      if (doctor.userId != null) {
        await AsyncStorage.setItem(
          "userId",
          String(doctor.userId)
        );
      }

      if (doctor.email) {
        await AsyncStorage.setItem(
          "email",
          doctor.email
        );
      }

      const phone =
        doctor.phoneNumber ||
        doctor.phone;

      if (phone) {
        await AsyncStorage.setItem(
          "phoneNumber",
          phone
        );
      }

      if (doctor.registrationNumber) {
        await AsyncStorage.setItem(
          "doctorRegistrationNumber",
          doctor.registrationNumber
        );
      }

      if (doctor.imageUrl) {
        await AsyncStorage.setItem(
          "doctorProfileImageUrl",
          doctor.imageUrl
        );
      }

      return doctor;
    } catch (error: any) {
      /*
       * The website treats failure to load /doctors/my-profile
       * as "professional profile not completed yet".
       * We do the same, but we DO NOT call /users/getProfile,
       * because that endpoint may be USER-only.
       */

      const savedDoctorRaw =
        await AsyncStorage.getItem("doctor");

      let savedDoctor: DoctorProfile = {};

      try {
        savedDoctor = savedDoctorRaw
          ? JSON.parse(savedDoctorRaw)
          : {};
      } catch {
        savedDoctor = {};
      }

      const fallback: DoctorProfile = {
        ...savedDoctor,
        name:
          savedDoctor.name ||
          (await AsyncStorage.getItem(
            "doctorName"
          )) ||
          "Doctor",
        email:
          savedDoctor.email ||
          (await AsyncStorage.getItem(
            "email"
          )) ||
          "",
        phoneNumber:
          savedDoctor.phoneNumber ||
          (await AsyncStorage.getItem(
            "phoneNumber"
          )) ||
          "",
        registrationNumber:
          savedDoctor.registrationNumber ||
          (await AsyncStorage.getItem(
            "doctorRegistrationNumber"
          )) ||
          "",
        imageUrl:
          savedDoctor.imageUrl ||
          (await AsyncStorage.getItem(
            "doctorProfileImageUrl"
          )) ||
          "",
        active:
          savedDoctor.active ?? true,
      };

      setProfile(fallback);
      setProfileExists(false);
      setEditing(true);

      applyForm(fallback);

      await AsyncStorage.setItem(
        "profileCompleted",
        "false"
      );

      showNotice(
        "info",
        "Complete Your Professional Profile",
        "Enter your professional information to finish setting up your doctor account."
      );

      return fallback;
    }
  }

  /* =======================================================
     AVAILABILITY MODE
  ======================================================= */

  async function loadDoctorConsultationModes(
    doctorValue?: DoctorProfile
  ) {
    let doctorId =
      doctorValue?.id ||
      profile.id;

    if (!doctorId) {
      const stored =
        await AsyncStorage.getItem(
          "doctorId"
        );

      doctorId = Number(stored) || undefined;
    }

    if (!doctorId) {
      setHasOnline(null);
      setHasOffline(null);
      return;
    }

    try {
      const result = await apiRequest(
        `/doctor-availability/doctor/${encodeURIComponent(
          String(doctorId)
        )}`
      );

      const availability = Array.isArray(
        result
      )
        ? result
        : Array.isArray(result?.data)
        ? result.data
        : Array.isArray(
            result?.data?.content
          )
        ? result.data.content
        : Array.isArray(result?.content)
        ? result.content
        : [];

      const active = availability.filter(
        (slot: any) =>
          slot &&
          slot.active !== false
      );

      const online = active.some(
        (slot: any) =>
          String(
            slot.appointmentMode || ""
          )
            .trim()
            .toUpperCase() === "ONLINE"
      );

      const offline = active.some(
        (slot: any) =>
          String(
            slot.appointmentMode || ""
          )
            .trim()
            .toUpperCase() === "OFFLINE"
      );

      if (!online && !offline) {
        setHasOnline(null);
        setHasOffline(null);

        await AsyncStorage.multiRemove([
          "doctorHasOnline",
          "doctorHasOffline",
        ]);

        return;
      }

      setHasOnline(online);
      setHasOffline(offline);

      await AsyncStorage.multiSet([
        [
          "doctorHasOnline",
          String(online),
        ],
        [
          "doctorHasOffline",
          String(offline),
        ],
      ]);
    } catch {
      const onlineStored =
        await AsyncStorage.getItem(
          "doctorHasOnline"
        );

      const offlineStored =
        await AsyncStorage.getItem(
          "doctorHasOffline"
        );

      if (
        onlineStored !== null ||
        offlineStored !== null
      ) {
        setHasOnline(
          onlineStored === "true"
        );
        setHasOffline(
          offlineStored === "true"
        );
      } else {
        setHasOnline(null);
        setHasOffline(null);
      }
    }
  }

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  async function refreshPage(
    initial = false
  ) {
    try {
      if (initial) {
        setLoading(true);
      }

      const allowed =
        await validateDoctorAccess();

      if (!allowed) return;

      const doctor =
        await loadDoctorProfile();

      await loadDoctorConsultationModes(
        doctor
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refreshPage(true);
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await refreshPage(false);
  }

  /* =======================================================
     EDIT
  ======================================================= */

  function startEditing() {
    applyForm(profile);
    setSelectedImage(null);
    setRemoveExistingImage(false);
    setEditing(true);
  }

  function cancelEditing() {
    if (!profileExists) {
      return;
    }

    applyForm(profile);
    setSelectedImage(null);
    setRemoveExistingImage(false);
    setEditing(false);
  }

  /* =======================================================
     IMAGE PICKER
  ======================================================= */

  async function chooseImage() {
    if (!editing || uploadingImage) {
      return;
    }

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showNotice(
        "warning",
        "Photo Permission Required",
        "Allow photo access so you can select a doctor profile image."
      );

      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

    if (result.canceled) {
      return;
    }

    const asset = result.assets?.[0];

    if (!asset?.uri) {
      return;
    }

    const mimeType =
      asset.mimeType ||
      guessImageMimeType(
        asset.fileName || asset.uri
      );

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(mimeType)) {
      showNotice(
        "error",
        "Unsupported Image",
        "Please select a JPG, PNG or WEBP image."
      );
      return;
    }

    if (
      typeof asset.fileSize === "number" &&
      asset.fileSize > 5 * 1024 * 1024
    ) {
      showNotice(
        "error",
        "Image Too Large",
        "Profile image must be smaller than 5 MB."
      );
      return;
    }

    setSelectedImage({
      uri: asset.uri,
      name:
        asset.fileName ||
        `doctor-profile-${Date.now()}.${extensionFromMimeType(
          mimeType
        )}`,
      type: mimeType,
      size: asset.fileSize,
    });

    setRemoveExistingImage(false);
  }

  function removeImage() {
    if (!editing) return;

    setSelectedImage(null);
    setRemoveExistingImage(true);
  }

  function guessImageMimeType(
    value: string
  ) {
    const lower =
      String(value).toLowerCase();

    if (lower.endsWith(".png")) {
      return "image/png";
    }

    if (lower.endsWith(".webp")) {
      return "image/webp";
    }

    return "image/jpeg";
  }

  function extensionFromMimeType(
    mime: string
  ) {
    if (mime === "image/png") {
      return "png";
    }

    if (mime === "image/webp") {
      return "webp";
    }

    return "jpg";
  }

  async function uploadDoctorProfileImage(
    file: SelectedImage
  ) {
    const token = await getToken();

    if (!token) {
      throw new Error(
        "Doctor login required."
      );
    }

    const imageId =
      profile.imageId ||
      (await AsyncStorage.getItem(
        "doctorProfileImageId"
      ));

    const formData = new FormData();

    formData.append(
      "file",
      {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any
    );

    formData.append("module", "DOCTOR");

    const endpoint = imageId
      ? `/images/update/${encodeURIComponent(
          String(imageId)
        )}`
      : "/images/upload";

    const method = imageId
      ? "PUT"
      : "POST";

    try {
      setUploadingImage(true);

      const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          method,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const text = await response.text();

      let result: any = {};

      if (text) {
        try {
          result = JSON.parse(text);
        } catch {
          result = {};
        }
      }

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        await clearSession();

        throw new Error(
          result?.message ||
            "Your session has expired."
        );
      }

      if (
        !response.ok ||
        result?.success === false
      ) {
        throw new Error(
          result?.message ||
            "Unable to upload profile image."
        );
      }

      if (!result?.data?.fileUrl) {
        throw new Error(
          "The upload API did not return a file URL."
        );
      }

      if (result?.data?.id) {
        await AsyncStorage.setItem(
          "doctorProfileImageId",
          String(result.data.id)
        );
      }

      return result.data;
    } finally {
      setUploadingImage(false);
    }
  }

  /* =======================================================
     VALIDATION
  ======================================================= */

  function validateProfile() {
    const qualificationValue =
      qualification.trim();

    const specializationValue =
      specialization.trim();

    const registrationValue =
      registrationNumber.trim();

    const aboutValue = about.trim();

    if (
      qualificationValue.length < 2
    ) {
      showNotice(
        "warning",
        "Qualification Required",
        "Please enter a valid qualification."
      );
      return false;
    }

    if (
      specializationValue.length < 2
    ) {
      showNotice(
        "warning",
        "Specialization Required",
        "Please enter a valid specialization."
      );
      return false;
    }

    const experienceNumber =
      Number(experience);

    if (
      experience.trim() === "" ||
      Number.isNaN(experienceNumber) ||
      experienceNumber < 0 ||
      experienceNumber > 70
    ) {
      showNotice(
        "warning",
        "Check Experience",
        "Experience must be between 0 and 70 years."
      );
      return false;
    }

    if (registrationValue.length < 2) {
      showNotice(
        "warning",
        "Registration Required",
        "Please enter your registration number."
      );
      return false;
    }

    if (aboutValue.length < 10) {
      showNotice(
        "warning",
        "Tell Patients About You",
        "About Doctor must contain at least 10 characters."
      );
      return false;
    }

    return true;
  }

  /* =======================================================
     SAVE
  ======================================================= */

  async function saveProfile() {
    if (!validateProfile()) {
      return;
    }

    try {
      setSaving(true);

      let imageUrl =
        profile.imageUrl || null;

      let newImageId:
        | number
        | string
        | undefined = profile.imageId;

      if (selectedImage) {
        const uploaded =
          await uploadDoctorProfileImage(
            selectedImage
          );

        imageUrl =
          uploaded.fileUrl || null;

        if (uploaded.id) {
          newImageId = uploaded.id;
        }

        if (imageUrl) {
          await AsyncStorage.setItem(
            "doctorProfileImageUrl",
            imageUrl
          );
        }
      } else if (
        removeExistingImage
      ) {
        imageUrl = null;

        await AsyncStorage.removeItem(
          "doctorProfileImageUrl"
        );
      }

      const payload = {
        qualification:
          qualification.trim(),
        specialization:
          specialization.trim(),
        experience:
          Number(experience),
        about:
          about.trim(),
        imageUrl,
        registrationNumber:
          registrationNumber.trim(),
      };

      let result: any;

      if (
        profileExists &&
        profile.id
      ) {
        result = await apiRequest(
          `/doctors/update/${encodeURIComponent(
            String(profile.id)
          )}`,
          {
            method: "PUT",
            body: JSON.stringify(
              payload
            ),
          }
        );
      } else {
        result = await apiRequest(
          "/doctors/complete-profile",
          {
            method: "POST",
            body: JSON.stringify(
              payload
            ),
          }
        );
      }

      const responseDoctor: DoctorProfile =
        result?.data || {};

      const updated: DoctorProfile = {
        ...profile,
        ...responseDoctor,
        registrationNumber:
          responseDoctor.registrationNumber ||
          payload.registrationNumber,
        imageUrl:
          responseDoctor.imageUrl ??
          payload.imageUrl,
        imageId:
          responseDoctor.imageId ||
          newImageId,
      };

      const exists =
        Boolean(updated.id);

      setProfile(updated);
      setProfileExists(exists);
      setEditing(false);

      applyForm(updated);

      setSelectedImage(null);
      setRemoveExistingImage(false);

      await AsyncStorage.multiSet([
        [
          "profileCompleted",
          "true",
        ],
        [
          "doctorName",
          doctorNameOf(updated),
        ],
        [
          "doctor",
          JSON.stringify(updated),
        ],
        [
          "doctorRegistrationNumber",
          updated.registrationNumber ||
            "",
        ],
      ]);

      if (updated.id != null) {
        await AsyncStorage.setItem(
          "doctorId",
          String(updated.id)
        );
      }

      if (updated.imageUrl) {
        await AsyncStorage.setItem(
          "doctorProfileImageUrl",
          updated.imageUrl
        );
      }

      if (updated.imageId) {
        await AsyncStorage.setItem(
          "doctorProfileImageId",
          String(updated.imageId)
        );
      }

      await loadDoctorConsultationModes(
        updated
      );

      showNotice(
        "success",
        profileExists
          ? "Profile Updated"
          : "Profile Completed",
        result?.message ||
          (profileExists
            ? "Your professional information has been saved successfully."
            : "Your doctor profile is complete. You can now continue to your dashboard."),
        !profileExists
      );
    } catch (error: any) {
      console.log(
        "Doctor profile save failed:",
        error
      );

      showNotice(
        "error",
        "Unable to Save Profile",
        error?.message ||
          "Your doctor profile could not be saved. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function logoutDoctor() {
    await clearSession();

    setLogoutOpen(false);

    router.replace("/login" as any);
  }

  /* =======================================================
     IMAGE PREVIEW
  ======================================================= */

  const previewImage = useMemo(() => {
    if (selectedImage?.uri) {
      return selectedImage.uri;
    }

    if (removeExistingImage) {
      return "";
    }

    return profileImageOf(profile);
  }, [
    selectedImage,
    removeExistingImage,
    profile.imageUrl,
  ]);

  const doctorName =
    doctorNameOf(profile);

  const initial =
    doctorInitialOf(profile);

  /* =======================================================
     MENU FILTER
  ======================================================= */

  const visibleMenu = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
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
    });
  }, [hasOnline, hasOffline]);

  /* =======================================================
     LOADER
  ======================================================= */

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.fullLoader}>
        <ActivityIndicator
          size="large"
          color={GREEN}
        />

        <Text style={styles.loaderText}>
          Preparing doctor profile...
        </Text>
      </View>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <View style={styles.screen}>
      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() =>
            setMenuOpen(true)
          }
          activeOpacity={0.85}
        >
          <Ionicons
            name="menu-outline"
            size={25}
            color={GREEN}
          />
        </TouchableOpacity>

        <View
          style={styles.headerTextWrap}
        >
          <Text
            style={styles.headerEyebrow}
          >
            DOCTOR PORTAL
          </Text>

          <Text
            style={styles.headerTitle}
          >
            My Profile
          </Text>
        </View>

        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() =>
            router.replace(
              "/doctor/dashboard" as any
            )
          }
          activeOpacity={0.85}
        >
          <Ionicons
            name="grid-outline"
            size={20}
            color={GREEN}
          />
        </TouchableOpacity>

        <View
          style={styles.topAvatar}
        >
          {profileImageOf(profile) ? (
            <Image
              source={{
                uri: profileImageOf(profile),
              }}
              style={
                styles.topAvatarImage
              }
              resizeMode="cover"
              onError={(event) => {
                console.log(
                  "Doctor header image failed:",
                  event.nativeEvent.error
                );
                console.log(
                  "Resolved doctor image URL:",
                  profileImageOf(profile)
                );
              }}
            />
          ) : (
            <Text
              style={
                styles.topAvatarText
              }
            >
              {initial}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.bodyLoader}>
          <ActivityIndicator
            size="large"
            color={GREEN}
          />

          <Text style={styles.loaderText}>
            Loading doctor profile...
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={GREEN}
                colors={[GREEN]}
              />
            }
            contentContainerStyle={{
              paddingBottom: 35,
            }}
          >
            {/* HERO */}

            <View style={styles.hero}>
              <View
                style={styles.heroGlowOne}
              />

              <View
                style={styles.heroGlowTwo}
              />

              <View
                style={styles.heroBadge}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={14}
                  color={GOLD_LIGHT}
                />

                <Text
                  style={
                    styles.heroBadgeText
                  }
                >
                  DOCTOR PROFILE
                </Text>
              </View>

              <Text
                style={styles.heroTitle}
              >
                Your Professional
                {"\n"}
                <Text
                  style={styles.heroGold}
                >
                  Identity at NeoLife.
                </Text>
              </Text>

              <Text
                style={styles.heroText}
              >
                Review your account
                information and keep your
                professional profile up to
                date.
              </Text>
            </View>

            {/* PROFILE SUMMARY */}

            <View
              style={styles.profileCard}
            >
              <View
                style={
                  styles.profileCover
                }
              />

              <View
                style={
                  styles.profileAvatarWrap
                }
              >
                {previewImage ? (
                  <Image
                    source={{
                      uri: previewImage,
                    }}
                    style={
                      styles.profileAvatarImage
                    }
                    resizeMode="cover"
                    onError={(event) => {
                      console.log(
                        "Doctor profile image failed:",
                        event.nativeEvent.error
                      );
                      console.log(
                        "Resolved doctor image URL:",
                        previewImage
                      );
                    }}
                  />
                ) : (
                  <View
                    style={
                      styles.profileAvatarPlaceholder
                    }
                  >
                    <Text
                      style={
                        styles.profileAvatarPlaceholderText
                      }
                    >
                      {initial}
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={
                  styles.profileSummaryBody
                }
              >
                <Text
                  style={
                    styles.profileName
                  }
                >
                  {doctorName}
                </Text>

                <Text
                  style={
                    styles.profileSpecialization
                  }
                >
                  {profile.specialization ||
                    specialization ||
                    "Doctor"}
                </Text>

                <View
                  style={[
                    styles.activeBadge,
                    profile.active === false
                      ? styles.inactiveBadge
                      : styles.activeDoctorBadge,
                  ]}
                >
                  <Ionicons
                    name={
                      profile.active ===
                      false
                        ? "close-circle-outline"
                        : "checkmark-circle-outline"
                    }
                    size={14}
                    color={
                      profile.active ===
                      false
                        ? DANGER
                        : SUCCESS
                    }
                  />

                  <Text
                    style={[
                      styles.activeBadgeText,
                      {
                        color:
                          profile.active ===
                          false
                            ? DANGER
                            : SUCCESS,
                      },
                    ]}
                  >
                    {profile.active ===
                    false
                      ? "Inactive Doctor"
                      : "Active Doctor"}
                  </Text>
                </View>

                <View
                  style={
                    styles.profileInfoList
                  }
                >
                  <SummaryRow
                    icon="mail-outline"
                    label="Email"
                    value={
                      profile.email || "-"
                    }
                  />

                  <SummaryRow
                    icon="call-outline"
                    label="Phone"
                    value={
                      profile.phoneNumber ||
                      profile.phone ||
                      "-"
                    }
                  />

                  <SummaryRow
                    icon="school-outline"
                    label="Qualification"
                    value={
                      qualification || "-"
                    }
                  />

                  <SummaryRow
                    icon="briefcase-outline"
                    label="Experience"
                    value={
                      experience
                        ? `${experience} years`
                        : "-"
                    }
                  />
                </View>
              </View>
            </View>

            {/* FORM CARD */}

            <View style={styles.formCard}>
              <View
                style={styles.formHeader}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={
                      styles.formEyebrow
                    }
                  >
                    {profileExists
                      ? "PROFESSIONAL INFORMATION"
                      : "COMPLETE YOUR PROFILE"}
                  </Text>

                  <Text
                    style={
                      styles.formTitle
                    }
                  >
                    {profileExists
                      ? "Profile Information"
                      : "Professional Profile"}
                  </Text>

                  <Text
                    style={
                      styles.formSubtitle
                    }
                  >
                    {profileExists
                      ? editing
                        ? "Update the professional information you want to change."
                        : "Your saved doctor profile information."
                      : "Complete these details to activate your doctor workspace."}
                  </Text>
                </View>

                {profileExists && (
                  <TouchableOpacity
                    style={[
                      styles.editButton,
                      editing &&
                        styles.editButtonCancel,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (editing) {
                        cancelEditing();
                      } else {
                        startEditing();
                      }
                    }}
                  >
                    <Ionicons
                      name={
                        editing
                          ? "close"
                          : "create-outline"
                      }
                      size={16}
                      color={
                        editing
                          ? GREEN
                          : WHITE
                      }
                    />

                    <Text
                      style={[
                        styles.editButtonText,
                        editing &&
                          styles.editButtonTextCancel,
                      ]}
                    >
                      {editing
                        ? "Cancel"
                        : "Edit"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* ACCOUNT */}

              <SectionLabel
                icon="person-outline"
                title="Account Information"
              />

              <ReadOnlyField
                icon="person-outline"
                label="Full Name"
                value={doctorName}
              />

              <ReadOnlyField
                icon="mail-outline"
                label="Email Address"
                value={profile.email || "-"}
              />

              <ReadOnlyField
                icon="call-outline"
                label="Phone Number"
                value={
                  profile.phoneNumber ||
                  profile.phone ||
                  "-"
                }
              />

              <ReadOnlyField
                icon="finger-print-outline"
                label="Doctor ID"
                value={
                  profile.id != null
                    ? String(profile.id)
                    : "Assigned after profile completion"
                }
              />

              {/* PROFESSIONAL */}

              <SectionLabel
                icon="medical-outline"
                title="Professional Information"
              />

              <EditableField
                icon="school-outline"
                label="Qualification"
                value={qualification}
                editable={editing}
                placeholder="Example: BAMS, MD (Ayu)"
                onChangeText={
                  setQualification
                }
              />

              <EditableField
                icon="medkit-outline"
                label="Specialization"
                value={specialization}
                editable={editing}
                placeholder="Example: Ayurveda and Panchakarma"
                onChangeText={
                  setSpecialization
                }
              />

              <EditableField
                icon="briefcase-outline"
                label="Experience in Years"
                value={experience}
                editable={editing}
                keyboardType="number-pad"
                placeholder="Example: 10"
                onChangeText={(value) =>
                  setExperience(
                    value.replace(
                      /[^0-9]/g,
                      ""
                    )
                  )
                }
              />

              <EditableField
                icon="ribbon-outline"
                label="Registration Number"
                value={registrationNumber}
                editable={editing}
                placeholder="Enter registration number"
                onChangeText={
                  setRegistrationNumber
                }
              />

              {/* PROFILE IMAGE */}

              <Text
                style={styles.fieldLabel}
              >
                PROFILE IMAGE
              </Text>

              <View
                style={[
                  styles.imagePickerCard,
                  !editing &&
                    styles.fieldDisabled,
                ]}
              >
                <View
                  style={
                    styles.imagePreview
                  }
                >
                  {previewImage ? (
                    <Image
                      source={{
                        uri: previewImage,
                      }}
                      style={
                        styles.imagePreviewImage
                      }
                      resizeMode="cover"
                    />
                  ) : (
                    <Text
                      style={
                        styles.imagePreviewInitial
                      }
                    >
                      {initial}
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={
                      styles.imagePickerTitle
                    }
                  >
                    Doctor Profile Photo
                  </Text>

                  <Text
                    style={
                      styles.imagePickerHelp
                    }
                  >
                    JPG, PNG or WEBP. Maximum
                    size 5 MB.
                  </Text>

                  {selectedImage && (
                    <Text
                      numberOfLines={1}
                      style={
                        styles.selectedFileName
                      }
                    >
                      {
                        selectedImage.name
                      }
                    </Text>
                  )}

                  <View
                    style={
                      styles.imageActions
                    }
                  >
                    <TouchableOpacity
                      style={
                        styles.chooseImageButton
                      }
                      disabled={
                        !editing ||
                        uploadingImage
                      }
                      onPress={chooseImage}
                    >
                      {uploadingImage ? (
                        <ActivityIndicator
                          size="small"
                          color={WHITE}
                        />
                      ) : (
                        <Ionicons
                          name="camera-outline"
                          size={15}
                          color={WHITE}
                        />
                      )}

                      <Text
                        style={
                          styles.chooseImageButtonText
                        }
                      >
                        Choose
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.removeImageButton
                      }
                      disabled={!editing}
                      onPress={removeImage}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={15}
                        color={DANGER}
                      />

                      <Text
                        style={
                          styles.removeImageButtonText
                        }
                      >
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* ABOUT */}

              <Text
                style={styles.fieldLabel}
              >
                ABOUT DOCTOR
              </Text>

              <View
                style={[
                  styles.aboutWrap,
                  !editing &&
                    styles.fieldDisabled,
                ]}
              >
                <TextInput
                  value={about}
                  onChangeText={setAbout}
                  editable={editing}
                  multiline
                  textAlignVertical="top"
                  placeholder="Write a short professional introduction..."
                  placeholderTextColor="#9AA59E"
                  style={styles.aboutInput}
                />
              </View>

              <Text
                style={styles.helpText}
              >
                Write at least 10 characters
                describing your professional
                background and approach to
                patient care.
              </Text>

              {editing && (
                <View
                  style={styles.formActions}
                >
                  {profileExists && (
                    <TouchableOpacity
                      style={
                        styles.cancelSaveButton
                      }
                      disabled={saving}
                      onPress={cancelEditing}
                    >
                      <Text
                        style={
                          styles.cancelSaveButtonText
                        }
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      saving &&
                        styles.saveButtonDisabled,
                    ]}
                    disabled={
                      saving ||
                      uploadingImage
                    }
                    onPress={saveProfile}
                  >
                    {saving ? (
                      <ActivityIndicator
                        size="small"
                        color={GREEN}
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="save-outline"
                          size={18}
                          color={GREEN}
                        />

                        <Text
                          style={
                            styles.saveButtonText
                          }
                        >
                          {profileExists
                            ? "Save Changes"
                            : "Complete Profile"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ===================================================
          DRAWER
      =================================================== */}

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setMenuOpen(false)
        }
      >
        <View style={styles.drawerRoot}>
          <Pressable
            style={
              styles.drawerBackdrop
            }
            onPress={() =>
              setMenuOpen(false)
            }
          />

          <View style={styles.drawer}>
            <View
              style={
                styles.drawerBrandWrap
              }
            >
              <View
                style={styles.drawerLogo}
              >
                <Ionicons
                  name="medical"
                  size={25}
                  color={GOLD}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={
                    styles.drawerBrand
                  }
                >
                  NeoLife
                </Text>

                <Text
                  style={
                    styles.drawerPortal
                  }
                >
                  Doctor Portal
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.drawerClose
                }
                onPress={() =>
                  setMenuOpen(false)
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={GREEN}
                />
              </TouchableOpacity>
            </View>

            <View
              style={
                styles.drawerDoctorCard
              }
            >
              <View
                style={
                  styles.drawerDoctorAvatar
                }
              >
                {previewImage ? (
                  <Image
                    source={{
                      uri: previewImage,
                    }}
                    style={
                      styles.drawerDoctorImage
                    }
                  />
                ) : (
                  <Text
                    style={
                      styles.drawerDoctorAvatarText
                    }
                  >
                    {initial}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={
                    styles.drawerDoctorName
                  }
                >
                  {doctorName}
                </Text>

                <Text
                  style={
                    styles.drawerDoctorRole
                  }
                >
                  Doctor
                </Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={{
                paddingBottom: 18,
              }}
            >
              {(["MAIN", "CLINICAL", "FINANCE"] as const).map(
                (section) => {
                const items =
                  visibleMenu.filter(
                    (item) =>
                      item.section ===
                      section
                  );

                if (!items.length) {
                  return null;
                }

                return (
                  <View
                    key={section}
                    style={
                      styles.drawerSection
                    }
                  >
                    <Text
                      style={
                        styles.drawerSectionLabel
                      }
                    >
                      {section}
                    </Text>

                    {items.map((item) => {
                      const active =
                        item.label ===
                        "My Profile";

                      return (
                        <TouchableOpacity
                          key={item.label}
                          style={[
                            styles.drawerItem,
                            active &&
                              styles.drawerItemActive,
                          ]}
                          activeOpacity={
                            0.85
                          }
                          onPress={() => {
                            setMenuOpen(
                              false
                            );

                            if (
                              active
                            ) {
                              return;
                            }

                            router.push(
                              item.route as any
                            );
                          }}
                        >
                          <View
                            style={[
                              styles.drawerItemIcon,
                              active &&
                                styles.drawerItemIconActive,
                            ]}
                          >
                            <Ionicons
                              name={
                                item.icon
                              }
                              size={19}
                              color={
                                active
                                  ? GREEN
                                  : GOLD
                              }
                            />
                          </View>

                          <Text
                            style={[
                              styles.drawerItemText,
                              active &&
                                styles.drawerItemTextActive,
                            ]}
                          >
                            {item.label}
                          </Text>

                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={
                              active
                                ? GREEN
                                : "#AFC0B6"
                            }
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              }
            )}
            </ScrollView>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                setMenuOpen(false);
                setLogoutOpen(true);
              }}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={WHITE}
              />

              <Text
                style={
                  styles.logoutButtonText
                }
              >
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          LOGOUT MODAL
      =================================================== */}

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
            styles.modalCenterRoot
          }
        >
          <Pressable
            style={
              styles.modalBackdrop
            }
            onPress={() =>
              setLogoutOpen(false)
            }
          />

          <View
            style={styles.logoutCard}
          >
            <View
              style={styles.logoutIcon}
            >
              <Ionicons
                name="log-out-outline"
                size={31}
                color={GREEN}
              />
            </View>

            <Text
              style={
                styles.noticeEyebrow
              }
            >
              NEOLIFE DOCTOR PORTAL
            </Text>

            <Text
              style={styles.noticeTitle}
            >
              Log Out?
            </Text>

            <Text
              style={
                styles.noticeMessage
              }
            >
              Are you sure you want to
              leave your doctor workspace?
            </Text>

            <View
              style={styles.logoutActions}
            >
              <TouchableOpacity
                style={
                  styles.logoutCancel
                }
                onPress={() =>
                  setLogoutOpen(false)
                }
              >
                <Text
                  style={
                    styles.logoutCancelText
                  }
                >
                  Stay Logged In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.logoutConfirm
                }
                onPress={logoutDoctor}
              >
                <Text
                  style={
                    styles.logoutConfirmText
                  }
                >
                  Log Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          NOTICE MODAL
      =================================================== */}

      <Modal
        visible={notice.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setNotice((current) => ({
            ...current,
            visible: false,
          }))
        }
      >
        <View
          style={
            styles.modalCenterRoot
          }
        >
          <Pressable
            style={
              styles.modalBackdrop
            }
            onPress={() =>
              setNotice((current) => ({
                ...current,
                visible: false,
              }))
            }
          />

          <View
            style={styles.noticeCard}
          >
            <View
              style={[
                styles.noticeIconOuter,
                notice.type === "success" &&
                  styles.noticeSuccess,
                notice.type === "error" &&
                  styles.noticeError,
                notice.type === "warning" &&
                  styles.noticeWarning,
                notice.type === "info" &&
                  styles.noticeInfo,
              ]}
            >
              <View
                style={
                  styles.noticeIconInner
                }
              >
                <Ionicons
                  name={
                    notice.type ===
                    "success"
                      ? "checkmark-circle-outline"
                      : notice.type ===
                        "error"
                      ? "close-circle-outline"
                      : notice.type ===
                        "warning"
                      ? "alert-circle-outline"
                      : "information-circle-outline"
                  }
                  size={31}
                  color={
                    notice.type ===
                    "success"
                      ? SUCCESS
                      : notice.type ===
                        "error"
                      ? DANGER
                      : notice.type ===
                        "warning"
                      ? WARNING
                      : INFO
                  }
                />
              </View>
            </View>

            <Text
              style={
                styles.noticeEyebrow
              }
            >
              NEOLIFE DOCTOR PORTAL
            </Text>

            <Text
              style={styles.noticeTitle}
            >
              {notice.title}
            </Text>

            <Text
              style={
                styles.noticeMessage
              }
            >
              {notice.message}
            </Text>

            <TouchableOpacity
              style={styles.noticeButton}
              onPress={() => {
                const shouldGo =
                  notice.goToDashboard;

                setNotice(
                  (current) => ({
                    ...current,
                    visible: false,
                  })
                );

                if (shouldGo) {
                  router.replace(
                    "/doctor/dashboard" as any
                  );
                }
              }}
            >
              <Text
                style={
                  styles.noticeButtonText
                }
              >
                {notice.goToDashboard
                  ? "Go to Dashboard"
                  : "Okay"}
              </Text>

              <Ionicons
                name={
                  notice.goToDashboard
                    ? "arrow-forward"
                    : "checkmark"
                }
                size={18}
                color={GREEN}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <View
        style={styles.summaryIcon}
      >
        <Ionicons
          name={icon}
          size={17}
          color={GREEN}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={styles.summaryLabel}
        >
          {label.toUpperCase()}
        </Text>

        <Text
          style={styles.summaryValue}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function SectionLabel({
  icon,
  title,
}: {
  icon: any;
  title: string;
}) {
  return (
    <View style={styles.sectionLabel}>
      <View
        style={styles.sectionLabelIcon}
      >
        <Ionicons
          name={icon}
          size={16}
          color={GOLD_DARK}
        />
      </View>

      <Text
        style={styles.sectionLabelText}
      >
        {title}
      </Text>
    </View>
  );
}

function ReadOnlyField({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>
        {label.toUpperCase()}
      </Text>

      <View
        style={[
          styles.inputWrap,
          styles.fieldDisabled,
        ]}
      >
        <View
          style={styles.inputIconBox}
        >
          <Ionicons
            name={icon}
            size={17}
            color={GREEN}
          />
        </View>

        <Text
          style={styles.readOnlyValue}
        >
          {value}
        </Text>

        <Ionicons
          name="lock-closed-outline"
          size={14}
          color="#9AA59E"
        />
      </View>
    </View>
  );
}

function EditableField({
  icon,
  label,
  value,
  editable,
  placeholder,
  onChangeText,
  keyboardType = "default",
}: {
  icon: any;
  label: string;
  value: string;
  editable: boolean;
  placeholder: string;
  onChangeText: (
    value: string
  ) => void;
  keyboardType?: any;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>
        {label.toUpperCase()}
      </Text>

      <View
        style={[
          styles.inputWrap,
          !editable &&
            styles.fieldDisabled,
        ]}
      >
        <View
          style={styles.inputIconBox}
        >
          <Ionicons
            name={icon}
            size={17}
            color={GREEN}
          />
        </View>

        <TextInput
          value={value}
          editable={editable}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA59E"
          keyboardType={keyboardType}
          style={styles.input}
        />
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  fullLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },

  bodyLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loaderText: {
    marginTop: 12,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 12,
  },

  /* HEADER */

  header: {
    minHeight: 75,
    paddingTop:
      Platform.OS === "web" ? 12 : 43,
    paddingBottom: 11,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    zIndex: 30,
  },

  menuButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  headerTextWrap: {
    flex: 1,
  },

  headerEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1,
  },

  headerTitle: {
    marginTop: 2,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 19,
  },

  dashboardButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  topAvatar: {
    width: 43,
    height: 43,
    overflow: "hidden",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  topAvatarImage: {
    width: "100%",
    height: "100%",
  },

  topAvatarText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 17,
  },

  /* HERO */

  hero: {
    overflow: "hidden",
    marginHorizontal: 15,
    marginTop: 19,
    padding: 22,
    borderRadius: 28,
    backgroundColor: GREEN,
  },

  heroGlowOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -65,
    top: -95,
    backgroundColor:
      "rgba(255,255,255,.06)",
  },

  heroGlowTwo: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    left: -80,
    bottom: -110,
    backgroundColor:
      "rgba(214,180,91,.15)",
  },

  heroBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor:
      "rgba(255,255,255,.09)",
  },

  heroBadgeText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 7.5,
    letterSpacing: 1,
  },

  heroTitle: {
    marginTop: 17,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 28,
    lineHeight: 34,
  },

  heroGold: {
    color: GOLD_LIGHT,
  },

  heroText: {
    marginTop: 10,
    maxWidth: 330,
    fontFamily:
      "DMSans_400Regular",
    color: "#D3E1D8",
    fontSize: 11,
    lineHeight: 18,
  },

  /* PROFILE CARD */

  profileCard: {
    overflow: "hidden",
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 25,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  profileCover: {
    height: 100,
    backgroundColor: GREEN_2,
  },

  profileAvatarWrap: {
    width: 108,
    height: 108,
    marginTop: -54,
    alignSelf: "center",
    padding: 4,
    overflow: "hidden",
    borderRadius: 54,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E4EAE6",
  },

  profileAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },

  profileAvatarPlaceholder: {
    flex: 1,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },

  profileAvatarPlaceholderText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 34,
  },

  profileSummaryBody: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    alignItems: "center",
  },

  profileName: {
    marginTop: 10,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 23,
    textAlign: "center",
  },

  profileSpecialization: {
    marginTop: 4,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    textAlign: "center",
  },

  activeBadge: {
    marginTop: 11,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  activeDoctorBadge: {
    backgroundColor: SUCCESS_LIGHT,
  },

  inactiveBadge: {
    backgroundColor: DANGER_LIGHT,
  },

  activeBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 7,
  },

  profileInfoList: {
    width: "100%",
    marginTop: 15,
  },

  summaryRow: {
    minHeight: 58,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  summaryLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 6.5,
    letterSpacing: 0.8,
  },

  summaryValue: {
    marginTop: 3,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9.5,
    lineHeight: 14,
  },

  /* FORM */

  formCard: {
    marginHorizontal: 15,
    marginTop: 15,
    padding: 16,
    borderRadius: 25,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  formHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  formEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1,
  },

  formTitle: {
    marginTop: 4,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 21,
  },

  formSubtitle: {
    marginTop: 4,
    fontFamily:
      "DMSans_400Regular",
    color: MUTED,
    fontSize: 8.5,
    lineHeight: 13,
  },

  editButton: {
    minHeight: 38,
    paddingHorizontal: 11,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: GREEN,
  },

  editButtonCancel: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: GREEN,
  },

  editButtonText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 8,
  },

  editButtonTextCancel: {
    color: GREEN,
  },

  sectionLabel: {
    marginTop: 22,
    marginBottom: 4,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  sectionLabelIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7E2",
  },

  sectionLabelText: {
    fontFamily:
      "PlayfairDisplay_600SemiBold",
    color: GREEN,
    fontSize: 15,
  },

  fieldGroup: {
    marginTop: 13,
  },

  fieldLabel: {
    marginTop: 13,
    marginBottom: 7,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 7.5,
    letterSpacing: 0.8,
  },

  inputWrap: {
    minHeight: 54,
    paddingHorizontal: 9,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  fieldDisabled: {
    backgroundColor: "#F6F8F5",
  },

  inputIconBox: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  input: {
    flex: 1,
    minHeight: 50,
    fontFamily:
      "DMSans_500Medium",
    color: TEXT,
    fontSize: 10,
  },

  readOnlyValue: {
    flex: 1,
    fontFamily:
      "DMSans_500Medium",
    color: "#68756E",
    fontSize: 10,
  },

  /* IMAGE */

  imagePickerCard: {
    minHeight: 120,
    padding: 12,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAFCFA",
    borderWidth: 1,
    borderColor: BORDER,
  },

  imagePreview: {
    width: 80,
    height: 80,
    overflow: "hidden",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    borderWidth: 3,
    borderColor: GOLD,
  },

  imagePreviewImage: {
    width: "100%",
    height: "100%",
  },

  imagePreviewInitial: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 26,
  },

  imagePickerTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  imagePickerHelp: {
    marginTop: 3,
    fontFamily:
      "DMSans_400Regular",
    color: MUTED,
    fontSize: 7,
    lineHeight: 11,
  },

  selectedFileName: {
    marginTop: 4,
    fontFamily:
      "DMSans_500Medium",
    color: GOLD_DARK,
    fontSize: 6.5,
  },

  imageActions: {
    marginTop: 8,
    flexDirection: "row",
    gap: 6,
  },

  chooseImageButton: {
    minHeight: 35,
    paddingHorizontal: 9,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: GREEN,
  },

  chooseImageButtonText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 7,
  },

  removeImageButton: {
    minHeight: 35,
    paddingHorizontal: 9,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: DANGER_LIGHT,
    borderWidth: 1,
    borderColor: "#EECBC7",
  },

  removeImageButtonText: {
    fontFamily: "DMSans_700Bold",
    color: DANGER,
    fontSize: 7,
  },

  /* ABOUT */

  aboutWrap: {
    minHeight: 130,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  aboutInput: {
    minHeight: 130,
    padding: 13,
    fontFamily:
      "DMSans_400Regular",
    color: TEXT,
    fontSize: 10,
    lineHeight: 17,
  },

  helpText: {
    marginTop: 6,
    fontFamily:
      "DMSans_400Regular",
    color: MUTED,
    fontSize: 7,
    lineHeight: 12,
  },

  formActions: {
    marginTop: 20,
    flexDirection: "row",
    gap: 8,
  },

  cancelSaveButton: {
    flex: 1,
    minHeight: 49,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  cancelSaveButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  saveButton: {
    flex: 1.4,
    minHeight: 49,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: GOLD,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

  saveButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  /* DRAWER */

  drawerRoot: {
    flex: 1,
    flexDirection: "row",
  },

  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(5, 28, 19, .68)",
  },

  drawer: {
    width: "86%",
    maxWidth: 350,
    height: "100%",
    paddingTop:
      Platform.OS === "web" ? 35 : 58,
    paddingHorizontal: 15,
    paddingBottom: 20,
    backgroundColor: GREEN,
  },

  drawerBrandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  drawerLogo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,.10)",
  },

  drawerBrand: {
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 24,
  },

  drawerPortal: {
    marginTop: 1,
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 8,
    letterSpacing: 1,
  },

  drawerClose: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  drawerDoctorCard: {
    marginTop: 18,
    marginBottom: 8,
    padding: 11,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor:
      "rgba(255,255,255,.08)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,.10)",
  },

  drawerDoctorAvatar: {
    width: 43,
    height: 43,
    overflow: "hidden",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },

  drawerDoctorImage: {
    width: "100%",
    height: "100%",
  },

  drawerDoctorAvatarText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 16,
  },

  drawerDoctorName: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 11,
  },

  drawerDoctorRole: {
    marginTop: 2,
    fontFamily:
      "DMSans_400Regular",
    color: "#C5D7CC",
    fontSize: 7.5,
  },

  drawerSection: {
    marginTop: 14,
  },

  drawerSectionLabel: {
    marginLeft: 11,
    marginBottom: 6,
    fontFamily: "DMSans_700Bold",
    color: "#7E9C8C",
    fontSize: 7,
    letterSpacing: 1.2,
  },

  drawerItem: {
    minHeight: 50,
    paddingHorizontal: 9,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  drawerItemActive: {
    backgroundColor: WHITE,
  },

  drawerItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,.07)",
  },

  drawerItemIconActive: {
    backgroundColor: MINT,
  },

  drawerItemText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: "#E4ECE7",
    fontSize: 10.5,
  },

  drawerItemTextActive: {
    color: GREEN,
  },

  logoutButton: {
    minHeight: 49,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor:
      "rgba(255,255,255,.10)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,.16)",
  },

  logoutButtonText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 11,
  },

  /* MODALS */

  modalCenterRoot: {
    flex: 1,
    paddingHorizontal: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(5, 28, 19, .72)",
  },

  logoutCard: {
    width: "100%",
    maxWidth: 380,
    padding: 22,
    borderRadius: 27,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor:
      "rgba(214,180,91,.42)",
    elevation: 18,
  },

  logoutIcon: {
    width: 67,
    height: 67,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  logoutActions: {
    width: "100%",
    marginTop: 18,
    flexDirection: "row",
    gap: 8,
  },

  logoutCancel: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  logoutCancelText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  logoutConfirm: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DANGER,
  },

  logoutConfirmText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 9,
  },

  /* NOTICE */

  noticeCard: {
    width: "100%",
    maxWidth: 380,
    paddingTop: 27,
    paddingBottom: 21,
    paddingHorizontal: 21,
    borderRadius: 28,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor:
      "rgba(214,180,91,.42)",
    elevation: 18,
  },

  noticeIconOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  noticeSuccess: {
    backgroundColor: SUCCESS_LIGHT,
  },

  noticeError: {
    backgroundColor: DANGER_LIGHT,
  },

  noticeWarning: {
    backgroundColor: WARNING_LIGHT,
  },

  noticeInfo: {
    backgroundColor: INFO_LIGHT,
  },

  noticeIconInner: {
    width: 57,
    height: 57,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  noticeEyebrow: {
    marginTop: 15,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7.5,
    letterSpacing: 1.2,
  },

  noticeTitle: {
    marginTop: 6,
    fontFamily:
      "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 24,
    textAlign: "center",
  },

  noticeMessage: {
    marginTop: 8,
    maxWidth: 310,
    fontFamily:
      "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 17,
    textAlign: "center",
  },

  noticeButton: {
    width: "100%",
    minHeight: 48,
    marginTop: 18,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: GOLD,
  },

  noticeButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },
});
