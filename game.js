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
			// Basketball Court and Ball Textures
			court: new Texture("assets/court.gif"),
			basketball: new Texture("assets/basketball.gif"),
			ring: new Texture("assets/ring.png"),
			mouse: new Texture("assets/biggiecheese.jpeg"),
			mysunshine: new Texture("assets/mysunshine.jpeg"),
			cheese1: new Texture("assets/cheese_1.jpeg"),
			wood: new Texture("assets/wood.jpg"),
		}
		this.shapes = {
			ball: new defs.Subdivision_Sphere(3, [[0, 1], [0, 1]]),
		};
	}
}

export class SolidBody extends Body {
	constructor(shape, material, size) {
		super(shape, material, size)
	}

	blend_state(alpha) {

	}

	emplace(location_matrix, linear_velocity, angular_velocity, spin_axis) {
		let s = super.emplace(location_matrix, linear_velocity, angular_velocity, spin_axis);
		this.drawn_location = this.drawn_location.times(Mat4.scale(...this.size));
		return s;
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
		this.shapes.cube = new defs.Cube();
		this.shapes.tube = new defs.Cylindrical_Tube(16, 16, [[0, 0], [0, 1]]);
		this.shapes.circle = new defs.Regular_2D_Polygon(16, 16);
		this.shapes.arc = new defs.FortyFiveDegree2D_Polygon(16, 16);
		this.shapes.curvededge = new defs.FortyFiveDegreeCylindrical_Tube(1, 1);

		this.materials = {
			test: new Material(new defs.Fake_Bump_Map(1),
				{ color: color(.4, .8, .4, 1), ambient: .4, texture: this.data.textures.stars }),
			bright: new Material(new defs.Phong_Shader(1),
				{ color: color(0, 1, 0, .5), ambient: 1 }),
			basketball: new Material(new defs.Fake_Bump_Map(1),
				{ color: color(0, 0, 0, 1), ambient: 0.9, diffusivity: 0.1, specularity: 0.1, texture: this.data.textures.basketball }),
			court: new Material(new defs.Fake_Bump_Map(1),
				{ color: color(0, 0, 0, 1), ambient: 0.9, diffusivity: 0.1, specularity: 0.1, texture: this.data.textures.court }),
			ring: new Material(new defs.Fake_Bump_Map(1),
				{ color: color(0, 0, 0, 1), ambient: 0.8, diffusivity: 0.4, specularity: 0.1, texture: this.data.textures.ring }),
			dark_ground: new Material(new defs.Phong_Shader(),
				{ color: color(0.4, 0.4, 0.4, 1), ambient: 0.2, diffusivity: 1, specularity: 1 }),
			dark_ball: new Material(new defs.Phong_Shader(),
				{ color: color(1, 1, 1, 1), ambient: 1, diffusivity: 1, specularity: 1 }),
			light_ground: new Material(new defs.Phong_Shader(),
				{ color: color(0.98, 0.98, 0.98, 1), ambient: 0.8, diffusivity: 1, specularity: 0 }),
			mouse: new Material(new defs.Fake_Bump_Map(1),
				{ color: color(0, 0, 0, 1), ambient: 0.9, diffusivity: 0.1, specularity: 0.1, texture: this.data.textures.mouse }),
			mysunshine: new Material(new defs.Fake_Bump_Map(1),
				{ color: color(0, 0, 0, 1), ambient: 0.9, diffusivity: 0.1, specularity: 0.1, texture: this.data.textures.mysunshine }),
			cheese1: new Material(new defs.Fake_Bump_Map(1),
				{ color: color(0, 0, 0, 1), ambient: 0.9, diffusivity: 0.1, specularity: 0.1, texture: this.data.textures.cheese1 }),
			wood: new Material(new defs.Fake_Bump_Map(1),
				{ color: color(.4, .4, .4, 1), ambient: 0.3, diffusivity: 0.1, specularity: 0.1, texture: this.data.textures.wood }),
			wood2: new Material(new defs.Fake_Bump_Map(1),
				{ color: color(0, 0, 0, 1), ambient: 0.9, diffusivity: 0.1, specularity: 0.1, texture: this.data.textures.wood }),

		};

		this.level_to_draw = this.level1;
		this.level_loaded = false;
		this.ball_color = this.level1_ball_color;

		this.collider = { intersect_test: Body.intersect_cube, points: new defs.Cube(), leeway: .1 };
		this.show_bounding_boxes = false;

		this.theta = 0;
		this.phi = 0;

		this.key_presses = [0, 0];

	}

