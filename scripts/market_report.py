#!/usr/bin/env python3                           
  import os, json, urllib.request                                                                                       
  from datetime import datetime
  def fetch_market_data(period="monthly"):                                                                              
      api_key = os.environ.get("DIYXX_API_KEY")          
      if not api_key: raise ValueError("请设置环境变量 DIYXX_API_KEY")
      url = f"https://www.diyxx.com/api/external/market-report-data?period={period}"                                    
      req = urllib.request.Request(url)
      req.add_header("X-API-Key", api_key)                                                                              
      with urllib.request.urlopen(req, timeout=30) as response:
          data = json.loads(response.read().decode("utf-8"))                                                            
      return data["data"]
  def save_report(data, period, output_dir="market_reports"):                                                           
      os.makedirs(output_dir, exist_ok=True)             
      filename = f"{output_dir}/{datetime.now().strftime(\"%Y%m%d\")}_{period}_raw.json"
      with open(filename, "w", encoding="utf-8") as f:                                                                  
          json.dump(data, f, ensure_ascii=False, indent=2)
      print(f"已保存: {filename}")                                                                                      
  if __name__ == "__main__":                             
      import sys                                                                                                        
      period = sys.argv[1] if len(sys.argv) > 1 else "monthly"
      data = fetch_market_data(period)
      save_report(data, period)
      print(f"变动总数: {data[\"summary\"][\"totalItemChanged\"]}")
