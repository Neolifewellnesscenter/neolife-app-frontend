import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { API_BASE_URL } from "../../services/api";

const GREEN = "#0B3D2E";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#75837B";
const BORDER = "#E6EBE7";
const DANGER = "#B95045";
const DANGER_LIGHT = "#FBECE9";
const SUCCESS = "#287146";
const SUCCESS_LIGHT = "#EBF7EF";
const WARNING_LIGHT = "#FFF6E8";
const INFO = "#31708F";
const INFO_LIGHT = "#EDF6FB";

type Notice = { type: "success" | "error" | "info"; title: string; message: string } | null;
type Consultation = {
  id: number | string | null;
  patientId: number | string | null;
  doctorId: number | string | null;
  patientName: string;
  phoneNumber: string;
  age: number | string;
  gender: string;
  date: string;
  startTime: string;
  endTime: string;
  symptoms: string;
  history: string;
  status: string;
  paymentStatus: string;
  consultationFee: number;
  meetingLink: string | null;
  meetingLinkExpiresAt: string | null;
  meetingCreated: boolean;
  meetingStatus: string;
  roomId: string | null;
  cancellationReason: string;
  rescheduleReason: string;
};
type Therapist = {
  id: number | string;
  name?: string;
  therapistName?: string;
  specialization?: string;
  active?: boolean;
};

type PrescriptionRecord = {
  id: number | string;
  patientId?: number | string | null;
  consultationId?: number | string | null;
  diagnosis?: string;
  advice?: string;
  notes?: string;
  status?: string;
  createdAt?: string;
  items?: any[];
};

type TreatmentPlanRecord = {
  id: number | string;
  patientId?: number | string | null;
  therapistName?: string;
  treatmentName?: string;
  diagnosis?: string;
  totalSessions?: number;
  completedSessions?: number;
  remainingSessions?: number;
  startDate?: string;
  expectedEndDate?: string;
  instructions?: string;
  notes?: string;
  status?: string;
};

const STATUS_OPTIONS = ["", "PENDING_DOCTOR_CONFIRMATION", "PAYMENT_PENDING", "CONFIRMED", "RESCHEDULED", "IN_PROGRESS", "COMPLETED", "REJECTED", "CANCELLED"];
const MENU_ITEMS = [
  { section: "MAIN", icon: "grid-outline", label: "Dashboard", route: "/doctor/dashboard" },
  { section: "MAIN", icon: "people-outline", label: "Patients", route: "/doctor/patients" },
  { section: "MAIN", icon: "calendar-outline", label: "Appointment Calendar", route: "/doctor/calendar" },
  { section: "MAIN", icon: "calendar-number-outline", label: "Upcoming Schedule", route: "/doctor/schedule" },
  { section: "MAIN", icon: "time-outline", label: "Manage Availability", route: "/doctor/availability" },
  { section: "CLINICAL", icon: "clipboard-outline", label: "Appointment Details", route: "/doctor/appointments", requiresOffline: true },
  { section: "CLINICAL", icon: "videocam-outline", label: "Consultation Details", route: "/doctor/consultations", requiresOnline: true },
  { section: "CLINICAL", icon: "document-text-outline", label: "Prescription Pad", route: "/doctor/prescription-pad" },
  { section: "FINANCE", icon: "card-outline", label: "Transactions", route: "/doctor/transactions" },
  { section: "FINANCE", icon: "person-circle-outline", label: "My Profile", route: "/doctor/profile" },
] as const;

