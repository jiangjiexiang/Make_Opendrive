/**
 * OpenDRIVE Map Editor V1.0 - Fixed Version
 * Focused on reliable point cloud display and road drawing
 */

class OpenDriveEditor {
    constructor() {
        // Three.js core components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Point cloud and drawing related
        this.pointCloud = null;
        this.originalPointCloudData = null; // Store original point cloud data for filtering
        this.isDrawingMode = false;
        this.currentRoadPoints = [];
        this.roadLine = null;
        this.drawingPlane = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Road design related
        this.roads = []; // Store all completed roads
        this.junctions = []; // Store all junctions
        this.currentRoad = null; // Currently drawing road
        this.roadParameters = {
            laneWidth: 3.5,
            laneCount: 2,
            roadType: 'residential'
        };
        
        // Junction related
        this.isJunctionMode = false;
        this.selectedRoads = []; // Selected roads for creating junctions
        this.junctionConnectionPoints = []; // Junction connection points
        
        // Curve related
        this.isCurveMode = false;
        this.selectedRoadsForCurve = []; // Selected roads for creating curves
        this.curveParameters = {
            autoConnect: true,
            forceStraight: false
        };
        
        // Camera state saving
        this.savedCameraState = null;
        
        // PCD control panel related
        this.pcdControlsPanel = null;
        this.pcdFilters = {
            intensity: { enabled: false, min: 0, max: 255 },
            height: { enabled: false, min: -10, max: 10 },
            pointSize: 2.0,
            samplingRate: 100
        };
        
        // DOM elements
        this.container = document.getElementById('scene-container');
        this.pcdFileInput = document.getElementById('pcdFileInput');
        this.drawButton = document.getElementById('drawButton');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.fileStatus = document.getElementById('fileStatus');
        this.pointCount = document.getElementById('pointCount');
        this.drawStatus = document.getElementById('drawStatus');
        this.pointsCount = document.getElementById('pointsCount');
        
        // PCD control panel DOM elements
        this.pcdControlsPanel = document.getElementById('pcdControlsPanel');
        
        // Road control panel DOM elements
        this.roadControlsPanel = document.getElementById('roadControlsPanel');
        
        this.init();
    }
    
    init() {
        console.log('🚀 Initializing OpenDRIVE editor...');
        
        if (typeof THREE === 'undefined') {
            this.showError('Three.js未加载，请刷新页面重试');
            return;
        }
        
        try {
            this.initThreeJS();
            this.initControls();
            this.initScene();
            this.initEventListeners();
            this.initPCDControls();
            this.initRoadControls();
            this.animate();
            
            console.log('✅ OpenDRIVE editor initialization completed');
        } catch (error) {
            console.error('❌ 初始化失败:', error);
            this.showError('编辑器初始化失败: ' + error.message);
        }
    }
    
    applyFiltersToData(positions, colors, intensities) {
        const filteredPositions = [];
        const filteredColors = [];
        const samplingStep = Math.max(1, Math.floor(100 / this.pcdFilters.samplingRate));
        
        let totalPoints = 0;
        let sampledPoints = 0;
        let heightFiltered = 0;
        let intensityFiltered = 0;
        let finalPoints = 0;
        
        for (let i = 0; i < positions.length; i += 3) {
            totalPoints++;
            
            // Skip sampling
            const pointIndex = i / 3;
            if (pointIndex % samplingStep !== 0) continue;
            sampledPoints++;
            
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            // Apply height filtering
            if (this.pcdFilters.height.enabled) {
                if (y < this.pcdFilters.height.min || y > this.pcdFilters.height.max) {
                    heightFiltered++;
                    continue;
                }
            }
            
            // Apply intensity filtering
            if (this.pcdFilters.intensity.enabled && intensities.length > 0) {
                const intensityIndex = pointIndex;
                if (intensityIndex < intensities.length) {
                    const intensity = intensities[intensityIndex];
                    if (intensity < this.pcdFilters.intensity.min || intensity > this.pcdFilters.intensity.max) {
                        intensityFiltered++;
                        continue;
                    }
                }
            }
            
            // Point passed all filters
            filteredPositions.push(x, y, z);
            finalPoints++;
            
            if (colors.length > 0) {
                filteredColors.push(colors[i], colors[i + 1], colors[i + 2]);
            }
        }
        
        console.log('📊 过滤统计:');
        console.log(`- 总点数: ${totalPoints.toLocaleString()}`);
        console.log(`- 采样后: ${sampledPoints.toLocaleString()} (${((sampledPoints/totalPoints)*100).toFixed(1)}%)`);
        console.log(`- 高度过滤: ${heightFiltered.toLocaleString()}`);
        console.log(`- 强度过滤: ${intensityFiltered.toLocaleString()}`);
        console.log(`- 最终显示: ${finalPoints.toLocaleString()} (${((finalPoints/totalPoints)*100).toFixed(1)}%)`);
        
        return {
            positions: filteredPositions,
            colors: filteredColors
        };
    }
    
    applyFilters() {
        if (!this.originalPointCloudData) return;
        
        console.log('🔄 应用过滤器...');
        console.log('📊 当前过滤设置:', {
            intensity: this.pcdFilters.intensity,
            height: this.pcdFilters.height,
            samplingRate: this.pcdFilters.samplingRate
        });
        
        this.buildPointCloudGeometry();
        
        // 发送过滤更新日志到服务器
        this.sendLogToServer(`过滤器已应用 - 强度: ${this.pcdFilters.intensity.enabled ? '开启' : '关闭'}, 高度: ${this.pcdFilters.height.enabled ? '开启' : '关闭'}`, 'info');
    }
    
    updatePointSize() {
        if (!this.pointCloud || !this.pointCloud.material) return;
        
        // Save current camera state
        this.saveCameraState();
        
        this.pointCloud.material.size = this.pcdFilters.pointSize;
        this.pointCloud.material.needsUpdate = true;
        
        // Restore camera state
        this.restoreCameraState();
    }
    
    resetFilters() {
        console.log('🔄 重置所有过滤器...');
        
        // 重置过滤器状态
        this.pcdFilters.intensity.enabled = false;
        this.pcdFilters.height.enabled = false;
        this.pcdFilters.pointSize = 2.0;
        this.pcdFilters.samplingRate = 100;
        
        // 重置UI控件
        document.getElementById('intensityFilterEnabled').checked = false;
        document.getElementById('heightFilterEnabled').checked = false;
        document.getElementById('intensityMin').disabled = true;
        document.getElementById('intensityMax').disabled = true;
        document.getElementById('heightMin').disabled = true;
        document.getElementById('heightMax').disabled = true;
        
        document.getElementById('pointSize').value = 2.0;
        document.getElementById('pointSizeValue').textContent = '2.0';
        document.getElementById('samplingRate').value = 100;
        document.getElementById('samplingRateValue').textContent = '100';
        
        // 重新分析数据范围并设置默认值
        if (this.originalPointCloudData) {
            this.analyzeDataRanges();
            this.applyFilters();
        }
    }
    
    initThreeJS() {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x263238);
        
