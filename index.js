var input = [];
function initBuffers(gl){
    var buffers = [];
    Object.values(geometry).forEach(function(data){

        //position buffer
        var positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.vertices), gl.STATIC_DRAW);
        
        //normal buffer
        var normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.normals), gl.STATIC_DRAW);

        //uv buffer
        var uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.uv), gl.STATIC_DRAW);

        //index buffer
        var indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.indices), gl.STATIC_DRAW);

        //add buffers
        buffers.push({
            position: positionBuffer,
            normal: normalBuffer,
            index: indexBuffer,
            uv: uvBuffer,
            vertexCount: data.indices.length
        })
    });

    //return buffers
    console.log("buffers initiated...")
    return buffers;
};

var PI = Math.PI;
var TAU = PI*2;
var rad = PI/180;
var cubeRotation = 0;
var xrot = 0;
var zrot = 0;
var mouseX;
var mouseY;
var pmouseX;
var pmouseY;

function scale(a, b){
    return [a[0]*b, a[1]*b, a[2]*b];
};
function dot (a, b){
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}
function subtract(a, b){
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
};
function add(a, b){
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function cross(a, b){
    return [
        a[1]*b[2] - a[2]*b[1],
        a[2]*b[0] - a[0]*b[2],
        a[0]*b[1] - a[1]*b[0]
    ];
};
function normalize(a){
    return scale(a, 1/Math.sqrt(dot(a,a)))
}

var Base = function(bufferIndex, x,y,z){
    this.bufferIndex = bufferIndex;
    this.position = [x, y, z];
    this.velocity = [0,0,0];
    this.acceloration = [0, 0, 0];
    this.orientation = quat.set(0,0,0,1);
};
Base.prototype.applyForce = function(force){
    this.acceloration = add(this.acceloration, force);
};
Base.prototype.updateVelocity = function(){
    this.velocity = add(this.velocity, this.acceloration);
    this.acceloration = [0,0,0];
};
Base.prototype.updatePosition = function(){
    this.position = add(this.position, this.velocity);
};
Base.prototype.display = function(gl, programInfo, buffers, texture, cameraMatrix, projectionMatrix){
    var buffer = buffers[this.bufferIndex];
    var p = this.position;
    var o = mat4.quat(this.orientation);

    var modelViewMatrix = mat4.multiply(cameraMatrix, mat4.translate(p[0],p[1],p[2]));
    modelViewMatrix = mat4.multiply(modelViewMatrix, o);

    var normalMatrix = mat4.identity();
    normalMatrix = mat4.multiply(/*mat4.transpose(*/o/*)*/, normalMatrix);
    //normalMatrix = mat4.transpose(normalMatrix);

    //position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    //normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.normal);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

    //uv buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.uv);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

    //index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.index);

    //rotations
    gl.useProgram(programInfo.program);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix
    );
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix
    );
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.normalMatrix,
        false,
        normalMatrix
    );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

    {
        var type = gl.UNSIGNED_SHORT;
        var offset = 0;
        gl.drawElements(gl.TRIANGLES, buffer.vertexCount, type, offset);
    }
};

var Camera = function(x,y,z, target){
    Base.call(this, -1, x, y, z);
    this.target = target;
};
Camera.prototype.setPosition = function(objects){
    var target = objects[this.target];
    var tp = target.position;
    var to = target.yaw;

    var f = 1/Math.sqrt(2);
    var q0 = quat.inverse(to);          //opposite orientation
    q0 = quat.multiply(q0, quat.set(0,0,f,f));              //rotate pitch 90 degrees
    this.orientation = quat.multiply(q0,quat.set(f,0,0,f)); //rotate yaw 90 degrees

    var m = mat4.quat(quat.multiply(to, quat.set(0,0,1,0)));                                  //original orientation matrix form
    this.position = add(tp, scale([m[0],m[1],m[2]-0.1], -3));    //away from target orientation
};

var sortD = function(a, b){
    return b.distance - a.distance;
};

