const GEO_DATA_SOURCES = [
  "./data/maps",
  "https://geo.datav.aliyun.com/areas_v3/bound",
];

const photoCatalog = window.photoCatalog || {};
const photoCatalogChunkMeta = window.photoCatalogChunkMeta || {};
const photoCatalogChunkPayload = window.photoCatalogChunkPayload || {};
const photoCatalogPhotoCounts = window.photoCatalogPhotoCounts || {};
const photoCatalogRecentAlbumsSeed = Array.isArray(window.photoCatalogRecentAlbums)
  ? window.photoCatalogRecentAlbums
  : [];
window.photoCatalog = photoCatalog;
window.photoCatalogChunkPayload = photoCatalogChunkPayload;
const DEFAULT_CAMERA = "FUJIFILM X-H2";
const DEFAULT_LENS = "FUJINON XF 16-55mm";
const AREA_LEVEL_ORDER = {
  country: 0,
  province: 1,
  city: 2,
  district: 3,
};

const directControlledMunicipalities = new Set(["110000", "120000", "310000", "500000"]);

const atlasNode = document.querySelector("#atlas");
const atlasLayoutNode = document.querySelector(".atlas-layout");
const areaChartNode = document.querySelector("#chinaMap");
const mapStageNode = document.querySelector(".map-stage");
const mapStatus = document.querySelector("#mapStatus");
const coverStoryNode = document.querySelector("#coverStory");
const storyBackdropNode = document.querySelector("#storyBackdrop");
const storyStageNode = document.querySelector("#storyStage");
const breadcrumbNode = document.querySelector("#breadcrumb");
const areaTitleNode = document.querySelector("#areaTitle");
const regionPanelNode = document.querySelector(".region-panel");
const regionPanelBodyNode = document.querySelector(".region-panel-body");
const regionGalleryNode = document.querySelector("#regionGallery");
const regionTimelineNode = document.querySelector("#regionTimeline");
const tagAtlasSectionNode = document.querySelector("#tagAtlas");
const tagFilterNode = document.querySelector("#tagFilter");
const tagSummaryNode = document.querySelector("#tagSummary");
const tagAtlasGalleryNode = document.querySelector("#tagAtlasGallery");

const zoomInButton = document.querySelector("#zoomInButton");
const zoomOutButton = document.querySelector("#zoomOutButton");
const resetViewButton = document.querySelector("#resetViewButton");
const backButton = document.querySelector("#backButton");

const lightbox = document.querySelector(".lightbox");
const lightboxDialog = document.querySelector(".lightbox-dialog");
const lightboxImage = document.querySelector(".lightbox-image");
const lightboxMeta = document.querySelector(".lightbox-meta");
const lightboxGear = document.querySelector(".lightbox-gear");
const lightboxTagRail = document.querySelector(".lightbox-photo-tags");
const lightboxCloseButtons = document.querySelectorAll(
  ".lightbox-backdrop, .lightbox-close"
);
const revealItems = document.querySelectorAll(".reveal");

const appState = {
  chart: null,
  currentArea: { adcode: "100000", name: "中国", level: "country" },
  stack: [{ adcode: "100000", name: "中国", level: "country" }],
  featureMap: new Map(),
  features: [],
  timelineObserver: null,
  tagAtlasAnimationToken: 0,
  tagCategoryIndicatorLayout: null,
  tagFilterResizeToken: 0,
  tagCategoryHoverEnabled: true,
  selectedTagCategory: "",
  selectedTag: "",
  expandedTagCategories: new Set(),
  zoom: 1.05,
  loadedCatalogChunks: new Set(
    Object.keys(photoCatalog)
      .map((item) => String(item))
      .filter((adcode) => /^\d{6}$/.test(adcode) && adcode !== "100000")
  ),
  loadingCatalogChunks: new Map(),
  galleryRenderToken: 0,
  tagAtlasDataRequested: false,
  hasWarmedCatalogChunks: false,
  normalizedAlbumCacheByArea: new Map(),
};

const geoJSONCache = new Map();
const albumPhotoCountCache = new Map();
const recentAlbumsCache = new Map();
const catalogChunkScriptPromiseCache = new Map();
let catalogAlbums = [];
let pendingChartResizeFrame = 0;
let pendingAlbumLayoutFrame = 0;
let storyTrackMotionFrame = 0;
let storyTrackCurrentOffset = 0;
let storyTrackTargetOffset = 0;
let lastStoryScrollY = window.scrollY || 0;
const themeMediaQuery =
  typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
const ENABLE_DESKTOP_MAP_PERFORMANCE_MODE = true;
const STORY_TRACK_REPEATS = 5;

const STORY_ROW_SETTINGS = [
  { speed: -0.7, lift: -34 },
  { speed: 0.92, lift: 18 },
  { speed: -1.08, lift: -6 },
  { speed: 0.84, lift: 28 },
  { speed: -0.96, lift: 8 },
];
const TAG_CATEGORY_GROUPS = [
  {
    name: "人文摄影",
    tags: [
      "人物", "人群", "街景", "胡同", "古镇", "故居", "乡村", "街区",
      "行人", "游客", "乘客", "人像", "校园", "村庄", "村居", "村落",
      "街巷", "老街", "乌篷船", "摄影者", "写生", "旅途", "车厢", "自驾",
      "游人", "车窗", "舷窗", "窗景", "机翼", "公交前排", "航空箱", "宠物",
      "宠物犬", "长毛猫", "小狗", "牵引绳", "红色玩具", "吐舌", "趴卧", "站姿", "坐姿",
    ],
  },
  {
    name: "风光摄影",
    tags: [
      "山景", "水景", "山水", "海边", "沙滩", "江景", "湖景", "日落", "自然", "蓝天",
      "草原", "草坡", "草场", "草甸", "草岸", "山谷", "山坡", "山峰", "山脊", "山路",
      "山形", "山口", "山海", "海湾", "海岸", "海面", "海浪", "江面", "湖面", "水面",
      "水岸", "湖岸", "溪流", "溪谷", "倒影", "云层", "云影", "云团", "云霞", "晚霞",
      "落日", "远山", "地平线", "营地", "风机", "礁石", "土林", "峡谷", "湿地", "航拍",
      "全景", "静水", "波纹", "白云", "河道", "田野", "堤岸", "堤道", "步道", "公路",
      "彩虹路", "盘山路", "土路", "湖畔", "蓝空", "霞光", "暮色", "夜色", "远景",
      "渔船", "游船", "货船", "船只", "渔港", "羊群", "鹅群", "牛群", "牛犊", "母牛",
      "白山羊", "骆驼", "鸵鸟", "火烈鸟", "鹈鹕", "巨嘴鸟", "鹦鹉", "双鸟", "群栖", "栖枝",
      "探头", "牧马", "牧场", "围栏", "卧牛", "饮水", "草丛", "草径", "火山口", "环形山",
      "乱石", "云海", "日晕", "月亮", "白桦", "林带", "林梢",
    ],
  },
  {
    name: "城市建筑",
    tags: [
      "城市夜景", "城市", "高楼", "建筑", "地标建筑", "古建", "寺庙", "城楼", "石窟", "石景",
      "桥", "门窗", "屋檐", "台阶", "场馆", "夜景", "天际线", "桥梁", "古桥", "桥塔",
      "码头", "港口", "站房", "站台", "铁路", "白塔", "故宫", "牌楼", "斗拱", "飞檐",
      "檐角", "屋脊", "藻井", "木构", "亭台", "教堂", "塔楼", "门头", "橱窗", "店招",
      "民居", "寺门", "地标", "楼梯", "天安门", "央视大楼", "佛像", "佛龛", "窟龛", "洞窟",
      "崖壁", "石栏", "纹样", "雕刻", "匾额", "拱门", "桥洞", "水巷", "壁画", "文创", "手办",
      "停车场", "列车", "车流", "夜路",
    ],
  },
  {
    name: "花卉植物",
    tags: [
      "花卉", "郁金香", "树木", "树叶", "枝叶", "绿植", "草地", "公园", "园林", "银杏",
      "樱花", "红枫", "红叶", "秋叶", "树冠", "树影", "树梢", "花枝", "花簇", "花田",
      "花海", "桂花", "黄花", "粉花", "嫩叶", "枝干", "枝头", "竹林", "竹子", "柳树",
      "花树", "油菜花", "草坪", "野花",
      "垂柳", "树枝",
    ],
  },
  {
    name: "现场纪实",
    tags: [
      "演唱会", "舞台", "网球", "比赛", "运动", "球拍", "烟花", "赛车", "赛道", "看台",
      "弯道", "双车", "多车", "对决", "引导车", "赛事", "发球", "回球", "双打", "球场",
      "舞台屏幕", "观众", "荧光棒", "灯会", "灯笼", "鱼灯", "热气球", "喷火", "夜场",
      "展车", "球景", "街头表演", "活动", "邓紫棋", "灯光", "跑车", "戏甲", "戏装", "彩灯", "孔雀灯",
    ],
  },
];
const STORY_COVER_SOURCES = [
  "./assets/photos/072d124aae166ff8880594b269429815.jpg",
  "./assets/photos/34333706e92f68c7ae9fa21df6f78eb8.jpg",
  "./assets/photos/5310ba3f4e558dd866562f00931efa16.jpg",
  "./assets/photos/701abd6fe18ce3e43650cbec2f6f3eed.jpg",
  "./assets/photos/bc2c8a567dbff5c9a4b8fc6355b1f57e.jpg",
  "./assets/photos/e33ea68ee1e9be03cdc2fb3bda82ff39.jpg",
  "./assets/photos/066da647854c7cc3f736623024c0f867.jpg",
  "./assets/photos/196103b279a3ddc1a2ffd4a57a96c32b.jpg",
  "./assets/photos/44b1e00ce82ccc4b1a3c337879b7015a.jpg",
  "./assets/photos/942e430c7f938588d9f7aae579f7427a.jpg",
  "./assets/photos/b67ed450a01c35f93f2dd71590d3df89.jpg",
  "./assets/photos/ba1f44775ed5b9aa968ecee3d2bf2fca.jpg",
  "./assets/photos/bac6d8ee05999498a3b0cb65b46bddc1.jpg",
  "./assets/photos/f1ff5f2179ec7b5559e10251eec3cf23.jpg",
  "./assets/photos/0cb2b8b93419de860001d595ca1718c5.jpg",
  "./assets/photos/2697fe00b7afae9b0c743388b095db98.jpg",
  "./assets/photos/28a0ca90278ba814b3b1e038a3c4e519.jpg",
  "./assets/photos/46d29377220fbae81704781ea3129d73.jpg",
  "./assets/photos/a725133d0434f8e8ba92cbd9ddc17abe.jpg",
  "./assets/photos/fee4b317663ab162cea218f8d83d14b2.jpg",
  "./assets/photos/0cdff5bf2bc741ce06f1e83bb6eb3c7c.jpg",
  "./assets/photos/1c115cae0b8f3a08f34a27f4ef2f0286.jpg",
  "./assets/photos/2f4ec1f1fcac1ef5a72ebe58433aecc7.jpg",
  "./assets/photos/43c6b1da6291d5dcf1c431d475c372f0.jpg",
  "./assets/photos/6521d43698e3f1f0d6f6d2be3aa29d1d.jpg",
  "./assets/photos/9d69c7fc19bd217a18d431772e81afa1.jpg",
  "./assets/photos/a1275fc30684830461a3d246454df80d.jpg",
  "./assets/photos/d150162191c00b1a21d21fa36ef23d96.jpg",
  "./assets/photos/dadb8967c23ec088d078342208093dc8.jpg",
  "./assets/photos/12c10580ef13a08aadf4bc2d222d4315.jpg",
  "./assets/photos/208d9145cfadcba3bd29f68a8ec77d24.jpg",
  "./assets/photos/3129a9ac7bfecf2f592f27e40b7841db.jpg",
  "./assets/photos/38f43eb63b1c6cff373c50e88eef3cb0.jpg",
  "./assets/photos/4cfe19255836fdbda1824b21106fda49.jpg",
  "./assets/photos/9d35ab808efe5a19e54af2822a3a6339.jpg",
  "./assets/photos/d64309798e431edf0f33cc3b92b52914.jpg",
  "./assets/photos/44fd9c1d063124fe6c5a058228439b31.jpg",
  "./assets/photos/7b51c6631d6bfffbe4dd49d6593a5351.jpg",
  "./assets/photos/83e2d799704e7efd8878b150db38962e.jpg",
  "./assets/photos/af2d1513a0c2c01161c78ebf8e0ef748.jpg",
  "./assets/photos/c0b5789ec966c17e9944047cd4ea8961.jpg",
  "./assets/photos/cccc80dca550570e25495ad0e4819486.jpg",
  "./assets/photos/70fbe8034c536cc0e8ccfc9dcd737544.jpg",
  "./assets/photos/7757ffb5b1331ef97f29251b692cace6.jpg",
  "./assets/photos/c84212cd7eb50447496b5210631b7691.jpg",
  "./assets/photos/04a7a7ce8e42b96039b0296bdce542e1.jpg",
  "./assets/photos/1b526573ca0ae172fe7628f2f6758cde.jpg",
  "./assets/photos/7523d08d9641ccb2041a175c4a24dc3b.jpg",
  "./assets/photos/7fffdeebc14110a07282a65a9a55e672.jpg",
  "./assets/photos/92b19f06c2f819b9815329e95013b901.jpg",
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const isDarkModePreferred = () => Boolean(themeMediaQuery?.matches);

const getMapThemePalette = () =>
  isDarkModePreferred()
    ? {
        tooltipText: "#c9d1d9",
        visualMapText: "#8b949e",
        visualMapRange: ["#11161d", "#1b2d46", "#2a4f7f"],
        labelColor: "#c9d1d9",
        areaColor: "#161b22",
        borderColor: "rgba(48, 54, 61, 0.98)",
        shadowColor: "rgba(2, 8, 13, 0.32)",
        emphasisLabelColor: "#0d1117",
        emphasisAreaColor: "#f0f6fc",
        emphasisBorderColor: "#ffffff",
        selectAreaColor: "#ffffff",
        selectBorderColor: "#f0f6fc",
        selectLabelColor: "#0d1117",
      }
    : {
        tooltipText: "#13212b",
        visualMapText: "#607181",
        visualMapRange: ["#dbe7ec", "#89a7b1", "#35586a"],
        labelColor: "#20333f",
        areaColor: "#dbe7ec",
        borderColor: "#ffffff",
        shadowColor: "rgba(19, 33, 43, 0.08)",
        emphasisLabelColor: "#ffffff",
        emphasisAreaColor: "#cf6f43",
        emphasisBorderColor: "#fff6ed",
        selectAreaColor: "#8e4a2e",
        selectBorderColor: "#fff6ed",
        selectLabelColor: "#ffffff",
      };

const getAreaLevelRank = (level) => AREA_LEVEL_ORDER[level] ?? 0;

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const normalizeTags = (value) =>
  [...new Set((Array.isArray(value) ? value : []).map((item) => String(item || "").trim()).filter(Boolean))];

const serializeTags = (tags) => JSON.stringify(normalizeTags(tags));

const parseTagPayload = (value) => {
  if (!value) {
    return [];
  }

  try {
    return normalizeTags(JSON.parse(value));
  } catch (error) {
    return [];
  }
};

const renderTagRail = (label, tags) => {
  const normalizedTags = normalizeTags(tags);

  if (!normalizedTags.length) {
    return "";
  }

  return `
    ${label ? `<span class="tag-rail-label">${escapeHtml(label)}</span>` : ""}
    ${normalizedTags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("")}
  `;
};

const syncTagRail = (node, label, tags) => {
  if (!node) {
    return;
  }

  node.innerHTML = renderTagRail(label, tags);
};

const getTagCategory = (tag) =>
  TAG_CATEGORY_GROUPS.find((group) => group.tags.includes(tag))?.name || "更多主题";

const getBoundaryUrls = (adcode) =>
  GEO_DATA_SOURCES.map((baseUrl) => `${baseUrl}/${adcode}_full.json`);

const normalizeAdcode = (value) => {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return "";
  }

  const sixDigitMatch = raw.match(/\d{6}/);

  if (sixDigitMatch) {
    return sixDigitMatch[0];
  }

  const digitsOnly = raw.replace(/\D/g, "");
  return digitsOnly.length === 6 ? digitsOnly : "";
};

