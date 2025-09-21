#!/usr/bin/env python3
"""
PCD文件分析工具
用于分析PCD文件的头部信息和数据格式
"""

import struct
import sys
import os

def analyze_pcd_file(file_path):
    """分析PCD文件"""
    print(f"🔍 分析PCD文件: {file_path}")
    print("=" * 50)
    
    if not os.path.exists(file_path):
        print(f"❌ 文件不存在: {file_path}")
        return
    
    file_size = os.path.getsize(file_path)
    print(f"📁 文件大小: {file_size:,} 字节 ({file_size/1024/1024:.2f} MB)")
    
    with open(file_path, 'rb') as f:
        # 读取头部
        header_lines = []
        while True:
            line = f.readline()
            if not line:
                break
            line_str = line.decode('utf-8', errors='ignore').strip()
            header_lines.append(line_str)
            if line_str == 'DATA binary_compressed' or line_str == 'DATA binary' or line_str == 'DATA ascii':
                break
        
        print(f"📄 头部行数: {len(header_lines)}")
        print("📋 头部内容:")
        for i, line in enumerate(header_lines):
            print(f"  {i+1:2d}: {line}")
        
        # 解析头部信息
        header_info = {}
        for line in header_lines:
            if line.startswith('FIELDS'):
                header_info['fields'] = line.split()[1:]
            elif line.startswith('SIZE'):
                header_info['sizes'] = [int(x) for x in line.split()[1:]]
            elif line.startswith('TYPE'):
                header_info['types'] = line.split()[1:]
            elif line.startswith('COUNT'):
                header_info['counts'] = [int(x) for x in line.split()[1:]]
            elif line.startswith('WIDTH'):
                header_info['width'] = int(line.split()[1])
            elif line.startswith('HEIGHT'):
                header_info['height'] = int(line.split()[1])
            elif line.startswith('POINTS'):
                header_info['points'] = int(line.split()[1])
            elif line.startswith('DATA'):
                header_info['data_type'] = line.split()[1]
        
        print("\n📊 解析的头部信息:")
        for key, value in header_info.items():
            print(f"  {key}: {value}")
        
        # 计算行大小
        if 'sizes' in header_info and 'counts' in header_info:
            row_size = sum(s * c for s, c in zip(header_info['sizes'], header_info['counts']))
            print(f"\n📏 计算的行大小: {row_size} 字节")
            
            # 计算字段偏移
            print("\n🔍 字段偏移:")
            current_offset = 0
            for i, field in enumerate(header_info['fields']):
                field_size = header_info['sizes'][i] * header_info['counts'][i]
                print(f"  {field}: 偏移={current_offset}, 大小={field_size}")
                current_offset += field_size
        
        # 分析数据部分
        data_start = f.tell()
        data_size = file_size - data_start
        print(f"\n📦 数据部分:")
        print(f"  起始位置: {data_start}")
        print(f"  数据大小: {data_size:,} 字节")
        
        if header_info.get('data_type') == 'binary_compressed':
            print("  格式: 压缩二进制")
            print("  ⚠️  压缩数据需要特殊解压缩处理")
        elif header_info.get('data_type') == 'binary':
            print("  格式: 二进制")
        else:
            print("  格式: ASCII")
        
        # 尝试读取前几个数据点
        if header_info.get('data_type') in ['binary', 'binary_compressed']:
            print("\n🔍 尝试读取前几个数据点:")
            f.seek(data_start)
            
            try:
                # 读取前几行数据
                for i in range(min(3, header_info.get('points', 0))):
                    if data_start + (i + 1) * row_size > file_size:
                        break
                    
                    row_data = f.read(row_size)
                    if len(row_data) < row_size:
                        break
                    
                    print(f"\n  点 {i+1}:")
                    
                    # 根据字段顺序解析
                    current_pos = 0
                    for j, field in enumerate(header_info['fields']):
                        field_size = header_info['sizes'][j] * header_info['counts'][j]
                        field_data = row_data[current_pos:current_pos + field_size]
                        
                        if field_size == 4:  # 32位浮点数
                            value = struct.unpack('<f', field_data)[0]
                            print(f"    {field}: {value}")
                        elif field_size == 1:  # 8位整数
                            value = struct.unpack('<B', field_data)[0]
                            print(f"    {field}: {value}")
                        
                        current_pos += field_size
                        
            except Exception as e:
                print(f"  ❌ 读取数据时出错: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("用法: python analyze_pcd.py <pcd_file>")
        sys.exit(1)
    
    analyze_pcd_file(sys.argv[1])
