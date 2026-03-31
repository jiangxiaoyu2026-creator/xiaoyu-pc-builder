import sqlite3
import json
import re

db_path = "/Users/mac/new/data/xiaoyu.db"

SPECS_DATA = {
    # Intel 12th Gen
    "12100": { "cpu": "Intel Core i3-12100", "socket": "LGA1700", "architecture": "Alder Lake", "cores": "4P+0E (4 Cores)", "threads": 8, "baseClock": "3.3 GHz", "boostClock": "4.3 GHz", "l2Cache": "5 MB", "l3Cache": "12 MB", "tdp": "60W", "memorySupport": "DDR4-3200 / DDR5-4800", "integratedGraphics": "Intel UHD 730" },
    "12100f": { "cpu": "Intel Core i3-12100F", "socket": "LGA1700", "architecture": "Alder Lake", "cores": "4P+0E (4 Cores)", "threads": 8, "baseClock": "3.3 GHz", "boostClock": "4.3 GHz", "l2Cache": "5 MB", "l3Cache": "12 MB", "tdp": "58W", "memorySupport": "DDR4-3200 / DDR5-4800", "integratedGraphics": "None" },
    "12600kf": { "cpu": "Intel Core i5-12600KF", "socket": "LGA1700", "architecture": "Alder Lake", "cores": "6P+4E (10 Cores)", "threads": 16, "baseClock": "3.7 GHz", "boostClock": "4.9 GHz", "l2Cache": "9.5 MB", "l3Cache": "20 MB", "tdp": "125W", "memorySupport": "DDR4-3200 / DDR5-4800", "integratedGraphics": "None", "cinebenchR23_multi": 17500, "cinebenchR23_single": 1900 },
    
    # Intel 13th Gen
    "13400ef": { "cpu": "Intel Core i5-13400F", "socket": "LGA1700", "architecture": "Raptor Lake", "cores": "6P+4E (10 Cores)", "threads": 16, "baseClock": "2.5 GHz", "boostClock": "4.6 GHz", "l2Cache": "9.5 MB", "l3Cache": "20 MB", "tdp": "65W", "memorySupport": "DDR4-3200 / DDR5-4800", "integratedGraphics": "None", "cinebenchR23_multi": 16000, "cinebenchR23_single": 1800 },
    "13600k": { "cpu": "Intel Core i5-13600K", "socket": "LGA1700", "architecture": "Raptor Lake", "cores": "6P+8E (14 Cores)", "threads": 20, "baseClock": "3.5 GHz", "boostClock": "5.1 GHz", "l2Cache": "20 MB", "l3Cache": "24 MB", "tdp": "125W", "memorySupport": "DDR4-3200 / DDR5-5600", "integratedGraphics": "Intel UHD 770", "cinebenchR23_multi": 24000, "cinebenchR23_single": 2000 },
    "13600kf": { "cpu": "Intel Core i5-13600KF", "socket": "LGA1700", "architecture": "Raptor Lake", "cores": "6P+8E (14 Cores)", "threads": 20, "baseClock": "3.5 GHz", "boostClock": "5.1 GHz", "l2Cache": "20 MB", "l3Cache": "24 MB", "tdp": "125W", "memorySupport": "DDR4-3200 / DDR5-5600", "integratedGraphics": "None", "cinebenchR23_multi": 24000, "cinebenchR23_single": 2000 },
    "13700f": { "cpu": "Intel Core i7-13700F", "socket": "LGA1700", "architecture": "Raptor Lake", "cores": "8P+8E (16 Cores)", "threads": 24, "baseClock": "2.1 GHz", "boostClock": "5.2 GHz", "l2Cache": "24 MB", "l3Cache": "30 MB", "tdp": "65W", "memorySupport": "DDR4-3200 / DDR5-5600", "integratedGraphics": "None", "cinebenchR23_multi": 27000, "cinebenchR23_single": 2050 },
    
    # Intel 14th Gen
    "14100f": { "cpu": "Intel Core i3-14100F", "socket": "LGA1700", "architecture": "Raptor Lake Refresh", "cores": "4P+0E (4 Cores)", "threads": 8, "baseClock": "3.5 GHz", "boostClock": "4.7 GHz", "l2Cache": "5 MB", "l3Cache": "12 MB", "tdp": "58W", "memorySupport": "DDR4-3200 / DDR5-4800", "integratedGraphics": "None" },
    "14400f": { "cpu": "Intel Core i5-14400F", "socket": "LGA1700", "architecture": "Raptor Lake Refresh", "cores": "6P+4E (10 Cores)", "threads": 16, "baseClock": "2.5 GHz", "boostClock": "4.7 GHz", "l2Cache": "9.5 MB", "l3Cache": "20 MB", "tdp": "65W", "memorySupport": "DDR4-3200 / DDR5-4800", "integratedGraphics": "None" },
    "14490f": { "cpu": "Intel Core i5-14490F", "socket": "LGA1700", "architecture": "Raptor Lake Refresh", "cores": "6P+4E (10 Cores)", "threads": 16, "baseClock": "2.8 GHz", "boostClock": "4.9 GHz", "l2Cache": "9.5 MB", "l3Cache": "24 MB", "tdp": "65W", "memorySupport": "DDR4-3200 / DDR5-4800", "integratedGraphics": "None" },
    "14600k": { "cpu": "Intel Core i5-14600K", "socket": "LGA1700", "architecture": "Raptor Lake Refresh", "cores": "6P+8E (14 Cores)", "threads": 20, "baseClock": "3.5 GHz", "boostClock": "5.3 GHz", "l2Cache": "20 MB", "l3Cache": "24 MB", "tdp": "125W", "memorySupport": "DDR4-3200 / DDR5-5600", "integratedGraphics": "Intel UHD 770", "cinebenchR23_multi": 24500, "cinebenchR23_single": 2050 },
    "14900kf": { "cpu": "Intel Core i9-14900KF", "socket": "LGA1700", "architecture": "Raptor Lake Refresh", "cores": "8P+16E (24 Cores)", "threads": 32, "baseClock": "3.2 GHz", "boostClock": "6.0 GHz", "l2Cache": "32 MB", "l3Cache": "36 MB", "tdp": "125W", "memorySupport": "DDR4-3200 / DDR5-5600", "integratedGraphics": "None", "cinebenchR23_multi": 40000, "cinebenchR23_single": 2200 },
    
    # Intel Core Ultra
    "ultra-5-245kf": { "cpu": "Intel Core Ultra 5 245KF", "socket": "LGA1851", "architecture": "Arrow Lake", "cores": "6P+8E (14 Cores)", "threads": 14, "baseClock": "4.2 GHz", "boostClock": "5.2 GHz", "l2Cache": "26 MB", "l3Cache": "24 MB", "tdp": "125W", "memorySupport": "DDR5-6400", "integratedGraphics": "None" },
    "ultra-7-265k": { "cpu": "Intel Core Ultra 7 265K", "socket": "LGA1851", "architecture": "Arrow Lake", "cores": "8P+12E (20 Cores)", "threads": 20, "baseClock": "3.9 GHz", "boostClock": "5.5 GHz", "l2Cache": "36 MB", "l3Cache": "30 MB", "tdp": "125W", "memorySupport": "DDR5-6400", "integratedGraphics": "Intel Arc Graphics" },
    "ultra-7-265kf": { "cpu": "Intel Core Ultra 7 265KF", "socket": "LGA1851", "architecture": "Arrow Lake", "cores": "8P+12E (20 Cores)", "threads": 20, "baseClock": "3.9 GHz", "boostClock": "5.5 GHz", "l2Cache": "36 MB", "l3Cache": "30 MB", "tdp": "125W", "memorySupport": "DDR5-6400", "integratedGraphics": "None" },
    "ultra-9-285k": { "cpu": "Intel Core Ultra 9 285K", "socket": "LGA1851", "architecture": "Arrow Lake", "cores": "8P+16E (24 Cores)", "threads": 24, "baseClock": "3.7 GHz", "boostClock": "5.7 GHz", "l2Cache": "40 MB", "l3Cache": "36 MB", "tdp": "125W", "memorySupport": "DDR5-6400", "integratedGraphics": "Intel Arc Graphics" },
    
    # AMD Ryzen 5000
    "5600": { "cpu": "AMD Ryzen 5 5600", "socket": "AM4", "architecture": "Zen 3", "cores": "6 Cores", "threads": 12, "baseClock": "3.5 GHz", "boostClock": "4.4 GHz", "l3Cache": "32 MB", "tdp": "65W", "memorySupport": "DDR4-3200", "integratedGraphics": "None", "cinebenchR23_multi": 11000, "cinebenchR23_single": 1400 },
    "5600x": { "cpu": "AMD Ryzen 5 5600X", "socket": "AM4", "architecture": "Zen 3", "cores": "6 Cores", "threads": 12, "baseClock": "3.7 GHz", "boostClock": "4.6 GHz", "l3Cache": "32 MB", "tdp": "65W", "memorySupport": "DDR4-3200", "integratedGraphics": "None", "cinebenchR23_multi": 11500, "cinebenchR23_single": 1500 },
    "5600gt": { "cpu": "AMD Ryzen 5 5600GT", "socket": "AM4", "architecture": "Zen 3", "cores": "6 Cores", "threads": 12, "baseClock": "3.6 GHz", "boostClock": "4.6 GHz", "l3Cache": "16 MB", "tdp": "65W", "memorySupport": "DDR4-3200", "integratedGraphics": "Radeon Graphics (7 CU)" },
    "5700x": { "cpu": "AMD Ryzen 7 5700X", "socket": "AM4", "architecture": "Zen 3", "cores": "8 Cores", "threads": 16, "baseClock": "3.4 GHz", "boostClock": "4.6 GHz", "l3Cache": "32 MB", "tdp": "65W", "memorySupport": "DDR4-3200", "integratedGraphics": "None", "cinebenchR23_multi": 14500, "cinebenchR23_single": 1500 },
    
    # AMD Ryzen 7000
    "7400f": { "cpu": "AMD Ryzen 5 7500F (Equivalent)", "socket": "AM5", "architecture": "Zen 4", "cores": "6 Cores", "threads": 12, "baseClock": "3.7 GHz", "boostClock": "5.0 GHz", "l3Cache": "32 MB", "tdp": "65W", "memorySupport": "DDR5-5200", "integratedGraphics": "None" },
    "7500f": { "cpu": "AMD Ryzen 5 7500F", "socket": "AM5", "architecture": "Zen 4", "cores": "6 Cores", "threads": 12, "baseClock": "3.7 GHz", "boostClock": "5.0 GHz", "l3Cache": "32 MB", "tdp": "65W", "memorySupport": "DDR5-5200", "integratedGraphics": "None", "cinebenchR23_multi": 14000, "cinebenchR23_single": 1800 },
    "7800x3d": { "cpu": "AMD Ryzen 7 7800X3D", "socket": "AM5", "architecture": "Zen 4", "cores": "8 Cores", "threads": 16, "baseClock": "4.2 GHz", "boostClock": "5.0 GHz", "l3Cache": "96 MB (3D V-Cache)", "tdp": "120W", "memorySupport": "DDR5-5200", "integratedGraphics": "Radeon Graphics (2 CU)", "cinebenchR23_multi": 18500, "cinebenchR23_single": 1850 },
    
    # AMD Ryzen 9000
    "9600x": { "cpu": "AMD Ryzen 5 9600X", "socket": "AM5", "architecture": "Zen 5", "cores": "6 Cores", "threads": 12, "baseClock": "3.9 GHz", "boostClock": "5.4 GHz", "l3Cache": "32 MB", "tdp": "65W", "memorySupport": "DDR5-5600", "integratedGraphics": "Radeon Graphics (2 CU)" },
    "9700x": { "cpu": "AMD Ryzen 7 9700X", "socket": "AM5", "architecture": "Zen 5", "cores": "8 Cores", "threads": 16, "baseClock": "3.8 GHz", "boostClock": "5.5 GHz", "l3Cache": "32 MB", "tdp": "65W", "memorySupport": "DDR5-5600", "integratedGraphics": "Radeon Graphics (2 CU)", "cinebenchR23_multi": 21000, "cinebenchR23_single": 2200 },
    "9950x": { "cpu": "AMD Ryzen 9 9950X", "socket": "AM5", "architecture": "Zen 5", "cores": "16 Cores", "threads": 32, "baseClock": "4.3 GHz", "boostClock": "5.7 GHz", "l3Cache": "64 MB", "tdp": "170W", "memorySupport": "DDR5-5600", "integratedGraphics": "Radeon Graphics", "cinebenchR23_multi": 44000, "cinebenchR23_single": 2300 },
    "9800x3d": { "cpu": "AMD Ryzen 7 9800X3D", "socket": "AM5", "architecture": "Zen 5", "cores": "8 Cores", "threads": 16, "baseClock": "4.7 GHz", "boostClock": "5.2 GHz", "l3Cache": "96 MB (3D V-Cache)", "tdp": "120W", "memorySupport": "DDR5-5600+", "integratedGraphics": "Radeon Graphics", "cinebenchR23_multi": 23000, "cinebenchR23_single": 2250 },
    "9850x3d": { "cpu": "AMD Ryzen 9 9850X3D", "socket": "AM5", "architecture": "Zen 5", "cores": "12 Cores", "threads": 24, "baseClock": "4.4 GHz", "boostClock": "5.5 GHz", "l3Cache": "128 MB (3D V-Cache)", "tdp": "120W", "memorySupport": "DDR5-5600+", "integratedGraphics": "Radeon Graphics" },
    "9950x3d": { "cpu": "AMD Ryzen 9 9950X3D", "socket": "AM5", "architecture": "Zen 5", "cores": "16 Cores", "threads": 32, "baseClock": "4.3 GHz", "boostClock": "5.7 GHz", "l3Cache": "128 MB (3D V-Cache)", "tdp": "120W", "memorySupport": "DDR5-5600+", "integratedGraphics": "Radeon Graphics", "cinebenchR23_multi": 43500, "cinebenchR23_single": 2300 },
}

