from __future__ import annotations

import json
import math
import os
import re
import socket
import struct
import subprocess
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Literal


CREALITY_APP = Path("/Applications/Creality Print.app")
CREALITY_BINARY = CREALITY_APP / "Contents/MacOS/CrealityPrint"
DEFAULT_DATA_DIR = (
    Path.home()
    / "Library/Application Support/Creality/Creality Print/6.0"
)
DEFAULT_OUTPUT_DIR = Path.home() / "Documents/CrealityMCP"
FUSION_HOST = "127.0.0.1"
FUSION_PORT = 9876

PROFILE_KINDS = ("machine", "process", "filament")
SUPPORT_MODES = ("auto", "on", "off")


class CrealityMCPError(RuntimeError):
    pass


@dataclass(frozen=True)
class ActiveProfiles:
    machine: str
    process: str
    filament: str


@dataclass(frozen=True)
class SliceStats:
    filament_weight_g: float | None = None
    filament_length_mm: float | None = None
    estimated_time_seconds: int | None = None
    estimated_time_text: str | None = None
    filament_cost: float | None = None


def _load_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise CrealityMCPError(f"Cannot read JSON {path}: {exc}") from exc


def read_active_profiles(data_dir: Path = DEFAULT_DATA_DIR) -> ActiveProfiles:
    config = _load_json(data_dir / "Creality.conf")
    presets = config.get("presets") or {}
    filaments = presets.get("filaments") or []
    if not isinstance(filaments, list):
        filaments = [filaments]
    return ActiveProfiles(
        machine=str(presets.get("machine") or ""),
        process=str(presets.get("process") or ""),
        filament=str(filaments[0] if filaments else ""),
    )


def _profile_dirs(data_dir: Path, kind: str) -> list[Path]:
    if kind not in PROFILE_KINDS:
        raise CrealityMCPError(f"Unknown profile kind: {kind}")
    return [
        data_dir / "user/default" / kind,
        data_dir / "system/Creality" / kind,
        CREALITY_APP / "Contents/Resources/profiles/Creality" / kind,
    ]


def list_profiles(
    kind: Literal["machine", "process", "filament"],
    query: str = "",
    data_dir: Path = DEFAULT_DATA_DIR,
    limit: int = 100,
) -> list[dict[str, str]]:
    needle = query.casefold().strip()
    found: dict[str, dict[str, str]] = {}
    for directory in _profile_dirs(data_dir, kind):
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob("*.json")):
            name = path.stem
            if needle and needle not in name.casefold():
                continue
            found.setdefault(
                name.casefold(),
                {"name": name, "path": str(path), "source": directory.parts[-3]},
            )
    return list(found.values())[: max(1, min(limit, 500))]


def resolve_profile(
    kind: Literal["machine", "process", "filament"],
    name_or_path: str,
    data_dir: Path = DEFAULT_DATA_DIR,
) -> Path:
    candidate = Path(name_or_path).expanduser()
    if candidate.is_file():
        return candidate.resolve()

    wanted = name_or_path.removesuffix(".json").casefold()
    exact = [p for p in list_profiles(kind, data_dir=data_dir, limit=5000) if p["name"].casefold() == wanted]
    if exact:
        return Path(exact[0]["path"])

    matches = list_profiles(kind, query=name_or_path, data_dir=data_dir, limit=20)
    if len(matches) == 1:
        return Path(matches[0]["path"])
    if not matches:
        raise CrealityMCPError(f"No {kind} profile matches {name_or_path!r}")
    names = ", ".join(item["name"] for item in matches[:10])
    raise CrealityMCPError(f"Ambiguous {kind} profile {name_or_path!r}: {names}")


