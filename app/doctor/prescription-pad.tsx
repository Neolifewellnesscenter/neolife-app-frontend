import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { API_BASE_URL } from "../../services/api";

const GREEN = "#0B3D2E";
const GREEN_2 = "#14533D";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBFAF6";
const TEXT = "#17231D";
const MUTED = "#75837B";
const WHITE = "#FFFFFF";
const BORDER = "#E6EBE7";
const DANGER = "#B95045";
const DANGER_LIGHT = "#FBECE9";

type NoticeType = "success" | "error" | "info";
type Notice = { type: NoticeType; title: string; message: string } | null;

type Product = {
  id: number | string;
  productName?: string;
  name?: string;
  type?: string;
  section?: string;
  manufacturerName?: string;
  dosageForm?: string;
  dosage?: string;
};

type Medicine = {
  localId: string;
  productId: number | null;
  medicineName: string;
  dosage: string;
  frequency: string;
  durationDays: string;
  quantity: string;
  instructions: string;
  dosageForm?: string;
  saved?: boolean;
};

const MENU_ITEMS = [
  { icon: "grid-outline", label: "Dashboard", route: "/doctor/dashboard", section: "MAIN" },
  { icon: "people-outline", label: "Patients", route: "/doctor/patients", section: "MAIN" },
  { icon: "calendar-outline", label: "Appointment Calendar", route: "/doctor/calendar", section: "MAIN" },
  { icon: "calendar-number-outline", label: "Upcoming Schedule", route: "/doctor/schedule", section: "MAIN" },
  { icon: "time-outline", label: "Manage Availability", route: "/doctor/availability", section: "MAIN" },
  { icon: "clipboard-outline", label: "Appointment Details", route: "/doctor/appointments", section: "CLINICAL", requiresOffline: true },
  { icon: "videocam-outline", label: "Consultation Details", route: "/doctor/consultations", section: "CLINICAL", requiresOnline: true },
  { icon: "document-text-outline", label: "Prescription Pad", route: "/doctor/prescription-pad", section: "CLINICAL" },
  { icon: "card-outline", label: "Transactions", route: "/doctor/transactions", section: "FINANCE" },
  { icon: "person-circle-outline", label: "My Profile", route: "/doctor/profile", section: "FINANCE" },
] as const;

const TYPES = ["", "Classical Medicine", "Patented Product", "Folklore Medicine", "Panchakavya"];
const FORMS = ["", "Syrup", "Kashayam", "Choorna", "Tablet", "Capsule", "Oil", "Cream", "Gel", "Powder", "Drops", "Avaleha", "Arishta", "Other"];

