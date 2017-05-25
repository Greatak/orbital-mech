var System = (function(win,doc,undefined){
    var pi = Math.PI,
        width = 0,
        height = 0,
        planetLock = 1,
        pixelRatio = 0,
        canvas = $('<canvas#main-canvas>'),
        results = $('.transfer-info')[0],
        transferPanels = $('.transfer-option'),
        transferDV = $('#transfer-dv')[0],
        transferDT = $('#transfer-dt')[0],
        transferSynodic = $('#transfer-synodic')[0],
        redraw = true,
        ctx = canvas.getContext('2d'),
        parameters = {
            starMass: 1,
            AMass: 1,
            AAxis: 1,
            AEccentricity: 0.017,
            AInclination: 0,
            AYaw: -11.2,
            //AYaw: 0,
            AAnomaly: 358.6,
            //AAnomaly: 0,
            BMass: 0.107,
            BAxis: 1.523679,
            BEccentricity: 0.09,
            BInclination: 0,
            BYaw: 49.55,
            //BYaw: 0,
            BAnomaly: 19.37,
            //BAnomaly: 180,
            transferType: 'hohmann',
            hohmannApo: 2,
            tangentAngle: 0,
            tangentApo: 2
        };

    var tester = $('<p#test>');
    doc.body.appendChild(tester);
    tester.textContent = "test";

    //basic loop stuff, don't plan on getting too fancy with frameskipping or anything
    var dt = 0,
        oldTime = 0,
        scale = 0;
    function loop(time){
        requestAnimationFrame(loop);
        dt = (time-oldTime)/1000;
        oldTime = time;

        
        orbits[1].transferTo(orbits[3], orbits[2]);
        scale = 0;
        orbits.forEach(function(d){
            d.update(dt); 
            if(scale < d.majorAxis+d.linearEccentricity) scale = d.majorAxis+d.linearEccentricity; 
        });
        scale = (height/2-40)/scale;

        if(redraw){
            ctx.save();
            draw(ctx);
            orbits.forEach(function(d){ d.draw(ctx,scale); });
            ctx.restore();
            redraw = false;
        }
    }

    //keep the reference frame coherent
    function draw(c){
        c.clearRect(0,0,width,height);
        c.translate(width/2,height/2);
        //c.scale(orbits[3].minorAxis/orbits[3].majorAxis,1);
        transferDV.textContent = orbits[3].dv.toFixed(2);
        var t = orbits[3].dt;
        transferDT.textContent = Math.floor(t/3.154e+7) + 'y ';
        t %= 3.154e+7;
        transferDT.textContent += Math.floor(t/2.628e+6) + 'm ';
        t %= 2.628e+6;
        transferDT.textContent += Math.floor(t/86400) + 'd ';
        t %= 86400;
        transferDT.textContent += (t/3600).toFixed(1) +  'h';
        //if(planetLock){ c.rotate(-bodies[planetLock].yaw - bodies[planetLock].trueAnomaly) };
        //bodies.forEach(function(i){ i.draw(c,scale); });
        // var p1 = [ bodies[planetLock].ax, bodies[planetLock].ay];
        // var t = bodies[planetLock%2+1].drawLatus / (1 + (bodies[planetLock%2+1].eccentricity*Math.cos(bodies[planetLock].trueAnomaly-bodies[planetLock%2+1].yaw+bodies[planetLock].yaw+pi)));
        // var p2 = [ t * Math.cos(bodies[planetLock].trueAnomaly+bodies[planetLock].yaw+pi), t * Math.sin(bodies[planetLock].trueAnomaly+bodies[planetLock].yaw+pi)];
        // var v = [p2[0]-p1[0],p2[1]-p1[1]];
        // var angle = Math.atan(v[1]/v[0])+pi;
        // var d = Math.sqrt((v[0]*v[0])+(v[1]*v[1]));
        // v[0] /= d;
        // v[1] /= d;
        // c.translate(bodies[planetLock].ax,bodies[planetLock].ay);
        // c.beginPath();
        // if(parameters.transferType == 'hohmann'){
        //     d *= parameters.hohmannApo;
        //     var m = Math.sqrt((d/2*d/2)-((d/2-bodies[planetLock].r)*(d/2-bodies[planetLock].r)));
        //     c.ellipse(v[0]*d/2,v[1]*d/2,d/2,m,angle,0,pi,false);
        //     if(parameters.hohmannApo != 1){
        //         //draw the second half
        //     }
        // }
        // if(parameters.transferType == 'tangent'){
        //     //draw part of the hohmann one
        // }
        // // if(p2[0]>p1[0]){
        // //     c.ellipse(v[0]/2,v[1]/2,d,m,angle,pi,2*pi,false);
        // // }else{
        // //     c.ellipse(v[0]/2,v[1]/2,d,m,angle,0,pi,false);
        // // }
        // c.strokeStyle = '#fff';
        // c.strokeWidth = 5;
        // c.stroke();
        // c.restore();

        // // var r = new Orbit({center:bodies[0],majorAxis:bodies[planetLock].majorAxis,eccentricity:bodies[planetLock].eccentricity}).transfer(
        // //     new Orbit({center:bodies[0],majorAxis:bodies[planetLock%2+1].majorAxis,eccentricity:bodies[planetLock%2+1].eccentricity})
        // // );
        // // results.innerHTML = 'dv: '+r.dv.toFixed(2) + '\ndt: ' + r.dt.toFixed(0);
        
        //tester.textContent = 'min:' + testMin.toFixed(2) +'m/s';
    }
    var testMin = 0;

    var orbits = [];
    function Orbit(obj){
        this.transfer = 0;
        //orbital parameters
        this.majorAxis = 0;
        this.minorAxis = 0;             //calculated
        this.latus = 0;                 //calculated
        this.eccentricity = 0;
        this.linearEccentricity = 0;    //calculated
        this.anomaly = 0;
        this.yaw = 0;
        this.inclination = 0;
        this.center = 0;                //should be an object
        this.trueAnomaly = 0;

        //optional parameters
        this.mass = 0;
        this.grav = 0;                  //calculated

        //drawing variables
        this.drawAngle = 2*pi;
        this.drawAngleOffset = 0;
        this.x = 0;
        this.y = 0;
        this.yawS = 0;
        this.yawC = 0;

        for(var i in obj) this[i] = obj[i];

        orbits.push(this);
    }
    function orbitUpdate(dt){
        this.minorAxis = Math.sqrt(1-(this.eccentricity*this.eccentricity))*this.majorAxis;
        this.latus = (this.minorAxis*this.minorAxis)/this.majorAxis;
        this.linearEccentricity = Math.sqrt((this.majorAxis*this.majorAxis)-(this.minorAxis*this.minorAxis));
        this.trueAnomaly = meanToTrue(this.eccentricity,this.anomaly);
        this.grav = this.mass * 6.67408e-11;

        if(this.majorAxis2){
            this.minorAxis2 = Math.sqrt(1-(this.eccentricity2*this.eccentricity2))*this.majorAxis2;
            this.linearEccentricity2 = Math.sqrt((this.majorAxis2*this.majorAxis2)-(this.minorAxis2*this.minorAxis2));
        }

        this.yawS = Math.sin(this.yaw);
        this.yawC = Math.cos(this.yaw);
        var r = this.getR(this.trueAnomaly);
        this.x = (r * Math.cos(this.trueAnomaly+this.yaw));
        this.y = r * Math.sin(this.trueAnomaly+this.yaw);
    }
    Orbit.prototype.update = orbitUpdate;
    function orbitGetR(angle){
        if(!angle) angle = this.trueAnomaly;
        return this.latus / (1 + (this.eccentricity*Math.cos(angle)));
    }
    Orbit.prototype.getR = orbitGetR;
    function orbitDraw(c,scale){
        if(this.transfer == 0){
            //reference orbits
            c.save();
            c.rotate(this.yaw);
            c.translate(-this.linearEccentricity*scale,0)
            c.strokeStyle = '#fff';
            c.strokeWidth = 2;
            c.beginPath();
            c.ellipse(0,0,this.majorAxis*scale,this.minorAxis*scale,0,
                this.drawAngleOffset,this.drawAngleOffset+this.drawAngle,false);
            c.stroke();
            c.restore();

            c.save();
            c.strokeStyle = "#ff0";
            c.beginPath();
            c.arc(this.x*scale,this.y*scale,5,0,2*pi,false);
            c.stroke();
            c.restore();
        }else if(this.transfer == 1){
            //hohmannlike
            c.save();
            c.rotate(this.yaw);
            c.strokeStyle = '#ff0';
            c.beginPath();
            c.ellipse(-this.linearEccentricity*scale,0,this.majorAxis*scale,this.minorAxis*scale,0,
                0,pi,false);
            if(parameters.hohmannApo != 1){
                c.ellipse(-this.linearEccentricity2*scale,0,this.majorAxis2*scale,this.minorAxis2*scale,0,
                    pi,2*pi,false);
            }
            c.stroke();
            c.restore();
        }else if(this.transfer == 2){
            //tangential
            c.save();
            c.strokeStyle = '#ff0';
            c.rotate(this.yaw);
            c.beginPath();
            c.ellipse(-this.linearEccentricity*scale,0,this.majorAxis*scale,this.minorAxis*scale,0,0,this.drawAngle,false);
            c.stroke();
            c.restore();
        }else if(this.transfer == 3){
            //constant acceleration
        }else if(this.transfer == 4){
            //constant thrust
        }
    }
    Orbit.prototype.draw = orbitDraw;
    function orbitTransfer(orbit,dest){
        if(this.center != dest.center) return NaN;
        redraw = true;
        if(parameters.transferType == 'hohmann'){
            orbit.transfer = 1;
            var apoapsis = dest.getR(this.trueAnomaly+this.yaw-dest.yaw+pi) * parameters.hohmannApo;
            var tA1 = (this.getR(this.trueAnomaly) + apoapsis)/2;
            var tA2 = (dest.getR(this.trueAnomaly+this.yaw-dest.yaw) + apoapsis)/2;
            var v1 = visViva(this.center,this.getR(this.trueAnomaly),tA1) - visViva(this.center,this.getR(this.trueAnomaly),this.majorAxis);
            var v2 = visViva(this.center,apoapsis,tA2) - visViva(this.center,apoapsis,tA1);
            var v3 = visViva(this.center,dest.getR(this.trueAnomaly+this.yaw-dest.yaw+pi),tA2) - visViva(this.center,dest.getR(this.trueAnomaly+this.yaw-dest.yaw+pi),dest.majorAxis);
            orbit.dv = Math.abs(v1)+Math.abs(v2)+Math.abs(v3);
            orbit.dt = (pi * Math.sqrt(((tA1*tA1*tA1)/this.center.grav))) + ((parameters.hohmannApo==1)?0:(pi * Math.sqrt(((tA2*tA2*tA2)/this.center.grav))));

            var dir = [this.x-dest.x,this.y-dest.y],
                distance = Math.sqrt(dir[0]*dir[0] + dir[1]*dir[1]),
                angle = Math.atan(dir[1]/dir[0]);
            
            orbit.majorAxis = tA1;
            orbit.eccentricity = 1 - (this.getR()/tA1);
            orbit.yaw = this.trueAnomaly+this.yaw;
            orbit.drawAngle = pi;
            if(parameters.hohmannApo != 1){
                orbit.majorAxis2 = tA2;
                orbit.eccentricity2 = 1 - (dest.getR(this.trueAnomaly+this.yaw-dest.yaw)/tA2);
            }else{
                orbit.majorAxis2 = 0;
                orbit.eccentricity2 = 0;
            }
        }else if(parameters.transferType == 'tangent'){
            orbit.transfer = 2;
            if(parameters.tangentAngle == 0){
                //apo has been set
                var apoapsis = dest.getR(this.trueAnomaly+this.yaw-dest.yaw+pi) * parameters.tangentApo;
                orbit.majorAxis = (this.getR(this.trueAnomaly)+apoapsis)/2;
                orbit.eccentricity = 1 - this.getR(this.trueAnomaly)/orbit.majorAxis;
                orbit.yaw = this.trueAnomaly + this.yaw;

                var anom2 = Math.acos((((orbit.majorAxis*(1-(orbit.eccentricity*orbit.eccentricity)))/dest.getR(this.trueAnomaly+this.yaw-dest.yaw+pi))-1)/orbit.eccentricity);
                var flightAngle = Math.atan((orbit.eccentricity*Math.sin(anom2))/(1+(orbit.eccentricity*Math.cos(anom2))));
                var va = visViva(this.center,this.getR(),this.majorAxis);
                var vt1 = visViva(orbit.center,orbit.getR(this.anomaly),orbit.majorAxis)
                var v1 = Math.abs(vt1 - va);
                var vt2 = visViva(orbit.center,orbit.getR(anom2),orbit.majorAxis);
                var vb = visViva(dest.center,dest.getR(anom2),dest.majorAxis);
                var v2 = Math.abs(Math.sqrt((vt2*vt2)+(vb*vb)-(2*vt2*vb*Math.cos(flightAngle))));
                var eAnom = Math.acos((orbit.eccentricity+Math.cos(anom2))/(1 + (orbit.eccentricity * Math.cos(anom2))));
                orbit.drawAngle = eAnom;
                orbit.dt = (eAnom-(orbit.eccentricity*Math.sin(eAnom)))*Math.sqrt((Math.pow(orbit.majorAxis,3))/this.center.grav);
                orbit.dv = v1+v2;
            }else if(parameters.tangentApo == 0){
                //angle has been set

            }else{
                //this just needs to update, keep the angle
            }
            if(false){
            var angle = parameters.tangentAngle;
            //angle is specified, change it but defaulting to Hohmann for now
            var r2 = dest.getR(this.anomaly+angle);
            //if one tangent or bielliptic
            var tA = (this.getR()+r2)/2;
            var tEcc = 1 - (this.majorAxis/tA);
            orbit.majorAxis = tA;
            orbit.eccentricity = tEcc;
            var anom2 = Math.acos((((tA*(1-(tEcc*tEcc)))/r2)-1)/tEcc);
            var flightAngle = Math.atan((tEcc*Math.sin(anom2))/(1+(tEcc*Math.cos(anom2))));
            var va = visViva(this.center,this.getR(),this.majorAxis);
            var vt1 = visViva(orbit.center,orbit.getR(this.anomaly),orbit.majorAxis)
            var v1 = Math.abs(vt1 - va);
            var vt2 = visViva(orbit.center,orbit.getR(anom2),orbit.majorAxis);
            var vb = visViva(dest.center,dest.getR(anom2),dest.majorAxis);
            var v2 = Math.abs(Math.sqrt((vt2*vt2)+(vb*vb)-(2*vt2*vb*Math.cos(flightAngle))));
            var eAnom = Math.acos((tEcc+Math.cos(anom2))/(1 + (tEcc * Math.cos(anom2))));
            var time = (eAnom-(tEcc*Math.sin(eAnom)))*Math.sqrt((tA*tA*tA)/this.center.grav);
            return {dv:v1+v2,dt:time};
            }
        }
    }
    Orbit.prototype.transferTo = orbitTransfer;

    function init(){
        width = win.innerHeight*1.5;
        height = win.innerHeight;
        canvas.width = width;
        canvas.height = height;
        $('.main-container')[0].appendChild(canvas);

        new Orbit({mass:1.99e30});
        new Orbit({center:orbits[0],majorAxis:149598023000, anomaly:6.26, eccentricity:0.017, yaw:-0.2, mass:5.97e24})
        new Orbit({center:orbits[0], majorAxis:1.524*149598023000, anomaly:0.34, eccentricity: 0.09, yaw:0.86, mass:6.39e23});//mars
        new Orbit({center:orbits[0]});

        updateParams();
        handleTransferChange({target:{value:'hohmann'}});

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
        if(id == 'tangentAngle'){
            paramters.tangentApo = 0;
        }else if(id == 'tangentApo'){
            parameters.tangentAngle = 0;
        }
        parameters[ex] = e.target.value;
        updateParams();
        redraw = true;
    }
    $('input').forEach(function(d){
        d.addEventListener('input',handleInput);
    });
    function updateParams(){
        orbits[0].mass = parameters.starMass*1.98855e30;                      //in kg
        var which = (parameters.AAxis > parameters.BAxis)?2:1;
        planetLock = which;
        orbits[which].color = '#4d8';
        orbits[which%2+1].color = '#d64';
        orbits[which].mass = parameters.AMass*5.97237e24;                     //in kg
        orbits[which].majorAxis = parameters.AAxis*149598023000;               //in meters
        orbits[which].eccentricity = parameters.AEccentricity;
        orbits[which].inclination = parameters.AInclination*(pi/180);       //in radians
        orbits[which].yaw = parameters.AYaw*(pi/180);
        orbits[which].anomaly = parameters.AAnomaly*(pi/180);
        orbits[which%2+1].mass = parameters.BMass*5.97237e24;
        orbits[which%2+1].majorAxis = parameters.BAxis*149598023000;
        orbits[which%2+1].eccentricity = parameters.BEccentricity;
        orbits[which%2+1].inclination = parameters.BInclination*(pi/180);
        orbits[which%2+1].yaw = parameters.BYaw*(pi/180);
        orbits[which%2+1].anomaly = parameters.BAnomaly*(pi/180);
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
    function trueToEcc(angle,ecc){
        var s = Math.sin(angle)*Math.sqrt(1 - (ecc*ecc))/(1 + ecc * Math.cos(angle)),
            c = (ecc + Math.cos(angle))/(1 + ecc * Math.cos(angle));
        return Math.atan2(s,c);
    }

    return orbits;
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

var AU = 149598023000;
