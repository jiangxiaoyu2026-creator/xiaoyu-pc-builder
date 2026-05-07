import sys
import os
import logging
from datetime import datetime

# Adjust Python path to load server_py modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from server_py.db import engine
from sqlmodel import Session, select
from server_py.models import Hardware, PriceHistory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    logger.info("Starting ghost products fix...")
    
    with Session(engine) as session:
        # Find all active products with price = 0
        statement = select(Hardware).where(Hardware.status == "active", Hardware.price == 0)
        ghost_products = session.exec(statement).all()
        
        count = len(ghost_products)
        logger.info(f"Found {count} ghost products (price=0, status=active)")
        
        if count == 0:
            logger.info("No ghost products to fix.")
            return

        for product in ghost_products:
            logger.info(f"Archiving product: {product.brand} {product.model} ({product.id})")
            product.status = "archived"
            session.add(product)
            
            # Record the archival in PriceHistory
            from datetime import timedelta
            now_cst = (datetime.utcnow() + timedelta(hours=8)).isoformat()
            
            ph = PriceHistory(
                hardwareId=product.id,
                hardwareName=f"{product.brand} {product.model}",
                category=product.category,
                oldPrice=product.previousPrice if product.previousPrice else 0,
                newPrice=0,
                changeAmount=0,
                changePercent=0,
                changedAt=now_cst
            )
            session.add(ph)
            
        session.commit()
        logger.info("Successfully archived all ghost products and recorded in PriceHistory.")

if __name__ == "__main__":
    main()
