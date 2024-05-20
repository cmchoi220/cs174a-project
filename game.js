import { defs, tiny } from './examples/common.js';
import { Body, Simulation } from './examples/collisions-demo.js'

// Pull these names into this module's scope for convenience:
const { vec3, unsafe3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Scene } = tiny;


export class Test_Data {
	// **Test_Data** pre-loads some Shapes and Textures that other Scenes can borrow.
	constructor() {
		this.textures = {
			rgb: new Texture("assets/rgb.jpg"),
			earth: new Texture("assets/earth.gif"),
			grid: new Texture("assets/grid.png"),
			stars: new Texture("assets/stars.png"),
			text: new Texture("assets/text.png"),
		}
		this.shapes = {
			ball: new defs.Subdivision_Sphere(3, [[0, 1], [0, 1]]),
		};
	}

	random_shape(shape_list = this.shapes) {
		// random_shape():  Extract a random shape from this.shapes.
		const shape_names = Object.keys(shape_list);
		return shape_list[shape_names[~~(shape_names.length * Math.random())]]
	}
}


export class Game extends Simulation {
	// ** Inertia_Demo** demonstration: This scene lets random initial momentums
	// carry several bodies until they fall due to gravity and bounce.
	constructor() {
		super();

		this.data = new Test_Data();

		this.shapes = Object.assign({}, this.data.shapes);
		this.shapes.square = new defs.Square();


		this.materials = {
			test: new Material(new defs.Fake_Bump_Map(1),
				{ color: color(.4, .8, .4, 1), ambient: .4, texture: this.data.textures.stars }),
			bright: new Material(new defs.Phong_Shader(1),
				{ color: color(0, 1, 0, .5), ambient: 1 }),
		};


		this.level_to_draw = this.level0;
		this.level_loaded = false;

		this.collider = { intersect_test: Body.intersect_cube, points: new defs.Cube(), leeway: .1 };
		this.show_bounding_boxes = true;

		this.key_presses = [0, 0];

	}

	make_control_panel() {
		this.key_triggered_button("Rotate Up", ["i"], () => { this.key_presses[0] = 1; }, undefined, () => { this.key_presses[0] = 0; });
		this.key_triggered_button("Rotate Left", ["j"], () => { this.key_presses[1] = -1; }, undefined, () => { this.key_presses[1] = 0; });
		this.key_triggered_button("Rotate Down", ["k"], () => { this.key_presses[0] = -1; }, undefined, () => { this.key_presses[0] = 0; });
		this.key_triggered_button("Rotate Right", ["l"], () => { this.key_presses[1] = 1; }, undefined, () => { this.key_presses[1] = 0; });

		this.key_triggered_button("Show collision boxes", ["p"], () => { this.show_bounding_boxes = !this.show_bounding_boxes; });

		this.key_triggered_button("Level 0", ["0"], () => { this.level_to_draw = this.level0; this.level_loaded = false; });
		this.key_triggered_button("Level 1", ["1"], () => { this.level_to_draw = this.level1; this.level_loaded = false; });
		this.key_triggered_button("Level 2", ["2"], () => { this.level_to_draw = this.level2; this.level_loaded = false; });
		this.key_triggered_button("Level 3", ["3"], () => { this.level_to_draw = this.level3; this.level_loaded = false; });

		this.new_line();
		super.make_control_panel();
	}


	ball_color() {
		return this.materials.test.override(color(.6, .6 * Math.random(), .6 * Math.random(), 1));
	}


	draw_level() {
		this.ball = false;
		this.bodies = [];
		this.level_to_draw();
	}

	show_boxes(context, program_state) {
		// show bounding boxes 
		if (this.show_bounding_boxes) {
			const { points, leeway } = this.collider;
			const size = vec3(1 + leeway, 1 + leeway, 1 + leeway);
			for (let b of this.bodies)
				points.draw(context, program_state, b.drawn_location.times(Mat4.scale(...size)), this.materials.bright, "LINE_STRIP");
		}
	}

	get_normal_of_collision(a, b) {
		// a and b are instances of Body. returns normal of a
		// b is intersecting with a (vertex of b is inside a) 
		if (!a.check_if_colliding(b, this.collider))
			return vec4(0, 0, 0, 0);

		//console.log(b.center.minus(a.center));

		if (this.collider.intersect_test == Body.intersect_sphere) {
			return b.center.minus(a.center).normalized();
		}

		// standard basis to a-basis
		const T = a.inverse.times(b.drawn_location, a.temp_matrix);

		let b_center_wrt_a = T.times(b.center.to4(1)).to3();
		// console.log(b.center);
		// console.log(a.center);
		// console.log(b_center_wrt_a);

		let norm_factor = Math.max(...b_center_wrt_a.map((n) => { return Math.abs(n) }));
		b_center_wrt_a = b_center_wrt_a.map((n) => { return -1 * (Math.trunc(n / norm_factor)) });
		// console.log(b_center_wrt_a);

		// convert to standard basis? Not sure why we need to multiply by -1 (above)
		//console.log(a.rotation.times(b_center_wrt_a).normalized());
		return a.rotation.times(b_center_wrt_a).normalized();

		// for (let point of points.arrays.position) {
		// 	let p = T.times(point.to4(1)).to3();
		// 	let margin = leeway;
		// 	if (p.every(value => value >= -1 - margin && value <= 1 + margin)) {
		// 		console.log(p);
		// 		let q = p.map((e) => { return e ** 2; });

		// 		if (Math.max(...q) == q[0]) {
		// 			console.log("x");
		// 		}
		// 		else if (Math.max(...q) == q[1]) {
		// 			console.log("y");
		// 		}
		// 		else if (Math.max(...q) == q[2]) {
		// 			console.log("z");
		// 		}
		// 	}
		// }


	}

