import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

import MedicalDrawer from "../../components/MedicalDrawer";
import MedicalHeader from "../../components/MedicalHeader";
import { API_BASE_URL } from "../../services/api";

const GREEN = "#0B3D2E";
const GREEN_2 = "#14533D";
const GOLD = "#D6B45B";
const GOLD_DARK = "#A98632";
const GOLD_LIGHT = "#F5EBC9";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#75837B";
const BORDER = "#E4EAE6";
const INPUT_BG = "#FCFDFB";
const SUCCESS = "#2E7D52";
const SUCCESS_LIGHT = "#EAF6EF";
const DANGER = "#B95045";
const DANGER_LIGHT = "#FBECEA";
const INFO = "#397A9A";
const INFO_LIGHT = "#EDF7FC";

type SelectOption = {
  label: string;
  value: string;
  group?: string;
};

const DOSAGE_FORMS: SelectOption[] = [
  { label: "Syrup", value: "Syrup" },
  { label: "Tablet", value: "Tablet" },
  { label: "Capsule", value: "Capsule" },
  { label: "Choorna", value: "Choorna" },
  { label: "Kashayam", value: "Kashayam" },
  { label: "Oil", value: "Oil" },
  { label: "Cream", value: "Cream" },
  { label: "Gel", value: "Gel" },
  { label: "Powder", value: "Powder" },
  { label: "Drops", value: "Drops" },
  { label: "Other", value: "Other" },
];

const PRODUCT_TYPES: SelectOption[] = [
  { label: "Classical Medicine", value: "Classical Medicine" },
  { label: "Patented Product", value: "Patented Product" },
  { label: "Folklore Medicine", value: "Folklore Medicine" },
  { label: "Panchagavya", value: "Panchagavya" },
];