	make_control_panel() {
		this.key_triggered_button("Rotate Up", ["i"], () => { this.key_presses[0] = -1; }, undefined, () => { this.key_presses[0] = 0; });
		this.key_triggered_button("Rotate Left", ["j"], () => { this.key_presses[1] = 1; }, undefined, () => { this.key_presses[1] = 0; });
		this.key_triggered_button("Rotate Down", ["k"], () => { this.key_presses[0] = 1; }, undefined, () => { this.key_presses[0] = 0; });
		this.key_triggered_button("Rotate Right", ["l"], () => { this.key_presses[1] = -1; }, undefined, () => { this.key_presses[1] = 0; });

		this.key_triggered_button("Show collision boxes", ["p"], () => { this.show_bounding_boxes = !this.show_bounding_boxes; });
		this.key_triggered_button("Reset current level", [";"], () => { this.level_loaded = false; });

		this.key_triggered_button("Level 0", ["0"], () => { this.level_to_draw = this.level0; this.ball_color = this.general_ball_color; this.level_loaded = false; });
		this.key_triggered_button("Level 1", ["1"], () => { this.level_to_draw = this.level1; this.ball_color = this.level1_ball_color; this.level_loaded = false; });
		this.key_triggered_button("Level 2", ["2"], () => { this.level_to_draw = this.level2; this.ball_color = this.level2_ball_color; this.level_loaded = false; });
		this.key_triggered_button("Level 3", ["3"], () => { this.level_to_draw = this.level3; this.ball_color = this.level3_ball_color; this.level_loaded = false; });

		this.new_line();
		super.make_control_panel();
	}


	general_ball_color() {
		// return this.materials.test.override(color(.6, .6 * Math.random(), .6 * Math.random(), 1));
		return this.materials.test.override(this.data.textures.stars);
	}

	level1_ball_color() {
		return this.materials.basketball;
	}

	level2_ball_color() {
		return this.materials.dark_ball;
	}

	level3_ball_color() {
		return this.materials.mouse;
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

		// standard basis to a-basis
		const T = a.inverse.times(b.drawn_location, a.temp_matrix);

		let b_center_wrt_a = T.times((b.center.minus(a.center)).to4(1)).to3();

		let norm_factor = Math.max(...b_center_wrt_a.map((n) => { return Math.abs(n) }));
		b_center_wrt_a = b_center_wrt_a.map((n) => { return (Math.trunc(n / norm_factor)) });


		// convert to standard basis? 
		return a.drawn_location.times(b_center_wrt_a).normalized();

	}

