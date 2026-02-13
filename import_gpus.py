
import sqlite3
import uuid
import json
from datetime import datetime
import re

# Database path
DB_PATH = "data/xiaoyu.db"

# GPU data: (Price, Brand, Model)
gpus_data = [
    # Image 1
    (2700, "技嘉", "RTX5060 Eagle OC 8G 冰猎鹰"),
    (3199, "微星", "5060Ti魔龙 oc 8g"),
    (3350, "华硕", "TX-RTX5060Ti-O8G"),
    (1480, "华硕", "3050剪影"),
    (7950, "七彩虹", "IGAME 5070Ti 火神 X OC 16G"),
    (5300, "华硕", "ATS RTX5070 O12G V2 GAMING巨幕蓝"),
    (3280, "华硕", "ATS RTX5060TI O8G V2 GAMING巨幕粉"),
    (2790, "华硕", "ATS RTX5060 O8G V2 GAMING巨幕蓝"),
    (19300, "七彩虹", "IGAME 5090D ADOC 24G V2"),
    (19700, "七彩虹", "IGAME 5090D 冰火神OC 24G V2"),
    (19700, "七彩虹", "IGAME 5090D 黑火神OC 24G V2"),
    (5130, "瀚铠", "9070XT 猎杀者"),
    (5130, "瀚铠", "9070XT 星空"),
    (5130, "瀚铠", "9070XT 海外版"),
    (5130, "瀚铠", "9070XT 海外版白"),
    (1899, "瀚铠", "7650GRE 白爱"),
    (1870, "瀚铠", "7650GRE 黑爱"),
    (4899, "盈通", "RTX5070 踏雪OC"),
    (2650, "盈通", "RTX5060 踏雪OC"),
    (299, "铭瑄", "GT730 4G"),
    (0, "盈通", "RTX5060 踏雪OC"),
    (0, "华硕", "PRIME RTX5050 O8G"),
    (2180, "华硕", "DUAL RTX5050 O8G"),
    (3070, "盈通", "RTX 5060TI-8G游戏高手X2 OC白"),
    (2380, "华硕", "PRIME 5060XT O8G"),
    (0, "华硕", "DUAL 5060XT 8G"),
    (3200, "蓝宝石", "9060XT 16G脉动"),
    (2950, "蓝宝石", "9060XT 16G白酷"),
    (2950, "蓝宝石", "9060XT 16G银河"),
    (2320, "蓝宝石", "9060XT 8G脉动"),
    (2270, "蓝宝石", "9060XT 8G白酷"),
    (1930, "盈通", "RTX5050战风"),
    (2300, "七彩虹", "5050ULTRA OC W 8G"),
    (2250, "七彩虹", "5050ULTRA OC W DUO"),
    (2220, "七彩虹", "战斧5050 8G豪华版"),
    (2200, "七彩虹", "战斧5050 8G DUO"),
    (7100, "华硕", "PRIME RTX5070Ti O16G大师"),
    (7550, "华硕", "TUF 5070Ti GAMING O16G白色"),
    (4650, "盈通", "RTX5070 战风OC 二代"),
    (3030, "盈通", "RTX5060Ti战风OC 8G"),
    (2400, "盈通", "RTX5060 战风OC"),
    (2700, "华硕", "DUAL RTX5060 O8G雪豹"),
    (2780, "华硕", "PRIME RTX5060 O8G大师"),
    (2930, "华硕", "TX RTX5060 O8G天选"),
    (3150, "华硕", "TUFF RTX5060 O8G GAMING"),
    (2850, "影驰", "5060 金属大师 白金版 8G"),
    (2800, "影驰", "5060 金属大师 黑金版 8G"),
    (2770, "影驰", "5060 大将 8G"),
    (2750, "影驰", "5060 骁将 8G"),
    (2900, "七彩虹", "5060 ADOC"),
    (2900, "七彩虹", "5060 ULTRA OC W 8G"),
    (2800, "七彩虹", "5060 ULTRA OC W DUO"),
    (2800, "七彩虹", "战斧5060 8G豪华版"),
    (2750, "七彩虹", "战斧5060 8G DUO"),
    (0, "影驰", "RTX5080金属大师白金版OC"),
    (0, "影驰", "RTX5080金属大师黑金版OC"),
    (0, "影驰", "RTX5080大将OC"),
    (0, "影驰", "RTX5080骁将OC"),
    (7250, "影驰", "RTX5070TI 金属大师白金版OC 白色"),
    (7200, "影驰", "RTX5070TI 金属大师黑金版OC"),
    (7050, "影驰", "RTX5070TI 大将OC"),
    (0, "影驰", "RTX5070TI 骁将OC"),
    (0, "影驰", "RTX5070 金属大师白金版"),
    (5250, "影驰", "RTX5070 金属大师黑金版"),
    (5200, "影驰", "RTX5070 大将OC"),
    (5150, "影驰", "RTX5070 骁将OC"),
    (4250, "影驰", "RTX5060TI金属大师白金MAX OC 16G"),
    (4200, "影驰", "RTX5060TI金属大师黑金MAX OC 16G"),
    (4150, "影驰", "RTX5060TI 大将MAX OC 16G"),
    (4100, "影驰", "RTX5060TI 骁将MAX OC 16G"),
    (3350, "影驰", "RTX5060TI金属大师白金 OC 8G"),
    (3330, "影驰", "RTX5060TI金属大师黑金 OC 8G"),
    (3300, "影驰", "RTX5060TI 大将OC"),
    (3250, "影驰", "RTX5060TI 骁将OC"),
    (3180, "华硕", "DUAL RTX5060TI O8G雪豹"),
    (3300, "华硕", "PRIME RTX5060TI O8G大师"),
    (3750, "华硕", "TUF RTX5060TI O8G GAMING"),
    (3980, "华硕", "DUAL RTX5060TI O16G雪豹"),
    (4150, "华硕", "PRIME RTX5060TI O16G大师"),
    (4450, "华硕", "TUF RTX5060TI O16G GAMING"),
    (4000, "技嘉", "RTX5060TI WF2 16G 风魔"),
    (4050, "技嘉", "RTX5060TI Eagle OC 16G 猎鹰"),
    (4100, "技嘉", "RTX5060TI Eagle OC 16G 冰猎鹰"),
    (4250, "技嘉", "RTX5060TI GAMING OC 16G 魔鹰"),
    (4300, "技嘉", "RTX5060TI AERO OC 16G 雪鹰"),
    (4650, "技嘉", "RTX5060TI 16G小雕"),
    (3250, "技嘉", "RTX5060TI WF2 8G 风魔"),
    (3300, "技嘉", "RTX5060TI Eagle OC 8G 猎鹰"),
    (3300, "技嘉", "RTX5060TI Eagle OC 8G 冰猎鹰"),
    (3450, "技嘉", "RTX5060TI GAMING OC 8G 魔鹰"),
    (3500, "技嘉", "RTX5060TI AERO OC 8G 雪鹰"),
    (3480, "微星", "RTX5060TI 便捷16G"),
    (3830, "微星", "RTX5060TI 万图师16G"),
    (0, "微星", "RTX5060TI 神龙16G"),
    (3200, "微星", "RTX5060TI 万图师8G 3X"),
    (3180, "微星", "RTX5060TI 便捷8G"),
    (3450, "微星", "RTX5060TI 游戏8G"),
    (0, "七彩虹", "IGAME 5060TI ADOC 16G"),
    (4200, "七彩虹", "IGAME 5060TI ULTRA OC W 16G"),
    # Image 2
    (3950, "七彩虹", "IGAME 5060TI ULTRA OC W DUO 16G"),
    (4050, "七彩虹", "战斧5060TI 豪华版 16G"),
    (3950, "七彩虹", "战斧5060TI DUO 16G"),
    (3450, "七彩虹", "IGAME 5060TI ADOC 8G"),
    (3400, "七彩虹", "IGAME 5060TI ULTRA OC W 8G"),
    (3250, "七彩虹", "IGAME 5060TI ULTRA OC W DUO 8G"),
    (3300, "七彩虹", "战斧5060TI 豪华 8G"),
    (3250, "七彩虹", "战斧5060TI DUO 8G"),
    (750, "蓝箭", "A380 Index 6G 黑"),
    (5000, "瀚铠", "9070XT 16G 猎鹰"),
    (5000, "瀚铠", "9070XT 16G 猎鹰白"),
    (5600, "蓝宝石", "RX9070XT 16G 猎鹰"),
    (20200, "微星", "RTX5090D 典藏 参考价"),
    (26000, "华硕", "TUF RTX5090D O32G GAMING"),
    (30000, "华硕", "ROG RTX5090D O32G GAMING 夜神 参考价"),
    (7700, "技嘉", "RTX5070TI 猎鹰"),
    (5150, "技嘉", "RTX5070 OC 12G 风魔"),
    (0, "华硕", "TUF RX9070 O16G GAMING"),
    (4950, "华硕", "PRIME RX9070 O16G"),
    (5250, "华硕", "PRIME RX9070XT O16G"),
    (0, "华硕", "TUF 9070XT O16G GAMING"),
    (4680, "微星", "RTX5070 建议师"),
    (4950, "微星", "RTX5070 尊龙"),
    (0, "微星", "RTX5070 12G白龙"),
    (5200, "微星", "RTX5070 12G神龙"),
    (5150, "华硕", "PRIME RTX5070 O12G"),
    (5200, "华硕", "TUF RTX5070 O12G GAMING"),
    (5300, "技嘉", "RTX5070 OC 12G猎鹰"),
    (5400, "技嘉", "RTX5070 OC 12G冰猎鹰"),
    (5500, "技嘉", "RTX5070 OC 12G魔鹰"),
    (5600, "技嘉", "RTX5070 OC 12G雪鹰"),
    (6100, "技嘉", "RTX5070 OC 12G超级雕"),
    (0, "七彩虹", "IGAME 5070 VULCAN W OC火神"),
    (5350, "七彩虹", "IGAME 5070 ADOC 12G"),
    (5250, "七彩虹", "IGAME 5070 ULTRA OC W 12G"),
    (5150, "七彩虹", "战斧5070 豪华 12G"),
    (9700, "万丽", "5080 16G 暴风"),
    (9950, "万丽", "5080 16G 繁星"),
    (0, "万丽", "5080 16G 雪抓"),
    (0, "万丽", "5080 16G 星云"),
    (8300, "万丽", "5070Ti 16G 暴风"),
    (7350, "万丽", "5070Ti 16G 繁星"),
    (6850, "万丽", "5070Ti 16G 雪狐"),
    (6699, "万丽", "5070Ti 16G 星云"),
    (0, "华硕", "RTX5090D O32G 超级雕白 参考价"),
    (0, "华硕", "RTX5090D O32G 超级雕 参考价"),
    (0, "华硕", "RTX5090D O32G 魔鹰"),
    (0, "华硕", "RTX5090D O32G 猎鹰 参考价"),
    (7100, "华硕", "RTX5070Ti 风魔 参考价"),
    (7200, "华硕", "RTX5070Ti 16G 猎鹰 参考价"),
    (7300, "华硕", "RTX5070Ti 16G 冰猎鹰 参考价"),
    (7800, "华硕", "RTX5070Ti 16G 魔鹰 参考价"),
    (0, "技嘉", "RTX5070Ti AORUS M 16G 超级雕 参考价"),
    (6650, "赛普", "RTX5070Ti 16G 万图师 参考价"),
    (6850, "赛普", "RTX5070Ti 16G 经典 参考价"),
    (7400, "赛普", "RTX5070Ti 16G 魔龙 参考价"),
    (8100, "赛普", "RTX5070Ti 16G 神龙 参考价"),
    (8900, "华硕", "ROG RTX5070TI O16G"),
    (7600, "华硕", "TUF RTX5070TI O16G GAMING"),
    (0, "七彩虹", "IGAME 5070TI AD OC 16G"),
    (7400, "七彩虹", "IGAME 5070TI ULTRA W OC 16G"),
    (6950, "七彩虹", "IGAME 5070TI 战斧 16G SFF"),
    (1800, "蓝宝石", "RX7650GRE 白企"),
    (1900, "华硕", "ATS RX7650GRE O8G内传价"),
    (0, "赛普", "RTX4060TI 游戏 8G"),
    (9650, "华硕", "PRIME RTX5080 O16G 参考价"),
    (10200, "华硕", "TUF RTX5080 O16G GAMING 参考价"),
    (14600, "华硕", "ROG RTX5080 O16G GAMING 夜神 参考价"),
    (0, "赛普", "RTX4070 VENTUS 3X 12G OC 万图师"),
    (11900, "技嘉", "RTX5080 AORUS M ICF 16G 超级雕 参考价"),
    (0, "技嘉", "RTX5080 AORUS M 16G 超级雕 参考价"),
    (9700, "技嘉", "RTX5080 AERO OC 16G 雪鹰 参考价"),
    (10200, "技嘉", "RTX5080 GAMING OC 16G 魔鹰 参考价"),
    (9400, "技嘉", "RTX5080 WF3OC 16G 风魔 参考价"),
    (2950, "盈通", "RX7700XT 12GD6 全白"),
    (0, "七彩虹", "IGAME 5090D ADOC 32G 参考价"),
    (0, "七彩虹", "IGAME 5090D 黑火神OC 32G 参考价"),
    (0, "七彩虹", "IGAME 5090D 冰火神OC 32G 参考价"),
    (0, "七彩虹", "IGAME 5080 水神OC 16G 参考价"),
    (11000, "七彩虹", "IGAME 5080 黑火神OC 16G 参考价"),
    (9850, "七彩虹", "IGAME 5080 ADOC 16G 参考价"),
    (9350, "七彩虹", "IGAME 5080 ULTRA OC 16G 参考价"),
    (8750, "微星", "RTX5080 16G 3X OC PLUS 万图师 参考价"),
    (8950, "微星", "RTX5080 16G 3X OC 尊贵 参考价"),
    (9850, "微星", "RTX5080 16G GAMING OC 魔龙 参考价"),
    (10500, "微星", "RTX5080 16G GAMING OC 白龙 参考价"),
    (11200, "微星", "RTX5080 16G VANGUARD 神龙 参考价"),
    (12300, "微星", "RTX5080 16G SUPRIM SOC 超龙 参考价")
]

