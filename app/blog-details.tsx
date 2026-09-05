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
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import PatientDrawer from "../components/PatientDrawer";
import PatientHeader from "../components/PatientHeader";
import { API_BASE_URL } from "../services/api";

const GREEN = "#0B3D2E";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_DARK = "#A98632";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#75837B";
const BORDER = "#E6EBE7";
const DANGER = "#B95045";
const INFO = "#39708E";

type Blog = {
  id?: number | string;
  title?: string;
  category?: string;
  authorName?: string;
  author?: string;
  shortDescription?: string;
  imageUrl?: string;
  content?: string;
  createdAt?: string;
  publishedAt?: string;
  updatedAt?: string;
};

type NoticeAction = "none" | "login" | "blogs";

type NoticeState = {
  visible: boolean;
  type: "error" | "info";
  title: string;
  message: string;
  action: NoticeAction;
};

type ArticleBlock = {
  type: "h1" | "h2" | "h3" | "p" | "li" | "quote";
  text: string;
};

export default function BlogDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const blogId = useMemo(() => {
    const value = Array.isArray(params.id) ? params.id[0] : params.id;
    return String(value || "").trim();
  }, [params.id]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<NoticeState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
    action: "none",
  });

  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    loadBlogDetails();
  }, [blogId]);

  async function getToken() {
    return (
      (await AsyncStorage.getItem("token")) ||
      (await AsyncStorage.getItem("accessToken")) ||
      ""
    );
  }

  async function clearSession() {
    await AsyncStorage.multiRemove([
      "token",
      "accessToken",
      "refreshToken",
      "userId",
      "email",
      "name",
      "userName",
      "role",
      "profileCompleted",
      "isLoggedIn",
    ]);
  }

  function showNotice(
    type: "error" | "info",
    title: string,
    message: string,
    action: NoticeAction = "none"
  ) {
    setNotice({ visible: true, type, title, message, action });
  }

  function closeNotice() {
    const action = notice.action;

    setNotice((current) => ({
      ...current,
      visible: false,
      action: "none",
    }));

    if (action === "login") {
      router.replace("/login" as any);
      return;
    }

    if (action === "blogs") {
      router.replace("/blogs" as any);
    }
  }

  async function loadBlogDetails() {
    if (!blogId) {
      setLoading(false);
      setBlog(null);
      showNotice(
        "error",
        "Blog Not Found",
        "The selected blog ID is missing.",
        "blogs"
      );
      return;
    }

    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        setBlog(null);
        showNotice(
          "info",
          "Login Required",
          "Please login to view the complete blog.",
          "login"
        );
        return;
      }

      // SAME API AS YOUR EXISTING BLOG DETAILS PAGE
      const response = await fetch(
        `${API_BASE_URL}/blogs/${encodeURIComponent(blogId)}/get`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

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

      if (response.status === 401 || response.status === 403) {
        await clearSession();
        setBlog(null);

        showNotice(
          "error",
          "Session Expired",
          result?.message ||
            "Your login session has expired. Please login again.",
          "login"
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          result?.message || `Unable to load blog (${response.status}).`
        );
      }

      if (result?.success === false || !result?.data) {
        setBlog(null);
        showNotice(
          "error",
          "Blog Not Found",
          result?.message || "The requested blog was not found.",
          "blogs"
        );
        return;
      }

      console.log("BLOG DETAILS DATA:", result.data);
      console.log("BLOG IMAGE VALUE:", result.data?.imageUrl);

      setBlog(result.data);
    } catch (error: any) {
      console.log("BLOG DETAILS ERROR:", error);
      setBlog(null);

      showNotice(
        "error",
        "Unable to Load Blog",
        error?.message ||
          "Blog details could not be loaded. Please try again.",
        "blogs"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadBlogDetails();
    } finally {
      setRefreshing(false);
    }
  }

  const author =
    blog?.authorName || blog?.author || "NeoLife Wellness Team";

  const publishedDate = formatDate(
    blog?.createdAt || blog?.publishedAt || blog?.updatedAt
  );

  const readMinutes = estimateReadTime(blog?.content);

  if (!dmLoaded || !playfairLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <PatientHeader onMenuPress={() => setMenuOpen(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
      >
        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="large" color={GOLD_DARK} />
            <Text style={styles.stateTitle}>Loading article</Text>
            <Text style={styles.stateText}>
              Preparing your wellness read.
            </Text>
          </View>
        ) : !blog ? (
          <View style={styles.stateWrap}>
            <View style={styles.stateIcon}>
              <Ionicons name="newspaper-outline" size={30} color={GREEN} />
            </View>
            <Text style={styles.stateTitle}>Article unavailable</Text>
            <Text style={styles.stateText}>
              This article could not be displayed right now.
            </Text>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/blogs" as any)}
            >
              <Ionicons name="arrow-back" size={17} color={WHITE} />
              <Text style={styles.backButtonText}>Back to Blogs</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.articleNav}>
              <TouchableOpacity
                style={styles.articleNavBack}
                onPress={() => router.replace("/blogs" as any)}
              >
                <Ionicons name="chevron-back" size={22} color={GREEN} />
                <Text style={styles.articleNavText}>Blogs</Text>
              </TouchableOpacity>

              <View style={styles.articleNavIcon}>
                <Ionicons name="book-outline" size={18} color={GREEN} />
              </View>
            </View>

            <View style={styles.articleHeader}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {blog.category || "Wellness"}
                </Text>
              </View>

              <Text style={styles.title}>
                {blog.title || "Untitled Blog"}
              </Text>

              {!!blog.shortDescription && (
                <Text style={styles.subtitle}>
                  {plainText(blog.shortDescription)}
                </Text>
              )}

              <View style={styles.authorBlock}>
                <View style={styles.authorAvatar}>
                  <Ionicons name="person-outline" size={18} color={GREEN} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.authorName}>{author}</Text>
                  <Text style={styles.authorMeta}>
                    {publishedDate}  •  {readMinutes} min read
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.heroImageWrap}>
              <SmartBlogImage
                imageUrl={blog.imageUrl}
                style={styles.heroImage}
              />
            </View>

            <View style={styles.articleBody}>
              <BlogContent content={blog.content} />

              <View style={styles.endDivider} />

              <View style={styles.endNote}>
                <View style={styles.endNoteIcon}>
                  <Ionicons name="leaf-outline" size={20} color={GREEN} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.endNoteTitle}>NeoLife Wellness</Text>
                  <Text style={styles.endNoteText}>
                    Knowledge to support healthier everyday choices.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.bottomBackButton}
                onPress={() => router.replace("/blogs" as any)}
              >
                <Ionicons name="arrow-back" size={18} color={WHITE} />
                <Text style={styles.bottomBackText}>Back to Blogs</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      <PatientDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeRoute="/blogs"
      />

      <Modal
        visible={notice.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeNotice}
      >
        <View style={styles.noticeRoot}>
          <Pressable style={styles.noticeBackdrop} onPress={closeNotice} />

          <View style={styles.noticeCard}>
            <View
              style={[
                styles.noticeIcon,
                notice.type === "error"
                  ? styles.noticeIconError
                  : styles.noticeIconInfo,
              ]}
            >
              <Ionicons
                name={
                  notice.type === "error"
                    ? "alert-circle-outline"
                    : "information-circle-outline"
                }
                size={31}
                color={notice.type === "error" ? DANGER : INFO}
              />
            </View>

            <Text style={styles.noticeEyebrow}>NEOLIFE WELLNESS</Text>
            <Text style={styles.noticeTitle}>{notice.title}</Text>
            <Text style={styles.noticeMessage}>{notice.message}</Text>

            <TouchableOpacity style={styles.noticeButton} onPress={closeNotice}>
              <Text style={styles.noticeButtonText}>
                {notice.action === "login"
                  ? "Go to Login"
                  : notice.action === "blogs"
                  ? "Back to Blogs"
                  : "Okay"}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={GREEN} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SmartBlogImage({
  imageUrl,
  style,
}: {
  imageUrl?: string;
  style: any;
}) {
  const candidates = useMemo(() => buildImageCandidates(imageUrl), [imageUrl]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [imageUrl]);

  if (!candidates.length || index >= candidates.length) {
    return (
      <View style={[style, styles.imageFallback]}>
        <View style={styles.fallbackIcon}>
          <Ionicons name="leaf-outline" size={34} color={GREEN} />
        </View>
        <Text style={styles.fallbackTitle}>NeoLife Wellness</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: candidates[index] }}
      style={style}
      resizeMode="cover"
      onError={() => {
        console.log("BLOG IMAGE FAILED:", candidates[index]);
        setIndex((current) => current + 1);
      }}
    />
  );
}

