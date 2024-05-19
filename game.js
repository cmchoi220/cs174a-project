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


		this.collider = { intersect_test: Body.intersect_cube, points: new defs.Cube(), leeway: .1 };
		this.show_bounding_boxes = true;

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
		if (this.show_bounding_boxes) {
			const { points, leeway } = this.collider;
			const size = vec3(1 + leeway, 1 + leeway, 1 + leeway);
			for (let b of this.bodies)
				points.draw(context, program_state, b.drawn_location.times(Mat4.scale(...size)), this.materials.bright, "LINE_STRIP");
		}
	}

	update_state(dt) {
		// update_state():  Override the base time-stepping code to say what this particular
		// scene should do to its bodies every frame -- including applying forces.
		// Generate additional moving bodies if there ever aren't enough:
		while (this.bodies.length < 1)
			this.bodies.push(new Body(this.data.random_shape(), this.ball_color(), vec3(1, 1 + Math.random(), 1))
				.emplace(Mat4.translation(...vec3(0, 15, 0).randomized(10)),
					vec3(0, -1, 0).randomized(2).normalized().times(3), Math.random()));


		for (let b of this.bodies) {
			// Gravity on Earth, where 1 unit in world space = 1 meter:
			b.linear_velocity[1] += dt * -9.8;

			// Reduce horizontal velocity
			b.linear_velocity[0] *= .999;

			// If about to fall through floor, reverse y velocity:
			if (b.center[1] < -8 && b.linear_velocity[1] < 0)
				b.linear_velocity[1] *= -.4;
		}

		// Delete bodies that stop or stray too far away:
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
		// EVERY OBJECT CREATED MUST BE PUT INTO THIS LIST (FOR COLLISION DETECTION)


		this.shapes.square.draw(context, program_state, Mat4.translation(0, -10, 0)
			.times(Mat4.rotation(Math.PI / 2, 1, 0, 0))
			.times(Mat4.rotation(this.theta, 1, 0, 0))
			.times(Mat4.rotation(this.phi, 0, 1, 0))
			.times(Mat4.scale(50, 50, 1)),
			this.materials.test.override(this.data.textures.earth));
	}

}


















export class Collision_Demo extends Simulation {
	// **Collision_Demo** demonstration: Detect when some flying objects
	// collide with one another, coloring them red.
	constructor() {
		super();
		this.data = new Test_Data();
		this.shapes = Object.assign({}, this.data.shapes);
		// Make simpler dummy shapes for representing all other shapes during collisions:
		this.colliders = [
			{ intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(1), leeway: .5 },
			{ intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(2), leeway: .3 },
			{ intersect_test: Body.intersect_cube, points: new defs.Cube(), leeway: .1 }
		];
		this.collider_selection = 0;
		// Materials:
		const phong = new defs.Phong_Shader(1);
		const bump = new defs.Fake_Bump_Map(1)
		this.inactive_color = new Material(bump, {
			color: color(.5, .5, .5, 1), ambient: .2,
			texture: this.data.textures.rgb
		});
		this.active_color = this.inactive_color.override({ color: color(.5, 0, 0, 1), ambient: .5 });
		this.bright = new Material(phong, { color: color(0, 1, 0, .5), ambient: 1 });
	}

	make_control_panel() {
		this.key_triggered_button("Previous collider", ["b"], this.decrease);
		this.key_triggered_button("Next", ["n"], this.increase);
		this.new_line();
		super.make_control_panel();
	}

	increase() {
		this.collider_selection = Math.min(this.collider_selection + 1, this.colliders.length - 1);
	}

	decrease() {
		this.collider_selection = Math.max(this.collider_selection - 1, 0)
	}

