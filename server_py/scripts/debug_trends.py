import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, select
from server_py.db import engine
from server_py.models import Hardware, PriceHistory
from datetime import datetime, timedelta
import collections

with Session(engine) as session:
    now = datetime.utcnow()
    day1_start = (now - timedelta(days=1)).isoformat()
    day7_start = (now - timedelta(days=7)).isoformat()
    
    items = session.exec(select(Hardware).where(Hardware.category == "ram", Hardware.status == "active")).all()
    grouped = collections.defaultdict(list)
    for item in items:
        group_key = f"RAM {item.model.split()[-1] if ' ' in item.model else item.model}"
        grouped[group_key].append(item)
        
    print(f"Total Groups: {len(grouped)}")
    
    # Just look at the first group
    first_group = list(grouped.items())[0]
    hw_list = first_group[1]
    hw_ids = [i.id for i in hw_list]
    print(f"Group: {first_group[0]}, Count: {len(hw_list)}")
    
    current_avg = sum(item.price for item in hw_list) / len(hw_list)
    print(f"Current Avg: {current_avg}")
    
    ph_1day = session.exec(
        select(PriceHistory)
        .where(PriceHistory.hardwareId.in_(hw_ids), PriceHistory.changedAt <= day1_start)
        .order_by(PriceHistory.changedAt.desc())
    ).all()
    print(f"History <= day1: {len(ph_1day)}")
    
    # Evaluate fallback logic
    def get_avg_at_date(day_start):
        total = 0
        for item in hw_list:
            # First, check if there's a record <= day_start
            ph_before = session.exec(
                select(PriceHistory)
                .where(PriceHistory.hardwareId == item.id, PriceHistory.changedAt <= day_start)
                .order_by(PriceHistory.changedAt.desc())
            ).first()
            if ph_before:
                total += ph_before.newPrice
                continue
            
            # If not, check if there's a record > day_start
            ph_after = session.exec(
                select(PriceHistory)
                .where(PriceHistory.hardwareId == item.id, PriceHistory.changedAt > day_start)
                .order_by(PriceHistory.changedAt.asc())
            ).first()
            if ph_after:
                total += ph_after.oldPrice
                continue
                
            total += item.price
        return total / len(hw_list)

    avg_1 = get_avg_at_date(day1_start)
    avg_7 = get_avg_at_date(day7_start)
    
    print(f"Avg 1 day ago: {avg_1}")
    print(f"Avg 7 days ago: {avg_7}")
    
