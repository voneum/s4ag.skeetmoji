/**
 * Reference object for a reply, containing CID and URI.
 */
export class BSkyApi_ReplyReference {
    public Cid: string; // Content ID of the referenced post
    public Uri: string; // URI of the referenced post
  
    private _cid: string;
    private _uri: string;
  
    constructor(json: any) {
      this._cid = json.cid;
      this._uri = json.uri;
  
      this.Cid = this._cid;
      this.Uri = this._uri;
    }
  }