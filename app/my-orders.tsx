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
const SUCCESS = "#277A4E";
const INFO = "#356C8C";
const PURPLE = "#76548F";

type NoticeType = "success" | "error" | "info";

type Notice = {
  visible: boolean;
  type: NoticeType;
  title: string;
  message: string;
};

type OrderItem = {
  productId?: number;
  productName?: string;
  quantity?: number;
  price?: number;
  subtotal?: number;
};

type RefundData = {
  paymentId?: number | string;
  refundStatus?: string;
  paymentStatus?: string;
  refundedAmount?: number;
  refundReason?: string;
  refundRequestedAt?: string;
  refundedAt?: string;
};

type Order = {
  id: number;
  orderNumber?: string;
  orderDate?: string;
  status?: string;
  totalAmount?: number;
  paymentStatus?: any;
  paymentId?: number | string | null;
  shippingAddress?: string;
  items?: OrderItem[];
  returnStatus?: string;
  orderReturnStatus?: string;
  returnRequest?: { status?: string };
  refundData?: RefundData | null;
};

type FilterKey = "ALL" | "ACTIVE" | "DELIVERED" | "CANCELLED";

export default function MyOrdersScreen() {
  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);

  const [notice, setNotice] = useState<Notice>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    order: Order | null;
  }>({ visible: false, order: null });

  const [returnModal, setReturnModal] = useState<{
    visible: boolean;
    order: Order | null;
  }>({ visible: false, order: null });
  const [returnReason, setReturnReason] = useState("");

  const [reviewModal, setReviewModal] = useState<{
    visible: boolean;
    order: Order | null;
    item: OrderItem | null;
  }>({ visible: false, order: null, item: null });
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    loadMyOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (filter === "ALL") return orders;

    if (filter === "DELIVERED") {
      return orders.filter((order) => normalizedStatus(order.status) === "DELIVERED");
    }

    if (filter === "CANCELLED") {
      return orders.filter((order) => {
        const status = normalizedStatus(order.status);
        return status.includes("CANCEL") || status.includes("FAIL");
      });
    }

    return orders.filter((order) => {
      const status = normalizedStatus(order.status);
      return ![
        "DELIVERED",
        "CANCELLED",
        "FAILED",
        "RETURNED",
        "REFUNDED",
      ].includes(status);
    });
  }, [orders, filter]);

  const stats = useMemo(() => {
    const delivered = orders.filter(
      (order) => normalizedStatus(order.status) === "DELIVERED"
    ).length;

    const active = orders.filter((order) => {
      const status = normalizedStatus(order.status);
      return ![
        "DELIVERED",
        "CANCELLED",
        "FAILED",
        "RETURNED",
        "REFUNDED",
      ].includes(status);
    }).length;

    return {
      total: orders.length,
      active,
      delivered,
    };
  }, [orders]);

  function showNotice(
    message: string,
    type: NoticeType = "info",
    title?: string
  ) {
    setNotice({
      visible: true,
      type,
      title:
        title ||
        (type === "success"
          ? "Done"
          : type === "error"
          ? "Something went wrong"
          : "NeoLife"),
      message,
    });
  }

  async function getToken() {
    return AsyncStorage.getItem("token");
  }

  async function parseResponse(response: Response) {
    const text = await response.text();
    let result: any = null;

    if (text) {
      try {
        result = JSON.parse(text);
      } catch {
        result = null;
      }
    }

    return { text, result };
  }

  async function loadMyOrders(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = await getToken();

      if (!token) {
        showNotice(
          "Please sign in to view your orders.",
          "error",
          "Login required"
        );

        setTimeout(() => router.replace("/login" as any), 800);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/orders/getAll`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const { text, result } = await parseResponse(response);

      if (response.status === 401 || response.status === 403) {
        await clearSession();
        showNotice(
          result?.message || "Your login session has expired.",
          "error",
          "Session expired"
        );

        setTimeout(() => router.replace("/login" as any), 900);
        return;
      }

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            text ||
            `Failed to load orders. Status: ${response.status}`
        );
      }

      if (result?.success) {
        const rawOrders = Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.data?.content)
          ? result.data.content
          : [];

        const normalized: Order[] = rawOrders
          .map(normalizeOrderPaymentStatus)
          .sort((a: Order, b: Order) => Number(b.id) - Number(a.id));

        const withRefunds = await Promise.all(
          normalized.map(async (order) => {
            if (
              order.paymentId === null ||
              order.paymentId === undefined ||
              String(order.paymentId).trim() === ""
            ) {
              return order;
            }

            const refundData = await fetchOrderRefundStatus(order.paymentId);
            return { ...order, refundData };
          })
        );

        setOrders(withRefunds);
      } else {
        setOrders([]);
      }
    } catch (error: any) {
      console.log("My orders load failed:", error);
      showNotice(
        error?.message || "Unable to load your orders. Please try again.",
        "error",
        "Unable to load orders"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchOrderRefundStatus(paymentId: number | string) {
    try {
      const token = await getToken();
      if (!token) return null;

      const response = await fetch(
        `${API_BASE_URL}/payments/${encodeURIComponent(
          String(paymentId)
        )}/refund-status`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const { result } = await parseResponse(response);

      if (response.status === 404) return null;

      if (!response.ok || result?.success === false) return null;

      return result?.data || null;
    } catch (error) {
      console.log("Refund status load failed:", error);
      return null;
    }
  }

  async function reorderOrder(order: Order) {
    try {
      setBusyOrderId(order.id);

      const token = await getToken();

      if (!token) {
        showNotice("Please sign in to reorder products.", "error");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/orders/${encodeURIComponent(String(order.id))}/reorder`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const { text, result } = await parseResponse(response);

      if (!response.ok || result?.success !== true) {
        throw new Error(
          result?.message || text || "Unable to reorder this order."
        );
      }

      const data = result?.data || {};

      if (Number(data.addedProducts || 0) <= 0) {
        const skipped = Array.isArray(data.skippedProductNames)
          ? data.skippedProductNames
          : [];

        throw new Error(
          skipped.length
            ? `Products could not be added: ${skipped.join(", ")}`
            : "No products from this order could be added to your cart."
        );
      }

      if (Number(data.skippedProducts || 0) > 0) {
        const skipped = Array.isArray(data.skippedProductNames)
          ? data.skippedProductNames
          : [];

        showNotice(
          `${Number(data.addedProducts || 0)} product(s) added to cart.${
            skipped.length ? ` Skipped: ${skipped.join(", ")}` : ""
          }`,
          "info",
          "Partially added"
        );
      } else {
        showNotice(
          result?.message || "Products added to your cart successfully.",
          "success",
          "Added to cart"
        );
      }

      setTimeout(() => router.push("/cart" as any), 650);
    } catch (error: any) {
      showNotice(
        error?.message || "Unable to reorder products.",
        "error",
        "Reorder failed"
      );
    } finally {
      setBusyOrderId(null);
    }
  }

  async function trackOrder(order: Order) {
    try {
      setBusyOrderId(order.id);

      const token = await getToken();

      if (!token) {
        showNotice("Please sign in to track your order.", "error");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/orders/${order.id}/track`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const { result } = await parseResponse(response);

      if (response.ok && result?.success) {
        if (result.data?.trackingUrl) {
          const canOpen = await Linking.canOpenURL(result.data.trackingUrl);

          if (canOpen) {
            await Linking.openURL(result.data.trackingUrl);
            return;
          }
        }

        showNotice(
          result?.message || "Tracking information is available.",
          "success",
          "Tracking update"
        );
      } else {
        showNotice(
          result?.message || "Shipment has not been created yet.",
          "info",
          "Tracking not available yet"
        );
      }
    } catch (error) {
      showNotice(
        "Unable to load tracking details.",
        "error",
        "Tracking unavailable"
      );
    } finally {
      setBusyOrderId(null);
    }
  }

  async function confirmCancelOrder() {
    const order = confirmModal.order;
    if (!order) return;

    try {
      setConfirmModal({ visible: false, order: null });
      setBusyOrderId(order.id);

      const token = await getToken();
      if (!token) {
        showNotice("Please sign in again.", "error");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/orders/${order.id}/cancel`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const { text, result } = await parseResponse(response);

      if (!response.ok || result?.success !== true) {
        throw new Error(
          result?.message || text || "Failed to cancel order."
        );
      }

      showNotice(
        result?.message || "Order cancelled successfully.",
        "success",
        "Order cancelled"
      );

      await loadMyOrders(true);
    } catch (error: any) {
      showNotice(
        error?.message || "Unable to cancel order.",
        "error",
        "Cancellation failed"
      );
    } finally {
      setBusyOrderId(null);
    }
  }

  async function submitReturn() {
    const order = returnModal.order;
    const reason = returnReason.trim();

    if (!order) return;

    if (reason.length < 3) {
      showNotice(
        "Please enter a short reason for returning this order.",
        "info",
        "Return reason required"
      );
      return;
    }

    try {
      setBusyOrderId(order.id);

      const token = await getToken();

      if (!token) {
        showNotice("Please sign in to return this order.", "error");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/returns/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          orderId: Number(order.id),
          reason,
        }),
      });

      const { text, result } = await parseResponse(response);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || text || "Unable to create return request."
        );
      }

      setReturnModal({ visible: false, order: null });
      setReturnReason("");

      showNotice(
        result?.message ||
          "Return request submitted successfully. Refund will be processed according to the return status.",
        "success",
        "Return requested"
      );

      await loadMyOrders(true);
    } catch (error: any) {
      showNotice(
        error?.message || "Unable to return this order.",
        "error",
        "Return failed"
      );
    } finally {
      setBusyOrderId(null);
    }
  }

  async function submitProductReview() {
    const item = reviewModal.item;
    const order = reviewModal.order;
    const comment = reviewComment.trim();

    if (!item?.productId || !order) {
      showNotice("Product information is missing.", "error");
      return;
    }

    if (rating < 1) {
      showNotice("Please select a rating.", "info", "Rating required");
      return;
    }

    if (comment.length < 3) {
      showNotice("Please enter a short review.", "info", "Review required");
      return;
    }

    if (!isDeliveredOrder(order.status)) {
      showNotice(
        "Only delivered products can be reviewed.",
        "error",
        "Review unavailable"
      );
      return;
    }

    try {
      setSubmittingReview(true);

      const token = await getToken();

      if (!token) {
        showNotice("Please sign in to submit a review.", "error");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/product-reviews/${item.productId}/create-review`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            rating,
            comment,
          }),
        }
      );

      const { text, result } = await parseResponse(response);

      if (!response.ok || result?.success !== true) {
        throw new Error(
          result?.message || text || "Failed to submit product review."
        );
      }

      setReviewModal({ visible: false, order: null, item: null });
      setRating(0);
      setReviewComment("");

      showNotice(
        result?.message ||
          "Review submitted successfully. It will appear after approval.",
        "success",
        "Thank you"
      );
    } catch (error: any) {
      showNotice(
        error?.message || "Unable to submit product review.",
        "error",
        "Review failed"
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  async function clearSession() {
    await AsyncStorage.multiRemove([
      "token",
      "refreshToken",
      "userId",
      "email",
      "name",
      "role",
      "profileCompleted",
      "isLoggedIn",
    ]);
  }

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loaderText}>Preparing your orders...</Text>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadMyOrders(true)}
            tintColor={GREEN}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroIcon}>
            <Ionicons name="bag-handle-outline" size={23} color={GREEN} />
          </View>

          <Text style={styles.heroEyebrow}>YOUR WELLNESS PURCHASES</Text>
          <Text style={styles.heroTitle}>My Orders</Text>
          <Text style={styles.heroLead}>
            Follow your wellness products from order confirmation to delivery,
            all in one simple place.
          </Text>

          <View style={styles.heroStats}>
            <HeroStat label="Orders" value={stats.total} />
            <View style={styles.statDivider} />
            <HeroStat label="Active" value={stats.active} />
            <View style={styles.statDivider} />
            <HeroStat label="Delivered" value={stats.delivered} />
          </View>
        </View>

        {/* SECTION TITLE */}
        <View style={styles.sectionHeading}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionEyebrow}>ORDER HISTORY</Text>
            <Text style={styles.sectionTitle}>Your purchases</Text>
            <Text style={styles.sectionSubtitle}>
              Tap an order to see products, payment and delivery information.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => loadMyOrders(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color={GREEN} />
          </TouchableOpacity>
        </View>

        {/* FILTERS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {[
            ["ALL", "All", "apps-outline"],
            ["ACTIVE", "Active", "time-outline"],
            ["DELIVERED", "Delivered", "checkmark-circle-outline"],
            ["CANCELLED", "Cancelled", "close-circle-outline"],
          ].map(([key, label, icon]) => {
            const active = filter === key;

            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(key as FilterKey)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={icon as any}
                  size={15}
                  color={active ? WHITE : GREEN}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ORDERS */}
        {loading ? (
          <View style={styles.loadingCard}>
            <View style={styles.loadingIcon}>
              <ActivityIndicator size="small" color={GREEN} />
            </View>
            <Text style={styles.loadingTitle}>Loading your orders</Text>
            <Text style={styles.loadingText}>
              Getting your latest order and delivery information...
            </Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bag-outline" size={31} color={GOLD_DARK} />
            </View>
            <Text style={styles.emptyTitle}>
              {orders.length === 0 ? "No orders yet" : "No orders in this filter"}
            </Text>
            <Text style={styles.emptyText}>
              {orders.length === 0
                ? "Products you purchase will appear here."
                : "Try another filter to view your other orders."}
            </Text>

            {orders.length === 0 && (
              <TouchableOpacity
                style={styles.shopButton}
                onPress={() => router.push("/(tabs)/products" as any)}
              >
                <Ionicons name="leaf-outline" size={17} color={WHITE} />
                <Text style={styles.shopButtonText}>Explore Products</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.ordersList}>
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                expanded={Boolean(expanded[order.id])}
                busy={busyOrderId === order.id}
                onToggle={() =>
                  setExpanded((current) => ({
                    ...current,
                    [order.id]: !current[order.id],
                  }))
                }
                onDetails={() => setDetailsOrder(order)}
                onTrack={() => trackOrder(order)}
                onReorder={() => reorderOrder(order)}
                onCancel={() =>
                  setConfirmModal({ visible: true, order })
                }
                onReturn={() => {
                  setReturnReason("");
                  setReturnModal({ visible: true, order });
                }}
                onReview={(item) => {
                  setRating(0);
                  setReviewComment("");
                  setReviewModal({ visible: true, order, item });
                }}
              />
            ))}
          </View>
        )}

        {/* HELP CARD */}
        <View style={styles.helpCard}>
          <View style={styles.helpIcon}>
            <Ionicons name="headset-outline" size={22} color={GOLD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.helpTitle}>Need help with an order?</Text>
            <Text style={styles.helpText}>
              Our wellness team can help with delivery, returns or product queries.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.helpArrow}
            onPress={() =>
              Linking.openURL(
                "https://wa.me/919481489866?text=Hello%20NeoLife%20Wellness%20Center,%20I%20need%20help%20with%20my%20order."
              )
            }
          >
            <Ionicons name="logo-whatsapp" size={20} color={GREEN} />
          </TouchableOpacity>
        </View>

        {/* FOOTER */}
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
            onPress={() => Linking.openURL("tel:+919481489866")}
          >
            <Ionicons name="call-outline" size={16} color={GOLD} />
            <Text style={styles.footerText}>+91 94814 89866</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerRow}
            onPress={() =>
              Linking.openURL("mailto:neelavar.murali@gmail.com")
            }
          >
            <Ionicons name="mail-outline" size={16} color={GOLD} />
            <Text style={styles.footerText}>neelavar.murali@gmail.com</Text>
          </TouchableOpacity>

          <Text style={styles.footerAddress}>
            4-1-38, Behind Lions Bhavan Road, Nairkere 1st Cross, Brahmagiri,
            Ambalapady Post, Udupi – 576103, Karnataka, India
          </Text>

          <Text style={styles.copyright}>
            © 2026 NeoLife Wellness Center. All Rights Reserved.
          </Text>
        </View>
      </ScrollView>

      {/* ORDER DETAILS MODAL */}
      <Modal
        visible={Boolean(detailsOrder)}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsOrder(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setDetailsOrder(null)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>ORDER SUMMARY</Text>
                <Text style={styles.sheetTitle}>Order Details</Text>
              </View>
              <TouchableOpacity
                style={styles.sheetClose}
                onPress={() => setDetailsOrder(null)}
              >
                <Ionicons name="close" size={21} color={GREEN} />
              </TouchableOpacity>
            </View>

            {detailsOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailGrid}>
                  <DetailBox
                    label="Order Number"
                    value={`#${
                      detailsOrder.orderNumber || detailsOrder.id
                    }`}
                    icon="receipt-outline"
                  />
                  <DetailBox
                    label="Status"
                    value={formatStatus(detailsOrder.status)}
                    icon="pulse-outline"
                  />
                  <DetailBox
                    label="Order Date"
                    value={formatDate(detailsOrder.orderDate)}
                    icon="calendar-outline"
                  />
                  <DetailBox
                    label="Total"
                    value={formatCurrency(detailsOrder.totalAmount)}
                    icon="card-outline"
                  />
                  <DetailBox
                    label="Payment"
                    value={displayPaymentStatus(detailsOrder.paymentStatus)}
                    icon="wallet-outline"
                  />
                </View>

                <View style={styles.detailWide}>
                  <View style={styles.detailWideIcon}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={GREEN}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>SHIPPING ADDRESS</Text>
                    <Text style={styles.detailValue}>
                      {detailsOrder.shippingAddress ||
                        "Shipping address not available"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalSectionTitle}>Ordered Products</Text>

                {(detailsOrder.items || []).map((item, index) => (
                  <View
                    key={`${item.productId || index}-${index}`}
                    style={styles.modalProductRow}
                  >
                    <View style={styles.productMiniIcon}>
                      <Ionicons name="leaf-outline" size={17} color={GREEN} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName}>
                        {item.productName || "Product"}
                      </Text>
                      <Text style={styles.productMeta}>
                        Qty {Number(item.quantity || 0)} ·{" "}
                        {formatCurrency(item.price)}
                      </Text>
                    </View>

                    <Text style={styles.productSubtotal}>
                      {formatCurrency(item.subtotal)}
                    </Text>
                  </View>
                ))}

                {hasOrderRefund(detailsOrder) && (
                  <RefundBox refund={detailsOrder.refundData!} />
                )}

                <View style={{ height: 25 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* CANCEL CONFIRMATION - STYLED, NO NATIVE ALERT */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setConfirmModal({ visible: false, order: null })
        }
      >
        <View style={styles.centerModalRoot}>
          <Pressable
            style={styles.centerBackdrop}
            onPress={() =>
              setConfirmModal({ visible: false, order: null })
            }
          />

          <View style={styles.confirmDialog}>
            <View style={styles.dangerIconOuter}>
              <View style={styles.dangerIconInner}>
                <Ionicons name="close-circle-outline" size={31} color={DANGER} />
              </View>
            </View>

            <Text style={styles.dialogEyebrow}>ORDER ACTION</Text>
            <Text style={styles.dialogTitle}>Cancel this order?</Text>
            <Text style={styles.dialogMessage}>
              This will request cancellation for order #
              {confirmModal.order?.orderNumber || confirmModal.order?.id}.
            </Text>

            <View style={styles.dialogInfo}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={GREEN}
              />
              <Text style={styles.dialogInfoText}>
                Cancellation is available only before the order enters shipping
                or delivery flow.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.dangerButton}
              onPress={confirmCancelOrder}
            >
              <Ionicons name="close" size={18} color={WHITE} />
              <Text style={styles.dangerButtonText}>Yes, Cancel Order</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                setConfirmModal({ visible: false, order: null })
              }
            >
              <Text style={styles.secondaryButtonText}>Keep My Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* RETURN MODAL */}
      <Modal
        visible={returnModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setReturnModal({ visible: false, order: null })
        }
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() =>
              setReturnModal({ visible: false, order: null })
            }
          />
          <View style={styles.smallSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.returnIcon}>
              <Ionicons name="return-down-back-outline" size={25} color={PURPLE} />
            </View>

            <Text style={styles.sheetEyebrow}>RETURN REQUEST</Text>
            <Text style={styles.returnTitle}>Tell us what happened</Text>
            <Text style={styles.returnLead}>
              Your reason helps our team process the return and refund correctly.
            </Text>

            <TextInput
              value={returnReason}
              onChangeText={setReturnReason}
              placeholder="Enter reason for returning this order..."
              placeholderTextColor="#9AA69F"
              multiline
              maxLength={500}
              textAlignVertical="top"
              style={styles.reasonInput}
            />

            <Text style={styles.characterCount}>
              {returnReason.length} / 500
            </Text>

            <TouchableOpacity
              style={styles.returnSubmitButton}
              onPress={submitReturn}
              disabled={busyOrderId === returnModal.order?.id}
            >
              {busyOrderId === returnModal.order?.id ? (
                <ActivityIndicator size="small" color={WHITE} />
              ) : (
                <>
                  <Ionicons
                    name="paper-plane-outline"
                    size={17}
                    color={WHITE}
                  />
                  <Text style={styles.returnSubmitText}>
                    Submit Return Request
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                setReturnModal({ visible: false, order: null })
              }
            >
              <Text style={styles.secondaryButtonText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PRODUCT REVIEW MODAL */}
      <Modal
        visible={reviewModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setReviewModal({ visible: false, order: null, item: null })
        }
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() =>
              setReviewModal({ visible: false, order: null, item: null })
            }
          />

          <View style={styles.reviewSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.reviewProductBox}>
              <View style={styles.reviewProductIcon}>
                <Ionicons name="leaf-outline" size={22} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewProductName}>
                  {reviewModal.item?.productName || "Product"}
                </Text>
                <Text style={styles.reviewProductSub}>
                  Share your experience with this delivered product.
                </Text>
              </View>
            </View>

            <Text style={styles.reviewLabel}>YOUR RATING</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={30}
                    color={star <= rating ? GOLD_DARK : "#CAD2CD"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.ratingText}>
              {rating === 0
                ? "Tap a star to rate"
                : rating === 5
                ? "Excellent"
                : rating === 4
                ? "Very good"
                : rating === 3
                ? "Good"
                : rating === 2
                ? "Fair"
                : "Needs improvement"}
            </Text>

            <Text style={[styles.reviewLabel, { marginTop: 18 }]}>
              YOUR REVIEW
            </Text>

            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Tell us about product quality and your experience..."
              placeholderTextColor="#9AA69F"
              multiline
              maxLength={500}
              textAlignVertical="top"
              style={styles.reviewInput}
            />

            <Text style={styles.characterCount}>
              {reviewComment.length} / 500
            </Text>

            <TouchableOpacity
              style={[
                styles.reviewSubmitButton,
                submittingReview && { opacity: 0.65 },
              ]}
              disabled={submittingReview}
              onPress={submitProductReview}
            >
              {submittingReview ? (
                <ActivityIndicator size="small" color={WHITE} />
              ) : (
                <>
                  <Ionicons
                    name="paper-plane-outline"
                    size={17}
                    color={WHITE}
                  />
                  <Text style={styles.reviewSubmitText}>Submit Review</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                setReviewModal({ visible: false, order: null, item: null })
              }
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* STYLED NOTICE */}
      <Modal
        visible={notice.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setNotice((current) => ({ ...current, visible: false }))
        }
      >
        <View style={styles.centerModalRoot}>
          <Pressable
            style={styles.centerBackdrop}
            onPress={() =>
              setNotice((current) => ({ ...current, visible: false }))
            }
          />

          <View style={styles.noticeDialog}>
            <View
              style={[
                styles.noticeIcon,
                notice.type === "success"
                  ? styles.noticeIconSuccess
                  : notice.type === "error"
                  ? styles.noticeIconError
                  : styles.noticeIconInfo,
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

            <Text style={styles.dialogEyebrow}>NEOLIFE WELLNESS</Text>
            <Text style={styles.dialogTitle}>{notice.title}</Text>
            <Text style={styles.dialogMessage}>{notice.message}</Text>

            <TouchableOpacity
              style={styles.noticeOkayButton}
              onPress={() =>
                setNotice((current) => ({ ...current, visible: false }))
              }
            >
              <Text style={styles.noticeOkayText}>Okay</Text>
              <Ionicons name="checkmark" size={17} color={GREEN} />
            </TouchableOpacity>
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

function OrderCard({
  order,
  expanded,
  busy,
  onToggle,
  onDetails,
  onTrack,
  onReorder,
  onCancel,
  onReturn,
  onReview,
}: {
  order: Order;
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onDetails: () => void;
  onTrack: () => void;
  onReorder: () => void;
  onCancel: () => void;
  onReturn: () => void;
  onReview: (item: OrderItem) => void;
}) {
  const items = Array.isArray(order.items) ? order.items : [];
  const statusTheme = getStatusTheme(order.status);
  const totalQty = getTotalQuantity(items);

  return (
    <View style={styles.orderCard}>
      <TouchableOpacity
        style={styles.orderCardTop}
        onPress={onToggle}
        activeOpacity={0.85}
      >
        <View style={[styles.orderIcon, { backgroundColor: statusTheme.soft }]}>
          <Ionicons
            name={statusTheme.icon as any}
            size={22}
            color={statusTheme.color}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.orderLabel}>ORDER</Text>
          <Text style={styles.orderNumber}>
            #{order.orderNumber || order.id}
          </Text>
          <Text style={styles.orderDate}>{formatDate(order.orderDate)}</Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusTheme.soft },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusTheme.color },
              ]}
            />
            <Text
              style={[
                styles.statusBadgeText,
                { color: statusTheme.color },
              ]}
            >
              {formatStatus(order.status)}
            </Text>
          </View>

          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={MUTED}
            style={{ marginTop: 9 }}
          />
        </View>
      </TouchableOpacity>

      <View style={styles.summaryRow}>
        <SummaryCell
          icon="wallet-outline"
          label="Total"
          value={formatCurrency(order.totalAmount)}
        />
        <View style={styles.summaryDivider} />
        <SummaryCell
          icon="cube-outline"
          label="Items"
          value={String(totalQty)}
        />
        <View style={styles.summaryDivider} />
        <SummaryCell
          icon="card-outline"
          label="Payment"
          value={shortPaymentStatus(order.paymentStatus)}
        />
      </View>

      {expanded && (
        <View style={styles.expandedArea}>
          <View style={styles.addressBox}>
            <View style={styles.addressIcon}>
              <Ionicons name="location-outline" size={17} color={GREEN} />
            </View>
            <Text style={styles.addressText}>
              {order.shippingAddress || "Shipping address not available"}
            </Text>
          </View>

          <Text style={styles.productsHeading}>PRODUCTS IN THIS ORDER</Text>

          {items.length === 0 ? (
            <Text style={styles.noProducts}>No product details available.</Text>
          ) : (
            items.map((item, index) => (
              <View
                key={`${item.productId || index}-${index}`}
                style={[
                  styles.productRow,
                  index === items.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.productIcon}>
                  <Ionicons name="leaf-outline" size={16} color={GREEN} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>
                    {item.productName || "Product"}
                  </Text>
                  <Text style={styles.productMeta}>
                    Qty {Number(item.quantity || 0)} ·{" "}
                    {formatCurrency(item.price)}
                  </Text>

                  {isDeliveredOrder(order.status) && item.productId && (
                    <TouchableOpacity
                      style={styles.reviewMiniButton}
                      onPress={() => onReview(item)}
                    >
                      <Ionicons name="star-outline" size={13} color={SUCCESS} />
                      <Text style={styles.reviewMiniText}>Review Product</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.productSubtotal}>
                  {formatCurrency(item.subtotal)}
                </Text>
              </View>
            ))
          )}

          {hasOrderRefund(order) && <RefundBox refund={order.refundData!} />}

          <View style={styles.actionsGrid}>
            <ActionButton
              icon="eye-outline"
              label="Details"
              variant="dark"
              onPress={onDetails}
            />
            <ActionButton
              icon="navigate-outline"
              label="Track"
              variant="gold"
              onPress={onTrack}
              loading={busy}
            />
            <ActionButton
              icon="cart-outline"
              label="Reorder"
              variant="green"
              onPress={onReorder}
              loading={busy}
            />

            {canCancelOrder(order) && (
              <ActionButton
                icon="close-outline"
                label="Cancel"
                variant="danger"
                onPress={onCancel}
              />
            )}

            {isDeliveredOrder(order.status) &&
              !isReturnAlreadyRequested(order) &&
              !hasOrderRefund(order) && (
                <ActionButton
                  icon="return-down-back-outline"
                  label="Return"
                  variant="purple"
                  onPress={onReturn}
                />
              )}
          </View>
        </View>
      )}
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function SummaryCell({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryCell}>
      <Ionicons name={icon} size={14} color={GOLD_DARK} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  variant,
  onPress,
  loading = false,
}: {
  icon: any;
  label: string;
  variant: "dark" | "gold" | "green" | "danger" | "purple";
  onPress: () => void;
  loading?: boolean;
}) {
  const config = {
    dark: { bg: GREEN, color: WHITE, border: GREEN },
    gold: { bg: "#FFF7DF", color: GOLD_DARK, border: "#EAD695" },
    green: { bg: MINT, color: GREEN, border: "#CFE0D3" },
    danger: { bg: "#FFF1EF", color: DANGER, border: "#F1CACA" },
    purple: { bg: "#F5EFFB", color: PURPLE, border: "#DBCBEA" },
  }[variant];

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={config.color} />
      ) : (
        <Ionicons name={icon} size={16} color={config.color} />
      )}
      <Text style={[styles.actionButtonText, { color: config.color }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DetailBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <View style={styles.detailBox}>
      <View style={styles.detailBoxIcon}>
        <Ionicons name={icon} size={16} color={GREEN} />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function RefundBox({ refund }: { refund: RefundData }) {
  const theme = getRefundTheme(refund.refundStatus);

  return (
    <View style={styles.refundBox}>
      <View style={styles.refundHeader}>
        <View style={styles.refundIcon}>
          <Ionicons name="refresh-outline" size={16} color={theme.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.refundEyebrow}>REFUND STATUS</Text>
          <Text style={[styles.refundStatus, { color: theme.color }]}>
            {formatStatus(refund.refundStatus || "PENDING")}
          </Text>
        </View>

        {refund.refundedAmount !== null &&
          refund.refundedAmount !== undefined && (
            <Text style={styles.refundAmount}>
              {formatCurrency(refund.refundedAmount)}
            </Text>
          )}
      </View>

      {!!refund.refundReason && (
        <Text style={styles.refundText}>Reason: {refund.refundReason}</Text>
      )}

      {!!refund.refundedAt && (
        <Text style={styles.refundText}>
          Refunded on: {formatDateTimeValue(refund.refundedAt)}
        </Text>
      )}
    </View>
  );
}

function normalizePaymentStatus(value: any) {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") {
    return value.trim().toUpperCase();
  }

  if (typeof value === "object") {
    return String(
      value.name ?? value.value ?? value.status ?? value.code ?? ""
    )
      .trim()
      .toUpperCase();
  }

  return String(value).trim().toUpperCase();
}

function normalizeOrderPaymentStatus(order: any): Order {
  return {
    ...order,
    paymentStatus: normalizePaymentStatus(
      order?.paymentStatus ?? order?.payment?.status ?? "PENDING"
    ),
    paymentId: order?.paymentId ?? order?.payment?.id ?? null,
    refundData: null,
  };
}

function displayPaymentStatus(value: any) {
  const status = normalizePaymentStatus(value);

  if (!status) return "Pending";
  if (status === "SUCCESS") return "Payment Success";
  if (status === "INITIATED") return "Payment Initiated";
  if (status === "PENDING") return "Payment Pending";
  if (status === "FAILED") return "Payment Failed";
  if (status === "REFUNDED") return "Refunded";
  if (status === "PARTIALLY_REFUNDED") return "Partially Refunded";
  if (status === "PAID" || status === "PAYMENT_SUCCESS")
    return "Payment Success";
  if (status === "PAYMENT_PENDING") return "Payment Pending";
  if (status === "PAYMENT_FAILED") return "Payment Failed";

  return formatStatus(status);
}

function shortPaymentStatus(value: any) {
  const status = displayPaymentStatus(value);
  return status.replace("Payment ", "");
}

function normalizedStatus(value: any) {
  return String(value || "PENDING").trim().toUpperCase();
}

function isDeliveredOrder(status: any) {
  return normalizedStatus(status) === "DELIVERED";
}

function isReturnAlreadyRequested(order: Order) {
  const value = String(
    order?.returnStatus ??
      order?.orderReturnStatus ??
      order?.returnRequest?.status ??
      ""
  )
    .trim()
    .toUpperCase();

  return [
    "REQUESTED",
    "PENDING",
    "APPROVED",
    "PROCESSING",
    "RETURNED",
    "COMPLETED",
    "REFUNDED",
  ].includes(value);
}

function hasOrderRefund(order: Order) {
  const refund = order?.refundData;
  if (!refund) return false;

  const status = String(refund.refundStatus || "")
    .trim()
    .toUpperCase();

  return (
    Boolean(status && status !== "NOT_REQUESTED") ||
    Number(refund.refundedAmount || 0) > 0 ||
    Boolean(
      refund.refundRequestedAt || refund.refundedAt || refund.refundReason
    )
  );
}

function canCancelOrder(order: Order) {
  const status = normalizedStatus(order?.status);

  if (
    [
      "CANCELLED",
      "DELIVERED",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "RETURN_REQUESTED",
      "RETURN_PENDING",
      "RETURN_APPROVED",
      "RETURN_PROCESSING",
      "RETURNED",
      "REFUNDED",
    ].includes(status)
  ) {
    return false;
  }

  return !isReturnAlreadyRequested(order) && !hasOrderRefund(order);
}

function getTotalQuantity(items: OrderItem[]) {
  return items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );
}

function getStatusTheme(status: any) {
  const value = normalizedStatus(status);

  if (value.includes("DELIVERED")) {
    return {
      color: SUCCESS,
      soft: "#EDF8F0",
      icon: "checkmark-circle-outline",
    };
  }

  if (value.includes("OUT_FOR_DELIVERY")) {
    return { color: PURPLE, soft: "#F5EFFB", icon: "navigate-outline" };
  }

  if (value.includes("SHIPPED")) {
    return { color: PURPLE, soft: "#F5EFFB", icon: "airplane-outline" };
  }

  if (value.includes("PACKED")) {
    return { color: INFO, soft: "#EDF6FB", icon: "cube-outline" };
  }

  if (value.includes("PAID") || value.includes("CONFIRMED")) {
    return { color: INFO, soft: "#EDF6FB", icon: "card-outline" };
  }

  if (value.includes("CANCEL") || value.includes("FAIL")) {
    return { color: DANGER, soft: "#FFF0F0", icon: "close-circle-outline" };
  }

  return { color: "#8A6200", soft: "#FFF7E7", icon: "time-outline" };
}

function getRefundTheme(status: any) {
  const value = normalizedStatus(status);

  if (["REFUNDED", "COMPLETED", "FULLY_REFUNDED"].includes(value)) {
    return { color: SUCCESS };
  }

  if (
    ["REQUESTED", "PENDING", "PROCESSING", "REFUND_PENDING"].includes(value)
  ) {
    return { color: GOLD_DARK };
  }

  return { color: DANGER };
}

function formatStatus(value: any) {
  return String(value || "Pending")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTimeValue(value?: string) {
  return formatDate(value);
}

function formatCurrency(value?: number) {
  return (
    "₹" +
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
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
  
 
  scrollContent: {
    paddingBottom: 0,
  },
  hero: {
    margin: 16,
    paddingTop: 26,
    paddingHorizontal: 21,
    paddingBottom: 21,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: GREEN,
    alignItems: "center",
  },
  heroGlowOne: {
    position: "absolute",
    width: 210,
    height: 210,
    top: -100,
    right: -75,
    borderRadius: 105,
    backgroundColor: "rgba(214,180,91,.14)",
  },
  heroGlowTwo: {
    position: "absolute",
    width: 165,
    height: 165,
    bottom: -90,
    left: -65,
    borderRadius: 85,
    backgroundColor: "rgba(255,255,255,.05)",
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },
  heroEyebrow: {
    marginTop: 13,
    fontFamily: "DMSans_700Bold",
    color: GOLD_LIGHT,
    fontSize: 8,
    letterSpacing: 1.5,
  },
  heroTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 34,
    lineHeight: 39,
  },
  heroLead: {
    marginTop: 8,
    maxWidth: 330,
    fontFamily: "DMSans_400Regular",
    color: "#D8E6DD",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
  },
  heroStats: {
    width: "100%",
    marginTop: 20,
    paddingVertical: 13,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.08)",
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
    color: "#BFD0C5",
    fontSize: 8,
  },
  statDivider: {
    width: 1,
    height: 31,
    backgroundColor: "rgba(255,255,255,.15)",
  },
  sectionHeading: {
    paddingHorizontal: 16,
    paddingTop: 23,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  sectionEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.45,
  },
  sectionTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 28,
    lineHeight: 33,
  },
  sectionSubtitle: {
    marginTop: 5,
    maxWidth: 315,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
    borderWidth: 1,
    borderColor: "#DAE9DF",
  },
  filters: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 6,
    gap: 8,
  },
  filterChip: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  filterChipText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },
  filterChipTextActive: {
    color: WHITE,
  },
  loadingCard: {
    margin: 16,
    marginTop: 20,
    padding: 28,
    borderRadius: 24,
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  loadingIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  loadingTitle: {
    marginTop: 14,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 20,
  },
  loadingText: {
    marginTop: 6,
    maxWidth: 280,
    textAlign: "center",
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
  },
  emptyCard: {
    margin: 16,
    marginTop: 20,
    padding: 28,
    borderRadius: 25,
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7DF",
  },
  emptyTitle: {
    marginTop: 16,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 22,
  },
  emptyText: {
    marginTop: 6,
    textAlign: "center",
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
  },
  shopButton: {
    marginTop: 17,
    minHeight: 45,
    paddingHorizontal: 18,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: GREEN,
  },
  shopButtonText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 10,
  },
  ordersList: {
    paddingHorizontal: 16,
    paddingTop: 13,
    gap: 15,
  },
  orderCard: {
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 3,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  orderCardTop: {
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  orderIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  orderLabel: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1.25,
  },
  orderNumber: {
    marginTop: 2,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 18,
  },
  orderDate: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },
  statusBadge: {
    minHeight: 28,
    maxWidth: 115,
    paddingHorizontal: 9,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    flexShrink: 1,
    fontFamily: "DMSans_700Bold",
    fontSize: 7,
  },
  summaryRow: {
    marginHorizontal: 14,
    marginBottom: 14,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAF7",
    borderWidth: 1,
    borderColor: "#EDF0EC",
  },
  summaryCell: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    marginTop: 3,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 7,
  },
  summaryValue: {
    marginTop: 2,
    maxWidth: 90,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E6EAE6",
  },
  expandedArea: {
    paddingHorizontal: 14,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: "#EEF1ED",
  },
  addressBox: {
    marginTop: 13,
    padding: 12,
    borderRadius: 15,
    flexDirection: "row",
    gap: 9,
    backgroundColor: MINT,
  },
  addressIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  addressText: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    color: "#4E5B53",
    fontSize: 9,
    lineHeight: 15,
  },
  productsHeading: {
    marginTop: 16,
    marginBottom: 5,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1.2,
  },
  noProducts: {
    marginVertical: 11,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
  },
  productRow: {
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1ED",
  },
  productIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  productName: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },
  productMeta: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
  },
  productSubtotal: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },
  reviewMiniButton: {
    alignSelf: "flex-start",
    marginTop: 7,
    minHeight: 29,
    paddingHorizontal: 9,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EDF8F1",
    borderWidth: 1,
    borderColor: "#C8E5D1",
  },
  reviewMiniText: {
    fontFamily: "DMSans_700Bold",
    color: SUCCESS,
    fontSize: 7,
  },
  actionsGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    minWidth: "30%",
    flexGrow: 1,
    minHeight: 41,
    paddingHorizontal: 11,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionButtonText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 8,
  },
  refundBox: {
    marginTop: 13,
    padding: 13,
    borderRadius: 16,
    backgroundColor: "#F8FAF7",
    borderWidth: 1,
    borderColor: "#DCE8DE",
  },
  refundHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  refundIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  refundEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 7,
    letterSpacing: 0.9,
  },
  refundStatus: {
    marginTop: 2,
    fontFamily: "DMSans_700Bold",
    fontSize: 9,
  },
  refundAmount: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 15,
  },
  refundText: {
    marginTop: 7,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
  },
  helpCard: {
    marginTop: 30,
    marginHorizontal: 16,
    marginBottom: 45,
    padding: 17,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "#F5EDDA",
    borderWidth: 1,
    borderColor: "#E8D6A8",
  },
  helpIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },
  helpTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },
  helpText: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
  },
  helpArrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  footer: {
    paddingTop: 38,
    paddingBottom: 34,
    paddingHorizontal: 22,
    alignItems: "center",
    backgroundColor: "#0A271A",
  },
  footerLogo: {
    width: 60,
    height: 60,
    borderRadius: 20,
  },
  footerBrand: {
    marginTop: 12,
    fontFamily: "PlayfairDisplay_700Bold",
    color: WHITE,
    fontSize: 19,
  },
  footerTagline: {
    marginTop: 8,
    maxWidth: 360,
    textAlign: "center",
    fontFamily: "DMSans_400Regular",
    color: "#C6D4CB",
    fontSize: 10,
    lineHeight: 17,
  },
  footerRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  footerText: {
    fontFamily: "DMSans_500Medium",
    color: "#E1EAE4",
    fontSize: 10,
  },
  footerAddress: {
    marginTop: 14,
    maxWidth: 355,
    textAlign: "center",
    fontFamily: "DMSans_400Regular",
    color: "#AFC0B6",
    fontSize: 9,
    lineHeight: 15,
  },
  copyright: {
    marginTop: 22,
    fontFamily: "DMSans_400Regular",
    color: "#81978A",
    fontSize: 8,
    textAlign: "center",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,28,19,.70)",
  },
  sheet: {
    maxHeight: "88%",
    paddingHorizontal: 17,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: CREAM,
  },
  smallSheet: {
    paddingHorizontal: 19,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 34 : 22,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: CREAM,
  },
  reviewSheet: {
    paddingHorizontal: 19,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 34 : 22,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: CREAM,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    alignSelf: "center",
    borderRadius: 3,
    backgroundColor: "#D8DDD8",
  },
  sheetHeader: {
    marginTop: 15,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.3,
  },
  sheetTitle: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 27,
  },
  sheetClose: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  detailBox: {
    width: "48%",
    minHeight: 102,
    padding: 12,
    borderRadius: 17,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  detailBoxIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  detailLabel: {
    marginTop: 9,
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 7,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  detailValue: {
    marginTop: 4,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
    lineHeight: 15,
  },
  detailWide: {
    marginTop: 10,
    padding: 13,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: MINT,
  },
  detailWideIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  modalSectionTitle: {
    marginTop: 21,
    marginBottom: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 18,
  },
  modalProductRow: {
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECE8",
  },
  productMiniIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  centerModalRoot: {
    flex: 1,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,28,19,.74)",
  },
  confirmDialog: {
    width: "100%",
    maxWidth: 380,
    padding: 22,
    borderRadius: 29,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "rgba(214,180,91,.42)",
    elevation: 18,
  },
  noticeDialog: {
    width: "100%",
    maxWidth: 370,
    padding: 22,
    borderRadius: 29,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "rgba(214,180,91,.42)",
    elevation: 18,
  },
  dangerIconOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCE8E5",
  },
  dangerIconInner: {
    width: 59,
    height: 59,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#F2CBC5",
  },
  dialogEyebrow: {
    marginTop: 15,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.4,
  },
  dialogTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 26,
    textAlign: "center",
  },
  dialogMessage: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
  },
  dialogInfo: {
    width: "100%",
    marginTop: 17,
    padding: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: MINT,
  },
  dialogInfoText: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 8,
    lineHeight: 13,
  },
  dangerButton: {
    width: "100%",
    minHeight: 48,
    marginTop: 18,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: DANGER,
  },
  dangerButtonText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 10,
  },
  secondaryButton: {
    width: "100%",
    minHeight: 46,
    marginTop: 9,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  secondaryButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },
  returnIcon: {
    width: 58,
    height: 58,
    marginTop: 18,
    alignSelf: "center",
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5EFFB",
  },
  returnTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 25,
    textAlign: "center",
  },
  returnLead: {
    marginTop: 7,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
    lineHeight: 15,
    textAlign: "center",
  },
  reasonInput: {
    minHeight: 120,
    marginTop: 16,
    padding: 13,
    borderRadius: 16,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 11,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  characterCount: {
    marginTop: 5,
    textAlign: "right",
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 8,
  },
  returnSubmitButton: {
    width: "100%",
    minHeight: 48,
    marginTop: 14,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: PURPLE,
  },
  returnSubmitText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 10,
  },
  reviewProductBox: {
    marginTop: 17,
    padding: 13,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: MINT,
    borderWidth: 1,
    borderColor: "#DCE8DE",
  },
  reviewProductIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  reviewProductName: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 16,
  },
  reviewProductSub: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
  },
  reviewLabel: {
    marginTop: 18,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.1,
  },
  starsRow: {
    marginTop: 9,
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
  },
  starButton: {
    padding: 2,
  },
  ratingText: {
    marginTop: 6,
    textAlign: "center",
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 9,
  },
  reviewInput: {
    minHeight: 115,
    marginTop: 8,
    padding: 13,
    borderRadius: 16,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 11,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  reviewSubmitButton: {
    width: "100%",
    minHeight: 48,
    marginTop: 14,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: GREEN,
  },
  reviewSubmitText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 10,
  },
  noticeIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeIconSuccess: {
    backgroundColor: "#E7F5EC",
  },
  noticeIconError: {
    backgroundColor: "#FCE8E5",
  },
  noticeIconInfo: {
    backgroundColor: "#EAF4F9",
  },
  noticeOkayButton: {
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
  noticeOkayText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },
});
