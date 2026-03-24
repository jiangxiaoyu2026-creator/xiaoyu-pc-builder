import os
import sys
import requests
from bs4 import BeautifulSoup
import re
import math
import time
from typing import Dict, Any

# Ensure we can import models from the parent dir
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from models import Hardware
from sqlmodel import Session, select
import json
from db import engine

COOKIES = {"wx_token": "1c2d"}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

def generate_slug(brand: str, model_name: str) -> str:
    b = brand.lower().strip()
    m = model_name.lower().strip()
    
    # Clean up model name from extra spaces and packaging suffixes
    m = re.sub(r'\s+', ' ', m)
    for suffix in ['散片', '盒包', '散', '盒']:
        if m.endswith(suffix):
            m = m[:-len(suffix)]
            
    m = m.strip()
    
    if b == 'intel':
        if m.startswith('i3') or m.startswith('i5') or m.startswith('i7') or m.startswith('i9'):
            # "i7-13700kf" or "i7 13700kf" -> "core-i7-13700kf"
            m = 'core-' + m.replace(' ', '-')
        elif 'ultra' in m:
            # "ultra 7 265k" -> "core-ultra-7-265k"
            m = 'core-' + m.replace(' ', '-')
            
    elif b == 'amd':
        # Handles "r5 7500f" or "r5-5600" or "r7-9700x" -> "ryzen-5-..."
        m = m.replace('r3', 'ryzen 3').replace('r5', 'ryzen 5').replace('r7', 'ryzen 7').replace('r9', 'ryzen 9')
        # E.g. "9950x3d" -> AMD doesn't necessarily need "ryzen-9-" if not provided, topcpu uses "amd-9950x" sometimes but wait, let's look at topcpu
        # topcpu slugs: "amd-ryzen-7-7800x3d", "amd-ryzen-5-5600"
        # Let's fix missing "ryzen" 
        if not m.startswith('ryzen') and re.match(r'^\d', m):
            # e.g "9950x3d" -> "amd-ryzen-9-9950x3d" - assume ryzen is needed, but we don't know the series easily.
            # Actually topcpu uses `amd-ryzen-9-9950x`. We can try without ryzen, topcpu redirects some?
            pass
            
        m = m.replace(' ', '-')
    
    slug = f"{b}-{m}"
    slug = slug.replace('--', '-').replace('_', '-')
    return slug

def parse_specs(soup: BeautifulSoup) -> Dict[str, str]:
    specs = {}
    sections = soup.find_all('div', class_=lambda c: c and 'bg-white' in c and 'shadow' in c)
    for section in sections:
        rows = section.find_all('div', class_=lambda c: c and 'py-3' in c and 'items-center' in c)
        for row in rows:
            label_div = row.find('div', class_=lambda c: c and 'w-2/5' in c)
            val_div = row.find('div', class_=lambda c: c and 'text-slate-500' in c)
            if label_div and val_div:
                # Get the first stripped string as the label (ignores tooltip text)
                label_strings = list(label_div.stripped_strings)
                if not label_strings: continue
                label_text = label_strings[0]
                val_text = val_div.get_text(separator=" ", strip=True)
                specs[label_text] = val_text
    return specs

def parse_benchmarks(soup: BeautifulSoup, model_name: str) -> Dict[str, int]:
    benchmarks = {}
    target_bms = [
        'Cinebench R23 单核', 'Cinebench R23 多核', 
        'Cinebench 2024 单核', 'Cinebench 2024 多核', 
        'Geekbench 6 单核', 'Geekbench 6 多核', 
        'Passmark CPU 单核', 'Passmark CPU 多核', 
        'Blender'
    ]
    
    # We look for a distinctive substring. E.g. "13700KF"
    # Clean the model name
    keyword = re.sub(r'盒|散|片|包|intel|amd', '', model_name, flags=re.IGNORECASE).strip()
    # Usually the main identifier is the last word (e.g. 13700KF)
    search_keyword = keyword.split()[-1] if keyword.split() else keyword
    
    for bm_name in target_bms:
        header = soup.find('div', string=lambda s: s and s.strip() == bm_name)
        if not header:
            header = soup.find(string=lambda s: s and bm_name in s)
            if header: header = header.parent
        if not header: continue
            
        section = header.parent
        while section and section.name != 'body':
            entries = section.find_all(string=lambda s: s and search_keyword.upper() in s.upper())
            if entries:
                # The score is usually text inside the parent container hierarchy
                # Go up twice and get stripped strings
                entry = entries[0]
                container = entry.parent
                while container and container != section:
                    parent_texts = list(container.stripped_strings)
                    for t in parent_texts:
                        t = t.replace(',', '')
                        if t.isdigit() and int(t) > 10:
                            key_map = {
                                'Cinebench R23 单核': 'cinebenchR23_single',
                                'Cinebench R23 多核': 'cinebenchR23_multi',
                                'Cinebench 2024 单核': 'cinebench2024_single',
                                'Cinebench 2024 多核': 'cinebench2024_multi',
                                'Geekbench 6 单核': 'geekbench6_single',
                                'Geekbench 6 多核': 'geekbench6_multi',
                                'Passmark CPU 单核': 'passmark_single',
                                'Passmark CPU 多核': 'passmark_multi',
                                'Blender': 'blender'
                            }
                            benchmarks[key_map[bm_name]] = int(t)
                            break
                    else:
                        container = container.parent
                        continue
                    break
                break
            
            section = section.parent
            
    return benchmarks

