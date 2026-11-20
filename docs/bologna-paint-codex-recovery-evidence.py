"""R1 read-only, targeted Codex evidence audit. No raw conversations, auth files or log bodies emitted."""
import datetime
import hashlib
import json
import sqlite3
import subprocess
from pathlib import Path

repo = Path(__file__).resolve().parent.parent
old = repo / "data/bo-004s-codex-native"
cwd = str(old / "work")
journal = (old / "attempt.jsonl").read_bytes()
events = [json.loads(line) for line in journal.splitlines() if line.strip()]
start = datetime.datetime.fromisoformat(events[0]["startedAt"].replace("Z", "+00:00"))
now = datetime.datetime.now(datetime.timezone.utc)
base = Path.home() / ".codex"
audit = {
    "inspectedAt": now.isoformat(), "oldWork": cwd,
    "journalSha256": hashlib.sha256(journal).hexdigest(), "journalEvents": events,
    "status": "INTERRUPTED_UNKNOWN_USAGE", "operatorReportedCause": "manually interrupted",
    "scope": "local metadata only; no inference, provider query, token store or private transcript copied",
    "matchingThreads": [], "matchingRollouts": [], "logIndex": {}, "relevantProcesses": [],
    "limitations": ["Original exec used --ephemeral; absent retained records do not prove no image calls", "Original wrapper buffered stdout/stderr until close; an interrupt can discard those buffers", "A started journal precedes spawn and alone cannot establish whether spawn occurred"],
}
errors = []
try:
    conn = sqlite3.connect("file:" + str(base / "state_5.sqlite") + "?mode=ro", uri=True)
    for row in conn.execute("select id,rollout_path,created_at,updated_at,cwd from threads where cwd=?", (cwd,)):
        audit["matchingThreads"].append(dict(zip(["id", "rolloutPath", "createdAtEpoch", "updatedAtEpoch", "cwd"], row)))
    conn.close()
except Exception as e:
    errors.append({"source": "thread index", "errorClass": type(e).__name__})

for folder in [base / "sessions", base / "archived_sessions"]:
    if not folder.exists():
        continue
    for path in folder.rglob("*.jsonl"):
        try:
            with path.open() as f:
                first = json.loads(f.readline())
            if first.get("type") != "session_meta" or first.get("payload", {}).get("cwd") != cwd:
                continue
            raw = path.read_bytes()
            record = {"path": str(path), "sha256": hashlib.sha256(raw).hexdigest(), "toolRequests": []}
            for line in raw.splitlines():
                item = json.loads(line)
                payload = item.get("payload", {})
                if payload.get("type") in ["function_call", "image_generation_call"]:
                    name = str(payload.get("name", payload.get("type", "")))
                    args = str(payload.get("arguments", ""))
                    if any(x in name.lower() for x in ["image_gen", "imagegen", "image_generation"]) or "tools.image_gen__imagegen(" in args:
                        record["toolRequests"].append({"timestamp": item.get("timestamp"), "type": payload.get("type"), "toolName": name, "argumentsSha256": hashlib.sha256(args.encode()).hexdigest(), "meaning": "request recorded, not proof of billing or completed image"})
            audit["matchingRollouts"].append(record)
        except Exception as e:
            errors.append({"source": "rollout metadata", "errorClass": type(e).__name__})
try:
    conn = sqlite3.connect("file:" + str(base / "logs_2.sqlite") + "?mode=ro", uri=True)
    maximum = conn.execute("select max(ts) from logs").fetchone()[0]
    scale = 1000 if maximum and maximum > 10**11 else 1
    lo, hi = int(start.timestamp() - 10) * scale, int(now.timestamp()) * scale
    audit["logIndex"] = {
        "path": str(base / "logs_2.sqlite"), "from": start.isoformat(), "to": now.isoformat(),
        "rowsInTimeRange": conn.execute("select count(*) from logs where ts between ? and ?", (lo, hi)).fetchone()[0],
        "rowsMentioningExactOldCwd": conn.execute("select count(*) from logs where ts between ? and ? and instr(feedback_log_body,?)>0", (lo, hi, cwd)).fetchone()[0],
        "imageDispatchPatternRowsUnattributed": conn.execute("select count(*) from logs where ts between ? and ? and (instr(feedback_log_body,'image_generation_call')>0 or instr(feedback_log_body,'image_gen__imagegen')>0)", (lo, hi)).fetchone()[0],
        "limitation": "Aggregate text-pattern counts are not attributed tool events; log coverage is not complete",
    }
    conn.close()
except Exception as e:
    errors.append({"source": "log index", "errorClass": type(e).__name__})
for line in subprocess.check_output(["ps", "-eo", "pid,ppid,etimes,comm,args"], text=True).splitlines()[1:]:
    row = line.split(None, 4)
    if len(row) != 5:
        continue
    pid, ppid, elapsed, comm, args = row
    if comm in ["codex", "node"] and (cwd in args or (comm == "codex" and " exec " in " " + args + " ") or "bologna-paint-codex-live.ts" in args):
        audit["relevantProcesses"].append({"pid": int(pid), "ppid": int(ppid), "elapsedSeconds": int(elapsed), "executableName": comm})
audit["scanErrors"] = errors
audit["imageToolRequestsObserved"] = sum(len(r["toolRequests"]) for r in audit["matchingRollouts"])
audit["previousUsage"] = "UNKNOWN; no zero-usage or charge conclusion"
print(json.dumps(audit, indent=2))
