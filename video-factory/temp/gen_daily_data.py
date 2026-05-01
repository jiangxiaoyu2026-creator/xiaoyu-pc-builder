import json

def load_json(path):
    with open(path) as f:
        return json.load(f)

weekly = load_json('/Users/mac/new/video-factory/temp/today_weekly.json')['data']
monthly = load_json('/Users/mac/new/video-factory/temp/today_monthly.json')['data']

def analyze_category(cat_name):
    cat = weekly['categories'].get(cat_name, {})
    items = cat.get('items', [])
    changed_count = len(items)
    drops = [x for x in items if x['changeAmount'] < 0]
    rises = [x for x in items if x['changeAmount'] > 0]
    avg_change = 0
    overall_percent = 0
    if changed_count > 0:
        avg_change = sum(x['changeAmount'] for x in items) / changed_count
        overall_percent = sum(x['changePercent'] for x in items) / changed_count
    
    # Sort for extremes
    drops = sorted(drops, key=lambda x: x['changeAmount'])
    rises = sorted(rises, key=lambda x: x['changeAmount'], reverse=True)
    
    return {
        'total': changed_count,
        'drops': drops,
        'rises': rises,
        'avg_change': round(avg_change, 2),
        'overall_percent': round(overall_percent, 2)
    }

ram = analyze_category('ram')
disk = analyze_category('disk')
cpu = analyze_category('cpu')
gpu = analyze_category('gpu')

print("=== RAM ===")
print(f"Total: {ram['total']}, Drops: {len(ram['drops'])}, Rises: {len(ram['rises'])}, Avg: {ram['avg_change']}, %: {ram['overall_percent']}%")
if ram['drops']:
    print(f"Top Drop 1: {ram['drops'][0]}")
if len(ram['drops']) > 1:
    print(f"Top Drop 2: {ram['drops'][1]}")
if ram['rises']:
    print(f"Top Rise 1: {ram['rises'][0]}")

print("\n=== DISK ===")
print(f"Total: {disk['total']}, Drops: {len(disk['drops'])}, Rises: {len(disk['rises'])}, Avg: {disk['avg_change']}, %: {disk['overall_percent']}%")
# NV3 1T search
nv3_1t = [x for x in disk['drops'] + disk['rises'] if 'NV3' in x['name'] and '1T' in x['name']]
if not nv3_1t:
    # Search in monthly if not in weekly
    m_disk = monthly['categories'].get('disk', {}).get('items', [])
    nv3_1t = [x for x in m_disk if 'NV3' in x['name'] and '1T' in x['name']]
print(f"NV3 1T: {nv3_1t[0] if nv3_1t else 'NOT FOUND'}")
if disk['drops']:
    print(f"Top Drop 1: {disk['drops'][0]}")
if len(disk['drops']) > 1:
    print(f"Top Drop 2: {disk['drops'][1]}")

print("\n=== CPU ===")
print(f"Total: {cpu['total']}, Drops: {len(cpu['drops'])}, Rises: {len(cpu['rises'])}, Avg: {cpu['avg_change']}, %: {cpu['overall_percent']}%")
if cpu['drops']:
    print(f"Top Drop 1: {cpu['drops'][0]}")
if len(cpu['drops']) > 1:
    print(f"Top Drop 2: {cpu['drops'][1]}")
if cpu['rises']:
    print(f"Top Rise 1: {cpu['rises'][0]}")

# Get CPU monthly trends
print("\nCPU Monthly Search for Extremes:")
m_cpu = monthly['categories'].get('cpu', {}).get('items', [])
for x in (cpu['drops'][:2] + cpu['rises'][:1]):
    m_match = [m for m in m_cpu if m['name'] == x['name']]
    if m_match:
        print(f"Monthly {x['name']}: changeAmount {m_match[0]['changeAmount']}")
    else:
        print(f"Monthly {x['name']}: Not found")

print("\n=== GPU ===")
print(f"Total: {gpu['total']}, Drops: {len(gpu['drops'])}, Rises: {len(gpu['rises'])}, Avg: {gpu['avg_change']}, %: {gpu['overall_percent']}%")
if gpu['drops']:
    print(f"Top Drop 1: {gpu['drops'][0]}")
if len(gpu['drops']) > 1:
    print(f"Top Drop 2: {gpu['drops'][1]}")
if gpu['rises']:
    print(f"Top Rise 1: {gpu['rises'][0]}")
if len(gpu['rises']) > 1:
    print(f"Top Rise 2: {gpu['rises'][1]}")