function buildImageCandidates(imageUrl?: string) {
  if (!imageUrl || !String(imageUrl).trim()) return [];

  const value = String(imageUrl).trim();
  const serverBase = API_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
  const apiBase = API_BASE_URL.replace(/\/$/, "");
  const candidates: string[] = [];

  const push = (url: string) => {
    if (url && !candidates.includes(url)) candidates.push(url);
  };

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  ) {
    push(value);
    return candidates;
  }

  if (value.startsWith("/api/uploads/")) {
    push(`${serverBase}${value.replace(/^\/api/, "")}`);
    push(`${serverBase}${value}`);
  } else if (value.startsWith("api/uploads/")) {
    push(`${serverBase}/${value.replace(/^api\//, "")}`);
    push(`${serverBase}/${value}`);
  } else if (value.startsWith("/uploads/")) {
    push(`${serverBase}${value}`);
    push(`${apiBase}${value}`);
  } else if (value.startsWith("uploads/")) {
    push(`${serverBase}/${value}`);
    push(`${apiBase}/${value}`);
  } else if (value.startsWith("/")) {
    push(`${serverBase}${value}`);
    push(`${apiBase}${value}`);
  } else {
    push(`${serverBase}/${value}`);
    push(`${apiBase}/${value}`);
  }

  return candidates;
}