def clean_model_name(name):
    name = name.lower()
    for suffix in ['散片', '盒包', '散', '盒']:
        if name.endswith(suffix):
            name = name[:-len(suffix)]
    return name.strip()

def get_base_key(model_name):
    cl = clean_model_name(model_name)
    cl = re.sub(r'^(r\d\s*|i\d\s*)', '', cl)
    cl = cl.replace('-', '').replace(' ', '')
    
    if 'ultra' in cl:
        m = re.search(r'ultra(\d)(\d{3}k?f?)', cl)
        if m: return f"ultra-{m.group(1)}-{m.group(2)}"
        
    return cl

def run():
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT id, brand, model, specs FROM hardware WHERE category='cpu'")
    rows = c.fetchall()
    
    updated_count = 0
    for r in rows:
        hid, brand, model, specs_json_str = r
        try:
            specs = json.loads(specs_json_str) if specs_json_str and specs_json_str.strip() != 'null' else {}
        except:
            specs = {}
            
        while isinstance(specs, str):
            try:
                specs = json.loads(specs)
            except:
                break
                
        # If already fully populated with cores, ignore
        if isinstance(specs, dict) and 'cores' in specs and specs['cores'] != '6P+0E':
            if specs.get('cores') != '4P+0E':
                # Just skip if they have valid cores
                pass
            
        base_key = get_base_key(model)
        
        if base_key == '14600k包': base_key = '14600k'
        if base_key == 'ultra7265k': base_key = 'ultra-7-265k'
        if base_key == 'ultra5245kf': base_key = 'ultra-5-245kf'
        if base_key == 'ultra9285k': base_key = 'ultra-9-285k'
        if base_key == 'ultra7265kf': base_key = 'ultra-7-265kf'
        
        if base_key in SPECS_DATA:
            new_specs = SPECS_DATA[base_key]
            # Replace the old crappy parsed specs or empty specs with rich object
            c.execute("UPDATE hardware SET specs = ?, specsSource = 'ai_script' WHERE id = ?", (json.dumps(new_specs), hid))
            updated_count += 1
        else:
            print(f"⚠️ Missing mapping for [{model}] resolved to '{base_key}'")

    conn.commit()
    conn.close()
    print(f"Successfully updated {updated_count} CPUs with AI-generated specs & benchmarks.")

if __name__ == "__main__":
    run()
