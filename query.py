import json, sys; sys.path.append('server_py'); from models import get_session, Hardware; s = next(get_session()); h = s.query(Hardware).first(); print(h.model_dump())
