import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DoctorDrawer from "../../components/DoctorDrawer";
import DoctorHeader from "../../components/DoctorHeader";
import { API_BASE_URL } from "../../services/api";

const GREEN = "#0B3D2E";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBFAF6";
const TEXT = "#17231D";
const MUTED = "#75837B";
const WHITE = "#FFFFFF";
const BORDER = "#E6EBE7";
const SUCCESS = "#287146";
const SUCCESS_LIGHT = "#EBF7EF";
const WARNING = "#D88B18";
const WARNING_LIGHT = "#FFF6E8";
const DANGER = "#C74747";
const DANGER_LIGHT = "#FFF0F0";
const INFO = "#31708F";
const INFO_LIGHT = "#EDF6FB";
const PAGE_SIZE = 8;

type Tx = {
  id: any;
  transactionNumber: string;
  patientName: string;
  patientPhone: string;
  type: string;
  referenceId: any;
  referenceNumber: string;
  date: string;
  paymentMethod: string;
  amount: number;
  status: string;
  gatewayId: string;
  paymentOrderId: string;
  notes: string;
};

type NoticeType = "success" | "error" | "info";

const arrayOf = (result: any) =>
  Array.isArray(result?.data)
    ? result.data
    : Array.isArray(result?.data?.content)
      ? result.data.content
      : Array.isArray(result)
        ? result
        : [];

const label = (value: any) =>
  String(value || "—")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const money = (value: any) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

function dateOnly(value: any) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 10);
}

function dateTime(value: any) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function normalize(item: any): Tx {
  const type = String(
    item.transactionType || item.type || "APPOINTMENT",
  ).toUpperCase();

  const referenceId =
    item.referenceId ?? item.appointmentId ?? item.consultationId;

  const referencePrefix = type === "CONSULTATION" ? "CON" : "APT";

  const rawPaymentOrderId =
    item.paymentTransactionId ||
    item.gatewayTransactionId ||
    item.payuTransactionId ||
    "";

  const paymentOrderId = rawPaymentOrderId || "—";

  return {
    id:
      item.id ||
      item.transactionId ||
      `${type}-${referenceId ?? rawPaymentOrderId}`,

    transactionNumber:
      item.transactionNumber ||
      item.transactionId ||
      item.paymentReference ||
      item.paymentId ||
      rawPaymentOrderId ||
      `${referencePrefix}-${referenceId}`,

    patientName: item.patientName || item.userName || "Patient",
    patientPhone: item.patientPhone || item.phoneNumber || "—",
    type,
    referenceId: referenceId ?? null,

    referenceNumber:
      item.appointmentNumber ||
      item.appointmentCode ||
      (referenceId != null ? `${referencePrefix}-${referenceId}` : "—"),

    date:
      item.transactionDate ||
      item.date ||
      item.paymentDate ||
      item.createdAt ||
      "",

    paymentMethod:
      item.paymentMethod ||
      item.gateway ||
      (/^(order_|pay_)/i.test(
        `${rawPaymentOrderId}${item.paymentId || ""}`,
      )
        ? "RAZORPAY"
        : "—"),

    amount: Number(item.amount || 0),

    status: String(
      item.status || item.paymentStatus || "PENDING",
    ).toUpperCase(),

    gatewayId: item.paymentId || "—",
    paymentOrderId,
    notes: item.notes || item.description || "—",
  };
}

function statusTheme(value: string) {
  if (["SUCCESS", "PAID"].includes(value)) {
    return { c: SUCCESS, b: SUCCESS_LIGHT };
  }

  if (["FAILED", "REFUNDED"].includes(value)) {
    return { c: DANGER, b: DANGER_LIGHT };
  }

  if (value === "NOT_REQUIRED_YET") {
    return { c: INFO, b: INFO_LIGHT };
  }

  return { c: WARNING, b: WARNING_LIGHT };
}

