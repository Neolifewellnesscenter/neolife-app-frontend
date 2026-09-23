import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  AudioSession,
  isTrackReference,
  LiveKitRoom,
  registerGlobals,
  useLocalParticipant,
  useTracks,
  VideoTrack,
} from "@livekit/react-native";
import { Track } from "livekit-client";
import { SafeAreaView } from "react-native-safe-area-context";


import { API_BASE_URL } from "../services/api";
registerGlobals();

console.log("LiveKit components:", {
  LiveKitRoom: typeof LiveKitRoom,
  VideoTrack: typeof VideoTrack,
  
});

const C = {
  dark: "#123C32",
  green: "#216C55",
  light: "#EAF5EF",
  cream: "#F5F3EB",
  white: "#FFFFFF",
  text: "#1F302A",
  muted: "#68756F",
  border: "#DCE7E1",
  danger: "#C33945",
  gold: "#C99A16",
};

type Role = "DOCTOR" | "PATIENT";

type Consultation = {
  id: number;
  patientName?: string;
  age?: number;
  gender?: string;
  symptoms?: string;
  pastMedicalHistory?: string;
  consultationDate?: string;
  startTime?: string;
  reports?: any[];
  reportFiles?: any[];
  attachments?: any[];
  medicalReports?: any[];
  uploadedReports?: any[];
  reportUrls?: string[];
  attachmentUrls?: string[];
  medicalReportUrls?: string[];
};

type MedicineItem = {
  id?: number;
  itemId?: number;
  productId?: number | null;
  medicineName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  instructions: string;
};

type Prescription = {
  id: number;
  consultationId?: number;
  diagnosis?: string;
  advice?: string;
  notes?: string;
  status?: string;
  items?: MedicineItem[];
};

type Product = {
  id: number;
  name?: string;
  productName?: string;
  stock?: number;
  medicineType?: string;
  type?: string;
  section?: string;
  manufacturer?: string;
  dosageForm?: string;
};


async function token() {
  const role = String(
    (await AsyncStorage.getItem("role")) || ""
  )
    .replace(/^ROLE_/i, "")
    .trim()
    .toUpperCase();

  if (role === "DOCTOR") {
    return (
      (await AsyncStorage.getItem("doctorToken")) ||
      (await AsyncStorage.getItem("token")) ||
      ""
    );
  }

  return (
    (await AsyncStorage.getItem("token")) ||
    (await AsyncStorage.getItem("accessToken")) ||
    (await AsyncStorage.getItem("jwtToken")) ||
    ""
  );
}

async function savedRole(): Promise<Role> {
  const value = String((await AsyncStorage.getItem("role")) || "")
    .replace(/^ROLE_/i, "")
    .trim()
    .toUpperCase();
  return value === "DOCTOR" ? "DOCTOR" : "PATIENT";
}

