const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  // Create a beautiful mockup HTML of the modal 
  const htmlContent = `
  <html><head><script src="https://cdn.tailwindcss.com"></script></head>
  <body class="bg-gray-100 flex items-center justify-center h-screen font-sans">
    
    <div class="bg-white rounded-2xl shadow-2xl w-[800px] h-[600px] border border-gray-200 flex flex-col relative">
      <div class="p-6 border-b border-gray-100 bg-gray-50 flex justify-between rounded-t-2xl">
        <h2 class="text-xl font-bold">编辑产品参数</h2>
      </div>
      <div class="flex-1 p-6 overflow-y-auto space-y-6 relative">
      
        <div class="bg-indigo-50 border-2 border-indigo-500 text-indigo-700 p-4 rounded-xl relative shadow-lg">
          <div class="absolute -top-4 -left-4 bg-red-500 text-white px-3 py-1 rounded-full font-bold shadow-lg animate-bounce text-xl border-4 border-white">
            看这里！在这里！ 👇
          </div>
          <h3 class="font-bold text-lg mb-2 flex items-center gap-2">🔗 京东联盟快捷绑定区</h3>
          <div class="space-y-3">
             <button class="w-full text-left p-3 border border-red-300 bg-white rounded-lg text-red-600 font-bold flex items-center gap-2 shadow-sm">
                🔍 一键直达京东搜索：<span class="bg-gray-100 px-2 py-1 rounded text-black">华硕 TUF 4060TI</span>
                <span class="ml-auto text-xs font-normal bg-red-100 px-2 py-1 rounded">点击自动复制并打开网页</span>
             </button>
             <input type="text" class="w-full border border-gray-300 p-2 rounded text-sm text-gray-500" value="搜索完毕后，粘贴京东商品链接..."/>
          </div>
        </div>
        
        <div class="p-4 bg-gray-50 rounded text-gray-400">👆 上面这块是我新加的</div>
        <div class="p-4 bg-gray-50 rounded text-gray-400">其它参数...</div>
        <div class="p-4 bg-gray-50 rounded text-gray-400">其它参数...</div>
      </div>
      <div class="p-4 border-t bg-gray-50 flex gap-4 rounded-b-2xl">
         <button class="flex-1 bg-white border p-2 rounded">取消</button>
         <button class="flex-1 bg-black text-white p-2 rounded">保存</button>
      </div>
    </div>
    
    <!-- Sidebar mockup to show navigation -->
    <div class="absolute left-0 top-0 h-full w-48 bg-gray-900 text-gray-400 flex flex-col pt-8 space-y-2">
        <div class="px-4 py-2 hover:bg-gray-800">运营概览</div>
        <div class="px-4 py-2 hover:bg-gray-800">价格趋势分析</div>
        <div class="px-4 py-2 bg-indigo-600 font-bold text-white relative">
            硬件价格管理
            <div class="absolute -right-3 top-2 w-6 h-6 bg-red-500 rotate-45"></div>
        </div>
        <div class="px-4 py-2 hover:bg-gray-800">配置单管理</div>
    </div>
    
  </body></html>
  `;
  
  await page.setContent(htmlContent);
  await page.screenshot({ path: '/Users/mac/.gemini/antigravity/brain/957ad1df-408a-4f1e-9ac5-79622763c3e3/artifacts/location_guide.png' });
  await browser.close();
})();
