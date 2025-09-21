#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OpenDRIVE地图编辑器 V1.0 - Python启动服务器
基于Python内置HTTP服务器的简单Web服务启动脚本
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import threading
import time
import json
from pathlib import Path
from datetime import datetime

class OpenDriveServer:
    def __init__(self, port=8080, auto_open=True):
        self.port = port
        self.auto_open = auto_open
        self.server = None
        self.server_thread = None
        
    def find_available_port(self, start_port=8080):
        """查找可用端口"""
        import socket
        
        for port in range(start_port, start_port + 100):
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(('localhost', port))
                    return port
            except OSError:
                continue
        
        raise RuntimeError("无法找到可用端口")
    
    def setup_server(self):
        """设置HTTP服务器"""
        # 确保在项目根目录
        os.chdir(Path(__file__).parent)
        
        # 查找可用端口
        try:
            self.port = self.find_available_port(self.port)
        except RuntimeError as e:
            print(f"❌ 错误: {e}")
            sys.exit(1)
        
        # 创建自定义处理器
        class CustomHandler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=os.getcwd(), **kwargs)
            
            def end_headers(self):
                # 添加CORS头以支持本地文件访问
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', '*')
                super().end_headers()
            
            def do_POST(self):
                if self.path == '/log':
                    self.handle_log()
                else:
                    super().do_POST()
            
            def handle_log(self):
                try:
                    content_length = int(self.headers['Content-Length'])
                    post_data = self.rfile.read(content_length)
                    log_data = json.loads(post_data.decode('utf-8'))
                    
                    # 格式化日志信息
                    timestamp = datetime.now().strftime('%H:%M:%S')
                    level_emoji = {
                        'info': 'ℹ️',
                        'warn': '⚠️',
                        'error': '❌',
                        'success': '✅'
                    }.get(log_data.get('level', 'info'), '📝')
                    
                    print(f"{level_emoji} [{timestamp}] 浏览器日志: {log_data.get('message', '')}")
                    
                    # 发送响应
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'status': 'success'}).encode())
                    
                except Exception as e:
                    print(f"❌ 处理日志失败: {e}")
                    self.send_response(500)
                    self.end_headers()
            
            def log_message(self, format, *args):
                # 自定义日志格式
                print(f"📡 {self.address_string()} - {format % args}")
        
        # 创建服务器
        self.server = socketserver.TCPServer(("", self.port), CustomHandler)
        
        print("🚀 OpenDRIVE地图编辑器启动中...")
        print("=" * 50)
        print(f"🌐 服务器地址: http://localhost:{self.port}")
        print(f"📁 服务目录: {os.getcwd()}")
        print("=" * 50)
        
    def open_browser(self):
        """延迟打开浏览器"""
        if self.auto_open:
            time.sleep(1)  # 等待服务器完全启动
            url = f"http://localhost:{self.port}"
            print(f"🌍 正在打开浏览器: {url}")
            try:
                webbrowser.open(url)
            except Exception as e:
                print(f"⚠️  无法自动打开浏览器: {e}")
                print(f"请手动在浏览器中访问: {url}")
    
    def start(self):
        """启动服务器"""
        try:
            self.setup_server()
            
            # 在后台线程中打开浏览器
            if self.auto_open:
                browser_thread = threading.Thread(target=self.open_browser)
                browser_thread.daemon = True
                browser_thread.start()
            
            print("✅ 服务器启动成功！")
            print("💡 使用说明:")
            print("   - 在浏览器中加载PCD点云文件")
            print("   - 点击'开始画路'进行道路绘制")
            print("   - 按 Ctrl+C 停止服务器")
            print("=" * 50)
            
            # 启动服务器
            self.server.serve_forever()
            
        except KeyboardInterrupt:
            self.stop()
        except Exception as e:
            print(f"❌ 服务器启动失败: {e}")
            sys.exit(1)
    
    def stop(self):
        """停止服务器"""
        if self.server:
            print("\n🛑 正在停止服务器...")
            self.server.shutdown()
            self.server.server_close()
            print("✅ 服务器已停止")

def check_files():
    """检查必要文件是否存在"""
    required_files = ['index.html', 'src/opendrive-editor.js']
    missing_files = []
    
    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print("❌ 缺少必要文件:")
        for file in missing_files:
            print(f"   - {file}")
        print("\n请确保在项目根目录运行此脚本！")
        sys.exit(1)

def print_banner():
    """打印启动横幅"""
    banner = """
██████╗ ██████╗ ███████╗███╗   ██╗██████╗ ██████╗ ██╗██╗   ██╗███████╗
██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔══██╗██║██║   ██║██╔════╝
██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║  ██║██████╔╝██║██║   ██║█████╗  
██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║  ██║██╔══██╗██║╚██╗ ██╔╝██╔══╝  
╚██████╔╝██║     ███████╗██║ ╚████║██████╔╝██║  ██║██║ ╚████╔╝ ███████╗
 ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝
                                                                        
           地图编辑器 V1.0 - 基于Three.js的点云可视化工具              
    """
    print(banner)

def main():
    """主函数"""
    print_banner()
    
    # 检查必要文件
    check_files()
    
    # 解析命令行参数
    import argparse
    parser = argparse.ArgumentParser(description='OpenDRIVE地图编辑器启动服务器')
    parser.add_argument('-p', '--port', type=int, default=8080, 
                       help='服务器端口 (默认: 8080)')
    parser.add_argument('--no-browser', action='store_true',
                       help='不自动打开浏览器')
    
    args = parser.parse_args()
    
    # 创建并启动服务器
    server = OpenDriveServer(
        port=args.port,
        auto_open=not args.no_browser
    )
    
    server.start()

if __name__ == "__main__":
    main()
