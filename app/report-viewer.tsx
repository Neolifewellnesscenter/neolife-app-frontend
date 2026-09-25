import React from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReportViewer() {
  const { uri, type } = useLocalSearchParams<{
    uri: string;
    type: string;
  }>();

  const reportUri = Array.isArray(uri) ? uri[0] : uri;
  const reportType = Array.isArray(type) ? type[0] : type;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Patient Report</Text>
      </View>

      {!reportUri ? (
        <Text style={styles.error}>Report is unavailable.</Text>
      ) : reportType === "pdf" ? (
        <WebView
          source={{ uri: reportUri }}
          style={styles.viewer}
          startInLoadingState
          renderLoading={() => (
            <ActivityIndicator size="large" style={styles.loading} />
          )}
          onError={(event) =>
            console.log("REPORT VIEW ERROR:", event.nativeEvent)
          }
        />
      ) : (
        <Image
          source={{ uri: reportUri }}
          style={styles.image}
          resizeMode="contain"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  back: { color: "#216C55", fontSize: 18, fontWeight: "700" },
  title: { fontSize: 19, fontWeight: "700", color: "#123C32" },
  viewer: { flex: 1 },
  image: { flex: 1, width: "100%" },
  loading: { flex: 1, justifyContent: "center" },
  error: { padding: 20, textAlign: "center" },
});