import sqlite3

def upgrade_schema():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    
    print("Checking 'configs' table schema...")
    cursor.execute("PRAGMA table_info(configs)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if "showcaseImages" not in columns:
        print("Adding 'showcaseImages' to 'configs'...")
        cursor.execute("ALTER TABLE configs ADD COLUMN showcaseImages VARCHAR NOT NULL DEFAULT '[]'")
    else:
        print("'showcaseImages' already exists.")
        
    if "showcaseMessage" not in columns:
        print("Adding 'showcaseMessage' to 'configs'...")
        cursor.execute("ALTER TABLE configs ADD COLUMN showcaseMessage VARCHAR")
    else:
        print("'showcaseMessage' already exists.")
        
    if "showcaseStatus" not in columns:
        print("Adding 'showcaseStatus' to 'configs'...")
        cursor.execute("ALTER TABLE configs ADD COLUMN showcaseStatus VARCHAR NOT NULL DEFAULT 'none'")
    else:
        print("'showcaseStatus' already exists.")

    conn.commit()
    conn.close()
    print("Database schema upgraded successfully.")

if __name__ == "__main__":
    upgrade_schema()