const PRODUCT_SECTIONS: SelectOption[] = [
  { group: "Pain Care", label: "Back Pain", value: "Back Pain" },
  { group: "Pain Care", label: "Joint Pain", value: "Joint Pain" },
  { group: "Pain Care", label: "Knee Pain", value: "Knee Pain" },
  { group: "Pain Care", label: "Neck Pain", value: "Neck Pain" },
  { group: "Pain Care", label: "Shoulder Pain", value: "Shoulder Pain" },
  { group: "Pain Care", label: "Muscle Pain", value: "Muscle Pain" },
  { group: "Pain Care", label: "Leg Pain", value: "Leg Pain" },
  { group: "Pain Care", label: "Hip Pain", value: "Hip Pain" },
  { group: "Pain Care", label: "Arthritis", value: "Arthritis" },
  { group: "Pain Care", label: "Sciatica", value: "Sciatica" },
  { group: "Pain Care", label: "Body Pain", value: "Body Pain" },
  { group: "Pain Care", label: "Other Pain", value: "Other Pain" },

  { group: "Diabetes Care", label: "Diabetes", value: "Diabetes" },
  {
    group: "Diabetes Care",
    label: "Blood Sugar Management",
    value: "Blood Sugar Management",
  },

  { group: "Liver Care", label: "Liver Care", value: "Liver Care" },
  { group: "Liver Care", label: "Fatty Liver", value: "Fatty Liver" },
  {
    group: "Liver Care",
    label: "Liver Wellness",
    value: "Liver Wellness",
  },

  { group: "Heart Care", label: "Heart Care", value: "Heart Care" },
  {
    group: "Heart Care",
    label: "Cholesterol Management",
    value: "Cholesterol Management",
  },
  {
    group: "Heart Care",
    label: "Cardiovascular Wellness",
    value: "Cardiovascular Wellness",
  },

  { group: "Kidney Care", label: "Kidney Care", value: "Kidney Care" },
  {
    group: "Kidney Care",
    label: "Urinary Health",
    value: "Urinary Health",
  },

  { group: "Stress & Sleep", label: "Stress", value: "Stress" },
  {
    group: "Stress & Sleep",
    label: "Sleep Support",
    value: "Sleep Support",
  },
  {
    group: "Stress & Sleep",
    label: "Mental Wellness",
    value: "Mental Wellness",
  },

  {
    group: "Digestive Care",
    label: "Digestive Care",
    value: "Digestive Care",
  },
  { group: "Digestive Care", label: "Acidity", value: "Acidity" },
  {
    group: "Digestive Care",
    label: "Gas & Bloating",
    value: "Gas and Bloating",
  },
  {
    group: "Digestive Care",
    label: "Constipation",
    value: "Constipation",
  },
  {
    group: "Digestive Care",
    label: "Indigestion",
    value: "Indigestion",
  },
  {
    group: "Digestive Care",
    label: "Appetite Support",
    value: "Appetite Support",
  },

  {
    group: "Respiratory Care",
    label: "Respiratory Care",
    value: "Respiratory Care",
  },
  { group: "Respiratory Care", label: "Cough", value: "Cough" },
  { group: "Respiratory Care", label: "Cold", value: "Cold" },
  {
    group: "Respiratory Care",
    label: "Breathing Wellness",
    value: "Breathing Wellness",
  },

  { group: "Skin Care", label: "Skin Care", value: "Skin Care" },
  { group: "Skin Care", label: "Acne Care", value: "Acne Care" },
  { group: "Skin Care", label: "Dry Skin", value: "Dry Skin" },
  {
    group: "Skin Care",
    label: "Skin Wellness",
    value: "Skin Wellness",
  },

  { group: "Hair Care", label: "Hair Care", value: "Hair Care" },
  { group: "Hair Care", label: "Hair Fall", value: "Hair Fall" },
  { group: "Hair Care", label: "Dandruff", value: "Dandruff" },
  {
    group: "Hair Care",
    label: "Hair Growth Support",
    value: "Hair Growth Support",
  },

  {
    group: "Women's Wellness",
    label: "Women's Wellness",
    value: "Women's Wellness",
  },
  {
    group: "Women's Wellness",
    label: "Menstrual Wellness",
    value: "Menstrual Wellness",
  },
  {
    group: "Women's Wellness",
    label: "PCOS Wellness",
    value: "PCOS Wellness",
  },
  {
    group: "Women's Wellness",
    label: "Menopause Wellness",
    value: "Menopause Wellness",
  },

  {
    group: "Men's Wellness",
    label: "Men's Wellness",
    value: "Men's Wellness",
  },
  {
    group: "Men's Wellness",
    label: "Prostate Wellness",
    value: "Prostate Wellness",
  },

  {
    group: "Immunity & Wellness",
    label: "Immunity",
    value: "Immunity",
  },
  {
    group: "Immunity & Wellness",
    label: "General Wellness",
    value: "General Wellness",
  },
  {
    group: "Immunity & Wellness",
    label: "Energy & Vitality",
    value: "Energy and Vitality",
  },
  {
    group: "Immunity & Wellness",
    label: "Weakness & Fatigue",
    value: "Weakness and Fatigue",
  },

  {
    group: "Weight Management",
    label: "Weight Management",
    value: "Weight Management",
  },
  {
    group: "Weight Management",
    label: "Metabolism Support",
    value: "Metabolism Support",
  },

  { group: "Other", label: "Eye Care", value: "Eye Care" },
  { group: "Other", label: "Bone Health", value: "Bone Health" },
  { group: "Other", label: "Nerve Health", value: "Nerve Health" },
  { group: "Other", label: "Oral Care", value: "Oral Care" },
  { group: "Other", label: "General Health", value: "General Health" },
  { group: "Other", label: "Other", value: "Other" },
];

const STATUS_OPTIONS: SelectOption[] = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

