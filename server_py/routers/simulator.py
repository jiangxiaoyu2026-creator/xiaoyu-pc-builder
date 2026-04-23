from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import json
import requests
import functools

import re

from ..db import get_session
from ..models import Hardware

router = APIRouter()

class ValidationRequest(BaseModel):
    item_ids: List[str]

def normalize_cpu_name(raw: str) -> str:
    """将数据库中的CPU简称转换为GamePP需要的标准全称"""
    name = raw.strip()
    # 去掉中文后缀（散片、盒装等）
    name = re.sub(r'[散盒]片.*$', '', name)
    name = re.sub(r'[\u4e00-\u9fff]+', '', name).strip()
    # 去掉品牌前缀
    name = re.sub(r'^(intel|amd)\s*', '', name, flags=re.IGNORECASE).strip()
    
    # 标准化型号格式
    upper = name.upper()
    if re.search(r'I[3579]-', upper) or 'CORE' in upper:
        # Intel CPU
        name = re.sub(r'^(core\s*)?', '', name, flags=re.IGNORECASE).strip()
        # 确保有 "Intel Core" 前缀
        if not name.lower().startswith('intel'):
            name = f"Intel Core {name}"
    elif re.search(r'R[3579]-|RYZEN', upper):
        # AMD Ryzen: R5-5600GT -> Ryzen 5 5600GT
        name = re.sub(r'^R(\d)[- ]?', r'Ryzen \1 ', name, flags=re.IGNORECASE)
        name = re.sub(r'^(ryzen\s*)', 'Ryzen ', name, flags=re.IGNORECASE).strip()
        # 确保 Ryzen X 和型号之间用空格而不是横杠
        name = re.sub(r'(Ryzen\s*\d)[-\s]+(\d)', r'\1 \2', name)
        if not name.lower().startswith('amd'):
            name = f"AMD {name}"
    
    return name.strip()

def normalize_gpu_name(raw: str) -> str:
    """将数据库中的GPU简称转换为GamePP需要的标准全称"""
    name = raw.strip()
    # 去掉中文和品牌后缀（如 "影驰"、"七彩虹" 等）
    name = re.sub(r'[\u4e00-\u9fff]+', ' ', name).strip()
    # 去掉显存描述（8G、12G等）
    name = re.sub(r'\s*\d+G\b', '', name, flags=re.IGNORECASE).strip()
    # 去掉 OC, GAMING 等后缀
    name = re.sub(r'\s*(OC|GAMING|EAGLE|VENTUS|DUAL|TRIO|ULTRA|FOUNDER|FE|Ti\s*SUPER)\b', lambda m: ' Ti SUPER' if 'SUPER' in m.group().upper() and 'TI' in m.group().upper() else (' Ti' if m.group().strip().upper() == 'TI' else ''), name, flags=re.IGNORECASE).strip()
    
    # 去掉品牌前缀
    name = re.sub(r'^(nvidia|七彩虹|影驰|微星|华硕|技嘉|索泰|铭瑄|盈通|蓝宝石|讯景|瀚铠)\s*', '', name, flags=re.IGNORECASE).strip()
    
    upper = name.upper()
    # NVIDIA 显卡
    if 'RTX' in upper or 'GTX' in upper:
        # 统一格式
        name = re.sub(r'^(GEFORCE\s*)?', '', name, flags=re.IGNORECASE).strip()
        # 确保RTX/GTX和型号之间有空格: RTX4060 -> RTX 4060
        name = re.sub(r'(RTX|GTX)\s*(\d)', r'\1 \2', name, flags=re.IGNORECASE)
        if not name.upper().startswith('NVIDIA'):
            name = f"NVIDIA GeForce {name}"
    elif 'RX' in upper:
        # AMD 显卡: RX7800XT -> RX 7800 XT
        name = re.sub(r'^(RADEON\s*)?', '', name, flags=re.IGNORECASE).strip()
        name = re.sub(r'(RX)\s*(\d)', r'\1 \2', name, flags=re.IGNORECASE)
        if not name.upper().startswith('AMD'):
            name = f"AMD Radeon {name}"
    elif 'ARC' in upper or 'A7' in upper or 'A5' in upper:
        # Intel Arc
        if not name.upper().startswith('INTEL'):
            name = f"Intel {name}"
    
    return name.strip()

