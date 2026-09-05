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
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import PatientDrawer from "../components/PatientDrawer";
import PatientHeader from "../components/PatientHeader";

const GREEN = "#0B3D2E";
const GREEN_2 = "#14533D";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_DARK = "#A98632";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#75837B";
const BORDER = "#E6EBE7";
const SOFT_GOLD = "#FFF7DE";

type Mode = "clinic" | "online";

type ModeConfig = {
  mode: Mode;
  icon: any;
  label: string;
  title: string;
  subtitle: string;
  fee: string;
  helper: string;
  features: string[];
  buttonText: string;
  route: string;
};

export default function ConsultationScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<Mode>("clinic");

  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const modes: Record<Mode, ModeConfig> = useMemo(
    () => ({
      clinic: {
        mode: "clinic",
        icon: "business-outline",
        label: "VISIT CLINIC",
        title: "Clinic Appointment",
        subtitle: "Meet the doctor face-to-face at NeoLife Wellness Center.",
        fee: "₹50",
        helper: "Choose this if you prefer an in-person consultation.",
        features: [
          "Choose your doctor",
          "Select your preferred date & time",
          "Pay ₹50 booking fee",
          "Receive appointment confirmation",
        ],
        buttonText: "Book Clinic Appointment",
        route: "/book-appointment",
      },
      online: {
        mode: "online",
        icon: "videocam-outline",
        label: "CONSULT ONLINE",
        title: "Online Consultation",
        subtitle: "Consult securely from home without travelling to the clinic.",
        fee: "₹200",
        helper: "Choose this if convenience from home works better for you.",
        features: [
          "Secure video consultation",
          "Doctor confirmation before payment",
          "20-minute consultation session",
          "Prescription available in your account",
        ],
        buttonText: "Book Online Consultation",
        route: "/online-consultation",
      },
    }),
    []
  );

  const selected = modes[selectedMode];

  async function openWhatsApp() {
    try {
      await Linking.openURL(
        "https://wa.me/919481489866?text=Hello%20NeoLife%20Wellness%20Center,%20I%20need%20help%20choosing%20a%20consultation."
      );
    } catch (error) {
      console.log("Unable to open WhatsApp:", error);
    }
  }

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loaderText}>Loading consultation options...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <PatientHeader onMenuPress={() => setMenuOpen(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* INTRO */}
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>CONSULTATION</Text>
          <Text style={styles.title}>Choose how you want to consult</Text>
          <Text style={styles.subtitle}>
            Select one option below. You can switch anytime before booking.
          </Text>
        </View>

        {/* MODE PICKER */}
        <View style={styles.modePicker}>
          <ModeTile
            icon="business-outline"
            title="Clinic"
            subtitle="Visit NeoLife"
            selected={selectedMode === "clinic"}
            onPress={() => setSelectedMode("clinic")}
          />

          <ModeTile
            icon="videocam-outline"
            title="Online"
            subtitle="Consult from home"
            selected={selectedMode === "online"}
            onPress={() => setSelectedMode("online")}
          />
        </View>

        {/* SELECTED OPTION */}
        <View style={styles.selectedCard}>
          <View style={styles.selectedTopRow}>
            <View style={styles.selectedIcon}>
              <Ionicons name={selected.icon} size={25} color={GREEN} />
            </View>

            <View style={styles.selectedHeaderText}>
              <Text style={styles.optionLabel}>{selected.label}</Text>
              <Text style={styles.optionTitle}>{selected.title}</Text>
            </View>

            <View style={styles.feePill}>
              <Text style={styles.feeLabel}>FEE</Text>
              <Text style={styles.feeText}>{selected.fee}</Text>
            </View>
          </View>

          <Text style={styles.optionSubtitle}>{selected.subtitle}</Text>

          <View style={styles.helperStrip}>
            <Ionicons
              name="information-circle-outline"
              size={17}
              color={GOLD_DARK}
            />
            <Text style={styles.helperText}>{selected.helper}</Text>
          </View>

          <View style={styles.featureList}>
            {selected.features.map((item) => (
              <View key={item} style={styles.featureRow}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={12} color={GREEN} />
                </View>
                <Text style={styles.featureText}>{item}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.primaryButton}
            onPress={() => router.push(selected.route as any)}
          >
            <Text style={styles.primaryButtonText}>{selected.buttonText}</Text>

            <View style={styles.primaryArrow}>
              <Ionicons name="arrow-forward" size={17} color={GREEN} />
            </View>
          </TouchableOpacity>
        </View>

        {/* HOW IT WORKS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>WHAT HAPPENS NEXT</Text>
          <Text style={styles.sectionTitle}>Three simple steps</Text>
        </View>

        <View style={styles.stepsCard}>
          <Step
            no="1"
            icon="person-outline"
            title="Choose doctor"
            text="Select the doctor you want to consult."
          />

          <Connector />

          <Step
            no="2"
            icon="calendar-outline"
            title="Choose date & time"
            text="Pick the available slot that suits you."
          />

          <Connector />

          <Step
            no="3"
            icon="checkmark-circle-outline"
            title="Confirm booking"
            text={
              selectedMode === "clinic"
                ? "Complete the booking fee and get appointment confirmation."
                : "Send your request, complete payment when prompted, and get consultation confirmation."
            }
          />
        </View>

        {/* HELP */}
        <View style={styles.helpCard}>
          <View style={styles.helpIcon}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color={GREEN}
            />
          </View>

          <View style={styles.helpTextWrap}>
            <Text style={styles.helpTitle}>Need help choosing?</Text>
            <Text style={styles.helpText}>
              Chat with the NeoLife team and we’ll guide you.
            </Text>
          </View>

          <TouchableOpacity style={styles.helpAction} onPress={openWhatsApp}>
            <Ionicons name="logo-whatsapp" size={22} color={GREEN} />
          </TouchableOpacity>
        </View>

        <View style={styles.securityStrip}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={GREEN}
          />
          <Text style={styles.securityText}>
            Your consultation information is handled securely.
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      <PatientDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeRoute="/consultation"
      />
    </View>
  );
}

function ModeTile({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: any;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.modeTile, selected && styles.modeTileSelected]}
      onPress={onPress}
    >
      <View style={[styles.modeIcon, selected && styles.modeIconSelected]}>
        <Ionicons
          name={icon}
          size={23}
          color={selected ? WHITE : GREEN}
        />
      </View>

      <Text style={[styles.modeTitle, selected && styles.modeTitleSelected]}>
        {title}
      </Text>

      <Text
        style={[
          styles.modeSubtitle,
          selected && styles.modeSubtitleSelected,
        ]}
      >
        {subtitle}
      </Text>

      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </TouchableOpacity>
  );
}

