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

let pendingChartResizeFrame = 0;

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

const getCatalogAlbums = () =>
  Object.entries(photoCatalog).flatMap(([ownerAdcode, albums]) =>
    albums.map((album, albumIndex) => ({
      ...album,
      ownerAdcode,
      catalogKey: getAlbumKey(album, `${ownerAdcode}-${albumIndex}`),
    }))
  );

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
  getCatalogAlbums()
    .filter((album) => getShotOnValue(album.shotOn) > 0 && getAssetCount(album, { includePlaceholders: false }) > 0)
    .sort((left, right) => getShotOnValue(right.shotOn) - getShotOnValue(left.shotOn))
    .slice(0, limit);

const getPhotoCountForArea = (adcode) =>
  getCatalogAlbums()
    .filter((album, albumIndex, albums) => {
      const targets = [album.ownerAdcode, ...(Array.isArray(album.areas) ? album.areas : [])];
      const matchesArea = targets.some((targetAdcode) => isAlbumWithinArea(targetAdcode, adcode));

      if (!matchesArea) {
        return false;
      }

      return (
        albumIndex === albums.findIndex((item) => item.catalogKey === album.catalogKey)
      );
    })
    .reduce((total, album) => total + getAssetCount(album, { includePlaceholders: false }), 0);

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

  regionTimelineNode.querySelectorAll(".timeline-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.albumIndex === String(albumIndex));
  });
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

const bindLightboxTriggers = () => {
  document.querySelectorAll(".open-lightbox").forEach((button) => {
    button.addEventListener("click", () => openLightbox(button));
  });
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
  const mainButton = block.querySelector(".album-main-button");

  mainImage.src = currentPhoto.src;
  mainImage.alt = currentPhoto.alt;
  mainButton.dataset.image = currentPhoto.src;
  mainButton.dataset.title = currentPhoto.title;
  mainButton.dataset.meta = currentPhoto.metaLine;
  mainButton.dataset.gear = currentPhoto.gearLine;
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
                    />
                  </button>
                `
              )
              .join("")}
          </div>

          <button class="album-masonry-toggle" type="button">展开本组照片</button>

          <div class="album-masonry" aria-hidden="true">
            ${album.photos
              .map(
                (photo, imageIndex) => `
                  <button
                    class="masonry-tile open-lightbox"
                    data-image="${escapeHtml(photo.src)}"
                    data-title="${escapeHtml(photo.title)}"
                    data-meta="${escapeHtml(photo.metaLine)}"
                    data-gear="${escapeHtml(photo.gearLine)}"
                  >
                    <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}" />
                  </button>
                `
              )
              .join("")}
          </div>
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
  areaTitleNode.textContent = "recent update";

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
                <img src="${escapeHtml(cover)}" alt="${escapeHtml(album.title)}" />
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

setupChart();

if (appState.chart) {
  loadArea({ adcode: "100000", name: "中国", level: "country" });
}
