import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
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
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE_URL } from "../../services/api";

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
const INFO = "#397A9A";
const INFO_LIGHT = "#EDF7FC";

const DAYS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
const DURATIONS = [15,20,30,45,60];

type Availability = {
  id: number | string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  appointmentMode: "ONLINE" | "OFFLINE" | string;
  active: boolean;
};

type BlockedSlot = {
  id: number | string;
  blockedDate: string;
  startTime?: string | null;
  endTime?: string | null;
  fullDay: boolean;
  reason?: string | null;
  active?: boolean;
};

type Notice = {
  visible: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
};

type ConfirmState = {
  visible: boolean;
  kind: "delete" | "unblock" | "logout" | "";
  id?: number | string;
};

const MENU = [
  ["grid-outline","Dashboard","/doctor/dashboard","MAIN"],
  ["people-outline","Patients","/doctor/patients","MAIN"],
  ["calendar-outline","Appointment Calendar","/doctor/calendar","MAIN"],
  ["calendar-number-outline","Upcoming Schedule","/doctor/schedule","MAIN"],
  ["time-outline","Manage Availability","/doctor/availability","MAIN"],
  ["clipboard-outline","Appointment Details","/doctor/appointments","CLINICAL","OFFLINE"],
  ["videocam-outline","Consultation Details","/doctor/consultations","CLINICAL","ONLINE"],
  ["card-outline","Transactions","/doctor/transactions","FINANCE"],
  ["person-circle-outline","My Profile","/doctor/profile","FINANCE"],
] as const;

