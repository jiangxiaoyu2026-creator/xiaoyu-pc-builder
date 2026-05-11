#!/usr/bin/env python3
"""
ZOL图片采集脚本
从中关村在线批量获取产品图片
"""

import os
import re
import time
import sqlite3
from typing import Optional, List, Tuple
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv()

# 正则表达式：去掉干扰词
REMOVE_PATTERNS = [
    r'盒$', r'散片$', r'盒包$', r'散片$',
    r'白色$', r'黑色$', r'银色$', r'金色$',
    r'灯条$', r'马甲条$', r'普条$',
    r'^\s+', r'\s+$',
]

def clean_model_name(name: str) -> str:
    """清理产品名称，去掉干扰词"""
    result = name.strip()
    for pattern in REMOVE_PATTERNS:
        result = re.sub(pattern, '', result)
    # 简化多余空格为单个空格
    result = re.sub(r'\s+', ' ', result).strip()
    return result

def extract_brand_model(name: str) -> Tuple[str, str]:
    """提取品牌和型号"""
    name = clean_model_name(name)

    # 品牌映射
    brand_map = {
        'AMD': 'AMD',
        'intel': 'Intel', 'Intel': 'Intel',
        '华硕': '华硕', 'ASUS': '华硕',
        '微星': '微星', 'MSI': '微星',
        '技嘉': '技嘉', 'GIGABYTE': '技嘉',
        '佰维': '佰维',
        '劲芯': '劲芯',
        '宏碁': '宏碁', 'acer': '宏碁',
        '海盗船': '海盗船', 'Corsair': '海盗船',
        '芝奇': '芝奇', 'G.Skill': '芝奇',
        '金士顿': '金士顿', 'Kingston': '金士顿',
        '金百达': '金百达',
        '阿斯加特': '阿斯加特', 'Asgard': '阿斯加特',
        '七彩虹': '七彩虹', 'Colorful': '七彩虹',
        '华为': '华为', 'Huawei': '华为',
        '致态': '致态', 'ZhiTai': '致态',
        '西数': '西数', 'WD': '西数',
        '海韵': '海韵', 'Seasonic': '海韵',
        '爱国者': '爱国者', 'aigo': '爱国者',
        '航嘉': '航嘉', 'HuntKey': '航嘉',
        '追风者': '追风者', 'Phanteks': '追风者',
        '长城': '长城', 'GreatWall': '长城',
        '骨伽': '骨伽', 'Cougar': '骨伽',
        '耕升': '耕升', 'Gainward': '耕升',
        '铭瑄': '铭瑄', 'Maxsun': '铭瑄',
        '鑫谷': '鑫谷', 'Segotop': '鑫谷',
        '百盛': '百盛', 'BS': '百盛',
        '腾隐': '腾隐',
    }

    # 尝试匹配品牌
    for keyword, brand in brand_map.items():
        if name.startswith(keyword):
            model = name[len(keyword):].strip()
            return brand, model

    # 如果没匹配到，整段作为型号
    parts = name.split()
    if len(parts) >= 2:
        return parts[0], ' '.join(parts[1:])
    return '', name

def build_search_query(brand: str, model: str) -> str:
    """构建搜索查询词"""
    from urllib.parse import quote
    # 去掉型号中的额外描述
    query = f"{brand} {model}".strip()
    # 简化一些字符
    query = query.replace('*', '').replace('×', '')
    # 保留空格，不要URL编码，让Playwright处理
    return query

def get_product_links_from_search(page, search_url: str, max_results: int = 5) -> List[str]:
    """从搜索结果页面获取产品链接"""
    links = []
    try:
        page.goto(search_url, timeout=15000, wait_until='networkidle')
        page.wait_for_timeout(1000)

        # 获取页面标题验证是否加载成功
        title = page.title()
        print(f"    页面标题: {title}")

        # 提取产品链接
        hrefs = page.evaluate("""
            () => {
                const links = [];
                document.querySelectorAll('a').forEach(a => {
                    if (a.href.includes('detail.zol.com.cn') && a.href.includes('index')) {
                        links.push(a.href);
                    }
                });
                return links;
            }
        """)
        print(f"    找到 {len(hrefs)} 个链接")

        for href in hrefs:
            # 标准化链接
            href = href.replace('//', 'https://')
            if href not in links:
                links.append(href)
            if len(links) >= max_results:
                break

    except Exception as e:
        print(f"  搜索失败: {e}")

    return links

