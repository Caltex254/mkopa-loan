#!/usr/bin/env python3
"""Deploy MKOPA Loan to Pterodactyl panel using the correct API."""
import requests
import time
import os
import sys

PANEL = "https://panel.richkidrichiee.online"
API_KEY = "ptlc_vN9pMKwhGQ00tKPBPMyEUGFcwP3fOiipxELrkRzi5qN"
SERVER_ID = "f05c4533"
TARBALL = "/home/z/my-project/mkopa-final-deploy.tar.gz"
REMOTE_NAME = "deploy.tar.gz"

HEADERS = {"Authorization": f"Bearer {API_KEY}", "Accept": "application/json"}

def log(m): print(f"[deploy] {m}", flush=True)

def wait_for_server_state(target_state, timeout=60):
    synonyms = {
        "off": ["off", "offline"],
        "offline": ["off", "offline"],
        "running": ["running"],
        "starting": ["starting"],
    }
    accepted = synonyms.get(target_state, [target_state])
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(f"{PANEL}/api/client/servers/{SERVER_ID}/resources",
                headers=HEADERS, timeout=15)
            if r.status_code == 200:
                state = r.json().get("attributes", {}).get("current_state", "")
                log(f"  server state: {state}")
                if state in accepted:
                    return True
            time.sleep(2)
        except Exception as e:
            log(f"  poll error: {e}")
            time.sleep(2)
    return False

def stop_server():
    log("Stopping server...")
    try:
        requests.post(f"{PANEL}/api/client/servers/{SERVER_ID}/power",
            headers={**HEADERS, "Content-Type": "application/json"},
            json={"signal": "stop"}, timeout=20)
    except: pass
    wait_for_server_state("off", timeout=60)
    log("Server stopped.")

def start_server():
    log("Starting server...")
    try:
        requests.post(f"{PANEL}/api/client/servers/{SERVER_ID}/power",
            headers={**HEADERS, "Content-Type": "application/json"},
            json={"signal": "start"}, timeout=20)
    except: pass
    time.sleep(3)

def clean_remote_files():
    """Recursively delete EVERYTHING in the remote /home/container root,
    including the .next directory which contains stale client chunks.

    The previous version only deleted top-level entries, but Pterodactyl's
    files/delete endpoint takes a list of paths relative to `root` — it
    accepts directory names and deletes them recursively. We must delete
    .next/ explicitly so that stale _next/static/chunks/*.js files from a
    previous build don't survive into the new deploy and cause 404s /
    "client-side exception" hydration errors."""
    log("Cleaning old remote files (recursive)...")
    try:
        r = requests.get(f"{PANEL}/api/client/servers/{SERVER_ID}/files/list?directory=/",
            headers=HEADERS, timeout=20)
        if r.status_code == 200:
            items = r.json().get("data", [])
            # Delete EVERYTHING at root. Skip hidden dotfiles that the panel
            # might protect, except .next and .env which we want gone too.
            files_to_delete = []
            protected = {".", ".."}
            for it in items:
                name = it["attributes"]["name"]
                if name in protected:
                    continue
                files_to_delete.append(name)
            if files_to_delete:
                log(f"  deleting recursively: {files_to_delete}")
                resp = requests.post(f"{PANEL}/api/client/servers/{SERVER_ID}/files/delete",
                    headers={**HEADERS, "Content-Type": "application/json"},
                    json={"root": "/", "files": files_to_delete}, timeout=60)
                log(f"  delete HTTP {resp.status_code}")
                # Give the daemon a moment to actually unlink the files
                time.sleep(3)
            # Verify .next is gone
            r2 = requests.get(f"{PANEL}/api/client/servers/{SERVER_ID}/files/list?directory=/",
                headers=HEADERS, timeout=20)
            if r2.status_code == 200:
                remaining = [it["attributes"]["name"] for it in r2.json().get("data", [])]
                if ".next" in remaining:
                    log("  WARNING: .next still present — trying force-delete again")
                    requests.post(f"{PANEL}/api/client/servers/{SERVER_ID}/files/delete",
                        headers={**HEADERS, "Content-Type": "application/json"},
                        json={"root": "/", "files": [".next"]}, timeout=60)
                    time.sleep(2)
        else:
            log(f"  list HTTP {r.status_code}: {r.text[:300]}")
    except Exception as e:
        log(f"  clean error (non-fatal): {e}")

def get_upload_url():
    log("Requesting upload URL (GET)...")
    r = requests.get(f"{PANEL}/api/client/servers/{SERVER_ID}/files/upload",
        headers=HEADERS, timeout=30)
    r.raise_for_status()
    url = r.json()["attributes"]["url"]
    log(f"  got upload URL")
    return url