@functools.lru_cache(maxsize=128)
def get_cached_fps(cpu_name: str, gpu_name: str, resolution: int):
    url = 'https://rank.gamepp.com/v1/api/getForecastFPSList2'
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://gamepp.com',
        'Referer': 'https://gamepp.com/'
    }
    payload = {'cpu_name': cpu_name, 'gpu_name': gpu_name, 'score': 0, 'resolutions': resolution}
    
    try:
        res = requests.post(url, headers=headers, data=payload, timeout=8).json()
        score = res.get('score', 0)
        if score != 0:
            payload['score'] = score
            res = requests.post(url, headers=headers, data=payload, timeout=8).json()
            
        target_games = ['反恐精英2', '三角洲行动', '赛博朋克2077', '永劫无间', '极限竞速：地平线5']
        results = []
        for game in res.get('data', []):
            if game.get('cnname') in target_games:
                results.append({
                    "name": game.get('cnname'),
                    "fps": game.get('fps'),
                    "min_fps": game.get('min_fps'),
                    "max_fps": game.get('max_fps'),
                    "gpu_mem": game.get('gpu_mem_size')
                })
        return results
    except Exception as e:
        print(f"FPS Fetch Error: {e}")
        return []

@router.get("/fps")
async def get_fps(cpu_name: str, gpu_name: str, resolution: int = 1):
    # 标准化名字后再去查
    clean_cpu = normalize_cpu_name(cpu_name)
    clean_gpu = normalize_gpu_name(gpu_name)
    print(f"[FPS] Raw: cpu='{cpu_name}', gpu='{gpu_name}' -> Normalized: cpu='{clean_cpu}', gpu='{clean_gpu}'")
    data = get_cached_fps(clean_cpu, clean_gpu, resolution)
    return {"status": "ok", "data": data}

class ValidationResult(BaseModel):
    total_lu_score: int
    total_power_draw: int
    recommended_power: int
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    items: List[Dict[str, Any]]