async function api(path: string, init: RequestInit = {}) {
  const auth = await token();
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${auth}`,
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...((init.headers || {}) as Record<string, string>),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const text = await response.text();
  let result: any = null;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = { success: false, message: text };
  }
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || `Request failed (${response.status})`);
  }
  return result;
}

function arr(result: any) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.content)) return result.data.content;
  return [];
}

function extractReports(c?: Consultation | null) {
  if (!c) return [];
  for (const x of [
    c.reports,
    c.reportFiles,
    c.attachments,
    c.medicalReports,
    c.uploadedReports,
  ]) {
    if (Array.isArray(x)) return x;
  }
  for (const x of [c.reportUrls, c.attachmentUrls, c.medicalReportUrls]) {
    if (Array.isArray(x)) {
      return x.map((url, i) => ({
        id: `embedded-${i}`,
        fileName: String(url).split("/").pop() || `Report ${i + 1}`,
        fileUrl: url,
      }));
    }
  }
  return [];
}

function MeetingStage({
  role,
  onLeave,
  onEnd,
}: {
  role: Role;
  onLeave: () => void;
  onEnd: () => Promise<void>;
}) {
  const tracks = useTracks([Track.Source.Camera]);
  const { localParticipant } = useLocalParticipant();
  const [ending, setEnding] = useState(false);

  const local = tracks.find(
    (r: any) => isTrackReference(r) && r.participant?.isLocal
  );
  const remote = tracks.find(
    (r: any) => isTrackReference(r) && !r.participant?.isLocal
  );

  const micOn = localParticipant?.isMicrophoneEnabled ?? false;
  const camOn = localParticipant?.isCameraEnabled ?? false;

  return (
    <View style={s.videoPanel}>
      <View style={s.videoHeader}>
        <Text style={s.videoTitle}>Live Consultation</Text>
        <Text style={s.videoStatus}>{remote ? "Connected" : "Waiting..."}</Text>
      </View>

      <View style={s.stage}>
        {remote && isTrackReference(remote) ? (
          <VideoTrack trackRef={remote as any} style={s.remoteVideo} />
        ) : (
          <View style={[s.remoteVideo, s.waiting]}>
            <ActivityIndicator color={C.gold} size="large" />
            <Text style={s.waitingTitle}>
              {role === "DOCTOR" ? "Waiting for patient" : "Waiting for doctor"}
            </Text>
          </View>
        )}

        {local && isTrackReference(local) && camOn ? (
          <VideoTrack trackRef={local as any} style={s.localVideo} />
        ) : (
          <View style={[s.localVideo, s.localPlaceholder]}>
            <Ionicons name="person" size={24} color={C.white} />
          </View>
        )}
      </View>

      <View style={s.controls}>
        <Pressable
          style={s.control}
          onPress={() =>
            localParticipant?.setMicrophoneEnabled(!micOn).catch(() => {})
          }
        >
          <Ionicons name={micOn ? "mic" : "mic-off"} size={20} color={C.white} />
          <Text style={s.controlText}>{micOn ? "Mute" : "Unmute"}</Text>
        </Pressable>

        <Pressable
          style={s.control}
          onPress={() =>
            localParticipant?.setCameraEnabled(!camOn).catch(() => {})
          }
        >
          <Ionicons name={camOn ? "videocam" : "videocam-off"} size={20} color={C.white} />
          <Text style={s.controlText}>{camOn ? "Camera Off" : "Camera On"}</Text>
        </Pressable>

        <Pressable style={[s.control, s.danger]} onPress={onLeave}>
          <Ionicons name="exit-outline" size={20} color={C.white} />
          <Text style={s.controlText}>Leave</Text>
        </Pressable>

        {role === "DOCTOR" && (
          <Pressable
            disabled={ending}
            style={[s.control, s.danger]}
            onPress={() => {
              Alert.alert(
                "End Consultation",
                "Finalize the prescription first when medicines have been prescribed. End this consultation?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "End",
                    style: "destructive",
                    onPress: async () => {
                      setEnding(true);
                      try {
                        await onEnd();
                      } finally {
                        setEnding(false);
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="call" size={20} color={C.white} />
            <Text style={s.controlText}>{ending ? "Ending..." : "End"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function ConsultationRoomScreen() {
  const params = useLocalSearchParams<{ consultationId?: string }>();
  const consultationId = String(params.consultationId || "");

  const [role, setRole] = useState<Role>("PATIENT");
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [liveKitToken, setLiveKitToken] = useState("");
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [showMedicines, setShowMedicines] = useState(false);

  const hydratePrescription = useCallback((p: Prescription | null) => {
    setPrescription(p);
    if (!p) return;
    setDiagnosis(p.diagnosis || "");
    setAdvice(p.advice || "");
    setNotes(p.notes || "");
    setMedicines(
      (p.items || []).map((x: any) => ({
        id: x.id,
        itemId: x.id,
        productId: x.productId ?? null,
        medicineName: x.medicineName || "",
        dosage: x.dosage || "",
        frequency: x.frequency || "",
        durationDays: Number(x.durationDays || 1),
        quantity: Number(x.quantity || 1),
        instructions: x.instructions || "",
      }))
    );
  }, []);

  const fetchPrescription = useCallback(
    async (r: Role) => {
      try {
        if (r === "DOCTOR") {
          const result = await api(
            `/prescriptions/consultation/${encodeURIComponent(consultationId)}`
          );
          const p = result?.data || null;
          hydratePrescription(p);
          return p;
        }

        const result = await api("/prescriptions/my-prescriptions");
        const p =
          arr(result).find(
            (x: any) => String(x.consultationId) === String(consultationId)
          ) || null;
        hydratePrescription(p);
        return p;
      } catch {
        if (r === "PATIENT") hydratePrescription(null);
        return null;
      }
    },
    [consultationId, hydratePrescription]
  );

  const loadConsultation = useCallback(
    async (r: Role) => {
      let found: any = null;
      try {
        const direct = await api(
          `/consultations/${encodeURIComponent(consultationId)}/get`
        );
        found = direct?.data;
      } catch {}

      if (!found) {
        const paths =
          r === "DOCTOR"
            ? [
                "/consultations/doctor/my-consultations",
                "/consultations/doctor/upcoming",
                "/consultations/doctor/requests",
              ]
            : ["/consultations/my-consultations"];

        for (const path of paths) {
          try {
            const result = await api(path);
            found =
              arr(result).find(
                (x: any) => String(x.id) === String(consultationId)
              ) || null;
            if (found) break;
          } catch {}
        }
      }

      if (found) {
        setConsultation(found);
        setReports(extractReports(found));
      }
    },
    [consultationId]
  );

 const openPatientReport = useCallback(async (report: any) => {
  try {
    const rawUrl =
      typeof report === "string"
        ? report
        : report.fileUrl ||
          report.reportUrl ||
          report.downloadUrl ||
          report.url ||
          report.filePath;

    if (!rawUrl) {
      console.log("REPORT DATA:", JSON.stringify(report));

      Alert.alert(
        "Report URL Missing",
        "The consultation API did not provide a report URL. Check REPORT DATA in your Metro terminal."
      );
      return;
    }

    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, "");

    const reportUrl = /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : `${baseUrl}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

    const auth = await token();

    const extension =
      reportUrl.split("?")[0].split(".").pop()?.toLowerCase();

    const fileExtension =
      extension === "pdf" ||
      extension === "png" ||
      extension === "jpg" ||
      extension === "jpeg"
        ? extension
        : "pdf";

    const localUri =
      `${FileSystem.cacheDirectory}NeoLife-Report-${Date.now()}.${fileExtension}`;

    const result = await FileSystem.downloadAsync(
      reportUrl,
      localUri,
      {
        headers: {
          Authorization: `Bearer ${auth}`,
        },
      }
    );

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Unable to download report (${result.status}).`);
    }

    if (Platform.OS === "android") {
      const contentUri =
        await FileSystem.getContentUriAsync(result.uri);

      await Linking.openURL(contentUri);
    } else {
      await Sharing.shareAsync(result.uri);
    }
  } catch (error: any) {
    console.error("OPEN REPORT ERROR:", error);

    Alert.alert(
      "Unable to Open Report",
      error?.message || "Please try again."
    );
  }
}, []);

const loadProducts = useCallback(async () => {
  try {
    const result = await api("/products/getAll");

    console.log("PRODUCT RESPONSE:", JSON.stringify(result));

    const data = result?.data ?? result;

    const list: Product[] =
      Array.isArray(data)
        ? data
        : Array.isArray(data?.content)
          ? data.content
          : Array.isArray(data?.products)
            ? data.products
            : Array.isArray(data?.items)
              ? data.items
              : [];

    console.log("TOTAL MEDICINES:", list.length);

    setProducts(list);

    if (list.length === 0) {
      Alert.alert(
        "No Medicines Found",
        "The product API returned no medicines. Check the Metro terminal for PRODUCT RESPONSE."
      );
    }
  } catch (error: any) {
    console.error("MEDICINE API ERROR:", error);
    setProducts([]);

    Alert.alert(
      "Unable to Load Medicines",
      error?.message || "Please try again."
    );
  }
}, []);

  const start = useCallback(async () => {
    if (!consultationId) {
      setFatal("Consultation ID is missing.");
      setLoading(false);
      return;
    }

    const auth = await token();
    if (!auth) {
      router.replace("/login" as any);
      return;
    }

    try {
      setLoading(true);
      const stored = await savedRole();
      setRole(stored);

      await AudioSession.startAudioSession();

      const joined = await api(
        `/video-meetings/${encodeURIComponent(consultationId)}/join`,
        { method: "POST" }
      );

      const meeting = joined?.data || {};
      const actualRole = String(meeting.participantRole || stored)
        .replace(/^ROLE_/i, "")
        .toUpperCase() === "DOCTOR"
        ? "DOCTOR"
        : "PATIENT";

      setRole(actualRole);

      const url = meeting.serverUrl;
      const lkToken = meeting.accessToken || meeting.token;
      if (!url || !lkToken) {
        throw new Error("LiveKit server URL or access token is missing.");
      }

      setServerUrl(url);
      setLiveKitToken(lkToken);

      await Promise.all([
        loadConsultation(actualRole),
        fetchPrescription(actualRole),
        actualRole === "DOCTOR" ? loadProducts() : Promise.resolve(),
      ]);
    } catch (e: any) {
      setFatal(e?.message || "Unable to join consultation.");
    } finally {
      setLoading(false);
    }
  }, [
    consultationId,
    fetchPrescription,
    loadConsultation,
    loadProducts,
  ]);

  useEffect(() => {
    start();
    return () => {
      AudioSession.stopAudioSession().catch(() => {});
    };
  }, [start]);

  useEffect(() => {
    if (role !== "PATIENT" || !consultationId) return;
    const id = setInterval(() => fetchPrescription("PATIENT"), 5000);
    return () => clearInterval(id);
  }, [role, consultationId, fetchPrescription]);

  const leave = useCallback(() => {
    AudioSession.stopAudioSession().catch(() => {});
    router.replace(
      role === "DOCTOR"
        ? ("/doctor/dashboard" as any)
        : ("/my-appointments" as any)
    );
  }, [role]);

  const endConsultation = useCallback(async () => {
    await api(`/video-meetings/${encodeURIComponent(consultationId)}/end`, {
      method: "PUT",
    });
    try {
      await api(`/consultations/${encodeURIComponent(consultationId)}/complete`, {
        method: "PUT",
      });
    } catch {}
    Alert.alert("Success", "Consultation ended successfully.", [
      { text: "OK", onPress: leave },
    ]);
  }, [consultationId, leave]);

  const createPrescription = useCallback(async () => {
    if (!diagnosis.trim()) throw new Error("Please enter diagnosis.");
    const result = await api("/prescriptions/create", {
      method: "POST",
      body: JSON.stringify({
        consultationId: Number(consultationId),
        diagnosis: diagnosis.trim(),
        advice: advice.trim() || null,
      }),
    });
    const p = result?.data;
    hydratePrescription(p);
    return p as Prescription;
  }, [consultationId, diagnosis, advice, hydratePrescription]);

  const saveDraft = useCallback(async () => {
    if (role !== "DOCTOR") return;
    if (!diagnosis.trim()) {
      Alert.alert("Required", "Please enter diagnosis.");
      return;
    }

    setBusy(true);
    try {
      let p = prescription;
      if (!p?.id) p = await createPrescription();

      const updated = await api(`/prescriptions/${p.id}`, {
        method: "PUT",
        body: JSON.stringify({
          diagnosis: diagnosis.trim(),
          advice: advice.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      p = updated?.data || p;
      hydratePrescription(p);

      for (const m of medicines) {
        if (!m.medicineName.trim() || !m.dosage.trim() || m.itemId) continue;
        const added = await api(`/prescriptions/${p!.id}/items`, {
          method: "POST",
          body: JSON.stringify({
            productId: m.productId,
            medicineName: m.medicineName.trim(),
            dosage: m.dosage.trim(),
            frequency: m.frequency.trim(),
            durationDays: Number(m.durationDays || 1),
            quantity: Number(m.quantity || 1),
            instructions: m.instructions.trim(),
          }),
        });
        p = added?.data || p;
        hydratePrescription(p);
      }

      await fetchPrescription("DOCTOR");
      Alert.alert("Saved", "Prescription draft saved successfully.");
    } catch (e: any) {
      Alert.alert("Unable to save", e?.message || "Prescription save failed.");
    } finally {
      setBusy(false);
    }
  }, [
    role,
    diagnosis,
    advice,
    notes,
    prescription,
    medicines,
    createPrescription,
    hydratePrescription,
    fetchPrescription,
  ]);

  const finalize = useCallback(async () => {
    if (!prescription?.id) {
      Alert.alert("Save first", "Save the prescription draft first.");
      return;
    }
    if (!(prescription.items || []).length) {
      Alert.alert("Medicine required", "Add at least one medicine before finalizing.");
      return;
    }

    Alert.alert(
      "Finalize Prescription",
      "Finalize this prescription? It cannot be edited afterward.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finalize",
          onPress: async () => {
            setBusy(true);
            try {
              const result = await api(
                `/prescriptions/${prescription.id}/finalize`,
                { method: "PUT" }
              );
              hydratePrescription(result?.data);
              Alert.alert("Success", "Prescription finalized successfully.");
            } catch (e: any) {
              Alert.alert("Unable to finalize", e?.message || "Please try again.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }, [prescription, hydratePrescription]);

  const removeMedicine = useCallback(
    async (index: number) => {
      const m = medicines[index];
      if (m.itemId && prescription?.id) {
        try {
          await api(
            `/prescriptions/${prescription.id}/items/${m.itemId}`,
            { method: "DELETE" }
          );
          await fetchPrescription("DOCTOR");
          return;
        } catch (e: any) {
          Alert.alert("Unable to remove", e?.message || "Please try again.");
          return;
        }
      }
      setMedicines((old) => old.filter((_, i) => i !== index));
    },
    [medicines, prescription, fetchPrescription]
  );

  
const downloadPrescription = useCallback(async () => { 
  if (!prescription?.id) {
    Alert.alert("Unavailable", "Prescription is not available.");
    return;
  }

  try {
    const auth = await token();

    const fileName =
      `NeoLife-Prescription-${prescription.id}.pdf`;

    const temporaryUri =
      `${FileSystem.cacheDirectory}${fileName}`;

    const result = await FileSystem.downloadAsync(
      `${API_BASE_URL}/prescriptions/${prescription.id}/download`,
      temporaryUri,
      {
        headers: {
          Authorization: `Bearer ${auth}`,
          Accept: "application/pdf",
        },
      }
    );

    if (result.status < 200 || result.status >= 300) {
      throw new Error(
        `Download failed (${result.status}).`
      );
    }

    const permissions =
      await FileSystem.StorageAccessFramework
        .requestDirectoryPermissionsAsync();

    if (!permissions.granted) {
      Alert.alert(
        "Download Cancelled",
        "Please select a folder to save the prescription."
      );
      return;
    }

    const destination =
      await FileSystem.StorageAccessFramework
        .createFileAsync(
          permissions.directoryUri,
          fileName,
          "application/pdf"
        );

    const pdfBase64 =
      await FileSystem.readAsStringAsync(result.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

    await FileSystem.writeAsStringAsync(
      destination,
      pdfBase64,
      {
        encoding: FileSystem.EncodingType.Base64,
      }
    );

    Alert.alert(
      "Download Complete",
      "Your prescription PDF has been saved successfully."
    );
  } catch (error: any) {
    Alert.alert(
      "Download Failed",
      error?.message ||
        "Unable to save your prescription."
    );
  }
}, [prescription]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products
      .filter((p) =>
        [p.productName, p.name, p.manufacturer, p.section, p.dosageForm, p.medicineType]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 50);
  }, [products, search]);

  const addProduct = (p: Product) => {
    const name = p.productName || p.name || "Medicine";
    setMedicines((old) => [
      ...old,
      {
        productId: p.id,
        medicineName: name,
        dosage: "",
        frequency: "",
        durationDays: 1,
        quantity: 1,
        instructions: "",
      },
    ]);
    setShowMedicines(false);
  };

  const addCustom = () => {
    setMedicines((old) => [
      ...old,
      {
        productId: null,
        medicineName: "",
        dosage: "",
        frequency: "",
        durationDays: 1,
        quantity: 1,
        instructions: "",
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={C.dark} />
        <Text style={s.loadingText}>Preparing consultation room...</Text>
      </SafeAreaView>
    );
  }

  if (fatal) {
    return (
      <SafeAreaView style={s.center}>
        <Ionicons name="alert-circle" size={54} color={C.danger} />
        <Text style={s.errorTitle}>Unable to connect</Text>
        <Text style={s.errorText}>{fatal}</Text>
        <Pressable style={s.primary} onPress={start}>
          <Text style={s.primaryText}>Try Again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>NeoLife Consultation</Text>
          <Text style={s.subBrand}>
            {role === "DOCTOR" ? "Doctor View" : "Patient View"}
          </Text>
        </View>
        <View style={s.rolePill}>
          <Ionicons
            name={role === "DOCTOR" ? "medical" : "person"}
            size={15}
            color={C.dark}
          />
          <Text style={s.roleText}>{role}</Text>
        </View>
      </View>

      <LiveKitRoom
        serverUrl={serverUrl}
        token={liveKitToken}
        connect={true}
        audio={true}
        video={true}
        options={{ adaptiveStream: true, dynacast: true }}
        onDisconnected={leave}
      >
        
        <ScrollView contentContainerStyle={s.content}>
          <MeetingStage role={role} onLeave={leave} onEnd={endConsultation} />

          {role === "DOCTOR" && consultation && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Patient Details</Text>
              <Detail label="Patient" value={consultation.patientName || "Patient"} />
              <Detail
                label="Age / Gender"
                value={`${consultation.age || "—"} / ${consultation.gender || "—"}`}
              />
              <Detail label="Symptoms" value={consultation.symptoms || "No symptoms recorded."} />
              <Detail
                label="Past Medical History"
                value={consultation.pastMedicalHistory || "No history recorded."}
              />
            </View>
          )}

          <View style={s.card}>
            <View style={s.rowBetween}>
              <Text style={s.cardTitle}>Prescription Pad</Text>
              <Text style={s.state}>{prescription?.status || "WAITING"}</Text>
            </View>

            {role === "DOCTOR" ? (
              <>
                <Label text="Diagnosis *" />
                <TextInput
                  value={diagnosis}
                  onChangeText={setDiagnosis}
                  editable={prescription?.status !== "FINALIZED"}
                  placeholder="Enter diagnosis"
                  multiline
                  style={s.input}
                />
                <Label text="Advice" />
                <TextInput
                  value={advice}
                  onChangeText={setAdvice}
                  editable={prescription?.status !== "FINALIZED"}
                  placeholder="Enter treatment advice"
                  multiline
                  style={s.input}
                />
                <Label text="Additional Notes" />
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  editable={prescription?.status !== "FINALIZED"}
                  placeholder="Enter additional clinical notes"
                  multiline
                  style={s.input}
                />

                {prescription?.status !== "FINALIZED" && (
                  <>
                    <View style={s.rowButtons}>
                      <Pressable
  style={s.secondary}
  onPress={() => {
    setSearch("");
    setShowMedicines(true);
    loadProducts();
  }}
>
                        <Ionicons name="search" size={17} color={C.dark} />
                        <Text style={s.secondaryText}>Find Medicine</Text>
                      </Pressable>
                      <Pressable style={s.secondary} onPress={addCustom}>
                        <Ionicons name="add" size={18} color={C.dark} />
                        <Text style={s.secondaryText}>Custom</Text>
                      </Pressable>
                    </View>

                    {medicines.map((m, i) => (
                      <MedicineEditor
                        key={`${m.itemId || "new"}-${i}`}
                        value={m}
                        onChange={(next) =>
                          setMedicines((old) =>
                            old.map((x, idx) => (idx === i ? next : x))
                          )
                        }
                        onRemove={() => removeMedicine(i)}
                        locked={!!m.itemId}
                      />
                    ))}

                    <View style={s.rowButtons}>
                      <Pressable disabled={busy} style={s.secondary} onPress={saveDraft}>
                        <Text style={s.secondaryText}>{busy ? "Saving..." : "Save Draft"}</Text>
                      </Pressable>
                      <Pressable disabled={busy} style={s.primarySmall} onPress={finalize}>
                        <Text style={s.primaryText}>Finalize</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </>
            ) : prescription ? (
              <>
                <Detail label="Diagnosis" value={prescription.diagnosis || "—"} />
                <Detail label="Advice" value={prescription.advice || "—"} />
                {(prescription.items || []).map((m, i) => (
                  <View key={m.id || i} style={s.patientMedicine}>
                    <Text style={s.medName}>{m.medicineName}</Text>
                    <Text style={s.medMeta}>
                      {m.dosage} • {m.frequency || "—"} • {m.durationDays || 0} days • Qty {m.quantity || 1}
                    </Text>
                    {!!m.instructions && <Text style={s.medMeta}>{m.instructions}</Text>}
                  </View>
                ))}
                {prescription.status === "FINALIZED" && (
                  <Pressable style={s.primary} onPress={downloadPrescription}>
                    <Ionicons name="download" size={18} color={C.white} />
                    <Text style={s.primaryText}>Download Prescription</Text>
                  </Pressable>
                )}
              </>
            ) : (
              <Text style={s.empty}>The doctor has not created a prescription yet.</Text>
            )}
          </View>

          {role === "DOCTOR" && (
  <View style={s.card}>
    <Text style={s.cardTitle}>Patient Reports</Text>

    {reports.length ? (
      reports.map((r: any, i) => (
        <Pressable
          key={r.id || i}
          style={s.reportRow}
          onPress={() => openPatientReport(r)}
        >
          <Ionicons
            name="document-text"
            size={22}
            color={C.dark}
          />

          <Text style={s.reportName}>
            {r.fileName ||
              r.name ||
              `Report ${i + 1}`}
          </Text>

          <Ionicons
            name="eye-outline"
            size={22}
            color={C.green}
          />
        </Pressable>
      ))
    ) : (
      <Text style={s.empty}>
        No uploaded reports available.
      </Text>
    )}
  </View>
)}
        </ScrollView>
      </LiveKitRoom>

      <Modal visible={showMedicines} animationType="slide" onRequestClose={() => setShowMedicines(false)}>
        <SafeAreaView style={s.modalRoot}>
          <View style={s.modalHeader}>
            <Text style={{ color: C.muted, marginTop: 4 }}>
  {products.length} medicines available
</Text>
            <Pressable onPress={() => setShowMedicines(false)}>
              <Ionicons name="close" size={28} color={C.dark} />
            </Pressable>
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search medicine..."
            style={s.search}
          />
          <FlatList
            data={filteredProducts}
            keyExtractor={(x) => String(x.id)}
            renderItem={({ item }) => (
              <Pressable style={s.product} onPress={() => addProduct(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.medName}>{item.productName || item.name}</Text>
                  <Text style={s.medMeta}>
                    {[item.manufacturer, item.dosageForm, item.section].filter(Boolean).join(" • ")}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={25} color={C.green} />
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={s.label}>{text}</Text>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detail}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

function MedicineEditor({
  value,
  onChange,
  onRemove,
  locked,
}: {
  value: MedicineItem;
  onChange: (v: MedicineItem) => void;
  onRemove: () => void;
  locked: boolean;
}) {
  return (
    <View style={s.medEditor}>
      <TextInput
        style={s.smallInput}
        value={value.medicineName}
        editable={!locked}
        onChangeText={(v) => onChange({ ...value, medicineName: v })}
        placeholder="Medicine"
      />
      <TextInput
        style={s.smallInput}
        value={value.dosage}
        editable={!locked}
        onChangeText={(v) => onChange({ ...value, dosage: v })}
        placeholder="Dosage e.g. 1 tab"
      />
      <TextInput
        style={s.smallInput}
        value={value.frequency}
        editable={!locked}
        onChangeText={(v) => onChange({ ...value, frequency: v })}
        placeholder="Frequency e.g. 1-0-1"
      />
      <TextInput
        style={s.smallInput}
        value={String(value.durationDays || "")}
        editable={!locked}
        keyboardType="number-pad"
        onChangeText={(v) => onChange({ ...value, durationDays: Number(v || 0) })}
        placeholder="Duration days"
      />
      <TextInput
        style={s.smallInput}
        value={String(value.quantity || "")}
        editable={!locked}
        keyboardType="number-pad"
        onChangeText={(v) => onChange({ ...value, quantity: Number(v || 0) })}
        placeholder="Quantity"
      />
      <TextInput
        style={s.smallInput}
        value={value.instructions}
        editable={!locked}
        onChangeText={(v) => onChange({ ...value, instructions: v })}
        placeholder="Instructions e.g. After food"
      />
      <Pressable style={s.remove} onPress={onRemove}>
        <Ionicons name="trash" size={18} color={C.danger} />
        <Text style={s.removeText}>Remove</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.cream },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: C.cream },
  loadingText: { marginTop: 12, color: C.muted },
  errorTitle: { marginTop: 12, fontSize: 22, fontWeight: "800", color: C.dark },
  errorText: { marginTop: 8, textAlign: "center", color: C.muted },
  header: { minHeight: 68, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 19, fontWeight: "800", color: C.dark },
  subBrand: { marginTop: 2, fontSize: 11, color: C.gold, fontWeight: "700" },
  rolePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 18, backgroundColor: "#FFF3CF" },
  roleText: { fontSize: 11, fontWeight: "800", color: C.dark },
  content: { padding: 12, paddingBottom: 50, gap: 12 },
  videoPanel: { borderRadius: 20, overflow: "hidden", backgroundColor: "#10251F" },
  videoHeader: { minHeight: 50, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,.1)" },
  videoTitle: { color: C.white, fontSize: 16, fontWeight: "800" },
  videoStatus: { color: "#F3D773", fontSize: 11, fontWeight: "700" },
  stage: { height: 360, position: "relative", backgroundColor: "#20352E" },
  remoteVideo: { ...StyleSheet.absoluteFillObject },
  waiting: { alignItems: "center", justifyContent: "center" },
  waitingTitle: { marginTop: 10, color: C.white, fontWeight: "700" },
  localVideo: { position: "absolute", width: 110, height: 145, top: 12, right: 12, borderRadius: 13, overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,.8)", zIndex: 10 },
  localPlaceholder: { backgroundColor: "#304A40", alignItems: "center", justifyContent: "center" },
  controls: { padding: 10, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  control: { minHeight: 42, paddingHorizontal: 12, borderRadius: 11, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,.13)" },
  danger: { backgroundColor: C.danger },
  controlText: { color: C.white, fontWeight: "800", fontSize: 11 },
  card: { padding: 16, borderRadius: 19, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 18, fontWeight: "800", color: C.dark },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  state: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14, backgroundColor: C.light, color: C.dark, fontSize: 10, fontWeight: "800" },
  detail: { marginTop: 10, padding: 11, borderRadius: 11, backgroundColor: "#F7FAF8", borderWidth: 1, borderColor: C.border },
  detailLabel: { marginBottom: 4, color: C.muted, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  detailValue: { color: C.text, fontSize: 13, lineHeight: 19 },
  label: { marginTop: 13, marginBottom: 6, color: C.dark, fontSize: 11, fontWeight: "800" },
  input: { minHeight: 70, padding: 11, borderWidth: 1, borderColor: C.border, borderRadius: 11, backgroundColor: C.white, textAlignVertical: "top", color: C.text },
  rowButtons: { marginTop: 14, flexDirection: "row", gap: 9 },
  primary: { marginTop: 16, minHeight: 46, paddingHorizontal: 16, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: C.dark },
  primarySmall: { flex: 1, minHeight: 44, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: C.dark },
  primaryText: { color: C.white, fontWeight: "800" },
  secondary: { flex: 1, minHeight: 44, paddingHorizontal: 10, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.light },
  secondaryText: { color: C.dark, fontWeight: "800", fontSize: 11 },
  medEditor: { marginTop: 12, padding: 11, borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: "#FAFCFB", gap: 7 },
  smallInput: { minHeight: 42, paddingHorizontal: 10, borderWidth: 1, borderColor: C.border, borderRadius: 9, backgroundColor: C.white, color: C.text },
  remove: { minHeight: 39, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: "#FDE9E9" },
  removeText: { color: C.danger, fontWeight: "800", fontSize: 11 },
  patientMedicine: { marginTop: 10, padding: 11, borderWidth: 1, borderColor: C.border, borderRadius: 11, backgroundColor: "#FAFCFB" },
  medName: { color: C.dark, fontWeight: "800", fontSize: 13 },
  medMeta: { marginTop: 4, color: C.muted, fontSize: 10, lineHeight: 15 },
  empty: { marginTop: 12, padding: 20, textAlign: "center", color: C.muted, borderWidth: 1, borderStyle: "dashed", borderColor: C.border, borderRadius: 12 },
  reportRow: { marginTop: 10, padding: 11, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: C.border, borderRadius: 11, backgroundColor: "#FAFCFB" },
  reportName: { flex: 1, color: C.dark, fontWeight: "700", fontSize: 12 },
  modalRoot: { flex: 1, backgroundColor: C.cream },
  modalHeader: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  search: { margin: 12, minHeight: 46, paddingHorizontal: 13, borderRadius: 11, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  product: { marginHorizontal: 12, marginBottom: 8, padding: 13, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 11, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
});
