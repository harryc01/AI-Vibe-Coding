#!/usr/bin/env python3
import argparse
import importlib
import importlib.util
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass
class MacroPoint:
    month: str
    pmi: float
    cpi: float
    tsf: float


def month_key(value):
    return datetime.strptime(value, "%Y-%m")


def zscore(seq):
    mean_val = sum(seq) / len(seq)
    var = sum((x - mean_val) ** 2 for x in seq) / len(seq)
    std = var ** 0.5 if var > 0 else 1.0
    return [(x - mean_val) / std for x in seq]


def build_regime_data(points):
    pmi_series = [p.pmi for p in points]
    cpi_series = [p.cpi for p in points]
    tsf_series = [p.tsf for p in points]

    growth_z = zscore(pmi_series)
    inflation_z = zscore(cpi_series)
    liquidity_z = zscore(tsf_series)

    result = []
    for i, p in enumerate(points):
        g = growth_z[i]
        inf = inflation_z[i]
        liq = liquidity_z[i]

        if g >= 0 and inf < 0:
            regime = "复苏"
            allocation = {"权益": 0.35, "利率债": 0.2, "信用债": 0.2, "商品": 0.15, "黄金": 0.1}
        elif g >= 0 and inf >= 0:
            regime = "过热"
            allocation = {"权益": 0.3, "利率债": 0.15, "信用债": 0.2, "商品": 0.25, "黄金": 0.1}
        elif g < 0 and inf >= 0:
            regime = "滞胀"
            allocation = {"权益": 0.15, "利率债": 0.2, "信用债": 0.15, "商品": 0.2, "黄金": 0.3}
        else:
            regime = "衰退"
            allocation = {"权益": 0.15, "利率债": 0.4, "信用债": 0.2, "商品": 0.05, "黄金": 0.2}

        confidence = max(0.55, min(0.9, 0.7 + abs(g) * 0.08 + abs(inf) * 0.07))

        result.append(
            {
                "month": p.month,
                "growth": round(g, 3),
                "inflation": round(inf, 3),
                "liquidity": round(liq, 3),
                "confidence": round(confidence, 3),
                "regime": regime,
                "summary": f"PMI={p.pmi:.1f}、CPI同比={p.cpi:.2f}%、社融同比={p.tsf:.2f}%，模型判断为{regime}。",
                "indicators": {"PMI": round(p.pmi, 2), "CPI": round(p.cpi, 2), "TSF": round(p.tsf, 2)},
                "allocation": allocation,
            }
        )

    return {"macroData": result, "assetNames": ["权益", "利率债", "信用债", "商品", "黄金"]}


def has_module(name):
    return importlib.util.find_spec(name) is not None


def fetch_from_wind(months):
    if not has_module("WindPy"):
        raise RuntimeError("WindPy 未安装，请先在本机安装 Wind 终端 Python API。")

    windpy = importlib.import_module("WindPy")
    w = windpy.w
    w.start()

    end = datetime.today().strftime("%Y-%m-%d")
    # 可按你账号权限替换成可用宏观指标代码
    pmi_code = "M0017126"
    cpi_code = "M0000612"
    tsf_code = "M0001385"

    pmi = w.edb(pmi_code, f"ED-{months}M", end, "Fill=Previous")
    cpi = w.edb(cpi_code, f"ED-{months}M", end, "Fill=Previous")
    tsf = w.edb(tsf_code, f"ED-{months}M", end, "Fill=Previous")

    if pmi.ErrorCode != 0 or cpi.ErrorCode != 0 or tsf.ErrorCode != 0:
        raise RuntimeError(f"Wind EDB 请求失败: PMI={pmi.ErrorCode}, CPI={cpi.ErrorCode}, TSF={tsf.ErrorCode}")

    mapped = {}
    for idx, dt in enumerate(pmi.Times):
        key = dt.strftime("%Y-%m")
        mapped.setdefault(key, {})["pmi"] = float(pmi.Data[0][idx])
    for idx, dt in enumerate(cpi.Times):
        key = dt.strftime("%Y-%m")
        mapped.setdefault(key, {})["cpi"] = float(cpi.Data[0][idx])
    for idx, dt in enumerate(tsf.Times):
        key = dt.strftime("%Y-%m")
        mapped.setdefault(key, {})["tsf"] = float(tsf.Data[0][idx])

    points = []
    for month in sorted(mapped.keys(), key=month_key):
        row = mapped[month]
        if {"pmi", "cpi", "tsf"}.issubset(row):
            points.append(MacroPoint(month=month, pmi=row["pmi"], cpi=row["cpi"], tsf=row["tsf"]))

    if len(points) < 6:
        raise RuntimeError("Wind 返回的数据不足 6 个月，无法稳定生成周期信号。")

    return points


def fetch_from_ifind(months):
    if not has_module("iFinDPy"):
        raise RuntimeError("iFinDPy 未安装，请先安装同花顺 iFinD Python API。")

    ifind = importlib.import_module("iFinDPy")
    username = ""
    password = ""
    login = ifind.THS_iFinDLogin(username, password)
    if login != 0:
        raise RuntimeError("同花顺 iFinD 登录失败，请在脚本中填写账号密码或改为 token 登录。")

    end = datetime.today().strftime("%Y-%m-%d")
    start = (datetime.today().replace(day=1)).strftime("%Y-%m-01")

    # 这里使用 EDB 示例代码，需按你的权限替换
    pmi_df = ifind.THS_EDB("M0017126", "", f"{start},{end}")
    cpi_df = ifind.THS_EDB("M0000612", "", f"{start},{end}")
    tsf_df = ifind.THS_EDB("M0001385", "", f"{start},{end}")

    if getattr(pmi_df, "errorcode", 0) != 0 or getattr(cpi_df, "errorcode", 0) != 0 or getattr(tsf_df, "errorcode", 0) != 0:
        raise RuntimeError("同花顺 EDB 请求失败，请检查指标代码和权限。")

    merged = {}
    for _, row in pmi_df.data.iterrows():
        key = row["time"][:7]
        merged.setdefault(key, {})["pmi"] = float(row["value"])
    for _, row in cpi_df.data.iterrows():
        key = row["time"][:7]
        merged.setdefault(key, {})["cpi"] = float(row["value"])
    for _, row in tsf_df.data.iterrows():
        key = row["time"][:7]
        merged.setdefault(key, {})["tsf"] = float(row["value"])

    points = []
    for month in sorted(merged.keys(), key=month_key)[-months:]:
        row = merged[month]
        if {"pmi", "cpi", "tsf"}.issubset(row):
            points.append(MacroPoint(month=month, pmi=row["pmi"], cpi=row["cpi"], tsf=row["tsf"]))

    if len(points) < 6:
        raise RuntimeError("同花顺返回的数据不足 6 个月，无法稳定生成周期信号。")

    return points


def main():
    parser = argparse.ArgumentParser(description="拉取 Wind/同花顺真实数据并生成前端可读 JSON")
    parser.add_argument("--provider", choices=["wind", "ifind"], required=True)
    parser.add_argument("--months", type=int, default=24)
    parser.add_argument("--output", default="demo/real_macro_data.json")
    args = parser.parse_args()

    if args.provider == "wind":
        points = fetch_from_wind(args.months)
    else:
        points = fetch_from_ifind(args.months)

    payload = build_regime_data(points)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"已生成真实数据文件: {out}")


if __name__ == "__main__":
    main()