export default function AddProductScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [netQty, setNetQty] = useState("");
  const [weightInKg, setWeightInKg] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [dosageForm, setDosageForm] = useState("");
  const [productType, setProductType] = useState("");
  const [section, setSection] = useState("");
  const [productStatus, setProductStatus] = useState("ACTIVE");

  const [manufacturers, setManufacturers] = useState<SelectOption[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    void initialize();
  }, []);

  async function getStaffToken() {
    return (
      (await AsyncStorage.getItem("staffToken")) ||
      (await AsyncStorage.getItem("token")) ||
      (await AsyncStorage.getItem("accessToken")) ||
      ""
    );
  }

  async function clearStaffSession() {
    await AsyncStorage.multiRemove([
      "staffToken",
      "staffRefreshToken",
      "token",
      "accessToken",
      "refreshToken",
      "role",
      "medicalStaffId",
      "staffId",
      "staffName",
      "staffProfile",
      "userId",
      "userName",
      "name",
      "email",
      "phoneNumber",
      "profileCompleted",
      "isLoggedIn",
    ]);
  }

  async function staffApiRequest(
    endpoint: string,
    options: RequestInit = {}
  ) {
    const token = await getStaffToken();

    if (!token) {
      await clearStaffSession();
      router.replace("/login" as any);
      throw new Error("Medical staff login required.");
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    };

    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const responseText = await response.text();

    let result: any = {};

    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      result = {
        success: false,
        message:
          responseText ||
          `Invalid server response (${response.status}).`,
      };
    }

    if (response.status === 401) {
      await clearStaffSession();
      router.replace("/login" as any);

      throw new Error(
        result?.message ||
          "Your medical staff session has expired."
      );
    }

    if (response.status === 403) {
      throw new Error(
        result?.message ||
          "You do not have permission to perform this action."
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

  function extractArray(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    return [];
  }

  async function initialize() {
    try {
      setPageLoading(true);

      const token = await getStaffToken();
      const role = String(
        (await AsyncStorage.getItem("role")) || ""
      ).toUpperCase();

      if (!token) {
        router.replace("/login" as any);
        return;
      }

      if (
        role &&
        role !== "MEDICAL_STAFF" &&
        role !== "STAFF" &&
        role !== "ADMIN"
      ) {
        await clearStaffSession();

        Alert.alert(
          "Access Denied",
          "Only medical staff can access this page.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/login" as any),
            },
          ]
        );

        return;
      }

      await Promise.allSettled([
        loadStaffProfile(),
        loadManufacturers(),
      ]);
    } finally {
      setPageLoading(false);
    }
  }

  async function loadStaffProfile() {
    try {
      const result = await staffApiRequest("/medical-staff/me");
      const staff = result?.data || {};

      const name = staff?.name || "Medical Staff";

      const pairs: [string, string][] = [
        ["staffName", name],
        ["staffProfile", JSON.stringify(staff)],
      ];

      if (staff?.id !== null && staff?.id !== undefined) {
        pairs.push(["medicalStaffId", String(staff.id)]);
      }

      await AsyncStorage.multiSet(pairs);
    } catch (error) {
      console.log("Staff profile loading failed:", error);
    }
  }

  async function loadManufacturers() {
    try {
      const result = await staffApiRequest(
        "/manufacturers/getAll"
      );

      const list = extractArray(result?.data)
        .map((item: any) => {
          const name =
            item?.name ||
            item?.manufacturerName ||
            "";

          return name
            ? {
                label: String(name),
                value: String(name),
              }
            : null;
        })
        .filter(Boolean) as SelectOption[];

      setManufacturers(list);

      if (!list.length) {
        Alert.alert(
          "Manufacturers",
          "No manufacturers were found."
        );
      }
    } catch (error: any) {
      setManufacturers([]);

      Alert.alert(
        "Unable to Load Manufacturers",
        error?.message ||
          "Manufacturers could not be loaded."
      );
    }
  }

  function getTodayString() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function toApiDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function minimumExpiryDate() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 1);
    return date;
  }

  function selectedExpiryDate() {
    if (!expiryDate) return minimumExpiryDate();

    const parsed = new Date(`${expiryDate}T00:00:00`);

    return Number.isNaN(parsed.getTime())
      ? minimumExpiryDate()
      : parsed;
  }

  function onDateChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    setExpiryDate(toApiDate(selectedDate));
  }

  function validateForm() {
    const required: Array<[string, string]> = [
      [productName.trim(), "Product name"],
      [price.trim(), "Price"],
      [netQty.trim(), "Net quantity"],
      [expiryDate.trim(), "Expiry date"],
      [dosageForm.trim(), "Dosage form"],
      [productType.trim(), "Product type"],
      [section.trim(), "Product section"],
      [manufacturer.trim(), "Manufacturer"],
      [productStatus.trim(), "Product status"],
    ];

    const missing = required.find(([value]) => !value);

    if (missing) {
      Alert.alert(
        "Required Field",
        `${missing[1]} is required.`
      );
      return false;
    }

    const priceNumber = Number(price);

    if (
      !Number.isFinite(priceNumber) ||
      priceNumber <= 0
    ) {
      Alert.alert(
        "Invalid Price",
        "Enter a valid product price greater than zero."
      );
      return false;
    }

    if (weightInKg.trim() !== "") {
      const weight = Number(weightInKg);

      if (!Number.isFinite(weight) || weight < 0) {
        Alert.alert(
          "Invalid Weight",
          "Enter a valid shipping weight."
        );
        return false;
      }
    }

    if (
      expiryDate &&
      expiryDate <= getTodayString()
    ) {
      Alert.alert(
        "Invalid Expiry Date",
        "Expiry date must be a future date."
      );
      return false;
    }

    return true;
  }

  async function submitProduct() {
    if (saving || !validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const weightValue = weightInKg.trim();

      const payload = {
        productName: productName.trim(),
        price: Number(price),
        netQty: netQty.trim(),
        weightInKg:
          weightValue === ""
            ? null
            : Number(weightValue),
        expiryDate,
        dosageForm,
        type: productType,
        section,
        manufacturerName: manufacturer,
      };

      console.log(
        "MEDICAL ADD PRODUCT REQUEST:",
        payload
      );

      const result = await staffApiRequest(
        "/products/add",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      const createdProduct = result?.data;

      if (!createdProduct?.id) {
        throw new Error(
          "Product created, but product ID was not returned."
        );
      }

      if (productStatus === "INACTIVE") {
        await staffApiRequest(
          `/products/${createdProduct.id}/deactivate`,
          {
            method: "PUT",
          }
        );
      }

      Alert.alert(
        "Product Saved",
        productStatus === "ACTIVE"
          ? "Product created successfully."
          : "Product created and deactivated successfully.",
        [
          {
            text: "View Products",
            onPress: () =>
              router.replace("/medical/products" as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Unable to Save Product",
        error?.message ||
          "Product could not be created."
      );
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    const hasChanges =
      productName.trim() ||
      price.trim() ||
      netQty.trim() ||
      weightInKg.trim() ||
      expiryDate ||
      manufacturer ||
      dosageForm ||
      productType ||
      section;

    if (!hasChanges) {
      router.back();
      return;
    }

    Alert.alert(
      "Discard Changes?",
      "The product information you entered will not be saved.",
      [
        {
          text: "Keep Editing",
          style: "cancel",
        },
        {
          text: "Discard",
          style: "destructive",
          onPress: () =>
            router.replace("/medical/products" as any),
        },
      ]
    );
  }

  if (pageLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator
          size="large"
          color={GREEN}
        />

        <Text style={styles.loadingTitle}>
          Preparing product form
        </Text>

        <Text style={styles.loadingText}>
          Loading your product settings...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <MedicalHeader
        title="Add Product"
        subtitle="Create a new wellness product"
        onMenuPress={() => setMenuOpen(true)}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.banner}>
            <View style={styles.bannerDecorationOne} />
            <View style={styles.bannerDecorationTwo} />

            <View style={styles.bannerIcon}>
              <Ionicons
                name="cube-outline"
                size={26}
                color={GOLD_LIGHT}
              />
            </View>

            <Text style={styles.bannerEyebrow}>
              PRODUCT MANAGEMENT
            </Text>

            <Text style={styles.bannerTitle}>
              Add New Product
            </Text>

            <Text style={styles.bannerText}>
              Enter the product details carefully.
              Required fields are marked with *.
            </Text>
          </View>

          <FormSection
            icon="information-circle-outline"
            title="Basic Product Details"
            subtitle="Start with the product name."
          >
            <FieldLabel label="Product Name" required />

            <TextInput
              value={productName}
              onChangeText={setProductName}
              placeholder="Enter product name"
              placeholderTextColor="#A3AEA7"
              style={styles.input}
              editable={!saving}
              returnKeyType="next"
            />
          </FormSection>

          <FormSection
            icon="pricetag-outline"
            title="Pricing & Inventory"
            subtitle="Add pricing, quantity and shipping information."
          >
            <FieldLabel label="Price ₹" required />

            <View style={styles.inputWithIcon}>
              <View style={styles.inputIconBox}>
                <Text style={styles.rupeeIcon}>₹</Text>
              </View>

              <TextInput
                value={price}
                onChangeText={(value) =>
                  setPrice(
                    value.replace(/[^0-9.]/g, "")
                  )
                }
                placeholder="Example: 299"
                placeholderTextColor="#A3AEA7"
                style={styles.iconInput}
                keyboardType="decimal-pad"
                editable={!saving}
              />
            </View>

            <FieldLabel
              label="Net Quantity"
              required
              top
            />

            <TextInput
              value={netQty}
              onChangeText={setNetQty}
              placeholder="Example: 200 ml / 100 gm / 60 Capsules"
              placeholderTextColor="#A3AEA7"
              style={styles.input}
              editable={!saving}
            />

            <Text style={styles.helperText}>
              Enter the quantity exactly as it should appear for the product.
            </Text>

            <FieldLabel
              label="Shipping Weight (kg)"
              top
            />

            <TextInput
              value={weightInKg}
              onChangeText={(value) =>
                setWeightInKg(
                  value.replace(/[^0-9.]/g, "")
                )
              }
              placeholder="Example: 0.250"
              placeholderTextColor="#A3AEA7"
              style={styles.input}
              keyboardType="decimal-pad"
              editable={!saving}
            />

            <Text style={styles.helperText}>
              Optional. Enter 0 or leave blank when shipping weight is not needed.
            </Text>

            <FieldLabel
              label="Expiry Date"
              required
              top
            />

            <TouchableOpacity
              style={styles.selectField}
              onPress={() =>
                !saving && setShowDatePicker(true)
              }
              activeOpacity={0.82}
            >
              <Ionicons
                name="calendar-outline"
                size={19}
                color={GREEN}
              />

              <Text
                style={[
                  styles.selectText,
                  !expiryDate &&
                    styles.placeholderText,
                ]}
              >
                {expiryDate
                  ? formatDisplayDate(expiryDate)
                  : "Select expiry date"}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={MUTED}
              />
            </TouchableOpacity>

            <Text style={styles.helperText}>
              Expiry date must be later than today.
            </Text>
          </FormSection>

          <FormSection
            icon="options-outline"
            title="Classification & Manufacturer"
            subtitle="Choose how this product should be classified."
          >
            <SelectField
              label="Manufacturer"
              required
              placeholder={
                manufacturers.length
                  ? "Select manufacturer"
                  : "No manufacturers available"
              }
              value={manufacturer}
              options={manufacturers}
              onChange={setManufacturer}
              searchable
              disabled={saving || !manufacturers.length}
            />

            <SelectField
              label="Dosage Form"
              required
              placeholder="Select dosage form"
              value={dosageForm}
              options={DOSAGE_FORMS}
              onChange={setDosageForm}
              disabled={saving}
            />

            <SelectField
              label="Product Type"
              required
              placeholder="Select product type"
              value={productType}
              options={PRODUCT_TYPES}
              onChange={setProductType}
              disabled={saving}
            />

            <SelectField
              label="Product Section"
              required
              placeholder="Select product section"
              value={section}
              options={PRODUCT_SECTIONS}
              onChange={setSection}
              searchable
              showGroups
              disabled={saving}
            />

            <SelectField
              label="Product Status"
              required
              placeholder="Select status"
              value={productStatus}
              options={STATUS_OPTIONS}
              onChange={setProductStatus}
              disabled={saving}
            />

            <View
              style={[
                styles.statusNote,
                productStatus === "ACTIVE"
                  ? styles.activeNote
                  : styles.inactiveNote,
              ]}
            >
              <Ionicons
                name={
                  productStatus === "ACTIVE"
                    ? "checkmark-circle-outline"
                    : "pause-circle-outline"
                }
                size={18}
                color={
                  productStatus === "ACTIVE"
                    ? SUCCESS
                    : DANGER
                }
              />

              <Text
                style={[
                  styles.statusNoteText,
                  {
                    color:
                      productStatus === "ACTIVE"
                        ? SUCCESS
                        : DANGER,
                  },
                ]}
              >
                {productStatus === "ACTIVE"
                  ? "This product will be active after creation."
                  : "The product will be created first and then deactivated."}
              </Text>
            </View>
          </FormSection>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIcon}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={20}
                  color={GREEN}
                />
              </View>

              <View style={styles.flex}>
                <Text style={styles.summaryTitle}>
                  Ready to save?
                </Text>

                <Text style={styles.summaryText}>
                  Review the product details before creating it.
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Product
              </Text>
              <Text
                style={styles.summaryValue}
                numberOfLines={1}
              >
                {productName.trim() || "Not entered"}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Price
              </Text>
              <Text style={styles.summaryValue}>
                {price ? `₹${price}` : "Not entered"}
              </Text>
            </View>

            <View
              style={[
                styles.summaryRow,
                { borderBottomWidth: 0 },
              ]}
            >
              <Text style={styles.summaryLabel}>
                Status
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  {
                    color:
                      productStatus === "ACTIVE"
                        ? SUCCESS
                        : DANGER,
                  },
                ]}
              >
                {productStatus === "ACTIVE"
                  ? "Active"
                  : "Inactive"}
              </Text>
            </View>
          </View>

          <View style={styles.actionArea}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={cancel}
              activeOpacity={0.82}
              disabled={saving}
            >
              <Ionicons
                name="close-outline"
                size={20}
                color={GREEN}
              />

              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                saving &&
                  styles.saveButtonDisabled,
              ]}
              onPress={submitProduct}
              activeOpacity={0.86}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color={WHITE}
                />
              ) : (
                <Ionicons
                  name="save-outline"
                  size={19}
                  color={WHITE}
                />
              )}

              <Text style={styles.saveText}>
                {saving
                  ? "Saving Product..."
                  : "Save Product"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <DateTimePicker
          value={selectedExpiryDate()}
          mode="date"
          minimumDate={minimumExpiryDate()}
          display={
            Platform.OS === "ios"
              ? "spinner"
              : "default"
          }
          onChange={onDateChange}
        />
      )}

      <MedicalDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeRoute="/medical/products"
      />
    </View>
  );
}

