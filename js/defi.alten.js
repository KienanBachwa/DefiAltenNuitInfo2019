import * as THREE from './three.module.js'
import {GLTFLoader} from './GLTFLoader.js'
import {Clock} from './Clock.js'

// ------------------------------------------------
// BASIC SETUP
// ------------------------------------------------

class DefiAlten {

    scene = new THREE.Scene();
    loader = new GLTFLoader();
    rotation = new THREE.Vector3();
    clock = new Clock();
    light = new THREE.AmbientLight(0xFFFFFF);
    audioListener = new THREE.AudioListener();
    audioLoader = new THREE.AudioLoader();
    textureLoader = new THREE.TextureLoader();
    sounds = new Map();
    running = false;
    mixers = [];
    actions = [];
    timeouts = [];
    container;
    canvas;
    renderer;
    camera;
    sequences;
    sequencesIndex;
    backgroundImage;
    //Functions
    animate;
    resize;
    width;
    height;
    loadAnimation;
    doTransitions;
    synchronizeCrossFade;
    executeCrossFade;
    play;
    stop;
    toggle;


    // This function is needed, since animationAction.crossFadeTo() disables its start action and sets
    // the start action's timeScale to ((start animation's duration) / (end animation's duration))
    // fonction qui définit le poids de chacune des 2 actions dans l'animation finale
    setWeight = function (action, weight) {
        action.enabled = true;
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(weight);
    }

