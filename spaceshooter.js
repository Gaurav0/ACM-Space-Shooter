window.addEventListener("DOMContentLoaded", function() {

    var c = document.getElementById("field");
    var ctx = c.getContext("2d");
    var LOOP_VOLUME = 0.2;
    var BACKGROUND_SPEED = 2;
    var BACKGROUND_HEIGHT = 1092;
    var MOVEMENT_RATE = 15;
    var KEY_ESC = 27;
    var MAX_LIVES = 3;
    var LIFE_DELAY = 60;
    var INVULNERABLE_PERIOD = 60;
    
    function Sprite(args) {
        
        this.x = args.x;
        this.y = args.y;
        this.w = args.w;
        this.h = args.h;
        this.z = args.z;
        this.img = args.img;
        
        spriteList.add(this);
        
        this.draw = function() {
            ctx.drawImage(this.img, this.x, this.y);
        };
        
        this.clear = function() {
            ctx.clearRect(this.x, this.y, this.w, this.h);
        };
        
        this.collide = function(object2) {
            return object2.x + object2.w > this.x && this.x + this.w > object2.x &&
                   object2.y + object2.h > this.y && this.y + this.h > object2.y;
        };
        
        this.drawUnder = function() {
            var iterator = spriteList.iterator();
            while (iterator.hasNext()) {
                var sprite = iterator.next();
                if (sprite != this && sprite.z <= this.z)
                    if (sprite.collide(this))
                        sprite.draw();
            }
        };
        
        this.drawOver = function() {
            var iterator = spriteList.iterator();
            while (iterator.hasNext()) {
                var sprite = iterator.next();
                if (sprite != this && sprite.z >= this.z)
                    if (sprite.collide(this))
                        sprite.draw();
            }
        };
        
        this.remove = function() {
            spriteList.remove(this);
        };
    }
    
    function LivingSprite(args) {
        Sprite.call(this, args);
    
        this.hp = args.hp;
        this.dead = false;
        
        this.onMove = function(dx, dy) {
            return true;
        };
        
        this.move = function(dx, dy) {
            this.clear();
            this.drawUnder();
            this.x += dx;
            this.y += dy;
            if (this.onMove(dx, dy))
                this.draw();
            this.drawOver();
        };
        
        var _collide = this.collide;
        this.collide = function(object2) {
            return !this.dead && _collide.call(this, object2);
        };
        
        this.damage = function(dmg) {
            this.hp -= dmg;
            if (this.hp <= 0) {
                this.dead = true;
                this.explode();
            }
        };
        
        this.explode = function() {
            this.clear();
            this.remove();
        };
    }
    
    function AutoPilotedSprite(args) {
        LivingSprite.call(this, args);
        
        this.dx = args.dx;
        this.dy = args.dy;
        
        this.onMove = function(dx, dy) {
            if (this.outOfBounds()) {
                this.remove();
                return false;
            }
            return true;
        };
        
        this.outOfBounds = function() {
            return false;
        };
        
        var _remove = this.remove;
        this.remove = function() {
            _remove.call(this);
            document.removeEventListener("timer", this.moveSprite, false);
        };
        
        var sprite = this;
        this.moveSprite = function() {
            sprite.move(sprite.dx, sprite.dy);
        };
        document.addEventListener("timer", this.moveSprite, false);
    }
    
    function Enemy(args) {
        AutoPilotedSprite.call(this, args);
        
        this.explode = function() {
            this.remove();
            gameScore.add(this.constructor.POINTS);
            new Explosion(this);
        };
        
        var _onMove = this.onMove;
        this.onMove = function(dx, dy) {
            if (!_onMove.call(this, dx, dy))
                return false;
            if (player.collide(this)) {
                player.damage(this.constructor.DAMAGE);
                this.damage(Starship.DAMAGE);
                return !this.dead;
            }
            return true;
        };
        
        this.outOfBounds = function() {
            return (this.y > c.height);
        };
    }
    
    Explosion.WIDTH = 64;
    Explosion.HEIGHT = 64;
    Explosion.FRAMES = 16;
    Explosion.sound = document.getElementById("boom");
    Explosion.sound.volume = 0.4;
    Explosion.img = new Image();
    Explosion.img.src = "images/explosion.png";
    
    function Explosion(deadSprite) {
        Sprite.call(this, {
            z: 10
        });
    
        this.w = Math.floor(deadSprite.w * (4/3));
        this.h = Math.floor(deadSprite.h * (4/3));
        this.x = deadSprite.x - (this.w - deadSprite.w) / 2;
        this.y = deadSprite.y - (this.h - deadSprite.h) / 2;
        this.frame = 0;
        this.deadSprite = deadSprite;
        
        this.draw = function() {
            if (this.frame >= 0 && this.frame < Explosion.FRAMES) {
                var sx = this.frame * Explosion.WIDTH;
                ctx.drawImage(Explosion.img, sx, 0, Explosion.WIDTH, Explosion.HEIGHT,
                    this.x, this.y, this.w, this.h);
            }
        };
        
        var explosion = this;
        var _explode = function() {
            explosion.explode();
        };
        document.addEventListener("timer", _explode, false);
        
        this.explode = function() {
            if (this.frame > 0) {
                this.clear();
                this.drawUnder();
            } else
                playSound(Explosion.sound);
            if (this.frame < Explosion.FRAMES) {
                this.draw();
                this.drawOver();
            }
            this.frame++;
            if (this.frame >= Explosion.FRAMES + 1) {
                document.removeEventListener("timer", _explode, false);
                this.remove();
            }
        };
    }
    
    Starship.WIDTH = 48;
    Starship.HEIGHT = 48;
    Starship.START_X = 275;
    Starship.START_Y = 500;
    Starship.HP = 100;
    Starship.DAMAGE = 100;
    Starship.FIRE_DELAY = 8;
    Starship.img = new Image();
    Starship.img.src = "images/starship.png";
    Starship.num_lives = MAX_LIVES;
        
    function Starship() {
        LivingSprite.call(this, {
            x: Starship.START_X,
            y: Starship.START_Y,
            w: Starship.WIDTH, 
            h: Starship.HEIGHT,
            z: 8,
            hp: Starship.HP, 
            img: Starship.img
        });
        
        this.canFire = true;
        document.getElementById("health").style.width = "100%";
        Starship.num_lives--;
        
        this.invulnerable_time_left = INVULNERABLE_PERIOD;
        this.invulnerable = true;
        var starship = this;
        var countdown = function() {
            if (starship.invulnerable_time_left-- == 0) {
                starship.invulnerable = false;
                starship.draw();
                document.removeEventListener("timer", countdown, false);
            }
        }
        document.addEventListener("timer", countdown, false);
        
        window.addEventListener("keydown", keyDownHandler, false);    
        window.addEventListener("keyup", keyUpHandler, false);
        document.addEventListener("timer", keyHandler, false);
        if (mouseEnabled)
            addMouseListeners();
        
        var _draw = this.draw;
        this.draw = function() {
            if (this.invulnerable)
                ctx.globalAlpha = 0.05;
            _draw.call(this);
            ctx.globalAlpha = 1;
        };
        
        this.onMove = function(dx, dy) {
            if (!this.inbounds()) {
                this.x -= dx;
                this.y -= dy;
            }
            return true;
        };        
        
        this.inbounds = function() {
            return this.x >= 0 && this.x + this.w <= c.width &&
                   this.y >= 0 && this.y + this.h <= c.height;
        };
        
        this.shoot = function() {
            var counter = Starship.FIRE_DELAY;
            var starship = this;
            
            var fireDelay = function() {
                counter--;
                if (counter == 0) {
                    starship.canFire = true;
                    document.removeEventListener("timer", fireDelay, false);
                }
            };
            
            if (this.canFire) {
                this.canFire = false;
                document.addEventListener("timer", fireDelay, false);
                new Torpedo(this);
            }
        };
        
        var _damage = this.damage;
        this.damage = function(dmg) {
            if (!this.invulnerable) {
                _damage.call(this, dmg);
                if (this.hp < 0)
                    this.hp = 0;
                document.getElementById("health").style.width = (this.hp / Starship.HP) * 100 + "%";
            }
        }
        
        this.explode = function() {
            window.removeEventListener("keydown", keyDownHandler, false);
            window.removeEventListener("keydown", keyUpHandler, false);
            document.removeEventListener("timer", keyHandler, false);
            removeMouseListeners();
            document.removeEventListener("timer", moveStarshipToTargetX, false);
            mouseDown = false;
            keyStatus = {};
            loop.pause();
            this.remove();
            new Explosion(this);
            document.getElementById("life" + Starship.num_lives).style.display = "none";
            if (Starship.num_lives > 0) {
                delay = LIFE_DELAY;
                document.addEventListener("timer", nextLife, false);
            } else {
                window.removeEventListener("keydown", pauseHandler, false);
                document.getElementById("end").style.visibility = "visible";
            }
        };
        
        var moveStarshipToTargetX = function() {
            starship.moveToTargetX();
        };
        
        this.moveToTargetX = function() {
            if (this.x == this.targetX) {
                document.removeEventListener("timer", moveStarshipToTargetX, false);
            } else {
                if (this.x < this.targetX - MOVEMENT_RATE)
                    this.move(MOVEMENT_RATE, 0);
                else if (this.x > this.targetX + MOVEMENT_RATE)
                    this.move(-MOVEMENT_RATE, 0);
                else
                    this.move(this.targetX - this.x, 0);
            }
        };
        
        this.setTargetX = function(targetX) {
            this.targetX = targetX;
            document.addEventListener("timer", moveStarshipToTargetX, false);
        };
    }
    
    Torpedo.WIDTH = 12;
    Torpedo.HEIGHT = 40;
    Torpedo.SPEED = 20;
    Torpedo.HP = 1;
    Torpedo.DAMAGE = 400;
    Torpedo.img = new Image();
    Torpedo.img.src = "images/torpedo.png";
    Torpedo.sound = document.getElementById("launch");
    Torpedo.sound.volume = 0.3;
    
    function Torpedo(starship) {
        AutoPilotedSprite.call(this, {
            w: Torpedo.WIDTH, 
            h: Torpedo.HEIGHT,
            z: 1,
            hp: Torpedo.HP, 
            img: Torpedo.img,
            dx: 0,
            dy: -Torpedo.SPEED
        });
        
        this.x = starship.x + (starship.w - this.w) / 2;
        this.y = starship.y - this.h;
        
        var _onMove = this.onMove;
        this.onMove = function(dx, dy) {
            if (!_onMove.call(this, dx, dy))
                return false;
                
            var iterator = spriteList.iterator();
            while (iterator.hasNext()) {
                var sprite = iterator.next();
                if (sprite != this && sprite.damage && sprite.collide(this)) {
                    this.damage(sprite.constructor.DAMAGE);
                    sprite.damage(Torpedo.DAMAGE);
                    return !this.dead;
                }
            }
            
            return true;
        };
        
        this.outOfBounds = function() {
            return this.y < -this.h;
        }
        
        playSound(Torpedo.sound);
    }
    
    EnemyTorpedo.WIDTH = 12;
    EnemyTorpedo.HEIGHT = 41;
    EnemyTorpedo.SPEED = 20;
    EnemyTorpedo.HP = 1;
    EnemyTorpedo.DAMAGE = 20;
    EnemyTorpedo.img = new Image();
    EnemyTorpedo.img.src = "images/torpedodark.png";
    
    function EnemyTorpedo(enemy) {
        AutoPilotedSprite.call(this, {
            w: EnemyTorpedo.WIDTH, 
            h: EnemyTorpedo.HEIGHT,
            z: 1,
            hp: EnemyTorpedo.HP, 
            img: EnemyTorpedo.img,
            dx: 0,
            dy: EnemyTorpedo.SPEED
        });
        
        this.x = enemy.x + (enemy.w - this.w) / 2;
        this.y = enemy.y + enemy.h;
        
        var _onMove = this.onMove;
        this.onMove = function(dx, dy) {
            if (!_onMove.call(this, dx, dy))
                return false;
                
            if (player.collide(this)) {
                player.damage(this.constructor.DAMAGE);
                this.damage(Starship.DAMAGE);
                return !this.dead;
            }
            
            return !this.dead;
        };
        
        this.outOfBounds = function() {
            return this.y > c.height;
        };
        
        playSound(Torpedo.sound);
    }
    
    Asteroid.WIDTH = 109;
    Asteroid.HEIGHT = 91;
    Asteroid.SPEED = 4;
    Asteroid.GENERATION_RATE = 1 / 4;
    Asteroid.ROTATION_RATE = 1 / 3;
    Asteroid.HP = 1000;
    Asteroid.DAMAGE = 1000;
    Asteroid.POINTS = 1;
    Asteroid.NUM_FRAMES = 30;
    Asteroid.img = new Image();
    Asteroid.img.src = "images/asteroid-big.png";
    
    function Asteroid() {
        Enemy.call(this, {
            y: -Asteroid.HEIGHT,
            w: Asteroid.WIDTH, 
            h: Asteroid.HEIGHT,
            z: 7,
            hp: Asteroid.HP, 
            img: Asteroid.img,
            dx: 0,
            dy: Asteroid.SPEED
        });
    
        this.x = Math.floor(Math.random() * (c.width - this.w));
        this.frame = Math.floor(Math.random() * Asteroid.NUM_FRAMES);
        this.ticks = 0;
        
        this.draw = function() {
            ctx.drawImage(this.img, 0, this.frame * Asteroid.HEIGHT, this.w, this.h,
                this.x, this.y, this.w, this.h);
        };
        
        var _onMove = this.onMove;
        this.onMove = function(dx, dy) {
            if (this.ticks++ % (1 / Asteroid.ROTATION_RATE) == 0)
                this.frame = (this.frame + 1) % Asteroid.NUM_FRAMES;
            return _onMove.call(this, dx, dy);
        }
    }
    
    Enemy1.WIDTH = 50;
    Enemy1.HEIGHT = 50;
    Enemy1.SPEED = 5;
    Enemy1.GENERATION_RATE = 1/6;
    Enemy1.HP = 100;
    Enemy1.DAMAGE = 20;
    Enemy1.POINTS = 10;
    Enemy1.img = new Image();
    Enemy1.img.src = "images/enemy1.png";
    
    function Enemy1() {
        Enemy.call(this, {
            y: -Enemy1.HEIGHT,
            w: Enemy1.WIDTH,
            h: Enemy1.HEIGHT,
            z: 4,
            hp: Enemy1.HP,
            img: Enemy1.img,
            dy: Enemy1.SPEED
        });
            
        this.x = Math.floor(Math.random() * (c.width - this.w));
        this.dx = (Math.floor(Math.random() * 2) - 0.5) * 4 *
                  (Math.floor(Math.random() * 2) + 1);
        
        var _onMove = this.onMove;
        this.onMove = function(dx, dy) {
            if (!((this.x + dx) >= 0 && (this.x + this.w + dx) <= c.width)) {
                this.dx *= -1;
            }
            return _onMove.call(this, dx, dy);
        }
    }
    
    Enemy2.WIDTH = 54;
    Enemy2.HEIGHT = 56;
    Enemy2.SPEED = 5;
    Enemy2.GENERATION_RATE = 1/6;
    Enemy2.HP = 100;
    Enemy2.DAMAGE = 20;
    Enemy2.POINTS = 10;
    Enemy2.img = new Image();
    Enemy2.img.src = "images/enemy2.png";
    
    function Enemy2(){
        Enemy.call(this, {
            y: -Enemy2.HEIGHT,
            w: Enemy2.WIDTH,
            h: Enemy2.HEIGHT,
            z: 5,
            hp: Enemy2.HP,
            img: Enemy2.img,
            dy: Enemy2.SPEED
        });
            
        this.x = Math.floor(Math.random() * (c.width - this.w));
        this.dx = (Math.floor(Math.random() * 2) - 0.5) * 4 *
                  (Math.floor(Math.random() * 2) + 1);
        
        var _onMove = this.onMove;
        this.onMove = function(dx, dy) {
            if (!((this.x + dx) >= 0 && (this.x + this.w + dx) <= c.width)) {
                this.dx *= -1;
            }
            return _onMove.call(this, dx, dy);
        }
    }
    
    EnemyShip.WIDTH = 48;
    EnemyShip.HEIGHT = 48;
    EnemyShip.SPEED = 3;
    EnemyShip.GENERATION_RATE = 1/5;
    EnemyShip.HP = 100;
    EnemyShip.DAMAGE = 20;
    EnemyShip.POINTS = 100;
    EnemyShip.FIRE_DELAY = 8;
    EnemyShip.MAX_NUM = 3;
    EnemyShip.img = new Image();
    EnemyShip.img.src = "images/starshipdark.png";
    
    EnemyShip.numAlive = 0;
    
    function EnemyShip() {
        Enemy.call(this, {
            y: -EnemyShip.HEIGHT,
            w: EnemyShip.WIDTH,
            h: EnemyShip.HEIGHT,
            z: 2,
            hp: EnemyShip.HP,
            img: EnemyShip.img,
            dy: EnemyShip.SPEED
        });
            
        this.x = Math.floor(Math.random() * (c.width - this.w));
        this.dx = (Math.floor(Math.random() * 2) - 0.5) * 4 *
                  (Math.floor(Math.random() * 2) + 1);
        this.canFire = true;
        this.midway = Math.floor(Math.random() * 7) * 50 + 50;
        EnemyShip.numAlive++;
        
        var _onMove = this.onMove;
        this.onMove = function(dx, dy) {
            if (this.y >= this.midway)
                this.dy = 0;
            if (!player.dead && Math.abs(this.x - player.x) < 10)
                this.shoot();
            if (!((this.x + dx) >= 0 && (this.x + this.w + dx) <= c.width)) {
                this.dx *= -1;
            }
            return _onMove.call(this, dx, dy);
        }
        
        this.shoot = function() {
            var counter = EnemyShip.FIRE_DELAY;
            var enemyShip = this;
            
            var fireDelay = function() {
                counter--;
                if (counter == 0) {
                    enemyShip.canFire = true;
                    document.removeEventListener("timer", fireDelay, false);
                }
            };
            
            if (this.canFire) {
                this.canFire = false;
                document.addEventListener("timer", fireDelay, false);
                new EnemyTorpedo(this);
            }
        };
        
        var _remove = this.remove;
        this.remove = function() {
            _remove.call(this);
            EnemyShip.numAlive--;
        };
    }
    
    EnemyUFO.WIDTH = 48;
    EnemyUFO.HEIGHT = 48;
    EnemyUFO.SPEED = 2;
    EnemyUFO.GENERATION_RATE = 1/5;
    EnemyUFO.ROTATION_RATE = 6;
    EnemyUFO.HP = 100;
    EnemyUFO.DAMAGE = 20;
    EnemyUFO.POINTS = 10;
    EnemyUFO.img = new Image();
    EnemyUFO.img.src = "images/ufodark.png";
    
    function EnemyUFO() {
        Enemy.call(this, {
            y: -EnemyUFO.HEIGHT,
            w: EnemyUFO.WIDTH,
            h: EnemyUFO.HEIGHT,
            z: 3,
            hp: EnemyUFO.HP,
            img: EnemyUFO.img,
            dx: 0,
            dy: EnemyUFO.SPEED
        });
        
        this.x = Math.floor(Math.random() * (c.width - this.w - 400)) + 200;
        this.radius = Math.floor(Math.random() * 200) + 100;
        this.degrees = Math.floor(Math.random() * 360);
        this.dir = (Math.floor(Math.random() * 2) - 0.5) * 2;
        
        this.draw = function() {
            ctx.drawImage(this.img, Math.round(this.x), Math.round(this.y));
        }
        
        this.clear = function() {
            ctx.clearRect(Math.round(this.x), Math.round(this.y), this.w, this.h);
        };
        
        this.outOfBounds = function() {
            return (this.y - 2 * this.radius > c.height);
        };
        
        var _onMove = this.onMove;
        this.onMove = function(dx, dy) {
            this.degrees = (this.degrees + this.dir * EnemyUFO.ROTATION_RATE) % 360;
            var radians = Math.PI * this.degrees / 180;
            var multiplier = this.radius / Timer.FPS;
            this.dx = multiplier * (-Math.sin(radians));
            this.dy = multiplier * (Math.cos(radians)) + EnemyUFO.SPEED;
            return _onMove.call(this, dx, dy);
        }
    }
    
    function SpriteList() {
        this.sprites = [];
        
        var zComparator = function(sprite1, sprite2) {
            return sprite1.z - sprite2.z;
        };
        
        this.add = function(sprite) {
            this.sprites.push(sprite);
            this.sprites.sort(zComparator);
        };
        
        this.remove = function(sprite) {
            var i = this.sprites.indexOf(sprite);
            if (i >= 0)
                this.sprites.splice(i, 1);
        };
        
        this.iterator = function() {
            return new (function(sprites) {
                this.sprites = sprites;
                this.index = 0;
                
                this.hasNext = function() {
                    return this.index < this.sprites.length;
                };
                
                this.next = function() {
                    return this.sprites[this.index++];
                };
            })(this.sprites);
        };
    }
    
    function Score() {
        
        var score = document.getElementById("score");
        this.points = 0;
        
        this.add = function(points) {
            this.points += points;
            this.update();
        };
        
        this.update = function() {
            score.textContent = this.points;
        };
    }
    
    Timer.FPS = 24;
    function Timer() {
        
        this.paused = false;
        this.last = 0;
        this.elapsed = 0;
        this.targetId = 0;
        this.evt = document.createEvent("Event");
        this.evt.initEvent("timer", true, true);
        
        this.pause = function() {
            this.paused = true;
            loop.pause();
            document.getElementById("pause").style.visibility = "visible";
        };
        
        this.resume = function() {
            this.paused = false;
            document.getElementById("pause").style.visibility = "hidden";
            loop.play();
            this.dispatch();
        };
        
        var timer = this;
        this.dispatch = function() {
            if (!this.paused) {
                timer.last = Date.now();
                document.dispatchEvent(timer.evt);
                timer.elapsed = Date.now() - timer.last;
                timer.targetId = window.setTimeout(function() {
                    timer.dispatch();
                }, 1000/Timer.FPS - timer.elapsed);
            }
        };
        
        window.addEventListener("load", this.dispatch, false);
    }
    
    var gameTimer = new Timer();
    var spriteList = new SpriteList();
    var player;
    var gameScore = new Score();
    
    var ticks = 1;
    function generateEnemies() {
        ticks++;
        if (ticks % (Timer.FPS / Asteroid.GENERATION_RATE) == 0)
            new Asteroid();
        if (ticks % (Timer.FPS / EnemyUFO.GENERATION_RATE) == 0)
            new EnemyUFO();
        if (ticks % (Timer.FPS / Enemy1.GENERATION_RATE) == 0)
            new Enemy1();
        if (ticks % (Timer.FPS / Enemy2.GENERATION_RATE) ==
                Timer.FPS / Enemy2.GENERATION_RATE / 2)
            new Enemy2();
        if (ticks % (Timer.FPS / EnemyShip.GENERATION_RATE) == 0 &&
                EnemyShip.numAlive < EnemyShip.MAX_NUM)
            new EnemyShip();
    }
    document.addEventListener("timer", generateEnemies, false);
    
    var loop = document.getElementById("loop");
    // Fix for Firefox not looping audio:
    if (typeof loop.loop != 'boolean') {
        loop.addEventListener('ended', function() {
            this.currentTime = 0;
            this.play();
        }, false);
    }
    loop.volume = LOOP_VOLUME;
    
    window.addEventListener("load", function() {
        player = new Starship();
        player.draw();
        loop.play();
    }, false);
        
    var delay = LIFE_DELAY;
    var nextLife = function() {
        delay--;
        if (delay == 0) {
            document.removeEventListener("timer", nextLife, false);
            player = new Starship();
            player.draw();
            loop.play();
        }
    }
    
    function playSound(sound) {
        if (sound.currentTime != 0) {
            sound.pause();
            sound.currentTime = 0;
        }
        sound.play();
    };
    
    var posY = 0;
    
    function moveBackground() {
        posY = (posY + BACKGROUND_SPEED) % BACKGROUND_HEIGHT;
        c.style.backgroundPosition = "0px " + posY + "px";
    }
    document.addEventListener("timer", moveBackground, false);
            
    var keys = {
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        SPACE: 32,
        ENTER: 13
    };
    
    var keyStatus = {};
    
    function keyDownHandler(event) {
        var keycode = event.keyCode;
        for (var key in keys)
            if (keys[key] == keycode) {
                keyStatus[keycode] = true;
                event.preventDefault();
            }
    }
    
    function keyUpHandler(event) {
        var keycode = event.keyCode;
        for (var key in keys)
            if (keys[key] == keycode) {
                keyStatus[keycode] = false;
            }
    }
    
    function keyHandler(event) {
                
        if (keyStatus[keys.LEFT]) {
            player.move(-MOVEMENT_RATE, 0);
        }
        else if (keyStatus[keys.RIGHT]) {
            player.move(MOVEMENT_RATE, 0);
        }
        
        if (keyStatus[keys.UP]) {
            player.move(0, -MOVEMENT_RATE);
        }
        else if (keyStatus[keys.DOWN]) {
            player.move(0, MOVEMENT_RATE);
        }
        
        if (keyStatus[keys.SPACE] || keyStatus[keys.ENTER] || mouseDown) {
            player.shoot();
        }
    }
    
    function pauseHandler(event) {
        var keycode = event.keyCode;
        if (keycode == KEY_ESC) {
            if (gameTimer.paused)
                gameTimer.resume();
            else
                gameTimer.pause();
            event.preventDefault();
        }
    }
    
    window.addEventListener("keydown", pauseHandler, false);
    var mouseDown = false;
    var mouseEn = document.getElementById("mouse_en");
    var mouseEnabled = mouseEn.checked;
    
    function mouseDownHandler(event) {
        mouseDown = true;
    }
    
    function mouseMoveHandler(event) {
        player.setTargetX(event.pageX);
    }
    
    function mouseUpHandler(event) {
        mouseDown = false;
    }
    
    function addMouseListeners() {
        window.addEventListener("mousedown", mouseDownHandler, false);
        window.addEventListener("mousemove", mouseMoveHandler, false);
        window.addEventListener("mouseup", mouseUpHandler, false);
    }
    
    function removeMouseListeners() {
        window.removeEventListener("mousedown", mouseDownHandler, false);
        window.removeEventListener("mousemove", mouseMoveHandler, false);
        window.removeEventListener("mouseup", mouseUpHandler, false);
    }
    
    mouseEn.addEventListener("click", function() {
    
        if (mouseEn.checked) {
            mouseEnabled = true;
            addMouseListeners();
        } else {
            mouseEnabled = false;
            removeMouseListeners();
        }
    
    }, false);

}, false);