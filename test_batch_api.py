import requests
import json

BASE_URL = "http://localhost:8000/api" # Adjust port if needed

def test_batch_products():
    # First, get some real IDs from the first page of products
    try:
        res = requests.get(f"{BASE_URL}/products?page=1&page_size=5")
        data = res.json()
        ids = [p["id"] for p in data.get("items", [])]
        
        if not ids:
            print("No products found to test with.")
            return

        print(f"Testing with IDs: {ids}")
        
        # Test batch endpoint
        batch_res = requests.post(f"{BASE_URL}/products/batch", json={"ids": ids})
        batch_data = batch_res.json()
        
        print(f"Batch response status: {batch_res.status_code}")
        # print(json.dumps(batch_data, indent=2, ensure_ascii=False))
        
        if len(batch_data) == len(ids):
            print("✅ Success: Received correct number of products.")
        else:
            print(f"❌ Failure: Expected {len(ids)} products, got {len(batch_data)}.")
            
    except Exception as e:
        print(f"Error connecting to backend: {e}")
        print("Note: Make sure the backend server is running.")

if __name__ == "__main__":
    test_batch_products()