export default function DoctorAvailabilityScreen() {
  const [dmLoaded] = useDMSans({DMSans_400Regular,DMSans_500Medium,DMSans_700Bold});
  const [playfairLoaded] = usePlayfair({PlayfairDisplay_600SemiBold,PlayfairDisplay_700Bold});

  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [creating,setCreating] = useState(false);
  const [blocking,setBlocking] = useState(false);
  const [menuOpen,setMenuOpen] = useState(false);
  const [formOpen,setFormOpen] = useState(false);
  const [blockOpen,setBlockOpen] = useState(false);

  const [doctorId,setDoctorId] = useState<number|null>(null);
  const [doctorName,setDoctorName] = useState("Doctor");
  const [specialization,setSpecialization] = useState("Manage availability and blocked slots");

  const [availability,setAvailability] = useState<Availability[]>([]);
  const [blockedSlots,setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [hasOnline,setHasOnline] = useState<boolean|null>(null);
  const [hasOffline,setHasOffline] = useState<boolean|null>(null);

  const [day,setDay] = useState("");
  const [startTime,setStartTime] = useState("");
  const [endTime,setEndTime] = useState("");
  const [duration,setDuration] = useState<number|null>(30);
  const [mode,setMode] = useState<"OFFLINE"|"ONLINE">("OFFLINE");
  const [active,setActive] = useState(true);

  const [blockedDate,setBlockedDate] = useState(formatDateKey(new Date()));
  const [fullDay,setFullDay] = useState(false);
  const [blockStart,setBlockStart] = useState("");
  const [blockEnd,setBlockEnd] = useState("");
  const [reason,setReason] = useState("");

  const [picker,setPicker] = useState<null|"start"|"end"|"blockStart"|"blockEnd"|"date">(null);
  const [choice,setChoice] = useState<null|"day"|"duration">(null);

  const [notice,setNotice] = useState<Notice>({visible:false,type:"info",title:"",message:""});
  const [confirm,setConfirm] = useState<ConfirmState>({visible:false,kind:""});

  const initial = useMemo(() => doctorName.replace(/^Dr\.?\s*/i,"").trim().charAt(0).toUpperCase() || "D",[doctorName]);

  async function getToken(){
    return (await AsyncStorage.getItem("doctorToken")) ||
      (await AsyncStorage.getItem("token")) ||
      (await AsyncStorage.getItem("accessToken")) || "";
  }

  async function clearSession(){
    await AsyncStorage.multiRemove([
      "doctorToken","doctorRefreshToken","token","refreshToken","accessToken",
      "role","doctorId","doctor","doctorName","doctorSpecialization",
      "doctorHasOnline","doctorHasOffline","isLoggedIn","profileCompleted"
    ]);
  }

  async function api(endpoint:string, options:RequestInit={}){
    const token = await getToken();
    if(!token){
      await clearSession();
      router.replace("/login" as any);
      throw new Error("Doctor login required.");
    }

    const headers:Record<string,string> = {
      Accept:"application/json",
      Authorization:`Bearer ${token}`,
      ...(options.headers as Record<string,string> || {})
    };
    if(options.body) headers["Content-Type"]="application/json";

    const response = await fetch(`${API_BASE_URL}${endpoint}`,{...options,headers});
    const text = await response.text();
    let result:any = {};
    try{ result = text ? JSON.parse(text) : {}; }
    catch{ result={success:false,message:text || `HTTP ${response.status}`}; }

    if(response.status===401){
      await clearSession();
      router.replace("/login" as any);
      throw new Error(result?.message || "Session expired.");
    }
    if(!response.ok || result?.success===false){
      throw new Error(result?.message || `Request failed (${response.status}).`);
    }
    return result;
  }

  function showNotice(type:Notice["type"],title:string,message:string){
    setNotice({visible:true,type,title,message});
  }

  async function validateDoctor(){
    const role = String(await AsyncStorage.getItem("role") || "")
      .replace(/^ROLE_/i,"").toUpperCase();
    const token = await getToken();
    if(!token || (role && role!=="DOCTOR")){
      await clearSession();
      router.replace("/login" as any);
      return false;
    }
    return true;
  }

  async function loadProfile(){
    const storedName = await AsyncStorage.getItem("doctorName") || "Doctor";
    const storedSpecialization = await AsyncStorage.getItem("doctorSpecialization") || "Manage availability and blocked slots";
    setDoctorName(storedName);
    setSpecialization(storedSpecialization);

    const result = await api("/doctors/my-profile");
    const doctor = result?.data || {};
    const id = Number(doctor.id ?? doctor.doctorId ?? await AsyncStorage.getItem("doctorId")) || null;
    const name = doctor.name || doctor.doctorName || storedName;
    const spec = doctor.specialization || doctor.qualification || storedSpecialization;

    setDoctorId(id); setDoctorName(name); setSpecialization(spec);
    const pairs:[string,string][] = [["doctorName",name],["doctorSpecialization",spec],["doctor",JSON.stringify(doctor)]];
    if(id) pairs.push(["doctorId",String(id)]);
    await AsyncStorage.multiSet(pairs);
    return id;
  }

  async function resolveDoctorId(){
    if(doctorId) return doctorId;
    const stored = Number(await AsyncStorage.getItem("doctorId")) || null;
    if(stored){ setDoctorId(stored); return stored; }
    return await loadProfile();
  }

  function extractArray(result:any){
    if(Array.isArray(result)) return result;
    if(Array.isArray(result?.data)) return result.data;
    if(Array.isArray(result?.data?.content)) return result.data.content;
    if(Array.isArray(result?.data?.slots)) return result.data.slots;
    return [];
  }

  async function loadAvailability(id?:number|null){
    const did = id || await resolveDoctorId();
    if(!did) throw new Error("Doctor profile ID could not be identified.");
    const result = await api(`/doctor-availability/doctor/${did}`);
    const records = extractArray(result) as Availability[];
    const order:any={MONDAY:1,TUESDAY:2,WEDNESDAY:3,THURSDAY:4,FRIDAY:5,SATURDAY:6,SUNDAY:7};
    records.sort((a,b)=>(order[a.dayOfWeek]||99)-(order[b.dayOfWeek]||99) || String(a.startTime||"").localeCompare(String(b.startTime||"")));
    setAvailability(records);

    const enabled=records.filter(x=>x && x.active!==false);
    const online=enabled.some(x=>String(x.appointmentMode||"").toUpperCase()==="ONLINE");
    const offline=enabled.some(x=>String(x.appointmentMode||"").toUpperCase()==="OFFLINE");

    if(!online && !offline){
      setHasOnline(null); setHasOffline(null);
      await AsyncStorage.multiRemove(["doctorHasOnline","doctorHasOffline"]);
    }else{
      setHasOnline(online); setHasOffline(offline);
      await AsyncStorage.multiSet([["doctorHasOnline",String(online)],["doctorHasOffline",String(offline)]]);
    }
  }

  async function loadBlocked(id?:number|null){
    const did = id || await resolveDoctorId();
    if(!did) throw new Error("Doctor profile ID could not be identified.");
    const result = await api(`/doctor-availability/blocked/doctor/${did}`);
    const records=(extractArray(result) as BlockedSlot[])
      .filter(x=>x.active!==false)
      .sort((a,b)=>String(a.blockedDate||"").localeCompare(String(b.blockedDate||"")) || String(a.startTime||"").localeCompare(String(b.startTime||"")));
    setBlockedSlots(records);
  }

  async function loadPage(initialLoad=false){
    try{
      if(initialLoad) setLoading(true);
      const ok=await validateDoctor(); if(!ok) return;
      const id=await loadProfile();
      await Promise.all([loadAvailability(id),loadBlocked(id)]);
    }catch(e:any){
      showNotice("error","Unable to Load",e?.message || "Unable to load doctor availability.");
    }finally{
      setLoading(false); setRefreshing(false);
    }
  }

  useEffect(()=>{ loadPage(true); },[]);

  async function refresh(){
    setRefreshing(true);
    await loadPage(false);
  }

  function resetAvailability(){
    setDay(""); setStartTime(""); setEndTime(""); setDuration(30); setMode("OFFLINE"); setActive(true);
  }

  async function createAvailability(){
    if(!day || !startTime || !endTime || !duration || !mode){
      showNotice("error","Incomplete Availability","Please complete all availability fields.");
      return;
    }
    if(startTime>=endTime){
      showNotice("error","Invalid Time","End time must be later than start time.");
      return;
    }
    const id=await resolveDoctorId();
    if(!id){
      showNotice("error","Doctor Profile Missing","Doctor profile ID could not be identified.");
      return;
    }

    try{
      setCreating(true);
      const result=await api("/doctor-availability/create",{
        method:"POST",
        body:JSON.stringify({
          doctorId:id,
          dayOfWeek:day,
          startTime:normalizeApiTime(startTime),
          endTime:normalizeApiTime(endTime),
          slotDurationMinutes:duration,
          appointmentMode:mode,
          active
        })
      });
      showNotice("success","Availability Created",result?.message || "Availability created successfully.");
      resetAvailability();
      setFormOpen(false);
      await loadAvailability(id);
    }catch(e:any){
      showNotice("error","Unable to Create",e?.message || "Unable to create availability.");
    }finally{ setCreating(false); }
  }

  async function deleteAvailability(id:number|string){
    try{
      const result=await api(`/doctor-availability/delete/${id}`,{method:"DELETE"});
      showNotice("success","Availability Deleted",result?.message || "Availability deleted successfully.");
      await loadAvailability();
    }catch(e:any){
      showNotice("error","Unable to Delete",e?.message || "Unable to delete availability.");
    }
  }

  function resetBlock(){
    setBlockedDate(formatDateKey(new Date()));
    setFullDay(false); setBlockStart(""); setBlockEnd(""); setReason("");
  }

  async function blockSlot(){
    if(!blockedDate){
      showNotice("error","Date Required","Please select a blocked date.");
      return;
    }
    if(!fullDay && (!blockStart || !blockEnd)){
      showNotice("error","Time Required","Please select start and end time.");
      return;
    }
    if(!fullDay && blockStart>=blockEnd){
      showNotice("error","Invalid Time","End time must be later than start time.");
      return;
    }

    try{
      setBlocking(true);
      const result=await api("/doctor-availability/block-slot",{
        method:"POST",
        body:JSON.stringify({
          blockedDate,
          startTime:fullDay ? null : normalizeApiTime(blockStart),
          endTime:fullDay ? null : normalizeApiTime(blockEnd),
          fullDay,
          reason:reason.trim() || null
        })
      });
      showNotice("success","Slot Blocked",result?.message || "Slot blocked successfully.");
      resetBlock(); setBlockOpen(false);
      await loadBlocked();
    }catch(e:any){
      showNotice("error","Unable to Block",e?.message || "Unable to block slot.");
    }finally{ setBlocking(false); }
  }

  async function unblockSlot(id:number|string){
    try{
      const result=await api(`/doctor-availability/unblock/${id}`,{method:"DELETE"});
      showNotice("success","Slot Unblocked",result?.message || "Slot unblocked successfully.");
      await loadBlocked();
    }catch(e:any){
      showNotice("error","Unable to Unblock",e?.message || "Unable to unblock slot.");
    }
  }

  async function performConfirm(){
    const c=confirm;
    setConfirm({visible:false,kind:""});
    if(c.kind==="delete" && c.id!=null) await deleteAvailability(c.id);
    if(c.kind==="unblock" && c.id!=null) await unblockSlot(c.id);
    if(c.kind==="logout"){
      await clearSession();
      router.replace("/login" as any);
    }
  }

  const visibleMenu=MENU.filter(item=>{
    if(item[4]==="ONLINE" && hasOnline===false) return false;
    if(item[4]==="OFFLINE" && hasOffline===false) return false;
    return true;
  });

  if(!dmLoaded || !playfairLoaded || loading){
    return <View style={s.loader}><ActivityIndicator size="large" color={GREEN}/><Text style={s.loaderText}>Loading availability...</Text></View>;
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerIcon} onPress={()=>setMenuOpen(true)}><Ionicons name="menu-outline" size={25} color={GREEN}/></TouchableOpacity>
        <View style={{flex:1}}>
          <Text style={s.eyebrow}>DOCTOR PORTAL</Text>
          <Text style={s.headerTitle}>Manage Availability</Text>
        </View>
        <TouchableOpacity style={s.headerIcon} onPress={()=>router.replace("/doctor/dashboard" as any)}><Ionicons name="grid-outline" size={20} color={GREEN}/></TouchableOpacity>
        <TouchableOpacity style={s.avatar} onPress={()=>router.push("/doctor/profile" as any)}><Text style={s.avatarText}>{initial}</Text></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={GREEN} colors={[GREEN]}/>} contentContainerStyle={{paddingBottom:36}}>
        <View style={s.hero}>
          <View style={s.heroBubble}/>
          <View style={s.heroBadge}><Ionicons name="calendar-outline" size={14} color={GOLD_LIGHT}/><Text style={s.heroBadgeText}>DOCTOR AVAILABILITY</Text></View>
          <Text style={s.heroTitle}>Plan your working{"\n"}<Text style={{color:GOLD_LIGHT}}>hours with ease.</Text></Text>
          <Text style={s.heroText}>Create recurring weekly availability and temporarily block dates or time ranges when you are unavailable.</Text>
        </View>

        <View style={s.doctorCard}>
          <View style={s.doctorAvatar}><Text style={s.doctorAvatarText}>{initial}</Text></View>
          <View style={{flex:1}}>
            <Text style={s.doctorName}>{doctorName}</Text>
            <Text style={s.doctorSpec}>{specialization}</Text>
          </View>
          <View style={s.liveBadge}><View style={s.liveDot}/><Text style={s.liveText}>LIVE</Text></View>
        </View>

        <View style={s.summaryRow}>
          <MiniStat icon="calendar-clear-outline" label="Weekly Slots" value={String(availability.length)}/>
          <MiniStat icon="ban-outline" label="Blocked" value={String(blockedSlots.length)}/>
          <MiniStat icon="videocam-outline" label="Online" value={hasOnline===null?"—":hasOnline?"Yes":"No"}/>
        </View>

        <View style={s.actionGrid}>
          <TouchableOpacity style={s.actionCard} onPress={()=>setFormOpen(true)}>
            <View style={[s.actionIcon,{backgroundColor:MINT}]}><Ionicons name="add" size={23} color={GREEN}/></View>
            <Text style={s.actionTitle}>Create Availability</Text>
            <Text style={s.actionText}>Add weekly working hours and booking mode.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionCard} onPress={()=>setBlockOpen(true)}>
            <View style={[s.actionIcon,{backgroundColor:DANGER_LIGHT}]}><Ionicons name="calendar-clear-outline" size={22} color={DANGER}/></View>
            <Text style={s.actionTitle}>Block a Slot</Text>
            <Text style={s.actionText}>Block a full day or a specific time range.</Text>
          </TouchableOpacity>
        </View>

        <SectionHeader eyebrow="WEEKLY WORKING HOURS" title="My Availability" onRefresh={()=>loadAvailability()}/>
        <View style={s.list}>
          {availability.length===0 ? <Empty icon="calendar-outline" title="No availability yet" text="Create your weekly working schedule so patients can book available slots."/> :
            availability.map(item=>(
              <View key={String(item.id)} style={s.slotCard}>
                <View style={s.slotIcon}><Ionicons name="calendar-outline" size={20} color={GREEN}/></View>
                <View style={{flex:1}}>
                  <Text style={s.slotTitle}>{formatLabel(item.dayOfWeek)}</Text>
                  <Text style={s.slotTime}>{formatTime(item.startTime)} - {formatTime(item.endTime)}</Text>
                  <View style={s.pills}>
                    <Pill text={item.active===false?"Inactive":"Available"} kind={item.active===false?"muted":"success"}/>
                    <Pill text={`${item.slotDurationMinutes || 0} min`} kind="muted"/>
                    <Pill text={formatLabel(item.appointmentMode)} kind={item.appointmentMode==="ONLINE"?"info":"gold"}/>
                  </View>
                </View>
                <TouchableOpacity style={s.deleteBtn} onPress={()=>setConfirm({visible:true,kind:"delete",id:item.id})}><Ionicons name="trash-outline" size={18} color={DANGER}/></TouchableOpacity>
              </View>
            ))
          }
        </View>

        <SectionHeader eyebrow="TEMPORARY UNAVAILABILITY" title="My Blocked Slots" onRefresh={()=>loadBlocked()}/>
        <View style={s.list}>
          {blockedSlots.length===0 ? <Empty icon="calendar-check-outline" title="No active blocked slots" text="Your schedule currently has no temporary blocked dates or time ranges."/> :
            blockedSlots.map(item=>(
              <View key={String(item.id)} style={s.slotCard}>
                <View style={[s.slotIcon,{backgroundColor:DANGER_LIGHT}]}><Ionicons name="ban-outline" size={20} color={DANGER}/></View>
                <View style={{flex:1}}>
                  <Text style={s.slotTitle}>{formatDate(item.blockedDate)}</Text>
                  <Text style={s.slotTime}>{item.fullDay ? "Full day" : `${formatTime(item.startTime)} - ${formatTime(item.endTime)}`}</Text>
                  {!!item.reason && <Text style={s.reason}>{item.reason}</Text>}
                  <View style={s.pills}><Pill text="Blocked" kind="danger"/>{item.fullDay && <Pill text="Full Day" kind="gold"/>}</View>
                  <TouchableOpacity style={s.unblockBtn} onPress={()=>setConfirm({visible:true,kind:"unblock",id:item.id})}>
                    <Ionicons name="lock-open-outline" size={16} color={DANGER}/><Text style={s.unblockText}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          }
        </View>
      </ScrollView>

      {/* DRAWER */}
      <Modal visible={menuOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={()=>setMenuOpen(false)}>
        <View style={s.drawerRoot}>
          <Pressable style={s.backdrop} onPress={()=>setMenuOpen(false)}/>
          <View style={s.drawer}>
            <View style={s.drawerBrand}>
              <View style={s.brandIcon}><Ionicons name="medical" size={25} color={GOLD}/></View>
              <View style={{flex:1}}><Text style={s.brandTitle}>NeoLife</Text><Text style={s.brandSub}>DOCTOR PORTAL</Text></View>
              <TouchableOpacity style={s.drawerClose} onPress={()=>setMenuOpen(false)}><Ionicons name="close" size={22} color={GREEN}/></TouchableOpacity>
            </View>
            <View style={s.drawerDoctor}>
              <View style={s.drawerAvatar}><Text style={s.drawerAvatarText}>{initial}</Text></View>
              <View style={{flex:1}}><Text numberOfLines={1} style={s.drawerName}>{doctorName}</Text><Text style={s.drawerRole}>Doctor</Text></View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(["MAIN","CLINICAL","FINANCE"] as const).map(section=>{
                const items=visibleMenu.filter(x=>x[3]===section);
                if(!items.length) return null;
                return <View key={section} style={{marginTop:13}}>
                  <Text style={s.menuLabel}>{section}</Text>
                  {items.map(item=>{
                    const current=item[1]==="Manage Availability";
                    return <TouchableOpacity key={item[1]} style={[s.menuItem,current&&s.menuItemActive]} onPress={()=>{
                      setMenuOpen(false);
                      if(!current) router.push(item[2] as any);
                    }}>
                      <View style={[s.menuItemIcon,current&&{backgroundColor:MINT}]}><Ionicons name={item[0] as any} size={19} color={current?GREEN:GOLD}/></View>
                      <Text style={[s.menuItemText,current&&{color:GREEN}]}>{item[1]}</Text>
                      <Ionicons name="chevron-forward" size={15} color={current?GREEN:"#AFC0B6"}/>
                    </TouchableOpacity>
                  })}
                </View>
              })}
            </ScrollView>
            <TouchableOpacity style={s.logout} onPress={()=>{setMenuOpen(false);setConfirm({visible:true,kind:"logout"})}}>
              <Ionicons name="log-out-outline" size={19} color={WHITE}/><Text style={s.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CREATE AVAILABILITY */}
      <BottomSheet visible={formOpen} onClose={()=>setFormOpen(false)} eyebrow="WEEKLY SCHEDULE" title="Create Availability">
        <FieldLabel text="DAY OF WEEK"/>
        <TouchableOpacity style={s.input} onPress={()=>setChoice("day")}><Ionicons name="calendar-outline" size={18} color={GOLD_DARK}/><Text style={s.inputText}>{day?formatLabel(day):"Select day"}</Text><Ionicons name="chevron-down" size={17} color={MUTED}/></TouchableOpacity>

        <View style={s.twoCol}>
          <View style={{flex:1}}><FieldLabel text="START TIME"/><TimeButton value={startTime} placeholder="Start" onPress={()=>setPicker("start")}/></View>
          <View style={{flex:1}}><FieldLabel text="END TIME"/><TimeButton value={endTime} placeholder="End" onPress={()=>setPicker("end")}/></View>
        </View>

        <FieldLabel text="SLOT DURATION"/>
        <TouchableOpacity style={s.input} onPress={()=>setChoice("duration")}><Ionicons name="hourglass-outline" size={18} color={GOLD_DARK}/><Text style={s.inputText}>{duration?`${duration} minutes`:"Select duration"}</Text><Ionicons name="chevron-down" size={17} color={MUTED}/></TouchableOpacity>

        <FieldLabel text="APPOINTMENT MODE"/>
        <View style={s.segment}>
          {(["OFFLINE","ONLINE"] as const).map(x=><TouchableOpacity key={x} style={[s.segmentBtn,mode===x&&s.segmentActive]} onPress={()=>setMode(x)}><Ionicons name={x==="ONLINE"?"videocam-outline":"business-outline"} size={16} color={mode===x?WHITE:GREEN}/><Text style={[s.segmentText,mode===x&&{color:WHITE}]}>{formatLabel(x)}</Text></TouchableOpacity>)}
        </View>

        <View style={s.switchRow}><View style={{flex:1}}><Text style={s.switchTitle}>Active Availability</Text><Text style={s.switchText}>Patients can book this weekly schedule.</Text></View><Switch value={active} onValueChange={setActive} trackColor={{false:"#D5DAD7",true:"#A9CABB"}} thumbColor={active?GREEN:WHITE}/></View>

        <View style={s.note}><Ionicons name="information-circle-outline" size={18} color={GOLD_DARK}/><Text style={s.noteText}>Example: Monday 9:00 AM to 1:00 PM with 30-minute duration creates recurring bookable slots.</Text></View>

        <View style={s.sheetActions}>
          <TouchableOpacity style={s.secondary} onPress={resetAvailability}><Text style={s.secondaryText}>Clear</Text></TouchableOpacity>
          <TouchableOpacity disabled={creating} style={s.primary} onPress={createAvailability}>{creating?<ActivityIndicator color={WHITE}/>:<><Ionicons name="add" size={18} color={WHITE}/><Text style={s.primaryText}>Create</Text></>}</TouchableOpacity>
        </View>
      </BottomSheet>

      {/* BLOCK SLOT */}
      <BottomSheet visible={blockOpen} onClose={()=>setBlockOpen(false)} eyebrow="TEMPORARY BLOCK" title="Block a Slot">
        <FieldLabel text="BLOCKED DATE"/>
        <TouchableOpacity style={s.input} onPress={()=>setPicker("date")}><Ionicons name="calendar-outline" size={18} color={GOLD_DARK}/><Text style={s.inputText}>{formatDate(blockedDate)}</Text><Ionicons name="chevron-forward" size={17} color={MUTED}/></TouchableOpacity>

        <TouchableOpacity style={s.checkRow} onPress={()=>{setFullDay(v=>!v);setBlockStart("");setBlockEnd("")}}>
          <View style={[s.checkbox,fullDay&&s.checkboxActive]}>{fullDay&&<Ionicons name="checkmark" size={15} color={WHITE}/>}</View>
          <View style={{flex:1}}><Text style={s.switchTitle}>Block the complete day</Text><Text style={s.switchText}>No start or end time required.</Text></View>
        </TouchableOpacity>

        {!fullDay && <View style={s.twoCol}>
          <View style={{flex:1}}><FieldLabel text="START TIME"/><TimeButton value={blockStart} placeholder="Start" onPress={()=>setPicker("blockStart")}/></View>
          <View style={{flex:1}}><FieldLabel text="END TIME"/><TimeButton value={blockEnd} placeholder="End" onPress={()=>setPicker("blockEnd")}/></View>
        </View>}

        <FieldLabel text="REASON"/>
        <TextInput value={reason} onChangeText={setReason} maxLength={500} multiline placeholder="Medical conference, leave or emergency" placeholderTextColor="#9AA59E" style={s.textArea}/>

        <View style={s.sheetActions}>
          <TouchableOpacity style={s.secondary} onPress={resetBlock}><Text style={s.secondaryText}>Clear</Text></TouchableOpacity>
          <TouchableOpacity disabled={blocking} style={[s.primary,{backgroundColor:DANGER}]} onPress={blockSlot}>{blocking?<ActivityIndicator color={WHITE}/>:<><Ionicons name="calendar-clear-outline" size={18} color={WHITE}/><Text style={s.primaryText}>Block Slot</Text></>}</TouchableOpacity>
        </View>
      </BottomSheet>

      {/* CHOICE MODAL */}
      <Modal visible={choice!==null} transparent animationType="fade" statusBarTranslucent onRequestClose={()=>setChoice(null)}>
        <View style={s.centerRoot}><Pressable style={s.backdrop} onPress={()=>setChoice(null)}/><View style={s.choiceCard}>
          <Text style={s.choiceTitle}>{choice==="day"?"Select Day":"Slot Duration"}</Text>
          {(choice==="day"?DAYS:DURATIONS).map((x:any)=><TouchableOpacity key={String(x)} style={s.choiceItem} onPress={()=>{
            if(choice==="day") setDay(String(x)); else setDuration(Number(x));
            setChoice(null);
          }}><Text style={s.choiceText}>{choice==="day"?formatLabel(String(x)):`${x} minutes`}</Text><Ionicons name="chevron-forward" size={16} color={GOLD_DARK}/></TouchableOpacity>)}
        </View></View>
      </Modal>

      {/* DATE / TIME PICKER */}
      {picker && <DateTimePicker
        value={picker==="date" ? parseDate(blockedDate) : timeToDate(
          picker==="start"?startTime:picker==="end"?endTime:picker==="blockStart"?blockStart:blockEnd
        )}
        mode={picker==="date"?"date":"time"}
        minimumDate={picker==="date"?startOfToday():undefined}
        display={Platform.OS==="android"?(picker==="date"?"calendar":"clock"):"spinner"}
        onChange={(event,value)=>{
          if(Platform.OS==="android") setPicker(null);
          if(event.type==="dismissed" || !value) return;
          if(picker==="date") setBlockedDate(formatDateKey(value));
          else {
            const t=formatTimeKey(value);
            if(picker==="start") setStartTime(t);
            if(picker==="end") setEndTime(t);
            if(picker==="blockStart") setBlockStart(t);
            if(picker==="blockEnd") setBlockEnd(t);
          }
        }}
      />}

      {/* CONFIRM */}
      <Modal visible={confirm.visible} transparent animationType="fade" statusBarTranslucent onRequestClose={()=>setConfirm({visible:false,kind:""})}>
        <View style={s.centerRoot}><Pressable style={s.backdrop} onPress={()=>setConfirm({visible:false,kind:""})}/><View style={s.confirmCard}>
          <View style={[s.confirmIcon,{backgroundColor:confirm.kind==="logout"?MINT:DANGER_LIGHT}]}><Ionicons name={confirm.kind==="logout"?"log-out-outline":confirm.kind==="unblock"?"lock-open-outline":"trash-outline"} size={30} color={confirm.kind==="logout"?GREEN:DANGER}/></View>
          <Text style={s.modalEyebrow}>NEOLIFE DOCTOR PORTAL</Text>
          <Text style={s.modalTitle}>{confirm.kind==="logout"?"Log Out?":confirm.kind==="unblock"?"Unblock Slot?":"Delete Availability?"}</Text>
          <Text style={s.modalText}>{confirm.kind==="logout"?"Are you sure you want to leave your doctor workspace?":confirm.kind==="unblock"?"This blocked time will become available again according to your weekly schedule.":"This weekly availability will be removed and patients will no longer be able to book it."}</Text>
          <View style={s.confirmActions}><TouchableOpacity style={s.secondary} onPress={()=>setConfirm({visible:false,kind:""})}><Text style={s.secondaryText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[s.primary,{backgroundColor:confirm.kind==="logout"?GREEN:DANGER}]} onPress={performConfirm}><Text style={s.primaryText}>{confirm.kind==="logout"?"Log Out":"Confirm"}</Text></TouchableOpacity></View>
        </View></View>
      </Modal>

      {/* NOTICE */}
      <Modal visible={notice.visible} transparent animationType="fade" statusBarTranslucent onRequestClose={()=>setNotice(v=>({...v,visible:false}))}>
        <View style={s.centerRoot}><Pressable style={s.backdrop} onPress={()=>setNotice(v=>({...v,visible:false}))}/><View style={s.confirmCard}>
          <View style={[s.confirmIcon,{backgroundColor:notice.type==="success"?SUCCESS_LIGHT:notice.type==="error"?DANGER_LIGHT:INFO_LIGHT}]}><Ionicons name={notice.type==="success"?"checkmark-circle-outline":notice.type==="error"?"close-circle-outline":"information-circle-outline"} size={32} color={notice.type==="success"?SUCCESS:notice.type==="error"?DANGER:INFO}/></View>
          <Text style={s.modalEyebrow}>NEOLIFE DOCTOR PORTAL</Text><Text style={s.modalTitle}>{notice.title}</Text><Text style={s.modalText}>{notice.message}</Text>
          <TouchableOpacity style={[s.primary,{width:"100%",marginTop:18,backgroundColor:GOLD}]} onPress={()=>setNotice(v=>({...v,visible:false}))}><Text style={[s.primaryText,{color:GREEN}]}>Okay</Text><Ionicons name="checkmark" size={18} color={GREEN}/></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

function BottomSheet({visible,onClose,eyebrow,title,children}:{visible:boolean;onClose:()=>void;eyebrow:string;title:string;children:React.ReactNode}){
  return <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
    <View style={s.sheetRoot}><Pressable style={s.backdrop} onPress={onClose}/><View style={s.sheet}>
      <View style={s.handle}/><View style={s.sheetHeader}><View style={{flex:1}}><Text style={s.eyebrow}>{eyebrow}</Text><Text style={s.sheetTitle}>{title}</Text></View><TouchableOpacity style={s.sheetClose} onPress={onClose}><Ionicons name="close" size={21} color={GREEN}/></TouchableOpacity></View>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </View></View>
  </Modal>
}

function FieldLabel({text}:{text:string}){return <Text style={s.fieldLabel}>{text}</Text>}

function TimeButton({value,placeholder,onPress}:{value:string;placeholder:string;onPress:()=>void}){
  return <TouchableOpacity style={s.input} onPress={onPress}><Ionicons name="time-outline" size={18} color={GOLD_DARK}/><Text style={s.inputText}>{value?formatTime(value):placeholder}</Text></TouchableOpacity>
}

function SectionHeader({eyebrow,title,onRefresh}:{eyebrow:string;title:string;onRefresh:()=>void}){
  return <View style={s.sectionHeader}><View style={{flex:1}}><Text style={s.eyebrow}>{eyebrow}</Text><Text style={s.sectionTitle}>{title}</Text></View><TouchableOpacity style={s.refreshBtn} onPress={onRefresh}><Ionicons name="refresh-outline" size={18} color={GREEN}/></TouchableOpacity></View>
}

function MiniStat({icon,label,value}:{icon:any;label:string;value:string}){
  return <View style={s.miniStat}><View style={s.miniIcon}><Ionicons name={icon} size={18} color={GREEN}/></View><Text style={s.miniValue}>{value}</Text><Text style={s.miniLabel}>{label}</Text></View>
}

function Pill({text,kind}:{text:string;kind:"success"|"danger"|"muted"|"info"|"gold"}){
  const bg=kind==="success"?SUCCESS_LIGHT:kind==="danger"?DANGER_LIGHT:kind==="info"?INFO_LIGHT:kind==="gold"?"#FFF6E1":"#F0F2F0";
  const color=kind==="success"?SUCCESS:kind==="danger"?DANGER:kind==="info"?INFO:kind==="gold"?GOLD_DARK:MUTED;
  return <View style={[s.pill,{backgroundColor:bg}]}><Text style={[s.pillText,{color}]}>{text}</Text></View>
}

function Empty({icon,title,text}:{icon:any;title:string;text:string}){
  return <View style={s.empty}><View style={s.emptyIcon}><Ionicons name={icon} size={27} color={GREEN}/></View><Text style={s.emptyTitle}>{title}</Text><Text style={s.emptyText}>{text}</Text></View>
}

function normalizeApiTime(v:string){return !v?null:v.length===5?`${v}:00`:v}
function formatLabel(v:string){return String(v||"-").replace(/_/g," ").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())}
function formatTime(v?:string|null){
  if(!v)return "-"; const p=String(v).split(":"); let h=Number(p[0]); const m=p[1]||"00"; const ap=h>=12?"PM":"AM"; h=h%12||12; return `${h}:${m} ${ap}`;
}
function formatDate(v?:string|null){
  if(!v)return "-"; const p=String(v).substring(0,10).split("-").map(Number); if(p.length!==3)return String(v);
  return new Date(p[0],p[1]-1,p[2]).toLocaleDateString("en-IN",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});
}
function formatDateKey(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function formatTimeKey(d:Date){return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`}
function parseDate(v:string){const p=v.split("-").map(Number);return new Date(p[0],p[1]-1,p[2])}
function startOfToday(){const d=new Date();d.setHours(0,0,0,0);return d}
function timeToDate(v:string){const d=new Date(); if(v){const p=v.split(":").map(Number);d.setHours(p[0]||0,p[1]||0,0,0)} return d}

const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:CREAM},
  loader:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:CREAM},
  loaderText:{marginTop:10,fontFamily:"DMSans_500Medium",fontSize:11,color:MUTED},
  header:{minHeight:75,paddingTop:Platform.OS==="web"?12:43,paddingBottom:11,paddingHorizontal:14,flexDirection:"row",alignItems:"center",gap:9,backgroundColor:WHITE,borderBottomWidth:1,borderBottomColor:BORDER},
  headerIcon:{width:43,height:43,borderRadius:15,alignItems:"center",justifyContent:"center",backgroundColor:MINT},
  eyebrow:{fontFamily:"DMSans_700Bold",fontSize:7,color:GOLD_DARK,letterSpacing:1},
  headerTitle:{marginTop:2,fontFamily:"PlayfairDisplay_700Bold",fontSize:18,color:GREEN},
  avatar:{width:43,height:43,borderRadius:15,alignItems:"center",justifyContent:"center",backgroundColor:GREEN},
  avatarText:{fontFamily:"DMSans_700Bold",fontSize:17,color:WHITE},
  hero:{overflow:"hidden",margin:15,marginBottom:0,padding:22,borderRadius:28,backgroundColor:GREEN},
  heroBubble:{position:"absolute",width:190,height:190,borderRadius:95,right:-70,top:-100,backgroundColor:"rgba(255,255,255,.06)"},
  heroBadge:{alignSelf:"flex-start",paddingHorizontal:10,paddingVertical:7,borderRadius:20,flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"rgba(255,255,255,.09)"},
  heroBadgeText:{fontFamily:"DMSans_700Bold",fontSize:7.5,color:GOLD_LIGHT,letterSpacing:1},
  heroTitle:{marginTop:16,fontFamily:"PlayfairDisplay_700Bold",fontSize:27,lineHeight:33,color:WHITE},
  heroText:{marginTop:9,fontFamily:"DMSans_400Regular",fontSize:10,lineHeight:17,color:"#D3E1D8"},
  doctorCard:{margin:15,marginBottom:0,padding:13,borderRadius:20,flexDirection:"row",alignItems:"center",gap:10,backgroundColor:WHITE,borderWidth:1,borderColor:BORDER},
  doctorAvatar:{width:48,height:48,borderRadius:15,alignItems:"center",justifyContent:"center",backgroundColor:GOLD},
  doctorAvatarText:{fontFamily:"DMSans_700Bold",fontSize:17,color:GREEN},
  doctorName:{fontFamily:"PlayfairDisplay_700Bold",fontSize:16,color:GREEN},
  doctorSpec:{marginTop:2,fontFamily:"DMSans_400Regular",fontSize:7.5,color:MUTED},
  liveBadge:{paddingHorizontal:8,paddingVertical:6,borderRadius:20,flexDirection:"row",alignItems:"center",gap:4,backgroundColor:SUCCESS_LIGHT},
  liveDot:{width:6,height:6,borderRadius:3,backgroundColor:SUCCESS},
  liveText:{fontFamily:"DMSans_700Bold",fontSize:6,color:SUCCESS},
  summaryRow:{margin:15,marginBottom:0,flexDirection:"row",gap:8},
  miniStat:{flex:1,minHeight:105,padding:10,borderRadius:18,backgroundColor:WHITE,borderWidth:1,borderColor:BORDER},
  miniIcon:{width:34,height:34,borderRadius:11,alignItems:"center",justifyContent:"center",backgroundColor:MINT},
  miniValue:{marginTop:7,fontFamily:"PlayfairDisplay_700Bold",fontSize:18,color:GREEN},
  miniLabel:{marginTop:2,fontFamily:"DMSans_500Medium",fontSize:6.5,color:MUTED},
  actionGrid:{margin:15,marginBottom:0,flexDirection:"row",gap:9},
  actionCard:{flex:1,minHeight:142,padding:13,borderRadius:20,backgroundColor:WHITE,borderWidth:1,borderColor:BORDER},
  actionIcon:{width:42,height:42,borderRadius:14,alignItems:"center",justifyContent:"center"},
  actionTitle:{marginTop:10,fontFamily:"PlayfairDisplay_700Bold",fontSize:14,color:GREEN},
  actionText:{marginTop:4,fontFamily:"DMSans_400Regular",fontSize:7,lineHeight:12,color:MUTED},
  sectionHeader:{marginHorizontal:15,marginTop:22,marginBottom:9,flexDirection:"row",alignItems:"center"},
  sectionTitle:{marginTop:3,fontFamily:"PlayfairDisplay_700Bold",fontSize:21,color:GREEN},
  refreshBtn:{width:40,height:40,borderRadius:13,alignItems:"center",justifyContent:"center",backgroundColor:MINT},
  list:{marginHorizontal:15,gap:9},
  slotCard:{padding:13,borderRadius:19,flexDirection:"row",alignItems:"flex-start",gap:10,backgroundColor:WHITE,borderWidth:1,borderColor:BORDER},
  slotIcon:{width:42,height:42,borderRadius:13,alignItems:"center",justifyContent:"center",backgroundColor:MINT},
  slotTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:15,color:GREEN},
  slotTime:{marginTop:3,fontFamily:"DMSans_500Medium",fontSize:8,color:MUTED},
  reason:{marginTop:7,fontFamily:"DMSans_400Regular",fontSize:7.5,lineHeight:12,color:MUTED},
  pills:{marginTop:8,flexDirection:"row",flexWrap:"wrap",gap:5},
  pill:{paddingHorizontal:8,paddingVertical:5,borderRadius:20},
  pillText:{fontFamily:"DMSans_700Bold",fontSize:6},
  deleteBtn:{width:38,height:38,borderRadius:12,alignItems:"center",justifyContent:"center",backgroundColor:DANGER_LIGHT},
  unblockBtn:{alignSelf:"flex-start",marginTop:9,paddingHorizontal:11,minHeight:36,borderRadius:11,flexDirection:"row",alignItems:"center",gap:5,backgroundColor:DANGER_LIGHT},
  unblockText:{fontFamily:"DMSans_700Bold",fontSize:7.5,color:DANGER},
  empty:{minHeight:185,padding:22,borderRadius:20,alignItems:"center",justifyContent:"center",backgroundColor:WHITE,borderWidth:1,borderColor:BORDER},
  emptyIcon:{width:54,height:54,borderRadius:17,alignItems:"center",justifyContent:"center",backgroundColor:MINT},
  emptyTitle:{marginTop:9,fontFamily:"PlayfairDisplay_700Bold",fontSize:16,color:GREEN},
  emptyText:{marginTop:4,maxWidth:270,textAlign:"center",fontFamily:"DMSans_400Regular",fontSize:7.5,lineHeight:12,color:MUTED},
  backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(5,28,19,.72)"},
  drawerRoot:{flex:1,flexDirection:"row"},
  drawer:{width:"86%",maxWidth:350,height:"100%",paddingTop:Platform.OS==="web"?35:58,paddingHorizontal:15,paddingBottom:20,backgroundColor:GREEN},
  drawerBrand:{flexDirection:"row",alignItems:"center",gap:10},
  brandIcon:{width:48,height:48,borderRadius:16,alignItems:"center",justifyContent:"center",backgroundColor:"rgba(255,255,255,.10)"},
  brandTitle:{fontFamily:"PlayfairDisplay_700Bold",fontSize:24,color:WHITE},
  brandSub:{fontFamily:"DMSans_700Bold",fontSize:8,color:GOLD_LIGHT,letterSpacing:1},
  drawerClose:{width:40,height:40,borderRadius:13,alignItems:"center",justifyContent:"center",backgroundColor:WHITE},
  drawerDoctor:{marginTop:18,marginBottom:8,padding:11,borderRadius:17,flexDirection:"row",alignItems:"center",gap:9,backgroundColor:"rgba(255,255,255,.08)",borderWidth:1,borderColor:"rgba(255,255,255,.10)"},
  drawerAvatar:{width:43,height:43,borderRadius:14,alignItems:"center",justifyContent:"center",backgroundColor:GOLD},
  drawerAvatarText:{fontFamily:"DMSans_700Bold",fontSize:16,color:GREEN},
  drawerName:{fontFamily:"DMSans_700Bold",fontSize:11,color:WHITE},
  drawerRole:{marginTop:2,fontFamily:"DMSans_400Regular",fontSize:7.5,color:"#C5D7CC"},
  menuLabel:{marginLeft:11,marginBottom:6,fontFamily:"DMSans_700Bold",fontSize:7,color:"#7E9C8C",letterSpacing:1.2},
  menuItem:{minHeight:50,paddingHorizontal:9,borderRadius:14,flexDirection:"row",alignItems:"center",gap:9},
  menuItemActive:{backgroundColor:WHITE},
  menuItemIcon:{width:34,height:34,borderRadius:11,alignItems:"center",justifyContent:"center",backgroundColor:"rgba(255,255,255,.07)"},
  menuItemText:{flex:1,fontFamily:"DMSans_700Bold",fontSize:10.5,color:"#E4ECE7"},
  logout:{minHeight:49,borderRadius:15,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,backgroundColor:"rgba(255,255,255,.10)",borderWidth:1,borderColor:"rgba(255,255,255,.16)"},
  logoutText:{fontFamily:"DMSans_700Bold",fontSize:11,color:WHITE},
  sheetRoot:{flex:1,justifyContent:"flex-end"},
  sheet:{maxHeight:"92%",paddingTop:10,paddingHorizontal:18,paddingBottom:Platform.OS==="ios"?30:20,borderTopLeftRadius:30,borderTopRightRadius:30,backgroundColor:CREAM},
  handle:{alignSelf:"center",width:44,height:5,borderRadius:3,backgroundColor:"#CDD4CF"},
  sheetHeader:{marginTop:14,marginBottom:8,flexDirection:"row",alignItems:"center",gap:10},
  sheetTitle:{marginTop:3,fontFamily:"PlayfairDisplay_700Bold",fontSize:24,color:GREEN},
  sheetClose:{width:39,height:39,borderRadius:13,alignItems:"center",justifyContent:"center",backgroundColor:MINT},
  fieldLabel:{marginTop:12,marginBottom:6,fontFamily:"DMSans_700Bold",fontSize:7,color:GREEN,letterSpacing:.8},
  input:{minHeight:51,paddingHorizontal:12,borderRadius:15,flexDirection:"row",alignItems:"center",gap:8,backgroundColor:WHITE,borderWidth:1,borderColor:BORDER},
  inputText:{flex:1,fontFamily:"DMSans_700Bold",fontSize:9,color:TEXT},
  twoCol:{flexDirection:"row",gap:8},
  segment:{flexDirection:"row",gap:8},
  segmentBtn:{flex:1,minHeight:47,borderRadius:14,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,backgroundColor:WHITE,borderWidth:1,borderColor:BORDER},
  segmentActive:{backgroundColor:GREEN,borderColor:GREEN},
  segmentText:{fontFamily:"DMSans_700Bold",fontSize:8,color:GREEN},
  switchRow:{marginTop:14,padding:12,borderRadius:15,flexDirection:"row",alignItems:"center",gap:10,backgroundColor:MINT},
  switchTitle:{fontFamily:"DMSans_700Bold",fontSize:9,color:GREEN},
  switchText:{marginTop:2,fontFamily:"DMSans_400Regular",fontSize:7,color:MUTED},
  checkRow:{marginTop:13,padding:12,borderRadius:15,flexDirection:"row",alignItems:"center",gap:10,backgroundColor:MINT},
  checkbox:{width:23,height:23,borderRadius:7,alignItems:"center",justifyContent:"center",backgroundColor:WHITE,borderWidth:1,borderColor:"#C9D6CE"},
  checkboxActive:{backgroundColor:GREEN,borderColor:GREEN},
  note:{marginTop:13,padding:11,borderRadius:13,flexDirection:"row",alignItems:"flex-start",gap:7,backgroundColor:"#FFF7E2"},
  noteText:{flex:1,fontFamily:"DMSans_400Regular",fontSize:7.5,lineHeight:12,color:MUTED},
  textArea:{minHeight:95,padding:12,borderRadius:15,textAlignVertical:"top",fontFamily:"DMSans_500Medium",fontSize:9,color:TEXT,backgroundColor:WHITE,borderWidth:1,borderColor:BORDER},
  sheetActions:{marginTop:18,marginBottom:5,flexDirection:"row",gap:8},
  secondary:{flex:1,minHeight:48,borderRadius:14,alignItems:"center",justifyContent:"center",backgroundColor:WHITE,borderWidth:1,borderColor:BORDER},
  secondaryText:{fontFamily:"DMSans_700Bold",fontSize:9,color:GREEN},
  primary:{flex:1.4,minHeight:48,borderRadius:14,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,backgroundColor:GREEN},
  primaryText:{fontFamily:"DMSans_700Bold",fontSize:9,color:WHITE},
  centerRoot:{flex:1,paddingHorizontal:20,alignItems:"center",justifyContent:"center"},
  choiceCard:{width:"100%",maxWidth:380,maxHeight:"80%",padding:17,borderRadius:25,backgroundColor:CREAM},
  choiceTitle:{marginBottom:10,fontFamily:"PlayfairDisplay_700Bold",fontSize:21,color:GREEN},
  choiceItem:{minHeight:48,paddingHorizontal:12,borderRadius:13,flexDirection:"row",alignItems:"center",justifyContent:"space-between",backgroundColor:WHITE,borderBottomWidth:1,borderBottomColor:BORDER},
  choiceText:{fontFamily:"DMSans_700Bold",fontSize:9,color:TEXT},
  confirmCard:{width:"100%",maxWidth:380,padding:22,borderRadius:28,alignItems:"center",backgroundColor:CREAM,borderWidth:1,borderColor:"rgba(214,180,91,.42)",elevation:18},
  confirmIcon:{width:67,height:67,borderRadius:22,alignItems:"center",justifyContent:"center"},
  modalEyebrow:{marginTop:14,fontFamily:"DMSans_700Bold",fontSize:7,color:GOLD_DARK,letterSpacing:1.1},
  modalTitle:{marginTop:6,fontFamily:"PlayfairDisplay_700Bold",fontSize:23,color:GREEN,textAlign:"center"},
  modalText:{marginTop:8,fontFamily:"DMSans_400Regular",fontSize:9.5,lineHeight:16,color:MUTED,textAlign:"center"},
  confirmActions:{width:"100%",marginTop:18,flexDirection:"row",gap:8},
});

