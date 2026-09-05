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
const WARNING = "#B97912";
const WARNING_LIGHT = "#FFF7E7";
const INFO = "#356C8C";
const INFO_LIGHT = "#EDF6FB";
const PURPLE = "#76548F";
const PURPLE_LIGHT = "#F5EFFB";

const PAGE_SIZE = 6;

type NoticeType = "success" | "error" | "info";

type NoticeState = {
  visible: boolean;
  type: NoticeType;
  title: string;
  message: string;
  loginRedirect?: boolean;
};

type Transaction = {
  id?: number;
  transactionId?: string;
  paymentType?: string;
  referenceId?: string | number;
  amount?: number;
  currency?: string;
  gateway?: string;
  status?: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  refundStatus?: string;
  refundedAmount?: number;
  paidAt?: string;
  createdAt?: string;
  failureReason?: string;
  refundReason?: string;
};

export default function MyTransactionsScreen() {
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

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const [notice, setNotice] = useState<NoticeState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
    loginRedirect: false,
  });

  useEffect(() => {
    initializePage();
  }, []);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const type = normalize(typeFilter);
    const status = normalize(statusFilter);

    const result = transactions.filter((t) => {
      const haystack = [
        t.transactionId,
        t.providerPaymentId,
        t.providerOrderId,
        t.referenceId,
        t.paymentType,
        t.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!q || haystack.includes(q)) &&
        (!type || normalize(t.paymentType) === type) &&
        (!status || normalize(t.status) === status) &&
        (!dateFilter ||
          extractDate(t.paidAt || t.createdAt) === dateFilter)
      );
    });

    return result;
  }, [transactions, search, typeFilter, statusFilter, dateFilter]);

  const summary = useMemo(() => {
    const success = transactions.filter(
      (item) => normalize(item.status) === "SUCCESS"
    );

    const refunded = transactions.filter(
      (item) =>
        normalize(item.status) === "REFUNDED" ||
        normalize(item.refundStatus) === "REFUNDED"
    );

    const totalPaid = success.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    return {
      total: transactions.length,
      successful: success.length,
      refunded: refunded.length,
      totalPaid,
    };
  }, [transactions]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / PAGE_SIZE)
  );

  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const visibleTransactions = filteredTransactions.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  async function initializePage() {
    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        showNotice(
          "info",
          "Login Required",
          "Please sign in to view your payment transactions.",
          true
        );
        return;
      }

      
    } finally {
      setLoading(false);
    }
  }

  async function getToken() {
    return (
      (await AsyncStorage.getItem("token")) ||
      (await AsyncStorage.getItem("accessToken")) ||
      (await AsyncStorage.getItem("jwtToken")) ||
      ""
    );
  }

  async function clearSession() {
    await AsyncStorage.multiRemove([
      "token",
      "accessToken",
      "jwtToken",
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

    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
      }
    );

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
        result?.message ||
          "Your login session has expired."
      );

      error.auth = true;
      throw error;
    }

    if (!response.ok || result?.success === false) {
      throw new Error(
        result?.message ||
          `Request failed (${response.status})`
      );
    }

    return result;
  }

  

  async function loadTransactions() {
    try {
      const result = await apiRequest(
        "/payments/my-transactions",
        {
          method: "GET",
        }
      );

      setTransactions(
        Array.isArray(result?.data) ? result.data : []
      );
    } catch (error: any) {
      setTransactions([]);

      if (error?.auth) {
        showNotice(
          "error",
          "Session Expired",
          error.message,
          true
        );
        return;
      }

      showNotice(
        "error",
        "Unable to Load Transactions",
        error?.message ||
          "Unable to load your payment history."
      );
    }
  }

  async function refreshAll() {
    setRefreshing(true);

    try {
      await loadTransactions();
    } finally {
      setRefreshing(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setDateFilter("");
    setCurrentPage(1);
  }

  function applyFilterChange(
    setter: (value: string) => void,
    value: string
  ) {
    setter(value);
    setCurrentPage(1);
  }

  function showNotice(
    type: NoticeType,
    title: string,
    message: string,
    loginRedirect = false
  ) {
    setNotice({
      visible: true,
      type,
      title,
      message,
      loginRedirect,
    });
  }

  function closeNotice() {
    const redirect = notice.loginRedirect;

    setNotice((current) => ({
      ...current,
      visible: false,
      loginRedirect: false,
    }));

    if (redirect) {
      router.replace("/login" as any);
    }
  }

  async function viewTransaction(transactionId?: string) {
    if (!transactionId) return;

    setDetailsOpen(true);
    setDetailsLoading(true);
    setSelectedTransaction(null);

    try {
      const result = await apiRequest(
        `/payments/${encodeURIComponent(transactionId)}`,
        {
          method: "GET",
        }
      );

      setSelectedTransaction(result?.data || {});
    } catch (error: any) {
      setDetailsOpen(false);

      showNotice(
        "error",
        "Unable to Load Details",
        error?.message ||
          "Unable to load transaction details."
      );
    } finally {
      setDetailsLoading(false);
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
        <Text style={styles.loaderText}>
          Loading your payment history...
        </Text>
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
            onRefresh={refreshAll}
            tintColor={GREEN}
          />
        }
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroCircleOne} />
          <View style={styles.heroCircleTwo} />

          <View style={styles.heroIconWrap}>
            <Ionicons
              name="receipt-outline"
              size={27}
              color={GREEN}
            />
          </View>

          <Text style={styles.heroEyebrow}>
            YOUR PAYMENT HISTORY
          </Text>

          <Text style={styles.heroTitle}>
            My{" "}
            <Text style={styles.heroTitleAccent}>
              Transactions
            </Text>
          </Text>

          <Text style={styles.heroText}>
            Review payments for product orders, clinic
            appointments and online consultations with
            clear status, gateway and transaction details.
          </Text>

          <View style={styles.heroTrustRow}>
            <View style={styles.heroTrustItem}>
              <Ionicons
                name="shield-checkmark-outline"
                size={15}
                color={GOLD_LIGHT}
              />
              <Text style={styles.heroTrustText}>
                Secure
              </Text>
            </View>

            <View style={styles.heroTrustDot} />

            <View style={styles.heroTrustItem}>
              <Ionicons
                name="time-outline"
                size={15}
                color={GOLD_LIGHT}
              />
              <Text style={styles.heroTrustText}>
                Updated
              </Text>
            </View>

            <View style={styles.heroTrustDot} />

            <View style={styles.heroTrustItem}>
              <Ionicons
                name="wallet-outline"
                size={15}
                color={GOLD_LIGHT}
              />
              <Text style={styles.heroTrustText}>
                Easy to track
              </Text>
            </View>
          </View>
        </View>

        {/* SUMMARY */}
        <View style={styles.section}>
          <Text style={styles.eyebrow}>
            PAYMENT OVERVIEW
          </Text>

          <Text style={styles.sectionTitle}>
            Your Transaction Summary
          </Text>

          <View style={styles.summaryGrid}>
            <SummaryCard
              icon="receipt-outline"
              label="Total"
              value={String(summary.total)}
              soft="#FFF7DF"
              accent={GOLD_DARK}
            />

            <SummaryCard
              icon="checkmark-circle-outline"
              label="Successful"
              value={String(summary.successful)}
              soft={SUCCESS_LIGHT}
              accent={SUCCESS}
            />

            <SummaryCard
              icon="cash-outline"
              label="Total Paid"
              value={formatCurrency(
                summary.totalPaid,
                "INR"
              )}
              soft={MINT}
              accent={GREEN}
            />

            <SummaryCard
              icon="return-down-back-outline"
              label="Refunded"
              value={String(summary.refunded)}
              soft={PURPLE_LIGHT}
              accent={PURPLE}
            />
          </View>
        </View>

        {/* FILTERS */}
        <View style={styles.filterCard}>
          <View style={styles.filterTitleRow}>
            <View>
              <Text style={styles.filterEyebrow}>
                FIND A PAYMENT
              </Text>
              <Text style={styles.filterTitle}>
                Search & Filter
              </Text>
            </View>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetFilters}
            >
              <Ionicons
                name="refresh-outline"
                size={14}
                color={GREEN}
              />
              <Text style={styles.resetButtonText}>
                Reset
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons
              name="search-outline"
              size={18}
              color={GOLD_DARK}
            />

            <TextInput
              value={search}
              onChangeText={(value) =>
                applyFilterChange(setSearch, value)
              }
              placeholder="Search transaction ID, reference ID..."
              placeholderTextColor="#9AA59E"
              autoCapitalize="none"
              style={styles.searchInput}
            />
          </View>

          <Text style={styles.filterLabel}>
            PAYMENT TYPE
          </Text>

          <View style={styles.chipRow}>
            {["", "ORDER", "APPOINTMENT", "CONSULTATION"].map(
              (value) => (
                <FilterChip
                  key={value || "ALL"}
                  label={
                    value
                      ? formatLabel(value)
                      : "All"
                  }
                  active={typeFilter === value}
                  onPress={() =>
                    applyFilterChange(
                      setTypeFilter,
                      value
                    )
                  }
                />
              )
            )}
          </View>

          <Text style={styles.filterLabel}>
            STATUS
          </Text>

          <View style={styles.chipRow}>
            {[
              "",
              "SUCCESS",
              "INITIATED",
              "FAILED",
              "REFUNDED",
            ].map((value) => (
              <FilterChip
                key={value || "ALL"}
                label={
                  value
                    ? formatLabel(value)
                    : "All"
                }
                active={statusFilter === value}
                onPress={() =>
                  applyFilterChange(
                    setStatusFilter,
                    value
                  )
                }
              />
            ))}
          </View>

          <Text style={styles.filterLabel}>
            DATE
          </Text>

          <View style={styles.dateInputWrap}>
            <Ionicons
              name="calendar-outline"
              size={17}
              color={GOLD_DARK}
            />

            <TextInput
              value={dateFilter}
              onChangeText={(value) =>
                applyFilterChange(
                  setDateFilter,
                  value
                )
              }
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9AA59E"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              style={styles.dateInput}
            />
          </View>
        </View>

        {/* LIST */}
        <View style={styles.section}>
          <View style={styles.headingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>
                PAYMENT HISTORY
              </Text>

              <Text style={styles.sectionTitle}>
                Recent Transactions
              </Text>
            </View>

            <View style={styles.countPill}>
              <Text style={styles.countPillText}>
                {filteredTransactions.length}
              </Text>
            </View>
          </View>

          {loading ? (
            <LoadingCard />
          ) : !filteredTransactions.length ? (
            <EmptyCard />
          ) : (
            <View style={styles.transactionList}>
              {visibleTransactions.map(
                (transaction, index) => (
                  <TransactionCard
                    key={
                      transaction.transactionId ||
                      `${index}`
                    }
                    transaction={transaction}
                    onView={() =>
                      viewTransaction(
                        transaction.transactionId
                      )
                    }
                  />
                )
              )}
            </View>
          )}

          {!loading &&
            filteredTransactions.length > 0 &&
            totalPages > 1 && (
              <View style={styles.paginationCard}>
                <Text style={styles.paginationText}>
                  Showing{" "}
                  {filteredTransactions.length
                    ? startIndex + 1
                    : 0}
                  -
                  {Math.min(
                    startIndex + PAGE_SIZE,
                    filteredTransactions.length
                  )}{" "}
                  of {filteredTransactions.length}
                </Text>

                <View style={styles.paginationControls}>
                  <TouchableOpacity
                    style={[
                      styles.pageButton,
                      safePage === 1 &&
                        styles.pageButtonDisabled,
                    ]}
                    disabled={safePage === 1}
                    onPress={() =>
                      setCurrentPage((page) =>
                        Math.max(1, page - 1)
                      )
                    }
                  >
                    <Ionicons
                      name="chevron-back"
                      size={17}
                      color={GREEN}
                    />
                  </TouchableOpacity>

                  <View style={styles.pageActive}>
                    <Text style={styles.pageActiveText}>
                      {safePage}
                    </Text>
                  </View>

                  <Text style={styles.pageOfText}>
                    of {totalPages}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.pageButton,
                      safePage === totalPages &&
                        styles.pageButtonDisabled,
                    ]}
                    disabled={safePage === totalPages}
                    onPress={() =>
                      setCurrentPage((page) =>
                        Math.min(
                          totalPages,
                          page + 1
                        )
                      )
                    }
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={GREEN}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
        </View>

        {/* SUPPORT */}
        <View style={styles.supportCard}>
          <View style={styles.supportIcon}>
            <Ionicons
              name="help-circle-outline"
              size={25}
              color={GOLD}
            />
          </View>

          <Text style={styles.supportEyebrow}>
            PAYMENT SUPPORT
          </Text>

          <Text style={styles.supportTitle}>
            Need Help With a Transaction?
          </Text>

          <Text style={styles.supportText}>
            If you have a payment, refund or transaction
            concern, contact NeoLife and share your
            transaction ID for faster support.
          </Text>

          <TouchableOpacity
            style={styles.supportButton}
            onPress={() =>
              openURL(
                "https://wa.me/919481489866?text=Hello%20NeoLife%20Wellness%20Center,%20I%20need%20help%20with%20a%20transaction."
              )
            }
          >
            <Ionicons
              name="logo-whatsapp"
              size={18}
              color={GREEN}
            />

            <Text style={styles.supportButtonText}>
              Chat With NeoLife
            </Text>
          </TouchableOpacity>
        </View>

        {/* SAME FOOTER */}
        <View style={styles.footer}>
          <Image
            source={require("../assets/images/main_logo.jpeg")}
            style={styles.footerLogo}
          />

          <Text style={styles.footerBrand}>
            NeoLife Wellness Center
          </Text>

          <Text style={styles.footerTagline}>
            Natural healing, Ayurvedic care and trusted
            wellness support for a healthier life.
          </Text>

          <TouchableOpacity
            style={styles.footerRow}
            onPress={() =>
              openURL("tel:+919481489866")
            }
          >
            <Ionicons
              name="call-outline"
              size={17}
              color={GOLD}
            />
            <Text style={styles.footerText}>
              +91 94814 89866
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerRow}
            onPress={() =>
              openURL(
                "mailto:neelavar.murali@gmail.com"
              )
            }
          >
            <Ionicons
              name="mail-outline"
              size={17}
              color={GOLD}
            />
            <Text style={styles.footerText}>
              neelavar.murali@gmail.com
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerAddress}>
            4-1-38, Behind Lions Bhavan Road, Nairkere
            1st Cross, Brahmagiri, Ambalapady Post,
            Udupi – 576103, Karnataka, India
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
                openURL(
                  "https://www.instagram.com/neolives_global"
                )
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
              onPress={() =>
                openURL(
                  "https://wa.me/919481489866"
                )
              }
            />
          </View>

          <Text style={styles.copyright}>
            © 2026 NeoLife Wellness Center. All Rights
            Reserved.
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
        <Ionicons
          name="logo-whatsapp"
          size={28}
          color={WHITE}
        />
      </TouchableOpacity>

      <PatientDrawer
  visible={menuOpen}
  onClose={() => setMenuOpen(false)}
