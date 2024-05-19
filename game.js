import { defs, tiny } from './examples/common.js';
import { Body, Simulation } from './examples/collisions-demo.js'

// Pull these names into this module's scope for convenience:
const { vec3, unsafe3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Scene } = tiny;

const d_angle = .01;
const max_d_angle = .5;

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


		this.ball = false;

		this.collider = { intersect_test: Body.intersect_cube, points: new defs.Cube(), leeway: .05 };
		this.show_bounding_boxes = false;

		this.level = 0;
		this.theta = 0;
		this.phi = 0;
		this.key_presses = [0, 0];

	}

	make_control_panel() {
		this.key_triggered_button("Rotate Up", ["i"], () => { this.key_presses[0] = 1; }, undefined, () => { this.key_presses[0] = 0; });
		this.key_triggered_button("Rotate Left", ["j"], () => { this.key_presses[1] = -1; }, undefined, () => { this.key_presses[1] = 0; });
		this.key_triggered_button("Rotate Down", ["k"], () => { this.key_presses[0] = -1; }, undefined, () => { this.key_presses[0] = 0; });
		this.key_triggered_button("Rotate Right", ["l"], () => { this.key_presses[1] = 1; }, undefined, () => { this.key_presses[1] = 0; });
		this.key_triggered_button("Reset Rotation", ["o"], () => { this.theta = 0; this.phi = 0; });

		this.key_triggered_button("Show collision boxes", ["p"], () => { this.show_bounding_boxes = !this.show_bounding_boxes; });

		this.key_triggered_button("Level 0", ["0"], () => { this.level = 0; });
		this.key_triggered_button("Level 1", ["1"], () => { this.level = 1; });
		this.key_triggered_button("Level 2", ["2"], () => { this.level = 2; });
		this.key_triggered_button("Level 3", ["3"], () => { this.level = 3; });

		this.new_line();
		super.make_control_panel();
	}


	ball_color() {
		return this.materials.test.override(color(.6, .6 * Math.random(), .6 * Math.random(), 1));
	}

	set_rotations() {
		// set angles to rotate platform, based on key presses
		switch (this.key_presses[0]) {
			case 1:
				this.theta = Math.min(this.theta + d_angle, max_d_angle);
				break;
			case -1:
				this.theta = Math.max(this.theta - d_angle, -max_d_angle);
				break;
		}
		switch (this.key_presses[1]) {
			case -1:
				this.phi = Math.max(this.phi - d_angle, -max_d_angle);
				break;
			case 1:
				this.phi = Math.min(this.phi + d_angle, max_d_angle);
				break;
		}
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
		// a and b are instances of Body. returns normal of b 
		if (!a.check_if_colliding(b, collider))
			return vec4(0, 0, 0, 0);

		if (this.collider.intersect_test == Body.intersect_sphere) {
			return b.center.minus(b.center).normalized();
		}

		const T = a.inverse.times(b.drawn_location, a.temp_matrix);
		const { intersect_test, points, leeway } = this.collider;

		for (let point of points.arrays.position) {
			let p = T.times(p.to4(1)).to3();
			let margin = leeway;
			if (p.every(value => value >= -1 - margin && value <= 1 + margin)) {
				console.log(p);
				let q = p.map((e) => { return e ** 2; });

				if (Math.max(...q) == q[0]) {
					console.log("x");
				}
				else if (Math.max(...q) == q[1]) {
					console.log("y");
				}
				else if (Math.max(...q) == q[2]) {
					console.log("z");
				}
			}
		}


	}

	update_state(dt) {
		// update_state():  Override the base time-stepping code to say what this particular
		// scene should do to its bodies every frame -- including applying forces.
		// Generate additional moving bodies if there ever aren't enough:

		if (this.ball === false) {
			this.ball = new Body(this.shapes.ball, this.ball_color(), vec3(1, 1 + Math.random(), 1))
				.emplace(Mat4.translation(...vec3(0, 15, 0).randomized(10)),
					vec3(0, -1, 0).randomized(2).normalized().times(3), Math.random());

			this.bodies.push(this.ball);
		}


		// Gravity on Earth, where 1 unit in world space = 1 meter:
		this.ball.linear_velocity[1] += dt * -9.8;

		// Reduce horizontal velocity
		this.ball.linear_velocity[0] *= .999;

		// If about to fall through floor, reverse y velocity:
		if (this.ball.center[1] < -8 && this.ball.linear_velocity[1] < 0)
			this.ball.linear_velocity[1] *= -.4;


		// Delete bodies that stop or stray too far away:
		if (this.ball.center.norm() > 100) {
			this.ball = false;
		}
		this.bodies = this.bodies.filter(b => b.center.norm() < 100);

	}

	display(context, program_state) {
		// display(): Draw everything else in the scene besides the moving bodies.
		super.display(context, program_state);

		if (!context.scratchpad.controls) {
			this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
			this.children.push(new defs.Program_State_Viewer());
			program_state.set_camera(Mat4.translation(0, 0, -50));    // Locate the camera here (inverted matrix).
		}
		program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 1, 500);
		program_state.lights = [new Light(vec4(0, -5, -10, 1), color(1, 1, 1, 1), 100000)];

		const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;



		// Set plaftorm rotation
		this.set_rotations();

		// Draw the platform:
		switch (this.level) {
			case 0:
				this.level0(context, program_state, t, dt);
				break;
			case 1:
				break;
			case 2:
				break;
			case 3:
				break;
		}

		// Draw bounding boxes if enabled
		this.show_boxes(context, program_state);

	}

	level0(context, program_state, t) {
		// EVERY OBJECT CREATED MUST BE PUT INTO THE LIST this.bodies FOR COLLISION DETECTION
		//


		this.shapes.square.draw(context, program_state, Mat4.translation(0, -10, 0)
			.times(Mat4.rotation(Math.PI / 2, 1, 0, 0))
			.times(Mat4.rotation(this.theta, 1, 0, 0))
			.times(Mat4.rotation(this.phi, 0, 1, 0))
			.times(Mat4.scale(50, 50, 1)),
			this.materials.test.override(this.data.textures.earth));
	}

}












