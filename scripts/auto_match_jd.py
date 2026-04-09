import sqlite3
import json
import time
import os
import sys

# 添加 server_py 到路径以便引入服务
sys.path.append(os.path.join(os.path.dirname(__file__), '../server_py'))
from services.jd_union_service import _call_jd_api, bind_product_jd_link

def fetch_jd_hardware(elite_ids=[22, 109, 110, 108], max_pages=1):
    jd_items = []
    for elite_id in elite_ids:
        for page in range(1, max_pages + 1):
            data = _call_jd_api('jd.union.open.goods.material.query', {
                'goodsReq': {
                    'eliteId': elite_id,
                    'pageIndex': page,
                    'pageSize': 50,
                    'cid1': 670,  # 电脑办公
                }
            })
            resp_key = 'jd_union_open_goods_material_query_response'
            if data and resp_key in data:
                result = json.loads(data[resp_key].get('result', '{}'))
                items = result.get('data', [])
                for item in items:
                    jd_items.append({
                        'name': item.get('skuName', ''),
                        'url': item.get('materialUrl', ''),
                        'item_id': item.get('itemId', ''),
                        'price': item.get('priceInfo', {}).get('lowestPrice', 0)
                    })
            time.sleep(0.5)
    print(f"✅ 从京东服务器拉取了 {len(jd_items)} 个电脑办公/配件商品")
    return jd_items

def auto_match():
    # 1. 拉取京东数据
    print("⏳ 开始拉取京东精选商品库...")
    jd_items = fetch_jd_hardware(elite_ids=[22, 23, 109, 112], max_pages=3)
    
    # 2. 读取本地硬件库
    conn = sqlite3.connect('/Users/mac/new/data/xiaoyu.db')
    cur = conn.cursor()
    cur.execute("SELECT id, brand, model, category, specs FROM hardware WHERE status='active'")
    local_hw = cur.fetchall()
    
    # 我们先过滤出没有绑定的
    unbound_hw = []
    for hw in local_hw:
        specs_str = hw[4]
        try:
            specs = json.loads(specs_str) if isinstance(specs_str, str) else {}
        except:
            specs = {}
            
        if isinstance(specs, dict) and not specs.get('jd_url'):
            unbound_hw.append(hw)
            
    print(f"✅ 你的本地共 {len(local_hw)} 条数据，其中 {len(unbound_hw)} 条需要绑定推广！")
    
    # 3. 开始模糊匹配
    matches = []
    print("⏳ 正在启动 AI 语义级交叉比对引擎...")
    for hw in unbound_hw:
        hw_id, brand, model, cat, specs = hw
        search_keys = [brand.lower()]
        models = model.replace('-', ' ').lower().split()
        search_keys.extend(models)
        search_keys = [k for k in set(search_keys) if len(k) > 1]
        
        best_match = None
        max_score = 0
        
        for jd in jd_items:
            jd_name = jd['name'].lower()
            score = 0
            if brand.lower() in jd_name:
                score += 5
                
            hit_words = 0
            for word in search_keys:
                if word in jd_name:
                    hit_words += 1
            
            if hit_words > 0:
                score += hit_words * 2
                
            if score > 6 and score > max_score:
                max_score = score
                best_match = jd
                
        if best_match:
            matches.append({
                'local': f"[{cat}] {brand} {model}",
                'jd': best_match['name'],
                'url': best_match['url'],
                'score': max_score
            })
            
    # 只打印前10个匹配看看效果
    print(f"\n🎉 比对完成！共成功匹配到 {len(matches)} 个高佣金商品，预览前10个：")
    for m in matches[:10]:
        print(f"你的产品: {m['local']}")
        print(f"京东找到: {m['jd'][:60]}")
        print("-" * 50)

if __name__ == '__main__':
    auto_match()
