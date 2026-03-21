from sqlmodel import Session
import os, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server_py.db import engine
from server_py.services.ai_service import AiService
from server_py.models import Setting
import traceback

def test_ai():
    with open('/tmp/ai_test_output.txt', 'w') as f:
        try:
            with Session(engine) as session:
                setting = session.get(Setting, "aiSettings")
                if setting:
                    f.write(f"DB aiSettings: {setting.value}\n")
                    
                service = AiService(session)
                f.write(f"Model initialized: {service.model}\n")
                if not service.client:
                    f.write("Client is NOT initialized.\n")
                    return
                
                f.write("Sending test generation...\n")
                res = service.generate_build("我要一台能玩黑神话悟空的电脑，预算6000")
                f.write(f"Result: {res}\n")
        except Exception as e:
            f.write("Error:\n")
            f.write(traceback.format_exc())

if __name__ == "__main__":
    test_ai()
