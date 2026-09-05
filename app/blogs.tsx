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
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import PatientDrawer from "../components/PatientDrawer";
import PatientHeader from "../components/PatientHeader";
import { API_BASE_URL } from "../services/api";

const GREEN = "#0B3D2E";
const MINT = "#EAF5EF";
const GOLD_DARK = "#A98632";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#75837B";
const BORDER = "#E6EBE7";

type Blog = {
  id: number | string;
  title?: string;
  category?: string;
  authorName?: string;
  author?: string;
  shortDescription?: string;
  content?: string;
  imageUrl?: string;
  published?: boolean;
  createdAt?: string;
  publishedAt?: string;
  updatedAt?: string;
};

export default function BlogsScreen() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchText, setSearchText] = useState("");

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
    loadBlogs();
  }, []);

  async function loadBlogs(isRefresh = false) {
    try {
      if (!isRefresh) setLoading(true);
      setError("");

      // SAME API AS YOUR EXISTING PAGE
      const response = await fetch(`${API_BASE_URL}/blogs/getAll`);

      if (!response.ok) {
        throw new Error(`Blog request failed (${response.status})`);
      }

      const result = await response.json();

      if (!result?.success || !Array.isArray(result?.data)) {
        throw new Error(result?.message || "Invalid blog response");
      }

      setBlogs(
        result.data.filter((blog: Blog) => blog.published === true)
      );
    } catch (error) {
      console.log("BLOG LIST ERROR:", error);
      setError("We couldn't load the latest wellness articles right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(
        blogs
          .map((blog) => String(blog.category || "Wellness").trim())
          .filter(Boolean)
      )
    );
    return ["All", ...unique];
  }, [blogs]);

  const visibleBlogs = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return blogs.filter((blog) => {
      const category = String(blog.category || "Wellness").trim();
      const categoryMatches =
        activeCategory === "All" || category === activeCategory;

      if (!categoryMatches) return false;
      if (!query) return true;

      const searchable = [
        blog.title,
        blog.category,
        blog.authorName,
        blog.author,
        blog.shortDescription,
        plainText(blog.content),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [blogs, activeCategory, searchText]);

  function openBlog(blog: Blog) {
    router.push({
      pathname: "/blog-details",
      params: { id: String(blog.id) },
    } as any);
  }

  function preview(blog: Blog) {
    const value = plainText(
      blog.shortDescription ||
        blog.content ||
        "Read practical wellness guidance from NeoLife Wellness Center."
    );

    return value.length > 105
      ? `${value.substring(0, 105).trim()}...`
      : value;
  }

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
            onRefresh={() => {
              setRefreshing(true);
              loadBlogs(true);
            }}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
      >
        <View style={styles.pageTop}>
          <Text style={styles.eyebrow}>NEOLIFE WELLNESS</Text>
          <Text style={styles.pageTitle}>Wellness Articles</Text>
          <Text style={styles.pageSubtitle}>
            Simple, practical reads for healthier everyday living.
          </Text>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={GREEN} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search articles..."
              placeholderTextColor="#9BA69F"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {!!searchText && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={19} color={MUTED} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!loading && blogs.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categories}
          >
            {categories.map((category) => {
              const active = activeCategory === category;

              return (
                <TouchableOpacity
                  key={category}
                  activeOpacity={0.85}
                  style={[
                    styles.categoryChip,
                    active && styles.categoryChipActive,
                  ]}
                  onPress={() => setActiveCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      active && styles.categoryChipTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {!loading && !error && (
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.listEyebrow}>LATEST READS</Text>
              <Text style={styles.listTitle}>
                {activeCategory === "All" ? "All Articles" : activeCategory}
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countText}>{visibleBlogs.length}</Text>
            </View>
          </View>
        )}

        <View style={styles.content}>
          {loading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator size="large" color={GOLD_DARK} />
              <Text style={styles.stateTitle}>Loading articles</Text>
              <Text style={styles.stateText}>
                Bringing the latest NeoLife wellness reads to you.
              </Text>
            </View>
          ) : error ? (
            <View style={styles.stateCard}>
              <View style={styles.stateIcon}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={28}
                  color={GOLD_DARK}
                />
              </View>
              <Text style={styles.stateTitle}>Unable to load blogs</Text>
              <Text style={styles.stateText}>{error}</Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => loadBlogs()}
              >
                <Text style={styles.retryText}>Try Again</Text>
                <Ionicons name="refresh" size={16} color={WHITE} />
              </TouchableOpacity>
            </View>
          ) : visibleBlogs.length === 0 ? (
            <View style={styles.stateCard}>
              <View style={styles.stateIcon}>
                <Ionicons name="book-outline" size={28} color={GREEN} />
              </View>
              <Text style={styles.stateTitle}>No articles found</Text>
              <Text style={styles.stateText}>
                Try another search word or choose a different category.
              </Text>

              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => {
                  setSearchText("");
                  setActiveCategory("All");
                }}
              >
                <Text style={styles.browseButtonText}>Browse All Articles</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.articleList}>
              {visibleBlogs.map((blog) => (
                <ArticleRow
                  key={String(blog.id)}
                  blog={blog}
                  preview={preview(blog)}
                  onPress={() => openBlog(blog)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 34 }} />
      </ScrollView>

      <PatientDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeRoute="/blogs"
      />
    </View>
  );
}

function ArticleRow({
  blog,
  preview,
  onPress,
}: {
  blog: Blog;
  preview: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.articleCard}
      onPress={onPress}
    >
      <SmartBlogImage imageUrl={blog.imageUrl} style={styles.articleImage} />

      <View style={styles.articleInfo}>
        <View style={styles.categorySmall}>
          <Text style={styles.categorySmallText}>
            {blog.category || "Wellness"}
          </Text>
        </View>

        <Text style={styles.articleTitle} numberOfLines={2}>
          {blog.title || "Untitled Blog"}
        </Text>

        <Text style={styles.articlePreview} numberOfLines={2}>
          {preview}
        </Text>

        <View style={styles.articleMeta}>
          <Text style={styles.articleMetaText} numberOfLines={1}>
            {blog.authorName || blog.author || "NeoLife Wellness Team"}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.articleMetaText}>
            {formatShortDate(
              blog.createdAt || blog.publishedAt || blog.updatedAt
            )}
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={GREEN}
        style={styles.articleArrow}
      />
    </TouchableOpacity>
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
        <Ionicons name="leaf-outline" size={30} color={GREEN} />
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

function plainText(value?: string) {
  return decodeEntities(
    String(value || "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, " ")
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

function formatShortDate(dateValue?: string) {
  if (!dateValue) return "Recent";

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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },
  scrollContent: { flexGrow: 1 },

  pageTop: { paddingHorizontal: 18, paddingTop: 25 },
  eyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 9,
    letterSpacing: 1.35,
  },
  pageTitle: {
    marginTop: 5,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 32,
    lineHeight: 38,
  },
  pageSubtitle: {
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
  },
  searchBox: {
    marginTop: 18,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchInput: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    color: TEXT,
    fontSize: 14,
  },

  categories: {
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 4,
    gap: 8,
  },
  categoryChip: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  categoryChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  categoryChipText: {
    fontFamily: "DMSans_700Bold",
    color: MUTED,
    fontSize: 10,
  },
  categoryChipTextActive: { color: WHITE },

  listHeader: {
    marginTop: 27,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  listEyebrow: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
    letterSpacing: 1.2,
  },
  listTitle: {
    marginTop: 3,
    fontFamily: "PlayfairDisplay_700Bold",
    color: TEXT,
    fontSize: 24,
  },
  countBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  countText: {
    fontFamily: "DMSans_700Bold",
    color: GREEN,
    fontSize: 11,
  },

  content: { paddingHorizontal: 16, paddingTop: 14 },
  articleList: { gap: 12 },

  articleCard: {
    minHeight: 132,
    padding: 11,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 2,
    shadowColor: GREEN,
    shadowOpacity: 0.05,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
  },
  articleImage: {
    width: 104,
    height: 104,
    borderRadius: 16,
    backgroundColor: MINT,
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  articleInfo: {
    flex: 1,
    paddingLeft: 12,
    paddingRight: 24,
  },
  categorySmall: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#FFF6D8",
    borderWidth: 1,
    borderColor: "#F0DDA0",
  },
  categorySmallText: {
    fontFamily: "DMSans_700Bold",
    color: GOLD_DARK,
    fontSize: 8,
  },
  articleTitle: {
    marginTop: 7,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 17,
    lineHeight: 21,
  },
  articlePreview: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 10,
    lineHeight: 15,
  },
  articleMeta: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  articleMetaText: {
    maxWidth: "65%",
    fontFamily: "DMSans_500Medium",
    color: "#8B9790",
    fontSize: 8,
  },
  metaDot: {
    marginHorizontal: 5,
    color: GOLD_DARK,
    fontSize: 9,
  },
  articleArrow: { position: "absolute", right: 10 },

  stateCard: {
    minHeight: 235,
    padding: 26,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  stateIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MINT,
  },
  stateTitle: {
    marginTop: 14,
    fontFamily: "PlayfairDisplay_700Bold",
    color: GREEN,
    fontSize: 22,
    textAlign: "center",
  },
  stateText: {
    marginTop: 7,
    maxWidth: 290,
    fontFamily: "DMSans_400Regular",
    color: MUTED,
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 17,
    minHeight: 43,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: GREEN,
  },
  retryText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 10,
  },
  browseButton: {
    marginTop: 17,
    minHeight: 43,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
  },
  browseButtonText: {
    fontFamily: "DMSans_700Bold",
    color: WHITE,
    fontSize: 10,
  },
});
