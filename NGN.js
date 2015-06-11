/* jshint browser:true */
/* global console: false */

//Prototypes
Array.prototype.removeElement = function (elem) {
    for (var i = this.length - 1; i >= 0; i--) {
        if (this[i] === elem) {
            this.splice(i, 1);
        }
    }
};



//Various Utilities and Math Functions
var NGNu = {};

NGNu.length = function (v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
};
NGNu.normalize = function (v) {
    var l = NGNu.length(v);
    if (!l)
        l = 1;
    return {
        x: v.x / l,
        y: v.y / l
    };
};
NGNu.collides = function (rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.height + rect1.y > rect2.y;
};
NGNu.inside = function (box, thing, ignoreTop) {
    return thing.x >= box.x &&
        thing.x + thing.width < box.x + box.width &&
        (ignoreTop || thing.y >= box.y) &&
        thing.y + thing.height < box.y + box.height;
};
NGNu.collisionInfo = function (rect1, rect2) {
    return [
        rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x,
        rect1.y < rect2.y + rect2.height && rect1.height + rect1.y > rect2.y
    ];
};
NGNu.sign = function (a) {
    return a === 0 ? 0 : (a > 0 ? 1 : -1);
};

//Built-in Abilities (ability function is passed {ngn, entity})
var NGNa = {};

NGNa.gravity = function (e) {
    if (!e.entity.onGround) {
        e.entity.velocity.y += 0.3;
    }
};

var keys = {};
var wallJumpTimeout = 0;
var tempMoveX = 0;

window.addEventListener("keydown", function (e) {
    keys[e.keyCode] = true;
});
window.addEventListener("keyup", function (e) {
    keys[e.keyCode] = false;
});

NGNa.user_control = function (e) {
    var moveX = 0;
    if (keys[65])
        moveX -= 1;
    if (keys[68])
        moveX += 1;

    if (wallJumpTimeout > 23)
        moveX = tempMoveX;

    e.entity.velocity.x += 0.9 * moveX;

    if (keys[32] && e.entity.onGround) {
        e.entity.velocity.y -= 9;
        wallJumpTimeout = 10;
    } else if (keys[32] && e.entity.onWall && wallJumpTimeout < 0) {
        e.entity.velocity.y = -9;
        e.entity.velocity.x += -4 * moveX;
        wallJumpTimeout = 30;
        tempMoveX = -moveX;
    }

    wallJumpTimeout--;
};

