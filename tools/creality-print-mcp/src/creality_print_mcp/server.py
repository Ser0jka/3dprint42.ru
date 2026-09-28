from __future__ import annotations

from pathlib import Path
from typing import Literal

from mcp.server.fastmcp import FastMCP

from .core import (
    DEFAULT_DATA_DIR,
    DEFAULT_OUTPUT_DIR,
    export_fusion_body,
    list_profiles as list_profiles_core,
    parse_gcode_stats,
    read_active_profiles,
    slice_model as slice_model_core,
    system_status,
)


mcp = FastMCP("creality-print")


@mcp.tool()
def status() -> dict:
    """Check Creality Print, Fusion add-in, and the currently selected profiles."""
    return system_status()


@mcp.tool()
def list_profiles(
    kind: Literal["machine", "process", "filament"],
    query: str = "",
    limit: int = 50,
) -> list[dict[str, str]]:
    """List locally installed Creality Print profiles, optionally filtered by name."""
    return list_profiles_core(kind, query=query, limit=limit)


@mcp.tool()
def inspect_gcode(gcode_path: str) -> dict:
    """Read estimated print time, filament length, weight, and cost from G-code."""
    path = Path(gcode_path).expanduser().resolve()
    stats = parse_gcode_stats(path)
    return {"gcode_path": str(path), **stats.__dict__}


@mcp.tool()
def slice_file(
    model_path: str,
    machine_profile: str = "",
    process_profile: str = "",
    filament_profile: str = "",
    output_dir: str = "",
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
) -> dict:
    """Slice an STL/3MF/OBJ/STEP file using Creality Print and report material and time."""
    active = read_active_profiles()
    return slice_model_core(
        Path(model_path),
        machine_profile=machine_profile or active.machine,
        process_profile=process_profile or active.process,
        filament_profile=filament_profile or active.filament,
        output_dir=Path(output_dir) if output_dir else DEFAULT_OUTPUT_DIR,
        data_dir=DEFAULT_DATA_DIR,
        support_mode=support_mode,
        orient=orient,
        arrange=arrange,
        layer_height_mm=layer_height_mm,
        infill_percent=infill_percent,
        wall_loops=wall_loops,
        support_threshold_deg=support_threshold_deg,
        copies=copies,
        rotate_x_deg=rotate_x_deg,
        rotate_y_deg=rotate_y_deg,
        rotate_z_deg=rotate_z_deg,
    )


@mcp.tool()
def slice_fusion_body(
    body_name: str,
    machine_profile: str = "",
    process_profile: str = "",
    filament_profile: str = "",
    output_dir: str = "",
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
) -> dict:
    """Export a named body from open Fusion 360, slice it, and return G-code statistics."""
    active = read_active_profiles()
    destination = Path(output_dir) if output_dir else DEFAULT_OUTPUT_DIR
    stl = export_fusion_body(body_name, destination / "stl")
    result = slice_model_core(
        stl,
        machine_profile=machine_profile or active.machine,
        process_profile=process_profile or active.process,
        filament_profile=filament_profile or active.filament,
        output_dir=destination / "gcode",
        data_dir=DEFAULT_DATA_DIR,
        support_mode=support_mode,
        orient=orient,
        arrange=arrange,
        layer_height_mm=layer_height_mm,
        infill_percent=infill_percent,
        wall_loops=wall_loops,
        support_threshold_deg=support_threshold_deg,
        copies=copies,
        rotate_x_deg=rotate_x_deg,
        rotate_y_deg=rotate_y_deg,
        rotate_z_deg=rotate_z_deg,
    )
    result["fusion_body"] = body_name
    result["exported_stl"] = str(stl)
    return result


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
