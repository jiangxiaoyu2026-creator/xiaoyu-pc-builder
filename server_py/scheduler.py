import logging
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import os
import subprocess

logger = logging.getLogger(__name__)

def run_jd_price_sync():
    logger.info(f"[{datetime.now()}] 🐶 开始执行每日京东价格同步任务...")
    # 调用独立的京东价格抓取脚本
    script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts", "fetch_jd_trends.py")
    if os.path.exists(script_path):
        try:
            # 在独立的子进程运行抓取脚本
            subprocess.Popen(["python3", script_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            logger.info("✅ 京东价格同步脚本已触发启动！")
        except Exception as e:
            logger.error(f"❌ 运行京东同步脚本失败: {e}")
    else:
        logger.warning(f"⚠️ 找不到同步脚本: {script_path}")

def start_scheduler():
    scheduler = BackgroundScheduler()
    # 每天早上 10:00 和下午 18:00 各执行一次价格抓取
    scheduler.add_job(run_jd_price_sync, 'cron', hour=10, minute=0, id='jd_morning_sync', replace_existing=True)
    scheduler.add_job(run_jd_price_sync, 'cron', hour=18, minute=0, id='jd_evening_sync', replace_existing=True)
    scheduler.start()
    logger.info("⏰ 全局定时任务系统 (APScheduler) 启动成功！每日10AM/6PM同步京东价格")