def fusion_request(
    command_type: str,
    params: dict[str, Any] | None = None,
    host: str = FUSION_HOST,
    port: int = FUSION_PORT,
) -> dict[str, Any]:
    payload = json.dumps({"type": command_type, "params": params or {}}) + "\n"
    try:
        with socket.create_connection((host, port), timeout=5) as sock:
            sock.settimeout(45)
            sock.sendall(payload.encode("utf-8"))
            data = b""
            while b"\n" not in data:
                chunk = sock.recv(65536)
                if not chunk:
                    break
                data += chunk
    except OSError as exc:
        raise CrealityMCPError(
            f"Cannot connect to Fusion add-in at {host}:{port}: {exc}"
        ) from exc

    if not data:
        raise CrealityMCPError("Fusion add-in closed the connection without a response")
    response = json.loads(data.split(b"\n", 1)[0])
    if response.get("status") != "success":
        raise CrealityMCPError(str(response.get("message") or response))
    result = response.get("result") or {}
    if result.get("ok") is False:
        raise CrealityMCPError(str(result.get("error_message") or result))
    return result


def export_fusion_body(
    body_name: str,
    output_dir: Path,
    host: str = FUSION_HOST,
    port: int = FUSION_PORT,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^\w.-]+", "_", body_name, flags=re.UNICODE).strip("._")
    if not safe_name:
        safe_name = "fusion_model"
    path = (output_dir / f"{safe_name}.stl").resolve()
    result = fusion_request(
        "export_stl",
        {"body_name": body_name, "file_path": str(path)},
        host,
        port,
    )
    exported = Path(result.get("file_path") or path)
    if not exported.is_file() or exported.stat().st_size == 0:
        raise CrealityMCPError(f"Fusion reported an export but no STL exists at {exported}")
    return exported


def _duration_to_seconds(value: str) -> int | None:
    total = 0
    matched = False
    for amount, unit in re.findall(r"(\d+(?:\.\d+)?)\s*([dhms])", value.casefold()):
        matched = True
        multiplier = {"d": 86400, "h": 3600, "m": 60, "s": 1}[unit]
        total += round(float(amount) * multiplier)
    return total if matched else None


def parse_gcode_stats(path: Path) -> SliceStats:
    text = path.read_text(encoding="utf-8", errors="replace")
    weight = _first_float(
        text,
        r"total filament weight \[g\]\s*=\s*([\d.]+)",
        r"filament used \[g\]\s*=\s*([\d.]+)",
        r"filament_weight_total\s*=\s*([\d.]+)",
    )
    length = _first_float(
        text,
        r"total filament length \[mm\]\s*=\s*([\d.]+)",
        r"filament used \[mm\]\s*=\s*([\d.]+)",
        r"filament_used_mm\s*=\s*([\d.]+)",
    )
    cost = _first_float(
        text,
        r"total filament cost\s*=\s*([\d.]+)",
        r"filament cost\s*=\s*([\d.]+)",
    )
    time_match = re.search(
        r"(?:total estimated time|estimated printing time \(normal mode\)|model printing time)\s*=\s*([^\r\n;]+)",
        text,
        flags=re.IGNORECASE,
    )
    time_text = time_match.group(1).strip() if time_match else None
    return SliceStats(
        filament_weight_g=weight,
        filament_length_mm=length,
        estimated_time_seconds=_duration_to_seconds(time_text) if time_text else None,
        estimated_time_text=time_text,
        filament_cost=cost,
    )


def _first_float(text: str, *patterns: str) -> float | None:
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return float(match.group(1))
    return None


def build_override_settings(
    *,
    support_mode: Literal["auto", "on", "off"] = "auto",
    layer_height_mm: float | None = None,
    infill_percent: float | None = None,
    wall_loops: int | None = None,
    support_threshold_deg: float = 30,
) -> dict[str, str]:
    if support_mode not in SUPPORT_MODES:
        raise CrealityMCPError(f"support_mode must be one of {SUPPORT_MODES}")
    if layer_height_mm is not None and not 0.04 <= layer_height_mm <= 1.0:
        raise CrealityMCPError("layer_height_mm must be between 0.04 and 1.0")
    if infill_percent is not None and not 0 <= infill_percent <= 100:
        raise CrealityMCPError("infill_percent must be between 0 and 100")
    if wall_loops is not None and not 1 <= wall_loops <= 20:
        raise CrealityMCPError("wall_loops must be between 1 and 20")
    if not 0 <= support_threshold_deg <= 90:
        raise CrealityMCPError("support_threshold_deg must be between 0 and 90")

    settings = {
        "type": "process",
        "name": "Codex MCP overrides",
        "from": "User",
        "enable_support": "0" if support_mode == "off" else "1",
        "support_type": "normal(auto)",
        "support_style": "default",
        "support_threshold_angle": f"{support_threshold_deg:g}",
    }
    if layer_height_mm is not None:
        settings["layer_height"] = f"{layer_height_mm:g}"
    if infill_percent is not None:
        settings["sparse_infill_density"] = f"{infill_percent:g}%"
    if wall_loops is not None:
        settings["wall_loops"] = str(wall_loops)
    return settings