function BlogContent({ content }: { content?: string }) {
  const blocks = parseBlogContent(content);

  if (!blocks.length) {
    return (
      <Text style={styles.paragraph}>
        No content is available for this article.
      </Text>
    );
  }

  return (
    <View>
      {blocks.map((block, index) => {
        if (block.type === "h1") {
          return (
            <Text key={index} style={styles.heading1}>
              {block.text}
            </Text>
          );
        }

        if (block.type === "h2") {
          return (
            <Text key={index} style={styles.heading2}>
              {block.text}
            </Text>
          );
        }

        if (block.type === "h3") {
          return (
            <Text key={index} style={styles.heading3}>
              {block.text}
            </Text>
          );
        }

        if (block.type === "li") {
          return (
            <View key={index} style={styles.bulletRow}>
              <View style={styles.bulletIcon}>
                <Ionicons name="checkmark" size={12} color={WHITE} />
              </View>
              <Text selectable style={styles.bulletText}>
                {block.text}
              </Text>
            </View>
          );
        }

        if (block.type === "quote") {
          return (
            <View key={index} style={styles.quoteBox}>
              <Ionicons name="leaf-outline" size={20} color={GOLD_DARK} />
              <Text style={styles.quoteText}>{block.text}</Text>
            </View>
          );
        }

        return (
          <Text key={index} selectable style={styles.paragraph}>
            {block.text}
          </Text>
        );
      })}
    </View>
  );
}

function parseBlogContent(content?: string): ArticleBlock[] {
  if (!content) return [];

  const source = String(content)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!source) return [];

  const hasHtml =
    /<\/?(p|h1|h2|h3|h4|li|blockquote|ul|ol|br|div|strong|b|em)[\s>]/i.test(
      source
    );

  if (!hasHtml) {
    return source
      .split(/\n{2,}/)
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => {
        if (/^[•*-]\s+/.test(text)) {
          return {
            type: "li" as const,
            text: text.replace(/^[•*-]\s+/, "").trim(),
          };
        }

        return { type: "p" as const, text };
      });
  }

  const marked = source
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n###H1###$1###END###\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n###H2###$1###END###\n")
    .replace(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/gi, "\n###H3###$1###END###\n")
    .replace(
      /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
      "\n###QUOTE###$1###END###\n"
    )
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n###LI###$1###END###\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n###P###$1###END###\n");

  const blocks: ArticleBlock[] = [];
  const regex = /###(H1|H2|H3|QUOTE|LI|P)###([\s\S]*?)###END###/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(marked)) !== null) {
    const marker = match[1];
    const text = cleanArticleText(match[2]);

    if (!text) continue;

    let type: ArticleBlock["type"] = "p";
    if (marker === "H1") type = "h1";
    if (marker === "H2") type = "h2";
    if (marker === "H3") type = "h3";
    if (marker === "LI") type = "li";
    if (marker === "QUOTE") type = "quote";

    blocks.push({ type, text });
  }

  if (blocks.length) return blocks;

  return cleanArticleText(source)
    .split(/\n{2,}/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ type: "p" as const, text }));
}

