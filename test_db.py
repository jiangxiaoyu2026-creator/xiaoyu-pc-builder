import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'server_py'))
from server_py.db import engine
from server_py.models import RecyclingPrice
from sqlmodel import Session, select, func

with Session(engine) as session:
    count = session.scalar(select(func.count()).select_from(RecyclingPrice))
    print(f"Total records in DB: {count}")
    
    # search 13600
    res = session.exec(select(RecyclingPrice).where(RecyclingPrice.model.ilike("%13600%")).limit(5)).all()
    print("\n--- Found for 13600 (CPU) ---")
    for r in res:
        print(f"[{r.category}] {r.model} (Recycle: ¥{r.recyclePrice})")
        
    # search 4060
    res2 = session.exec(select(RecyclingPrice).where(RecyclingPrice.model.ilike("%4060%")).limit(5)).all()
    print("\n--- Found for 4060 (GPU) ---")
    for r in res2:
        print(f"[{r.category}] {r.model} (Recycle: ¥{r.recyclePrice})")
    
    # search ram
    res3 = session.exec(select(RecyclingPrice).where(RecyclingPrice.category == "ram").limit(3)).all()
    print("\n--- Sample RAM ---")
    for r in res3:
        print(f"[{r.category}] {r.model} (Recycle: ¥{r.recyclePrice})")