	update_state(dt, num_bodies = 40) {
		// update_state():  Override the base time-stepping code to say what this particular
		// scene should do to its bodies every frame -- including applying forces.
		// Generate moving bodies:
		while (this.bodies.length < num_bodies)
			this.bodies.push(new Body(this.data.random_shape(), undefined, vec3(1, 5, 1))
				.emplace(Mat4.translation(...unsafe3(0, 0, 0).randomized(30))
					.times(Mat4.rotation(Math.PI, ...unsafe3(0, 0, 0).randomized(1).normalized())),
					unsafe3(0, 0, 0).randomized(20), Math.random()));
		// Sometimes we delete some so they can re-generate as new ones:
		this.bodies = this.bodies.filter(b => (Math.random() > .01) || b.linear_velocity.norm() > 1);

		const collider = this.colliders[this.collider_selection];
		// Loop through all bodies (call each "a"):
		for (let a of this.bodies) {
			// Cache the inverse of matrix of body "a" to save time.
			a.inverse = Mat4.inverse(a.drawn_location);

			a.linear_velocity = a.linear_velocity.minus(a.center.times(dt));
			// Apply a small centripetal force to everything.
			a.material = this.inactive_color;
			// Default color: white

			if (a.linear_velocity.norm() == 0)
				continue;
			// *** Collision process is here ***
			// Loop through all bodies again (call each "b"):
			for (let b of this.bodies) {
				// Pass the two bodies and the collision shape to check_if_colliding():
				if (!a.check_if_colliding(b, collider))
					continue;
				// If we get here, we collided, so turn red and zero out the
				// velocity so they don't inter-penetrate any further.
				a.material = this.active_color;
				a.linear_velocity = vec3(0, 0, 0);
				a.angular_velocity = 0;
			}
		}
	}

	display(context, program_state) {
		// display(): Draw everything else in the scene besides the moving bodies.
		super.display(context, program_state);
		if (!context.scratchpad.controls) {
			this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
			this.children.push(new defs.Program_State_Viewer());
			program_state.set_camera(Mat4.translation(0, 0, -50));
			// Locate the camera here (inverted matrix).
		}
		program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 1, 500);
		program_state.lights = [new Light(vec4(.7, 1.5, 2, 0), color(1, 1, 1, 1), 100000)];

		// Draw an extra bounding sphere around each drawn shape to show
		// the physical shape that is really being collided with:
		const { points, leeway } = this.colliders[this.collider_selection];
		const size = vec3(1 + leeway, 1 + leeway, 1 + leeway);
		for (let b of this.bodies)
			points.draw(context, program_state, b.drawn_location.times(Mat4.scale(...size)), this.bright, "LINE_STRIP");
	}

	show_explanation(document_element) {
		document_element.innerHTML += `<p>This demo detects when some flying objects collide with one another, coloring them red when they do.  For a simpler demo that shows physics-based movement without objects that hit one another, see the demo called Inertia_Demo.
                                     </p><p>Detecting intersections between pairs of stretched out, rotated volumes can be difficult, but is made easier by being in the right coordinate space.  The collision algorithm treats every shape like an ellipsoid roughly conforming to the drawn shape, and with the same transformation matrix applied.  Here these collision volumes are drawn in translucent purple alongside the real shape so that you can see them.
                                     </p><p>This particular collision method is extremely short to code, as you can observe in the method \"check_if_colliding\" in the class called Body below.  It has problems, though.  Making every collision body a stretched sphere is a hack and doesn't handle the nuances of the actual shape being drawn, such as a cube's corners that stick out.  Looping through a list of discrete sphere points to see if the volumes intersect is *really* a hack (there are perfectly good analytic expressions that can test if two ellipsoids intersect without discretizing them into points, although they involve solving a high order polynomial).   On the other hand, for non-convex shapes a real collision method cannot be exact either, and is usually going to have to loop through a list of discrete tetrahedrons defining the shape anyway.
                                     </p><p>This scene extends class Simulation, which carefully manages stepping simulation time for any scenes that subclass it.  It totally decouples the whole simulation from the frame rate, following the suggestions in the blog post <a href=\"https://gafferongames.com/post/fix_your_timestep/\" target=\"blank\">\"Fix Your Timestep\"</a> by Glenn Fielder.  Buttons allow you to speed up and slow down time to show that the simulation's answers do not change.</p>`;
	}
}