# OpenDRIVE Map Editor V1.0

A web-based OpenDRIVE map editor that supports PCD point cloud data visualization and interactive road centerline drawing.

## Features

### 🔧 Core Technologies
- **Three.js** - 3D graphics rendering engine
- **Pure Frontend** - HTML5, CSS3, JavaScript (ES6+)
- **Responsive Design** - Modern user interface

### 📊 Point Cloud Data Visualization
- Support for loading local PCD format point cloud files
- Automatic point cloud boundary calculation and camera adjustment
- Real-time point cloud data statistics display
- High-performance point cloud rendering with automatic sampling
- Point cloud filtering (intensity, height, sampling rate)
- Support for binary_compressed PCD format with pako.js
- Automatic point cloud orientation detection and correction
- Error handling for corrupted or abnormal point cloud data

### 🛣️ Road Drawing Features
- Interactive road centerline drawing
- Real-time visual feedback
- Undo operation support (Ctrl+Z)
- Point markers display (start/end/middle points)
- Road parameter configuration (lane width, lane count, road type)
- Road visualization with 3D meshes

### 🔄 Road Connection Features
- **Junction Creation** - Connect multiple roads at intersections
- **Curve Generation** - Create smooth curves between road endpoints
- **Smart Curve Algorithm** - Automatic curve type selection based on road angles and distances
- **Road Management** - Save, load, and manage multiple roads

### 🎮 Interactive Controls
- **Left Mouse Drag** - Rotate view
- **Right Mouse Drag** - Pan scene
- **Mouse Wheel** - Zoom view
- **Left Click in Drawing Mode** - Add path points
- **ESC Key** - Exit drawing mode
- **Ctrl+Z** - Undo last added point

### 🎛️ Control Panels
- **PCD Control Panel** - Point cloud filtering and display settings
- **Road Control Panel** - Road parameters and operations
- **Test Functions** - Create test point clouds, force display, and manual rotation
- **Debug Features** - Server-side logging and error reporting

## Usage

### 1. Start the Application

#### Method 1: Python Server (Recommended)
```bash
# Option 1: Use full server script
python server.py

# Option 2: Use simple server script
python run.py
```

#### Method 2: Direct Open
Open `index.html` directly in your browser.

### 2. Load Point Cloud Data
1. Click "Select PCD File" button in the left panel
2. Choose a local `.pcd` format point cloud file
3. Wait for file loading to complete, point cloud will automatically display in 3D scene

### 3. Draw Road Centerlines
1. Click "Start Drawing" button to enter drawing mode
2. Left-click in the 3D scene to add path points
3. Path points will automatically connect to form road centerlines
4. Click "End Drawing" or press ESC to complete drawing

### 4. Create Road Connections
1. **Junctions**: Click "Create Junction" and select two roads to connect
2. **Curves**: Click "Create Curve" and select two road endpoints to create smooth curves
3. **Road Management**: Use save, load, and display functions to manage roads

### 5. Point Cloud Controls
- **Intensity Filtering**: Filter points by intensity values
- **Height Filtering**: Filter points by height (Y-axis) values
- **Point Size**: Adjust point cloud point size
- **Sampling Rate**: Reduce point density for performance
- **Reset Filters**: Reset all filtering settings

### 6. Scene Controls
- Use mouse to control camera view
- Use mouse wheel for zooming
- Camera controls are temporarily disabled in drawing mode

## Project Structure

```
OpenDRIVE-Editor/
├── index.html              # Main HTML file
├── src/                    # Source code directory
│   ├── opendrive-editor.js # Core application logic
│   ├── css/
│   │   └── styles.css      # Application styles
│   └── js/                 # Three.js libraries
│       ├── three.min.js    # Three.js core library
│       ├── OrbitControls.js # Camera controls
│       └── PCDLoader.js    # PCD file loader
├── server.py               # Python server (full version)
├── run.py                  # Python server (simplified version)
├── README.md               # Project documentation
└── sample/                 # Sample PCD files (optional)
    ├── test.pcd           # Sample point cloud
    └── changfang.pcd      # Sample point cloud
```

## Technical Implementation

### Core Class: OpenDriveEditor
Main responsibilities:
- Three.js scene initialization
- PCD file loading and point cloud rendering
- Interactive camera control (OrbitControls)
- Ray casting for precise click detection
- Dynamic road line generation and updates
- Road connection and curve generation
- Point cloud filtering and management

### Key Technical Points
1. **Point Cloud Loading**: Uses Three.js PCDLoader for point cloud data loading
2. **Ray Casting**: Implements precise click detection in 3D scenes through Raycaster
3. **Dynamic Geometry**: BufferGeometry dynamic updates for real-time line drawing
4. **Camera Control**: OrbitControls provides smooth 3D navigation experience
5. **Road Generation**: Smart algorithms for road connections and curve generation
6. **Data Compression**: Support for binary_compressed PCD format with pako.js

### Advanced Features
- **Smart Curve Generation**: Automatic curve type selection (straight, arc, S-curve)
- **Road Visualization**: 3D mesh generation for realistic road display
- **Point Cloud Filtering**: Real-time filtering by intensity, height, and sampling
- **Memory Optimization**: Efficient handling of large point cloud files (10M+ points)
- **Error Handling**: Comprehensive error handling and user feedback
- **Server Integration**: Python server with logging and CORS support
- **Point Cloud Recovery**: Automatic fallback for corrupted data

## Browser Compatibility
- Chrome (Recommended)
- Firefox
- Edge
- Safari

## Dependencies
- Three.js (3D graphics library)
- pako.js (compression library for PCD files)

## Development Extensions

This is V1.0 version, future extensions could include:
- OpenDRIVE format export
- Support for more point cloud formats (LAS, XYZ, etc.)
- Road property editing (width, type, etc.)
- 3D road model generation
- Terrain editing features
- Advanced road design tools
- Real-time collaboration

## License
MIT License

## Contributing
Welcome to submit Issues and Pull Requests to improve this project!

## Troubleshooting

### Common Issues
1. **Point Cloud Not Displaying**: Try clicking "Create Test Point Cloud" button
2. **Large File Loading**: The system automatically uses simplified parsing for large files
3. **Memory Issues**: Use sampling rate control to reduce point density
4. **Browser Compatibility**: Ensure your browser supports WebGL

### Debug Features
- Detailed console logging for troubleshooting
- Test point cloud generation
- Force display functionality
- Error reporting and handling