def get_image_urls_from_product_page(page, product_url: str) -> List[str]:
    """从产品页面获取图片URL列表"""
    images = []
    try:
        page.goto(product_url, timeout=15000)
        page.wait_for_timeout(2000)

        # 提取 ZOL 图片
        img_srcs = page.evaluate("""
            () => {
                const srcs = [];
                document.querySelectorAll('img').forEach(img => {
                    if (img.src && img.src.includes('zol-img.com.cn') && img.src.includes('product')) {
                        srcs.push(img.src);
                    }
                });
                return srcs;
            }
        """)

        for src in img_srcs:
            if 'zol-img.com.cn' in src and 'product' in src:
                # 转换为大图 URL
                # 格式: https://2e.zol-img.com.cn/product/254_320x240/380/ceLe549gUtplc.jpg
                # 转换为: https://2e.zol-img.com.cn/product/254_400x300/380/ceLe549gUtplc.jpg
                src_400 = re.sub(r'_\d+x\d+', '_400x300', src)
                if src_400 not in images:
                    images.append(src_400)

    except Exception as e:
        print(f"  获取图片失败: {e}")

    return images[:3]  # 最多返回3张图

def process_single_product(page, product_id: str, brand: str, model: str, category: str) -> Optional[str]:
    """处理单个产品，返回图片URL"""
    query = build_search_query(brand, model)
    search_url = f"https://search.zol.com.cn/s/all.php?keyword={query}"

    print(f"  搜索: {query}")

    # 获取产品链接
    links = get_product_links_from_search(page, search_url)

    if not links:
        # 尝试只用型号搜索
        search_url = f"https://search.zol.com.cn/s/all.php?keyword={model}"
        print(f"  重试搜索: {model}")
        links = get_product_links_from_search(page, search_url)

    if not links:
        print(f"  未找到产品")
        return None

    # 取第一个链接
    product_url = links[0]
    print(f"  找到产品: {product_url}")

    # 获取图片
    images = get_image_urls_from_product_page(page, product_url)

    if images:
        print(f"  获取到 {len(images)} 张图片")
        return images[0]  # 返回第一张

    return None

FULL_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'xiaoyu.db')

def run_batch(limit: int = 20):
    """批量处理产品"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 从数据库读取没有图片的产品 - 使用原生SQL
        conn = sqlite3.connect(FULL_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, category, brand, model
            FROM hardware
            WHERE image IS NULL OR image = '' OR image = 'null'
            LIMIT ?
        """, (limit,))
        products = cursor.fetchall()
        conn.close()

        print(f"找到 {len(products)} 个没有图片的产品")

        success = 0
        fail = 0
        results = []

        for i, product in enumerate(products[:limit]):
            print(f"\n[{i+1}/{min(limit, len(products))}] 处理: {product[2]} {product[3]}")

            brand, model = extract_brand_model(f"{product[2]} {product[3]}")
            if not brand and not model:
                print("  无法提取品牌型号")
                fail += 1
                continue

            image_url = process_single_product(page, product[0], brand, model, product[1])

            if image_url:
                success += 1
                results.append((product[0], image_url))
                print(f"  成功: {image_url}")
            else:
                fail += 1

            # 休息一下，避免太快被封
            time.sleep(1)

        browser.close()

        print(f"\n========== 完成 ==========")
        print(f"成功: {success}, 失败: {fail}")

        # 更新数据库
        if results:
            print("\n更新数据库...")
            conn = sqlite3.connect(FULL_DB_PATH)
            cursor = conn.cursor()
            for prod_id, img_url in results:
                cursor.execute("""
                    UPDATE hardware SET image = ?, imageSource = 'zol' WHERE id = ?
                """, (img_url, prod_id))
            conn.commit()
            conn.close()
            print("数据库更新完成")

if __name__ == '__main__':
    run_batch(limit=20)