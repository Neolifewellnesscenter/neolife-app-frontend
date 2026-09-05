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
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
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

type Address = {
  id?: number;
  fullName?: string;
  phone?: string;
  houseNo?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  addressType?: string;
  isDefault?: boolean;
};

type NoticeState = {
  visible: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
  action?: "login" | "none";
};

const EMPTY_FORM = {
  houseNo: "",
  street: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
  addressType: "Home",
  isDefault: false,
};

export default function AddressScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  

  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [confirmDelete, setConfirmDelete] = useState<Address | null>(null);

  const [notice, setNotice] = useState<NoticeState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
    action: "none",
  });

  useEffect(() => {
    initialize();
  }, []);

  const defaultAddress = useMemo(
    () => addresses.find((item) => item.isDefault),
    [addresses]
  );

  async function initialize() {
    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        showNotice(
          "info",
          "Login Required",
          "Please sign in to manage your saved addresses.",
          "login"
        );
        return;
      }

      
      await loadAddresses();
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    setRefreshing(true);

    try {
      await loadAddresses();
    } finally {
      setRefreshing(false);
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

  
  async function loadAddresses() {
    try {
      const result = await apiRequest("/address/get", {
        method: "GET",
      });

      const list = Array.isArray(result?.data) ? result.data : [];

      setAddresses(list);

      await AsyncStorage.setItem("addresses", JSON.stringify(list));
    } catch (error: any) {
      setAddresses([]);

      if (error?.auth) {
        showNotice(
          "error",
          "Session Expired",
          error.message,
          "login"
        );
        return;
      }

      showNotice(
        "error",
        "Unable to Load Addresses",
        error?.message || "Address loading failed."
      );
    }
  }

  function updateForm<K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validateForm() {
    if (!form.houseNo.trim()) {
      showNotice(
        "info",
        "House Number Required",
        "Please enter your house, flat or building number."
      );
      return false;
    }

    if (!form.street.trim()) {
      showNotice(
        "info",
        "Street Required",
        "Please enter your street or locality."
      );
      return false;
    }

    if (!form.city.trim()) {
      showNotice(
        "info",
        "City Required",
        "Please enter your city."
      );
      return false;
    }

    if (!form.state.trim()) {
      showNotice(
        "info",
        "State Required",
        "Please enter your state."
      );
      return false;
    }

    if (!/^[0-9]{6}$/.test(form.pincode.trim())) {
      showNotice(
        "info",
        "Check Pincode",
        "Please enter a valid 6-digit pincode."
      );
      return false;
    }

    return true;
  }

  async function saveAddress() {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        houseNo: form.houseNo.trim(),
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        landmark: form.landmark.trim(),
        addressType: form.addressType,
        isDefault: form.isDefault,
      };

      const endpoint = editingId
        ? `/address/update/${editingId}`
        : "/address/add";

      const method = editingId ? "PUT" : "POST";

      const result = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      showNotice(
        "success",
        editingId ? "Address Updated" : "Address Saved",
        result?.message ||
          (editingId
            ? "Your address has been updated successfully."
            : "Your new address has been saved successfully.")
      );

      clearForm();
      await loadAddresses();
    } catch (error: any) {
      showNotice(
        "error",
        "Unable to Save Address",
        error?.message || "Address save failed."
      );
    } finally {
      setSaving(false);
    }
  }

  function editAddress(address: Address) {
    setEditingId(address.id || null);

    setForm({
      houseNo: address.houseNo || "",
      street: address.street || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || "",
      landmark: address.landmark || "",
      addressType: address.addressType || "Home",
      isDefault: Boolean(address.isDefault),
    });
  }

  function clearForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function deleteAddress(address: Address) {
    if (!address.id) return;

    try {
      setConfirmDelete(null);

      const result = await apiRequest(
        `/address/delete/${address.id}`,
        {
          method: "DELETE",
        }
      );

      showNotice(
        "success",
        "Address Deleted",
        result?.message || "Address deleted successfully."
      );

      if (editingId === address.id) {
        clearForm();
      }

      await loadAddresses();
    } catch (error: any) {
      showNotice(
        "error",
        "Delete Failed",
        error?.message || "Unable to delete this address."
      );
    }
  }

  async function setDefaultAddress(address: Address) {
    if (!address.id) return;

    try {
      const result = await apiRequest(
        `/address/${address.id}/default`,
        {
          method: "PUT",
        }
      );

      showNotice(
        "success",
        "Default Address Updated",
        result?.message || "Default address updated successfully."
      );

      await loadAddresses();
    } catch (error: any) {
      showNotice(
        "error",
        "Update Failed",
        error?.message || "Unable to update the default address."
      );
    }
  }

  function showNotice(
    type: NoticeState["type"],
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
        <Text style={styles.loaderText}>Loading saved addresses...</Text>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAll}
            tintColor={GREEN}
          />
        }
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroOrbOne} />
          <View style={styles.heroOrbTwo} />

          <View style={styles.heroIcon}>
            <Ionicons name="location-outline" size={28} color={GREEN} />
          </View>

          <Text style={styles.heroEyebrow}>SAVED DELIVERY DETAILS</Text>

          <Text style={styles.heroTitle}>
            My{" "}
            <Text style={styles.heroAccent}>Addresses</Text>
          </Text>

          <Text style={styles.heroText}>
            Save your home, work or office address once and use it quickly
            whenever you place an order.
          </Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{addresses.length}</Text>
              <Text style={styles.heroStatLabel}>Saved</Text>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {defaultAddress ? "1" : "0"}
              </Text>
              <Text style={styles.heroStatLabel}>Default</Text>
            </View>
          </View>
        </View>

        {/* ADDRESS FORM */}
        <View style={styles.section}>
          <Text style={styles.eyebrow}>
            {editingId ? "UPDATE DELIVERY ADDRESS" : "ADD DELIVERY ADDRESS"}
          </Text>

          <Text style={styles.sectionTitle}>
            {editingId ? "Edit Address" : "Add New Address"}
          </Text>

          <Text style={styles.sectionText}>
            Enter the address details below. You can also choose whether this
            should be your default address.
          </Text>

          <View style={styles.formCard}>
            <Field
              icon="home-outline"
              label="House / Flat No"
              placeholder="Enter house / flat number"
              value={form.houseNo}
              onChangeText={(value) => updateForm("houseNo", value)}
            />

            <Field
              icon="map-outline"
              label="Street / Locality"
              placeholder="Enter street or locality"
              value={form.street}
              onChangeText={(value) => updateForm("street", value)}
            />

            <View style={styles.twoColumn}>
              <View style={styles.half}>
                <Field
                  icon="business-outline"
                  label="City"
                  placeholder="Enter city"
                  value={form.city}
                  onChangeText={(value) => updateForm("city", value)}
                />
              </View>

              <View style={styles.half}>
                <Field
                  icon="map-outline"
                  label="State"
                  placeholder="Enter state"
                  value={form.state}
                  onChangeText={(value) => updateForm("state", value)}
                />
              </View>
            </View>

            <Field
              icon="navigate-outline"
              label="Pincode"
              placeholder="Enter 6-digit pincode"
              value={form.pincode}
              onChangeText={(value) =>
                updateForm("pincode", value.replace(/\D/g, "").slice(0, 6))
              }
              keyboardType="number-pad"
              maxLength={6}
            />

            <Field
              icon="flag-outline"
              label="Landmark"
              placeholder="Nearby landmark (optional)"
              value={form.landmark}
              onChangeText={(value) => updateForm("landmark", value)}
            />

            <Text style={styles.inputLabel}>ADDRESS TYPE</Text>

            <View style={styles.typeRow}>
              {["Home", "Work", "Office", "Other"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeChip,
                    form.addressType === type && styles.typeChipActive,
                  ]}
                  onPress={() => updateForm("addressType", type)}
                >
                  <Ionicons
                    name={
                      type === "Home"
                        ? "home-outline"
                        : type === "Work"
                        ? "briefcase-outline"
                        : type === "Office"
                        ? "business-outline"
                        : "location-outline"
                    }
                    size={15}
                    color={form.addressType === type ? WHITE : GREEN}
                  />

                  <Text
                    style={[
                      styles.typeChipText,
                      form.addressType === type && styles.typeChipTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.defaultToggle}
              onPress={() => updateForm("isDefault", !form.isDefault)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.checkBox,
                  form.isDefault && styles.checkBoxActive,
                ]}
              >
                {form.isDefault && (
                  <Ionicons name="checkmark" size={15} color={WHITE} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.defaultTitle}>
                  Make this my default address
                </Text>
                <Text style={styles.defaultText}>
                  This address will be selected first during checkout.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={saveAddress}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={GREEN} />
              ) : (
                <Ionicons
                  name={editingId ? "create-outline" : "add-circle-outline"}
                  size={18}
                  color={GREEN}
                />
              )}

              <Text style={styles.saveButtonText}>
                {saving
                  ? "Saving Address..."
                  : editingId
                  ? "Update Address"
                  : "Save Address"}
              </Text>

              {!saving && (
                <Ionicons name="arrow-forward" size={17} color={GREEN} />
              )}
            </TouchableOpacity>

            {editingId && (
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={clearForm}
              >
                <Ionicons name="close-outline" size={17} color={GREEN} />
                <Text style={styles.cancelEditText}>Cancel Editing</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SAVED ADDRESSES */}
        <View style={styles.section}>
          <View style={styles.headingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>YOUR SAVED LOCATIONS</Text>
              <Text style={styles.sectionTitle}>Saved Addresses</Text>
            </View>

            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{addresses.length}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={GREEN} />
              <Text style={styles.loadingTitle}>
                Loading your addresses
              </Text>
            </View>
          ) : !addresses.length ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="location-outline"
                  size={30}
                  color={GOLD_DARK}
                />
              </View>

              <Text style={styles.emptyTitle}>No Address Found</Text>

              <Text style={styles.emptyText}>
                Your saved delivery addresses will appear here after you add
                one.
              </Text>
            </View>
          ) : (
            <View style={styles.addressList}>
              {addresses.map((address) => (
                <AddressCard
                  key={String(address.id)}
                  address={address}
                  onEdit={() => editAddress(address)}
                  onDelete={() => setConfirmDelete(address)}
                  onDefault={() => setDefaultAddress(address)}
                />
              ))}
            </View>
          )}
        </View>

        {/* SUPPORT */}
        <View style={styles.supportCard}>
          <View style={styles.supportIcon}>
            <Ionicons name="shield-checkmark-outline" size={24} color={GOLD} />
          </View>

          <Text style={styles.supportEyebrow}>SAFE & CONVENIENT</Text>

          <Text style={styles.supportTitle}>
            Your Address Stays With Your Account
          </Text>

          <Text style={styles.supportText}>
            Saved addresses help make medicine and wellness-product checkout
            faster while keeping your delivery details organized.
          </Text>
        </View>

        {/* SAME FOOTER AS ABOUT PAGE */}
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

      {/* DELETE CONFIRMATION */}
      <Modal
        visible={Boolean(confirmDelete)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setConfirmDelete(null)}
      >
        <View style={styles.noticeRoot}>
          <Pressable
            style={styles.noticeBackdrop}
            onPress={() => setConfirmDelete(null)}
          />

          <View style={styles.noticeCard}>
            <View style={[styles.noticeIcon, styles.noticeError]}>
              <Ionicons name="trash-outline" size={31} color={DANGER} />
            </View>

            <Text style={styles.noticeEyebrow}>ADDRESS MANAGEMENT</Text>

            <Text style={styles.noticeTitle}>Delete This Address?</Text>

            <Text style={styles.noticeMessage}>
              This address will be removed from your saved addresses. You can
              add it again later if needed.
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setConfirmDelete(null)}
              >
                <Text style={styles.confirmCancelText}>Keep Address</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDelete}
                onPress={() =>
                  confirmDelete && deleteAddress(confirmDelete)
                }
              >
                <Ionicons name="trash-outline" size={16} color={WHITE} />
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                {notice.action === "login" ? "Go to Login" : "Okay"}
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
  keyboardType,
  maxLength,
}: {
  icon: any;
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: any;
  maxLength?: number;
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
          placeholderTextColor="#9AA59E"
          keyboardType={keyboardType}
          maxLength={maxLength}
          style={styles.input}
        />
      </View>
    </View>
  );
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  onDefault,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onDefault: () => void;
}) {
  return (
    <View style={styles.addressCard}>
      <View style={styles.addressTop}>
        <View
          style={[
            styles.addressTypeIcon,
            address.isDefault && styles.addressTypeIconDefault,
          ]}
        >
          <Ionicons
            name={
              address.addressType === "Work"
                ? "briefcase-outline"
                : address.addressType === "Office"
                ? "business-outline"
                : address.addressType === "Other"
                ? "location-outline"
                : "home-outline"
            }
            size={22}
            color={address.isDefault ? GOLD : GREEN}
          />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.addressTitleRow}>
            <Text style={styles.addressType}>
              {address.addressType || "Address"}
            </Text>

            {address.isDefault && (
              <View style={styles.defaultBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={12}
                  color={SUCCESS}
                />
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>

          {Boolean(address.fullName) && (
            <Text style={styles.personName}>{address.fullName}</Text>
          )}

          {Boolean(address.phone) && (
            <Text style={styles.phoneText}>{address.phone}</Text>
          )}
        </View>
      </View>

      <View style={styles.addressBody}>
        <Ionicons
          name="location-outline"
          size={17}
          color={GOLD_DARK}
          style={{ marginTop: 2 }}
        />

        <Text style={styles.addressText}>
          {[address.houseNo, address.street]
            .filter(Boolean)
            .join(", ")}
          {"\n"}
          {[address.city, address.state]
            .filter(Boolean)
            .join(", ")}
          {address.pincode ? ` - ${address.pincode}` : ""}
          {"\n"}
          Landmark: {address.landmark || "N/A"}
        </Text>
      </View>

      <View style={styles.addressActions}>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Ionicons name="create-outline" size={15} color={GREEN} />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        {!address.isDefault && (
          <TouchableOpacity
            style={styles.defaultButton}
            onPress={onDefault}
          >
            <Ionicons name="star-outline" size={15} color={GOLD_DARK} />
            <Text style={styles.defaultButtonText}>Make Default</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Ionicons name="trash-outline" size={15} color={DANGER} />
        </TouchableOpacity>
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
    padding: 24,
    minHeight: 340,
    overflow: "hidden",
    borderRadius: 31,
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
    width: 60,
    height: 60,
    borderRadius: 20,
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
    fontSize: 39,
    lineHeight: 44,
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

  heroStats: {
    marginTop: 22,
    minHeight: 66,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,.08)",
  },

  heroStat: {
    flex: 1,
    alignItems: "center",
  },

  heroStatValue: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 22,
  },

  heroStatLabel: {
    marginTop: 2,
    fontFamily: "DMSans_500Medium",
    color: "#C8D8CE",
    fontSize: 8,
  },

  heroDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,.15)",
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
    maxWidth: 340,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
  },

  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  countPill: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  countPillText: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 18,
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

  twoColumn: {
    flexDirection: "row",
    gap: 9,
  },

  half: {
    flex: 1,
  },

  inputLabel: {
    marginBottom: 7,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 7,
    letterSpacing: 1,
  },

  inputWrap: {
    minHeight: 52,
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

  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  typeChip: {
    minHeight: 40,
    paddingHorizontal: 11,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F6F8F5",
    borderWidth: 1,
    borderColor: BORDER,
  },

  typeChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  typeChipText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },

  typeChipTextActive: {
    color: WHITE,
  },

  defaultToggle: {
    marginTop: 17,
    padding: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: MINT,
  },

  checkBox: {
    width: 25,
    height: 25,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#CBD8D0",
  },

  checkBoxActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  defaultTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  defaultText: {
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 7,
    lineHeight: 11,
  },

  saveButton: {
    minHeight: 52,
    marginTop: 17,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GOLD,
  },

  disabledButton: {
    opacity: 0.65,
  },

  saveButtonText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
    textAlign: "center",
  },

  cancelEditButton: {
    minHeight: 45,
    marginTop: 9,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: MINT,
  },

  cancelEditText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  loadingCard: {
    marginTop: 18,
    padding: 28,
    borderRadius: 24,
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  loadingTitle: {
    marginTop: 12,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 19,
  },

  emptyCard: {
    marginTop: 18,
    padding: 28,
    borderRadius: 24,
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7E3",
  },

  emptyTitle: {
    marginTop: 13,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 20,
  },

  emptyText: {
    marginTop: 6,
    maxWidth: 280,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
    lineHeight: 15,
    textAlign: "center",
  },

  addressList: {
    marginTop: 18,
    gap: 14,
  },

  addressCard: {
    padding: 16,
    borderRadius: 25,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 3,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },

  addressTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  addressTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  addressTypeIconDefault: {
    backgroundColor: GREEN,
  },

  addressTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },

  addressType: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 19,
  },

  defaultBadge: {
    minHeight: 25,
    paddingHorizontal: 8,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: SUCCESS_LIGHT,
  },

  defaultBadgeText: {
    fontFamily: "DMSans_700Bold",
    color: SUCCESS,
    fontSize: 7,
  },

  personName: {
    marginTop: 3,
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 9,
  },

  phoneText: {
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },

  addressBody: {
    marginTop: 14,
    padding: 12,
    borderRadius: 15,
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F8F9F6",
  },

  addressText: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 9,
    lineHeight: 15,
  },

  addressActions: {
    marginTop: 13,
    flexDirection: "row",
    gap: 7,
  },

  editButton: {
    minHeight: 40,
    paddingHorizontal: 11,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: MINT,
  },

  editButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },

  defaultButton: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#FFF7E3",
  },

  defaultButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
  },

  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DANGER_LIGHT,
  },

  supportCard: {
    marginTop: 48,
    marginHorizontal: 16,
    padding: 25,
    borderRadius: 28,
    alignItems: "center",
    backgroundColor: "#F2E5C0",
    borderWidth: 1,
    borderColor: "#E5D09A",
  },

  supportIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  supportEyebrow: {
    marginTop: 14,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.3,
  },

  supportTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 23,
    lineHeight: 28,
    textAlign: "center",
  },

  supportText: {
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

  confirmButtons: {
    width: "100%",
    marginTop: 18,
    flexDirection: "row",
    gap: 8,
  },

  confirmCancel: {
    flex: 1,
    minHeight: 47,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  confirmCancelText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  confirmDelete: {
    flex: 1,
    minHeight: 47,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: DANGER,
  },

  confirmDeleteText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 9,
  },
});
