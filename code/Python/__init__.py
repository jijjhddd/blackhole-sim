"""
黑洞吞噬流星模拟器 Python 后端包
提供 Flask 应用、API 蓝图、日志管理、状态管理等功能
"""

from .app import create_app
from .api import api_bp
from .config import BASE_DIR, USER_DATA_DIR, USER_LOG_DIR, PYTHON_LOG_DIR, JS_LOG_DIR
from .log_manager import js_log_manager, log_python, JSLogManager
from .state_manager import save_state, load_state, list_saves

__all__ = [
    'create_app',
    'api_bp',
    'BASE_DIR',
    'USER_DATA_DIR',
    'USER_LOG_DIR',
    'PYTHON_LOG_DIR',
    'JS_LOG_DIR',
    'js_log_manager',
    'log_python',
    'JSLogManager',
    'save_state',
    'load_state',
    'list_saves'
]
