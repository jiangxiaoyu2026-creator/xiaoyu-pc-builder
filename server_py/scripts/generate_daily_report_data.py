import sys
import os
import json
from datetime import datetime, timedelta

# Allow importing from server_py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import engine
from sqlmodel import Session, select
from models import Hardware, PriceHistory

def categorize_item(item: Hardware):
    cat = item.category
    subcat = "Others"
    brand = item.brand.upper()
    model = item.model.upper()
    
    if cat == "cpu":
        if "INTEL" in brand or "CORE" in model or "I" in model[:2] or model.startswith("1") or model.startswith("2"):
            subcat = "Intel"
        elif "AMD" in brand or "RYZEN" in model or "R" in model[:2] or model.startswith("5") or model.startswith("7") or model.startswith("9"):
            subcat = "AMD"
    elif cat == "ram":
        if "DDR5" in model or " D5" in model or "6000" in model or "6400" in model or "6800" in model or "7200" in model:
            subcat = "DDR5"
        elif "DDR4" in model or " D4" in model or "3200" in model or "3600" in model or "2666" in model:
            subcat = "DDR4"
    elif cat == "disk":
        if "1T" in model:
            subcat = "1TB"
        elif "2T" in model:
            subcat = "2TB"
            
    return cat, subcat

def get_report_data():
    from sqlmodel import func
    with Session(engine) as session:
        now = datetime.utcnow() + timedelta(hours=8)
        
        # Find the latest change in the DB to simulate "today" for demo data
        max_date_str = session.exec(select(func.max(PriceHistory.changedAt))).first()
        if max_date_str:
            max_date = datetime.fromisoformat(max_date_str[:19]) # handle fractional seconds if necessary
            today_start = max_date.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            seven_days_ago = (max_date - timedelta(days=7)).isoformat()
        else:
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            seven_days_ago = (now - timedelta(days=7)).isoformat()
        
        hardware_list = session.exec(select(Hardware).where(Hardware.status == 'active')).all()
        
        recent_changes = session.exec(select(PriceHistory).where(PriceHistory.changedAt >= seven_days_ago)).all()
        today_changes = [c for c in recent_changes if c.changedAt >= today_start]
        
        stats = {}
        for h in hardware_list:
            cat, subcat = categorize_item(h)
            if cat not in stats:
                stats[cat] = {"subcats": {}}
            if subcat not in stats[cat]["subcats"]:
                stats[cat]["subcats"][subcat] = {"items": []}
            
            # 7 day changes
            item_name = f"{h.brand} {h.model}"
            item_changes = [c for c in recent_changes if c.hardwareName == item_name or c.hardwareId == h.id]
            change_amt_7d = sum(c.changeAmount for c in item_changes)
            change_pct_7d = (change_amt_7d / (h.price - change_amt_7d)) * 100 if (h.price - change_amt_7d) > 0 else 0
            
            # Today changes
            item_today_changes = [c for c in today_changes if c.hardwareName == item_name or c.hardwareId == h.id]
            change_amt_today = sum(c.changeAmount for c in item_today_changes)
            
            stats[cat]["subcats"][subcat]["items"].append({
                "id": h.id,
                "name": f"{h.brand} {h.model}",
                "price": h.price,
                "change_7d": change_amt_7d,
                "change_pct_7d": change_pct_7d,
                "change_today": change_amt_today
            })
            
        report = {}
        top_anomalies = {"highs": [], "lows": []}
        
        for cat, data in stats.items():
            report[cat] = {}
            for subcat, subdata in data["subcats"].items():
                items = subdata["items"]
                if not items: continue
                avg_p = sum(i["price"] for i in items) / len(items)
                avg_c7 = sum(i["change_7d"] for i in items) / len(items)
                avg_cp7 = sum(i["change_pct_7d"] for i in items) / len(items)
                
                # Sort to find outliers
                sorted_by_drop = sorted(items, key=lambda x: x["change_today"])
                
                report[cat][subcat] = {
                    "count": len(items),
                    "avg_price": round(avg_p, 2),
                    "avg_7d_change_amt": round(avg_c7, 2),
                    "avg_7d_change_pct": round(avg_cp7, 2),
                    "top_drop_today": sorted_by_drop[0] if sorted_by_drop and sorted_by_drop[0]["change_today"] < 0 else None,
                    "top_rise_today": sorted_by_drop[-1] if sorted_by_drop and sorted_by_drop[-1]["change_today"] > 0 else None,
                    "top_drop_7d": sorted(items, key=lambda x: x["change_7d"])[0] if items and sorted(items, key=lambda x: x["change_7d"])[0]["change_7d"] < 0 else None
                }
                
                for item in items:
                    # Capture significant anomalies for narrative
                    if item["change_today"] <= -50 or item["change_7d"] <= -100:
                        top_anomalies["lows"].append({"cat": cat, **item})
                    if item["change_today"] >= 50 or item["change_7d"] >= 100:
                        top_anomalies["highs"].append({"cat": cat, **item})

        top_anomalies["lows"] = sorted(top_anomalies["lows"], key=lambda x: x["change_7d"])[:5]
        top_anomalies["highs"] = sorted(top_anomalies["highs"], key=lambda x: x["change_7d"], reverse=True)[:5]
        
        return {
            "date": now.strftime("%Y-%m-%d"),
            "summary": report,
            "anomalies": top_anomalies
        }

if __name__ == "__main__":
    print(json.dumps(get_report_data(), ensure_ascii=False, indent=2))