/>

      {/* DETAILS SHEET */}
      <Modal
        visible={detailsOpen}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setDetailsOpen(false)
        }
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() =>
              setDetailsOpen(false)
            }
          />

          <View style={styles.detailsSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetEyebrow}>
                  PAYMENT INFORMATION
                </Text>

                <Text style={styles.sheetTitle}>
                  Transaction Details
                </Text>
              </View>

              <TouchableOpacity
                style={styles.sheetClose}
                onPress={() =>
                  setDetailsOpen(false)
                }
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={GREEN}
                />
              </TouchableOpacity>
            </View>

            {detailsLoading ? (
              <View style={styles.detailsLoading}>
                <ActivityIndicator
                  size="large"
                  color={GREEN}
                />
                <Text style={styles.detailsLoadingText}>
                  Loading transaction details...
                </Text>
              </View>
            ) : (
              selectedTransaction && (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.detailsGrid}>
                    <DetailCard
                      label="Payment ID"
                      value={selectedTransaction.id}
                    />

                    <DetailCard
                      label="Transaction ID"
                      value={
                        selectedTransaction.transactionId
                      }
                    />

                    <DetailCard
                      label="Payment Type"
                      value={formatLabel(
                        selectedTransaction.paymentType
                      )}
                    />

                    <DetailCard
                      label="Reference ID"
                      value={
                        selectedTransaction.referenceId
                      }
                    />

                    <DetailCard
                      label="Amount"
                      value={formatCurrency(
                        selectedTransaction.amount,
                        selectedTransaction.currency
                      )}
                    />

                    <DetailCard
                      label="Gateway"
                      value={formatLabel(
                        selectedTransaction.gateway
                      )}
                    />

                    <DetailCard
                      label="Status"
                      value={formatLabel(
                        selectedTransaction.status
                      )}
                    />

                    <DetailCard
                      label="Provider Payment ID"
                      value={
                        selectedTransaction.providerPaymentId
                      }
                    />

                    <DetailCard
                      label="Provider Order ID"
                      value={
                        selectedTransaction.providerOrderId
                      }
                    />

                    <DetailCard
                      label="Refund Status"
                      value={formatLabel(
                        selectedTransaction.refundStatus
                      )}
                    />

                    <DetailCard
                      label="Refunded Amount"
                      value={
                        selectedTransaction.refundedAmount !=
                        null
                          ? formatCurrency(
                              selectedTransaction.refundedAmount,
                              selectedTransaction.currency
                            )
                          : "-"
                      }
                    />

                    <DetailCard
                      label="Paid At"
                      value={formatDateTime(
                        selectedTransaction.paidAt
                      )}
                    />
                  </View>

                  <WideDetail
                    label="Failure Reason"
                    value={
                      selectedTransaction.failureReason ||
                      "-"
                    }
                  />

                  <WideDetail
                    label="Refund Reason"
                    value={
                      selectedTransaction.refundReason ||
                      "-"
                    }
                  />

                  <View style={{ height: 25 }} />
                </ScrollView>
              )
            )}
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

            <Text style={styles.noticeEyebrow}>
              NEOLIFE WELLNESS
            </Text>

            <Text style={styles.noticeTitle}>
              {notice.title}
            </Text>

            <Text style={styles.noticeMessage}>
              {notice.message}
            </Text>

            <TouchableOpacity
              style={styles.noticeButton}
              onPress={closeNotice}
            >
              <Text style={styles.noticeButtonText}>
                {notice.loginRedirect
                  ? "Go to Login"
                  : "Okay"}
              </Text>

              <Ionicons
                name="arrow-forward"
                size={17}
                color={GREEN}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TransactionCard({
  transaction,
  onView,
}: {
  transaction: Transaction;
  onView: () => void;
}) {
  const theme = getStatusTheme(transaction.status);
  const icon = getPaymentTypeIcon(
    transaction.paymentType
  );

  return (
    <View style={styles.transactionCard}>
      <View style={styles.transactionTop}>
        <View style={styles.transactionIcon}>
          <Ionicons
            name={icon}
            size={21}
            color={GOLD_DARK}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.transactionEyebrow}>
            {formatLabel(transaction.paymentType)} PAYMENT
          </Text>

          <Text
            style={styles.transactionId}
            numberOfLines={1}
          >
            {transaction.transactionId || "-"}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: theme.soft,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: theme.color,
              },
            ]}
          />

          <Text
            style={[
              styles.statusText,
              {
                color: theme.color,
              },
            ]}
          >
            {formatLabel(transaction.status)}
          </Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <MetaCard
          icon="cash-outline"
          label="Amount"
          value={formatCurrency(
            transaction.amount,
            transaction.currency
          )}
        />

        <MetaCard
          icon="document-text-outline"
          label="Reference ID"
          value={String(
            transaction.referenceId ?? "-"
          )}
        />

        <MetaCard
          icon="card-outline"
          label="Gateway"
          value={formatLabel(
            transaction.gateway
          )}
        />

        <MetaCard
          icon="time-outline"
          label="Paid On"
          value={formatDateTime(
            transaction.paidAt ||
              transaction.createdAt
          )}
        />
      </View>

      <TouchableOpacity
        style={styles.viewButton}
        onPress={onView}
      >
        <Ionicons
          name="eye-outline"
          size={17}
          color={GREEN}
        />

        <Text style={styles.viewButtonText}>
          View Transaction Details
        </Text>

        <Ionicons
          name="arrow-forward"
          size={17}
          color={GREEN}
        />
      </TouchableOpacity>
    </View>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  soft,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  soft: string;
  accent: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View
        style={[
          styles.summaryIcon,
          { backgroundColor: soft },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={accent}
        />
      </View>

      <Text style={styles.summaryLabel}>
        {label}
      </Text>

      <Text
        style={styles.summaryValue}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function MetaCard({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaCard}>
      <View style={styles.metaIcon}>
        <Ionicons
          name={icon}
          size={14}
          color={GOLD_DARK}
        />
      </View>

      <Text style={styles.metaLabel}>
        {label}
      </Text>

      <Text
        style={styles.metaValue}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        active && styles.filterChipActive,
      ]}
      onPress={onPress}
    >
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
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>
      <Text style={styles.detailValue}>
        {value == null || value === ""
          ? "-"
          : String(value)}
      </Text>
    </View>
  );
}

function WideDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.wideDetail}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>
      <Text style={styles.wideDetailValue}>
        {value}
      </Text>
    </View>
  );
}

function LoadingCard() {
  return (
    <View style={styles.loadingCard}>
      <ActivityIndicator
        size="large"
        color={GREEN}
      />

      <Text style={styles.loadingTitle}>
        Loading Transactions
      </Text>

      <Text style={styles.loadingText}>
        We’re checking your latest payment history...
      </Text>
    </View>
  );
}

function EmptyCard() {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name="receipt-outline"
          size={29}
          color={GOLD_DARK}
        />
      </View>

      <Text style={styles.emptyTitle}>
        No Transactions Found
      </Text>

      <Text style={styles.emptyText}>
        Try changing your search or filters. Your
        completed payments will appear here.
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
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={20}
        color={WHITE}
      />
    </TouchableOpacity>
  );
}

function normalize(value: any) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function formatLabel(value: any) {
  const text = String(value || "")
    .trim()
    .replace(/_/g, " ")
    .toLowerCase();

  return text
    ? text.replace(/\b\w/g, (char) =>
        char.toUpperCase()
      )
    : "-";
}

function formatCurrency(
  amount?: number,
  currency = "INR"
) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return "-";
  }

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `₹${value.toFixed(2)}`;
  }
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function getPaymentTypeIcon(type?: string) {
  const value = normalize(type);

  if (value === "ORDER") {
    return "bag-handle-outline";
  }

  if (value === "APPOINTMENT") {
    return "calendar-outline";
  }

  if (value === "CONSULTATION") {
    return "videocam-outline";
  }

  return "receipt-outline";
}