var Rider = function(x, y, z){
    Base.call(this, 1, x, y, z);
    this.forward = 0;
    this.yaw = quat.set(0,0,0,1);
    this.q0 = quat.set(0,0,1,0);
    this.q1 = quat.set(0,0,1,0)
}
Rider.prototype = Object.create(Base.prototype);
Rider.prototype.collide = function(){
    
    //load geometry (doesn't include quadtree yet)
    var level = geometry[0];

    //list of contacts {distance, normal}
    var contacts = [];

    //rider's coordinates
    var C = this.position;
    var x = C[0], y = C[1], z = C[2];

    //rider's radius (atm)
    var radius = 0.3;

    //check 27 cubes for collisions (3x3x3) with the rider in the center
    for(var l = 0; l < 27; l ++){
        //cube x y and z separate from rider
        var lx = ((l%3)-1);
        var ly = ((((l/3)|0)%3)-1);
        var lz = (((l/9)|0)-1);

        //cube x y and z with rider
        var px = x + lx|0;
        var py = y + ly|0;
        var pz = z + lz|0;

        //clone quadtree for loop
        var fp = quadTree.slice();

        //triangles in cube
        var data = [];

        //size of quadtree
        var w = 5;
        while(w > -1){
            //rider's position in quadtree at some subdivision
            var ix = px>>w;
            var iy = py>>w;
            var iz = pz>>w;

            //further subdivide quatree
            fp = fp[iz<<2|iy<<1|ix];

            //can not subdivide further, and there are no triangles
            if(fp===null){break;}

            //can not subdivide further, but there are triangles
            if(fp.data){
                //capture data (triangles)
                data = fp.data;
                break;
            }

            //can subdivide further, move position for next subdivision
            px-=ix<<w;
            py-=iy<<w;
            pz-=iz<<w;
            w--;
        }
        
        for(var i = 0; i < data.length; i ++){
            var j = data[i]*3;

            //points on triangle
            var nodes = [
                [
                    level.vertices[level.indices[j    ]*3    ],
                    level.vertices[level.indices[j    ]*3 + 1],
                    level.vertices[level.indices[j    ]*3 + 2]
                ],
                [
                    level.vertices[level.indices[j + 1]*3    ],
                    level.vertices[level.indices[j + 1]*3 + 1],
                    level.vertices[level.indices[j + 1]*3 + 2]
                ],
                [
                    level.vertices[level.indices[j + 2]*3    ],
                    level.vertices[level.indices[j + 2]*3 + 1],
                    level.vertices[level.indices[j + 2]*3 + 2]
                ]
            ];

            //normal of triangle
            var normal = cross(subtract(nodes[1], nodes[0]), subtract(nodes[2],nodes[0]));
            normal = scale(normal, 1/Math.sqrt(dot(normal, normal)));//normalize

            //distance from sphere to triangle
            var distance = dot(subtract(C, nodes[0]), normal);

            //point on triangle closest to sphere
            var Q = subtract(C, scale(normal, distance));

            //test
            var inside = true;

            //var edges = distance>-radius;
            var test = [];
            for(var b = 2, a = 0; a < 3; b = a ++){
                var p0 = nodes[a];
                var p1 = nodes[b];
                //var p2 = nodes[(a+1)%3]
                //if(edges){
                //vertex

                //distance from point to sphere
                var delta = subtract(C, p0);
                var distance = Math.sqrt(dot(delta,delta));
                var beta = scale(delta, 1/distance);//normal

                contacts.push({
                    distance:distance-radius,
                    normal:beta
                });

                //edge
                
                //time travelled on edge
                var delta = subtract(p1, p0);
                //P + Dt - C dot N = 0
                //(C - P) dot N / (D dot N)
                var t = dot(subtract(C, p0), delta)/dot(delta, delta);
                //if it is unique to edge
                if(t>0&t<1){
                    //from point to sphere
                    var alpha = subtract(C, add(p0, scale(delta, t)));
                    var distance = Math.sqrt(dot(alpha, alpha));
                    var beta = scale(alpha, 1/distance);//normal
                    contacts.push({
                        distance: distance-radius,
                        normal: beta
                    });
                }
                
                //orthogonal to edge and normal
                var M = cross(delta, normal);

                //if point is inside edge
                inside &= dot(M, subtract(Q, p0))>0;
            }
            if(inside){
                var distance = Math.abs(dot(subtract(C, nodes[0]), normal));
                contacts.push({
                    distance:distance-radius,
                    normal:normal
                })
            }
        }
    }
    //contacts.sort(sortD);
    var hit = false;
    var CLOSEST = [0, 0, 0];
    for(var i = 0; i < contacts.length; i ++){
        var contact = contacts[i];
        var normal = contact.normal;
        var velAlongNormal = dot(normal, this.velocity);
        var remove = velAlongNormal + contact.distance;
        if(remove < 0){
            this.velocity = subtract(this.velocity, scale(normal, remove));
            if(-normal[2]<-0.8){
                CLOSEST = add(CLOSEST, normal);
                hit = 1;
            }
        }
    }
    this.updatePosition();
    if(hit>0){
        CLOSEST = normalize(CLOSEST);
        this.q1 = quat.set(CLOSEST[0], CLOSEST[1], CLOSEST[2], 0);
        var m = mat4.quat(this.yaw);
        this.velocity = scale(this.velocity, 0.8);
        this.velocity = add(this.velocity, scale(m, -(input[87]&1)*CLOSEST[2]/50));
    }
    this.q0 = quat.internormal(this.q0, this.q1, 0.07);
    this.orientation = quat.multiply(this.yaw, this.q0);
};

