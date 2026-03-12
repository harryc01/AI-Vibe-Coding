let data = [];
let assets = [];

const monthRange = document.getElementById("monthRange");
const monthLabel = document.getElementById("monthLabel");
const regimeValue = document.getElementById("regimeValue");
const regimeBadge = document.getElementById("regimeBadge");
const growthValue = document.getElementById("growthValue");
const inflationValue = document.getElementById("inflationValue");
const confidenceValue = document.getElementById("confidenceValue");
const summaryText = document.getElementById("summaryText");
const compareText = document.getElementById("compareText");
const jsonFileInput = document.getElementById("jsonFileInput");
const loadJsonBtn = document.getElementById("loadJsonBtn");

const quadrantChart = echarts.init(document.getElementById("quadrantChart"));
const indicatorChart = echarts.init(document.getElementById("indicatorChart"));
const allocationHeatmap = echarts.init(document.getElementById("allocationHeatmap"));

function formatBadge(regime) {
  if (["复苏"].includes(regime)) return '<span class="badge good">风险偏好改善</span>';
  if (["过热"].includes(regime)) return '<span class="badge warn">注意估值与通胀</span>';
  return '<span class="badge risk">防守优先</span>';
}

function setCards(idx) {
  const current = data[idx];
  monthLabel.textContent = current.month;
  regimeValue.textContent = current.regime;
  regimeBadge.innerHTML = formatBadge(current.regime);
  growthValue.textContent = current.growth.toFixed(2);
  inflationValue.textContent = current.inflation.toFixed(2);
  confidenceValue.textContent = `${Math.round(current.confidence * 100)}%`;
  summaryText.textContent = `本期判断：${current.summary}`;

  if (idx > 0) {
    const prev = data[idx - 1];
    compareText.textContent = `较上期（${prev.month}）变化：增长 ${prev.growth.toFixed(2)} → ${current.growth.toFixed(2)}，通胀 ${prev.inflation.toFixed(2)} → ${current.inflation.toFixed(2)}。`;
  } else {
    compareText.textContent = "该月份为样本起点。";
  }
}

function renderQuadrant(idx) {
  const scatter = data.map((d, i) => ({
    value: [d.growth, d.inflation, i],
    itemStyle: { opacity: i === idx ? 1 : 0.35 }
  }));

  quadrantChart.setOption({
    tooltip: {
      formatter: ({ value }) => {
        const p = data[value[2]];
        return `${p.month}<br/>阶段：${p.regime}<br/>增长：${p.growth.toFixed(2)}<br/>通胀：${p.inflation.toFixed(2)}`;
      }
    },
    xAxis: { name: "增长", min: -2, max: 2 },
    yAxis: { name: "通胀", min: -2, max: 2 },
    series: [{ type: "scatter", symbolSize: 20, data: scatter, itemStyle: { color: "#2f6fed" } }],
    graphic: [
      { type: "text", left: "15%", top: "18%", style: { text: "过热", fill: "#95a2b8" } },
      { type: "text", right: "15%", top: "18%", style: { text: "滞胀", fill: "#95a2b8" } },
      { type: "text", left: "15%", bottom: "18%", style: { text: "复苏", fill: "#95a2b8" } },
      { type: "text", right: "15%", bottom: "18%", style: { text: "衰退", fill: "#95a2b8" } }
    ]
  });
}

function renderIndicators() {
  indicatorChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["PMI", "CPI", "社融"], top: 0 },
    xAxis: { type: "category", data: data.map((d) => d.month) },
    yAxis: [{ type: "value" }, { type: "value" }],
    series: [
      { name: "PMI", type: "line", smooth: true, data: data.map((d) => d.indicators.PMI) },
      { name: "CPI", type: "line", smooth: true, yAxisIndex: 1, data: data.map((d) => d.indicators.CPI) },
      { name: "社融", type: "line", smooth: true, yAxisIndex: 1, data: data.map((d) => d.indicators.TSF) }
    ]
  });
}

function renderAllocation(idx) {
  const current = data[idx];
  const matrix = assets.map((name, i) => [i, 0, Math.round(current.allocation[name] * 100)]);

  allocationHeatmap.setOption({
    tooltip: { formatter: ({ value }) => `${assets[value[0]]}: ${value[2]}%` },
    xAxis: { type: "category", data: assets },
    yAxis: { type: "category", data: [current.month] },
    visualMap: {
      min: 0,
      max: 50,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      inRange: { color: ["#dbeafe", "#1d4ed8"] }
    },
    series: [{ type: "heatmap", data: matrix, label: { show: true, formatter: "{c}%" } }]
  });
}

function render(idx) {
  setCards(idx);
  renderQuadrant(idx);
  renderAllocation(idx);
}

function initWithPayload(payload) {
  data = payload.macroData || [];
  assets = payload.assetNames || [];

  if (!data.length || !assets.length) {
    throw new Error("JSON 格式不正确：需要 macroData 和 assetNames。");
  }

  monthRange.max = String(data.length - 1);
  monthRange.value = String(data.length - 1);

  renderIndicators();
  render(data.length - 1);
}

async function bootstrap() {
  try {
    const response = await fetch("./real_macro_data.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("未找到真实数据文件 demo/real_macro_data.json");
    }
    const payload = await response.json();
    initWithPayload(payload);
  } catch (err) {
    summaryText.textContent = `自动加载失败：${err.message}`;
    compareText.textContent = "你可以直接上传本地 real_macro_data.json 使用（无需本地服务）。";
  }
}

function loadFromSelectedFile() {
  const file = jsonFileInput.files && jsonFileInput.files[0];
  if (!file) {
    summaryText.textContent = "请先选择 real_macro_data.json 文件。";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result));
      initWithPayload(payload);
      summaryText.textContent = `已从本地文件加载：${file.name}`;
    } catch (err) {
      summaryText.textContent = `本地 JSON 解析失败：${err.message}`;
    }
  };
  reader.readAsText(file, "utf-8");
}

monthRange.addEventListener("input", (e) => {
  if (!data.length) return;
  render(Number(e.target.value));
});

loadJsonBtn.addEventListener("click", loadFromSelectedFile);

window.addEventListener("resize", () => {
  quadrantChart.resize();
  indicatorChart.resize();
  allocationHeatmap.resize();
});

bootstrap();
