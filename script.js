const GEO_DATA_SOURCES = [
  "./data/maps",
  "https://geo.datav.aliyun.com/areas_v3/bound",
];

const albumCatalog = {
  "100000": [
    {
      title: "中国 · 入口组照",
      meta: "全国视图 · 4 张精选",
      description: "适合作为总入口的首页组照，先给观者一个全国范围的视觉预览。",
      images: [
        "./assets/photos/neon-crossing.svg",
        "./assets/photos/salt-lake.svg",
        "./assets/photos/moon-market.svg",
        "./assets/photos/dawn-harbor.svg",
      ],
    },
  ],
  "110000": [
    {
      title: "北京 · 冬季街区",
      meta: "北京市 · 5 张组照",
      description: "把胡同、轨道站台和深夜路口放在同一个组照里，能看出北京冬天的硬度。",
      images: [
        "./assets/photos/quiet-platform.svg",
        "./assets/photos/atelier-window.svg",
        "./assets/photos/neon-crossing.svg",
        "./assets/photos/red-bus-stop.svg",
        "./assets/photos/after-rain.svg",
      ],
    },
  ],
  "310000": [
    {
      title: "上海 · 夜色缝隙",
      meta: "上海市 · 4 张组照",
      description: "从商业区、高架边和站台之间切入，做一个偏夜色的城市组照。",
      images: [
        "./assets/photos/moon-market.svg",
        "./assets/photos/quiet-platform.svg",
        "./assets/photos/neon-crossing.svg",
        "./assets/photos/atelier-window.svg",
      ],
    },
  ],
  "440100": [
    {
      title: "广州 · 潮湿白昼",
      meta: "广州市 · 5 张组照",
      description: "把公交站、夜市、港区和雨后人物合并成一个更有湿热感的城市相册。",
      images: [
        "./assets/photos/red-bus-stop.svg",
        "./assets/photos/moon-market.svg",
        "./assets/photos/dawn-harbor.svg",
        "./assets/photos/after-rain.svg",
        "./assets/photos/neon-crossing.svg",
      ],
    },
  ],
  "510100": [
    {
      title: "成都 · 缓慢坡度",
      meta: "成都市 · 5 张组照",
      description: "一个地区不再只显示单张卡片，而是直接出现完整组照轮播和瀑布流。",
      images: [
        "./assets/photos/after-rain.svg",
        "./assets/photos/red-bus-stop.svg",
        "./assets/photos/moon-market.svg",
        "./assets/photos/quiet-platform.svg",
        "./assets/photos/atelier-window.svg",
      ],
    },
  ],
};

const directControlledMunicipalities = new Set(["110000", "120000", "310000", "500000"]);

const areaChartNode = document.querySelector("#chinaMap");
const mapStatus = document.querySelector("#mapStatus");
const breadcrumbNode = document.querySelector("#breadcrumb");
const areaLevelNode = document.querySelector("#areaLevel");
const areaTitleNode = document.querySelector("#areaTitle");
const areaMetaNode = document.querySelector("#areaMeta");
const areaDescriptionNode = document.querySelector("#areaDescription");
const areaStatsNode = document.querySelector("#areaStats");
const areaHintNode = document.querySelector("#areaHint");
const regionGalleryNode = document.querySelector("#regionGallery");

const zoomInButton = document.querySelector("#zoomInButton");
const zoomOutButton = document.querySelector("#zoomOutButton");
const resetViewButton = document.querySelector("#resetViewButton");
const backButton = document.querySelector("#backButton");

const lightbox = document.querySelector(".lightbox");
const lightboxImage = document.querySelector(".lightbox-image");
const lightboxTitle = document.querySelector(".lightbox-title");
const lightboxMeta = document.querySelector(".lightbox-meta");
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
  zoom: 1.05,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getLabelForLevel = (level) => {
  if (level === "country") {
    return "全国视图";
  }

  if (level === "province") {
    return "省级视图";
  }

  if (level === "city") {
    return "市级视图";
  }

  return "区县视图";
};

const getAreaDescription = (area) => {
  if (area.level === "country") {
    return "点击地图进入省级，再继续点击城市或区县。你可以把照片绑定到任意行政区代码上，让作品按真实区域组织，而不是手工摆点。";
  }

  if (area.level === "province") {
    return `当前位于 ${area.name}。继续点击地图中的城市或区县，可以把照片整理到更细的地域层级。`;
  }

  if (area.level === "city") {
    return `当前位于 ${area.name}。如果该城市下还有区县，继续点击即可进入区县层；你也可以把作品直接绑定在城市层。`;
  }

  return `当前已经到达 ${area.name} 的区县层级。这里最适合放最精确的本地作品、街区项目或长期区域档案。`;
};