def _ensure_profile_type(path: Path, kind: str, temporary_paths: list[Path]) -> Path:
    """Creality GUI accepts user overrides without `type`; its CLI does not."""
    profile = _load_json(path)
    if profile.get("type") == kind:
        return path
    profile["type"] = kind
    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=f".{kind}.json",
        prefix="creality_mcp_profile_",
        delete=False,
        encoding="utf-8",
    ) as temp:
        json.dump(profile, temp, ensure_ascii=False, indent=2)
        normalized = Path(temp.name)
    temporary_paths.append(normalized)
    return normalized


def _materialize_profile(
    path: Path,
    kind: str,
    data_dir: Path,
    seen: set[str] | None = None,
) -> dict[str, Any]:
    """Flatten Creality's named inheritance so temporary CLI profiles stay valid."""
    seen = seen or set()
    profile = _load_json(path)
    parent_name = str(profile.get("inherits") or "").strip()
    if not parent_name:
        profile["type"] = kind
        return profile
    parent_key = parent_name.casefold()
    if parent_key in seen:
        raise CrealityMCPError(f"Profile inheritance cycle at {parent_name!r}")
    seen.add(parent_key)
    parent_path = resolve_profile(kind, parent_name, data_dir)
    merged = _materialize_profile(parent_path, kind, data_dir, seen)
    merged.update(profile)
    merged.pop("inherits", None)
    merged["type"] = kind
    return merged


def _write_temporary_profile(
    profile: dict[str, Any],
    kind: str,
    temporary_paths: list[Path],
) -> Path:
    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=f".{kind}.json",
        prefix="creality_mcp_profile_",
        delete=False,
        encoding="utf-8",
    ) as temp:
        json.dump(profile, temp, ensure_ascii=False, indent=2)
        path = Path(temp.name)
    temporary_paths.append(path)
    return path


def _rotation_matrix(rx_deg: float, ry_deg: float, rz_deg: float) -> tuple[tuple[float, ...], ...]:
    rx, ry, rz = (math.radians(value) for value in (rx_deg, ry_deg, rz_deg))
    sx, cx = math.sin(rx), math.cos(rx)
    sy, cy = math.sin(ry), math.cos(ry)
    sz, cz = math.sin(rz), math.cos(rz)
    return (
        (cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx),
        (sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx),
        (-sy, cy * sx, cy * cx),
    )


def _transform_point(
    point: tuple[float, float, float], matrix: tuple[tuple[float, ...], ...]
) -> tuple[float, float, float]:
    x, y, z = point
    return tuple(row[0] * x + row[1] * y + row[2] * z for row in matrix)  # type: ignore[return-value]


