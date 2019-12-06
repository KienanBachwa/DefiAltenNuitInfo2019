// ------------------------------------------------
// BASIC SETUP
// ------------------------------------------------

import { GLTFLoader } from './GLTFLoader.js'
import { Clock } from './Clock.js'

// Create an empty scene
var scene = new THREE.Scene();

var conteneur = document.getElementById("scene");

function obtenirPourcentageCSS (numFeuilleCSS, nomElement, nomPropriete) {
var rules = document.styleSheets[numFeuilleCSS].rules || document.styleSheets[numFeuilleCSS].cssRules;
    for (var i=0; i < rules.length; i++) {
        var rule = rules[i];
        if (rule.selectorText.toLowerCase() == nomElement) {
		return parseInt(rule.style.getPropertyValue(nomPropriete));
		}
	}
}

const pourcentage_hauteur_scene = obtenirPourcentageCSS(0, "#scene", "height");
const largeur = parseInt(window.getComputedStyle(conteneur).width);
const hauteur = pourcentage_hauteur_scene * window.innerHeight / 100;

// Create a basic perspective camera
var camera = new THREE.PerspectiveCamera( 75, largeur/hauteur, 0.1, 1000 );
camera.position.set(0, 30, 60); //camera pour centrer le mesh

// Create a renderer with Antialiasing
var renderer = new THREE.WebGLRenderer({antialias:true});

// Create an event listener that resizes the renderer with the browser window.
window.addEventListener('resize', function(e) {
  const pourcentage = obtenirPourcentageCSS(0, "#main > div", "flex-basis");
  const largeur_event = pourcentage * window.innerWidth / 100;
  const hauteur_event = pourcentage_hauteur_scene * window.innerHeight / 100;
  renderer.setSize(largeur_event, hauteur_event);
  camera.aspect = largeur_event / hauteur_event;
  camera.updateProjectionMatrix();
});

// Configure renderer clear color
renderer.setClearColor("#FFFFFF");

// Configure renderer size
renderer.setSize( largeur, hauteur );

// Append Renderer to DOM - document.body.appendChild par défaut
conteneur.appendChild( renderer.domElement );

// ------------------------------------------------
// FUN STARTS HERE
// ------------------------------------------------
var loader = new GLTFLoader();

var mixer;
var clock = new Clock();
var light = new THREE.AmbientLight( 0xFFFFFF );
scene.add( light );

var actions; 

function activateAllActions() {
	setWeight( actions[0], 0 );
	setWeight( actions[1], 0 );
	setWeight( actions[2], 0 );
	setWeight( actions[3], 0 );
	setWeight( actions[4], 0 );
	setWeight( actions[5], 0 );
	setWeight( actions[6], 0 );
	setWeight( actions[7], 0 );
	actions.forEach( function ( action ) {
	action.play();
	} );
}

//Melange de 2 actions
//duration : la durée de la transition entre les 2 actions
function synchronizeCrossFade( startAction, endAction, duration ) {
	mixer.addEventListener( 'loop', onLoopFinished );

	function onLoopFinished( event ) {
		if ( event.action === startAction ) {
			mixer.removeEventListener( 'loop', onLoopFinished );
			executeCrossFade( startAction, endAction, duration );
		}
	}
}

function executeCrossFade( startAction, endAction, duration ) {

	// Not only the start action, but also the end action must get a weight of 1 before fading
	// (concerning the start action this is already guaranteed in this place)
	setWeight( endAction, 1 );
	endAction.time = 0;

	//méthode de three.js qui permet d'interpoler les 2 actions
	startAction.crossFadeTo( endAction, duration, true );
}

// This function is needed, since animationAction.crossFadeTo() disables its start action and sets
// the start action's timeScale to ((start animation's duration) / (end animation's duration))
// fonction qui définit le poids de chacune des 2 actions dans l'animation finale
function setWeight( action, weight ) {
	action.enabled = true;
	action.setEffectiveTimeScale( 1 );
	action.setEffectiveWeight( weight );
}

// Boucle animation
var animate = function () {
    requestAnimationFrame( animate );
	var delta = clock.getDelta();
	mixer.update( delta );
    renderer.render(scene, camera);
};

// Load the background texture
const textureLoader = new THREE.TextureLoader();
var bgTexture = textureLoader.load('background2019.png');
scene.background = bgTexture;

loader.load('Oni_Chan_anim_fin.glb', function ( gltf ) {

	scene.add( gltf.scene );
	mixer = new THREE.AnimationMixer( gltf.scene );

	var course = mixer.clipAction( gltf.animations[ 0 ] );
	var marche_et_eventails = mixer.clipAction( gltf.animations[ 1 ] );
	var marche_et_penche = mixer.clipAction( gltf.animations[ 2 ] );
	var marche_genoux = mixer.clipAction( gltf.animations[ 3 ] );
	var eventail_droit = mixer.clipAction( gltf.animations[ 4 ] );
	var eventail_gauche = mixer.clipAction( gltf.animations[ 5 ] );
	var marche_et_tete = mixer.clipAction( gltf.animations[ 6 ] );
	var tombe = mixer.clipAction( gltf.animations[ 7 ] );
	
	actions = [ course, marche_et_eventails, marche_et_penche, marche_genoux, eventail_droit, eventail_gauche, marche_et_tete, tombe ];
	activateAllActions(actions);
	
	var animationTimeline = [
	{ actionFrom : 0 , actionTo : 1 , duration : 2},
	{ actionFrom : 1 , actionTo : 2 , duration : 5},
	{ actionFrom : 2 , actionTo : 3 , duration : 1},
	{ actionFrom : 3 , actionTo : 4 , duration : 12},
	{ actionFrom : 4 , actionTo : 7 , duration : 2},
	{ actionFrom : 7 , actionTo : 0 , duration : 2}
	];
	
	var nact = 0 ; 
	
	var intervalFct = function(timelineElement){
		
		if(undefined ===timelineElement)
			timelineElement = animationTimeline[nact] ; 
		
		console.log("Act "+nact);
		nact = (nact+1) % animationTimeline.length ;
		var duration = timelineElement.duration;
		var nextElt  = animationTimeline[nact];
		setTimeout(function(){
			synchronizeCrossFade(actions[timelineElement.actionFrom], actions[timelineElement.actionTo], duration);
			
			intervalFct(nextElt) ; 
		
		} , duration*1000);
	}
	
	intervalFct();

	animate();

}, undefined, function ( error ) {
	console.error( error );
} );

