import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from sqlmodel import Session, select
from models import Hardware
from db import engine

def main():
    with Session(engine) as session:
        cpus = session.exec(select(Hardware).where(Hardware.category == 'cpu')).all()
        updated = 0
        for cpu in cpus:
            if cpu.specs:
                if isinstance(cpu.specs, str):
                    try:
                        specs = json.loads(cpu.specs)
                    except:
                        specs = {}
                else:
                    specs = cpu.specs
                
                if 'benchmarks' in specs and isinstance(specs['benchmarks'], dict):
                    bms = specs.pop('benchmarks')
                    specs.update(bms)
                    cpu.specs = specs
                    session.add(cpu)
                    updated += 1
                    
        if updated > 0:
            session.commit()
            print(f"Successfully flattened benchmarks for {updated} CPUs.")
        else:
            print("No CPUs needed flattening.")

if __name__ == '__main__':
    main()
