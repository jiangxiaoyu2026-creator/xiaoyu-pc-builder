from sqlmodel import Session
import os, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server_py.db import engine
from server_py.services.ai_service import AiService
from server_py.models import Setting
import traceback

def test_ai():
    try:
        with Session(engine) as session:
            setting = session.get(Setting, "aiSettings")
            if setting:
                print("DB aiSettings:", setting.value)
            else:
                print("No aiSettings in DB")
                
            service = AiService(session)
            print("Model initialized:", service.model)
            if not service.client:
                print("Client is NOT initialized.")
                return
            
            print("Sending test generation...")
            res = service.generate_build("我要一台能玩黑神话悟空的电脑，预算6000")
            print("Result:", res)
    except Exception as e:
        print("Error:")
        traceback.print_exc()

if __name__ == "__main__":
    test_ai()
