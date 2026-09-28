# Creality Print MCP

Local stdio MCP server for Codex that bridges an open Autodesk Fusion design to
Creality Print 6.x.

It can:

- detect the locally selected printer, process, and filament profiles;
- export a named Fusion body to STL through the Fusion360MCP add-in;
- automatically orient and arrange the model;
- enable automatic supports and override layer height, infill, wall count, and
  support threshold;
- run Creality Print headlessly and return the produced G-code path;
- parse estimated time, filament length, weight, and cost from the G-code.

The default output directory is `~/Documents/CrealityMCP`.

## Local development

```sh
uv sync --dev
uv run pytest
uv run creality-print-mcp
```

## Codex registration

```sh
codex mcp add creality-print -- \
  /opt/homebrew/bin/uv run \
  --directory /absolute/path/to/tools/creality-print-mcp \
  creality-print-mcp
```

Restart the Codex task after registering the server.

