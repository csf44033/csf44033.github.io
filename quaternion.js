var quat = {
    create: function() {
        return new Float32Array(4);
    },
    set: function(x,y,z,w){
        return new Float32Array([x,y,z,w]);
    },
    multiply: function(q0, q1){
        var q = this.create();
        q[0] =  q0[0]*q1[3] + q0[1]*q1[2] - q0[2]*q1[1] + q0[3]*q1[0];
        q[1] = -q0[0]*q1[2] + q0[1]*q1[3] + q0[2]*q1[0] + q0[3]*q1[1];
        q[2] =  q0[0]*q1[1] - q0[1]*q1[0] + q0[2]*q1[3] + q0[3]*q1[2];
        q[3] = -q0[0]*q1[0] - q0[1]*q1[1] - q0[2]*q1[2] + q0[3]*q1[3];
        return q;
    },
    inverse: function(q){
        var m = 1/(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
        return this.set(-q[0]*m, -q[1]*m, -q[2]*m, q[3]*m);
    },
    interpolate: function(q0,q1,t){
        var q2 = this.create();
        for(var i = 0; i < 4; i ++){
            q2[i] = q0[i] + (q1[i]-q0[i])*t;
        }
        //sin(t)nxi + sin(t)nyj + sin(t)nzk + cos(t)nw = q2
        //nx ny nz

        return q2
    },
    internormal: function(q0, q1, t){
        var q2 = this.create();
        q2[3] = 0;
        var m = 0;
        for(var i = 0; i < 3; i ++){
            var v = q0[i] + (q1[i]-q0[i])*t
            q2[i] = v;
            m += v*v;
        }
        if(m){
            m = 1/Math.sqrt(m);
            for(var i = 0; i < 3; i ++){
                q2[i]*=m;
            }
        }
        return q2;
    }
}