var System = (function(win,doc,undefined){
    var pi = Math.PI,
        width = 0,
        height = 0,
        planetLock = 1,
        canvas = $('<canvas#main-canvas>'),
        ctx = canvas.getContext('2d'),
        parameters = {};

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

        bodies.forEach(function(i){ i.update(dt); });
        draw(ctx);
    }

    //keep the reference frame coherent
    function draw(c){
        c.clearRect(0,0,width,height);
        c.save();
        c.translate(width/2,height/2);
        tester.textContent = 'a:' + (bodies[planetLock].anomaly/pi).toFixed(2) + ' ta:' + (bodies[planetLock].trueAnomaly/pi).toFixed(2);
        if(planetLock){ c.rotate(-bodies[planetLock].yaw - bodies[planetLock].trueAnomaly) };
        bodies.forEach(function(i){ i.draw(c); });
        c.restore();
    }

    var bodies = [];
    function Body(obj){
        if(bodies.length == 3){
            console.error('Only 2 planets allowed');
            return;
        }
        this.x = 0;                         //where now?
        this.y = 0;                         //in the y direction!
        this.r = 0;                         //polar coord
        this.size = 0;                      //how big to draw
        this.color = '#4d8';                //what color to draw
        this.mass = 0;                      //for period stuff
        this.majorAxis = 0;                 //how far it actually orbits in AU
        this.period = 0;                    //how long it takes to draw it going around, gets normalized
        this.truePeriod = 0;                //how long in seconds it actually orbits, calculated
        this.eccentricity = 0;              //how wonky the orbit?
        this.inclination = 0;               //inclination is saved for the future, but unused
        this.yaw = 0;                       //rotating the ellipse
        this.anomaly = 0;                   //where is it in radians along the ellipse? will update
        this.minorAxis = 0;                 //calculated
        this.latus = 0;                     //calculated
        this.linearEccentricity = 0;        //calculated
        this.drawArc = true;                //should it show an orbit arc?
        this.drawMajor = 0;                 //the displayed ellipse parameter, normalized
        this.drawMinor = 0;                 //the other one, also normalized
        this.trueAnomaly = 0;               //for drawing

        for(var i in obj) this[i] = obj[i];

        this.majorAxis *= 1.496e+11; //make it in meters because math
        this.minorAxis = Math.sqrt(1-(this.eccentricity*this.eccentricity))*this.majorAxis;
        if(bodies.length == 1){
            //remarkably accurate application of Kepler's third law
            this.truePeriod = Math.sqrt((4*pi*pi*this.majorAxis*this.majorAxis*this.majorAxis)/(6.67e-11*(bodies[0].mass+this.mass)));
            //first one is arbitrarily set
            this.period = (2*pi)/10;
        }else if(bodies.length == 2){
            this.truePeriod = Math.sqrt((4*pi*pi*this.majorAxis*this.majorAxis*this.majorAxis)/(6.67e-11*(bodies[0].mass+this.mass)));
            //second one gets normalized to show relative to the first
            this.period = bodies[1].period*(bodies[1].truePeriod/this.truePeriod);
            this.drawMajor = (height/2) - 40;
            bodies[1].drawMajor = this.drawMajor * (bodies[1].majorAxis/this.majorAxis);
            bodies[1].drawMinor = Math.sqrt(1-(bodies[1].eccentricity*bodies[1].eccentricity))*bodies[1].drawMajor;
            this.drawMinor = Math.sqrt(1-(this.eccentricity*this.eccentricity))*this.drawMajor;
            this.anomaly -= bodies[1].anomaly;
            bodies[1].anomaly = 0; 
            this.latus = (this.drawMinor*this.drawMinor)/this.drawMajor
            //this is purely a display property despite fancy name
            this.linearEccentricity = -1* Math.sqrt((this.drawMajor*this.drawMajor)-(this.drawMinor*this.drawMinor));
            bodies[1].linearEccentricity = -1* Math.sqrt((bodies[1].drawMajor*bodies[1].drawMajor)-(bodies[1].drawMinor*bodies[1].drawMinor));
            bodies[1].latus = (bodies[1].drawMinor*bodies[1].drawMinor)/bodies[1].drawMajor;
        }

        bodies.push(this);
    }
    function updateBody(dt){
        this.anomaly += this.period * dt;
        this.anomaly = this.anomaly%(2*pi);
        this.trueAnomaly = meanToTrue(this.eccentricity,this.anomaly);
        this.r = this.latus / (1 + (this.eccentricity*Math.cos(this.trueAnomaly)));
        this.x = this.r * Math.cos(this.trueAnomaly);
        this.y = this.r * Math.sin(this.trueAnomaly);
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

    function init(){
        width = win.innerHeight*1.5;
        height = win.innerHeight;
        canvas.width = width;
        canvas.height = height;
        $('.main-container')[0].appendChild(canvas);

        new Body({size:50, color:'#db4', drawArc:false, mass:1.99e30});//sun
        new Body({size:10, majorAxis:1, anomaly:6.26, eccentricity: 0.017, yaw:-0.2, mass:5.97e24});//earth
        new Body({size:10, color:'#d64', majorAxis:1.52, anomaly:0.34, eccentricity: 0.09, yaw:0.86, mass:6.39e23});//mars
        //new Body({size:30, color:'#d86', majorAxis:5.2, anomaly:0.35, eccentricity: 0.05, yaw:1.75, mass:1.9e27});//jupiter

        requestAnimationFrame(loop);
    }
    win.addEventListener('load',init);

    function handleInput(e){
        var id = e.target.id,
            ex = id;
        if(id.endsWith('Val')){
            id = id.substring(0,id.length-3);
            ex = id;
        }
        else{ id += 'Val'; }
        $('#'+id)[0].value = e.target.value;
        parameters[ex] = e.target.value;
    }
    $('input').forEach(function(d){
        d.addEventListener('input',handleInput);
    });

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

    return bodies;
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