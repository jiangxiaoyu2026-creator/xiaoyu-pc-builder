import sqlite3
import json

db = sqlite3.connect("data/xiaoyu.db")
c = db.cursor()

data_12400f = {"cpu": "Intel Core i5-12400F Tray", "socket": "LGA1700", "architecture": "Alder Lake", "cores": "6P+0E (6 Cores)", "threads": "12", "baseClock": "2.5 GHz", "boostClock": "4.4 GHz", "l2Cache": "7.5 MB", "l3Cache": "18 MB", "tdp": "65W", "maxPower": "117W (PL2)", "memorySupport": "DDR4-3200 / DDR5-4800", "pcieLanes": "16x PCIe 5.0 + 4x PCIe 4.0", "integratedGraphics": "None", "processTechnology": "Intel 7 (10nm Enhanced SuperFin)", "maxMemoryCapacity": "128 GB", "memoryChannels": "2-Channel", "instructionSet": "x86-64", "instructionSetExtensions": "SSE4.1/4.2, AVX2, AVX-512", "secureBoot": "TPM 2.0", "virtualization": "VT-x, VT-d, EPT", "coolingSolution": "Not Included (Boxed Cooler Optional: RK-INT-EX-12GEN)", "warranty": "3-Year Limited Warranty (Tray Only)", "marketSegment": "Desktop / Consumer", "releaseDate": "2022 Q1", "priceAtLaunch": "$167 USD (Tray)"}
c.execute("UPDATE hardware SET specs = ?, specsSource = 'user' WHERE id = '8f6026b3-eba6-4b29-959a-2356c1419fea'", (json.dumps(data_12400f),))

data_12400 = {"cpu": "Intel Core i5-12400", "socket": "LGA1700", "architecture": "Alder Lake", "cores": "6P+0E", "threads": "12", "baseClock": "2.5 GHz", "boostClock": "4.4 GHz", "l2Cache": "7.5 MB", "l3Cache": "18 MB", "tdp": "65W", "maxPower": "117W (PL2)", "memorySupport": "DDR4-3200 / DDR5-4800", "maxMemoryCapacity": "128GB (DDR4) / 96GB (DDR5)", "memoryChannels": "2", "pcieLanes": "16x PCIe 5.0 + 4x PCIe 4.0", "integratedGraphics": "Intel UHD Graphics 730 (32 EU, 300-1450 MHz)", "processTechnology": "Intel 7 (10nm Enhanced SuperFin)", "instructionSet": "x86-64, SSE4.1/4.2, AVX2, AVX-512", "maxTemp": "100°C", "packageSize": "37.5mm x 45.0mm", "includedCooler": "None (散片不含散热器)", "warranty": "3年 (散片通常店保)", "virtualization": "VT-x, VT-d, VT-x EPT", "secureBoot": "TPM 2.0", "formFactor": "Box", "marketSegment": "Desktop / Mainstream", "launchDate": "2022年1月4日", "msrp": "$209 (盒装建议零售价，散片实际售价略低)"}
c.execute("UPDATE hardware SET specs = ?, specsSource = 'user' WHERE id = '445fd16d-769f-4a96-b8a9-19185dd1f9c0'", (json.dumps(data_12400),))

data_13100f = {"cpu": "Intel Core i3-13100F", "socket": "LGA1700", "architecture": "Raptor Lake", "cores": "4P+0E", "threads": "8", "baseClock": "3.4 GHz", "boostClock": "4.5 GHz", "l2Cache": "5 MB", "l3Cache": "12 MB", "tdp": "58W", "maxPower": "89W (PL2)", "memorySupport": "DDR4-3200 / DDR5-4800", "integratedGraphics": "None", "processTechnology": "Intel 7 (10nm)"}
c.execute("UPDATE hardware SET specs = ?, specsSource = 'user' WHERE id = 'be4e5238-1131-4218-ae76-e56652a67a9a'", (json.dumps(data_13100f),))

db.commit()
db.close()
print("Restored JSON specs.")