var camera = new Camera(16,16,16,1);
var player = new Rider(16,16,16);
var objects = [
    new Base(0,0,0,0),
    player
];


function loadTexture(gl) {

    // Because images have to be downloaded over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    var level = 0;
    var internalFormat = gl.RGBA;
    var width = 1;
    var height = 1;
    var border = 0;
    var srcFormat = gl.RGBA;
    var srcType = gl.UNSIGNED_BYTE;
    var pixel = new Uint8Array([0,0,255,255]);

    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture); 
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
    gl.generateMipmap(gl.TEXTURE_2D)
    return texture
}

function initShaderProgram(gl, vsSource, fsSource){
    var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)){
        /*alert("Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}");*/
        return null;
    }
    return shaderProgram;
};

function loadShader(gl, type, source){
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        /*alert("An error occurred compiling the shader: ${gl.getShaderInfoLog(shader)}");*/
        return null;
    }
    return shader;
};

function drawScene(gl, programInfo, buffers, texture){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    var fieldOfView = 45*rad;
    var aspect = gl.canvas.clientWidth/gl.canvas.clientHeight;
    var zNear = 0.1;
    var zFar = 400;
    var projectionMatrix = mat4.perspective(fieldOfView, aspect, zNear, zFar);

    camera.setPosition(objects);
    var v = camera.position;
    var o = mat4.quat(camera.orientation);

    var cameraMatrix = mat4.identity();
    cameraMatrix = mat4.multiply(cameraMatrix, o);
    cameraMatrix = mat4.multiply(cameraMatrix, mat4.translate(-v[0],-v[1],-v[2]));

    Object.values(objects).forEach(function(model){
        model.display(gl, programInfo, buffers, texture, cameraMatrix, projectionMatrix);
    })
};

function main () {
    var canvas = document.querySelector("#glCanvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var gl = canvas.getContext("webgl");
    if(!gl){
        /*alert("Unable to initialize WebGL.");*/
        return;
    }
    gl.clearColor(0.0,0.0,0.0,1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);

    var vsSource = document.getElementById("vert").text.trim();
    var fsSource = document.getElementById("frag").text.trim();
    
    var shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    var programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
            vertexNormal: gl.getAttribLocation(shaderProgram, "aVertexNormal"),
            textureCoord: gl.getAttribLocation(shaderProgram, "aTextureCoord")
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
            normalMatrix: gl.getUniformLocation(shaderProgram, "uNormalMatrix"),
            uSampler: gl.getUniformLocation(shaderProgram, 'uSampler')
        }
    };

    var buffers = initBuffers(gl);
    var texture = loadTexture(gl);

    var then = 0;
    function render(now){
        now*=0.001;
        var deltaTime = now-then;
        then = now;
        player.applyForce([0,0,-0.003]);
        player.updateVelocity();
        var s = rad*((input[65]<<1)-(input[68]|0))/2;
        var rot = quat.set(0,0,-Math.sin(s),Math.cos(s));
        player.yaw = quat.multiply(player.yaw, rot);
        player.collide();
        drawScene(gl, programInfo, buffers, texture);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}
window.onload = main;
//update mouse position
window.addEventListener("mousemove", e => {
    pmouseX = mouseX;
    pmouseY = mouseY;
	mouseY = e.clientY;
	mouseX = e.clientX;
});

document.addEventListener('keydown', e => {
    input[e.keyCode] = 1;
    console.log(e.keyCode)
  });
  
  document.addEventListener('keyup', e => {
    input[e.keyCode] = 0;
  });