function formatValue(v: any) {
  if (!v) return "-";
  return String(v).replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function formatDate(v: any) {
  if (!v) return "-";
  const d = new Date(`${String(v).slice(0,10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function time(v: any) { return v ? String(v).slice(0,5) : "-"; }
function productName(p: Product) { return String(p.productName || p.name || "Product").trim(); }
function keyForMedicine(m: Omit<Medicine,"localId"|"saved"|"dosageForm">) {
  return JSON.stringify({
    productId: m.productId ?? null,
    medicineName: m.medicineName,
    dosage: m.dosage,
    frequency: m.frequency || null,
    durationDays: Number(m.durationDays),
    quantity: Number(m.quantity),
    instructions: m.instructions || null,
  });
}

export default function PrescriptionPadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    appointmentId?: string;
    id?: string;
    walkInPatientId?: string;
    patientId?: string;
    source?: string;
  }>();

  const walkInPatientId = params.walkInPatientId ? String(params.walkInPatientId) : "";
  const isWalkIn = Boolean(walkInPatientId);
  const appointmentId = isWalkIn ? "" : String(params.appointmentId || params.id || "");
  const [doctorName, setDoctorName] = useState("Doctor");
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [hasOnline, setHasOnline] = useState<boolean | null>(null);
  const [hasOffline, setHasOffline] = useState<boolean | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const [patient, setPatient] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [prescriptionId, setPrescriptionId] = useState<number | null>(null);
  const [finalized, setFinalized] = useState(false);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [formFilter, setFormFilter] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<"draft"|"finalize"|null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  async function getToken() {
    return (await AsyncStorage.getItem("doctorToken")) ||
      (await AsyncStorage.getItem("token")) ||
      (await AsyncStorage.getItem("accessToken")) || "";
  }

  async function clearSession() {
    await AsyncStorage.multiRemove([
      "token","doctorToken","refreshToken","doctorRefreshToken","role","doctorId",
      "doctorName","doctor","profileCompleted","isLoggedIn","userId","email"
    ]);
  }

  async function api(endpoint: string, options: any = {}) {
    const token = await getToken();
    if (!token) {
      await clearSession();
      router.replace("/login" as any);
      throw new Error("Doctor login required.");
    }
    const headers: any = { Accept: "application/json", ...(options.headers || {}), Authorization: `Bearer ${token}` };
    if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    const text = await response.text();
    let result: any = {};
    try { result = text ? JSON.parse(text) : {}; }
    catch { result = { success:false, message:text || `Server error (${response.status})` }; }

    if (response.status === 401) {
      await clearSession();
      router.replace("/login" as any);
      throw new Error(result.message || "Session expired. Please login again.");
    }
    if (response.status === 403) throw new Error(result.message || "You do not have permission to access this resource.");
    if (!response.ok || result.success === false) throw new Error(result.message || `Request failed (${response.status}).`);
    return result;
  }

  function show(type: NoticeType, title: string, message: string) {
    setNotice({ type, title, message });
  }

  async function validateDoctor() {
    const token = await getToken();
    const role = String((await AsyncStorage.getItem("role")) || "").replace(/^ROLE_/i,"").toUpperCase();
    if (!token || (role && role !== "DOCTOR")) {
      await clearSession();
      router.replace("/login" as any);
      return false;
    }
    return true;
  }

  async function loadDoctor() {
    const stored = (await AsyncStorage.getItem("doctorName")) || "Doctor";
    setDoctorName(stored);
    try {
      const result = await api("/doctors/my-profile");
      const d = result.data || {};
      const name = d.name || d.doctorName || stored;
      setDoctorName(name);
      const id = Number(d.id ?? d.doctorId ?? 0) || null;
      setDoctorId(id);
      const pairs: [string,string][] = [["doctorName",name],["doctor",JSON.stringify(d)]];
      if (id) pairs.push(["doctorId",String(id)]);
      await AsyncStorage.multiSet(pairs);
      if (id) await loadAvailability(id);
    } catch (e:any) {
      console.log("Doctor profile:", e?.message);
    }
  }

  async function loadAvailability(id:number) {
    try {
      const result = await api(`/doctor-availability/doctor/${id}`);
      const list = Array.isArray(result) ? result :
        Array.isArray(result?.data) ? result.data :
        Array.isArray(result?.data?.content) ? result.data.content :
        Array.isArray(result?.content) ? result.content : [];
      const active = list.filter((x:any)=>x && x.active !== false);
      const online = active.some((x:any)=>String(x.appointmentMode||"").toUpperCase()==="ONLINE");
      const offline = active.some((x:any)=>String(x.appointmentMode||"").toUpperCase()==="OFFLINE");
      if (!online && !offline) {
        setHasOnline(null); setHasOffline(null);
        await AsyncStorage.multiRemove(["doctorHasOnline","doctorHasOffline"]);
      } else {
        setHasOnline(online); setHasOffline(offline);
        await AsyncStorage.multiSet([["doctorHasOnline",String(online)],["doctorHasOffline",String(offline)]]);
      }
    } catch {
      const on = await AsyncStorage.getItem("doctorHasOnline");
      const off = await AsyncStorage.getItem("doctorHasOffline");
      setHasOnline(on === null ? null : on === "true");
      setHasOffline(off === null ? null : off === "true");
    }
  }

  async function loadProducts() {
    const result = await api("/products/getAll", { method:"GET" });
    setProducts(Array.isArray(result.data) ? result.data : []);
  }

  function extractAppointments(result:any) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.data?.content)) return result.data.content;
    if (Array.isArray(result?.data?.appointments)) return result.data.appointments;
    if (Array.isArray(result?.appointments)) return result.appointments;
    return [];
  }

  function applyExisting(existing:any) {
    if (!existing?.id) return;
    setPrescriptionId(Number(existing.id));
    setDiagnosis(existing.diagnosis || "");
    setAdvice(existing.advice || "");
    setNotes(existing.notes || "");
    const items = Array.isArray(existing.items) ? existing.items : [];
    const rows:Medicine[] = items.map((item:any,index:number)=>{
      const productId = item.productId ?? item.product?.id ?? null;
      const p = products.find(x=>String(x.id)===String(productId));
      return {
        localId:`saved-${item.id || index}-${Date.now()}`,
        productId: productId !== null ? Number(productId) : null,
        medicineName:item.medicineName || item.productName || item.product?.name || (p ? productName(p) : ""),
        dosage:item.dosage || "",
        frequency:item.frequency || "",
        durationDays:String(Number(item.durationDays || 1)),
        quantity:String(Number(item.quantity || 1)),
        instructions:item.instructions || "",
        dosageForm:p?.dosageForm || "",
        saved:true,
      };
    });
    setMedicines(rows);
    setSavedKeys(new Set(rows.map(r=>keyForMedicine(r))));
    if (String(existing.status||"").toUpperCase()==="FINALIZED") setFinalized(true);
  }

  async function loadWalkIn() {
    const result = await api("/walk-in-patients/doctor/my-patients");
    const records = Array.isArray(result.data) ? result.data : [];
    const p = records.find((x:any)=>String(x.id ?? x.walkInPatientId)===String(walkInPatientId));
    if (!p) throw new Error("This walk-in patient is not assigned to the logged-in doctor.");
    setPatient({ ...p, _kind:"WALK_IN" });

    const status = String(p.status || "WAITING").toUpperCase();
    if (status === "IN_PROGRESS" || status === "COMPLETED") {
      try {
        const rx = await api(`/prescriptions/walk-in/${encodeURIComponent(walkInPatientId)}`);
        applyExisting(rx.data);
      } catch(e:any) {
        const msg = String(e?.message || "");
        if (!msg.toLowerCase().includes("appointment id or consultation id is required")) console.log("Walk-in prescription:",msg);
      }
    }
  }

  async function loadAppointment() {
    const result = await api("/appointments/doctor/my-appointments");
    const records = extractAppointments(result);
    const a = records.find((x:any)=>String(x.id ?? x.appointmentId)===String(appointmentId));
    if (!a) throw new Error("This appointment was not found in the logged-in doctor's appointments.");
    setPatient({ ...a, _kind:"APPOINTMENT" });
  }

  async function loadAll(refresh=false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      if (!(await validateDoctor())) return;
      if (isWalkIn) {
        if (!walkInPatientId || Number(walkInPatientId)<=0) throw new Error("Valid Walk-in Patient ID is missing.");
      } else if (!appointmentId) throw new Error("Appointment ID is missing.");

      await loadDoctor();
      await loadProducts();
      if (isWalkIn) await loadWalkIn(); else await loadAppointment();
    } catch(e:any) {
      show("error","Unable to load prescription",e?.message || "Something went wrong.");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }

  useEffect(()=>{ loadAll(); }, [appointmentId, walkInPatientId]);

  const manufacturers = useMemo(
    ()=>Array.from(new Set(products.map(p=>String(p.manufacturerName||"").trim()).filter(Boolean))).sort(),
    [products]
  );

  const filteredProducts = useMemo(()=>{
    const q=search.trim().toLowerCase();
    return products.filter(p=>{
      const n=productName(p).toLowerCase();
      return (!q || n.includes(q)) &&
        (!typeFilter || String(p.type||"")===typeFilter) &&
        (!formFilter || String(p.dosageForm||"")===formFilter) &&
        (!manufacturerFilter || String(p.manufacturerName||"")===manufacturerFilter);
    });
  },[products,search,typeFilter,formFilter,manufacturerFilter]);

  function addProduct(p:Product) {
    if (finalized) return;
    if (medicines.some(m=>m.productId!==null && String(m.productId)===String(p.id))) return;
    setMedicines(prev=>[...prev,{
      localId:`product-${p.id}-${Date.now()}`,
      productId:Number(p.id),
      medicineName:productName(p),
      dosage:p.dosage || "",
      frequency:"",
      durationDays:"7",
      quantity:"1",
      instructions:"",
      dosageForm:p.dosageForm || "",
      saved:false,
    }]);
  }

  function addCustom() {
    if (finalized) return;
    setMedicines(prev=>[...prev,{
      localId:`custom-${Date.now()}`, productId:null, medicineName:"", dosage:"",
      frequency:"", durationDays:"7", quantity:"1", instructions:"", saved:false
    }]);
  }

  function updateMedicine(id:string, field:keyof Medicine, value:any) {
    setMedicines(prev=>prev.map(m=>m.localId===id ? {...m,[field]:value}:m));
  }

  function removeMedicine(m:Medicine) {
    if (m.saved) {
      show("info","Medicine already saved","This medicine is already saved in the draft and cannot be removed from this screen.");
      return;
    }
    setMedicines(prev=>prev.filter(x=>x.localId!==m.localId));
  }

  function validateMedicines() {
    if (!medicines.length) { show("error","Medicine required","Add at least one medicine."); return false; }
    for (const m of medicines) {
      if (!m.medicineName.trim() || !m.dosage.trim() || Number(m.durationDays)<1 || Number(m.quantity)<1) {
        show("error","Complete medicine details","Every medicine needs name, dosage, days and quantity.");
        return false;
      }
    }
    return true;
  }

  async function updatePrescriptionDetails(id:number) {
    const r=await api(`/prescriptions/${id}`,{
      method:"PUT",
      body:JSON.stringify({ diagnosis:diagnosis.trim(), advice:advice.trim(), notes:notes.trim() || null })
    });
    return r;
  }

  async function ensureDraft() {
    if (!diagnosis.trim() || !advice.trim()) throw new Error("Enter diagnosis and advice first.");
    if (prescriptionId) {
      await updatePrescriptionDetails(prescriptionId);
      return prescriptionId;
    }
    let body:any;
    if (isWalkIn) {
      const id=Number(walkInPatientId);
      if (!id) throw new Error("Valid Walk-in Patient ID is required.");
      body={walkInPatientId:id,diagnosis:diagnosis.trim(),advice:advice.trim(),notes:notes.trim()||null};
    } else {
      const id=Number(appointmentId);
      if (!id) throw new Error("Valid Appointment ID is required.");
      body={appointmentId:id,diagnosis:diagnosis.trim(),advice:advice.trim(),notes:notes.trim()||null};
    }
    const endpoint=isWalkIn ? "/prescriptions/walk-in/create" : "/prescriptions/create";
    const r=await api(endpoint,{method:"POST",body:JSON.stringify(body)});
    const id=Number(r.data?.id);
    if (!id) throw new Error("Prescription ID was not returned by the server.");
    setPrescriptionId(id);
    return id;
  }

  function payload(m:Medicine) {
    return {
      productId:m.productId,
      medicineName:m.medicineName.trim(),
      dosage:m.dosage.trim(),
      frequency:m.frequency.trim() || null,
      durationDays:Number(m.durationDays),
      quantity:Number(m.quantity),
      instructions:m.instructions.trim() || null,
    };
  }

  async function saveMedicineItems(id:number) {
    let next=new Set(savedKeys);
    for (const m of medicines) {
      const p=payload(m);
      const key=keyForMedicine({...m,...p,durationDays:String(p.durationDays),quantity:String(p.quantity)});
      if (next.has(key)) continue;
      const r=await api(`/prescriptions/${id}/items`,{method:"POST",body:JSON.stringify(p)});
      next.add(key);
      if (Array.isArray(r.data?.items)) {
        next=new Set(r.data.items.map((x:any)=>JSON.stringify({
          productId:x.productId??null, medicineName:x.medicineName||"", dosage:x.dosage||"",
          frequency:x.frequency??null, durationDays:Number(x.durationDays||0),
          quantity:Number(x.quantity||0), instructions:x.instructions??null
        })));
      }
    }
    setSavedKeys(next);
    setMedicines(prev=>prev.map(m=>({...m,saved:true})));
  }

  async function saveDraft() {
    if (finalized) return show("info","Already finalized","This prescription is already finalized.");
    if (!diagnosis.trim()) return show("error","Diagnosis required","Please enter the diagnosis.");
    if (!advice.trim()) return show("error","Advice required","Please enter treatment advice.");
    if (!validateMedicines()) return;
    setBusy("draft");
    try {
      const id=await ensureDraft();
      await saveMedicineItems(id);
      await updatePrescriptionDetails(id);
      show("success","Draft saved",`Prescription draft #${id} was saved successfully.`);
    } catch(e:any) {
      show("error","Unable to save draft",e?.message || "Unable to save prescription draft.");
    } finally { setBusy(null); }
  }

  async function finalize() {
    setConfirmFinalize(false);
    if (!diagnosis.trim()) return show("error","Diagnosis required","Please enter the diagnosis.");
    if (!advice.trim()) return show("error","Advice required","Please enter treatment advice.");
    if (!validateMedicines()) return;
    setBusy("finalize");
    try {
      const id=await ensureDraft();
      await saveMedicineItems(id);
      await updatePrescriptionDetails(id);
      const endpoint=isWalkIn
        ? `/prescriptions/walk-in/${encodeURIComponent(String(id))}/finalize`
        : `/prescriptions/${encodeURIComponent(String(id))}/finalize`;
      const result=await api(endpoint,{method:"PUT"});
      setFinalized(true);
      show("success","Prescription finalized",result.message || "Prescription finalized successfully.");
      setTimeout(()=>{
        if (isWalkIn) router.replace({pathname:"/doctor/patients" as any,params:{view:"walkin",prescriptionCompleted:"true",walkInPatientId}} as any);
        else router.replace({pathname:"/doctor/appointments" as any,params:{prescriptionCompleted:"true",appointmentId}} as any);
      },1000);
    } catch(e:any) {
      show("error","Unable to finalize",e?.message || "Unable to finalize prescription.");
    } finally { setBusy(null); }
  }

  async function logout() {
    setLogoutOpen(false);
    await clearSession();
    router.replace("/login" as any);
  }

  const displayName = isWalkIn ? (patient?.name || patient?.patientName || "Walk-in Patient") : (patient?.patientName || "Patient");
  const phone = patient?.phoneNumber || "-";
  const date = isWalkIn ? patient?.appointmentDate : patient?.appointmentDate;
  const start = patient?.startTime;
  const end = patient?.endTime;
  const status = patient?.status || (isWalkIn ? "WAITING" : "-");
  const symptoms = patient?.symptoms || "";
  const history = patient?.pastMedicalHistory || "";
  const doctor = isWalkIn ? doctorName : (patient?.doctorName || doctorName);
  const specialization = isWalkIn ? "Walk-in Patient" : (patient?.doctorSpecialization || "-");
  const mode = isWalkIn ? "Walk-in" : formatValue(patient?.appointmentMode);
  const payment = isWalkIn ? "Not Required" : formatValue(patient?.paymentStatus);

  const visibleMenu = MENU_ITEMS.filter(x=>{
    if ("requiresOnline" in x && x.requiresOnline && hasOnline===false) return false;
    if ("requiresOffline" in x && x.requiresOffline && hasOffline===false) return false;
    return true;
  });

  if (loading) return (
    <View style={s.loading}>
      <View style={s.loadingIcon}><Ionicons name="document-text-outline" size={30} color={GOLD}/></View>
      <ActivityIndicator size="large" color={GREEN}/>
      <Text style={s.loadingTitle}>Preparing Prescription Pad</Text>
      <Text style={s.loadingText}>Loading patient and medicine information...</Text>
    </View>
  );

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable style={s.headerBtn} onPress={()=>setDrawer(true)}><Ionicons name="menu" size={23} color={GREEN}/></Pressable>
        <View style={{flex:1}}>
          <Text style={s.portal}>DOCTOR PORTAL</Text>
          <Text style={s.headerTitle}>Prescription Pad</Text>
        </View>
        <Pressable style={s.avatar} onPress={()=>router.push("/doctor/profile" as any)}>
          <Text style={s.avatarText}>{doctorName.charAt(0).toUpperCase()}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{flex:1}}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadAll(true)} tintColor={GREEN}/>}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.hero}>
          <View style={{flex:1}}>
            <Text style={s.heroEyebrow}>{isWalkIn ? "WALK-IN PRESCRIPTION" : "DIGITAL PRESCRIPTION"}</Text>
            <Text style={s.heroTitle}>Prescribe with clarity.</Text>
            <Text style={s.heroText}>Review the patient, record clinical notes, select medicines and finalize securely.</Text>
          </View>
          <View style={s.heroIcon}><Ionicons name="document-text" size={29} color={GOLD_LIGHT}/></View>
        </View>

        <View style={s.patientCard}>
          <View style={s.patientTop}>
            <View style={s.patientAvatar}><Text style={s.patientAvatarText}>{displayName.charAt(0).toUpperCase()}</Text></View>
            <View style={{flex:1}}>
              <Text style={s.patientName}>{displayName}</Text>
              <Text style={s.patientPhone}>{phone}</Text>
            </View>
            <View style={s.statusPill}><Text style={s.statusText}>{formatValue(status)}</Text></View>
          </View>
          <View style={s.infoGrid}>
            <Info icon="person-outline" label="Age / Gender" value={`${patient?.age ?? "-"} / ${formatValue(patient?.gender)}`}/>
            <Info icon="calendar-outline" label={isWalkIn ? "Visit Date" : "Appointment"} value={formatDate(date)}/>
            <Info icon="time-outline" label="Time" value={end ? `${time(start)} - ${time(end)}` : time(start)}/>
            <Info icon="medical-outline" label="Mode" value={mode}/>
          </View>
        </View>

        <Section title="Clinical Notes" subtitle="Patient history is read-only. Add your diagnosis and treatment advice."
          right={<View style={s.draftPill}><Text style={s.draftText}>{finalized ? "FINALIZED" : prescriptionId ? `DRAFT #${prescriptionId}` : "NOT CREATED"}</Text></View>}>
          <Field label="Symptoms" value={symptoms || "No symptoms recorded"} editable={false} multiline/>
          <Field label="Past Medical History" value={history || "No history recorded"} editable={false} multiline/>
          <Field label="Diagnosis *" value={diagnosis} onChangeText={setDiagnosis} placeholder="Enter diagnosis" multiline editable={!finalized}/>
          <Field label="Advice *" value={advice} onChangeText={setAdvice} placeholder="Diet, lifestyle, follow-up and treatment advice" multiline editable={!finalized}/>
          <Field label="Additional Notes" value={notes} onChangeText={setNotes} placeholder="Precautions or additional clinical information" multiline editable={!finalized}/>
        </Section>

        <Section title="Medicines" subtitle="Search your product catalogue or add a custom medicine."
          right={!finalized ? <Pressable style={s.smallPrimary} onPress={addCustom}><Ionicons name="add" size={16} color={WHITE}/><Text style={s.smallPrimaryText}>Custom</Text></Pressable> : undefined}>
          <View style={s.searchBox}>
            <Ionicons name="search" size={18} color={MUTED}/>
            <TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="Search medicine name..." placeholderTextColor="#9AA39D" editable={!finalized}/>
            <Pressable onPress={()=>setFiltersOpen(true)} disabled={finalized}>
              <Ionicons name="options-outline" size={21} color={GREEN}/>
            </Pressable>
          </View>
          <View style={s.resultRow}>
            <Text style={s.resultText}>Medicine catalogue</Text>
            <Text style={s.resultCount}>{filteredProducts.length} medicines</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:9,paddingBottom:4}}>
            {filteredProducts.slice(0,30).map(p=>{
              const selected=medicines.some(m=>m.productId!==null && String(m.productId)===String(p.id));
              return (
                <Pressable key={String(p.id)} style={[s.productCard,selected&&s.productSelected]} onPress={()=>selected ? undefined : addProduct(p)} disabled={finalized}>
                  <View style={[s.productIcon,selected&&{backgroundColor:GREEN}]}><Ionicons name={selected?"checkmark":"medical"} size={17} color={selected?WHITE:GREEN}/></View>
                  <Text style={s.productName} numberOfLines={2}>{productName(p)}</Text>
                  <Text style={s.productMeta}>{p.dosageForm || "Medicine"}</Text>
                  <Text style={s.productAction}>{selected ? "Selected" : "+ Add"}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={s.selectedTitle}>Selected Medicines ({medicines.length})</Text>
          {medicines.length===0 ? (
            <View style={s.empty}>
              <Ionicons name="medkit-outline" size={28} color={MUTED}/>
              <Text style={s.emptyTitle}>No medicines selected</Text>
              <Text style={s.emptyText}>Select a medicine above or add a custom medicine.</Text>
            </View>
          ) : medicines.map((m,index)=>(
            <MedicineCard key={m.localId} medicine={m} index={index} finalized={finalized}
              onChange={(field,value)=>updateMedicine(m.localId,field,value)}
              onRemove={()=>removeMedicine(m)}/>
          ))}
        </Section>

        <Section title="Appointment Information" subtitle="Loaded securely from the backend.">
          <DetailRow icon="person-outline" label="Doctor" value={doctor}/>
          <DetailRow icon="ribbon-outline" label="Specialization" value={specialization}/>
          <DetailRow icon="medical-outline" label="Mode" value={mode}/>
          <DetailRow icon="card-outline" label="Payment" value={payment}/>
        </Section>

        <Section title="Prescription Workflow" subtitle="Complete all steps before finalizing.">
          <Step n="1" title="Clinical assessment" text="Enter diagnosis and treatment advice."/>
          <Step n="2" title="Medicines" text="Add medicines and save the prescription as a draft."/>
          <Step n="3" title="Finalize" text="Verify all details and finalize the prescription."/>
        </Section>

        <View style={s.actions}>
          <Pressable style={s.secondary} onPress={()=>isWalkIn ? router.replace("/doctor/patients" as any) : router.replace("/doctor/appointments" as any)}>
            <Ionicons name="arrow-back" size={18} color={GREEN}/><Text style={s.secondaryText}>Back</Text>
          </Pressable>
          <Pressable style={[s.secondary,busy&&s.disabled]} onPress={saveDraft} disabled={Boolean(busy)||finalized}>
            {busy==="draft"?<ActivityIndicator size="small" color={GREEN}/>:<Ionicons name="save-outline" size={18} color={GREEN}/>}
            <Text style={s.secondaryText}>Save Draft</Text>
          </Pressable>
          <Pressable style={[s.primary,(busy||finalized)&&s.disabled]} onPress={()=>setConfirmFinalize(true)} disabled={Boolean(busy)||finalized}>
            {busy==="finalize"?<ActivityIndicator size="small" color={WHITE}/>:<Ionicons name="checkmark-circle-outline" size={19} color={WHITE}/>}
            <Text style={s.primaryText}>{finalized?"Finalized":"Finalize"}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={drawer} transparent animationType="fade" onRequestClose={()=>setDrawer(false)}>
        <View style={s.drawerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={()=>setDrawer(false)}/>
          <View style={s.drawer}>
            <View style={s.drawerBrand}>
              <View style={s.brandLogo}><Text style={s.brandLogoText}>N</Text></View>
              <View><Text style={s.brandName}>NeoLife</Text><Text style={s.brandSub}>DOCTOR PORTAL</Text></View>
              <Pressable style={s.drawerClose} onPress={()=>setDrawer(false)}><Ionicons name="close" size={21} color={WHITE}/></Pressable>
            </View>
            <ScrollView contentContainerStyle={{padding:14}}>
              {["MAIN","CLINICAL","FINANCE"].map(section=>(
                <View key={section}>
                  <Text style={s.menuSection}>{section}</Text>
                  {visibleMenu.filter(x=>x.section===section).map(item=>{
                    const active=item.label==="Prescription Pad";
                    return (
                      <Pressable key={item.label} style={[s.menuItem,active&&s.menuActive]} onPress={()=>{
                        setDrawer(false);
                        if (!active) router.push(item.route as any);
                      }}>
                        <Ionicons name={item.icon as any} size={19} color={active?GOLD:WHITE}/>
                        <Text style={[s.menuText,active&&s.menuActiveText]}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
            <Pressable style={s.logout} onPress={()=>setLogoutOpen(true)}>
              <Ionicons name="log-out-outline" size={20} color={WHITE}/><Text style={s.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={()=>setFiltersOpen(false)}>
        <View style={s.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={()=>setFiltersOpen(false)}/>
          <View style={s.sheet}>
            <View style={s.sheetHandle}/>
            <Text style={s.sheetTitle}>Medicine Filters</Text>
            <Text style={s.sheetSub}>Narrow the catalogue using product details.</Text>
            <Choice label="Type" value={typeFilter} options={TYPES} labels={["All Types","Classical","Patented","Folklore","Panchakavya"]} onChange={setTypeFilter}/>
            <Choice label="Dosage Form" value={formFilter} options={FORMS} labels={FORMS.map(x=>x||"All Forms")} onChange={setFormFilter}/>
            <Text style={s.label}>Manufacturer</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
              {["",...manufacturers].map(x=><Chip key={x||"all"} text={x||"All"} active={manufacturerFilter===x} onPress={()=>setManufacturerFilter(x)}/>)}
            </ScrollView>
            <View style={s.sheetActions}>
              <Pressable style={s.secondary} onPress={()=>{setTypeFilter("");setFormFilter("");setManufacturerFilter("");}}>
                <Text style={s.secondaryText}>Reset</Text>
              </Pressable>
              <Pressable style={s.primary} onPress={()=>setFiltersOpen(false)}><Text style={s.primaryText}>Apply Filters</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal visible={confirmFinalize} title="Finalize prescription?"
        message="After finalizing, this prescription becomes read-only. Verify the diagnosis, advice and all medicine details before continuing."
        confirm="Finalize Prescription" onCancel={()=>setConfirmFinalize(false)} onConfirm={finalize}/>

      <ConfirmModal visible={logoutOpen} title="Logout from Doctor Portal?"
        message="You will need to sign in again to access your doctor dashboard."
        confirm="Logout" danger onCancel={()=>setLogoutOpen(false)} onConfirm={logout}/>

      <NoticeModal notice={notice} onClose={()=>setNotice(null)}/>
    </View>
  );
}

function Info({icon,label,value}:{icon:any,label:string,value:string}) {
  return <View style={s.info}><Ionicons name={icon} size={17} color={GREEN}/><Text style={s.infoLabel}>{label}</Text><Text style={s.infoValue} numberOfLines={2}>{value}</Text></View>;
}
function Section({title,subtitle,right,children}:{title:string,subtitle:string,right?:React.ReactNode,children:React.ReactNode}) {
  return <View style={s.section}>
    <View style={s.sectionHeader}><View style={{flex:1}}><Text style={s.sectionTitle}>{title}</Text><Text style={s.sectionSub}>{subtitle}</Text></View>{right}</View>
    <View style={s.sectionBody}>{children}</View>
  </View>;
}
function Field(props:any) {
  return <View style={{marginBottom:15}}>
    <Text style={s.label}>{props.label}</Text>
    <TextInput {...props} style={[s.input,props.multiline&&s.textarea,props.editable===false&&s.readonly]}
      placeholderTextColor="#9AA39D" textAlignVertical={props.multiline?"top":"center"}/>
  </View>;
}
function MedicineCard({medicine:m,index,finalized,onChange,onRemove}:any) {
  const locked=finalized || m.saved;
  return <View style={s.medCard}>
    <View style={s.medHead}>
      <View style={s.medNumber}><Text style={s.medNumberText}>{index+1}</Text></View>
      <View style={{flex:1}}><Text style={s.medTitle}>{m.medicineName || "Custom Medicine"}</Text><Text style={s.medMeta}>{m.dosageForm || (m.productId?"Catalogue medicine":"Custom entry")}</Text></View>
      {m.saved?<View style={s.savedPill}><Ionicons name="checkmark" size={12} color={GREEN}/><Text style={s.savedText}>Saved</Text></View>:
      !finalized?<Pressable style={s.trash} onPress={onRemove}><Ionicons name="trash-outline" size={18} color={DANGER}/></Pressable>:null}
    </View>
    {!m.productId && <Field label="Medicine Name *" value={m.medicineName} onChangeText={(v:string)=>onChange("medicineName",v)} placeholder="Medicine name" editable={!locked}/>}
    <Field label="Dosage *" value={m.dosage} onChangeText={(v:string)=>onChange("dosage",v)} placeholder="e.g. 10 ml" editable={!finalized}/>
    <Field label="Frequency" value={m.frequency} onChangeText={(v:string)=>onChange("frequency",v)} placeholder="e.g. Twice daily" editable={!finalized}/>
    <View style={{flexDirection:"row",gap:10}}>
      <View style={{flex:1}}><Field label="Days *" value={m.durationDays} onChangeText={(v:string)=>onChange("durationDays",v.replace(/\D/g,""))} keyboardType="number-pad" editable={!finalized}/></View>
      <View style={{flex:1}}><Field label="Quantity *" value={m.quantity} onChangeText={(v:string)=>onChange("quantity",v.replace(/\D/g,""))} keyboardType="number-pad" editable={!finalized}/></View>
    </View>
    <Field label="Instructions" value={m.instructions} onChangeText={(v:string)=>onChange("instructions",v)} placeholder="e.g. After food" editable={!finalized}/>
  </View>;
}
function DetailRow({icon,label,value}:{icon:any,label:string,value:string}) {
  return <View style={s.detailRow}><View style={s.detailIcon}><Ionicons name={icon} size={17} color={GREEN}/></View><View style={{flex:1}}><Text style={s.detailLabel}>{label}</Text><Text style={s.detailValue}>{value}</Text></View></View>;
}
function Step({n,title,text}:{n:string,title:string,text:string}) {
  return <View style={s.step}><View style={s.stepNo}><Text style={s.stepNoText}>{n}</Text></View><View style={{flex:1}}><Text style={s.stepTitle}>{title}</Text><Text style={s.stepText}>{text}</Text></View></View>;
}
function Chip({text,active,onPress}:{text:string,active:boolean,onPress:()=>void}) {
  return <Pressable onPress={onPress} style={[s.chip,active&&s.chipActive]}><Text style={[s.chipText,active&&s.chipActiveText]}>{text}</Text></Pressable>;
}
function Choice({label,value,options,labels,onChange}:any) {
  return <View style={{marginTop:18}}><Text style={s.label}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
    {options.map((x:string,i:number)=><Chip key={x||"all"} text={labels[i]} active={value===x} onPress={()=>onChange(x)}/>)}
  </ScrollView></View>;
}
function ConfirmModal({visible,title,message,confirm,onCancel,onConfirm,danger=false}:any) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={s.modalOverlay}><View style={s.modalCard}>
      <View style={[s.modalIcon,danger&&{backgroundColor:DANGER_LIGHT}]}><Ionicons name={danger?"log-out-outline":"checkmark-done-outline"} size={28} color={danger?DANGER:GREEN}/></View>
      <Text style={s.modalTitle}>{title}</Text><Text style={s.modalMessage}>{message}</Text>
      <View style={s.modalActions}><Pressable style={s.modalCancel} onPress={onCancel}><Text style={s.modalCancelText}>Cancel</Text></Pressable>
      <Pressable style={[s.modalConfirm,danger&&{backgroundColor:DANGER}]} onPress={onConfirm}><Text style={s.modalConfirmText}>{confirm}</Text></Pressable></View>
    </View></View>
  </Modal>;
}
function NoticeModal({notice,onClose}:{notice:Notice,onClose:()=>void}) {
  if (!notice) return null;
  const error=notice.type==="error", success=notice.type==="success";
  const icon=error?"close-circle-outline":success?"checkmark-circle-outline":"information-circle-outline";
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={s.modalOverlay}><View style={s.modalCard}>
    <View style={[s.modalIcon,{backgroundColor:error?DANGER_LIGHT:MINT}]}><Ionicons name={icon as any} size={30} color={error?DANGER:GREEN}/></View>
    <Text style={s.modalTitle}>{notice.title}</Text><Text style={s.modalMessage}>{notice.message}</Text>
    <Pressable style={s.noticeBtn} onPress={onClose}><Text style={s.modalConfirmText}>OK</Text></Pressable>
  </View></View></Modal>;
}

const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:CREAM},
  loading:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:CREAM,padding:30},
  loadingIcon:{width:62,height:62,borderRadius:20,backgroundColor:GREEN,alignItems:"center",justifyContent:"center",marginBottom:18},
  loadingTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:22,color:GREEN,marginTop:16},
  loadingText:{fontFamily:"DMSans_400Regular",fontSize:13,color:MUTED,textAlign:"center",marginTop:6},
  header:{minHeight:86,paddingTop:40,paddingHorizontal:15,paddingBottom:10,flexDirection:"row",alignItems:"center",gap:12,backgroundColor:WHITE,borderBottomWidth:1,borderBottomColor:BORDER},
  headerBtn:{width:42,height:42,borderRadius:13,alignItems:"center",justifyContent:"center",backgroundColor:MINT},
  portal:{fontFamily:"DMSans_700Bold",fontSize:9,letterSpacing:1.5,color:GOLD},
  headerTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:20,color:GREEN},
  avatar:{width:42,height:42,borderRadius:21,backgroundColor:GOLD,alignItems:"center",justifyContent:"center"},
  avatarText:{fontFamily:"DMSans_700Bold",fontSize:16,color:WHITE},
  content:{padding:14,paddingBottom:40},
  hero:{padding:20,borderRadius:22,backgroundColor:GREEN,flexDirection:"row",gap:14,alignItems:"center",marginBottom:14},
  heroEyebrow:{fontFamily:"DMSans_700Bold",fontSize:9,letterSpacing:1.5,color:GOLD_LIGHT,marginBottom:7},
  heroTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:25,color:WHITE,marginBottom:6},
  heroText:{fontFamily:"DMSans_400Regular",fontSize:12,lineHeight:18,color:"#DDE9E2"},
  heroIcon:{width:56,height:56,borderRadius:18,backgroundColor:"rgba(255,255,255,.1)",alignItems:"center",justifyContent:"center"},
  patientCard:{backgroundColor:WHITE,borderWidth:1,borderColor:BORDER,borderRadius:20,padding:16,marginBottom:14},
  patientTop:{flexDirection:"row",alignItems:"center",gap:11,marginBottom:15},
  patientAvatar:{width:48,height:48,borderRadius:24,backgroundColor:GREEN,alignItems:"center",justifyContent:"center"},
  patientAvatarText:{fontFamily:"DMSans_700Bold",fontSize:18,color:WHITE},
  patientName:{fontFamily:"PlayfairDisplay_700Bold",fontSize:19,color:TEXT},
  patientPhone:{fontFamily:"DMSans_400Regular",fontSize:11,color:MUTED,marginTop:2},
  statusPill:{paddingHorizontal:9,paddingVertical:6,borderRadius:20,backgroundColor:"#FFF6E5"},
  statusText:{fontFamily:"DMSans_700Bold",fontSize:9,color:"#916A08"},
  infoGrid:{flexDirection:"row",flexWrap:"wrap",gap:9},
  info:{width:"48%",backgroundColor:MINT,borderRadius:13,padding:11},
  infoLabel:{fontFamily:"DMSans_700Bold",fontSize:8,color:MUTED,textTransform:"uppercase",marginTop:6},
  infoValue:{fontFamily:"DMSans_600SemiBold",fontSize:11,color:TEXT,marginTop:3},
  section:{backgroundColor:WHITE,borderWidth:1,borderColor:BORDER,borderRadius:20,overflow:"hidden",marginBottom:14},
  sectionHeader:{padding:16,flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"#FCFDFB",borderBottomWidth:1,borderBottomColor:BORDER},
  sectionTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:18,color:GREEN},
  sectionSub:{fontFamily:"DMSans_400Regular",fontSize:10,lineHeight:15,color:MUTED,marginTop:3},
  sectionBody:{padding:15},
  draftPill:{paddingHorizontal:9,paddingVertical:6,borderRadius:20,backgroundColor:"#FFF6E5"},
  draftText:{fontFamily:"DMSans_700Bold",fontSize:8,color:"#916A08"},
  label:{fontFamily:"DMSans_700Bold",fontSize:10,color:GREEN,marginBottom:7},
  input:{minHeight:46,borderWidth:1,borderColor:BORDER,borderRadius:12,paddingHorizontal:12,paddingVertical:10,fontFamily:"DMSans_400Regular",fontSize:13,color:TEXT,backgroundColor:WHITE},
  textarea:{minHeight:92},
  readonly:{backgroundColor:"#F6F8F6",color:MUTED},
  smallPrimary:{height:36,paddingHorizontal:11,borderRadius:10,backgroundColor:GREEN,flexDirection:"row",alignItems:"center",gap:4},
  smallPrimaryText:{fontFamily:"DMSans_700Bold",fontSize:10,color:WHITE},
  searchBox:{height:48,borderWidth:1,borderColor:BORDER,borderRadius:13,paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:8},
  searchInput:{flex:1,fontFamily:"DMSans_400Regular",fontSize:12,color:TEXT},
  resultRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginVertical:12},
  resultText:{fontFamily:"DMSans_700Bold",fontSize:11,color:TEXT},
  resultCount:{fontFamily:"DMSans_700Bold",fontSize:9,color:GREEN,backgroundColor:MINT,paddingHorizontal:8,paddingVertical:5,borderRadius:20},
  productCard:{width:145,minHeight:135,borderWidth:1,borderColor:BORDER,borderRadius:15,padding:11,backgroundColor:WHITE},
  productSelected:{borderColor:"#9FC0AA",backgroundColor:"#F1F8F3"},
  productIcon:{width:32,height:32,borderRadius:10,backgroundColor:MINT,alignItems:"center",justifyContent:"center"},
  productName:{fontFamily:"DMSans_700Bold",fontSize:11,color:TEXT,marginTop:8,minHeight:29},
  productMeta:{fontFamily:"DMSans_400Regular",fontSize:9,color:MUTED,marginTop:3},
  productAction:{fontFamily:"DMSans_700Bold",fontSize:10,color:GREEN,marginTop:8},
  selectedTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:17,color:GREEN,marginTop:18,marginBottom:10},
  empty:{padding:22,borderWidth:1,borderStyle:"dashed",borderColor:BORDER,borderRadius:14,alignItems:"center"},
  emptyTitle:{fontFamily:"DMSans_700Bold",fontSize:12,color:TEXT,marginTop:8},
  emptyText:{fontFamily:"DMSans_400Regular",fontSize:10,color:MUTED,textAlign:"center",marginTop:3},
  medCard:{padding:14,borderWidth:1,borderColor:BORDER,borderRadius:16,backgroundColor:"#FCFDFB",marginBottom:11},
  medHead:{flexDirection:"row",alignItems:"center",gap:9,marginBottom:13},
  medNumber:{width:31,height:31,borderRadius:10,backgroundColor:GREEN,alignItems:"center",justifyContent:"center"},
  medNumberText:{fontFamily:"DMSans_700Bold",fontSize:11,color:WHITE},
  medTitle:{fontFamily:"DMSans_700Bold",fontSize:12,color:TEXT},
  medMeta:{fontFamily:"DMSans_400Regular",fontSize:9,color:MUTED,marginTop:2},
  trash:{width:34,height:34,borderRadius:10,backgroundColor:DANGER_LIGHT,alignItems:"center",justifyContent:"center"},
  savedPill:{flexDirection:"row",alignItems:"center",gap:3,paddingHorizontal:7,paddingVertical:5,borderRadius:20,backgroundColor:MINT},
  savedText:{fontFamily:"DMSans_700Bold",fontSize:8,color:GREEN},
  detailRow:{flexDirection:"row",gap:10,alignItems:"center",paddingVertical:10,borderBottomWidth:1,borderBottomColor:"#EEF1EF"},
  detailIcon:{width:34,height:34,borderRadius:11,backgroundColor:MINT,alignItems:"center",justifyContent:"center"},
  detailLabel:{fontFamily:"DMSans_700Bold",fontSize:8,color:MUTED,textTransform:"uppercase"},
  detailValue:{fontFamily:"DMSans_600SemiBold",fontSize:12,color:TEXT,marginTop:2},
  step:{flexDirection:"row",gap:11,marginBottom:13},
  stepNo:{width:32,height:32,borderRadius:16,backgroundColor:GREEN,alignItems:"center",justifyContent:"center"},
  stepNoText:{fontFamily:"DMSans_700Bold",fontSize:11,color:GOLD_LIGHT},
  stepTitle:{fontFamily:"DMSans_700Bold",fontSize:12,color:TEXT},
  stepText:{fontFamily:"DMSans_400Regular",fontSize:10,lineHeight:15,color:MUTED,marginTop:2},
  actions:{gap:9},
  primary:{minHeight:48,borderRadius:13,backgroundColor:GREEN,paddingHorizontal:16,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,flex:1},
  primaryText:{fontFamily:"DMSans_700Bold",fontSize:12,color:WHITE},
  secondary:{minHeight:48,borderRadius:13,backgroundColor:MINT,paddingHorizontal:16,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,flex:1},
  secondaryText:{fontFamily:"DMSans_700Bold",fontSize:12,color:GREEN},
  disabled:{opacity:.55},
  drawerOverlay:{flex:1,backgroundColor:"rgba(4,20,14,.58)"},
  drawer:{width:"84%",maxWidth:330,height:"100%",backgroundColor:GREEN},
  drawerBrand:{minHeight:105,paddingTop:38,paddingHorizontal:17,paddingBottom:15,flexDirection:"row",alignItems:"center",gap:11,borderBottomWidth:1,borderBottomColor:"rgba(255,255,255,.12)"},
  brandLogo:{width:48,height:48,borderRadius:24,borderWidth:2,borderColor:GOLD,backgroundColor:WHITE,alignItems:"center",justifyContent:"center"},
  brandLogoText:{fontFamily:"PlayfairDisplay_700Bold",fontSize:22,color:GREEN},
  brandName:{fontFamily:"PlayfairDisplay_700Bold",fontSize:20,color:WHITE},
  brandSub:{fontFamily:"DMSans_700Bold",fontSize:8,letterSpacing:1.4,color:GOLD_LIGHT,marginTop:2},
  drawerClose:{marginLeft:"auto",width:36,height:36,borderRadius:12,backgroundColor:"rgba(255,255,255,.1)",alignItems:"center",justifyContent:"center"},
  menuSection:{fontFamily:"DMSans_700Bold",fontSize:8,letterSpacing:1.4,color:"rgba(255,255,255,.45)",marginTop:12,marginBottom:7,marginLeft:8},
  menuItem:{minHeight:47,borderRadius:12,paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:12,marginBottom:5},
  menuActive:{backgroundColor:WHITE},
  menuText:{fontFamily:"DMSans_600SemiBold",fontSize:12,color:"rgba(255,255,255,.88)"},
  menuActiveText:{color:GREEN},
  logout:{margin:14,minHeight:48,borderWidth:1,borderColor:"rgba(255,255,255,.18)",borderRadius:13,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},
  logoutText:{fontFamily:"DMSans_700Bold",fontSize:12,color:WHITE},
  sheetOverlay:{flex:1,justifyContent:"flex-end",backgroundColor:"rgba(4,20,14,.48)"},
  sheet:{maxHeight:"85%",backgroundColor:CREAM,borderTopLeftRadius:26,borderTopRightRadius:26,padding:18,paddingBottom:30},
  sheetHandle:{width:45,height:5,borderRadius:5,backgroundColor:"#D3DAD5",alignSelf:"center",marginBottom:15},
  sheetTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:23,color:GREEN},
  sheetSub:{fontFamily:"DMSans_400Regular",fontSize:11,color:MUTED,marginTop:4},
  chip:{paddingHorizontal:12,paddingVertical:9,borderRadius:20,borderWidth:1,borderColor:BORDER,backgroundColor:WHITE},
  chipActive:{backgroundColor:GREEN,borderColor:GREEN},
  chipText:{fontFamily:"DMSans_600SemiBold",fontSize:10,color:TEXT},
  chipActiveText:{color:WHITE},
  sheetActions:{flexDirection:"row",gap:9,marginTop:24},
  modalOverlay:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:"rgba(4,20,14,.58)",padding:22},
  modalCard:{width:"100%",maxWidth:380,backgroundColor:CREAM,borderRadius:24,padding:22,alignItems:"center"},
  modalIcon:{width:58,height:58,borderRadius:20,backgroundColor:MINT,alignItems:"center",justifyContent:"center"},
  modalTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:22,color:GREEN,textAlign:"center",marginTop:14},
  modalMessage:{fontFamily:"DMSans_400Regular",fontSize:12,lineHeight:18,color:MUTED,textAlign:"center",marginTop:7},
  modalActions:{width:"100%",flexDirection:"row",gap:9,marginTop:20},
  modalCancel:{flex:1,minHeight:46,borderRadius:12,backgroundColor:MINT,alignItems:"center",justifyContent:"center"},
  modalCancelText:{fontFamily:"DMSans_700Bold",fontSize:11,color:GREEN},
  modalConfirm:{flex:1,minHeight:46,borderRadius:12,backgroundColor:GREEN,alignItems:"center",justifyContent:"center"},
  modalConfirmText:{fontFamily:"DMSans_700Bold",fontSize:11,color:WHITE},
  noticeBtn:{width:"100%",minHeight:46,borderRadius:12,backgroundColor:GREEN,alignItems:"center",justifyContent:"center",marginTop:20},
});
