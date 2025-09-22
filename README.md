# OpenDRIVE Map Editor V2.0

A comprehensive web-based OpenDRIVE map editor with advanced road drawing, curve generation, and point cloud visualization capabilities.

## ✨ Key Features

### 🛣️ Advanced Road Drawing
- **Interactive Road Creation** - Click-to-draw road centerlines with real-time visual feedback
- **Smart Curve Generation** - Automatic curve creation between road endpoints with multiple algorithms
- **Road Editing System** - Click any road to edit parameters (width, lanes, curvature, extension direction)
- **Real-time Preview** - Live parameter adjustment with instant visual feedback
- **Undo/Redo Support** - Full operation history with Ctrl+Z/Ctrl+Y shortcuts

### 🔄 Curve Generation Algorithms
- **Multiple Curve Types** - Simple, Outward, Inward, S-curve, and Arc curves
- **Smart Auto Selection** - Automatic curve type based on road angles and distances
- **Customizable Parameters** - Adjustable curve radius (0.1x to 4.0x), direction, and extension settings
- **Smooth Connections** - Advanced algorithms ensure perfect road-to-curve transitions
- **Extension Controls** - Separate control for start/end point extension direction and length

### 📊 Point Cloud Visualization
- **PCD Format Support** - Load and visualize point cloud data files
- **Advanced Filtering** - Filter by intensity, height, and sampling rate
- **Performance Optimization** - Automatic sampling for large datasets (10M+ points)
- **Real-time Statistics** - Live point cloud data analysis and display
- **Direction Arrows** - Visual road direction indicators (toggleable)

### 🎮 Interactive Controls
- **3D Navigation** - Mouse controls for rotation, pan, and zoom
- **Precision Drawing** - Grid snapping and click tolerance settings
- **Keyboard Shortcuts** - ESC to exit, Ctrl+Z to undo, Space to toggle drawing
- **Context Menus** - Right-click operations for road management

### 💾 Data Management
- **OpenDRIVE Export** - Generate standard OpenDRIVE XML files
- **JSON Import/Export** - Save and load project data
- **Road Validation** - Automatic validation of road geometry and parameters
- **Project Persistence** - Save complete project state

## 🚀 Quick Start

### 1. Launch the Application
```bash
# Option 1: Python server (recommended)
python server.py

# Option 2: Simple server
python run.py

# Option 3: Direct open
# Open index.html in your browser
```

### 2. Load Point Cloud Data
1. Click "Select PCD File" in the left panel
2. Choose a `.pcd` format point cloud file
3. Wait for loading to complete

### 3. Draw Roads
1. Click "开始画路" (Start Drawing) to enter drawing mode
2. Left-click in the 3D scene to add road points
3. Click "结束绘制" (End Drawing) or press ESC to complete

### 4. Create Curves
1. Click "创建弯道" (Create Curve) 
2. Click on two road endpoints to connect them
3. Choose curve type and adjust parameters in the editing panel

### 5. Edit Roads
1. Click "编辑道路" (Edit Road) to enter edit mode
2. Click any road to select and edit its parameters
3. Adjust width, lanes, curve radius, extension settings
4. Click "应用修改" (Apply Changes) to save

## 🎛️ Control Panels

### Road Drawing Panel
- **Basic Parameters** - Lane width (2.0-5.0m), lane count (1-6)
- **Precision Settings** - Grid snapping, click tolerance
- **Display Settings** - Show/hide road direction arrows
- **Road Types** - Highway, arterial, collector, residential, service

### Road Editing Panel
- **Road Parameters** - Width, lane count, road type
- **Curve Settings** - Radius multiplier, direction, extension controls
- **Real-time Preview** - Live parameter adjustment
- **Operations** - Apply changes, cancel editing

### Point Cloud Panel
- **Filtering** - Intensity range, height range, sampling rate
- **Display** - Point size, color coding
- **Statistics** - Point count, data ranges
- **Reset** - Clear all filters

