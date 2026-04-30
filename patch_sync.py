with open("sync_recycling_to_server.py") as f:
    code = f.read()

code = code.replace("requests.post(f\"{API_BASE}/admin\", json=payload, headers=headers)", "type('obj', (object,), {'status_code': 200})()")
code = code.replace("requests.put(f\"{API_BASE}/admin/{item_id}\", json=payload, headers=headers)", "type('obj', (object,), {'status_code': 200})()")

with open("dry_run_sync.py", "w") as f:
    f.write(code)
