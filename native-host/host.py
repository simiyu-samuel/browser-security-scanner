#!/usr/bin/env python3
"""Read-only SENTINEL native messaging host.

This process deliberately reports only coarse OS and browser-process posture.
It does not read browser profile databases, credentials, history, or files.
"""

import csv
import json
import os
import platform
import shutil
import struct
import subprocess
import sys

MAX_MESSAGE_BYTES = 1024 * 1024
BROWSER_NAMES = ("chrome", "chromium", "msedge", "edge", "firefox", "safari")


def run_command(args):
    try:
        result = subprocess.run(
            args,
            check=False,
            capture_output=True,
            text=True,
            timeout=3,
        )
        return result.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def process_names():
    if platform.system() == "Windows":
        output = run_command(["tasklist", "/FO", "CSV", "/NH"])
        names = []
        for row in csv.reader(output.splitlines()):
            if row:
                names.append(row[0])
        return names
    output = run_command(["ps", "-A", "-o", "comm="])
    return [line.strip() for line in output.splitlines() if line.strip()]


def browser_process_summary():
    counts = {}
    for name in process_names():
        lower = os.path.basename(name).lower()
        for browser in BROWSER_NAMES:
            if browser in lower:
                counts[browser] = counts.get(browser, 0) + 1
                break
    return counts


def installed_cli_versions():
    candidates = {
        "chrome": ["google-chrome", "google-chrome-stable", "chrome"],
        "chromium": ["chromium", "chromium-browser"],
        "edge": ["microsoft-edge", "msedge"],
        "firefox": ["firefox"],
    }
    versions = {}
    for name, commands in candidates.items():
        for command in commands:
            if shutil.which(command):
                output = run_command([command, "--version"])
                if output:
                    versions[name] = output[:160]
                    break
    return versions


def audit():
    return {
        "supported": True,
        "localOnly": True,
        "os": platform.system(),
        "osRelease": platform.release(),
        "architecture": platform.machine(),
        "python": platform.python_version(),
        "browserProcesses": browser_process_summary(),
        "browserCliVersions": installed_cli_versions(),
        "profileDataRead": False,
        "credentialsRead": False,
        "networkRequests": 0,
    }


def read_message():
    header = sys.stdin.buffer.read(4)
    if len(header) != 4:
        return None
    size = struct.unpack("<I", header)[0]
    if size > MAX_MESSAGE_BYTES:
        raise ValueError("message too large")
    payload = sys.stdin.buffer.read(size)
    if len(payload) != size:
        raise ValueError("truncated message")
    return json.loads(payload.decode("utf-8"))


def send_message(payload):
    encoded = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def main():
    while True:
        try:
            message = read_message()
            if message is None:
                return
            if message.get("action") == "system_inventory":
                send_message(audit())
            else:
                send_message({"supported": False, "error": "unknown action", "localOnly": True})
        except Exception as error:  # Keep the host alive for the browser process.
            send_message({"supported": False, "error": str(error), "localOnly": True})


if __name__ == "__main__":
    main()