def map_to_db_specs(raw_specs: Dict[str, str], benchmarks: Dict[str, int]) -> Dict[str, Any]:
    """Map scraped topcpu specs to our standardized DB specs JSON"""
    final_specs = {}
    
    # Compatibility mapping Rules
    mapping = {
        '插槽': 'socket',
        '核心数量': 'cores',
        '线程数量': 'threads',
        '最大睿频': 'frequency',
        '支持内存类型': 'memoryType',
        '功耗': 'wattage',
        '核芯显卡': 'integratedGpu'
    }
    
    for zh, en in mapping.items():
        if zh in raw_specs:
            val = raw_specs[zh]
            
            if en == 'cores' or en == 'threads':
                # e.g. "16" -> int
                m = re.search(r'\d+', val)
                if m: final_specs[en] = int(m.group())
            
            elif en == 'frequency':
                # e.g. "5.4 GHz" -> "5.4"
                m = re.search(r'([\d\.]+)', val)
                if m: final_specs[en] = m.group()
                
            elif en == 'wattage':
                # e.g. "125 W" -> 125
                m = re.search(r'\d+', val)
                if m: final_specs[en] = int(m.group())
                
            elif en == 'memoryType':
                # e.g. "DDR4-3200, DDR5-5600" -> "DDR4/DDR5"
                types = []
                if 'DDR4' in val.upper(): types.append('DDR4')
                if 'DDR5' in val.upper(): types.append('DDR5')
                if types:
                    final_specs[en] = '/'.join(types)
                elif val and val.upper() != 'NONE' and val.upper() != 'N/A':
                    final_specs[en] = val
                    
            elif en == 'integratedGpu':
                # e.g. "UHD Graphics 770" or "No"
                if val.lower() == 'no' or val == '无':
                    final_specs[en] = '否'
                else:
                    final_specs[en] = '是'
                    
            else:
                final_specs[en] = val
    
    # Extended info
    extended_keys = {
        '内核架构': 'architecture',
        '制程': 'lithography',
        '最大睿频功耗': 'tdpMax',
        '二级缓存': 'l2Cache',
        '三级缓存': 'l3Cache',
        'PCIe版本': 'pcie'
    }
    for zh, en in extended_keys.items():
        if zh in raw_specs:
            final_specs[en] = raw_specs[zh]
            
    if benchmarks:
        final_specs.update(benchmarks)
        
    return final_specs

def process_cpu(cpu: Hardware, dry_run=True):
    slug = generate_slug(cpu.brand, cpu.model)
    url = f"https://www.topcpu.net/cpu/{slug}"
    print(f"\n[{cpu.id}] {cpu.brand} {cpu.model}")
    print(f" -> URL: {url}")
    
    try:
        resp = requests.get(url, cookies=COOKIES, headers=HEADERS, timeout=15)
        if resp.status_code == 404:
            print(f"    ERROR: 404 Not Found. Slug might be incorrect.")
            return False
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        raw_specs = parse_specs(soup)
        benchmarks = parse_benchmarks(soup, cpu.model)
        
        if not raw_specs:
            print("    ERROR: Loaded page but failed to parse any specs. Might be rate limited or captcha.")
            return False
            
        print(f"    Found {len(raw_specs)} specs, {len(benchmarks)} benchmarks")
        
        final_specs = map_to_db_specs(raw_specs, benchmarks)
        print(f"    Mapped Specs: {final_specs}")
        
        if not dry_run:
            cpu.specs = final_specs
            cpu.specsSource = 'topcpu'
            
        return True
    
    except Exception as e:
        print(f"    ERROR fetching page: {e}")
        return False

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--execute', action='store_true', help='Actually save to database (otherwise dry-run)')
    args = parser.parse_args()
    
    print(f"Starting CPU Enrichment... Dry Run: {not args.execute}")
    
    with Session(engine) as session:
        statement = select(Hardware).where(Hardware.category == 'cpu')
        results = session.exec(statement).all()
        
        print(f"Found {len(results)} CPUs in DB.")
        
        success_count = 0
        for cpu in results:
            time.sleep(1.5)
            success = process_cpu(cpu, dry_run=not args.execute)
            if success:
                success_count += 1
                
        if args.execute:
            session.commit()
            print("\nDatabase changes committed.")
            
        print(f"\nProcess complete. Success: {success_count}/{len(results)}")

if __name__ == "__main__":
    main()
