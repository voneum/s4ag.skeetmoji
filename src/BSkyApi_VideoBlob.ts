export class BSkyApi_VideoBlob {
    public Type: string; // The type of the blob (e.g., "blob")
    public Ref: { $link: string }; // Reference object containing the link
    public MimeType: string; // MIME type of the video
    public Size: number; // Size of the video in bytes
  
    constructor(json: any) {
      this.Type = json.$type;
      this.Ref = json.ref;
      this.MimeType = json.mimeType;
      this.Size = json.size;
    }
  }
  