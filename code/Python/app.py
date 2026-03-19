from flask import Flask, send_from_directory
from .api import api_bp
from .config import BASE_DIR

def create_app():
    app = Flask(__name__, static_folder=str(BASE_DIR), static_url_path='')
    
    # 注册蓝图
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # 根路径返回 index.html
    @app.route('/')
    def index():
        return send_from_directory(str(BASE_DIR), 'index.html')
    
    return app
