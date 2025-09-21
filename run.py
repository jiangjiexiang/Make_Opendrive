#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OpenDRIVE地图编辑器 - 快速启动脚本
"""

import http.server
import socketserver
import webbrowser
import os
import threading
import time

def start_server(port=8080):
    """启动简单HTTP服务器"""
    # 确保在正确目录
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # 查找可用端口
    original_port = port
    while True:
        try:
            with socketserver.TCPServer(("", port), http.server.SimpleHTTPRequestHandler) as httpd:
                break
        except OSError:
            port += 1
            if port > original_port + 50:
                print("❌ 无法找到可用端口")
                return
    
    # 创建服务器
    handler = http.server.SimpleHTTPRequestHandler
    httpd = socketserver.TCPServer(("", port), handler)
    
    # 服务器信息
    url = f"http://localhost:{port}"
    print("🚀 OpenDRIVE地图编辑器")
    print("=" * 40)
    print(f"🌐 地址: {url}")
    print(f"📁 目录: {os.getcwd()}")
    print("💡 按 Ctrl+C 停止服务器")
    print("=" * 40)
    
    # 延迟打开浏览器
    def open_browser():
        time.sleep(1)
        print(f"🌍 正在打开浏览器...")
        try:
            webbrowser.open(url)
        except:
            print(f"请手动访问: {url}")
    
    threading.Thread(target=open_browser, daemon=True).start()
    
    # 启动服务器
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 服务器已停止")
        httpd.shutdown()

if __name__ == "__main__":
    start_server()
