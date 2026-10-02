import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useLocalSearchParams,
} from "expo-router";
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
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
  id?: number | string;
  title?: string;
  category?: string;
  authorName?: string;
  author?: string;
  content?: string;
  shortDescription?: string;
  imageUrl?: string;
  createdAt?: string;
  publishedAt?: string;
  updatedAt?: string;
  published?: boolean;
};

/* =========================================================
   IMAGE
========================================================= */

function getImageUrl(value?: string) {
  if (!value) return null;

  let path = String(value).trim();

  if (!path) return null;

  const apiOrigin = API_BASE_URL.replace(
    /\/api\/?$/,
    ""
  );

  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    /*
     * Android device cannot access the development
     * computer through localhost.
     */
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

  if (path.startsWith("/uploads/")) {
    return `${apiOrigin}${path}`;
  }

  if (path.startsWith("uploads/")) {
    return `${apiOrigin}/${path}`;
  }

  if (path.startsWith("/api/")) {
    return `${apiOrigin}${path}`;
  }

  if (path.startsWith("api/")) {
    return `${apiOrigin}/${path}`;
  }

  if (path.startsWith("/")) {
    return `${apiOrigin}${path}`;
  }

  return `${apiOrigin}/${path}`;
}

/* =========================================================
   CONTENT HELPERS
========================================================= */

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

function createParagraphs(content?: string) {
  if (!content) {
    return [];
  }

  let value = String(content);

  value = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, "");

  value = decodeEntities(value);

  return value
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph.replace(/\s+/g, " ").trim()
    )
    .filter(Boolean);
}