    constructor(settings) {
        var _this = this;

        this.sequencesIndex = [];
        this.container = settings.container;
        this.sequences = settings.sequences;

        this.sequences.forEach((item, index) => {
            if (item.sequence === undefined)
                this.sequences[index].sequence = [];
        });

        this.running = settings.autoPlay === undefined ? true : settings.autoPlay;

        if (settings.backgroundImage !== undefined) {
            this.backgroundImage = this.textureLoader.load(settings.backgroundImage);
            this.scene.background = this.backgroundImage;
        }

        this.width = function () {
            return parseInt(window.getComputedStyle(_this.container).width);
        }

        this.height = function () {
            return parseInt(window.getComputedStyle(_this.container).height);
        }

        this.container.style.width = "200px";
        this.container.style.height = "200px";

        this.renderer = new THREE.WebGLRenderer({antialias: true, devicePixelRatio: window.devicePixelRatio || 1});
        ;
        this.renderer.setClearColor("#FFFFFF");
        this.renderer.setSize(this.width(), this.height(), false);

        this.canvas = this.renderer.domElement;

        //Setup camera
        this.camera = new THREE.PerspectiveCamera(75, this.width() / this.height(), 0.1, 1000000);  // Create a basic perspective camera
        this.camera.position.set(0, 30, 60); //camera pour centrer le mesh
        this.camera.add(this.audioListener);


        this.doTransitions = function (index) {

            if (!_this.running)
                return;

            let sequenceLenth = _this.sequences[index].sequence.length;

            if (sequenceLenth == 0)
                return;

            let i_anim = _this.sequencesIndex[index];
            let firstTime = i_anim === undefined;

            if (firstTime)
                i_anim = 0;

            let previous_i_anim = (sequenceLenth + i_anim - 1) % sequenceLenth;

            let element = _this.sequences[index].sequence[i_anim];
            let prevElement = _this.sequences[index].sequence[previous_i_anim]
            let n_action = element.action;
            let duration = element.duration;
            let transition = element.transition;

            if (transition >= duration)
                transition = 0.1;

            let action = _this.actions[index][n_action];

            i_anim = (i_anim + 1) % sequenceLenth;

            var nextElement = _this.sequences[index].sequence[i_anim];
            let prev_action = _this.actions[index][prevElement.action];

            _this.sequencesIndex[index] = i_anim;

            //Try to trig previous action end event
            if (!firstTime && prevElement.onActionEnd !== undefined)
                prevElement.onActionEnd(_this);

            //Try to trig current action begin event
            if (undefined !== element.onActionBegin)
                element.onActionBegin(_this);

            //Stop a sound if requested
            if (element.stopSound !== undefined && _this.sounds.has(element.stopSound))
                if (_this.sounds.get(element.stopSound).isPlaying)
                    _this.sounds.get(element.stopSound).stop();


            _this.setWeight(action, 1);
            //Programing transition from prevous to current action
            if (prev_action != action)
                action.crossFadeFrom(prev_action, transition, true);

            //Starting sound if requested
            if (element.startSound !== undefined && _this.sounds.has(element.startSound))
                _this.sounds.get(element.startSound).play();

            //delayed recursion
            _this.timeouts[index] = setTimeout(_this.doTransitions, duration * 1000, index);

        };


        this.play = function () {
            if (_this.running)
                return;

            _this.running = true;

            _this.actions.forEach((actions, index) => {
                actions.forEach((act) => {
                    act.play();
                });
            });

            _this.sequences.forEach((s, index) => {
                _this.sequencesIndex[index] = undefined;
                _this.doTransitions(index);
            });
        }

        this.stop = function () {
            if (!_this.running)
                return;

            _this.sequences.forEach((s, index) => {

                _this.mixers[index]._actions.forEach((a) => {
                    _this.setWeight(a, 0);
                });
                _this.sequencesIndex[index] = undefined;

                if (_this.timeouts[index] !== undefined)
                    window.clearTimeout(_this.timeouts[index]);
            });

            _this.sounds.forEach(snd => {
                if (snd.isPlaying) snd.stop();
            });
            _this.running = false;
        }

        this.toggle = function () {
            if (!_this.running)
                _this.play();
            else
                _this.stop();
        }

        this.loadAnimation = function (item, index) {

            let mesh = item.mesh;
            let position = item.position;
            let rotation = item.rotation;
            let scale = item.scale;
            this.loader.load(mesh, function (gltf) {

                if (item.meshName !== undefined)
                    gltf.scene.name = item.meshName;

                _this.scene.add(gltf.scene);

                if (position !== undefined)
                    gltf.scene.position.set(position.x, position.y, position.z);

                if (rotation !== undefined) {
                    gltf.scene.rotateX(rotation.x);
                    gltf.scene.rotateY(rotation.y);
                    gltf.scene.rotateZ(rotation.z);
                }

                if (scale !== undefined)
                    gltf.scene.scale.set(scale, scale, scale);

                _this.mixers[index] = new THREE.AnimationMixer(gltf.scene);

                _this.actions[index] = [];

                // Load gltf actions
                gltf.animations.forEach((animation, i) => {
                    let act = _this.mixers[index].clipAction(animation).play();
                    _this.setWeight(act, 0);
                    _this.actions[index].push(act);
                });

                if (_this.running)
                    _this.doTransitions(index);

            }, undefined, console.error);
        }

        this.animate = function () {

            requestAnimationFrame(_this.animate);

            var delta = _this.clock.getDelta();
            _this.mixers.forEach(m => {
                m.update(delta);
            });
            _this.renderer.render(_this.scene, _this.camera);

            if (_this.customAnimate) {
                _this.customAnimate(_this);
            }

        };

        this.resize = function (w, h) {

            // Resize the canvas
            _this.renderer.setSize(w, h, false);

            //Compute and update camera ratio
            _this.camera.aspect = w / h;
            _this.camera.updateProjectionMatrix();
        };


        this.container.appendChild(this.renderer.domElement);
        this.resize(this.width(), this.height());

        this.sequences.forEach((item, index) => {

            //Preload all audio sequences
            if (item.sequence !== undefined) {
                item.sequence.forEach((sequence) => {

                    let audioItem = sequence.startSound;
                    if (audioItem !== undefined && _this.sounds[audioItem] === undefined) {
                        console.log('Loading audio  ' + audioItem);
                        // create a global audio source
                        _this.sounds.set(audioItem, new THREE.Audio(_this.audioListener));

                        //load a sound and set it as the Audio object's buffer
                        _this.audioLoader.load(audioItem, function (buffer) {
                            _this.sounds.get(audioItem).setBuffer(buffer);
                            _this.sounds.get(audioItem).setLoop(false);
                            _this.sounds.get(audioItem).setVolume(0.5);
                        });
                    }
                });

                //Load animations
                this.loadAnimation(item, index);
            }


        });
        this.scene.add(this.light);


        this.animate();

    }
}

window.DefiAlten = DefiAlten;