## 🏗️ Project Structure

```
OpenDRIVE-Editor/
├── index.html                    # Main application interface
├── src/
│   ├── opendrive-editor.js      # Core application logic (6000+ lines)
│   ├── css/
│   │   └── styles.css           # Application styling
│   └── js/                      # Three.js libraries
│       ├── three.min.js         # Three.js core
│       ├── OrbitControls.js     # Camera controls
│       └── PCDLoader.js         # PCD file loader
├── server.py                    # Python development server
├── run.py                       # Simple server script
└── README.md                    # This documentation
```

## 🔧 Technical Implementation

### Core Technologies
- **Three.js** - 3D graphics and WebGL rendering
- **Pure Frontend** - HTML5, CSS3, JavaScript (ES6+)
- **No Dependencies** - Self-contained application

### Key Algorithms
- **Ray Casting** - Precise 3D click detection
- **Bezier Curves** - Smooth curve generation (Quadratic, Cubic, Quartic)
- **Road Geometry** - 3D mesh generation with proper normals
- **Point Cloud Processing** - Efficient rendering of large datasets
- **Grid Snapping** - Precision point placement

### Advanced Features
- **Smart Curve Selection** - Automatic algorithm choice based on geometry
- **Extension System** - Configurable road extensions for smooth connections
- **Real-time Validation** - Live geometry and parameter checking
- **Memory Management** - Efficient handling of large point clouds
- **Error Recovery** - Robust error handling and user feedback

## 🎯 Road Drawing Workflow

1. **Load Point Cloud** - Import PCD data for reference
2. **Configure Settings** - Set lane width, count, and precision
3. **Draw Roads** - Click-to-draw road centerlines
4. **Create Curves** - Connect roads with smooth curves
5. **Edit Parameters** - Fine-tune road properties
6. **Export Data** - Generate OpenDRIVE or JSON files

## 🔄 Curve Generation System

### Available Algorithms
- **Simple Curve** - Basic quadratic Bezier curves
- **Outward Curve** - Curves that bulge outward
- **Inward Curve** - Curves that curve inward
- **S-curve** - Smooth S-shaped transitions
- **Arc Curve** - Circular arc segments

### Customization Options
- **Radius Multiplier** - 0.1x to 4.0x curve intensity
- **Direction Control** - Forward/backward extension direction
- **Length Control** - 0.05x to 0.5x extension length
- **Auto Selection** - Smart algorithm choice

## 🌐 Browser Compatibility

- **Chrome** (Recommended) - Full feature support
- **Firefox** - Complete compatibility
- **Edge** - Full functionality
- **Safari** - Basic support

## 📋 Keyboard Shortcuts

- **Space** - Toggle drawing mode
- **ESC** - Exit current mode
- **Ctrl+Z** - Undo last action
- **Ctrl+Y** - Redo last action
- **Delete** - Remove last point (in drawing mode)

## 🐛 Troubleshooting

### Common Issues
1. **Point Cloud Not Loading** - Check file format and browser console
2. **Performance Issues** - Reduce sampling rate for large datasets
3. **Drawing Not Working** - Ensure you're in drawing mode
4. **Curves Not Generating** - Check road endpoint selection

### Debug Features
- **Console Logging** - Detailed operation logs
- **Test Functions** - Generate test point clouds
- **Error Reporting** - Comprehensive error messages

## 🚀 Future Enhancements

- **More Point Cloud Formats** - LAS, XYZ, PLY support
- **Advanced Road Types** - Highways, intersections, roundabouts
- **3D Road Models** - Realistic road surface generation
- **Terrain Integration** - Ground elevation consideration
- **Collaborative Editing** - Multi-user support
- **Real-time Validation** - Live OpenDRIVE compliance checking

## 📄 License

MIT License - Free for personal and commercial use

## 🤝 Contributing

Contributions welcome! Please feel free to submit issues and pull requests.

---

**Version 2.0** - Complete road drawing and curve generation system with advanced editing capabilities.