function typeTheme(value: string) {
  if (value === "CONSULTATION") {
    return {
      c: INFO,
      b: INFO_LIGHT,
      i: "videocam-outline" as const,
    };
  }

  if (value === "THERAPY") {
    return {
      c: "#A98632",
      b: "#FFF7DF",
      i: "leaf-outline" as const,
    };
  }

  return {
    c: SUCCESS,
    b: SUCCESS_LIGHT,
    i: "business-outline" as const,
  };
}

export default function DoctorTransactionsScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Tx | null>(null);
  const [details, setDetails] = useState(false);
  const [notice, setNotice] = useState({
    visible: false,
    type: "info" as NoticeType,
    title: "",
    message: "",
  });

  const show = useCallback(
    (noticeType: NoticeType, title: string, message: string) =>
      setNotice({ visible: true, type: noticeType, title, message }),
    [],
  );

  const token = useCallback(
    async () =>
      (await AsyncStorage.getItem("doctorToken")) ||
      (await AsyncStorage.getItem("token")) ||
      (await AsyncStorage.getItem("accessToken")) ||
      "",
    [],
  );

  const clear = useCallback(
    async () =>
      AsyncStorage.multiRemove([
        "doctorToken",
        "doctorRefreshToken",
        "token",
        "refreshToken",
        "accessToken",
        "role",
        "doctorId",
        "doctorName",
        "doctor",
        "doctorSpecialization",
        "doctorHasOnline",
        "doctorHasOffline",
        "doctorProfileImageUrl",
        "doctorProfileImageId",
        "userId",
        "email",
        "profileCompleted",
        "isLoggedIn",
      ]),
    [],
  );

  const api = useCallback(
    async (path: string) => {
      const authToken = await token();

      if (!authToken) {
        await clear();
        router.replace("/login" as any);
        throw new Error("Doctor login required.");
      }

      const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      const responseText = await response.text();
      let result: any = {};

      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        result = {
          success: false,
          message: responseText || "Invalid server response.",
        };
      }

      if (response.status === 401) {
        await clear();
        router.replace("/login" as any);
        throw new Error(result?.message || "Doctor session expired.");
      }

      // Keep 403 as a permission error rather than destroying the login session.
      if (response.status === 403) {
        throw new Error(
          result?.message ||
            "You do not have permission to view these transactions.",
        );
      }

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || `Request failed (${response.status})`,
        );
      }

      return result;
    },
    [token, clear],
  );

  const profile = useCallback(async () => {
    try {
      const result = await api("/doctors/my-profile");
      const doctor = result?.data || {};
      const doctorName = doctor?.name || doctor?.doctorName || "Doctor";

      const values: [string, string][] = [
        ["doctorName", String(doctorName)],
        ["doctor", JSON.stringify(doctor)],
      ];

      if (doctor?.id != null) {
        values.push(["doctorId", String(doctor.id)]);
      }

      if (doctor?.specialization) {
        values.push([
          "doctorSpecialization",
          String(doctor.specialization),
        ]);
      }

      if (doctor?.imageUrl) {
        values.push([
          "doctorProfileImageUrl",
          String(doctor.imageUrl),
        ]);
      }

      await AsyncStorage.multiSet(values);
    } catch (error) {
      console.warn(error);
    }
  }, [api]);

  const load = useCallback(async () => {
    try {
      const result = await api("/doctor-dashboard/transactions");
      setRows(
        arrayOf(result)
          .map(normalize)
          .filter((item) => item.id),
      );
    } catch (error: any) {
      setRows([]);
      show(
        "error",
        "Unable to Load Transactions",
        error?.message || "Unable to load transactions.",
      );
    }
  }, [api, show]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await profile();
      await load();
    } finally {
      setLoading(false);
    }
  }, [profile, load]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([profile(), load()]);
    setRefreshing(false);
  }, [profile, load]);

  const summary = useMemo(() => {
    const now = new Date();
    const today = dateOnly(now);
    const success = rows.filter((item) =>
      ["SUCCESS", "PAID"].includes(item.status),
    );
    const sum = (items: Tx[]) =>
      items.reduce((total, item) => total + item.amount, 0);

    return {
      today: sum(
        success.filter((item) => dateOnly(item.date) === today),
      ),
      month: sum(
        success.filter((item) => {
          const date = new Date(item.date);
          return (
            !Number.isNaN(date.getTime()) &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
          );
        }),
      ),
      online: sum(
        success.filter((item) => item.type === "CONSULTATION"),
      ),
      offline: sum(
        success.filter((item) => item.type === "APPOINTMENT"),
      ),
      refund: sum(
        rows.filter((item) => item.status === "REFUNDED"),
      ),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((item) => {
      const itemDate = dateOnly(item.date);

      return (
        (!query ||
          [
            item.transactionNumber,
            item.patientName,
            item.patientPhone,
            item.referenceNumber,
            item.gatewayId,
            item.paymentOrderId,
          ].some((value) =>
            String(value).toLowerCase().includes(query),
          )) &&
        (!type || item.type === type) &&
        (!status || item.status === status) &&
        (!from || itemDate >= from) &&
        (!to || itemDate <= to)
      );
    });
  }, [rows, search, type, status, from, to]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const items = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const reset = () => {
    setSearch("");
    setType("");
    setStatus("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const renderItem = ({ item }: { item: Tx }) => {
    const statusStyle = statusTheme(item.status);
    const typeStyle = typeTheme(item.type);

    return (
      <Pressable
        style={styles.card}
        onPress={() => {
          setSelected(item);
          setDetails(true);
        }}
      >
        <View style={styles.top}>
          <View style={styles.patient}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.patientName.charAt(0).toUpperCase() || "P"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.patientName}</Text>
              <Text style={styles.muted}>{item.patientPhone}</Text>
            </View>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: statusStyle.b },
            ]}
          >
            <Text style={[styles.badgeText, { color: statusStyle.c }]}>
              {label(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.line} />

        <View style={styles.amountRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>TRANSACTION ID</Text>
            <Text style={styles.tx}>{item.transactionNumber}</Text>
          </View>
          <Text style={styles.amount}>{money(item.amount)}</Text>
        </View>

        <View style={styles.grid}>
          <Info
            icon={typeStyle.i}
            label="Type"
            value={label(item.type)}
          />
          <Info
            icon="calendar-outline"
            label="Reference"
            value={item.referenceNumber}
          />
          <Info
            icon="time-outline"
            label="Date"
            value={dateTime(item.date)}
          />
          <Info
            icon="card-outline"
            label="Payment"
            value={label(item.paymentMethod)}
          />
        </View>

        <View style={styles.footer}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: typeStyle.b },
            ]}
          >
            <Ionicons
              name={typeStyle.i}
              size={15}
              color={typeStyle.c}
            />
            <Text style={[styles.typeText, { color: typeStyle.c }]}>
              {item.type === "CONSULTATION"
                ? "Online"
                : item.type === "THERAPY"
                  ? "Therapy"
                  : "Offline"}
            </Text>
          </View>

          <View style={styles.view}>
            <Ionicons name="eye-outline" size={17} color={GREEN} />
            <Text style={styles.viewText}>View Details</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <View style={styles.screen}>
        <DoctorHeader
          title="Transactions"
          onMenuPress={() => setMenuOpen(true)}
        />

        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={GREEN}
              colors={[GREEN]}
            />
          }
          ListHeaderComponent={
            <>
              <View style={styles.hero}>
                <View style={styles.glow} />
                <View style={styles.heroTop}>
                  <View style={styles.heroBadge}>
                    <Ionicons
                      name="wallet-outline"
                      size={15}
                      color={GOLD_LIGHT}
                    />
                    <Text style={styles.heroBadgeText}>FINANCE</Text>
                  </View>
                  <View style={styles.heroIcon}>
                    <Ionicons
                      name="cash-outline"
                      size={28}
                      color={GOLD_LIGHT}
                    />
                  </View>
                </View>
                <Text style={styles.heroTitle}>
                  Consultation{"\n"}Earnings
                </Text>
                <Text style={styles.heroSub}>
                  Review online consultation payments, offline booking fees,
                  therapy fees, successful transactions and refunds.
                </Text>
              </View>

              <Text style={styles.sectionEye}>PAYMENT OVERVIEW</Text>
              <Text style={styles.sectionTitle}>Collection Summary</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.summary}
              >
                <Summary
                  icon="calendar-outline"
                  label="Today's Collection"
                  value={money(summary.today)}
                />
                <Summary
                  icon="calendar-number-outline"
                  label="This Month"
                  value={money(summary.month)}
                />
                <Summary
                  icon="videocam-outline"
                  label="Online Fees"
                  value={money(summary.online)}
                />
                <Summary
                  icon="business-outline"
                  label="Offline / Therapy"
                  value={money(summary.offline)}
                />
                <Summary
                  icon="return-down-back-outline"
                  label="Refunded"
                  value={money(summary.refund)}
                />
              </ScrollView>

              <View style={styles.searchRow}>
                <View style={styles.search}>
                  <Ionicons
                    name="search-outline"
                    size={20}
                    color={MUTED}
                  />
                  <TextInput
                    value={search}
                    onChangeText={(value) => {
                      setSearch(value);
                      setPage(1);
                    }}
                    placeholder="Patient, transaction or gateway ID"
                    placeholderTextColor="#9AA59F"
                    style={styles.searchInput}
                  />
                  {search ? (
                    <Pressable
                      onPress={() => {
                        setSearch("");
                        setPage(1);
                      }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={MUTED}
                      />
                    </Pressable>
                  ) : null}
                </View>

                <Pressable
                  style={styles.filter}
                  onPress={() => setFilters(true)}
                >
                  <Ionicons
                    name="options-outline"
                    size={21}
                    color={GREEN}
                  />
                </Pressable>
              </View>

              <View style={styles.records}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionEye}>TRANSACTIONS</Text>
                  <Text style={styles.sectionTitle}>Transaction History</Text>
                  <Text style={styles.muted}>
                    Date-wise and patient-wise payment details.
                  </Text>
                </View>
                <View style={styles.count}>
                  <Text style={styles.countText}>
                    {filtered.length} Transactions
                  </Text>
                </View>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              {loading ? (
                <ActivityIndicator size="large" color={GREEN} />
              ) : (
                <Ionicons
                  name="receipt-outline"
                  size={32}
                  color={GOLD}
                />
              )}
              <Text style={styles.emptyTitle}>
                {loading
                  ? "Loading transactions..."
                  : "No transactions found"}
              </Text>
              {!loading ? (
                <Pressable style={styles.reset} onPress={reset}>
                  <Text style={styles.resetText}>Reset Filters</Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListFooterComponent={
            filtered.length ? (
              <View style={styles.pagination}>
                <Text style={styles.muted}>
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(
                    currentPage * PAGE_SIZE,
                    filtered.length,
                  )}{" "}
                  of {filtered.length}
                </Text>
                <View style={styles.pages}>
                  <Pressable
                    disabled={currentPage === 1}
                    style={[
                      styles.page,
                      currentPage === 1 && { opacity: 0.3 },
                    ]}
                    onPress={() => setPage(currentPage - 1)}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={17}
                      color={GREEN}
                    />
                  </Pressable>
                  <View style={styles.pageActive}>
                    <Text style={styles.pageActiveText}>
                      {currentPage} / {pages}
                    </Text>
                  </View>
                  <Pressable
                    disabled={currentPage === pages}
                    style={[
                      styles.page,
                      currentPage === pages && { opacity: 0.3 },
                    ]}
                    onPress={() => setPage(currentPage + 1)}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={GREEN}
                    />
                  </Pressable>
                </View>
              </View>
            ) : null
          }
        />

        <DoctorDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          activeRoute="/doctor/transactions"
        />

        <Filters
          visible={filters}
          type={type}
          status={status}
          from={from}
          to={to}
          setType={(value) => {
            setType(value);
            setPage(1);
          }}
          setStatus={(value) => {
            setStatus(value);
            setPage(1);
          }}
          setFrom={(value) => {
            setFrom(value);
            setPage(1);
          }}
          setTo={(value) => {
            setTo(value);
            setPage(1);
          }}
          reset={reset}
          close={() => setFilters(false)}
        />

        <Details
          visible={details}
          item={selected}
          close={() => setDetails(false)}
        />

        <Notice
          visible={notice.visible}
          type={notice.type}
          title={notice.title}
          message={notice.message}
          close={() =>
            setNotice((current) => ({ ...current, visible: false }))
          }
        />
      </View>
    </SafeAreaView>
  );
}