@router.post("/validate", response_model=ValidationResult)
async def validate_bom(request: ValidationRequest, db: Session = Depends(get_session)):
    """
    接收用户选择的一组硬件ID，计算整机跑分、功耗，并进行“排雷校验”。
    法则一：CPU与主板插槽是否匹配 (socket_type)
    法则二：内存插槽代数是否匹配 (ram_type)
    法则三：总功耗与电源定额比对 (power_draw)
    法则四：机箱大小支持 (form_factor)
    """
    items = []
    
    # 提取数据库中硬件
    for hid in request.item_ids:
        hw = db.exec(select(Hardware).where(Hardware.id == hid)).first()
        if hw:
            specs = hw.specs if isinstance(hw.specs, dict) else {}
            if isinstance(hw.specs, str):
                try:
                    specs = json.loads(hw.specs)
                except:
                    pass
                    
            item_data = {
                "id": hw.id,
                "category": hw.category,
                "name": f"{hw.brand} {hw.model}",
                "price": hw.price,
                "specs": specs
            }
            items.append(item_data)
            
    # 计算总分与功耗
    total_lu_score = 0
    total_power_draw = 0
    
    components = {item["category"]: item for item in items}
    
    for item in items:
        specs = item["specs"]
        # 累加跑分
        base_score = int(specs.get("master_lu_score", 0))
        if base_score == 0:
            cat = item.get("category")
            name_upper = item.get("name", "").upper()
            if cat == "storage":
                if "GEN5" in name_upper or "PCIE5" in name_upper or "PCI-E 5.0" in name_upper:
                    base_score = 350000
                elif "GEN4" in name_upper or "PCIE4" in name_upper or "PCI-E 4.0" in name_upper:
                    base_score = 220000
                elif "NVME" in name_upper or "M.2" in name_upper:
                    base_score = 120000
                elif "SATA" in name_upper:
                    base_score = 40000
                else:
                    base_score = 100000
            elif cat == "ram":
                if "DDR5" in name_upper:
                    base_score = 200000
                elif "DDR4" in name_upper:
                    base_score = 120000
                else:
                    base_score = 100000
        
        total_lu_score += base_score
        
        # 累加功耗 (如果部分硬件没功耗比如主板，取个默认值)
        draw = int(specs.get("power_draw", 0))
        if draw:
            total_power_draw += draw

    # 主板默认 30w 功耗、风扇水冷杂项等加算 50w 作为余量
    total_power_draw += 80 
    
    errors = []
    warnings = []
    
    cpu = components.get('cpu')
    mb = components.get('mainboard')
    ram = components.get('ram')
    gpu = components.get('gpu')
    psu = components.get('power')
    case = components.get('case')

    # 法则一：CPU与主板插槽
    if cpu and mb:
        cpu_socket = cpu['specs'].get('socket_type') or cpu['specs'].get('socket')
        mb_socket = mb['specs'].get('socket_type') or mb['specs'].get('socket')
        
        if cpu_socket and mb_socket and str(cpu_socket).upper() != str(mb_socket).upper():
            errors.append(f"物理防呆警报：CPU【{cpu['name']}】的 {cpu_socket} 插槽 与 主板【{mb['name']}】的 {mb_socket} 插槽不兼容，强行上机将断针！")

    # 法则二：内存与主板代数
    if ram and mb:
        ram_type = ram['specs'].get('ram_type', '').upper()
        mb_ram_type = mb['specs'].get('ram_type', '').upper()
        if ram_type and mb_ram_type and (ram_type not in mb_ram_type):
            errors.append(f"物理防呆警报：内存【{ram['name']}】({ram_type}) 与 主板【{mb['name']}】({mb_ram_type}) 代数不同，无法插入插槽。")
            
    # 法则三：电源功率红线预警
    recommended_power = int(total_power_draw * 1.3) # 留出 30% 峰值余量
    if psu:
        rated_wattage = int(psu['specs'].get('wattage', 0) or psu['specs'].get('wattageRated', 0))
        if rated_wattage > 0 and rated_wattage < total_power_draw:
            errors.append(f"供电危急警报：总峰值功耗 {total_power_draw}W 已经超过电源【{psu['name']}】的额定 {rated_wattage}W！满载打游戏必黑屏重启。")
        elif rated_wattage > 0 and rated_wattage < recommended_power:
            warnings.append(f"推荐更换电源：您的总功耗 {total_power_draw}W。虽然低于额定 {rated_wattage}W，但电源瞬时最高负载余量不足，建议选配至少 {recommended_power}W 的电源。")

    # 法则四：机箱大小
    if case and mb:
        case_ff = case['specs'].get('formFactor', '').upper()
        mb_ff = mb['specs'].get('form_factor', '').upper() or mb['specs'].get('formFactor', '').upper()
        # 简单比对。ATX能装MATX/ITX。
        sizes = {"E-ATX": 4, "ATX": 3, "MATX": 2, "M-ATX": 2, "ITX": 1}
        if case_ff and mb_ff:
            c_val = sizes.get(case_ff, 99)
            m_val = sizes.get(mb_ff, 99)
            if c_val < m_val and c_val != 99 and m_val != 99:
                errors.append(f"体积碰撞警报：主板【{mb['name']}】({mb_ff}) 过大，机箱【{case['name']}】({case_ff}) 内部空间装不下！")

    return ValidationResult(
        total_lu_score=total_lu_score,
        total_power_draw=total_power_draw,
        recommended_power=recommended_power,
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        items=items
    )