def parse_specs(model):
    m = model.upper()
    vram = 8
    wattage = 550
    performance = "1080P/2K 畅玩"
    length = 280
    
    # VRAM
    vram_match = re.search(r'(\d+)\s*G', m)
    if vram_match:
        vram = int(vram_match.group(1))
    
    # Wattage and Tier Heuristics
    if "5090" in m or "4090" in m:
        wattage = 1000
        performance = "4K 极致体验"
        length = 340
    elif "5080" in m or "4080" in m:
        wattage = 850
        performance = "4K 流畅运行"
        length = 330
    elif "5070TI" in m or "4070TI" in m or "9070XT" in m:
        wattage = 750
        performance = "2K/4K 畅玩"
        length = 310
    elif "5070" in m or "4070" in m:
        wattage = 650
        performance = "2K 极致画质"
        length = 300
    elif "5060TI" in m or "4060TI" in m or "9060XT" in m or "3070" in m:
        wattage = 600
        performance = "2K 流畅"
        length = 290
    elif "5060" in m or "4060" in m or "3060" in m:
        wattage = 550
        performance = "1080P/2K 畅玩"
        length = 260
    elif "5050" in m or "3050" in m or "7650" in m:
        wattage = 450
        performance = "1080P 畅聊"
        length = 240
        
    return {
        "wattage": wattage,
        "maxWattage": int(wattage * 0.4), # heuristic
        "performance": performance,
        "length": length,
        "memorySize": vram
    }

def import_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    count = 0
    seen = set()
    
    for price, brand, model in gpus_data:
        key = (brand, model)
        if key in seen:
            continue
        seen.add(key)
        
        id = str(uuid.uuid4())
        specs = parse_specs(model)
        
        cursor.execute("""
            INSERT INTO hardware (id, category, brand, model, price, status, sortOrder, specs, createdAt, isDiscount, isRecommended, isNew)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (id, "gpu", brand, model, float(price), "active", 100, json.dumps(specs, ensure_ascii=False), now, False, False, False))
        count += 1
        
    conn.commit()
    conn.close()
    print(f"Successfully imported {count} GPU products.")

if __name__ == "__main__":
    import_data()
