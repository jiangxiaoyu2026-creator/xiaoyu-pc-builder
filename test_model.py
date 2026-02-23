import sys
sys.path.append('.')
from server_py.models import ChatSession
import json

c = ChatSession(id="123", userName="Guest")
print(c.dict())
