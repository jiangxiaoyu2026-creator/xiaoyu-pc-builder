import sqlite3

def inspect_raw():
    conn = sqlite3.connect("/Users/mac/new/data/xiaoyu.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, category, model, specs FROM hardware LIMIT 10")
    rows = cursor.fetchall()
    for row in rows:
        id, cat, model, specs = row
        print(f"ID: {id}, Model: {model}")
        print(f"  Specs type: {type(specs)}")
        print(f"  Specs value: {repr(specs)}")
        print("-" * 20)
    conn.close()

if __name__ == "__main__":
    inspect_raw()