function normalizePaymentStatus(value: any) {
  const status = String(value || "").trim().toUpperCase();
  if (["SUCCESS", "PAID", "PAYMENT_SUCCESS", "PAYMENT_SUCCESSFUL", "COMPLETED"].includes(status)) return "PAYMENT_SUCCESS";
  return status || "PENDING";
}
function isPaymentSuccessful(value: any) { return normalizePaymentStatus(value) === "PAYMENT_SUCCESS"; }
function normalizeDate(value: any) { return value ? String(value).slice(0, 10) : ""; }
function normalizeTime(value: any) { if (!value) return ""; const s = String(value).trim(); return /^\d{2}:\d{2}$/.test(s) ? `${s}:00` : s.slice(0, 8); }
function normalizeApiTime(value: string) { const s = String(value || "").trim(); return /^\d{2}:\d{2}$/.test(s) ? `${s}:00` : s; }
function normalizeConsultation(item: any): Consultation {
  return {
    id: item.id ?? item.consultationId ?? null,
    patientId: item.patientId ?? item.patient?.id ?? null,
    doctorId: item.doctorId ?? item.doctor?.id ?? null,
    patientName: item.patientName || item.patient?.name || "Patient",
    phoneNumber: item.phoneNumber || item.patient?.phoneNumber || "-",
    age: item.age ?? "-",
    gender: item.gender || "-",
    date: normalizeDate(item.consultationDate || item.date),
    startTime: normalizeTime(item.startTime || item.consultationTime || item.time),
    endTime: normalizeTime(item.endTime),
    symptoms: item.symptoms || "Online consultation",
    history: item.pastMedicalHistory || "-",
    status: String(item.status || "PENDING_DOCTOR_CONFIRMATION").toUpperCase(),
    paymentStatus: normalizePaymentStatus(item.paymentStatus || "PENDING"),
    consultationFee: Number(item.consultationFee ?? 0),
    meetingLink: item.meetingLink || null,
    meetingLinkExpiresAt: item.meetingLinkExpiresAt || null,
    meetingCreated: Boolean(item.roomId || item.meetingStatus || item.videoMeetingStatus || item.meetingLink),
    meetingStatus: String(item.meetingStatus || item.videoMeetingStatus || "").toUpperCase(),
    roomId: item.roomId || null,
    cancellationReason: item.cancellationReason || "",
    rescheduleReason: item.rescheduleReason || "",
  };
}
function extractArray(result: any) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.content)) return result.data.content;
  if (Array.isArray(result?.data?.consultations)) return result.data.consultations;
  return [];
}
function formatLabel(value: any) { return value ? String(value).replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : "-"; }
function formatDate(value: string) { if (!value) return "-"; const [y,m,d]=value.split("-").map(Number); const dt=new Date(y,(m||1)-1,d||1); return Number.isNaN(dt.getTime())?value:dt.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}); }
function formatTime(value: string) { if(!value)return "-"; const [h,m]=value.split(":").map(Number); if(Number.isNaN(h)) return value; const dt=new Date(); dt.setHours(h,m||0,0,0); return dt.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}); }
function localDateTime(dateValue:string,timeValue:string){ if(!dateValue)return null; const dp=dateValue.split("-").map(Number); const tp=String(timeValue||"00:00:00").split(":").map(Number); if(dp.length!==3||dp.some(Number.isNaN))return null; const d=new Date(dp[0],dp[1]-1,dp[2],tp[0]||0,tp[1]||0,tp[2]||0); return Number.isNaN(d.getTime())?null:d; }
function todayYmd(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

export default function DoctorConsultationsScreen(){
  const router=useRouter();
  const timer=useRef<ReturnType<typeof setInterval>|null>(null);
  const [doctorName,setDoctorName]=useState("Doctor");
  const [doctorId,setDoctorId]=useState<number|null>(null);
  const [hasOnline,setHasOnline]=useState<boolean|null>(null);
  const [hasOffline,setHasOffline]=useState<boolean|null>(null);
  const [consultations,setConsultations]=useState<Consultation[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);

  // Existing clinical records for Create/View buttons
  const [prescriptionByConsultation, setPrescriptionByConsultation] = useState<
    Record<string, PrescriptionRecord | null>
  >({});
  const [treatmentPlansByPatient, setTreatmentPlansByPatient] = useState<
    Record<string, TreatmentPlanRecord[]>
  >({});

  // View modals
  const [viewPrescription, setViewPrescription] =
    useState<PrescriptionRecord | null>(null);
  const [viewTreatmentPlans, setViewTreatmentPlans] = useState<
    TreatmentPlanRecord[]
  >([]);
  const [viewTreatmentPatientName, setViewTreatmentPatientName] = useState("");
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState("");
  const [dateFilter,setDateFilter]=useState("");
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [drawerOpen,setDrawerOpen]=useState(false);
  const [logoutOpen,setLogoutOpen]=useState(false);
  const [notice,setNotice]=useState<Notice>(null);
  const [selected,setSelected]=useState<Consultation|null>(null);
  const [detailsLoading,setDetailsLoading]=useState(false);
  const [confirmAction,setConfirmAction]=useState<{type:"accept"|"createRoom"|null;consultation:Consultation|null}>({type:null,consultation:null});
  const [rejectTarget,setRejectTarget]=useState<Consultation|null>(null);
  const [rejectReason,setRejectReason]=useState("");
  const [rescheduleTarget,setRescheduleTarget]=useState<Consultation|null>(null);
  const [rescheduleDate,setRescheduleDate]=useState("");
  const [rescheduleTime,setRescheduleTime]=useState("");
  const [rescheduleReason,setRescheduleReason]=useState("");
  const [treatmentTarget,setTreatmentTarget]=useState<Consultation|null>(null);
  const [therapistId,setTherapistId]=useState("");
  const [treatmentName,setTreatmentName]=useState("");
  const [treatmentDiagnosis,setTreatmentDiagnosis]=useState("");
  const [totalSessions,setTotalSessions]=useState("");
  const [startDate,setStartDate]=useState("");
  const [expectedEndDate,setExpectedEndDate]=useState("");
  const [instructions,setInstructions]=useState("");
  const [treatmentNotes,setTreatmentNotes]=useState("");
  const [busy,setBusy]=useState<string|null>(null);

  async function getToken(){ return (await AsyncStorage.getItem("doctorToken"))||(await AsyncStorage.getItem("token"))||(await AsyncStorage.getItem("accessToken"))||""; }
  async function clearSession(){ await AsyncStorage.multiRemove(["token","doctorToken","refreshToken","doctorRefreshToken","role","doctorId","doctorName","doctor","userId","email","profileCompleted","isLoggedIn"]); }
  async function api(path:string,options:any={}){
    const token=await getToken();
    if(!token){ await clearSession(); router.replace("/login" as any); throw new Error("Doctor login required."); }
    const headers:any={Accept:"application/json",...(options.headers||{}),Authorization:`Bearer ${token}`};
    if(options.body && !(options.body instanceof FormData)) headers["Content-Type"]="application/json";
    const response=await fetch(`${API_BASE_URL}${path}`,{...options,headers});
    const text=await response.text(); let result:any={};
    try{ result=text?JSON.parse(text):{}; }catch{ result={success:false,message:text||`Server error (${response.status})`}; }
    if(response.status===401){ await clearSession(); router.replace("/login" as any); throw new Error(result.message||"Doctor session expired."); }
    if(response.status===403) throw new Error(result.message||"You do not have permission to access this resource.");
    if(!response.ok||result.success===false) throw new Error(result.message||`Request failed (${response.status})`);
    return result;
  }
  function showNotice(type:"success"|"error"|"info",title:string,message:string){ setNotice({type,title,message}); }
  async function guardDoctor(){ const token=await getToken(); const role=String((await AsyncStorage.getItem("role"))||"").replace(/^ROLE_/i,"").toUpperCase(); if(!token||(role&&role!=="DOCTOR")){ await clearSession(); router.replace("/login" as any); return false;} return true; }
  async function loadDoctorProfile(){
    const saved=(await AsyncStorage.getItem("doctorName"))||(await AsyncStorage.getItem("name"))||"Doctor"; setDoctorName(saved);
    try{ const r=await api("/doctors/my-profile"); const d=r.data||{}; const name=d.name||d.doctorName||saved; const id=Number(d.id??d.doctorId??0)||null; setDoctorName(name); setDoctorId(id); const pairs:[string,string][]=[["doctorName",name],["doctor",JSON.stringify(d)]]; if(id)pairs.push(["doctorId",String(id)]); await AsyncStorage.multiSet(pairs); if(id) await loadDoctorModes(id); return id; }
    catch{ const id=Number(await AsyncStorage.getItem("doctorId"))||null; setDoctorId(id); return id; }
  }
  async function loadDoctorModes(id:number){
    try{ const r=await api(`/doctor-availability/doctor/${id}`); const list=Array.isArray(r)?r:Array.isArray(r?.data)?r.data:Array.isArray(r?.data?.content)?r.data.content:[]; const active=list.filter((x:any)=>x&&x.active!==false); const online=active.some((x:any)=>String(x.appointmentMode||x.mode||x.consultationMode||x.type||"").toUpperCase()==="ONLINE"); const offline=active.some((x:any)=>String(x.appointmentMode||x.mode||x.consultationMode||x.type||"").toUpperCase()==="OFFLINE"); if(!online&&!offline){setHasOnline(null);setHasOffline(null);}else{setHasOnline(online);setHasOffline(offline); await AsyncStorage.multiSet([["doctorHasOnline",String(online)],["doctorHasOffline",String(offline)]]);} }
    catch{ const on=await AsyncStorage.getItem("doctorHasOnline"); const off=await AsyncStorage.getItem("doctorHasOffline"); setHasOnline(on===null?null:on==="true"); setHasOffline(off===null?null:off==="true"); }
  }
  async function loadTherapists(){ try{ const r=await api("/therapists/getAll"); setTherapists(Array.isArray(r.data)?r.data:[]);}catch{setTherapists([]);} }
  async function loadMeetingStates(items:Consultation[]){
    const paid=items.filter(x=>x.id!=null&&isPaymentSuccessful(x.paymentStatus));
    await Promise.allSettled(paid.map(async item=>{ try{ const token=await getToken(); const response=await fetch(`${API_BASE_URL}/video-meetings/${encodeURIComponent(String(item.id))}`,{headers:{Accept:"application/json",Authorization:`Bearer ${token}`}}); if(response.status===404){item.meetingCreated=false;item.meetingStatus="";item.roomId=null;return;} if(response.status===401){await clearSession();router.replace("/login" as any);return;} const text=await response.text(); let r:any={}; try{r=text?JSON.parse(text):{};}catch{} if(!response.ok||r.success===false)return; const m=r.data||{}; item.meetingCreated=true; item.meetingStatus=String(m.status||m.meetingStatus||item.meetingStatus||"CREATED").toUpperCase(); item.roomId=m.roomId||item.roomId||null; item.meetingLink=m.meetingLink||item.meetingLink||null; }catch{} })); return items;
  }
  async function loadConsultations({silent=false}:{silent?:boolean}={}){
    if(!silent)setLoading(true);
    try{ const storedDoctorId=doctorId||Number(await AsyncStorage.getItem("doctorId"))||null; const results=await Promise.allSettled([api("/consultations/doctor/requests"),api("/consultations/doctor/my-consultations")]); const map=new Map<string,Consultation>(); const errors:string[]=[]; results.forEach((res,index)=>{ if(res.status==="fulfilled"){extractArray(res.value).forEach((record:any)=>{const n=normalizeConsultation(record);if(n.id!=null)map.set(String(n.id),n);});}else errors.push((res.reason as any)?.message||(index===0?"Pending consultation requests could not be loaded.":"Doctor consultations could not be loaded."));}); let list=Array.from(map.values()); if(storedDoctorId) list=list.filter(x=>!x.doctorId||Number(x.doctorId)===Number(storedDoctorId)); list.sort((a,b)=>(localDateTime(b.date,b.startTime)?.getTime()||0)-(localDateTime(a.date,a.startTime)?.getTime()||0)); await loadMeetingStates(list); await loadExistingClinicalRecords(list); setConsultations([...list]); if(errors.length&&list.length&&!silent) showNotice("info","Partial refresh","Some consultation records could not be refreshed, but available records are shown."); if(errors.length&&!list.length) throw new Error(errors.join(" ")); }
    catch(e:any){ if(!silent) showNotice("error","Unable to load consultations",e?.message||"Unable to load online consultations."); }
    finally{ if(!silent)setLoading(false); setRefreshing(false); }
  }
  const initialLoad=useCallback(async()=>{ if(!(await guardDoctor()))return; setLoading(true); try{await loadDoctorProfile(); await Promise.allSettled([loadTherapists()]); await loadConsultations();}finally{setLoading(false);} },[]);
  useEffect(()=>{initialLoad(); timer.current=setInterval(()=>loadConsultations({silent:true}),30000); return()=>{if(timer.current)clearInterval(timer.current);};},[]);
  async function refresh(){setRefreshing(true);await Promise.allSettled([loadDoctorProfile(),loadTherapists(),loadConsultations({silent:true})]);setRefreshing(false);}

  const filtered=useMemo(()=>{const q=search.trim().toLowerCase(); return consultations.filter(item=>{const sm=!q||[item.patientName,item.phoneNumber,item.symptoms].some(v=>String(v||"").toLowerCase().includes(q)); const dm=!dateFilter||item.date===dateFilter; const stm=!statusFilter||item.status===statusFilter; return sm&&dm&&stm;});},[consultations,search,dateFilter,statusFilter]);
  const summary=useMemo(()=>{const now=new Date(); return {total:consultations.length,pending:consultations.filter(x=>x.status==="PENDING_DOCTOR_CONFIRMATION").length,upcoming:consultations.filter(x=>!["REJECTED","CANCELLED","COMPLETED","NO_SHOW"].includes(x.status)&&Boolean(localDateTime(x.date,x.startTime)&&localDateTime(x.date,x.startTime)!>=now)).length,paid:consultations.filter(x=>isPaymentSuccessful(x.paymentStatus)).length};},[consultations]);
  async function viewDetails(item:Consultation){setSelected(item);setDetailsLoading(true);try{const r=await api(`/consultations/${encodeURIComponent(String(item.id))}/get`);const d=normalizeConsultation(r.data||{});d.meetingCreated=item.meetingCreated;d.meetingStatus=item.meetingStatus||d.meetingStatus;d.roomId=item.roomId||d.roomId;d.meetingLink=item.meetingLink||d.meetingLink;setSelected(d);}catch{}finally{setDetailsLoading(false);}}
  async function acceptConsultation(item:Consultation){setConfirmAction({type:null,consultation:null});setBusy(`accept-${item.id}`);try{const r=await api(`/consultations/${encodeURIComponent(String(item.id))}/accept`,{method:"PUT"});showNotice("success","Consultation accepted",r.message||"Consultation accepted successfully.");setSelected(null);await loadConsultations({silent:true});}catch(e:any){showNotice("error","Unable to accept",e?.message||"Unable to accept consultation.");}finally{setBusy(null);}}
  async function rejectConsultation(){if(!rejectTarget)return;const reason=rejectReason.trim();if(!reason)return showNotice("error","Reason required","Please enter a rejection reason.");setBusy("reject");try{const r=await api(`/consultations/${encodeURIComponent(String(rejectTarget.id))}/reject`,{method:"PUT",body:JSON.stringify({reason})});setRejectTarget(null);setRejectReason("");showNotice("success","Consultation rejected",r.message||"Consultation rejected successfully.");await loadConsultations({silent:true});}catch(e:any){showNotice("error","Unable to reject",e?.message||"Unable to reject consultation.");}finally{setBusy(null);}}
  function openReschedule(item:Consultation){setSelected(null);setRescheduleTarget(item);setRescheduleDate(item.date||"");setRescheduleTime(item.startTime?item.startTime.slice(0,5):"");setRescheduleReason("");}
  async function submitReschedule(){if(!rescheduleTarget)return;if(!rescheduleDate.trim()||!rescheduleTime.trim())return showNotice("error","Date and time required","Please enter the new consultation date and time.");if(rescheduleDate<todayYmd())return showNotice("error","Invalid date","The new consultation date cannot be in the past.");setBusy("reschedule");try{const r=await api(`/consultations/${encodeURIComponent(String(rescheduleTarget.id))}/reschedule`,{method:"PUT",body:JSON.stringify({consultationDate:rescheduleDate.trim(),startTime:normalizeApiTime(rescheduleTime.trim()),reason:rescheduleReason.trim()||"Rescheduled by doctor"})});setRescheduleTarget(null);showNotice("success","Consultation rescheduled",r.message||"Consultation rescheduled successfully.");await loadConsultations({silent:true});}catch(e:any){showNotice("error","Unable to reschedule",e?.message||"Unable to reschedule consultation.");}finally{setBusy(null);}}
  function meetingAction(item:Consultation){const closed=["COMPLETED","CANCELLED","REJECTED","NO_SHOW"].includes(item.status);const ended=["ENDED","EXPIRED","CANCELLED"].includes(item.meetingStatus);if(closed)return{type:"closed",label:formatLabel(item.status)};if(!isPaymentSuccessful(item.paymentStatus))return{type:"payment",label:"Payment Pending"};if(!item.meetingCreated)return{type:"create",label:"Create Video Room"};if(ended)return{type:"ended",label:formatLabel(item.meetingStatus||"Ended")};return{type:"start",label:"Start Consultation"};}
  async function createVideoRoom(item:Consultation){setConfirmAction({type:null,consultation:null});setBusy(`room-${item.id}`);try{const r=await api(`/video-meetings/create/${encodeURIComponent(String(item.id))}`,{method:"POST"});showNotice("success","Video room created",r.message||"Video room created successfully.");await loadConsultations({silent:true});}catch(e:any){showNotice("error","Unable to create room",e?.message||"Unable to create video room.");}finally{setBusy(null);}}
  function canJoin(item:Consultation){const start=localDateTime(item.date,item.startTime);if(!start)return false;return Date.now()>=new Date(start.getTime()-5*60*1000).getTime();}
  async function startConsultation(item:Consultation){if(!isPaymentSuccessful(item.paymentStatus))return showNotice("error","Payment pending","The patient must complete payment before starting the consultation.");if(!item.meetingCreated)return showNotice("error","Video room required","Create the video room before starting the consultation.");if(!canJoin(item)){const start=localDateTime(item.date,item.startTime);const allowed=start?new Date(start.getTime()-5*60*1000):null;return showNotice("info","Consultation not open yet",allowed?`You can join only 5 minutes before the consultation time. Join will be available at ${allowed.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}.`:"The consultation joining time could not be determined.");}if(item.meetingLink&&/^https?:\/\//i.test(item.meetingLink)){try{await Linking.openURL(item.meetingLink);return;}catch{}}showNotice("info","Consultation room","The video room is ready. Add app/doctor/consultation-room.tsx next to join this room inside the app.");}
  function openPrescription(item: Consultation) {
    setSelected(null);

    const existing = prescriptionByConsultation[String(item.id)];

    if (existing) {
      setViewPrescription(existing);
      return;
    }

    router.push({
      pathname: "/doctor/prescription-pad" as any,
      params: {
        type: "CONSULTATION",
        consultationId: String(item.id || ""),
        patientId: String(item.patientId || ""),
      },
    } as any);
  }

  function openTreatmentAction(item: Consultation) {
    const existingPlans = getTreatmentPlans(item);

    if (existingPlans.length > 0) {
      setSelected(null);
      setViewTreatmentPatientName(item.patientName);
      setViewTreatmentPlans(existingPlans);
      return;
    }

    openTreatmentPlan(item);
  }
  function openTreatmentPlan(item:Consultation){if(!item.patientId)return showNotice("error","Patient ID missing","Patient ID is required before a treatment plan can be created.");setSelected(null);setTreatmentTarget(item);setTherapistId("");setTreatmentName("");setTreatmentDiagnosis(item.symptoms==="Online consultation"?"":item.symptoms);setTotalSessions("");setStartDate("");setExpectedEndDate("");setInstructions("");setTreatmentNotes("");}
  async function submitTreatmentPlan(){if(!treatmentTarget)return;const patientId=Number(treatmentTarget.patientId);const therapist=Number(therapistId);const sessions=Number(totalSessions);if(!patientId||!therapist||!treatmentName.trim()||!treatmentDiagnosis.trim()||!sessions||!startDate||!expectedEndDate)return showNotice("error","Complete required fields","Please complete all required treatment-plan fields.");if(expectedEndDate<startDate)return showNotice("error","Invalid date range","Expected end date cannot be before the start date.");setBusy("treatment");try{const r=await api("/treatment-plans/create",{method:"POST",body:JSON.stringify({patientId,therapistId:therapist,treatmentName:treatmentName.trim(),diagnosis:treatmentDiagnosis.trim(),totalSessions:sessions,startDate,expectedEndDate,instructions:instructions.trim(),notes:treatmentNotes.trim()})});setTreatmentTarget(null);await loadConsultations({silent:true});showNotice("success","Treatment plan created",r.message||"Treatment plan created successfully.");}catch(e:any){showNotice("error","Unable to create plan",e?.message||"Unable to create treatment plan.");}finally{setBusy(null);}}
  async function logout(){setLogoutOpen(false);await clearSession();router.replace("/login" as any);}
  const visibleMenu=MENU_ITEMS.filter(item=>{if("requiresOnline" in item&&item.requiresOnline&&hasOnline===false)return false;if("requiresOffline" in item&&item.requiresOffline&&hasOffline===false)return false;return true;});

  if(loading)return <View style={s.loading}><View style={s.loadingIcon}><Ionicons name="videocam-outline" size={29} color={GOLD}/></View><ActivityIndicator size="large" color={GREEN}/><Text style={s.loadingTitle}>Loading Consultations</Text><Text style={s.loadingText}>Syncing requests, payment status and video-room information...</Text></View>;

  return <View style={s.screen}>
    <View style={s.header}><Pressable style={s.headerButton} onPress={()=>setDrawerOpen(true)}><Ionicons name="menu" size={23} color={GREEN}/></Pressable><View style={{flex:1}}><Text style={s.portal}>DOCTOR PORTAL</Text><Text style={s.headerTitle}>Online Consultations</Text></View><Pressable style={s.avatar} onPress={()=>router.push("/doctor/profile" as any)}><Text style={s.avatarText}>{doctorName.replace(/^Dr\.?\s*/i,"").charAt(0).toUpperCase()||"D"}</Text></Pressable></View>
    <ScrollView style={{flex:1}} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={GREEN}/>} keyboardShouldPersistTaps="handled">
      <View style={s.hero}><View style={{flex:1}}><Text style={s.heroEyebrow}>ONLINE CARE</Text><Text style={s.heroTitle}>Consultation Management</Text><Text style={s.heroText}>Accept, reject or reschedule requests, review patients, manage video rooms, prescriptions and treatment plans.</Text></View><View style={s.heroIcon}><Ionicons name="videocam" size={29} color={GOLD_LIGHT}/></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.summaryRow}><SummaryCard icon="list-outline" label="Total" value={summary.total}/><SummaryCard icon="hourglass-outline" label="Pending" value={summary.pending}/><SummaryCard icon="calendar-outline" label="Upcoming" value={summary.upcoming}/><SummaryCard icon="checkmark-circle-outline" label="Paid" value={summary.paid}/></ScrollView>
      <View style={s.searchPanel}><View style={s.searchBox}><Ionicons name="search" size={18} color={MUTED}/><TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="Search name, phone or symptoms" placeholderTextColor="#9AA39D"/><Pressable onPress={()=>setFiltersOpen(true)}><Ionicons name="options-outline" size={21} color={GREEN}/></Pressable></View>{(statusFilter||dateFilter)?<View style={s.activeFilters}>{statusFilter?<FilterTag text={formatLabel(statusFilter)} onClear={()=>setStatusFilter("")}/>:null}{dateFilter?<FilterTag text={formatDate(dateFilter)} onClear={()=>setDateFilter("")}/>:null}<Pressable onPress={()=>{setSearch("");setStatusFilter("");setDateFilter("");}}><Text style={s.resetText}>Reset all</Text></Pressable></View>:null}</View>
      <View style={s.listHead}><View><Text style={s.listTitle}>Consultation List</Text><Text style={s.listSub}>All online consultations assigned to you.</Text></View><View style={s.countPill}><Text style={s.countText}>{filtered.length} results</Text></View></View>
      {filtered.length===0?<View style={s.empty}><View style={s.emptyIcon}><Ionicons name="calendar-outline" size={27} color={GOLD}/></View><Text style={s.emptyTitle}>No online consultations found</Text><Text style={s.emptyText}>Pull down to refresh or change your search and filters.</Text></View>:filtered.map(item=>{const meeting=meetingAction(item);const pending=item.status==="PENDING_DOCTOR_CONFIRMATION";return <View key={String(item.id)} style={s.card}><View style={s.cardTop}><View style={s.patientAvatar}><Text style={s.patientAvatarText}>{item.patientName.charAt(0).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={s.patientName}>{item.patientName}</Text><Text style={s.patientPhone}>{item.phoneNumber}</Text></View><StatusBadge value={item.status}/></View><View style={s.dateStrip}><View style={s.dateItem}><Ionicons name="calendar-outline" size={16} color={GREEN}/><View><Text style={s.miniLabel}>DATE</Text><Text style={s.miniValue}>{formatDate(item.date)}</Text></View></View><View style={s.dateItem}><Ionicons name="time-outline" size={16} color={GREEN}/><View><Text style={s.miniLabel}>TIME</Text><Text style={s.miniValue}>{formatTime(item.startTime)}{item.endTime?` - ${formatTime(item.endTime)}`:""}</Text></View></View></View><View style={s.symptomBox}><Text style={s.symptomLabel}>SYMPTOMS</Text><Text style={s.symptomText} numberOfLines={3}>{item.symptoms}</Text></View><View style={s.statusLine}><View><Text style={s.miniLabel}>PAYMENT</Text><StatusBadge value={item.paymentStatus} small/></View><View style={{alignItems:"flex-end",flex:1}}><Text style={s.miniLabel}>VIDEO MEETING</Text>{meeting.type==="create"?<Pressable style={s.meetingButton} onPress={()=>setConfirmAction({type:"createRoom",consultation:item})}><Ionicons name="add-circle-outline" size={15} color={INFO}/><Text style={s.meetingButtonText}>Create Room</Text></Pressable>:meeting.type==="start"?<Pressable style={s.startButton} onPress={()=>startConsultation(item)}><Ionicons name="videocam" size={15} color={WHITE}/><Text style={s.startButtonText}>Start</Text></Pressable>:<Text style={s.meetingState}>{meeting.label}</Text>}</View></View><View style={s.cardActions}><ActionButton icon="eye-outline" label="Details" onPress={()=>viewDetails(item)}/>{pending?<><ActionButton icon="checkmark" label="Accept" kind="success" onPress={()=>setConfirmAction({type:"accept",consultation:item})}/><ActionButton icon="close" label="Reject" kind="danger" onPress={()=>{setRejectReason("");setRejectTarget(item);}}/></>:null}<ActionButton icon="calendar-outline" label="Reschedule" kind="warning" onPress={()=>openReschedule(item)}/></View><View style={s.secondaryActions}><Pressable style={s.secondaryAction} onPress={() => openPrescription(item)}>
  <Ionicons
    name={hasPrescription(item) ? "eye-outline" : "document-text-outline"}
    size={16}
    color={GREEN}
  />
  <Text style={s.secondaryActionText}>
    {hasPrescription(item) ? "View Prescription" : "Create Prescription"}
  </Text>
</Pressable>
<Pressable style={s.secondaryAction} onPress={() => openTreatmentAction(item)}>
  <Ionicons
    name={hasTreatmentPlan(item) ? "eye-outline" : "medical-outline"}
    size={16}
    color={GREEN}
  />
  <Text style={s.secondaryActionText}>
    {hasTreatmentPlan(item) ? "View Treatment Plans" : "Create Treatment Plan"}
  </Text>
</Pressable></View></View>;})}
    </ScrollView>

    <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={()=>setDrawerOpen(false)}><View style={s.drawerOverlay}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setDrawerOpen(false)}/><View style={s.drawer}><View style={s.drawerBrand}><View style={s.brandLogo}><Text style={s.brandLogoText}>N</Text></View><View><Text style={s.brandName}>NeoLife</Text><Text style={s.brandSub}>DOCTOR PORTAL</Text></View><Pressable style={s.drawerClose} onPress={()=>setDrawerOpen(false)}><Ionicons name="close" size={21} color={WHITE}/></Pressable></View><ScrollView contentContainerStyle={{padding:14}}>{["MAIN","CLINICAL","FINANCE"].map(section=><View key={section}><Text style={s.menuSection}>{section}</Text>{visibleMenu.filter(item=>item.section===section).map(item=>{const active=item.label==="Consultation Details";return <Pressable key={item.label} style={[s.menuItem,active&&s.menuActive]} onPress={()=>{setDrawerOpen(false);if(!active)router.push(item.route as any);}}><Ionicons name={item.icon as any} size={19} color={active?GOLD:WHITE}/><Text style={[s.menuText,active&&s.menuActiveText]}>{item.label}</Text></Pressable>;})}</View>)}</ScrollView><Pressable style={s.logout} onPress={()=>setLogoutOpen(true)}><Ionicons name="log-out-outline" size={20} color={WHITE}/><Text style={s.logoutText}>Logout</Text></Pressable></View></View></Modal>

    <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={()=>setFiltersOpen(false)}><View style={s.sheetOverlay}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setFiltersOpen(false)}/><View style={s.sheet}><View style={s.sheetHandle}/><Text style={s.sheetTitle}>Filter Consultations</Text><Text style={s.sheetSub}>Filter by status or consultation date.</Text><Text style={[s.label,{marginTop:19}]}>Status</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{STATUS_OPTIONS.map(status=><Chip key={status||"all"} text={status?formatLabel(status):"All"} active={statusFilter===status} onPress={()=>setStatusFilter(status)}/>)}</ScrollView><Text style={[s.label,{marginTop:18}]}>Consultation Date (YYYY-MM-DD)</Text><TextInput value={dateFilter} onChangeText={setDateFilter} placeholder="2026-09-01" placeholderTextColor="#9AA39D" style={s.input}/><View style={s.sheetActions}><Pressable style={s.secondaryButton} onPress={()=>{setStatusFilter("");setDateFilter("");}}><Text style={s.secondaryButtonText}>Reset</Text></Pressable><Pressable style={s.primaryButton} onPress={()=>setFiltersOpen(false)}><Text style={s.primaryButtonText}>Apply Filters</Text></Pressable></View></View></View></Modal>

    <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={()=>setSelected(null)}><View style={s.sheetOverlay}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setSelected(null)}/>{selected?<View style={[s.sheet,{maxHeight:"92%"}]}><View style={s.sheetHandle}/><View style={s.modalHead}><View><Text style={s.sheetTitle}>Consultation Details</Text><Text style={s.sheetSub}>Consultation #{selected.id}</Text></View><Pressable style={s.closeButton} onPress={()=>setSelected(null)}><Ionicons name="close" size={20} color={GREEN}/></Pressable></View><ScrollView showsVerticalScrollIndicator={false}><View style={s.detailsPatient}><View style={s.patientAvatar}><Text style={s.patientAvatarText}>{selected.patientName.charAt(0).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={s.detailsPatientName}>{selected.patientName}</Text><Text style={s.detailsPatientMeta}>{selected.phoneNumber} · {selected.age} years · {formatLabel(selected.gender)}</Text></View>{detailsLoading?<ActivityIndicator size="small" color={GREEN}/>:null}</View><View style={s.detailGrid}><Detail label="Date & Time" value={`${formatDate(selected.date)} · ${formatTime(selected.startTime)}`}/><Detail label="Status" value={formatLabel(selected.status)}/><Detail label="Payment" value={formatLabel(selected.paymentStatus)}/><Detail label="Consultation Fee" value={`₹${Number(selected.consultationFee||0).toLocaleString("en-IN")}`}/><Detail label="Meeting" value={selected.meetingCreated?formatLabel(selected.meetingStatus||"Created"):"Not available"}/><Detail label="Room ID" value={selected.roomId||"-"}/></View><TextBlock label="Symptoms" text={selected.symptoms}/><TextBlock label="Past Medical History" text={selected.history}/>{selected.rescheduleReason?<TextBlock label="Reschedule Reason" text={selected.rescheduleReason}/>:null}{selected.cancellationReason?<TextBlock label="Cancellation Reason" text={selected.cancellationReason}/>:null}<View style={s.detailActions}>{selected.status==="PENDING_DOCTOR_CONFIRMATION"?<><Pressable style={[s.detailActionButton,{backgroundColor:SUCCESS}]} onPress={()=>{setSelected(null);setConfirmAction({type:"accept",consultation:selected});}}><Ionicons name="checkmark" size={17} color={WHITE}/><Text style={s.detailActionWhite}>Accept</Text></Pressable><Pressable style={[s.detailActionButton,{backgroundColor:DANGER}]} onPress={()=>{const x=selected;setSelected(null);setRejectTarget(x);}}><Ionicons name="close" size={17} color={WHITE}/><Text style={s.detailActionWhite}>Reject</Text></Pressable></>:null}<Pressable style={s.detailActionButton} onPress={()=>openReschedule(selected)}><Ionicons name="calendar-outline" size={17} color={GREEN}/><Text style={s.detailActionText}>Reschedule</Text></Pressable><Pressable style={s.detailActionButton} onPress={() => openPrescription(selected)}>
  <Ionicons
    name={hasPrescription(selected) ? "eye-outline" : "document-text-outline"}
    size={17}
    color={GREEN}
  />
  <Text style={s.detailActionText}>
    {hasPrescription(selected) ? "View Prescription" : "Create Prescription"}
  </Text>
</Pressable>
<Pressable style={s.detailActionButton} onPress={() => openTreatmentAction(selected)}>
  <Ionicons
    name={hasTreatmentPlan(selected) ? "eye-outline" : "medical-outline"}
    size={17}
    color={GREEN}
  />
  <Text style={s.detailActionText}>
    {hasTreatmentPlan(selected) ? "View Treatment Plans" : "Create Treatment Plan"}
  </Text>
</Pressable>{meetingAction(selected).type==="create"?<Pressable style={[s.detailActionButton,{backgroundColor:INFO_LIGHT}]} onPress={()=>{setSelected(null);setConfirmAction({type:"createRoom",consultation:selected});}}><Ionicons name="add-circle-outline" size={17} color={INFO}/><Text style={[s.detailActionText,{color:INFO}]}>Create Video Room</Text></Pressable>:null}{meetingAction(selected).type==="start"?<Pressable style={[s.detailActionButton,{backgroundColor:GREEN}]} onPress={()=>startConsultation(selected)}><Ionicons name="videocam" size={17} color={WHITE}/><Text style={s.detailActionWhite}>Start Consultation</Text></Pressable>:null}</View></ScrollView></View>:null}</View></Modal>

    <FormModal visible={Boolean(rejectTarget)} title="Reject Consultation" subtitle={rejectTarget?.patientName||""} onClose={()=>setRejectTarget(null)}><Text style={s.label}>Rejection Reason *</Text><TextInput value={rejectReason} onChangeText={setRejectReason} multiline textAlignVertical="top" placeholder="Explain why this consultation is being rejected" placeholderTextColor="#9AA39D" style={[s.input,s.textarea]}/><View style={s.modalButtons}><Pressable style={s.secondaryButton} onPress={()=>setRejectTarget(null)}><Text style={s.secondaryButtonText}>Cancel</Text></Pressable><Pressable style={[s.primaryButton,{backgroundColor:DANGER}]} onPress={rejectConsultation} disabled={busy==="reject"}>{busy==="reject"?<ActivityIndicator size="small" color={WHITE}/>:<Text style={s.primaryButtonText}>Reject</Text>}</Pressable></View></FormModal>
    <FormModal visible={Boolean(rescheduleTarget)} title="Reschedule Consultation" subtitle={rescheduleTarget?.patientName||""} onClose={()=>setRescheduleTarget(null)}><Text style={s.label}>New Date * (YYYY-MM-DD)</Text><TextInput value={rescheduleDate} onChangeText={setRescheduleDate} placeholder="2026-09-05" placeholderTextColor="#9AA39D" style={s.input}/><Text style={[s.label,{marginTop:14}]}>New Time * (HH:MM)</Text><TextInput value={rescheduleTime} onChangeText={setRescheduleTime} placeholder="14:30" placeholderTextColor="#9AA39D" style={s.input}/><Text style={[s.label,{marginTop:14}]}>Reason</Text><TextInput value={rescheduleReason} onChangeText={setRescheduleReason} multiline textAlignVertical="top" placeholder="Reason for rescheduling" placeholderTextColor="#9AA39D" style={[s.input,s.textarea]}/><View style={s.modalButtons}><Pressable style={s.secondaryButton} onPress={()=>setRescheduleTarget(null)}><Text style={s.secondaryButtonText}>Cancel</Text></Pressable><Pressable style={s.primaryButton} onPress={submitReschedule} disabled={busy==="reschedule"}>{busy==="reschedule"?<ActivityIndicator size="small" color={WHITE}/>:<Text style={s.primaryButtonText}>Confirm Reschedule</Text>}</Pressable></View></FormModal>

    <Modal visible={Boolean(treatmentTarget)} transparent animationType="slide" onRequestClose={()=>setTreatmentTarget(null)}><View style={s.sheetOverlay}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setTreatmentTarget(null)}/><View style={[s.sheet,{maxHeight:"94%"}]}><View style={s.sheetHandle}/><View style={s.modalHead}><View><Text style={s.sheetTitle}>Create Treatment Plan</Text><Text style={s.sheetSub}>{treatmentTarget?.patientName||""}</Text></View><Pressable style={s.closeButton} onPress={()=>setTreatmentTarget(null)}><Ionicons name="close" size={20} color={GREEN}/></Pressable></View><ScrollView keyboardShouldPersistTaps="handled"><Text style={s.label}>Therapist *</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingBottom:4}}>{therapists.filter(x=>x.active!==false).map(x=><Chip key={String(x.id)} text={x.name||x.therapistName||"Therapist"} active={String(therapistId)===String(x.id)} onPress={()=>setTherapistId(String(x.id))}/>)}</ScrollView><InputField label="Treatment Name *" value={treatmentName} onChangeText={setTreatmentName} placeholder="Example: Panchakarma Therapy"/><InputField label="Diagnosis *" value={treatmentDiagnosis} onChangeText={setTreatmentDiagnosis} placeholder="Enter diagnosis"/><InputField label="Total Sessions *" value={totalSessions} onChangeText={(v:string)=>setTotalSessions(v.replace(/\D/g,""))} placeholder="10" keyboardType="number-pad"/><InputField label="Start Date * (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-09-05"/><InputField label="Expected End Date * (YYYY-MM-DD)" value={expectedEndDate} onChangeText={setExpectedEndDate} placeholder="2026-09-20"/><InputField label="Instructions" value={instructions} onChangeText={setInstructions} placeholder="Treatment instructions" multiline/><InputField label="Notes" value={treatmentNotes} onChangeText={setTreatmentNotes} placeholder="Additional notes" multiline/><Pressable style={[s.primaryButton,{marginTop:8}]} onPress={submitTreatmentPlan} disabled={busy==="treatment"}>{busy==="treatment"?<ActivityIndicator size="small" color={WHITE}/>:<><Ionicons name="add-circle-outline" size={18} color={WHITE}/><Text style={s.primaryButtonText}>Create Plan</Text></>}</Pressable></ScrollView></View></View></Modal>

    <ConfirmModal visible={Boolean(confirmAction.type)} title={confirmAction.type==="accept"?"Accept consultation?":"Create secure video room?"} message={confirmAction.type==="accept"?`Accept the online consultation request from ${confirmAction.consultation?.patientName||"this patient"}?`:"The room will be created for this paid consultation."} confirm={confirmAction.type==="accept"?"Accept Consultation":"Create Room"} onCancel={()=>setConfirmAction({type:null,consultation:null})} onConfirm={()=>{if(!confirmAction.consultation)return;if(confirmAction.type==="accept")acceptConsultation(confirmAction.consultation);else createVideoRoom(confirmAction.consultation);}}/>
    <ConfirmModal visible={logoutOpen} title="Logout from Doctor Portal?" message="You will need to sign in again to access your doctor dashboard." confirm="Logout" danger onCancel={()=>setLogoutOpen(false)} onConfirm={logout}/>
    <NoticeModal notice={notice} onClose={()=>setNotice(null)}/>
  </View>;
}