function NGN(cnvsID) {
    var self = this;
    this.canvasID = cnvsID;
    this.fps = 48;
    this.size = {
        width: 0,
        height: 0
    };
    var images = {};
    var imagesLeft = 0;

    this.update = function () {
        if (self.canvasID === undefined)
            throw "canvasID cannot be undefined!";
        self.cnvs = document.getElementById(self.canvasID);
        self.ctx = self.cnvs.getContext("2d");
        self.size.width = self.cnvs.width;
        self.size.height = self.cnvs.height;
    };
    this.update();

    var scenes = [];
    var sceneIndex = 0;

    this.pushScene = function (w, h) {
        scenes.push(new Scene(w, h));
        return scenes.length - 1;
    };

    this.nextScene = function () {
        sceneIndex++;
    };

    this.scene = function (id) {
        id = id === undefined ? sceneIndex : id;
        return scenes[id];
    };

    this.newScene = function (callback, w, h) {
        var id = self.pushScene(w, h);
        callback(self.scene(id));
        return self.scene(id);
    };

    var renderFrame = function () {
        var currScene = self.scene();
        var objects = currScene.objects;
        var ctx = self.ctx;

        ctx.save();
        ctx.clearRect(0, 0, self.size.width, self.size.height);
        ctx.translate(-currScene.pos.x, -currScene.pos.y);

        var levels = [];
        for (var j = 0; j < objects.length; j++) {
            var o = objects[j];
            if (levels[o.z_level] === undefined)
                levels[o.z_level] = [];
            levels[o.z_level].push(o);
        }
        for (var l = 0; l < levels.length; l++) {
            if (levels[l] === undefined)
                continue;
            for (var i = 0; i < levels[l].length; i++) {
                var obj = levels[l][i];

                ctx.save();
                obj.render({
                    ngn: self,
                    ctx: ctx,
                    scene: currScene,
                    width: self.cnvs.width,
                    height: self.cnvs.height
                });
                ctx.restore();
            }
        }

        ctx.restore();
    };

    var tick = function () {


        var currScene = self.scene();
        var objects = currScene.objects;

        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];

            obj.tick({
                ngn: self,
                scene: self.scene()
            });
        }

    };

    var looping = false;

    this.start = function () {
        if (!looping) {
            looping = true;

            var checkStart = function () {
                if (imagesLeft === 0) {
                    self.cnvs.addEventListener("mousemove", function (e) {
                        self.log("Mouse", "[" + (e.clientX - self.cnvs.offsetLeft + self.scene().pos.x) + ", " + (e.clientY - self.cnvs.offsetTop + self.scene().pos.y) + "]");
                    });

                    var iteration = function () {
                        tick();
                        renderFrame();
                        if (looping)
                            setTimeout(iteration, 1000 / self.fps);
                    };

                    setTimeout(iteration, 1000 / self.fps);
                } else {
                    console.log(imagesLeft + " images left");
                    setTimeout(checkStart, 100);
                }
            };
            checkStart();
        }
    };

    this.stop = function () {
        looping = false;
    };

    this.loadImage = function (name, url) {
        imagesLeft++;
        self.log("Q'd Imgs", imagesLeft);
        var img = new Image();
        img.src = url;
        img.onload = function () {
            imagesLeft--;
            self.log("Q'd Imgs", imagesLeft);
        };
        images[name] = img;
    };

    this.image = function (name) {
        return images[name];
    };

    var tableInjected = false;

    this.log = function () {
        var target = "_console_";
        var thing;
        if (arguments.length > 1) {
            target = arguments[0];
            thing = arguments[1];
        } else if (arguments.length === 1)
            thing = arguments[0];
        else
            return;

        if (target === "_console_")
            console.log(thing);

        if (!tableInjected) {
            tableInjected = true;
            var tb = document.createElement("table");
            tb.border = 1;
            tb.id = "log-table";
            tb.style.position = "fixed";
            tb.style.right = "0px";
            tb.style.top = "0px";
            tb.style["z-index"] = 1000000;
            tb.style.margin = "5px";

            document.body.appendChild(tb);
        }

        var entry = document.getElementById("log-entry-value-" + target);
        if (entry)
            entry.innerHTML = thing;
        else {
            var tbl = document.getElementById("log-table");
            var row = document.createElement("tr");
            var key = document.createElement("td");
            var value = document.createElement("td");
            row.appendChild(key);
            row.appendChild(value);

            key.innerHTML = target;

            value.id = "log-entry-value-" + target;
            value.innerHTML = thing;

            tbl.appendChild(row);
        }
    };

}