function Step({
  no,
  icon,
  title,
  text,
}: {
  no: string;
  icon: any;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{no}</Text>
      </View>

      <View style={styles.stepIcon}>
        <Ionicons name={icon} size={19} color={GREEN} />
      </View>

      <View style={styles.stepBody}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepText}>{text}</Text>
      </View>
    </View>
  );
}

function Connector() {
  return <View style={styles.connector} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

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

  scrollContent: {
    flexGrow: 1,
  },

  /* INTRO */
  intro: {
    paddingHorizontal: 20,
    paddingTop: 25,
  },

  eyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    letterSpacing: 1.3,
  },

  title: {
    marginTop: 6,
    maxWidth: 365,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 33,
    lineHeight: 39,
  },

  subtitle: {
    marginTop: 8,
    maxWidth: 360,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
  },

  /* MODE PICKER */
  modePicker: {
    marginTop: 22,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 11,
  },

  modeTile: {
    flex: 1,
    minHeight: 150,
    padding: 15,
    borderRadius: 22,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  modeTileSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  modeIcon: {
    width: 47,
    height: 47,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  modeIconSelected: {
    backgroundColor: "rgba(255,255,255,0.13)",
  },

  modeTitle: {
    marginTop: 13,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 20,
  },

  modeTitleSelected: {
    color: WHITE,
  },

  modeSubtitle: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
  },

  modeSubtitleSelected: {
    color: "#D8E6DD",
  },

  radio: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CCD7D0",
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: GOLD,
  },

  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: GOLD,
  },

  /* SELECTED CARD */
  selectedCard: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 17,
    borderRadius: 24,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 2,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },

  selectedTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  selectedIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  selectedHeaderText: {
    flex: 1,
    marginLeft: 11,
  },

  optionLabel: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 7,
    letterSpacing: 0.9,
  },

  optionTitle: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 19,
  },

  feePill: {
    minWidth: 63,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: SOFT_GOLD,
  },

  feeLabel: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 6,
    letterSpacing: 0.8,
  },

  feeText: {
    marginTop: 2,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 22,
  },

  optionSubtitle: {
    marginTop: 14,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
  },

  helperStrip: {
    marginTop: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: SOFT_GOLD,
  },

  helperText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    color: "#6D6244",
    fontSize: 9,
    lineHeight: 14,
  },

  featureList: {
    marginTop: 14,
    gap: 9,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  checkCircle: {
    width: 25,
    height: 25,
    marginRight: 9,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  featureText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    color: TEXT,
    fontSize: 10,
    lineHeight: 15,
  },

  primaryButton: {
    marginTop: 17,
    minHeight: 52,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GOLD,
  },

  primaryButtonText: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 10,
  },

  primaryArrow: {
    width: 37,
    height: 37,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  /* STEPS */
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 33,
  },

  sectionEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.15,
  },

  sectionTitle: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 25,
  },

  stepsCard: {
    marginTop: 15,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 23,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  stepNumber: {
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },

  stepNumberText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  stepIcon: {
    width: 42,
    height: 42,
    marginLeft: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  stepBody: {
    flex: 1,
    marginLeft: 11,
  },

  stepTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  stepText: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 9,
    lineHeight: 14,
  },

  connector: {
    width: 1,
    height: 18,
    marginLeft: 15,
    marginVertical: 4,
    backgroundColor: "#D5E1D8",
  },

  /* HELP */
  helpCard: {
    marginTop: 29,
    marginHorizontal: 16,
    padding: 15,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MINT,
    borderWidth: 1,
    borderColor: "#D8E7DE",
  },

  helpIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  helpTextWrap: {
    flex: 1,
    marginLeft: 11,
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

  helpAction: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
  },

  securityStrip: {
    marginTop: 14,
    marginHorizontal: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  securityText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    color: GREEN_2,
    fontSize: 8,
    lineHeight: 13,
  },
});
