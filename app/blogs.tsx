import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { API_BASE_URL } from "../services/api";
import PatientDrawer from "../components/PatientDrawer";
import PatientHeader from "../components/PatientHeader";

/* =========================================================
   COLORS
========================================================= */

const GREEN = "#0B3D2E";
const GREEN_2 = "#14533D";
const MINT = "#EAF5EF";
const GOLD = "#D6B45B";
const GOLD_LIGHT = "#F4E6B7";
const CREAM = "#FBFAF6";
const WHITE = "#FFFFFF";
const TEXT = "#17231D";
const MUTED = "#75837B";
const BORDER = "#E2E8E1";

/* =========================================================
   TYPES
========================================================= */

type Blog = {
  id: number | string;
  title?: string;
  category?: string;
  authorName?: string;
  author?: string;
  shortDescription?: string;
  content?: string;
  imageUrl?: string;
  createdAt?: string;
  publishedAt?: string;
  updatedAt?: string;
  published?: boolean;
};

/* =========================================================
   IMAGE URL
========================================================= */

function getImageUrl(value?: string) {
  if (!value) return null;

  let path = String(value).trim();

  if (!path) return null;

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");

  /*
   * If backend returns full localhost URL,
   * Android cannot access your PC using localhost.
   */
  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    path = path
      .replace(
        /^http:\/\/localhost:\d+/i,
        apiOrigin
      )
      .replace(
        /^http:\/\/127\.0\.0\.1:\d+/i,
        apiOrigin
      );

    return path;
  }

  if (
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  /*
   * /uploads/blogs/image.jpg
   */
  if (path.startsWith("/uploads/")) {
    return `${apiOrigin}${path}`;
  }

  /*
   * uploads/blogs/image.jpg
   */
  if (path.startsWith("uploads/")) {
    return `${apiOrigin}/${path}`;
  }

  /*
   * /api/uploads/...
   */
  if (path.startsWith("/api/")) {
    return `${apiOrigin}${path}`;
  }

  /*
   * api/uploads/...
   */
  if (path.startsWith("api/")) {
    return `${apiOrigin}/${path}`;
  }

  /*
   * Any root relative path
   */
  if (path.startsWith("/")) {
    return `${apiOrigin}${path}`;
  }

  return `${apiOrigin}/${path}`;
}

/* =========================================================
   TEXT HELPERS
========================================================= */

