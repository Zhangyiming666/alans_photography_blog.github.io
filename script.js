const GEO_DATA_SOURCES = [
  "./data/maps",
  "https://geo.datav.aliyun.com/areas_v3/bound",
];

const photoCatalog = window.photoCatalog || {};
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

const zoomInButton = document.querySelector("#zoomInButton");
const zoomOutButton = document.querySelector("#zoomOutButton");
const resetViewButton = document.querySelector("#resetViewButton");
const backButton = document.querySelector("#backButton");

const lightbox = document.querySelector(".lightbox");
const lightboxImage = document.querySelector(".lightbox-image");
const lightboxTitle = document.querySelector(".lightbox-title");
const lightboxMeta = document.querySelector(".lightbox-meta");
const lightboxGear = document.querySelector(".lightbox-gear");
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
  zoom: 1.05,
};

const geoJSONCache = new Map();
const albumPhotoCountCache = new Map();
const recentAlbumsCache = new Map();
let pendingChartResizeFrame = 0;
let storyTrackMotionFrame = 0;
let storyTrackCurrentOffset = 0;
let storyTrackTargetOffset = 0;
const STORY_TRACK_REPEATS = 5;

const STORY_ROW_SETTINGS = [
  { speed: -0.7, lift: -34 },
  { speed: 0.92, lift: 18 },
  { speed: -1.08, lift: -6 },
  { speed: 0.84, lift: 28 },
  { speed: -0.96, lift: 8 },
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

const getAreaLevelRank = (level) => AREA_LEVEL_ORDER[level] ?? 0;

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const getBoundaryUrls = (adcode) =>
  GEO_DATA_SOURCES.map((baseUrl) => `${baseUrl}/${adcode}_full.json`);

const normalizeAdcode = (value) => String(value || "");

const getStoryCoverAsset = (src) =>
  String(src || "").replace("./assets/photos/", "./assets/photos/story-cover/");

const getFeatureAdcode = (feature) =>
  normalizeAdcode(
    feature?.properties?.adcode ||
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

const getAreaPrefix = (adcode) => normalizeAdcode(adcode).replace(/0+$/, "");

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

  return getAreaPrefix(normalizedTarget).startsWith(getAreaPrefix(normalizedArea));
};

const catalogAlbums = Object.entries(photoCatalog).flatMap(([ownerAdcode, albums]) =>
  albums.map((album, albumIndex) => ({
    ...album,
    ownerAdcode,
    catalogKey: getAlbumKey(album, `${ownerAdcode}-${albumIndex}`),
  }))
);

const getCatalogAlbums = () => catalogAlbums;

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

const getShotOnValue = (shotOn) => Number(String(shotOn || "").replaceAll(".", "")) || 0;

const getCityNameFromLocation = (location) => {
  const normalizedLocation = String(location || "");
  const municipalityMatch = normalizedLocation.match(/^(北京市|天津市|上海市|重庆市)/);

  if (municipalityMatch) {
    return municipalityMatch[1];
  }

  const cityMatch = normalizedLocation.match(/(?:^|省)([^·]+?市)/);
  return cityMatch?.[1] || "";
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

    const result = getCatalogAlbums()
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

const getPhotoCountForArea = (adcode) => {
  const normalizedAdcode = normalizeAdcode(adcode);

  if (albumPhotoCountCache.has(normalizedAdcode)) {
    return albumPhotoCountCache.get(normalizedAdcode);
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
  const hasExplicitGear = Boolean(rawPhoto.camera || rawPhoto.lens || album.camera || album.lens);
  const gearLine =
    rawPhoto.gearLine ||
    [
      rawPhoto.camera || album.camera || (isPlaceholderImage || hasExplicitGear ? "" : DEFAULT_CAMERA),
      rawPhoto.lens || album.lens || (isPlaceholderImage || hasExplicitGear ? "" : DEFAULT_LENS),
    ]
      .filter(Boolean)
      .join(" · ");

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
  };
};

const normalizeAlbum = (album, area) => {
  const rawPhotos = album.photos || album.images || [];

  return {
    ...album,
    photos: rawPhotos.map((photo, photoIndex) => normalizePhoto(photo, album, area, photoIndex)),
  };
};

const getAlbumsForArea = (area) => {
  const directAlbums = photoCatalog[area.adcode] || [];
  const linkedAlbums = Object.values(photoCatalog)
    .flat()
    .filter((album) => Array.isArray(album.areas) && album.areas.includes(area.adcode));
  const mergedAlbums = [...directAlbums, ...linkedAlbums].filter((album, albumIndex, albums) => {
    const currentKey = getAlbumKey(album, albumIndex);
    return albumIndex === albums.findIndex((item, itemIndex) => getAlbumKey(item, itemIndex) === currentKey);
  });

  return mergedAlbums.map((album) => normalizeAlbum(album, area));
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

const syncStackForArea = (area, options = {}) => {
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
      layoutCenter: ["50%", "53%"],
      layoutSize: "120%",
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
  lightboxImage.src = button.dataset.image || "";
  lightboxImage.alt = button.dataset.title || "";
  lightboxTitle.textContent = button.dataset.title || "";
  lightboxMeta.textContent = button.dataset.meta || "";
  lightboxGear.textContent = button.dataset.gear || "";
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeLightbox = () => {
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
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

    const targetHeight = Math.min(
      isMobile ? viewportHeight * 0.34 : viewportHeight * 0.54,
      isMobile ? 328 : 590
    );

    const minHeight = isMobile ? 238 : 392;
    const resolvedHeight = Math.max(minHeight, targetHeight);

    const padding = isMobile ? 10 : orientation === "portrait" ? 12 : 16;
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
          ? Math.min(viewportWidth - 56, 310)
          : 460
        : orientation === "landscape"
          ? isMobile
            ? viewportWidth - 44
            : 920
          : isMobile
            ? Math.min(viewportWidth - 50, 350)
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
        >
          <img
            src="${escapeHtml(photo.src)}"
            alt="${escapeHtml(photo.alt)}"
            loading="lazy"
            decoding="async"
            fetchpriority="low"
          />
        </button>
      `
    )
    .join("");

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
  const mainButton = block.querySelector(".album-main-button");

  mainImage.src = currentPhoto.src;
  mainImage.alt = currentPhoto.alt;
  mainButton.dataset.image = currentPhoto.src;
  mainButton.dataset.title = currentPhoto.title;
  mainButton.dataset.meta = currentPhoto.metaLine;
  mainButton.dataset.gear = currentPhoto.gearLine;
  syncAlbumFrameLayout(block, currentPhoto, mainImage);
  counters.forEach((counter) => {
    counter.textContent = `${imageIndex + 1} / ${album.photos.length}`;
  });
  meta.textContent = currentPhoto.metaLine;
  caption.textContent = currentPhoto.caption;
  gear.textContent = currentPhoto.gearLine;

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

const setupAlbumInteractions = (albums) => {
  albums.forEach((album, albumIndex) => {
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

    block.querySelectorAll(".album-thumb").forEach((thumb, thumbIndex) => {
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

const renderGallery = (area) => {
  const albums = getAlbumsForArea(area);

  if (!albums.length) {
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

  regionGalleryNode.innerHTML = albums
    .map(
      (album, albumIndex) => `
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
              data-image="${escapeHtml(album.photos[0]?.src)}"
              data-title="${escapeHtml(album.photos[0]?.title)}"
              data-meta="${escapeHtml(album.photos[0]?.metaLine)}"
              data-gear="${escapeHtml(album.photos[0]?.gearLine)}"
            >
              <img
                class="album-main-image"
                src="${escapeHtml(album.photos[0]?.src)}"
                alt="${escapeHtml(album.photos[0]?.alt)}"
                loading="${albumIndex < 3 ? "eager" : "lazy"}"
                decoding="async"
                fetchpriority="${albumIndex === 0 ? "high" : albumIndex < 3 ? "auto" : "low"}"
              />
            </button>
            <button class="album-nav" data-action="next" aria-label="下一张">+</button>
          </div>

          <div class="album-mobile-controls">
            <button class="album-nav album-nav-mobile" data-action="prev" aria-label="上一张">-</button>
            <span class="album-counter album-counter-mobile">1 / ${album.photos.length}</span>
            <button class="album-nav album-nav-mobile" data-action="next" aria-label="下一张">+</button>
          </div>

          <p class="album-photo-meta">${escapeHtml(album.photos[0]?.metaLine)}</p>
          <p class="album-caption">${escapeHtml(album.photos[0]?.caption)}</p>
          <p class="album-photo-gear">${escapeHtml(album.photos[0]?.gearLine)}</p>

          <div class="album-thumbs">
            ${album.photos
              .map(
                (photo, imageIndex) => `
                  <button class="album-thumb ${imageIndex === 0 ? "is-active" : ""}" type="button">
                    <img
                      src="${escapeHtml(photo.src)}"
                      alt="${escapeHtml(photo.title || `${album.title} 缩略图 ${imageIndex + 1}`)}"
                      loading="lazy"
                      decoding="async"
                      fetchpriority="low"
                    />
                  </button>
                `
              )
              .join("")}
          </div>

          <button class="album-masonry-toggle" type="button">展开本组照片</button>

          <div class="album-masonry" aria-hidden="true" data-loaded="false"></div>
        </section>
      `
    )
    .join("");

  renderRegionTimeline(albums);
  setupAlbumInteractions(albums);
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
            const cover = album.photos?.[0]?.src || album.images?.[0] || "";
            const count = getAssetCount(album, { includePlaceholders: false });

            return `
              <button
                class="country-quick-card"
                type="button"
                data-adcode="${escapeHtml(jumpArea.adcode)}"
                data-level="${escapeHtml(jumpArea.level)}"
                data-name="${escapeHtml(jumpArea.name)}"
              >
                <img
                  src="${escapeHtml(cover)}"
                  alt="${escapeHtml(album.title)}"
                  loading="lazy"
                  decoding="async"
                  fetchpriority="low"
                />
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
      await loadArea({
        adcode: button.dataset.adcode || "",
        name: button.dataset.name || "",
        level: button.dataset.level || "city",
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

  appState.chart.setOption(
    {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
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
          color: "#607181",
        },
        inRange: {
          color: ["#dbe7ec", "#89a7b1", "#35586a"],
        },
      },
      series: [
        {
          name: "行政区地图",
          type: "map",
          map: mapName,
          roam: true,
          animationDuration: 420,
          animationDurationUpdate: 420,
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
            show: appState.currentArea.level !== "country",
            color: "#20333f",
            fontSize: appState.currentArea.level === "district" ? 10 : 11,
          },
          itemStyle: {
            areaColor: "#dbe7ec",
            borderColor: "#ffffff",
            borderWidth: 1.2,
            shadowColor: "rgba(19, 33, 43, 0.08)",
            shadowBlur: 10,
          },
          emphasis: {
            label: {
              color: "#ffffff",
            },
            itemStyle: {
              areaColor: "#cf6f43",
              borderColor: "#fff6ed",
              borderWidth: 1.4,
            },
          },
          select: {
            itemStyle: {
              areaColor: "#8e4a2e",
              borderColor: "#fff6ed",
            },
            label: {
              color: "#ffffff",
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
    const geoJSON = await fetchGeoJSON(area.adcode);
    const features = geoJSON.features || [];
    const mapName = `china-map-${area.adcode}`;
    const transitionDirection = options.transitionDirection || getTransitionDirection(previousArea, area);

    appState.currentArea = area;
    appState.features = features;
    appState.zoom = 1.05;

    syncStackForArea(area, options);

    buildFeatureMap(features);
    setAreaLayoutMode(area);
    window.echarts.registerMap(mapName, geoJSON);
    renderAreaPanel(area);
    updateChart(mapName, features, area);
    scheduleChartResize();
    animateAreaTransition(transitionDirection);
    setStatus(`${area.name} · 已加载 ${features.length} 个区域`);
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

  if (level === "district") {
    const districtArea = { adcode, name, level };
    const transitionDirection = getTransitionDirection(appState.currentArea, districtArea);
    appState.currentArea = districtArea;
    syncStackForArea(districtArea);

    renderAreaPanel(districtArea);
    scheduleChartResize();
    animateAreaTransition(transitionDirection);
    appState.chart?.dispatchAction({ type: "select", seriesIndex: 0, name });
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

  appState.chart = window.echarts.init(areaChartNode);
  bindChartEvents();

  window.addEventListener("resize", () => {
    scheduleChartResize();
  });

  if ("ResizeObserver" in window) {
    const chartResizeObserver = new ResizeObserver(() => {
      scheduleChartResize();
    });

    chartResizeObserver.observe(mapStageNode);
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
setupChart();

if (appState.chart) {
  loadArea({ adcode: "100000", name: "中国", level: "country" });
}