const getAreaHint = (area) => {
  if (area.level === "country") {
    return "建议从全国视图进入某个省，再进入城市或区县。右侧现在会直接显示该地区的组照轮播和瀑布流，后面可以无缝换成你的真实作品。";
  }

  if (area.level === "province") {
    return `如果 ${area.name} 是普通省份，继续点击城市可以进入市级；如果是直辖市，则下一层通常直接就是区县。`;
  }

  if (area.level === "city") {
    return `你可以继续下钻到 ${area.name} 下属区县，或者直接把这一级当作一个独立的摄影专题。`;
  }

  return `已经到达最细层级之一。这里特别适合挂接按街区、片区、长期路线整理的作品。`;
};

const getStatsForArea = (area) => {
  const visibleCount =
    area.level === "district" ? 1 : Math.max(appState.features.length, 1);
  const childCount = String(visibleCount).padStart(2, "0");
  const albums = getAlbumsForArea(area);
  const totalPhotos = albums.reduce((sum, album) => sum + album.images.length, 0);
  const levelLabel = area.level === "district" ? "Leaf" : "Drill";
  const nextStep =
    area.level === "country"
      ? "省级"
      : area.level === "province"
        ? "市级/区级"
        : area.level === "city"
          ? "区县"
          : "当前最细层";

  return [
    { value: String(albums.length).padStart(2, "0"), label: "当前相册组" },
    { value: String(totalPhotos).padStart(2, "0"), label: "当前照片数" },
    { value: childCount, label: "当前可见区域" },
    { value: levelLabel, label: "地图模式" },
    { value: nextStep, label: "下一层级" },
  ];
};

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

const makeFallbackAlbums = (area) => [
  {
    title: `${area.name} · 默认组照`,
    meta: `${area.name} · 行政区代码 ${area.adcode}`,
    description: `这里还没有挂接真实组照。你可以把 ${area.adcode} 作为主键，为 ${area.name} 绑定一整组照片。`,
    images: [
      "./assets/photos/salt-lake.svg",
      "./assets/photos/quiet-platform.svg",
      "./assets/photos/red-bus-stop.svg",
      "./assets/photos/after-rain.svg",
    ],
  },
];

const getAlbumsForArea = (area) => albumCatalog[area.adcode] || makeFallbackAlbums(area);

const setStatus = (text) => {
  mapStatus.textContent = text;
};

const renderStats = (stats) => {
  areaStatsNode.innerHTML = stats
    .map(
      (item) => `
        <article>
          <strong>${item.value}</strong>
          <span>${item.label}</span>
        </article>
      `
    )
    .join("");
};

const openLightbox = (button) => {
  lightboxImage.src = button.dataset.image || "";
  lightboxImage.alt = button.dataset.title || "";
  lightboxTitle.textContent = button.dataset.title || "";
  lightboxMeta.textContent = button.dataset.meta || "";
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

  const currentImage = album.images[imageIndex];
  const mainImage = block.querySelector(".album-main-image");
  const counter = block.querySelector(".album-counter");
  const caption = block.querySelector(".album-caption");

  mainImage.src = currentImage;
  mainImage.alt = `${album.title} ${imageIndex + 1}`;
  mainImage.dataset.image = currentImage;
  mainImage.dataset.title = `${album.title} #${imageIndex + 1}`;
  mainImage.dataset.meta = `${album.meta} · 第 ${imageIndex + 1} 张`;
  counter.textContent = `${imageIndex + 1} / ${album.images.length}`;
  caption.textContent = `${album.title} · 第 ${imageIndex + 1} 张`;

  block.querySelectorAll(".album-thumb").forEach((thumb, thumbIndex) => {
    thumb.classList.toggle("is-active", thumbIndex === imageIndex);
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

    const update = (nextIndex) => {
      currentIndex = (nextIndex + album.images.length) % album.images.length;
      syncAlbumCarousel(albumIndex, album, currentIndex);
    };

    prevButton?.addEventListener("click", () => update(currentIndex - 1));
    nextButton?.addEventListener("click", () => update(currentIndex + 1));

    block.querySelectorAll(".album-thumb").forEach((thumb, thumbIndex) => {
      thumb.addEventListener("click", () => update(thumbIndex));
    });

    mainButton?.addEventListener("click", () => openLightbox(mainButton));
    update(0);
  });

  bindLightboxTriggers();
};