	update_state(dt) {
		// update_state():  Override the base time-stepping code to say what this particular
		// scene should do to its bodies every frame -- including applying forces.
		// Generate additional moving bodies if there ever aren't enough:

		// ball creation
		if (this.ball === false) {
			this.ball = new Body(this.shapes.ball, this.ball_color(), vec3(1, 1, 1))
				.emplace(Mat4.translation(...vec3(0, 25, 0)), vec3(0, -1, 0).times(3), 0);

			this.bodies.push(this.ball);
		}


		// Reduce horizontal velocity
		this.ball.linear_velocity[0] *= (1 - .005);
		this.ball.linear_velocity[2] *= (1 - .005);


		const acceleration = vec3(0, -9.8 / 10, 0).times(dt);
		this.ball.linear_velocity.add_by(acceleration);

		// bounce off surface stuff

		this.ball.inverse = Mat4.inverse(this.ball.drawn_location);
		for (let a of this.bodies) {
			a.inverse = Mat4.inverse(a.drawn_location);
			// Pass the two bodies and the collision shape to check_if_colliding():
			// Checks if a vertex of b is inside a.
			if (!a.check_if_colliding(this.ball, this.collider)) {
				continue;
			}

			if (a == this.goal && this.level_loaded == true) {
				switch (this.level_to_draw) {
					case this.level0:
						this.level_to_draw = this.level1; this.ball_color = this.level1_ball_color; this.level_loaded = false;
						break;
					case this.level1:
						this.level_to_draw = this.level2; this.ball_color = this.level2_ball_color; this.level_loaded = false;
						break;
					case this.level2:
						this.level_to_draw = this.level3; this.ball_color = this.level3_ball_color; this.level_loaded = false;
						break;
					default:
						this.level_to_draw = this.level0; this.ball_color = this.general_ball_color; this.level_loaded = false;
				}
				break;
			}

			// normal of a that b hits
			let n = this.get_normal_of_collision(a, this.ball).to3();
			// calculate new velocity r = v - 2(v.n)n
			let v = this.ball.linear_velocity;

			// vectors facing opposite directions
			if (n.dot(v) < 0) {
				let r = v.minus(n.times(2 * v.dot(n)));
				this.ball.linear_velocity = r.times_pairwise([1 - .005, .2, 1 - .005]);

				let acceleration_reflected = acceleration.minus(n.times(2 * acceleration.dot(n)));
				this.ball.linear_velocity.add_by(acceleration_reflected) //.times(1 - .001))
			}



			if (a == this.platform) {
				// lever action thingy
				const lever_force = .08;
				let lever_velocity = vec3(0, 0, 0);
				if (this.key_presses[1] == -1 && this.ball.center[0] < 0) // l
					lever_velocity.add_by(n.times(lever_force * Math.abs(this.ball.center[0]) * dt * (2 - Math.abs(this.ball.center[0]) / 45)))
				else if (this.key_presses[1] == 1 && this.ball.center[0] > 0) // j
					lever_velocity.add_by(n.times(lever_force * Math.abs(this.ball.center[0]) * dt * (2 - Math.abs(this.ball.center[0]) / 45)))
				if (this.key_presses[0] == -1 && this.ball.center[2] > 0) // i
					lever_velocity.add_by(n.times(lever_force * Math.abs(this.ball.center[2]) * dt * (2 - Math.abs(this.ball.center[2]) / 45)))
				else if (this.key_presses[0] == 1 && this.ball.center[2] < 0) // k
					lever_velocity.add_by(n.times(lever_force * Math.abs(this.ball.center[2]) * dt * (2 - Math.abs(this.ball.center[2]) / 45)))

				this.ball.linear_velocity.add_by(lever_velocity);
			}
		}







		// linear motion -> angular rotation?
		//this.ball.angular_velocity = Math.sqrt(r[0] * r[0] + r[2] * r[2]) / 20;
		//this.ball.spin_axis = (r.cross(n)).normalized();



		// Delete ball if it strays too far away:
		if (this.ball.center.norm() > 100) {
			this.bodies = this.bodies.filter(b => b != this.ball);
			this.ball = false;
		}


	}

	display(context, program_state) {
		// display(): Draw everything else in the scene besides the moving bodies.
		//super.display(context, program_state);

		if (program_state.animate)
			this.simulate(program_state.animation_delta_time);


		const d_angle = .005;
		const max_d_angle = .5;

		// not max theta or min theta
		if ((this.theta < max_d_angle && this.key_presses[0] == 1) || (this.theta > -max_d_angle && this.key_presses[0] == -1)) {
			this.theta += d_angle * this.key_presses[0]
		}
		// not max phi or min phi
		if ((this.phi < max_d_angle && this.key_presses[1] == 1) || (this.phi > -max_d_angle && this.key_presses[1] == -1)) {
			this.phi += d_angle * this.key_presses[1]
		}


		for (let b of this.bodies) {
			if (b == this.ball) {
				b.shape.draw(context, program_state, b.drawn_location, b.material);
				continue;
			}

			// not max theta or min theta
			if ((this.theta < max_d_angle && this.key_presses[0] == 1) || (this.theta > -max_d_angle && this.key_presses[0] == -1)) {
				b.drawn_location = Mat4.rotation(d_angle * this.key_presses[0], 1, 0, 0).times(b.drawn_location);
			}
			// not max phi or min phi
			if ((this.phi < max_d_angle && this.key_presses[1] == 1) || (this.phi > -max_d_angle && this.key_presses[1] == -1)) {
				b.drawn_location = Mat4.rotation(d_angle * this.key_presses[1], 0, 0, 1).times(b.drawn_location);
			}

			b.shape.draw(context, program_state, b.drawn_location, b.material);

		}


		if (this.level_loaded === false) {
			program_state.set_camera(Mat4.look_at(vec3(0, 60, 100), vec3(0, 0, 0), vec3(0, 1, 0)));
			this.draw_level();
			this.level_loaded = true;
			this.theta = 0;
			this.phi = 0;
		}

		if (!context.scratchpad.controls) {
			this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
			this.children.push(new defs.Program_State_Viewer());
			program_state.set_camera(Mat4.look_at(vec3(0, 60, 100), vec3(0, 0, 0), vec3(0, 1, 0)));
			//program_state.set_camera(Mat4.translation(0, -10, -70));    // Locate the camera here (inverted matrix).
		}

		const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
		program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 1, 500);