const CATALOG_CHUNK_KEYS = Array.isArray(photoCatalogChunkMeta.chunkKeys)
  ? photoCatalogChunkMeta.chunkKeys.map((key) => normalizeAdcode(key)).filter(Boolean)
  : [];
const CATALOG_CHUNK_KEY_SET = new Set(CATALOG_CHUNK_KEYS);
const CATALOG_CHUNK_URLS = photoCatalogChunkMeta.chunkUrls || {};

const getChunkCandidatesForAdcode = (adcode) => {
  const normalizedAdcode = normalizeAdcode(adcode);

  if (!normalizedAdcode || normalizedAdcode === "100000") {
    return [];
  }

  const candidates = [
    normalizedAdcode,
    `${normalizedAdcode.slice(0, 4)}00`,
    `${normalizedAdcode.slice(0, 2)}0000`,
  ];

  return [...new Set(candidates)].filter(Boolean);
};

const resolveCatalogChunkKey = (adcode) =>
  getChunkCandidatesForAdcode(adcode).find((candidate) => CATALOG_CHUNK_KEY_SET.has(candidate)) || "";

const getPhotoFilename = (src) => String(src || "").split("/").pop() || "";

const getPhotoVariantSrc = (src, variant = "display") => {
  const normalizedSrc = String(src || "");
  const filename = getPhotoFilename(normalizedSrc);

  if (!normalizedSrc || !filename || normalizedSrc.endsWith(".svg")) {
    return normalizedSrc;
  }

  if (variant === "thumb") {
    return `./assets/photos/thumb/${filename}`;
  }

  if (variant === "display") {
    return `./assets/photos/display/${filename}`;
  }

  return normalizedSrc;
};

const buildImageSrcSet = (src) => {
  const normalizedSrc = String(src || "");

  if (!normalizedSrc || normalizedSrc.endsWith(".svg")) {
    return "";
  }

  const thumbSrc = getPhotoVariantSrc(normalizedSrc, "thumb");
  const displaySrc = getPhotoVariantSrc(normalizedSrc, "display");
  return `${escapeHtml(thumbSrc)} 480w, ${escapeHtml(displaySrc)} 1200w`;
};

const buildResponsiveImage = ({
  src = "",
  alt = "",
  className = "",
  sizeHint = "100vw",
  loading = "lazy",
  decoding = "async",
  fetchpriority = "low",
  variant = "display",
  useSrcSet = true,
}) => {
  const normalizedSrc = String(src || "");

  if (!normalizedSrc) {
    return "";
  }

  const resolvedClassName = className ? ` class="${escapeHtml(className)}"` : "";
  const resolvedSrc = getPhotoVariantSrc(normalizedSrc, variant);
  const srcSet = useSrcSet ? buildImageSrcSet(normalizedSrc) : "";
  const sourceMarkup = srcSet
    ? `<source srcset="${srcSet}" sizes="${escapeHtml(sizeHint)}" />`
    : "";

  return `
    <picture>
      ${sourceMarkup}
      <img
        src="${escapeHtml(resolvedSrc)}"
        alt="${escapeHtml(alt)}"${resolvedClassName}
        loading="${escapeHtml(loading)}"
        decoding="${escapeHtml(decoding)}"
        fetchpriority="${escapeHtml(fetchpriority)}"
      />
    </picture>
  `;
};

const resetDerivedCatalogCaches = () => {
  albumPhotoCountCache.clear();
  recentAlbumsCache.clear();
  appState.allRealPhotos = null;
  appState.storyCoverPhotos = null;
  appState.allTaggedPhotos = null;
  appState.tagCollections = null;
  appState.tagCategoryCollections = null;
  appState.normalizedAlbumCacheByArea = new Map();
};

const rebuildCatalogAlbums = () => {
  catalogAlbums = Object.entries(photoCatalog).flatMap(([ownerAdcode, albums]) =>
    (Array.isArray(albums) ? albums : []).map((album, albumIndex) => ({
      ...album,
      ownerAdcode,
      catalogKey: getAlbumKey(album, `${ownerAdcode}-${albumIndex}`),
    }))
  );
};

const ingestCatalogChunkPayload = (chunkKey) => {
  const normalizedChunkKey = normalizeAdcode(chunkKey);
  const payload = photoCatalogChunkPayload[normalizedChunkKey];

  if (!Array.isArray(payload)) {
    return false;
  }

  photoCatalog[normalizedChunkKey] = payload;
  appState.loadedCatalogChunks.add(normalizedChunkKey);
  rebuildCatalogAlbums();
  resetDerivedCatalogCaches();
  return true;
};

const loadCatalogChunkScript = (chunkKey) => {
  const normalizedChunkKey = normalizeAdcode(chunkKey);

  if (!normalizedChunkKey || appState.loadedCatalogChunks.has(normalizedChunkKey)) {
    return Promise.resolve();
  }

  if (catalogChunkScriptPromiseCache.has(normalizedChunkKey)) {
    return catalogChunkScriptPromiseCache.get(normalizedChunkKey);
  }

  const chunkUrl = CATALOG_CHUNK_URLS[normalizedChunkKey];

  if (!chunkUrl) {
    return Promise.resolve();
  }

  const scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = chunkUrl;
    script.async = true;
    script.onload = () => {
      if (ingestCatalogChunkPayload(normalizedChunkKey)) {
        resolve();
        return;
      }

      reject(new Error(`图片数据分块加载失败：${normalizedChunkKey}`));
    };
    script.onerror = () => reject(new Error(`图片数据分块请求失败：${normalizedChunkKey}`));
    document.head.append(script);
  }).finally(() => {
    catalogChunkScriptPromiseCache.delete(normalizedChunkKey);
    appState.loadingCatalogChunks.delete(normalizedChunkKey);
  });

  catalogChunkScriptPromiseCache.set(normalizedChunkKey, scriptPromise);
  appState.loadingCatalogChunks.set(normalizedChunkKey, scriptPromise);
  return scriptPromise;
};

const ensureCatalogChunkLoaded = async (chunkKey) => {
  const normalizedChunkKey = normalizeAdcode(chunkKey);

  if (!normalizedChunkKey) {
    return;
  }

  if (appState.loadedCatalogChunks.has(normalizedChunkKey)) {
    return;
  }

  if (ingestCatalogChunkPayload(normalizedChunkKey)) {
    return;
  }

  await loadCatalogChunkScript(normalizedChunkKey);
};

const ensureCatalogForArea = async (adcode) => {
  const chunkKey = resolveCatalogChunkKey(adcode);

  if (!chunkKey) {
    return;
  }

  await ensureCatalogChunkLoaded(chunkKey);
};

const ensureAllCatalogChunksLoaded = async () => {
  if (!CATALOG_CHUNK_KEYS.length) {
    return;
  }

  await Promise.all(CATALOG_CHUNK_KEYS.map((chunkKey) => ensureCatalogChunkLoaded(chunkKey)));
};

const areAllCatalogChunksLoaded = () =>
  !CATALOG_CHUNK_KEYS.length ||
  CATALOG_CHUNK_KEYS.every((chunkKey) => appState.loadedCatalogChunks.has(chunkKey));

const scheduleCatalogChunkWarmup = () => {
  if (appState.hasWarmedCatalogChunks || !CATALOG_CHUNK_KEYS.length) {
    return;
  }

  const prefersSaveData = Boolean(navigator.connection?.saveData);

  if (prefersSaveData) {
    return;
  }

  appState.hasWarmedCatalogChunks = true;
  const runWarmup = () => {
    ensureAllCatalogChunksLoaded().catch((error) => {
      console.error(error);
    });
  };

  if ("requestIdleCallback" in window) {
    window.setTimeout(() => {
      window.requestIdleCallback(runWarmup, { timeout: 1800 });
    }, 800);
    return;
  }

  window.setTimeout(runWarmup, 1200);
};

const isMobilePerformanceMode = () =>
  window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
const isMapPerformanceMode = () =>
  isMobilePerformanceMode() || ENABLE_DESKTOP_MAP_PERFORMANCE_MODE;

const getStoryCoverAsset = (src) =>
  String(src || "").replace("./assets/photos/", "./assets/photos/story-cover/");

const getFeatureAdcode = (feature) =>
  normalizeAdcode(
    feature?.properties?.adcode ||
      feature?.properties?.adcode_district ||
      feature?.properties?.adcode_city ||
      feature?.properties?.adcode_pro ||
      feature?.properties?.code ||
      feature?.properties?.id ||
      feature?.id
  );

const inferAreaLevelFromAdcode = (adcode, parentArea) => {
  if (adcode === "100000") {
    return "country";
  }

  if (adcode.endsWith("0000")) {
    return "province";
  }

  if (adcode.endsWith("00")) {
    return "city";
  }

  if (parentArea?.level === "province" && directControlledMunicipalities.has(parentArea.adcode)) {
    return "district";
  }

  return "district";
};

const getAlbumKey = (album, fallbackIndex) =>
  album.id || [album.title, album.meta, album.location, fallbackIndex].filter(Boolean).join("::");

const getAdcodeLevel = (adcode) => {
  const normalizedAdcode = normalizeAdcode(adcode);

  if (!normalizedAdcode) {
    return "";
  }

  if (normalizedAdcode === "100000") {
    return "country";
  }

  if (normalizedAdcode.endsWith("0000")) {
    return "province";
  }

  if (normalizedAdcode.endsWith("00")) {
    return "city";
  }

  return "district";
};

const isAlbumWithinArea = (targetAdcode, areaAdcode) => {
  const normalizedTarget = normalizeAdcode(targetAdcode);
  const normalizedArea = normalizeAdcode(areaAdcode);

  if (!normalizedTarget || !normalizedArea) {
    return false;
  }

  if (normalizedArea === "100000") {
    return true;
  }

  if (normalizedTarget === normalizedArea) {
    return true;
  }

  const areaLevel = getAdcodeLevel(normalizedArea);

  if (areaLevel === "province") {
    return normalizedTarget.slice(0, 2) === normalizedArea.slice(0, 2);
  }

  if (areaLevel === "city") {
    return normalizedTarget.slice(0, 4) === normalizedArea.slice(0, 4);
  }

  return false;
};

const getCatalogAlbums = () => catalogAlbums;
rebuildCatalogAlbums();

const isPlaceholderAsset = (photo) => {
  const source = typeof photo === "string" ? photo : photo?.src;
  return String(source || "").endsWith(".svg");
};

const getAssetCount = (album, { includePlaceholders = true } = {}) => {
  const items = album.photos || album.images || [];

  if (includePlaceholders) {
    return items.length;
  }

  return items.filter((item) => !isPlaceholderAsset(item)).length;
};

