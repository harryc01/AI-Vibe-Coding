#!/usr/bin/env python3
"""Start local demo server without requiring users to remember paths."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

PORT = 4173


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    os.chdir(repo_root)
    server = ThreadingHTTPServer(("0.0.0.0", PORT), SimpleHTTPRequestHandler)
    print(f"[OK] Demo server started at http://localhost:{PORT}/demo/")
    print(f"[OK] Briefing page: http://localhost:{PORT}/demo/briefing.html")
    print("[TIP] Keep this window open. Press Ctrl+C to stop.")
    server.serve_forever()


if __name__ == "__main__":
    main()
