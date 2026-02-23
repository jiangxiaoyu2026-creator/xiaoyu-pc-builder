import sqlite3
import os

# Get path to db
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data/xiaoyu.db")

print(f"Optimizing database at: {DB_PATH}")

try:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Enable WAL mode for better concurrency and write speed
    cursor.execute("PRAGMA journal_mode=WAL")
    print(f"Journal Mode: {cursor.fetchone()[0]}")
    
    # 2. Set synchronous to NORMAL (safe with WAL, much faster)
    cursor.execute("PRAGMA synchronous=NORMAL")
    
    # 3. Increase cache size (64MB)
    cursor.execute("PRAGMA cache_size=-64000")
    
    # 4. Create missing indexes for frequent queries
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_configs_userId ON configs(userId)",
        "CREATE INDEX IF NOT EXISTS idx_configs_status ON configs(status)",
        "CREATE INDEX IF NOT EXISTS idx_used_sellerId ON used_items(sellerId)",
        "CREATE INDEX IF NOT EXISTS idx_used_category ON used_items(category)",
        "CREATE INDEX IF NOT EXISTS idx_used_status ON used_items(status)",
        "CREATE INDEX IF NOT EXISTS idx_hardware_category ON hardware(category)",
        "CREATE INDEX IF NOT EXISTS idx_hardware_status ON hardware(status)",
        "CREATE INDEX IF NOT EXISTS idx_orders_userId ON orders(userId)",
        "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
    ]
    
    for idx_sql in indexes:
        cursor.execute(idx_sql)
        print(f"Executed: {idx_sql}")
        
    conn.commit()
    
    # 5. Optimize the database structure
    cursor.execute("PRAGMA optimize")
    print("Database optimized successfully.")
    
    conn.close()
except Exception as e:
    print(f"Error optimizing DB: {e}")