const getPhotoSrc = (photo) => (typeof photo === "string" ? photo : photo?.src || "");

const getAlbumCoverSrc = (album) => {
  const photoCover = Array.isArray(album.photos) ? getPhotoSrc(album.photos[0]) : "";
  const imageCover = Array.isArray(album.images) ? getPhotoSrc(album.images[0]) : "";
  return photoCover || imageCover || "";
};

const getShotOnValue = (shotOn) => Number(String(shotOn || "").replaceAll(".", "")) || 0;

const getCityNameFromLocation = (location) => {
  const normalizedLocation = String(location || "");
  const municipalityMatch = normalizedLocation.match(/^(北京市|天津市|上海市|重庆市)/);

  if (municipalityMatch) {
    return municipalityMatch[1];
  }

  const cityMatch = normalizedLocation.match(/(?:^|省|自治区|特别行政区)([^·]+?市)/);
  return cityMatch?.[1] || "";
};

const getProvinceNameFromLocation = (location) => {
  const normalizedLocation = String(location || "");
  const municipalityMatch = normalizedLocation.match(/^(北京市|天津市|上海市|重庆市)/);

  if (municipalityMatch) {
    return municipalityMatch[1];
  }

  const provinceMatch = normalizedLocation.match(/^([^·]+?(?:省|自治区|特别行政区))/);
  return provinceMatch?.[1] || "";
};

const buildAreaEntryStack = (area, location = "") => {
  const normalizedAdcode = normalizeAdcode(area.adcode);
  const cityName = getCityNameFromLocation(location) || area.name;
  const provinceName = getProvinceNameFromLocation(location);

  if (!normalizedAdcode || normalizedAdcode === "100000") {
    return [{ adcode: "100000", name: "中国", level: "country" }];
  }

  if (area.level === "province") {
    return [
      { adcode: "100000", name: "中国", level: "country" },
      {
        adcode: normalizedAdcode,
        name: provinceName || area.name,
        level: "province",
      },
    ];
  }

  if (area.level === "city") {
    if (directControlledMunicipalities.has(normalizedAdcode)) {
      return [
        { adcode: "100000", name: "中国", level: "country" },
        {
          adcode: normalizedAdcode,
          name: cityName || area.name,
          level: "city",
        },
      ];
    }

    return [
      { adcode: "100000", name: "中国", level: "country" },
      {
        adcode: `${normalizedAdcode.slice(0, 2)}0000`,
        name: provinceName || area.name,
        level: "province",
      },
      {
        adcode: normalizedAdcode,
        name: cityName || area.name,
        level: "city",
      },
    ];
  }

  return [
    { adcode: "100000", name: "中国", level: "country" },
    area,
  ];
};

const getAlbumJumpArea = (album) => {
  const areaTargets = Array.isArray(album.areas) ? album.areas : [];
  const cityAdcode =
    areaTargets.find((adcode) => {
      const normalizedAdcode = normalizeAdcode(adcode);
      return normalizedAdcode.endsWith("00") && !normalizedAdcode.endsWith("0000");
    }) ||
    (directControlledMunicipalities.has(normalizeAdcode(album.ownerAdcode))
      ? normalizeAdcode(album.ownerAdcode)
      : normalizeAdcode(album.ownerAdcode));

  const isMunicipality = directControlledMunicipalities.has(cityAdcode);
  const inferredLevel =
    isMunicipality || (cityAdcode.endsWith("00") && !cityAdcode.endsWith("0000"))
      ? "city"
      : cityAdcode.endsWith("0000")
        ? "province"
        : "district";

  return {
    adcode: cityAdcode,
    level: inferredLevel,
    name:
      getCityNameFromLocation(album.location) ||
      String(album.title || "").split(" · ")[0] ||
      String(album.title || ""),
  };
};

const getRecentAlbums = (limit = 4) =>
  {
    if (recentAlbumsCache.has(limit)) {
      return recentAlbumsCache.get(limit);
    }

    const sourceAlbums =
      !areAllCatalogChunksLoaded() && photoCatalogRecentAlbumsSeed.length
        ? photoCatalogRecentAlbumsSeed
        : getCatalogAlbums();

    const result = sourceAlbums
      .filter(
        (album) =>
          getShotOnValue(album.shotOn) > 0 && getAssetCount(album, { includePlaceholders: false }) > 0
      )
      .sort((left, right) => getShotOnValue(right.shotOn) - getShotOnValue(left.shotOn))
      .slice(0, limit);

    recentAlbumsCache.set(limit, result);
    return result;
  };

const getAllRealPhotos = () => {
  if (appState.allRealPhotos) {
    return appState.allRealPhotos;
  }

  const uniquePhotos = new Map();

  getCatalogAlbums().forEach((album) => {
    const area = getAlbumJumpArea(album);
    const normalizedAlbum = normalizeAlbum(album, area);

    normalizedAlbum.photos
      .filter((photo) => !isPlaceholderAsset(photo))
      .forEach((photo) => {
        if (!uniquePhotos.has(photo.src)) {
          uniquePhotos.set(photo.src, photo);
        }
      });
  });

  appState.allRealPhotos = [...uniquePhotos.values()];
  return appState.allRealPhotos;
};

const getStoryCoverPhotos = () => {
  if (appState.storyCoverPhotos) {
    return appState.storyCoverPhotos;
  }

  const photoMap = new Map(getAllRealPhotos().map((photo) => [photo.src, photo]));
  appState.storyCoverPhotos = STORY_COVER_SOURCES.map((src, index) => {
    const photo = photoMap.get(src) || { src, alt: `首页照片流 ${index + 1}` };

    return {
      ...photo,
      coverSrc: getStoryCoverAsset(src),
    };
  });

  return appState.storyCoverPhotos;
};

const getAllTaggedPhotos = () => {
  if (appState.allTaggedPhotos) {
    return appState.allTaggedPhotos;
  }

  const taggedPhotos = [];

  getCatalogAlbums().forEach((album) => {
    const area = getAlbumJumpArea(album);
    const normalizedAlbum = normalizeAlbum(album, area);

    normalizedAlbum.photos
      .filter((photo) => !isPlaceholderAsset(photo) && photo.tags.length)
      .forEach((photo) => {
        taggedPhotos.push({
          ...photo,
          albumTitle: normalizedAlbum.title || normalizedAlbum.location || area.name,
          albumMeta: normalizedAlbum.meta || "",
          albumLocation: normalizedAlbum.location || area.name,
          albumGroupTags: normalizedAlbum.groupTags || [],
          shotOnValue: getShotOnValue(photo.shotOn || normalizedAlbum.shotOn),
        });
      });
  });

  taggedPhotos.sort((left, right) => {
    if (right.shotOnValue !== left.shotOnValue) {
      return right.shotOnValue - left.shotOnValue;
    }

    return String(left.albumTitle || "").localeCompare(String(right.albumTitle || ""), "zh-CN");
  });

  appState.allTaggedPhotos = taggedPhotos;
  return appState.allTaggedPhotos;
};

const getTagCollections = () => {
  if (appState.tagCollections) {
    return appState.tagCollections;
  }

  const collections = new Map();

  getAllTaggedPhotos().forEach((photo) => {
    photo.tags.forEach((tag) => {
      if (!collections.has(tag)) {
        collections.set(tag, []);
      }

      collections.get(tag).push(photo);
    });
  });

  appState.tagCollections = [...collections.entries()]
    .map(([tag, photos]) => ({
      tag,
      category: getTagCategory(tag),
      photos,
      count: photos.length,
    }))
    .sort((left, right) => {
      const leftCategoryIndex = TAG_CATEGORY_GROUPS.findIndex((group) => group.name === left.category);
      const rightCategoryIndex = TAG_CATEGORY_GROUPS.findIndex((group) => group.name === right.category);

      if (leftCategoryIndex !== rightCategoryIndex) {
        return (leftCategoryIndex === -1 ? TAG_CATEGORY_GROUPS.length : leftCategoryIndex) -
          (rightCategoryIndex === -1 ? TAG_CATEGORY_GROUPS.length : rightCategoryIndex);
      }

      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.tag.localeCompare(right.tag, "zh-CN");
    });

  return appState.tagCollections;
};

const getTagCategoryCollections = () => {
  if (appState.tagCategoryCollections) {
    return appState.tagCategoryCollections;
  }

  const grouped = TAG_CATEGORY_GROUPS.map((group) => ({
    name: group.name,
    items: [],
  }));
  const fallbackGroup = {
    name: "更多主题",
    items: [],
  };

  getTagCollections().forEach((item) => {
    const targetGroup = grouped.find((group) => group.name === item.category) || fallbackGroup;
    targetGroup.items.push(item);
  });

  appState.tagCategoryCollections = [...grouped, fallbackGroup]
    .filter((group) => group.items.length)
    .map((group) => ({
      ...group,
      tagCount: group.items.length,
      photoCount: group.items.reduce((sum, item) => sum + item.count, 0),
    }));

  return appState.tagCategoryCollections;
};

const getPhotoCountForArea = (adcode) => {
  const normalizedAdcode = normalizeAdcode(adcode);

  if (!normalizedAdcode) {
    return 0;
  }

  if (albumPhotoCountCache.has(normalizedAdcode)) {
    return albumPhotoCountCache.get(normalizedAdcode);
  }

  if (Object.prototype.hasOwnProperty.call(photoCatalogPhotoCounts, normalizedAdcode)) {
    const seededTotal = Number(photoCatalogPhotoCounts[normalizedAdcode]) || 0;
    albumPhotoCountCache.set(normalizedAdcode, seededTotal);
    return seededTotal;
  }

  const total = getCatalogAlbums()
    .filter((album, albumIndex, albums) => {
      const targets = [album.ownerAdcode, ...(Array.isArray(album.areas) ? album.areas : [])];
      const matchesArea = targets.some((targetAdcode) => isAlbumWithinArea(targetAdcode, normalizedAdcode));

      if (!matchesArea) {
        return false;
      }

      return albumIndex === albums.findIndex((item) => item.catalogKey === album.catalogKey);
    })
    .reduce((sum, album) => sum + getAssetCount(album, { includePlaceholders: false }), 0);

  albumPhotoCountCache.set(normalizedAdcode, total);
  return total;
};

const hasPhotosInArea = (adcode) => getPhotoCountForArea(adcode) > 0;

const normalizePhoto = (photo, album, area, photoIndex) => {
  const rawPhoto = typeof photo === "string" ? { src: photo } : photo;
  const location = rawPhoto.location || album.location || area.name;
  const shotOn = rawPhoto.shotOn || album.shotOn || "";
  const isPlaceholderImage = String(rawPhoto.src || "").endsWith(".svg");
  const metaLine = rawPhoto.metaLine || [location, shotOn, `第 ${photoIndex + 1} 张`].filter(Boolean).join(" · ");
  const hasPhotoCamera = Object.prototype.hasOwnProperty.call(rawPhoto, "camera");
  const hasPhotoLens = Object.prototype.hasOwnProperty.call(rawPhoto, "lens");
  const cameraValue = hasPhotoCamera ? rawPhoto.camera : album.camera;
  const lensValue = hasPhotoLens ? rawPhoto.lens : hasPhotoCamera ? "" : album.lens;
  const hasExplicitGear = Boolean(cameraValue || lensValue);
  const gearLine =
    rawPhoto.gearLine ||
    [
      cameraValue || (isPlaceholderImage || hasExplicitGear ? "" : DEFAULT_CAMERA),
      lensValue || (isPlaceholderImage || hasExplicitGear ? "" : DEFAULT_LENS),
    ]
      .filter(Boolean)
      .join(" · ");
  const camera = cameraValue || (isPlaceholderImage || hasExplicitGear ? "" : DEFAULT_CAMERA);
  const lens = lensValue || (isPlaceholderImage || hasExplicitGear ? "" : DEFAULT_LENS);

  return {
    src: rawPhoto.src || "",
    title: rawPhoto.title || "",
    alt:
      rawPhoto.alt ||
      [album.title || album.location || area.name, `第 ${photoIndex + 1} 张`]
        .filter(Boolean)
        .join(" · "),
    caption: rawPhoto.caption || "",
    metaLine,
    gearLine,
    camera,
    lens,
    location,
    shotOn,
    albumTitle: album.title || album.location || area.name,
    tags: normalizeTags(rawPhoto.tags),
  };
};

const normalizeAlbum = (album, area) => {
  const rawPhotos = album.photos || album.images || [];

  return {
    ...album,
    groupTags: normalizeTags(album.groupTags),
    photos: rawPhotos.map((photo, photoIndex) => normalizePhoto(photo, album, area, photoIndex)),
  };
};

const getNormalizedAlbumForArea = (album, area) => {
  const cacheKey = `${normalizeAdcode(area.adcode)}::${album.catalogKey || getAlbumKey(album, "")}`;

  if (appState.normalizedAlbumCacheByArea.has(cacheKey)) {
    return appState.normalizedAlbumCacheByArea.get(cacheKey);
  }

  const normalized = normalizeAlbum(album, area);
  appState.normalizedAlbumCacheByArea.set(cacheKey, normalized);
  return normalized;
};

