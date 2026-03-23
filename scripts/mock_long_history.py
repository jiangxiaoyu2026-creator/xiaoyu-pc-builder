import sys
import os
import random
from datetime import datetime, timedelta

# Add parent dir to path to import server_py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server_py.db import get_session, engine
from server_py.models import Hardware, PriceHistory
from sqlmodel import Session, select

def mock_history():
    print("开始生成近 40 天的随机跌涨行情记录...")
    with Session(engine) as session:
        # 获取所有上架硬件
        hardwares = session.exec(select(Hardware).where(Hardware.status == "active")).all()
        if not hardwares:
            print("没有活跃的硬件，退出。")
            return
            
        print(f"找到 {len(hardwares)} 个硬件，准备注入跳水数据...")
        
        # 删除原有的所有历史记录（为了看清纯净的走势）
        existing = session.exec(select(PriceHistory)).all()
        for e in existing:
            session.delete(e)
        session.commit()
        
        now = datetime.utcnow()
        records_added = 0
        
        for hw in hardwares:
            # 只挑总库的一半商品做波动，其他的价格不动
            if random.random() > 0.5:
                continue
                
            current_price = hw.price
            
            # 从 40 天前开始推演
            start_date = now - timedelta(days=40)
            
            # 每个商品可能变价 5-15 次
            times = random.randint(5, 15)
            # 随机生成变价点（按时间线升序）
            change_days = sorted(random.sample(range(1, 40), times))
            
            last_price = current_price * (1.0 + random.uniform(-0.1, 0.2)) # 40天前的假象起始价
            
            for day_offset in change_days:
                changed_at = start_date + timedelta(days=day_offset)
                
                # 随机涨跌幅 -5% 到 +3% (偏向于降价/跳水)
                change_pct = random.uniform(-0.05, 0.03)
                new_price = round(last_price * (1 + change_pct), 2)
                change_amt = round(new_price - last_price, 2)
                
                # 创建一条历史记录
                record = PriceHistory(
                    hardwareId=hw.id,
                    hardwareName=f"{hw.brand} {hw.model}",
                    category=hw.category,
                    oldPrice=last_price,
                    newPrice=new_price,
                    changeAmount=change_amt,
                    changePercent=round(change_pct * 100, 2),
                    changedAt=changed_at.isoformat()
                )
                session.add(record)
                records_added += 1
                
                last_price = new_price
                
            # 更新当下的基准售价为最后一次变动
            hw.price = last_price
            session.add(hw)
            
        session.commit()
        print(f"成功注入 {records_added} 条真假难辨的跳水打折历史记录！现在你有一个可以分析月报的数据库了。")

if __name__ == "__main__":
    mock_history()
