from pathlib import Path
import struct

import pytest

from creality_print_mcp.core import (
    CrealityMCPError,
    _duration_to_seconds,
    _materialize_profile,
    build_override_settings,
    parse_gcode_stats,
    read_active_profiles,
    rotate_binary_stl,
)


def test_duration_parser() -> None:
    assert _duration_to_seconds("1d 2h 3m 4s") == 93784
    assert _duration_to_seconds("42m 5s") == 2525
    assert _duration_to_seconds("unknown") is None


def test_gcode_stats_parser(tmp_path: Path) -> None:
    gcode = tmp_path / "part.gcode"
    gcode.write_text(
        "; total filament length [mm] = 1234.5\n"
        "; total filament weight [g] = 3.67\n"
        "; total filament cost = 2.50\n"
        "; estimated printing time (normal mode) = 1h 2m 3s\n",
        encoding="utf-8",
    )
    stats = parse_gcode_stats(gcode)
    assert stats.filament_length_mm == 1234.5
    assert stats.filament_weight_g == 3.67
    assert stats.filament_cost == 2.5
    assert stats.estimated_time_seconds == 3723


def test_support_auto_and_overrides() -> None:
    settings = build_override_settings(
        support_mode="auto",
        layer_height_mm=0.3,
        infill_percent=20,
        wall_loops=3,
    )
    assert settings["enable_support"] == "1"
    assert settings["support_type"] == "normal(auto)"
    assert settings["sparse_infill_density"] == "20%"
    assert settings["wall_loops"] == "3"


def test_rejects_unsafe_ranges() -> None:
    with pytest.raises(CrealityMCPError):
        build_override_settings(infill_percent=101)
    with pytest.raises(CrealityMCPError):
        build_override_settings(layer_height_mm=0.01)


def test_active_profiles_and_inheritance(tmp_path: Path) -> None:
    (tmp_path / "system/Creality/process").mkdir(parents=True)
    (tmp_path / "user/default/process").mkdir(parents=True)
    (tmp_path / "Creality.conf").write_text(
        '{"presets":{"machine":"K1C","process":"Fine custom",'
        '"filaments":["PETG"]}}',
        encoding="utf-8",
    )
    (tmp_path / "system/Creality/process/Base.json").write_text(
        '{"name":"Base","type":"process","layer_height":"0.3",'
        '"wall_loops":"2"}',
        encoding="utf-8",
    )
    custom = tmp_path / "user/default/process/Fine custom.json"
    custom.write_text(
        '{"name":"Fine custom","inherits":"Base","wall_loops":"3"}',
        encoding="utf-8",
    )

    assert read_active_profiles(tmp_path).machine == "K1C"
    merged = _materialize_profile(custom, "process", tmp_path)
    assert merged["layer_height"] == "0.3"
    assert merged["wall_loops"] == "3"
    assert merged["type"] == "process"
    assert "inherits" not in merged


def test_binary_stl_rotation_and_bed_lift(tmp_path: Path) -> None:
    source = tmp_path / "source.stl"
    destination = tmp_path / "rotated.stl"
    facet = struct.pack(
        "<12fH",
        0, 0, 1,
        0, 0, 1,
        1, 0, 1,
        0, 1, 2,
        0,
    )
    source.write_bytes(b"test".ljust(80, b"\0") + struct.pack("<I", 1) + facet)
    rotate_binary_stl(source, destination, rx_deg=180)
    values = struct.unpack_from("<12f", destination.read_bytes(), 84)
    vertex_z = (values[5], values[8], values[11])
    assert min(vertex_z) == pytest.approx(0)
    assert max(vertex_z) == pytest.approx(1)