const getAlbumsForArea = (area) => {
  const normalizedAreaAdcode = normalizeAdcode(area.adcode);
  const mergedAlbums = getCatalogAlbums().filter((album) => {
    const targets = [album.ownerAdcode, ...(Array.isArray(album.areas) ? album.areas : [])];
    return targets.some((targetAdcode) => isAlbumWithinArea(targetAdcode, normalizedAreaAdcode));
  });

  const uniqueAlbums = mergedAlbums.filter((album, albumIndex, albums) => {
    const currentKey = album.catalogKey || getAlbumKey(album, albumIndex);
    return albumIndex === albums.findIndex((item, itemIndex) => {
      const candidateKey = item.catalogKey || getAlbumKey(item, itemIndex);
      return candidateKey === currentKey;
    });
  });

  return uniqueAlbums
    .slice()
    .sort((left, right) => {
      const leftShotOn = getShotOnValue(left.shotOn);
      const rightShotOn = getShotOnValue(right.shotOn);

      if (leftShotOn !== rightShotOn) {
        return rightShotOn - leftShotOn;
      }

      return getAlbumKey(left, "").localeCompare(getAlbumKey(right, ""), "zh-CN");
    });
};

const renderStoryBackdrop = (photos) => {
  if (!storyBackdropNode || !Array.isArray(photos) || !photos.length) {
    return;
  }

  const rows = 5;
  const distributedPhotos = Array.from({ length: rows }, () => []);
  const rotatePattern = [-6, 4, -3, 6, -5, 3, -2, 5];
  const shiftPattern = [-18, 14, -8, 22, -12, 16, -6, 20];
  const overlapPattern = [40, 62, 48, 70, 44, 58, 36, 66];
  const widthPattern = [
    "clamp(190px, 14vw, 270px)",
    "clamp(220px, 15vw, 310px)",
    "clamp(176px, 12vw, 248px)",
    "clamp(208px, 14vw, 292px)",
  ];
  const widthPatternMobile = ["148px", "168px", "142px", "160px"];

  photos.forEach((photo, index) => {
    distributedPhotos[index % rows].push(photo);
  });

  storyBackdropNode.innerHTML = distributedPhotos
    .map((rowPhotos, rowIndex) => {
      const fallbackPhotos = photos.slice(rowIndex * 8, rowIndex * 8 + 12);
      const sourcePhotos = rowPhotos.length ? rowPhotos : fallbackPhotos;

      return `
        <div class="story-track">
          <div class="story-track-inner" data-story-row="${rowIndex}">
            ${Array.from({ length: STORY_TRACK_REPEATS }, (_, segmentIndex) => `
              <div class="story-track-segment" data-story-segment="${segmentIndex}">
                ${sourcePhotos
                  .map((photo, photoIndex) => {
                    const patternIndex = (photoIndex + rowIndex) % rotatePattern.length;

                    return `
                      <figure
                        class="story-photo-frame"
                        style="
                          --frame-rotate: ${rotatePattern[patternIndex]}deg;
                          --frame-shift-y: ${shiftPattern[patternIndex]}px;
                          --frame-overlap: ${overlapPattern[patternIndex]}px;
                          --frame-width: ${widthPattern[(photoIndex + rowIndex) % widthPattern.length]};
                          --frame-width-mobile: ${widthPatternMobile[(photoIndex + rowIndex) % widthPatternMobile.length]};
                        "
                      >
                        <img
                          src="${escapeHtml(photo.coverSrc || photo.src)}"
                          alt="${escapeHtml(photo.alt || photo.title || "照片流背景")}"
                          loading="lazy"
                          decoding="async"
                        />
                      </figure>
                    `;
                  })
                  .join("")}
              </div>
            `).join("")}
          </div>
        </div>
      `;
    })
    .join("");
};

const applyStoryTrackMotion = () => {
  if (!storyBackdropNode) {
    return;
  }

  storyBackdropNode.querySelectorAll(".story-track-inner").forEach((track, trackIndex) => {
    const rowSetting = STORY_ROW_SETTINGS[trackIndex % STORY_ROW_SETTINGS.length];
    const loopWidth = Number(track.dataset.loopWidth || 0);
    const anchorOffset = Number(track.dataset.anchorOffset || 0);
    let translateX = storyTrackCurrentOffset * rowSetting.speed;

    if (loopWidth > 0) {
      const wrappedOffset = ((translateX % loopWidth) + loopWidth) % loopWidth;
      translateX = anchorOffset - wrappedOffset;
    }

    track.style.transform = `translate3d(${translateX}px, ${rowSetting.lift}px, 0)`;
  });
};

const measureStoryTrackLoops = () => {
  if (!storyBackdropNode) {
    return;
  }

  storyBackdropNode.querySelectorAll(".story-track-inner").forEach((track) => {
    const firstSegment = track.querySelector(".story-track-segment");
    const loopWidth = firstSegment?.getBoundingClientRect().width || 0;

    if (!loopWidth) {
      return;
    }

    track.dataset.loopWidth = String(loopWidth);
    track.dataset.anchorOffset = String(-loopWidth * Math.floor(STORY_TRACK_REPEATS / 2));
  });

  applyStoryTrackMotion();
};

const animateStoryTrackMotion = () => {
  const delta = storyTrackTargetOffset - storyTrackCurrentOffset;

  storyTrackCurrentOffset += delta * 0.1;
  applyStoryTrackMotion();

  if (Math.abs(delta) < 0.4) {
    storyTrackCurrentOffset = storyTrackTargetOffset;
    applyStoryTrackMotion();
    storyTrackMotionFrame = 0;
    return;
  }

  storyTrackMotionFrame = window.requestAnimationFrame(animateStoryTrackMotion);
};

const nudgeStoryTrackMotion = (delta) => {
  storyTrackTargetOffset += delta;

  if (storyTrackMotionFrame) {
    return;
  }

  storyTrackMotionFrame = window.requestAnimationFrame(animateStoryTrackMotion);
};

const bindStoryWheelMotion = () => {
  if (!coverStoryNode) {
    return;
  }

  const onWheel = (event) => {
    const bounds = coverStoryNode.getBoundingClientRect();
    const isActive = bounds.top < window.innerHeight && bounds.bottom > 0;

    if (!isActive) {
      return;
    }

    const delta = (event.deltaY + event.deltaX) * 0.75;
    nudgeStoryTrackMotion(delta);
  };

  window.addEventListener("wheel", onWheel, { passive: true });
};

const bindStoryScrollMotion = () => {
  if (!coverStoryNode) {
    return;
  }

  const onScroll = () => {
    const nextScrollY = window.scrollY || 0;
    const delta = nextScrollY - lastStoryScrollY;
    lastStoryScrollY = nextScrollY;

    if (!delta) {
      return;
    }

    const bounds = coverStoryNode.getBoundingClientRect();
    const isActive = bounds.top < window.innerHeight && bounds.bottom > 0;

    if (!isActive) {
      return;
    }

    nudgeStoryTrackMotion(delta * 1.3);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
};

const setupStoryCover = () => {
  if (!coverStoryNode || !storyBackdropNode || !storyStageNode) {
    return;
  }

  const photos = getStoryCoverPhotos();

  if (!photos.length) {
    coverStoryNode.hidden = true;
    return;
  }

  renderStoryBackdrop(photos);
  window.requestAnimationFrame(() => {
    measureStoryTrackLoops();
    applyStoryTrackMotion();
  });
  bindStoryWheelMotion();
  bindStoryScrollMotion();
  window.addEventListener("resize", measureStoryTrackLoops);
};

const clearTimelineObserver = () => {
  if (!appState.timelineObserver) {
    return;
  }

  appState.timelineObserver.disconnect();
  appState.timelineObserver = null;
};

const setActiveTimelineItem = (albumIndex) => {
  if (!regionTimelineNode) {
    return;
  }

  let activeButton = null;

  regionTimelineNode.querySelectorAll(".timeline-link").forEach((button) => {
    const isActive = button.dataset.albumIndex === String(albumIndex);
    button.classList.toggle("is-active", isActive);

    if (isActive) {
      activeButton = button;
    }
  });

  if (!activeButton) {
    return;
  }

  const timelineBounds = regionTimelineNode.getBoundingClientRect();
  const buttonBounds = activeButton.getBoundingClientRect();
  const isAboveViewport = buttonBounds.top < timelineBounds.top + 18;
  const isBelowViewport = buttonBounds.bottom > timelineBounds.bottom - 18;

  if (isAboveViewport || isBelowViewport) {
    activeButton.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
};

const renderRegionTimeline = (albums) => {
  if (!regionTimelineNode) {
    return;
  }

  clearTimelineObserver();

  if (window.innerWidth <= 760) {
    regionPanelBodyNode?.classList.remove("has-timeline");
    regionTimelineNode.innerHTML = "";
    regionTimelineNode.hidden = true;
    return;
  }

  if (!Array.isArray(albums) || albums.length <= 1) {
    regionPanelBodyNode?.classList.remove("has-timeline");
    regionTimelineNode.innerHTML = "";
    regionTimelineNode.hidden = true;
    return;
  }

  regionPanelBodyNode?.classList.add("has-timeline");
  regionTimelineNode.hidden = false;
  regionTimelineNode.innerHTML = `
    <p class="timeline-eyebrow">快速跳转</p>
    ${albums
      .map((album, albumIndex) => {
        const dateText = album.shotOn || album.meta || `第 ${albumIndex + 1} 组`;
        const titleText = album.title || album.location || `相册 ${albumIndex + 1}`;

        return `
          <button class="timeline-link" type="button" data-album-index="${albumIndex}">
            <span class="timeline-dot" aria-hidden="true"></span>
            <span class="timeline-copy">
              <span class="timeline-date">${escapeHtml(dateText)}</span>
              <span class="timeline-title">${escapeHtml(titleText)}</span>
            </span>
          </button>
        `;
      })
      .join("")}
  `;

  regionTimelineNode.querySelectorAll(".timeline-link").forEach((button) => {
    button.addEventListener("click", () => {
      const targetNode = regionGalleryNode.querySelector(
        `[data-album-block="${button.dataset.albumIndex}"]`
      );

      if (!targetNode) {
        return;
      }

      targetNode.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveTimelineItem(button.dataset.albumIndex);
      button.blur();
    });
  });

  const timelineObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

      if (!visibleEntry) {
        return;
      }

      setActiveTimelineItem(visibleEntry.target.dataset.albumBlock || "0");
    },
    {
      root: null,
      threshold: [0.2, 0.45, 0.7],
      rootMargin: "-15% 0px -55% 0px",
    }
  );

  regionGalleryNode.querySelectorAll("[data-album-block]").forEach((block) => {
    timelineObserver.observe(block);
  });

  appState.timelineObserver = timelineObserver;
  setActiveTimelineItem(0);
};

const setStatus = (text) => {
  mapStatus.textContent = text;
};

const scrollAtlasIntoView = ({ behavior = "smooth" } = {}) => {
  if (!atlasNode) {
    return;
  }

  const atlasTop = Math.max(window.scrollY + atlasNode.getBoundingClientRect().top - 18, 0);
  const currentTop = window.scrollY || window.pageYOffset || 0;

  if (Math.abs(currentTop - atlasTop) < 8) {
    return;
  }

  window.scrollTo({
    top: atlasTop,
    behavior,
  });
};

const syncStackForArea = (area, options = {}) => {
  if (Array.isArray(options.stackOverride) && options.stackOverride.length) {
    appState.stack = options.stackOverride.map((item) => ({
      adcode: item.adcode,
      name: item.name,
      level: item.level,
    }));
    return;
  }

  if (options.replaceStack) {
    const targetIndex = appState.stack.findIndex((item) => item.adcode === area.adcode);

    if (targetIndex !== -1) {
      appState.stack = appState.stack.slice(0, targetIndex + 1);
      return;
    }

    if (appState.stack.length) {
      appState.stack[appState.stack.length - 1] = area;
      return;
    }

    appState.stack = [area];
    return;
  }

  const lastItem = appState.stack[appState.stack.length - 1];

  if (!lastItem) {
    appState.stack = [area];
    return;
  }

  if (lastItem.adcode === area.adcode) {
    return;
  }

  if (lastItem.level === area.level) {
    appState.stack[appState.stack.length - 1] = area;
    return;
  }

  appState.stack.push(area);
};

const setAreaLayoutMode = (area) => {
  const isCountryView = area.level === "country";
  const isDetailView = area.level === "city" || area.level === "district";
  const isProvinceView = area.level === "province";

  atlasNode?.setAttribute("data-area-level", area.level || "country");
  atlasLayoutNode?.classList.toggle("is-country-view", isCountryView);
  atlasLayoutNode?.classList.toggle("is-detail-view", isDetailView);
  atlasLayoutNode?.classList.toggle("is-province-view", isProvinceView);
};

const getTransitionDirection = (fromArea, toArea) => {
  if (!fromArea || !toArea || fromArea.adcode === toArea.adcode) {
    return "";
  }

  return getAreaLevelRank(toArea.level) > getAreaLevelRank(fromArea.level) ? "in" : "out";
};

const animateAreaTransition = (direction) => {
  if (!direction || !mapStageNode || !regionPanelNode) {
    return;
  }

  const mapClassName = direction === "in" ? "is-transition-in" : "is-transition-out";
  const panelClassName = direction === "in" ? "is-panel-transition-in" : "is-panel-transition-out";
  const atlasClassName = direction === "in" ? "is-atlas-transition-in" : "is-atlas-transition-out";

  mapStageNode.classList.remove("is-transition-in", "is-transition-out");
  regionPanelNode.classList.remove("is-panel-transition-in", "is-panel-transition-out");
  atlasNode?.classList.remove("is-atlas-transition-in", "is-atlas-transition-out");
  void mapStageNode.offsetWidth;
  mapStageNode.classList.add(mapClassName);
  regionPanelNode.classList.add(panelClassName);
  atlasNode?.classList.add(atlasClassName);

  window.setTimeout(() => {
    mapStageNode.classList.remove(mapClassName);
    regionPanelNode.classList.remove(panelClassName);
    atlasNode?.classList.remove(atlasClassName);
  }, 420);
};

