import requests
import json
import time

def fetch_game_fps(cpu_name: str, gpu_name: str, resolution: int = 1):
    """
    爬取 GamePP 游戏加加的特定硬件组合帧率。
    :param resolution: 1=1080P, 2=2K, 3=3K, 4=4K
    """
    url = 'https://rank.gamepp.com/v1/api/getForecastFPSList2'
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://gamepp.com',
        'Referer': 'https://gamepp.com/'
    }
    
    # 第一步：传递 score=0 激活组合并获取服务器分配的硬件算力 Score
    payload = {
        'cpu_name': cpu_name, 
        'gpu_name': gpu_name, 
        'score': 0, 
        'resolutions': resolution
    }
    
    try:
        res = requests.post(url, headers=headers, data=payload).json()
        score = res.get('score', 0)
        
        # 第二步：如果拿到了 score，携带 score 获取完整游戏列表
        if score != 0:
            payload['score'] = score
            res = requests.post(url, headers=headers, data=payload).json()
            
        return res.get('data', [])
    except Exception as e:
        print(f"抓取失败: {e}")
        return []

if __name__ == "__main__":
    test_cpu = 'Intel Core i9-13900K'
    test_gpu = 'NVIDIA GeForce RTX 4090'
    
    target_games = ['反恐精英2', '三角洲行动', '赛博朋克2077', '永劫无间', '极限竞速：地平线5']
    
    print(f"正在分析硬件组合：{test_cpu} + {test_gpu}")
    print("-" * 50)
    
    for res_name, res_code in [("1080P", 1), ("2K", 2), ("4K", 4)]:
        print(f"\n[ 分辨率：{res_name} ]")
        data = fetch_game_fps(test_cpu, test_gpu, resolution=res_code)
        
        found = False
        for game in data:
            if game.get('cnname') in target_games:
                print(f"🎮 {game.get('cnname')}: {game.get('fps')} 帧 (区间 {game.get('min_fps')}~{game.get('max_fps')}) | 显存占用: {game.get('gpu_mem_size')}G")
                found = True
        
        if not found:
            print("未找到指定游戏数据。")
        time.sleep(1) # 请求间隔，防封
