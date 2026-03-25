#!/usr/bin/env python3

import json
import re
import subprocess
import tempfile
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "photo-catalog.js"

LABEL_TAGS = {
    "outdoor": ("户外", 0.8),
    "blue_sky": ("蓝天", 1.2),
    "sky": ("天空", 0.5),
    "night_sky": ("夜景", 1.5),
    "plant": ("绿植", 1.1),
    "foliage": ("树叶", 1.0),
    "branch": ("枝叶", 0.9),
    "tree": ("树木", 1.1),
    "maple_tree": ("树木", 1.2),
    "flower": ("花卉", 1.4),
    "blossom": ("花卉", 1.4),
    "tulip": ("郁金香", 2.2),
    "grass": ("草地", 1.0),
    "shrub": ("灌木", 0.9),
    "road": ("道路", 1.0),
    "street": ("街景", 1.2),
    "sidewalk": ("步道", 1.0),
    "path": ("步道", 0.9),
    "building": ("建筑", 1.2),
    "structure": ("建筑", 0.8),
    "skyscraper": ("高楼", 1.8),
    "cityscape": ("城市", 1.6),
    "portal": ("门窗", 1.0),
    "window": ("窗景", 1.0),
    "arch": ("拱门", 1.2),
    "door": ("门洞", 0.9),
    "brick": ("砖墙", 1.0),
    "fence": ("围栏", 0.9),
    "roof": ("屋檐", 1.0),
    "balcony": ("阳台", 1.0),
    "people": ("人物", 1.2),
    "adult": ("人物", 0.8),
    "crowd": ("人群", 1.4),
    "lake": ("湖景", 1.4),
    "liquid": ("水景", 1.0),
    "water": ("水景", 1.3),
    "water_body": ("水景", 1.4),
    "ocean": ("海边", 1.8),
    "shore": ("海边", 1.4),
    "rocks": ("岩石", 1.2),
    "cliff": ("山石", 1.4),
    "hill": ("山景", 1.6),
    "bridge": ("桥", 1.2),
    "statue": ("雕塑", 1.3),
    "art": ("艺术装置", 1.0),
    "sport": ("运动", 1.2),
    "ballgames": ("球赛", 1.1),
    "tennis": ("网球", 2.2),
    "stadium": ("场馆", 1.2),
    "arena": ("场馆", 1.2),
    "sports_equipment": ("球拍", 1.2),
    "racquet": ("球拍", 1.5),
    "fireworks": ("烟花", 2.4),
    "pyrotechnics": ("烟花", 2.1),
    "fire": ("烟花", 1.4),
    "sunset_sunrise": ("日落", 1.5),
    "cloudy": ("多云", 0.7),
    "stairs": ("台阶", 0.9),
    "interior_room": ("室内", 1.0),
    "animal": ("动物", 1.0),
    "recreation": ("比赛", 1.0),
}

ALBUM_RULES = [
    (("五四大街",), ["胡同", "街景"]),
    (("南锣鼓巷",), ["胡同", "街景"]),
    (("北京师范大学", "校区"), ["校园"]),
    (("国贸观景台",), ["城市夜景", "高楼"]),
    (("天安门",), ["地标建筑", "城楼"]),
    (("云冈石窟",), ["石窟", "雕塑"]),
    (("大宁公园",), ["公园", "花卉"]),
    (("彭浦新村",), ["街区", "花卉"]),
    (("秋霞圃",), ["园林", "树木"]),
    (("网球中心", "旗忠"), ["网球", "比赛"]),
    (("演唱会", "Gloria"), ["演唱会", "舞台"]),
    (("东海塘",), ["海边", "堤岸"]),
    (("仙都",), ["山景", "水景"]),
    (("十里长街",), ["古镇", "街景"]),
    (("鲁迅故里",), ["故居", "街景"]),
    (("柯岩",), ["石景", "水景"]),
    (("大青山",), ["山景", "海边"]),
    (("老外滩",), ["江景", "城市夜景"]),
    (("天一广场",), ["广场", "城市"]),
    (("沙滩",), ["沙滩", "海边", "日落"]),
    (("东辉阁",), ["古建", "地标建筑"]),
    (("新昌",), ["山城", "街景"]),
    (("大佛寺",), ["寺庙", "古建", "雕塑"]),
    (("花溪村",), ["乡村", "山景", "自然"]),
    (("世纪广场",), ["广场", "城市", "夜景"]),
    (("广州",), ["城市", "街景", "高楼"]),
    (("成都",), ["城市", "街景", "夜景"]),
]