const syncChartViewport = () => {
  if (!appState.chart) {
    return;
  }

  const currentOption = appState.chart.getOption();

  if (!currentOption?.series?.length) {
    appState.chart.resize();
    return;
  }

  const mapLayout = getMapLayout(appState.currentArea);

  appState.chart.resize();
  appState.chart.setOption(
    {
      series: [
        {
          layoutCenter: mapLayout.layoutCenter,
          layoutSize: mapLayout.layoutSize,
          zoom: appState.zoom,
        },
      ],
    },
    false
  );
};

const scheduleChartResize = () => {
  if (!appState.chart) {
    return;
  }

  if (pendingChartResizeFrame) {
    window.cancelAnimationFrame(pendingChartResizeFrame);
  }

  pendingChartResizeFrame = window.requestAnimationFrame(() => {
    pendingChartResizeFrame = 0;
    syncChartViewport();
  });
};

const getMapLayout = (area) => {
  if (area.level === "country") {
    return {
      layoutCenter: ["50%", "50%"],
      layoutSize: "112%",
    };
  }

  if (area.level === "province") {
    return {
      layoutCenter: ["49%", "51%"],
      layoutSize: "106%",
    };
  }

  return {
    layoutCenter: ["46.5%", "50%"],
    layoutSize: "98%",
  };
};

const openLightbox = (button) => {
  const imageSrc = button.dataset.image || "";
  const syncLightboxShape = () => {
    if (!lightboxDialog) {
      return;
    }

    const ratio = lightboxImage.naturalWidth / lightboxImage.naturalHeight;

    if (!Number.isFinite(ratio) || ratio <= 0) {
      lightboxDialog.removeAttribute("data-lightbox-shape");
      return;
    }

    const shape = ratio < 0.88 ? "portrait" : ratio > 1.85 ? "panorama" : "standard";
    lightboxDialog.dataset.lightboxShape = shape;
  };

  lightboxDialog?.removeAttribute("data-lightbox-shape");
  lightboxImage.src = imageSrc;
  lightboxImage.alt = button.dataset.title || "";
  lightboxMeta.textContent = button.dataset.meta || "";
  lightboxGear.textContent = button.dataset.gear || "";
  syncTagRail(lightboxTagRail, "标签", parseTagPayload(button.dataset.tags));

  const layoutToken = `${imageSrc}::${Date.now()}`;
  lightboxImage.dataset.layoutToken = layoutToken;
  const applyShape = () => {
    if (lightboxImage.dataset.layoutToken !== layoutToken) {
      return;
    }

    syncLightboxShape();
  };

  if (lightboxImage.complete && lightboxImage.naturalWidth) {
    applyShape();
  } else {
    lightboxImage.addEventListener("load", applyShape, { once: true });
  }

  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeLightbox = () => {
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  lightboxDialog?.removeAttribute("data-lightbox-shape");
};

const bindLightboxTriggers = (root = document) => {
  root.querySelectorAll(".open-lightbox").forEach((button) => {
    if (button.dataset.lightboxBound === "true") {
      return;
    }

    button.dataset.lightboxBound = "true";
    button.addEventListener("click", () => openLightbox(button));
  });
};

const syncAlbumFrameLayout = (block, photo, imageNode) => {
  if (!block || !photo || !imageNode) {
    return;
  }

  const applyRatio = (ratio) => {
    if (!Number.isFinite(ratio) || ratio <= 0) {
      return;
    }

    photo.aspectRatio = ratio;
    block.style.setProperty("--album-photo-ratio", ratio.toFixed(4));

    const orientation =
      ratio < 0.85 ? "portrait" : ratio > 1.35 ? "landscape" : "balanced";

    block.dataset.photoOrientation = orientation;

    const viewportWidth = window.innerWidth || 1440;
    const viewportHeight = window.innerHeight || 900;
    const isMobile = viewportWidth <= 760;
    const isMobileLandscape = isMobile && viewportWidth > viewportHeight;

    const targetHeight = Math.min(
      isMobile
        ? isMobileLandscape
          ? viewportHeight * 0.66
          : viewportHeight * 0.5
        : viewportHeight * 0.54,
      isMobile
        ? isMobileLandscape
          ? 340
          : 440
        : 590
    );

    const minHeight = isMobile ? (isMobileLandscape ? 208 : 288) : 392;
    const resolvedHeight = Math.max(minHeight, targetHeight);

    const padding = isMobile ? (isMobileLandscape ? 6 : 8) : orientation === "portrait" ? 12 : 16;
    const minWidth =
      orientation === "portrait"
        ? isMobile
          ? 210
          : 280
        : orientation === "landscape"
          ? isMobile
            ? 250
            : 420
          : isMobile
            ? 230
            : 340;
    const maxWidth =
      orientation === "portrait"
        ? isMobile
          ? Math.min(viewportWidth - (isMobileLandscape ? 20 : 24), 372)
          : 460
        : orientation === "landscape"
          ? isMobile
            ? viewportWidth - (isMobileLandscape ? 12 : 16)
            : 920
          : isMobile
            ? viewportWidth - (isMobileLandscape ? 16 : 20)
            : 680;
    const resolvedWidth = Math.max(
      minWidth,
      Math.min(maxWidth, resolvedHeight * ratio + padding * 2)
    );

    block.style.setProperty("--album-photo-max-height", `${Math.round(resolvedHeight)}px`);
    block.style.setProperty("--album-photo-frame-width", `${Math.round(resolvedWidth)}px`);
    block.style.setProperty("--album-photo-frame-padding", `${padding}px`);
  };

  if (photo.aspectRatio) {
    applyRatio(photo.aspectRatio);
    return;
  }

  const token = `${photo.src}::${Date.now()}`;
  imageNode.dataset.layoutToken = token;

  const updateFromImage = () => {
    if (imageNode.dataset.layoutToken !== token) {
      return;
    }

    applyRatio(imageNode.naturalWidth / imageNode.naturalHeight);
  };

  if (imageNode.complete && imageNode.naturalWidth) {
    updateFromImage();
    return;
  }

  imageNode.addEventListener("load", updateFromImage, { once: true });
};

const syncVisibleAlbumLayouts = () => {
  regionGalleryNode?.querySelectorAll(".album-block").forEach((block) => {
    const mainImage = block.querySelector(".album-main-image");

    if (!mainImage?.naturalWidth || !mainImage?.naturalHeight) {
      return;
    }

    syncAlbumFrameLayout(
      block,
      {
        src: mainImage.currentSrc || mainImage.src,
        aspectRatio: mainImage.naturalWidth / mainImage.naturalHeight,
      },
      mainImage
    );
  });
};

const ALBUM_THUMB_COLLAPSED_ROWS = 2;

const animateAlbumThumbHeight = (thumbsWrap, mutateLayout) => {
  if (!thumbsWrap || typeof mutateLayout !== "function") {
    return;
  }

  const startHeight = thumbsWrap.getBoundingClientRect().height;
  mutateLayout();
  const endHeight = thumbsWrap.getBoundingClientRect().height;

  if (Math.abs(endHeight - startHeight) < 1) {
    return;
  }

  thumbsWrap.classList.add("is-animating-height");
  thumbsWrap.style.height = `${startHeight}px`;
  thumbsWrap.style.overflow = "hidden";
  thumbsWrap.style.willChange = "height";
  void thumbsWrap.offsetHeight;
  thumbsWrap.style.height = `${endHeight}px`;

  const cleanup = () => {
    thumbsWrap.classList.remove("is-animating-height");
    thumbsWrap.style.removeProperty("height");
    thumbsWrap.style.removeProperty("overflow");
    thumbsWrap.style.removeProperty("will-change");
  };

  const fallbackTimer = window.setTimeout(cleanup, 420);
  thumbsWrap.addEventListener(
    "transitionend",
    (event) => {
      if (event.propertyName !== "height") {
        return;
      }

      window.clearTimeout(fallbackTimer);
      cleanup();
    },
    { once: true }
  );
};

const syncAlbumThumbOverflow = (block) => {
  if (!block) {
    return;
  }

  const thumbsWrap = block.querySelector(".album-thumbs");

  if (!thumbsWrap) {
    return;
  }

  const thumbs = [...thumbsWrap.querySelectorAll(".album-thumb:not(.album-thumb-toggle)")];
  thumbsWrap.querySelectorAll(".album-thumb-toggle").forEach((node) => node.remove());
  thumbsWrap.classList.remove("is-thumbs-collapsed");
  thumbs.forEach((thumb) => thumb.classList.remove("is-thumb-hidden"));

  const rowTops = [...new Set(thumbs.map((thumb) => thumb.offsetTop))].sort((left, right) => left - right);

  if (rowTops.length <= ALBUM_THUMB_COLLAPSED_ROWS) {
    return;
  }

  const collapseRowTop = rowTops[ALBUM_THUMB_COLLAPSED_ROWS - 1];
  const visibleCount = thumbs.filter((thumb) => thumb.offsetTop <= collapseRowTop + 1).length;

  if (visibleCount <= 1 || visibleCount >= thumbs.length) {
    return;
  }

  const createThumbToggle = ({ expanded, hiddenCount }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `album-thumb album-thumb-toggle ${expanded ? "is-collapse" : "is-expand"}`;
    button.setAttribute(
      "aria-label",
      expanded ? "收起预览图" : `展开全部预览图（还剩 ${hiddenCount} 张）`
    );
    button.innerHTML = `
      <span class="album-thumb-toggle-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="${expanded ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"}" />
        </svg>
      </span>
      <span class="album-thumb-toggle-label">${expanded ? "收起" : "展开"}</span>
      ${expanded ? "" : `<span class="album-thumb-toggle-count">+${hiddenCount}</span>`}
    `;
    button.addEventListener("click", () => {
      animateAlbumThumbHeight(thumbsWrap, () => {
        block.dataset.thumbsExpanded = expanded ? "false" : "true";
        syncAlbumThumbOverflow(block);
      });
    });
    return button;
  };

  const keepThumbCount = visibleCount - 1;
  const hiddenCount = thumbs.length - keepThumbCount;
  const isExpanded = block.dataset.thumbsExpanded === "true";

  if (isExpanded) {
    thumbsWrap.append(createThumbToggle({ expanded: true, hiddenCount }));
    return;
  }

  thumbs.forEach((thumb, index) => {
    if (index >= keepThumbCount) {
      thumb.classList.add("is-thumb-hidden");
    }
  });

  thumbsWrap.append(createThumbToggle({ expanded: false, hiddenCount }));
  thumbsWrap.classList.add("is-thumbs-collapsed");
};

const syncVisibleAlbumThumbOverflows = () => {
  regionGalleryNode?.querySelectorAll(".album-block").forEach((block) => {
    syncAlbumThumbOverflow(block);
  });
};

const scheduleAlbumLayoutSync = () => {
  if (pendingAlbumLayoutFrame) {
    window.cancelAnimationFrame(pendingAlbumLayoutFrame);
  }

  pendingAlbumLayoutFrame = window.requestAnimationFrame(() => {
    pendingAlbumLayoutFrame = 0;
    syncVisibleAlbumLayouts();
    syncVisibleAlbumThumbOverflows();
  });
};

const renderTagPhotoCard = (photo, index) => `
  <button
    class="tag-photo-card open-lightbox"
    type="button"
    style="--tag-card-index: ${index % 8};"
    data-image="${escapeHtml(photo.src)}"
    data-title="${escapeHtml(photo.title || photo.albumTitle)}"
    data-meta="${escapeHtml(photo.metaLine)}"
    data-gear="${escapeHtml(photo.gearLine)}"
    data-tags="${escapeHtml(serializeTags(photo.tags))}"
  >
    <div class="tag-photo-visual">
      ${buildResponsiveImage({
        src: photo.src,
        alt: photo.alt || photo.albumTitle,
        sizeHint: "(max-width: 760px) 44vw, (max-width: 1200px) 30vw, 280px",
        loading: "lazy",
        fetchpriority: "low",
        variant: "thumb",
        useSrcSet: false,
      })}
    </div>
    <div class="tag-photo-copy">
      <p class="tag-photo-meta">${escapeHtml([photo.shotOn, photo.albumTitle].filter(Boolean).join(" · "))}</p>
      <h4>${escapeHtml(photo.albumTitle || photo.location || "未命名作品")}</h4>
      <p class="tag-photo-location">${escapeHtml(photo.albumLocation || photo.location || "")}</p>
      <div class="tag-rail">${renderTagRail("", photo.tags)}</div>
    </div>
  </button>
`;

const renderTagPhotoStream = (photos) => `
  <div class="tag-photo-grid">
    ${photos.map((photo, index) => renderTagPhotoCard(photo, index)).join("")}
  </div>
`;

const getTagCategoryIndicatorLayout = (row, button) => {
  const rowRect = row.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();

  return {
    x: buttonRect.left - rowRect.left,
    y: buttonRect.top - rowRect.top,
    width: buttonRect.width,
    height: buttonRect.height,
  };
};

const syncTagCategoryIndicator = () => {
  const row = tagFilterNode?.querySelector(".tag-category-row");
  const indicator = row?.querySelector(".tag-category-indicator");
  const activeButton = row?.querySelector(".tag-category-button.is-active");

  if (!row || !indicator) {
    return;
  }

  if (!activeButton) {
    indicator.classList.remove("is-visible");
    appState.tagCategoryIndicatorLayout = null;
    return;
  }

  const nextLayout = getTagCategoryIndicatorLayout(row, activeButton);

  indicator.classList.add("is-visible");
  indicator.style.width = `${nextLayout.width}px`;
  indicator.style.height = `${nextLayout.height}px`;
  indicator.style.transform = `translate3d(${nextLayout.x}px, ${nextLayout.y}px, 0)`;

  appState.tagCategoryIndicatorLayout = nextLayout;
};

const renderTagCategoryRow = (categoryCollections, activeCategory) => `
  <div class="tag-category-row">
    <div class="tag-category-indicator" aria-hidden="true"></div>
    ${categoryCollections
      .map(
        (group) => `
          <button
            class="tag-category-button ${group.name === activeCategory ? "is-active" : ""}"
            type="button"
            data-category="${escapeHtml(group.name)}"
          >
            <span>${escapeHtml(group.name)}</span>
            <strong>${group.tagCount} 个 tag</strong>
          </button>
        `
      )
      .join("")}
  </div>
`;

const renderTagFilterPanel = (currentCategory, activeTag, isExpanded = false) => {
  if (!currentCategory) {
    return `
      <section class="tag-filter-guide">
        <p>先选择一个一级分类，再展开二级 tag。</p>
      </section>
    `;
  }

  const primaryItems = currentCategory.items.filter((item) => item.count >= 4);
  const hiddenItems = currentCategory.items.filter((item) => item.count < 4);
  const shouldForceExpand = hiddenItems.some((item) => item.tag === activeTag);
  const resolvedExpanded = isExpanded || shouldForceExpand;
  const visibleItems =
    resolvedExpanded || !primaryItems.length ? currentCategory.items : primaryItems;
  const visibleCount = visibleItems.length;
  const hiddenCount = hiddenItems.length;
  const toggleLabel = resolvedExpanded ? "收起低频 tag" : `展开低频 tag (${hiddenCount})`;

  return `
    <section class="tag-filter-group">
      <div class="tag-filter-group-header">
        <p class="tag-filter-group-title">${escapeHtml(currentCategory.name)}</p>
        <span>显示 ${visibleCount} / ${currentCategory.tagCount} 个 tag · ${currentCategory.photoCount} 张照片</span>
      </div>
      <div class="tag-filter-group-list">
        ${visibleItems
          .map(
            (item) => `
              <button
                class="tag-filter-button ${item.tag === activeTag ? "is-active" : ""}"
                type="button"
                data-tag="${escapeHtml(item.tag)}"
              >
                <span>${escapeHtml(item.tag)}</span>
                <strong>${item.count}</strong>
              </button>
            `
          )
          .join("")}
      </div>
      ${
        hiddenCount
          ? `
            <div class="tag-filter-toggle-row">
              <button
                class="tag-filter-toggle"
                type="button"
                data-category-toggle="${escapeHtml(currentCategory.name)}"
                data-expanded="${resolvedExpanded ? "true" : "false"}"
              >
                ${escapeHtml(toggleLabel)}
              </button>
            </div>
          `
          : ""
      }
    </section>
  `;
};

const collapseTagAtlasView = () => {
  const hasExpandedCategories = appState.expandedTagCategories.size > 0;
  const hasActiveFilter = Boolean(appState.selectedTagCategory || appState.selectedTag);

  if (!hasExpandedCategories && !hasActiveFilter) {
    return;
  }

  appState.expandedTagCategories.clear();
  renderTagAtlas({
    category: "",
    tag: "",
  });
};

const bindTagCategoryButtons = () => {
  tagFilterNode?.querySelectorAll(".tag-category-button").forEach((button) => {
    const requestedCategory = button.dataset.category || "";

    if (
      appState.tagCategoryHoverEnabled &&
      window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches
    ) {
      button.addEventListener("mouseenter", () => {
        if (requestedCategory === appState.selectedTagCategory) {
          return;
        }

        renderTagAtlas({
          category: requestedCategory,
          tag: "",
        });
      });
    }

    button.addEventListener("click", () => {
      const lockingHoverMode = appState.tagCategoryHoverEnabled;
      appState.tagCategoryHoverEnabled = false;
      renderTagAtlas({
        category: lockingHoverMode
          ? requestedCategory
          : requestedCategory === appState.selectedTagCategory
            ? ""
            : requestedCategory,
        tag: "",
      });
    });
  });
};

const bindTagCategoryDockEffect = () => {
  const row = tagFilterNode?.querySelector(".tag-category-row");
  const buttons = row ? [...row.querySelectorAll(".tag-category-button")] : [];

  if (!row || !buttons.length || !window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches) {
    return;
  }

  const resetDockEffect = () => {
    buttons.forEach((button) => {
      button.style.removeProperty("--tag-dock-scale");
      button.style.removeProperty("--tag-dock-lift");
      button.style.removeProperty("--tag-dock-shadow");
      button.style.removeProperty("--tag-dock-brightness");
      button.style.zIndex = "1";
    });
  };

  row.addEventListener("mouseleave", resetDockEffect);
  row.addEventListener("mousemove", (event) => {
    buttons.forEach((button) => {
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(event.clientX - centerX, (event.clientY - centerY) * 1.2);
      const influence = Math.max(0, 1 - distance / 210);
      const scale = 1 + influence * 0.18;
      const shadow = influence * 18;
      const brightness = 1 + influence * 0.08;

      button.style.setProperty("--tag-dock-scale", scale.toFixed(3));
      button.style.setProperty("--tag-dock-shadow", `${shadow.toFixed(2)}px`);
      button.style.setProperty("--tag-dock-brightness", brightness.toFixed(3));
      button.style.zIndex = String(1 + Math.round(influence * 10));
    });
  });
};

const bindTagFilterButtons = () => {
  tagFilterNode?.querySelectorAll(".tag-filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      const requestedTag = button.dataset.tag || "";
      renderTagAtlas({
        category: appState.selectedTagCategory,
        tag: requestedTag === appState.selectedTag ? "" : requestedTag,
      });
    });
  });
};

