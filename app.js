var System = (function(win,doc,undefined){
    var pi = Math.PI,
        width = 0,
        height = 0,
        planetLock = 1,
        pixelRatio = 0,
        canvas = $('<canvas#main-canvas>'),
        results = $('.transfer-info')[0],
        transferPanels = $('.transfer-option'),
        redraw = true,
        ctx = canvas.getContext('2d'),
        parameters = {
            starMass: 1,
            AMass: 1,
            AAxis: 1,
            //AEccentricity: 0.017,
            AEccentricity: 0,
            AInclination: 0,
            AYaw: -0.2,
            AAnomaly: 6.26,
            BMass: 0.107,
            BAxis: 1.523679,
            //BEccentricity: 0.09,
            BEccentricity: 0,
            BInclination: 0,
            BYaw: 0.86,
            BAnomaly: 0.34,
            transferType: 'hohmann',
            hohmannApo: 1
        };

    var tester = $('<p#test>');
    doc.body.appendChild(tester);
    tester.textContent = "test";

    //basic loop stuff, don't plan on getting too fancy with frameskipping or anything
    var dt = 0,
        oldTime = 0;
    function loop(time){
        requestAnimationFrame(loop);
        dt = (oldTime-time)/1000;
        oldTime = time;

        if(redraw){
            bodies.forEach(function(i){ i.update(dt); });
            draw(ctx);
            redraw = false;
        }
    }

    //keep the reference frame coherent
    function draw(c){
        c.clearRect(0,0,width,height);
        c.save();
        c.translate(width/2,height/2);
        var scale = 1;
        //if(planetLock){ c.rotate(-bodies[planetLock].yaw - bodies[planetLock].trueAnomaly) };
        bodies.forEach(function(i){ i.draw(c,scale); });
        var p1 = [ bodies[planetLock].ax, bodies[planetLock].ay];
        var t = bodies[planetLock%2+1].drawLatus / (1 + (bodies[planetLock%2+1].eccentricity*Math.cos(bodies[planetLock].trueAnomaly-bodies[planetLock%2+1].yaw+bodies[planetLock].yaw+pi)));
        var p2 = [ t * Math.cos(bodies[planetLock].trueAnomaly+bodies[planetLock].yaw+pi), t * Math.sin(bodies[planetLock].trueAnomaly+bodies[planetLock].yaw+pi)];
        var v = [p2[0]-p1[0],p2[1]-p1[1]];
        var angle = Math.atan(v[1]/v[0])+pi;
        var d = Math.sqrt((v[0]*v[0])+(v[1]*v[1]));
        v[0] /= d;
        v[1] /= d;
        c.translate(bodies[planetLock].ax,bodies[planetLock].ay);
        c.beginPath();
        if(parameters.transferType == 'hohmann'){
            d *= parameters.hohmannApo;
            var m = Math.sqrt((d/2*d/2)-((d/2-bodies[planetLock].r)*(d/2-bodies[planetLock].r)));
            c.ellipse(v[0]*d/2,v[1]*d/2,d/2,m,angle,0,pi,false);
            if(parameters.hohmannApo != 1){

            }
        }
        // if(p2[0]>p1[0]){
        //     c.ellipse(v[0]/2,v[1]/2,d,m,angle,pi,2*pi,false);
        // }else{
        //     c.ellipse(v[0]/2,v[1]/2,d,m,angle,0,pi,false);
        // }
        c.strokeStyle = '#fff';
        c.strokeWidth = 5;
        c.stroke();
        c.restore();

        var r = new Orbit({center:bodies[0],majorAxis:bodies[planetLock].majorAxis,eccentricity:bodies[planetLock].eccentricity}).transfer(
            new Orbit({center:bodies[0],majorAxis:bodies[planetLock%2+1].majorAxis,eccentricity:bodies[planetLock%2+1].eccentricity})
        );
        results.innerHTML = 'dv: '+r.dv.toFixed(2) + '\ndt: ' + r.dt.toFixed(0);
        
        tester.textContent = 'min:' + testMin.toFixed(2) +'m/s';
    }
    var testMin = 0;

    var bodies = [];
    function Body(obj){
        if(bodies.length == 3){
            console.error('Only 2 planets allowed');
            return;
        }
        this.x = 0;                         //where now?
        this.y = 0;                         //in the y direction!
        this.r = 0;                         //polar coord
        this.trueR = 0;                     //polar coord, but in meters
        this.size = 0;                      //how big to draw
        this.color = '#4d8';                //what color to draw
        this.mass = 0;                      //for period stuff
        this.majorAxis = 0;                 //how far it actually orbits in meters
        this.period = 0;                    //how long it takes to draw it going around, gets normalized
        this.truePeriod = 0;                //how long in seconds it actually orbits, calculated
        this.eccentricity = 0;              //how wonky the orbit?
        this.inclination = 0;               //inclination is saved for the future, but unused
        this.yaw = 0;                       //rotating the ellipse
        this.anomaly = 0;                   //where is it in radians along the ellipse? will update
        this.minorAxis = 0;                 //calculated
        this.pixelRatio = 0;                //calculated, majorAxis/drawMajor
        this.drawLatus = 0;                 //calculated
        this.linearEccentricity = 0;        //calculated
        this.drawArc = true;                //should it show an orbit arc?
        this.drawMajor = 0;                 //the displayed ellipse parameter, normalized
        this.drawMinor = 0;                 //the other one, also normalized
        this.trueAnomaly = 0;               //for drawing
        this.grav = 0;                      //standard gravitational parameter = grav constant * mass
        this.id = bodies.length;

        for(var i in obj) this[i] = obj[i];

        bodies.push(this);
    }
    function updateBody(dt){
        //this.anomaly += this.period * dt;
        this.anomaly = this.anomaly%(2*pi);
        this.trueAnomaly = meanToTrue(this.eccentricity,this.anomaly);
        this.r = this.getR(this.trueAnomaly);
        this.x = this.r * Math.cos(this.trueAnomaly);
        this.y = this.r * Math.sin(this.trueAnomaly);
        var s = Math.sin(this.yaw),
            c = Math.cos(this.yaw);
        this.ax = this.x * this.yawC - this.y * this.yawS;
        this.ay = this.x * this.yawS + this.y * this.yawC;
    }
    Body.prototype.update = updateBody;
    //playing with reference frame to make math easier
    function drawBody(c){
        c.save();
        c.rotate(this.yaw);
        if(this.drawArc){
            c.save();
            c.translate(this.linearEccentricity,0)
            c.strokeStyle = '#fff';
            c.strokeWidth = 2;
            c.beginPath();
            c.ellipse(0,0,this.drawMajor,this.drawMinor,0,0,2*pi,false);
            c.stroke();
            c.restore();
        }
        c.translate(this.x,this.y);
        c.fillStyle = this.color;
        c.beginPath();
        c.arc(0,0,this.size,0,2*pi,false);
        c.fill();
        c.restore();
    }
    Body.prototype.draw = drawBody;
    function bodyGetR(angle, real){
        var o = this.drawLatus / (1 + (this.eccentricity*Math.cos(angle)));
        if(real) o *= pixelRatio;
        return o;
    }
    Body.prototype.getR = bodyGetR;
    function bodyChange(){
        this.grav = 6.67408e-11 * this.mass;
        if(this.id == 0) return;
        this.yawS = Math.sin(this.yaw);
        this.yawC = Math.cos(this.yaw);
        this.minorAxis = Math.sqrt(1-(this.eccentricity*this.eccentricity))*this.majorAxis;
        this.truePeriod = Math.sqrt((4*pi*pi*this.majorAxis*this.majorAxis*this.majorAxis)/(6.67e-11*(bodies[0].mass+this.mass)));
        if(this.id == 1){ 
            this.period = (2*pi)/10; 
        }else{
            this.period = bodies[1].period*(bodies[1].truePeriod/this.truePeriod);
            this.drawMajor = (height/2) - 40;
            this.drawMinor = Math.sqrt(1-(this.eccentricity*this.eccentricity))*this.drawMajor;
            this.anomaly -= bodies[1].anomaly;
            this.drawLatus = (this.drawMinor*this.drawMinor)/this.drawMajor
            this.linearEccentricity = -1* Math.sqrt((this.drawMajor*this.drawMajor)-(this.drawMinor*this.drawMinor));
            bodies[1].anomaly = 0;
            bodies[1].drawMajor = this.drawMajor * (bodies[1].majorAxis/this.majorAxis);
            bodies[1].drawMinor = Math.sqrt(1-(bodies[1].eccentricity*bodies[1].eccentricity))*bodies[1].drawMajor;
            bodies[1].linearEccentricity = -1* Math.sqrt((bodies[1].drawMajor*bodies[1].drawMajor)-(bodies[1].drawMinor*bodies[1].drawMinor));
            bodies[1].drawLatus = (bodies[1].drawMinor*bodies[1].drawMinor)/bodies[1].drawMajor;
            pixelRatio = this.majorAxis/this.drawMajor;
        }
    }
    Body.prototype.change = bodyChange;

    function Orbit(obj){
        this.majorAxis = 0;
        this.minorAxis = 0;
        this.latus = 0;
        this.eccentricity = 0;
        this.linearEccentricity = 0;
        this.anomaly = 0;
        this.center = 0;

        for(var i in obj) this[i] = obj[i];

        this.minorAxis = Math.sqrt(1-(this.eccentricity*this.eccentricity))*this.majorAxis;
        this.latus = (this.minorAxis*this.minorAxis)/this.majorAxis;
        this.linearEccentricity = Math.sqrt((this.majorAxis*this.majorAxis)-(this.minorAxis*this.minorAxis));
    }
    function orbitGetR(angle){
        if(!angle) var angle = this.anomaly;
        return this.latus / (1 + (this.eccentricity*Math.cos(angle)));
    }
    Orbit.prototype.getR = orbitGetR;
    function orbitTransfer(orbit){
        if(this.center != orbit.center) return NaN;
        var angle = pi;
        //angle is specified, change it but defaulting to Hohmann for now
        var r2 = orbit.getR(this.anomaly+angle);
        //if one tangent or bielliptic
        var tA = (this.getR()+r2)/2;
        var tEcc = 1 - (this.majorAxis/tA);
        var tOrbit = new Orbit({majorAxis:tA,eccentricity:tEcc,center:this.center});
        if(parameters.transferType == 'hohmann'){
            var apoapsis = orbit.majorAxis * parameters.hohmannApo;
            var tA1 = (this.majorAxis + apoapsis)/2;
            var tA2 = (orbit.majorAxis + apoapsis)/2;
            var v1 = visViva(this.center,this.getR(),tA1) - visViva(this.center,this.getR(),this.majorAxis);
            var v2 = visViva(this.center,apoapsis,tA2) - visViva(this.center,apoapsis,tA1);
            var v3 = visViva(this.center,orbit.getR(this.anomaly+pi),tA2) - visViva(this.center,orbit.getR(this.anomaly+pi),orbit.majorAxis);
            var dv = Math.abs(v1)+Math.abs(v2)+Math.abs(v3);
            var dt = (pi * Math.sqrt(((tA1*tA1*tA1)/this.center.grav))) + ((parameters.hohmannApo==1)?0:(pi * Math.sqrt(((tA2*tA2*tA2)/this.center.grav))));
            return {dv:dv,dt:dt};
        }else if(parameters.transferType == 'tangent'){
            var anom2 = Math.acos((((tA*(1-(tEcc*tEcc)))/r2)-1)/tEcc);
            var flightAngle = Math.atan((tEcc*Math.sin(anom2))/(1+(tEcc*Math.cos(anom2))));
            var va = visViva(this.center,this.getR(),this.majorAxis);
            var vt1 = visViva(tOrbit.center,tOrbit.getR(this.anomaly),tOrbit.majorAxis)
            var v1 = Math.abs(vt1 - va);
            var vt2 = visViva(tOrbit.center,tOrbit.getR(anom2),tOrbit.majorAxis);
            var vb = visViva(orbit.center,orbit.getR(anom2),orbit.majorAxis);
            var v2 = Math.abs(Math.sqrt((vt2*vt2)+(vb*vb)-(2*vt2*vb*Math.cos(flightAngle))));
            var eAnom = Math.acos((tEcc+Math.cos(anom2))/(1 + (tEcc * Math.cos(anom2))));
            var time = (eAnom-(tEcc*Math.sin(eAnom)))*Math.sqrt((tA*tA*tA)/this.center.grav);
            return {dv:v1+v2,dt:time};
        }
    }
    Orbit.prototype.transfer = orbitTransfer;

    function init(){
        width = win.innerHeight*1.5;
        height = win.innerHeight;
        canvas.width = width;
        canvas.height = height;
        $('.main-container')[0].appendChild(canvas);

        new Body({size:50, color:'#db4', drawArc:false, mass:1.99e30});//sun
        new Body({size:10, majorAxis:1, anomaly:6.26, eccentricity: 0.017, yaw:-0.2, mass:5.97e24});//earth
        new Body({size:10, color:'#d64', majorAxis:1.524, anomaly:0.34, eccentricity: 0.09, yaw:0.86, mass:6.39e23});//mars
        //new Body({size:30, color:'#d86', majorAxis:5.2, anomaly:0.35, eccentricity: 0.05, yaw:1.75, mass:1.9e27});//jupiter

        updateParams();

        requestAnimationFrame(loop);
    }
    win.addEventListener('load',init);

    function handleTransferChange(e){
        transferPanels.forEach(function(d){
            d.style.display = 'none';
        });
        parameters.transferType = e.target.value;
        $('#transfer-'+e.target.value)[0].style.display = 'block';
        redraw = true;
    }
    $('select')[0].addEventListener('change',handleTransferChange);

    function handleInput(e){
        var id = e.target.id,
            ex = id;
        if(id.endsWith('Val')){
            id = id.substring(0,id.length-3);
            ex = id;
            $('#'+id)[0].value = e.target.value;
        }
        else if(e.target.type == 'range'){
            id += 'Val';
            $('#'+id)[0].value = e.target.value;
        }
        parameters[ex] = e.target.value;
        updateParams();
        redraw = true;
    }
    $('input').forEach(function(d){
        d.addEventListener('input',handleInput);
    });
    function updateParams(){
        bodies[0].mass = parameters.starMass*1.98855e30;                      //in kg
        var which = (parameters.AAxis > parameters.BAxis)?2:1;
        planetLock = which;
        bodies[which].color = '#4d8';
        bodies[which%2+1].color = '#d64';
        bodies[which].mass = parameters.AMass*5.97237e24;                     //in kg
        bodies[which].majorAxis = parameters.AAxis*149598023000;               //in meters
        bodies[which].eccentricity = parameters.AEccentricity;
        bodies[which].inclination = parameters.AInclination*(pi/180);       //in radians
        bodies[which].yaw = parameters.AYaw*(pi/180);
        bodies[which].anomaly = parameters.AAnomaly*(pi/180);
        bodies[which%2+1].mass = parameters.BMass*5.97237e24;
        bodies[which%2+1].majorAxis = parameters.BAxis*149598023000;
        bodies[which%2+1].eccentricity = parameters.BEccentricity;
        bodies[which%2+1].inclination = parameters.BInclination*(pi/180);
        bodies[which%2+1].yaw = parameters.BYaw*(pi/180);
        bodies[which%2+1].anomaly = parameters.BAnomaly*(pi/180);

        bodies[0].change();
        bodies[1].change();
        bodies[2].change();
    }

    function visViva(center,distance,orbit){
        var o = Math.sqrt(center.grav * ((2/distance)-(1/orbit)));
        return o;
    }

    function meanToTrue(ecc, anom){
        var a = anom%(2*pi);
        if(a < pi){
            a += 2*pi;
        }else if(a > pi){
            a -= 2*pi
        }
        var t = 0;
        if((a > -pi && a < 0) || a > pi){
            t = a - ecc;
        }else{
            t = a + ecc;
        }

        var t1 = a;
        var first = true;
        while (first || Math.abs(t1 - t) > 1e-6){
            first = 0;
            t = t1;
            t1 = t + (a - t + (ecc*Math.sin(t)))/(1 - (ecc*Math.cos(t)));
        }   
        t = t1;

        var sinf = Math.sin(t)*Math.sqrt(1 - (ecc*ecc))/(1 - (ecc * Math.cos(t)));
        var cosf = (Math.cos(t) - ecc)/(1 - (ecc * Math.cos(t)));
        return Math.atan2(sinf,cosf);
    }

    return {b:bodies,o:Orbit};
})(window,document);

function $(what){
    if(what.startsWith('<') && what.endsWith('>')){
        what = what.substring(1,what.length-1);
        what = what.split('#');
        var id = '';
        if(what.length == 2) var id = what.pop();
        what = what[0].split('.');
        var el = document.createElement(what.shift());
        if(id) el.id = id;
        what.forEach(function(e){
            el.className += ' ' + e;
        });
        return el;
    }else{
        return document.querySelectorAll(what);
    }
}