const renderGallery = (area) => {
  const albums = getAlbumsForArea(area);

  regionGalleryNode.innerHTML = albums
    .map(
      (album, albumIndex) => `
        <section class="album-block" data-album-block="${albumIndex}">
          <div class="album-header">
            <div>
              <p class="meta">${album.meta}</p>
              <h4>${album.title}</h4>
              <p>${album.description}</p>
            </div>
            <span class="album-counter">1 / ${album.images.length}</span>
          </div>

          <div class="album-carousel">
            <button class="album-nav" data-action="prev" aria-label="上一张">-</button>
            <button
              class="album-main-button"
              data-image="${album.images[0]}"
              data-title="${album.title} #1"
              data-meta="${album.meta} · 第 1 张"
            >
              <img class="album-main-image" src="${album.images[0]}" alt="${album.title} 1" />
            </button>
            <button class="album-nav" data-action="next" aria-label="下一张">+</button>
          </div>

          <p class="album-caption">${album.title} · 第 1 张</p>

          <div class="album-thumbs">
            ${album.images
              .map(
                (image, imageIndex) => `
                  <button class="album-thumb ${imageIndex === 0 ? "is-active" : ""}" type="button">
                    <img src="${image}" alt="${album.title} 缩略图 ${imageIndex + 1}" />
                  </button>
                `
              )
              .join("")}
          </div>

          <div class="album-masonry">
            ${album.images
              .map(
                (image, imageIndex) => `
                  <button
                    class="masonry-tile open-lightbox"
                    data-image="${image}"
                    data-title="${album.title} #${imageIndex + 1}"
                    data-meta="${album.meta} · 第 ${imageIndex + 1} 张"
                  >
                    <img src="${image}" alt="${album.title} ${imageIndex + 1}" />
                  </button>
                `
              )
              .join("")}
          </div>
        </section>
      `
    )
    .join("");

  setupAlbumInteractions(albums);
};

const renderBreadcrumb = () => {
  breadcrumbNode.innerHTML = appState.stack
    .map(
      (item, index) => `
        <button
          class="${index === appState.stack.length - 1 ? "is-active" : ""}"
          data-adcode="${item.adcode}"
        >
          ${item.name}
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
  areaLevelNode.textContent = getLabelForLevel(area.level);
  areaTitleNode.textContent = area.name;
  areaMetaNode.textContent = `行政区代码 ${area.adcode}`;
  areaDescriptionNode.textContent = getAreaDescription(area);
  areaHintNode.textContent = getAreaHint(area);
  renderStats(getStatsForArea(area));
  renderGallery(area);
  renderBreadcrumb();
};

const getSeriesData = (features) =>
  features.map((feature) => ({
    name: feature.properties?.name || feature.name,
    value: clamp(Number(feature.properties?.level) || Math.random() * 100, 1, 100),
  }));

const updateChart = (mapName, features) => {
  appState.chart.setOption(
    {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: ({ name }) => name,
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: false,
        orient: "horizontal",
        left: 24,
        bottom: 24,
        text: ["高", "低"],
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
          data: getSeriesData(features),
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
    const geoJSON = await fetchGeoJSON(area.adcode);
    const features = geoJSON.features || [];
    const mapName = `china-map-${area.adcode}`;

    appState.currentArea = area;
    appState.features = features;
    appState.zoom = 1.05;

    if (!options.replaceStack) {
      const lastItem = appState.stack[appState.stack.length - 1];

      if (!lastItem || lastItem.adcode !== area.adcode) {
        appState.stack.push(area);
      }
    }

    buildFeatureMap(features);
    window.echarts.registerMap(mapName, geoJSON);
    updateChart(mapName, features);
    renderAreaPanel(area);
    setStatus(`${area.name} · 已加载 ${features.length} 个区域`);
  } catch (error) {
    setStatus("地图加载失败");
    areaHintNode.textContent =
      "当前没能加载真实行政区数据。请确认网络可访问 CDN 与地图数据服务，然后刷新页面重试。";
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

  if (level === "district") {
    const districtArea = { adcode, name, level };
    appState.currentArea = districtArea;
    const lastItem = appState.stack[appState.stack.length - 1];

    if (!lastItem || lastItem.adcode !== districtArea.adcode) {
      appState.stack.push(districtArea);
    }

    renderAreaPanel(districtArea);
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
    appState.chart?.resize();
  });
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