const bindTagFilterToggleButtons = () => {
  tagFilterNode?.querySelectorAll("[data-category-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.categoryToggle || "";
      const isExpanded = button.dataset.expanded === "true";

      if (!category) {
        return;
      }

      if (isExpanded) {
        appState.expandedTagCategories.delete(category);
      } else {
        appState.expandedTagCategories.add(category);
      }

      const currentCategory = getTagCategoryCollections().find((item) => item.name === category);
      const hiddenItems = currentCategory?.items.filter((item) => item.count < 4) || [];
      const shouldResetHiddenActiveTag =
        isExpanded && hiddenItems.some((item) => item.tag === appState.selectedTag);

      renderTagAtlas({
        category,
        tag: shouldResetHiddenActiveTag ? "" : appState.selectedTag,
      });
    });
  });
};

const animateTagFilterHeight = (fromHeight) => {
  if (!tagFilterNode || !Number.isFinite(fromHeight) || fromHeight <= 0) {
    return;
  }

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    tagFilterNode.style.removeProperty("height");
    tagFilterNode.style.removeProperty("overflow");
    return;
  }

  const toHeight = tagFilterNode.getBoundingClientRect().height;

  if (!Number.isFinite(toHeight) || Math.abs(toHeight - fromHeight) < 2) {
    tagFilterNode.style.removeProperty("height");
    tagFilterNode.style.removeProperty("overflow");
    return;
  }

  appState.tagFilterResizeToken += 1;
  const resizeToken = appState.tagFilterResizeToken;

  tagFilterNode.classList.add("is-resizing");
  tagFilterNode.style.height = `${fromHeight}px`;
  tagFilterNode.style.overflow = "clip";

  window.requestAnimationFrame(() => {
    if (resizeToken !== appState.tagFilterResizeToken) {
      return;
    }

    tagFilterNode.style.height = `${toHeight}px`;
  });

  window.setTimeout(() => {
    if (resizeToken !== appState.tagFilterResizeToken) {
      return;
    }

    tagFilterNode.classList.remove("is-resizing");
    tagFilterNode.style.removeProperty("height");
    tagFilterNode.style.removeProperty("overflow");
  }, 460);
};

const renderTagAtlas = ({
  category = appState.selectedTagCategory,
  tag = appState.selectedTag,
} = {}) => {
  const collections = getTagCollections();
  const categoryCollections = getTagCategoryCollections();

  if (!tagFilterNode || !tagSummaryNode || !tagAtlasGalleryNode) {
    return;
  }

  if (!collections.length) {
    if (!areAllCatalogChunksLoaded()) {
      tagFilterNode.innerHTML = `
        <section class="tag-filter-guide">
          <p>正在按需加载标签图库…</p>
        </section>
      `;
      tagSummaryNode.innerHTML = `<p class="tag-filter-group-title">稍等片刻，马上可按 tag 浏览。</p>`;
      tagAtlasGalleryNode.innerHTML = "";
      return;
    }

    tagFilterNode.innerHTML = `
      <section class="tag-filter-guide">
        <p>当前还没有可展示的 tag。</p>
      </section>
    `;
    tagSummaryNode.innerHTML = "";
    tagAtlasGalleryNode.innerHTML = "";
    return;
  }

  const activeCategory = categoryCollections.some((item) => item.name === category) ? category : "";
  const currentCategory = activeCategory
    ? categoryCollections.find((item) => item.name === activeCategory) || null
    : null;
  const activeTag =
    currentCategory && currentCategory.items.some((item) => item.tag === tag) ? tag : "";
  const currentCollection = activeTag
    ? collections.find((item) => item.tag === activeTag) || null
    : null;
  const previousCategory = appState.selectedTagCategory;
  const categoryChanged = previousCategory !== activeCategory;
  const previousFilterHeight = tagFilterNode.getBoundingClientRect().height;
  const isExpanded = activeCategory
    ? appState.expandedTagCategories.has(activeCategory) ||
      Boolean(currentCategory?.items.some((item) => item.tag === activeTag && item.count < 4))
    : false;

  appState.selectedTagCategory = activeCategory;
  appState.selectedTag = activeTag;

  const nextFilterPanelMarkup = renderTagFilterPanel(currentCategory, activeTag, isExpanded);

  if (categoryChanged || !tagFilterNode.querySelector(".tag-category-row")) {
    tagFilterNode.innerHTML = `${renderTagCategoryRow(categoryCollections, activeCategory)}${nextFilterPanelMarkup}`;
    bindTagCategoryButtons();
    bindTagCategoryDockEffect();
    syncTagCategoryIndicator();
  } else {
    const existingPanel = tagFilterNode.querySelector(".tag-filter-group, .tag-filter-guide");

    if (existingPanel) {
      existingPanel.outerHTML = nextFilterPanelMarkup;
    } else {
      tagFilterNode.insertAdjacentHTML("beforeend", nextFilterPanelMarkup);
    }
  }

  animateTagFilterHeight(previousFilterHeight);

  tagSummaryNode.innerHTML = "";

  tagAtlasGalleryNode.innerHTML = currentCollection
    ? renderTagPhotoStream(currentCollection.photos)
    : "";

  bindTagFilterButtons();
  bindTagFilterToggleButtons();

  const shouldAnimateFilter = Boolean(currentCategory && categoryChanged);
  const shouldAnimateSummary = false;
  const shouldAnimateGallery = Boolean(currentCollection);

  tagFilterNode.classList.remove("is-animating");
  tagSummaryNode.classList.remove("is-animating");
  tagAtlasGalleryNode.classList.remove("is-animating");

  if (shouldAnimateFilter || shouldAnimateSummary || shouldAnimateGallery) {
    void tagFilterNode.offsetWidth;
    void tagSummaryNode.offsetWidth;
    void tagAtlasGalleryNode.offsetWidth;
  }

  if (shouldAnimateFilter) {
    tagFilterNode.classList.add("is-animating");
  }

  if (shouldAnimateSummary) {
    tagSummaryNode.classList.add("is-animating");
  }

  if (shouldAnimateGallery) {
    tagAtlasGalleryNode.classList.add("is-animating");
    bindLightboxTriggers(tagAtlasGalleryNode);
  }

  if (shouldAnimateFilter || shouldAnimateSummary || shouldAnimateGallery) {
    appState.tagAtlasAnimationToken += 1;
    const animationToken = appState.tagAtlasAnimationToken;

    window.setTimeout(() => {
      if (animationToken !== appState.tagAtlasAnimationToken) {
        return;
      }

      tagFilterNode.classList.remove("is-animating");
      tagSummaryNode.classList.remove("is-animating");
      tagAtlasGalleryNode.classList.remove("is-animating");
    }, 980);
  }
};

const primeTagAtlasData = async () => {
  if (appState.tagAtlasDataRequested) {
    return;
  }

  appState.tagAtlasDataRequested = true;
  renderTagAtlas();

  try {
    await ensureAllCatalogChunksLoaded();
    renderTagAtlas();
  } catch (error) {
    console.error(error);
  }
};

const setupTagAtlasDataLoading = () => {
  if (!tagAtlasSectionNode) {
    return;
  }

  let hasTriggered = false;
  const triggerLoad = () => {
    if (hasTriggered) {
      return;
    }

    hasTriggered = true;
    primeTagAtlasData();
  };

  tagAtlasSectionNode.addEventListener("pointerenter", triggerLoad, { once: true });
  tagAtlasSectionNode.addEventListener("focusin", triggerLoad, { once: true });
  tagAtlasSectionNode.addEventListener("click", triggerLoad, { once: true });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        observer.disconnect();
        triggerLoad();
      },
      {
        rootMargin: "240px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(tagAtlasSectionNode);
    return;
  }

  triggerLoad();
};

