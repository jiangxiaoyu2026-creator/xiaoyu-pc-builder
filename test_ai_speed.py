import asyncio
import time
import json
from sqlmodel import Session
from server_py.db import engine
from server_py.services.ai_service import AiService
from server_py.models import Setting

def test_ai():
    with Session(engine) as session:
        setting = session.get(Setting, "aiSettings")
        if setting:
            print(f"Current AI Settings: {setting.value}")
            
        print("\nInitializing AI Service...")
        ai_service = AiService(session)
        
        prompt = "打游戏，预算5000"
        print(f"User Prompt: {prompt}")
        
        start_time = time.time()
        
        try:
            # We also check the size of the inventory being loaded
            budget = 5000
            inventory = ai_service.retrieve_candidates(budget, "gaming", prompt)
            inv_str = json.dumps(inventory, ensure_ascii=False)
            print(f"Inventory Prompt Size: {len(inv_str)} characters")
            
            print("\nGenerating build (waiting for LLM)...")
            result = ai_service.generate_build(prompt)
            end_time = time.time()
            
            print(f"\n--- Result ({end_time - start_time:.2f} seconds) ---")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
            # Basic validation
            if result and "error" not in result:
                total = result.get("totalPrice", 0)
                print(f"Total Price: {total}")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_ai()