function Info({
  icon,
  label: itemLabel,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.info}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={15} color={GREEN} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{itemLabel}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>
          {value || "—"}
        </Text>
      </View>
    </View>
  );
}

function Summary({
  icon,
  label: itemLabel,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={21} color={GREEN} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{itemLabel}</Text>
    </View>
  );
}

function Filters(props: {
  visible: boolean;
  type: string;
  status: string;
  from: string;
  to: string;
  setType: (value: string) => void;
  setStatus: (value: string) => void;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
  reset: () => void;
  close: () => void;
}) {
  const types = [
    ["", "All Types"],
    ["CONSULTATION", "Online Consultation"],
    ["APPOINTMENT", "Clinic Appointment"],
  ];

  const statuses = [
    ["", "All Statuses"],
    ["SUCCESS", "Success"],
    ["PENDING", "Pending"],
    ["INITIATED", "Initiated"],
    ["FAILED", "Failed"],
    ["REFUNDED", "Refunded"],
    ["REFUND_PENDING", "Refund Pending"],
    ["NOT_REQUIRED_YET", "Payment Not Required Yet"],
  ];

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.close}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.modalHead}>
            <View>
              <Text style={styles.sectionEye}>REFINE RESULTS</Text>
              <Text style={styles.modalTitle}>Transaction Filters</Text>
            </View>
            <Pressable style={styles.close} onPress={props.close}>
              <Ionicons name="close" size={22} color={GREEN} />
            </Pressable>
          </View>

          <ScrollView>
            <Text style={styles.formLabel}>Payment Type</Text>
            <View style={styles.choices}>
              {types.map(([value, title]) => (
                <Pressable
                  key={value || "all"}
                  style={[
                    styles.choice,
                    props.type === value && styles.choiceActive,
                  ]}
                  onPress={() => props.setType(value)}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      props.type === value && { color: WHITE },
                    ]}
                  >
                    {title}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.formLabel, { marginTop: 18 }]}>Payment Status</Text>
            <View style={styles.choices}>
              {statuses.map(([value, title]) => (
                <Pressable
                  key={value || "all"}
                  style={[
                    styles.choice,
                    props.status === value && styles.choiceActive,
                  ]}
                  onPress={() => props.setStatus(value)}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      props.status === value && { color: WHITE },
                    ]}
                  >
                    {title}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>From Date</Text>
                <TextInput
                  value={props.from}
                  onChangeText={props.setFrom}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9AA59F"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>To Date</Text>
                <TextInput
                  value={props.to}
                  onChangeText={props.setTo}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9AA59F"
                  style={styles.input}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.sheetActions}>
            <Pressable style={styles.secondary} onPress={props.reset}>
              <Text style={styles.secondaryText}>Reset</Text>
            </Pressable>
            <Pressable style={styles.primary} onPress={props.close}>
              <Text style={styles.primaryText}>Show Results</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Details({
  visible,
  item,
  close,
}: {
  visible: boolean;
  item: Tx | null;
  close: () => void;
}) {
  if (!item) return null;

  const statusStyle = statusTheme(item.status);

  const details = [
    ["Transaction ID", item.transactionNumber],
    ["Razorpay payment ID", item.gatewayId],
    ["Razorpay order ID", item.paymentOrderId],
    ["Patient", item.patientName],
    ["Phone", item.patientPhone],
    ["Reference", item.referenceNumber],
    ["Payment Type", label(item.type)],
    ["Amount", money(item.amount)],
    ["Status", label(item.status)],
    ["Payment Method", item.paymentMethod],
    ["Date", dateTime(item.date)],
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <View style={styles.detailsSheet}>
          <View style={styles.handle} />
          <View style={styles.modalHead}>
            <View>
              <Text style={styles.sectionEye}>PAYMENT RECORD</Text>
              <Text style={styles.modalTitle}>Transaction Details</Text>
            </View>
            <Pressable style={styles.close} onPress={close}>
              <Ionicons name="close" size={22} color={GREEN} />
            </Pressable>
          </View>

          <ScrollView>
            <View style={styles.detailHero}>
              <Ionicons
                name="receipt-outline"
                size={28}
                color={GOLD_LIGHT}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.heroBadgeText}>AMOUNT</Text>
                <Text style={styles.detailAmount}>
                  {money(item.amount)}
                </Text>
                <Text style={styles.heroSub}>
                  {item.transactionNumber}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: statusStyle.b },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: statusStyle.c },
                  ]}
                >
                  {label(item.status)}
                </Text>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              {details.map(([title, value]) => (
                <View key={title} style={styles.detailBox}>
                  <Text style={styles.infoLabel}>{title}</Text>
                  <Text style={styles.detailValue}>{value || "—"}</Text>
                </View>
              ))}

              <View style={[styles.detailBox, { width: "100%" }]}>
                <Text style={styles.infoLabel}>Notes</Text>
                <Text style={styles.detailValue}>{item.notes}</Text>
              </View>
            </View>
          </ScrollView>

          <Pressable style={styles.primary} onPress={close}>
            <Text style={styles.primaryText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Notice({
  visible,
  type,
  title,
  message,
  close,
}: {
  visible: boolean;
  type: NoticeType;
  title: string;
  message: string;
  close: () => void;
}) {
  const tone =
    type === "error"
      ? {
          c: DANGER,
          b: DANGER_LIGHT,
          i: "alert-circle-outline" as const,
        }
      : type === "success"
        ? {
            c: SUCCESS,
            b: SUCCESS_LIGHT,
            i: "checkmark-circle-outline" as const,
          }
        : {
            c: INFO,
            b: INFO_LIGHT,
            i: "information-circle-outline" as const,
          };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.noticeBack}>
        <View style={styles.notice}>
          <View style={[styles.noticeIcon, { backgroundColor: tone.b }]}>
            <Ionicons name={tone.i} size={31} color={tone.c} />
          </View>
          <Text style={styles.noticeTitle}>{title}</Text>
          <Text style={styles.noticeMessage}>{message}</Text>
          <Pressable
            style={[styles.primary, { width: "100%", marginTop: 18 }]}
            onPress={close}
          >
            <Text style={styles.primaryText}>Okay</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:CREAM},screen:{flex:1,backgroundColor:CREAM},content:{paddingHorizontal:16,paddingBottom:42},
 hero:{marginTop:18,marginBottom:24,padding:22,borderRadius:28,backgroundColor:GREEN,overflow:"hidden"},glow:{position:"absolute",width:190,height:190,borderRadius:95,top:-88,right:-56,backgroundColor:"rgba(255,255,255,.07)"},heroTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:20},heroBadge:{flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:12,paddingVertical:8,borderRadius:999,backgroundColor:"rgba(255,255,255,.10)"},heroBadgeText:{color:GOLD_LIGHT,fontFamily:"DMSans_700Bold",fontSize:10,letterSpacing:1.3},heroIcon:{width:58,height:58,borderRadius:18,alignItems:"center",justifyContent:"center",backgroundColor:"rgba(255,255,255,.10)"},heroTitle:{color:WHITE,fontFamily:"PlayfairDisplay_700Bold",fontSize:31,lineHeight:37,marginBottom:12},heroSub:{color:"rgba(255,255,255,.78)",fontFamily:"DMSans_400Regular",fontSize:12,lineHeight:19},
 sectionEye:{color:GOLD,fontFamily:"DMSans_700Bold",fontSize:9,letterSpacing:1.4,marginBottom:4},sectionTitle:{color:GREEN,fontFamily:"PlayfairDisplay_700Bold",fontSize:25},
 summary:{gap:11,paddingTop:12,paddingBottom:4},summaryCard:{width:142,minHeight:136,padding:14,borderRadius:20,borderWidth:1,borderColor:BORDER,backgroundColor:WHITE},summaryIcon:{width:41,height:41,borderRadius:13,alignItems:"center",justifyContent:"center",backgroundColor:MINT,marginBottom:12},summaryValue:{color:GREEN,fontFamily:"PlayfairDisplay_700Bold",fontSize:20},summaryLabel:{color:MUTED,fontFamily:"DMSans_500Medium",fontSize:10,marginTop:5},
 searchRow:{flexDirection:"row",gap:10,marginTop:22,marginBottom:27},search:{flex:1,minHeight:52,flexDirection:"row",alignItems:"center",gap:9,paddingHorizontal:14,borderRadius:16,borderWidth:1,borderColor:BORDER,backgroundColor:WHITE},searchInput:{flex:1,color:TEXT,fontFamily:"DMSans_400Regular",fontSize:13},filter:{width:52,height:52,alignItems:"center",justifyContent:"center",borderRadius:16,backgroundColor:MINT},
 records:{flexDirection:"row",alignItems:"flex-end",gap:10,marginBottom:13},muted:{color:MUTED,fontFamily:"DMSans_400Regular",fontSize:10,marginTop:3},count:{paddingHorizontal:10,paddingVertical:7,borderRadius:999,backgroundColor:MINT},countText:{color:GREEN,fontFamily:"DMSans_700Bold",fontSize:8.5},
 card:{marginBottom:13,padding:15,borderRadius:22,borderWidth:1,borderColor:BORDER,backgroundColor:WHITE},top:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},patient:{flex:1,flexDirection:"row",alignItems:"center",gap:10},avatar:{width:46,height:46,borderRadius:15,alignItems:"center",justifyContent:"center",backgroundColor:GREEN},avatarText:{color:WHITE,fontFamily:"DMSans_700Bold",fontSize:17},name:{color:GREEN,fontFamily:"DMSans_700Bold",fontSize:14},badge:{paddingHorizontal:9,paddingVertical:6,borderRadius:999,maxWidth:135},badgeText:{fontFamily:"DMSans_700Bold",fontSize:8},line:{height:1,backgroundColor:BORDER,marginVertical:13},amountRow:{flexDirection:"row",alignItems:"flex-start",gap:10,marginBottom:14},eyebrow:{color:MUTED,fontFamily:"DMSans_700Bold",fontSize:7.5,letterSpacing:.7},tx:{color:GREEN,fontFamily:"DMSans_700Bold",fontSize:11,marginTop:3},amount:{color:GREEN,fontFamily:"PlayfairDisplay_700Bold",fontSize:20},grid:{flexDirection:"row",flexWrap:"wrap",rowGap:12},info:{width:"50%",flexDirection:"row",paddingRight:8},infoIcon:{width:31,height:31,marginRight:8,borderRadius:10,alignItems:"center",justifyContent:"center",backgroundColor:MINT},infoLabel:{color:MUTED,fontFamily:"DMSans_700Bold",fontSize:7.5,textTransform:"uppercase",letterSpacing:.6},infoValue:{color:TEXT,fontFamily:"DMSans_600SemiBold",fontSize:9.5,lineHeight:13,marginTop:2},footer:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:14,paddingTop:13,borderTopWidth:1,borderTopColor:BORDER},typeBadge:{flexDirection:"row",alignItems:"center",gap:5,paddingHorizontal:10,paddingVertical:8,borderRadius:999},typeText:{fontFamily:"DMSans_700Bold",fontSize:9},view:{flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:11,paddingVertical:9,borderRadius:11,backgroundColor:MINT},viewText:{color:GREEN,fontFamily:"DMSans_700Bold",fontSize:9},
 empty:{alignItems:"center",padding:35,borderRadius:22,borderWidth:1,borderColor:BORDER,backgroundColor:WHITE},emptyTitle:{color:GREEN,fontFamily:"PlayfairDisplay_700Bold",fontSize:20,marginTop:10},reset:{marginTop:15,padding:11,borderRadius:12,backgroundColor:MINT},resetText:{color:GREEN,fontFamily:"DMSans_700Bold",fontSize:10},
 pagination:{marginTop:5,padding:14,borderRadius:18,borderWidth:1,borderColor:BORDER,backgroundColor:WHITE,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},pages:{flexDirection:"row",alignItems:"center",gap:7},page:{width:36,height:36,alignItems:"center",justifyContent:"center",borderRadius:10,borderWidth:1,borderColor:BORDER},pageActive:{minWidth:54,height:36,alignItems:"center",justifyContent:"center",borderRadius:10,backgroundColor:GREEN},pageActiveText:{color:WHITE,fontFamily:"DMSans_700Bold",fontSize:9},
 backdrop:{flex:1,justifyContent:"flex-end",backgroundColor:"rgba(8,31,23,.64)"},sheet:{maxHeight:"88%",padding:18,paddingTop:8,borderTopLeftRadius:30,borderTopRightRadius:30,backgroundColor:CREAM},detailsSheet:{maxHeight:"92%",padding:18,paddingTop:8,borderTopLeftRadius:30,borderTopRightRadius:30,backgroundColor:CREAM},handle:{width:42,height:4,alignSelf:"center",marginBottom:14,borderRadius:2,backgroundColor:"#D3DAD5"},modalHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:17},modalTitle:{color:GREEN,fontFamily:"PlayfairDisplay_700Bold",fontSize:24},close:{width:42,height:42,alignItems:"center",justifyContent:"center",borderRadius:14,backgroundColor:MINT},formLabel:{color:GREEN,fontFamily:"DMSans_700Bold",fontSize:10,marginBottom:8},choices:{flexDirection:"row",flexWrap:"wrap",gap:7},choice:{paddingHorizontal:11,paddingVertical:9,borderRadius:999,borderWidth:1,borderColor:BORDER,backgroundColor:WHITE},choiceActive:{backgroundColor:GREEN,borderColor:GREEN},choiceText:{color:MUTED,fontFamily:"DMSans_600SemiBold",fontSize:9},dateRow:{flexDirection:"row",gap:10,marginTop:18},input:{minHeight:50,paddingHorizontal:12,borderRadius:14,borderWidth:1,borderColor:BORDER,backgroundColor:WHITE,color:TEXT,fontFamily:"DMSans_500Medium",fontSize:11},sheetActions:{flexDirection:"row",gap:10,paddingTop:16},secondary:{flex:1,minHeight:49,alignItems:"center",justifyContent:"center",borderRadius:15,borderWidth:1,borderColor:BORDER,backgroundColor:WHITE},secondaryText:{color:GREEN,fontFamily:"DMSans_700Bold",fontSize:11},primary:{flex:1.2,minHeight:49,alignItems:"center",justifyContent:"center",borderRadius:15,backgroundColor:GREEN},primaryText:{color:WHITE,fontFamily:"DMSans_700Bold",fontSize:11},
 detailHero:{flexDirection:"row",alignItems:"center",gap:12,padding:15,borderRadius:20,backgroundColor:GREEN,marginBottom:12},detailAmount:{color:WHITE,fontFamily:"PlayfairDisplay_700Bold",fontSize:24},detailsGrid:{flexDirection:"row",flexWrap:"wrap",gap:9},detailBox:{width:"48.6%",minHeight:74,padding:11,borderRadius:14,borderWidth:1,borderColor:BORDER,backgroundColor:WHITE},detailValue:{color:GREEN,fontFamily:"DMSans_600SemiBold",fontSize:10,lineHeight:16,marginTop:6},
 noticeBack:{flex:1,alignItems:"center",justifyContent:"center",padding:24,backgroundColor:"rgba(8,31,23,.68)"},notice:{width:"100%",maxWidth:370,alignItems:"center",padding:24,borderRadius:27,backgroundColor:CREAM},noticeIcon:{width:64,height:64,borderRadius:22,alignItems:"center",justifyContent:"center",marginBottom:15},noticeTitle:{color:GREEN,fontFamily:"PlayfairDisplay_700Bold",fontSize:23,textAlign:"center"},noticeMessage:{color:MUTED,fontFamily:"DMSans_400Regular",fontSize:11.5,lineHeight:18,textAlign:"center",marginTop:8},
});