function getStatusTheme(status?: string) {
  const value = normalize(status);

  if (value === "SUCCESS") {
    return {
      color: SUCCESS,
      soft: SUCCESS_LIGHT,
    };
  }

  if (value === "FAILED") {
    return {
      color: DANGER,
      soft: DANGER_LIGHT,
    };
  }

  if (value === "REFUNDED") {
    return {
      color: PURPLE,
      soft: PURPLE_LIGHT,
    };
  }

  if (value === "INITIATED") {
    return {
      color: WARNING,
      soft: WARNING_LIGHT,
    };
  }

  return {
    color: MUTED,
    soft: "#F1F3F1",
  };
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

  

  /* HERO */
  hero: {
    margin: 16,
    padding: 24,
    minHeight: 355,
    borderRadius: 31,
    overflow: "hidden",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  heroCircleOne: {
    position: "absolute",
    width: 230,
    height: 230,
    right: -95,
    top: -90,
    borderRadius: 115,
    backgroundColor:
      "rgba(214,180,91,.16)",
  },

  heroCircleTwo: {
    position: "absolute",
    width: 160,
    height: 160,
    left: -65,
    bottom: -60,
    borderRadius: 80,
    backgroundColor:
      "rgba(255,255,255,.06)",
  },

  heroIconWrap: {
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
    letterSpacing: -0.9,
  },

  heroTitleAccent: {
    color: GOLD_LIGHT,
  },

  heroText: {
    marginTop: 11,
    maxWidth: 330,
    fontFamily: "DMSans_400Regular",
    color: "#D6E3DA",
    fontSize: 11,
    lineHeight: 18,
  },

  heroTrustRow: {
    marginTop: 22,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      "rgba(255,255,255,.08)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,.08)",
  },

  heroTrustItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  heroTrustText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 7,
  },

  heroTrustDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor:
      "rgba(255,255,255,.25)",
  },

  section: {
    paddingHorizontal: 16,
    paddingTop: 27,
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

  /* SUMMARY */
  summaryGrid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  summaryCard: {
    width: "48%",
    minHeight: 132,
    padding: 14,
    borderRadius: 21,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryLabel: {
    marginTop: 12,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  summaryValue: {
    marginTop: 2,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 20,
  },

  /* FILTER */
  filterCard: {
    marginTop: 30,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 24,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  filterTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  filterEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 1.1,
  },

  filterTitle: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 21,
  },

  resetButton: {
    minHeight: 37,
    paddingHorizontal: 11,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: MINT,
  },

  resetButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 8,
  },

  searchWrap: {
    marginTop: 15,
    minHeight: 51,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FBFCFA",
    borderWidth: 1,
    borderColor: BORDER,
  },

  searchInput: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 10,
  },

  filterLabel: {
    marginTop: 17,
    marginBottom: 8,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 7,
    letterSpacing: 1,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  filterChip: {
    minHeight: 37,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F8F5",
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
    fontSize: 8,
  },

  filterChipTextActive: {
    color: WHITE,
  },

  dateInputWrap: {
    minHeight: 49,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FBFCFA",
    borderWidth: 1,
    borderColor: BORDER,
  },

  dateInput: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 10,
  },

  /* TRANSACTION CARD */
  transactionList: {
    marginTop: 18,
    gap: 14,
  },

  transactionCard: {
    padding: 16,
    borderRadius: 25,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 3,
    shadowColor: GREEN,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },

  transactionTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  transactionIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7DF",
  },

  transactionEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 0.8,
  },

  transactionId: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 16,
  },

  statusBadge: {
    minHeight: 27,
    maxWidth: 95,
    paddingHorizontal: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusText: {
    flexShrink: 1,
    fontFamily: "DMSans_700Bold",
    fontSize: 7,
  },

  metaGrid: {
    marginTop: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  metaCard: {
    width: "48%",
    minHeight: 78,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#F8F9F6",
  },

  metaIcon: {
    width: 29,
    height: 29,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  metaLabel: {
    marginTop: 7,
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 6,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  metaValue: {
    marginTop: 3,
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 8,
    lineHeight: 12,
  },

  viewButton: {
    minHeight: 46,
    marginTop: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GOLD,
  },

  viewButtonText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
    textAlign: "center",
  },

  /* PAGINATION */
  paginationCard: {
    marginTop: 16,
    padding: 13,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  paginationText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 7,
  },

  paginationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  pageButton: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  pageButtonDisabled: {
    opacity: 0.35,
  },

  pageActive: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },

  pageActiveText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 9,
  },

  pageOfText: {
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 7,
  },

  /* LOADING / EMPTY */
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
    marginTop: 13,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 20,
  },

  loadingText: {
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
    textAlign: "center",
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
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7DF",
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

  /* SUPPORT */
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
    fontSize: 24,
    lineHeight: 29,
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

  supportButton: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: GOLD,
  },

  supportButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
  },

  /* FOOTER */
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
    backgroundColor:
      "rgba(255,255,255,.10)",
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
    bottom:
      Platform.OS === "web" ? 20 : 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#20C764",
    elevation: 8,
    zIndex: 100,
  },

  
  /* DETAILS SHEET */
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(5,28,19,.72)",
  },

  detailsSheet: {
    maxHeight: "90%",
    paddingHorizontal: 17,
    paddingTop: 10,
    paddingBottom:
      Platform.OS === "ios" ? 34 : 21,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: CREAM,
  },

  sheetHandle: {
    width: 44,
    height: 5,
    alignSelf: "center",
    borderRadius: 3,
    backgroundColor: "#D7DDD8",
  },

  sheetHeader: {
    marginTop: 15,
    marginBottom: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  sheetEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.2,
  },

  sheetTitle: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
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

  detailsLoading: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
  },

  detailsLoadingText: {
    marginTop: 10,
    fontFamily: "DMSans_500Medium",
    color: MUTED,
    fontSize: 9,
  },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  detailCard: {
    width: "48%",
    minHeight: 87,
    padding: 12,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  detailLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 7,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },

  detailValue: {
    marginTop: 5,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 9,
    lineHeight: 14,
  },

  wideDetail: {
    marginTop: 9,
    padding: 13,
    borderRadius: 16,
    backgroundColor: MINT,
  },

  wideDetailValue: {
    marginTop: 5,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 9,
    lineHeight: 15,
  },

  /* NOTICE */
  noticeRoot: {
    flex: 1,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  noticeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(5,28,19,.75)",
  },

  noticeCard: {
    width: "100%",
    maxWidth: 370,
    padding: 22,
    borderRadius: 29,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor:
      "rgba(214,180,91,.40)",
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
});
