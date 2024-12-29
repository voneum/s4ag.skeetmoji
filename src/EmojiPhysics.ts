import { Engine, Render, Runner, Bodies, Composite, World, Events, MouseConstraint, Mouse, Constraint, Body } from 'matter-js';
import { SVGs } from './SVGs';

/**
 * The `EmojiPhysics` class creates a physics-based environment using Matter.js to simulate the motion of emojis.
 */
export class EmojiPhysics {
    // Engine and world objects for the physics simulation
    private _engine!: Engine;
    private _world!: World;
    private _render!: Render;

    // Render dimensions and configuration
    public RenderWidth: number = 0;
    public RenderHeight: number = 0;
    public RenderTop: number = 0;

    // Constants and properties for emoji and boundary management
    private readonly MAX_EMOJIS: number = 1000;
    private _emojiCount: number = 0;
    private _bottomBorderHeight: number = 20;
    private _bottomBorderOffset: number = 20;

    // Swinging ball properties
    private _bigBallId: number = 0;
    private _bigBall!: Body;
    private readonly BIG_BALL_RADIUS: number = 50; // Radius of the large circle

    // Map to store emoji textures for efficient rendering
    private readonly _emojiMap = new Map<string, string>();

    // Shared canvas and context for creating emoji textures
    private _sharedCanvas?: HTMLCanvasElement;
    private _sharedContext?: CanvasRenderingContext2D;

    // Swing simulation properties
    private _swingDirection: number = -1; // Swing direction: 1 for right, -1 for left
    private _swingForce: number = 50; // Force magnitude for natural swinging

    /**
     * Initializes a new instance of the `EmojiPhysics` class.
     * @param container - The HTML container element for rendering the simulation.
     */
    constructor(container: HTMLElement) {
        this._initializeEngineAndWorld();
        this._initializeRender(container);
        this._initializeEvents();

        // Start the render and physics engine
        Render.run(this._render);
        const runner = Runner.create();
        Runner.run(runner, this._engine);

        // Initialize the simulation setup
        this.Init();
    }

    /**
     * Initializes the Matter.js engine and world objects.
     */
    private _initializeEngineAndWorld() {
        this._engine = Engine.create();
        this._world = this._engine.world;
    }

    /**
     * Configures the renderer and sets its size to match the container dimensions.
     * @param container - The HTML container element for rendering the simulation.
     */
    private _initializeRender(container: HTMLElement) {
        const rect = container.getBoundingClientRect();
        this.RenderWidth = rect.width;
        this.RenderHeight = rect.height;
        this.RenderTop = rect.top;

        this._render = Render.create({
            element: container,
            engine: this._engine,
            options: {
                width: this.RenderWidth,
                height: this.RenderHeight,
                wireframes: false,
                background: '#0085ff00',
                showAngleIndicator:false,
                showCollisions: false,
                showVelocity: false,
            },
        });
    }

    /**
     * Sets up events for rendering and physics updates.
     */
    private _initializeEvents() {
        // Event for cleaning up out-of-bound emojis
        Events.on(this._render, "afterRender", () => {
            const compounds = Composite.allBodies(this._engine.world);
            compounds.forEach(compound =>
                compound.parts.forEach(part => {
                    const isCircle = part.label === "Circle Body" && part.isStatic === false && part.id !== this._bigBallId;
                    if (isCircle) {
                        const { x, y } = part.position;
                        if (y > this.RenderHeight || x < 0 || x > this.RenderWidth) {
                            World.remove(this._world, part);
                            this._emojiCount--;
                        }
                    }
                })
            );
        });

        // Event for applying periodic swinging force to the large circle
        Events.on(this._engine, 'beforeUpdate', () => {
            if (this._bigBall) {
                const angle = Math.atan2(
                    this._bigBall.position.y - this.bigBallAnchorPoint.y,
                    this._bigBall.position.x - this.bigBallAnchorPoint.x
                );

                if (Math.abs(angle) > Math.PI * 0.7 && this._swingDirection === -1) {
                    this._swingDirection = 1; // Reverse direction at extreme left
                } else if (Math.abs(angle) < Math.PI * 0.3 && this._swingDirection === 1) {
                    this._swingDirection = -1; // Reverse direction at extreme right
                }

                if ((this._swingDirection === 1 && Math.abs(angle) < Math.PI / 2) ||
                    (this._swingDirection === -1 && Math.abs(angle) > Math.PI / 2)) {
                    Body.applyForce(this._bigBall, this._bigBall.position, {
                        x: this._swingDirection * this._swingForce,
                        y: 0
                    });
                }
            }
        });
    }

