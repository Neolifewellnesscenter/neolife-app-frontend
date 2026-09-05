import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts as useDMSans,
} from "@expo-google-fonts/dm-sans";
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  useFonts as usePlayfair,
} from "@expo-google-fonts/playfair-display";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { WebView } from "react-native-webview";

import { API_BASE_URL } from "../services/api";
import PatientDrawer from "../components/PatientDrawer";
import PatientHeader from "../components/PatientHeader";

/* =========================================================
   NEOLIFE THEME
========================================================= */

const GREEN = "#0B3D2E";
const GREEN_2 = "#14533D";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_DARK = "#A98632";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBFAF6";
const TEXT = "#17231D";
const MUTED = "#75837B";
const WHITE = "#FFFFFF";
const BORDER = "#E6EBE7";
const DANGER = "#B95045";
const DANGER_LIGHT = "#FBECE9";

/* =========================================================
   TYPES
========================================================= */

type CartItem = {
  id: number;
  productId: number;
  productName?: string;
  quantity?: number;
  price?: number;
  totalPrice?: number;

};


type Address = {
  id: number;
  fullName?: string;
  phone?: string;
  houseNo?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isDefault?: boolean;
};

type OrderSummary = {
  subtotal: number;
  couponCode?: string | null;
  discount: number;
  shippingCharge: number | null;
  gst: number;
  total: number | null;
  [key: string]: any;
};

type PaymentData = {
  keyId?: string;
  razorpayOrderId?: string;
  amount?: number;
  currency?: string;
  name?: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
};

type NoticeType = "success" | "error" | "info";

type NoticeState = {
  visible: boolean;
  type: NoticeType;
  title: string;
  message: string;
};

type RemoveState = {
  visible: boolean;
  item: CartItem | null;
};

/* =========================================================
   HELPERS
========================================================= */

function formatMoney(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}


function toNullableNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeOrderSummary(data: any): OrderSummary {
  const summary = data && typeof data === "object" ? data : {};

  return {
    ...summary,
    subtotal:
      toNullableNumber(summary.subtotal ?? summary.subTotal) ?? 0,
    couponCode:
      summary.couponCode || summary.appliedCouponCode || null,
    discount:
      toNullableNumber(summary.discount ?? summary.discountAmount) ?? 0,
    shippingCharge: toNullableNumber(
      summary.shippingCharge ??
        summary.deliveryCharge ??
        summary.shippingFee ??
        summary.deliveryFee
    ),
    gst:
      toNullableNumber(
        summary.gst ?? summary.gstAmount ?? summary.taxAmount
      ) ?? 0,
    total: toNullableNumber(
      summary.total ?? summary.totalAmount ?? summary.grandTotal
    ),
  };
}



/* =========================================================
   SCREEN
========================================================= */