function FormSection({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons
            name={icon}
            size={20}
            color={GOLD_DARK}
          />
        </View>

        <View style={styles.flex}>
          <Text style={styles.cardTitle}>
            {title}
          </Text>

          {!!subtitle && (
            <Text style={styles.cardSubtitle}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        {children}
      </View>
    </View>
  );
}

function FieldLabel({
  label,
  required = false,
  top = false,
}: {
  label: string;
  required?: boolean;
  top?: boolean;
}) {
  return (
    <Text
      style={[
        styles.label,
        top && styles.labelTop,
      ]}
    >
      {label}
      {required && (
        <Text style={styles.required}>
          {" "}*
        </Text>
      )}
    </Text>
  );
}

function SelectField({
  label,
  required = false,
  placeholder,
  value,
  options,
  onChange,
  searchable = false,
  showGroups = false,
  disabled = false,
}: {
  label: string;
  required?: boolean;
  placeholder: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  searchable?: boolean;
  showGroups?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedLabel =
    options.find(
      (item) => item.value === value
    )?.label || "";

  const filtered = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) return options;

    return options.filter(
      (item) =>
        item.label
          .toLowerCase()
          .includes(query) ||
        String(item.group || "")
          .toLowerCase()
          .includes(query)
    );
  }, [options, search]);

  function close() {
    setOpen(false);
    setSearch("");
  }

  return (
    <View style={styles.selectGroup}>
      <FieldLabel
        label={label}
        required={required}
      />

      <TouchableOpacity
        style={[
          styles.selectField,
          disabled &&
            styles.selectFieldDisabled,
        ]}
        onPress={() =>
          !disabled && setOpen(true)
        }
        activeOpacity={0.82}
      >
        <Text
          style={[
            styles.selectText,
            !selectedLabel &&
              styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </Text>

        <Ionicons
          name="chevron-down"
          size={18}
          color={disabled ? "#B7C0BA" : MUTED}
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={close}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.flex}>
                <Text style={styles.modalTitle}>
                  Select {label}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Tap an option to continue.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={close}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={GREEN}
                />
              </TouchableOpacity>
            </View>

            {searchable && (
              <View style={styles.searchBox}>
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={MUTED}
                />

                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={`Search ${label.toLowerCase()}`}
                  placeholderTextColor="#A4AEA8"
                  style={styles.searchInput}
                  autoFocus={false}
                />

                {!!search && (
                  <TouchableOpacity
                    onPress={() => setSearch("")}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={MUTED}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.optionList}
            >
              {!filtered.length ? (
                <View style={styles.emptyOptions}>
                  <Ionicons
                    name="search-outline"
                    size={25}
                    color={GOLD_DARK}
                  />

                  <Text style={styles.emptyOptionsText}>
                    No matching options found.
                  </Text>
                </View>
              ) : (
                filtered.map((item, index) => {
                  const previousGroup =
                    index > 0
                      ? filtered[index - 1].group
                      : undefined;

                  const showGroup =
                    showGroups &&
                    item.group &&
                    item.group !== previousGroup;

                  const selected =
                    value === item.value;

                  return (
                    <React.Fragment
                      key={`${item.value}-${index}`}
                    >
                      {showGroup && (
                        <Text style={styles.optionGroup}>
                          {item.group}
                        </Text>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.optionRow,
                          selected &&
                            styles.optionRowSelected,
                        ]}
                        onPress={() => {
                          onChange(item.value);
                          close();
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selected &&
                              styles.optionTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>

                        {selected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={SUCCESS}
                          />
                        )}
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatDisplayDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  content: {
    padding: 15,
    paddingBottom: 32,
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: CREAM,
  },

  loadingTitle: {
    marginTop: 14,
    color: GREEN,
    fontSize: 17,
    fontWeight: "800",
  },

  loadingText: {
    marginTop: 5,
    color: MUTED,
    fontSize: 11,
    textAlign: "center",
  },

  banner: {
    marginBottom: 15,
    padding: 20,
    overflow: "hidden",
    borderRadius: 21,
    backgroundColor: GREEN,
  },

  bannerDecorationOne: {
    position: "absolute",
    top: -75,
    right: -45,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  bannerDecorationTwo: {
    position: "absolute",
    right: 75,
    bottom: -85,
    width: 125,
    height: 125,
    borderRadius: 63,
    backgroundColor: "rgba(214,180,91,0.15)",
  },

  bannerIcon: {
    width: 48,
    height: 48,
    marginBottom: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  bannerEyebrow: {
    marginBottom: 5,
    color: GOLD_LIGHT,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  bannerTitle: {
    color: WHITE,
    fontSize: 25,
    fontWeight: "800",
  },

  bannerText: {
    marginTop: 7,
    maxWidth: 560,
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    lineHeight: 17,
  },

  card: {
    marginBottom: 14,
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  cardHeader: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "#FBFCFA",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  cardIcon: {
    width: 41,
    height: 41,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7DF",
  },

  cardTitle: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "800",
  },

  cardSubtitle: {
    marginTop: 2,
    color: MUTED,
    fontSize: 9,
    lineHeight: 13,
  },

  cardBody: {
    padding: 15,
  },

  label: {
    marginBottom: 7,
    color: GREEN,
    fontSize: 11,
    fontWeight: "800",
  },

  labelTop: {
    marginTop: 16,
  },

  required: {
    color: DANGER,
  },

  input: {
    minHeight: 50,
    paddingHorizontal: 13,
    borderRadius: 12,
    color: TEXT,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    fontSize: 12,
  },

  inputWithIcon: {
    minHeight: 50,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },

  inputIconBox: {
    width: 45,
    height: "100%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7FAF8",
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },

  rupeeIcon: {
    color: GREEN,
    fontSize: 17,
    fontWeight: "800",
  },

  iconInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    color: TEXT,
    fontSize: 12,
  },

  helperText: {
    marginTop: 6,
    color: MUTED,
    fontSize: 9,
    lineHeight: 14,
  },

  selectGroup: {
    marginBottom: 15,
  },

  selectField: {
    minHeight: 50,
    paddingHorizontal: 13,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },

  selectFieldDisabled: {
    opacity: 0.55,
    backgroundColor: "#F4F6F4",
  },

  selectText: {
    flex: 1,
    color: TEXT,
    fontSize: 12,
    fontWeight: "600",
  },

  placeholderText: {
    color: "#A1ACA5",
    fontWeight: "500",
  },

  statusNote: {
    marginTop: 1,
    padding: 11,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  activeNote: {
    backgroundColor: SUCCESS_LIGHT,
  },

  inactiveNote: {
    backgroundColor: DANGER_LIGHT,
  },

  statusNoteText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "700",
  },

  summaryCard: {
    marginBottom: 14,
    padding: 15,
    borderRadius: 17,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  summaryHeader: {
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  summaryIcon: {
    width: 39,
    height: 39,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SUCCESS_LIGHT,
  },

  summaryTitle: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "800",
  },

  summaryText: {
    marginTop: 2,
    color: MUTED,
    fontSize: 9,
    lineHeight: 13,
  },

  summaryRow: {
    minHeight: 39,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF0ED",
  },

  summaryLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
  },

  summaryValue: {
    flex: 1,
    color: GREEN,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "right",
  },

  actionArea: {
    padding: 12,
    borderRadius: 17,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 9,
  },

  cancelButton: {
    minHeight: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  cancelText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "800",
  },

  saveButton: {
    minHeight: 50,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GREEN,
  },

  saveButtonDisabled: {
    opacity: 0.68,
  },

  saveText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "800",
  },

  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,25,17,0.56)",
  },

  modalCard: {
    maxHeight: "78%",
    paddingTop: 8,
    paddingHorizontal: 14,
    paddingBottom:
      Platform.OS === "ios" ? 28 : 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: WHITE,
  },

  modalHandle: {
    width: 42,
    height: 4,
    alignSelf: "center",
    marginBottom: 11,
    borderRadius: 2,
    backgroundColor: "#DDE4DF",
  },

  modalHeader: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  modalTitle: {
    color: GREEN,
    fontSize: 17,
    fontWeight: "800",
  },

  modalSubtitle: {
    marginTop: 2,
    color: MUTED,
    fontSize: 9,
  },

  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F7F4",
  },

  searchBox: {
    minHeight: 45,
    marginVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },

  searchInput: {
    flex: 1,
    minHeight: 43,
    color: TEXT,
    fontSize: 11,
  },

  optionList: {
    paddingBottom: 8,
  },

  optionGroup: {
    marginTop: 12,
    marginBottom: 5,
    paddingHorizontal: 4,
    color: GOLD_DARK,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  optionRow: {
    minHeight: 48,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: "#FCFDFB",
    borderWidth: 1,
    borderColor: "#E8EDE9",
  },

  optionRowSelected: {
    backgroundColor: SUCCESS_LIGHT,
    borderColor: "#CFE5D8",
  },

  optionText: {
    flex: 1,
    color: TEXT,
    fontSize: 11,
    fontWeight: "600",
  },

  optionTextSelected: {
    color: SUCCESS,
    fontWeight: "800",
  },

  emptyOptions: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  emptyOptionsText: {
    color: MUTED,
    fontSize: 10,
  },
});