function SummaryCard({icon,label,value}:any){return <View style={s.summaryCard}><View style={s.summaryIcon}><Ionicons name={icon} size={19} color={GREEN}/></View><Text style={s.summaryLabel}>{label}</Text><Text style={s.summaryValue}>{value}</Text></View>;}
function StatusBadge({value,small=false}:{value:string;small?:boolean}){const u=String(value||"").toUpperCase();let bg="#F1F3F1",color=MUTED;if(["CONFIRMED","PAYMENT_SUCCESS","SUCCESS","PAID","COMPLETED"].includes(u)){bg=SUCCESS_LIGHT;color=SUCCESS;}else if(["REJECTED","CANCELLED","FAILED"].includes(u)){bg=DANGER_LIGHT;color=DANGER;}else if(u==="IN_PROGRESS"){bg=INFO_LIGHT;color=INFO;}else if(["PENDING","PENDING_DOCTOR_CONFIRMATION","PAYMENT_PENDING","RESCHEDULED"].includes(u)){bg=WARNING_LIGHT;color="#946300";}return <View style={[s.badge,{backgroundColor:bg},small&&{paddingVertical:4,paddingHorizontal:7}]}><Text style={[s.badgeText,{color},small&&{fontSize:8}]}>{formatLabel(value)}</Text></View>;}
function ActionButton({icon,label,kind="default",onPress}:any){let bg=MINT,color=GREEN;if(kind==="success"){bg=SUCCESS_LIGHT;color=SUCCESS;}else if(kind==="danger"){bg=DANGER_LIGHT;color=DANGER;}else if(kind==="warning"){bg=WARNING_LIGHT;color="#946300";}return <Pressable style={[s.actionButton,{backgroundColor:bg}]} onPress={onPress}><Ionicons name={icon} size={16} color={color}/><Text style={[s.actionButtonText,{color}]}>{label}</Text></Pressable>;}
function Detail({label,value}:{label:string;value:string}){return <View style={s.detail}><Text style={s.detailLabel}>{label}</Text><Text style={s.detailValue}>{value||"-"}</Text></View>;}
function TextBlock({label,text}:{label:string;text:string}){return <View style={s.textBlock}><Text style={s.detailLabel}>{label}</Text><Text style={s.textBlockText}>{text||"-"}</Text></View>;}
function FilterTag({text,onClear}:{text:string;onClear:()=>void}){return <View style={s.filterTag}><Text style={s.filterTagText}>{text}</Text><Pressable onPress={onClear}><Ionicons name="close-circle" size={14} color={GREEN}/></Pressable></View>;}
function Chip({text,active,onPress}:{text:string;active:boolean;onPress:()=>void}){return <Pressable onPress={onPress} style={[s.chip,active&&s.chipActive]}><Text style={[s.chipText,active&&s.chipActiveText]}>{text}</Text></Pressable>;}
function FormModal({visible,title,subtitle,onClose,children}:any){return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={s.sheetOverlay}><Pressable style={StyleSheet.absoluteFill} onPress={onClose}/><View style={s.sheet}><View style={s.sheetHandle}/><View style={s.modalHead}><View><Text style={s.sheetTitle}>{title}</Text><Text style={s.sheetSub}>{subtitle}</Text></View><Pressable style={s.closeButton} onPress={onClose}><Ionicons name="close" size={20} color={GREEN}/></Pressable></View>{children}</View></View></Modal>;}
function InputField({label,multiline=false,...props}:any){return <View style={{marginTop:14}}><Text style={s.label}>{label}</Text><TextInput {...props} multiline={multiline} textAlignVertical={multiline?"top":"center"} placeholderTextColor="#9AA39D" style={[s.input,multiline&&s.textarea]}/></View>;}
function ConfirmModal({visible,title,message,confirm,onCancel,onConfirm,danger=false}:any){return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}><View style={s.modalOverlay}><View style={s.confirmCard}><View style={[s.confirmIcon,danger&&{backgroundColor:DANGER_LIGHT}]}><Ionicons name={danger?"log-out-outline":"checkmark-done-outline"} size={28} color={danger?DANGER:GREEN}/></View><Text style={s.confirmTitle}>{title}</Text><Text style={s.confirmMessage}>{message}</Text><View style={s.modalButtons}><Pressable style={s.secondaryButton} onPress={onCancel}><Text style={s.secondaryButtonText}>Cancel</Text></Pressable><Pressable style={[s.primaryButton,danger&&{backgroundColor:DANGER}]} onPress={onConfirm}><Text style={s.primaryButtonText}>{confirm}</Text></Pressable></View></View></View></Modal>;}
function NoticeModal({notice,onClose}:{notice:Notice;onClose:()=>void}){if(!notice)return null;const error=notice.type==="error",success=notice.type==="success";return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={s.modalOverlay}><View style={s.confirmCard}><View style={[s.confirmIcon,{backgroundColor:error?DANGER_LIGHT:success?SUCCESS_LIGHT:INFO_LIGHT}]}><Ionicons name={error?"close-circle-outline":success?"checkmark-circle-outline":"information-circle-outline"} size={30} color={error?DANGER:success?SUCCESS:INFO}/></View><Text style={s.confirmTitle}>{notice.title}</Text><Text style={s.confirmMessage}>{notice.message}</Text><Pressable style={s.noticeButton} onPress={onClose}><Text style={s.primaryButtonText}>OK</Text></Pressable></View></View></Modal>;}

