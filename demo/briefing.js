const quadrant = echarts.init(document.getElementById("quadrant"));
const timeline = echarts.init(document.getElementById("timeline"));
const indicator = echarts.init(document.getElementById("indicator"));
const radar = echarts.init(document.getElementById("radar"));

async function loadPayload() {
  const res = await fetch("./briefing_payload.json", { cache: "no-store" });
  if (!res.ok) throw new Error("briefing_payload.json 加载失败");
  return res.json();
}

function renderHeader(payload) {
  const last = payload.history[payload.history.length - 1];
  document.getElementById("title").textContent = payload.meta.title;
  document.getElementById("meta").textContent = `${payload.meta.publishDate} · ${payload.meta.version} · ${payload.meta.author}`;
  document.getElementById("summary").textContent = payload.headline.summary;
  document.getElementById("regime").textContent = last.regime;
  document.getElementById("confidence").textContent = `${Math.round(payload.headline.confidence * 100)}%`;
}

function renderQuadrant(history) {
  quadrant.setOption({
    tooltip: { formatter: ({ value }) => `${value[2]}<br/>增长:${value[0]} 通胀:${value[1]}` },
    xAxis: { name: "增长", min: -1, max: 1 }, yAxis: { name: "通胀", min: -0.4, max: 0.5 },
    series: [{ type: "scatter", symbolSize: 18, data: history.map((d) => [d.growth, d.inflation, d.month]) }]
  });
}

function renderTimeline(history) {
  timeline.setOption({
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: history.map((d) => d.month) }, yAxis: { type: "value", show: false },
    series: [{
      type: "line", step: "middle", data: history.map((d) => ({
        value: ["衰退", "复苏", "复苏中后段", "过热"].indexOf(d.regime) + 1 || 2,
        label: { show: true, formatter: d.regime }
      }))
    }]
  });
}

function renderIndicator(history) {
  indicator.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["PMI", "CPI", "社融"] },
    xAxis: { type: "category", data: history.map((d) => d.month) },
    yAxis: [{ type: "value" }, { type: "value" }],
    series: [
      { name: "PMI", type: "line", smooth: true, data: history.map((d) => d.pmi) },
      { name: "CPI", type: "line", smooth: true, yAxisIndex: 1, data: history.map((d) => d.cpi) },
      { name: "社融", type: "line", smooth: true, yAxisIndex: 1, data: history.map((d) => d.tsf) }
    ]
  });
}

function renderRadar(last) {
  radar.setOption({
    radar: { indicator: ["权益", "利率债", "信用债", "商品", "黄金"].map((name) => ({ name, max: 0.4 })) },
    series: [{ type: "radar", data: [{ value: [last.equity, last.rateBond, last.creditBond, last.commodity, last.gold] }] }]
  });
}

function renderTable(allocationView) {
  const tbody = document.querySelector("#allocTable tbody");
  tbody.innerHTML = allocationView
    .map((r) => `<tr><td>${r.asset}</td><td>${r.view}</td><td>${r.reason}</td></tr>`)
    .join("");
}

function renderRisk(risks) {
  const riskList = document.getElementById("riskList");
  riskList.innerHTML = risks.map((r) => `<li>${r}</li>`).join("");
}

async function main() {
  try {
    const payload = await loadPayload();
    const history = payload.history;
    const last = history[history.length - 1];
    renderHeader(payload);
    renderQuadrant(history);
    renderTimeline(history);
    renderIndicator(history);
    renderRadar(last);
    renderTable(payload.allocationView);
    renderRisk(payload.headline.risks);
  } catch (e) {
    document.getElementById("summary").textContent = e.message;
  }
}

window.addEventListener("resize", () => [quadrant, timeline, indicator, radar].forEach((c) => c.resize()));
main();
