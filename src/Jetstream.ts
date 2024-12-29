import { BSkyApi_PostResponse } from "./BSkyApi_PostResponse";
import { JetstreamDetail } from "./JetstreamDetail";

export enum JetstreamStatus {open, closed, error };

/**
 * A class to interact with the Bluesky Feed API via WebSocket.
 * Allows subscribing to specific collections and handling "create", "update", and "delete" events.
 * Parts of this code is heavily influenced by (and borrowed from) [Jake Lazaroff](https://jakelazaroff.com/words/drinking-from-the-bluesky-firehose/)
 */
export class Jetstream {

    private _dataRecievedLength = 0;
    private _messagesRecieved = 0;    
    private _onStartCallback!: () => void;
    private _onOpenCallback!: () => void;
    private _onCloseCallback!: () => void;
    private _onErrorCallback!: (err:string) => void;
    
    /**
     * The WebSocket endpoint for the Bluesky Feed API.
     * Defaults to the public endpoint if not provided.
     */
    private _endpoint: string = "jetstream1.us-east.bsky.network";

    /**
     * Map of collections to their respective EventTarget objects for managing event listeners.
     */
    private _emitters: Map<string, EventTarget> = new Map();

    /**
     * The active WebSocket connection.
     */
    private _ws?: WebSocket;

    /**
     * Constructs a new Jetstream instance.
     * @param options Optional configuration for the class.
     * @param options.endpoint Custom WebSocket endpoint. If not provided, a random endpoint is selected.
     * @param options.wantedCollections An array of collection names to subscribe to. Defaults to an empty array.
     */
    constructor(options: { endpoint?: string; wantedCollections?: string[] } = {}) {
        const endpoints = [
        "jetstream1.us-east.bsky.network",
        "jetstream2.us-east.bsky.network",
        "jetstream1.us-west.bsky.network",
        "jetstream2.us-west.bsky.network",
        ];
    
        this._endpoint = options.endpoint ?? endpoints[Math.floor(Math.random() * endpoints.length)];
        console.log("Endpoint:", this._endpoint);

        // Prepopulate emitters map with the provided wantedCollections
        if (options.wantedCollections) {
        for (const collection of options.wantedCollections) {
            this._emitters.set(collection, new EventTarget());
        }
        }
    }
  

    /**
     * Dynamically constructs the WebSocket URL with query parameters
     * for the collections that have active listeners.
     * @returns The WebSocket URL as a string.
     */
    private get _url(): string {
        const url = new URL(`wss://${this._endpoint}/subscribe`);
        for (const collection of this._emitters.keys()) {
            url.searchParams.append("wantedCollections", collection);
        }
        return url.toString();
    }

    /**
     * Registers a listener for a specific collection and operation.
     * @param collection The name of the collection to listen to.
     * @param operation The operation to listen for ("create", "update", or "delete").
     * @param listener The callback to handle the event.
     */
    private _listen(
        collection: string,
        operation: string,
        listener: (event: CustomEvent) => void
    ): void {
        const emitter = this._emitters.get(collection) ?? new EventTarget();
        this._emitters.set(collection, emitter);

        emitter.addEventListener(operation, listener as EventListener);
    }

    /**
     * Registers a listener for "create" events in a specific collection.
     * @param collection The name of the collection to listen to.
     * @param listener The callback to handle the event.
     */
    public onCreate(collection: string, listener: (event: CustomEvent) => void): void {
        this._listen(collection, "create", listener);
    }

    /**
     * Registers a listener for "update" events in a specific collection.
     * @param collection The name of the collection to listen to.
     * @param listener The callback to handle the event.
     */
    public onUpdate(collection: string, listener: (event: CustomEvent) => void): void {
        this._listen(collection, "update", listener);
    }

    /**
     * Registers a listener for "delete" events in a specific collection.
     * @param collection The name of the collection to listen to.
     * @param listener The callback to handle the event.
     */
    public onDelete(collection: string, listener: (event: CustomEvent) => void): void {
        this._listen(collection, "delete", listener);
    }

    public onStart(callback: () => void): void {
        this._onStartCallback = callback;
    }
    public onOpen(callback: () => void): void {
        this._onOpenCallback = callback;
    }
    public onClose(callback: () => void): void {
        this._onCloseCallback = callback;
    }
    public onError(callback: (err:string) => void): void {
        this._onErrorCallback = callback;
    }
    
    /**
     * Starts or restarts the WebSocket connection and listens for events.
     * Incoming messages are routed to the appropriate listeners based on collection and operation.
     */
    public start(): void {
        // Close any existing WebSocket connection.
        if (this._ws) {
            this._ws.close();
        }
        // Establish a new WebSocket connection.
        this._ws = new WebSocket(this._url);

        // Handle incoming messages from the WebSocket.
        this._ws.onmessage = (ev: MessageEvent) => {
            try {


                this._dataRecievedLength += ev.data.length;
                this._messagesRecieved++;

                // Parse and initialize the typed object
                const postResponse = new BSkyApi_PostResponse(JSON.parse(ev.data));

                // Ensure the message is of the expected kind.
                if (postResponse.Kind !== "commit") return;
                const commit = postResponse.Commit;
                if (commit && commit.Operation === "delete") return;
                if (commit && commit.Record && commit.Record.Langs && commit.Record.Langs.indexOf("en") === -1) return;

                const emitter = this._emitters.get(commit!.Collection);

                // Dispatch the event to the appropriate EventTarget if it exists.
                if (emitter) {
                    const event = new CustomEvent(commit!.Operation, { detail: new JetstreamDetail(postResponse,this._dataRecievedLength,this._messagesRecieved) });
                    emitter.dispatchEvent(event);
                }
            } catch (error) {
                console.error(ev.data);
                console.error("Failed to process WebSocket message:", error);
            }
        };

        this._ws.onopen= (ev: Event) => {
            console.log("WebSocket opened:", ev);
            this._onOpenCallback();
        };

        // Log WebSocket errors.
        this._ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            this._onErrorCallback(`"WebSocket error: ${JSON.stringify(error)}`);
        };

        // Log WebSocket connection closure.
        this._ws.onclose = () => {
            console.warn("WebSocket connection closed.");
            this._onCloseCallback();
        };

        this._onStartCallback();
    }

    /**
     * Stops the WebSocket connection if it is active.
     */
    public stop(): void {
        if (this._ws) {
            this._ws.close();
            this._ws = undefined;
            console.info("WebSocket connection stopped.");
            //this._onCloseCallback();
        }
    }

    public clear(): void {        
        this._dataRecievedLength = 0;
        this._messagesRecieved = 0; 
    }
}
  