function stripHtml(value?: string) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/div>/gi, " ")
    .replace(/<li[^>]*>/gi, " ")
    .replace(/<\/li>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function createPreview(blog: Blog) {
  const source =
    blog.shortDescription ||
    blog.content ||
    "Read more about this wellness topic.";

  const text = stripHtml(source);

  if (text.length <= 145) {
    return text;
  }

  return `${text.substring(0, 145).trim()}...`;
}

function formatDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* =========================================================
   SCREEN
========================================================= */

export default function BlogsScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    loadBlogs();
  }, []);

  async function loadBlogs(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const url = `${API_BASE_URL}/blogs/getAll`;

      console.log("BLOG LIST API:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const result = await response
        .json()
        .catch(() => null);

      console.log(
        "BLOG LIST RESPONSE:",
        JSON.stringify(result, null, 2)
      );

      if (!response.ok) {
        throw new Error(
          result?.message ||
            `Unable to load blogs. HTTP ${response.status}`
        );
      }

      if (result?.success === false) {
        throw new Error(
          result?.message || "Unable to load blogs."
        );
      }

      if (!Array.isArray(result?.data)) {
        setBlogs([]);
        return;
      }

      /*
       * Same behaviour as website:
       * display published blogs only.
       */
      const publishedBlogs = result.data.filter(
        (blog: Blog) => blog.published === true
      );

      console.log(
        "PUBLISHED BLOGS:",
        publishedBlogs.length
      );

      setBlogs(publishedBlogs);
    } catch (err: any) {
      console.log("BLOG LIST ERROR:", err);

      setError(
        err?.message ||
          "Unable to load blogs right now."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /* =======================================================
     OPEN BLOG
  ======================================================= */

  function openBlog(blog: Blog) {
    if (
      blog.id === undefined ||
      blog.id === null
    ) {
      console.log(
        "Cannot open blog. Blog ID missing:",
        blog
      );

      return;
    }

    const id = String(blog.id);

    console.log("OPENING BLOG ID:", id);

    /*
     * IMPORTANT:
     *
     * Your file is:
     *
     * app/blog-details.tsx
     *
     * Therefore route is:
     *
     * /blog-details
     *
     * NOT:
     *
     * /blog-details/[id]
     */
    router.push({
      pathname: "/blog-details",
      params: {
        id,
      },
    } as any);
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)" as any);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View style={styles.screen}>
        <PatientHeader onMenuPress={() => setMenuOpen(true)} />

        <View style={styles.stateContainer}>
          <ActivityIndicator
            size="large"
            color={GREEN}
          />

          <Text style={styles.stateTitle}>
            Loading Blogs
          </Text>

          <Text style={styles.stateText}>
            Bringing you the latest wellness articles.
          </Text>
        </View>

        <PatientDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          activeRoute="/blogs"
        />
      </View>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <View style={styles.screen}>
        <PatientHeader
          onMenuPress={() => setMenuOpen(true)}
        />

        <View style={styles.stateContainer}>
          <View style={styles.stateIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={33}
              color={GREEN}
            />
          </View>

          <Text style={styles.stateTitle}>
            Unable to Load Blogs
          </Text>

          <Text style={styles.stateText}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.85}
            onPress={() => loadBlogs()}
          >
            <Ionicons
              name="refresh"
              size={17}
              color={WHITE}
            />

            <Text style={styles.retryText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>

        <PatientDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          activeRoute="/blogs"
        />
      </View>
    );
  }

  /* =======================================================
     EMPTY
  ======================================================= */

  if (blogs.length === 0) {
    return (
      <View style={styles.screen}>
        <PatientHeader
          onMenuPress={() => setMenuOpen(true)}
        />

        <View style={styles.stateContainer}>
          <View style={styles.stateIcon}>
            <Ionicons
              name="newspaper-outline"
              size={33}
              color={GREEN}
            />
          </View>

          <Text style={styles.stateTitle}>
            No Blogs Available
          </Text>

          <Text style={styles.stateText}>
            New wellness articles will appear here
            when they are published.
          </Text>
        </View>

        <PatientDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          activeRoute="/blogs"
        />
      </View>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <View style={styles.screen}>
      <PatientHeader
        onMenuPress={() => setMenuOpen(true)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBlogs(true)}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
      >
        {/* HERO */}

        <View style={styles.hero}>
          <View style={styles.heroLeaf}>
            <Ionicons
              name="leaf"
              size={25}
              color={GOLD}
            />
          </View>

          <Text style={styles.heroKicker}>
            NATURAL HEALTH & WELLNESS
          </Text>

          <Text style={styles.heroTitle}>
            Wellness Knowledge
            {"\n"}
            for a Healthier You
          </Text>

          <Text style={styles.heroText}>
            Discover expert guidance on Ayurveda,
            Panchakarma, Yoga, Naturopathy and natural
            wellness from the NeoLife team.
          </Text>
        </View>

        {/* SECTION */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>
            OUR LATEST ARTICLES
          </Text>

          <Text style={styles.sectionTitle}>
            Explore Wellness
          </Text>

          <Text style={styles.sectionText}>
            Helpful health information, natural care
            guidance and wellness tips.
          </Text>
        </View>

        {/* BLOG CARDS */}

        <View style={styles.blogList}>
          {blogs.map((blog) => {
            const image = getImageUrl(
              blog.imageUrl
            );

            console.log(
              "BLOG:",
              blog.id,
              "IMAGE FROM API:",
              blog.imageUrl,
              "FINAL IMAGE:",
              image
            );

            return (
              <TouchableOpacity
                key={String(blog.id)}
                style={styles.blogCard}
                activeOpacity={0.9}
                onPress={() => openBlog(blog)}
              >
                {/* IMAGE */}

                <View style={styles.imageContainer}>
                  {image ? (
                    <Image
                      source={{
                        uri: image,
                      }}
                      style={styles.blogImage}
                      resizeMode="cover"
                      onLoad={() => {
                        console.log(
                          "BLOG IMAGE LOADED:",
                          image
                        );
                      }}
                      onError={(event) => {
                        console.log(
                          "BLOG IMAGE FAILED:",
                          image
                        );

                        console.log(
                          "IMAGE ERROR:",
                          event.nativeEvent.error
                        );
                      }}
                    />
                  ) : (
                    <View
                      style={
                        styles.imagePlaceholder
                      }
                    >
                      <Ionicons
                        name="leaf-outline"
                        size={43}
                        color={GOLD}
                      />

                      <Text
                        style={
                          styles.placeholderText
                        }
                      >
                        NeoLife Wellness
                      </Text>
                    </View>
                  )}

                  <View
                    style={styles.categoryBadge}
                  >
                    <Text
                      style={styles.categoryText}
                      numberOfLines={1}
                    >
                      {blog.category ||
                        "Wellness"}
                    </Text>
                  </View>
                </View>

                {/* BODY */}

                <View style={styles.blogBody}>
                  <Text
                    style={styles.blogTitle}
                    numberOfLines={2}
                  >
                    {blog.title ||
                      "Untitled Blog"}
                  </Text>

                  {/* META */}

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="person-outline"
                        size={13}
                        color={GOLD}
                      />

                      <Text
                        style={styles.metaText}
                        numberOfLines={1}
                      >
                        {blog.authorName ||
                          blog.author ||
                          "NeoLife Wellness Team"}
                      </Text>
                    </View>

                    {!!(
                      blog.createdAt ||
                      blog.publishedAt ||
                      blog.updatedAt
                    ) && (
                      <View
                        style={styles.metaItem}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={13}
                          color={GOLD}
                        />

                        <Text
                          style={styles.metaText}
                        >
                          {formatDate(
                            blog.createdAt ||
                              blog.publishedAt ||
                              blog.updatedAt
                          )}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* PREVIEW */}

                  <Text
                    style={styles.preview}
                    numberOfLines={4}
                  >
                    {createPreview(blog)}
                  </Text>

                  {/* READ ARTICLE */}

                  <View style={styles.readMore}>
                    <Text
                      style={styles.readMoreText}
                    >
                      Read Article
                    </Text>

                    <TouchableOpacity
                      style={styles.arrowCircle}
                      activeOpacity={0.7}
                      onPress={(event) => {
                        /*
                         * Prevent card and button from
                         * both firing.
                         */
                        event.stopPropagation();

                        openBlog(blog);
                      }}
                    >
                      <Ionicons
                        name="arrow-forward"
                        size={15}
                        color={GREEN}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA */}

        <View style={styles.cta}>
          <View style={styles.ctaIcon}>
            <Ionicons
              name="heart-outline"
              size={25}
              color={GOLD}
            />
          </View>

          <Text style={styles.ctaTitle}>
            Have a Health Concern?
          </Text>

          <Text style={styles.ctaText}>
            Speak with our wellness professionals for
            personalized guidance.
          </Text>

          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.85}
            onPress={() =>
              router.push(
                "/consultation" as any
              )
            }
          >
            <Text
              style={styles.ctaButtonText}
            >
              Book Consultation
            </Text>

            <Ionicons
              name="arrow-forward"
              size={17}
              color={GREEN}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
      <PatientDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeRoute="/blogs"
      />
    </View>
  );
}



/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  

  scrollContent: {
    paddingBottom: 55,
  },

  /* HERO */

  hero: {
    paddingHorizontal: 22,
    paddingTop: 42,
    paddingBottom: 43,

    backgroundColor: GREEN,
  },

  heroLeaf: {
    width: 50,
    height: 50,

    marginBottom: 20,

    borderRadius: 17,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,.08)",
  },

  heroKicker: {
    color: GOLD_LIGHT,

    fontSize: 10,
    fontWeight: "900",

    letterSpacing: 1.4,
  },

  heroTitle: {
    marginTop: 11,

    color: WHITE,

    fontSize: 34,
    lineHeight: 39,

    fontWeight: "900",

    letterSpacing: -0.8,
  },

  heroText: {
    marginTop: 13,

    color: "#D3E1DA",

    fontSize: 13,
    lineHeight: 21,
  },

  /* SECTION */

  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 38,
    paddingBottom: 21,
  },

  sectionEyebrow: {
    color: GOLD,

    fontSize: 10,
    fontWeight: "900",

    letterSpacing: 1.3,
  },

  sectionTitle: {
    marginTop: 7,

    color: TEXT,

    fontSize: 27,
    fontWeight: "900",
  },

  sectionText: {
    marginTop: 7,

    color: MUTED,

    fontSize: 13,
    lineHeight: 20,
  },

  /* BLOGS */

  blogList: {
    paddingHorizontal: 16,

    gap: 19,
  },

  blogCard: {
    overflow: "hidden",

    borderRadius: 24,

    backgroundColor: WHITE,

    borderWidth: 1,
    borderColor: BORDER,

    elevation: 3,

    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,

    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  imageContainer: {
    height: 215,

    position: "relative",

    backgroundColor: GREEN,
  },

  blogImage: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: GREEN_2,
  },

  placeholderText: {
    marginTop: 8,

    color: GOLD_LIGHT,

    fontSize: 11,
    fontWeight: "800",
  },

  categoryBadge: {
    position: "absolute",

    left: 15,
    bottom: 14,

    maxWidth: "75%",

    paddingHorizontal: 12,
    paddingVertical: 7,

    borderRadius: 11,

    backgroundColor: WHITE,
  },

  categoryText: {
    color: GREEN,

    fontSize: 9,
    fontWeight: "900",

    textTransform: "uppercase",

    letterSpacing: 0.8,
  },

  blogBody: {
    padding: 19,
  },

  blogTitle: {
    color: TEXT,

    fontSize: 20,
    lineHeight: 26,

    fontWeight: "900",
  },

  metaRow: {
    marginTop: 11,

    flexDirection: "row",
    flexWrap: "wrap",

    gap: 12,
  },

  metaItem: {
    maxWidth: "100%",

    flexDirection: "row",
    alignItems: "center",

    gap: 5,
  },

  metaText: {
    color: MUTED,

    fontSize: 10,
  },

  preview: {
    marginTop: 14,

    color: "#586861",

    fontSize: 12.5,
    lineHeight: 20,
  },

  readMore: {
    marginTop: 18,
    paddingTop: 15,

    borderTopWidth: 1,
    borderTopColor: "#EEF1EE",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  readMoreText: {
    color: GREEN,

    fontSize: 12,
    fontWeight: "900",
  },

  arrowCircle: {
    width: 36,
    height: 36,

    borderRadius: 12,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: MINT,
  },

  /* STATES */

  stateContainer: {
    flex: 1,

    paddingHorizontal: 30,

    alignItems: "center",
    justifyContent: "center",
  },

  stateIcon: {
    width: 70,
    height: 70,

    marginBottom: 17,

    borderRadius: 23,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: MINT,
  },

  stateTitle: {
    marginTop: 15,

    color: TEXT,

    fontSize: 20,
    fontWeight: "900",

    textAlign: "center",
  },

  stateText: {
    marginTop: 8,

    color: MUTED,

    fontSize: 13,
    lineHeight: 20,

    textAlign: "center",
  },

  retryButton: {
    marginTop: 20,

    minHeight: 47,

    paddingHorizontal: 19,

    borderRadius: 15,

    backgroundColor: GREEN,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 7,
  },

  retryText: {
    color: WHITE,

    fontWeight: "900",
  },

  /* CTA */

  cta: {
    marginTop: 40,
    marginHorizontal: 16,

    padding: 27,

    borderRadius: 27,

    alignItems: "center",

    backgroundColor: GREEN,
  },

  ctaIcon: {
    width: 51,
    height: 51,

    borderRadius: 17,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,.09)",
  },

  ctaTitle: {
    marginTop: 14,

    color: WHITE,

    fontSize: 22,
    fontWeight: "900",

    textAlign: "center",
  },

  ctaText: {
    marginTop: 8,

    color: "#CEDDD5",

    fontSize: 12,
    lineHeight: 19,

    textAlign: "center",
  },

  ctaButton: {
    marginTop: 18,

    minHeight: 47,

    paddingHorizontal: 19,

    borderRadius: 15,

    backgroundColor: GOLD,

    flexDirection: "row",
    alignItems: "center",

    gap: 7,
  },

  ctaButtonText: {
    color: GREEN,

    fontWeight: "900",
  },
});