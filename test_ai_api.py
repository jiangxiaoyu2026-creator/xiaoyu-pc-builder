from server_py.services.ai_service import AiService
from server_py.db import get_session
from sqlmodel import Session, create_engine
import json

engine = create_engine("sqlite:////Users/mac/new/data/xiaoyu.db")

def test_ai_logic():
    with Session(engine) as session:
        service = AiService(session)
        prompt = "我想配一台 DDR4 的机器，用 i5-13600KF"
        print(f"Generating build for prompt: {prompt}")
        
        try:
            result = service.generate_build(prompt)
            
            items = result.get("items", {})
            for cat, item in items.items():
                print(f"Category: {cat}")
                print(f"  Model: {item.get('model')}")
                print(f"  Specs: {item.get('specs')}")
                print(f"  Specs Type: {type(item.get('specs'))}")
                print("-" * 20)
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_ai_logic()