function Entity() {
    var self = this;
    this.image = "";
    this.width = undefined;
    this.height = undefined;
    this.z_level = 5;
    this.doCollisions = false;
    this.isProtagonist = false;
    this.collideable = true;
    this.onGround = false;
    this.onWall = false;
    this.onCollideWithProtagonist = undefined; // {ngn, scene, protagonist, thing}
    this.lastPos = {
        x: 0,
        y: 0
    };
    this.pos = {
        x: 0,
        y: 0
    };
    this.velocity = {
        x: 0,
        y: 0
    };
    this._ = {};
    this.onTick = function (e) {} //{ngn, scene, self}
    this.hasFriction = true;
    this.targetPos = undefined;
    this.onArrive = undefined;
    var lastDirX = 1;
    var lastDirY = 1;

    var abilities = [];
    this.add = function (ab) { //function is passed {ngn, entity}
        abilities.push(ab);
    };

    this.getWidth = function (ngn) {
        return self.width !== undefined ? self.width : ngn.image(self.image).width;
    };
    this.getHeight = function (ngn) {
        return self.height !== undefined ? self.height : ngn.image(self.image).height;
    };
    this.getAABB = function (ngn) {
        return {
            x: self.pos.x,
            y: self.pos.y,
            width: this.getWidth(ngn),
            height: this.getHeight(ngn)
        };
    };

    this.goTo = function (pos, speed) {
        if (pos === undefined)
            return;
        if (speed === undefined)
            speed = 1;

        this.targetPos = pos;
        var path = {
            x: this.targetPos.x - this.pos.x,
            y: this.targetPos.y - this.pos.y
        };
        path = NGNu.normalize(path);
        this.velocity = {
            x: path.x * speed,
            y: path.y * speed
        };
        this.hasFriction = false;

    };

    this.render = function (e) { // e = {ngn, ctx, scene, width, height}
        e.ctx.translate(self.pos.x, self.pos.y);

        var img = e.ngn.image(self.image);
        e.ctx.drawImage(img, 0, 0, self.getWidth(e.ngn), self.getHeight(e.ngn));
    };

    this.tick = function (e) { // e = {ngn, scene}
        for (var i = 0; i < abilities.length; i++) {
            abilities[i]({
                ngn: e.ngn,
                entity: self
            });
        }

        if (this.targetPos !== undefined) {

            if (Math.abs(this.velocity.x) + 1 >= Math.abs(this.targetPos.x - this.pos.x) && Math.abs(this.velocity.y) + 1 >= Math.abs(this.targetPos.y - this.pos.y)) {
                this.pos = {
                    x: this.targetPos.x,
                    y: this.targetPos.y
                };
                this.velocity = {
                    x: 0,
                    y: 0
                };

                this.targetPos = undefined;
                this.hasFriction = true;
                if (this.onArrive !== undefined) {
                    this.onArrive();
                }
            }

        }

        if (self.doCollisions) {
            var insideViewBox = function () {
                return NGNu.inside({
                    x: e.scene.pos.x,
                    y: e.scene.pos.y,
                    width: e.ngn.size.width,
                    height: e.ngn.size.height

                }, self.getAABB(e.ngn), true);
            };

            var collides = function () {
                var objs = e.scene.objects;
                var coll = false;

                for (var j = 0; j < objs.length; j++) {
                    var obj = objs[j];
                    if (self !== obj && obj.collideable && NGNu.collides(self.getAABB(e.ngn), obj.getAABB(e.ngn))) {
                        coll = true;
                        break;
                    }


                }
                return coll || !insideViewBox();
            };

            this.onWall = false;
            this.onGround = false;

            var didCollide = false;
            var norm = NGNu.normalize(self.velocity);

            var currentCollide = collides();

            e.ngn.log("CurrentlyColliding", currentCollide);

            //Check if currently colliding
            if (currentCollide) {
                //Try to fix it


                var directions = [];
                for (var o = 0; o < 360; o += 45) {
                    var r = o * (Math.PI / 180);
                    directions.push({
                        x: Math.cos(r),
                        y: Math.sin(r)
                    });
                }

                for (var m = 1; collides(); m++) {

                    if (m > 100) {
                        break;
                    }

                    for (var d = 0; d < directions.length; d++) {
                        this.pos.x += directions[d].x * m;
                        this.pos.y += directions[d].y * m;
                        if (collides()) {
                            this.pos.x -= directions[d].x * m;
                            this.pos.y -= directions[d].y * m;
                        } else {
                            break;
                        }
                    }

                }
            }
            if (self.velocity.x !== 0 || self.velocity.y !== 0) {
                var collidesX = false;
                var collidesY = false;

                self.pos.x += self.velocity.x;
                if (collides()) {
                    collidesX = true;
                }
                self.pos.x -= self.velocity.x;

                self.pos.y += self.velocity.y;
                if (collides()) {
                    collidesY = true;
                }
                self.pos.y -= self.velocity.y;

                e.ngn.log("CollidesXY", "[" + collidesX + ", " + collidesY + "]");

                if (collidesX === collidesY) {
                    self.pos.x += self.velocity.x;
                    self.pos.y += self.velocity.y;
                    while (collides()) {
                        self.pos.x -= norm.x;
                        self.pos.y -= norm.y;
                        this.onWall = true;
                        this.onGround = self.velocity.y > 0;
                        this.velocity.x = 0;
                        this.velocity.y = 0;
                        didCollide = true;
                    }
                } else if (collidesX) {
                    self.pos.x += self.velocity.x;
                    while (collides()) {
                        self.pos.x -= norm.x;
                        this.onWall = true;
                        this.velocity.x = 0;
                        didCollide = true;
                    }
                    self.pos.y += self.velocity.y;
                } else if (collidesY) {
                    self.pos.y += self.velocity.y;
                    while (collides()) {
                        self.pos.y -= norm.y;
                        this.onGround = self.velocity.y > 0;
                        this.velocity.y = 0;
                        didCollide = true;
                    }
                    self.pos.x += self.velocity.x;
                }
            }

            this.lastPos = {
                x: this.pos.x,
                y: this.pos.y
            };

            var sX = NGNu.sign(self.velocity.x);

            if (sX === 0)
                sX = lastDirX;
            else
                lastDirX = sX;

            self.pos.x += 1.5 * sX;
            if (collides()) {
                this.onWall = true;
                self.velocity.x = 0;
            }
            self.pos.x -= 1.5 * sX;

            self.pos.y += 1.5;
            if (collides()) {
                this.onGround = true;
                self.velocity.y = 0;
            }
            self.pos.y -= 1.5;

            e.ngn.log("Pos", "[" + (+self.pos.x.toFixed(2)) + ", " + (+self.pos.y.toFixed(2)) + "]");
            e.ngn.log("Velocity", "[" + (+self.velocity.x.toFixed(2)) + ", " + (+self.velocity.y.toFixed(2)) + "]");
            e.ngn.log("Collision", "[" + this.onWall + ", " + this.onGround + "]");

        } else {
            self.pos.x += self.velocity.x;
            self.pos.y += self.velocity.y;
        }

        if (this.onTick !== undefined) {
            this.onTick({
                ngn: e.ngn,
                scene: e.scene,
                self: self
            });
        }

        //Check for collision with anything with protagonist collision handlers
        if (self.isProtagonist)
            for (var k = 0; k < e.scene.objects.length; k++) {
                var obj = e.scene.objects[k];
                if ((obj.onCollideWithProtagonist !== undefined) && (self !== obj) && NGNu.collides(self.getAABB(e.ngn), obj.getAABB(e.ngn))) {
                    console.log(obj);

                    obj.onCollideWithProtagonist({
                        ngn: e.ngn,
                        scene: e.scene,
                        protagonist: self,
                        thing: obj
                    });
                }
            }


        if (this.hasFriction && (self.onGround || true))
            self.velocity.x *= 0.85;

        if (self.isProtagonist) {
            e.scene.pos.x = self.pos.x - (e.ngn.size.width - self.getWidth(e.ngn)) / 2;
            e.scene.pos.y = self.pos.y - (e.ngn.size.height - self.getHeight(e.ngn)) / 2;

            e.scene.pos.x = Math.min(e.scene.pos.x, e.scene.size.width - e.ngn.size.width);
            e.scene.pos.y = Math.min(e.scene.pos.y, e.scene.size.height - e.ngn.size.height);

            e.scene.pos.x = Math.max(e.scene.pos.x, 0);
            e.scene.pos.y = Math.max(e.scene.pos.y, 0);

            e.ngn.log("Scene", e.scene.pos.x + "," + e.scene.pos.y);
        }


    };

}

function Scene(w, h) {
    this.objects = [];
    this.pos = {
        x: 0,
        y: 0
    };
    this.size = {
        width: w ? w : 800,
        height: h ? h : 600
    };

    this.add = function (obj) {
        this.objects.push(obj);
    };
    this.remove = function (obj) {
        this.objects.removeElement(obj);
    };


}
