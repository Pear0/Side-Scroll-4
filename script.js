/* jshint browser:true */
/* global alert: false */
/* global console: false */
/* global NGN: false */
/* global NGNu: false */
/* global NGNa: false */
/* global Scene: false */
/* global Entity: false */

var ngn, ch, map;
var boxes = [];

function onLoad() {
    console.log("Loading...");

    ngn = new NGN("cnvs");

    ngn.loadImage("char", "char.png");
    ngn.loadImage("map", "map.png");
    ngn.loadImage("piece", "piece.png");
    ngn.loadImage("thing", "thing.png");
    ngn.loadImage("back", "background.png");

    ngn.newScene(function (s) {


        ch = new Entity();
        ch.doCollisions = true;
        ch.isProtagonist = true;

        ch.image = "char";

        var lastTime = Date.now();
        ch.add(function (e) {
            var currTime = Date.now();
            var dTime = currTime - lastTime;
            lastTime = currTime;
            e.ngn.log("FPS", Math.round(1000 / dTime));

        });

        var incr = 0;
        ch.add(function (e) {
            e.ngn.log("test", incr++);
        });

        ch.add(NGNa.gravity);
        ch.add(NGNa.user_control);

        s.add(ch);

        var map = new Entity();
        map.image = "map";
        map.pos.y = 600 - 32;

        s.add(map);

        var points = [[260, 300], [550, 490], [642, 410]];

        for (var i = 0; i < points.length; i++) {
            var box = new Entity();
            boxes.push(box);
            box.image = "piece";
            box.pos.x = points[i][0];
            box.pos.y = points[i][1];
            box.z_level = 2;
            s.add(box);
        }

        var collectibles = [[420, 215], [745, 495]];
        var collectibleFunc = function (e) {
            boxes[0].goTo({
                x: boxes[0].pos.x - 75,
                y: boxes[0].pos.y
            }, 1);
            e.scene.objects.removeElement(e.thing);
        };
        for (var j = 0; j < collectibles.length; j++) {
            var thing = new Entity();
            thing.image = "thing";
            thing.pos.x = collectibles[j][0];
            thing.pos.y = collectibles[j][1];
            thing.z_level = 7;
            thing.collideable = false;
            thing.onCollideWithProtagonist = collectibleFunc;
            s.add(thing);
        }

        var background = new Entity();
        background.collideable = false;
        background.image = "back";
        background.z_level = 0;

        s.add(background);
        
        var y = 350; boxes[0].onArrive = function() {if (y == 350) y = 550; else y = 350; boxes[0].goTo({x: 150, y: y}, 1)}; boxes[0].onArrive();
    }, 2400, 600);

    ngn.start();
    console.log("Loaded");
}