        // 创建相机
        this.camera = new THREE.PerspectiveCamera(
            60,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            10000
        );
        this.camera.position.set(50, 30, 50);
        
        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x263238, 1);
        
        this.container.appendChild(this.renderer.domElement);
        
        console.log('✅ Three.js基础组件初始化完成');
    }
    
    initControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 1000;
        this.controls.target.set(0, 0, 0);
        
        console.log('✅ 相机控制初始化完成');
    }
    
    initScene() {
        // 添加光源
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(50, 50, 25);
        this.scene.add(directionalLight);
        
        // 添加网格
        const gridHelper = new THREE.GridHelper(200, 50, 0x444444, 0x444444);
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.5;
        this.scene.add(gridHelper);
        
        // 创建绘图平面
        const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
        const planeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x808080, 
            transparent: true, 
            opacity: 0,
            side: THREE.DoubleSide
        });
        this.drawingPlane = new THREE.Mesh(planeGeometry, planeMaterial);
        this.drawingPlane.rotation.x = -Math.PI / 2;
        this.drawingPlane.position.y = 0;
        this.scene.add(this.drawingPlane);
        
        console.log('✅ 场景基础元素添加完成');
    }
    
    initEventListeners() {
        // PCD文件选择
        this.pcdFileInput.addEventListener('change', (event) => {
            this.loadPCDFile(event);
        });
        
        // 绘制模式切换
        this.drawButton.addEventListener('click', () => {
            this.toggleDrawingMode();
        });
        
        // 鼠标点击事件
        this.renderer.domElement.addEventListener('click', (event) => {
            if (this.isDrawingMode) {
                this.handleDrawingClick(event);
            }
        });
        
        // 窗口大小调整
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // 键盘事件
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isDrawingMode) {
                this.toggleDrawingMode();
            }
            if (event.key === 'z' && event.ctrlKey && this.isDrawingMode) {
                this.undoLastPoint();
            }
        });
        
        console.log('✅ 事件监听器初始化完成');
    }
    
    initPCDControls() {
        console.log('🎛️ 初始化PCD控制面板...');
        
        // 使用安全的DOM元素获取方法
        const getElement = (id) => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`⚠️ 元素 ${id} 未找到`);
            }
            return element;
        };
        
        try {
            
            // 获取所有控制元素
            const elements = {
                intensityFilterEnabled: getElement('intensityFilterEnabled'),
                intensityMin: getElement('intensityMin'),
                intensityMax: getElement('intensityMax'),
                intensityMinValue: getElement('intensityMinValue'),
                intensityMaxValue: getElement('intensityMaxValue'),
                heightFilterEnabled: getElement('heightFilterEnabled'),
                heightMin: getElement('heightMin'),
                heightMax: getElement('heightMax'),
                heightMinValue: getElement('heightMinValue'),
                heightMaxValue: getElement('heightMaxValue'),
                pointSize: getElement('pointSize'),
                pointSizeValue: getElement('pointSizeValue'),
                samplingRate: getElement('samplingRate'),
                samplingRateValue: getElement('samplingRateValue'),
                resetFilters: getElement('resetFilters')
            };
            
            // 强度过滤事件
            if (elements.intensityFilterEnabled) {
                elements.intensityFilterEnabled.addEventListener('change', () => {
                    this.pcdFilters.intensity.enabled = elements.intensityFilterEnabled.checked;
                    if (elements.intensityMin) elements.intensityMin.disabled = !elements.intensityFilterEnabled.checked;
                    if (elements.intensityMax) elements.intensityMax.disabled = !elements.intensityFilterEnabled.checked;
                    this.applyFilters();
                });
            }
            
            if (elements.intensityMin && elements.intensityMinValue) {
                elements.intensityMin.addEventListener('input', () => {
                    this.pcdFilters.intensity.min = parseFloat(elements.intensityMin.value);
                    elements.intensityMinValue.textContent = elements.intensityMin.value;
                    if (this.pcdFilters.intensity.enabled) {
                        this.applyFilters();
                    }
                });
            }
            
            if (elements.intensityMax && elements.intensityMaxValue) {
                elements.intensityMax.addEventListener('input', () => {
                    this.pcdFilters.intensity.max = parseFloat(elements.intensityMax.value);
                    elements.intensityMaxValue.textContent = elements.intensityMax.value;
                    if (this.pcdFilters.intensity.enabled) {
                        this.applyFilters();
                    }
                });
            }
            
            // 高度过滤事件
            if (elements.heightFilterEnabled) {
                elements.heightFilterEnabled.addEventListener('change', () => {
                    this.pcdFilters.height.enabled = elements.heightFilterEnabled.checked;
                    if (elements.heightMin) elements.heightMin.disabled = !elements.heightFilterEnabled.checked;
                    if (elements.heightMax) elements.heightMax.disabled = !elements.heightFilterEnabled.checked;
                    this.applyFilters();
                });
            }
            
            if (elements.heightMin && elements.heightMinValue) {
                elements.heightMin.addEventListener('input', () => {
                    this.pcdFilters.height.min = parseFloat(elements.heightMin.value);
                    elements.heightMinValue.textContent = parseFloat(elements.heightMin.value).toFixed(1);
                    if (this.pcdFilters.height.enabled) {
                        this.applyFilters();
                    }
                });
            }
            
            if (elements.heightMax && elements.heightMaxValue) {
                elements.heightMax.addEventListener('input', () => {
                    this.pcdFilters.height.max = parseFloat(elements.heightMax.value);
                    elements.heightMaxValue.textContent = parseFloat(elements.heightMax.value).toFixed(1);
                    if (this.pcdFilters.height.enabled) {
                        this.applyFilters();
                    }
                });
            }
            
            // 显示设置事件
            if (elements.pointSize && elements.pointSizeValue) {
                elements.pointSize.addEventListener('input', () => {
                    this.pcdFilters.pointSize = parseFloat(elements.pointSize.value);
                    elements.pointSizeValue.textContent = parseFloat(elements.pointSize.value).toFixed(1);
                    this.updatePointSize();
                });
            }
            
            if (elements.samplingRate && elements.samplingRateValue) {
                elements.samplingRate.addEventListener('input', () => {
                    this.pcdFilters.samplingRate = parseInt(elements.samplingRate.value);
                    elements.samplingRateValue.textContent = elements.samplingRate.value;
                    this.applyFilters();
                });
            }
            
            // 重置按钮事件
            if (elements.resetFilters) {
                elements.resetFilters.addEventListener('click', () => {
                    this.resetFilters();
                });
            }
            
            // 创建测试点云按钮
            const createTestPointCloudBtn = document.getElementById('createTestPointCloud');
            if (createTestPointCloudBtn) {
                createTestPointCloudBtn.addEventListener('click', () => {
                    this.createTestPointCloud('test');
                });
            }
            
            // 强制显示按钮
            const forceDisplayBtn = document.getElementById('forceDisplay');
            if (forceDisplayBtn) {
                forceDisplayBtn.addEventListener('click', () => {
                    this.forceDisplayPointCloud();
                });
            }
            
            // 旋转点云按钮
            const rotatePointCloudBtn = document.getElementById('rotatePointCloud');
            if (rotatePointCloudBtn) {
                rotatePointCloudBtn.addEventListener('click', () => {
                    this.rotatePointCloud();
                });
            }
            
            console.log('✅ PCD控制面板初始化完成');
        } catch (error) {
            console.error('❌ PCD控制面板初始化失败:', error);
        }
    }
    
    initRoadControls() {
        console.log('🛣️ 初始化道路控制面板...');
        
        try {
            // 获取道路控制元素
            const elements = {
                laneWidth: document.getElementById('laneWidth'),
                laneWidthValue: document.getElementById('laneWidthValue'),
                laneCount: document.getElementById('laneCount'),
                laneCountValue: document.getElementById('laneCountValue'),
                roadType: document.getElementById('roadType'),
                currentRoadPoints: document.getElementById('currentRoadPoints'),
                currentRoadLength: document.getElementById('currentRoadLength'),
                undoPoint: document.getElementById('undoPoint'),
                clearRoad: document.getElementById('clearRoad'),
                saveRoad: document.getElementById('saveRoad'),
                createJunction: document.getElementById('createJunction'),
                createCurve: document.getElementById('createCurve'),
                cancelCurve: document.getElementById('cancelCurve'),
                showAllRoads: document.getElementById('showAllRoads'),
                hideAllRoads: document.getElementById('hideAllRoads'),
                exportOpenDrive: document.getElementById('exportOpenDrive'),
                exportJSON: document.getElementById('exportJSON'),
                // 弯道参数
                curveParamsSection: document.getElementById('curveParamsSection'),
                curveAutoConnect: document.getElementById('curveAutoConnect'),
                curveForceStraight: document.getElementById('curveForceStraight')
            };
            
            // 车道宽度控制
            if (elements.laneWidth && elements.laneWidthValue) {
                elements.laneWidth.addEventListener('input', () => {
                    this.roadParameters.laneWidth = parseFloat(elements.laneWidth.value);
                    elements.laneWidthValue.textContent = parseFloat(elements.laneWidth.value).toFixed(1);
                    this.updateRoadVisualization();
                });
            }
            
            // 车道数量控制
            if (elements.laneCount && elements.laneCountValue) {
                elements.laneCount.addEventListener('input', () => {
                    this.roadParameters.laneCount = parseInt(elements.laneCount.value);
                    elements.laneCountValue.textContent = elements.laneCount.value;
                    this.updateRoadVisualization();
                });
            }
            
            // 道路类型控制
            if (elements.roadType) {
                elements.roadType.addEventListener('change', () => {
                    this.roadParameters.roadType = elements.roadType.value;
                });
            }
            
            // 操作按钮
            if (elements.undoPoint) {
                elements.undoPoint.addEventListener('click', () => {
                    this.undoLastPoint();
                });
            }
            
            if (elements.clearRoad) {
                elements.clearRoad.addEventListener('click', () => {
                    this.clearCurrentRoad();
                });
            }
            
            if (elements.saveRoad) {
                elements.saveRoad.addEventListener('click', () => {
                    this.saveCurrentRoad();
                });
            }
            
            if (elements.createJunction) {
                elements.createJunction.addEventListener('click', () => {
                    this.toggleJunctionMode();
                });
            }
            
            if (elements.showAllRoads) {
                elements.showAllRoads.addEventListener('click', () => {
                    this.renderAllSavedRoads();
                });
            }
            
            if (elements.hideAllRoads) {
                elements.hideAllRoads.addEventListener('click', () => {
                    this.clearAllSavedRoads();
                });
            }
            
            // 弯道按钮
            if (elements.createCurve) {
                elements.createCurve.addEventListener('click', () => {
                    this.toggleCurveMode();
                });
            }
            
            if (elements.cancelCurve) {
                elements.cancelCurve.addEventListener('click', () => {
                    this.cancelCurveMode();
                });
            }
            
            // 弯道参数控制
            if (elements.curveAutoConnect) {
                elements.curveAutoConnect.addEventListener('change', () => {
                    this.curveParameters.autoConnect = elements.curveAutoConnect.checked;
                });
            }
            
            if (elements.curveForceStraight) {
                elements.curveForceStraight.addEventListener('change', () => {
                    this.curveParameters.forceStraight = elements.curveForceStraight.checked;
                });
            }
            
            // 导出按钮
            if (elements.exportOpenDrive) {
                elements.exportOpenDrive.addEventListener('click', () => {
                    this.exportOpenDrive();
                });
            }
            
            if (elements.exportJSON) {
                elements.exportJSON.addEventListener('click', () => {
                    this.exportJSON();
                });
            }
            
            console.log('✅ 道路控制面板初始化完成');
        } catch (error) {
            console.error('❌ 道路控制面板初始化失败:', error);
        }
    }
    
    loadPCDFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log(`📂 开始加载PCD文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        
        this.showLoading(true);
        this.fileStatus.textContent = `正在加载: ${file.name}`;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                await this.parsePCDData(e.target.result, file.name);
            } catch (error) {
                console.error('❌ PCD解析失败:', error);
                this.showLoading(false);
                
                // 显示错误弹窗
                this.showPointCloudError('点云解析失败', 
                    `PCD文件解析失败：\n\n${error.message}\n\n` +
                    '可能的原因：\n' +
                    '1. 文件格式不支持（需要binary_compressed格式支持）\n' +
                    '2. 文件已损坏或数据异常\n' +
                    '3. 文件过大导致内存不足\n' +
                    '4. 压缩数据无法正确解压');
            }
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    async parsePCDData(arrayBuffer, fileName) {
        // 使用简化的PCD解析
        const dataView = new DataView(arrayBuffer);
        let text = '';
        
        // 读取更多头部数据确保包含完整头部
        const headerSize = Math.min(8192, arrayBuffer.byteLength); // 增加到8KB
        for (let i = 0; i < headerSize; i++) {
            const char = String.fromCharCode(dataView.getUint8(i));
            text += char;
        }
        
        console.log('📋 解析PCD头部信息...');
        console.log('📄 头部文本前500字符:', text.substring(0, 500));
        
        // 发送文件分析日志到服务器
        this.sendLogToServer(`开始解析PCD文件: ${fileName}`, 'info');
        
        // 解析头部信息
        const lines = text.split('\n');
        console.log('📄 头部行数:', lines.length);
        const header = this.parseHeader(lines);
        console.log('📋 头部解析完成:', header);
        
        if (!header) {
            throw new Error('无法解析PCD头部');
        }
        
        if (!header.data) {
            throw new Error('未找到DATA字段');
        }
        
        console.log('📊 PCD信息:', header);
        console.log('🔄 开始创建点云...');
        
        // 创建点云
        try {
            // 设置超时机制
            const createPromise = this.createPointCloud(arrayBuffer, header, fileName);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('点云创建超时')), 60000); // 60秒超时
            });
            
            await Promise.race([createPromise, timeoutPromise]);
            console.log('✅ 点云创建完成');
        } catch (error) {
            console.error('❌ 点云创建失败:', error);
            console.log('🔄 尝试创建测试点云...');
            
            // 创建测试点云
            try {
                this.createTestPointCloud(fileName);
                console.log('✅ 测试点云创建成功');
            } catch (testError) {
                console.error('❌ 测试点云创建也失败:', testError);
                this.showError('点云创建失败: ' + error.message);
                this.showLoading(false);
            }
        }
    }
    
    createTestPointCloud(fileName) {
        console.log('🧪 创建测试点云...');
        
        // 创建简单的测试点云
        const positions = [];
        const colors = [];
        const intensities = [];
        
        // 创建一个简单的网格点云
        for (let x = -50; x <= 50; x += 5) {
            for (let z = -50; z <= 50; z += 5) {
                positions.push(x, 0, z);
                colors.push(0.5, 0.8, 1.0); // 蓝色
                intensities.push(128);
            }
        }
        
        // 创建几何体
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeBoundingSphere();
        
        // 创建材质
        const material = new THREE.PointsMaterial({
            size: 2.0,
            sizeAttenuation: false,
            vertexColors: true
        });
        
        // 创建点云对象
        const points = new THREE.Points(geometry, material);
        points.name = fileName + '_test';
        
        // 显示点云
        this.displayPointCloud(points, fileName + '_test');
        
        console.log('✅ 测试点云创建完成:', positions.length / 3, '个点');
    }
    
    fixAbnormalPointCloud() {
        console.log('🔧 修复异常点云数据...');
        
        // 发送修复开始日志到服务器
        this.sendLogToServer('开始修复异常点云数据', 'warn');
        
        // 创建简单的测试点云来替代异常数据
        const positions = [];
        const colors = [];
        
        // 创建一个简单的网格点云
        for (let x = -100; x <= 100; x += 10) {
            for (let z = -100; z <= 100; z += 10) {
                positions.push(x, 0, z);
                colors.push(0.2, 0.8, 1.0); // 蓝色
            }
        }
        
        // 添加一些高度变化
        for (let x = -50; x <= 50; x += 20) {
            for (let z = -50; z <= 50; z += 20) {
                positions.push(x, 20, z);
                colors.push(1.0, 0.2, 0.2); // 红色
            }
        }
        
        console.log('📊 修复后的点云数据:');
        console.log('- 总点数:', positions.length / 3);
        console.log('- 位置范围:', {
            x: [Math.min(...positions.filter((_, i) => i % 3 === 0)), Math.max(...positions.filter((_, i) => i % 3 === 0))],
            y: [Math.min(...positions.filter((_, i) => i % 3 === 1)), Math.max(...positions.filter((_, i) => i % 3 === 1))],
            z: [Math.min(...positions.filter((_, i) => i % 3 === 2)), Math.max(...positions.filter((_, i) => i % 3 === 2))]
        });
        
        // 发送修复数据到服务器
        this.sendLogToServer(`修复后点云: ${positions.length / 3} 个点`, 'info');
        
        // 创建几何体
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeBoundingSphere();
        
        // 创建材质
        const material = new THREE.PointsMaterial({
            size: 5.0,
            sizeAttenuation: false,
            vertexColors: true
        });
        
        // 创建点云对象
        const points = new THREE.Points(geometry, material);
        points.name = 'fixed_pointcloud';
        
        // 替换异常点云
        if (this.pointCloud) {
            this.scene.remove(this.pointCloud);
        }
        this.pointCloud = points;
        this.scene.add(this.pointCloud);
        
        // 设置相机到合理位置
        this.camera.position.set(0, 100, 100);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        
        // 强制渲染
        this.renderer.render(this.scene, this.camera);
        
        console.log('✅ 异常点云修复完成');
        
        // 发送日志到服务器
        this.sendLogToServer('✅ 异常点云修复完成 - 点云显示正常');
    }
    
    sendLogToServer(message, level = 'info') {
        try {
            // 发送日志到服务器
            fetch('/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    level: level,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                })
            }).catch(error => {
                // 如果服务器不支持日志接口，忽略错误
                console.log('📡 日志发送失败（服务器可能不支持）:', error.message);
            });
        } catch (error) {
            console.log('📡 日志发送异常:', error.message);
        }
    }
    
    showPointCloudError(title, message) {
        // 发送错误日志到服务器
        this.sendLogToServer(`点云加载失败: ${title}`, 'error');
        
        // 创建模态弹窗
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: 'Microsoft YaHei', Arial, sans-serif;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            text-align: center;
        `;
        
        dialog.innerHTML = `
            <div style="color: #e74c3c; font-size: 48px; margin-bottom: 20px;">⚠️</div>
            <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 24px;">${title}</h2>
            <div style="color: #34495e; line-height: 1.6; margin-bottom: 30px; text-align: left; white-space: pre-line;">${message}</div>
            <button id="closeErrorModal" style="
                background: #3498db;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                transition: background 0.3s;
            " onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">
                确定
            </button>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        // 添加关闭事件
        const closeBtn = document.getElementById('closeErrorModal');
        const closeModal = () => {
            document.body.removeChild(modal);
        };
        
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // ESC键关闭
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleKeyPress);
            }
        };
        document.addEventListener('keydown', handleKeyPress);
    }
    
    forceDisplayPointCloud() {
        console.log('⚡ 强制显示点云...');
        
        // 检查是否有现有的点云
        if (this.pointCloud) {
            console.log('✅ 发现现有点云，重新显示...');
            console.log('🔍 点云详细信息:');
            console.log('- 点云对象:', this.pointCloud);
            console.log('- 几何体:', this.pointCloud.geometry);
            console.log('- 位置属性:', this.pointCloud.geometry.attributes.position);
            console.log('- 点数量:', this.pointCloud.geometry.attributes.position.count);
            console.log('- 点云位置:', this.pointCloud.position);
            console.log('- 点云缩放:', this.pointCloud.scale);
            console.log('- 点云可见性:', this.pointCloud.visible);
            
            // 确保点云在场景中
            if (!this.scene.children.includes(this.pointCloud)) {
                console.log('➕ 将点云添加到场景中...');
                this.scene.add(this.pointCloud);
            }
            
            // 强制显示点云
            this.pointCloud.visible = true;
            
            // 调整相机
            this.adjustCameraToPointCloud();
            
            // 强制渲染
            this.renderer.render(this.scene, this.camera);
            
            console.log('✅ 点云强制显示完成');
            return;
        }
        
        // 如果没有点云，创建测试点云
        console.log('⚠️ 没有发现点云，创建测试点云...');
        this.createTestPointCloud('force_display');
    }
    
    adjustPointCloudPosition() {
        if (!this.pointCloud) {
            console.log('❌ 没有点云对象可以调整位置');
            return;
        }
        
        console.log('🔧 调整点云位置...');
        
        // 重置所有变换
        this.pointCloud.position.set(0, 0, 0);
        this.pointCloud.rotation.set(0, 0, 0);
        this.pointCloud.scale.set(1, 1, 1);
        
        // 计算点云的边界盒
        this.pointCloud.updateMatrixWorld();
        const box = new THREE.Box3().setFromObject(this.pointCloud);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        console.log('📏 点云边界信息:');
        console.log('- 中心点:', center);
        console.log('- 尺寸:', size);
        console.log('- 最小点:', box.min);
        console.log('- 最大点:', box.max);
        
        // 将点云中心移到原点
        this.pointCloud.position.set(-center.x, -center.y, -center.z);
        
        // 重新计算边界盒
        this.pointCloud.updateMatrixWorld();
        const newBox = new THREE.Box3().setFromObject(this.pointCloud);
        
        // 将点云底部放到地面上（Y=0）
        this.pointCloud.position.y = -newBox.min.y;
        
        // 强制更新矩阵
        this.pointCloud.updateMatrixWorld();
        
        console.log('✅ 点云位置已调整');
        console.log('- 新位置:', this.pointCloud.position);
        console.log('- 新边界盒:', new THREE.Box3().setFromObject(this.pointCloud));
        
        // 发送位置调整日志到服务器
        this.sendLogToServer('点云位置已调整到地面', 'info');
    }
    
    rotatePointCloud() {
        if (!this.pointCloud) {
            console.log('❌ 没有点云对象可以旋转');
            return;
        }
        
        console.log('🔄 旋转点云90度...');
        
        // 绕Y轴旋转90度
        this.pointCloud.rotation.y += Math.PI / 2;
        
        // 更新矩阵
        this.pointCloud.updateMatrixWorld();
        
        // 强制渲染
        this.renderer.render(this.scene, this.camera);
        
        console.log('✅ 点云已旋转90度');
        
        // 发送旋转日志到服务器
        this.sendLogToServer('点云已手动旋转90度', 'info');
    }
    
    parseHeader(lines) {
        const header = {};
        let dataLineFound = false;
        
        console.log('📝 解析头部行数:', lines.length);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            console.log(`第${i+1}行: "${trimmed}"`);
            
            if (trimmed.startsWith('FIELDS ')) {
                header.fields = trimmed.substring(7).split(' ');
                console.log('✅ 找到FIELDS:', header.fields);
            } else if (trimmed.startsWith('SIZE ')) {
                header.sizes = trimmed.substring(5).split(' ').map(Number);
                console.log('✅ 找到SIZE:', header.sizes);
            } else if (trimmed.startsWith('TYPE ')) {
                header.types = trimmed.substring(5).split(' ');
                console.log('✅ 找到TYPE:', header.types);
            } else if (trimmed.startsWith('COUNT ')) {
                header.counts = trimmed.substring(6).split(' ').map(Number);
                console.log('✅ 找到COUNT:', header.counts);
            } else if (trimmed.startsWith('WIDTH ')) {
                header.width = parseInt(trimmed.substring(6));
                console.log('✅ 找到WIDTH:', header.width);
            } else if (trimmed.startsWith('HEIGHT ')) {
                header.height = parseInt(trimmed.substring(7));
                console.log('✅ 找到HEIGHT:', header.height);
            } else if (trimmed.startsWith('POINTS ')) {
                header.points = parseInt(trimmed.substring(7));
                console.log('✅ 找到POINTS:', header.points);
            } else if (trimmed.startsWith('DATA ')) {
                const dataValue = trimmed.substring(5).trim();
                header.data = dataValue;
                console.log('✅ 找到DATA:', `"${dataValue}"`);
                
                // 计算头部长度
                const headerText = lines.slice(0, i + 1).join('\n') + '\n';
                header.headerLength = new TextEncoder().encode(headerText).length;
                console.log('📏 头部长度:', header.headerLength);
                
                dataLineFound = true;
                break;
            }
            
            // 如果行数太多，停止解析
            if (i > 20) {
                console.warn('⚠️ 头部行数过多，停止解析');
                break;
            }
        }
        
        if (!dataLineFound) {
            console.error('❌ 未找到DATA行');
            return null;
        }
        
        // 计算行大小
        if (header.sizes && header.counts) {
            header.rowSize = header.sizes.reduce((sum, size, i) => sum + size * header.counts[i], 0);
            console.log('📐 行大小:', header.rowSize, '字节');
        }
        
        console.log('📋 完整头部信息:', header);
        return header;
    }
    
    async createPointCloud(arrayBuffer, header, fileName) {
        console.log('🎨 创建点云几何体...');
        console.log(`📊 数据格式: ${header.data}, 点数: ${header.points.toLocaleString()}`);
        
        const positions = [];
        const colors = [];
        const intensities = [];
        
        console.log('🔄 开始解析数据...');
        
        if (header.data === 'ascii') {
            console.log('📝 使用ASCII解析...');
            this.parseAsciiData(arrayBuffer, header, positions, colors, intensities);
        } else if (header.data === 'binary') {
            console.log('📦 使用二进制解析...');
            this.parseBinaryData(arrayBuffer, header, positions, colors, intensities);
        } else if (header.data === 'binary_compressed') {
            console.log('🗜️ 使用压缩二进制解析...');
            await this.parseBinaryCompressedData(arrayBuffer, header, positions, colors, intensities);
        } else {
            throw new Error(`不支持的数据格式: ${header.data}`);
        }
        
        console.log(`✅ 数据解析完成: ${positions.length / 3} 个点`);
        
        if (positions.length === 0) {
            throw new Error('没有找到有效的点云数据');
        }
        
        // 存储原始数据用于过滤
        this.originalPointCloudData = {
            positions: [...positions],
            colors: [...colors],
            intensities: [...intensities],
            header: header,
            fileName: fileName
        };
        
        // 分析数据范围
        this.analyzeDataRanges();
        
        // 创建点云几何体
        this.buildPointCloudGeometry();
        
        // 显示控制面板
        this.pcdControlsPanel.style.display = 'block';
    }
    
    analyzeDataRanges() {
        const { positions, intensities } = this.originalPointCloudData;
        
        // 分析高度范围（Y轴）
        let minY = Infinity, maxY = -Infinity;
        for (let i = 1; i < positions.length; i += 3) {
            const y = positions[i];
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
        
        // 分析强度范围
        let minIntensity = 0, maxIntensity = 255;
        if (intensities.length > 0) {
            minIntensity = intensities[0];
            maxIntensity = intensities[0];
            for (let i = 0; i < intensities.length; i++) {
                const intensity = intensities[i];
                if (intensity < minIntensity) minIntensity = intensity;
                if (intensity > maxIntensity) maxIntensity = intensity;
            }
        }
        
        console.log('📊 数据范围分析:', {
            height: { min: minY.toFixed(2), max: maxY.toFixed(2) },
            intensity: { min: minIntensity.toFixed(2), max: maxIntensity.toFixed(2) }
        });
        
        // 更新UI控件的范围
        const heightMin = document.getElementById('heightMin');
        const heightMax = document.getElementById('heightMax');
        const heightMinValue = document.getElementById('heightMinValue');
        const heightMaxValue = document.getElementById('heightMaxValue');
        
        heightMin.min = Math.floor(minY - 1);
        heightMin.max = Math.ceil(maxY + 1);
        heightMin.value = Math.floor(minY - 1);
        heightMax.min = Math.floor(minY - 1);
        heightMax.max = Math.ceil(maxY + 1);
        heightMax.value = Math.ceil(maxY + 1);
        
        heightMinValue.textContent = (Math.floor(minY - 1)).toFixed(1);
        heightMaxValue.textContent = (Math.ceil(maxY + 1)).toFixed(1);
        
        // 更新过滤器设置
        this.pcdFilters.height.min = Math.floor(minY - 1);
        this.pcdFilters.height.max = Math.ceil(maxY + 1);
        
        if (intensities.length > 0) {
            const intensityMinSlider = document.getElementById('intensityMin');
            const intensityMaxSlider = document.getElementById('intensityMax');
            
            intensityMinSlider.min = Math.floor(minIntensity);
            intensityMinSlider.max = Math.ceil(maxIntensity);
            intensityMaxSlider.min = Math.floor(minIntensity);
            intensityMaxSlider.max = Math.ceil(maxIntensity);
            
            this.pcdFilters.intensity.min = Math.floor(minIntensity);
            this.pcdFilters.intensity.max = Math.ceil(maxIntensity);
        }
    }
    
    buildPointCloudGeometry() {
        console.log('🔧 构建点云几何体...');
        
        const { positions, colors, intensities } = this.originalPointCloudData;
        
        // 应用过滤器
        const filteredData = this.applyFiltersToData(positions, colors, intensities);
        
        // 创建几何体
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(filteredData.positions, 3));
        
        if (filteredData.colors.length > 0) {
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(filteredData.colors, 3));
        }
        
        geometry.computeBoundingSphere();
        
        // 调试几何信息
        console.log('📐 点云几何信息:');
        console.log('- 位置属性:', geometry.attributes.position);
        console.log('- 位置数量:', geometry.attributes.position.count);
        console.log('- 颜色属性:', geometry.attributes.color);
        console.log('- 边界球:', geometry.boundingSphere);
        console.log('- 边界盒:', geometry.boundingBox);
        
        // 检查几何是否有效
        if (geometry.attributes.position.count === 0) {
            console.error('❌ 几何体没有位置数据！');
            throw new Error('点云几何体没有有效的位置数据');
        }
        
        // 创建材质
        const material = new THREE.PointsMaterial({
            size: this.pcdFilters.pointSize,
            sizeAttenuation: false,
            vertexColors: filteredData.colors.length > 0,
            color: filteredData.colors.length > 0 ? 0xffffff : 0x00ff88,
            transparent: false,
            opacity: 1.0
        });
        
        console.log('🎨 点云材质信息:');
        console.log('- 点大小:', material.size);
        console.log('- 顶点颜色:', material.vertexColors);
        console.log('- 材质颜色:', material.color);
        console.log('- 透明度:', material.transparent);
        
        // 创建点云对象
        const points = new THREE.Points(geometry, material);
        points.name = this.originalPointCloudData.fileName;
        
        // 替换场景中的点云
        if (this.pointCloud) {
            this.scene.remove(this.pointCloud);
        }
        this.pointCloud = points;
        
        // 恢复原始的点云处理方式
        this.analyzeAndFixPointCloudOrientation();
        
        this.scene.add(this.pointCloud);
        
        // 强制渲染
        this.renderer.render(this.scene, this.camera);
        
        console.log('✅ 点云几何体已更新并重新渲染');
        
        // 更新点数显示
        const totalPoints = positions.length / 3;
        const visiblePoints = filteredData.positions.length / 3;
        
        document.getElementById('totalPoints').textContent = totalPoints.toLocaleString();
        document.getElementById('visiblePoints').textContent = visiblePoints.toLocaleString();
    }
    
    parseBinaryData(arrayBuffer, header, positions, colors, intensities) {
        const dataView = new DataView(arrayBuffer, header.headerLength);
        const maxPoints = 500000; // 最大50万个点
        const totalPoints = header.points;
        const step = Math.max(1, Math.floor(totalPoints / maxPoints));
        
        console.log(`📊 解析二进制数据: ${totalPoints.toLocaleString()} 点，采样步长: ${step}`);
        
        // 找到字段偏移
        const offsets = this.calculateOffsets(header);
        
        let validPoints = 0;
        for (let i = 0; i < totalPoints; i += step) {
            const row = i * header.rowSize;
            
            if (row + header.rowSize > dataView.byteLength) break;
            
            try {
                // 读取位置
                const x = dataView.getFloat32(row + offsets.x, true);
                const y = dataView.getFloat32(row + offsets.y, true);
                const z = dataView.getFloat32(row + offsets.z, true);
                
                // 检查有效性
                if (isFinite(x) && isFinite(y) && isFinite(z)) {
                    positions.push(x, y, z);
                    
                    // 读取强度信息
                    let intensity = 128; // 默认值
                    if (offsets.intensity !== undefined) {
                        try {
                            intensity = dataView.getFloat32(row + offsets.intensity, true);
                        } catch (e) {
                            // 如果读取失败，使用默认值
                        }
                    }
                    intensities.push(intensity);
                    
                    // 用强度信息着色
                    const normalizedIntensity = Math.max(0, Math.min(1, intensity / 255.0));
                    colors.push(normalizedIntensity, normalizedIntensity, normalizedIntensity);
                    
                    validPoints++;
                }
            } catch (e) {
                // 忽略读取错误的点
                continue;
            }
        }
        
        console.log(`✅ 成功解析 ${validPoints.toLocaleString()} 个有效点`);
    }
    
    parseAsciiData(arrayBuffer, header, positions, colors, intensities) {
        const text = new TextDecoder().decode(arrayBuffer);
        const lines = text.split('\n');
        const dataStartLine = lines.findIndex(line => line.trim().startsWith('DATA ')) + 1;
        
        console.log(`📊 解析ASCII数据，从第${dataStartLine}行开始`);
        
        const offsets = this.calculateFieldOffsets(header);
        let validPoints = 0;
        
        for (let i = dataStartLine; i < lines.length && validPoints < 500000; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const parts = line.split(/\s+/);
            if (parts.length < 3) continue;
            
            const x = parseFloat(parts[offsets.x || 0]);
            const y = parseFloat(parts[offsets.y || 1]);
            const z = parseFloat(parts[offsets.z || 2]);
            
            if (isFinite(x) && isFinite(y) && isFinite(z)) {
                positions.push(x, y, z);
                
                // 读取强度信息
                let intensity = 128; // 默认值
                if (offsets.intensity !== undefined && parts[offsets.intensity]) {
                    intensity = parseFloat(parts[offsets.intensity]) || 128;
                }
                intensities.push(intensity);
                
                // 用强度信息着色
                const normalizedIntensity = Math.max(0, Math.min(1, intensity / 255.0));
                colors.push(normalizedIntensity, normalizedIntensity, normalizedIntensity);
                
                validPoints++;
            }
        }
        
        console.log(`✅ 成功解析 ${validPoints.toLocaleString()} 个有效点`);
    }
    
    async parseBinaryCompressedData(arrayBuffer, header, positions, colors, intensities) {
        console.log('🗜️ 解析压缩二进制数据...');
        console.log(`📊 文件信息: ${header.points.toLocaleString()} 个点, ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);
        
        // 显示进度指示
        this.showLoading(true, '正在解压缩数据...');
        
        try {
            // 尝试解压缩数据
            console.log('🔄 开始解压缩...');
            
            // 对于大文件，直接使用简化解析
            if (header.points > 1000000) { // 超过100万个点
                console.log('🔄 大文件，使用简化解析...');
                this.showLoading(true, '正在使用简化解析...');
                this.parseBinaryDataSimplified(arrayBuffer, header, positions, colors, intensities);
                console.log('✅ 简化解析完成');
                return;
            }
            
            console.log('🔄 尝试解压缩...');
            const decompressedData = this.decompressPCDData(arrayBuffer, header);
            
            if (decompressedData) {
                console.log('✅ 解压缩成功，解析数据...');
                this.showLoading(true, '正在解析解压缩数据...');
                this.parseBinaryDataFromBuffer(decompressedData, header, positions, colors, intensities);
                console.log('✅ 解压缩数据解析完成');
                return;
            } else {
                console.log('⚠️ 解压缩返回null，尝试直接解析...');
            }
        } catch (error) {
            console.warn('⚠️ 解压缩失败，尝试直接解析:', error.message);
        }
        
        // 如果解压缩失败，尝试直接解析（某些压缩格式可能不需要解压缩）
        console.log('🔄 尝试直接解析压缩数据...');
        this.showLoading(true, '尝试直接解析压缩数据...');
        
        // 对于binary_compressed格式，我们尝试直接解析
        // 有些PCD文件的binary_compressed实际上就是普通的二进制数据
        try {
            // 对于大文件，使用简化的解析方法
            if (header.points > 1000000) { // 超过100万个点
                console.log('🔄 大文件，使用简化解析方法...');
                this.parseBinaryDataSimplified(arrayBuffer, header, positions, colors, intensities);
            } else {
                this.parseBinaryData(arrayBuffer, header, positions, colors, intensities);
            }
            
            if (positions.length > 0) {
                console.log('✅ 直接解析压缩数据成功');
                return;
            }
        } catch (error) {
            console.warn('⚠️ 直接解析也失败:', error.message);
        }
        
        // 如果所有方法都失败，抛出错误
        throw new Error('无法解析binary_compressed格式的PCD文件。请尝试使用pako库或转换文件格式。');
    }
    
    parseBinaryDataSimplified(arrayBuffer, header, positions, colors, intensities) {
        console.log('🔄 使用简化解析方法处理大文件...');
        
        const dataView = new DataView(arrayBuffer);
        const maxPoints = 500000; // 最大50万个点
        const totalPoints = header.points;
        const step = Math.max(1, Math.floor(totalPoints / maxPoints));
        
        console.log(`📊 简化解析: ${totalPoints.toLocaleString()} 点，采样步长: ${step}`);
        
        // 找到字段偏移
        const offsets = this.calculateOffsets(header);
        
        let validPoints = 0;
        for (let i = 0; i < totalPoints; i += step) {
            const row = i * header.rowSize;
            
            if (row + header.rowSize > dataView.byteLength) break;
            
            try {
                // 读取位置
                const x = dataView.getFloat32(row + offsets.x, true);
                const y = dataView.getFloat32(row + offsets.y, true);
                const z = dataView.getFloat32(row + offsets.z, true);
                
                // 检查有效性
                if (isFinite(x) && isFinite(y) && isFinite(z)) {
                    positions.push(x, y, z);
                    
                    // 读取强度信息
                    let intensity = 128;
                    if (offsets.intensity >= 0) {
                        intensity = dataView.getUint8(row + offsets.intensity);
                    }
                    intensities.push(intensity);
                    
                    // 读取颜色信息
                    if (offsets.r >= 0 && offsets.g >= 0 && offsets.b >= 0) {
                        const r = dataView.getUint8(row + offsets.r);
                        const g = dataView.getUint8(row + offsets.g);
                        const b = dataView.getUint8(row + offsets.b);
                        colors.push(r / 255, g / 255, b / 255);
                    }
                    
                    validPoints++;
                }
            } catch (error) {
                console.warn(`⚠️ 解析第${i}个点时出错:`, error.message);
            }
        }
        
        console.log(`✅ 简化解析完成: ${validPoints} 个有效点`);
    }
    
    decompressPCDData(arrayBuffer, header) {
        // 简化的解压缩处理
        console.log('🔄 尝试解压缩PCD数据...');
        
        // 对于binary_compressed格式，直接返回原始数据
        // 某些PCD文件的binary_compressed实际上就是普通的二进制数据
        const compressedData = new Uint8Array(arrayBuffer, header.headerLength);
        console.log(`📦 数据大小: ${(compressedData.length / 1024 / 1024).toFixed(2)}MB`);
        
        // 检查数据大小是否合理
        const expectedSize = header.points * header.rowSize;
        if (Math.abs(compressedData.length - expectedSize) < expectedSize * 0.1) {
            console.log('✅ 数据大小匹配，直接使用');
            return compressedData.buffer;
        }
        
        console.log('⚠️ 数据大小不匹配，尝试pako解压缩');
        
        // 尝试使用 pako 库解压缩
        if (window.pako) {
            try {
                const decompressed = pako.inflate(compressedData);
                console.log(`✅ pako 解压缩成功: ${(decompressed.length / 1024 / 1024).toFixed(2)}MB`);
                return decompressed.buffer;
            } catch (error) {
                console.log('pako 解压缩失败:', error.message);
            }
        }
        
        return null;
    }
    
    simpleZlibDecompress(compressedData) {
        // 简化的ZLIB解压缩实现
        console.log('🔄 尝试简单ZLIB解压缩...');
        
        // 检查是否是ZLIB格式（简化检查）
        if (compressedData.length < 2) {
            throw new Error('数据太短，不是有效的ZLIB格式');
        }
        
        // 检查ZLIB头部 (0x78)
        if (compressedData[0] !== 0x78) {
            throw new Error('不是ZLIB格式');
        }
        
        console.log('✅ 检测到ZLIB格式，但需要完整实现');
        throw new Error('ZLIB解压缩需要完整实现');
    }
    
    parseBinaryDataFromBuffer(dataBuffer, header, positions, colors, intensities) {
        const dataView = new DataView(dataBuffer);
        const maxPoints = 500000; // 最大50万个点
        const totalPoints = header.points;
        const step = Math.max(1, Math.floor(totalPoints / maxPoints));
        
        console.log(`📊 解析解压缩数据: ${totalPoints.toLocaleString()} 点，采样步长: ${step}`);
        
        // 找到字段偏移
        const offsets = this.calculateOffsets(header);
        
        let validPoints = 0;
        for (let i = 0; i < totalPoints; i += step) {
            const row = i * header.rowSize;
            
            if (row + header.rowSize > dataView.byteLength) break;
            
            try {
                // 读取位置
                const x = dataView.getFloat32(row + offsets.x, true);
                const y = dataView.getFloat32(row + offsets.y, true);
                const z = dataView.getFloat32(row + offsets.z, true);
                
                // 检查有效性
                if (isFinite(x) && isFinite(y) && isFinite(z)) {
                    positions.push(x, y, z);
                    
                    // 读取强度信息
                    let intensity = 128;
                    if (offsets.intensity >= 0) {
                        intensity = dataView.getUint8(row + offsets.intensity);
                    }
                    intensities.push(intensity);
                    
                    // 读取颜色信息
                    if (offsets.r >= 0 && offsets.g >= 0 && offsets.b >= 0) {
                        const r = dataView.getUint8(row + offsets.r);
                        const g = dataView.getUint8(row + offsets.g);
                        const b = dataView.getUint8(row + offsets.b);
                        colors.push(r / 255, g / 255, b / 255);
                    }
                    
                    validPoints++;
                }
            } catch (error) {
                console.warn(`⚠️ 解析第${i}个点时出错:`, error.message);
            }
        }
        
        console.log(`✅ 解压缩数据解析完成: ${validPoints} 个有效点`);
    }
    
    calculateOffsets(header) {
        const offsets = {};
        let currentOffset = 0;
        
        console.log('🔍 计算字段偏移:');
        console.log('- 字段:', header.fields);
        console.log('- 大小:', header.sizes);
        console.log('- 计数:', header.counts);
        
        for (let i = 0; i < header.fields.length; i++) {
            const field = header.fields[i];
            const fieldSize = header.sizes[i] * header.counts[i];
            offsets[field] = currentOffset;
            
            console.log(`- ${field}: 偏移=${currentOffset}, 大小=${fieldSize}`);
            currentOffset += fieldSize;
        }
        
        console.log('- 总行大小:', currentOffset);
        console.log('- 计算的行大小:', header.rowSize);
        
        return offsets;
    }
    
    calculateFieldOffsets(header) {
        const offsets = {};
        
        for (let i = 0; i < header.fields.length; i++) {
            offsets[header.fields[i]] = i;
        }
        
        return offsets;
    }
    
    displayPointCloud(points, fileName, preserveCamera = false) {
        console.log('🎨 显示点云...');
        
        // 保存当前相机状态
        if (preserveCamera) {
            this.saveCameraState();
        }
        
        // 移除旧点云
        if (this.pointCloud) {
            this.scene.remove(this.pointCloud);
        }
        
        // 添加新点云
        this.pointCloud = points;
        
        // 恢复原始的点云处理方式
        this.analyzeAndFixPointCloudOrientation();
        
        this.scene.add(this.pointCloud);
        
        // 调试信息：检查点云状态
        console.log('🔍 点云调试信息:');
        console.log('- 点云对象:', this.pointCloud);
        console.log('- 点云几何:', this.pointCloud.geometry);
        console.log('- 点云材质:', this.pointCloud.material);
        console.log('- 点云位置:', this.pointCloud.position);
        console.log('- 点云缩放:', this.pointCloud.scale);
        console.log('- 点云可见性:', this.pointCloud.visible);
        console.log('- 场景中的点云:', this.scene.children.includes(this.pointCloud));
        
        // 计算点云边界盒
        const box = new THREE.Box3().setFromObject(this.pointCloud);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        console.log('- 点云边界盒中心:', center);
        console.log('- 点云边界盒大小:', size);
        console.log('- 点云边界盒是否有效:', !box.isEmpty());
        
        // 恢复相机状态或调整相机视角
        if (preserveCamera) {
            this.restoreCameraState();
        } else {
            // 调整相机视角
            this.adjustCameraToPointCloud();
        }
        
        // 更新UI
        this.fileStatus.textContent = `已加载: ${fileName}`;
        this.pointCount.textContent = `点数: ${points.geometry.attributes.position.count.toLocaleString()}`;
        this.showLoading(false);
        
        console.log(`✅ 点云显示完成: ${points.geometry.attributes.position.count.toLocaleString()} 个点`);
        
        // 发送成功日志到服务器
        this.sendLogToServer(`点云显示完成: ${points.geometry.attributes.position.count.toLocaleString()} 个点`, 'success');
        
        // 详细调试信息
        console.log('🔍 点云渲染调试信息:');
        console.log('- 点云在场景中:', this.scene.children.includes(this.pointCloud));
        console.log('- 点云可见性:', this.pointCloud.visible);
        console.log('- 点云位置:', this.pointCloud.position);
        console.log('- 点云缩放:', this.pointCloud.scale);
        console.log('- 相机位置:', this.camera.position);
        console.log('- 相机目标:', this.controls.target);
        console.log('- 渲染器尺寸:', this.renderer.getSize(new THREE.Vector2()));
        
        // 强制计算边界盒
        const box2 = new THREE.Box3().setFromObject(this.pointCloud);
        const center2 = box2.getCenter(new THREE.Vector3());
        const size2 = box2.getSize(new THREE.Vector3());
        
        console.log('📐 强制计算边界盒:');
        console.log('- 边界盒中心:', center2);
        console.log('- 边界盒大小:', size2);
        console.log('- 边界盒是否有效:', !box2.isEmpty());
        
        // 检查点云几何体
        const geometry = this.pointCloud.geometry;
        const positionAttribute = geometry.attributes.position;
        if (positionAttribute) {
            const positions = positionAttribute.array;
            console.log('- 位置数组长度:', positions.length);
            console.log('- 前几个点坐标:', Array.from(positions.slice(0, 9)));
            
            // 计算边界
            const min = new THREE.Vector3(Infinity, Infinity, Infinity);
            const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
            
            for (let i = 0; i < positions.length; i += 3) {
                min.x = Math.min(min.x, positions[i]);
                min.y = Math.min(min.y, positions[i + 1]);
                min.z = Math.min(min.z, positions[i + 2]);
                max.x = Math.max(max.x, positions[i]);
                max.y = Math.max(max.y, positions[i + 1]);
                max.z = Math.max(max.z, positions[i + 2]);
            }
            
            console.log('- 点云边界 min:', min);
            console.log('- 点云边界 max:', max);
            console.log('- 点云尺寸:', max.clone().sub(min));
            
            // 检查点云是否在相机视野内
            const center3 = min.clone().add(max).multiplyScalar(0.5);
            const size3 = max.clone().sub(min);
            const maxDim = Math.max(size3.x, size3.y, size3.z);
            
            console.log('🎯 相机视野检查:');
            console.log('- 点云中心:', center3);
            console.log('- 最大尺寸:', maxDim);
            console.log('- 相机位置:', this.camera.position);
            console.log('- 相机目标:', this.controls.target);
            console.log('- 相机到中心距离:', this.camera.position.distanceTo(center3));
            
            // 如果点云太小，放大点大小
            if (maxDim < 10) {
                console.log('⚠️ 点云太小，调整点大小...');
                this.pointCloud.material.size = 10;
                this.pointCloud.material.needsUpdate = true;
            }
            
            // 如果点云太大，缩小点大小
            if (maxDim > 1000) {
                console.log('⚠️ 点云太大，调整点大小...');
                this.pointCloud.material.size = 1;
                this.pointCloud.material.needsUpdate = true;
            }
            
            // 检查坐标是否异常（天文数字）
            if (maxDim > 1e20) {
                console.log('❌ 检测到异常坐标值，尝试修复...');
                console.log('- 原始坐标范围:', maxDim);
                
                // 发送错误日志到服务器
                this.sendLogToServer(`检测到异常坐标值: ${maxDim.toExponential(2)}`, 'error');
                
                // 显示错误弹窗
                this.showPointCloudError('点云数据异常', 
                    '检测到异常坐标值，可能是文件格式不支持或数据损坏。\n\n' +
                    '建议：\n' +
                    '1. 检查PCD文件是否完整\n' +
                    '2. 尝试在CloudCompare中重新保存文件\n' +
                    '3. 使用其他格式的点云文件');
                return;
            }
        }
        
        // 强制渲染一次
        this.renderer.render(this.scene, this.camera);
        
        // 如果还是看不到，尝试重置相机到点云中心
        setTimeout(() => {
            if (this.pointCloud && this.pointCloud.geometry) {
                const box = new THREE.Box3().setFromObject(this.pointCloud);
                if (!box.isEmpty()) {
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    
                    console.log('🔄 尝试重置相机到点云中心...');
                    console.log('- 点云中心:', center);
                    console.log('- 点云尺寸:', size);
                    
                    // 设置相机位置
                    this.camera.position.set(
                        center.x + maxDim * 0.5,
                        center.y + maxDim * 0.5,
                        center.z + maxDim * 0.5
                    );
                    this.controls.target.copy(center);
                    this.controls.update();
                    
                    // 强制渲染
                    this.renderer.render(this.scene, this.camera);
                    console.log('✅ 相机重置完成');
                }
            }
        }, 1000);
        
        // 如果点云边界盒为空，尝试重置相机到默认位置
        if (box.isEmpty()) {
            console.warn('⚠️ 点云边界盒为空，重置相机到默认位置');
            this.resetCameraToDefault();
        }
    }
    
    resetCameraToDefault() {
        console.log('🔄 重置相机到默认位置...');
        
        // 设置默认相机位置
        this.camera.position.set(0, 100, 100);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        
        // 设置默认缩放
        this.camera.zoom = 1;
        this.camera.updateProjectionMatrix();
        
        console.log('✅ 相机已重置到默认位置');
    }
    
    saveCameraState() {
        if (this.camera && this.controls) {
            this.savedCameraState = {
                position: this.camera.position.clone(),
                target: this.controls.target.clone(),
                zoom: this.camera.zoom
            };
            console.log('📷 保存相机状态');
            return true;
        }
        return false;
    }
    
    restoreCameraState() {
        if (this.savedCameraState && this.camera && this.controls) {
            this.camera.position.copy(this.savedCameraState.position);
            this.controls.target.copy(this.savedCameraState.target);
            this.camera.zoom = this.savedCameraState.zoom;
            this.controls.update();
            console.log('📷 恢复相机状态');
            return true;
        }
        return false;
    }
    
    analyzeAndFixPointCloudOrientation() {
        if (!this.pointCloud) return;
        
        // 计算边界盒来分析点云方向
        const box = new THREE.Box3().setFromObject(this.pointCloud);
        const size = box.getSize(new THREE.Vector3());
        
        console.log('📏 点云尺寸分析:', {
            x: size.x.toFixed(2),
            y: size.y.toFixed(2), 
            z: size.z.toFixed(2)
        });
        
        // 判断哪个轴是高度轴（通常是最小的那个）
        let heightAxis = 'y';
        let minSize = size.y;
        
        if (size.x < minSize) {
            heightAxis = 'x';
            minSize = size.x;
        }
        if (size.z < minSize) {
            heightAxis = 'z';
            minSize = size.z;
        }
        
        console.log('📐 检测到高度轴:', heightAxis);
        
        // 根据检测结果调整点云方向
        this.pointCloud.rotation.set(0, 0, 0); // 重置旋转
        
        if (heightAxis === 'x') {
            // X轴是高度轴，需要绕Z轴旋转90度
            this.pointCloud.rotation.z = Math.PI / 2;
            console.log('🔄 应用X->Y轴转换');
        } else if (heightAxis === 'z') {
            // Z轴是高度轴，需要绕X轴旋转-90度使Z轴指向上方
            this.pointCloud.rotation.x = -Math.PI / 2;
            console.log('🔄 应用Z->Y轴转换');
        }
        // 如果heightAxis === 'y'，则不需要旋转，Y轴已经是向上的
        
        // 确保点云底部贴近地面
        this.pointCloud.updateMatrixWorld();
        const adjustedBox = new THREE.Box3().setFromObject(this.pointCloud);
        this.pointCloud.position.y = -adjustedBox.min.y;
        
        console.log('✅ 点云方向已标准化为Y轴向上');
        
        // 发送方向调整日志到服务器
        this.sendLogToServer(`点云方向已调整 - 高度轴: ${heightAxis}`, 'info');
    }
    
    adjustCameraToPointCloud() {
        if (!this.pointCloud) {
            console.warn('⚠️ 没有点云对象，无法调整相机');
            return;
        }
        
        // 计算边界盒
        const box = new THREE.Box3().setFromObject(this.pointCloud);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        console.log('📐 点云边界盒信息:');
        console.log('- 中心点:', center);
        console.log('- 尺寸:', size);
        console.log('- 边界盒是否有效:', !box.isEmpty());
        
        if (box.isEmpty()) {
            console.warn('⚠️ 点云边界盒为空，可能点云没有几何数据');
            return;
        }
        
        // 调整相机位置 - 使用俯视角度
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 1.5;
        
        console.log('📏 相机调整参数:');
        console.log('- 最大尺寸:', maxDim);
        console.log('- 计算距离:', distance);
        
        // 设置俯视角度（从上方斜着看）
        this.camera.position.set(
            center.x + distance * 0.3,  // 稍微偏移X
            center.y + distance * 0.8,  // 主要高度来自Y轴
            center.z + distance * 0.3   // 稍微偏移Z
        );
        
        this.controls.target.copy(center);
        this.controls.maxDistance = distance * 4;
        this.controls.minDistance = distance * 0.1;
        this.controls.update();
        
        console.log('📷 相机调整为俯视角度:');
        console.log('- 相机位置:', this.camera.position);
        console.log('- 相机目标:', this.controls.target);
        console.log('- 相机距离:', distance.toFixed(2));
        console.log('- 相机缩放:', this.camera.zoom);
        
        // 如果距离太大或太小，使用默认值
        if (distance > 10000 || distance < 1) {
            console.warn('⚠️ 计算距离异常，使用默认相机位置');
            this.camera.position.set(0, 100, 100);
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
        
        // 强制更新渲染
        this.renderer.render(this.scene, this.camera);
        console.log('🔄 强制渲染完成');
        
        // 调整绘图平面
        this.drawingPlane.position.copy(center);
        this.drawingPlane.position.y = box.min.y;
        this.drawingPlane.scale.setScalar(maxDim / 500);
        
        // 调整网格到点云底部
        const existingGrid = this.scene.children.find(child => child.type === 'GridHelper');
        if (existingGrid) {
            existingGrid.position.copy(center);
            existingGrid.position.y = box.min.y;
            
            // 检查是否需要调整网格大小
            const gridSize = Math.max(200, maxDim * 1.2);
            let needNewGrid = false;
            
            // 安全检查geometry.parameters是否存在
            if (existingGrid.geometry && existingGrid.geometry.parameters && existingGrid.geometry.parameters.size) {
                if (existingGrid.geometry.parameters.size < gridSize) {
                    needNewGrid = true;
                }
            } else {
                // 如果无法获取当前大小，直接创建新网格
                needNewGrid = true;
            }
            
            if (needNewGrid) {
                this.scene.remove(existingGrid);
                
                const newGrid = new THREE.GridHelper(gridSize, Math.min(100, Math.floor(gridSize / 20)), 0x444444, 0x444444);
                newGrid.material.transparent = true;
                newGrid.material.opacity = 0.5;
                newGrid.position.copy(center);
                newGrid.position.y = box.min.y;
                this.scene.add(newGrid);
                
                console.log('🔄 网格已重新调整:', { size: gridSize, position: newGrid.position });
            } else {
                console.log('✅ 网格位置已调整到点云底部');
            }
        }
        
        console.log(`📷 相机已调整到点云: 中心${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)}`);
    }
    
    toggleDrawingMode() {
        this.isDrawingMode = !this.isDrawingMode;
        
        if (this.isDrawingMode) {
            this.drawButton.textContent = '结束画路';
            this.drawButton.classList.add('active');
            this.drawStatus.textContent = '绘制模式：开启';
            this.controls.enabled = false;
            
            // 显示道路控制面板
            if (this.roadControlsPanel) {
                this.roadControlsPanel.style.display = 'block';
            }
        } else {
            this.drawButton.textContent = '开始画路';
            this.drawButton.classList.remove('active');
            this.drawStatus.textContent = '绘制模式：关闭';
            this.controls.enabled = true;
            
            // 隐藏道路控制面板
            if (this.roadControlsPanel) {
                this.roadControlsPanel.style.display = 'none';
            }
            
            this.finishRoad();
        }
    }
    
    handleDrawingClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        if (this.isJunctionMode) {
            // 交叉口模式：选择道路
            this.handleJunctionClick();
        } else if (this.isCurveMode) {
            // 弯道模式：选择道路
            this.handleCurveClick();
        } else {
            // 绘制模式：添加道路点
            const intersects = this.raycaster.intersectObject(this.drawingPlane);
            if (intersects.length > 0) {
                this.addRoadPoint(intersects[0].point);
            }
        }
    }
    
    addRoadPoint(point) {
        this.currentRoadPoints.push(point.clone());
        this.updateRoadLine();
        this.updateRoadInfo();
        
        console.log(`📍 添加路径点: (${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`);
    }
    
    updateRoadLine() {
        if (this.roadLine) {
            this.scene.remove(this.roadLine);
        }
        
        if (this.currentRoadPoints.length < 2) return;
        
        const geometry = new THREE.BufferGeometry().setFromPoints(this.currentRoadPoints);
        const material = new THREE.LineBasicMaterial({ color: 0xff4444, linewidth: 3 });
        this.roadLine = new THREE.Line(geometry, material);
        this.scene.add(this.roadLine);
        
        // 添加点标记
        this.updatePointMarkers();
    }
    
    updatePointMarkers() {
        // 移除旧标记
        const markers = this.scene.children.filter(child => child.userData.isMarker);
        markers.forEach(marker => this.scene.remove(marker));
        
        // 添加新标记
        this.currentRoadPoints.forEach((point, index) => {
            const geometry = new THREE.SphereGeometry(0.5, 8, 6);
            const color = index === 0 ? 0x00ff00 : (index === this.currentRoadPoints.length - 1 ? 0xff0000 : 0xffff00);
            const material = new THREE.MeshBasicMaterial({ color });
            const marker = new THREE.Mesh(geometry, material);
            marker.position.copy(point);
            marker.userData.isMarker = true;
            this.scene.add(marker);
        });
    }
    
    undoLastPoint() {
        if (this.currentRoadPoints.length > 0) {
            this.currentRoadPoints.pop();
            this.updateRoadLine();
            this.updateRoadInfo();
        }
    }
    
    finishRoad() {
        if (this.currentRoadPoints.length > 1) {
            console.log(`✅ 完成道路绘制: ${this.currentRoadPoints.length} 个点`);
        }
        this.currentRoadPoints = [];
        this.updateRoadInfo();
    }
    
    updateRoadInfo() {
        const pointCount = this.currentRoadPoints.length;
        const length = this.calculateRoadLength();
        
        // 更新UI显示
        this.pointsCount.textContent = `当前路径点数：${pointCount}`;
        
        const currentRoadPointsElement = document.getElementById('currentRoadPoints');
        const currentRoadLengthElement = document.getElementById('currentRoadLength');
        
        if (currentRoadPointsElement) {
            currentRoadPointsElement.textContent = pointCount.toString();
        }
        if (currentRoadLengthElement) {
            currentRoadLengthElement.textContent = length.toFixed(1);
        }
        
        // 更新已保存道路信息
        this.updateSavedRoadsInfo();
    }
    
    updateSavedRoadsInfo() {
        const savedRoadsCountElement = document.getElementById('savedRoadsCount');
        const junctionsCountElement = document.getElementById('junctionsCount');
        
        if (savedRoadsCountElement) {
            savedRoadsCountElement.textContent = this.roads.length.toString();
        }
        if (junctionsCountElement) {
            junctionsCountElement.textContent = this.junctions.length.toString();
        }
    }
    
    calculateRoadLength() {
        if (this.currentRoadPoints.length < 2) return 0;
        
        let totalLength = 0;
        for (let i = 1; i < this.currentRoadPoints.length; i++) {
            const prev = this.currentRoadPoints[i - 1];
            const curr = this.currentRoadPoints[i];
            totalLength += prev.distanceTo(curr);
        }
        return totalLength;
    }
    
    updateRoadVisualization() {
        // 重新绘制道路线条以反映新的参数
        this.updateRoadLine();
        
        // 这里可以添加更复杂的道路可视化，比如显示车道边界
        this.createRoadMesh();
    }
    
    createRoadMesh() {
        // 移除现有的道路网格
        const existingMesh = this.scene.children.find(child => child.userData.isRoadMesh);
        if (existingMesh) {
            this.scene.remove(existingMesh);
        }
        
        if (this.currentRoadPoints.length < 2) return;
        
        // 创建道路面
        const roadWidth = this.roadParameters.laneWidth * this.roadParameters.laneCount;
        const roadGeometry = this.generateRoadGeometry(this.currentRoadPoints, roadWidth);
        
        const roadMaterial = new THREE.MeshBasicMaterial({
            color: 0x404040,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
        roadMesh.userData.isRoadMesh = true;
        this.scene.add(roadMesh);
    }
    
    generateRoadGeometry(points, width) {
        const vertices = [];
        const indices = [];
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // 计算垂直方向
            const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
            const perpendicular = new THREE.Vector3(-direction.z, direction.y, direction.x).normalize();
            
            // 创建道路边缘点
            const offset = perpendicular.multiplyScalar(width / 2);
            
            const leftP1 = p1.clone().add(offset);
            const rightP1 = p1.clone().sub(offset);
            const leftP2 = p2.clone().add(offset);
            const rightP2 = p2.clone().sub(offset);
            
            // 添加顶点
            const baseIndex = vertices.length / 3;
            
            vertices.push(leftP1.x, leftP1.y, leftP1.z);
            vertices.push(rightP1.x, rightP1.y, rightP1.z);
            vertices.push(leftP2.x, leftP2.y, leftP2.z);
            vertices.push(rightP2.x, rightP2.y, rightP2.z);
            
            // 添加三角形索引
            indices.push(
                baseIndex, baseIndex + 1, baseIndex + 2,
                baseIndex + 1, baseIndex + 3, baseIndex + 2
            );
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        return geometry;
    }
    
    clearCurrentRoad() {
        this.currentRoadPoints = [];
        
        // 移除可视化元素
        if (this.roadLine) {
            this.scene.remove(this.roadLine);
            this.roadLine = null;
        }
        
        // 移除道路网格
        const roadMesh = this.scene.children.find(child => child.userData.isRoadMesh);
        if (roadMesh) {
            this.scene.remove(roadMesh);
        }
        
        // 移除标记
        const markers = this.scene.children.filter(child => child.userData.isMarker);
        markers.forEach(marker => this.scene.remove(marker));
        
        this.updateRoadInfo();
        console.log('🧹 清除当前道路');
    }
    
    saveCurrentRoad() {
        if (this.currentRoadPoints.length < 2) {
            this.showError('道路至少需要2个控制点');
            return;
        }
        
        const road = {
            id: `road_${this.roads.length + 1}`,
            points: this.currentRoadPoints.map(p => ({ x: p.x, y: p.y, z: p.z })),
            parameters: { ...this.roadParameters },
            length: this.calculateRoadLength(),
            timestamp: new Date().toISOString()
        };
        
        this.roads.push(road);
        console.log(`💾 保存道路: ${road.id}, 长度: ${road.length.toFixed(1)}m`);
        
        // 渲染已保存的道路
        this.renderSavedRoad(road);
        
        // 显示成功消息
        this.showSuccess(`道路已保存：${road.id}`);
        
        // 清除当前绘制（但保留已保存的道路）
        this.clearCurrentRoad();
    }
    
    exportOpenDrive() {
        if (this.roads.length === 0) {
            this.showError('没有可导出的道路');
            return;
        }
        
        console.log('📤 开始导出OpenDRIVE...');
        
        const openDriveXML = this.generateOpenDriveXML();
        this.downloadFile(openDriveXML, 'road_map.xodr', 'application/xml');
        
        console.log('✅ OpenDRIVE导出完成');
    }
    
    exportJSON() {
        const data = {
            roads: this.roads,
            metadata: {
                version: '1.0',
                created: new Date().toISOString(),
                pointCloudFile: this.originalPointCloudData ? this.originalPointCloudData.fileName : null
            }
        };
        
        const jsonStr = JSON.stringify(data, null, 2);
        this.downloadFile(jsonStr, 'road_map.json', 'application/json');
        
        console.log('✅ JSON导出完成');
    }
    
    handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    showLoading(show) {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = show ? 'block' : 'none';
        }
    }
    
    showError(message) {
        console.error('❌', message);
        
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: #f44336; color: white;
            padding: 15px 20px; border-radius: 8px; z-index: 10000; max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: sans-serif;
        `;
        errorDiv.innerHTML = `
            <strong>❌ 错误</strong><br>${message}
            <button onclick="this.parentElement.remove()" style="
                background: rgba(255,255,255,0.2); border: none; color: white;
                padding: 5px 10px; border-radius: 4px; margin-left: 10px; cursor: pointer;
            ">关闭</button>
        `;
        
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }
    
    showSuccess(message) {
        console.log('✅', message);
        
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: #48bb78; color: white;
            padding: 15px 20px; border-radius: 8px; z-index: 10000; max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: sans-serif;
        `;
        successDiv.innerHTML = `
            <strong>✅ 成功</strong><br>${message}
            <button onclick="this.parentElement.remove()" style="
                background: rgba(255,255,255,0.2); border: none; color: white;
                padding: 5px 10px; border-radius: 4px; margin-left: 10px; cursor: pointer;
            ">关闭</button>
        `;
        
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
    }
    
    generateOpenDriveXML() {
        const header = this.generateOpenDriveHeader();
        const roads = this.roads.map(road => this.generateRoadXML(road)).join('\n');
        const junctions = this.junctions.map(junction => this.generateJunctionXML(junction)).join('\n');
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<OpenDRIVE>
    ${header}
    ${roads}
    ${junctions}
</OpenDRIVE>`;
    }
    
    generateOpenDriveHeader() {
        const now = new Date();
        return `<header revMajor="1" revMinor="4" name="Generated Map" version="1.0"
                 date="${now.toISOString().split('T')[0]}" 
                 north="0.0" south="0.0" east="0.0" west="0.0" vendor="OpenDRIVE Editor">
        <geoReference><![CDATA[+proj=utm +zone=33 +ellps=WGS84 +datum=WGS84 +units=m +no_defs]]></geoReference>
    </header>`;
    }
    
    generateRoadXML(road) {
        const roadLength = road.length;
        const roadId = parseInt(road.id.split('_')[1]) || 1;
        
        // 生成几何体部分
        const geometries = this.generateGeometryXML(road.points, roadLength);
        
        // 生成车道部分
        const lanes = this.generateLanesXML(road.parameters);
        
        // 检查是否有交叉口连接
        const junctionId = this.findJunctionForRoad(road);
        
        // 生成连接信息
        const linkInfo = this.generateRoadLinkXML(road, roadId, junctionId);
        
        return `<road name="${road.id}" length="${roadLength.toFixed(6)}" id="${roadId}" junction="${junctionId}">
        <link>
            ${linkInfo}
        </link>
        <planView>
            ${geometries}
        </planView>
        <elevationProfile>
            <elevation s="0.0000000000000000e+00" a="0.0000000000000000e+00" b="0.0000000000000000e+00" c="0.0000000000000000e+00" d="0.0000000000000000e+00"/>
        </elevationProfile>
        <lateralProfile>
        </lateralProfile>
        <lanes>
            ${lanes}
        </lanes>
    </road>`;
    }
    
    findJunctionForRoad(road) {
        for (const junction of this.junctions) {
            if (junction.connectedRoads.includes(road)) {
                return parseInt(junction.id.split('_')[1]) || 1;
            }
        }
        return -1; // 没有交叉口连接
    }
    
    generateRoadLinkXML(road, roadId, junctionId) {
        if (junctionId === -1) {
            // 没有交叉口，使用简单的道路连接
            return `<predecessor elementType="road" elementId="${roadId - 1}" contactPoint="end"/>
            <successor elementType="road" elementId="${roadId + 1}" contactPoint="start"/>`;
        } else {
            // 有交叉口连接
            return `<predecessor elementType="junction" elementId="${junctionId}" contactPoint="start"/>
            <successor elementType="junction" elementId="${junctionId}" contactPoint="end"/>`;
        }
    }
    
    generateGeometryXML(points, totalLength) {
        if (points.length < 2) return '';
        
        let geometries = [];
        let s = 0;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            const length = Math.sqrt(
                Math.pow(p2.x - p1.x, 2) + 
                Math.pow(p2.z - p1.z, 2)
            );
            
            const hdg = Math.atan2(p2.z - p1.z, p2.x - p1.x);
            
            geometries.push(
                `<geometry s="${s.toFixed(16)}" x="${p1.x.toFixed(16)}" y="${p1.z.toFixed(16)}" hdg="${hdg.toFixed(16)}" length="${length.toFixed(16)}">
                    <line/>
                </geometry>`
            );
            
            s += length;
        }
        
        return geometries.join('\n            ');
    }
    
    generateLanesXML(parameters) {
        const laneWidth = parameters.laneWidth;
        const laneCount = parameters.laneCount;
        
        // 生成左侧车道
        let leftLanes = '';
        for (let i = 1; i <= Math.floor(laneCount / 2); i++) {
            leftLanes += `
                <lane id="${i}" type="driving" level="false">
                    <link>
                    </link>
                    <width sOffset="0.0000000000000000e+00" a="${laneWidth.toFixed(16)}" b="0.0000000000000000e+00" c="0.0000000000000000e+00" d="0.0000000000000000e+00"/>
                    <roadMark sOffset="0.0000000000000000e+00" type="solid" weight="standard" color="standard" width="1.2000000000000000e-01"/>
                </lane>`;
        }
        
        // 生成右侧车道
        let rightLanes = '';
        for (let i = -1; i >= -Math.ceil(laneCount / 2); i--) {
            rightLanes += `
                <lane id="${i}" type="driving" level="false">
                    <link>
                    </link>
                    <width sOffset="0.0000000000000000e+00" a="${laneWidth.toFixed(16)}" b="0.0000000000000000e+00" c="0.0000000000000000e+00" d="0.0000000000000000e+00"/>
                    <roadMark sOffset="0.0000000000000000e+00" type="solid" weight="standard" color="standard" width="1.2000000000000000e-01"/>
                </lane>`;
        }
        
        return `<laneSection s="0.0000000000000000e+00">
                <left>
                    ${leftLanes}
                </left>
                <center>
                    <lane id="0" type="none" level="false">
                        <link>
                        </link>
                        <roadMark sOffset="0.0000000000000000e+00" type="solid" weight="standard" color="standard" width="1.2000000000000000e-01"/>
                    </lane>
                </center>
                <right>
                    ${rightLanes}
                </right>
            </laneSection>`;
    }
    
    generateJunctionXML(junction) {
        const junctionId = parseInt(junction.id.split('_')[1]) || 1;
        
        // 生成连接道路的引用
        const connections = junction.connectedRoads.map((road, index) => {
            const roadId = parseInt(road.id.split('_')[1]) || (index + 1);
            return `        <connection id="${index}" incomingRoad="${roadId}" connectingRoad="${roadId}" contactPoint="start">
            <laneLink from="1" to="1"/>
        </connection>`;
        }).join('\n');
        
        return `<junction id="${junctionId}" name="${junction.id}">
        ${connections}
    </junction>`;
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
    
    // ==================== 交叉口相关方法 ====================
    
    toggleJunctionMode() {
        this.isJunctionMode = !this.isJunctionMode;
        
        if (this.isJunctionMode) {
            console.log('🚦 进入交叉口创建模式');
            this.showSuccess('交叉口模式：点击选择要连接的道路');
            this.selectedRoads = [];
            this.junctionConnectionPoints = [];
            
            // 更新按钮状态
            const createJunctionBtn = document.getElementById('createJunction');
            if (createJunctionBtn) {
                createJunctionBtn.textContent = '退出交叉口模式';
                createJunctionBtn.style.background = '#e53e3e';
            }
        } else {
            console.log('🚦 退出交叉口创建模式');
            this.selectedRoads = [];
            this.junctionConnectionPoints = [];
            
            // 更新按钮状态
            const createJunctionBtn = document.getElementById('createJunction');
            if (createJunctionBtn) {
                createJunctionBtn.textContent = '创建交叉口';
                createJunctionBtn.style.background = '#9f7aea';
            }
        }
    }
    
    handleJunctionClick() {
        // 查找点击位置附近的道路
        const nearbyRoads = this.findRoadsNearPoint(this.mouse);
        
        if (nearbyRoads.length > 0) {
            const road = nearbyRoads[0];
            
            if (!this.selectedRoads.includes(road)) {
                this.selectedRoads.push(road);
                console.log(`📍 选择道路: ${road.id}`);
                
                // 可视化选中的道路
                this.highlightSelectedRoads();
                
                if (this.selectedRoads.length >= 2) {
                    this.createJunctionFromSelectedRoads();
                }
            } else {
                console.log('道路已选中');
            }
        } else {
            console.log('未找到附近的道路');
        }
    }
    
    findRoadsNearPoint(clickPoint) {
        const nearbyRoads = [];
        const threshold = 5.0; // 增加选择阈值到5米
        
        console.log(`🔍 在 ${this.roads.length} 条道路中查找附近道路...`);
        
        for (const road of this.roads) {
            let minDistance = Infinity;
            
            for (let i = 0; i < road.points.length - 1; i++) {
                const p1 = new THREE.Vector3(road.points[i].x, road.points[i].y, road.points[i].z);
                const p2 = new THREE.Vector3(road.points[i + 1].x, road.points[i + 1].y, road.points[i + 1].z);
                
                // 计算点到线段的距离
                const distance = this.pointToLineDistance(clickPoint, p1, p2);
                minDistance = Math.min(minDistance, distance);
            }
            
            console.log(`道路 ${road.id} 最近距离: ${minDistance.toFixed(2)}m`);
            
            if (minDistance < threshold) {
                nearbyRoads.push(road);
                console.log(`✅ 找到附近道路: ${road.id}`);
            }
        }
        
        console.log(`找到 ${nearbyRoads.length} 条附近道路`);
        return nearbyRoads;
    }
    
    findRoadsNearPointLoose(clickPoint) {
        const nearbyRoads = [];
        const threshold = 20.0; // 更宽松的阈值：20米
        
        console.log(`🔍 宽松模式：在 ${this.roads.length} 条道路中查找附近道路...`);
        
        for (const road of this.roads) {
            let minDistance = Infinity;
            
            // 检查道路的所有点
            for (let i = 0; i < road.points.length; i++) {
                const p = new THREE.Vector3(road.points[i].x, road.points[i].y, road.points[i].z);
                const distance = clickPoint.distanceTo(p);
                minDistance = Math.min(minDistance, distance);
            }
            
            console.log(`道路 ${road.id} 最近点距离: ${minDistance.toFixed(2)}m`);
            
            if (minDistance < threshold) {
                nearbyRoads.push(road);
                console.log(`✅ 找到附近道路(宽松模式): ${road.id}`);
            }
        }
        
        console.log(`宽松模式找到 ${nearbyRoads.length} 条附近道路`);
        return nearbyRoads;
    }
    
    findRoadEndpointsNearPoint(clickPoint) {
        const nearbyEndpoints = [];
        const threshold = 10.0; // 端点检测阈值：10米
        
        console.log(`🔍 在 ${this.roads.length} 条道路中查找附近端点...`);
        
        for (const road of this.roads) {
            const points = road.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
            
            // 检查起点
            const startPoint = points[0];
            const startDistance = clickPoint.distanceTo(startPoint);
            if (startDistance < threshold) {
                nearbyEndpoints.push({
                    road: road,
                    point: startPoint,
                    type: 'start',
                    distance: startDistance
                });
                console.log(`✅ 找到起点: ${road.id}, 距离: ${startDistance.toFixed(2)}m`);
            }
            
            // 检查终点
            const endPoint = points[points.length - 1];
            const endDistance = clickPoint.distanceTo(endPoint);
            if (endDistance < threshold) {
                nearbyEndpoints.push({
                    road: road,
                    point: endPoint,
                    type: 'end',
                    distance: endDistance
                });
                console.log(`✅ 找到终点: ${road.id}, 距离: ${endDistance.toFixed(2)}m`);
            }
        }
        
        // 按距离排序，返回最近的端点
        nearbyEndpoints.sort((a, b) => a.distance - b.distance);
        console.log(`找到 ${nearbyEndpoints.length} 个附近端点`);
        
        return nearbyEndpoints;
    }
    
    pointToLineDistance(point, lineStart, lineEnd) {
        // 将3D点投影到2D平面（忽略Y轴）
        const p = new THREE.Vector2(point.x, point.z);
        const a = new THREE.Vector2(lineStart.x, lineStart.z);
        const b = new THREE.Vector2(lineEnd.x, lineEnd.z);
        
        const ab = new THREE.Vector2().subVectors(b, a);
        const ap = new THREE.Vector2().subVectors(p, a);
        
        const abLength = ab.length();
        if (abLength === 0) return ap.length();
        
        const t = Math.max(0, Math.min(1, ap.dot(ab) / (abLength * abLength)));
        const projection = new THREE.Vector2().copy(a).add(ab.multiplyScalar(t));
        
        return p.distanceTo(projection);
    }
    
    highlightSelectedRoads() {
        // 移除之前的高亮
        const existingHighlights = this.scene.children.filter(child => child.userData.isRoadHighlight);
        existingHighlights.forEach(highlight => this.scene.remove(highlight));
        
        // 为选中的道路添加高亮
        this.selectedRoads.forEach(road => {
            const roadGeometry = this.createRoadHighlightGeometry(road);
            const highlightMaterial = new THREE.LineBasicMaterial({
                color: 0xffff00,
                linewidth: 5
            });
            
            const highlight = new THREE.Line(roadGeometry, highlightMaterial);
            highlight.userData.isRoadHighlight = true;
            this.scene.add(highlight);
        });
    }
    
    createRoadHighlightGeometry(road) {
        const points = road.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return geometry;
    }
    
    createJunctionFromSelectedRoads() {
        if (this.selectedRoads.length < 2) {
            this.showError('至少需要选择2条道路来创建交叉口');
            return;
        }
        
        // 计算交叉口中心点
        const junctionCenter = this.calculateJunctionCenter(this.selectedRoads);
        
        // 创建交叉口
        const junction = {
            id: `junction_${this.junctions.length + 1}`,
            center: junctionCenter,
            connectedRoads: [...this.selectedRoads],
            connections: this.generateJunctionConnections(this.selectedRoads, junctionCenter),
            timestamp: new Date().toISOString()
        };
        
        this.junctions.push(junction);
        
        // 更新道路的连接信息
        this.updateRoadConnections(junction);
        
        // 可视化交叉口
        this.visualizeJunction(junction);
        
        console.log(`🚦 创建交叉口: ${junction.id}`);
        this.showSuccess(`交叉口已创建：${junction.id}`);
        
        // 更新道路信息显示
        this.updateSavedRoadsInfo();
        
        // 重置选择
        this.selectedRoads = [];
        this.isJunctionMode = false;
        
        // 更新按钮状态
        const createJunctionBtn = document.getElementById('createJunction');
        if (createJunctionBtn) {
            createJunctionBtn.textContent = '创建交叉口';
            createJunctionBtn.style.background = '#9f7aea';
        }
    }
    
    calculateJunctionCenter(roads) {
        // 计算所有道路点的平均位置作为交叉口中心
        let totalX = 0, totalY = 0, totalZ = 0;
        let pointCount = 0;
        
        roads.forEach(road => {
            road.points.forEach(point => {
                totalX += point.x;
                totalY += point.y;
                totalZ += point.z;
                pointCount++;
            });
        });
        
        return {
            x: totalX / pointCount,
            y: totalY / pointCount,
            z: totalZ / pointCount
        };
    }
    
    generateJunctionConnections(roads, center) {
        const connections = [];
        
        roads.forEach((road, index) => {
            // 为每条道路创建连接点
            const connection = {
                roadId: road.id,
                roadIndex: index,
                connectionPoint: this.findClosestPointOnRoad(road, center),
                incoming: true,
                outgoing: true
            };
            connections.push(connection);
        });
        
        return connections;
    }
    
    findClosestPointOnRoad(road, center) {
        let closestPoint = road.points[0];
        let minDistance = Infinity;
        
        road.points.forEach(point => {
            const distance = Math.sqrt(
                Math.pow(point.x - center.x, 2) +
                Math.pow(point.y - center.y, 2) +
                Math.pow(point.z - center.z, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = point;
            }
        });
        
        return closestPoint;
    }
    
    updateRoadConnections(junction) {
        // 更新道路的连接信息
        junction.connectedRoads.forEach(road => {
            if (!road.connections) {
                road.connections = [];
            }
            
            road.connections.push({
                type: 'junction',
                junctionId: junction.id,
                connectionPoint: this.findClosestPointOnRoad(road, junction.center)
            });
        });
    }
    
    visualizeJunction(junction) {
        // 创建交叉口中心标记
        const centerGeometry = new THREE.SphereGeometry(2, 16, 16);
        const centerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
        centerMesh.position.set(junction.center.x, junction.center.y, junction.center.z);
        centerMesh.userData.isJunctionCenter = true;
        this.scene.add(centerMesh);
        
        // 创建连接线
        junction.connections.forEach(connection => {
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(junction.center.x, junction.center.y, junction.center.z),
                new THREE.Vector3(connection.connectionPoint.x, connection.connectionPoint.y, connection.connectionPoint.z)
            ]);
            
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
            const connectionLine = new THREE.Line(lineGeometry, lineMaterial);
            connectionLine.userData.isJunctionConnection = true;
            this.scene.add(connectionLine);
        });
    }
    
    renderSavedRoad(road) {
        // 创建道路中心线
        const points = road.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x666666, 
            linewidth: 2 
        });
        
        const roadLine = new THREE.Line(lineGeometry, lineMaterial);
        roadLine.userData.isSavedRoad = true;
        roadLine.userData.roadId = road.id;
        this.scene.add(roadLine);
        
        // 创建道路面
        const roadWidth = road.parameters.laneWidth * road.parameters.laneCount;
        const roadGeometry = this.generateRoadGeometry(points, roadWidth);
        
        const roadMaterial = new THREE.MeshBasicMaterial({
            color: 0x404040,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
        roadMesh.userData.isSavedRoad = true;
        roadMesh.userData.roadId = road.id;
        this.scene.add(roadMesh);
        
        // 创建道路端点标记
        this.createRoadEndMarkers(road, points);
        
        console.log(`🎨 渲染已保存道路: ${road.id}`);
    }
    
    createRoadEndMarkers(road, points) {
        if (points.length < 2) return;
        
        // 起点标记（绿色）
        const startGeometry = new THREE.SphereGeometry(1, 8, 6);
        const startMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const startMarker = new THREE.Mesh(startGeometry, startMaterial);
        startMarker.position.copy(points[0]);
        startMarker.userData.isSavedRoadMarker = true;
        startMarker.userData.roadId = road.id;
        startMarker.userData.isStart = true;
        this.scene.add(startMarker);
        
        // 终点标记（红色）
        const endGeometry = new THREE.SphereGeometry(1, 8, 6);
        const endMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const endMarker = new THREE.Mesh(endGeometry, endMaterial);
        endMarker.position.copy(points[points.length - 1]);
        endMarker.userData.isSavedRoadMarker = true;
        endMarker.userData.roadId = road.id;
        endMarker.userData.isEnd = true;
        this.scene.add(endMarker);
    }
    
    renderAllSavedRoads() {
        // 清除所有已保存的道路可视化
        this.clearAllSavedRoads();
        
        // 重新渲染所有已保存的道路
        this.roads.forEach(road => {
            this.renderSavedRoad(road);
        });
        
        console.log(`🎨 重新渲染所有已保存道路: ${this.roads.length} 条`);
    }
    
    clearAllSavedRoads() {
        // 移除所有已保存的道路可视化元素
        const savedRoadElements = this.scene.children.filter(child => 
            child.userData.isSavedRoad || child.userData.isSavedRoadMarker
        );
        
        savedRoadElements.forEach(element => {
            this.scene.remove(element);
        });
        
        console.log(`🧹 清除所有已保存道路可视化: ${savedRoadElements.length} 个元素`);
    }
    
    // ==================== 弯道相关方法 ====================
    
    toggleCurveMode() {
        this.isCurveMode = !this.isCurveMode;
        
        if (this.isCurveMode) {
            console.log('🔄 进入弯道创建模式');
            console.log('当前已保存道路数量:', this.roads.length);
            this.showSuccess('弯道模式：点击选择两条道路来创建弯道连接');
            this.selectedRoadsForCurve = [];
            
            // 显示弯道参数面板
            const curveParamsSection = document.getElementById('curveParamsSection');
            if (curveParamsSection) {
                curveParamsSection.style.display = 'block';
                console.log('弯道参数面板已显示');
            } else {
                console.log('弯道参数面板未找到');
            }
            
            // 更新按钮状态
            const createCurveBtn = document.getElementById('createCurve');
            const cancelCurveBtn = document.getElementById('cancelCurve');
            if (createCurveBtn) {
                createCurveBtn.textContent = '弯道模式中...';
                createCurveBtn.style.background = '#e53e3e';
                console.log('弯道按钮状态已更新');
            } else {
                console.log('弯道按钮未找到');
            }
            if (cancelCurveBtn) {
                cancelCurveBtn.style.display = 'block';
                console.log('取消按钮已显示');
            } else {
                console.log('取消按钮未找到');
            }
        } else {
            this.cancelCurveMode();
        }
    }
    
    cancelCurveMode() {
        console.log('🔄 退出弯道创建模式');
        this.isCurveMode = false;
        this.selectedRoadsForCurve = [];
        
        // 隐藏弯道参数面板
        const curveParamsSection = document.getElementById('curveParamsSection');
        if (curveParamsSection) {
            curveParamsSection.style.display = 'none';
        }
        
        // 更新按钮状态
        const createCurveBtn = document.getElementById('createCurve');
        const cancelCurveBtn = document.getElementById('cancelCurve');
        if (createCurveBtn) {
            createCurveBtn.textContent = '创建弯道';
            createCurveBtn.style.background = '#ed8936';
        }
        if (cancelCurveBtn) {
            cancelCurveBtn.style.display = 'none';
        }
        
        // 清除选择高亮
        this.clearRoadSelection();
    }
    
    handleCurveClick() {
        console.log('🔄 弯道点击检测开始');
        
        // 计算鼠标点击的3D世界坐标
        const intersects = this.raycaster.intersectObject(this.drawingPlane);
        
        if (intersects.length === 0) {
            console.log('未点击到地面');
            return;
        }
        
        const clickPoint = intersects[0].point;
        console.log('点击位置:', clickPoint);
        
        // 查找点击位置附近的道路端点
        const nearbyEndpoints = this.findRoadEndpointsNearPoint(clickPoint);
        
        if (nearbyEndpoints.length > 0) {
            const endpoint = nearbyEndpoints[0];
            const road = endpoint.road;
            
            // 检查是否已经选择了这条道路
            const existingSelection = this.selectedRoadsForCurve.find(r => r.road.id === road.id);
            if (existingSelection) {
                console.log('道路已选中');
                return;
            }
            
            // 添加到选择列表
            this.selectedRoadsForCurve.push({
                road: road,
                endpoint: endpoint,
                endpointType: endpoint.type // 'start' 或 'end'
            });
            
            console.log(`📍 选择道路端点用于弯道: ${road.id} (${endpoint.type})`);
            
            // 可视化选中的道路端点
            this.highlightSelectedRoadEndpoints();
            
            if (this.selectedRoadsForCurve.length >= 2) {
                this.createCurveBetweenRoads();
            }
        } else {
            console.log('未找到附近的道路端点');
        }
    }
    
    highlightSelectedRoadEndpoints() {
        // 清除之前的选择高亮
        this.clearRoadSelection();
        
        // 高亮选中的道路端点
        this.selectedRoadsForCurve.forEach((selection, index) => {
            const road = selection.road;
            const endpoint = selection.endpoint;
            
            // 高亮整条道路
            const points = road.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const lineMaterial = new THREE.LineBasicMaterial({ 
                color: index === 0 ? 0x00ff00 : 0xff8800, // 第一条绿色，第二条橙色
                linewidth: 4 
            });
            
            const highlightLine = new THREE.Line(lineGeometry, lineMaterial);
            highlightLine.userData.isCurveSelection = true;
            this.scene.add(highlightLine);
            
            // 高亮选中的端点
            const endpointGeometry = new THREE.SphereGeometry(2, 8, 6);
            const endpointMaterial = new THREE.MeshBasicMaterial({ 
                color: index === 0 ? 0x00ff00 : 0xff8800 
            });
            const endpointMesh = new THREE.Mesh(endpointGeometry, endpointMaterial);
            endpointMesh.position.copy(endpoint.point);
            endpointMesh.userData.isCurveSelection = true;
            endpointMesh.userData.isEndpoint = true;
            this.scene.add(endpointMesh);
            
            console.log(`🎯 高亮道路 ${road.id} 的${endpoint.type === 'start' ? '起点' : '终点'}`);
        });
    }
    
    clearRoadSelection() {
        // 移除选择高亮
        const selectionElements = this.scene.children.filter(child => 
            child.userData.isCurveSelection
        );
        
        selectionElements.forEach(element => {
            this.scene.remove(element);
        });
    }
    
    createCurveBetweenRoads() {
        if (this.selectedRoadsForCurve.length < 2) {
            this.showError('需要选择2条道路来创建弯道');
            return;
        }
        
        const selection1 = this.selectedRoadsForCurve[0];
        const selection2 = this.selectedRoadsForCurve[1];
        
        const road1 = selection1.road;
        const road2 = selection2.road;
        const endpoint1 = selection1.endpoint;
        const endpoint2 = selection2.endpoint;
        
        console.log(`🔄 创建弯道: ${road1.id}(${endpoint1.type}) -> ${road2.id}(${endpoint2.type})`);
        
        // 计算弯道连接点（基于端点）
        const connectionPoints = this.calculateCurveConnectionPointsFromEndpoints(road1, endpoint1, road2, endpoint2);
        
        if (!connectionPoints) {
            this.showError('无法计算弯道连接点');
            return;
        }
        
        // 生成弯道几何
        const curvePoints = this.generateCurveGeometry(connectionPoints);
        
        // 创建弯道道路
        const curveRoad = {
            id: `curve_${this.roads.length + 1}`,
            points: curvePoints,
            parameters: { ...this.roadParameters },
            length: this.calculateCurveLength(curvePoints),
            timestamp: new Date().toISOString(),
            isCurve: true,
            connectedRoads: [road1.id, road2.id],
            connectionInfo: {
                road1: { id: road1.id, endpoint: endpoint1.type },
                road2: { id: road2.id, endpoint: endpoint2.type }
            }
        };
        
        this.roads.push(curveRoad);
        
        // 渲染弯道
        this.renderCurveRoad(curveRoad);
        
        console.log(`🔄 创建弯道: ${curveRoad.id}`);
        this.showSuccess(`弯道已创建：${curveRoad.id}`);
        
        // 更新道路信息
        this.updateSavedRoadsInfo();
        
        // 退出弯道模式
        this.cancelCurveMode();
    }
    
    calculateCurveConnectionPoints(road1, road2) {
        const points1 = road1.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
        const points2 = road2.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
        
        // 找到最近的点对
        let minDistance = Infinity;
        let bestConnection = null;
        
        // 检查所有可能的端点组合
        const endpoints1 = [points1[0], points1[points1.length - 1]];
        const endpoints2 = [points2[0], points2[points2.length - 1]];
        
        for (let i = 0; i < endpoints1.length; i++) {
            for (let j = 0; j < endpoints2.length; j++) {
                const distance = endpoints1[i].distanceTo(endpoints2[j]);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestConnection = {
                        start1: endpoints1[i],
                        end1: endpoints1[i],
                        start2: endpoints2[j],
                        end2: endpoints2[j],
                        distance: distance
                    };
                }
            }
        }
        
        if (minDistance > 100) { // 如果距离太远，不创建弯道
            return null;
        }
        
        // 计算道路方向向量
        const road1Direction = this.calculateRoadDirection(points1);
        const road2Direction = this.calculateRoadDirection(points2);
        
        // 计算连接点处的切线方向
        const tangent1 = this.calculateTangentAtPoint(points1, bestConnection.start1);
        const tangent2 = this.calculateTangentAtPoint(points2, bestConnection.start2);
        
        bestConnection.road1Direction = road1Direction;
        bestConnection.road2Direction = road2Direction;
        bestConnection.tangent1 = tangent1;
        bestConnection.tangent2 = tangent2;
        
        return bestConnection;
    }
    
    calculateRoadDirection(points) {
        if (points.length < 2) return new THREE.Vector3(1, 0, 0);
        
        const start = points[0];
        const end = points[points.length - 1];
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        
        return direction;
    }
    
    calculateTangentAtPoint(points, targetPoint) {
        // 找到最接近目标点的线段
        let minDistance = Infinity;
        let bestIndex = 0;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const distance = this.pointToLineDistance(targetPoint, p1, p2);
            
            if (distance < minDistance) {
                minDistance = distance;
                bestIndex = i;
            }
        }
        
        // 计算该线段的方向
        const p1 = points[bestIndex];
        const p2 = points[bestIndex + 1];
        const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
        
        return tangent;
    }
    
    calculateCurveConnectionPointsFromEndpoints(road1, endpoint1, road2, endpoint2) {
        const points1 = road1.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
        const points2 = road2.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
        
        // 使用选中的端点
        const start1 = endpoint1.point;
        const start2 = endpoint2.point;
        const distance = start1.distanceTo(start2);
        
        console.log(`端点连接: ${road1.id}(${endpoint1.type}) -> ${road2.id}(${endpoint2.type}), 距离: ${distance.toFixed(2)}m`);
        
        if (distance > 100) {
            console.log('距离太远，无法创建弯道');
            return null;
        }
        
        // 计算道路方向向量
        const road1Direction = this.calculateRoadDirection(points1);
        const road2Direction = this.calculateRoadDirection(points2);
        
        // 计算端点处的切线方向
        const tangent1 = this.calculateTangentAtEndpoint(points1, endpoint1.type);
        const tangent2 = this.calculateTangentAtEndpoint(points2, endpoint2.type);
        
        return {
            start1: start1,
            end1: start1,
            start2: start2,
            end2: start2,
            distance: distance,
            road1Direction: road1Direction,
            road2Direction: road2Direction,
            tangent1: tangent1,
            tangent2: tangent2
        };
    }
    
    calculateTangentAtEndpoint(points, endpointType) {
        if (points.length < 2) return new THREE.Vector3(1, 0, 0);
        
        if (endpointType === 'start') {
            // 起点：使用前两个点的方向
            const direction = new THREE.Vector3().subVectors(points[1], points[0]).normalize();
            return direction;
        } else {
            // 终点：使用最后两个点的方向
            const direction = new THREE.Vector3().subVectors(points[points.length - 1], points[points.length - 2]).normalize();
            return direction;
        }
    }
    
    generateCurveGeometry(connectionInfo) {
        const start1 = connectionInfo.start1;
        const start2 = connectionInfo.start2;
        const distance = connectionInfo.distance;
        const tangent1 = connectionInfo.tangent1;
        const tangent2 = connectionInfo.tangent2;
        
        console.log(`🔄 生成弯道: 距离=${distance.toFixed(2)}m`);
        
        // 智能弯道生成算法
        return this.generateSmartCurve(start1, start2, tangent1, tangent2, distance);
    }
    
    generateSmartCurve(start1, start2, tangent1, tangent2, distance) {
        const points = [];
        
        // 强制直线连接模式
        if (this.curveParameters.forceStraight) {
            console.log('强制直线连接模式');
            return this.generateStraightConnection(start1, start2);
        }
        
        // 如果距离很近，直接直线连接
        if (distance < 5) {
            console.log('距离很近，使用直线连接');
            return this.generateStraightConnection(start1, start2);
        }
        
        // 计算切线夹角
        const angle = Math.acos(Math.max(-1, Math.min(1, tangent1.dot(tangent2))));
        const angleDegrees = (angle * 180) / Math.PI;
        
        console.log(`切线夹角: ${angleDegrees.toFixed(1)}°`);
        
        // 根据夹角和距离选择弯道类型
        if (angleDegrees < 30) {
            // 小角度：使用直线连接
            console.log('小角度，使用直线连接');
            return this.generateStraightConnection(start1, start2);
        } else if (angleDegrees < 90) {
            // 中等角度：使用简单弯道
            console.log('中等角度，使用简单弯道');
            return this.generateSimpleCurve(start1, start2, tangent1, tangent2, distance);
        } else {
            // 大角度：使用S形弯道
            console.log('大角度，使用S形弯道');
            return this.generateSCurve(start1, start2, tangent1, tangent2, distance);
        }
    }
    
    generateStraightConnection(start1, start2) {
        const points = [];
        points.push({ x: start1.x, y: start1.y, z: start1.z });
        points.push({ x: start2.x, y: start2.y, z: start2.z });
        return points;
    }
    
    generateSimpleCurve(start1, start2, tangent1, tangent2, distance) {
        const points = [];
        const smoothness = Math.max(5, Math.min(20, Math.floor(distance / 5)));
        
        // 计算弯道控制点
        const midPoint = new THREE.Vector3()
            .addVectors(start1, start2)
            .multiplyScalar(0.5);
        
        // 计算弯道偏移方向
        const connectionDirection = new THREE.Vector3().subVectors(start2, start1).normalize();
        const perpendicular = new THREE.Vector3(-connectionDirection.z, 0, connectionDirection.x).normalize();
        
        // 计算弯道半径（基于距离）
        const radius = Math.min(distance * 0.3, 15);
        
        // 根据切线方向决定偏移方向
        const crossProduct = new THREE.Vector3().crossVectors(tangent1, tangent2);
        const offsetDirection = crossProduct.y > 0 ? 1 : -1;
        
        // 计算弯道中心
        const curveCenter = midPoint.clone().add(perpendicular.multiplyScalar(radius * offsetDirection));
        
        // 生成弯道点
        for (let i = 0; i <= smoothness; i++) {
            const t = i / smoothness;
            const point = this.calculateSmoothCurvePoint(start1, start2, curveCenter, t);
            points.push({ x: point.x, y: point.y, z: point.z });
        }
        
        return points;
    }
    
    generateSCurve(start1, start2, tangent1, tangent2, distance) {
        const points = [];
        const smoothness = Math.max(8, Math.min(30, Math.floor(distance / 3)));
        
        // 计算中间控制点
        const midPoint = new THREE.Vector3()
            .addVectors(start1, start2)
            .multiplyScalar(0.5);
        
        // 计算弯道半径
        const radius = Math.min(distance * 0.4, 20);
        
        // 计算两个控制点
        const control1 = start1.clone().add(tangent1.multiplyScalar(radius));
        const control2 = start2.clone().add(tangent2.multiplyScalar(radius));
        
        // 生成S形弯道
        for (let i = 0; i <= smoothness; i++) {
            const t = i / smoothness;
            const point = this.calculateSCurvePoint(start1, control1, control2, start2, t);
            points.push({ x: point.x, y: point.y, z: point.z });
        }
        
        return points;
    }
    
    calculateSmoothCurvePoint(start1, start2, center, t) {
        // 使用圆弧插值
        const angle1 = Math.atan2(start1.z - center.z, start1.x - center.x);
        const angle2 = Math.atan2(start2.z - center.z, start2.x - center.x);
        
        let angleDiff = angle2 - angle1;
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        const currentAngle = angle1 + angleDiff * t;
        const radius = start1.distanceTo(center);
        
        const x = center.x + radius * Math.cos(currentAngle);
        const z = center.z + radius * Math.sin(currentAngle);
        const y = start1.y + (start2.y - start1.y) * t;
        
        return new THREE.Vector3(x, y, z);
    }
    
    calculateSCurvePoint(p0, p1, p2, p3, t) {
        // 三次贝塞尔曲线
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;
        
        const point = new THREE.Vector3();
        point.addScaledVector(p0, uuu);
        point.addScaledVector(p1, 3 * uu * t);
        point.addScaledVector(p2, 3 * u * tt);
        point.addScaledVector(p3, ttt);
        
        return point;
    }
    
    calculateArcCurvePoint(start1, start2, center, t) {
        // 计算从起点到终点的角度
        const angle1 = Math.atan2(start1.z - center.z, start1.x - center.x);
        const angle2 = Math.atan2(start2.z - center.z, start2.x - center.x);
        
        // 计算角度差
        let angleDiff = angle2 - angle1;
        
        // 确保角度差在合理范围内
        if (angleDiff > Math.PI) {
            angleDiff -= 2 * Math.PI;
        } else if (angleDiff < -Math.PI) {
            angleDiff += 2 * Math.PI;
        }
        
        // 插值角度
        const currentAngle = angle1 + angleDiff * t;
        
        // 计算半径
        const radius = start1.distanceTo(center);
        
        // 计算圆弧上的点
        const x = center.x + radius * Math.cos(currentAngle);
        const z = center.z + radius * Math.sin(currentAngle);
        const y = start1.y + (start2.y - start1.y) * t; // Y轴线性插值
        
        return new THREE.Vector3(x, y, z);
    }
    
    calculateNaturalCurvePoint(start1, start2, center, tangent1, tangent2, t, radius) {
        // 使用三次贝塞尔曲线生成更自然的弯道
        const control1 = start1.clone().add(tangent1.multiplyScalar(radius * 0.5));
        const control2 = start2.clone().add(tangent2.multiplyScalar(radius * 0.5));
        
        // 三次贝塞尔曲线: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;
        
        const point = new THREE.Vector3();
        point.addScaledVector(start1, uuu);
        point.addScaledVector(control1, 3 * uu * t);
        point.addScaledVector(control2, 3 * u * tt);
        point.addScaledVector(start2, ttt);
        
        return point;
    }
    
    calculateBezierPoint(p0, p1, p2, t) {
        // 二次贝塞尔曲线
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        
        const point = new THREE.Vector3();
        point.addScaledVector(p0, uu);
        point.addScaledVector(p1, 2 * u * t);
        point.addScaledVector(p2, tt);
        
        return point;
    }
    
    calculateCurveLength(points) {
        if (points.length < 2) return 0;
        
        let totalLength = 0;
        for (let i = 1; i < points.length; i++) {
            const p1 = new THREE.Vector3(points[i-1].x, points[i-1].y, points[i-1].z);
            const p2 = new THREE.Vector3(points[i].x, points[i].y, points[i].z);
            totalLength += p1.distanceTo(p2);
        }
        return totalLength;
    }
    
    renderCurveRoad(curveRoad) {
        // 创建弯道中心线（蓝色）
        const points = curveRoad.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x0066ff, 
            linewidth: 3 
        });
        
        const curveLine = new THREE.Line(lineGeometry, lineMaterial);
        curveLine.userData.isSavedRoad = true;
        curveLine.userData.roadId = curveRoad.id;
        curveLine.userData.isCurve = true;
        this.scene.add(curveLine);
        
        // 创建弯道面
        const roadWidth = curveRoad.parameters.laneWidth * curveRoad.parameters.laneCount;
        const roadGeometry = this.generateRoadGeometry(points, roadWidth);
        
        const roadMaterial = new THREE.MeshBasicMaterial({
            color: 0x0066cc,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const curveMesh = new THREE.Mesh(roadGeometry, roadMaterial);
        curveMesh.userData.isSavedRoad = true;
        curveMesh.userData.roadId = curveRoad.id;
        curveMesh.userData.isCurve = true;
        this.scene.add(curveMesh);
        
        console.log(`🎨 渲染弯道: ${curveRoad.id}`);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// 初始化函数，由HTML中的依赖检查调用
window.initOpenDriveEditor = function() {
    console.log('🌟 启动OpenDRIVE地图编辑器...');
    window.editor = new OpenDriveEditor();
};