def rotate_binary_stl(
    source: Path,
    destination: Path,
    rx_deg: float = 0,
    ry_deg: float = 0,
    rz_deg: float = 0,
    center_xy: tuple[float, float] | None = None,
) -> None:
    """Rotate a binary STL, lift it to Z=0, and optionally center it on the bed."""
    data = source.read_bytes()
    if len(data) < 84:
        raise CrealityMCPError(f"STL is too small: {source}")
    triangle_count = struct.unpack_from("<I", data, 80)[0]
    if 84 + triangle_count * 50 != len(data):
        raise CrealityMCPError("Manual rotation currently requires a binary STL")

    matrix = _rotation_matrix(rx_deg, ry_deg, rz_deg)
    triangles: list[tuple[list[tuple[float, float, float]], int]] = []
    min_z = float("inf")
    min_x = min_y = float("inf")
    max_x = max_y = float("-inf")
    offset = 84
    for _ in range(triangle_count):
        values = struct.unpack_from("<12f", data, offset)
        attribute = struct.unpack_from("<H", data, offset + 48)[0]
        vectors = [
            _transform_point(tuple(values[index : index + 3]), matrix)
            for index in (0, 3, 6, 9)
        ]
        min_z = min(min_z, *(point[2] for point in vectors[1:]))
        min_x = min(min_x, *(point[0] for point in vectors[1:]))
        max_x = max(max_x, *(point[0] for point in vectors[1:]))
        min_y = min(min_y, *(point[1] for point in vectors[1:]))
        max_y = max(max_y, *(point[1] for point in vectors[1:]))
        triangles.append((vectors, attribute))
        offset += 50

    shift_x = shift_y = 0.0
    if center_xy is not None:
        shift_x = center_xy[0] - (min_x + max_x) / 2
        shift_y = center_xy[1] - (min_y + max_y) / 2

    output = bytearray(data[:84])
    for vectors, attribute in triangles:
        shifted = [
            vectors[0],
            *((x + shift_x, y + shift_y, z - min_z) for x, y, z in vectors[1:]),
        ]
        output.extend(struct.pack("<12f", *(value for vector in shifted for value in vector)))
        output.extend(struct.pack("<H", attribute))
    destination.write_bytes(output)


def _printable_area_center(machine_profile: dict[str, Any]) -> tuple[float, float] | None:
    """Return the bounding-box center of a Creality printable_area polygon."""
    points = re.findall(
        r"(-?\d+(?:\.\d+)?)x(-?\d+(?:\.\d+)?)",
        str(machine_profile.get("printable_area") or ""),
    )
    if not points:
        return None
    xs = [float(x) for x, _ in points]
    ys = [float(y) for _, y in points]
    return ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)


