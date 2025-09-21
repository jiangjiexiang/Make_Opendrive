/**
 * PCDLoader - Three.js PCD文件加载器
 * 用于加载点云数据文件
 */

THREE.PCDLoader = function ( manager ) {

	// 兼容不同版本的Three.js
	if (THREE.Loader) {
		try {
			THREE.Loader.call( this, manager );
		} catch (e) {
			// 如果调用失败，手动设置属性
			this.manager = manager !== undefined ? manager : (THREE.DefaultLoadingManager || THREE.LoadingManager);
		}
	} else {
		// 为没有Loader基类的版本提供基本属性
		this.manager = manager !== undefined ? manager : (THREE.DefaultLoadingManager || THREE.LoadingManager);
	}
	
	this.path = '';
	this.requestHeader = {};
	this.withCredentials = false;

};

THREE.PCDLoader.prototype = {

	constructor: THREE.PCDLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new THREE.FileLoader( scope.manager );
		loader.setPath( scope.path );
		loader.setResponseType( 'arraybuffer' );
		loader.setRequestHeader( scope.requestHeader );
		loader.setWithCredentials( scope.withCredentials );
		loader.load( url, function ( data ) {

			try {

				console.log('PCD文件大小:', (data.byteLength / 1024 / 1024).toFixed(2) + 'MB');
				
				// 对于大文件，使用异步解析避免阻塞UI
				if (data.byteLength > 50 * 1024 * 1024) { // 50MB以上
					console.log('检测到大文件，使用异步解析...');
					setTimeout(function() {
						try {
							onLoad( scope.parse( data, url ) );
						} catch ( e ) {
							if ( onError ) onError( e );
							else console.error( e );
							scope.manager.itemError( url );
						}
					}, 100);
				} else {
					onLoad( scope.parse( data, url ) );
				}

			} catch ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					console.error( e );

				}

				scope.manager.itemError( url );

			}

		}, onProgress, onError );

	},

	parse: function ( data, url ) {

		function parseHeader( data ) {

			var PCDheader = {};
			var result1 = data.search( /[\r\n]DATA\s(\S*)\s/i );
			var result2 = /[\r\n]DATA\s(\S*)\s/i.exec( data.substr( result1 - 1 ) );

			if (!result2) {
				// 尝试更简单的匹配方式
				result1 = data.search( /[\r\n]DATA\s(\S*)/i );
				result2 = /[\r\n]DATA\s(\S*)/i.exec( data.substr( result1 - 1 ) );
			}

			if (!result2) {
				throw new Error('无法找到DATA行');
			}

			PCDheader.data = result2[ 1 ];
			PCDheader.headerLen = result2.index + result2[ 0 ].length + result1;
			PCDheader.str = data.substr( 0, PCDheader.headerLen );

			// remove comments

			PCDheader.str = PCDheader.str.replace( /\#.*/gi, '' );

			// parse

			PCDheader.version = /VERSION (.*)/i.exec( PCDheader.str );
			PCDheader.fields = /FIELDS (.*)/i.exec( PCDheader.str );
			PCDheader.size = /SIZE (.*)/i.exec( PCDheader.str );
			PCDheader.type = /TYPE (.*)/i.exec( PCDheader.str );
			PCDheader.count = /COUNT (.*)/i.exec( PCDheader.str );
			PCDheader.width = /WIDTH (.*)/i.exec( PCDheader.str );
			PCDheader.height = /HEIGHT (.*)/i.exec( PCDheader.str );
			PCDheader.viewpoint = /VIEWPOINT (.*)/i.exec( PCDheader.str );
			PCDheader.points = /POINTS (.*)/i.exec( PCDheader.str );

			// evaluate

			if ( PCDheader.version !== null )
				PCDheader.version = parseFloat( PCDheader.version[ 1 ] );

			if ( PCDheader.fields !== null )
				PCDheader.fields = PCDheader.fields[ 1 ].split( ' ' );

			if ( PCDheader.type !== null )
				PCDheader.type = PCDheader.type[ 1 ].split( ' ' );

			if ( PCDheader.width !== null )
				PCDheader.width = parseInt( PCDheader.width[ 1 ] );

			if ( PCDheader.height !== null )
				PCDheader.height = parseInt( PCDheader.height[ 1 ] );

			if ( PCDheader.viewpoint !== null )
				PCDheader.viewpoint = PCDheader.viewpoint[ 1 ].split( ' ' ).map( function ( x ) { return parseFloat( x ); } );

			if ( PCDheader.points !== null )
				PCDheader.points = parseInt( PCDheader.points[ 1 ], 10 );

			if ( PCDheader.points === null )
				PCDheader.points = PCDheader.width * PCDheader.height;

			if ( PCDheader.size !== null ) {

				PCDheader.size = PCDheader.size[ 1 ].split( ' ' ).map( function ( x ) { return parseInt( x, 10 ); } );

			}

			if ( PCDheader.count !== null ) {

				PCDheader.count = PCDheader.count[ 1 ].split( ' ' ).map( function ( x ) { return parseInt( x, 10 ); } );

			} else {

				PCDheader.count = [];

				for ( var i = 0, l = PCDheader.fields.length; i < l; i ++ ) {

					PCDheader.count.push( 1 );

				}

			}

			PCDheader.offset = {};

			var sizeSum = 0;

			for ( var i = 0, l = PCDheader.fields.length; i < l; i ++ ) {

				if ( PCDheader.data === 'ascii' ) {

					PCDheader.offset[ PCDheader.fields[ i ] ] = i;

				} else {

					PCDheader.offset[ PCDheader.fields[ i ] ] = sizeSum;
					sizeSum += PCDheader.size[ i ] * PCDheader.count[ i ];

				}

			}

			// for binary only

			PCDheader.rowSize = sizeSum;

			return PCDheader;

		}

		console.log('PCD文件大小:', (data.byteLength / 1024 / 1024).toFixed(2) + 'MB');
		
		// 对于大文件，只解码前几KB来查找头部
		var headerData = data;
		if (data.byteLength > 100 * 1024 * 1024) { // 100MB以上
			console.log('大文件检测，只解码前8KB用于头部解析');
			headerData = data.slice(0, 8192); // 前8KB应该足够包含头部
		}
		
		// 兼容不同版本的Three.js
		var textData;
		if (THREE.LoaderUtils && THREE.LoaderUtils.decodeText) {
			textData = THREE.LoaderUtils.decodeText( headerData );
		} else {
			// 手动解码
			textData = new TextDecoder('utf-8').decode( headerData );
		}
		
		// 如果使用了部分数据，需要找到完整的头部
		if (headerData !== data) {
			var lines = textData.split('\n');
			var dataLineFound = false;
			for (var i = 0; i < lines.length; i++) {
				if (lines[i].trim().startsWith('DATA ')) {
					dataLineFound = true;
					break;
				}
			}
			
			if (!dataLineFound) {
				console.log('头部不完整，扩展到32KB');
				headerData = data.slice(0, 32768); // 扩展到32KB
				if (THREE.LoaderUtils && THREE.LoaderUtils.decodeText) {
					textData = THREE.LoaderUtils.decodeText( headerData );
				} else {
					textData = new TextDecoder('utf-8').decode( headerData );
				}
			}
		}

		// parse header (always ascii format)

		var PCDheader = parseHeader( textData );

		// parse data

		var position = [];
		var normal = [];
		var color = [];

		// ascii

		if ( PCDheader.data === 'ascii' ) {

			var offset = PCDheader.offset;
			var pcdData = textData.substr( PCDheader.headerLen );
			var lines = pcdData.split( '\n' );

			for ( var i = 0, l = lines.length; i < l; i ++ ) {

				if ( lines[ i ] === '' ) continue;

				var line = lines[ i ].split( ' ' );

				if ( offset.x !== undefined ) {

					position.push( parseFloat( line[ offset.x ] ) );
					position.push( parseFloat( line[ offset.y ] ) );
					position.push( parseFloat( line[ offset.z ] ) );

				}

				if ( offset.rgb !== undefined ) {

					var rgb = parseFloat( line[ offset.rgb ] );
					var r = ( rgb >> 16 ) & 0x0000ff;
					var g = ( rgb >> 8 ) & 0x0000ff;
					var b = ( rgb >> 0 ) & 0x0000ff;
					color.push( r / 255, g / 255, b / 255 );

				}

				if ( offset.normal_x !== undefined ) {

					normal.push( parseFloat( line[ offset.normal_x ] ) );
					normal.push( parseFloat( line[ offset.normal_y ] ) );
					normal.push( parseFloat( line[ offset.normal_z ] ) );

				}

			}

		}

		// binary-compressed

		// normally data in PCD files are organized as array of structures: XYZRGBXYZRGB
		// binary compressed PCD files organize their data as structure of arrays: XXXYYYZZZ
		// that requires a totally different parsing approach compared to binary format

		if ( PCDheader.data === 'binary_compressed' ) {

			console.warn( 'THREE.PCDLoader: binary_compressed detected, treating as binary' );
			PCDheader.data = 'binary';

		}

		// binary

		if ( PCDheader.data === 'binary' ) {

			// 确保使用完整的原始数据进行二进制解析
			var dataview = new DataView( data, PCDheader.headerLen );
			var offset = PCDheader.offset;

			// 对于大点云，进行采样以提高性能
			var maxPoints = 500000; // 最大显示50万个点
			var step = 1;
			var actualPoints = PCDheader.points;
			
			if (PCDheader.points > maxPoints) {
				step = Math.ceil(PCDheader.points / maxPoints);
				console.log('点云过大 (' + PCDheader.points.toLocaleString() + ' 点)，采样显示每' + step + '个点');
				actualPoints = Math.floor(PCDheader.points / step);
			}

			console.log('解析' + actualPoints.toLocaleString() + '个点...');

			// 计算可用的数据大小
			var availableDataSize = dataview.byteLength;
			var maxSafePoints = Math.floor(availableDataSize / PCDheader.rowSize);
			var pointsToProcess = Math.min(PCDheader.points, maxSafePoints);
			
			console.log('数据区大小:', (availableDataSize / 1024 / 1024).toFixed(1) + 'MB');
			console.log('最大安全点数:', maxSafePoints.toLocaleString());

			for ( var i = 0, row = 0; i < pointsToProcess; i += step, row += PCDheader.rowSize * step ) {
				
				// 检查是否越界
				if (row + PCDheader.rowSize > availableDataSize) {
					console.warn('达到数据边界，停止解析. 已解析:', position.length / 3, '个点');
					break;
				}

				if ( offset.x !== undefined ) {

					var x = dataview.getFloat32( row + offset.x, true );
					var y = dataview.getFloat32( row + offset.y, true );
					var z = dataview.getFloat32( row + offset.z, true );
					
					// 检查NaN值
					if (!isNaN(x) && !isNaN(y) && !isNaN(z) && 
						isFinite(x) && isFinite(y) && isFinite(z)) {
						position.push( x );
						position.push( y );
						position.push( z );
					} else {
						// 跳过无效点，用默认值代替
						position.push( 0 );
						position.push( 0 );
						position.push( 0 );
					}

				}

				if ( offset.rgb !== undefined ) {

					color.push( dataview.getUint8( row + offset.rgb + 2 ) / 255.0 );
					color.push( dataview.getUint8( row + offset.rgb + 1 ) / 255.0 );
					color.push( dataview.getUint8( row + offset.rgb + 0 ) / 255.0 );

				}

				if ( offset.normal_x !== undefined ) {

					normal.push( dataview.getFloat32( row + offset.normal_x, true ) );
					normal.push( dataview.getFloat32( row + offset.normal_y, true ) );
					normal.push( dataview.getFloat32( row + offset.normal_z, true ) );

				}

				// 如果有intensity字段且没有RGB，用它来着色
				if ( offset.intensity !== undefined && offset.rgb === undefined ) {
					var intensity = dataview.getFloat32( row + offset.intensity, true );
					// 将intensity值映射到颜色 (假设intensity范围0-255)
					var normalizedIntensity = Math.max(0, Math.min(1, intensity / 255.0));
					color.push( normalizedIntensity );
					color.push( normalizedIntensity );
					color.push( normalizedIntensity );
				}

			}

		}

		// build geometry

		var geometry = new THREE.BufferGeometry();

		// 确保至少有位置数据
		if ( position.length === 0 ) {
			console.warn('PCD文件中没有找到有效的位置数据');
			// 创建一个默认点
			position = [0, 0, 0];
		}

		// 兼容不同版本的BufferAttribute
		if ( position.length > 0 ) {
			if (THREE.Float32BufferAttribute) {
				geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( position, 3 ) );
			} else {
				geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( position ), 3 ) );
			}
		}
		if ( normal.length > 0 ) {
			if (THREE.Float32BufferAttribute) {
				geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normal, 3 ) );
			} else {
				geometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( normal ), 3 ) );
			}
		}
		if ( color.length > 0 ) {
			if (THREE.Float32BufferAttribute) {
				geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( color, 3 ) );
			} else {
				geometry.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array( color ), 3 ) );
			}
		}

		geometry.computeBoundingSphere();

		// build material
		var material = new THREE.PointsMaterial( { 
			size: 1.0,  // 增大点的大小
			sizeAttenuation: false  // 不随距离衰减
		} );

		if ( color.length > 0 ) {

			// 兼容不同版本的vertexColors
			if (THREE.VertexColors !== undefined) {
				material.vertexColors = THREE.VertexColors;
			} else {
				material.vertexColors = true;
			}

		} else {

			material.color.setHex( 0x00ff88 );

		}
		
		console.log('材质设置完成，点大小:', material.size);
		
		// 检查几何体信息
		console.log('几何体信息:', {
			positionCount: geometry.attributes.position ? geometry.attributes.position.count : 0,
			hasColors: !!geometry.attributes.color,
			boundingSphere: geometry.boundingSphere
		});

		// build mesh

		var mesh = new THREE.Points( geometry, material );
		
		// 确保几何体和材质正确设置
		console.log('Points对象创建完成:', {
			type: mesh.type,
			visible: mesh.visible,
			geometryPositions: mesh.geometry.attributes.position ? mesh.geometry.attributes.position.count : 0
		});
		var name = url.split( '' ).reverse().join( '' );
		name = /([^\/]*)/.exec( name );
		name = name[ 1 ].split( '' ).reverse().join( '' );
		mesh.name = name;

		return mesh;

	},

	// 添加Loader基类的方法
	setPath: function ( path ) {
		this.path = path;
		return this;
	},

	setRequestHeader: function ( requestHeader ) {
		this.requestHeader = requestHeader;
		return this;
	},

	setWithCredentials: function ( value ) {
		this.withCredentials = value;
		return this;
	}

};