		// fancy lighting
		if (this.level_to_draw == this.level2 && this.ball) {
			let displacement = 10 * Math.sin(t * Math.PI / 2)
			program_state.lights = [
				new Light(vec4(-20, -5, displacement, 1), color(1, 1, 1, 1), 800),
				new Light(vec4(20, -5, -displacement, 1), color(1, 1, 1, 1), 800),
				new Light(vec4(0, -5, -10, 1), color(1, 1, 1, 1), 10000)
			];
		}
		else {
			program_state.lights = [new Light(vec4(0, -5, -10, 1), color(1, 1, 1, 1), 100000)];
		}

		// Draw bounding boxes if enabled
		this.show_boxes(context, program_state);

	}

	level0() {
		// EVERY OBJECT CREATED MUST BE PUT INTO THE LIST this.bodies FOR COLLISION DETECTION

		this.platform = new SolidBody(this.shapes.cube, this.materials.test.override(this.data.textures.earth), vec3(50, 1, 50))
			.emplace(Mat4.translation(0, 0, 0), vec3(0, 0, 0), 0, vec3(1, 0, 0));
		this.bodies.push(this.platform);

		this.goal = new SolidBody(this.shapes.tube, this.materials.ring, vec3(3, 3, 3))
			.emplace(Mat4.translation(-20, 4, 20).times(Mat4.rotation(Math.PI / 2, 1, 0, 0)), vec3(0, 0, 0), 0, vec3(1, 0, 0));
		this.bodies.push(this.goal);

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.test.override(this.data.textures.earth), vec3(1, 10, 10))
			.emplace(Mat4.translation(20, 10, 0), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.test.override(this.data.textures.earth), vec3(10, 10, 1))
			.emplace(Mat4.translation(20, 10, -10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
	}

	level1() {
		// Base
		this.platform = new SolidBody(this.shapes.cube, this.materials.court, vec3(50, 1, 50))
			.emplace(Mat4.translation(0, 0, 0), vec3(0, 0, 0), 0, vec3(1, 0, 0))
		this.bodies.push(this.platform);

		// Goal with Lebron wearing it like a crown
		this.goal = new SolidBody(this.shapes.tube, this.materials.ring, vec3(3, 3, 3))
			.emplace(Mat4.translation(21, 4, 39).times(Mat4.rotation(Math.PI / 2, 1, 0, 0)), vec3(0, 0, 0), 0, vec3(1, 0, 0));
		this.bodies.push(this.goal);

		this.bodies.push(new SolidBody(this.shapes.circle, this.materials.mysunshine, vec3(3, 3, 3))
			.emplace(Mat4.translation(21, 4, 39).times(Mat4.rotation(-Math.PI / 2, 1, 0, 0)), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		// Walls
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.court, vec3(29.5, 5, 1))
			.emplace(Mat4.translation(0, 0, -29.5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.court, vec3(1, 5, 19.5))
			.emplace(Mat4.translation(9.5, 0, -10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.court, vec3(1, 5, 19.5))
			.emplace(Mat4.translation(-9.5, 0, -10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.court, vec3(1, 5, 19.5))
			.emplace(Mat4.translation(29.5, 0, 10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.court, vec3(1, 5, 19.5))
			.emplace(Mat4.translation(-29.5, 0, 10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.court, vec3(10, 5, 1))
			.emplace(Mat4.translation(19, 0, 29.5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.court, vec3(10, 5, 1))
			.emplace(Mat4.translation(-19, 0, 29.5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.court, vec3(1, 5, 10))
			.emplace(Mat4.translation(9.5, 0, 39), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.court, vec3(1, 5, 10))
			.emplace(Mat4.translation(-9.5, 0, 39), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.court, vec3(49.5, 5, 1))
			.emplace(Mat4.translation(0, 0, 49.5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.court, vec3(49.5, 5, 1))
			.emplace(Mat4.translation(0, 0, -49.5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.court, vec3(1, 5, 49.5))
			.emplace(Mat4.translation(49.5, 0, 0), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.court, vec3(1, 5, 49.5))
			.emplace(Mat4.translation(-49.5, 0, 0), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

	}

	level2() {
		this.platform = new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(50, 1, 50))
			.emplace(Mat4.translation(0, 0, 0), vec3(0, 0, 0), 0, vec3(1, 0, 0));
		this.bodies.push(this.platform);

		this.goal = new SolidBody(this.shapes.tube, this.materials.ring, vec3(3, 3, 3))
			.emplace(Mat4.translation(-32, 4, 32).times(Mat4.rotation(Math.PI / 2, 1, 0, 0)), vec3(0, 0, 0), 0, vec3(1, 0, 0));
		this.bodies.push(this.goal);

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 50))
			.emplace(Mat4.translation(50 - 1, 0, 0), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 50))
			.emplace(Mat4.translation(-50 + 1, 0, 0), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(50, 5, 1))
			.emplace(Mat4.translation(0, 0, 50 - 1), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(50, 5, 1))
			.emplace(Mat4.translation(0, 0, -50 + 1), vec3(0, 0, 0), 0, vec3(1, 0, 0)));


		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 35))
			.emplace(Mat4.translation(25, 0, 0), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 35))
			.emplace(Mat4.translation(-25, 0, 0), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(35, 5, 1))
			.emplace(Mat4.translation(0, 0, 25), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(16, 5, 1))
			.emplace(Mat4.translation(8, 0, -25), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(8, 5, 1))
			.emplace(Mat4.translation(0, 0, -10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 10))
			.emplace(Mat4.translation(7, 0, 0), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 17))
			.emplace(Mat4.translation(-7, 0, 7), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(7, 5, 1))
			.emplace(Mat4.translation(-42, 0, -25), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
	}

	level3() {
		// Base
		this.platform = new SolidBody(this.shapes.cube, this.materials.wood, vec3(50, 1, 50))
			.emplace(Mat4.translation(0, 0, 0), vec3(0, 0, 0), 0, vec3(1, 0, 0))
		this.bodies.push(this.platform);

		/*
		// Goal being a block of cheese
		// Bottom
		this.goal = new SolidBody(this.shapes.arc, this.materials.cheese1, vec3(5, 5, 5))
			.emplace(Mat4.translation(25, 1.5, -45).times(Mat4.rotation(-Math.PI / 2, 1, 0, 0)), vec3(0, 0, 0), 0, vec3(1, 0, 0));
		this.bodies.push(this.goal);
		// Top
		this.bodies.push(new SolidBody(this.shapes.arc, this.materials.cheese1, vec3(5, 5, 5))
			.emplace(Mat4.translation(25, 6.5, -45).times(Mat4.rotation(-Math.PI / 2, 1, 0, 0)), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		// Curved Edge
		this.bodies.push(new SolidBody(this.shapes.curvededge, this.materials.cheese1, vec3(5, 5, 5))
			.emplace(Mat4.translation(25, 4, -45).times(Mat4.rotation(Math.PI / 4, 0, 1, 0)).times(Mat4.rotation(Math.PI / 2, 1, 0, 0)), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		// Other Two Edges
		this.bodies.push(new SolidBody(this.shapes.square, this.materials.cheese1, vec3(5 / 2, 5 / 2, 1))
			.emplace(Mat4.translation(27.5, 4, -45), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.square, this.materials.cheese1, vec3(5 / 2, 5 / 2, 1))
			.emplace(Mat4.translation(26.75, 4, -46.75).times(Mat4.rotation(Math.PI / 4, 0, 1, 0)), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		 */

		// Goal being a block of cheese
		// Bottom
		this.goal = new SolidBody(this.shapes.arc, this.materials.cheese1, vec3(5, 5, 5))
			.emplace(Mat4.translation(15, 1.5, -25).times(Mat4.rotation(-Math.PI / 2, 1, 0, 0)), vec3(0, 0, 0), 0, vec3(1, 0, 0));
		this.bodies.push(this.goal);
		// Top
		this.bodies.push(new SolidBody(this.shapes.arc, this.materials.cheese1, vec3(5, 5, 5))
			.emplace(Mat4.translation(15, 6.5, -25).times(Mat4.rotation(-Math.PI / 2, 1, 0, 0)), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		// Curved Edge
		this.bodies.push(new SolidBody(this.shapes.curvededge, this.materials.cheese1, vec3(5, 5, 5))
			.emplace(Mat4.translation(15, 4, -25).times(Mat4.rotation(Math.PI/4, 0, 1, 0)).times(Mat4.rotation(Math.PI / 2, 1, 0, 0)), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		// Other Two Edges
		this.bodies.push(new SolidBody(this.shapes.square, this.materials.cheese1, vec3(5/2, 5/2, 1))
			.emplace(Mat4.translation(17.5, 4, -25), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.square, this.materials.cheese1, vec3(5/2, 5/2, 1))
			.emplace(Mat4.translation(16.75, 4, -26.75).times(Mat4.rotation(Math.PI / 4, 0, 1, 0)), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		// Horizontal Walls

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-35, 0, 40), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-35, 0, 10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-35, 0, -10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-35, 0, -30), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-25, 0, 40), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-25, 0, 30), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-25, 0, 10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-25, 0, 0), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-25, 0, -30), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-25, 0, -40), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-15, 0, 30), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		//this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			//.emplace(Mat4.translation(-15, 0, 10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-15, 0, -40), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-5, 0, 20), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-5, 0, 10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-5, 0, -10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(-5, 0, -30), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(5, 0, 30), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(5, 0, 10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(5, 0, -10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(15, 0, 40), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(15, 0, 30), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(15, 0, -20), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(15, 0, -30), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(15, 0, -40), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(25, 0, 20), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(25, 0, -10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(25, 0, -20), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(25, 0, -30), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(25, 0, -40), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(35, 0, 40), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(35, 0, 30), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(35, 0, -10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		//this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			//.emplace(Mat4.translation(35, 0, -20), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(35, 0, -40), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(45, 0, 40), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(5, 5, 1))
			.emplace(Mat4.translation(45, 0, -10), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		// Vertical Walls

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(0, 0, -45), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(20, 0, -45), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-30, 0, -35), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(0, 0, -35), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(10, 0, -35), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(40, 0, -35), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-40, 0, -25), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-20, 0, -25), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-10, 0, -25), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(0, 0, -25), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(10, 0, -25), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(40, 0, -25), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-30, 0, -15), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-20, 0, -15), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(0, 0, -15), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		//this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			//.emplace(Mat4.translation(20, 0, -15), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-40, 0, -5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-20, 0, -5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-10, 0, -5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(10, 0, -5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(20, 0, -5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(30, 0, -5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-40, 0, 5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-20, 0, 5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(10, 0, 5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(20, 0, 5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(30, 0, 5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(40, 0, 5), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-40, 0, 15), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-30, 0, 15), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-20, 0, 15), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-10, 0, 15), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(10, 0, 15), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(20, 0, 15), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(40, 0, 15), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-40, 0, 25), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-20, 0, 25), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(20, 0, 25), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(40, 0, 25), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-40, 0, 35), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-10, 0, 35), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(0, 0, 35), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(30, 0, 35), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(-10, 0, 45), vec3(0, 0, 0), 0, vec3(1, 0, 0)));
		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 5))
			.emplace(Mat4.translation(20, 0, 45), vec3(0, 0, 0), 0, vec3(1, 0, 0)));


		// Edges

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(50, 5, 1))
			.emplace(Mat4.translation(0, 0, 50), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(50, 5, 1))
			.emplace(Mat4.translation(0, 0, -50), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 50))
			.emplace(Mat4.translation(50, 0, 0), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

		this.bodies.push(new SolidBody(this.shapes.cube, this.materials.dark_ground, vec3(1, 5, 50))
			.emplace(Mat4.translation(-50, 0, 0), vec3(0, 0, 0), 0, vec3(1, 0, 0)));

	}

}












