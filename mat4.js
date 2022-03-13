var mat4 = {
    create: function() {
        return new Float32Array(16);
    },
    identity: function(){
        var M = this.create();
        M[0] = M[5] = M[10] = M[15] = 1;
        return M;
    },
    rotateX: function(theta){
        var res = this.identity();
        var cos = Math.cos(theta),
            sin = Math.sin(theta);
        res[5] = cos;
        res[6] = sin;
        res[9] = -sin;
        res[10] = cos;
        return res;
    },
    rotateY: function(theta){
        var res = this.identity();
        var cos = Math.cos(theta),
            sin = Math.sin(theta);
        res[0] = cos;
        res[2] = -sin;
        res[8] = sin;
        res[10] = cos;
        return res;
    },
    rotateZ: function(theta){
        var res = this.identity();
        var cos = Math.cos(theta),
            sin = Math.sin(theta);
        res[0] = cos;
        res[1] = sin;
        res[4] = -sin;
        res[5] = cos;
        return res;
    },
    frustum: function(l, r, b, t, n, f){
        var res = this.create();
        res[0] = 2*n/(r - l);
        res[5] = 2*n/(t - b);
        res[8] = (r + l)/(r - l);
        res[9] = (t + b)/(t - b);
        res[10] = (f + n)/(n - f);
        res[11] = -1;
        res[14] = 2*f*n/(n - f);
        return res;
    },
    perspective: function(fov, aspect, near, far){
        var f = near*Math.tan(fov/2);
        return this.frustum(-f*aspect, f*aspect, -f, f, near, far);
    },
    translate: function(x, y, z){
        var res = this.identity();
        res[12] = x;
        res[13] = y;
        res[14] = z;
        return res;
    },
    multiply: function(a, b){
        var res = this.identity();
        for(var row = 0; row < 4; row ++){
            for(var col = 0; col < 4; col ++){
                res[row + col*4] = a[row]*b[col*4] + a[row+4]*b[1 + col*4] + a[row+8]*b[2 + col*4] + a[row+12]*b[3 + col*4];
            }
        }
        return res;
    },
    transpose: function(a){
        var M = this.create();
        for(var i = 0; i < 4; i ++){
            for(var j = 0; j < 4; j ++){
                M[i + j*4] = a[j + i*4];
            }
        }
        return M;
    },
    quat: function(q){
        var x = q[0];
        var y = q[1];
        var z = q[2];
        var w = q[3];
        return new Float32Array([
            1 - 2*y*y - 2*z*z, 2*x*y - 2*w*z, 2*x*z + 2*w*y, 0,
            2*x*y + 2*w*z, 1-2*x*x - 2*z*z, 2*z*y-2*w*x, 0,
            2*x*z - 2*w*y, 2*y*z + 2*w*x, 1-2*x*x - 2*y*y, 0,
            0,0,0,1
        ]);
    }
}