const renderMasonryTiles = (album) =>
  album.photos
    .map(
      (photo) => `
        <button
          class="masonry-tile open-lightbox"
          data-image="${escapeHtml(photo.src)}"
          data-title="${escapeHtml(photo.title)}"
          data-meta="${escapeHtml(photo.metaLine)}"
          data-gear="${escapeHtml(photo.gearLine)}"
          data-tags="${escapeHtml(serializeTags(photo.tags))}"
          data-album-tags="${escapeHtml(serializeTags(album.groupTags))}"
        >
          ${buildResponsiveImage({
            src: photo.src,
            alt: photo.alt,
            sizeHint: "(max-width: 760px) 94vw, (max-width: 1280px) 46vw, 420px",
            loading: "lazy",
            fetchpriority: "low",
            variant: "thumb",
            useSrcSet: false,
          })}
        </button>
      `
    )
    .join("");

const syncResponsiveImageElement = (
  imageNode,
  src,
  { variant = "display", sizeHint = "100vw" } = {}
) => {
  if (!imageNode) {
    return;
  }

  const srcSet = buildImageSrcSet(src);
  const resolvedSrc = getPhotoVariantSrc(src, variant);
  const pictureSourceNode =
    imageNode.parentElement?.tagName === "PICTURE"
      ? imageNode.parentElement.querySelector("source")
      : null;

  imageNode.src = resolvedSrc;

  if (srcSet) {
    imageNode.setAttribute("srcset", srcSet);
    imageNode.setAttribute("sizes", sizeHint);
    pictureSourceNode?.setAttribute("srcset", srcSet);
    pictureSourceNode?.setAttribute("sizes", sizeHint);
  } else {
    imageNode.removeAttribute("srcset");
    imageNode.removeAttribute("sizes");
    pictureSourceNode?.removeAttribute("srcset");
    pictureSourceNode?.removeAttribute("sizes");
  }
};

const syncAlbumCarousel = (albumIndex, album, imageIndex) => {
  const block = regionGalleryNode.querySelector(`[data-album-block="${albumIndex}"]`);

  if (!block) {
    return;
  }

  const currentPhoto = album.photos[imageIndex];
  const mainImage = block.querySelector(".album-main-image");
  const counters = block.querySelectorAll(".album-counter");
  const meta = block.querySelector(".album-photo-meta");
  const caption = block.querySelector(".album-caption");
  const gear = block.querySelector(".album-photo-gear");
  const groupTags = block.querySelector(".album-group-tags");
  const mainButton = block.querySelector(".album-main-button");

  syncResponsiveImageElement(mainImage, currentPhoto.src, {
    variant: "display",
    sizeHint: "(max-width: 760px) 96vw, (max-width: 1280px) 72vw, 920px",
  });
  mainImage.alt = currentPhoto.alt;
  mainButton.dataset.image = currentPhoto.src;
  mainButton.dataset.title = currentPhoto.title;
  mainButton.dataset.meta = currentPhoto.metaLine;
  mainButton.dataset.gear = currentPhoto.gearLine;
  mainButton.dataset.tags = serializeTags(currentPhoto.tags);
  mainButton.dataset.albumTags = serializeTags(album.groupTags);
  syncAlbumFrameLayout(block, currentPhoto, mainImage);
  counters.forEach((counter) => {
    counter.textContent = `${imageIndex + 1} / ${album.photos.length}`;
  });
  meta.textContent = currentPhoto.metaLine;
  caption.textContent = currentPhoto.caption;
  gear.textContent = currentPhoto.gearLine;
  syncTagRail(groupTags, "", album.groupTags);

  block.querySelectorAll(".album-thumb").forEach((thumb, thumbIndex) => {
    thumb.classList.toggle("is-active", thumbIndex === imageIndex);
  });
};

const animateAlbumSlide = (block, direction) => {
  const mainImage = block.querySelector(".album-main-image");

  if (!mainImage) {
    return;
  }

  mainImage.classList.remove("is-sliding-next", "is-sliding-prev");
  void mainImage.offsetWidth;
  mainImage.classList.add(direction === "prev" ? "is-sliding-prev" : "is-sliding-next");

  window.setTimeout(() => {
    mainImage.classList.remove("is-sliding-next", "is-sliding-prev");
  }, 320);
};

const bindSwipeNavigation = (element, onPrev, onNext) => {
  if (!element) {
    return;
  }

  let startX = 0;
  let startY = 0;
  let deltaX = 0;
  let isPointerDown = false;
  let isSwiping = false;

  element.addEventListener("pointerdown", (event) => {
    isPointerDown = true;
    isSwiping = false;
    startX = event.clientX;
    startY = event.clientY;
    deltaX = 0;
  });

  element.addEventListener("pointermove", (event) => {
    if (!isPointerDown) {
      return;
    }

    deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12) {
      isSwiping = true;
    }
  });

  element.addEventListener("pointerup", () => {
    if (!isPointerDown) {
      return;
    }

    isPointerDown = false;

    if (Math.abs(deltaX) > 56) {
      if (deltaX > 0) {
        onPrev();
      } else {
        onNext();
      }
    }

    window.setTimeout(() => {
      isSwiping = false;
    }, 0);
  });

  element.addEventListener("pointerleave", () => {
    isPointerDown = false;
  });

  element.addEventListener("click", (event) => {
    if (!isSwiping) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  });
};

const setupAlbumInteractions = (albums, { startIndex = 0 } = {}) => {
  albums.forEach((album, albumOffset) => {
    const albumIndex = startIndex + albumOffset;
    let currentIndex = 0;
    const block = regionGalleryNode.querySelector(`[data-album-block="${albumIndex}"]`);

    if (!block) {
      return;
    }

    const nextButton = block.querySelector('[data-action="next"]');
    const prevButton = block.querySelector('[data-action="prev"]');
    const mainButton = block.querySelector(".album-main-button");
    const masonryToggle = block.querySelector(".album-masonry-toggle");
    const masonry = block.querySelector(".album-masonry");
    const update = (nextIndex, direction = "next") => {
      currentIndex = (nextIndex + album.photos.length) % album.photos.length;
      syncAlbumCarousel(albumIndex, album, currentIndex);
      animateAlbumSlide(block, direction);
    };

    block.querySelectorAll('[data-action="prev"]').forEach((button) => {
      button.addEventListener("click", () => update(currentIndex - 1, "prev"));
    });
    block.querySelectorAll('[data-action="next"]').forEach((button) => {
      button.addEventListener("click", () => update(currentIndex + 1, "next"));
    });

    block.querySelectorAll(".album-thumb:not(.album-thumb-toggle)").forEach((thumb, thumbIndex) => {
      thumb.addEventListener("click", () =>
        update(thumbIndex, thumbIndex < currentIndex ? "prev" : "next")
      );
    });

    bindSwipeNavigation(mainButton, () => update(currentIndex - 1, "prev"), () =>
      update(currentIndex + 1, "next")
    );

    masonryToggle?.addEventListener("click", () => {
      const isExpanded = block.classList.toggle("is-masonry-open");

      if (isExpanded && masonry && masonry.dataset.loaded !== "true") {
        masonry.innerHTML = renderMasonryTiles(album);
        masonry.dataset.loaded = "true";
        bindLightboxTriggers(masonry);
      }

      masonryToggle.textContent = isExpanded ? "收起本组照片" : "展开本组照片";
      masonry?.setAttribute("aria-hidden", String(!isExpanded));
    });

    mainButton?.addEventListener("click", () => openLightbox(mainButton));
    update(0);
  });

  bindLightboxTriggers();
};

const INITIAL_GALLERY_ALBUM_BATCH = 4;
const GALLERY_ALBUM_BATCH_SIZE = 3;

const renderAlbumBlock = (album, albumIndex) => {
  const firstPhoto = album.photos[0] || {};

  return `
    <section class="album-block" data-album-block="${albumIndex}">
      ${
        album.title || album.meta || album.description
          ? `
            <div class="album-header">
              <div>
                ${album.meta ? `<p class="meta">${escapeHtml(album.meta)}</p>` : ""}
                ${album.title ? `<h4>${escapeHtml(album.title)}</h4>` : ""}
                ${album.description ? `<p>${escapeHtml(album.description)}</p>` : ""}
              </div>
              <span class="album-counter">1 / ${album.photos.length}</span>
            </div>
          `
          : `
            <div class="album-header album-header-minimal">
              <span class="album-counter">1 / ${album.photos.length}</span>
            </div>
          `
      }

      <div class="album-carousel">
        <button class="album-nav" data-action="prev" aria-label="上一张">-</button>
        <button
          class="album-main-button"
          data-image="${escapeHtml(firstPhoto.src)}"
          data-title="${escapeHtml(firstPhoto.title)}"
          data-meta="${escapeHtml(firstPhoto.metaLine)}"
          data-gear="${escapeHtml(firstPhoto.gearLine)}"
          data-tags="${escapeHtml(serializeTags(firstPhoto.tags))}"
          data-album-tags="${escapeHtml(serializeTags(album.groupTags))}"
        >
          ${buildResponsiveImage({
            src: firstPhoto.src,
            alt: firstPhoto.alt,
            className: "album-main-image",
            sizeHint: "(max-width: 760px) 96vw, (max-width: 1280px) 72vw, 920px",
            loading: albumIndex < 2 ? "eager" : "lazy",
            fetchpriority: albumIndex === 0 ? "high" : albumIndex < 2 ? "auto" : "low",
            variant: "display",
          })}
        </button>
        <button class="album-nav" data-action="next" aria-label="下一张">+</button>
      </div>

      <div class="album-mobile-controls">
        <button class="album-nav album-nav-mobile" data-action="prev" aria-label="上一张">-</button>
        <span class="album-counter album-counter-mobile">1 / ${album.photos.length}</span>
        <button class="album-nav album-nav-mobile" data-action="next" aria-label="下一张">+</button>
      </div>

      <p class="album-photo-meta">${escapeHtml(firstPhoto.metaLine)}</p>
      <p class="album-caption">${escapeHtml(firstPhoto.caption)}</p>
      <p class="album-photo-gear">${escapeHtml(firstPhoto.gearLine)}</p>
      <div class="tag-rail album-group-tags">${renderTagRail("", album.groupTags)}</div>

      <div class="album-thumbs">
        ${album.photos
          .map(
            (photo, imageIndex) => `
              <button class="album-thumb ${imageIndex === 0 ? "is-active" : ""}" type="button">
                ${buildResponsiveImage({
                  src: photo.src,
                  alt: photo.title || `${album.title || "相册"} 缩略图 ${imageIndex + 1}`,
                  sizeHint: "(max-width: 760px) 14vw, (max-width: 1280px) 11vw, 128px",
                  loading: "lazy",
                  fetchpriority: "low",
                  variant: "thumb",
                  useSrcSet: false,
                })}
              </button>
            `
          )
          .join("")}
      </div>

      <button class="album-masonry-toggle" type="button">展开本组照片</button>

      <div class="album-masonry" aria-hidden="true" data-loaded="false"></div>
    </section>
  `;
};

const renderGallery = (area) => {
  const rawAlbums = getAlbumsForArea(area);
  appState.galleryRenderToken += 1;
  const renderToken = appState.galleryRenderToken;

  if (!rawAlbums.length) {
    clearTimelineObserver();
    regionPanelBodyNode?.classList.remove("has-timeline");
    regionTimelineNode.innerHTML = "";
    regionTimelineNode.hidden = true;
    regionGalleryNode.innerHTML = `
      <section class="album-empty-state">
        <p>这个区域暂时还没有同步照片。</p>
      </section>
    `;
    return;
  }

  const renderAlbumRange = (startIndex, endIndexExclusive) =>
    rawAlbums
      .slice(startIndex, endIndexExclusive)
      .map((album, offset) => renderAlbumBlock(getNormalizedAlbumForArea(album, area), startIndex + offset))
      .join("");

  const initialCount = Math.min(rawAlbums.length, INITIAL_GALLERY_ALBUM_BATCH);
  regionGalleryNode.innerHTML = renderAlbumRange(0, initialCount);
  setupAlbumInteractions(rawAlbums.slice(0, initialCount).map((album) => getNormalizedAlbumForArea(album, area)), {
    startIndex: 0,
  });
  renderRegionTimeline(rawAlbums);
  scheduleAlbumLayoutSync();

  const appendNextBatch = (startIndex) => {
    if (renderToken !== appState.galleryRenderToken) {
      return;
    }

    if (startIndex >= rawAlbums.length) {
      renderRegionTimeline(rawAlbums);
      scheduleAlbumLayoutSync();
      return;
    }

    const endIndex = Math.min(startIndex + GALLERY_ALBUM_BATCH_SIZE, rawAlbums.length);
    regionGalleryNode.insertAdjacentHTML("beforeend", renderAlbumRange(startIndex, endIndex));
    setupAlbumInteractions(
      rawAlbums.slice(startIndex, endIndex).map((album) => getNormalizedAlbumForArea(album, area)),
      { startIndex }
    );
    renderRegionTimeline(rawAlbums);
    scheduleAlbumLayoutSync();

    const scheduleNext = () => appendNextBatch(endIndex);

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(scheduleNext, { timeout: 260 });
      return;
    }

    window.setTimeout(scheduleNext, 72);
  };

  if (rawAlbums.length > initialCount) {
    const startDeferredAppend = () => appendNextBatch(initialCount);

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(startDeferredAppend, { timeout: 200 });
    } else {
      window.setTimeout(startDeferredAppend, 48);
    }
  }
};

