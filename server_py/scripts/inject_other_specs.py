import sqlite3
import json
import re

db_path = "/Users/mac/new/data/xiaoyu.db"

def infer_specs(category, brand, model_raw):
    model = model_raw.upper()
    specs = {}
    
    if category == 'gpu':
        # Default fallback
        specs['length'] = "300mm"
        
        gpu_chip = None
        vram = None
        # Extract Chip
        chips = ['5090','5080','5070TI','5070','5060TI','5060','5050',
                 '4090','4080TI','4080SUPER','4080','4070TI SUPER','4070TI','4070SUPER','4070','4060TI','4060',
                 '3060TI','3060','3050',
                 '7900XTX','7900XT','7900GRE','7800XT','7700XT','7600XT','6750GRE','RX580']
        
        for chip in chips:
            if chip in model.replace(' ', ''):
                gpu_chip = chip
                break
                
        if gpu_chip:
            specs['gpuChip'] = gpu_chip
            
            # Predict length by class
            if gpu_chip in ['5090', '4090']: specs['length'] = "340mm"; specs['recommendedPowerSupply'] = "1000W"
            elif gpu_chip in ['5080', '4080', '4080SUPER', '7900XTX']: specs['length'] = "330mm"; specs['recommendedPowerSupply'] = "850W"
            elif gpu_chip in ['5070', '4070TI', '4070SUPER', '4070', '7900XT']: specs['length'] = "310mm"; specs['recommendedPowerSupply'] = "750W"
            elif gpu_chip in ['5060TI', '4060TI', '6750GRE']: specs['length'] = "280mm"; specs['recommendedPowerSupply'] = "550W"
            elif gpu_chip in ['5060', '5050', '4060', '3060', '3050']: specs['length'] = "250mm"; specs['recommendedPowerSupply'] = "500W"
            
        # VRAM Extraction (e.g., 8G, 12GB, 16G, 24G)
        vma = re.search(r'(\d+)\s*G', model)
        if vma:
            specs['vramCapacity'] = f"{vma.group(1)}GB"
            
    elif category == 'mainboard':
        # Socket & Memory Type (Copied and enhanced from inner logic)
        if any(chip in model for chip in ['X870', 'B850', 'B840', 'B650', 'X670', 'A620']): specs['socket'] = 'AM5'; specs['memoryType'] = 'DDR5'
        elif any(chip in model for chip in ['B550', 'X570', 'B450', 'A520', 'A320']): specs['socket'] = 'AM4'; specs['memoryType'] = 'DDR4'
        elif any(chip in model for chip in ['Z890', 'B860', 'H810']): specs['socket'] = 'LGA1851'; specs['memoryType'] = 'DDR5'
        elif any(chip in model for chip in ['Z790', 'B760', 'Z690', 'B660', 'H610', 'Z590', 'B560', 'H510']): 
            specs['socket'] = 'LGA1700'
            specs['memoryType'] = 'DDR4' if 'D4' in model or 'DDR4' in model else 'DDR5'
            
        # Form Factor
        if ' ITX' in model or 'ITX' in model or 'I-TX' in model: specs['formFactor'] = 'ITX'
        elif re.search(r'B\d{2}0M|H\d{1}10M|Z\d{2}0M|A\d{2}0M', model) or ' M ' in model or model.endswith('M') or ' M.' in model: specs['formFactor'] = 'M-ATX'
        else: specs['formFactor'] = 'ATX'
        
    elif category == 'ram':
        # Memory Type
        if 'DDR5' in model or 'D5' in model: specs['memoryType'] = 'DDR5'
        elif 'DDR4' in model or 'D4' in model: specs['memoryType'] = 'DDR4'
        else: specs['memoryType'] = 'DDR4' # generic fallback
            
        # Capacity extraction (e.g. 16G, 8G*2, 16G*2, 32GB)
        cap_match = re.search(r'(\d+)\s*G(?:\s*[X\*]\s*(\d+))?', model)
        if cap_match:
            gb = int(cap_match.group(1))
            count = int(cap_match.group(2)) if cap_match.group(2) else 1
            specs['capacity'] = f"{gb * count}GB"
            if count > 1: specs['configuration'] = f"{gb}GB x {count}"
            
        # Speed extraction (e.g. 3200, 3600, 6000, 6400)
        spd = re.search(r'(2400|2666|3000|3200|3600|4000|4800|5200|5600|6000|6400|6800|7200|8000)', model)
        if spd: specs['speed'] = f"{spd.group(1)} MHz"

    elif category == 'disk':
        if any(v in model for v in ['NVME', 'M.2', 'PCIE']): specs['interface'] = 'M.2 NVMe'
        elif 'SATA' in model: specs['interface'] = 'SATA 3.0'
        else: specs['interface'] = 'M.2 NVMe' # modern default
            
        # Capacity
        cap_m = re.search(r'(\d+)(TB|T|GB|G)', model)
        if cap_m:
            specs['capacity'] = f"{cap_m.group(1)}{cap_m.group(2).replace('T', 'TB').replace('TBB', 'TB').replace('G', 'GB').replace('GBB', 'GB')}"
            
        if '4.0' in model or 'GEN4' in model: specs['protocol'] = 'PCIe 4.0 x4'
        elif '3.0' in model or 'GEN3' in model: specs['protocol'] = 'PCIe 3.0 x4'
            
    elif category == 'power':
        watt = re.search(r'(\d{3,4})W', model)
        if watt: specs['wattage'] = f"{watt.group(1)}W"
        
        if any(c in model for c in ['ATX3.0', 'ATX3.1', '3.0']): specs['atxVersion'] = 'ATX 3.0'
            
    elif category == 'case':
        if 'ITX' in model: specs['formFactor'] = 'ITX'; specs['maxGpuLength'] = '300mm'; specs['maxCoolerHeight'] = '145mm'
        elif 'ATX' in model and 'M-ATX' not in model: specs['formFactor'] = 'ATX'; specs['maxGpuLength'] = '380mm'; specs['maxCoolerHeight'] = '165mm'
        elif 'M-ATX' in model or 'MATX' in model: specs['formFactor'] = 'M-ATX'; specs['maxGpuLength'] = '330mm'; specs['maxCoolerHeight'] = '160mm'
        else: 
            # generic fallback
            specs['formFactor'] = 'ATX / M-ATX'
            specs['maxGpuLength'] = '340mm'
            specs['maxCoolerHeight'] = '160mm'

    elif category == 'cooling':
        if '360' in model: specs['type'] = '360mm 水冷'; specs['dimensions'] = '360mm'
        elif '240' in model: specs['type'] = '240mm 水冷'; specs['dimensions'] = '240mm'
        else: specs['type'] = '风冷'; specs['height'] = '155mm' # safe default
        
    return specs

def run():
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT id, category, brand, model, specs FROM hardware WHERE category != 'cpu'")
    rows = c.fetchall()
    
    updated_count = 0
    for r in rows:
        hid, cat, brand, model, specs_json_str = r
        try:
            specs = json.loads(specs_json_str) if specs_json_str and specs_json_str.strip() != 'null' else {}
        except:
            specs = {}
            
        while isinstance(specs, str):
            try: specs = json.loads(specs)
            except: break
            
        if not isinstance(specs, dict): specs = {}
        
        # We only override if specs are effectively empty or very sparse (<2 keys)
        if len(specs.keys()) <= 1:
            new_specs = infer_specs(cat, brand, model)
            if new_specs:
                c.execute("UPDATE hardware SET specs = ?, specsSource = 'ai_inferred' WHERE id = ?", (json.dumps(new_specs), hid))
                updated_count += 1

    conn.commit()
    conn.close()
    print(f"Successfully updated {updated_count} peripheral items with pattern-inferred specs.")

if __name__ == "__main__":
    run()
