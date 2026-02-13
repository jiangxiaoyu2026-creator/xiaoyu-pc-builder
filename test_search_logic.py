import sqlite3
import os

db_path = "data/xiaoyu.db"
if not os.path.exists(db_path):
    print("DB not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def simulate_search(search_str):
    keywords = search_str.strip().split()
    query = "SELECT brand, model FROM hardware WHERE status = 'active'"
    params = []
    for kw in keywords:
        query += " AND (brand LIKE ? OR model LIKE ?)"
        params.extend([f"%{kw}%", f"%{kw}%"])
    
    cursor.execute(query, params)
    return cursor.fetchall()

print("Testing 'MSI 迫':")
results = simulate_search("MSI 迫")
for r in results:
    print(f"- {r[0]} {r[1]}")

print("\nTesting 'B760M 2':")
results = simulate_search("B760M 2")
for r in results:
    print(f"- {r[0]} {r[1]}")

conn.close()