def slice_model(
    model_path: Path,
    *,
    machine_profile: str,
    process_profile: str,
    filament_profile: str,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    data_dir: Path = DEFAULT_DATA_DIR,
    support_mode: Literal["auto", "on", "off"] = "auto",
    orient: bool = True,
    arrange: bool = True,
    layer_height_mm: float | None = None,
    infill_percent: float | None = None,
    wall_loops: int | None = None,
    support_threshold_deg: float = 30,
    copies: int = 1,
    rotate_x_deg: float = 0,
    rotate_y_deg: float = 0,
    rotate_z_deg: float = 0,
    timeout_seconds: int = 600,
) -> dict[str, Any]:
    model_path = model_path.expanduser().resolve()
    if not model_path.is_file():
        raise CrealityMCPError(f"Model does not exist: {model_path}")
    if model_path.suffix.casefold() not in {".stl", ".3mf", ".obj", ".step", ".stp"}:
        raise CrealityMCPError(f"Unsupported model format: {model_path.suffix}")
    if not 1 <= copies <= 100:
        raise CrealityMCPError("copies must be between 1 and 100")
    if not CREALITY_BINARY.is_file():
        raise CrealityMCPError(f"Creality Print CLI not found: {CREALITY_BINARY}")

    output_dir = output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    machine = resolve_profile("machine", machine_profile, data_dir)
    process = resolve_profile("process", process_profile, data_dir)
    filament = resolve_profile("filament", filament_profile, data_dir)
    profile_names = {
        "machine": str(_load_json(machine).get("name") or machine.stem),
        "process": str(_load_json(process).get("name") or process.stem),
        "filament": str(_load_json(filament).get("name") or filament.stem),
    }
    temporary_paths: list[Path] = []
    merged_machine = _materialize_profile(machine, "machine", data_dir)
    machine = _write_temporary_profile(
        merged_machine,
        "machine",
        temporary_paths,
    )
    filament = _write_temporary_profile(
        _materialize_profile(filament, "filament", data_dir),
        "filament",
        temporary_paths,
    )
    override = build_override_settings(
        support_mode=support_mode,
        layer_height_mm=layer_height_mm,
        infill_percent=infill_percent,
        wall_loops=wall_loops,
        support_threshold_deg=support_threshold_deg,
    )

    merged_process = _materialize_profile(process, "process", data_dir)
    merged_process.update(override)
    merged_process["type"] = "process"
    merged_process["name"] = f"{profile_names['process']} + Codex overrides"
    process = _write_temporary_profile(merged_process, "process", temporary_paths)

    model_for_slice = model_path
    use_manual_stl_rotation = model_path.suffix.casefold() == ".stl" and any(
        (rotate_x_deg, rotate_y_deg, rotate_z_deg)
    )
    if use_manual_stl_rotation:
        rotated_file = tempfile.NamedTemporaryFile(
            suffix=f"_{model_path.name}",
            prefix="creality_mcp_rotated_",
            delete=False,
        )
        rotated_file.close()
        model_for_slice = Path(rotated_file.name)
        rotate_binary_stl(
            model_path,
            model_for_slice,
            rotate_x_deg,
            rotate_y_deg,
            rotate_z_deg,
            center_xy=_printable_area_center(merged_machine) if not arrange else None,
        )
        temporary_paths.append(model_for_slice)

    command = [
        str(CREALITY_BINARY),
        "--datadir", str(data_dir),
        "--load-settings", ";".join(map(str, (machine, process))),
        "--load-filaments", str(filament),
        "--orient", "1" if orient else "0",
        "--arrange", "1" if arrange else "0",
        "--ensure-on-bed",
        "--repetitions", str(copies),
    ]
    if rotate_x_deg and not use_manual_stl_rotation:
        command.extend(("--rotate-x", f"{rotate_x_deg:g}"))
    if rotate_y_deg and not use_manual_stl_rotation:
        command.extend(("--rotate-y", f"{rotate_y_deg:g}"))
    if rotate_z_deg and not use_manual_stl_rotation:
        command.extend(("--rotate", f"{rotate_z_deg:g}"))
    command.extend(("--slice", "0", "--outputdir", str(output_dir), str(model_for_slice)))

    before = {
        path.resolve(): path.stat().st_mtime_ns
        for path in output_dir.glob("*.gcode")
    }
    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise CrealityMCPError(f"Creality Print timed out after {timeout_seconds}s") from exc
    finally:
        for temporary_path in temporary_paths:
            temporary_path.unlink(missing_ok=True)

    combined_log = "\n".join(part for part in (completed.stdout, completed.stderr) if part)
    candidates = sorted(
        (
            path
            for path in output_dir.glob("*.gcode")
            if path.resolve() not in before
            or path.stat().st_mtime_ns != before[path.resolve()]
        ),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    if completed.returncode != 0 or not candidates:
        tail = combined_log[-8000:]
        raise CrealityMCPError(
            f"Creality Print failed (exit {completed.returncode}); no G-code produced.\n{tail}"
        )

    gcode = candidates[0].resolve()
    stats = parse_gcode_stats(gcode)
    return {
        "ok": True,
        "model_path": str(model_path),
        "gcode_path": str(gcode),
        "gcode_size_bytes": gcode.stat().st_size,
        "profiles": profile_names,
        "settings": override,
        "orientation": "automatic" if orient else "unchanged",
        "rotation_deg": {
            "x": rotate_x_deg,
            "y": rotate_y_deg,
            "z": rotate_z_deg,
        },
        "copies": copies,
        "stats": asdict(stats),
        "log_tail": combined_log[-4000:],
    }


def system_status(data_dir: Path = DEFAULT_DATA_DIR) -> dict[str, Any]:
    fusion = False
    try:
        fusion = bool(fusion_request("ping", port=FUSION_PORT).get("pong"))
    except CrealityMCPError:
        pass
    active = None
    try:
        active = asdict(read_active_profiles(data_dir))
    except CrealityMCPError:
        pass
    return {
        "creality_binary": str(CREALITY_BINARY),
        "creality_installed": CREALITY_BINARY.is_file(),
        "data_dir": str(data_dir),
        "data_dir_exists": data_dir.is_dir(),
        "fusion_connected": fusion,
        "fusion_endpoint": f"{FUSION_HOST}:{FUSION_PORT}",
        "active_profiles": active,
    }