def upload_file(upload_url, local_path, remote_name, max_retries=3):
    file_size = os.path.getsize(local_path)
    log(f"Uploading {local_path} ({file_size/1024/1024:.2f} MB) as {remote_name}...")
    last_err = None
    current_url = upload_url
    for attempt in range(1, max_retries + 1):
        try:
            log(f"  attempt {attempt}/{max_retries}")
            with open(local_path, "rb") as f:
                files = {"files": (remote_name, f, "application/gzip")}
                r = requests.post(current_url, files=files, timeout=600)
            if r.status_code in (200, 201, 204):
                log(f"  upload OK (HTTP {r.status_code})")
                return True
            log(f"  upload HTTP {r.status_code}: {r.text[:300]}")
            last_err = f"HTTP {r.status_code}"
            if attempt < max_retries:
                time.sleep(3)
                current_url = get_upload_url()
        except Exception as e:
            log(f"  upload exception: {e}")
            last_err = str(e)
            if attempt < max_retries:
                time.sleep(3)
                try: current_url = get_upload_url()
                except: pass
    log(f"Upload failed: {last_err}")
    return False

def decompress_remote(filename, root="/"):
    log(f"Decompressing {filename}...")
    r = requests.post(f"{PANEL}/api/client/servers/{SERVER_ID}/files/decompress",
        headers={**HEADERS, "Content-Type": "application/json"},
        json={"root": root, "file": filename}, timeout=120)
    if r.status_code == 204:
        log("  decompress OK")
        return True
    log(f"  decompress HTTP {r.status_code}: {r.text[:300]}")
    return False

def list_remote(directory="/"):
    r = requests.get(f"{PANEL}/api/client/servers/{SERVER_ID}/files/list?directory={directory}",
        headers=HEADERS, timeout=20)
    if r.status_code == 200:
        return [it["attributes"]["name"] for it in r.json().get("data", [])]
    return []

def main():
    if not os.path.exists(TARBALL):
        log(f"ERROR: tarball not found: {TARBALL}")
        sys.exit(1)
    
    log(f"=== MKOPA LOAN Deployment ===")
    log(f"Tarball: {TARBALL} ({os.path.getsize(TARBALL)/1024/1024:.2f} MB)")
    
    stop_server()
    time.sleep(2)
    clean_remote_files()
    time.sleep(2)
    
    upload_url = get_upload_url()
    ok = upload_file(upload_url, TARBALL, REMOTE_NAME)
    if not ok:
        log("FATAL: upload failed")
        sys.exit(2)
    time.sleep(3)
    
    files = list_remote("/")
    log(f"Remote files after upload: {files}")
    
    ok = decompress_remote(REMOTE_NAME, root="/")
    if not ok:
        log("FATAL: decompress failed")
        sys.exit(4)
    time.sleep(5)
    
    files = list_remote("/")
    log(f"Remote files after decompress: {files}")
    
    log("Cleaning up tarball...")
    try:
        requests.post(f"{PANEL}/api/client/servers/{SERVER_ID}/files/delete",
            headers={**HEADERS, "Content-Type": "application/json"},
            json={"root": "/", "files": [REMOTE_NAME]}, timeout=30)
    except: pass
    
    start_server()
    
    log("Waiting for server to start...")
    wait_for_server_state("starting", timeout=60)
    
    log("Waiting 25s for Next.js to boot...")
    time.sleep(25)

    # Post-deploy verification: ensure client chunks are actually reachable.
    log("Verifying deployment...")
    verify_url = "https://mkopa-loan.kenya.qzz.io"
    import urllib.request
    for path in ["/", "/_next/static/chunks/"]:
        try:
            req = urllib.request.Request(f"{verify_url}{path}", method="GET")
            with urllib.request.urlopen(req, timeout=15) as resp:
                log(f"  GET {path} -> HTTP {resp.status}")
        except Exception as e:
            log(f"  GET {path} -> ERROR: {e}")

    # Specifically verify a known chunk from the current build
    try:
        import re as _re
        with urllib.request.urlopen(f"{verify_url}/", timeout=15) as resp:
            html = resp.read().decode("utf-8", errors="replace")
        m = _re.search(r'/_next/static/chunks/([a-f0-9]+\.js)', html)
        if m:
            chunk_url = f"{verify_url}/_next/static/chunks/{m.group(1)}"
            with urllib.request.urlopen(chunk_url, timeout=15) as resp:
                log(f"  chunk {m.group(1)} -> HTTP {resp.status} ({len(resp.read())} bytes)")
        else:
            log("  WARNING: no chunk reference found in HTML")
    except Exception as e:
        log(f"  chunk verify ERROR: {e}")

    log("Done!")

if __name__ == "__main__":
    main()