const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:CREAM},loading:{flex:1,backgroundColor:CREAM,alignItems:"center",justifyContent:"center",padding:28},loadingIcon:{width:62,height:62,borderRadius:20,backgroundColor:GREEN,alignItems:"center",justifyContent:"center",marginBottom:18},loadingTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:22,color:GREEN,marginTop:16},loadingText:{fontFamily:"DMSans_400Regular",fontSize:12,lineHeight:18,color:MUTED,textAlign:"center",marginTop:5},
  header:{minHeight:86,paddingTop:40,paddingHorizontal:15,paddingBottom:10,flexDirection:"row",alignItems:"center",gap:12,backgroundColor:WHITE,borderBottomWidth:1,borderBottomColor:BORDER},headerButton:{width:42,height:42,borderRadius:13,backgroundColor:MINT,alignItems:"center",justifyContent:"center"},portal:{fontFamily:"DMSans_700Bold",fontSize:9,letterSpacing:1.5,color:GOLD},headerTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:20,color:GREEN},avatar:{width:42,height:42,borderRadius:21,backgroundColor:GOLD,alignItems:"center",justifyContent:"center"},avatarText:{fontFamily:"DMSans_700Bold",fontSize:16,color:WHITE},content:{padding:14,paddingBottom:42},
  hero:{padding:20,borderRadius:22,backgroundColor:GREEN,flexDirection:"row",alignItems:"center",gap:14,marginBottom:14},heroEyebrow:{fontFamily:"DMSans_700Bold",fontSize:9,letterSpacing:1.5,color:GOLD_LIGHT,marginBottom:6},heroTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:24,color:WHITE,marginBottom:6},heroText:{fontFamily:"DMSans_400Regular",fontSize:11.5,lineHeight:18,color:"#DDE9E2"},heroIcon:{width:56,height:56,borderRadius:18,backgroundColor:"rgba(255,255,255,.1)",alignItems:"center",justifyContent:"center"},
  summaryRow:{gap:10,paddingBottom:14},summaryCard:{width:125,padding:13,borderRadius:17,borderWidth:1,borderColor:BORDER,backgroundColor:WHITE},summaryIcon:{width:36,height:36,borderRadius:11,backgroundColor:MINT,alignItems:"center",justifyContent:"center",marginBottom:10},summaryLabel:{fontFamily:"DMSans_600SemiBold",fontSize:9,color:MUTED},summaryValue:{fontFamily:"PlayfairDisplay_700Bold",fontSize:23,color:GREEN,marginTop:2},
  searchPanel:{backgroundColor:WHITE,borderRadius:17,borderWidth:1,borderColor:BORDER,padding:12,marginBottom:15},searchBox:{height:48,borderWidth:1,borderColor:BORDER,borderRadius:13,paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:8},searchInput:{flex:1,fontFamily:"DMSans_400Regular",fontSize:12,color:TEXT},activeFilters:{flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:7,marginTop:10},filterTag:{flexDirection:"row",alignItems:"center",gap:5,paddingHorizontal:8,paddingVertical:6,borderRadius:16,backgroundColor:MINT},filterTagText:{fontFamily:"DMSans_600SemiBold",fontSize:9,color:GREEN},resetText:{fontFamily:"DMSans_700Bold",fontSize:9,color:DANGER},
  listHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:10},listTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:19,color:GREEN},listSub:{fontFamily:"DMSans_400Regular",fontSize:10,color:MUTED,marginTop:2},countPill:{paddingHorizontal:9,paddingVertical:6,borderRadius:20,backgroundColor:MINT},countText:{fontFamily:"DMSans_700Bold",fontSize:9,color:GREEN},
  card:{padding:15,borderRadius:19,borderWidth:1,borderColor:BORDER,backgroundColor:WHITE,marginBottom:12},cardTop:{flexDirection:"row",alignItems:"center",gap:10},patientAvatar:{width:44,height:44,borderRadius:22,backgroundColor:GREEN,alignItems:"center",justifyContent:"center"},patientAvatarText:{fontFamily:"DMSans_700Bold",fontSize:16,color:WHITE},patientName:{fontFamily:"DMSans_700Bold",fontSize:14,color:TEXT},patientPhone:{fontFamily:"DMSans_400Regular",fontSize:10,color:MUTED,marginTop:2},badge:{alignSelf:"flex-start",paddingHorizontal:8,paddingVertical:5,borderRadius:18},badgeText:{fontFamily:"DMSans_700Bold",fontSize:8},
  dateStrip:{flexDirection:"row",gap:9,marginTop:13},dateItem:{flex:1,minHeight:56,backgroundColor:MINT,borderRadius:12,padding:9,flexDirection:"row",alignItems:"center",gap:8},miniLabel:{fontFamily:"DMSans_700Bold",fontSize:7.5,letterSpacing:.5,color:MUTED},miniValue:{fontFamily:"DMSans_600SemiBold",fontSize:10,color:TEXT,marginTop:2},symptomBox:{marginTop:10,padding:11,borderRadius:12,backgroundColor:"#FCFDFB",borderWidth:1,borderColor:BORDER},symptomLabel:{fontFamily:"DMSans_700Bold",fontSize:8,letterSpacing:.5,color:MUTED},symptomText:{fontFamily:"DMSans_400Regular",fontSize:11,lineHeight:16,color:TEXT,marginTop:4},
  statusLine:{marginTop:12,flexDirection:"row",alignItems:"flex-end",gap:12},meetingButton:{minHeight:34,paddingHorizontal:9,borderRadius:10,backgroundColor:INFO_LIGHT,flexDirection:"row",alignItems:"center",gap:4},meetingButtonText:{fontFamily:"DMSans_700Bold",fontSize:9,color:INFO},startButton:{minHeight:34,paddingHorizontal:10,borderRadius:10,backgroundColor:GREEN,flexDirection:"row",alignItems:"center",gap:5},startButtonText:{fontFamily:"DMSans_700Bold",fontSize:9,color:WHITE},meetingState:{fontFamily:"DMSans_700Bold",fontSize:9,color:MUTED,marginTop:5},cardActions:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:13,paddingTop:12,borderTopWidth:1,borderTopColor:BORDER},actionButton:{minHeight:36,paddingHorizontal:9,borderRadius:10,flexDirection:"row",alignItems:"center",gap:4},actionButtonText:{fontFamily:"DMSans_700Bold",fontSize:9},secondaryActions:{flexDirection:"row",gap:8,marginTop:8},secondaryAction:{flex:1,minHeight:40,borderRadius:11,backgroundColor:"#F6F8F6",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:5},secondaryActionText:{fontFamily:"DMSans_700Bold",fontSize:9,color:GREEN},
  empty:{padding:32,borderRadius:18,backgroundColor:WHITE,borderWidth:1,borderColor:BORDER,alignItems:"center"},emptyIcon:{width:52,height:52,borderRadius:17,backgroundColor:MINT,alignItems:"center",justifyContent:"center"},emptyTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:18,color:GREEN,marginTop:12},emptyText:{fontFamily:"DMSans_400Regular",fontSize:10.5,color:MUTED,textAlign:"center",marginTop:4},
  drawerOverlay:{flex:1,backgroundColor:"rgba(4,20,14,.58)"},drawer:{width:"84%",maxWidth:330,height:"100%",backgroundColor:GREEN},drawerBrand:{minHeight:105,paddingTop:38,paddingHorizontal:17,paddingBottom:15,flexDirection:"row",alignItems:"center",gap:11,borderBottomWidth:1,borderBottomColor:"rgba(255,255,255,.12)"},brandLogo:{width:48,height:48,borderRadius:24,borderWidth:2,borderColor:GOLD,backgroundColor:WHITE,alignItems:"center",justifyContent:"center"},brandLogoText:{fontFamily:"PlayfairDisplay_700Bold",fontSize:22,color:GREEN},brandName:{fontFamily:"PlayfairDisplay_700Bold",fontSize:20,color:WHITE},brandSub:{fontFamily:"DMSans_700Bold",fontSize:8,letterSpacing:1.4,color:GOLD_LIGHT,marginTop:2},drawerClose:{marginLeft:"auto",width:36,height:36,borderRadius:12,backgroundColor:"rgba(255,255,255,.1)",alignItems:"center",justifyContent:"center"},menuSection:{fontFamily:"DMSans_700Bold",fontSize:8,letterSpacing:1.4,color:"rgba(255,255,255,.45)",marginTop:12,marginBottom:7,marginLeft:8},menuItem:{minHeight:47,borderRadius:12,paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:12,marginBottom:5},menuActive:{backgroundColor:WHITE},menuText:{fontFamily:"DMSans_600SemiBold",fontSize:12,color:"rgba(255,255,255,.88)"},menuActiveText:{color:GREEN},logout:{margin:14,minHeight:48,borderWidth:1,borderColor:"rgba(255,255,255,.18)",borderRadius:13,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},logoutText:{fontFamily:"DMSans_700Bold",fontSize:12,color:WHITE},
  sheetOverlay:{flex:1,justifyContent:"flex-end",backgroundColor:"rgba(4,20,14,.52)"},sheet:{maxHeight:"86%",backgroundColor:CREAM,borderTopLeftRadius:26,borderTopRightRadius:26,padding:18,paddingBottom:30},sheetHandle:{width:45,height:5,borderRadius:5,backgroundColor:"#D3DAD5",alignSelf:"center",marginBottom:15},sheetTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:23,color:GREEN},sheetSub:{fontFamily:"DMSans_400Regular",fontSize:10.5,color:MUTED,marginTop:3},modalHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:16},closeButton:{width:38,height:38,borderRadius:12,backgroundColor:MINT,alignItems:"center",justifyContent:"center"},label:{fontFamily:"DMSans_700Bold",fontSize:10,color:GREEN,marginBottom:7},input:{minHeight:47,borderWidth:1,borderColor:BORDER,borderRadius:12,backgroundColor:WHITE,paddingHorizontal:12,paddingVertical:10,fontFamily:"DMSans_400Regular",fontSize:12,color:TEXT},textarea:{minHeight:100},chip:{paddingHorizontal:11,paddingVertical:8,borderRadius:18,borderWidth:1,borderColor:BORDER,backgroundColor:WHITE},chipActive:{backgroundColor:GREEN,borderColor:GREEN},chipText:{fontFamily:"DMSans_600SemiBold",fontSize:9,color:TEXT},chipActiveText:{color:WHITE},sheetActions:{flexDirection:"row",gap:9,marginTop:22},primaryButton:{flex:1,minHeight:47,paddingHorizontal:14,borderRadius:12,backgroundColor:GREEN,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},primaryButtonText:{fontFamily:"DMSans_700Bold",fontSize:11,color:WHITE},secondaryButton:{flex:1,minHeight:47,paddingHorizontal:14,borderRadius:12,backgroundColor:MINT,alignItems:"center",justifyContent:"center"},secondaryButtonText:{fontFamily:"DMSans_700Bold",fontSize:11,color:GREEN},
  detailsPatient:{padding:13,borderRadius:15,backgroundColor:MINT,flexDirection:"row",alignItems:"center",gap:10,marginBottom:12},detailsPatientName:{fontFamily:"DMSans_700Bold",fontSize:14,color:TEXT},detailsPatientMeta:{fontFamily:"DMSans_400Regular",fontSize:9.5,color:MUTED,marginTop:3},detailGrid:{flexDirection:"row",flexWrap:"wrap",gap:9},detail:{width:"48%",minHeight:67,padding:11,borderRadius:12,borderWidth:1,borderColor:BORDER,backgroundColor:WHITE},detailLabel:{fontFamily:"DMSans_700Bold",fontSize:8,letterSpacing:.4,color:MUTED,textTransform:"uppercase"},detailValue:{fontFamily:"DMSans_600SemiBold",fontSize:10.5,color:GREEN,marginTop:5},textBlock:{marginTop:9,padding:12,borderRadius:12,borderWidth:1,borderColor:BORDER,backgroundColor:WHITE},textBlockText:{fontFamily:"DMSans_400Regular",fontSize:11,lineHeight:17,color:TEXT,marginTop:5},detailActions:{marginTop:15,gap:8},detailActionButton:{minHeight:45,borderRadius:12,backgroundColor:MINT,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},detailActionText:{fontFamily:"DMSans_700Bold",fontSize:10.5,color:GREEN},detailActionWhite:{fontFamily:"DMSans_700Bold",fontSize:10.5,color:WHITE},modalButtons:{flexDirection:"row",gap:9,marginTop:20},modalOverlay:{flex:1,backgroundColor:"rgba(4,20,14,.58)",alignItems:"center",justifyContent:"center",padding:22},confirmCard:{width:"100%",maxWidth:380,backgroundColor:CREAM,borderRadius:24,padding:22,alignItems:"center"},confirmIcon:{width:58,height:58,borderRadius:20,backgroundColor:MINT,alignItems:"center",justifyContent:"center"},confirmTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:22,color:GREEN,textAlign:"center",marginTop:14},confirmMessage:{fontFamily:"DMSans_400Regular",fontSize:12,lineHeight:18,color:MUTED,textAlign:"center",marginTop:7},noticeButton:{width:"100%",minHeight:47,borderRadius:12,backgroundColor:GREEN,alignItems:"center",justifyContent:"center",marginTop:20}
});