const renderCountryPanel = () => {
  const latestAlbums = getRecentAlbums(4);

  setAreaLayoutMode({ level: "country" });
  regionPanelNode.classList.add("is-country-home");
  clearTimelineObserver();
  regionPanelBodyNode?.classList.remove("has-timeline");
  regionTimelineNode.innerHTML = "";
  regionTimelineNode.hidden = true;
  breadcrumbNode.innerHTML = "";
  areaTitleNode.textContent = "Recent Update";

  regionGalleryNode.innerHTML = `
    <section class="country-home-panel">
      <p class="country-home-meta">latest 4 photo sets</p>
      <div class="country-quick-grid">
        ${latestAlbums
          .map((album) => {
            const jumpArea = getAlbumJumpArea(album);
            const cover = getAlbumCoverSrc(album);
            const count = getAssetCount(album, { includePlaceholders: false });
            const entryStack = buildAreaEntryStack(jumpArea, album.location);

            return `
              <button
                class="country-quick-card"
                type="button"
                data-adcode="${escapeHtml(jumpArea.adcode)}"
                data-level="${escapeHtml(jumpArea.level)}"
                data-name="${escapeHtml(entryStack[entryStack.length - 1]?.name || jumpArea.name)}"
                data-stack="${escapeHtml(JSON.stringify(entryStack))}"
              >
                ${buildResponsiveImage({
                  src: cover,
                  alt: album.title,
                  sizeHint: "(max-width: 760px) 32vw, 112px",
                  loading: "lazy",
                  fetchpriority: "low",
                  variant: "thumb",
                  useSrcSet: false,
                })}
                <div class="country-quick-copy">
                  <p>${escapeHtml(album.meta || album.shotOn || "")}</p>
                  <h4>${escapeHtml(album.title || jumpArea.name)}</h4>
                  <span>${count} 张</span>
                </div>
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
  `;

  regionGalleryNode.querySelectorAll(".country-quick-card").forEach((button) => {
    button.addEventListener("click", async () => {
      let entryStack = null;

      try {
        entryStack = JSON.parse(button.dataset.stack || "null");
      } catch (error) {
        entryStack = null;
      }

      await loadArea({
        adcode: button.dataset.adcode || "",
        name: button.dataset.name || "",
        level: button.dataset.level || "city",
      }, {
        stackOverride: Array.isArray(entryStack) ? entryStack : undefined,
      });
    });
  });
};

const renderBreadcrumb = () => {
  breadcrumbNode.innerHTML = appState.stack
    .map(
      (item, index) => `
        <button
          class="${index === appState.stack.length - 1 ? "is-active" : ""}"
          data-adcode="${item.adcode}"
        >
          ${item.adcode === "100000" ? "首页" : item.name}
        </button>
      `
    )
    .join("");

  breadcrumbNode.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", async () => {
      const targetAdcode = button.dataset.adcode;
      const targetIndex = appState.stack.findIndex((item) => item.adcode === targetAdcode);

      if (targetIndex === -1) {
        return;
      }

      const targetArea = appState.stack[targetIndex];
      appState.stack = appState.stack.slice(0, targetIndex + 1);
      await loadArea(targetArea, { replaceStack: true });
    });
  });
};

const renderAreaPanel = (area) => {
  if (area.adcode === "100000") {
    renderCountryPanel();
    return;
  }

  regionPanelNode.classList.remove("is-country-home");
  areaTitleNode.textContent = area.name;
  setAreaLayoutMode(area);
  renderGallery(area);
  renderBreadcrumb();
};

const getSeriesData = (features) =>
  features.map((feature) => {
    const adcode = getFeatureAdcode(feature);

    return {
      name: feature.properties?.name || feature.name,
      value: getPhotoCountForArea(adcode),
    };
  });

const updateChart = (mapName, features, area = appState.currentArea) => {
  const seriesData = getSeriesData(features);
  const values = seriesData.map((item) => Number(item.value) || 0);
  const maxValue = Math.max(...values, 0);
  const mapLayout = getMapLayout(area);
  const palette = getMapThemePalette();
  const isMobileMode = isMapPerformanceMode();
  const shouldShowMapLabel =
    area.level !== "country" && (!isMobileMode || area.level === "province" || area.level === "city");

  appState.chart.setOption(
    {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: isDarkModePreferred() ? "rgba(11, 18, 24, 0.94)" : "rgba(255, 255, 255, 0.96)",
        borderColor: isDarkModePreferred() ? "rgba(143, 165, 180, 0.2)" : "rgba(19, 33, 43, 0.08)",
        textStyle: {
          color: palette.tooltipText,
        },
        formatter: ({ name, value }) => `${name}<br/>照片数量：${Number(value) || 0} 张`,
      },
      visualMap: {
        min: 0,
        max: Math.max(maxValue, 1),
        calculable: false,
        orient: "horizontal",
        left: 24,
        bottom: 24,
        text: ["", ""],
        showLabel: false,
        textStyle: {
          color: palette.visualMapText,
        },
        inRange: {
          color: palette.visualMapRange,
        },
      },
      series: [
        {
          name: "行政区地图",
          type: "map",
          map: mapName,
          roam: true,
          animationDuration: isMobileMode ? 220 : 420,
          animationDurationUpdate: isMobileMode ? 180 : 420,
          animationEasing: "cubicOut",
          animationEasingUpdate: "cubicOut",
          layoutCenter: mapLayout.layoutCenter,
          layoutSize: mapLayout.layoutSize,
          selectedMode: "single",
          zoom: appState.zoom,
          scaleLimit: {
            min: 1,
            max: 12,
          },
          label: {
            show: shouldShowMapLabel,
            color: palette.labelColor,
            fontSize: appState.currentArea.level === "district" ? 10 : 11,
          },
          itemStyle: {
            areaColor: palette.areaColor,
            borderColor: palette.borderColor,
            borderWidth: isMobileMode ? 1 : 1.2,
            shadowColor: palette.shadowColor,
            shadowBlur: isMobileMode ? 0 : 10,
          },
          emphasis: {
            label: {
              color: palette.emphasisLabelColor,
            },
            itemStyle: {
              areaColor: palette.emphasisAreaColor,
              borderColor: palette.emphasisBorderColor,
              borderWidth: isMobileMode ? 1.1 : 1.4,
            },
          },
          select: {
            itemStyle: {
              areaColor: palette.selectAreaColor,
              borderColor: palette.selectBorderColor,
            },
            label: {
              color: palette.selectLabelColor,
            },
          },
          data: seriesData,
        },
      ],
    },
    true
  );
};

const buildFeatureMap = (features) => {
  appState.featureMap = new Map();
  features.forEach((feature) => {
    const name = feature.properties?.name || feature.name;
    appState.featureMap.set(name, feature);
  });
};

const fetchGeoJSON = async (adcode) => {
  const normalizedAdcode = normalizeAdcode(adcode);

  if (geoJSONCache.has(normalizedAdcode)) {
    return geoJSONCache.get(normalizedAdcode);
  }

  const request = (async () => {
  const urls = getBoundaryUrls(adcode);
  let lastError = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        referrerPolicy: "no-referrer",
      });

      if (!response.ok) {
        lastError = new Error(`地图数据请求失败: ${response.status} @ ${url}`);
        continue;
      }

      return response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("地图数据请求失败");
  })();

  geoJSONCache.set(normalizedAdcode, request);

  try {
    return await request;
  } catch (error) {
    geoJSONCache.delete(normalizedAdcode);
    throw error;
  }
};

const loadArea = async (area, options = {}) => {
  setStatus(`正在加载 ${area.name}…`);

  try {
    const previousArea = appState.currentArea;
    const catalogPromise =
      area.adcode === "100000"
        ? Promise.resolve()
        : ensureCatalogForArea(area.adcode).catch((error) => {
            console.error(error);
          });
    const geoJSON = await fetchGeoJSON(area.adcode);
    await catalogPromise;
    const features = geoJSON.features || [];
    const mapName = `china-map-${area.adcode}`;
    const transitionDirection = options.transitionDirection || getTransitionDirection(previousArea, area);
    const shouldCollapseTagAtlas =
      options.collapseTagView !== false &&
      (previousArea.adcode !== area.adcode || previousArea.level !== area.level);

    appState.currentArea = area;
    appState.features = features;
    appState.currentMapName = mapName;
    appState.zoom = 1.05;

    syncStackForArea(area, options);

    buildFeatureMap(features);
    setAreaLayoutMode(area);
    window.echarts.registerMap(mapName, geoJSON);
    if (shouldCollapseTagAtlas) {
      collapseTagAtlasView();
    }
    renderAreaPanel(area);
    updateChart(mapName, features, area);
    scheduleChartResize();
    animateAreaTransition(transitionDirection);
    if (options.scrollMode !== "none") {
      window.requestAnimationFrame(() => {
        scrollAtlasIntoView({ behavior: options.scrollBehavior || "smooth" });
      });
    }
    setStatus(`${area.name} · 已加载 ${features.length} 个区域`);
    if (area.adcode === "100000") {
      scheduleCatalogChunkWarmup();
    }
  } catch (error) {
    setStatus("地图加载失败");
    console.error(error);
  }
};

const tryDrillDown = async (featureName) => {
  const feature = appState.featureMap.get(featureName);

  if (!feature) {
    return;
  }

  const adcode = getFeatureAdcode(feature);
  const name = feature.properties?.name || feature.name || featureName;
  const level = inferAreaLevelFromAdcode(adcode, appState.currentArea);

  if (!adcode) {
    return;
  }

  if (!hasPhotosInArea(adcode)) {
    return;
  }

  try {
    await ensureCatalogForArea(adcode);
  } catch (error) {
    console.error(error);
  }

  if (level === "district") {
    const districtArea = { adcode, name, level };
    const transitionDirection = getTransitionDirection(appState.currentArea, districtArea);
    const shouldCollapseTagAtlas =
      appState.currentArea.adcode !== districtArea.adcode || appState.currentArea.level !== districtArea.level;
    appState.currentArea = districtArea;
    syncStackForArea(districtArea);

    if (shouldCollapseTagAtlas) {
      collapseTagAtlasView();
    }
    renderAreaPanel(districtArea);
    scheduleChartResize();
    animateAreaTransition(transitionDirection);
    appState.chart?.dispatchAction({ type: "select", seriesIndex: 0, name });
    window.requestAnimationFrame(() => {
      scrollAtlasIntoView();
    });
    setStatus(`${name} · 区县层级`);
    return;
  }

  await loadArea({ adcode, name, level });
};

const bindChartEvents = () => {
  appState.chart.off("click");
  appState.chart.on("click", async (params) => {
    await tryDrillDown(params.name);
  });
};

const setupChart = () => {
  if (!window.echarts) {
    setStatus("ECharts 加载失败");
    return;
  }

  const devicePixelRatioCap = isMapPerformanceMode() ? 1.8 : 2.4;
  appState.chart = window.echarts.init(areaChartNode, null, {
    useDirtyRect: true,
    devicePixelRatio: Math.min(window.devicePixelRatio || 1, devicePixelRatioCap),
  });
  bindChartEvents();

  window.addEventListener("resize", () => {
    scheduleChartResize();
    scheduleAlbumLayoutSync();
    syncTagCategoryIndicator({ animate: false });
  });

  window.addEventListener("orientationchange", () => {
    scheduleAlbumLayoutSync();
    syncTagCategoryIndicator({ animate: false });
  });

  if ("ResizeObserver" in window) {
    const chartResizeObserver = new ResizeObserver(() => {
      scheduleChartResize();
    });

    chartResizeObserver.observe(mapStageNode);
  }

  if (themeMediaQuery) {
    const syncTheme = () => {
      if (!appState.chart || !appState.currentMapName || !appState.features.length) {
        return;
      }

      updateChart(appState.currentMapName, appState.features, appState.currentArea);
      scheduleChartResize();
    };

    if (typeof themeMediaQuery.addEventListener === "function") {
      themeMediaQuery.addEventListener("change", syncTheme);
    } else if (typeof themeMediaQuery.addListener === "function") {
      themeMediaQuery.addListener(syncTheme);
    }
  }
};

const goBack = async () => {
  if (appState.stack.length <= 1) {
    return;
  }

  appState.stack.pop();
  const previousArea = appState.stack[appState.stack.length - 1];
  await loadArea(previousArea, { replaceStack: true });
};

zoomInButton.addEventListener("click", () => {
  appState.zoom = clamp(appState.zoom + 0.18, 1, 12);
  appState.chart?.setOption({ series: [{ zoom: appState.zoom }] });
});

zoomOutButton.addEventListener("click", () => {
  appState.zoom = clamp(appState.zoom - 0.18, 1, 12);
  appState.chart?.setOption({ series: [{ zoom: appState.zoom }] });
});

resetViewButton.addEventListener("click", async () => {
  const resetArea =
    appState.currentArea.level === "district"
      ? appState.stack[appState.stack.length - 2] || appState.stack[0]
      : appState.currentArea;
  await loadArea(resetArea, { replaceStack: true });
});

backButton.addEventListener("click", async () => {
  await goBack();
});

lightboxCloseButtons.forEach((button) => {
  button.addEventListener("click", closeLightbox);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLightbox();
  }
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.15 }
);

revealItems.forEach((item) => revealObserver.observe(item));

setupStoryCover();
setupTagAtlasDataLoading();
renderTagAtlas();
setupChart();

if (appState.chart) {
  loadArea({ adcode: "100000", name: "中国", level: "country" }, { scrollMode: "none" });
}