TAG_PRIORITY = {
    tag: index
    for index, tag in enumerate(
        [
            "郁金香",
            "烟花",
            "网球",
            "演唱会",
            "城市夜景",
            "地标建筑",
            "石窟",
            "寺庙",
            "古建",
            "故居",
            "古镇",
            "公园",
            "园林",
            "花卉",
            "海边",
            "沙滩",
            "江景",
            "湖景",
            "水景",
            "山景",
            "山石",
            "岩石",
            "高楼",
            "城市",
            "广场",
            "街景",
            "胡同",
            "校园",
            "乡村",
            "网球",
            "比赛",
            "球拍",
            "舞台",
            "人群",
            "人物",
            "雕塑",
            "艺术装置",
            "建筑",
            "门窗",
            "窗景",
            "拱门",
            "砖墙",
            "屋檐",
            "阳台",
            "围栏",
            "桥",
            "绿植",
            "树木",
            "树叶",
            "枝叶",
            "草地",
            "蓝天",
            "夜景",
            "日落",
            "道路",
            "步道",
            "户外",
            "天空",
        ]
    )
}


def load_catalog():
    script_lines = [
        'ObjC.import("Foundation");',
        f'const path = "{DATA_PATH}";',
        "const text = $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null).js;",
        "const window = {};",
        "eval(text);",
        "console.log(JSON.stringify(window.photoCatalog));",
    ]
    args = ["osascript", "-l", "JavaScript"]
    for line in script_lines:
        args.extend(["-e", line])
    result = subprocess.run(args, capture_output=True, text=True, check=True)
    payload = result.stdout.strip() or result.stderr.strip()
    return json.loads(payload)


def get_album_seed_tags(album):
    haystack = " ".join(
        [
            album.get("id", ""),
            album.get("title", ""),
            album.get("location", ""),
        ]
    )
    tags = []
    for needles, values in ALBUM_RULES:
        if any(needle in haystack for needle in needles):
            tags.extend(values)
    return dedupe(tags)


def dedupe(values):
    seen = set()
    result = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def collect_photo_paths(catalog):
    paths = []
    for albums in catalog.values():
        for album in albums:
            for photo in album.get("photos", []):
                src = photo.get("src", "")
                if src.endswith(".svg"):
                    continue
                paths.append(src)
    return dedupe(paths)


def classify_photos(photo_sources):
    swift_source = """
import Foundation
import Vision
import CoreGraphics
import ImageIO

let listPath = CommandLine.arguments[1]
let list = (try? String(contentsOfFile: listPath, encoding: .utf8)) ?? ""
for rawLine in list.split(separator: "\\n") {
    let path = String(rawLine)
    let url = URL(fileURLWithPath: path)
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
        continue
    }
    let request = VNClassifyImageRequest()
    let handler = VNImageRequestHandler(cgImage: image, options: [:])
    do {
        try handler.perform([request])
        let items = (request.results ?? []).prefix(12).map {
            "\\($0.identifier):\\(String(format: "%.3f", $0.confidence))"
        }.joined(separator: ",")
        print("\\(path)\\t\\(items)")
    } catch {
        continue
    }
}
""".strip()

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        swift_path = tmp_path / "classify.swift"
        list_path = tmp_path / "paths.txt"
        swift_path.write_text(swift_source)
        list_path.write_text(
            "\n".join(str(ROOT / src[2:]) for src in photo_sources),
            encoding="utf-8",
        )
        result = subprocess.run(
            ["swift", str(swift_path), str(list_path)],
            capture_output=True,
            text=True,
            check=True,
        )

    parsed = {}
    for line in result.stdout.splitlines():
        if "\t" not in line:
            continue
        path, raw_items = line.split("\t", 1)
        src = f"./{Path(path).relative_to(ROOT).as_posix()}"
        labels = []
        for item in raw_items.split(","):
            if ":" not in item:
                continue
            label, score = item.split(":", 1)
            labels.append((label, float(score)))
        parsed[src] = labels
    return parsed


def score_candidates(album, labels):
    seed_tags = get_album_seed_tags(album)
    scored = Counter()
    label_scores = {label: score for label, score in labels}

    for label, score in labels:
        if label not in LABEL_TAGS:
            continue
        tag, weight = LABEL_TAGS[label]
        threshold = 0.28 if weight >= 1.4 else 0.4
        if score >= threshold:
            scored[tag] += score * weight

    if label_scores.get("night_sky", 0) >= 0.45 and (
        label_scores.get("building", 0) >= 0.28
        or label_scores.get("cityscape", 0) >= 0.28
        or label_scores.get("skyscraper", 0) >= 0.28
    ):
        scored["城市夜景"] += 2.8

    if label_scores.get("tennis", 0) >= 0.35:
        scored["网球"] += 3.0

    if label_scores.get("fireworks", 0) >= 0.35 or label_scores.get("pyrotechnics", 0) >= 0.35:
        scored["烟花"] += 3.0

    if label_scores.get("tulip", 0) >= 0.25:
        scored["郁金香"] += 3.0
        scored["花卉"] += 1.6

    if (
        label_scores.get("water", 0) >= 0.35 or label_scores.get("water_body", 0) >= 0.35
    ) and label_scores.get("hill", 0) >= 0.28:
        scored["山水"] += 2.4

    if (
        label_scores.get("ocean", 0) >= 0.28
        or label_scores.get("shore", 0) >= 0.28
        or (
            label_scores.get("water", 0) >= 0.4 and label_scores.get("rocks", 0) >= 0.28
        )
    ):
        scored["海边"] += 2.4

    if label_scores.get("people", 0) >= 0.45 and label_scores.get("crowd", 0) >= 0.35:
        scored["人群"] += 2.2

    for index, tag in enumerate(seed_tags):
        scored[tag] += 1.8 - (index * 0.12)

    return scored


