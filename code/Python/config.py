import os
from pathlib import Path

# 项目根目录
BASE_DIR = Path(__file__).parent.parent.parent

# 用户数据目录
USER_DATA_DIR = BASE_DIR / 'user' / 'data'
USER_LOG_DIR = BASE_DIR / 'user' / 'log'
PYTHON_LOG_DIR = USER_LOG_DIR / 'Python'
JS_LOG_DIR = USER_LOG_DIR / 'JavaScript'

# 确保目录存在
USER_DATA_DIR.mkdir(parents=True, exist_ok=True)
PYTHON_LOG_DIR.mkdir(parents=True, exist_ok=True)
JS_LOG_DIR.mkdir(parents=True, exist_ok=True)

# 日志文件
PYTHON_LOG_FILE = PYTHON_LOG_DIR / 'python.log'
JS_LOG_FILE = JS_LOG_DIR / 'javascript.log'

# 保存的状态文件扩展名
STATE_FILE_EXT = '.json'
