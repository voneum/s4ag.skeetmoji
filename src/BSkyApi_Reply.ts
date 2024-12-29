import { BSkyApi_ReplyReference } from "./BSkyApi_ReplyReference";

/**
 * Reply object representing the reply hierarchy.
 */
export class BSkyApi_Reply {
    public Parent: BSkyApi_ReplyReference; // Parent post reference
    public Root: BSkyApi_ReplyReference; // Root post reference
  
    private _parent: BSkyApi_ReplyReference;
    private _root: BSkyApi_ReplyReference;
  
    constructor(json: any) {
      this._parent = new BSkyApi_ReplyReference(json.parent);
      this._root = new BSkyApi_ReplyReference(json.root);
  
      this.Parent = this._parent;
      this.Root = this._root;
    }
  }