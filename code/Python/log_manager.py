import logging
import json
import time
from datetime import datetime
from .config import PYTHON_LOG_FILE, JS_LOG_FILE

# 配置 Python 日志
python_logger = logging.getLogger('python_logger')
python_logger.setLevel(logging.DEBUG)

# 文件处理器
python_file_handler = logging.FileHandler(PYTHON_LOG_FILE, encoding='utf-8')
python_file_handler.setLevel(logging.DEBUG)
python_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
python_file_handler.setFormatter(python_formatter)
python_logger.addHandler(python_file_handler)

# 控制台处理器（可选）
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(python_formatter)
python_logger.addHandler(console_handler)

def log_python(level, message):
    """记录 Python 日志"""
    getattr(python_logger, level)(message)

# JavaScript 日志管理
class JSLogManager:
    def __init__(self):
        self.logs = []  # 内存缓存，可限制大小
        self.max_logs = 1000

    def add_log(self, log_entry):
        """添加一条 JS 日志到内存和文件"""
        self.logs.append(log_entry)
        if len(self.logs) > self.max_logs:
            self.logs.pop(0)
        # 追加到文件
        try:
            with open(JS_LOG_FILE, 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
        except Exception as e:
            python_logger.error(f"写入 JS 日志失败: {e}")

    def get_logs(self, limit=None, level=None):
        """获取日志，可筛选级别和限制数量"""
        logs = self.logs
        if level:
            logs = [log for log in logs if log.get('type') == level]
        if limit:
            logs = logs[-limit:]
        return logs

    def clear_logs(self):
        self.logs = []
        # 清空文件
        open(JS_LOG_FILE, 'w').close()

js_log_manager = JSLogManager()