function formatDate(value?: string) {
  if (!value) {
    return "Date not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* =========================================================
   SCREEN
========================================================= */

export default function BlogDetailsScreen() {
  /*
   * blogs.tsx sends:
   *
   * /blog-details?id=5
   */
  const [menuOpen, setMenuOpen] = useState(false);
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const blogId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [blog, setBlog] =
    useState<Blog | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [imageFailed, setImageFailed] =
    useState(false);

  /* =======================================================
     DEBUG PARAMETER
  ======================================================= */

  useEffect(() => {
    console.log(
      "BLOG DETAILS PARAMS:",
      params
    );

    console.log(
      "BLOG DETAILS ID:",
      blogId
    );
  }, [blogId]);

  /* =======================================================
     CONTENT
  ======================================================= */

  const paragraphs = useMemo(() => {
    return createParagraphs(blog?.content);
  }, [blog?.content]);

  /* =======================================================
     LOAD BLOG
  ======================================================= */

  useEffect(() => {
    if (!blogId) {
      console.log(
        "BLOG DETAILS: ID NOT RECEIVED"
      );

      setError("Blog ID is missing.");
      setLoading(false);

      return;
    }

    loadBlog(blogId);
  }, [blogId]);

  async function loadBlog(id: string) {
    try {
      setLoading(true);
      setError("");
      setBlog(null);
      setImageFailed(false);

      /*
       * Website API:
       *
       * GET /api/blogs/{id}/get
       */
      const url =
        `${API_BASE_URL}/blogs/` +
        `${encodeURIComponent(id)}/get`;

      console.log(
        "BLOG DETAILS API:",
        url
      );

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
        "BLOG DETAILS RESPONSE:",
        JSON.stringify(result, null, 2)
      );

      if (!response.ok) {
        throw new Error(
          result?.message ||
            `Unable to load blog. HTTP ${response.status}`
        );
      }

      if (!result) {
        throw new Error(
          "Invalid response received from server."
        );
      }

      if (result?.success === false) {
        throw new Error(
          result?.message ||
            "Unable to load blog."
        );
      }

      if (!result?.data) {
        throw new Error(
          "Blog not found."
        );
      }

      setBlog(result.data);
    } catch (err: any) {
      console.log(
        "BLOG DETAILS ERROR:",
        err
      );

      setError(
        err?.message ||
          "This blog could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/blogs" as any);
    }
  }

  function goToBlogs() {
    router.replace("/blogs" as any);
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View style={styles.screen}>
        <PatientHeader
          onMenuPress={() => setMenuOpen(true)}
        />

        <View style={styles.stateContainer}>
          <ActivityIndicator
            size="large"
            color={GREEN}
          />

          <Text style={styles.stateTitle}>
            Loading Article
          </Text>

          <Text style={styles.stateText}>
            Please wait while we open this
            wellness article.
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

  if (error || !blog) {
    return (
      <View style={styles.screen}>
        <PatientHeader
          onMenuPress={() => setMenuOpen(true)}
        />

        <View style={styles.stateContainer}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={36}
              color={GREEN}
            />
          </View>

          <Text style={styles.stateTitle}>
            Unable to Open Article
          </Text>

          <Text style={styles.stateText}>
            {error || "Blog not found."}
          </Text>

          {blogId ? (
            <TouchableOpacity
              style={styles.retryButton}
              activeOpacity={0.85}
              onPress={() =>
                loadBlog(blogId)
              }
            >
              <Ionicons
                name="refresh"
                size={17}
                color={WHITE}
              />

              <Text
                style={styles.retryText}
              >
                Try Again
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.backButtonLarge}
            activeOpacity={0.85}
            onPress={goToBlogs}
          >
            <Ionicons
              name="arrow-back"
              size={17}
              color={GREEN}
            />

            <Text
              style={
                styles.backButtonLargeText
              }
            >
              Back to Blogs
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
     IMAGE
  ======================================================= */

  const image = getImageUrl(
    blog.imageUrl
  );

  console.log(
    "DETAIL IMAGE FROM API:",
    blog.imageUrl
  );

  console.log(
    "DETAIL FINAL IMAGE:",
    image
  );

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
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* ARTICLE HEADER */}

        <View style={styles.articleHeader}>
          <View style={styles.categoryBadge}>
            <Ionicons
              name="leaf-outline"
              size={13}
              color={GOLD}
            />

            <Text
              style={styles.categoryText}
              numberOfLines={1}
            >
              {blog.category ||
                "Wellness"}
            </Text>
          </View>

          <Text style={styles.title}>
            {blog.title ||
              "Untitled Blog"}
          </Text>

          {/* META */}

          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <View style={styles.metaIcon}>
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={GREEN}
                />
              </View>

              <View
                style={styles.metaContent}
              >
                <Text
                  style={styles.metaLabel}
                >
                  WRITTEN BY
                </Text>

                <Text
                  style={styles.metaValue}
                >
                  {blog.authorName ||
                    blog.author ||
                    "NeoLife Wellness Team"}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={GREEN}
                />
              </View>

              <View
                style={styles.metaContent}
              >
                <Text
                  style={styles.metaLabel}
                >
                  PUBLISHED
                </Text>

                <Text
                  style={styles.metaValue}
                >
                  {formatDate(
                    blog.createdAt ||
                      blog.publishedAt ||
                      blog.updatedAt
                  )}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* FEATURE IMAGE */}

        <View
          style={
            styles.featureImageContainer
          }
        >
          {image && !imageFailed ? (
            <Image
              source={{
                uri: image,
              }}
              style={styles.featureImage}
              resizeMode="cover"
              onLoad={() => {
                console.log(
                  "DETAIL IMAGE LOADED:",
                  image
                );
              }}
              onError={(event) => {
                console.log(
                  "DETAIL IMAGE FAILED:",
                  image
                );

                console.log(
                  "DETAIL IMAGE ERROR:",
                  event.nativeEvent.error
                );

                setImageFailed(true);
              }}
            />
          ) : (
            <View
              style={
                styles.featurePlaceholder
              }
            >
              <Ionicons
                name="leaf-outline"
                size={55}
                color={GOLD}
              />

              <Text
                style={
                  styles.featurePlaceholderTitle
                }
              >
                NeoLife Wellness
              </Text>

              <Text
                style={
                  styles.featurePlaceholderText
                }
              >
                Natural Health & Wellness
              </Text>
            </View>
          )}
        </View>

        {/* ARTICLE BODY */}

        <View style={styles.articleBody}>
          <View
            style={styles.articleLabelRow}
          >
            <View
              style={styles.articleLine}
            />

            <Text
              style={styles.articleLabel}
            >
              WELLNESS ARTICLE
            </Text>

            <View
              style={styles.articleLine}
            />
          </View>

          {paragraphs.length > 0 ? (
            paragraphs.map(
              (paragraph, index) => (
                <Text
                  key={`${index}-${paragraph.slice(
                    0,
                    20
                  )}`}
                  style={[
                    styles.paragraph,

                    index === 0 &&
                      styles.firstParagraph,
                  ]}
                >
                  {paragraph}
                </Text>
              )
            )
          ) : (
            <Text
              style={styles.paragraph}
            >
              No content is available for
              this blog.
            </Text>
          )}

          {/* AUTHOR */}

          <View style={styles.authorBox}>
            <View style={styles.authorIcon}>
              <Ionicons
                name="medical-outline"
                size={20}
                color={GREEN}
              />
            </View>

            <View
              style={styles.authorContent}
            >
              <Text
                style={styles.authorLabel}
              >
                ARTICLE BY
              </Text>

              <Text
                style={styles.authorName}
              >
                {blog.authorName ||
                  blog.author ||
                  "NeoLife Wellness Team"}
              </Text>

              <Text
                style={
                  styles.authorSubtitle
                }
              >
                NeoLife Wellness Center
              </Text>
            </View>
          </View>
        </View>

        {/* BACK CARD */}

        <TouchableOpacity
          style={styles.backCard}
          activeOpacity={0.85}
          onPress={goToBlogs}
        >
          <View
            style={styles.backCardIcon}
          >
            <Ionicons
              name="arrow-back"
              size={19}
              color={GREEN}
            />
          </View>

          <View
            style={styles.backCardText}
          >
            <Text
              style={styles.backCardTitle}
            >
              Back to Wellness Blogs
            </Text>

            <Text
              style={styles.backCardSub}
            >
              Explore more health and
              wellness articles
            </Text>
          </View>

          <Ionicons
            name="newspaper-outline"
            size={20}
            color={GOLD}
          />
        </TouchableOpacity>

        {/* CTA */}

        <View style={styles.cta}>
          <View style={styles.ctaIcon}>
            <Ionicons
              name="heart-outline"
              size={26}
              color={GOLD}
            />
          </View>

          <Text style={styles.ctaTitle}>
            Need Personalized Guidance?
          </Text>

          <Text style={styles.ctaText}>
            Our wellness professionals can
            help you choose care based on
            your individual health needs.
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

  /* ARTICLE HEADER */

  articleHeader: {
    paddingHorizontal: 21,
    paddingTop: 35,
    paddingBottom: 27,
  },

  categoryBadge: {
    alignSelf: "flex-start",

    maxWidth: "80%",

    paddingHorizontal: 11,
    paddingVertical: 7,

    borderRadius: 11,

    flexDirection: "row",
    alignItems: "center",

    gap: 5,

    backgroundColor: "#F8F1DC",
  },

  categoryText: {
    flexShrink: 1,

    color: "#9B750E",

    fontSize: 9,
    fontWeight: "900",

    textTransform: "uppercase",

    letterSpacing: 0.8,
  },

  title: {
    marginTop: 17,

    color: TEXT,

    fontSize: 32,
    lineHeight: 39,

    fontWeight: "900",

    letterSpacing: -0.8,
  },

  metaContainer: {
    marginTop: 24,

    gap: 12,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",

    gap: 10,
  },

  metaIcon: {
    width: 34,
    height: 34,

    borderRadius: 11,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: MINT,
  },

  metaContent: {
    flex: 1,
  },

  metaLabel: {
    color: MUTED,

    fontSize: 8,
    fontWeight: "900",

    letterSpacing: 0.8,
  },

  metaValue: {
    marginTop: 2,

    color: TEXT,

    fontSize: 12,
    fontWeight: "700",
  },

  /* IMAGE */

  featureImageContainer: {
    marginHorizontal: 16,

    height: 255,

    overflow: "hidden",

    borderRadius: 25,

    backgroundColor: GREEN,
  },

  featureImage: {
    width: "100%",
    height: "100%",
  },

  featurePlaceholder: {
    flex: 1,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: GREEN_2,
  },

  featurePlaceholderTitle: {
    marginTop: 10,

    color: WHITE,

    fontSize: 16,
    fontWeight: "900",
  },

  featurePlaceholderText: {
    marginTop: 4,

    color: GOLD_LIGHT,

    fontSize: 10,
    fontWeight: "700",
  },

  /* ARTICLE */

  articleBody: {
    marginTop: 28,
    marginHorizontal: 16,

    padding: 21,

    borderRadius: 24,

    backgroundColor: WHITE,

    borderWidth: 1,
    borderColor: BORDER,
  },

  articleLabelRow: {
    marginBottom: 21,

    flexDirection: "row",
    alignItems: "center",

    gap: 10,
  },

  articleLine: {
    flex: 1,

    height: 1,

    backgroundColor: "#E7ECE8",
  },

  articleLabel: {
    color: GOLD,

    fontSize: 8,
    fontWeight: "900",

    letterSpacing: 1,
  },

  paragraph: {
    marginBottom: 18,

    color: "#45574E",

    fontSize: 14,
    lineHeight: 24,
  },

  firstParagraph: {
    color: TEXT,

    fontSize: 15,
    lineHeight: 25,
  },

  /* AUTHOR */

  authorBox: {
    marginTop: 7,
    paddingTop: 20,

    borderTopWidth: 1,
    borderTopColor: BORDER,

    flexDirection: "row",
    alignItems: "center",

    gap: 12,
  },

  authorIcon: {
    width: 45,
    height: 45,

    borderRadius: 15,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: MINT,
  },

  authorContent: {
    flex: 1,
  },

  authorLabel: {
    color: GOLD,

    fontSize: 8,
    fontWeight: "900",

    letterSpacing: 0.8,
  },

  authorName: {
    marginTop: 2,

    color: TEXT,

    fontSize: 13,
    fontWeight: "900",
  },

  authorSubtitle: {
    marginTop: 2,

    color: MUTED,

    fontSize: 10,
  },

  /* BACK */

  backCard: {
    marginTop: 24,
    marginHorizontal: 16,

    padding: 17,

    borderRadius: 20,

    backgroundColor: WHITE,

    borderWidth: 1,
    borderColor: BORDER,

    flexDirection: "row",
    alignItems: "center",

    gap: 12,
  },

  backCardIcon: {
    width: 42,
    height: 42,

    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: MINT,
  },

  backCardText: {
    flex: 1,
  },

  backCardTitle: {
    color: GREEN,

    fontSize: 13,
    fontWeight: "900",
  },

  backCardSub: {
    marginTop: 3,

    color: MUTED,

    fontSize: 9.5,
  },

  /* CTA */

  cta: {
    marginTop: 35,
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
    marginTop: 19,

    minHeight: 48,

    paddingHorizontal: 20,

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

  /* STATES */

  stateContainer: {
    flex: 1,

    paddingHorizontal: 30,

    alignItems: "center",
    justifyContent: "center",
  },

  errorIcon: {
    width: 70,
    height: 70,

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

  backButtonLarge: {
    marginTop: 12,

    minHeight: 47,

    paddingHorizontal: 19,

    borderRadius: 15,

    backgroundColor: MINT,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 7,
  },

  backButtonLargeText: {
    color: GREEN,

    fontWeight: "900",
  },
});