function cleanArticleText(value: string) {
  return decodeEntities(
    String(value)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+/g, " ")
    .trim();
}

function plainText(value?: string) {
  return decodeEntities(
    String(value || "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function formatDate(dateValue?: string) {
  if (!dateValue) return "Date not available";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue).substring(0, 10);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function estimateReadTime(content?: string) {
  const words = plainText(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },
  scrollContent: { flexGrow: 1 },

  stateWrap: {
    minHeight: 420,
    margin: 18,
    padding: 30,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  stateIcon: {
    width: 62,
    height: 62,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  stateTitle: {
    marginTop: 15,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 23,
    textAlign: "center",
  },
  stateText: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
  },

  articleNav: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  articleNavBack: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -4,
  },
  articleNavText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 13,
  },
  articleNavIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },

  articleHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: "#FFF4D4",
    borderWidth: 1,
    borderColor: "#EED693",
  },
  categoryBadgeText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
  },
  title: {
    marginTop: 13,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    marginTop: 10,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 14,
    lineHeight: 22,
  },

  authorBlock: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  authorAvatar: {
    width: 43,
    height: 43,
    marginRight: 10,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  authorName: {
    fontFamily: "DMSans_700Bold",
    color: TEXT,
    fontSize: 12,
  },
  authorMeta: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
  },

  heroImageWrap: { paddingHorizontal: 16 },
  heroImage: {
    width: "100%",
    height: 235,
    borderRadius: 22,
    backgroundColor: MINT,
    overflow: "hidden",
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  fallbackIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  fallbackTitle: {
    marginTop: 10,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 18,
  },

  articleBody: {
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  paragraph: {
    marginBottom: 18,
    fontFamily: "DMSans_400Regular",
    color: "#3F4E46",
    fontSize: 16,
    lineHeight: 27,
  },
  heading1: {
    marginTop: 15,
    marginBottom: 12,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 28,
    lineHeight: 34,
  },
  heading2: {
    marginTop: 16,
    marginBottom: 10,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 25,
    lineHeight: 31,
  },
  heading3: {
    marginTop: 14,
    marginBottom: 8,
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 17,
    lineHeight: 24,
  },
  bulletRow: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletIcon: {
    width: 22,
    height: 22,
    marginTop: 2,
    marginRight: 10,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD_DARK,
  },
  bulletText: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    color: "#3F4E46",
    fontSize: 15,
    lineHeight: 24,
  },
  quoteBox: {
    marginVertical: 8,
    padding: 17,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    backgroundColor: MINT,
  },
  quoteText: {
    marginTop: 9,
    fontFamily: "PlayfairDisplay_600SemiBold",
    color: GREEN,
    fontSize: 17,
    lineHeight: 26,
  },

  endDivider: {
    height: 1,
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: BORDER,
  },
  endNote: {
    padding: 16,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MINT,
  },
  endNoteIcon: {
    width: 42,
    height: 42,
    marginRight: 11,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  endNoteTitle: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 12,
  },
  endNoteText: {
    marginTop: 3,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 15,
  },

  bottomBackButton: {
    marginTop: 20,
    minHeight: 52,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: GREEN,
  },
  bottomBackText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 12,
  },
  backButton: {
    marginTop: 20,
    minHeight: 47,
    paddingHorizontal: 18,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GREEN,
  },
  backButtonText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 11,
  },

  noticeRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  noticeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,31,21,0.72)",
  },
  noticeCard: {
    width: "100%",
    maxWidth: 390,
    padding: 25,
    borderRadius: 27,
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "#E8D8A7",
  },
  noticeIcon: {
    width: 62,
    height: 62,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeIconError: { backgroundColor: "#FBECE9" },
  noticeIconInfo: { backgroundColor: "#EDF5FA" },
  noticeEyebrow: {
    marginTop: 14,
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  noticeTitle: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 24,
    textAlign: "center",
  },
  noticeMessage: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
  },
  noticeButton: {
    marginTop: 19,
    minHeight: 47,
    paddingHorizontal: 18,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GOLD,
  },
  noticeButtonText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },
});