	update_state(dt) {
		// update_state():  Override the base time-stepping code to say what this particular
		// scene should do to its bodies every frame -- including applying forces.
		// Generate additional moving bodies if there ever aren't enough:

		if (this.ball === false) {
			this.ball = new Body(this.shapes.ball, this.ball_color(), vec3(1, 1, 1))
				.emplace(Mat4.translation(...vec3(0, 15, 0).randomized(10)),
					vec3(0, -1, 0).randomized(2).normalized().times(3), 0);
			// vec3(0, -1, 0).randomized(2).normalized().times(3), Math.random());


			this.bodies.push(this.ball);
		}


		// Gravity on Earth, where 1 unit in world space = 1 meter:
		this.ball.linear_velocity[1] += dt * -9.8;

		// Reduce horizontal velocity
		this.ball.linear_velocity[0] *= .999;

		// If about to fall through floor, reverse y velocity:
		// if (this.ball.center[1] < -8 && this.ball.linear_velocity[1] < 0)
		// 	this.ball.linear_velocity[1] *= -.4;

		// rotate platform objects
		for (let b of this.bodies) {
			if (b === this.ball)
				continue;
			// i => + along x-axis
			// j => - along z-axis
			// k => - along x-axis
			// l => + along z-axis
			const d_angle = .01;
			b.rotation = b.rotation.times(Mat4.rotation(d_angle * this.key_presses[0], 1, 0, 0)).times(Mat4.rotation(d_angle * this.key_presses[1], 0, 1, 0));

		}


		// bounce of surface stuff
		this.ball.inverse = Mat4.inverse(this.ball.drawn_location);
		for (let a of this.bodies) {
			a.inverse = Mat4.inverse(a.drawn_location);
			// Pass the two bodies and the collision shape to check_if_colliding():
			// Checks if a vertex of b is inside a.
			if (!a.check_if_colliding(this.ball, this.collider))
				continue;

			// normal of a that b hits
			let norm = this.get_normal_of_collision(a, this.ball);
			// calculate new velocity r = v - 2(v.n)n
			let v = this.ball.linear_velocity;
			let r = v.subtract_by(norm.times(2 * v.dot(norm)));
			this.ball.linear_velocity;
		}


		// Delete ball if it strays too far away:
		if (this.ball.center.norm() > 100) {
			this.bodies = this.bodies.filter(b => b != this.ball);
			this.ball = false;
		}


	}

	display(context, program_state) {
		// display(): Draw everything else in the scene besides the moving bodies.
		super.display(context, program_state);

		if (this.level_loaded === false) {
			this.draw_level();
			this.level_loaded = true;
		}

		if (!context.scratchpad.controls) {
			this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
			this.children.push(new defs.Program_State_Viewer());
			program_state.set_camera(Mat4.translation(0, 0, -50));    // Locate the camera here (inverted matrix).
		}

		program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 1, 500);
		program_state.lights = [new Light(vec4(0, -5, -10, 1), color(1, 1, 1, 1), 100000)];

		const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;


		// Draw the platform:
		// switch (this.level) {
		// 	case 0:
		// 		this.level0(context, program_state, t, dt);
		// 		break;
		// 	case 1:
		// 		break;
		// 	case 2:
		// 		break;
		// 	case 3:
		// 		break;
		// }

		// Draw bounding boxes if enabled
		this.show_boxes(context, program_state);

	}

	level0() {
		// EVERY OBJECT CREATED MUST BE PUT INTO THE LIST this.bodies FOR COLLISION DETECTION

		// let platform = new Body(this.shapes.square, this.materials.test.override(this.data.textures.earth), vec3(50, 50, 1))
		// 	.emplace(Mat4.translation(0, -10, 0).times(Mat4.rotation(Math.PI / 2, 1, 0, 0)),
		// 		vec3(0, 0, 0), 0);

		this.bodies.push(new Body(this.shapes.square, this.materials.test.override(this.data.textures.earth), vec3(50, 50, 1))
			.emplace(Mat4.translation(0, -10, 0).times(Mat4.rotation(Math.PI / 2, 1, 0, 0)), vec3(0, 0, 0), 0, vec3(1, 0, 0)));


		// this.shapes.square.draw(context, program_state, Mat4.translation(0, -10, 0)
		// .times(Mat4.rotation(Math.PI / 2, 1, 0, 0))
		// .times(Mat4.rotation(this.theta, 1, 0, 0))
		// .times(Mat4.rotation(this.phi, 0, 1, 0))
		// .times(Mat4.scale(50, 50, 1)),
		// this.materials.test.override(this.data.textures.earth));

	}

	level1() {

	}

	level2() {

	}

	level3() {

	}

}












