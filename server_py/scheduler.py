import logging
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import os
import subprocess

logger = logging.getLogger(__name__)

def run_jd_price_sync():
    logger.info(f"[{datetime.now()}] 🐶 开始执行每日京东价格同步任务...")
    # 调用我们写好的基于京东官方接口的比价脚本
    script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts", "jd_ram_sync.py")
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
    # 每天凌晨 3:00 自动执行比价任务 (hour=3, minute=0)
    scheduler.add_job(run_jd_price_sync, 'cron', hour=3, minute=0, id='jd_daily_sync', replace_existing=True)
    scheduler.start()
    logger.info("⏰ 全局定时任务系统 (APScheduler) 启动成功！每日3AM同步京东价")