export default function CartScreen() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  

  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const [removeState, setRemoveState] = useState<RemoveState>({
    visible: false,
    item: null,
  });

  const [notice, setNotice] = useState<NoticeState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });


  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"address" | "summary">(
    "address"
  );
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null
  );
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(
    null
  );
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  /* =======================================================
     CALCULATIONS
  ======================================================= */

  const totalQuantity = useMemo(() => {
    return cart.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((total, item) => {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);

      const itemTotal = Number(
        item.totalPrice !== undefined && item.totalPrice !== null
          ? item.totalPrice
          : price * quantity
      );

      return total + itemTotal;
    }, 0);
  }, [cart]);

  /* =======================================================
     NOTICE
  ======================================================= */

  function showNotice(
    type: NoticeType,
    title: string,
    message: string
  ) {
    setNotice({
      visible: true,
      type,
      title,
      message,
    });
  }

  function closeNotice() {
    setNotice((current) => ({
      ...current,
      visible: false,
    }));
  }

  /* =======================================================
     SESSION
  ======================================================= */

  const handleSessionExpired = useCallback(async () => {
    await AsyncStorage.multiRemove([
      "token",
      "refreshToken",
      "userId",
      "email",
      "role",
      "profileCompleted",
      "isLoggedIn",
    ]);

    showNotice(
      "error",
      "Session Expired",
      "Your NeoLife session has expired. Please sign in again."
    );
  }, []);

  /* =======================================================
     LOAD CART
  ======================================================= */

  const loadCart = useCallback(
    async (showMainLoader = true) => {
      if (showMainLoader) {
        setLoading(true);
      }

      try {
        const token = await AsyncStorage.getItem("token");

        if (!token) {
          setCart([]);

          showNotice(
            "info",
            "Login Required",
            "Please sign in to view the products in your cart."
          );

          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/cart/getCart`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401 || response.status === 403) {
          setCart([]);
          await handleSessionExpired();
          return;
        }

        const result = await response.json().catch(() => ({}));

        if (response.ok && result?.success) {
          setCart(
            Array.isArray(result.data)
              ? result.data
              : []
          );
        } else {
          setCart([]);

          showNotice(
            "error",
            "Unable to Load Cart",
            result?.message ||
              "We couldn't load your cart right now. Please try again."
          );
        }
      } catch (error) {
        console.error("LOAD CART ERROR:", error);

        setCart([]);

        showNotice(
          "error",
          "Connection Problem",
          "Unable to connect to NeoLife. Please check your connection and try again."
        );
      } finally {
        if (showMainLoader) {
          setLoading(false);
        }

        setRefreshing(false);
      }
    },
    [handleSessionExpired]
  );

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  
  /* =======================================================
     REFRESH
  ======================================================= */

  async function onRefresh() {
    setRefreshing(true);
    await loadCart(false);
  }

  /* =======================================================
     UPDATE QUANTITY
  ======================================================= */

  async function updateCartQuantity(
    item: CartItem,
    newQuantity: number
  ) {
    if (updatingId !== null || removingId !== null) {
      return;
    }

    if (newQuantity <= 0) {
      setRemoveState({
        visible: true,
        item,
      });

      return;
    }

    const oldQuantity = Number(item.quantity || 0);

    /*
     * Instant visual update.
     */
    setCart((current) =>
      current.map((cartItem) =>
        cartItem.id === item.id
          ? {
              ...cartItem,
              quantity: newQuantity,
              totalPrice:
                Number(cartItem.price || 0) * newQuantity,
            }
          : cartItem
      )
    );

    setUpdatingId(item.id);

    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        throw new Error("LOGIN_REQUIRED");
      }

      const response = await fetch(
        `${API_BASE_URL}/cart/update/${item.id}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: Number(item.productId),
            quantity: Number(newQuantity),
          }),
        }
      );

      if (response.status === 401 || response.status === 403) {
        setCart((current) =>
          current.map((cartItem) =>
            cartItem.id === item.id
              ? {
                  ...cartItem,
                  quantity: oldQuantity,
                  totalPrice:
                    Number(cartItem.price || 0) * oldQuantity,
                }
              : cartItem
          )
        );

        await handleSessionExpired();
        return;
      }

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || "Failed to update quantity."
        );
      }

      /*
       * Backend remains source of truth,
       * same as your website.
       */
      await loadCart(false);
    } catch (error: any) {
      setCart((current) =>
        current.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity: oldQuantity,
                totalPrice:
                  Number(cartItem.price || 0) * oldQuantity,
              }
            : cartItem
        )
      );

      if (error?.message === "LOGIN_REQUIRED") {
        showNotice(
          "info",
          "Login Required",
          "Please sign in again to update your cart."
        );
      } else {
        showNotice(
          "error",
          "Update Failed",
          error?.message ||
            "Unable to update this product quantity."
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  /* =======================================================
     REMOVE
  ======================================================= */

  function requestRemove(item: CartItem) {
    setRemoveState({
      visible: true,
      item,
    });
  }

  function cancelRemove() {
    setRemoveState({
      visible: false,
      item: null,
    });
  }

  async function confirmRemove() {
    const item = removeState.item;

    if (!item) return;

    setRemoveState({
      visible: false,
      item: null,
    });

    setRemovingId(item.id);

    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        showNotice(
          "info",
          "Login Required",
          "Please sign in again to manage your cart."
        );

        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/cart/remove/${item.id}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        await handleSessionExpired();
        return;
      }

      const result = await response.json().catch(() => ({}));

      if (response.ok && result?.success) {
        setCart((current) =>
          current.filter(
            (cartItem) => cartItem.id !== item.id
          )
        );
      } else {
        showNotice(
          "error",
          "Unable to Remove",
          result?.message ||
            "We couldn't remove this product from your cart."
        );
      }
    } catch (error) {
      console.error("REMOVE CART ERROR:", error);

      showNotice(
        "error",
        "Something Went Wrong",
        "Unable to remove this product. Please try again."
      );
    } finally {
      setRemovingId(null);
    }
  }

  /* =======================================================
     CHECKOUT
  ======================================================= */

  async function apiRequest(
    endpoint: string,
    options: RequestInit = {}
  ) {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Please login to continue.");
    }

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

    if (response.status === 401 || response.status === 403) {
      await handleSessionExpired();
      throw new Error(
        result?.message ||
          "Your session has expired. Please login again."
      );
    }

    if (!response.ok || result?.success === false) {
      throw new Error(
        result?.message || `Request failed (${response.status})`
      );
    }

    return result;
  }

  function buildOrderRequest() {
    const request: any = {
      addressId: Number(selectedAddressId),
      items: cart.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity || 0),
      })),
    };

    const cleanCoupon = couponCode.trim();

    if (cleanCoupon) {
      request.couponCode = cleanCoupon;
    }

    return request;
  }

  async function proceedToCheckout() {
    if (cart.length === 0) {
      showNotice(
        "info",
        "Your Cart is Empty",
        "Add products to your cart before continuing to checkout."
      );
      return;
    }

    const token = await AsyncStorage.getItem("token");

    if (!token) {
      showNotice(
        "info",
        "Login Required",
        "Please sign in before continuing to checkout."
      );
      return;
    }

    setCheckoutStep("address");
    setCouponCode("");
    setOrderSummary(null);
    setPendingOrder(null);
    setPaymentData(null);

    await loadUserAddresses();
  }

  async function loadUserAddresses() {
    setLoadingAddresses(true);

    try {
      const result = await apiRequest("/address/get", {
        method: "GET",
      });

      const list = Array.isArray(result?.data) ? result.data : [];

      if (list.length === 0) {
        await AsyncStorage.multiSet([
          ["returnToCheckout", "true"],
          ["checkoutReturnPage", "cart"],
        ]);

        showNotice(
          "info",
          "Delivery Address Required",
          "Please add a delivery address in your profile before continuing to checkout."
        );
        return false;
      }

      setAddresses(list);

      const defaultAddress =
        list.find((address: Address) => address.isDefault) || list[0];

      setSelectedAddressId(Number(defaultAddress.id));
      setCheckoutVisible(true);

      return true;
    } catch (error: any) {
      console.log("LOAD ADDRESS ERROR:", error);

      showNotice(
        "error",
        "Unable to Load Addresses",
        error?.message ||
          "We couldn't load your delivery addresses. Please try again."
      );

      return false;
    } finally {
      setLoadingAddresses(false);
    }
  }

  function closeCheckout() {
    if (placingOrder || verifyingPayment) return;

    setCheckoutVisible(false);
    setCheckoutStep("address");
    setOrderSummary(null);
  }

  async function continueToSummary() {
    if (!selectedAddressId) {
      showNotice(
        "info",
        "Select Delivery Address",
        "Please select a delivery address to continue."
      );
      return;
    }

    setCheckoutStep("summary");
    await refreshOrderSummary();
  }

  async function refreshOrderSummary() {
    if (!selectedAddressId) {
      showNotice(
        "info",
        "Select Delivery Address",
        "Please select a delivery address first."
      );
      return;
    }

    if (cart.length === 0) {
      showNotice(
        "info",
        "Your Cart is Empty",
        "Your cart is empty."
      );
      return;
    }

    setSummaryLoading(true);
    setOrderSummary(null);

    try {
      const result = await apiRequest("/orders/summary", {
        method: "POST",
        body: JSON.stringify(buildOrderRequest()),
      });

      const normalized = normalizeOrderSummary(result?.data);
      setOrderSummary(normalized);

      showNotice(
        "success",
        normalized.couponCode ? "Coupon Applied" : "Order Summary Ready",
        result?.message ||
          (normalized.couponCode
            ? "Your coupon has been applied and the order total has been updated."
            : "Shipping and final payable amount have been calculated.")
      );
    } catch (error: any) {
      console.log("ORDER SUMMARY ERROR:", error);

      showNotice(
        "error",
        "Unable to Calculate Total",
        error?.message ||
          "Unable to calculate your order summary."
      );
    } finally {
      setSummaryLoading(false);
    }
  }

  async function confirmPlaceOrder() {
    if (!selectedAddressId) {
      showNotice(
        "error",
        "Address Required",
        "Please select a delivery address."
      );
      return;
    }

    if (cart.length === 0) {
      showNotice("error", "Your Cart is Empty", "Your cart is empty.");
      return;
    }

    if (
      !orderSummary ||
      orderSummary.shippingCharge === null ||
      orderSummary.total === null
    ) {
      showNotice(
        "error",
        "Recalculate Order",
        "Shipping charge and final total are required before payment can continue."
      );

      await refreshOrderSummary();
      return;
    }

    setPlacingOrder(true);

    try {
      const createResult = await apiRequest("/orders/create", {
        method: "POST",
        body: JSON.stringify(buildOrderRequest()),
      });

      const createdOrder = createResult?.data;

      if (!createdOrder?.id) {
        throw new Error(
          "Order was created but the order ID is missing."
        );
      }

      const createdShippingCharge = toNullableNumber(
        createdOrder?.shippingCharge ?? createdOrder?.deliveryCharge
      );

      const createdTotal = toNullableNumber(
        createdOrder?.totalAmount ?? createdOrder?.total
      );

      if (
        createdShippingCharge !== null &&
        orderSummary.shippingCharge !== null &&
        Math.abs(
          createdShippingCharge - Number(orderSummary.shippingCharge)
        ) > 0.01
      ) {
        throw new Error(
          "The created order shipping charge does not match the checkout summary. Please refresh and try again."
        );
      }

      if (
        createdTotal !== null &&
        orderSummary.total !== null &&
        Math.abs(createdTotal - Number(orderSummary.total)) > 0.01
      ) {
        throw new Error(
          "The created order total does not match the checkout summary. Please refresh and try again."
        );
      }

      setPendingOrder(createdOrder);

      const paymentResult = await apiRequest(
        `/payments/order/${encodeURIComponent(
          String(createdOrder.id)
        )}/initiate`,
        {
          method: "POST",
        }
      );

      const initiatedPayment = paymentResult?.data || {};

      const requiredFields = [
        "keyId",
        "razorpayOrderId",
        "amount",
        "currency",
      ];

      const missingField = requiredFields.find(
        (field) =>
          initiatedPayment[field] === null ||
          initiatedPayment[field] === undefined ||
          initiatedPayment[field] === ""
      );

      if (missingField) {
        throw new Error(
          `Payment initiation response is missing ${missingField}.`
        );
      }

      setPaymentData(initiatedPayment);
      setPaymentVisible(true);
    } catch (error: any) {
      console.log("ORDER / PAYMENT INITIATION ERROR:", error);

      showNotice(
        "error",
        "Unable to Start Payment",
        error?.message ||
          "Unable to create the order or initiate payment."
      );
    } finally {
      setPlacingOrder(false);
    }
  }

  function buildRazorpayHtml() {
    if (!paymentData || !pendingOrder) {
      return "<html><body></body></html>";
    }

    const options = {
      key: paymentData.keyId,
      amount: Number(paymentData.amount),
      currency: paymentData.currency || "INR",
      name: paymentData.name || "NeoLife Wellness Center",
      description:
        paymentData.description ||
        `Order ${pendingOrder?.orderNumber || pendingOrder?.id || ""}`,
      order_id: paymentData.razorpayOrderId,
      prefill: {
        name: paymentData.customerName || "",
        email: paymentData.customerEmail || "",
        contact: paymentData.customerPhone || "",
      },
      notes: {
        orderId: String(pendingOrder?.id || ""),
        orderNumber: String(pendingOrder?.orderNumber || ""),
      },
      theme: {
        color: "#073f34",
      },
    };

    return `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
          <style>
            html,body{margin:0;padding:0;background:#FBFAF6;font-family:Arial,sans-serif}
            .loading{min-height:100vh;display:flex;align-items:center;justify-content:center;color:#0B3D2E}
          </style>
        </head>
        <body>
          <div class="loading">Opening secure payment…</div>
          <script>
            const options = ${JSON.stringify(options)};

            options.handler = function(response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "success",
                response
              }));
            };

            options.modal = {
              ondismiss: function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: "dismiss"
                }));
              }
            };

            const razorpay = new Razorpay(options);

            razorpay.on("payment.failed", function(response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "failed",
                error: response && response.error ? response.error : null
              }));
            });

            razorpay.open();
          </script>
        </body>
      </html>
    `;
  }

  async function handleRazorpayMessage(event: any) {
    let message: any;

    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (message?.type === "dismiss") {
      setPaymentVisible(false);

      showNotice(
        "info",
        "Payment Not Completed",
        "Your order remains pending. You can complete payment later from My Orders."
      );
      return;
    }

    if (message?.type === "failed") {
      setPaymentVisible(false);

      showNotice(
        "error",
        "Payment Failed",
        message?.error?.description ||
          "Payment failed. Please try again."
      );
      return;
    }

    if (message?.type === "success") {
      setPaymentVisible(false);
      await verifyRazorpayPayment(message.response);
    }
  }

  async function verifyRazorpayPayment(razorpayResponse: any) {
    if (!razorpayResponse) return;

    setVerifyingPayment(true);

    try {
      const verifyResult = await apiRequest(
        "/payments/razorpay/verify",
        {
          method: "POST",
          body: JSON.stringify({
            razorpayPaymentId:
              razorpayResponse.razorpay_payment_id,
            razorpayOrderId:
              razorpayResponse.razorpay_order_id,
            razorpaySignature:
              razorpayResponse.razorpay_signature,
          }),
        }
      );

      if (verifyResult?.data?.signatureVerified === false) {
        throw new Error(
          "Payment signature verification failed."
        );
      }

      await clearBackendCart();

      const paidOrderId = pendingOrder?.id;

      setCart([]);
      setCheckoutVisible(false);
      setOrderSummary(null);
      setPendingOrder(null);
      setPaymentData(null);

      if (paidOrderId) {
        await AsyncStorage.setItem(
          "lastPaidOrderId",
          String(paidOrderId)
        );
      }

      showNotice(
        "success",
        "Payment Successful",
        "Your payment was verified successfully and your order has been confirmed."
      );
    } catch (error: any) {
      console.log("PAYMENT VERIFICATION ERROR:", error);

      showNotice(
        "error",
        "Verification Failed",
        error?.message ||
          "Payment completed, but verification failed. Please contact support before paying again."
      );
    } finally {
      setVerifyingPayment(false);
    }
  }

  async function clearBackendCart() {
    const token = await AsyncStorage.getItem("token");

    if (!token) return;

    for (const item of cart) {
      try {
        await fetch(`${API_BASE_URL}/cart/remove/${item.id}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.log("Failed to remove cart item:", item.id, error);
      }
    }
  }

  /* =======================================================
     NOTICE ACTION
  ======================================================= */

  async function handleNoticeAction() {
    const isLoginNotice =
      notice.title === "Login Required" ||
      notice.title === "Session Expired";

    closeNotice();

    if (isLoginNotice) {
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

  /* =======================================================
     FONT LOADING
  ======================================================= */

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.fontLoader}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <View style={styles.screen}>
      
<PatientHeader
  onMenuPress={() => setMenuOpen(true)}
/>
      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons
              name="leaf-outline"
              size={29}
              color={GREEN}
            />
          </View>

          <ActivityIndicator
            size="small"
            color={GOLD_DARK}
            style={{ marginTop: 18 }}
          />

          <Text style={styles.loadingTitle}>
            Preparing Your Cart
          </Text>

          <Text style={styles.loadingText}>
            Gathering your NeoLife wellness products...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={GREEN}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* HERO */}
          <View style={styles.hero}>
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />

            <View style={styles.heroTopRow}>
              <View style={styles.heroIcon}>
                <Ionicons
                  name="basket-outline"
                  size={25}
                  color={GOLD_LIGHT}
                />
              </View>

              <View style={styles.secureBadge}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={GOLD_LIGHT}
                />

                <Text style={styles.secureBadgeText}>
                  SECURE CART
                </Text>
              </View>
            </View>

            <Text style={styles.heroEyebrow}>
              YOUR WELLNESS SELECTION
            </Text>

            <Text style={styles.heroTitle}>
              Carefully chosen,
              {"\n"}
              ready for you.
            </Text>

            <Text style={styles.heroText}>
              Review your wellness products, adjust quantities
              and continue when everything looks right.
            </Text>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {totalQuantity}
                </Text>

                <Text style={styles.heroStatLabel}>
                  {totalQuantity === 1 ? "ITEM" : "ITEMS"}
                </Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  ₹{formatMoney(subtotal)}
                </Text>

                <Text style={styles.heroStatLabel}>
                  CART VALUE
                </Text>
              </View>
            </View>
          </View>

          {cart.length === 0 ? (
            /* EMPTY CART */
            <View style={styles.emptyCard}>
              <View style={styles.emptyIllustration}>
                <View style={styles.emptySmallCircleOne} />
                <View style={styles.emptySmallCircleTwo} />

                <View style={styles.emptyIconCircle}>
                  <Ionicons
                    name="cart-outline"
                    size={41}
                    color={GREEN}
                  />
                </View>
              </View>

              <Text style={styles.emptyEyebrow}>
                YOUR CART IS WAITING
              </Text>

              <Text style={styles.emptyTitle}>
                Nothing here yet
              </Text>

              <Text style={styles.emptyText}>
                Medicines and wellness products added for you
                will appear here, ready to review and order.
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.exploreButton}
                onPress={() =>
                  router.replace("/(tabs)" as any)
                }
              >
                <Ionicons
                  name="home-outline"
                  size={18}
                  color={WHITE}
                />

                <Text style={styles.exploreButtonText}>
                  Return to Home
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={17}
                  color={WHITE}
                />
              </TouchableOpacity>

              <View style={styles.emptySupport}>
                <Ionicons
                  name="medical-outline"
                  size={17}
                  color={GOLD_DARK}
                />

                <Text style={styles.emptySupportText}>
                  Prescribed medicines may be added to your cart
                  after consultation.
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* CART SECTION */}
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionEyebrow}>
                    YOUR PRODUCTS
                  </Text>

                  <Text style={styles.sectionTitle}>
                    Cart Essentials
                  </Text>
                </View>

                <View style={styles.itemCountPill}>
                  <Text style={styles.itemCountText}>
                    {totalQuantity}{" "}
                    {totalQuantity === 1 ? "item" : "items"}
                  </Text>
                </View>
              </View>

              {/* PRODUCT CARDS */}
              <View style={styles.products}>
                {cart.map((item, index) => {
                  const quantity = Number(item.quantity || 0);
                  const price = Number(item.price || 0);

                  const total = Number(
                    item.totalPrice !== undefined &&
                      item.totalPrice !== null
                      ? item.totalPrice
                      : price * quantity
                  );

                  

                  const busy =
                    updatingId === item.id ||
                    removingId === item.id;

                  return (
                    <View
                      key={String(item.id)}
                      style={styles.productCard}
                    >
                      <View style={styles.productCardTop}>
                        <View style={styles.productNumber}>
                          <Text style={styles.productNumberText}>
                            {String(index + 1).padStart(2, "0")}
                          </Text>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.75}
                          style={styles.removeIconButton}
                          disabled={busy}
                          onPress={() => requestRemove(item)}
                        >
                          {removingId === item.id ? (
                            <ActivityIndicator
                              size="small"
                              color={DANGER}
                            />
                          ) : (
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color={DANGER}
                            />
                          )}
                        </TouchableOpacity>
                      </View>

                      <View style={styles.productMain}>
                       

                          

                        {/* INFO */}
                        <View style={styles.productInfo}>
                          <Text style={styles.productCategory}>
                            NEOLIFE CARE
                          </Text>

                          <Text
                            style={styles.productName}
                            numberOfLines={2}
                          >
                            {item.productName || "Wellness Product"}
                          </Text>

                          <View style={styles.priceRow}>
                            <Text style={styles.price}>
                              ₹{formatMoney(price)}
                            </Text>

                            <Text style={styles.eachText}>
                              / each
                            </Text>
                          </View>

                          <View style={styles.quantityLabelRow}>
                            <Text style={styles.quantityLabel}>
                              Quantity
                            </Text>

                            {updatingId === item.id && (
                              <View style={styles.updatingRow}>
                                <ActivityIndicator
                                  size={10}
                                  color={GOLD_DARK}
                                />

                                <Text style={styles.updatingText}>
                                  Updating
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* QUANTITY */}
                          <View style={styles.quantityControl}>
                            <TouchableOpacity
                              style={styles.quantityButton}
                              disabled={busy}
                              activeOpacity={0.7}
                              onPress={() =>
                                updateCartQuantity(
                                  item,
                                  quantity - 1
                                )
                              }
                            >
                              <Ionicons
                                name="remove"
                                size={19}
                                color={GREEN}
                              />
                            </TouchableOpacity>

                            <View style={styles.quantityValueWrap}>
                              <Text style={styles.quantityValue}>
                                {quantity}
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={styles.quantityButton}
                              disabled={busy}
                              activeOpacity={0.7}
                              onPress={() =>
                                updateCartQuantity(
                                  item,
                                  quantity + 1
                                )
                              }
                            >
                              <Ionicons
                                name="add"
                                size={19}
                                color={GREEN}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      {/* ITEM TOTAL */}
                      <View style={styles.productFooter}>
                        <View style={styles.productFooterLeft}>
                          <View style={styles.checkCircle}>
                            <Ionicons
                              name="checkmark"
                              size={12}
                              color={WHITE}
                            />
                          </View>

                          <Text style={styles.productFooterText}>
                            Ready for checkout
                          </Text>
                        </View>

                        <View style={styles.itemTotalWrap}>
                          <Text style={styles.itemTotalLabel}>
                            ITEM TOTAL
                          </Text>

                          <Text style={styles.itemTotal}>
                            ₹{formatMoney(total)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* ORDER SUMMARY */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View>
                    <Text style={styles.summaryEyebrow}>
                      ORDER OVERVIEW
                    </Text>

                    <Text style={styles.summaryTitle}>
                      Cart Summary
                    </Text>
                  </View>

                  <View style={styles.summaryIcon}>
                    <Ionicons
                      name="receipt-outline"
                      size={22}
                      color={GOLD}
                    />
                  </View>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Total quantity
                  </Text>

                  <Text style={styles.summaryValue}>
                    {totalQuantity}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Cart subtotal
                  </Text>

                  <Text style={styles.summaryValue}>
                    ₹{formatMoney(subtotal)}
                  </Text>
                </View>

                <View style={styles.deliveryNotice}>
                  <View style={styles.deliveryIcon}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={GREEN}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.deliveryTitle}>
                      Delivery calculated at checkout
                    </Text>

                    <Text style={styles.deliveryText}>
                      Shipping, discounts and final payable
                      amount are calculated after selecting your
                      delivery address.
                    </Text>
                  </View>
                </View>

                <View style={styles.grandTotalRow}>
                  <View>
                    <Text style={styles.grandTotalLabel}>
                      CURRENT SUBTOTAL
                    </Text>

                    <Text style={styles.grandTotalSubtext}>
                      Before delivery & discounts
                    </Text>
                  </View>

                  <Text style={styles.grandTotal}>
                    ₹{formatMoney(subtotal)}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.checkoutButton}
                  onPress={proceedToCheckout}
                >
                  <View style={styles.checkoutButtonIcon}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={17}
                      color={GREEN}
                    />
                  </View>

                  <Text style={styles.checkoutButtonText}>
                    Proceed to Checkout
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color={WHITE}
                  />
                </TouchableOpacity>

                <View style={styles.paymentTrust}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={16}
                    color={GREEN}
                  />

                  <Text style={styles.paymentTrustText}>
                    Secure checkout • Protected payment
                  </Text>
                </View>
              </View>

              {/* CARE NOTE */}
              <View style={styles.careCard}>
                <View style={styles.careIcon}>
                  <Ionicons
                    name="heart-outline"
                    size={20}
                    color={GOLD_DARK}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.careTitle}>
                    Wellness with care
                  </Text>

                  <Text style={styles.careText}>
                    Please follow your doctor's prescription and
                    recommended dosage while using prescribed
                    wellness products.
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* SAME FULL FOOTER USED ACROSS NEOLIFE APP */}
          <View style={styles.footer}>
            <Image
              source={require("../assets/images/main_logo.jpeg")}
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
      )}

      {/* SAME FLOATING WHATSAPP USED ACROSS NEOLIFE APP */}
      <TouchableOpacity
        style={styles.whatsapp}
        activeOpacity={0.86}
        onPress={() =>
          openURL(
            "https://wa.me/919481489866?text=Hello%20NeoLife%20Wellness%20Center,%20I%20need%20help%20with%20my%20cart."
          )
        }
      >
        <Ionicons name="logo-whatsapp" size={28} color={WHITE} />
      </TouchableOpacity>

      {/* SECURE CHECKOUT - SAME FLOW AS WEBSITE, MOBILE UI */}
      <Modal
        visible={checkoutVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeCheckout}
      >
        <View style={styles.checkoutModalRoot}>
          <Pressable
            style={styles.checkoutBackdrop}
            onPress={closeCheckout}
          />

          <View style={styles.checkoutSheet}>
            <View style={styles.checkoutSheetHeader}>
              <View>
                <Text style={styles.checkoutEyebrow}>
                  SECURE CHECKOUT
                </Text>
                <Text style={styles.checkoutTitle}>
                  {checkoutStep === "address"
                    ? "Delivery Address"
                    : "Review & Pay"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.checkoutClose}
                disabled={placingOrder || verifyingPayment}
                onPress={closeCheckout}
              >
                <Ionicons name="close" size={21} color={GREEN} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.checkoutScroll}
            >
              {checkoutStep === "address" ? (
                <>
                  <Text style={styles.checkoutStepLabel}>
                    1. SELECT DELIVERY ADDRESS
                  </Text>

                  {loadingAddresses ? (
                    <View style={styles.checkoutLoading}>
                      <ActivityIndicator color={GREEN} />
                      <Text style={styles.checkoutLoadingText}>
                        Loading your saved addresses...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.addressList}>
                      {addresses.map((address) => {
                        const selected =
                          Number(selectedAddressId) ===
                          Number(address.id);

                        return (
                          <TouchableOpacity
                            key={String(address.id)}
                            activeOpacity={0.85}
                            style={[
                              styles.addressCard,
                              selected && styles.addressCardSelected,
                            ]}
                            onPress={() =>
                              setSelectedAddressId(
                                Number(address.id)
                              )
                            }
                          >
                            <View
                              style={[
                                styles.radioOuter,
                                selected && styles.radioOuterSelected,
                              ]}
                            >
                              {selected && (
                                <View style={styles.radioInner} />
                              )}
                            </View>

                            <View style={{ flex: 1 }}>
                              <View style={styles.addressTopRow}>
                                <Text style={styles.addressName}>
                                  {address.fullName ||
                                    "Delivery Address"}
                                </Text>

                                {address.isDefault && (
                                  <View
                                    style={styles.defaultAddressBadge}
                                  >
                                    <Text
                                      style={
                                        styles.defaultAddressText
                                      }
                                    >
                                      DEFAULT
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {!!address.phone && (
                                <Text style={styles.addressPhone}>
                                  {address.phone}
                                </Text>
                              )}

                              <Text style={styles.addressText}>
                                {[
                                  address.houseNo,
                                  address.street,
                                  address.city,
                                  address.state,
                                  address.pincode,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  <View style={styles.checkoutActionRow}>
                    <TouchableOpacity
                      style={styles.checkoutSecondaryButton}
                      onPress={closeCheckout}
                    >
                      <Text
                        style={styles.checkoutSecondaryText}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.checkoutPrimaryButton}
                      onPress={continueToSummary}
                      disabled={
                        !selectedAddressId || loadingAddresses
                      }
                    >
                      <Text style={styles.checkoutPrimaryText}>
                        Continue
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={17}
                        color={WHITE}
                      />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.checkoutStepLabel}>
                    SELECTED ADDRESS
                  </Text>

                  {(() => {
                    const address = addresses.find(
                      (item) =>
                        Number(item.id) ===
                        Number(selectedAddressId)
                    );

                    return address ? (
                      <View style={styles.selectedAddressCard}>
                        <Ionicons
                          name="location-outline"
                          size={20}
                          color={GREEN}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.addressName}>
                            {address.fullName ||
                              "Delivery Address"}
                          </Text>
                          {!!address.phone && (
                            <Text style={styles.addressPhone}>
                              {address.phone}
                            </Text>
                          )}
                          <Text style={styles.addressText}>
                            {[
                              address.houseNo,
                              address.street,
                              address.city,
                              address.state,
                              address.pincode,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </Text>
                        </View>
                      </View>
                    ) : null;
                  })()}

                  <Text
                    style={[
                      styles.checkoutStepLabel,
                      { marginTop: 22 },
                    ]}
                  >
                    2. APPLY COUPON
                  </Text>

                  <View style={styles.couponRow}>
                    <TextInput
                      value={couponCode}
                      onChangeText={setCouponCode}
                      placeholder="Enter coupon code (optional)"
                      placeholderTextColor="#9AA59E"
                      autoCapitalize="characters"
                      style={styles.couponInput}
                    />

                    <TouchableOpacity
                      style={styles.couponButton}
                      disabled={summaryLoading}
                      onPress={refreshOrderSummary}
                    >
                      {summaryLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={WHITE}
                        />
                      ) : (
                        <Text style={styles.couponButtonText}>
                          Apply
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={[
                      styles.checkoutStepLabel,
                      { marginTop: 22 },
                    ]}
                  >
                    3. ORDER SUMMARY
                  </Text>

                  <View style={styles.checkoutProducts}>
                    {cart.map((item) => {
                      const quantity = Number(
                        item.quantity || 0
                      );
                      const price = Number(item.price || 0);
                      const itemTotal = Number(
                        item.totalPrice ??
                          price * quantity
                      );

                      return (
                        <View
                          key={`checkout-${item.id}`}
                          style={styles.checkoutProductRow}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={styles.checkoutProductName}
                            >
                              {item.productName ||
                                "Wellness Product"}
                            </Text>
                            <Text
                              style={styles.checkoutProductMeta}
                            >
                              {quantity} × ₹
                              {formatMoney(price)}
                            </Text>
                          </View>

                          <Text
                            style={styles.checkoutProductTotal}
                          >
                            ₹{formatMoney(itemTotal)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.finalSummaryCard}>
                    {summaryLoading ? (
                      <View style={styles.checkoutLoading}>
                        <ActivityIndicator color={GREEN} />
                        <Text
                          style={styles.checkoutLoadingText}
                        >
                          Calculating shipping and total...
                        </Text>
                      </View>
                    ) : orderSummary ? (
                      <>
                        <SummaryLine
                          label="Subtotal"
                          value={`₹${formatMoney(
                            orderSummary.subtotal
                          )}`}
                        />

                        {!!orderSummary.couponCode && (
                          <SummaryLine
                            label="Coupon"
                            value={String(
                              orderSummary.couponCode
                            )}
                          />
                        )}

                        <SummaryLine
                          label="Discount"
                          value={`- ₹${formatMoney(
                            orderSummary.discount
                          )}`}
                          accent
                        />

                        <SummaryLine
                          label="Shipping"
                          value={
                            orderSummary.shippingCharge ===
                            null
                              ? "Not calculated"
                              : `₹${formatMoney(
                                  orderSummary.shippingCharge
                                )}`
                          }
                        />

                        <SummaryLine
                          label="GST"
                          value={`₹${formatMoney(
                            orderSummary.gst
                          )}`}
                        />

                        <View
                          style={styles.finalSummaryDivider}
                        />

                        <View
                          style={styles.finalSummaryTotalRow}
                        >
                          <Text
                            style={styles.finalSummaryTotalLabel}
                          >
                            Total
                          </Text>
                          <Text
                            style={styles.finalSummaryTotalValue}
                          >
                            {orderSummary.total === null
                              ? "Not calculated"
                              : `₹${formatMoney(
                                  orderSummary.total
                                )}`}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <Text style={styles.summaryUnavailableText}>
                        Order summary could not be calculated.
                      </Text>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.checkoutStepLabel,
                      { marginTop: 22 },
                    ]}
                  >
                    4. PAYMENT METHOD
                  </Text>

                  <View style={styles.paymentMethodCard}>
                    <View style={styles.paymentMethodIcon}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={21}
                        color={GOLD}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentMethodTitle}>
                        Secure Online Payment
                      </Text>
                      <Text style={styles.paymentMethodText}>
                        Pay using Razorpay: UPI, cards, net
                        banking or supported wallets.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.checkoutActionRow}>
                    <TouchableOpacity
                      style={styles.checkoutSecondaryButton}
                      disabled={placingOrder}
                      onPress={() =>
                        setCheckoutStep("address")
                      }
                    >
                      <Text
                        style={styles.checkoutSecondaryText}
                      >
                        Back
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.checkoutPrimaryButton}
                      disabled={
                        placingOrder ||
                        summaryLoading ||
                        !orderSummary ||
                        orderSummary.shippingCharge === null ||
                        orderSummary.total === null
                      }
                      onPress={confirmPlaceOrder}
                    >
                      {placingOrder ? (
                        <ActivityIndicator
                          size="small"
                          color={WHITE}
                        />
                      ) : (
                        <>
                          <Text
                            style={styles.checkoutPrimaryText}
                          >
                            Create Order & Pay
                          </Text>
                          <Ionicons
                            name="lock-closed-outline"
                            size={16}
                            color={WHITE}
                          />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* RAZORPAY CHECKOUT */}
      <Modal
        visible={paymentVisible}
        animationType="slide"
        onRequestClose={() => {
          if (!verifyingPayment) {
            setPaymentVisible(false);
          }
        }}
      >
        <View style={styles.paymentScreen}>
          <View style={styles.paymentHeader}>
            <TouchableOpacity
              style={styles.paymentClose}
              disabled={verifyingPayment}
              onPress={() => setPaymentVisible(false)}
            >
              <Ionicons
                name="close"
                size={22}
                color={GREEN}
              />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.paymentHeaderTitle}>
                Secure Payment
              </Text>
              <Text style={styles.paymentHeaderSub}>
                NeoLife Wellness Center
              </Text>
            </View>

            <Ionicons
              name="shield-checkmark"
              size={22}
              color={GOLD_DARK}
            />
          </View>

          {paymentData && pendingOrder ? (
            <WebView
              originWhitelist={["*"]}
              source={{ html: buildRazorpayHtml() }}
              javaScriptEnabled
              domStorageEnabled
              onMessage={handleRazorpayMessage}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoader}>
                  <ActivityIndicator
                    size="large"
                    color={GREEN}
                  />
                  <Text style={styles.webviewLoaderText}>
                    Opening Razorpay...
                  </Text>
                </View>
              )}
            />
          ) : (
            <View style={styles.webviewLoader}>
              <Text style={styles.webviewLoaderText}>
                Payment information is unavailable.
              </Text>
            </View>
          )}

          {verifyingPayment && (
            <View style={styles.verifyingOverlay}>
              <ActivityIndicator
                size="large"
                color={GOLD}
              />
              <Text style={styles.verifyingTitle}>
                Verifying Payment
              </Text>
              <Text style={styles.verifyingText}>
                Please do not close the app.
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {/* SHARED PATIENT DRAWER */}
<PatientDrawer
  visible={menuOpen}
  onClose={() => setMenuOpen(false)}
/>
      {/* ===================================================
          REMOVE CONFIRMATION
      =================================================== */}
      <Modal
        visible={removeState.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={cancelRemove}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={cancelRemove}
          />

          <View style={styles.removeDialog}>
            <View style={styles.removeIconOuter}>
              <View style={styles.removeIconInner}>
                <Ionicons
                  name="trash-outline"
                  size={28}
                  color={DANGER}
                />
              </View>
            </View>

            <Text style={styles.modalEyebrow}>
              MANAGE YOUR CART
            </Text>

            <Text style={styles.modalTitle}>
              Remove this item?
            </Text>

            <Text style={styles.modalMessage}>
              {removeState.item?.productName ||
                "This wellness product"}{" "}
              will be removed from your cart.
            </Text>

            <TouchableOpacity
              style={styles.removeConfirmButton}
              activeOpacity={0.85}
              onPress={confirmRemove}
            >
              <Ionicons
                name="trash-outline"
                size={17}
                color={WHITE}
              />

              <Text style={styles.removeConfirmText}>
                Yes, Remove Item
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.8}
              onPress={cancelRemove}
            >
              <Text style={styles.cancelButtonText}>
                Keep in Cart
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          BRANDED NOTICE
      =================================================== */}
      <Modal
        visible={notice.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeNotice}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeNotice}
          />

          <View style={styles.noticeDialog}>
            <View
              style={[
                styles.noticeIconOuter,
                notice.type === "error" &&
                  styles.noticeIconOuterError,
                notice.type === "success" &&
                  styles.noticeIconOuterSuccess,
              ]}
            >
              <Ionicons
                name={
                  notice.type === "error"
                    ? "alert-circle-outline"
                    : notice.type === "success"
                    ? "checkmark-circle-outline"
                    : "information-circle-outline"
                }
                size={31}
                color={
                  notice.type === "error"
                    ? DANGER
                    : GREEN
                }
              />
            </View>

            <Text style={styles.modalEyebrow}>
              NEOLIFE WELLNESS
            </Text>

            <Text style={styles.modalTitle}>
              {notice.title}
            </Text>

            <Text style={styles.modalMessage}>
              {notice.message}
            </Text>

            <TouchableOpacity
              style={styles.noticeButton}
              activeOpacity={0.85}
              onPress={handleNoticeAction}
            >
              <Text style={styles.noticeButtonText}>
                {notice.title === "Login Required" ||
                notice.title === "Session Expired"
                  ? "Go to Login"
                  : "Okay"}
              </Text>

              <Ionicons
                name="arrow-forward"
                size={17}
                color={WHITE}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

function SummaryLine({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.finalSummaryRow}>
      <Text style={styles.finalSummaryLabel}>{label}</Text>
      <Text
        style={[
          styles.finalSummaryValue,
          accent && { color: GREEN_2 },
        ]}
      >
        {value}
      </Text>
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
    <TouchableOpacity
      style={styles.socialButton}
      activeOpacity={0.82}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={WHITE} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  fontLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },

  

  scrollContent: {
    paddingBottom: 0,
  },

  /* HERO */

  hero: {
    margin: 16,
    marginBottom: 5,
    minHeight: 278,
    padding: 22,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: GREEN,
  },

  heroGlowOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -75,
    top: -75,
    backgroundColor: "rgba(214,180,91,0.13)",
  },

  heroGlowTwo: {
    position: "absolute",
    width: 145,
    height: 145,
    borderRadius: 73,
    left: -65,
    bottom: -70,
    backgroundColor: "rgba(255,255,255,0.04)",
  },

  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(244,230,183,0.22)",
  },

  secureBadge: {
    minHeight: 30,
    paddingHorizontal: 11,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  secureBadgeText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 7,
    letterSpacing: 1.2,
  },

  heroEyebrow: {
    marginTop: 22,
    fontFamily: "DMSans_700Bold",
    color: GOLD,
    fontSize: 8,
    letterSpacing: 1.8,
  },

  heroTitle: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 30,
    lineHeight: 36,
  },

  heroText: {
    marginTop: 10,
    maxWidth: 310,
    fontFamily: "DMSans_400Regular",
    color: "#D7E2DC",
    fontSize: 11,
    lineHeight: 18,
  },

  heroStats: {
    marginTop: 21,
    minHeight: 61,
    paddingHorizontal: 15,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  heroStat: {
    flex: 1,
  },

  heroStatValue: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 19,
  },

  heroStatLabel: {
    marginTop: 3,
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 7,
    letterSpacing: 1.2,
  },

  heroStatDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  /* SECTION */

  sectionHeading: {
    marginTop: 27,
    marginBottom: 13,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  sectionEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.6,
  },

  sectionTitle: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 25,
  },

  itemCountPill: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: MINT,
  },

  itemCountText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN_2,
    fontSize: 9,
  },

  products: {
    paddingHorizontal: 16,
    gap: 14,
  },

  /* PRODUCT */

  productCard: {
    padding: 15,
    borderRadius: 25,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,

    shadowColor: "#17382A",
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },

  productCardTop: {
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  productNumber: {
    minWidth: 34,
    height: 23,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  productNumberText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
    letterSpacing: 1,
  },

  removeIconButton: {
    width: 35,
    height: 35,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DANGER_LIGHT,
  },

  productMain: {
    flexDirection: "row",
  },

  productImageWrap: {
    width: 122,
    height: 143,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F7F8F5",
    borderWidth: 1,
    borderColor: "#EEF0EC",
  },

  productImage: {
    width: "100%",
    height: "100%",
  },

  placeholderImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderLogo: {
    width: 65,
    height: 65,
    borderRadius: 15,
    opacity: 0.72,
  },

  naturalBadge: {
    position: "absolute",
    left: 7,
    bottom: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: MINT,
  },

  naturalBadgeText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 6,
    letterSpacing: 0.5,
  },

  productInfo: {
    flex: 1,
    paddingLeft: 14,
    paddingTop: 3,
  },

  productCategory: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1.2,
  },

  productName: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 18,
    lineHeight: 23,
  },

  priceRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "baseline",
  },

  price: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 15,
  },

  eachText: {
    marginLeft: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },

  quantityLabelRow: {
    marginTop: 11,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  quantityLabel: {
    fontFamily: "DMSans_600SemiBold",
    color: MUTED,
    fontSize: 8,
  },

  updatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  updatingText: {
    fontFamily: "DMSans_500Medium",
    color: GOLD_DARK,
    fontSize: 6,
  },

  quantityControl: {
    alignSelf: "flex-start",
    height: 38,
    padding: 3,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: BORDER,
  },

  quantityButton: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  quantityValueWrap: {
    minWidth: 34,
    alignItems: "center",
  },

  quantityValue: {
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 12,
  },

  productFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EDF0ED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  productFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN_2,
  },

  productFooterText: {
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 8,
  },

  itemTotalWrap: {
    alignItems: "flex-end",
  },

  itemTotalLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 6,
    letterSpacing: 0.8,
  },

  itemTotal: {
    marginTop: 2,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 15,
  },

  /* SUMMARY */

  summaryCard: {
    marginHorizontal: 16,
    marginTop: 22,
    padding: 20,
    borderRadius: 27,
    backgroundColor: "#F1F6F2",
    borderWidth: 1,
    borderColor: "#DCE9E1",
  },

  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  summaryEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.5,
  },

  summaryTitle: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 25,
  },

  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  summaryDivider: {
    height: 1,
    marginVertical: 17,
    backgroundColor: "#D8E5DC",
  },

  summaryRow: {
    minHeight: 37,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  summaryLabel: {
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 11,
  },

  summaryValue: {
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 12,
  },

  deliveryNotice: {
    marginTop: 13,
    padding: 13,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: WHITE,
  },

  deliveryIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  deliveryTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  deliveryText: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
  },

  grandTotalRow: {
    marginTop: 18,
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: "#D6E3DA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  grandTotalLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 7,
    letterSpacing: 1,
  },

  grandTotalSubtext: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 7,
  },

  grandTotal: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 25,
  },

  checkoutButton: {
    minHeight: 57,
    marginTop: 19,
    paddingHorizontal: 13,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN,
  },

  checkoutButtonIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },

  checkoutButtonText: {
    flex: 1,
    marginLeft: 12,
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 12,
  },

  paymentTrust: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  paymentTrustText: {
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 8,
  },

  /* CARE */

  careCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 21,
    flexDirection: "row",
    gap: 11,
    backgroundColor: "#FFF9E9",
    borderWidth: 1,
    borderColor: "#F1E3B5",
  },

  careIcon: {
    width: 39,
    height: 39,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  careTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    color: TEXT,
    fontSize: 14,
  },

  careText: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 14,
  },

  /* EMPTY */

  emptyCard: {
    marginHorizontal: 16,
    marginTop: 22,
    paddingHorizontal: 24,
    paddingVertical: 31,
    borderRadius: 29,
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  emptyIllustration: {
    width: 116,
    height: 116,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIconCircle: {
    width: 89,
    height: 89,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  emptySmallCircleOne: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    right: 5,
    top: 13,
    backgroundColor: GOLD_LIGHT,
  },

  emptySmallCircleTwo: {
    position: "absolute",
    width: 11,
    height: 11,
    borderRadius: 6,
    left: 7,
    bottom: 17,
    backgroundColor: "#DCECE3",
  },

  emptyEyebrow: {
    marginTop: 17,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.5,
  },

  emptyTitle: {
    marginTop: 6,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 28,
  },

  emptyText: {
    marginTop: 9,
    maxWidth: 290,
    textAlign: "center",
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 17,
  },

  exploreButton: {
    width: "100%",
    minHeight: 53,
    marginTop: 23,
    paddingHorizontal: 16,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: GREEN,
  },

  exploreButtonText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 11,
  },

  emptySupport: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },

  emptySupportText: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
  },

  /* LOADING */

  loadingContainer: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  loadingTitle: {
    marginTop: 12,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 23,
  },

  loadingText: {
    marginTop: 5,
    textAlign: "center",
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
  },

  /* BOTTOM BRAND */





  /* SAME FULL FOOTER */
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


  /* MODALS */

  modalRoot: {
    flex: 1,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,28,19,0.76)",
  },

  removeDialog: {
    width: "100%",
    maxWidth: 380,
    padding: 23,
    paddingTop: 28,
    borderRadius: 29,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "rgba(214,180,91,0.4)",
  },

  removeIconOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DANGER_LIGHT,
  },

  removeIconInner: {
    width: 57,
    height: 57,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#F2CCC6",
  },

  modalEyebrow: {
    marginTop: 17,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.5,
  },

  modalTitle: {
    marginTop: 6,
    textAlign: "center",
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 26,
  },

  modalMessage: {
    marginTop: 9,
    maxWidth: 300,
    textAlign: "center",
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 17,
  },

  removeConfirmButton: {
    width: "100%",
    minHeight: 51,
    marginTop: 22,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DANGER,
  },

  removeConfirmText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 11,
  },

  cancelButton: {
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

  cancelButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  noticeDialog: {
    width: "100%",
    maxWidth: 380,
    padding: 24,
    paddingTop: 29,
    borderRadius: 29,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "rgba(214,180,91,0.4)",
  },

  noticeIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  noticeIconOuterError: {
    backgroundColor: DANGER_LIGHT,
  },

  noticeIconOuterSuccess: {
    backgroundColor: "#E5F3E9",
  },

  noticeButton: {
    width: "100%",
    minHeight: 51,
    marginTop: 22,
    paddingHorizontal: 18,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GREEN,
  },

  noticeButtonText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 11,
  },

  /* CHECKOUT MODAL */

  checkoutModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  checkoutBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 28, 19, 0.72)",
  },

  checkoutSheet: {
    maxHeight: "92%",
    minHeight: "55%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: CREAM,
    overflow: "hidden",
  },

  checkoutSheetHeader: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
  },

  checkoutEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.5,
  },

  checkoutTitle: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 25,
  },

  checkoutClose: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  checkoutScroll: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 32,
  },

  checkoutStepLabel: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    letterSpacing: 1.25,
    marginBottom: 11,
  },

  checkoutLoading: {
    minHeight: 90,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  checkoutLoadingText: {
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 10,
  },

  addressList: {
    gap: 10,
  },

  addressCard: {
    padding: 15,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  addressCardSelected: {
    borderColor: GOLD,
    backgroundColor: "#FFFBF0",
  },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#C7D0CB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  radioOuterSelected: {
    borderColor: GREEN,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GREEN,
  },

  addressTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  addressName: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 12,
  },

  addressPhone: {
    marginTop: 4,
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 10,
  },

  addressText: {
    marginTop: 5,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
  },

  defaultAddressBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: MINT,
  },

  defaultAddressText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 6.5,
    letterSpacing: 0.6,
  },

  selectedAddressCard: {
    padding: 15,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E7D6A8",
  },

  checkoutActionRow: {
    marginTop: 22,
    flexDirection: "row",
    gap: 10,
  },

  checkoutSecondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7ECE8",
  },

  checkoutSecondaryText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  checkoutPrimaryButton: {
    flex: 1.25,
    minHeight: 50,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: GREEN,
  },

  checkoutPrimaryText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 10.5,
  },

  couponRow: {
    flexDirection: "row",
    gap: 9,
  },

  couponInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 11,
  },

  couponButton: {
    minWidth: 78,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  couponButtonText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 10,
  },

  checkoutProducts: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  checkoutProductRow: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1EE",
  },

  checkoutProductName: {
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 10.5,
  },

  checkoutProductMeta: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8.5,
  },

  checkoutProductTotal: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10.5,
  },

  finalSummaryCard: {
    marginTop: 12,
    padding: 15,
    borderRadius: 18,
    backgroundColor: "#F6F8F5",
    borderWidth: 1,
    borderColor: "#DFE7E1",
  },

  finalSummaryRow: {
    minHeight: 31,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  finalSummaryLabel: {
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
  },

  finalSummaryValue: {
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 10,
  },

  finalSummaryDivider: {
    height: 1,
    marginVertical: 10,
    backgroundColor: "#D9E3DC",
  },

  finalSummaryTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  finalSummaryTotalLabel: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 13,
  },

  finalSummaryTotalValue: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GOLD_DARK,
    fontSize: 20,
  },

  summaryUnavailableText: {
    fontFamily: "DMSans_500Medium",
    color: DANGER,
    textAlign: "center",
    fontSize: 10,
    lineHeight: 16,
  },

  paymentMethodCard: {
    padding: 14,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E6D5A8",
  },

  paymentMethodIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  paymentMethodTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  paymentMethodText: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8.5,
    lineHeight: 14,
  },

  paymentScreen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  paymentHeader: {
    paddingTop: Platform.OS === "web" ? 16 : 46,
    paddingBottom: 12,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  paymentClose: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  paymentHeaderTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 14,
  },

  paymentHeaderSub: {
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },

  webviewLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: CREAM,
  },

  webviewLoaderText: {
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 11,
  },

  verifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: "rgba(5, 28, 19, 0.92)",
  },

  verifyingTitle: {
    marginTop: 16,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 25,
  },

  verifyingText: {
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
    color: "#D9E5DE",
    fontSize: 10,
  },

});