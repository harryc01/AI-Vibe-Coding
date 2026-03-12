# AI-Vibe-Coding

## 可交互网页（真实数据版）

- 页面入口：`demo/index.html`
- Briefing 风格 Demo：`demo/briefing.html`
- 前端读取：`demo/real_macro_data.json`（由 Wind / 同花顺脚本生成）

## 先解决你报错的这个问题：`系统找不到指定的路径`

这个错误通常是因为你复制了 `cd /workspace/AI-Vibe-Coding`，但你的电脑不是这个路径。

请按下面最小白步骤：

1. 先找到你本机项目文件夹（例如：`D:\AI-Vibe-Coding` 或 `C:\Users\你\Desktop\AI-Vibe-Coding`）
2. 终端里先 `cd` 到你的真实路径（不要照抄 `/workspace/...`）
3. 再执行后续命令

示例（Windows PowerShell）：

```powershell
cd D:\AI-Vibe-Coding
python scripts\start_demo.py
```

示例（macOS/Linux）：

```bash
cd ~/AI-Vibe-Coding
python3 scripts/start_demo.py
```

启动成功后浏览器打开：

- `http://localhost:4173/demo/`
- `http://localhost:4173/demo/briefing.html`

---

## 1) 先拉取真实数据（Wind 或同花顺）

> 注意：先 `cd` 到你自己的项目目录，再执行。

```bash
# Wind
python3 scripts/fetch_real_data.py --provider wind --months 24 --output demo/real_macro_data.json

# 同花顺 iFinD
python3 scripts/fetch_real_data.py --provider ifind --months 24 --output demo/real_macro_data.json
```

> 若你本机未安装 `WindPy` 或 `iFinDPy`，脚本会报安装提示，不会回退到虚拟数据。

## 2) 打开 Demo（3 种方式）

### 方式 A：一键启动（推荐）

```bash
python3 scripts/start_demo.py
```

### 方式 B：手动 HTTP

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

浏览器访问：

- `http://localhost:4173/demo/`
- `http://localhost:4173/demo/briefing.html`

### 方式 C：直接双击 HTML（兜底）

直接打开 `demo/index.html` 时，浏览器可能拦截 `fetch`。页面支持“本地上传 JSON”：

1. 点击“选择文件”，选中 `demo/real_macro_data.json`
2. 点击“加载本地 real_macro_data.json”

## 已包含文档

- `docs/宏观周期与资产配置网站实施方案.md`（含对标 briefing 页的产品化方法）