    /**
     * Adds mouse control to the simulation for interactive manipulation of bodies.
     */
    private _initializeMouseControl() {
        const mouse = Mouse.create(this._render.canvas);
        const mouseConstraint = MouseConstraint.create(this._engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false },
            },
        });

        Composite.add(this._world, mouseConstraint);
        this._render.mouse = mouse; // Synchronize the mouse with rendering
    }

    /**
     * Initializes the simulation by setting up boundaries and interactive elements.
     */
    public Init() {
        World.clear(this._world, false); // Clear the world while preserving the engine
        (Render as any).setSize(this._render, this.RenderWidth, this.RenderHeight);

        // Create boundaries
        const boundaries = [
            Bodies.rectangle(this.RenderWidth / 2, -10, this.RenderWidth, 20, { isStatic: true }),
            Bodies.rectangle(this.RenderWidth / 2, this.RenderHeight - this._bottomBorderOffset, this.RenderWidth * 0.8, this._bottomBorderHeight, {
                isStatic: true,
                render: { fillStyle: 'white' },
            }),
        ];
        World.add(this._world, boundaries);

        // Randomly add one of the following to the simulation:
        // - Pegs: Small circular obstacles arranged in a grid pattern
        // - Slats: Angled rectangular obstacles
        // - Paddlewheels: Rotating wheels with paddles
        // - Paddles: Single linear paddles that rotate
        const rnd = Math.random();
        if (rnd <= 0.25) {
            this.createPegs(5, 25);
        } else if (rnd <= 0.5) {
            this.createSlats();
        } else if (rnd <= 0.75) {
            const paddleDiam = 250;
            const rightPaddleWheelYPosition = (this.RenderHeight - this.BIG_BALL_RADIUS * 2) / 2 - 100;
            const paddleDiamAdjust = paddleDiam/2 > rightPaddleWheelYPosition - 5 ? paddleDiam/2 - rightPaddleWheelYPosition + 5 : 0;
            this.createPaddlewheel(this.RenderWidth / 2 + paddleDiam/2 - 10 - paddleDiamAdjust/2, rightPaddleWheelYPosition, 20, paddleDiam - paddleDiamAdjust*2);
            this.createPaddlewheel(this.RenderWidth / 2 - paddleDiam/2 + 10, (this.RenderHeight - this.BIG_BALL_RADIUS * 2) / 2, 50, paddleDiam);
        } else {
            const paddleDiam = 220;
            this.createPaddle(this.RenderWidth / 2 + paddleDiam/2, (this.RenderHeight - this.BIG_BALL_RADIUS * 2) / 2, 220);
            this.createPaddle(this.RenderWidth / 2 - paddleDiam/2, (this.RenderHeight - this.BIG_BALL_RADIUS * 2) / 2, 220);
        }

        // Add the swinging circle
        this.addSwingingBall();
    }

    /**
     * Clears all emoji bodies from the simulation.
     */
    public ClearAllEmojis() {
        // Retrieve all bodies from the engine's world
        const compounds = Composite.allBodies(this._engine.world);

        // Iterate over each body and its parts
        compounds.forEach(compound => compound.parts.forEach(part => {
            // Check if the part is an emoji based on the defined criteria
            const isEmoji = part.label === "Circle Body" && part.isStatic === false && part.id !== this._bigBallId;
            
            if (isEmoji) {
                // Remove the emoji body from the world
                World.remove(this._world, part);

                // Decrement the emoji count
                this._emojiCount--;
            }
        }));
    }
    public set Dimensions(dimensions: {t: number, w: number, h:number}){
        this.RenderWidth = dimensions.w;
        this.RenderHeight = dimensions.h;
        this.RenderTop = dimensions.t;

        this.Init();
    };
    private get bigBallAnchorPoint(){
        return {x: this.RenderWidth / 2, y: 0};
    }

    // Function to encode the SVG string as a Data URI
    private svgToDataUri(svg:string) {
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }


    // Add the swinging circle
    private addSwingingBall() {
        
        
        const circleBottomOffset = 5; // Distance above the bottom border
        const constraintLength = this.RenderHeight - this._bottomBorderOffset - this._bottomBorderHeight/2 - this.BIG_BALL_RADIUS - circleBottomOffset;

        // Create the large circle
        
        // Convert SVG string to a Data URI        
        const svgDataUri = this.svgToDataUri(SVGs.BlueSkyButterfly);
        const img = new Image(); // Create an HTMLImageElement
        let blob = new Blob([SVGs.BlueSkyButterfly], {type: 'image/svg+xml'});
        let url = URL.createObjectURL(blob);
        img.src = url;

        // Wait for the image to load
        img.onload = () => {
            this._bigBall = Bodies.circle(this.RenderWidth/2, constraintLength + this.BIG_BALL_RADIUS, this.BIG_BALL_RADIUS, {
                density: 10,
                frictionAir: 0.001,
                inertia: Infinity,
                render: { fillStyle: '#0085ff',
                    sprite: {
                        texture: img.src, // Use the Data URI as the texture
                        xScale: 1 * this.BIG_BALL_RADIUS / 15, // Scale to fit the circle
                        yScale: 1 * this.BIG_BALL_RADIUS / 15
                    }
                }
            });

            this._bigBallId = this._bigBall.id;
            

            // Create the constraint (rope)
            const constraint = Constraint.create({
                pointA: this.bigBallAnchorPoint,
                bodyB: this._bigBall,
                length: constraintLength,
                stiffness: 1, 
                render: {
                    strokeStyle: "#0085ff00",
                    type: "line"
                }
            });

            // Add the circle and constraint to the world
            World.add(this._world, [this._bigBall, constraint]);
        };

        img.onerror = (error) => {
            console.error("Failed to load the SVG image:", error);
        };
    }

    // Function to retrieve or create an emoji texture
    private getEmojiTexture(emoji: string): string {
        // Check if the texture is already cached
        if (this._emojiMap.has(emoji)) {
            return this._emojiMap.get(emoji)!;
        }

        // Create and cache the texture
        const texture = this.createEmojiTexture(emoji);
        this._emojiMap.set(emoji, texture);
        return texture;
    }

    // Function to create an emoji texture
    private createEmojiTexture(emoji: string): string {
        // Use a single shared canvas for all texture creation
        if (!this._sharedCanvas) {
            this._sharedCanvas = document.createElement('canvas');
            this._sharedCanvas.width = 32;
            this._sharedCanvas.height = 32;
            this._sharedContext = this._sharedCanvas.getContext('2d')!;
            this._sharedContext.font = '28px sans-serif';
            this._sharedContext.textAlign = 'center';
            this._sharedContext.textBaseline = 'middle';
        }

        // Clear the canvas before drawing the emoji
        this._sharedContext!.clearRect(0, 0, this._sharedCanvas.width, this._sharedCanvas.height);

        // Draw the emoji onto the canvas
        this._sharedContext!.fillText(emoji, this._sharedCanvas.width / 2, this._sharedCanvas.height / 2);

        // Convert the canvas to a Data URL
        return this._sharedCanvas.toDataURL();
    }


    // Function to create pegs
    private createPegs = (radius: number, spacing: number) => {
        const pegs = [];
        
        const rows = Math.round(this.RenderHeight / 75);
        const cols = Math.round(this.RenderHeight / 33.33);

        const startX = this.RenderWidth / 2 - (cols - 1) * spacing / 2;
        const startY = (this.RenderHeight - this.BIG_BALL_RADIUS * 2) / 2 - (rows - 1) * spacing / 2;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (row % 2 === 0 && col % 2 === 0 || row % 2 !== 0 && col % 2 !== 0) {
                    const x = startX + col * spacing;
                    const y = startY + row * spacing;
                    const peg = Bodies.circle(x, y, radius, { isStatic: true, render: { fillStyle: 'white' } });
                    pegs.push(peg);
                }
            }
        }
        World.add(this._world, pegs);
    };

    // Function to create slats
    private createSlats = () => {
        
        
        const slats: Body[] = [];

        const slatCount = Math.round(this.RenderHeight / 150);

        for (let i = 0; i < slatCount; i++) {
            const rect = Bodies.rectangle(this.RenderWidth / 2, (this.RenderHeight - this.BIG_BALL_RADIUS * 2) / 2 - (slatCount/2 * 75) + i * 75, 250, 10, { isStatic: true,render: { fillStyle: 'white' }   });
            
            if (i % 2 === 0){
                Body.rotate(rect, Math.PI / 8);
                Body.translate(rect, {x:-120, y:0})
            } else {
                Body.rotate(rect, -1 * Math.PI / 8);
                Body.translate(rect, {x:120, y:0})
            }
            slats.push(rect);
            
        }
        World.add(this._world, slats);
        
    };

     
    /**
     * Creates a paddlewheel composite at the specified position.
     * @param x The x-coordinate of the paddlewheel center.
     * @param y The y-coordinate of the paddlewheel center.
     * @param radius The radius of the central circle.
     * @param length The length of the paddles.
     */
    private createPaddlewheel = (
      x: number,
      y: number,
      radius: number,
      length: number
    ): void => {
        // Create the central circle
        const circle = Bodies.circle(x, y, radius, {
            isStatic: false,
            render: { fillStyle: 'white' }
        });
    
        // Create the paddle rectangles
        const paddles = [];
        const numPaddles = 4; // Rectangles, each contributing two paddles
        const angleStep = Math.PI / numPaddles; // 12 paddles -> 6 rectangles
        const paddleWidth = 10; // Thickness of the paddles
    
        for (let i = 0; i < numPaddles; i++) {
            const angle = i * angleStep;
            const paddle = Bodies.rectangle(
                x,
                y,
                length,
                paddleWidth,
                {
                    isStatic: false,
                    render: { fillStyle: 'white' }
                }
            );
  
            // Position the paddle around the circle and rotate it
            Body.setAngle(paddle, angle);
            paddles.push(paddle);
        }

        let wheel = Body.create({
            parts: [circle, ...paddles],
            isStatic: false,
        });

      // Add constraints to ensure the paddlewheel remains centered
      const centerConstraint = Constraint.create({
        pointA: { x, y }, // Fixed point in the world
        bodyB: wheel,    // Attach to the central circle
        stiffness: 1,    // Stiffness to keep it fixed
        length: 0,       // No slack in the constraint
        type:"pin",    pointB: { x:0, y:0 }
      });

      // Add the paddlewheel to the Matter.js world
      World.add(this._world, [wheel,centerConstraint]);
  
      
    };


    
    /**
     * Creates a paddle at the specified position.
     * @param x The x-coordinate of the paddle center.
     * @param y The y-coordinate of the paddle center.
     * @param length The length of the paddle.
     * @returns void
     */
    private createPaddle = (
        x: number,
        y: number,
        length: number
    ): void => {
    
        // Create the paddle rectangles
        const paddleWidth = 10; // Thickness of the paddles
    

        const paddle = Bodies.rectangle(x, y, length, paddleWidth, {
            isStatic: false,
            render: { fillStyle: 'white' }
        });

        const paddleToCircleConstraint = Constraint.create({
            pointA: { x: x, y: y }, 
            bodyB: paddle,
            length: 0,
        });

        World.add(this._world, [paddle, paddleToCircleConstraint]);
    
    
    };

    /**
     * Creates an emoji ball in the physics simulation.
     * 
     * @param emoji - The emoji to be displayed on the ball.
     * @returns The created ball object if successful, otherwise undefined.
     */
    public CreateEmojiBall = (emoji: string) => { 
        // Check if the maximum number of emoji balls has been reached
        if (this._emojiCount >= this.MAX_EMOJIS) {        
            console.error("Max emoji count exceeded...", this.MAX_EMOJIS);
            return; // Exit the function if the limit is exceeded
        }

        // Get the texture for the provided emoji
        const emojiTexture = this.getEmojiTexture(emoji);

        // Increment the count of active emoji balls
        this._emojiCount++;

        // Generate a random horizontal offset for the starting position
        const randomOffset = (Math.random() * 2 - 1) * this.RenderWidth / 50;

        // Create a circular physics body representing the emoji ball
        const ball = Bodies.circle(
            this.RenderWidth / 2 + randomOffset, // Start position (x-coordinate)
            0, // Start position (y-coordinate)
            10, // Radius of the ball
            { 
                friction: 0.001, // Friction value for realistic movement
                restitution: 0.7, // Bounciness of the ball
                render: {
                    sprite: {
                        texture: emojiTexture, // Texture for the ball
                        xScale: 0.6, // Horizontal scale for the texture
                        yScale: 0.6  // Vertical scale for the texture
                    }
                } 
            }
        );

        // Check if the ball was successfully created
        if (ball) {
            // Add the ball to the physics world
            World.add(this._world, ball);
        } else {
            // Log an error if the ball creation failed
            console.error("Failed to create emoji ball.");
            // Decrement the emoji count to maintain consistency
            this._emojiCount--;
        }

        // Return the created ball object
        return ball;
    };

}