def finalize_photo_tags(album, labels):
    scored = score_candidates(album, labels)
    ranked = sorted(
        scored.items(),
        key=lambda item: (-item[1], TAG_PRIORITY.get(item[0], 999), item[0]),
    )
    tags = []
    for tag, _ in ranked:
        if tag == "天空":
            continue
        if tag == "户外" and len(tags) >= 3:
            continue
        if tag == "人物" and "人群" in tags:
            continue
        if tag == "建筑" and any(item in tags for item in ("高楼", "古建", "地标建筑", "寺庙", "故居")):
            continue
        if tag == "绿植" and any(item in tags for item in ("花卉", "树木", "树叶")):
            continue
        tags.append(tag)
        if len(tags) == 4:
            break

    if not tags:
        tags = get_album_seed_tags(album)[:4] or ["街景"]

    return tags


def rebuild_album(album, photo_labels):
    seed_tags = get_album_seed_tags(album)
    photos = []
    counts = Counter()

    for photo in album.get("photos", []):
        src = photo.get("src", "")
        next_photo = dict(photo)
        if not src.endswith(".svg"):
            tags = finalize_photo_tags(album, photo_labels.get(src, []))
            next_photo["tags"] = tags
            counts.update(tags)
        photos.append(reorder_photo(next_photo))

    group_tags = dedupe(seed_tags + [tag for tag, _ in counts.most_common(8)])
    if "山水" in group_tags:
        group_tags = ["山景" if tag == "山水" else tag for tag in group_tags]
        group_tags = dedupe(group_tags)

    next_album = {}
    inserted_group_tags = False
    for key, value in album.items():
        if key == "groupTags":
            continue
        if key == "photos":
            next_album["groupTags"] = group_tags[:5]
            inserted_group_tags = True
            next_album["photos"] = photos
            continue
        next_album[key] = value
        if key == "lens" and "photos" not in album:
            next_album["groupTags"] = group_tags[:5]
            inserted_group_tags = True
    if not inserted_group_tags and photos:
        next_album["groupTags"] = group_tags[:5]
    if "photos" not in next_album and "photos" in album:
        next_album["photos"] = photos
    return next_album


def reorder_photo(photo):
    ordered = {}
    for key in ("src", "tags", "title", "meta", "description", "location", "shotOn", "camera", "lens"):
        if key in photo:
            ordered[key] = photo[key]
    for key, value in photo.items():
        if key not in ordered:
            ordered[key] = value
    return ordered


def format_value(value, indent=0):
    space = " " * indent
    if isinstance(value, dict):
        if not value:
            return "{}"
        lines = ["{"]
        items = list(value.items())
        for index, (key, item) in enumerate(items):
            key_repr = key if re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", key) else json.dumps(key, ensure_ascii=False)
            suffix = "," if index < len(items) - 1 else ""
            lines.append(f"{space}  {key_repr}: {format_value(item, indent + 2)}{suffix}")
        lines.append(f"{space}}}")
        return "\n".join(lines)
    if isinstance(value, list):
        if not value:
            return "[]"
        if all(not isinstance(item, (dict, list)) for item in value):
            return "[" + ", ".join(json.dumps(item, ensure_ascii=False) for item in value) + "]"
        lines = ["["]
        for index, item in enumerate(value):
            suffix = "," if index < len(value) - 1 else ""
            lines.append(f"{space}  {format_value(item, indent + 2)}{suffix}")
        lines.append(f"{space}]")
        return "\n".join(lines)
    return json.dumps(value, ensure_ascii=False)


def main():
    catalog = load_catalog()
    photo_sources = collect_photo_paths(catalog)
    photo_labels = classify_photos(photo_sources)
    rebuilt = {}
    for adcode, albums in catalog.items():
        rebuilt[adcode] = [rebuild_album(album, photo_labels) for album in albums]

    output = "window.photoCatalog = " + format_value(rebuilt, 0) + ";\n"
    DATA_PATH.write_text(output, encoding="utf-8")


if __name__ == "__main__":
    main()
