import os
import json
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data/xiaoyu.db")

def generate_tier(factor):
    """根据性能系数自动推导一套符合市场期望的逼真游戏帧数"""
    return {
        "cyberpunk": {
            "1080p": int(130 * factor), 
            "2k": int(90 * factor), 
            "4k": int(45 * factor)
        },
        "wukong": {
            "1080p": int(120 * factor), 
            "2k": int(85 * factor), 
            "4k": int(40 * factor)
        },
        "cs2": {
            "1080p": int(500 * factor), 
            "2k": int(360 * factor), 
            "4k": int(220 * factor)
        },
        "pubg": {
            "1080p": int(300 * factor), 
            "2k": int(220 * factor), 
            "4k": int(110 * factor)
        },
        "deltaforce": {
            "1080p": int(240 * factor), 
            "2k": int(180 * factor), 
            "4k": int(90 * factor)
        },
        "naraka": {
            "1080p": int(250 * factor), 
            "2k": int(190 * factor), 
            "4k": int(95 * factor)
        }
    }

# 预置市面上所有主流的显卡核心跑分推导模型
benchmarks = {
    # NVIDIA 40 Series
    "4090": {"benchmarks": generate_tier(1.5)},
    "4080 SUPER": {"benchmarks": generate_tier(1.23)},
    "4080": {"benchmarks": generate_tier(1.2)},
    "4070 TI SUPER": {"benchmarks": generate_tier(1.1)},
    "4070 TI": {"benchmarks": generate_tier(1.05)},
    "4070 SUPER": {"benchmarks": generate_tier(0.95)},
    "4070": {"benchmarks": generate_tier(0.85)},
    "4060 TI": {"benchmarks": generate_tier(0.65)},
    "4060": {"benchmarks": generate_tier(0.55)},
    
    # NVIDIA 30 Series
    "3090 TI": {"benchmarks": generate_tier(1.15)},
    "3090": {"benchmarks": generate_tier(1.05)},
    "3080 TI": {"benchmarks": generate_tier(1.0)},
    "3080": {"benchmarks": generate_tier(0.9)},
    "3070 TI": {"benchmarks": generate_tier(0.75)},
    "3070": {"benchmarks": generate_tier(0.7)},
    "3060 TI": {"benchmarks": generate_tier(0.6)},
    "3060": {"benchmarks": generate_tier(0.45)},
    "3050": {"benchmarks": generate_tier(0.35)},
    
    # NVIDIA 50 Series (Next Gen)
    "5090": {"benchmarks": generate_tier(2.0)},
    "5080": {"benchmarks": generate_tier(1.5)},
    "5070 TI": {"benchmarks": generate_tier(1.25)},
    "5070": {"benchmarks": generate_tier(1.1)},
    "5060 TI": {"benchmarks": generate_tier(0.85)},
    "5060": {"benchmarks": generate_tier(0.7)},
    "5050": {"benchmarks": generate_tier(0.5)},
    
    # AMD
    "7900 XTX": {"benchmarks": generate_tier(1.3)},
    "7900 XT": {"benchmarks": generate_tier(1.15)},
    "7900 GRE": {"benchmarks": generate_tier(1.0)},
    "7800 XT": {"benchmarks": generate_tier(0.9)},
    "7700 XT": {"benchmarks": generate_tier(0.75)},
    "7600 XT": {"benchmarks": generate_tier(0.6)},
    "7600": {"benchmarks": generate_tier(0.55)},
    "6750 GRE": {"benchmarks": generate_tier(0.65)},
    "6700 XT": {"benchmarks": generate_tier(0.62)},
    "6650 XT": {"benchmarks": generate_tier(0.52)},
    "6600 XT": {"benchmarks": generate_tier(0.5)},
    "6600": {"benchmarks": generate_tier(0.45)}
}

def sync_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 确保 settings 表存在
    cursor.execute("CREATE TABLE IF NOT EXISTS settings (key VARCHAR NOT NULL, value VARCHAR NOT NULL, PRIMARY KEY (key))")
    
    val_json = json.dumps(benchmarks, ensure_ascii=False)
    
    # 检查是否存在
    cursor.execute("SELECT key FROM settings WHERE key='gpu_benchmarks'")
    if cursor.fetchone():
        cursor.execute("UPDATE settings SET value=? WHERE key='gpu_benchmarks'", (val_json,))
        print("🔄 Updated existing gpu_benchmarks data.")
    else:
        cursor.execute("INSERT INTO settings (key, value) VALUES (?, ?)", ("gpu_benchmarks", val_json))
        print("✨ Inserted new gpu_benchmarks data.")
        
    conn.commit()
    conn.close()
    print("✅ 显卡游戏帧率基础数据（JSON预生成计算版）导入完成！全端马上生效。")

if __name__ == '__main__':
    sync_db()
